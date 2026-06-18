import os
import json
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_admin
from routers.config import load_config
from zlibrary_client import ZLibraryClient
import models

router = APIRouter()


def _get_client(db: Session) -> ZLibraryClient:
    cfg = load_config(db)
    return ZLibraryClient(
        base_url=cfg.get("zlibrary_domain", ""),
        email=cfg.get("zlibrary_email", ""),
        password=cfg.get("zlibrary_password", ""),
        cookie=cfg.get("zlibrary_cookie", ""),
    )


# Search is public — no admin auth needed
@router.post("/search")
def search(body: dict, db: Session = Depends(get_db)):
    query = (body.get("query") or "").strip()
    if not query:
        raise HTTPException(400, "请输入搜索词")
    try:
        results = _get_client(db).search(query)
        return {"results": results}
    except Exception as e:
        raise HTTPException(500, str(e))


# Recommendations — public, grouped by library categories (1-2 per category)
@router.get("/recommendations")
def recommendations(db: Session = Depends(get_db)):
    import time

    books    = db.query(models.Book).all()
    existing = {b.title.lower().strip() for b in books}
    cats     = list(dict.fromkeys(b.category for b in books if b.category))  # preserve order, dedupe
    if not cats:
        return {"categories": []}

    client     = _get_client(db)
    categories = []

    for cat in cats[:6]:
        cache_key = f"zlib_rec_{cat}"
        ts_key    = f"zlib_rec_ts_{cat}"
        cache_row = db.query(models.SiteConfig).filter(models.SiteConfig.key == cache_key).first()
        ts_row    = db.query(models.SiteConfig).filter(models.SiteConfig.key == ts_key).first()

        # Use cache if valid (12h)
        if cache_row and ts_row:
            try:
                if time.time() - float(ts_row.value) < 43200:
                    cached = json.loads(cache_row.value)
                    if cached:
                        categories.append({"name": cat, "books": cached})
                    continue
            except Exception:
                pass

        # Fetch fresh
        try:
            raw = client.search(cat, limit=15)
            fresh = []
            for r in raw:
                title  = r.get("title", "").strip()
                author = r.get("author", "").strip()
                fmt    = r.get("format", "").lower()
                if not title or fmt not in ("epub", "mobi"):
                    continue
                if title.lower() in existing:
                    continue
                if len(title) < 4 or len(title) > 60:
                    continue
                # Skip if title is essentially the search query itself
                if title.lower() == cat.lower() or title.lower() == author.lower():
                    continue
                if title.strip() == cat.strip():
                    continue
                # Skip series / collection books
                series_keywords = [
                    '第', '册', '卷', '套', '全集', '系列', '合集', '丛书',
                    'volume', 'vol.', 'vol ', 'book 1', 'book 2', 'part 1', 'part 2',
                    'series', '#1', '#2', '(1)', '(2)', '（1）', '（2）',
                    '上册', '下册', '中册', '上卷', '下卷',
                ]
                if any(kw in title.lower() for kw in series_keywords):
                    continue
                fresh.append(r)
                if len(fresh) >= 2:
                    break
        except Exception:
            fresh = []

        # Cache result
        for key, val in [(cache_key, json.dumps(fresh)), (ts_key, str(time.time()))]:
            row = db.query(models.SiteConfig).filter(models.SiteConfig.key == key).first()
            if row:
                row.value = val
            else:
                db.add(models.SiteConfig(key=key, value=val))
        db.commit()

        if fresh:
            categories.append({"name": cat, "books": fresh})

    return {"categories": categories}


# Refresh recommendations (admin only)
@router.post("/recommendations/refresh")
def refresh_recommendations(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    # Clear all cached recommendation keys
    rows = db.query(models.SiteConfig).filter(
        models.SiteConfig.key.like("zlib_rec_%")
    ).all()
    for row in rows:
        db.delete(row)
    db.commit()
    return recommendations(db)

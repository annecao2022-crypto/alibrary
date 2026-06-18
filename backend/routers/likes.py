from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from auth import get_current_admin
import models

router = APIRouter()


@router.post("")
def add_like(body: dict, db: Session = Depends(get_db)):
    """Anyone can like a book."""
    book_id    = body.get("book_id")
    zlib_title = (body.get("zlib_title") or "").strip()
    if not book_id and not zlib_title:
        return {"ok": False}
    zlib_url = (body.get("zlib_url") or "").strip()
    like = models.Like(
        book_id=int(book_id) if book_id else None,
        zlib_title=zlib_title or None,
        zlib_url=zlib_url or None,
    )
    db.add(like)
    db.commit()
    return {"ok": True}


@router.get("/counts")
def like_counts(db: Session = Depends(get_db)):
    """Public — returns like counts for all items."""
    book_rows = (
        db.query(models.Like.book_id, func.count().label("n"))
        .filter(models.Like.book_id.isnot(None))
        .group_by(models.Like.book_id)
        .all()
    )
    zlib_rows = (
        db.query(models.Like.zlib_title, func.count().label("n"))
        .filter(models.Like.zlib_title.isnot(None))
        .group_by(models.Like.zlib_title)
        .all()
    )
    return {
        "books": {str(r.book_id): r.n for r in book_rows},
        "zlib":  {r.zlib_title: r.n for r in zlib_rows},
    }


@router.get("/top")
def top_liked(db: Session = Depends(get_db)):
    """Public — top liked library books and Z-Library books."""
    # Top library books
    book_counts = (
        db.query(models.Like.book_id, func.count().label("n"))
        .filter(models.Like.book_id.isnot(None))
        .group_by(models.Like.book_id)
        .order_by(func.count().desc())
        .limit(12)
        .all()
    )
    library_books = []
    for bc in book_counts:
        book = db.query(models.Book).filter(models.Book.id == bc.book_id).first()
        if book:
            library_books.append({
                "id": book.id, "title": book.title, "author": book.author,
                "format": book.format, "category": book.category,
                "cover_path": book.cover_path, "likes": bc.n,
            })

    # Top Z-Library books (latest URL per title)
    from sqlalchemy import func as f
    zlib_rows = (
        db.query(models.Like.zlib_title,
                 func.max(models.Like.zlib_url).label("url"),
                 func.count().label("n"))
        .filter(models.Like.zlib_title.isnot(None))
        .group_by(models.Like.zlib_title)
        .order_by(func.count().desc())
        .limit(12)
        .all()
    )
    zlib_books = [
        {"title": r.zlib_title, "url": r.url, "likes": r.n}
        for r in zlib_rows if r.zlib_title
    ]

    return {"library": library_books, "zlib": zlib_books}


@router.delete("/all")
def clear_all_likes(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    """Admin — delete all like records."""
    db.query(models.Like).delete()
    db.commit()
    return {"ok": True}


@router.get("/list")
def like_list(db: Session = Depends(get_db), _=Depends(get_current_admin)):
    """Admin — full like list with book details."""
    likes = db.query(models.Like).order_by(models.Like.created_at.desc()).all()
    result = []
    for like in likes:
        item = {"id": like.id, "created_at": like.created_at.isoformat()}
        if like.book_id:
            book = db.query(models.Book).filter(models.Book.id == like.book_id).first()
            item["type"]  = "library"
            item["title"] = book.title if book else f"Book #{like.book_id}"
            item["url"]   = None
        else:
            item["type"]  = "zlib"
            item["title"] = like.zlib_title
            item["url"]   = like.zlib_url
        result.append(item)
    return result

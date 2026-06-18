from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_admin
import models

router = APIRouter()

DEFAULTS = {
    "site_title":        "Anne's Library",
    "site_subtitle":     "照体独立，历历孤明",
    "announcement":      "",
    "description":       "",
    "theme_color":       "#2563eb",
    "featured_book_ids": "[]",
    "default_sort":      "newest",
    "zlibrary_domain":   "https://zh.101sat.ru",
    "zlibrary_email":    "",
    "zlibrary_password": "",
    "zlibrary_cookie":   "",
    "category_colors":   "{}",
}


def load_config(db: Session) -> dict:
    rows = db.query(models.SiteConfig).all()
    result = dict(DEFAULTS)
    for r in rows:
        result[r.key] = r.value
    return result


@router.get("")
def get_config(db: Session = Depends(get_db)):
    return load_config(db)


@router.put("")
def update_config(data: dict, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    for key, value in data.items():
        if key not in DEFAULTS:
            continue
        row = db.query(models.SiteConfig).filter(models.SiteConfig.key == key).first()
        if row:
            row.value = str(value)
        else:
            db.add(models.SiteConfig(key=key, value=str(value)))
    db.commit()
    return load_config(db)

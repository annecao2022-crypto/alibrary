from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_admin

router = APIRouter()


@router.post("", response_model=schemas.WishResponse)
def create_wish(wish: schemas.WishCreate, db: Session = Depends(get_db)):
    db_wish = models.Wish(name=wish.name, content=wish.content)
    db.add(db_wish)
    db.commit()
    db.refresh(db_wish)
    return db_wish


@router.get("", response_model=List[schemas.WishResponse])
def list_wishes(db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    return db.query(models.Wish).order_by(models.Wish.created_at.desc()).all()

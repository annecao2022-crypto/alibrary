from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BookBase(BaseModel):
    title: str
    author: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None


class BookResponse(BookBase):
    id: int
    format: str
    file_size: int
    cover_path: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str


class LoginRequest(BaseModel):
    username: str
    password: str

from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    author = Column(String(100))
    description = Column(Text)
    category = Column(String(50))
    format = Column(String(10))
    file_path = Column(String(500))
    cover_path = Column(String(500), nullable=True)
    file_size = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(200), nullable=False)

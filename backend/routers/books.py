import os
import re
import uuid
import zipfile
import aiofiles
from html.parser import HTMLParser
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
from auth import get_current_admin

router = APIRouter()

DATA_DIR = os.environ.get("DATA_DIR", os.path.dirname(os.path.dirname(__file__)))
UPLOAD_DIR = os.path.join(DATA_DIR, "uploads")
ALLOWED_FORMATS = {"pdf", "epub", "txt", "mobi", "jpg", "jpeg", "png", "azw", "azw3", "cbz", "cbr", "djvu", "doc", "docx"}

MEDIA_TYPES = {
    "pdf":  "application/pdf",
    "epub": "application/epub+zip",
    "txt":  "text/plain; charset=utf-8",
    "jpg":  "image/jpeg",
    "jpeg": "image/jpeg",
    "png":  "image/png",
    "mobi": "application/x-mobipocket-ebook",
    "azw":  "application/vnd.amazon.ebook",
    "azw3": "application/vnd.amazon.ebook",
    "cbz":  "application/x-cbz",
    "cbr":  "application/x-cbr",
    "djvu": "image/vnd.djvu",
    "doc":  "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.get("", response_model=List[schemas.BookResponse])
def list_books(
    skip: int = 0,
    limit: int = 200,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(models.Book)
    if category:
        q = q.filter(models.Book.category == category)
    return q.order_by(models.Book.created_at.desc()).offset(skip).limit(limit).all()


@router.get("/{book_id}", response_model=schemas.BookResponse)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")
    return book


@router.get("/{book_id}/cover")
def get_cover(book_id: int, db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book or not book.cover_path or not os.path.exists(book.cover_path):
        raise HTTPException(status_code=404, detail="封面不存在")
    return FileResponse(book.cover_path, media_type="image/jpeg")


@router.get("/{book_id}/preview")
def preview_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")
    if not os.path.exists(book.file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    media_type = MEDIA_TYPES.get(book.format.lower(), "application/octet-stream")
    return FileResponse(
        book.file_path,
        media_type=media_type,
        headers={
            "Content-Disposition": "inline",
            "Cache-Control": "public, max-age=86400",
        },
    )


@router.get("/{book_id}/download")
def download_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")
    if not os.path.exists(book.file_path):
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(
        book.file_path,
        filename=f"{book.title}.{book.format}",
        media_type="application/octet-stream",
    )


@router.post("", response_model=schemas.BookResponse)
async def upload_book(
    title: str = Form(...),
    author: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    file: UploadFile = File(...),
    cover: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
    _admin=Depends(get_current_admin),
):
    ext = os.path.splitext(file.filename or "")[1].lstrip(".").lower()
    if ext not in ALLOWED_FORMATS:
        raise HTTPException(status_code=400, detail=f"不支持的格式: {ext}")

    file_id = str(uuid.uuid4())
    book_dir = os.path.join(UPLOAD_DIR, "books")
    cover_dir = os.path.join(UPLOAD_DIR, "covers")
    os.makedirs(book_dir, exist_ok=True)
    os.makedirs(cover_dir, exist_ok=True)

    file_path = os.path.join(book_dir, f"{file_id}.{ext}")
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(await file.read())

    cover_path = None
    if cover and cover.filename:
        cover_ext = os.path.splitext(cover.filename)[1].lstrip(".").lower()
        cover_path = os.path.join(cover_dir, f"{file_id}.{cover_ext}")
        async with aiofiles.open(cover_path, "wb") as f:
            await f.write(await cover.read())

    book = models.Book(
        title=title,
        author=author,
        description=description,
        category=category,
        format=ext,
        file_path=file_path,
        cover_path=cover_path,
        file_size=os.path.getsize(file_path),
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    return book


@router.get("/{book_id}/epub-text")
def epub_text(book_id: int, chapter: int = 0, db: Session = Depends(get_db)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book or book.format.lower() != "epub":
        raise HTTPException(status_code=400, detail="Not an EPUB")
    if not os.path.exists(book.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    class TextExtractor(HTMLParser):
        def __init__(self):
            super().__init__()
            self.parts, self.skip = [], False
        def handle_starttag(self, tag, attrs):
            if tag in ("script", "style"): self.skip = True
            if tag in ("p", "div", "h1", "h2", "h3", "h4", "li", "br"): self.parts.append("\n")
        def handle_endtag(self, tag):
            if tag in ("script", "style"): self.skip = False
        def handle_data(self, data):
            if not self.skip: self.parts.append(data)
        def text(self): return re.sub(r'\n{3,}', '\n\n', "".join(self.parts)).strip()

    try:
        with zipfile.ZipFile(book.file_path) as z:
            container = z.read("META-INF/container.xml").decode("utf-8")
            opf_path = re.search(r'full-path="([^"]+)"', container).group(1)
            opf_dir = "/".join(opf_path.split("/")[:-1])
            opf = z.read(opf_path).decode("utf-8")

            spine_ids = re.findall(r'<itemref[^>]+idref="([^"]+)"', opf)
            items = {}
            for m in re.finditer(r'<item\s[^>]*/?\s*>', opf):
                s = m.group()
                id_m, href_m = re.search(r'\bid="([^"]+)"', s), re.search(r'\bhref="([^"]+)"', s)
                if id_m and href_m:
                    items[id_m.group(1)] = href_m.group(1)

            total = len(spine_ids)
            chapter = max(0, min(chapter, total - 1))
            href = items.get(spine_ids[chapter], "")
            full_path = f"{opf_dir}/{href}" if opf_dir else href
            html = z.read(full_path).decode("utf-8", errors="replace")

        ex = TextExtractor()
        ex.feed(html)
        return {"total": total, "chapter": chapter, "content": ex.text()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db), _admin=Depends(get_current_admin)):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="书籍不存在")
    for path in (book.file_path, book.cover_path):
        if path and os.path.exists(path):
            os.remove(path)
    db.delete(book)
    db.commit()
    return {"message": "删除成功"}

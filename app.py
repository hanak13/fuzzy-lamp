"""
Whiteboard Web App - FastAPI Backend
Phase 7: SQLite Boards Storage, Boards List Page & Auto-Save
"""

import base64
import io
import os
import re
import time
from typing import List, Optional

from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, Response, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pptx import Presentation
from pptx.util import Inches
from pydantic import BaseModel
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdf_canvas

import db

# Initialize FastAPI application
app = FastAPI(title="Whiteboard App", version="0.1.1")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STICKERS_DIR = os.path.join(BASE_DIR, "stickers")
os.makedirs(STICKERS_DIR, exist_ok=True)

# Cache-Control middleware to prevent browsers from serving stale CSS and JS during development
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# Mount static directory for CSS, JS, and vendor libraries
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount stickers directory for local persistent sticker files
app.mount("/stickers", StaticFiles(directory=STICKERS_DIR), name="stickers")

# Configure template directory
templates = Jinja2Templates(directory="templates")

ALLOWED_EXTENSIONS = {".png", ".svg", ".gif"}

# Ensure SQLite database is initialized
db.init_db()


# Pydantic Schemas for Board API
class BoardCreate(BaseModel):
    name: Optional[str] = "New Board"
    bg_color: Optional[str] = "#f8fafc"
    data: Optional[str] = None


class BoardUpdate(BaseModel):
    data: Optional[str] = None
    bg_color: Optional[str] = None
    name: Optional[str] = None


class BoardRename(BaseModel):
    name: str


class SlideExportItem(BaseModel):
    image_data: str
    title: Optional[str] = None
    step_num: Optional[int] = None


class PresentationExportRequest(BaseModel):
    title: Optional[str] = "Presentation"
    aspect_ratio: Optional[str] = "16:9"
    slides: List[SlideExportItem]


def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and keep safe filename."""
    base = os.path.basename(filename)
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", base)
    return clean or f"sticker_{int(time.time())}"


# -----------------------------------------------------------------------------
# HTML Pages
# -----------------------------------------------------------------------------
@app.get("/")
async def index(request: Request):
    """
    Redirect root to the Boards dashboard page.
    """
    return RedirectResponse(url="/boards", status_code=302)


@app.get("/whiteboard", response_class=HTMLResponse)
async def whiteboard(request: Request, board: Optional[str] = None):
    """
    Serve the main whiteboard canvas page.
    Optionally accepts a ?board=<id> parameter.
    """
    initial_id = board
    if not initial_id:
        boards = db.list_boards()
        initial_id = boards[0]["id"] if boards else "board_main"

    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"initial_board_id": initial_id, "asset_version": int(time.time())}
    )


@app.get("/boards", response_class=HTMLResponse)
async def boards_list_page(request: Request):
    """
    Serve the dedicated Board List dashboard page.
    """
    return templates.TemplateResponse(
        request=request,
        name="boards.html",
        context={"asset_version": int(time.time())}
    )


@app.get("/board/{board_id}", response_class=HTMLResponse)
async def board_page(request: Request, board_id: str):
    """
    Serve a specific whiteboard canvas by route.
    """
    board = db.get_board(board_id)
    target_id = board_id if board else "board_main"
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"initial_board_id": target_id, "asset_version": int(time.time())}
    )


# -----------------------------------------------------------------------------
# SQLite Boards REST APIs
# -----------------------------------------------------------------------------
@app.get("/api/boards")
async def api_list_boards():
    """
    List all boards stored in SQLite.
    """
    boards = db.list_boards()
    return JSONResponse(boards)


@app.get("/api/boards/{board_id}")
async def api_get_board(board_id: str):
    """
    Get full board details and Fabric.js JSON data from SQLite.
    """
    board = db.get_board(board_id)
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return JSONResponse(board)


@app.post("/api/boards")
async def api_create_board(payload: BoardCreate):
    """
    Create a new board in SQLite.
    """
    board = db.create_board(
        name=payload.name or "New Board",
        bg_color=payload.bg_color or "#f8fafc",
        data=payload.data
    )
    return JSONResponse(board, status_code=201)


@app.put("/api/boards/{board_id}")
async def api_update_board(board_id: str, payload: BoardUpdate):
    """
    Save board Fabric.js JSON, background color, and metadata to SQLite.
    """
    now = int(time.time())
    success = db.update_board(
        board_id=board_id,
        data=payload.data,
        bg_color=payload.bg_color,
        name=payload.name
    )
    if not success:
        raise HTTPException(status_code=404, detail="Board not found")
    return JSONResponse({"success": True, "id": board_id, "updated_at": now})


@app.patch("/api/boards/{board_id}/rename")
async def api_rename_board(board_id: str, payload: BoardRename):
    """
    Rename a board in SQLite.
    """
    success = db.rename_board(board_id=board_id, new_name=payload.name)
    if not success:
        raise HTTPException(status_code=404, detail="Board not found")
    return JSONResponse({"success": True, "id": board_id, "name": payload.name})


@app.delete("/api/boards/{board_id}")
async def api_delete_board(board_id: str):
    """
    Delete a board from SQLite.
    """
    success = db.delete_board(board_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete the only board or board not found")
    return JSONResponse({"success": True, "id": board_id})


# -----------------------------------------------------------------------------
# Stickers REST APIs
# -----------------------------------------------------------------------------
@app.get("/api/stickers")
async def list_stickers():
    """
    Return all stickers in the local stickers/ folder.
    """
    stickers = []
    if os.path.exists(STICKERS_DIR):
        for fname in os.listdir(STICKERS_DIR):
            ext = os.path.splitext(fname)[1].lower()
            if ext in ALLOWED_EXTENSIONS:
                fpath = os.path.join(STICKERS_DIR, fname)
                try:
                    stat = os.stat(fpath)
                    name = os.path.splitext(fname)[0].replace("_", " ").replace("-", " ").title()
                    stickers.append({
                        "filename": fname,
                        "name": name,
                        "url": f"/stickers/{fname}",
                        "ext": ext.replace(".", ""),
                        "size": stat.st_size,
                        "updatedAt": int(stat.st_mtime)
                    })
                except OSError:
                    continue

    stickers.sort(key=lambda s: s["updatedAt"], reverse=True)
    return JSONResponse(stickers)


@app.post("/api/stickers")
async def upload_stickers(files: List[UploadFile] = File(...)):
    """
    Upload one or more PNG, SVG, or GIF stickers to stickers/ folder.
    """
    uploaded = []
    for file in files:
        original_name = file.filename or "sticker"
        ext = os.path.splitext(original_name)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported format '{ext}'. Only PNG, SVG, and GIF are supported."
            )

        clean_base = sanitize_filename(os.path.splitext(original_name)[0])
        safe_filename = f"{clean_base}{ext}"
        target_path = os.path.join(STICKERS_DIR, safe_filename)

        if os.path.exists(target_path):
            safe_filename = f"{clean_base}_{int(time.time()*1000) % 1000000}{ext}"
            target_path = os.path.join(STICKERS_DIR, safe_filename)

        content = await file.read()
        with open(target_path, "wb") as f:
            f.write(content)

        stat = os.stat(target_path)
        name = os.path.splitext(safe_filename)[0].replace("_", " ").replace("-", " ").title()
        uploaded.append({
            "filename": safe_filename,
            "name": name,
            "url": f"/stickers/{safe_filename}",
            "ext": ext.replace(".", ""),
            "size": stat.st_size,
            "updatedAt": int(stat.st_mtime)
        })

    return JSONResponse(uploaded)


@app.delete("/api/stickers/{filename}")
async def delete_sticker(filename: str):
    """
    Delete a sticker from the stickers/ folder.
    """
    safe_name = os.path.basename(filename)
    target_path = os.path.join(STICKERS_DIR, safe_name)

    if not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="Sticker not found")

    try:
        os.remove(target_path)
        return {"success": True, "filename": safe_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# -----------------------------------------------------------------------------
# Fixed Width Slide / Document Presentation Exports (PPTX & PDF)
# -----------------------------------------------------------------------------
@app.post("/api/export/pptx")
async def export_pptx(payload: PresentationExportRequest):
    """
    Generate and stream a PowerPoint presentation (.pptx) from slide image captures.
    """
    prs = Presentation()

    aspect = (payload.aspect_ratio or "16:9").lower()
    if aspect == "4:3":
        prs.slide_width = Inches(10)
        prs.slide_height = Inches(7.5)
    elif aspect == "a4":
        prs.slide_width = Inches(8.27)
        prs.slide_height = Inches(11.69)
    else:  # Default 16:9 Widescreen
        prs.slide_width = Inches(13.333)
        prs.slide_height = Inches(7.5)

    blank_layout = prs.slide_layouts[6]

    for item in payload.slides:
        slide = prs.slides.add_slide(blank_layout)
        data = item.image_data
        if "," in data:
            data = data.split(",", 1)[1]
        try:
            img_bytes = base64.b64decode(data)
            img_stream = io.BytesIO(img_bytes)
            slide.shapes.add_picture(
                img_stream,
                left=0,
                top=0,
                width=prs.slide_width,
                height=prs.slide_height
            )
        except Exception as e:
            print(f"Error embedding slide image in PPTX: {e}")

    out = io.BytesIO()
    prs.save(out)
    out.seek(0)

    clean_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', payload.title or "presentation")
    filename = f"{clean_title}.pptx"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return Response(
        content=out.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers=headers
    )


@app.post("/api/export/pdf")
async def export_pdf(payload: PresentationExportRequest):
    """
    Generate and stream a PDF document (.pdf) from slide image captures.
    """
    out = io.BytesIO()
    aspect = (payload.aspect_ratio or "16:9").lower()
    if aspect == "4:3":
        page_width, page_height = 720.0, 540.0  # 10 x 7.5 inches in points
    elif aspect == "a4":
        page_width, page_height = 595.28, 841.89  # Standard A4 portrait in points
    else:  # 16:9 Widescreen landscape (960 x 540 points)
        page_width, page_height = 960.0, 540.0

    c = pdf_canvas.Canvas(out, pagesize=(page_width, page_height))

    for item in payload.slides:
        data = item.image_data
        if "," in data:
            data = data.split(",", 1)[1]
        try:
            img_bytes = base64.b64decode(data)
            img_stream = io.BytesIO(img_bytes)
            img_reader = ImageReader(img_stream)
            c.drawImage(img_reader, 0, 0, width=page_width, height=page_height)
            c.showPage()
        except Exception as e:
            print(f"Error embedding page in PDF: {e}")

    c.save()
    out.seek(0)

    clean_title = re.sub(r'[^a-zA-Z0-9_\-]', '_', payload.title or "document")
    filename = f"{clean_title}.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return Response(
        content=out.getvalue(),
        media_type="application/pdf",
        headers=headers
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

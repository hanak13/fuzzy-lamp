"""
Whiteboard Web App - FastAPI Backend
Phase 6: Stickers Panel & Local Shared Stickers Storage
"""

import os
import re
import time
from typing import List

from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Initialize FastAPI application
app = FastAPI(title="Whiteboard App")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STICKERS_DIR = os.path.join(BASE_DIR, "stickers")
os.makedirs(STICKERS_DIR, exist_ok=True)

# Mount static directory for CSS, JS, and vendor libraries
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount stickers directory for local persistent sticker files
app.mount("/stickers", StaticFiles(directory=STICKERS_DIR), name="stickers")

# Configure template directory
templates = Jinja2Templates(directory="templates")

ALLOWED_EXTENSIONS = {".png", ".svg", ".gif"}


def sanitize_filename(filename: str) -> str:
    """Strip dangerous characters and keep safe filename."""
    base = os.path.basename(filename)
    # Remove anything not alphanumeric, underscore, hyphen or dot
    clean = re.sub(r"[^a-zA-Z0-9_\-\.]", "_", base)
    return clean or f"sticker_{int(time.time())}"


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """
    Serve the main whiteboard page.
    """
    return templates.TemplateResponse(request=request, name="index.html")


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

    # Sort most recently modified first
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

        # Avoid collision by appending timestamp if file already exists
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


if __name__ == "__main__":
    import uvicorn
    # Run server on all network interfaces so other devices on Wi-Fi can connect
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

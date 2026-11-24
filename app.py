"""
Whiteboard Web App - FastAPI Backend
Phase 7: SQLite Boards Storage, Boards List Page & Auto-Save
"""

import base64
import io
import os
import random
import re
import socket
import time
import uuid
from typing import Dict, List, Optional

from fastapi import FastAPI, Request, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, JSONResponse, Response, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pptx import Presentation
from pptx.util import Inches
from pydantic import BaseModel
import qrcode
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as pdf_canvas

import db

# Initialize FastAPI application
app = FastAPI(title="Whiteboard App", version="0.3.0")

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


# -----------------------------------------------------------------------------
# LAN Real-Time Collaboration (WebSockets, Room Manager, QR Code & Network Info)
# -----------------------------------------------------------------------------

COLLAB_ADJECTIVES = [
    "Blue", "Red", "Green", "Golden", "Silver", "Swift", "Bright", "Clever",
    "Calm", "Brave", "Wild", "Cosmic", "Sunny", "Silent", "Amber", "Ruby",
    "Emerald", "Azure", "Copper", "Shadow"
]

COLLAB_ANIMALS = [
    "Fox", "Owl", "Koala", "Panda", "Tiger", "Falcon", "Dolphin", "Otter",
    "Lynx", "Bear", "Wolf", "Hawk", "Rabbit", "Eagle", "Lion", "Badger",
    "Stag", "Jaguar", "Beaver", "Penguin"
]

COLLAB_COLORS = [
    "#3b82f6",  # blue
    "#10b981",  # emerald
    "#f59e0b",  # amber
    "#ef4444",  # red
    "#8b5cf6",  # violet
    "#ec4899",  # pink
    "#06b6d4",  # cyan
    "#14b8a6",  # teal
    "#f97316",  # orange
    "#6366f1",  # indigo
]


class RoomClient:
    """Represents an active WebSocket client inside a board collaboration room."""
    def __init__(
        self,
        ws: WebSocket,
        client_id: str,
        name: str,
        color: str,
        role: str = "guest",
        can_edit: bool = True,
        is_saver: bool = False,
        readonly: bool = False
    ):
        self.ws = ws
        self.id = client_id
        self.name = name
        self.color = color
        self.role = role  # "master" (host/owner) or "guest"
        self.can_edit = can_edit  # whether client currently has edit permission
        self.is_saver = is_saver
        self.readonly = readonly


class BoardRoom:
    """In-memory room managing connected clients and room options per board."""
    def __init__(self, board_id: str):
        self.board_id = board_id
        self.password: Optional[str] = None
        self.master_token: Optional[str] = None  # secret token held by room Master
        self.guests_can_edit: bool = False  # Master control: new joins are view-only by default
        self.master_viewport: Optional[dict] = None  # Teacher / Master visible screen boundary
        self.clients: Dict[str, RoomClient] = {}

    def get_users_list(self) -> List[dict]:
        return [
            {
                "id": c.id,
                "name": c.name,
                "color": c.color,
                "role": c.role,
                "can_edit": c.can_edit,
                "is_saver": c.is_saver,
                "readonly": c.readonly
            }
            for c in self.clients.values()
        ]


class RoomManager:
    """Coordinates multi-client board rooms, broadcasts, and saver election."""
    def __init__(self):
        self.rooms: Dict[str, BoardRoom] = {}

    def get_or_create_room(self, board_id: str) -> BoardRoom:
        if board_id not in self.rooms:
            self.rooms[board_id] = BoardRoom(board_id)
        return self.rooms[board_id]

    def remove_client(self, board_id: str, client_id: str) -> Optional[RoomClient]:
        room = self.rooms.get(board_id)
        if not room:
            return None
        client = room.clients.pop(client_id, None)
        if not room.clients:
            # Clean up empty room
            del self.rooms[board_id]
        elif client and client.is_saver and room.clients:
            # Elect next eligible non-readonly client as designated saver
            new_saver = next((c for c in room.clients.values() if not c.readonly), next(iter(room.clients.values())))
            new_saver.is_saver = True
        return client

    async def broadcast(self, board_id: str, message: dict, exclude_client_id: Optional[str] = None):
        room = self.rooms.get(board_id)
        if not room:
            return
        dead_clients = []
        for cid, client in list(room.clients.items()):
            if exclude_client_id and cid == exclude_client_id:
                continue
            try:
                await client.ws.send_json(message)
            except Exception:
                dead_clients.append(cid)
        for cid in dead_clients:
            self.remove_client(board_id, cid)


room_manager = RoomManager()


def get_lan_ip() -> str:
    """Detect LAN IP using standard socket module."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('10.255.255.255', 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


@app.get("/api/network-info")
async def api_network_info():
    """Return local host network information for LAN sharing."""
    ip = get_lan_ip()
    return JSONResponse({
        "ip": ip,
        "port": 8000
    })


@app.get("/api/qrcode")
async def api_generate_qrcode(data: str):
    """Generate QR Code as PNG without any external or CDN services."""
    if not data:
        raise HTTPException(status_code=400, detail="Data query parameter required")
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
    )


@app.websocket("/ws/{board_id}")
async def websocket_collab_endpoint(
    websocket: WebSocket,
    board_id: str,
    client_id: Optional[str] = None,
    readonly: bool = False,
    password: Optional[str] = None,
    token: Optional[str] = None,
    user_name: Optional[str] = None
):
    """
    WebSocket endpoint for real-time LAN collaboration per board.
    Handles user presence, Master vs Guest roles, live cursors, object synchronization,
    and granular guest edit permission toggles.
    """
    await websocket.accept()
    room = room_manager.get_or_create_room(board_id)

    # Room password protection check
    if room.password:
        if password != room.password:
            await websocket.send_json({
                "type": "error",
                "code": "PASSWORD_REQUIRED",
                "message": "Room password required or incorrect"
            })
            await websocket.close(code=4001)
            return

    if not client_id:
        client_id = f"client_{uuid.uuid4().hex[:8]}"

    # Determine Master vs Guest role - strictly at most ONE active Master per room
    existing_master = next((c for c in room.clients.values() if c.role == "master"), None)

    is_master = False
    if existing_master is None:
        # No active master currently connected in this room
        if room.master_token is None:
            # First client to start/initialize the room becomes Master
            room.master_token = uuid.uuid4().hex
            is_master = True
        elif token and token == room.master_token:
            # Reconnecting master reclaiming their role
            is_master = True
        else:
            # Room already initialized; all subsequent connections are guests
            is_master = False
    else:
        # A master is ALREADY actively connected in this room.
        # Check if this is the exact same master client reconnecting (e.g. tab refresh with same client_id)
        if token and token == room.master_token and client_id == existing_master.id:
            try:
                await existing_master.ws.close(code=1000)
            except Exception:
                pass
            room.clients.pop(existing_master.id, None)
            is_master = True
        else:
            # There is already an active master; strictly enforce that joiners are guests
            is_master = False

    role = "master" if is_master else "guest"
    can_edit = True if is_master else (room.guests_can_edit and not readonly)
    is_saver = is_master or (len([c for c in room.clients.values() if not c.readonly]) == 0 and not readonly)

    color = random.choice(COLLAB_COLORS)
    # Master can provide custom display name, otherwise default to friendly persona
    clean_custom_name = user_name.strip() if user_name and isinstance(user_name, str) and user_name.strip() else None
    name = clean_custom_name or f"{random.choice(COLLAB_ADJECTIVES)} {random.choice(COLLAB_ANIMALS)}"

    client = RoomClient(
        ws=websocket,
        client_id=client_id,
        name=name,
        color=color,
        role=role,
        can_edit=can_edit,
        is_saver=is_saver,
        readonly=readonly
    )
    room.clients[client_id] = client

    # 1. Send initialization configuration to new client
    await websocket.send_json({
        "type": "init",
        "user": {
            "id": client.id,
            "name": client.name,
            "color": client.color,
            "role": client.role,
            "can_edit": client.can_edit,
            "is_saver": client.is_saver,
            "readonly": client.readonly
        },
        "master_token": room.master_token if is_master else None,
        "guests_can_edit": room.guests_can_edit,
        "has_password": bool(room.password),
        "master_viewport": room.master_viewport
    })

    # 2. Send current online user roster
    await websocket.send_json({
        "type": "users",
        "users": room.get_users_list()
    })

    # 3. Broadcast join to all OTHER clients in the room (never echo back to sender)
    await room_manager.broadcast(
        board_id=board_id,
        message={
            "type": "join",
            "user": {
                "id": client.id,
                "name": client.name,
                "color": client.color,
                "role": client.role,
                "can_edit": client.can_edit,
                "readonly": client.readonly
            }
        },
        exclude_client_id=client_id
    )

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            # Room password setting from host / master
            if msg_type == "set_password":
                if client.role == "master":
                    new_pw = data.get("password")
                    room.password = (new_pw.strip() if isinstance(new_pw, str) and new_pw.strip() else None)
                    await room_manager.broadcast(
                        board_id=board_id,
                        message={"type": "password_status", "has_password": bool(room.password)}
                    )
                continue

            # Teacher / Master viewport broadcast (where teacher is looking on screen)
            if msg_type == "master_viewport":
                if client.role == "master":
                    room.master_viewport = {
                        "type": "master_viewport",
                        "x": data.get("x", 0),
                        "y": data.get("y", 0),
                        "width": data.get("width", 0),
                        "height": data.get("height", 0),
                        "screenWidth": data.get("screenWidth", 0),
                        "screenHeight": data.get("screenHeight", 0),
                        "zoom": data.get("zoom", 1.0),
                        "master_name": client.name,
                        "master_id": client.id
                    }
                    await room_manager.broadcast(
                        board_id=board_id,
                        message=room.master_viewport,
                        exclude_client_id=client_id
                    )
                continue

            # Master or user name change
            if msg_type == "set_name":
                new_name = (data.get("name") or "").strip()
                if new_name:
                    client.name = new_name
                    await room_manager.broadcast(
                        board_id=board_id,
                        message={"type": "user_renamed", "user_id": client.id, "name": client.name}
                    )
                    await room_manager.broadcast(
                        board_id=board_id,
                        message={"type": "users", "users": room.get_users_list()}
                    )
                continue

            # Master toggles global guest edit permission
            if msg_type == "set_guest_permissions":
                if client.role == "master":
                    allow_edit = bool(data.get("allow_edit", True))
                    room.guests_can_edit = allow_edit
                    for c in room.clients.values():
                        if c.role != "master":
                            c.can_edit = room.guests_can_edit and (not c.readonly)
                    await room_manager.broadcast(
                        board_id=board_id,
                        message={"type": "guest_permissions", "guests_can_edit": room.guests_can_edit}
                    )
                    await room_manager.broadcast(
                        board_id=board_id,
                        message={"type": "users", "users": room.get_users_list()}
                    )
                continue

            # Master toggles individual guest permission
            if msg_type == "set_user_permission":
                if client.role == "master":
                    target_id = data.get("user_id")
                    target = room.clients.get(target_id)
                    if target and target.role != "master":
                        target.can_edit = bool(data.get("can_edit", True)) and (not target.readonly)
                        try:
                            await target.ws.send_json({
                                "type": "permission_updated",
                                "can_edit": target.can_edit
                            })
                        except Exception:
                            pass
                        await room_manager.broadcast(
                            board_id=board_id,
                            message={"type": "users", "users": room.get_users_list()}
                        )
                continue

            # Block mutation events if client is read-only OR guest not allowed to edit
            if (client.readonly or not client.can_edit) and msg_type in (
                "object_added", "object_modified", "object_removed",
                "board_bg_changed", "step_changed", "slide_changed", "board_renamed"
            ):
                continue

            # Attach user metadata to cursor movements
            if msg_type == "cursor":
                data["user_id"] = client.id
                data["name"] = client.name
                data["color"] = client.color
                data["role"] = client.role

            # Broadcast to other clients in room, never back to sender
            await room_manager.broadcast(
                board_id=board_id,
                message=data,
                exclude_client_id=client_id
            )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Collab WebSocket connection terminated for {client_id}: {e}")
    finally:
        leaving_client = room_manager.remove_client(board_id, client_id)
        if leaving_client:
            # If leaving client was master, clear master viewport
            if leaving_client.role == "master":
                room = room_manager.rooms.get(board_id)
                if room:
                    room.master_viewport = None
                await room_manager.broadcast(
                    board_id=board_id,
                    message={"type": "master_viewport_cleared", "user_id": client_id}
                )

            # Broadcast leave to remaining users
            await room_manager.broadcast(
                board_id=board_id,
                message={"type": "leave", "user_id": client_id}
            )
            # If leaving client was saver, notify new elected saver
            room = room_manager.rooms.get(board_id)
            if room:
                for c in room.clients.values():
                    if c.is_saver:
                        try:
                            await c.ws.send_json({"type": "saver_status", "is_saver": True})
                        except Exception:
                            pass
                        break


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

"""
Database layer for Whiteboard App using Python built-in sqlite3.
Stores board metadata, canvas JSON data, background colors, and timestamps.
"""

import os
import json
import time
import sqlite3
from typing import List, Dict, Optional, Any

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "whiteboard.db")


def get_connection() -> sqlite3.Connection:
    """Return a connection with Row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize SQLite tables and ensure a default board exists."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS boards (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                data TEXT NOT NULL,
                bg_color TEXT NOT NULL DEFAULT '#f8fafc',
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        """)
        conn.commit()

        # Check if table is empty, if so create initial default board
        cursor.execute("SELECT COUNT(*) AS count FROM boards;")
        count = cursor.fetchone()["count"]
        if count == 0:
            now = int(time.time())
            default_data = json.dumps({"version": "5.3.0", "objects": []})
            cursor.execute("""
                INSERT INTO boards (id, name, data, bg_color, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?);
            """, ("board_main", "Main Board", default_data, "#f8fafc", now, now))
            conn.commit()


def list_boards() -> List[Dict[str, Any]]:
    """Return all boards summary (excluding heavy canvas json) sorted by updated_at desc."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, data, bg_color, created_at, updated_at
            FROM boards
            ORDER BY updated_at DESC;
        """)
        rows = cursor.fetchall()
        boards = []
        for row in rows:
            obj_count = 0
            try:
                parsed = json.loads(row["data"])
                if isinstance(parsed, dict) and isinstance(parsed.get("objects"), list):
                    obj_count = len(parsed["objects"])
            except Exception:
                pass

            boards.append({
                "id": row["id"],
                "name": row["name"],
                "bg_color": row["bg_color"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "object_count": obj_count
            })
        return boards


def get_board(board_id: str) -> Optional[Dict[str, Any]]:
    """Return full board record including canvas JSON data."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, name, data, bg_color, created_at, updated_at
            FROM boards
            WHERE id = ?;
        """, (board_id,))
        row = cursor.fetchone()
        if not row:
            return None

        obj_count = 0
        try:
            parsed = json.loads(row["data"])
            if isinstance(parsed, dict) and isinstance(parsed.get("objects"), list):
                obj_count = len(parsed["objects"])
        except Exception:
            pass

        return {
            "id": row["id"],
            "name": row["name"],
            "data": row["data"],
            "bg_color": row["bg_color"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "object_count": obj_count
        }


def create_board(name: str = "New Board", bg_color: str = "#f8fafc", data: Optional[str] = None) -> Dict[str, Any]:
    """Create a new board in SQLite."""
    init_db()
    board_id = f"board_{int(time.time())}_{os.urandom(3).hex()}"
    now = int(time.time())
    if not data:
        data = json.dumps({"version": "5.3.0", "objects": []})

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO boards (id, name, data, bg_color, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (board_id, name.strip() or "Untitled Board", data, bg_color, now, now))
        conn.commit()

    return {
        "id": board_id,
        "name": name.strip() or "Untitled Board",
        "bg_color": bg_color,
        "created_at": now,
        "updated_at": now,
        "object_count": 0
    }


def update_board(board_id: str, data: Optional[str] = None, bg_color: Optional[str] = None, name: Optional[str] = None) -> bool:
    """Update board data, background color and/or name."""
    init_db()
    now = int(time.time())
    updates = ["updated_at = ?"]
    params = [now]

    if data is not None:
        updates.append("data = ?")
        params.append(data)
    if bg_color is not None:
        updates.append("bg_color = ?")
        params.append(bg_color)
    if name is not None:
        updates.append("name = ?")
        params.append(name.strip())

    params.append(board_id)
    sql = f"UPDATE boards SET {', '.join(updates)} WHERE id = ?;"

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, tuple(params))
        conn.commit()
        return cursor.rowcount > 0


def rename_board(board_id: str, new_name: str) -> bool:
    """Rename a board in SQLite."""
    return update_board(board_id, name=new_name)


def delete_board(board_id: str) -> bool:
    """Delete a board. Fails if only 1 board exists."""
    init_db()
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS count FROM boards;")
        count = cursor.fetchone()["count"]
        if count <= 1:
            return False

        cursor.execute("DELETE FROM boards WHERE id = ?;", (board_id,))
        conn.commit()
        return cursor.rowcount > 0

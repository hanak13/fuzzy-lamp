# Whiteboard Web App

An offline-first, open-source collaborative whiteboard web app built with **Python (FastAPI)** on the backend and **vanilla HTML/CSS/JavaScript with Fabric.js** on the frontend.

---

## Current Status: Phase 1 Completed

Phase 1 establishes the initial project structure, local offline server, and responsive interactive canvas:
- **FastAPI backend** running on `http://localhost:8000`.
- **Offline Fabric.js** loaded locally from `static/vendor/fabric.min.js` (no CDN links).
- **Full-screen interactive canvas** with automatic window resizing.
- **Top toolbar** with Select mode, Pan mode, Undo/Redo controls, Add Box test button, and Clear.
- **Infinite grid background** that stays synchronized during panning and zooming.
- **Pan & Zoom**:
  - Pan via Pan Tool (`H`), Spacebar + Left Mouse Drag, or Middle Mouse Button Drag.
  - Zoom via Mouse Wheel towards cursor or bottom-right zoom widget (`+` / `-`).
  - Zoom percentage pill indicator at bottom-right (click or press Reset to return to 100%).
- **Undo / Redo** history system with toolbar buttons and keyboard shortcuts (`Ctrl+Z` / `Ctrl+Y`).

---

## Project Structure

```text
White_board/
├── app.py                      # FastAPI server application
├── requirements.txt            # Python dependencies
├── README.md                   # Project documentation & run guide
├── templates/
│   └── index.html              # Main whiteboard HTML page
└── static/
    ├── css/
    │   └── style.css           # Styling for toolbar, canvas, and zoom widget
    ├── js/
    │   └── whiteboard.js       # Fabric.js initialization, pan, zoom, undo/redo
    └── vendor/
        └── fabric.min.js       # Offline Fabric.js library (v5.3.1)
```

---

## Requirements

- Python 3.8+ (tested on Python 3.12)
- Dependencies listed in `requirements.txt`:
  - `fastapi`
  - `uvicorn[standard]`
  - `jinja2`

---

## How to Install & Run

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Start the FastAPI server**:
   ```bash
   python app.py
   ```
   *(Or using uvicorn directly: `uvicorn app:app --reload --host 127.0.0.1 --port 8000`)*

3. **Open the whiteboard**:
   Open your browser and navigate to:
   [http://localhost:8000](http://localhost:8000)

---

## How to Test Phase 1 Features

1. **Full-screen Canvas & Grid Background**:
   - Open [http://localhost:8000](http://localhost:8000). The canvas fills the entire browser window with a crisp grid background.
   - Resize your browser window; the canvas adapts dynamically.

2. **Add Box (Sample Shape)**:
   - Click **+ Add Box** in the top toolbar to spawn sample boxes on the canvas.
   - In **Select mode (`V`)**, click and drag the boxes, resize them with handles, or rotate them.

3. **Pan (Drag)**:
   - **Method A**: Click the **Pan (H)** button in the toolbar, then click and drag anywhere to pan the canvas and grid.
   - **Method B**: In Select mode, hold down the **Spacebar** and drag with your mouse.
   - **Method C**: Press and drag with the **Middle Mouse Button**.
   - Note how the grid lines move naturally in sync with the canvas.

4. **Zoom (Mouse Wheel & Controls)**:
   - Scroll the **mouse wheel up/down** over the canvas. The canvas zooms in and out relative to the mouse cursor.
   - Check the **bottom-right zoom pill**; notice the live percentage update (e.g. `120%`, `80%`).
   - Click `+` or `-` in the bottom-right widget to step zoom in/out.
   - Click **Reset** or click directly on the percentage text to reset back to 100% zoom and center.

5. **Undo / Redo**:
   - Click **+ Add Box** or move an existing box.
   - Click the **Undo** button in the toolbar (or press `Ctrl+Z`). The last action reverts.
   - Click the **Redo** button in the toolbar (or press `Ctrl+Y`). The reverted action is restored.
   - Buttons automatically disable when no further history is available.

6. **Offline Verification**:
   - Turn off your network connection or inspect DevTools Network tab. No external requests are made; all assets (Fabric.js, CSS, JS) load locally from `static/`.

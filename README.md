# Whiteboard Web App

An offline-first, open-source collaborative whiteboard web app built with **Python (FastAPI)** on the backend and **vanilla HTML/CSS/JavaScript with Fabric.js** on the frontend.

---

## Current Status: Phase 4 Completed

Phases 1 through 4 provide a comprehensive offline whiteboard web application:
- **FastAPI backend** running on `http://localhost:8000`.
- **Offline Fabric.js** loaded locally from `static/vendor/fabric.min.js` (no CDN links).
- **Full-screen interactive canvas** with automatic window resizing and synced grid.
- **Left Navigation Sidebar Dock & Hidden Flyout Drawer**:
  - Docked primary left navigation dock with **6 quick-access buttons**:
    1. **Shapes**: Opens the Shapes Library with search.
    2. **Stickers**: Staged and ready for the upcoming stickers feature.
    3. **Templates**: Flowcharts, mind maps, and whiteboard layouts.
    4. **Media**: Image uploads and media assets.
    5. **Icons**: UI symbols and diagram graphics.
    6. **Layers**: Canvas object hierarchy and ordering.
  - **Hidden by Default**: The drawer stays tucked away and slides out only when the user selects a sidebar button or the toolbar toggle. Clicking the active button again or the close button immediately dismisses the drawer to preserve maximum canvas workspace.
  - **Search & Shape Library**: Real-time filtering by shape name or category.
  - **Built-in Shapes** (using native Fabric.js classes):
    - **Rectangle** (`fabric.Rect`)
    - **Rounded Rectangle** (`fabric.Rect` with `rx`, `ry`)
    - **Circle** (`fabric.Circle`)
    - **Triangle** (`fabric.Triangle`)
  - **Custom SVG Shapes** (loaded dynamically from `static/shapes.json`):
    - **Diamond**, **Star**, **Pentagon**, **Hexagon**
    - **Arrows**: Right, Left, Up, Down
    - **Cloud**, **Cross**, **Cylinder**, **Speech Bubble**
    - Extensible architecture: contributors can add new shapes simply by editing `static/shapes.json` with an SVG path!
  - **Shape Formatting & Text Inside**:
    - Supports customizable **Fill Color** and **Border Color** via toolbar pickers.
    - Each shape is built as a Fabric.js group containing the shape geometry and a centered `fabric.Textbox`.
    - **Double-click to edit** text inside any shape.
    - Moves, resizes/scales, rotates, and deletes as a single cohesive unit.
- **Sticky Note Tool (`S` or `N`)**:
  - Fabric.js Group of a rounded rectangle (with soft drop shadow) and editable text.
  - 4 pastel color presets: **Yellow**, **Pink**, **Green**, and **Blue**.
  - Double-click to edit text, toolbar swatch to re-color active note.
- **Freehand Drawing Tools**:
  - **Pen (`P`)**: Smooth freehand drawing with `fabric.PencilBrush`, color, and size options.
  - **Highlighter (`K`)**: Translucent highlighting with `fabric.PencilBrush`.
  - **Eraser (`E`)**: Erasing with `fabric.PencilBrush` (`destination-out` pixel masking + object click-to-delete).
- **Text Tool (`T`)**: Click anywhere to type using `fabric.IText`, with font size, color, bold, and italic.
- **Select Tool (`V`)**: Move, resize, and delete any object, shape, or sticky note (`Delete` / `Backspace`).
- **Undo / Redo (`Ctrl+Z` / `Ctrl+Y`)**: 50-step history tracking covering shapes, paths, text, sticky notes, and deletions.
- **Pan & Zoom**: Spacebar / Hand drag, mouse-wheel zoom centered at cursor, bottom-right zoom widget.

---

## Project Structure

```text
white-board/
├── app.py                      # FastAPI server application
├── requirements.txt            # Python dependencies
├── README.md                   # Project documentation & run guide
├── templates/
│   └── index.html              # Main whiteboard HTML page with toolbar & shapes panel
└── static/
    ├── shapes.json             # SVG path definitions for custom shapes
    ├── css/
    │   └── style.css           # Styling for toolbar, canvas, zoom widget, & shapes panel
    ├── js/
    │   └── whiteboard.js       # Complete whiteboard interaction & Fabric.js logic
    └── vendor/
        └── fabric.min.js       # Offline Fabric.js library (v5.3.0)
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

# Whiteboard Web App

An offline-first, open-source collaborative whiteboard web app built with **Python (FastAPI)** on the backend and **vanilla HTML/CSS/JavaScript with Fabric.js** on the frontend.

---

## Current Status: Phase 9 - Export, Import, Image Upload & Polish Completed

Phases 1 through 9 provide a comprehensive offline whiteboard web application:
- **FastAPI backend** running on `http://localhost:8000` with **SQLite database persistence** (`boards.db`) for all boards and auto-saving every 3 seconds.
- **Offline Fabric.js** loaded locally from `static/vendor/fabric.min.js` (no CDN links).
- **Full-screen interactive canvas** with automatic window resizing and synced grid.
- **Fixed Top-Left App Brand**: "✏️ Whiteboard" badge anchored at `top: 14px; left: 14px`.
- **Top Toolbar**: Select (`V`), Pan (`H`), Pen (`P`), Highlighter (`K`), Eraser (`E`), Text (`T`), Line (`L`), Arrow (`A`), plus color, size, font, undo/redo controls.
- **Dark Mode UI Theme Toggle**: One-click theme switcher in top bar with `localStorage` persistence.
- **Export & Download Suite**: PNG (2x high-res), SVG, PDF (single board or multi-page Step Box / slides), PPTX, and full board `.json` backup.
- **Board JSON Import**: Import any exported `.json` board as a new board in SQLite with complete step boxes and step contents preserved.
- **Image Upload & Pasting**: Upload PNG, JPG, or SVG images onto the canvas via file browser, direct drag-and-drop, or clipboard pasting (`Ctrl + V`).
- **Left Navigation Sidebar Dock & Panels**:
  1. **Shapes**: Over 280+ engineering, flowchart, UML, architecture, circuit, and logic gate shapes.
  2. **Notes (Sticky Note)**: Quick pastel notes (`S` or `N`).
  3. **Stickers**: Shared stickers gallery with local upload (PNG, SVG, GIF) and drag-and-drop onto canvas.
  4. **Templates**: Flowchart, mind map, and wireframe layouts.
  5. **Media & Uploads**: Upload, preview, and reuse PNG, JPG, and SVG graphic assets onto canvas.
  6. **Icons**: UI symbols and diagram graphics.
  7. **Layers**: Canvas object hierarchy and ordering.
  8. **Step Box**: Scoped multi-step sequential diagrams inside container boxes.
- **Phase 8: Step Box Feature**:
  - **Sidebar Activation**: Click the Step Box icon in the left dock, then click and drag on the canvas to draw a dashed container box with a live header label.
  - **Scoped Multi-Step Sequencing**: Each Step Box maintains its own ordered list of steps (`Step 1 / N`). Objects inside the box belong to the box; objects outside are strictly untouched.
  - **Floating Controls**: Automatically hover under the selected Step Box with `◀ Back`, `Step X / Y`, `Next ▶`, `+` (Add Step), and `🗑` (Delete Step).
  - **Copy-on-Add (`+`)**: Clicking `+` captures the current step snapshot and duplicates it into a new step so you can build incrementally.
  - **Step Isolation & Switching**: `◀ Back` and `Next ▶` automatically save changes in the current step and restore the target step's contents relative to the box's coordinates.
  - **Transform Tracking**: Moving or resizing the Step Box moves and scales its nested contents simultaneously.
  - **SQLite Auto-Save & Zero Migration**: Persisted in the board's JSON data in SQLite; legacy boards without Step Boxes load with zero errors.
  - **Hidden by Default**: The drawer stays tucked away and slides out only when the user selects a sidebar button. Clicking the active button again or the close button immediately dismisses the drawer to preserve maximum canvas workspace.
  - **Search & Shape Library**: Real-time filtering by shape name or category across 280+ shapes.
  - **Comprehensive Domain Categories**:
    - **General Shapes** (20): Circle, Ellipse, Line, Arrow, Polygon, Star, Cloud, Speech Bubble, Image Stamp, Emoji Stamp, Heart, Diamond/Rhombus, Pentagon, Hexagon, Donut/Ring, Connector with Snap, Freeform Polyline, Text on Path, Frame, Flag/Pennant.
    - **Flowchart & Process** (25): Process, Decision, Terminator, Data I/O, Predefined Process, Manual Operation, Document, Multiple Documents, Database Cylinder, Stored Data, Delay, Preparation, Connector Circle, Off-Page Connector, Merge, Extract, Sort, Loop Limit, Annotation, Flow Line, Summing Junction, Or Junction, Subprocess, Display, Internal Storage.
    - **Digital Logic Gates** (10): AND, OR, NOT, NAND, NOR, XOR, XNOR, Buffer, Tri-State Buffer, Schmitt Trigger.
    - **Digital Circuit Components** (16): Multiplexer (MUX), Demultiplexer (DEMUX), Encoder, Decoder, Half Adder, Full Adder, Half Subtractor, Full Subtractor, SR Flip-Flop, D Flip-Flop, JK Flip-Flop, T Flip-Flop, Counter, Register, Shift Register, Comparator.
    - **Computer Architecture** (14): CPU, GPU, RAM, ROM, Cache Memory, ALU, Control Unit, Register File, Input/Output Unit, Bus, Memory Controller, Storage Device, Clock Generator, Interrupt Controller.
    - **UML Shapes & Connectors** (27): Class, Interface, Object, Actor, Use Case, Component, Package, Node, Artifact, State, Activity, Initial State, Final State, Fork/Join, Lifeline, Activation Bar, Note, Association, Aggregation, Composition, Inheritance, Dependency, Realization, Synchronous Message, Asynchronous Message, Return Message, Self Message.
    - **Software Architecture & Cloud** (28): Client, Server, API Gateway, Microservice, Load Balancer, Message Broker, Event Bus, Database, Cache, Queue, CDN, Firewall, External Service, Cloud Provider, Virtual Machine, Container, Kubernetes Cluster, Object Storage, Block Storage, File Storage, Database Service, Serverless Function, API Management, CDN Distribution, Cloud Load Balancer, Availability Zone, Region, VPC.
    - **Networking** (24): Router, Switch, Hub, Firewall, Modem, Wi-Fi AP, Wireless Router, Ethernet Port, Network Cloud, LAN, WAN, VPN Gateway, Proxy Server, DNS Server, DHCP Server, Web Server, Mail Server, Client PC, Laptop, Desktop, Printer, Network Storage, Internet, Boundary.
    - **DevOps, CI/CD & Kubernetes** (49): Source Code, Git Repo, Git Branch, Commit, Pull Request, Build, Test, Code Quality, Security Scan, Artifact Repo, Docker Build, Container Registry, Deployment, Release, Approval Gate, Pipeline Trigger, Pipeline Stage, Failure, Success, Rollback, Docker Container, Image, Registry, K8s Cluster, Node, Pod, Deployment, ReplicaSet, StatefulSet, DaemonSet, Service, Ingress, ConfigMap, Secret, Persistent Volume, PVC, Namespace, Job, CronJob, HPA, Terraform, Ansible, IaC Module, Config File, State File, Provisioning, Resource, Plan, Apply.
    - **Database & Data Engineering** (30): Database Cylinder, Relational DB, NoSQL, Document DB, Key-Value Store, Graph DB, Time-Series DB, Data Warehouse, Data Lake, Data Lakehouse, Table, Schema, Entity, Attribute, Primary Key, Foreign Key, Relationship, 1:1, 1:N, M:N, ETL Process, Data Pipeline, Data Source, Data Sink, Stream Processor, Kafka Topic, Kafka Producer, Kafka Consumer, Transformation, Validation.
    - **Industrial Automation & Industry 4.0** (40): PLC, SCADA, HMI Panel, DCS, Industrial Robot, Robotic Arm, Conveyor Belt, CNC Machine, Motor, Pump, Valve, Compressor, Industrial Sensor, Temperature Sensor, Pressure Sensor, Proximity Sensor, Actuator, Relay, Control Panel, Emergency Stop, Digital Twin, IoT Gateway, IoT Sensor, Edge Device, Edge Gateway, Smart Factory, AGV/AMR, Machine Vision, Predictive Maintenance, Industrial Cloud, OPC UA Gateway, MQTT Broker, MES, ERP, Manufacturing Execution, Production Line, Quality Inspection, Energy Monitoring, Asset Tracking, Industrial Network.
  - **Extensible Architecture**: All custom shapes are defined in `static/shapes.json` with standard SVG vector paths.
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
- **Multi-Select, Merge & Custom "My Shapes" Library**:
  - **Multi-Select**: Select multiple objects with `Shift + Click` or drag-selection marquee.
  - **Right-Click Context Menu**:
    - Right-clicking on multiple selected objects reveals the **"Merge Objects"** option.
    - Right-clicking on any shape or diagram reveals **"Save to My Shapes"**, **"Export as SVG"**, and **"Export as JPG"** (as well as Duplicate, Bring to Front, Send to Back, and Delete).
    - **Export as SVG**: Exports the selected shape as a standalone vector SVG file with viewBox and transparency intact.
    - **Export as JPG**: Renders the selected shape at 2x crisp resolution with a clean white background.
  - **Merge Objects (`Ctrl + G`)**: Unifies individual shapes, diagrams, and connectors into a single compound group.
  - **Save to My Shapes**: Prompts for a name, generates a thumbnail preview, serializes the exact geometry, and persists it in `localStorage`.
  - **"⭐ My Shapes" Category**: Accessible in the left Shapes drawer panel. Displays all user-saved diagrams with crisp thumbnails and a red delete (`×`) button so users can remove any custom shape whenever they want.
  - **Instant Placement**: Clicking any saved custom shape card immediately instantiates a fresh copy onto the canvas.
- **Comprehensive Keyboard Shortcuts & Modal**:
  - Full support for 40+ shortcuts spanning **Basic Editing**, **Canvas Navigation**, **Drawing Tools**, **Text Formatting**, and **Object Arrangement**.
  - Built-in shortcuts cheat sheet modal accessible via `?` button or `?` / `Ctrl+/` / `F1` shortcut.
  - Floating toast feedback for actions like copy, duplicate, save, and alignment.
- **Multi-Board Management (Right Sidebar)**:
  - **Symmetric Right Dock & Drawer**: Matches the left sidebar dock, providing a dedicated **"Boards"** tab and **"+ New"** quick-action button.
  - **Compact Board Items (14-16px)**: Each board row is styled to an ultra-compact `16px` height with active indicator dot, board name, and rightmost action buttons.
  - **Download Board**: Each board row features a dedicated download button at the rightmost position to instantly export that board as a `.json` backup file.
  - **Instant Switching & Auto-Save**: Seamlessly switch between boards with separate canvas contents, undo/redo stacks, and auto-saving to `localStorage`.
  - **Create, Rename & Delete**: Create new boards, double-click to rename, and delete boards with safety confirmations.
- **Undo / Redo (`Ctrl+Z` / `Ctrl+Y`)**: 50-step history tracking covering shapes, paths, text, sticky notes, and deletions.
- **Pan & Zoom**: Spacebar / Hand drag, mouse-wheel zoom centered at cursor, bottom-right zoom widget.

---

## Complete Keyboard Shortcuts Reference

| Category | Shortcut | Action |
| :--- | :--- | :--- |
| **Basic Editing** | `Ctrl + Z` | Undo |
| | `Ctrl + Y` / `Ctrl + Shift + Z` | Redo |
| | `Ctrl + C` | Copy Selected |
| | `Ctrl + V` | Paste Clipboard |
| | `Ctrl + X` | Cut Selected |
| | `Ctrl + A` | Select All Objects |
| | `Ctrl + D` | Duplicate Selected |
| | `Ctrl + S` | Save Board to Local Storage |
| | `Ctrl + Shift + S` | Save As / Export JSON File |
| | `Delete` / `Backspace` | Delete Selected Object(s) |
| **Canvas Navigation** | `Space + Drag` / `H` | Pan Canvas |
| | `Mouse Wheel` | Scroll Canvas |
| | `Ctrl + Wheel` / `+` / `-` | Zoom In / Out |
| | `Ctrl + 0` | Reset Zoom & Center |
| | `Ctrl + 1` | Zoom to 100% |
| | `Shift + 1` | Fit Entire Canvas to Screen |
| | `Shift + 2` | Zoom to Active Selection |
| | `Home` | Go to Canvas Origin `(0, 0)` |
| **Drawing Tools** | `V` | Select Tool |
| | `H` | Hand / Pan Tool |
| | `P` | Freehand Pen Tool |
| | `T` | Text Tool |
| | `R` | Insert Rectangle at Center |
| | `O` | Insert Circle / Ellipse at Center |
| | `L` | Connector Line Tool |
| | `A` | Connector Arrow Tool |
| | `N` / `S` | Sticky Note Tool |
| | `E` | Eraser Tool |
| | `Escape` | Exit Tool / Close Drawer / Deselect |
| | `Enter` | Edit Selected Text / Shape / Note |
| | `Shift + Drag` | Maintain Aspect Ratio Proportions |
| | `Alt + Drag` | Duplicate While Dragging |
| **Text Formatting** | `Ctrl + B` | Toggle Bold |
| | `Ctrl + I` | Toggle Italic |
| | `Ctrl + U` | Toggle Underline |
| | `Ctrl + Shift + X` | Toggle Strikethrough |
| | `Ctrl + Shift + L` | Align Left |
| | `Ctrl + Shift + E` | Align Center |
| | `Ctrl + Shift + R` | Align Right |
| **Object Arrangement** | `Ctrl + G` | Group Selected Objects |
| | `Ctrl + Shift + G` | Ungroup Objects |
| | `Ctrl + ]` | Bring Forward |
| | `Ctrl + [` | Send Backward |
| | `Ctrl + Shift + ]` | Bring to Front |
| | `Ctrl + Shift + [` | Send to Back |
| | `Arrow Keys` | Move Object (2px) |
| | `Shift + Arrow` | Move Object Faster (20px) |
| | `Shift + Click` | Multi-Select Objects |
| **Help & Cheat Sheet** | `?` / `Ctrl + /` / `F1` | Open / Close All Shortcuts Modal |

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

---

## How to Test Phase 8 (Step Box Feature)

1. **Create a Step Box**:
   - Locate the **Step Box icon** in the left sidebar dock (below Layers).
   - Click it; the cursor switches to a crosshair.
   - Click and drag on the canvas to draw a box of any desired size (e.g. 500x350px).
   - Alternatively, a single click creates a default 360x240px Step Box.
   - Notice the dashed indigo border, semi-transparent background, and top-left badge displaying `Step Box 1 (Step 1/1)`.

2. **Floating Controls & Step Creation**:
   - With the Step Box selected, note the floating control bar directly underneath it: `◀ Back`, `Step 1 / 1`, `Next ▶`, `+` (Add Step), and `🗑` (Delete Step).
   - `◀ Back` and `Next ▶` are properly disabled when at the start/end bounds.
   - Draw or place objects inside the box (e.g. a Process rectangle, a Sticky Note, or freehand drawing).
   - Draw another object completely outside the box to test isolation.

3. **Incremental Step Building (`+`)**:
   - Click the `+` button in the floating bar.
   - The label updates to `Step 2 / 2`.
   - The contents from Step 1 are duplicated into Step 2 so you can build incrementally on top of previous work.
   - Add new elements inside the box (e.g. a Decision diamond and connector arrow).

4. **Navigating Steps (`◀ Back` & `Next ▶`)**:
   - Click `◀ Back`.
   - The box smoothly switches back to `Step 1 / 2`: only the initial elements are displayed, and any edits made to Step 2 are saved.
   - Click `Next ▶`.
   - The box advances back to `Step 2 / 2` with all additions restored.
   - Notice that objects outside the Step Box are completely unaffected.

5. **Moving & Resizing the Step Box**:
   - In Select mode (`V`), drag the Step Box to a new location on the canvas. All internal objects move with it in unison.
   - Resize the box using corner handles; internal objects scale proportionally with the box.
   - Switch between steps after moving; all steps render at their updated relative positions.

6. **Deleting Steps & Boxes**:
   - With multiple steps, click the `🗑` button on the floating bar.
   - Confirm the prompt; the active step is removed and the box navigates to the adjacent step.
   - (A Step Box always retains at least one step; the delete button disables if only 1 step remains).
   - Select the Step Box and press `Delete` / `Backspace`; both the box and its scoped contents are removed.

7. **Persistence & Auto-Save**:
   - Draw inside a Step Box and wait 3 seconds (or click Save). The auto-save indicator shows "Saved".
   - Refresh the page (`F5`).
   - The Step Box, its steps, current step position, and all scoped objects are restored from SQLite with 100% fidelity.

8. **Download / Export Options (PPTX, PDF, PNG, SVG, JSON)**:
   - In the top-right bar, click the **Download** button.
   - Choose **Export as Presentation (.pptx)**: Generates a real Microsoft PowerPoint presentation file (`.pptx`) formatted for 16:9 widescreen or 4:3 presentation slides. If you have a Step Box with multiple steps, each step is exported as an individual slide!
   - Choose **Export as PDF Document (.pdf)**: Generates a high-quality multi-page or single-page PDF document.
   - Choose **Export as PNG**: 2x high-resolution snapshot of your drawing.
   - Choose **Export as SVG**: Crisp vector diagram file.
   - Choose **Download Board (.json)**: Complete board backup.

9. **Fixed Width / Presentation Slide Mode (Separate Entity, Page Fullscreen & Exit Save/Discard)**:
   - In the top-right header, click the **Canvas Frame** selector (defaults to **Canvas: Infinite**).
   - Select **16:9 Slide (1920 × 1080)**, **4:3 Slide (1024 × 768)**, or **A4 Document (1240 × 1754)**.
   - **Separate Entity Architecture (Infinite Board vs. Slide Deck)**:
     - The Infinite Whiteboard and the Slide Deck operate as independent entities on each board.
     - When switching into Slide Mode, your infinite whiteboard objects are safely stashed, and the active slide presentation is loaded onto the slide card.
     - You can copy objects (`Ctrl+C`) on the Infinite Board and paste them (`Ctrl+V`) directly into the Slide Deck (and vice versa); pasted objects automatically center inside the slide and receive slide clipping.
   - **Slide Page Fullscreen (Theater View - Covers Whole Chrome Page)**:
     - Click **Page Fullscreen** in the slide banner.
     - It expands the canvas to 100vw × 100vh of the Chrome tab (without triggering browser-level OS fullscreen), cleanly hiding all toolbars, left/right sidebars, and zoom widgets.
     - The slide auto-scales to fit the browser viewport with a cinematic dark background (`#020617`).
     - A floating top banner provides quick access to `◀ Prev`, `Slide X / Y`, `Next ▶`, `+ New Slide`, and `Exit View` (or press `Escape`).
     - **Movable Floating Presenter / Drawing Dock**:
       - Features a drag handle grip to freely drag and reposition the dock anywhere across the board.
       - Provides immediate drawing controls: **Pen**, **Eraser** (with **Brush** & **⭕ Circle** toggle buttons), live **Size Stepper & Slider** (`[−]` `Size` `[+]` `[──●]`), **Paint** (Highlighter), **Color** (Palette swatches & Custom Picker), and **Select**.
       - Consolidates freehand drawing tools so the top tab toolbar remains clean and focused on structural tools (Select, Pan, Text, Lines, Connectors, Shapes).
       - Dynamically switches size control between writing stroke size (1–64px) and eraser size (6–150px).
       - Popovers automatically adjust placement to prevent going off-screen when dragged near browser boundaries.

11. **Advanced Eraser System (Size Controls & Circle / Bound Shape Area Erase)**:
   - **Eraser Size Increase / Decrease**:
     - Adjust brush size dynamically via the `−` and `+` buttons, size slider (8px to 120px), or keyboard shortcuts:
       - Press **`[`** to decrease eraser size.
       - Press **`]`** to increase eraser size.
     - **Dynamic Circular Cursor Preview**: A circular cursor shows the exact diameter of the eraser following your mouse.
   - **Circle / Bound Shape Area Erase**:
     - Switch to **⭕ Circle / Area Erase** (via the toolbar pill, fullscreen eraser popover, or press **`E`** to toggle).
     - Drag to draw a circle, lasso loop, or any enclosed boundary around what you want to erase.
     - Upon release, the enclosed area is immediately erased—raster strokes, pen ink, and highlighters inside the boundary are cut out, and any enclosed shapes, text boxes, sticky notes, or stickers are deleted.
   - **Slide Boundary Clipping (Outside Strokes Erased)**:
     - When drawing lines or freehand strokes across the slide edge, the portion drawn inside the slide is retained, while the portion lying outside is cleanly clipped/erased using Fabric.js clip paths.
     - Shapes, sticky notes, and stickers are constrained within slide bounds.
   - **Exit Confirmation Modal (Save vs. Don't Save / Delete Slides)**:
     - When clicking **✕ Exit Slide Mode** or selecting **Canvas: Infinite**, a modal dialog prompts:
       - **Save & Return to Infinite**: Saves current slides to `boardSlides` in SQLite, clears slide objects from canvas, and restores all infinite whiteboard objects.
       - **Don't Save (Delete Slides)**: Clears and deletes the slide content, resetting slides and returning to the infinite whiteboard.
       - **Cancel**: Closes the dialog and stays in slide presentation mode.
   - **Multi-Slide Deck Navigation**:
     - `◀ Prev`: Navigate to previous slide (`PageUp` or `Alt + ArrowLeft`).
     - `Slide X / Y`: Live counter badge displaying active slide index and total slides.
     - `Next ▶`: Navigate to next slide (`PageDown` or `Alt + ArrowRight`).
     - `+ New Slide`: Adds a new slide to the deck.
     - `🗑`: Deletes the current slide (with confirmation).
     - `Fit Slide`: Centers and fits the active slide to the screen.
   - **Multi-Slide PPTX & PDF Export**:
     - Click **Download** > **Export as Presentation (.pptx)**: Generates a genuine Microsoft PowerPoint presentation file where each slide is exported.
     - Click **Download** > **Export as PDF Document (.pdf)**: Generates a publication-grade multi-page PDF document matching slide dimensions.
   - **SQLite Persistence & Auto-Save**:
     - Infinite whiteboard objects and slide presentations are auto-saved to SQLite (`boards.db`) every 3 seconds. Older boards load without errors.

10. **Fullscreen Mode**:
   - Click the **Fullscreen** button in the top-right header (or in the bottom-right zoom widget, or press `F11`).
   - The whiteboard expands to fill the display; click **Exit** or press `Escape` / `F11` to exit.


11. **Phase 9: Export, Import, Image Upload & Polish**:
    - **Export Menu (PNG, SVG, PDF, PPTX, JSON)**:
      - Click **Download** in the top header.
      - **Export as PNG**: Generates a 2x retina crisp raster image cropped cleanly to canvas content boundaries using Fabric.js `canvas.toDataURL()`.
      - **Export as SVG**: Exports the whiteboard drawings, text, and vector shapes as clean SVG markup using `canvas.toSVG()`.
      - **Export as PDF Document (.pdf)**:
        - If an active **Step Box** has multiple steps, it automatically exports one PDF page per step in sequential order.
        - If in **Slide Mode**, it exports each slide as its own page.
        - On normal infinite whiteboard, it exports the entire canvas drawing as a single publication-grade document.
      - **Export as Presentation (.pptx)**: Generates a PowerPoint presentation from slides or steps.
      - **Download Board (.json)**: Full JSON backup containing all board shapes, text, connectors, step boxes, and multi-step configurations.
    - **Board JSON Import**:
      - Open the right **Boards** sidebar.
      - Click **Import** (`#btn-import-board`) and choose any exported `.json` board file.
      - Automatically creates a brand new board in SQLite, switches to it, and restores all contents, including Step Boxes and their ordered steps.
    - **Image Upload onto Canvas (PNG, JPG, SVG)**:
      - **Left Sidebar Media Tab**: Open **Media & Uploads** (`#btn-sidebar-media`), click **Browse** or drop files into the dropzone.
      - **Direct Drag & Drop**: Drag image files directly from your computer and drop them anywhere onto the whiteboard canvas; images are automatically placed at the cursor location.
      - **Clipboard Paste (`Ctrl + V`)**: Copy an image or take a screenshot with Windows Snipping Tool (`Win + Shift + S`) and press `Ctrl + V` on the canvas to paste it immediately.
      - **Recent Uploads Gallery**: Uploaded images are stored in the Media drawer gallery with thumbnail cards so you can click to place them onto the canvas again anytime.
    - **Dark Mode UI Theme Toggle**:
      - Click the **Theme** button (`#btn-theme-toggle`) in the top-right toolbar to toggle between Light and Dark mode.
      - Preserves selection across reloads via `localStorage.getItem('whiteboard_theme')`.
      - Fully styles headers, toolbars, sidebars, drawers, menus, dropdowns, and modal dialogs with smooth transitions.
    - **Keyboard Shortcuts & '?' Help Dialog**:
      - Press `?`, `F1`, or `Ctrl + /` (or click `?` in the bottom-right zoom widget) to toggle the interactive cheat sheet popup.
      - Core shortcuts:
        - `V`: Select tool
        - `H`: Hand / Pan tool
        - `P`: Pen tool
        - `E`: Eraser tool
        - `T`: Text tool
        - `Ctrl + Z`: Undo
        - `Ctrl + Y`: Redo
        - `Delete` / `Backspace`: Remove selected object
        - `Ctrl + S`: Force save board to database
    - **Docker Container Support**:
      - Includes `Dockerfile` and `.dockerignore` for isolated, reproducible deployments.
      - Build and run in seconds with zero extra dependencies.

---

## Running and Testing the App

### 1. Running Locally with Python
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Run with Uvicorn
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```
Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

### 2. Running with Docker
```bash
# 1. Build the Docker image
docker build -t whiteboard-app .

# 2. Run the container
docker run -d -p 8000:8000 --name whiteboard whiteboard-app
```
Access the application at [http://localhost:8000](http://localhost:8000).

---

## Step-by-Step Verification Checklist

1. **Test Export & Download**:
   - Draw shapes, lines, or notes on the canvas.
   - Click **Download** > **Export as PNG**: verify a high-resolution PNG is downloaded.
   - Click **Download** > **Export as SVG**: verify the downloaded file opens in a vector viewer or browser.
   - Click **Download** > **Export as PDF Document**: verify a printable PDF is generated.
   - Create a **Step Box** (`Step Box` tool in left sidebar), add 2 or 3 steps with different shapes, and click **Download** > **Export as PDF**: verify each step becomes an individual page in the PDF.
2. **Test JSON Export and Import**:
   - Click **Download** > **Download Board (.json)**.
   - Open the right **Boards** sidebar, click **Import**, and select the downloaded `.json` file.
   - Verify a new board appears with all shapes and multi-step Step Boxes completely intact.
3. **Test Image Upload**:
   - Click **Media & Uploads** in the left sidebar dock, click **Browse**, and pick a PNG, JPG, or SVG image. Verify it appears on the canvas and is selectable/movable.
   - Drag an image file from your computer and drop it directly onto the canvas. Verify it is inserted at the mouse position.
   - Take a screenshot (`Win + Shift + S`) and press `Ctrl + V` on the canvas. Verify the pasted image appears immediately.
4. **Test Dark Mode Toggle**:
   - Click the **Theme** button in the top bar. Verify the toolbars, sidebars, drawers, and menus transition to a refined dark slate theme.
   - Refresh the page and verify dark mode is remembered via `localStorage`.
   - Click the button again to return to light theme.
5. **Test Keyboard Shortcuts & '?' Help Popup**:
   - Press `V`, `H`, `P`, `E`, `T` to switch tools.
   - Draw something, press `Ctrl + Z` to undo, `Ctrl + Y` to redo.
   - Select an object and press `Delete`.
   - Press `?` (or click `?` in the bottom-right zoom widget) to open the shortcuts cheat sheet modal. Press `Escape` to close it.

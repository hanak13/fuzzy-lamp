# Whiteboard Web App

An offline-first, open-source collaborative whiteboard web app built with **Python (FastAPI)** on the backend and **vanilla HTML/CSS/JavaScript with Fabric.js** on the frontend.

---

## Current Status: Phase 5 & UI Refinement Completed

Phases 1 through 5 provide a comprehensive offline whiteboard web application:
- **FastAPI backend** running on `http://localhost:8000`.
- **Offline Fabric.js** loaded locally from `static/vendor/fabric.min.js` (no CDN links).
- **Full-screen interactive canvas** with automatic window resizing and synced grid.
- **Fixed Top-Left App Brand (Does not move)**:
  - "✏️ Whiteboard" badge is permanently anchored at `top: 14px; left: 14px`, cleanly positioned above the sidebar dock.
  - Decoupled from the floating toolbar so it never shifts or moves horizontally.
- **Top Toolbar (Cleaned & Streamlined)**:
  - Mode tools: **Select (`V`)**, **Pan (`H`)**, **Pen (`P`)**, **Highlighter (`K`)**, **Eraser (`E`)**, **Text (`T`)**, **Line (`L`)**, **Arrow (`A`)**.
  - Notes and Shapes buttons were moved into the left sidebar dock for a clean, distraction-free header.
  - Active object property inspector (Stroke Color, Fill Color with No-Fill toggle, Size, Font formatting, Delete, Undo/Redo).
- **Left Navigation Sidebar Dock & Hidden Flyout Drawer**:
  - Docked primary left navigation dock with quick-access buttons:
    1. **Shapes**: Opens the Shapes Library with search, category filtering chips, and over **280+ engineering, flowchart, architecture, and general shapes**.
    2. **Notes (Sticky Note)**: Opens the Sticky Notes panel with one-click pastel color cards (Yellow, Pink, Green, Blue) and instant canvas placement mode (`S` or `N`).
    3. **Stickers**: Staged for upcoming sticker packs, emojis, and badges.
    4. **Templates**: Flowcharts, mind maps, and whiteboard layouts.
    5. **Media**: Image uploads and media assets.
    6. **Icons**: UI symbols and diagram graphics.
    7. **Layers**: Canvas object hierarchy and ordering.
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

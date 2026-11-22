# User Guide

A tool-by-tool reference for the Whiteboard app.
Open the app at **http://127.0.0.1:8000** after following the setup steps in the [README](../README.md).

---

## Table of Contents

1. [The Canvas](#1-the-canvas)
2. [Top Toolbar](#2-top-toolbar)
3. [Left Sidebar Panels](#3-left-sidebar-panels)
4. [Right Boards Sidebar](#4-right-boards-sidebar)
5. [Bottom Drawing Dock](#5-bottom-drawing-dock)
6. [Slide Presentation Mode](#6-slide-presentation-mode)
7. [Export & Download](#7-export--download)
8. [Image Upload](#8-image-upload)
9. [Dark Mode](#9-dark-mode)
10. [Keyboard Shortcuts Reference](#10-keyboard-shortcuts-reference)
11. [Minimising Panels](#11-minimising-panels)
12. [Collaborate on the Same Wi-Fi (LAN)](#12-collaborate-on-the-same-wi-fi-lan)

---

## 1. The Canvas

The canvas is an infinite board. Scroll the mouse wheel to zoom into any point; hold `Space` + drag (or use the **Hand** tool) to pan.

| Action | How |
|---|---|
| Pan | Hold `Space` + drag, or switch to the **Hand** tool |
| Zoom in / out | Mouse wheel scroll, or `+` / `-` keys |
| Reset zoom | `Ctrl + 0`, or click **Reset** in the bottom-right zoom widget |
| Fit all content | `Shift + 1` |
| Go to origin | `Home` key |

The **grid** is decorative — it scales with zoom and helps with alignment. Toggle it via the top toolbar **Board BG** control.

---

## 2. Top Toolbar

The toolbar runs across the top of the page. Tools marked with a keyboard key can be activated without clicking.

### Select (`V`)

Click an object to select it. Drag a rubber-band rectangle to select multiple objects at once.
With an object selected:
- **Move**: drag it.
- **Resize**: drag the corner or edge handles.
- **Rotate**: drag the circular handle above the object.
- **Delete**: press `Delete` or `Backspace`.
- **Duplicate**: `Ctrl + D` or `Alt + drag`.

Right-click any object for the **context menu**: Duplicate, Bring to Front, Send to Back, Save to My Shapes, Export as SVG / JPG, Delete.

### Pan / Hand (`H`)

Drag anywhere on the canvas to scroll. Scroll wheel still zooms.

### Pen (`P`)

Freehand drawing. Adjust **stroke colour** (colour swatch) and **size** (`[` / `]` keys or the size stepper) in the toolbar.

### Highlighter (`K`)

Same as Pen but with a translucent fill — ideal for annotating over existing content.

### Eraser (`E`)

Two eraser modes, toggled from the toolbar pill:

| Mode | Behaviour |
|---|---|
| **Stroke Brush** | Paints a pixel-erasing path over the canvas (destination-out) |
| **Circle / Area** | Draw a circle — everything fully inside it is removed; freehand strokes inside are cropped |

Adjust eraser size with `[` / `]` or the size slider. The circular preview cursor follows your mouse.

### Text (`T`)

Click anywhere on the canvas to place an editable text box. While editing:
- Change font size in the toolbar.
- **Bold**: `Ctrl + B` | **Italic**: `Ctrl + I` | **Underline**: `Ctrl + U`
- Click outside or press `Escape` to finish editing.

### Line (`L`) & Arrow (`A`)

Draw straight connectors between shapes. Click a shape edge to snap the line to an anchor point; the connector follows if the shape moves.

### Canvas Frame Selector

Located in the right section of the top bar. Switch between:
- **Canvas: Infinite** — unlimited canvas (default)
- **16:9 Slide (1920 × 1080)** — widescreen presentation
- **4:3 Slide (1024 × 768)** — classic presentation
- **A4 Document (1240 × 1754)** — printable portrait page

---

## 3. Left Sidebar Panels

Click any icon in the left dock to open that panel. Click the same icon again (or the ✕ close button) to dismiss.

### Shapes

A searchable library of 280+ shapes organised by category:

- **General** — circles, stars, arrows, speech bubbles, polygons
- **Flowchart** — process, decision, terminator, data, document, etc.
- **Digital Logic** — AND, OR, NOT, NAND, XOR, flip-flops, counters
- **Computer Architecture** — CPU, GPU, RAM, ALU, buses, controllers
- **UML** — class, actor, use case, sequence, state, component diagrams
- **Cloud & Software Architecture** — API gateway, load balancer, container, Kubernetes, serverless
- **Networking** — router, switch, firewall, Wi-Fi AP, VPN, DNS
- **DevOps / CI-CD / Kubernetes** — Git, pipeline stages, Docker, Pods, deployments, Helm
- **Database & Data Engineering** — RDBMS, NoSQL, data lake, ETL, Kafka
- **Industrial Automation** — PLC, SCADA, robots, sensors, actuators, IoT
- **⭐ My Shapes** — your saved custom shapes (right-click any shape → Save to My Shapes)

Click a shape card to place it on the canvas. Each shape supports fill colour, border colour, and editable text (double-click).

### Flowchart

A shortcut directly into the Flowchart category of the Shapes panel.

### Notes (Sticky Notes) (`N` or `S`)

Place a pastel sticky note on the canvas. Click a colour swatch in the toolbar to change colour. Double-click to edit text.

### Stickers

Browse the shared sticker gallery (SVG / PNG / GIF). Click a sticker to drop it, or drag it to a specific position. Upload your own stickers with the **Browse** button — they are shared across all boards on this server.

### Templates

One-click starter layouts: flowchart skeleton, mind-map hub, and wireframe grid. Click to load the template objects onto the canvas.

### Media & Uploads

Upload PNG, JPG, or SVG images from your computer to place them on the canvas. See [§ 8 Image Upload](#8-image-upload) for all upload methods.

### Icons Library

An offline-first library of 120+ Lucide vector icons for architectural diagrams, system wireframes, and UI mockups.

- **Categories**: Browse curated icons across 8 categories:
  - **Arrows**: Navigation, flow, and directional indicators
  - **Files**: Documents, folders, clipboards, archives, and cloud storage
  - **Communication**: Email, chat bubbles, calls, notifications, audio, and volume
  - **Devices**: Screens, laptops, smartphones, servers, CPUs, and databases
  - **Business**: Charts, metrics, shopping, tags, goals, currency, and calculators
  - **Weather**: Sun, moon, clouds, rain, snow, lightning, and temperatures
  - **People**: Users, teams, avatars, expressions, and reactions
  - **Symbols**: Badges, locks, keys, security shields, time, and system settings
- **Search**: Fast real-time filtering matching both icon names and descriptive keywords/tags.
- **Placement**: Click any icon card to drop it into the center of the current viewport, or drag and drop it onto a specific canvas location.
- **Sharp Vector Scaling**: Placed icons are native Fabric.js vector objects (`objectCaching: false`) that remain razor sharp at any scale or zoom factor.
- **Customization**: Select an icon to change its **COLOR** (stroke color), **FILL** (transparent or color fill), and **SIZE** (stroke width) directly from the top toolbar.
- **Recent Icons**: Automatically remembers the last 12 icons used in `localStorage` for quick access across sessions.
- **Saving & Export**: Icons save into board state, restore seamlessly on load, work inside Step Boxes and slide presentations, and render accurately in PNG, SVG, PDF, and PPTX exports.

### Layers

A list of all objects on the current canvas in stacking order. Click an item to select it on the canvas; use the up / down arrows to reorder.

### Step Box

A scoped container for multi-step sequential diagrams.

1. Click the **Step Box** icon in the left dock.
2. Drag a rectangle on the canvas to define the container.
3. Use the **floating controls** that appear below the box:
   - `◀ Back` / `Next ▶` — navigate between steps (saves current step automatically).
   - `Step X / Y` — current step counter.
   - `+` — add a new step (copies current step content as the base).
   - `🗑` — delete the current step.
4. Each step is completely independent; switch freely without losing content.

---

## 4. Right Boards Sidebar

Click the **Boards** tab on the right edge to expand the board list.

| Action | How |
|---|---|
| Create a board | **+ Board** button |
| Switch boards | Click a board row |
| Rename | Double-click the board name |
| Delete | Click the trash icon on the board row |
| Download as JSON | Click the download icon on the board row |
| Import a board | Click **Import** and select a `.json` file |

Each board has its own canvas, undo/redo history, and background colour. Auto-save runs every 3 seconds.

---

## 5. Bottom Drawing Dock

The floating dock at the bottom of the screen gives you quick-access drawing controls. It is designed for use in Slide / Presentation mode but works on the infinite canvas too.

Drag the **⠿ grip** handle to reposition the dock anywhere on screen.

Controls: **Pen** · **Eraser** · **Size** (stepper + slider) · **Paint** (highlighter) · **Color** (swatches + custom picker) · **Select**

The size control automatically adapts to show writing size (1–64 px) when in Pen / Highlighter mode, and eraser size (6–150 px) when in Eraser mode.

Minimise the dock with the **–** button (see [§ 11](#11-minimising-panels)).

---

## 6. Slide Presentation Mode

Switch into a fixed-dimension slide deck from the **Canvas Frame** selector in the top bar.

- The slide frame is a clipping region — strokes drawn outside it are automatically trimmed.
- Use **Prev / Next** buttons in the slide banner to navigate slides, or `PageUp` / `PageDown`.
- **+ New Slide** adds a blank slide.
- **Fit View** centres the active slide on screen.
- **Page Fullscreen** expands the slide to fill the entire browser tab (cinematic mode). Press `Escape` to exit.
- **Exit Slide Mode** shows a confirmation asking whether to save or discard the slide deck before returning to the infinite canvas.

Objects (shapes, sticky notes, stickers) are constrained to the slide area automatically.

---

## 7. Export & Download

Click **Download** in the top toolbar to open the export menu.

| Format | Description |
|---|---|
| **Export as PNG** | High-resolution 2× raster image of the current canvas or slide |
| **Export as SVG** | Lossless vector export using Fabric.js `toSVG()` |
| **Export as PDF** | Multi-page PDF — one page per slide (Slide Mode) or one page per step (Step Box with multiple steps) |
| **Export as Presentation (.pptx)** | Microsoft PowerPoint file, one slide per slide/step |
| **Download Board (.json)** | Full board backup including all objects, step boxes, and step data |

To import a `.json` backup, open the right **Boards** sidebar and click **Import**.

---

## 8. Image Upload

Three ways to get images onto the canvas:

1. **Media panel** — Click the **Media** icon in the left sidebar dock, then click **Browse** and pick PNG / JPG / SVG files. They appear on the canvas and are shown in the gallery for easy re-use.
2. **Drag & drop** — Drag image files from File Explorer / Finder directly onto the canvas. The image is placed where you drop it.
3. **Clipboard paste** — Copy an image to your clipboard (e.g. with Windows Snipping Tool `Win + Shift + S`), then press `Ctrl + V` with the whiteboard focused. The image is placed at the centre of the visible canvas.

Images are selectable, movable, resizable, and rotatable like any other object.

---

## 9. Dark Mode

Click the **Theme** button (moon/sun icon) in the top-right toolbar. The choice is saved in `localStorage` and restored the next time you open the app.

---

## 10. Keyboard Shortcuts Reference

### Basic Editing

| Shortcut | Action |
|---|---|
| `Ctrl + Z` | Undo |
| `Ctrl + Y` | Redo |
| `Ctrl + C` | Copy selected |
| `Ctrl + V` | Paste (object or image from clipboard) |
| `Ctrl + X` | Cut selected |
| `Ctrl + A` | Select all |
| `Ctrl + D` | Duplicate selected |
| `Ctrl + S` | Force save to database |
| `Delete` / `Backspace` | Delete selected object(s) |

### Canvas Navigation

| Shortcut | Action |
|---|---|
| Mouse wheel / `+` / `-` | Zoom in / out |
| `Space` + drag | Pan canvas |
| `Ctrl + 0` | Reset zoom |
| `Ctrl + 1` | Zoom to 100 % |
| `Shift + 1` | Fit all content |
| `Shift + 2` | Zoom to selection |
| `Home` | Go to canvas origin |

### Drawing Tools

| Shortcut | Action |
|---|---|
| `V` | Select tool |
| `H` | Hand / Pan tool |
| `P` | Pen tool |
| `K` | Highlighter |
| `E` | Eraser (toggles mode on second press) |
| `T` | Text tool |
| `L` | Line connector |
| `A` | Arrow connector |
| `N` / `S` | Sticky note |
| `[` | Decrease brush / eraser size |
| `]` | Increase brush / eraser size |
| `Escape` | Exit current tool / close modal |

### Text Formatting (while editing a text object)

| Shortcut | Action |
|---|---|
| `Ctrl + B` | Bold |
| `Ctrl + I` | Italic |
| `Ctrl + U` | Underline |
| `Ctrl + Shift + X` | Strikethrough |

### Object Arrangement

| Shortcut | Action |
|---|---|
| `Ctrl + ]` | Bring forward |
| `Ctrl + [` | Send backward |
| `Ctrl + Shift + ]` | Bring to front |
| `Ctrl + Shift + [` | Send to back |
| `Arrow keys` | Move object 1 px |
| `Shift + Arrow` | Move object 10 px |
| `Shift + click` | Add to / remove from selection |

### Help

| Shortcut | Action |
|---|---|
| `?` / `F1` / `Ctrl + /` | Toggle keyboard shortcuts popup |

---

## 11. Minimising Panels

Each of the three main UI panels has its own **Hide** button to maximise canvas space:

| Panel | Minimize button | Restore button appears |
|---|---|---|
| Top toolbar | **Hide** (chevron up) in the top-right | Floating **▼ Toolbar** at top-centre |
| Left sidebar | **Hide** (chevron left) at the top of the dock | Floating **▶ Sidebar** on the left edge |
| Bottom drawing dock | **–** button on the right end of the dock | Floating **✎ Draw** in the bottom-right |

Click any restore button to bring the panel back. All three can be minimised simultaneously for a fully clean drawing canvas.

---

## 12. Collaborate on the Same Wi-Fi (LAN)

The Whiteboard supports peer-to-peer real-time collaboration across computers, laptops, tablets, and phones connected to the **same Wi-Fi router or local area network (LAN)**. It operates 100% offline with zero cloud dependency.

### How the Host Starts

1. Open your terminal in the whiteboard project directory.
2. Start the server binding to `0.0.0.0` (all network interfaces):
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000
   ```
3. Open your browser to **http://localhost:8000** or your LAN IP.
4. Click the blue **Share** button in the top-right toolbar.

### How Others Join & Default View-Only Access

1. In the **Share** window:
   - **From computers/laptops**: Click **Copy Link** to share the local network address (e.g. `http://192.168.1.5:8000/board/board_main`).
   - **From phones/tablets**: Point the phone camera at the on-screen **QR code** while connected to the same Wi-Fi.
2. **Master & Default View-Only Guests**:
   - The creator who starts the board is automatically the **👑 Master (Host)** and holds full editing permissions.
   - **Every new participant joins in View-Only mode by default**. They see a distraction-free presentation canvas with only the board logo, online participants roster, fullscreen toggle, and bottom-right zoom widget.
   - The Master can allow all guests to edit by toggling **"Allow Guests to Edit"** (in the top-bar Collaborators dropdown or Share window), or grant individual edit permissions per user in the roster.
3. Every collaborator receives a unique animal avatar name (e.g., *Blue Fox*, *Swift Falcon*) and distinct cursor color. The Master can set a custom name at any time.
4. Remote cursors move live with smooth position interpolation and name tags.

### Room Password Protection

1. In the **Share** window, type a password into the **Optional Room Password** field and click **Save Password**.
2. Any new peer joining the board will be prompted with a secure password modal before their WebSocket connection is accepted.
3. To remove the password, clear the input and click **Save Password**.

### Windows Firewall Note

When running `uvicorn app:app --host 0.0.0.0 --port 8000` for the first time, Windows Defender Firewall may display an alert:
- Check the box for **Private networks (such as your home or work network)**.
- Click **Allow access**.
- If peers cannot connect, ensure both devices are on the exact same Wi-Fi SSID and that "AP isolation" / "client isolation" is disabled on your router.


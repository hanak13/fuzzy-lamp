/**
 * Whiteboard Web App - Client-side Logic (Phase 1)
 *
 * Implements:
 * - Full-screen Fabric.js canvas
 * - Responsive grid background synced with pan and zoom
 * - Pan (hand tool, spacebar + drag, middle mouse)
 * - Zoom (mouse wheel & bottom-right control widget with percentage)
 * - Undo / Redo history management
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. DOM Elements & State
    // -------------------------------------------------------------------------
    const canvasContainer = document.getElementById('canvas-container');
    const canvasElement = document.getElementById('whiteboard-canvas');

    const btnSelect = document.getElementById('btn-select');
    const btnPan = document.getElementById('btn-pan');
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const btnAddBox = document.getElementById('btn-add-box');
    const btnClear = document.getElementById('btn-clear');

    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnResetView = document.getElementById('btn-reset-view');
    const zoomPercentageEl = document.getElementById('zoom-percentage');

    // Canvas mode: 'select' or 'pan'
    let currentMode = 'select';

    // Pan state tracking
    let isPanning = false;
    let isSpacePressed = false;
    let lastPosX = 0;
    let lastPosY = 0;

    // Undo / Redo history stacks
    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 50;
    let isProcessingHistory = false;

    // Grid size constant (in canvas pixels at 100% zoom)
    const GRID_BASE_SIZE = 30;

    // -------------------------------------------------------------------------
    // 2. Initialize Fabric.js Canvas
    // -------------------------------------------------------------------------
    const canvas = new fabric.Canvas('whiteboard-canvas', {
        width: window.innerWidth,
        height: window.innerHeight,
        selection: true,
        preserveObjectStacking: true,
        stopContextMenu: true, // Disable browser context menu on canvas
        fireRightClick: true
    });

    // Handle window resize dynamically
    window.addEventListener('resize', () => {
        canvas.setWidth(window.innerWidth);
        canvas.setHeight(window.innerHeight);
        canvas.renderAll();
        updateGrid();
    });

    // -------------------------------------------------------------------------
    // 3. Grid Background Synchronization
    // -------------------------------------------------------------------------
    /**
     * Updates the CSS background grid to match canvas pan and zoom.
     */
    function updateGrid() {
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;

        const scaledGrid = GRID_BASE_SIZE * zoom;
        // Keep coordinates within a single grid cell range for smooth tiling
        const posX = ((vpt[4] % scaledGrid) + scaledGrid) % scaledGrid;
        const posY = ((vpt[5] % scaledGrid) + scaledGrid) % scaledGrid;

        canvasContainer.style.backgroundSize = `${scaledGrid}px ${scaledGrid}px`;
        canvasContainer.style.backgroundPosition = `${posX}px ${posY}px`;
    }

    // -------------------------------------------------------------------------
    // 4. Zoom Functionality & Indicator
    // -------------------------------------------------------------------------
    /**
     * Updates the zoom percentage displayed in the bottom-right widget.
     */
    function updateZoomDisplay() {
        const zoom = canvas.getZoom();
        const percentage = Math.round(zoom * 100);
        zoomPercentageEl.textContent = `${percentage}%`;
    }

    /**
     * Sets a new zoom level clamped between 10% and 500%.
     * Zooms relative to a specific screen point (defaults to center).
     */
    function setZoom(newZoom, point) {
        // Clamp zoom: min 10%, max 500%
        const clampedZoom = Math.max(0.1, Math.min(5.0, newZoom));
        const targetPoint = point || new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);

        canvas.zoomToPoint(targetPoint, clampedZoom);
        updateZoomDisplay();
        updateGrid();
    }

    // Mouse wheel zoom (centered at mouse position)
    canvas.on('mouse:wheel', (opt) => {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();

        // Smooth zoom scaling factor
        zoom *= 0.999 ** delta;
        setZoom(zoom, new fabric.Point(opt.e.offsetX, opt.e.offsetY));

        opt.e.preventDefault();
        opt.e.stopPropagation();
    });

    // Zoom In button (+20%)
    btnZoomIn.addEventListener('click', () => {
        setZoom(canvas.getZoom() * 1.2);
    });

    // Zoom Out button (-20%)
    btnZoomOut.addEventListener('click', () => {
        setZoom(canvas.getZoom() / 1.2);
    });

    // Reset View button & Percentage click (Reset to 100% zoom and center)
    function resetView() {
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        updateZoomDisplay();
        updateGrid();
    }

    btnResetView.addEventListener('click', resetView);
    zoomPercentageEl.addEventListener('click', resetView);

    // -------------------------------------------------------------------------
    // 5. Pan Functionality
    // -------------------------------------------------------------------------
    /**
     * Sets active interaction mode ('select' or 'pan').
     */
    function setMode(mode) {
        currentMode = mode;

        if (mode === 'select') {
            btnSelect.classList.add('active');
            btnPan.classList.remove('active');
            canvas.selection = true;
            canvas.defaultCursor = 'default';
            // Enable object selection
            canvas.forEachObject(obj => obj.selectable = true);
        } else if (mode === 'pan') {
            btnPan.classList.add('active');
            btnSelect.classList.remove('active');
            canvas.selection = false;
            canvas.discardActiveObject();
            canvas.defaultCursor = 'grab';
            // Disable object selection while panning mode is active
            canvas.forEachObject(obj => obj.selectable = false);
            canvas.renderAll();
        }
    }

    btnSelect.addEventListener('click', () => setMode('select'));
    btnPan.addEventListener('click', () => setMode('pan'));

    // Spacebar toggles temporary pan cursor while held down
    window.addEventListener('keydown', (e) => {
        // Spacebar hold
        if (e.code === 'Space' && !isSpacePressed && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            isSpacePressed = true;
            canvas.defaultCursor = 'grab';
            canvas.selection = false;
            e.preventDefault();
        }

        // Shortcut: V for Select
        if ((e.key === 'v' || e.key === 'V') && e.target.tagName !== 'INPUT') {
            setMode('select');
        }

        // Shortcut: H for Pan
        if ((e.key === 'h' || e.key === 'H') && e.target.tagName !== 'INPUT') {
            setMode('pan');
        }

        // Undo: Ctrl+Z or Cmd+Z
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
            e.preventDefault();
            undo();
        }

        // Redo: Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z
        if (((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
            ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))) {
            e.preventDefault();
            redo();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            isSpacePressed = false;
            if (currentMode === 'select') {
                canvas.defaultCursor = 'default';
                canvas.selection = true;
            } else {
                canvas.defaultCursor = 'grab';
            }
        }
    });

    // Mouse Down: Check if panning starts
    canvas.on('mouse:down', (opt) => {
        const evt = opt.e;
        // Pan if: Pan tool active, OR Spacebar held, OR Middle mouse button clicked (button === 1)
        const isMiddleClick = evt.button === 1;
        const shouldPan = currentMode === 'pan' || isSpacePressed || isMiddleClick;

        if (shouldPan) {
            isPanning = true;
            lastPosX = evt.clientX;
            lastPosY = evt.clientY;
            canvas.defaultCursor = 'grabbing';
            opt.e.preventDefault();
        }
    });

    // Mouse Move: Perform panning
    canvas.on('mouse:move', (opt) => {
        if (isPanning) {
            const evt = opt.e;
            const deltaX = evt.clientX - lastPosX;
            const deltaY = evt.clientY - lastPosY;

            canvas.relativePan(new fabric.Point(deltaX, deltaY));
            lastPosX = evt.clientX;
            lastPosY = evt.clientY;

            updateGrid();
        }
    });

    // Mouse Up: Stop panning
    canvas.on('mouse:up', () => {
        if (isPanning) {
            isPanning = false;
            canvas.defaultCursor = (currentMode === 'pan' || isSpacePressed) ? 'grab' : 'default';
        }
    });

    // Window Mouse Up: Ensure panning doesn't get stuck if released outside canvas
    window.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            canvas.defaultCursor = (currentMode === 'pan' || isSpacePressed) ? 'grab' : 'default';
        }
    });

    // -------------------------------------------------------------------------
    // 6. Undo / Redo History Management
    // -------------------------------------------------------------------------
    /**
     * Updates disabled state of Undo and Redo toolbar buttons.
     */
    function updateHistoryButtons() {
        btnUndo.disabled = undoStack.length <= 1;
        btnRedo.disabled = redoStack.length === 0;
    }

    /**
     * Serializes current canvas state and pushes to undo stack.
     */
    function saveState() {
        if (isProcessingHistory) return;

        const currentState = JSON.stringify(canvas.toJSON());

        // Don't save if state is identical to previous
        if (undoStack.length > 0 && undoStack[undoStack.length - 1] === currentState) {
            return;
        }

        undoStack.push(currentState);
        if (undoStack.length > MAX_HISTORY) {
            undoStack.shift();
        }

        // New action clears redo history
        redoStack.length = 0;
        updateHistoryButtons();
    }

    /**
     * Reverts canvas to previous state in undo stack.
     */
    function undo() {
        if (undoStack.length <= 1) return;

        // Current state moves to redo stack
        const currentState = undoStack.pop();
        redoStack.push(currentState);

        // Previous state becomes active
        const previousState = undoStack[undoStack.length - 1];
        loadCanvasState(previousState);
    }

    /**
     * Restores next state from redo stack.
     */
    function redo() {
        if (redoStack.length === 0) return;

        const nextState = redoStack.pop();
        undoStack.push(nextState);

        loadCanvasState(nextState);
    }

    /**
     * Loads a JSON string into Fabric.js canvas while pausing history recording.
     */
    function loadCanvasState(jsonState) {
        isProcessingHistory = true;
        // Preserve viewportTransform so undo/redo doesn't reset user's current pan or zoom position
        const currentVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : null;

        canvas.loadFromJSON(jsonState, () => {
            if (currentVpt) {
                canvas.setViewportTransform(currentVpt);
            }
            // Restore selectable property based on active mode
            if (currentMode === 'pan') {
                canvas.forEachObject(obj => obj.selectable = false);
            }
            canvas.renderAll();
            isProcessingHistory = false;
            updateHistoryButtons();
        });
    }

    btnUndo.addEventListener('click', undo);
    btnRedo.addEventListener('click', redo);

    // Save state on canvas object mutations
    canvas.on('object:added', () => saveState());
    canvas.on('object:modified', () => saveState());
    canvas.on('object:removed', () => saveState());

    // -------------------------------------------------------------------------
    // 7. Testing Helper: Add Sample Shape & Clear
    // -------------------------------------------------------------------------
    // Random pastel colors for testing shapes
    const colors = ['#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#f472b6'];
    let colorIndex = 0;

    btnAddBox.addEventListener('click', () => {
        // Calculate current viewport center in canvas coordinate space
        const vpt = canvas.viewportTransform;
        const centerX = (-vpt[4] + canvas.getWidth() / 2) / canvas.getZoom();
        const centerY = (-vpt[5] + canvas.getHeight() / 2) / canvas.getZoom();

        const color = colors[colorIndex % colors.length];
        colorIndex++;

        const rect = new fabric.Rect({
            left: centerX - 60,
            top: centerY - 40,
            width: 120,
            height: 80,
            rx: 8,
            ry: 8,
            fill: color,
            stroke: '#334155',
            strokeWidth: 2,
            selectable: currentMode === 'select'
        });

        canvas.add(rect);
        canvas.setActiveObject(rect);
        canvas.renderAll();
    });

    btnClear.addEventListener('click', () => {
        if (canvas.getObjects().length === 0) return;
        canvas.clear();
        saveState();
    });

    // -------------------------------------------------------------------------
    // 8. Initial Boot
    // -------------------------------------------------------------------------
    // Save initial blank state for undo baseline
    saveState();
    updateZoomDisplay();
    updateGrid();
});

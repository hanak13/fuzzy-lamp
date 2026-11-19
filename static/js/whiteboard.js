/**
 * Whiteboard Web App - Client-side Logic (Phase 4)
 *
 * Implements:
 * - Full-screen Fabric.js canvas with responsive grid background
 * - Left shapes panel with instant search/filter
 * - Built-in shapes (rectangle, rounded rectangle, circle, triangle)
 * - Custom shapes loaded from static/shapes.json (diamond, star, pentagon, hexagon, arrows, cloud, cross, cylinder, speech bubble)
 * - Shapes support fill color, border color, and double-click editable text inside
 * - Sticky Note tool: Fabric.js Group of a rectangle and editable text with 4 pastel colors
 * - Freehand pen & highlighter with Fabric.js PencilBrush
 * - Eraser with Fabric.js PencilBrush (destination-out & click-to-delete)
 * - Text tool: Click anywhere and type with font size, color, bold, and italic using Fabric.js IText
 * - Select tool: Move, resize, rotate, and delete objects & shapes
 * - Pan & Zoom with bottom-right percentage indicator
 * - Undo / Redo history management
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------------------
    // 1. DOM Elements
    // -------------------------------------------------------------------------
    const canvasContainer = document.getElementById('canvas-container');
    const canvasElement = document.getElementById('whiteboard-canvas');

    // Tool Buttons
    const btnSelect = document.getElementById('btn-select');
    const btnPan = document.getElementById('btn-pan');
    const btnPen = document.getElementById('btn-pen');
    const btnHighlighter = document.getElementById('btn-highlighter');
    const btnEraser = document.getElementById('btn-eraser');
    const btnText = document.getElementById('btn-text');
    const btnSticky = document.getElementById('btn-sticky');
    const btnToggleShapes = document.getElementById('btn-toggle-shapes');

    // Shapes Panel Elements
    const shapesPanel = document.getElementById('shapes-panel');
    const btnCloseShapes = document.getElementById('btn-close-shapes');
    const shapesSearch = document.getElementById('shapes-search');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const shapesList = document.getElementById('shapes-list');

    // Tool Properties
    const colorPicker = document.getElementById('color-picker');
    const colorPreview = document.getElementById('color-preview');
    const fillColorPicker = document.getElementById('fill-color-picker');
    const fillColorPreview = document.getElementById('fill-color-preview');
    const selectStrokeSize = document.getElementById('select-stroke-size');
    const selectFontSize = document.getElementById('select-font-size');
    const btnBold = document.getElementById('btn-bold');
    const btnItalic = document.getElementById('btn-italic');
    const btnDelete = document.getElementById('btn-delete');
    const stickyColorBtns = document.querySelectorAll('.sticky-color-btn');

    // History & Canvas Actions
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const btnAddBox = document.getElementById('btn-add-box');
    const btnClear = document.getElementById('btn-clear');

    // Zoom Controls
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnResetView = document.getElementById('btn-reset-view');
    const zoomPercentageEl = document.getElementById('zoom-percentage');

    // -------------------------------------------------------------------------
    // 2. State Variables & Palette
    // -------------------------------------------------------------------------
    let currentMode = 'select';

    // Tool settings
    let currentColor = colorPicker ? colorPicker.value : '#1e293b';
    let currentFillColor = fillColorPicker ? fillColorPicker.value : '#ffffff';
    let isBold = false;
    let isItalic = false;

    // Sticky Note pastel colors palette
    const STICKY_COLORS = {
        yellow: { bg: '#fef08a', border: '#fde047', text: '#1e293b' },
        pink: { bg: '#fbcfe8', border: '#f9a8d4', text: '#1e293b' },
        green: { bg: '#bbf7d0', border: '#86efac', text: '#1e293b' },
        blue: { bg: '#bfdbfe', border: '#93c5fd', text: '#1e293b' }
    };
    let currentStickyColor = 'yellow';

    // Pan state tracking
    let isPanning = false;
    let isSpacePressed = false;
    let wasDrawingMode = false;
    let lastPosX = 0;
    let lastPosY = 0;

    // Undo / Redo history stacks
    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 50;
    let isProcessingHistory = false;

    // Grid size constant
    const GRID_BASE_SIZE = 30;

    // Extra properties to serialize in Fabric JSON history
    const EXTRA_PROPS = [
        'globalCompositeOperation',
        'objectCaching',
        'selectable',
        'evented',
        'stroke',
        'strokeWidth',
        'strokeLineCap',
        'strokeLineJoin',
        'fill',
        'fontSize',
        'fontFamily',
        'fontWeight',
        'fontStyle',
        'isStickyNote',
        'stickyColor',
        'isShapeGroup',
        'shapeId',
        'subTargetCheck'
    ];

    // -------------------------------------------------------------------------
    // 3. Initialize Fabric.js Canvas
    // -------------------------------------------------------------------------
    const canvas = new fabric.Canvas('whiteboard-canvas', {
        width: window.innerWidth,
        height: window.innerHeight,
        selection: true,
        preserveObjectStacking: true,
        stopContextMenu: true,
        fireRightClick: true
    });

    window.addEventListener('resize', () => {
        canvas.setWidth(window.innerWidth);
        canvas.setHeight(window.innerHeight);
        canvas.renderAll();
        updateGrid();
    });

    // -------------------------------------------------------------------------
    // 4. Color & Brush Helpers
    // -------------------------------------------------------------------------
    function hexToRgba(hex, alpha) {
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(ch => ch + ch).join('');
        }
        const num = parseInt(cleanHex, 16);
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function updateBrushSettings() {
        if (!canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }

        const baseSize = parseInt(selectStrokeSize.value, 10) || 4;

        if (currentMode === 'pen') {
            canvas.isDrawingMode = true;
            canvas.freeDrawingBrush.color = currentColor;
            canvas.freeDrawingBrush.width = baseSize;
            canvas.freeDrawingBrush.strokeLineCap = 'round';
            canvas.freeDrawingBrush.strokeLineJoin = 'round';
        } else if (currentMode === 'highlighter') {
            canvas.isDrawingMode = true;
            const highlighterWidth = Math.max(16, baseSize * 3);
            canvas.freeDrawingBrush.color = hexToRgba(currentColor, 0.35);
            canvas.freeDrawingBrush.width = highlighterWidth;
            canvas.freeDrawingBrush.strokeLineCap = 'round';
            canvas.freeDrawingBrush.strokeLineJoin = 'round';
        } else if (currentMode === 'eraser') {
            canvas.isDrawingMode = true;
            const eraserWidth = Math.max(16, baseSize * 3.5);
            canvas.freeDrawingBrush.color = 'rgba(235, 238, 242, 0.85)';
            canvas.freeDrawingBrush.width = eraserWidth;
            canvas.freeDrawingBrush.strokeLineCap = 'round';
            canvas.freeDrawingBrush.strokeLineJoin = 'round';
        } else {
            canvas.isDrawingMode = false;
        }
    }

    // -------------------------------------------------------------------------
    // 5. Shapes System (Built-in & JSON Definitions)
    // -------------------------------------------------------------------------
    const BUILTIN_SHAPES = [
        {
            id: 'rectangle',
            name: 'Rectangle',
            category: 'Basic',
            isBuiltin: true,
            viewBox: '0 0 32 32',
            svgIcon: '<rect x="3" y="6" width="26" height="20" fill="none" stroke="currentColor" stroke-width="2"/>',
            create: (fill, stroke, strokeWidth) => new fabric.Rect({
                width: 120,
                height: 80,
                rx: 0,
                ry: 0,
                fill: fill,
                stroke: stroke,
                strokeWidth: strokeWidth,
                originX: 'center',
                originY: 'center'
            })
        },
        {
            id: 'rounded-rectangle',
            name: 'Rounded Rect',
            category: 'Basic',
            isBuiltin: true,
            viewBox: '0 0 32 32',
            svgIcon: '<rect x="3" y="6" width="26" height="20" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>',
            create: (fill, stroke, strokeWidth) => new fabric.Rect({
                width: 120,
                height: 80,
                rx: 12,
                ry: 12,
                fill: fill,
                stroke: stroke,
                strokeWidth: strokeWidth,
                originX: 'center',
                originY: 'center'
            })
        },
        {
            id: 'circle',
            name: 'Circle',
            category: 'Basic',
            isBuiltin: true,
            viewBox: '0 0 32 32',
            svgIcon: '<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2"/>',
            create: (fill, stroke, strokeWidth) => new fabric.Circle({
                radius: 45,
                fill: fill,
                stroke: stroke,
                strokeWidth: strokeWidth,
                originX: 'center',
                originY: 'center'
            })
        },
        {
            id: 'triangle',
            name: 'Triangle',
            category: 'Basic',
            isBuiltin: true,
            viewBox: '0 0 32 32',
            svgIcon: '<polygon points="16,5 28,27 4,27" fill="none" stroke="currentColor" stroke-width="2"/>',
            create: (fill, stroke, strokeWidth) => new fabric.Triangle({
                width: 110,
                height: 90,
                fill: fill,
                stroke: stroke,
                strokeWidth: strokeWidth,
                originX: 'center',
                originY: 'center'
            })
        }
    ];

    let allShapes = [...BUILTIN_SHAPES];

    /**
     * Loads custom SVG shapes from static/shapes.json.
     */
    async function loadShapes() {
        try {
            const res = await fetch('/static/shapes.json');
            if (res.ok) {
                const customShapes = await res.json();
                customShapes.forEach(shape => {
                    allShapes.push({
                        id: shape.id,
                        name: shape.name,
                        category: shape.category || 'Shapes',
                        isBuiltin: false,
                        viewBox: shape.viewBox || '0 0 100 100',
                        svgIcon: `<path d="${shape.path}" fill="none" stroke="currentColor" stroke-width="6"/>`,
                        path: shape.path,
                        defaultWidth: shape.defaultWidth || 100,
                        defaultHeight: shape.defaultHeight || 100,
                        create: (fill, stroke, strokeWidth) => {
                            const pathObj = new fabric.Path(shape.path, {
                                fill: fill,
                                stroke: stroke,
                                strokeWidth: strokeWidth,
                                originX: 'center',
                                originY: 'center'
                            });
                            // Normalize scale to match requested dimensions
                            if (shape.defaultWidth && pathObj.width) {
                                const targetScale = shape.defaultWidth / pathObj.width;
                                pathObj.scale(targetScale);
                            }
                            return pathObj;
                        }
                    });
                });
            }
        } catch (err) {
            console.error('Failed to load /static/shapes.json:', err);
        }
        renderShapesList();
    }

    /**
     * Renders shape cards in the left shapes panel according to search query.
     */
    function renderShapesList() {
        if (!shapesList) return;
        const query = (shapesSearch ? shapesSearch.value.trim().toLowerCase() : '');

        const filtered = allShapes.filter(s =>
            s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query)
        );

        shapesList.innerHTML = '';

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'shapes-empty';
            emptyEl.textContent = 'No shapes found';
            shapesList.appendChild(emptyEl);
            return;
        }

        filtered.forEach(shapeDef => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'shape-card';
            card.title = `Add ${shapeDef.name}`;
            card.innerHTML = `
                <svg viewBox="${shapeDef.viewBox || '0 0 32 32'}">
                    ${shapeDef.svgIcon}
                </svg>
                <span class="shape-card-name">${shapeDef.name}</span>
            `;

            card.addEventListener('click', () => {
                addShapeToCanvas(shapeDef);
            });

            shapesList.appendChild(card);
        });
    }

    /**
     * Adds a shape group (shape + centered editable text) to the canvas.
     */
    function addShapeToCanvas(shapeDef, x, y) {
        const vpt = canvas.viewportTransform;
        const targetX = (x !== undefined) ? x : (-vpt[4] + canvas.getWidth() / 2) / canvas.getZoom();
        const targetY = (y !== undefined) ? y : (-vpt[5] + canvas.getHeight() / 2) / canvas.getZoom();

        const strokeWidth = parseInt(selectStrokeSize.value, 10) || 2;
        const fill = currentFillColor || '#ffffff';
        const stroke = currentColor || '#334155';

        // 1. Create underlying shape object
        const shapeObj = shapeDef.create(fill, stroke, strokeWidth);

        // Calculate text box width proportional to shape bounds
        const shapeBoundsWidth = shapeObj.getScaledWidth ? shapeObj.getScaledWidth() : (shapeObj.width || 100);
        const textWidth = Math.max(60, shapeBoundsWidth * 0.75);

        // 2. Create centered editable text
        const textObj = new fabric.Textbox('Text', {
            width: textWidth,
            fontSize: 16,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fill: '#1e293b',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            splitByGrapheme: true,
            cursorColor: '#1e293b'
        });

        // 3. Group shape and text together
        const group = new fabric.Group([shapeObj, textObj], {
            left: targetX,
            top: targetY,
            originX: 'center',
            originY: 'center',
            isShapeGroup: true,
            shapeId: shapeDef.id,
            subTargetCheck: false
        });

        canvas.add(group);
        setMode('select');
        canvas.setActiveObject(group);
        canvas.renderAll();
        saveState();
    }

    // -------------------------------------------------------------------------
    // Sidebar Dock & Drawer Controller (6 buttons)
    // -------------------------------------------------------------------------
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    const drawerPanels = document.querySelectorAll('.drawer-panel-content');
    const closeDrawerBtns = document.querySelectorAll('.btn-close-drawer');

    let activeDrawerPanel = null;

    /**
     * Opens or toggles a specific drawer panel (shapes, stickers, templates, media, icons, layers).
     */
    function openDrawerPanel(panelId) {
        if (!shapesPanel) return;

        // If clicking the active panel that's currently open, toggle it closed
        if (!shapesPanel.classList.contains('hidden') && activeDrawerPanel === panelId) {
            closeDrawer();
            return;
        }

        // Open drawer
        shapesPanel.classList.remove('hidden');
        activeDrawerPanel = panelId;

        // Update active class on sidebar dock buttons
        sidebarBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panelId);
        });

        // Sync toolbar shapes button if shapes is opened
        if (btnToggleShapes) {
            btnToggleShapes.classList.toggle('active', panelId === 'shapes');
        }

        // Show matching panel content and hide others
        drawerPanels.forEach(panel => {
            const matches = (panel.id === `drawer-panel-${panelId}`);
            panel.style.display = matches ? 'flex' : 'none';
        });

        // Auto-focus search input when shapes panel is active
        if (panelId === 'shapes' && shapesSearch) {
            setTimeout(() => shapesSearch.focus(), 50);
        }
    }

    /**
     * Closes the sidebar drawer and deactivates button highlights.
     */
    function closeDrawer() {
        if (!shapesPanel) return;
        shapesPanel.classList.add('hidden');
        activeDrawerPanel = null;

        sidebarBtns.forEach(btn => btn.classList.remove('active'));
        if (btnToggleShapes) btnToggleShapes.classList.remove('active');
    }

    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPanel = btn.dataset.panel;
            if (targetPanel) {
                openDrawerPanel(targetPanel);
            }
        });
    });

    closeDrawerBtns.forEach(btn => {
        btn.addEventListener('click', closeDrawer);
    });

    if (btnCloseShapes) {
        btnCloseShapes.addEventListener('click', closeDrawer);
    }

    if (btnToggleShapes) {
        btnToggleShapes.addEventListener('click', () => {
            openDrawerPanel('shapes');
        });
    }

    if (shapesSearch) {
        shapesSearch.addEventListener('input', () => {
            if (btnClearSearch) {
                btnClearSearch.style.display = shapesSearch.value ? 'block' : 'none';
            }
            renderShapesList();
        });
    }

    if (btnClearSearch) {
        btnClearSearch.addEventListener('click', () => {
            shapesSearch.value = '';
            btnClearSearch.style.display = 'none';
            shapesSearch.focus();
            renderShapesList();
        });
    }

    // -------------------------------------------------------------------------
    // 6. Sticky Note Factory Function
    // -------------------------------------------------------------------------
    function createStickyNote(x, y, colorKey = currentStickyColor, initialText = 'Type a note...') {
        const colors = STICKY_COLORS[colorKey] || STICKY_COLORS.yellow;
        const noteWidth = 180;
        const noteHeight = 180;

        const rect = new fabric.Rect({
            width: noteWidth,
            height: noteHeight,
            fill: colors.bg,
            stroke: colors.border,
            strokeWidth: 1.5,
            rx: 6,
            ry: 6,
            originX: 'center',
            originY: 'center',
            shadow: new fabric.Shadow({
                color: 'rgba(0, 0, 0, 0.12)',
                blur: 10,
                offsetX: 2,
                offsetY: 4
            })
        });

        const text = new fabric.Textbox(initialText, {
            width: noteWidth - 28,
            fontSize: 16,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fill: colors.text,
            textAlign: 'left',
            originX: 'center',
            originY: 'center',
            splitByGrapheme: true,
            cursorColor: colors.text
        });

        const group = new fabric.Group([rect, text], {
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            isStickyNote: true,
            stickyColor: colorKey,
            subTargetCheck: false
        });

        return { group, rect, text };
    }

    function setStickyColor(colorKey, shouldUpdateSelection = true) {
        currentStickyColor = colorKey;

        stickyColorBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === colorKey);
        });

        if (shouldUpdateSelection) {
            const activeObj = canvas.getActiveObject();
            if (activeObj && activeObj.isStickyNote) {
                activeObj.stickyColor = colorKey;
                const rect = activeObj.getObjects().find(o => o.type === 'rect');
                if (rect) {
                    const colors = STICKY_COLORS[colorKey] || STICKY_COLORS.yellow;
                    rect.set({
                        fill: colors.bg,
                        stroke: colors.border
                    });
                    canvas.renderAll();
                    saveState();
                }
            }
        }
    }

    stickyColorBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setStickyColor(btn.dataset.color, true);
        });
    });

    // -------------------------------------------------------------------------
    // 7. Grid Background Synchronization
    // -------------------------------------------------------------------------
    function updateGrid() {
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;

        const scaledGrid = GRID_BASE_SIZE * zoom;
        const posX = ((vpt[4] % scaledGrid) + scaledGrid) % scaledGrid;
        const posY = ((vpt[5] % scaledGrid) + scaledGrid) % scaledGrid;

        canvasContainer.style.backgroundSize = `${scaledGrid}px ${scaledGrid}px`;
        canvasContainer.style.backgroundPosition = `${posX}px ${posY}px`;
    }

    // -------------------------------------------------------------------------
    // 8. Zoom Controls & Indicator
    // -------------------------------------------------------------------------
    function updateZoomDisplay() {
        const zoom = canvas.getZoom();
        const percentage = Math.round(zoom * 100);
        zoomPercentageEl.textContent = `${percentage}%`;
    }

    function setZoom(newZoom, point) {
        const clampedZoom = Math.max(0.1, Math.min(5.0, newZoom));
        const targetPoint = point || new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);

        canvas.zoomToPoint(targetPoint, clampedZoom);
        updateZoomDisplay();
        updateGrid();
    }

    canvas.on('mouse:wheel', (opt) => {
        const delta = opt.e.deltaY;
        let zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        setZoom(zoom, new fabric.Point(opt.e.offsetX, opt.e.offsetY));
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });

    btnZoomIn.addEventListener('click', () => setZoom(canvas.getZoom() * 1.2));
    btnZoomOut.addEventListener('click', () => setZoom(canvas.getZoom() / 1.2));

    function resetView() {
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        updateZoomDisplay();
        updateGrid();
    }

    btnResetView.addEventListener('click', resetView);
    zoomPercentageEl.addEventListener('click', resetView);

    // -------------------------------------------------------------------------
    // 9. Mode Management
    // -------------------------------------------------------------------------
    const toolButtons = {
        select: btnSelect,
        pan: btnPan,
        pen: btnPen,
        highlighter: btnHighlighter,
        eraser: btnEraser,
        text: btnText,
        sticky: btnSticky
    };

    function setMode(mode) {
        currentMode = mode;

        Object.entries(toolButtons).forEach(([key, btn]) => {
            if (btn) btn.classList.toggle('active', key === mode);
        });

        if (mode === 'select') {
            canvas.isDrawingMode = false;
            canvas.selection = true;
            canvas.defaultCursor = 'default';
            canvas.forEachObject(obj => {
                if (obj.globalCompositeOperation !== 'destination-out') {
                    obj.selectable = true;
                }
            });
        } else if (mode === 'pan') {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.discardActiveObject();
            canvas.defaultCursor = 'grab';
            canvas.forEachObject(obj => obj.selectable = false);
            canvas.renderAll();
        } else if (mode === 'pen') {
            canvas.discardActiveObject();
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
            canvas.forEachObject(obj => obj.selectable = false);
            updateBrushSettings();
            canvas.renderAll();
        } else if (mode === 'highlighter') {
            canvas.discardActiveObject();
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
            canvas.forEachObject(obj => obj.selectable = false);
            updateBrushSettings();
            canvas.renderAll();
        } else if (mode === 'eraser') {
            canvas.discardActiveObject();
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
            canvas.forEachObject(obj => obj.selectable = false);
            updateBrushSettings();
            canvas.renderAll();
        } else if (mode === 'text') {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.discardActiveObject();
            canvas.defaultCursor = 'text';
            canvas.forEachObject(obj => {
                obj.selectable = (obj.type === 'i-text');
            });
            canvas.renderAll();
        } else if (mode === 'sticky') {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.discardActiveObject();
            canvas.defaultCursor = 'copy';
            canvas.forEachObject(obj => obj.selectable = false);
            canvas.renderAll();
        }
    }

    btnSelect.addEventListener('click', () => setMode('select'));
    btnPan.addEventListener('click', () => setMode('pan'));
    btnPen.addEventListener('click', () => setMode('pen'));
    btnHighlighter.addEventListener('click', () => setMode('highlighter'));
    btnEraser.addEventListener('click', () => setMode('eraser'));
    btnText.addEventListener('click', () => setMode('text'));
    btnSticky.addEventListener('click', () => setMode('sticky'));

    // -------------------------------------------------------------------------
    // 10. Freehand Brush & Eraser Finalization (path:created)
    // -------------------------------------------------------------------------
    canvas.on('path:created', (opt) => {
        const path = opt.path;
        if (!path) return;

        if (currentMode === 'eraser') {
            path.set({
                stroke: '#000000',
                globalCompositeOperation: 'destination-out',
                selectable: false,
                evented: false,
                objectCaching: false
            });
            canvas.renderAll();
        } else if (currentMode === 'highlighter') {
            path.set({
                stroke: hexToRgba(currentColor, 0.35),
                selectable: currentMode === 'select'
            });
            canvas.renderAll();
        } else if (currentMode === 'pen') {
            path.set({
                selectable: currentMode === 'select'
            });
        }
    });

    // -------------------------------------------------------------------------
    // 11. Mouse Down: Pan, Sticky Notes, Text, Eraser Clicks
    // -------------------------------------------------------------------------
    canvas.on('mouse:down', (opt) => {
        const evt = opt.e;
        const isMiddleClick = evt.button === 1;
        const shouldPan = currentMode === 'pan' || isSpacePressed || isMiddleClick;

        if (shouldPan) {
            isPanning = true;
            lastPosX = evt.clientX;
            lastPosY = evt.clientY;
            canvas.defaultCursor = 'grabbing';
            evt.preventDefault();
            return;
        }

        if (currentMode === 'eraser' && opt.target) {
            canvas.remove(opt.target);
            canvas.renderAll();
            saveState();
            return;
        }

        if (currentMode === 'sticky') {
            const pointer = canvas.getPointer(opt.e);
            const { group, text } = createStickyNote(pointer.x, pointer.y, currentStickyColor, 'Type note...');

            canvas.add(group);
            canvas.renderAll();
            saveState();

            setMode('select');
            canvas.setActiveObject(text);
            text.enterEditing();
            text.selectAll();
            canvas.renderAll();

            text.on('editing:exited', () => {
                canvas.setActiveObject(group);
                canvas.renderAll();
                saveState();
            });
            return;
        }

        if (currentMode === 'text') {
            if (opt.target && opt.target.type === 'i-text') {
                canvas.setActiveObject(opt.target);
                opt.target.enterEditing();
                return;
            }

            const pointer = canvas.getPointer(opt.e);
            const fontSize = parseInt(selectFontSize.value, 10) || 24;

            const textObj = new fabric.IText('Type here', {
                left: pointer.x,
                top: pointer.y,
                fontFamily: 'sans-serif',
                fontSize: fontSize,
                fill: currentColor,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                editable: true,
                selectable: true
            });

            canvas.add(textObj);
            canvas.setActiveObject(textObj);
            textObj.enterEditing();
            textObj.selectAll();
            canvas.renderAll();

            textObj.on('editing:exited', () => {
                if (textObj.text.trim() === '') {
                    canvas.remove(textObj);
                    canvas.renderAll();
                } else {
                    saveState();
                }
            });
        }
    });

    // Double-click on shape group or sticky note enters text editing mode
    canvas.on('mouse:dblclick', (opt) => {
        const target = opt.target;
        if (target && (target.isShapeGroup || target.isStickyNote)) {
            const textObj = target.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text');
            if (textObj) {
                canvas.setActiveObject(textObj);
                textObj.enterEditing();
                textObj.selectAll();
                canvas.renderAll();

                textObj.on('editing:exited', () => {
                    canvas.setActiveObject(target);
                    canvas.renderAll();
                    saveState();
                });
            }
        }
    });

    // Mouse Move: Pan execution
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

    function stopPanning() {
        if (isPanning) {
            isPanning = false;
            if (currentMode === 'pan' || isSpacePressed) {
                canvas.defaultCursor = 'grab';
            } else if (currentMode === 'pen' || currentMode === 'highlighter' || currentMode === 'eraser') {
                canvas.defaultCursor = 'crosshair';
            } else if (currentMode === 'text') {
                canvas.defaultCursor = 'text';
            } else if (currentMode === 'sticky') {
                canvas.defaultCursor = 'copy';
            } else {
                canvas.defaultCursor = 'default';
            }
        }
    }

    canvas.on('mouse:up', stopPanning);
    window.addEventListener('mouseup', stopPanning);

    // -------------------------------------------------------------------------
    // 12. Selection, Move, Resize & Delete Controls
    // -------------------------------------------------------------------------
    function updateSelectionUI() {
        const activeObjs = canvas.getActiveObjects();
        btnDelete.disabled = (!activeObjs || activeObjs.length === 0);

        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            // 1. If Sticky Note selected
            if (activeObj.isStickyNote && activeObj.stickyColor) {
                setStickyColor(activeObj.stickyColor, false);
            }

            // 2. If Shape Group selected: sync Fill & Border colors and text formatting
            if (activeObj.isShapeGroup) {
                const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
                if (shape) {
                    if (shape.fill && typeof shape.fill === 'string' && shape.fill.startsWith('#')) {
                        currentFillColor = shape.fill;
                        if (fillColorPicker) fillColorPicker.value = currentFillColor;
                        if (fillColorPreview) fillColorPreview.style.backgroundColor = currentFillColor;
                    }
                    if (shape.stroke && typeof shape.stroke === 'string' && shape.stroke.startsWith('#')) {
                        currentColor = shape.stroke;
                        if (colorPicker) colorPicker.value = currentColor;
                        if (colorPreview) colorPreview.style.backgroundColor = currentColor;
                    }
                    if (shape.strokeWidth) {
                        selectStrokeSize.value = String(shape.strokeWidth);
                    }
                }
                const textObj = activeObj.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text');
                if (textObj) {
                    selectFontSize.value = String(textObj.fontSize || 16);
                    isBold = (textObj.fontWeight === 'bold');
                    btnBold.classList.toggle('active', isBold);
                    isItalic = (textObj.fontStyle === 'italic');
                    btnItalic.classList.toggle('active', isItalic);
                }
            }

            // 3. If a standalone IText is selected
            if (activeObj.type === 'i-text') {
                selectFontSize.value = String(activeObj.fontSize || 24);
                if (activeObj.fill && activeObj.fill.startsWith('#')) {
                    currentColor = activeObj.fill;
                    colorPicker.value = currentColor;
                    colorPreview.style.backgroundColor = currentColor;
                }
                isBold = (activeObj.fontWeight === 'bold');
                btnBold.classList.toggle('active', isBold);
                isItalic = (activeObj.fontStyle === 'italic');
                btnItalic.classList.toggle('active', isItalic);
            }
        }
    }

    canvas.on('selection:created', updateSelectionUI);
    canvas.on('selection:updated', updateSelectionUI);
    canvas.on('selection:cleared', () => {
        btnDelete.disabled = true;
    });

    function deleteSelectedObjects() {
        const activeObjs = canvas.getActiveObjects();
        if (!activeObjs || activeObjs.length === 0) return;

        canvas.discardActiveObject();
        activeObjs.forEach(obj => canvas.remove(obj));
        canvas.requestRenderAll();
        saveState();
    }

    btnDelete.addEventListener('click', deleteSelectedObjects);

    // -------------------------------------------------------------------------
    // 13. Property Handlers (Fill, Border, Stroke Size, Font Size, Bold, Italic)
    // -------------------------------------------------------------------------
    // Fill color picker for shapes
    if (fillColorPicker) {
        fillColorPicker.addEventListener('input', (e) => {
            currentFillColor = e.target.value;
            if (fillColorPreview) fillColorPreview.style.backgroundColor = currentFillColor;

            const activeObj = canvas.getActiveObject();
            if (activeObj && activeObj.isShapeGroup) {
                const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
                if (shape) {
                    shape.set('fill', currentFillColor);
                    canvas.renderAll();
                    saveState();
                }
            }
        });
    }

    // Border / Pen / Stroke color picker
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            currentColor = e.target.value;
            if (colorPreview) colorPreview.style.backgroundColor = currentColor;

            const activeObj = canvas.getActiveObject();
            if (activeObj && activeObj.isShapeGroup) {
                const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
                if (shape) {
                    shape.set('stroke', currentColor);
                    canvas.renderAll();
                    saveState();
                }
            } else if (activeObj && activeObj.type === 'i-text') {
                activeObj.set('fill', currentColor);
                canvas.renderAll();
                saveState();
            }

            if (canvas.isDrawingMode) {
                updateBrushSettings();
            }
        });
    }

    selectStrokeSize.addEventListener('change', () => {
        const strokeWidth = parseInt(selectStrokeSize.value, 10);
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isShapeGroup) {
            const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
            if (shape) {
                shape.set('strokeWidth', strokeWidth);
                canvas.renderAll();
                saveState();
            }
        }

        if (canvas.isDrawingMode) {
            updateBrushSettings();
        }
    });

    selectFontSize.addEventListener('change', () => {
        const fontSize = parseInt(selectFontSize.value, 10);
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isShapeGroup) {
            const textObj = activeObj.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text');
            if (textObj) {
                textObj.set('fontSize', fontSize);
                canvas.renderAll();
                saveState();
            }
        } else if (activeObj && activeObj.type === 'i-text') {
            activeObj.set('fontSize', fontSize);
            canvas.renderAll();
            saveState();
        }
    });

    btnBold.addEventListener('click', () => {
        isBold = !isBold;
        btnBold.classList.toggle('active', isBold);

        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isShapeGroup) {
            const textObj = activeObj.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text');
            if (textObj) {
                textObj.set('fontWeight', isBold ? 'bold' : 'normal');
                canvas.renderAll();
                saveState();
            }
        } else if (activeObj && activeObj.type === 'i-text') {
            activeObj.set('fontWeight', isBold ? 'bold' : 'normal');
            canvas.renderAll();
            saveState();
        }
    });

    btnItalic.addEventListener('click', () => {
        isItalic = !isItalic;
        btnItalic.classList.toggle('active', isItalic);

        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isShapeGroup) {
            const textObj = activeObj.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text');
            if (textObj) {
                textObj.set('fontStyle', isItalic ? 'italic' : 'normal');
                canvas.renderAll();
                saveState();
            }
        } else if (activeObj && activeObj.type === 'i-text') {
            activeObj.set('fontStyle', isItalic ? 'italic' : 'normal');
            canvas.renderAll();
            saveState();
        }
    });

    // -------------------------------------------------------------------------
    // 14. Keyboard Shortcuts & Typing Detection
    // -------------------------------------------------------------------------
    function isUserTyping() {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isEditing) return true;
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        return tag === 'input' || tag === 'textarea' || tag === 'select';
    }

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !isSpacePressed && !isUserTyping()) {
            isSpacePressed = true;
            wasDrawingMode = canvas.isDrawingMode;
            canvas.isDrawingMode = false;
            canvas.defaultCursor = 'grab';
            canvas.selection = false;
            e.preventDefault();
            return;
        }

        if (isUserTyping()) {
            if (e.key === 'Escape') {
                const activeObj = canvas.getActiveObject();
                if (activeObj && activeObj.isEditing) {
                    activeObj.exitEditing();
                    canvas.renderAll();
                }
            }
            return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            deleteSelectedObjects();
            e.preventDefault();
            return;
        }

        // Tool Shortcuts
        if (e.key === 'v' || e.key === 'V') setMode('select');
        if (e.key === 'h' || e.key === 'H') setMode('pan');
        if (e.key === 'p' || e.key === 'P') setMode('pen');
        if (e.key === 'k' || e.key === 'K') setMode('highlighter');
        if (e.key === 'e' || e.key === 'E') setMode('eraser');
        if (e.key === 't' || e.key === 'T') setMode('text');
        if (e.key === 's' || e.key === 'S' || e.key === 'n' || e.key === 'N') setMode('sticky');

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
            canvas.isDrawingMode = wasDrawingMode;
            if (currentMode === 'select') {
                canvas.defaultCursor = 'default';
                canvas.selection = true;
            } else if (currentMode === 'pan') {
                canvas.defaultCursor = 'grab';
            } else if (currentMode === 'pen' || currentMode === 'highlighter' || currentMode === 'eraser') {
                canvas.defaultCursor = 'crosshair';
            } else if (currentMode === 'text') {
                canvas.defaultCursor = 'text';
            } else if (currentMode === 'sticky') {
                canvas.defaultCursor = 'copy';
            }
        }
    });

    // -------------------------------------------------------------------------
    // 15. Undo / Redo History Management
    // -------------------------------------------------------------------------
    function updateHistoryButtons() {
        btnUndo.disabled = undoStack.length <= 1;
        btnRedo.disabled = redoStack.length === 0;
    }

    function saveState() {
        if (isProcessingHistory) return;

        const currentState = JSON.stringify(canvas.toJSON(EXTRA_PROPS));

        if (undoStack.length > 0 && undoStack[undoStack.length - 1] === currentState) {
            return;
        }

        undoStack.push(currentState);
        if (undoStack.length > MAX_HISTORY) {
            undoStack.shift();
        }

        redoStack.length = 0;
        updateHistoryButtons();
    }

    function undo() {
        if (undoStack.length <= 1) return;

        const currentState = undoStack.pop();
        redoStack.push(currentState);

        const previousState = undoStack[undoStack.length - 1];
        loadCanvasState(previousState);
    }

    function redo() {
        if (redoStack.length === 0) return;

        const nextState = redoStack.pop();
        undoStack.push(nextState);

        loadCanvasState(nextState);
    }

    function loadCanvasState(jsonState) {
        isProcessingHistory = true;
        const currentVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : null;

        canvas.loadFromJSON(jsonState, () => {
            if (currentVpt) {
                canvas.setViewportTransform(currentVpt);
            }

            canvas.forEachObject(obj => {
                if (obj.globalCompositeOperation === 'destination-out') {
                    obj.selectable = false;
                    obj.evented = false;
                } else if (currentMode === 'select') {
                    obj.selectable = true;
                } else if (currentMode === 'text') {
                    obj.selectable = (obj.type === 'i-text');
                } else {
                    obj.selectable = false;
                }
            });

            canvas.renderAll();
            isProcessingHistory = false;
            updateHistoryButtons();
            updateSelectionUI();
        });
    }

    btnUndo.addEventListener('click', undo);
    btnRedo.addEventListener('click', redo);

    canvas.on('object:added', () => saveState());
    canvas.on('object:modified', () => saveState());
    canvas.on('object:removed', () => saveState());

    // -------------------------------------------------------------------------
    // 16. Sample Shapes & Clear
    // -------------------------------------------------------------------------
    const colors = ['#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#f472b6'];
    let colorIndex = 0;

    btnAddBox.addEventListener('click', () => {
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
        if (currentMode === 'select') {
            canvas.setActiveObject(rect);
        }
        canvas.renderAll();
    });

    btnClear.addEventListener('click', () => {
        if (canvas.getObjects().length === 0) return;
        canvas.clear();
        saveState();
    });

    // -------------------------------------------------------------------------
    // 17. Initial Boot
    // -------------------------------------------------------------------------
    saveState();
    updateZoomDisplay();
    updateGrid();
    loadShapes(); // Fetch non-built-in shapes from static/shapes.json & render list
});

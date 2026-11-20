/**
 * Whiteboard Web App - Client-side Logic (Phase 5)
 *
 * Implements:
 * - Full-screen Fabric.js canvas with responsive grid background
 * - Left Navigation Sidebar Dock (6 buttons) + Hidden Flyout Drawer
 * - Shapes Library with Flowchart section (Process, Decision, Terminator, Data, Document, Database, Connector Circle, Delay, Manual Input, Predefined Process)
 * - Category filter chips (All, Flowchart, Basic, Arrows, Symbols) + instant search
 * - Custom shapes loaded from static/shapes.json with full contributor extensibility
 * - Connector lines & arrows (L, A) that attach to shapes and dynamically follow them on move/scale
 * - Shape fill color, border color, and double-click editable text inside
 * - Sticky Note tool: Fabric.js Group of rectangle and editable text with 4 pastel colors
 * - Freehand pen & highlighter with Fabric.js PencilBrush
 * - Eraser with Fabric.js PencilBrush (destination-out & click-to-delete)
 * - Text tool: Click anywhere and type with font size, color, bold, and italic using Fabric.js IText
 * - Select tool: Move, resize, rotate, and delete objects, shapes, and connectors
 * - Pan & Zoom with bottom-right percentage indicator
 * - Undo / Redo history management with connector link preservation
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
    const btnSticky = document.getElementById('btn-sticky') || document.getElementById('btn-sidebar-notes');
    const btnSidebarNotes = document.getElementById('btn-sidebar-notes');
    const btnLine = document.getElementById('btn-line');
    const btnArrow = document.getElementById('btn-arrow');
    const btnToggleShapes = document.getElementById('btn-toggle-shapes');

    // Sidebar & Drawer Elements
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    const shapesPanel = document.getElementById('shapes-panel');
    const btnCloseShapes = document.getElementById('btn-close-shapes');
    const closeDrawerBtns = document.querySelectorAll('.btn-close-drawer');
    const drawerPanels = document.querySelectorAll('.drawer-panel-content');

    // Shapes Search & Categories
    const shapesSearch = document.getElementById('shapes-search');
    const btnClearSearch = document.getElementById('btn-clear-search');
    const shapesList = document.getElementById('shapes-list');
    const categoryChips = document.querySelectorAll('.category-chip');

    // Tool Properties
    const colorPicker = document.getElementById('color-picker');
    const colorPreview = document.getElementById('color-preview');
    const fillColorPicker = document.getElementById('fill-color-picker');
    const fillColorPreview = document.getElementById('fill-color-preview');
    const btnFillNone = document.getElementById('btn-fill-none');
    const selectStrokeSize = document.getElementById('select-stroke-size');
    const selectFontSize = document.getElementById('select-font-size');
    const btnBold = document.getElementById('btn-bold');
    const btnItalic = document.getElementById('btn-italic');
    const btnDelete = document.getElementById('btn-delete');
    const stickyColorBtns = document.querySelectorAll('.sticky-color-btn');

    // Line & Arrow Specific Properties
    const propLineGroup = document.getElementById('prop-line-group');
    const propFillGroup = document.getElementById('prop-fill-group');
    const propTextGroup = document.getElementById('prop-text-group');
    const selectLinePattern = document.getElementById('select-line-pattern');
    const selectArrowHead = document.getElementById('select-arrow-head');

    // Category Navigation Elements
    const btnCatPrev = document.getElementById('btn-cat-prev');
    const btnCatNext = document.getElementById('btn-cat-next');
    const shapesCategoriesEl = document.getElementById('shapes-categories');

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
    let currentMode = 'select'; // 'select', 'pan', 'pen', 'highlighter', 'eraser', 'text', 'sticky', 'line', 'arrow'
    let activeCategory = 'all';
    let activeFlowchartSection = 'all';
    const fcSubsectionsEl = document.getElementById('flowchart-subsections');
    const fcSubPills = document.querySelectorAll('.fc-sub-pill');

    // Templates Elements
    let allTemplates = [];
    const templatesList = document.getElementById('templates-list');
    const templatesSearch = document.getElementById('templates-search');
    const btnClearTemplatesSearch = document.getElementById('btn-clear-templates-search');

    // Stickers Elements
    let allStickers = [];
    const stickersGallery = document.getElementById('stickers-gallery');
    const stickersCountBadge = document.getElementById('stickers-count-badge');
    const stickersSearch = document.getElementById('stickers-search');
    const btnClearStickersSearch = document.getElementById('btn-clear-stickers-search');
    const stickersUploadBox = document.getElementById('stickers-upload-box');
    const stickersFileInput = document.getElementById('stickers-file-input');
    const btnBrowseStickers = document.getElementById('btn-browse-stickers');
    let currentLinePattern = 'solid'; // 'solid', 'dashed', 'dotted'
    let currentArrowHeadStyle = 'end'; // 'none', 'end', 'start', 'both'

    // Tool settings
    let currentColor = colorPicker ? colorPicker.value : '#1e293b';
    let currentFillColor = 'transparent'; // Wireframe diagram shapes: transparent empty middle by default
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

    // Connector drawing state
    let isConnecting = false;
    let connectorModeType = 'arrow'; // 'line' or 'arrow'
    let connectorStartObj = null;
    let connectorStartPoint = null;
    let connectorPreviewLine = null;

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
        'underline',
        'linethrough',
        'textAlign',
        'isStickyNote',
        'stickyColor',
        'isShapeGroup',
        'isMergedShape',
        'shapeId',
        'shapeUid',
        'isConnector',
        'hasArrow',
        'fromShapeUid',
        'toShapeUid',
        'isArrowHead',
        'strokeDashArray',
        'arrowHeadStyle',
        'isFreeLine',
        'subTargetCheck',
        'isSticker',
        'stickerUrl'
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

    const USER_SHAPES_STORAGE_KEY = 'whiteboard_user_custom_shapes';
    let staticJsonShapes = [];
    let allShapes = [...BUILTIN_SHAPES];

    function getUserCustomShapes() {
        try {
            const raw = localStorage.getItem(USER_SHAPES_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to parse user custom shapes:', e);
            return [];
        }
    }

    function saveUserCustomShape(shapeItem) {
        const list = getUserCustomShapes();
        list.unshift(shapeItem);
        localStorage.setItem(USER_SHAPES_STORAGE_KEY, JSON.stringify(list));
        refreshAllShapes();
    }

    function deleteUserCustomShape(id) {
        let list = getUserCustomShapes();
        list = list.filter(item => item.id !== id);
        localStorage.setItem(USER_SHAPES_STORAGE_KEY, JSON.stringify(list));
        refreshAllShapes();
    }

    function refreshAllShapes() {
        const userShapes = getUserCustomShapes();
        allShapes = [...BUILTIN_SHAPES, ...staticJsonShapes, ...userShapes];
        renderShapesList();
    }

    async function loadShapes() {
        try {
            const res = await fetch('/static/shapes.json');
            if (res.ok) {
                const customShapes = await res.json();
                staticJsonShapes = customShapes.map(shape => ({
                    id: shape.id,
                    name: shape.name,
                    category: shape.category || 'Shapes',
                    section: shape.section || null,
                    tags: Array.isArray(shape.tags) ? shape.tags : [],
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
                        if (shape.defaultWidth && pathObj.width) {
                            const targetScale = shape.defaultWidth / pathObj.width;
                            pathObj.scale(targetScale);
                        }
                        return pathObj;
                    }
                }));
            }
        } catch (err) {
            console.error('Failed to load /static/shapes.json:', err);
        }
        refreshAllShapes();
    }

    function renderShapesList() {
        if (!shapesList) return;
        const query = (shapesSearch ? shapesSearch.value.trim().toLowerCase() : '');
        const isFlowchart = (activeCategory && activeCategory.toLowerCase() === 'flowchart');

        if (fcSubsectionsEl) {
            fcSubsectionsEl.style.display = isFlowchart ? 'flex' : 'none';
        }

        const filtered = allShapes.filter(s => {
            const matchesQuery = !query ||
                s.name.toLowerCase().includes(query) ||
                (s.category && s.category.toLowerCase().includes(query)) ||
                (s.section && s.section.toLowerCase().includes(query)) ||
                (Array.isArray(s.tags) && s.tags.some(t => t.toLowerCase().includes(query)));

            const matchesCategory = (activeCategory === 'all') ||
                (s.category && s.category.toLowerCase() === activeCategory.toLowerCase());

            let matchesSection = true;
            if (isFlowchart && activeFlowchartSection !== 'all') {
                matchesSection = (s.section === activeFlowchartSection);
            }

            return matchesQuery && matchesCategory && matchesSection;
        });

        shapesList.innerHTML = '';

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'shapes-empty';
            emptyEl.textContent = (activeCategory && activeCategory.toLowerCase() === 'my shapes')
                ? 'No saved shapes yet. Multi-select objects, merge them, then right-click "Save to My Shapes".'
                : 'No matching shapes';
            shapesList.appendChild(emptyEl);
            return;
        }

        filtered.forEach(shapeDef => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'shape-card';
            card.title = `Add ${shapeDef.name} (${shapeDef.category || 'Shape'})`;

            if (shapeDef.isUserCustom) {
                card.innerHTML = `
                    <button type="button" class="btn-delete-custom-shape" data-id="${shapeDef.id}" title="Delete this shape">&times;</button>
                    ${shapeDef.thumbnail 
                        ? `<img class="custom-shape-img" src="${shapeDef.thumbnail}" alt="${shapeDef.name}">` 
                        : `<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`}
                    <span class="shape-card-name">${shapeDef.name}</span>
                `;

                const btnDel = card.querySelector('.btn-delete-custom-shape');
                if (btnDel) {
                    btnDel.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${shapeDef.name}" from My Shapes?`)) {
                            deleteUserCustomShape(shapeDef.id);
                            showToast(`Deleted "${shapeDef.name}" from My Shapes`);
                        }
                    });
                }

                card.addEventListener('click', () => {
                    addUserCustomShapeToCanvas(shapeDef);
                });
            } else {
                card.innerHTML = `
                    <svg viewBox="${shapeDef.viewBox || '0 0 32 32'}">
                        ${shapeDef.svgIcon}
                    </svg>
                    <span class="shape-card-name">${shapeDef.name}</span>
                `;

                card.addEventListener('click', () => {
                    addShapeToCanvas(shapeDef);
                });
            }

            shapesList.appendChild(card);
        });
    }

    function addUserCustomShapeToCanvas(shapeDef, x, y) {
        if (!shapeDef || !shapeDef.json) return;
        const vpt = canvas.viewportTransform;
        const targetX = (x !== undefined) ? x : (-vpt[4] + canvas.getWidth() / 2) / canvas.getZoom();
        const targetY = (y !== undefined) ? y : (-vpt[5] + canvas.getHeight() / 2) / canvas.getZoom();

        fabric.util.enlivenObjects([shapeDef.json], (enlivenedObjects) => {
            if (!enlivenedObjects || enlivenedObjects.length === 0) return;
            const restoredObj = enlivenedObjects[0];

            restoredObj.set({
                left: targetX,
                top: targetY,
                originX: 'center',
                originY: 'center',
                shapeUid: generateUid(),
                selectable: currentMode === 'select',
                evented: true
            });

            restoredObj.setCoords();
            canvas.add(restoredObj);
            if (currentMode === 'select') {
                canvas.setActiveObject(restoredObj);
            }
            canvas.renderAll();
            saveState();
            showToast(`Added "${shapeDef.name}" to canvas`);
        });
    }

    // Category Filter Chips & Horizontal Scroll Navigation
    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            categoryChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeCategory = chip.dataset.category || 'all';
            if (activeCategory.toLowerCase() === 'flowchart') {
                activeDrawerPanel = 'flowchart';
                sidebarBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.panel === 'flowchart'));
            } else if (activeDrawerPanel === 'flowchart') {
                activeDrawerPanel = 'shapes';
                sidebarBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.panel === 'shapes'));
            }
            renderShapesList();
        });
    });

    // Flowchart Sub-Section Filter Pills Navigation
    fcSubPills.forEach(pill => {
        pill.addEventListener('click', () => {
            fcSubPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeFlowchartSection = pill.dataset.section || 'all';
            renderShapesList();
        });
    });

    if (btnCatPrev && shapesCategoriesEl) {
        btnCatPrev.addEventListener('click', () => {
            shapesCategoriesEl.scrollBy({ left: -140, behavior: 'smooth' });
        });
    }
    if (btnCatNext && shapesCategoriesEl) {
        btnCatNext.addEventListener('click', () => {
            shapesCategoriesEl.scrollBy({ left: 140, behavior: 'smooth' });
        });
    }
    if (shapesCategoriesEl) {
        shapesCategoriesEl.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                shapesCategoriesEl.scrollLeft += e.deltaY;
            }
        });
    }

    function generateUid() {
        return 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7);
    }

    function addShapeToCanvas(shapeDef, x, y) {
        const vpt = canvas.viewportTransform;
        const targetX = (x !== undefined) ? x : (-vpt[4] + canvas.getWidth() / 2) / canvas.getZoom();
        const targetY = (y !== undefined) ? y : (-vpt[5] + canvas.getHeight() / 2) / canvas.getZoom();

        const strokeWidth = parseInt(selectStrokeSize.value, 10) || 2;
        const fill = currentFillColor || 'transparent';
        const stroke = currentColor || '#334155';

        const shapeObj = shapeDef.create(fill, stroke, strokeWidth);
        if (shapeDef.strokeDashArray) {
            shapeObj.set('strokeDashArray', shapeDef.strokeDashArray);
        }
        const currentScale = shapeObj.scaleX || 1;
        shapeObj.scale(currentScale * 0.85);
        const shapeBoundsWidth = shapeObj.getScaledWidth ? shapeObj.getScaledWidth() : (shapeObj.width || 100);
        const textWidth = Math.max(60, shapeBoundsWidth * 0.75);

        const textObj = new fabric.Textbox('', {
            width: textWidth,
            fontSize: 15,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fill: currentColor || '#1e293b',
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            splitByGrapheme: true,
            cursorColor: '#1e293b'
        });

        const group = new fabric.Group([shapeObj, textObj], {
            left: targetX,
            top: targetY,
            originX: 'center',
            originY: 'center',
            isShapeGroup: true,
            shapeId: shapeDef.id,
            shapeUid: generateUid(),
            subTargetCheck: false
        });

        group.connectedLines = [];

        canvas.add(group);
        setMode('select');
        canvas.setActiveObject(group);
        canvas.renderAll();
        saveState();
    }

    // -------------------------------------------------------------------------
    // 6. Connector Lines & Arrows Following System
    // -------------------------------------------------------------------------
    function getObjectAnchors(obj) {
        const center = obj.getCenterPoint();
        const w = obj.getScaledWidth ? obj.getScaledWidth() : (obj.width || 100);
        const h = obj.getScaledHeight ? obj.getScaledHeight() : (obj.height || 100);
        return [
            { x: center.x, y: center.y - h / 2, side: 'top' },
            { x: center.x, y: center.y + h / 2, side: 'bottom' },
            { x: center.x - w / 2, y: center.y, side: 'left' },
            { x: center.x + w / 2, y: center.y, side: 'right' }
        ];
    }

    function getClosestAnchor(anchors, point) {
        let minDist = Infinity;
        let closest = anchors[0];
        for (const a of anchors) {
            const dist = (a.x - point.x) ** 2 + (a.y - point.y) ** 2;
            if (dist < minDist) {
                minDist = dist;
                closest = a;
            }
        }
        return closest;
    }

    function getBestAnchorPair(objA, objB) {
        const anchorsA = getObjectAnchors(objA);
        const anchorsB = getObjectAnchors(objB);
        let minDist = Infinity;
        let best = { p1: anchorsA[0], p2: anchorsB[0] };

        for (const a of anchorsA) {
            for (const b of anchorsB) {
                const dist = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    best = { p1: a, p2: b };
                }
            }
        }
        return best;
    }

    function findConnectableTarget(target) {
        if (!target) return null;
        if (target.isConnector || target.isArrowHead) return null;
        return target;
    }

    function getDashArrayForPattern(pattern) {
        if (pattern === 'dashed') return [8, 6];
        if (pattern === 'dotted') return [3, 4];
        return null;
    }

    function createArrowHeadTriangle(point, angleDeg, color, strokeWidth) {
        return new fabric.Triangle({
            left: point.x,
            top: point.y,
            originX: 'center',
            originY: 'center',
            width: Math.max(12, strokeWidth * 5),
            height: Math.max(12, strokeWidth * 5),
            fill: color,
            angle: angleDeg,
            selectable: false,
            evented: false,
            isArrowHead: true
        });
    }

    function applyArrowheadStyleToLine(line, style) {
        if (!line) return;
        line.arrowHeadStyle = style;
        line.hasArrow = (style !== 'none');

        if (line.arrowHead) {
            canvas.remove(line.arrowHead);
            line.arrowHead = null;
        }
        if (line.startArrowHead) {
            canvas.remove(line.startArrowHead);
            line.startArrowHead = null;
        }

        if (style === 'none') return;

        let p1, p2;
        if (line.fromShape && line.toShape) {
            const pair = getBestAnchorPair(line.fromShape, line.toShape);
            p1 = pair.p1;
            p2 = pair.p2;
        } else {
            const matrix = line.calcTransformMatrix();
            p1 = fabric.util.transformPoint({ x: line.x1, y: line.y1 }, matrix);
            p2 = fabric.util.transformPoint({ x: line.x2, y: line.y2 }, matrix);
        }

        const color = line.stroke || currentColor || '#1e293b';
        const strokeWidth = line.strokeWidth || 2;

        if (style === 'end' || style === 'both') {
            const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI) + 90;
            const arrowHead = createArrowHeadTriangle(p2, angle, color, strokeWidth);
            line.arrowHead = arrowHead;
            arrowHead.connectorLine = line;
            canvas.add(arrowHead);
        }

        if (style === 'start' || style === 'both') {
            const angle = (Math.atan2(p1.y - p2.y, p1.x - p2.x) * 180 / Math.PI) + 90;
            const startArrowHead = createArrowHeadTriangle(p1, angle, color, strokeWidth);
            line.startArrowHead = startArrowHead;
            startArrowHead.connectorLine = line;
            canvas.add(startArrowHead);
        }
    }

    function updateFreeLineArrows(line) {
        if (!line || !line.canvas) return;
        const matrix = line.calcTransformMatrix();
        const p1 = fabric.util.transformPoint({ x: line.x1, y: line.y1 }, matrix);
        const p2 = fabric.util.transformPoint({ x: line.x2, y: line.y2 }, matrix);

        if (line.arrowHead) {
            const angle = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI) + 90;
            line.arrowHead.set({
                left: p2.x,
                top: p2.y,
                angle: angle
            });
            line.arrowHead.setCoords();
        }
        if (line.startArrowHead) {
            const angle = (Math.atan2(p1.y - p2.y, p1.x - p2.x) * 180 / Math.PI) + 90;
            line.startArrowHead.set({
                left: p1.x,
                top: p1.y,
                angle: angle
            });
            line.startArrowHead.setCoords();
        }
    }

    function createFreeformLine(p1, p2, isArrow = false) {
        const strokeWidth = parseInt(selectStrokeSize.value, 10) || 2;
        const strokeColor = currentColor || '#1e293b';
        const dashArray = getDashArrayForPattern(currentLinePattern);
        const arrowStyle = isArrow ? (currentArrowHeadStyle === 'none' ? 'end' : currentArrowHeadStyle) : (currentArrowHeadStyle === 'none' ? 'none' : 'none');

        const line = new fabric.Line([p1.x, p1.y, p2.x, p2.y], {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            strokeDashArray: dashArray,
            selectable: true,
            isConnector: false,
            isFreeLine: true,
            hasArrow: (arrowStyle !== 'none'),
            arrowHeadStyle: arrowStyle,
            objectCaching: false
        });

        canvas.add(line);

        if (arrowStyle !== 'none') {
            applyArrowheadStyleToLine(line, arrowStyle);
        }

        canvas.setActiveObject(line);
        canvas.renderAll();
        saveState();
    }

    function createAttachedConnector(fromObj, toObj, hasArrow = true) {
        if (!fromObj || !toObj) return;

        fromObj.shapeUid = fromObj.shapeUid || generateUid();
        toObj.shapeUid = toObj.shapeUid || generateUid();

        const pair = getBestAnchorPair(fromObj, toObj);
        const strokeWidth = parseInt(selectStrokeSize.value, 10) || 2;
        const strokeColor = currentColor || '#1e293b';
        const dashArray = getDashArrayForPattern(currentLinePattern);
        const arrowStyle = hasArrow ? (currentArrowHeadStyle === 'none' ? 'end' : currentArrowHeadStyle) : 'none';

        const line = new fabric.Line([pair.p1.x, pair.p1.y, pair.p2.x, pair.p2.y], {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            strokeDashArray: dashArray,
            selectable: true,
            isConnector: true,
            hasArrow: (arrowStyle !== 'none'),
            arrowHeadStyle: arrowStyle,
            fromShapeUid: fromObj.shapeUid,
            toShapeUid: toObj.shapeUid,
            objectCaching: false
        });

        line.fromShape = fromObj;
        line.toShape = toObj;

        fromObj.connectedLines = fromObj.connectedLines || [];
        fromObj.connectedLines.push(line);
        toObj.connectedLines = toObj.connectedLines || [];
        toObj.connectedLines.push(line);

        canvas.add(line);
        canvas.sendToBack(line); // Line sits behind connected shapes

        if (arrowStyle !== 'none') {
            applyArrowheadStyleToLine(line, arrowStyle);
        }

        canvas.renderAll();
        saveState();
    }

    function updateConnector(line) {
        if (!line || !line.canvas) return;

        if (line.fromShape && line.toShape) {
            const pair = getBestAnchorPair(line.fromShape, line.toShape);
            line.set({
                x1: pair.p1.x,
                y1: pair.p1.y,
                x2: pair.p2.x,
                y2: pair.p2.y
            });
            line.setCoords();

            if (line.arrowHead) {
                const angle = (Math.atan2(pair.p2.y - pair.p1.y, pair.p2.x - pair.p1.x) * 180 / Math.PI) + 90;
                line.arrowHead.set({
                    left: pair.p2.x,
                    top: pair.p2.y,
                    angle: angle
                });
                line.arrowHead.setCoords();
            }
            if (line.startArrowHead) {
                const angle = (Math.atan2(pair.p1.y - pair.p2.y, pair.p1.x - pair.p2.x) * 180 / Math.PI) + 90;
                line.startArrowHead.set({
                    left: pair.p1.x,
                    top: pair.p1.y,
                    angle: angle
                });
                line.startArrowHead.setCoords();
            }
        }
    }

    function updateConnectedLinesFor(target) {
        if (!target) return;

        if (target.type === 'activeSelection') {
            target.forEachObject(child => updateConnectedLinesFor(child));
            return;
        }

        if (target.isFreeLine) {
            updateFreeLineArrows(target);
        }

        if (!target.connectedLines || target.connectedLines.length === 0) return;

        target.connectedLines.forEach(line => {
            updateConnector(line);
        });
        canvas.requestRenderAll();
    }

    canvas.on('object:moving', (e) => updateConnectedLinesFor(e.target));
    canvas.on('object:scaling', (e) => updateConnectedLinesFor(e.target));
    canvas.on('object:modified', (e) => updateConnectedLinesFor(e.target));

    // -------------------------------------------------------------------------
    // 7. Sidebar Dock & Drawer Controller
    // -------------------------------------------------------------------------
    let activeDrawerPanel = null;

    function openDrawerPanel(panelId) {
        if (!shapesPanel) return;

        if (!shapesPanel.classList.contains('hidden') && activeDrawerPanel === panelId) {
            closeDrawer();
            return;
        }

        shapesPanel.classList.remove('hidden');
        activeDrawerPanel = panelId;

        sidebarBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panelId);
        });

        if (btnToggleShapes) {
            btnToggleShapes.classList.toggle('active', panelId === 'shapes' || panelId === 'flowchart');
        }

        if (panelId === 'flowchart') {
            drawerPanels.forEach(panel => {
                panel.style.display = (panel.id === 'drawer-panel-shapes') ? 'flex' : 'none';
            });
            activeCategory = 'Flowchart';
            activeFlowchartSection = 'all';
            fcSubPills.forEach(p => p.classList.toggle('active', p.dataset.section === 'all'));
            categoryChips.forEach(chip => {
                const isFc = (chip.dataset.category && chip.dataset.category.toLowerCase() === 'flowchart');
                chip.classList.toggle('active', isFc);
                if (isFc && shapesCategoriesEl) {
                    chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            });
            if (shapesSearch) shapesSearch.value = '';
            if (btnClearSearch) btnClearSearch.style.display = 'none';
            renderShapesList();
            return;
        }

        drawerPanels.forEach(panel => {
            const matches = (panel.id === `drawer-panel-${panelId}`);
            panel.style.display = matches ? 'flex' : 'none';
        });

        if (panelId === 'shapes') {
            if (activeCategory === 'Flowchart') {
                activeCategory = 'all';
                categoryChips.forEach(chip => {
                    chip.classList.toggle('active', (chip.dataset.category || 'all').toLowerCase() === 'all');
                });
            }
            renderShapesList();
            if (shapesSearch) {
                setTimeout(() => shapesSearch.focus(), 50);
            }
        } else if (panelId === 'templates') {
            renderTemplatesList();
            if (templatesSearch) {
                setTimeout(() => templatesSearch.focus(), 50);
            }
        } else if (panelId === 'stickers') {
            loadStickers();
            if (stickersSearch) {
                setTimeout(() => stickersSearch.focus(), 50);
            }
        } else if (panelId === 'notes') {
            setMode('sticky');
        }
    }

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
    // 8. Sticky Note Factory Function
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
            shapeUid: generateUid(),
            subTargetCheck: false
        });

        group.connectedLines = [];

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

    // Drawer Sticky Note cards: click places a note at current viewport center
    const drawerNoteCards = document.querySelectorAll('.drawer-note-card');
    drawerNoteCards.forEach(card => {
        card.addEventListener('click', () => {
            const colorKey = card.dataset.color || 'yellow';
            const activeObj = canvas.getActiveObject();
            if (activeObj && activeObj.isStickyNote) {
                setStickyColor(colorKey, true);
                return;
            }

            setStickyColor(colorKey, false);

            const vpt = canvas.viewportTransform;
            const centerX = (-vpt[4] + canvas.getWidth() / 2) / canvas.getZoom();
            const centerY = (-vpt[5] + canvas.getHeight() / 2) / canvas.getZoom();

            const { group, text } = createStickyNote(centerX, centerY, colorKey, 'Type note...');
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
        });
    });

    const btnDrawerPlaceNote = document.getElementById('btn-drawer-place-note');
    if (btnDrawerPlaceNote) {
        btnDrawerPlaceNote.addEventListener('click', () => {
            setMode('sticky');
        });
    }

    // -------------------------------------------------------------------------
    // 8B. Flowchart Templates Gallery Controller
    // -------------------------------------------------------------------------
    async function loadTemplates() {
        try {
            const res = await fetch('/static/templates.json');
            if (res.ok) {
                allTemplates = await res.json();
                renderTemplatesList();
            }
        } catch (err) {
            console.error('Failed to load /static/templates.json:', err);
        }
    }

    function renderTemplatesList() {
        if (!templatesList) return;
        const query = (templatesSearch ? templatesSearch.value.trim().toLowerCase() : '');

        const filtered = allTemplates.filter(t => {
            return !query ||
                t.name.toLowerCase().includes(query) ||
                (t.category && t.category.toLowerCase().includes(query)) ||
                (t.description && t.description.toLowerCase().includes(query)) ||
                (t.badge && t.badge.toLowerCase().includes(query));
        });

        templatesList.innerHTML = '';

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'shapes-empty';
            emptyEl.textContent = 'No matching templates found';
            templatesList.appendChild(emptyEl);
            return;
        }

        filtered.forEach(tpl => {
            const card = document.createElement('div');
            card.className = 'template-card';
            const nodeCount = (tpl.nodes && tpl.nodes.length) ? tpl.nodes.length : 0;
            const connCount = (tpl.connections && tpl.connections.length) ? tpl.connections.length : 0;

            card.innerHTML = `
                <div class="template-card-header">
                    <span class="template-card-title">${tpl.name}</span>
                    <span class="template-card-badge">${tpl.badge || tpl.category}</span>
                </div>
                <div class="template-card-desc">${tpl.description}</div>
                <div class="template-card-footer">
                    <span class="template-node-count">${nodeCount} steps &bull; ${connCount} links</span>
                    <button type="button" class="template-btn-insert">Insert &rarr;</button>
                </div>
            `;

            card.addEventListener('click', () => {
                loadTemplateOntoCanvas(tpl);
            });

            templatesList.appendChild(card);
        });
    }

    if (templatesSearch) {
        templatesSearch.addEventListener('input', () => {
            if (btnClearTemplatesSearch) {
                btnClearTemplatesSearch.style.display = templatesSearch.value ? 'block' : 'none';
            }
            renderTemplatesList();
        });
    }

    if (btnClearTemplatesSearch) {
        btnClearTemplatesSearch.addEventListener('click', () => {
            templatesSearch.value = '';
            btnClearTemplatesSearch.style.display = 'none';
            templatesSearch.focus();
            renderTemplatesList();
        });
    }

    function loadTemplateOntoCanvas(templateDef) {
        if (!templateDef || !templateDef.nodes || templateDef.nodes.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        templateDef.nodes.forEach(n => {
            const nw = n.width || 120;
            const nh = n.height || 70;
            minX = Math.min(minX, n.x - nw / 2);
            maxX = Math.max(maxX, n.x + nw / 2);
            minY = Math.min(minY, n.y - nh / 2);
            maxY = Math.max(maxY, n.y + nh / 2);
        });

        const vpt = canvas.viewportTransform;
        const zoom = canvas.getZoom();
        const centerX = (-vpt[4] + canvas.getWidth() / 2) / zoom;
        const centerY = (-vpt[5] + canvas.getHeight() / 2) / zoom;
        const templateCenterOrigX = (minX + maxX) / 2;
        const templateCenterOrigY = (minY + maxY) / 2;
        const dx = centerX - templateCenterOrigX;
        const dy = centerY - templateCenterOrigY;

        const nodeMap = {};

        templateDef.nodes.forEach(node => {
            const posX = node.x + dx;
            const posY = node.y + dy;
            const nodeWidth = node.width || 120;
            const nodeHeight = node.height || 70;

            const shapeDef = allShapes.find(s => s.id === node.shapeId) || allShapes.find(s => s.id === 'fc-basic-process');
            let shapeObj;
            if (shapeDef && shapeDef.path) {
                shapeObj = new fabric.Path(shapeDef.path, {
                    fill: node.fill || '#eff6ff',
                    stroke: node.stroke || '#3b82f6',
                    strokeWidth: 2,
                    originX: 'center',
                    originY: 'center'
                });
                if (shapeObj.width) {
                    const scaleX = nodeWidth / shapeObj.width;
                    const scaleY = nodeHeight / (shapeObj.height || 100);
                    shapeObj.scaleX = scaleX;
                    shapeObj.scaleY = scaleY;
                }
            } else {
                shapeObj = new fabric.Rect({
                    width: nodeWidth,
                    height: nodeHeight,
                    rx: 8,
                    ry: 8,
                    fill: node.fill || '#eff6ff',
                    stroke: node.stroke || '#3b82f6',
                    strokeWidth: 2,
                    originX: 'center',
                    originY: 'center'
                });
            }

            const textObj = new fabric.Textbox(node.text || '', {
                width: Math.max(60, nodeWidth - 20),
                fontSize: 13,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fill: '#1e293b',
                fontWeight: 600,
                textAlign: 'center',
                originX: 'center',
                originY: 'center',
                splitByGrapheme: true,
                cursorColor: '#1e293b'
            });

            const group = new fabric.Group([shapeObj, textObj], {
                left: posX,
                top: posY,
                originX: 'center',
                originY: 'center',
                isShapeGroup: true,
                shapeId: node.shapeId,
                shapeUid: generateUid(),
                subTargetCheck: false
            });

            group.connectedLines = [];
            nodeMap[node.id] = group;
            canvas.add(group);
        });

        if (Array.isArray(templateDef.connections)) {
            templateDef.connections.forEach(conn => {
                const fromNode = nodeMap[conn.from];
                const toNode = nodeMap[conn.to];
                if (!fromNode || !toNode) return;

                const anchorPair = getBestAnchorPair(fromNode, toNode);
                const line = new fabric.Line([anchorPair.from.x, anchorPair.from.y, anchorPair.to.x, anchorPair.to.y], {
                    stroke: '#475569',
                    strokeWidth: 2,
                    selectable: true,
                    isConnector: true,
                    hasArrow: true,
                    arrowHeadStyle: 'end',
                    fromShapeUid: fromNode.shapeUid,
                    toShapeUid: toNode.shapeUid,
                    fromShape: fromNode,
                    toShape: toNode,
                    objectCaching: false
                });

                const angle = Math.atan2(anchorPair.to.y - anchorPair.from.y, anchorPair.to.x - anchorPair.from.x) * (180 / Math.PI);
                const arrowHead = new fabric.Triangle({
                    left: anchorPair.to.x,
                    top: anchorPair.to.y,
                    originX: 'center',
                    originY: 'center',
                    pointType: 'arrow_end',
                    angle: angle + 90,
                    width: 12,
                    height: 12,
                    fill: '#475569',
                    selectable: false,
                    evented: false,
                    isArrowHead: true
                });

                line.arrowHead = arrowHead;
                fromNode.connectedLines.push(line);
                toNode.connectedLines.push(line);

                canvas.add(line);
                canvas.add(arrowHead);
            });
        }

        setMode('select');
        canvas.renderAll();
        saveState();
        showToast(`Template "${templateDef.name}" inserted!`);
    }

    // -------------------------------------------------------------------------
    // 8C. Stickers Gallery & Local Storage Controller (Phase 6)
    // -------------------------------------------------------------------------
    async function loadStickers() {
        try {
            const res = await fetch('/api/stickers');
            if (res.ok) {
                allStickers = await res.json();
                if (stickersCountBadge) {
                    stickersCountBadge.textContent = `${allStickers.length} Sticker${allStickers.length === 1 ? '' : 's'}`;
                }
                renderStickersGallery();
            }
        } catch (err) {
            console.error('Failed to load /api/stickers:', err);
        }
    }

    function renderStickersGallery() {
        if (!stickersGallery) return;
        const query = (stickersSearch ? stickersSearch.value.trim().toLowerCase() : '');

        const filtered = allStickers.filter(s => {
            return !query || s.name.toLowerCase().includes(query) || s.ext.toLowerCase().includes(query);
        });

        stickersGallery.innerHTML = '';

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'shapes-empty';
            emptyEl.style.gridColumn = 'span 3';
            emptyEl.textContent = query ? 'No matching stickers found' : 'No stickers yet. Upload PNG, SVG or GIF files above!';
            stickersGallery.appendChild(emptyEl);
            return;
        }

        filtered.forEach(sticker => {
            const card = document.createElement('div');
            card.className = 'sticker-card';
            card.draggable = true;
            card.title = `Click or drag "${sticker.name}" onto canvas`;

            card.innerHTML = `
                <span class="sticker-format-badge">.${sticker.ext}</span>
                <button type="button" class="btn-delete-sticker" data-filename="${sticker.filename}" title="Delete sticker">&times;</button>
                <div class="sticker-thumbnail-wrapper">
                    <img class="sticker-thumbnail" src="${sticker.url}" alt="${sticker.name}" loading="lazy">
                </div>
                <span class="sticker-name">${sticker.name}</span>
            `;

            // Drag from gallery
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', sticker.url);
                e.dataTransfer.setData('application/json', JSON.stringify(sticker));
                e.dataTransfer.effectAllowed = 'copy';
            });

            // Click to add to viewport center
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete-sticker')) return;
                const vpt = canvas.viewportTransform;
                const zoom = canvas.getZoom();
                const centerX = (-vpt[4] + canvas.getWidth() / 2) / zoom;
                const centerY = (-vpt[5] + canvas.getHeight() / 2) / zoom;
                addStickerToCanvas(sticker.url, centerX, centerY);
            });

            // Delete sticker
            const btnDel = card.querySelector('.btn-delete-sticker');
            if (btnDel) {
                btnDel.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete sticker "${sticker.name}" from library?`)) return;
                    try {
                        const res = await fetch(`/api/stickers/${encodeURIComponent(sticker.filename)}`, {
                            method: 'DELETE'
                        });
                        if (res.ok) {
                            showToast(`Sticker "${sticker.name}" deleted`);
                            loadStickers();
                        } else {
                            showToast('Failed to delete sticker');
                        }
                    } catch (err) {
                        console.error('Delete error:', err);
                        showToast('Error deleting sticker');
                    }
                });
            }

            stickersGallery.appendChild(card);
        });
    }

    function addStickerToCanvas(url, x, y) {
        fabric.Image.fromURL(url, (img) => {
            if (!img) {
                showToast('Failed to load sticker image');
                return;
            }

            const maxSize = 130;
            const imgWidth = img.width || 100;
            const imgHeight = img.height || 100;
            const scale = Math.min(maxSize / imgWidth, maxSize / imgHeight, 1);

            img.set({
                left: x,
                top: y,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                cornerColor: '#2563eb',
                cornerSize: 10,
                transparentCorners: false,
                hasRotatingPoint: true,
                hasControls: true,
                selectable: true,
                isSticker: true,
                stickerUrl: url,
                shapeUid: generateUid()
            });

            img.connectedLines = [];
            canvas.add(img);
            setMode('select');
            canvas.setActiveObject(img);
            canvas.renderAll();
            saveState();
            showToast('Sticker added to canvas');
        }, { crossOrigin: 'anonymous' });
    }

    // Canvas Drop Handler for Stickers
    if (canvasContainer) {
        canvasContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        canvasContainer.addEventListener('drop', (e) => {
            const stickerUrl = e.dataTransfer.getData('text/plain');
            if (!stickerUrl) return;

            e.preventDefault();
            const rect = canvas.upperCanvasEl.getBoundingClientRect();
            const clientX = e.clientX - rect.left;
            const clientY = e.clientY - rect.top;
            const vpt = canvas.viewportTransform;
            const zoom = canvas.getZoom();
            const targetX = (clientX - vpt[4]) / zoom;
            const targetY = (clientY - vpt[5]) / zoom;

            addStickerToCanvas(stickerUrl, targetX, targetY);
        });
    }

    // Stickers Upload Handlers
    async function uploadStickerFiles(fileList) {
        if (!fileList || fileList.length === 0) return;
        const validExtensions = ['.png', '.svg', '.gif'];
        const validFiles = Array.from(fileList).filter(f => {
            const ext = '.' + f.name.split('.').pop().toLowerCase();
            return validExtensions.includes(ext);
        });

        if (validFiles.length === 0) {
            showToast('Please select valid PNG, SVG, or GIF images');
            return;
        }

        const formData = new FormData();
        validFiles.forEach(file => {
            formData.append('files', file);
        });

        showToast(`Uploading ${validFiles.length} sticker${validFiles.length === 1 ? '' : 's'}...`);

        try {
            const res = await fetch('/api/stickers', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const uploaded = await res.json();
                showToast(`Successfully uploaded ${uploaded.length} sticker${uploaded.length === 1 ? '' : 's'}!`);
                loadStickers();
            } else {
                const err = await res.json();
                showToast(`Upload failed: ${err.detail || 'Server error'}`);
            }
        } catch (err) {
            console.error('Upload error:', err);
            showToast('Failed to upload stickers');
        }
    }

    if (stickersFileInput) {
        stickersFileInput.addEventListener('change', () => {
            uploadStickerFiles(stickersFileInput.files);
            stickersFileInput.value = '';
        });
    }

    if (btnBrowseStickers) {
        btnBrowseStickers.addEventListener('click', (e) => {
            e.stopPropagation();
            if (stickersFileInput) stickersFileInput.click();
        });
    }

    if (stickersUploadBox) {
        stickersUploadBox.addEventListener('click', () => {
            if (stickersFileInput) stickersFileInput.click();
        });

        stickersUploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            stickersUploadBox.classList.add('drag-over');
        });

        stickersUploadBox.addEventListener('dragleave', () => {
            stickersUploadBox.classList.remove('drag-over');
        });

        stickersUploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            stickersUploadBox.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                uploadStickerFiles(e.dataTransfer.files);
            }
        });
    }

    if (stickersSearch) {
        stickersSearch.addEventListener('input', () => {
            if (btnClearStickersSearch) {
                btnClearStickersSearch.style.display = stickersSearch.value ? 'block' : 'none';
            }
            renderStickersGallery();
        });
    }

    if (btnClearStickersSearch) {
        btnClearStickersSearch.addEventListener('click', () => {
            stickersSearch.value = '';
            btnClearStickersSearch.style.display = 'none';
            stickersSearch.focus();
            renderStickersGallery();
        });
    }

    // -------------------------------------------------------------------------
    // 9. Grid Background Synchronization
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
    // 10. Zoom Controls & Indicator
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
    // 11. Mode Management
    // -------------------------------------------------------------------------
    const toolButtons = {
        select: btnSelect,
        pan: btnPan,
        pen: btnPen,
        highlighter: btnHighlighter,
        eraser: btnEraser,
        text: btnText,
        sticky: btnSticky,
        line: btnLine,
        arrow: btnArrow
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
                if (obj.globalCompositeOperation !== 'destination-out' && !obj.isArrowHead) {
                    obj.selectable = true;
                    obj.evented = true;
                }
            });
            updateSelectionUI();
        } else if (mode === 'pan') {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.discardActiveObject();
            canvas.defaultCursor = 'grab';
            canvas.forEachObject(obj => obj.selectable = false);
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'none';
            canvas.renderAll();
        } else if (mode === 'pen') {
            canvas.discardActiveObject();
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
            canvas.forEachObject(obj => {
                obj.selectable = false;
                obj.evented = false;
            });
            updateBrushSettings();
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'none';
            canvas.renderAll();
        } else if (mode === 'highlighter') {
            canvas.discardActiveObject();
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
            canvas.forEachObject(obj => {
                obj.selectable = false;
                obj.evented = false;
            });
            updateBrushSettings();
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'none';
            canvas.renderAll();
        } else if (mode === 'eraser') {
            canvas.discardActiveObject();
            canvas.selection = false;
            canvas.defaultCursor = 'crosshair';
            canvas.forEachObject(obj => {
                obj.selectable = false;
                obj.evented = false;
                obj.objectCaching = false;
            });
            updateBrushSettings();
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'none';
            canvas.renderAll();
        } else if (mode === 'text') {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.discardActiveObject();
            canvas.defaultCursor = 'text';
            canvas.forEachObject(obj => {
                obj.selectable = (obj.type === 'i-text');
                obj.evented = true;
            });
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'inline-flex';
            canvas.renderAll();
        } else if (mode === 'sticky') {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.discardActiveObject();
            canvas.defaultCursor = 'copy';
            canvas.forEachObject(obj => obj.selectable = false);
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'none';
            canvas.renderAll();
        } else if (mode === 'line' || mode === 'arrow') {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.discardActiveObject();
            canvas.defaultCursor = 'crosshair';
            canvas.forEachObject(obj => {
                // Keep shapes evented so connector anchors can be targeted
                if (obj.isShapeGroup) {
                    obj.selectable = false;
                    obj.evented = true;
                } else {
                    obj.selectable = false;
                }
            });
            if (propLineGroup) propLineGroup.style.display = 'inline-flex';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'none';
            if (selectArrowHead) {
                selectArrowHead.value = (mode === 'arrow' ? (currentArrowHeadStyle === 'none' ? 'end' : currentArrowHeadStyle) : 'none');
                currentArrowHeadStyle = selectArrowHead.value;
            }
            canvas.renderAll();
        }
    }

    btnSelect.addEventListener('click', () => setMode('select'));
    btnPan.addEventListener('click', () => setMode('pan'));
    btnPen.addEventListener('click', () => setMode('pen'));
    btnHighlighter.addEventListener('click', () => setMode('highlighter'));
    btnEraser.addEventListener('click', () => setMode('eraser'));
    btnText.addEventListener('click', () => setMode('text'));
    if (btnSticky && btnSticky !== btnSidebarNotes) btnSticky.addEventListener('click', () => setMode('sticky'));
    if (btnLine) btnLine.addEventListener('click', () => setMode('line'));
    if (btnArrow) btnArrow.addEventListener('click', () => setMode('arrow'));

    // -------------------------------------------------------------------------
    // 12. Freehand Brush & Eraser Finalization (path:created)
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
            saveState();
        } else if (currentMode === 'highlighter') {
            path.set({
                stroke: hexToRgba(currentColor, 0.35),
                selectable: currentMode === 'select'
            });
            canvas.renderAll();
            saveState();
        } else if (currentMode === 'pen') {
            path.set({
                selectable: currentMode === 'select'
            });
            saveState();
        }
    });

    // -------------------------------------------------------------------------
    // 13. Mouse Down, Move, Up (Pan, Connectors, Shapes, Text)
    // -------------------------------------------------------------------------
    canvas.on('mouse:down', (opt) => {
        const evt = opt.e;
        const isRightClick = (opt.button === 3 || (evt && evt.button === 2));

        // Right-Click Context Menu handling
        if (isRightClick) {
            if (evt) {
                evt.preventDefault();
                evt.stopPropagation();
            }

            // If user clicked on a target that isn't selected, select it
            if (opt.target) {
                const currentActive = canvas.getActiveObject();
                if (!currentActive || !canvas.getActiveObjects().includes(opt.target)) {
                    canvas.setActiveObject(opt.target);
                    canvas.requestRenderAll();
                }
            }

            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                showContextMenu(evt ? evt.clientX : 100, evt ? evt.clientY : 100);
            } else {
                hideContextMenu();
            }
            return;
        }

        // Hide context menu on normal clicks
        hideContextMenu();

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

        // Alt + Drag: Duplicate while dragging (Select mode)
        if (evt.altKey && opt.target && currentMode === 'select' && !opt.target.isConnector && !opt.target.isArrowHead) {
            opt.target.clone((cloned) => {
                if (cloned.shapeUid) cloned.shapeUid = generateUid();
                cloned.connectedLines = [];
                canvas.add(cloned);
                canvas.setActiveObject(cloned);
                canvas.requestRenderAll();
                saveState();
                showToast('Duplicated with Alt+Drag');
            }, EXTRA_PROPS);
        }

        // Connector Line / Arrow: start connecting
        if ((currentMode === 'line' || currentMode === 'arrow') && !shouldPan) {
            isConnecting = true;
            connectorModeType = currentMode;
            const pointer = canvas.getPointer(opt.e);
            connectorStartObj = findConnectableTarget(opt.target || canvas.findTarget(opt.e));

            if (connectorStartObj) {
                const anchors = getObjectAnchors(connectorStartObj);
                connectorStartPoint = getClosestAnchor(anchors, pointer);
            } else {
                connectorStartPoint = pointer;
            }

            connectorPreviewLine = new fabric.Line([connectorStartPoint.x, connectorStartPoint.y, pointer.x, pointer.y], {
                stroke: currentColor || '#1e293b',
                strokeWidth: parseInt(selectStrokeSize.value, 10) || 2,
                strokeDashArray: getDashArrayForPattern(currentLinePattern) || [4, 4],
                selectable: false,
                evented: false
            });
            canvas.add(connectorPreviewLine);
            return;
        }

        // Sticky Note Tool: click places note
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

        // Text Tool: click places text
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

    // Shift + Drag: Maintain proportions during resizing
    canvas.on('before:transform', (opt) => {
        if (opt.e && opt.e.shiftKey && opt.transform) {
            opt.transform.uniform = true;
        }
    });

    // Mouse Move: Pan execution & Connector preview
    canvas.on('mouse:move', (opt) => {
        if (isPanning) {
            const evt = opt.e;
            const deltaX = evt.clientX - lastPosX;
            const deltaY = evt.clientY - lastPosY;

            canvas.relativePan(new fabric.Point(deltaX, deltaY));
            lastPosX = evt.clientX;
            lastPosY = evt.clientY;

            updateGrid();
            return;
        }

        if (isConnecting && connectorPreviewLine) {
            const pointer = canvas.getPointer(opt.e);
            connectorPreviewLine.set({ x2: pointer.x, y2: pointer.y });
            connectorPreviewLine.setCoords();
            canvas.requestRenderAll();
        }
    });

    // Mouse Up: Stop panning or finalize connector
    function handleMouseUp(opt) {
        if (isPanning) {
            isPanning = false;
            updateCursorForMode();
        }

        if (isConnecting) {
            isConnecting = false;
            if (connectorPreviewLine) {
                canvas.remove(connectorPreviewLine);
                connectorPreviewLine = null;
            }

            const pointer = canvas.getPointer(opt.e);
            const endObj = findConnectableTarget(opt.target || canvas.findTarget(opt.e));

            if (connectorStartObj && endObj && connectorStartObj !== endObj) {
                createAttachedConnector(connectorStartObj, endObj, connectorModeType === 'arrow');
            } else if (connectorStartPoint) {
                const dist = Math.hypot(pointer.x - connectorStartPoint.x, pointer.y - connectorStartPoint.y);
                if (dist > 10) {
                    createFreeformLine(connectorStartPoint, pointer, connectorModeType === 'arrow');
                }
            }

            connectorStartObj = null;
            connectorStartPoint = null;
            setMode('select');
        }
    }

    function updateCursorForMode() {
        if (currentMode === 'pan' || isSpacePressed) {
            canvas.defaultCursor = 'grab';
        } else if (currentMode === 'pen' || currentMode === 'highlighter' || currentMode === 'eraser' || currentMode === 'line' || currentMode === 'arrow') {
            canvas.defaultCursor = 'crosshair';
        } else if (currentMode === 'text') {
            canvas.defaultCursor = 'text';
        } else if (currentMode === 'sticky') {
            canvas.defaultCursor = 'copy';
        } else {
            canvas.defaultCursor = 'default';
        }
    }

    canvas.on('mouse:up', handleMouseUp);
    window.addEventListener('mouseup', (e) => {
        if (isPanning) {
            isPanning = false;
            updateCursorForMode();
        }
        if (isConnecting) {
            isConnecting = false;
            if (connectorPreviewLine) {
                canvas.remove(connectorPreviewLine);
                connectorPreviewLine = null;
            }
            setMode('select');
        }
    });

    // -------------------------------------------------------------------------
    // 14. Selection, Move, Resize & Delete Controls
    // -------------------------------------------------------------------------
    function updateSelectionUI() {
        const activeObjs = canvas.getActiveObjects();
        btnDelete.disabled = (!activeObjs || activeObjs.length === 0);

        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            const isLineOrConnector = (activeObj.isConnector || activeObj.isFreeLine || activeObj.type === 'line');
            if (isLineOrConnector) {
                if (propLineGroup) propLineGroup.style.display = 'inline-flex';
                if (propFillGroup) propFillGroup.style.display = 'none';
                if (propTextGroup) propTextGroup.style.display = 'none';

                if (activeObj.stroke && typeof activeObj.stroke === 'string' && activeObj.stroke.startsWith('#')) {
                    currentColor = activeObj.stroke;
                    if (colorPicker) colorPicker.value = currentColor;
                    if (colorPreview) colorPreview.style.backgroundColor = currentColor;
                }
                if (activeObj.strokeWidth) {
                    selectStrokeSize.value = String(activeObj.strokeWidth);
                }
                if (selectLinePattern) {
                    const dash = activeObj.strokeDashArray;
                    if (!dash || dash.length === 0) {
                        selectLinePattern.value = 'solid';
                    } else if (dash[0] <= 4) {
                        selectLinePattern.value = 'dotted';
                    } else {
                        selectLinePattern.value = 'dashed';
                    }
                    currentLinePattern = selectLinePattern.value;
                }
                if (selectArrowHead) {
                    selectArrowHead.value = activeObj.arrowHeadStyle || (activeObj.hasArrow ? 'end' : 'none');
                    currentArrowHeadStyle = selectArrowHead.value;
                }
                return;
            } else {
                if (propLineGroup) propLineGroup.style.display = 'none';
            }

            if (activeObj.isStickyNote && activeObj.stickyColor) {
                setStickyColor(activeObj.stickyColor, false);
            }

            if (activeObj.isShapeGroup) {
                if (propFillGroup) propFillGroup.style.display = 'inline-flex';
                const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
                if (shape) {
                    updateFillUI(shape.fill);
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
                    if (propTextGroup) propTextGroup.style.display = 'inline-flex';
                    selectFontSize.value = String(textObj.fontSize || 16);
                    isBold = (textObj.fontWeight === 'bold');
                    btnBold.classList.toggle('active', isBold);
                    isItalic = (textObj.fontStyle === 'italic');
                    btnItalic.classList.toggle('active', isItalic);
                }
            }

            if (activeObj.type === 'i-text') {
                if (propFillGroup) propFillGroup.style.display = 'none';
                if (propTextGroup) propTextGroup.style.display = 'inline-flex';
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
        if (currentMode !== 'line' && currentMode !== 'arrow') {
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'inline-flex';
        }
    });

    function deleteSingleObject(obj) {
        if (!obj) return;
        if (obj.connectedLines) {
            obj.connectedLines.forEach(line => {
                if (line.arrowHead) canvas.remove(line.arrowHead);
                if (line.startArrowHead) canvas.remove(line.startArrowHead);
                canvas.remove(line);
            });
            obj.connectedLines = [];
        }
        if (obj.arrowHead) {
            canvas.remove(obj.arrowHead);
        }
        if (obj.startArrowHead) {
            canvas.remove(obj.startArrowHead);
        }
        canvas.remove(obj);
    }

    function deleteSelectedObjects() {
        const activeObjs = canvas.getActiveObjects();
        if (!activeObjs || activeObjs.length === 0) return;

        canvas.discardActiveObject();
        activeObjs.forEach(obj => {
            deleteSingleObject(obj);
        });
        canvas.requestRenderAll();
        saveState();
    }

    btnDelete.addEventListener('click', deleteSelectedObjects);

    // -------------------------------------------------------------------------
    // 15. Property Handlers (Fill, Border, Stroke Size, Font Size, Bold, Italic)
    // -------------------------------------------------------------------------
    function updateFillUI(fillVal) {
        if (!fillVal || fillVal === 'transparent' || fillVal === 'none' || fillVal === 'rgba(0,0,0,0)') {
            currentFillColor = 'transparent';
            if (btnFillNone) btnFillNone.classList.add('active');
            if (fillColorPreview) {
                fillColorPreview.classList.add('is-transparent');
                fillColorPreview.style.background = 'transparent';
            }
        } else {
            currentFillColor = fillVal;
            if (btnFillNone) btnFillNone.classList.remove('active');
            if (fillColorPreview) {
                fillColorPreview.classList.remove('is-transparent');
                fillColorPreview.style.backgroundColor = fillVal;
            }
            if (fillColorPicker && typeof fillVal === 'string' && fillVal.startsWith('#')) {
                fillColorPicker.value = fillVal;
            }
        }
    }

    if (btnFillNone) {
        btnFillNone.addEventListener('click', () => {
            updateFillUI('transparent');
            const activeObj = canvas.getActiveObject();
            if (activeObj && activeObj.isShapeGroup) {
                const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
                if (shape) {
                    shape.set('fill', 'transparent');
                    canvas.renderAll();
                    saveState();
                }
            }
        });
    }

    if (fillColorPicker) {
        fillColorPicker.addEventListener('input', (e) => {
            updateFillUI(e.target.value);

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
            } else if (activeObj && (activeObj.isConnector || activeObj.isFreeLine || activeObj.type === 'line')) {
                activeObj.set('stroke', currentColor);
                if (activeObj.arrowHead) {
                    activeObj.arrowHead.set('fill', currentColor);
                }
                if (activeObj.startArrowHead) {
                    activeObj.startArrowHead.set('fill', currentColor);
                }
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
        } else if (activeObj && (activeObj.isConnector || activeObj.isFreeLine || activeObj.type === 'line')) {
            activeObj.set('strokeWidth', strokeWidth);
            if (activeObj.arrowHead) {
                activeObj.arrowHead.set({
                    width: Math.max(12, strokeWidth * 5),
                    height: Math.max(12, strokeWidth * 5)
                });
            }
            if (activeObj.startArrowHead) {
                activeObj.startArrowHead.set({
                    width: Math.max(12, strokeWidth * 5),
                    height: Math.max(12, strokeWidth * 5)
                });
            }
            canvas.renderAll();
            saveState();
        }

        if (canvas.isDrawingMode) {
            updateBrushSettings();
        }
    });

    if (selectLinePattern) {
        selectLinePattern.addEventListener('change', () => {
            currentLinePattern = selectLinePattern.value;
            const dashArray = getDashArrayForPattern(currentLinePattern);
            const activeObj = canvas.getActiveObject();
            if (activeObj && (activeObj.isConnector || activeObj.isFreeLine || activeObj.type === 'line')) {
                activeObj.set('strokeDashArray', dashArray);
                canvas.renderAll();
                saveState();
            }
        });
    }

    if (selectArrowHead) {
        selectArrowHead.addEventListener('change', () => {
            currentArrowHeadStyle = selectArrowHead.value;
            const activeObj = canvas.getActiveObject();
            if (activeObj && (activeObj.isConnector || activeObj.isFreeLine || activeObj.type === 'line')) {
                applyArrowheadStyleToLine(activeObj, currentArrowHeadStyle);
                canvas.renderAll();
                saveState();
            }
        });
    }

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
    // 16. Keyboard Shortcuts, Actions & Modal Controller
    // -------------------------------------------------------------------------
    const toastEl = document.getElementById('toast');
    let toastTimeout = null;

    function showToast(message) {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.remove('hidden');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastEl.classList.add('hidden');
        }, 2200);
    }

    const shortcutsModal = document.getElementById('shortcuts-modal');
    const btnShortcutsToggle = document.getElementById('btn-shortcuts-toggle');
    const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');

    function openShortcutsModal() {
        if (!shortcutsModal) return;
        shortcutsModal.classList.remove('hidden');
        shortcutsModal.setAttribute('aria-hidden', 'false');
    }

    function closeShortcutsModal() {
        if (!shortcutsModal) return;
        shortcutsModal.classList.add('hidden');
        shortcutsModal.setAttribute('aria-hidden', 'true');
    }

    function toggleShortcutsModal() {
        if (!shortcutsModal) return;
        if (shortcutsModal.classList.contains('hidden')) {
            openShortcutsModal();
        } else {
            closeShortcutsModal();
        }
    }

    if (btnShortcutsToggle) btnShortcutsToggle.addEventListener('click', toggleShortcutsModal);
    if (btnCloseShortcuts) btnCloseShortcuts.addEventListener('click', closeShortcutsModal);
    if (shortcutsModal) {
        shortcutsModal.addEventListener('click', (e) => {
            if (e.target === shortcutsModal) closeShortcutsModal();
        });
    }

    let _clipboard = null;

    function copySelected() {
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;
        activeObj.clone((cloned) => {
            _clipboard = cloned;
            showToast('Copied to clipboard (Ctrl + C)');
        }, EXTRA_PROPS);
    }

    function pasteClipboard() {
        if (!_clipboard) return;
        _clipboard.clone((clonedObj) => {
            canvas.discardActiveObject();
            clonedObj.set({
                left: clonedObj.left + 24,
                top: clonedObj.top + 24,
                evented: true,
            });

            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = canvas;
                clonedObj.forEachObject((obj) => {
                    if (obj.shapeUid) obj.shapeUid = generateUid();
                    obj.connectedLines = [];
                    canvas.add(obj);
                });
                clonedObj.setCoords();
            } else {
                if (clonedObj.shapeUid) clonedObj.shapeUid = generateUid();
                clonedObj.connectedLines = [];
                canvas.add(clonedObj);
            }

            _clipboard.top += 24;
            _clipboard.left += 24;
            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            saveState();
            showToast('Pasted object (Ctrl + V)');
        }, EXTRA_PROPS);
    }

    function cutSelected() {
        copySelected();
        deleteSelectedObjects();
        showToast('Cut selected object (Ctrl + X)');
    }

    function duplicateSelected() {
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return;
        activeObj.clone((clonedObj) => {
            canvas.discardActiveObject();
            clonedObj.set({
                left: clonedObj.left + 24,
                top: clonedObj.top + 24,
                evented: true,
            });

            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = canvas;
                clonedObj.forEachObject((obj) => {
                    if (obj.shapeUid) obj.shapeUid = generateUid();
                    obj.connectedLines = [];
                    canvas.add(obj);
                });
                clonedObj.setCoords();
            } else {
                if (clonedObj.shapeUid) clonedObj.shapeUid = generateUid();
                clonedObj.connectedLines = [];
                canvas.add(clonedObj);
            }

            canvas.setActiveObject(clonedObj);
            canvas.requestRenderAll();
            saveState();
            showToast('Duplicated object (Ctrl + D)');
        }, EXTRA_PROPS);
    }

    function selectAllObjects() {
        canvas.discardActiveObject();
        const selectableObjs = canvas.getObjects().filter(o => 
            o.selectable !== false && 
            o.globalCompositeOperation !== 'destination-out' && 
            !o.isArrowHead
        );
        if (selectableObjs.length === 0) return;
        const sel = new fabric.ActiveSelection(selectableObjs, { canvas: canvas });
        canvas.setActiveObject(sel);
        canvas.requestRenderAll();
        showToast(`Selected all (${selectableObjs.length} objects)`);
    }

    function saveBoard() {
        if (typeof saveCurrentBoardData === 'function') {
            saveCurrentBoardData();
        } else {
            const json = JSON.stringify(canvas.toJSON(EXTRA_PROPS));
            localStorage.setItem('whiteboard_saved_board', json);
        }
        showToast('Board saved (Ctrl + S)');
    }

    function saveBoardAs() {
        const json = JSON.stringify(canvas.toJSON(EXTRA_PROPS), null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Board exported as JSON (Ctrl + Shift + S)');
    }

    function fitEntireCanvas() {
        const objs = canvas.getObjects().filter(o => !o.isArrowHead && o.globalCompositeOperation !== 'destination-out');
        if (objs.length === 0) {
            resetView();
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        objs.forEach(o => {
            const b = o.getBoundingRect(true);
            minX = Math.min(minX, b.left);
            minY = Math.min(minY, b.top);
            maxX = Math.max(maxX, b.left + b.width);
            maxY = Math.max(maxY, b.top + b.height);
        });
        const width = Math.max(20, maxX - minX);
        const height = Math.max(20, maxY - minY);
        const padding = 80;
        const zoomX = (canvas.getWidth() - padding * 2) / width;
        const zoomY = (canvas.getHeight() - padding * 2) / height;
        const newZoom = Math.max(0.1, Math.min(3.0, Math.min(zoomX, zoomY)));
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        canvas.setZoom(newZoom);
        canvas.viewportTransform[4] = canvas.getWidth() / 2 - centerX * newZoom;
        canvas.viewportTransform[5] = canvas.getHeight() / 2 - centerY * newZoom;
        canvas.requestRenderAll();
        updateGrid();
        updateZoomDisplay();
        showToast('Fit entire canvas (Shift + 1)');
    }

    function zoomToSelection() {
        const activeObj = canvas.getActiveObject();
        if (!activeObj) {
            showToast('Select an object first (Shift + 2)');
            return;
        }
        const b = activeObj.getBoundingRect(true);
        const padding = 80;
        const zoomX = (canvas.getWidth() - padding * 2) / Math.max(20, b.width);
        const zoomY = (canvas.getHeight() - padding * 2) / Math.max(20, b.height);
        const newZoom = Math.max(0.1, Math.min(4.0, Math.min(zoomX, zoomY)));
        const center = activeObj.getCenterPoint();
        canvas.setZoom(newZoom);
        canvas.viewportTransform[4] = canvas.getWidth() / 2 - center.x * newZoom;
        canvas.viewportTransform[5] = canvas.getHeight() / 2 - center.y * newZoom;
        canvas.requestRenderAll();
        updateGrid();
        updateZoomDisplay();
        showToast('Zoomed to selection (Shift + 2)');
    }

    function goToOrigin() {
        canvas.viewportTransform[4] = 0;
        canvas.viewportTransform[5] = 0;
        canvas.requestRenderAll();
        updateGrid();
        updateZoomDisplay();
        showToast('Canvas origin (Home)');
    }

    function addBuiltinShape(shapeId) {
        const shapeDef = allShapes.find(s => s.id === shapeId);
        if (shapeDef) {
            addShapeToCanvas(shapeDef);
            showToast(`Added ${shapeDef.name} (${shapeId === 'rectangle' ? 'R' : 'O'})`);
        }
    }

    function getActiveTextTarget() {
        const activeObj = canvas.getActiveObject();
        if (!activeObj) return null;
        if (activeObj.type === 'i-text' || activeObj.type === 'textbox') return activeObj;
        if (activeObj.isShapeGroup || activeObj.isStickyNote) {
            return activeObj.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text') || null;
        }
        return null;
    }

    function formatActiveText(action) {
        const t = getActiveTextTarget();
        if (!t) return;
        if (action === 'bold') {
            const newVal = (t.fontWeight === 'bold') ? 'normal' : 'bold';
            t.set('fontWeight', newVal);
            if (btnBold) btnBold.classList.toggle('active', newVal === 'bold');
            showToast(newVal === 'bold' ? 'Bold enabled' : 'Bold disabled');
        } else if (action === 'italic') {
            const newVal = (t.fontStyle === 'italic') ? 'normal' : 'italic';
            t.set('fontStyle', newVal);
            if (btnItalic) btnItalic.classList.toggle('active', newVal === 'italic');
            showToast(newVal === 'italic' ? 'Italic enabled' : 'Italic disabled');
        } else if (action === 'underline') {
            t.set('underline', !t.underline);
            showToast(t.underline ? 'Underline enabled' : 'Underline disabled');
        } else if (action === 'linethrough') {
            t.set('linethrough', !t.linethrough);
            showToast(t.linethrough ? 'Strikethrough enabled' : 'Strikethrough disabled');
        } else if (action === 'alignLeft') {
            t.set('textAlign', 'left');
            showToast('Aligned Left');
        } else if (action === 'alignCenter') {
            t.set('textAlign', 'center');
            showToast('Aligned Center');
        } else if (action === 'alignRight') {
            t.set('textAlign', 'right');
            showToast('Aligned Right');
        }
        canvas.requestRenderAll();
        saveState();
    }

    function groupSelectedObjects() {
        const activeObj = canvas.getActiveObject();
        if (!activeObj || activeObj.type !== 'activeSelection') {
            showToast('Select multiple objects to merge (Ctrl + G)');
            return;
        }
        const group = activeObj.toGroup();
        group.set({
            isMergedShape: true,
            shapeUid: generateUid(),
            selectable: true,
            evented: true
        });
        group.setCoords();
        canvas.setActiveObject(group);
        canvas.requestRenderAll();
        saveState();
        showToast('Objects merged! Right-click to Save to My Shapes');
    }

    function mergeSelectedObjects() {
        groupSelectedObjects();
    }

    function ungroupSelectedObjects() {
        const activeObj = canvas.getActiveObject();
        if (!activeObj || activeObj.type !== 'group' || activeObj.isShapeGroup || activeObj.isStickyNote) {
            showToast('Select a grouped object to ungroup');
            return;
        }
        activeObj.toActiveSelection();
        canvas.requestRenderAll();
        saveState();
        showToast('Objects Ungrouped (Ctrl + Shift + G)');
    }

    function saveActiveObjectAsCustomShape() {
        const activeObj = canvas.getActiveObject();
        if (!activeObj) {
            showToast('Select a merged shape or diagram to save');
            return;
        }

        if (activeObj.type === 'activeSelection') {
            showToast('Please merge objects first, then right-click Save');
            return;
        }

        const defaultName = activeObj.isMergedShape ? 'Merged Diagram' : (activeObj.shapeId || 'Custom Shape');
        const shapeName = prompt('Enter a name for your custom shape:', defaultName);
        if (!shapeName || !shapeName.trim()) return;

        let thumbnail = '';
        try {
            thumbnail = activeObj.toDataURL({
                format: 'png',
                multiplier: 0.5,
                enableRetinaScaling: false
            });
        } catch (err) {
            console.warn('Could not generate thumbnail for custom shape:', err);
        }

        const serializedJson = activeObj.toJSON(EXTRA_PROPS);

        const newCustomShape = {
            id: 'custom_shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: shapeName.trim(),
            category: 'My Shapes',
            isUserCustom: true,
            thumbnail: thumbnail,
            json: serializedJson,
            createdAt: Date.now()
        };

        saveUserCustomShape(newCustomShape);

        // Switch to 'My Shapes' in shapes drawer
        activeCategory = 'My Shapes';
        categoryChips.forEach(chip => {
            if (chip.dataset.category === 'My Shapes') {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });

        openDrawerPanel('shapes');
        renderShapesList();
        showToast(`Saved "${shapeName.trim()}" to My Shapes!`);
    }

    // -------------------------------------------------------------------------
    // Context Menu Elements & Actions
    // -------------------------------------------------------------------------
    const contextMenu = document.getElementById('context-menu');
    const ctxMerge = document.getElementById('ctx-merge');
    const ctxSaveShape = document.getElementById('ctx-save-shape');
    const ctxUngroup = document.getElementById('ctx-ungroup');
    const ctxExportSvg = document.getElementById('ctx-export-svg');
    const ctxExportJpg = document.getElementById('ctx-export-jpg');
    const ctxDuplicate = document.getElementById('ctx-duplicate');
    const ctxBringFront = document.getElementById('ctx-bring-front');
    const ctxSendBack = document.getElementById('ctx-send-back');
    const ctxDelete = document.getElementById('ctx-delete');

    function getActiveShapeExportName(activeObj) {
        if (!activeObj) return 'shape';
        if (activeObj.isMergedShape) return 'merged_diagram';
        if (activeObj.shapeId) return activeObj.shapeId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        if (activeObj.type === 'i-text' || activeObj.type === 'textbox') return 'text_snippet';
        if (activeObj.isStickyNote) return 'sticky_note';
        if (activeObj.isConnector || activeObj.isFreeLine || activeObj.type === 'line') return 'line_arrow';
        return 'whiteboard_shape';
    }

    function exportActiveObjectAs(format = 'svg') {
        const activeObj = canvas.getActiveObject();
        if (!activeObj) {
            showToast('Select a shape to export');
            return;
        }

        const baseName = getActiveShapeExportName(activeObj);

        if (format === 'svg') {
            activeObj.clone((cloned) => {
                const b = cloned.getBoundingRect(true, true);
                const padding = 20;
                const w = Math.max(20, Math.ceil(b.width + padding * 2));
                const h = Math.max(20, Math.ceil(b.height + padding * 2));

                const tempCanvasEl = document.createElement('canvas');
                tempCanvasEl.width = w;
                tempCanvasEl.height = h;

                const tempCanvas = new fabric.StaticCanvas(tempCanvasEl, {
                    width: w,
                    height: h,
                    backgroundColor: 'transparent'
                });

                cloned.set({
                    left: w / 2,
                    top: h / 2,
                    originX: 'center',
                    originY: 'center'
                });
                cloned.setCoords();

                tempCanvas.add(cloned);
                tempCanvas.renderAll();

                const svgContent = tempCanvas.toSVG({
                    viewBox: {
                        x: 0,
                        y: 0,
                        width: w,
                        height: h
                    }
                });

                tempCanvas.dispose();

                const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${baseName}.svg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1500);
                showToast(`Exported "${baseName}.svg"`);
            }, EXTRA_PROPS);
        } else if (format === 'jpg') {
            const padding = 24;
            const dataUrl = activeObj.toDataURL({
                format: 'png',
                multiplier: 2,
                enableRetinaScaling: true
            });

            const img = new Image();
            img.onload = () => {
                const offCanvas = document.createElement('canvas');
                offCanvas.width = img.width + padding * 2;
                offCanvas.height = img.height + padding * 2;
                const ctx = offCanvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);
                ctx.drawImage(img, padding, padding);

                const jpgUrl = offCanvas.toDataURL('image/jpeg', 0.95);
                const a = document.createElement('a');
                a.href = jpgUrl;
                a.download = `${baseName}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast(`Exported "${baseName}.jpg"`);
            };
            img.src = dataUrl;
        }
    }

    function hideContextMenu() {
        if (contextMenu && !contextMenu.classList.contains('hidden')) {
            contextMenu.classList.add('hidden');
        }
    }

    function showContextMenu(clientX, clientY) {
        if (!contextMenu) return;
        const activeObj = canvas.getActiveObject();
        if (!activeObj) {
            hideContextMenu();
            return;
        }

        const isMultiSelect = (activeObj.type === 'activeSelection');
        const isGroup = (activeObj.type === 'group' && !activeObj.isStickyNote);

        if (isMultiSelect) {
            if (ctxMerge) ctxMerge.style.display = 'flex';
            if (ctxSaveShape) ctxSaveShape.style.display = 'none';
            if (ctxUngroup) ctxUngroup.style.display = 'none';
        } else {
            if (ctxMerge) ctxMerge.style.display = 'none';
            if (ctxSaveShape) ctxSaveShape.style.display = 'flex';
            if (ctxUngroup) ctxUngroup.style.display = isGroup ? 'flex' : 'none';
        }

        contextMenu.classList.remove('hidden');

        // Bounding box calculations
        const menuWidth = contextMenu.offsetWidth || 210;
        const menuHeight = contextMenu.offsetHeight || 220;
        let posX = clientX;
        let posY = clientY;

        if (posX + menuWidth > window.innerWidth) {
            posX = window.innerWidth - menuWidth - 12;
        }
        if (posY + menuHeight > window.innerHeight) {
            posY = window.innerHeight - menuHeight - 12;
        }

        contextMenu.style.left = `${Math.max(10, posX)}px`;
        contextMenu.style.top = `${Math.max(10, posY)}px`;
    }

    if (ctxMerge) {
        ctxMerge.addEventListener('click', () => {
            hideContextMenu();
            mergeSelectedObjects();
        });
    }

    if (ctxSaveShape) {
        ctxSaveShape.addEventListener('click', () => {
            hideContextMenu();
            saveActiveObjectAsCustomShape();
        });
    }

    if (ctxUngroup) {
        ctxUngroup.addEventListener('click', () => {
            hideContextMenu();
            ungroupSelectedObjects();
        });
    }

    if (ctxExportSvg) {
        ctxExportSvg.addEventListener('click', () => {
            hideContextMenu();
            exportActiveObjectAs('svg');
        });
    }

    if (ctxExportJpg) {
        ctxExportJpg.addEventListener('click', () => {
            hideContextMenu();
            exportActiveObjectAs('jpg');
        });
    }

    if (ctxDuplicate) {
        ctxDuplicate.addEventListener('click', () => {
            hideContextMenu();
            duplicateSelected();
        });
    }

    if (ctxBringFront) {
        ctxBringFront.addEventListener('click', () => {
            hideContextMenu();
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                canvas.bringToFront(activeObj);
                canvas.requestRenderAll();
                saveState();
                showToast('Brought to Front');
            }
        });
    }

    if (ctxSendBack) {
        ctxSendBack.addEventListener('click', () => {
            hideContextMenu();
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                canvas.sendToBack(activeObj);
                canvas.requestRenderAll();
                saveState();
                showToast('Sent to Back');
            }
        });
    }

    if (ctxDelete) {
        ctxDelete.addEventListener('click', () => {
            hideContextMenu();
            deleteSelectedObjects();
        });
    }

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#context-menu')) {
            hideContextMenu();
        }
    });

    const canvasContainerEl = document.getElementById('canvas-container');
    if (canvasContainerEl) {
        canvasContainerEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    // -------------------------------------------------------------------------
    // 17. Multi-Board System & Right Sidebar Controller
    // -------------------------------------------------------------------------
    const rightBoardsSidebar = document.getElementById('right-boards-sidebar');
    const boardsCollapsedStrip = document.getElementById('boards-collapsed-strip');
    const btnExpandBoards = document.getElementById('btn-expand-boards');
    const btnCollapseBoards = document.getElementById('btn-collapse-boards');
    const btnAddBoard = document.getElementById('btn-add-board');
    const btnImportBoard = document.getElementById('btn-import-board');
    const boardFileInput = document.getElementById('board-file-input');
    const boardsListEl = document.getElementById('boards-list');
    const boardsSearchEl = document.getElementById('boards-search');
    const boardsCountBadge = document.getElementById('boards-count-badge');
    const boardsStripBadge = document.getElementById('boards-strip-badge');

    // Board Background Color Elements
    const boardBgPicker = document.getElementById('board-bg-picker');
    const boardBgPreview = document.getElementById('board-bg-preview');
    const sidebarBoardBgPicker = document.getElementById('board-bg-picker-sidebar');
    const boardBgSwatches = document.querySelectorAll('.board-bg-swatch');

    let boards = [];
    let activeBoardId = null;
    let autoSaveTimer = null;

    function hexToRgb(hex) {
        if (!hex || typeof hex !== 'string') return null;
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(ch => ch + ch).join('');
        }
        if (cleanHex.length !== 6) return null;
        const num = parseInt(cleanHex, 16);
        return {
            r: (num >> 16) & 255,
            g: (num >> 8) & 255,
            b: num & 255
        };
    }

    function setBoardBackgroundColor(color, save = true) {
        if (!color) return;
        const activeBoard = boards.find(b => b.id === activeBoardId);
        if (activeBoard) {
            activeBoard.bgColor = color;
            if (save) saveBoardsMeta();
        }

        // Apply background color to canvas container
        if (canvasContainer) {
            canvasContainer.style.setProperty('--board-bg-color', color);
            canvasContainer.style.backgroundColor = color;

            // Dynamically adjust grid line contrast based on background luminance
            const rgb = hexToRgb(color);
            if (rgb) {
                const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                if (brightness < 128) {
                    // Dark background -> soft light grid lines
                    canvasContainer.style.setProperty('--grid-line-color', 'rgba(255, 255, 255, 0.12)');
                } else {
                    // Light background -> soft gray grid lines
                    canvasContainer.style.setProperty('--grid-line-color', '#e2e8f0');
                }
            }
        }

        // Sync pickers and swatches
        if (boardBgPicker) boardBgPicker.value = color;
        if (boardBgPreview) boardBgPreview.style.backgroundColor = color;
        if (sidebarBoardBgPicker) sidebarBoardBgPicker.value = color;

        if (boardBgSwatches && boardBgSwatches.length > 0) {
            boardBgSwatches.forEach(swatch => {
                if (swatch.dataset.color && swatch.dataset.color.toLowerCase() === color.toLowerCase()) {
                    swatch.classList.add('active');
                } else {
                    swatch.classList.remove('active');
                }
            });
        }
    }

    function saveBoardsMeta() {
        try {
            localStorage.setItem('whiteboard_boards_meta', JSON.stringify(boards));
        } catch (e) {
            console.error('Could not save boards meta to localStorage:', e);
        }
    }

    function saveCurrentBoardData() {
        if (!activeBoardId) return;
        try {
            const data = canvas.toJSON(EXTRA_PROPS);
            const jsonStr = JSON.stringify(data);
            localStorage.setItem('whiteboard_board_data_' + activeBoardId, jsonStr);
            localStorage.setItem('whiteboard_saved_board', jsonStr);
            const currentBoard = boards.find(b => b.id === activeBoardId);
            if (currentBoard) {
                currentBoard.updatedAt = Date.now();
                saveBoardsMeta();
            }
        } catch (e) {
            console.error('Could not save current board data:', e);
        }
    }

    function saveActiveBoardDebounced() {
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveCurrentBoardData();
        }, 300);
    }

    function expandBoardsSidebar() {
        if (!rightBoardsSidebar) return;
        rightBoardsSidebar.classList.remove('collapsed');
        rightBoardsSidebar.classList.add('expanded');
        if (boardsSearchEl) {
            setTimeout(() => boardsSearchEl.focus(), 60);
        }
    }

    function collapseBoardsSidebar() {
        if (!rightBoardsSidebar) return;
        rightBoardsSidebar.classList.remove('expanded');
        rightBoardsSidebar.classList.add('collapsed');
    }

    function toggleBoardsSidebar() {
        if (!rightBoardsSidebar) return;
        if (rightBoardsSidebar.classList.contains('expanded')) {
            collapseBoardsSidebar();
        } else {
            expandBoardsSidebar();
        }
    }

    function downloadBoard(boardId) {
        const board = boards.find(b => b.id === boardId);
        if (!board) return;

        let boardObj;
        if (boardId === activeBoardId) {
            boardObj = canvas.toJSON(EXTRA_PROPS);
        } else {
            const stored = localStorage.getItem('whiteboard_board_data_' + boardId);
            if (stored) {
                try {
                    boardObj = JSON.parse(stored);
                } catch (e) {
                    boardObj = { version: '5.3.0', objects: [] };
                }
            } else {
                boardObj = { version: '5.3.0', objects: [] };
            }
        }
        boardObj.bgColor = board.bgColor || '#f8fafc';
        const boardDataJson = JSON.stringify(boardObj, null, 2);

        const safeName = board.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'board';
        const blob = new Blob([boardDataJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`Downloaded "${board.name}" (.json)`);
    }

    function switchBoard(targetBoardId) {
        if (targetBoardId === activeBoardId) return;
        const targetBoard = boards.find(b => b.id === targetBoardId);
        if (!targetBoard) return;

        // Save current board data first
        saveCurrentBoardData();

        activeBoardId = targetBoardId;
        localStorage.setItem('whiteboard_active_board_id', activeBoardId);

        // Restore target board's background color
        const targetBg = targetBoard.bgColor || '#f8fafc';
        setBoardBackgroundColor(targetBg, false);

        // Reset history for new board
        isProcessingHistory = true;
        undoStack.length = 0;
        redoStack.length = 0;
        updateHistoryButtons();
        if (typeof saveActiveBoardDebounced === 'function') {
            saveActiveBoardDebounced();
        }

        // Load new board
        const saved = localStorage.getItem('whiteboard_board_data_' + targetBoardId);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                canvas.loadFromJSON(data, () => {
                    isProcessingHistory = false;
                    canvas.renderAll();
                    updateSelectionUI();
                    saveState();
                    showToast(`Switched to "${targetBoard.name}"`);
                });
            } catch (err) {
                console.error('Error loading board data:', err);
                canvas.clear();
                isProcessingHistory = false;
                canvas.renderAll();
                saveState();
            }
        } else {
            canvas.clear();
            isProcessingHistory = false;
            canvas.renderAll();
            saveState();
            showToast(`Switched to "${targetBoard.name}"`);
        }

        renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
    }

    function addNewBoard() {
        saveCurrentBoardData();

        const newNum = boards.length + 1;
        const boardName = prompt('Enter a name for the new board:', `Board ${newNum}`);
        if (boardName === null) return;
        const finalName = boardName.trim() || `Board ${newNum}`;

        const newId = 'board_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        const newBoard = {
            id: newId,
            name: finalName,
            bgColor: '#f8fafc',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        boards.push(newBoard);
        saveBoardsMeta();

        activeBoardId = newId;
        localStorage.setItem('whiteboard_active_board_id', activeBoardId);
        setBoardBackgroundColor('#f8fafc', false);

        isProcessingHistory = true;
        undoStack.length = 0;
        redoStack.length = 0;
        updateHistoryButtons();
        if (typeof saveActiveBoardDebounced === 'function') {
            saveActiveBoardDebounced();
        }
        canvas.clear();
        isProcessingHistory = false;
        canvas.renderAll();
        saveState();
        saveCurrentBoardData();

        expandBoardsSidebar();
        renderBoardsList();
        showToast(`Created "${finalName}"`);
    }

    function deleteBoard(boardId) {
        if (boards.length <= 1) {
            showToast('Cannot delete the only board');
            return;
        }

        const board = boards.find(b => b.id === boardId);
        if (!board) return;

        if (!confirm(`Are you sure you want to delete "${board.name}"?`)) return;

        boards = boards.filter(b => b.id !== boardId);
        localStorage.removeItem('whiteboard_board_data_' + boardId);
        saveBoardsMeta();

        if (activeBoardId === boardId) {
            switchBoard(boards[0].id);
        } else {
            renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
        }

        showToast(`Deleted "${board.name}"`);
    }

    function startRenameBoard(boardId, titleEl) {
        const board = boards.find(b => b.id === boardId);
        if (!board || !titleEl) return;

        // Prevent multiple simultaneous rename inputs
        if (titleEl.querySelector('.board-rename-input')) return;

        const originalName = board.name;
        titleEl.innerHTML = '';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'board-rename-input';
        input.value = originalName;
        titleEl.appendChild(input);
        input.focus();
        input.select();

        let finished = false;

        function commitRename() {
            if (finished) return;
            finished = true;
            const val = input.value.trim();
            if (val && val !== originalName) {
                board.name = val;
                board.updatedAt = Date.now();
                saveBoardsMeta();
                showToast(`Renamed to "${board.name}"`);
            }
            renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
        }

        function cancelRename() {
            if (finished) return;
            finished = true;
            renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                commitRename();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                cancelRename();
            }
        });

        input.addEventListener('blur', () => {
            commitRename();
        });

        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    function renameBoard(boardId) {
        const board = boards.find(b => b.id === boardId);
        if (!board) return;

        const newName = prompt('Enter new board name:', board.name);
        if (newName === null) return;
        const finalName = newName.trim();
        if (!finalName) return;

        board.name = finalName;
        board.updatedAt = Date.now();
        saveBoardsMeta();
        renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
        showToast(`Renamed to "${board.name}"`);
    }

    function handleImportBoardFile(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const content = event.target.result;

            // Check 1: Is it valid JSON?
            let parsedData;
            try {
                parsedData = JSON.parse(content);
            } catch (jsonErr) {
                showToast('Import failed: File is not valid JSON!');
                return;
            }

            // Check 2: Is it an importable Whiteboard board?
            // Fabric canvas serialization contains an 'objects' array
            const isImportable = parsedData &&
                typeof parsedData === 'object' &&
                !Array.isArray(parsedData) &&
                Array.isArray(parsedData.objects);

            if (!isImportable) {
                showToast('Import failed: JSON file is not an importable whiteboard board!');
                return;
            }

            // Save active board before loading imported one
            saveCurrentBoardData();

            // Derive board name from filename
            let boardName = file.name.replace(/\.[^/.]+$/, '').trim();
            if (!boardName) boardName = 'Imported Board';

            const importedBg = (parsedData.bgColor && typeof parsedData.bgColor === 'string')
                ? parsedData.bgColor
                : '#f8fafc';

            const newId = 'board_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
            const newBoard = {
                id: newId,
                name: boardName,
                bgColor: importedBg,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            boards.push(newBoard);
            localStorage.setItem('whiteboard_board_data_' + newId, JSON.stringify(parsedData));
            saveBoardsMeta();

            switchBoard(newId);
            expandBoardsSidebar();
            showToast(`Board "${boardName}" imported successfully!`);
        };

        reader.onerror = function() {
            showToast('Error reading the selected file');
        };

        reader.readAsText(file);
    }

    function renderBoardsList(filterText = '') {
        if (!boardsListEl) return;
        boardsListEl.innerHTML = '';

        if (boardsCountBadge) {
            boardsCountBadge.textContent = String(boards.length);
        }
        if (boardsStripBadge) {
            boardsStripBadge.textContent = String(boards.length);
        }

        const query = filterText.trim().toLowerCase();
        const filtered = query
            ? boards.filter(b => b.name.toLowerCase().includes(query))
            : boards;

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'boards-empty-state';
            emptyEl.textContent = query ? 'No matching boards found.' : 'No boards yet.';
            boardsListEl.appendChild(emptyEl);
            return;
        }

        filtered.forEach(board => {
            const item = document.createElement('div');
            item.className = 'board-item' + (board.id === activeBoardId ? ' active' : '');
            item.dataset.boardId = board.id;

            // Left side: dot + title
            const leftEl = document.createElement('div');
            leftEl.className = 'board-item-left';
            leftEl.title = `Switch to "${board.name}" (Double-click to rename)`;

            const dotEl = document.createElement('span');
            dotEl.className = 'board-item-dot';

            const titleEl = document.createElement('span');
            titleEl.className = 'board-item-title';
            titleEl.textContent = board.name;

            leftEl.appendChild(dotEl);
            leftEl.appendChild(titleEl);

            // Right side: actions (Rename, Delete, and Download at rightmost)
            const actionsEl = document.createElement('div');
            actionsEl.className = 'board-item-actions';

            // 1. Rename Board button
            const btnRename = document.createElement('button');
            btnRename.className = 'btn-board-action btn-board-rename';
            btnRename.title = `Rename "${board.name}"`;
            btnRename.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            `;
            btnRename.addEventListener('click', (e) => {
                e.stopPropagation();
                startRenameBoard(board.id, titleEl);
            });

            // 2. Delete Board button
            const btnDelete = document.createElement('button');
            btnDelete.className = 'btn-board-action btn-board-delete';
            btnDelete.title = `Delete "${board.name}"`;
            btnDelete.innerHTML = `
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            `;
            btnDelete.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteBoard(board.id);
            });

            // 3. Download Board button (at rightmost of every board)
            const btnDownload = document.createElement('button');
            btnDownload.className = 'btn-board-action btn-board-download';
            btnDownload.title = `Download "${board.name}" (.json)`;
            btnDownload.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
            `;
            btnDownload.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadBoard(board.id);
            });

            actionsEl.appendChild(btnRename);
            actionsEl.appendChild(btnDelete);
            actionsEl.appendChild(btnDownload);

            item.appendChild(leftEl);
            item.appendChild(actionsEl);

            // Switch on click
            item.addEventListener('click', (e) => {
                if (e.target.closest('.btn-board-action') || e.target.closest('.board-rename-input')) return;
                switchBoard(board.id);
            });

            // Rename on double-click
            item.addEventListener('dblclick', () => {
                startRenameBoard(board.id, titleEl);
            });

            boardsListEl.appendChild(item);
        });
    }

    function initBoards() {
        try {
            const meta = localStorage.getItem('whiteboard_boards_meta');
            if (meta) {
                boards = JSON.parse(meta);
            }
        } catch (e) {
            console.warn('Could not parse boards meta:', e);
        }

        if (!boards || boards.length === 0) {
            const legacyData = localStorage.getItem('whiteboard_saved_board');
            const defaultBoard = {
                id: 'board_main',
                name: 'Board 1',
                bgColor: '#f8fafc',
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            boards = [defaultBoard];
            if (legacyData) {
                localStorage.setItem('whiteboard_board_data_board_main', legacyData);
            }
            saveBoardsMeta();
        } else {
            let metaUpdated = false;
            boards.forEach(b => {
                if (!b.bgColor) {
                    b.bgColor = '#f8fafc';
                    metaUpdated = true;
                }
            });
            if (metaUpdated) saveBoardsMeta();
        }

        const savedActiveId = localStorage.getItem('whiteboard_active_board_id');
        if (savedActiveId && boards.some(b => b.id === savedActiveId)) {
            activeBoardId = savedActiveId;
        } else {
            activeBoardId = boards[0].id;
        }

        // Apply active board's background color
        const activeBoard = boards.find(b => b.id === activeBoardId);
        const currentBg = (activeBoard && activeBoard.bgColor) ? activeBoard.bgColor : '#f8fafc';
        setBoardBackgroundColor(currentBg, false);

        const currentBoardData = localStorage.getItem('whiteboard_board_data_' + activeBoardId);
        if (currentBoardData && canvas.getObjects().length === 0) {
            try {
                const data = JSON.parse(currentBoardData);
                isProcessingHistory = true;
                canvas.loadFromJSON(data, () => {
                    isProcessingHistory = false;
                    canvas.renderAll();
                    updateSelectionUI();
                    saveState();
                });
            } catch (e) {
                isProcessingHistory = false;
            }
        }

        renderBoardsList();
    }

    if (boardsCollapsedStrip) {
        boardsCollapsedStrip.addEventListener('click', expandBoardsSidebar);
    }
    if (btnExpandBoards) {
        btnExpandBoards.addEventListener('click', (e) => {
            e.stopPropagation();
            expandBoardsSidebar();
        });
    }
    if (btnCollapseBoards) {
        btnCollapseBoards.addEventListener('click', (e) => {
            e.stopPropagation();
            collapseBoardsSidebar();
        });
    }
    if (btnAddBoard) {
        btnAddBoard.addEventListener('click', addNewBoard);
    }
    if (btnImportBoard && boardFileInput) {
        btnImportBoard.addEventListener('click', () => {
            boardFileInput.value = '';
            boardFileInput.click();
        });
        boardFileInput.addEventListener('change', handleImportBoardFile);
    }
    if (boardsSearchEl) {
        boardsSearchEl.addEventListener('input', () => {
            renderBoardsList(boardsSearchEl.value);
        });
    }

    // Board Background Color Listeners
    if (boardBgPicker) {
        boardBgPicker.addEventListener('input', (e) => {
            setBoardBackgroundColor(e.target.value, true);
        });
    }
    if (sidebarBoardBgPicker) {
        sidebarBoardBgPicker.addEventListener('input', (e) => {
            setBoardBackgroundColor(e.target.value, true);
        });
    }
    if (boardBgSwatches) {
        boardBgSwatches.forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                if (color) {
                    setBoardBackgroundColor(color, true);
                    showToast(`Background changed to ${color}`);
                }
            });
        });
    }

    initBoards();

    function isUserTyping() {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isEditing) return true;
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        return tag === 'input' || tag === 'textarea' || tag === 'select';
    }

    window.addEventListener('keydown', (e) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        const isShift = e.shiftKey;
        const key = e.key;
        const code = e.code;

        // Dismiss Shortcuts Modal if open and user presses Escape
        if (key === 'Escape' || code === 'Escape') {
            if (shortcutsModal && !shortcutsModal.classList.contains('hidden')) {
                e.preventDefault();
                closeShortcutsModal();
                return;
            }
        }

        // Toggle Keyboard Shortcuts Reference: ? (Shift+/), Ctrl+/, or F1
        const isHelpShortcut = (key === 'F1' || code === 'F1') ||
                               (isCtrl && (key === '/' || code === 'Slash')) ||
                               (!isCtrl && (key === '?' || (isShift && (key === '/' || code === 'Slash'))));

        if (isHelpShortcut) {
            // Allow typing literal '?' if user is editing text inside an input/textbox
            if (isUserTyping() && !isCtrl && key !== 'F1') {
                // allow character insertion
            } else {
                e.preventDefault();
                toggleShortcutsModal();
                return;
            }
        }

        // Spacebar panning
        if (e.code === 'Space' && !isSpacePressed && !isUserTyping()) {
            isSpacePressed = true;
            wasDrawingMode = canvas.isDrawingMode;
            canvas.isDrawingMode = false;
            canvas.defaultCursor = 'grab';
            canvas.selection = false;
            e.preventDefault();
            return;
        }

        // Typing in text inputs or editing text
        if (isUserTyping()) {
            if (key === 'Escape') {
                const activeObj = canvas.getActiveObject();
                if (activeObj && activeObj.isEditing) {
                    activeObj.exitEditing();
                    canvas.requestRenderAll();
                }
                return;
            }
            if (isCtrl && !isShift && (key === 'b' || key === 'B')) {
                e.preventDefault();
                formatActiveText('bold');
            } else if (isCtrl && !isShift && (key === 'i' || key === 'I')) {
                e.preventDefault();
                formatActiveText('italic');
            } else if (isCtrl && !isShift && (key === 'u' || key === 'U')) {
                e.preventDefault();
                formatActiveText('underline');
            } else if (isCtrl && isShift && (key === 'x' || key === 'X')) {
                e.preventDefault();
                formatActiveText('linethrough');
            } else if (isCtrl && isShift && (key === 'l' || key === 'L')) {
                e.preventDefault();
                formatActiveText('alignLeft');
            } else if (isCtrl && isShift && (key === 'e' || key === 'E')) {
                e.preventDefault();
                formatActiveText('alignCenter');
            } else if (isCtrl && isShift && (key === 'r' || key === 'R')) {
                e.preventDefault();
                formatActiveText('alignRight');
            }
            return;
        }

        // ---------------------------------------------------------------------
        // 1. BASIC EDITING
        // ---------------------------------------------------------------------
        if (isCtrl && !isShift && (key === 'z' || key === 'Z')) {
            e.preventDefault();
            undo();
            return;
        }
        if ((isCtrl && !isShift && (key === 'y' || key === 'Y')) ||
            (isCtrl && isShift && (key === 'z' || key === 'Z'))) {
            e.preventDefault();
            redo();
            return;
        }
        if (isCtrl && !isShift && (key === 'c' || key === 'C')) {
            e.preventDefault();
            copySelected();
            return;
        }
        if (isCtrl && !isShift && (key === 'v' || key === 'V')) {
            e.preventDefault();
            pasteClipboard();
            return;
        }
        if (isCtrl && !isShift && (key === 'x' || key === 'X')) {
            e.preventDefault();
            cutSelected();
            return;
        }
        if (isCtrl && !isShift && (key === 'a' || key === 'A')) {
            e.preventDefault();
            selectAllObjects();
            return;
        }
        if (isCtrl && !isShift && (key === 'd' || key === 'D')) {
            e.preventDefault();
            duplicateSelected();
            return;
        }
        if (isCtrl && !isShift && (key === 's' || key === 'S')) {
            e.preventDefault();
            saveBoard();
            return;
        }
        if (isCtrl && isShift && (key === 's' || key === 'S')) {
            e.preventDefault();
            saveBoardAs();
            return;
        }
        if (key === 'Delete' || key === 'Backspace') {
            e.preventDefault();
            deleteSelectedObjects();
            return;
        }

        // ---------------------------------------------------------------------
        // 2. CANVAS NAVIGATION
        // ---------------------------------------------------------------------
        if (!isCtrl && (key === '+' || key === '=')) {
            e.preventDefault();
            setZoom(canvas.getZoom() * 1.15);
            return;
        }
        if (!isCtrl && (key === '-' || key === '_')) {
            e.preventDefault();
            setZoom(canvas.getZoom() / 1.15);
            return;
        }
        if (isCtrl && key === '0') {
            e.preventDefault();
            resetView();
            return;
        }
        if (isCtrl && !isShift && key === '1') {
            e.preventDefault();
            setZoom(1.0);
            showToast('Zoom: 100%');
            return;
        }
        if (isShift && !isCtrl && (key === '!' || key === '1')) {
            e.preventDefault();
            fitEntireCanvas();
            return;
        }
        if (isShift && !isCtrl && (key === '@' || key === '2')) {
            e.preventDefault();
            zoomToSelection();
            return;
        }
        if (key === 'Home') {
            e.preventDefault();
            goToOrigin();
            return;
        }

        // ---------------------------------------------------------------------
        // 3. DRAWING TOOLS
        // ---------------------------------------------------------------------
        if (!isCtrl && (key === 'v' || key === 'V')) {
            setMode('select');
            return;
        }
        if (!isCtrl && (key === 'h' || key === 'H')) {
            setMode('pan');
            return;
        }
        if (!isCtrl && (key === 'p' || key === 'P')) {
            setMode('pen');
            return;
        }
        if (!isCtrl && (key === 't' || key === 'T')) {
            setMode('text');
            return;
        }
        if (!isCtrl && (key === 'r' || key === 'R')) {
            addBuiltinShape('rectangle');
            return;
        }
        if (!isCtrl && (key === 'o' || key === 'O')) {
            addBuiltinShape('circle');
            return;
        }
        if (!isCtrl && (key === 'l' || key === 'L')) {
            setMode('line');
            return;
        }
        if (!isCtrl && (key === 'a' || key === 'A')) {
            setMode('arrow');
            return;
        }
        if (!isCtrl && (key === 'n' || key === 'N' || key === 's' || key === 'S')) {
            setMode('sticky');
            return;
        }
        if (!isCtrl && (key === 'e' || key === 'E')) {
            setMode('eraser');
            return;
        }
        if (key === 'Escape') {
            closeShortcutsModal();
            closeDrawer();
            const activeObj = canvas.getActiveObject();
            if (activeObj && activeObj.isEditing) activeObj.exitEditing();
            setMode('select');
            return;
        }
        if (key === 'Enter') {
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                if (activeObj.type === 'i-text') {
                    activeObj.enterEditing();
                    e.preventDefault();
                } else if (activeObj.isShapeGroup || activeObj.isStickyNote) {
                    const textObj = activeObj.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text');
                    if (textObj) {
                        canvas.setActiveObject(textObj);
                        textObj.enterEditing();
                        textObj.selectAll();
                        canvas.requestRenderAll();
                        e.preventDefault();
                    }
                }
            }
            return;
        }

        // ---------------------------------------------------------------------
        // 4. TEXT FORMATTING
        // ---------------------------------------------------------------------
        if (isCtrl && !isShift && (key === 'b' || key === 'B')) {
            e.preventDefault();
            formatActiveText('bold');
            return;
        }
        if (isCtrl && !isShift && (key === 'i' || key === 'I')) {
            e.preventDefault();
            formatActiveText('italic');
            return;
        }
        if (isCtrl && !isShift && (key === 'u' || key === 'U')) {
            e.preventDefault();
            formatActiveText('underline');
            return;
        }
        if (isCtrl && isShift && (key === 'x' || key === 'X')) {
            e.preventDefault();
            formatActiveText('linethrough');
            return;
        }
        if (isCtrl && isShift && (key === 'l' || key === 'L')) {
            e.preventDefault();
            formatActiveText('alignLeft');
            return;
        }
        if (isCtrl && isShift && (key === 'e' || key === 'E')) {
            e.preventDefault();
            formatActiveText('alignCenter');
            return;
        }
        if (isCtrl && isShift && (key === 'r' || key === 'R')) {
            e.preventDefault();
            formatActiveText('alignRight');
            return;
        }

        // ---------------------------------------------------------------------
        // 5. OBJECT ARRANGEMENT
        // ---------------------------------------------------------------------
        if (isCtrl && !isShift && (key === 'g' || key === 'G')) {
            e.preventDefault();
            groupSelectedObjects();
            return;
        }
        if (isCtrl && isShift && (key === 'g' || key === 'G')) {
            e.preventDefault();
            ungroupSelectedObjects();
            return;
        }
        if (isCtrl && !isShift && key === ']') {
            e.preventDefault();
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                canvas.bringForward(activeObj);
                canvas.requestRenderAll();
                saveState();
                showToast('Brought Forward (Ctrl + ])');
            }
            return;
        }
        if (isCtrl && !isShift && key === '[') {
            e.preventDefault();
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                canvas.sendBackwards(activeObj);
                canvas.requestRenderAll();
                saveState();
                showToast('Sent Backward (Ctrl + [)');
            }
            return;
        }
        if (isCtrl && isShift && (key === '}' || key === ']')) {
            e.preventDefault();
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                canvas.bringToFront(activeObj);
                canvas.requestRenderAll();
                saveState();
                showToast('Brought to Front (Ctrl + Shift + ])');
            }
            return;
        }
        if (isCtrl && isShift && (key === '{' || key === '[')) {
            e.preventDefault();
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                canvas.sendToBack(activeObj);
                canvas.requestRenderAll();
                saveState();
                showToast('Sent to Back (Ctrl + Shift + [)');
            }
            return;
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                const step = isShift ? 20 : 2;
                if (key === 'ArrowLeft') activeObj.left -= step;
                if (key === 'ArrowRight') activeObj.left += step;
                if (key === 'ArrowUp') activeObj.top -= step;
                if (key === 'ArrowDown') activeObj.top += step;
                activeObj.setCoords();
                updateConnectedLinesFor(activeObj);
                canvas.requestRenderAll();
                saveState();
                e.preventDefault();
            }
            return;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            isSpacePressed = false;
            canvas.isDrawingMode = wasDrawingMode;
            updateCursorForMode();
        }
    });

    // -------------------------------------------------------------------------
    // 17. Undo / Redo History Management
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
        if (typeof saveActiveBoardDebounced === 'function') {
            saveActiveBoardDebounced();
        }
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

            // Re-establish connector links and shapes
            const shapesByUid = {};
            canvas.forEachObject(obj => {
                if (obj.shapeUid) {
                    shapesByUid[obj.shapeUid] = obj;
                    obj.connectedLines = [];
                }
            });

            const arrowHeads = [];
            canvas.forEachObject(obj => {
                if (obj.isArrowHead) {
                    arrowHeads.push(obj);
                    obj.selectable = false;
                    obj.evented = false;
                }
            });

            canvas.forEachObject(obj => {
                if (obj.isConnector && obj.fromShapeUid && obj.toShapeUid) {
                    const fromShape = shapesByUid[obj.fromShapeUid];
                    const toShape = shapesByUid[obj.toShapeUid];
                    if (fromShape && toShape) {
                        obj.fromShape = fromShape;
                        obj.toShape = toShape;
                        fromShape.connectedLines.push(obj);
                        toShape.connectedLines.push(obj);
                    }
                }

                if (obj.globalCompositeOperation === 'destination-out') {
                    obj.selectable = false;
                    obj.evented = false;
                } else if (currentMode === 'select' && !obj.isArrowHead) {
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
    // 18. Sample Shapes & Clear
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
            selectable: currentMode === 'select',
            shapeUid: generateUid()
        });

        rect.connectedLines = [];

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
    // 19. Initial Boot
    // -------------------------------------------------------------------------
    saveState();
    updateZoomDisplay();
    updateGrid();
    loadShapes();
    loadTemplates();
    loadStickers();
});

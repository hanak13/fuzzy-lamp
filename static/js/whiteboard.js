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
    const btnSidebarStepbox = document.getElementById('btn-sidebar-stepbox');
    const btnLine = document.getElementById('btn-line');
    const btnArrow = document.getElementById('btn-arrow');
    const btnToggleShapes = document.getElementById('btn-toggle-shapes');

    // Step Box Floating Controls Elements
    const stepBoxFloatingBar = document.getElementById('stepbox-floating-bar');
    const btnStepBoxPrev = document.getElementById('btn-stepbox-prev');
    const btnStepBoxNext = document.getElementById('btn-stepbox-next');
    const btnStepBoxAdd = document.getElementById('btn-stepbox-add');
    const btnStepBoxDel = document.getElementById('btn-stepbox-del');
    const stepBoxCounterLabel = document.getElementById('stepbox-counter-label');
    const btnStepBoxSave = document.getElementById('btn-stepbox-save');
    const btnStepBoxPlay = document.getElementById('btn-stepbox-play');
    const stepBoxPlayIcon = document.getElementById('stepbox-play-icon');
    const stepBoxPlayLabel = document.getElementById('stepbox-play-label');
    const btnStepBoxManage = document.getElementById('btn-stepbox-manage');
    const btnStepBoxPptx = document.getElementById('btn-stepbox-pptx');

    // Step Box Manager Modal Elements
    const stepboxManagerModal = document.getElementById('stepbox-manager-modal');
    const stepboxModalTitle = document.getElementById('stepbox-modal-title');
    const btnCloseStepboxManager = document.getElementById('btn-close-stepbox-manager');
    const btnStepboxManagerDone = document.getElementById('btn-stepbox-manager-done');
    const btnStepboxManagerAdd = document.getElementById('btn-stepbox-manager-add');
    const btnStepboxManagerPptx = document.getElementById('btn-stepbox-manager-pptx');
    const stepboxStepsList = document.getElementById('stepbox-steps-list');
    const stepboxManagerCountBadge = document.getElementById('stepbox-manager-count-badge');
    const stepboxManagerActiveBadge = document.getElementById('stepbox-manager-active-badge');

    // Fullscreen Controls Elements
    const btnFullscreenToggle = document.getElementById('btn-fullscreen-toggle');
    const btnZoomFullscreen = document.getElementById('btn-zoom-fullscreen');
    const fullscreenIconExpand = document.getElementById('fullscreen-icon-expand');
    const fullscreenIconCompress = document.getElementById('fullscreen-icon-compress');
    const fullscreenBtnLabel = document.getElementById('fullscreen-btn-label');

    // Canvas Frame / Fixed Width Mode Elements
    const btnFrameMode = document.getElementById('btn-frame-mode');
    const frameModeDropdown = document.getElementById('frame-mode-dropdown');
    const frameModeLabel = document.getElementById('frame-mode-label');
    const slideFrameBanner = document.getElementById('slide-frame-banner');
    const slideFrameTitle = document.getElementById('slide-frame-title');
    const btnFitSlide = document.getElementById('btn-fit-slide');
    const btnExitSlideMode = document.getElementById('btn-exit-slide-mode');
    const frameMenuItems = document.querySelectorAll('.frame-menu-item');
    const btnPrevSlide = document.getElementById('btn-prev-slide');
    const btnNextSlide = document.getElementById('btn-next-slide');
    const btnAddSlide = document.getElementById('btn-add-slide');
    const btnDelSlide = document.getElementById('btn-del-slide');
    const slideCounterBadge = document.getElementById('slide-counter-badge');
    const btnSlideFullscreen = document.getElementById('btn-slide-fullscreen');
    const slideFsIconExpand = document.getElementById('slide-fs-icon-expand');
    const slideFsIconCompress = document.getElementById('slide-fs-icon-compress');
    const slideFsBtnLabel = document.getElementById('slide-fs-btn-label');

    // Exit Slide Confirmation Modal Elements
    const modalExitSlide = document.getElementById('modal-exit-slide');
    const btnCloseExitSlide = document.getElementById('btn-close-exit-slide');
    const btnSlideCancelExit = document.getElementById('btn-slide-cancel-exit');
    const btnSlideDiscardExit = document.getElementById('btn-slide-discard-exit');
    const btnSlideSaveExit = document.getElementById('btn-slide-save-exit');

    // Download / Export Menu Elements
    const btnDownloadMenu = document.getElementById('btn-download-menu');
    const downloadDropdown = document.getElementById('download-dropdown');
    const btnDownloadPptx = document.getElementById('btn-download-pptx');
    const btnDownloadPdf = document.getElementById('btn-download-pdf');
    const btnDownloadPng = document.getElementById('btn-download-png');
    const btnDownloadSvg = document.getElementById('btn-download-svg');
    const btnDownloadJson = document.getElementById('btn-download-json');

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
    const btnStrokeSizeDec = document.getElementById('btn-stroke-size-dec');
    const btnStrokeSizeInc = document.getElementById('btn-stroke-size-inc');
    const strokeSizeVal = document.getElementById('stroke-size-val');
    const sliderStrokeSize = document.getElementById('slider-stroke-size');
    const selectFontSize = document.getElementById('select-font-size');
    const btnBold = document.getElementById('btn-bold');
    const btnItalic = document.getElementById('btn-italic');
    const btnDelete = document.getElementById('btn-delete');
    const stickyColorBtns = document.querySelectorAll('.sticky-color-btn');

    // Line & Arrow Specific Properties
    const propLineGroup = document.getElementById('prop-line-group');
    const propFillGroup = document.getElementById('prop-fill-group');
    const propTextGroup = document.getElementById('prop-text-group');
    const propSizeGroup = document.getElementById('prop-size-group');
    const selectLinePattern = document.getElementById('select-line-pattern');
    const selectArrowHead = document.getElementById('select-arrow-head');

    // Eraser Specific Properties & Controls
    const propEraserGroup = document.getElementById('prop-eraser-group');
    const btnEraserModeBrush = document.getElementById('btn-eraser-mode-brush');
    const btnEraserModeArea = document.getElementById('btn-eraser-mode-area');
    const btnEraserSizeDec = document.getElementById('btn-eraser-size-dec');
    const btnEraserSizeInc = document.getElementById('btn-eraser-size-inc');
    const eraserSizeVal = document.getElementById('eraser-size-val');
    const sliderEraserSize = document.getElementById('slider-eraser-size');

    // Fullscreen Presenter Controls Elements (Bottom Right)
    const fsPresenterBar = document.getElementById('fullscreen-presenter-bar');
    const fsBtnPen = document.getElementById('fs-btn-pen');
    const fsBtnPaint = document.getElementById('fs-btn-paint');
    const fsBtnEraser = document.getElementById('fs-btn-eraser');
    const fsEraserPopover = document.getElementById('fs-eraser-popover');
    const fsEraserModeGroup = document.getElementById('fs-eraser-mode-group');
    const fsSubEraserBrush = document.getElementById('fs-sub-eraser-brush');
    const fsSubEraserArea = document.getElementById('fs-sub-eraser-area');
    const fsBtnEraserDec = document.getElementById('fs-btn-eraser-dec');
    const fsBtnEraserInc = document.getElementById('fs-btn-eraser-inc');
    const fsEraserSizeDisplay = document.getElementById('fs-eraser-size-display');
    const fsBtnSizeDec = document.getElementById('fs-btn-size-dec');
    const fsBtnSizeInc = document.getElementById('fs-btn-size-inc');
    const fsSizeDisplay = document.getElementById('fs-size-display');
    const fsSizeSlider = document.getElementById('fs-size-slider');
    const fsBtnColor = document.getElementById('fs-btn-color');
    const fsColorPreviewCircle = document.getElementById('fs-color-preview-circle');
    const fsColorPopover = document.getElementById('fs-color-popover');
    const fsColorSwatches = document.querySelectorAll('.fs-color-swatch');
    const fsColorInput = document.getElementById('fs-color-input');
    const fsBtnSelect = document.getElementById('fs-btn-select');
    const eraserCursorPreview = document.getElementById('eraser-cursor-preview');

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

    // Stroke / Writing State Variables
    let strokeSize = 4;

    // Eraser State Variables
    let eraserSize = 30;
    let eraserSubMode = 'brush'; // 'brush' or 'area'
    let isErasingArea = false;
    let areaErasePoints = [];
    let areaErasePreview = null;

    // Step Box State Variables
    let isDrawingStepBox = false;
    let stepBoxStartPoint = null;
    let stepBoxPreviewRect = null;
    let activeStepBox = null;
    let isStepBoxPlaying = false;
    let stepBoxPlayInterval = null;

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
        'stickerUrl',
        'isStepBox',
        'stepBoxId',
        'stepBoxName',
        'stepBoxSteps',
        'stepBoxCurrentStep',
        'stepBoxOwnerId',
        'relLeft',
        'relTop',
        'isSlideFrame',
        'slideFrameRatio',
        'imageName'
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

        const baseSize = strokeSize || 4;

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
            if (eraserSubMode === 'brush') {
                canvas.isDrawingMode = true;
                canvas.freeDrawingBrush.color = 'rgba(235, 238, 242, 0.85)';
                canvas.freeDrawingBrush.width = eraserSize;
                canvas.freeDrawingBrush.strokeLineCap = 'round';
                canvas.freeDrawingBrush.strokeLineJoin = 'round';
            } else {
                canvas.isDrawingMode = false;
            }
        } else {
            canvas.isDrawingMode = false;
        }
    }

    function setStrokeSize(newSize) {
        strokeSize = Math.max(1, Math.min(64, Math.round(newSize)));
        if (strokeSizeVal) strokeSizeVal.textContent = strokeSize + 'px';
        if (sliderStrokeSize) sliderStrokeSize.value = strokeSize;

        if (currentMode !== 'eraser') {
            if (fsSizeDisplay) fsSizeDisplay.textContent = strokeSize + 'px';
            if (fsSizeSlider) {
                fsSizeSlider.min = '1';
                fsSizeSlider.max = '64';
                fsSizeSlider.value = strokeSize;
            }
        }

        if (currentMode === 'pen' || currentMode === 'highlighter') {
            updateBrushSettings();
        }

        const activeObj = canvas.getActiveObject();
        if (activeObj && currentMode === 'select') {
            if (activeObj.isShapeGroup) {
                const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
                if (shape) {
                    shape.set('strokeWidth', strokeSize);
                    canvas.renderAll();
                    saveState();
                }
            } else if (activeObj.isConnector || activeObj.isFreeLine || activeObj.type === 'line') {
                activeObj.set('strokeWidth', strokeSize);
                if (activeObj.arrowHead) {
                    activeObj.arrowHead.set({
                        width: Math.max(12, strokeSize * 5),
                        height: Math.max(12, strokeSize * 5)
                    });
                }
                if (activeObj.startArrowHead) {
                    activeObj.startArrowHead.set({
                        width: Math.max(12, strokeSize * 5),
                        height: Math.max(12, strokeSize * 5)
                    });
                }
                canvas.renderAll();
                saveState();
            } else if (!activeObj.isSlideFrame && !activeObj.isGridLine && (activeObj.type === 'rect' || activeObj.type === 'circle' || activeObj.type === 'triangle' || activeObj.type === 'polygon' || activeObj.type === 'path')) {
                activeObj.set('strokeWidth', strokeSize);
                canvas.renderAll();
                saveState();
            }
        }
    }

    function setEraserSize(newSize) {
        eraserSize = Math.max(6, Math.min(150, Math.round(newSize)));
        if (eraserSizeVal) eraserSizeVal.textContent = eraserSize + 'px';
        if (sliderEraserSize) sliderEraserSize.value = eraserSize;

        if (currentMode === 'eraser') {
            if (fsSizeDisplay) fsSizeDisplay.textContent = eraserSize + 'px';
            if (fsSizeSlider) {
                fsSizeSlider.min = '6';
                fsSizeSlider.max = '150';
                fsSizeSlider.value = eraserSize;
            }
        }

        if (currentMode === 'eraser' && eraserSubMode === 'brush' && canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.width = eraserSize;
        }

        if (eraserCursorPreview && currentMode === 'eraser' && eraserSubMode === 'brush') {
            const zoom = canvas.getZoom();
            const diameter = Math.max(8, eraserSize * zoom);
            eraserCursorPreview.style.width = diameter + 'px';
            eraserCursorPreview.style.height = diameter + 'px';
        }
    }

    function setEraserSubMode(subMode) {
        eraserSubMode = (subMode === 'area') ? 'area' : 'brush';

        if (btnEraserModeBrush) btnEraserModeBrush.classList.toggle('active', eraserSubMode === 'brush');
        if (btnEraserModeArea) btnEraserModeArea.classList.toggle('active', eraserSubMode === 'area');
        if (fsSubEraserBrush) fsSubEraserBrush.classList.toggle('active', eraserSubMode === 'brush');
        if (fsSubEraserArea) fsSubEraserArea.classList.toggle('active', eraserSubMode === 'area');

        if (currentMode === 'eraser') {
            if (eraserSubMode === 'brush') {
                canvas.isDrawingMode = true;
                updateBrushSettings();
                canvas.defaultCursor = 'crosshair';
                showToast(`Brush Eraser (${eraserSize}px)`);
            } else {
                canvas.isDrawingMode = false;
                canvas.defaultCursor = 'crosshair';
                if (eraserCursorPreview) eraserCursorPreview.style.display = 'none';
                showToast('Circle / Area Erase: Circle or draw a boundary around what to erase');
            }
        }
    }

    function updateActiveDrawingColor(newColor) {
        currentColor = newColor;
        if (colorPicker) colorPicker.value = newColor;
        if (colorPreview) colorPreview.style.backgroundColor = newColor;
        if (fsColorPreviewCircle) fsColorPreviewCircle.style.backgroundColor = newColor;
        if (fsColorInput) fsColorInput.value = newColor;

        if (fsColorSwatches) {
            fsColorSwatches.forEach(sw => {
                sw.classList.toggle('active', sw.getAttribute('data-color') === newColor);
            });
        }

        if (currentMode === 'pen' || currentMode === 'highlighter') {
            updateBrushSettings();
        }

        const activeObj = canvas.getActiveObject();
        if (activeObj && currentMode === 'select') {
            if (activeObj.type === 'activeSelection') {
                activeObj.forEachObject(o => {
                    if (o.type === 'i-text' || o.type === 'textbox') o.set('fill', newColor);
                    else o.set('stroke', newColor);
                });
            } else {
                if (activeObj.type === 'i-text' || activeObj.type === 'textbox') activeObj.set('fill', newColor);
                else activeObj.set('stroke', newColor);
            }
            canvas.requestRenderAll();
            saveState();
        }
    }

    function isPointInPolygon(point, vs) {
        const x = point.x, y = point.y;
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i].x, yi = vs[i].y;
            const xj = vs[j].x, yj = vs[j].y;
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    // -------------------------------------------------------------------------
    // Fabric.js Object-Level Inverted Erasing Extension (Partial Object Erasing)
    // -------------------------------------------------------------------------
    (function setupFabricErasing() {
        if (typeof fabric === 'undefined' || !fabric.Object) return;

        const origDrawClipPath = fabric.Object.prototype._drawClipPath;
        fabric.Object.prototype._drawClipPath = function(ctx, clipPath) {
            if (origDrawClipPath) {
                origDrawClipPath.call(this, ctx, clipPath);
            }
            if (this.eraseClipPaths && this.eraseClipPaths.length > 0) {
                for (let i = 0; i < this.eraseClipPaths.length; i++) {
                    const ep = this.eraseClipPaths[i];
                    if (ep) {
                        ep.canvas = this.canvas;
                        ep.shouldCache();
                        ep._transformDone = true;
                        ep.renderCache({ forClipping: true });
                        this.drawClipPathOnCache(ctx, ep);
                    }
                }
            }
        };

        const origNeedsItsOwnCache = fabric.Object.prototype.needsItsOwnCache;
        fabric.Object.prototype.needsItsOwnCache = function() {
            const orig = origNeedsItsOwnCache ? origNeedsItsOwnCache.call(this) : false;
            return orig || !!this.clipPath || (!!this.eraseClipPaths && this.eraseClipPaths.length > 0);
        };

        const origIsCacheDirty = fabric.Object.prototype.isCacheDirty;
        fabric.Object.prototype.isCacheDirty = function(skipCanvas) {
            if (this.eraseClipPaths && this.eraseClipPaths.length > 0) {
                for (let i = 0; i < this.eraseClipPaths.length; i++) {
                    if (this.eraseClipPaths[i] && this.eraseClipPaths[i].absolutePositioned) return true;
                }
            }
            return origIsCacheDirty ? origIsCacheDirty.call(this, skipCanvas) : false;
        };
    })();

    function applyErasePolygonToObject(obj, polyPoints) {
        if (!obj.eraseClipPaths) {
            obj.eraseClipPaths = [];
        }
        const ep = new fabric.Polygon(polyPoints.map(pt => ({ x: pt.x, y: pt.y })), {
            absolutePositioned: true,
            inverted: true
        });
        obj.eraseClipPaths.push(ep);
        obj.objectCaching = true;
        obj.dirty = true;
    }

    function finalizeAreaErase() {
        if (!isErasingArea) return;
        isErasingArea = false;
        if (areaErasePreview) {
            canvas.remove(areaErasePreview);
            areaErasePreview = null;
        }
        if (areaErasePoints.length >= 3) {
            const poly = areaErasePoints;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (let i = 0; i < poly.length; i++) {
                if (poly[i].x < minX) minX = poly[i].x;
                if (poly[i].x > maxX) maxX = poly[i].x;
                if (poly[i].y < minY) minY = poly[i].y;
                if (poly[i].y > maxY) maxY = poly[i].y;
            }

            let removedCount = 0;
            let partialCount = 0;
            const objs = canvas.getObjects().slice();

            objs.forEach(obj => {
                if (!obj || obj.isSlideFrame || obj.isStepBox || obj.isGridLine || obj === stepBoxPreviewRect || obj === connectorPreviewLine) return;

                const bound = obj.getBoundingRect(true, true);
                // Bounding box overlap filter
                if (bound.left > maxX || bound.left + bound.width < minX ||
                    bound.top > maxY || bound.top + bound.height < minY) {
                    return;
                }

                // Sample points from the object to test containment
                let samplePoints = [];

                if (obj.type === 'path' && Array.isArray(obj.path)) {
                    // Freehand pen / paint stroke: sample coordinates along the path
                    const matrix = obj.calcTransformMatrix ? obj.calcTransformMatrix() : null;
                    const pathLen = obj.path.length;
                    const step = Math.max(1, Math.floor(pathLen / 40));
                    for (let p = 0; p < pathLen; p += step) {
                        const cmd = obj.path[p];
                        if (cmd && cmd.length >= 3) {
                            const rawPt = { x: cmd[cmd.length - 2], y: cmd[cmd.length - 1] };
                            const pt = matrix ? fabric.util.transformPoint(rawPt, matrix) : rawPt;
                            samplePoints.push(pt);
                        }
                    }
                } else if (obj.type === 'line' || obj.isConnector || obj.isFreeLine) {
                    // Line object: sample 15 points along the segment
                    const x1 = obj.x1, y1 = obj.y1, x2 = obj.x2, y2 = obj.y2;
                    for (let t = 0; t <= 1; t += 0.08) {
                        samplePoints.push({ x: x1 + t * (x2 - x1), y: y1 + t * (y2 - y1) });
                    }
                } else {
                    // Shapes, Text, Sticky Notes, Stickers: sample 9 points (corners, midpoints, center)
                    samplePoints = [
                        { x: bound.left, y: bound.top },
                        { x: bound.left + bound.width, y: bound.top },
                        { x: bound.left, y: bound.top + bound.height },
                        { x: bound.left + bound.width, y: bound.top + bound.height },
                        { x: bound.left + bound.width / 2, y: bound.top },
                        { x: bound.left + bound.width / 2, y: bound.top + bound.height },
                        { x: bound.left, y: bound.top + bound.height / 2 },
                        { x: bound.left + bound.width, y: bound.top + bound.height / 2 },
                        { x: bound.left + bound.width / 2, y: bound.top + bound.height / 2 }
                    ];
                }

                if (samplePoints.length === 0) return;

                let insideCount = 0;
                for (let i = 0; i < samplePoints.length; i++) {
                    if (isPointInPolygon(samplePoints[i], poly)) {
                        insideCount++;
                    }
                }

                // Also check if any polygon vertex cuts through inside the object
                let polyInsideObj = false;
                if (insideCount === 0 && typeof obj.containsPoint === 'function') {
                    for (let v = 0; v < poly.length; v += 3) {
                        if (obj.containsPoint(poly[v])) {
                            polyInsideObj = true;
                            break;
                        }
                    }
                }

                // If no points inside and no polygon vertices cut through, object is untouched
                if (insideCount === 0 && !polyInsideObj) return;

                // Test if 100% of the object is inside the circle:
                // All sample points must be inside AND the object bounding box must be within the circle boundary
                const isEntirelyInside = (insideCount === samplePoints.length) &&
                    (bound.left >= minX - 4 && bound.left + bound.width <= maxX + 4 &&
                     bound.top >= minY - 4 && bound.top + bound.height <= maxY + 4);

                if (isEntirelyInside) {
                    // User circled the entire object: remove it completely
                    canvas.remove(obj);
                    removedCount++;
                } else {
                    // User circled ONLY A PORTION of the object:
                    // DO NOT remove the whole object! Erase only the circled portion!
                    applyErasePolygonToObject(obj, poly);
                    partialCount++;
                }
            });

            if (removedCount > 0 || partialCount > 0) {
                canvas.requestRenderAll();
                saveState();
                if (partialCount > 0) {
                    showToast(`Erased circled portion (${partialCount} object${partialCount > 1 ? 's' : ''})`);
                } else {
                    showToast(`Erased ${removedCount} object${removedCount > 1 ? 's' : ''}`);
                }
            } else {
                canvas.requestRenderAll();
            }
        }
        areaErasePoints = [];
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
        let targetX = (x !== undefined) ? x : (-vpt[4] + canvas.getWidth() / 2) / canvas.getZoom();
        let targetY = (y !== undefined) ? y : (-vpt[5] + canvas.getHeight() / 2) / canvas.getZoom();

        if (x === undefined && currentFrameRatio !== 'infinite' && slideFrameRect) {
            targetX = slideFrameRect.left + slideFrameRect.width / 2;
            targetY = slideFrameRect.top + slideFrameRect.height / 2;
        }

        const strokeWidth = strokeSize || 2;
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
        if (typeof constrainObjectToSlideFrame === 'function') constrainObjectToSlideFrame(group);
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
        const strokeWidth = strokeSize || 2;
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
        if (typeof applySlideClip === 'function') applySlideClip(line);

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
        const strokeWidth = strokeSize || 2;
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
        if (typeof applySlideClip === 'function') applySlideClip(line);
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

    canvas.on('object:moving', (e) => {
        updateConnectedLinesFor(e.target);
        if (typeof handleStepBoxMoving === 'function') handleStepBoxMoving(e.target);
        if (typeof constrainObjectToSlideFrame === 'function') constrainObjectToSlideFrame(e.target);
    });
    canvas.on('object:scaling', (e) => {
        updateConnectedLinesFor(e.target);
        if (typeof handleStepBoxScaling === 'function') handleStepBoxScaling(e.target);
        if (typeof constrainObjectToSlideFrame === 'function') constrainObjectToSlideFrame(e.target);
    });
    canvas.on('object:modified', (e) => {
        updateConnectedLinesFor(e.target);
        if (typeof handleStepBoxModified === 'function') handleStepBoxModified(e.target);
        if (typeof constrainObjectToSlideFrame === 'function') constrainObjectToSlideFrame(e.target);
    });

    // -------------------------------------------------------------------------
    // 7. Sidebar Dock & Drawer Controller
    // -------------------------------------------------------------------------
    let activeDrawerPanel = null;

    function openDrawerPanel(panelId) {
        if (panelId === 'stepbox') {
            closeDrawer();
            setMode('stepbox');
            showToast('Drag on canvas to create a Step Box');
            return;
        }

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
        } else if (panelId === 'media') {
            if (typeof renderMediaGallery === 'function') {
                renderMediaGallery();
            }
        } else if (panelId === 'layers') {
            if (typeof renderObjectsList === 'function') {
                renderObjectsList();
            }
            const objSearch = document.getElementById('objects-search');
            if (objSearch) {
                setTimeout(() => objSearch.focus(), 50);
            }
        }
    }

    function closeDrawer() {
        if (!shapesPanel) return;
        shapesPanel.classList.add('hidden');
        shapesPanel.classList.remove('open-in-slide');
        shapesPanel.classList.remove('open-floating');
        activeDrawerPanel = null;

        sidebarBtns.forEach(btn => btn.classList.remove('active'));
        if (btnToggleShapes) btnToggleShapes.classList.remove('active');
        const fsBtnObj = document.getElementById('fs-btn-objects');
        if (fsBtnObj) fsBtnObj.classList.remove('active');
        const btnTopObj = document.getElementById('btn-topbar-objects');
        if (btnTopObj) btnTopObj.classList.remove('active');
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
            if (typeof constrainObjectToSlideFrame === 'function') constrainObjectToSlideFrame(img);
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

        canvasContainer.addEventListener('mouseleave', () => {
            if (eraserCursorPreview) eraserCursorPreview.style.display = 'none';
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
        if (activeStepBox && typeof updateStepBoxFloatingControls === 'function') {
            updateStepBoxFloatingControls(activeStepBox);
        }
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
        if (activeStepBox && typeof updateStepBoxFloatingControls === 'function') {
            updateStepBoxFloatingControls(activeStepBox);
        }
    }

    btnResetView.addEventListener('click', resetView);
    zoomPercentageEl.addEventListener('click', resetView);

    // -------------------------------------------------------------------------
    // Fullscreen Toggle (Top Bar & Zoom Widget)
    // -------------------------------------------------------------------------
    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Error attempting to enable fullscreen:', err);
                showToast('Fullscreen mode not permitted by browser');
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    if (btnFullscreenToggle) {
        btnFullscreenToggle.addEventListener('click', toggleFullscreen);
    }
    if (btnZoomFullscreen) {
        btnZoomFullscreen.addEventListener('click', toggleFullscreen);
    }

    document.addEventListener('fullscreenchange', () => {
        const isFull = !!document.fullscreenElement;
        if (fullscreenIconExpand && fullscreenIconCompress) {
            fullscreenIconExpand.style.display = isFull ? 'none' : 'block';
            fullscreenIconCompress.style.display = isFull ? 'block' : 'none';
        }
        if (fullscreenBtnLabel) {
            fullscreenBtnLabel.textContent = isFull ? 'Exit' : 'Fullscreen';
        }
        if (btnFullscreenToggle) {
            btnFullscreenToggle.title = isFull ? 'Exit Fullscreen (F11 / Esc)' : 'Toggle Fullscreen (F11)';
        }
        if (btnZoomFullscreen) {
            btnZoomFullscreen.title = isFull ? 'Exit Fullscreen (F11 / Esc)' : 'Toggle Fullscreen (F11)';
        }
        showToast(isFull ? 'Entered Fullscreen' : 'Exited Fullscreen');
    });

    // -------------------------------------------------------------------------
    // Canvas Frame / Fixed Width Mode (PPTX & PDF Slide Mode)
    // -------------------------------------------------------------------------
    const SLIDE_PRESETS = {
        '16:9': {
            width: 1920,
            height: 1080,
            title: '16:9 Presentation Slide (1920 × 1080)',
            shortName: 'Slide: 16:9'
        },
        '4:3': {
            width: 1024,
            height: 768,
            title: '4:3 Standard Slide (1024 × 768)',
            shortName: 'Slide: 4:3'
        },
        'a4': {
            width: 1240,
            height: 1754,
            title: 'A4 Document Page (1240 × 1754)',
            shortName: 'Page: A4'
        }
    };

    let currentFrameRatio = 'infinite';
    let slideFrameRect = null;
    let infiniteBoardObjects = [];
    let isSlidePageFullscreen = false;

    // -------------------------------------------------------------------------
    // Multi-Slide Deck State & Navigation
    // -------------------------------------------------------------------------
    let boardSlides = [
        { id: 'slide_' + Date.now(), name: 'Slide 1', objects: [] }
    ];
    let currentSlideIndex = 0;

    function updateSlideNavigationUI() {
        if (!slideCounterBadge) return;
        const total = Math.max(1, boardSlides.length);
        const cur = Math.min(total, currentSlideIndex + 1);
        slideCounterBadge.textContent = `Slide ${cur} / ${total}`;

        if (btnPrevSlide) {
            btnPrevSlide.disabled = currentSlideIndex <= 0;
        }
        if (btnNextSlide) {
            btnNextSlide.disabled = currentSlideIndex >= boardSlides.length - 1;
        }
        if (btnDelSlide) {
            btnDelSlide.disabled = boardSlides.length <= 1;
        }
    }

    function saveCurrentSlide() {
        if (currentFrameRatio === 'infinite' || !slideFrameRect) return;
        if (!boardSlides[currentSlideIndex]) {
            boardSlides[currentSlideIndex] = {
                id: 'slide_' + Date.now(),
                name: `Slide ${currentSlideIndex + 1}`,
                objects: []
            };
        }

        // Save active step snapshot for all Step Boxes before serializing
        if (typeof saveStepBoxCurrentStep === 'function') {
            const stepBoxes = canvas.getObjects().filter(o => o.isStepBox);
            stepBoxes.forEach(sb => saveStepBoxCurrentStep(sb));
        }

        const nonFrameObjects = canvas.getObjects().filter(o => !o.isSlideFrame);
        boardSlides[currentSlideIndex].objects = nonFrameObjects.map(o => o.toJSON(EXTRA_PROPS));
    }

    function loadSlide(index) {
        if (index < 0 || index >= boardSlides.length) return;

        canvas.discardActiveObject();
        if (stepBoxFloatingBar) stepBoxFloatingBar.style.display = 'none';
        activeStepBox = null;

        const toRemove = canvas.getObjects().filter(o => !o.isSlideFrame);
        toRemove.forEach(o => canvas.remove(o));

        currentSlideIndex = index;
        const targetSlide = boardSlides[currentSlideIndex];

        if (targetSlide && Array.isArray(targetSlide.objects) && targetSlide.objects.length > 0) {
            fabric.util.enlivenObjects(targetSlide.objects, (enlivenedObjects) => {
                enlivenedObjects.forEach(obj => {
                    canvas.add(obj);
                    applySlideClip(obj);
                });
                if (slideFrameRect) {
                    canvas.sendToBack(slideFrameRect);
                }
                reconnectLoadedObjects();
                canvas.requestRenderAll();
                updateSlideNavigationUI();
                saveState();
            });
        } else {
            if (slideFrameRect) {
                canvas.sendToBack(slideFrameRect);
            }
            canvas.requestRenderAll();
            updateSlideNavigationUI();
            saveState();
        }
    }

    function addNewSlide() {
        if (currentFrameRatio === 'infinite') return;
        saveCurrentSlide();

        const newSlide = {
            id: 'slide_' + Date.now(),
            name: `Slide ${boardSlides.length + 1}`,
            objects: []
        };

        boardSlides.splice(currentSlideIndex + 1, 0, newSlide);
        loadSlide(currentSlideIndex + 1);
        showToast(`Created Slide ${currentSlideIndex + 1} of ${boardSlides.length}`);
    }

    function deleteCurrentSlide() {
        if (currentFrameRatio === 'infinite') return;
        if (boardSlides.length <= 1) {
            showToast('Presentation must have at least one slide');
            return;
        }

        if (!confirm(`Delete Slide ${currentSlideIndex + 1} of ${boardSlides.length}?`)) {
            return;
        }

        boardSlides.splice(currentSlideIndex, 1);
        if (currentSlideIndex >= boardSlides.length) {
            currentSlideIndex = boardSlides.length - 1;
        }

        loadSlide(currentSlideIndex);
        showToast(`Slide deleted. Now on Slide ${currentSlideIndex + 1}`);
    }

    function createSlideClipRect() {
        if (!slideFrameRect) return null;
        const clip = new fabric.Rect({
            left: slideFrameRect.left,
            top: slideFrameRect.top,
            width: slideFrameRect.width,
            height: slideFrameRect.height,
            originX: 'left',
            originY: 'top',
            fill: '#ffffff',
            strokeWidth: 0,
            selectable: false,
            evented: false,
            absolutePositioned: true
        });
        clip.isSlideClip = true;
        return clip;
    }

    function applySlideClip(obj) {
        if (!obj || obj.isSlideFrame) return;

        if (currentFrameRatio === 'infinite' || !slideFrameRect) {
            if (obj.clipPath && obj.clipPath.isSlideClip) {
                delete obj.clipPath;
                obj.dirty = true;
            }
            return;
        }

        const clip = createSlideClipRect();
        if (clip) {
            obj.clipPath = clip;
            obj.dirty = true;
        }
    }

    // Strict boundary constraint to prevent objects from bleeding or being dragged outside slide frame
    function constrainObjectToSlideFrame(obj) {
        if (currentFrameRatio === 'infinite' || !slideFrameRect) return;
        if (!obj || obj.isSlideFrame) return;

        // Lines and freehand drawings are clipped by applySlideClip (outside part erased).
        // Only prevent dragging them completely 100% off-screen so the user never loses them.
        if (obj.type === 'path' || obj.isFreeLine || obj.isConnector) {
            obj.setCoords();
            const bound = obj.getBoundingRect(true, true);
            const fLeft = slideFrameRect.left;
            const fTop = slideFrameRect.top;
            const fRight = fLeft + slideFrameRect.getScaledWidth();
            const fBottom = fTop + slideFrameRect.getScaledHeight();

            const minOverlap = 20;
            let dx = 0;
            let dy = 0;

            if (bound.left + bound.width < fLeft + minOverlap) {
                dx = (fLeft + minOverlap) - (bound.left + bound.width);
            } else if (bound.left > fRight - minOverlap) {
                dx = (fRight - minOverlap) - bound.left;
            }

            if (bound.top + bound.height < fTop + minOverlap) {
                dy = (fTop + minOverlap) - (bound.top + bound.height);
            } else if (bound.top > fBottom - minOverlap) {
                dy = (fBottom - minOverlap) - bound.top;
            }

            if (dx !== 0 || dy !== 0) {
                obj.left += dx;
                obj.top += dy;
                obj.setCoords();
            }
            return;
        }

        obj.setCoords();
        const bound = obj.getBoundingRect(true, true);
        const fLeft = slideFrameRect.left;
        const fTop = slideFrameRect.top;
        const fRight = fLeft + slideFrameRect.getScaledWidth();
        const fBottom = fTop + slideFrameRect.getScaledHeight();

        let dx = 0;
        let dy = 0;

        if (bound.width <= (fRight - fLeft)) {
            if (bound.left < fLeft) {
                dx = fLeft - bound.left;
            } else if (bound.left + bound.width > fRight) {
                dx = fRight - (bound.left + bound.width);
            }
        } else {
            dx = fLeft - bound.left;
        }

        if (bound.height <= (fBottom - fTop)) {
            if (bound.top < fTop) {
                dy = fTop - bound.top;
            } else if (bound.top + bound.height > fBottom) {
                dy = fBottom - (bound.top + bound.height);
            }
        } else {
            dy = fTop - bound.top;
        }

        if (dx !== 0 || dy !== 0) {
            obj.left += dx;
            obj.top += dy;
            obj.setCoords();
        }
    }

    function attachSlideFrameRendering(frame) {
        if (!frame) return;
        frame._render = function(ctx) {
            fabric.Rect.prototype._render.call(this, ctx);

            ctx.save();
            const w = this.width;
            const h = this.height;
            const halfW = w / 2;
            const halfH = h / 2;

            // Subtle slide grid lines
            ctx.strokeStyle = '#f1f5f9';
            ctx.lineWidth = 1;
            ctx.beginPath();
            const step = 48;
            for (let x = -halfW + step; x < halfW; x += step) {
                ctx.moveTo(x, -halfH);
                ctx.lineTo(x, halfH);
            }
            for (let y = -halfH + step; y < halfH; y += step) {
                ctx.moveTo(-halfW, y);
                ctx.lineTo(halfW, y);
            }
            ctx.stroke();

            // Slide top tab badge
            const ratio = this.slideFrameRatio || '16:9';
            const preset = SLIDE_PRESETS[ratio] || SLIDE_PRESETS['16:9'];
            const label = preset.title;

            ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
            const textWidth = ctx.measureText(label).width;
            const tabW = textWidth + 28;
            const tabH = 26;
            const tabX = -halfW;
            const tabY = -halfH - tabH;

            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(tabX, tabY, tabW, tabH, [6, 6, 0, 0]);
            } else {
                ctx.rect(tabX, tabY, tabW, tabH);
            }
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, tabX + 12, tabY + tabH / 2);

            ctx.restore();
        };
    }

    function createSlideFrame(ratio = '16:9') {
        const preset = SLIDE_PRESETS[ratio] || SLIDE_PRESETS['16:9'];

        let frame = canvas.getObjects().find(o => o.isSlideFrame);
        if (frame) {
            frame.set({
                width: preset.width,
                height: preset.height,
                slideFrameRatio: ratio
            });
            attachSlideFrameRendering(frame);
            frame.dirty = true;
            return frame;
        }

        const activeBoard = (Array.isArray(boards) ? boards.find(b => b.id === activeBoardId) : null);
        const bgColor = (activeBoard && (activeBoard.bg_color || activeBoard.bgColor)) ? (activeBoard.bg_color || activeBoard.bgColor) : '#ffffff';

        frame = new fabric.Rect({
            left: 100,
            top: 100,
            width: preset.width,
            height: preset.height,
            fill: bgColor || '#ffffff',
            stroke: '#94a3b8',
            strokeWidth: 2,
            rx: 6,
            ry: 6,
            selectable: false,
            evented: false,
            isSlideFrame: true,
            slideFrameRatio: ratio,
            shadow: new fabric.Shadow({
                color: 'rgba(15, 23, 42, 0.22)',
                blur: 32,
                offsetX: 0,
                offsetY: 10
            })
        });

        attachSlideFrameRendering(frame);
        canvas.add(frame);
        canvas.sendToBack(frame);
        return frame;
    }

    function fitSlideToWindow() {
        const frame = canvas.getObjects().find(o => o.isSlideFrame);
        if (!frame) return;

        const isFs = document.body.classList.contains('slide-page-fullscreen');
        const padX = isFs ? 30 : 100;
        const padY = isFs ? 80 : 140;
        const zoomX = (canvas.getWidth() - padX) / frame.width;
        const zoomY = (canvas.getHeight() - padY) / frame.height;
        const newZoom = Math.max(0.12, Math.min(3.0, Math.min(zoomX, zoomY)));

        canvas.setZoom(newZoom);
        const center = frame.getCenterPoint();
        canvas.viewportTransform[4] = canvas.getWidth() / 2 - center.x * newZoom;
        canvas.viewportTransform[5] = canvas.getHeight() / 2 - center.y * newZoom;
        canvas.requestRenderAll();
        updateGrid();
        updateZoomDisplay();
        if (activeStepBox && typeof updateStepBoxFloatingControls === 'function') {
            updateStepBoxFloatingControls(activeStepBox);
        }
    }

    function toggleSlidePageFullscreen(forceState) {
        if (forceState !== undefined) {
            isSlidePageFullscreen = !!forceState;
        } else {
            isSlidePageFullscreen = !isSlidePageFullscreen;
        }

        if (isSlidePageFullscreen) {
            document.body.classList.add('slide-page-fullscreen');
            if (slideFsIconExpand) slideFsIconExpand.style.display = 'none';
            if (slideFsIconCompress) slideFsIconCompress.style.display = 'inline-block';
            if (slideFsBtnLabel) slideFsBtnLabel.textContent = 'Exit Fullscreen';

            canvas.setWidth(window.innerWidth);
            canvas.setHeight(window.innerHeight);
            canvas.renderAll();
            updateGrid();
            fitSlideToWindow();
            showToast('Page Fullscreen View (Press Esc to exit)');
        } else {
            document.body.classList.remove('slide-page-fullscreen');
            if (slideFsIconExpand) slideFsIconExpand.style.display = 'inline-block';
            if (slideFsIconCompress) slideFsIconCompress.style.display = 'none';
            if (slideFsBtnLabel) slideFsBtnLabel.textContent = 'Page Fullscreen';

            canvas.setWidth(window.innerWidth);
            canvas.setHeight(window.innerHeight);
            canvas.renderAll();
            updateGrid();
            fitSlideToWindow();
            showToast('Exited Fullscreen View');
        }
    }

    function openExitSlideModal() {
        if (modalExitSlide) {
            modalExitSlide.classList.remove('hidden');
            modalExitSlide.setAttribute('aria-hidden', 'false');
        }
    }

    function closeExitSlideModal() {
        if (modalExitSlide) {
            modalExitSlide.classList.add('hidden');
            modalExitSlide.setAttribute('aria-hidden', 'true');
        }
    }

    function executeExitSlideMode(shouldSave) {
        if (shouldSave) {
            saveCurrentSlide();
            showToast('Saved slide presentation to board');
        } else {
            // Discard/delete the slide content
            boardSlides = [
                { id: 'slide_' + Date.now(), name: 'Slide 1', objects: [] }
            ];
            currentSlideIndex = 0;
            showToast('Discarded slide deck content');
        }

        if (isSlidePageFullscreen) {
            toggleSlidePageFullscreen(false);
        }

        // Clean up canvas slide mode
        currentFrameRatio = 'infinite';
        document.body.classList.remove('slide-mode-active');
        if (slideFrameBanner) slideFrameBanner.classList.add('hidden');
        if (frameModeLabel) frameModeLabel.textContent = 'Canvas: Infinite';
        if (frameMenuItems) {
            frameMenuItems.forEach(item => {
                item.classList.toggle('active', item.getAttribute('data-ratio') === 'infinite');
            });
        }

        // Remove all current slide objects and slide frame from canvas
        canvas.discardActiveObject();
        if (stepBoxFloatingBar) stepBoxFloatingBar.style.display = 'none';
        activeStepBox = null;

        const allCanvasObjs = canvas.getObjects().slice();
        allCanvasObjs.forEach(o => canvas.remove(o));
        slideFrameRect = null;

        // Restore Infinite Board objects
        if (Array.isArray(infiniteBoardObjects) && infiniteBoardObjects.length > 0) {
            fabric.util.enlivenObjects(infiniteBoardObjects, (enlivenedObjects) => {
                enlivenedObjects.forEach(obj => {
                    if (obj.clipPath && obj.clipPath.isSlideClip) {
                        delete obj.clipPath;
                        obj.dirty = true;
                    }
                    canvas.add(obj);
                });
                reconnectLoadedObjects();
                canvas.requestRenderAll();
                updateSelectionUI();
                saveState();
                saveActiveBoardToServer(true);
            });
        } else {
            canvas.requestRenderAll();
            updateSelectionUI();
            saveState();
            saveActiveBoardToServer(true);
        }

        closeExitSlideModal();
        showToast('Returned to Infinite Canvas');
    }

    function switchFrameMode(ratio) {
        if (ratio === 'infinite') {
            if (currentFrameRatio !== 'infinite') {
                openExitSlideModal();
            }
            return;
        }

        // Switching from Infinite Canvas to a Slide Ratio
        if (currentFrameRatio === 'infinite') {
            // 1. Snapshot current infinite board objects
            const nonFrameObjects = canvas.getObjects().filter(o => !o.isSlideFrame);
            infiniteBoardObjects = nonFrameObjects.map(o => o.toJSON(EXTRA_PROPS));

            // 2. Clear canvas of infinite board objects
            canvas.discardActiveObject();
            if (stepBoxFloatingBar) stepBoxFloatingBar.style.display = 'none';
            activeStepBox = null;
            const toRemove = canvas.getObjects().slice();
            toRemove.forEach(o => canvas.remove(o));

            currentFrameRatio = ratio;
            document.body.classList.add('slide-mode-active');
            const preset = SLIDE_PRESETS[ratio] || SLIDE_PRESETS['16:9'];
            if (slideFrameBanner) {
                slideFrameBanner.classList.remove('hidden');
                if (slideFrameTitle) slideFrameTitle.textContent = preset.title;
            }
            if (frameModeLabel) {
                frameModeLabel.textContent = preset.shortName;
            }
            if (frameMenuItems) {
                frameMenuItems.forEach(item => {
                    item.classList.toggle('active', item.getAttribute('data-ratio') === ratio);
                });
            }

            // 3. Create slide frame rect
            slideFrameRect = createSlideFrame(ratio);
            canvas.sendToBack(slideFrameRect);

            // 4. Load active slide
            if (!boardSlides || boardSlides.length === 0) {
                boardSlides = [
                    { id: 'slide_' + Date.now(), name: 'Slide 1', objects: [] }
                ];
                currentSlideIndex = 0;
            }
            loadSlide(currentSlideIndex);
            fitSlideToWindow();
            showToast(`Switched to ${preset.title}`);
        } else {
            // Already in slide mode, just switching slide aspect ratio (e.g. 16:9 -> 4:3)
            currentFrameRatio = ratio;
            const preset = SLIDE_PRESETS[ratio] || SLIDE_PRESETS['16:9'];
            if (frameModeLabel) frameModeLabel.textContent = preset.shortName;
            if (slideFrameTitle) slideFrameTitle.textContent = preset.title;
            if (frameMenuItems) {
                frameMenuItems.forEach(item => {
                    item.classList.toggle('active', item.getAttribute('data-ratio') === ratio);
                });
            }
            slideFrameRect = createSlideFrame(ratio);
            canvas.sendToBack(slideFrameRect);
            // Reapply clipping with new frame bounds
            canvas.forEachObject(o => {
                if (!o.isSlideFrame) applySlideClip(o);
            });
            fitSlideToWindow();
            showToast(`Aspect ratio set to ${preset.title}`);
        }

        canvas.requestRenderAll();
        saveState();
    }

    if (btnPrevSlide) {
        btnPrevSlide.addEventListener('click', () => {
            if (currentSlideIndex > 0) {
                saveCurrentSlide();
                loadSlide(currentSlideIndex - 1);
            }
        });
    }

    if (btnNextSlide) {
        btnNextSlide.addEventListener('click', () => {
            if (currentSlideIndex < boardSlides.length - 1) {
                saveCurrentSlide();
                loadSlide(currentSlideIndex + 1);
            }
        });
    }

    if (btnAddSlide) {
        btnAddSlide.addEventListener('click', addNewSlide);
    }

    if (btnDelSlide) {
        btnDelSlide.addEventListener('click', deleteCurrentSlide);
    }

    if (btnSlideFullscreen) {
        btnSlideFullscreen.addEventListener('click', () => {
            toggleSlidePageFullscreen();
        });
    }

    if (btnExitSlideMode) {
        btnExitSlideMode.addEventListener('click', () => {
            if (currentFrameRatio !== 'infinite') {
                openExitSlideModal();
            }
        });
    }

    if (btnSlideSaveExit) {
        btnSlideSaveExit.addEventListener('click', () => {
            executeExitSlideMode(true);
        });
    }

    if (btnSlideDiscardExit) {
        btnSlideDiscardExit.addEventListener('click', () => {
            executeExitSlideMode(false);
        });
    }

    if (btnSlideCancelExit) {
        btnSlideCancelExit.addEventListener('click', () => {
            closeExitSlideModal();
        });
    }

    if (btnCloseExitSlide) {
        btnCloseExitSlide.addEventListener('click', () => {
            closeExitSlideModal();
        });
    }

    if (btnFrameMode) {
        btnFrameMode.addEventListener('click', (e) => {
            e.stopPropagation();
            if (frameModeDropdown) {
                frameModeDropdown.classList.toggle('hidden');
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (frameModeDropdown && !frameModeDropdown.classList.contains('hidden')) {
            if (!e.target.closest('.frame-mode-container')) {
                frameModeDropdown.classList.add('hidden');
            }
        }
    });

    if (frameMenuItems) {
        frameMenuItems.forEach(item => {
            item.addEventListener('click', () => {
                const ratio = item.getAttribute('data-ratio');
                if (frameModeDropdown) frameModeDropdown.classList.add('hidden');
                switchFrameMode(ratio);
            });
        });
    }

    if (btnFitSlide) {
        btnFitSlide.addEventListener('click', fitSlideToWindow);
    }

    // -------------------------------------------------------------------------
    // Download / Export Menu Handlers
    // -------------------------------------------------------------------------
    if (btnDownloadMenu) {
        btnDownloadMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            if (downloadDropdown) {
                downloadDropdown.classList.toggle('hidden');
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (downloadDropdown && !downloadDropdown.classList.contains('hidden')) {
            if (!e.target.closest('.download-menu-container')) {
                downloadDropdown.classList.add('hidden');
            }
        }
    });

    if (btnDownloadPptx) {
        btnDownloadPptx.addEventListener('click', () => {
            exportAsPPTX();
        });
    }
    if (btnDownloadPdf) {
        btnDownloadPdf.addEventListener('click', () => {
            exportAsPDF();
        });
    }
    if (btnDownloadPng) {
        btnDownloadPng.addEventListener('click', () => {
            exportCanvasAsPNG();
        });
    }
    if (btnDownloadSvg) {
        btnDownloadSvg.addEventListener('click', () => {
            exportCanvasAsSVG();
        });
    }
    if (btnDownloadJson) {
        btnDownloadJson.addEventListener('click', () => {
            if (downloadDropdown) downloadDropdown.classList.add('hidden');
            if (activeBoardId) {
                downloadBoard(activeBoardId);
            }
        });
    }

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

        if (btnSidebarStepbox) {
            btnSidebarStepbox.classList.toggle('active', mode === 'stepbox');
        }

        if (fsBtnPen) fsBtnPen.classList.toggle('active', mode === 'pen');
        if (fsBtnPaint) fsBtnPaint.classList.toggle('active', mode === 'highlighter');
        if (fsBtnEraser) fsBtnEraser.classList.toggle('active', mode === 'eraser');
        if (fsBtnSelect) fsBtnSelect.classList.toggle('active', mode === 'select');

        if (mode !== 'eraser') {
            if (propEraserGroup) propEraserGroup.style.display = 'none';
            if (eraserCursorPreview) eraserCursorPreview.style.display = 'none';
            if (propSizeGroup) {
                propSizeGroup.style.display = 'none';
            }
            if (fsEraserModeGroup) fsEraserModeGroup.style.display = 'none';
            if (fsSizeDisplay) fsSizeDisplay.textContent = strokeSize + 'px';
            if (fsSizeSlider) {
                fsSizeSlider.min = '1';
                fsSizeSlider.max = '64';
                fsSizeSlider.value = strokeSize;
            }
        } else {
            if (propEraserGroup) propEraserGroup.style.display = 'none';
            if (propSizeGroup) propSizeGroup.style.display = 'none';
            if (fsEraserModeGroup) fsEraserModeGroup.style.display = 'flex';
            if (fsSizeDisplay) fsSizeDisplay.textContent = eraserSize + 'px';
            if (fsSizeSlider) {
                fsSizeSlider.min = '6';
                fsSizeSlider.max = '150';
                fsSizeSlider.value = eraserSize;
            }
        }

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
            });
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'none';
            if (propSizeGroup) propSizeGroup.style.display = 'none';
            if (propEraserGroup) propEraserGroup.style.display = 'none';
            setEraserSubMode(eraserSubMode);
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
        } else if (mode === 'stepbox') {
            canvas.isDrawingMode = false;
            canvas.selection = false;
            canvas.discardActiveObject();
            canvas.defaultCursor = 'crosshair';
            canvas.forEachObject(obj => {
                obj.selectable = false;
            });
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'none';
            canvas.renderAll();
        }
    }

    if (btnSelect) btnSelect.addEventListener('click', () => setMode('select'));
    if (btnPan) btnPan.addEventListener('click', () => setMode('pan'));
    if (btnPen) btnPen.addEventListener('click', () => setMode('pen'));
    if (btnHighlighter) btnHighlighter.addEventListener('click', () => setMode('highlighter'));
    if (btnEraser) btnEraser.addEventListener('click', () => setMode('eraser'));
    if (btnText) btnText.addEventListener('click', () => setMode('text'));
    if (btnSticky && btnSticky !== btnSidebarNotes) btnSticky.addEventListener('click', () => setMode('sticky'));
    if (btnLine) btnLine.addEventListener('click', () => setMode('line'));
    if (btnArrow) btnArrow.addEventListener('click', () => setMode('arrow'));

    // Fullscreen Presenter Controls Listeners (Bottom Right)
    if (fsBtnPen) {
        fsBtnPen.addEventListener('click', () => {
            setMode('pen');
            if (fsEraserPopover) fsEraserPopover.classList.add('hidden');
            if (fsColorPopover) fsColorPopover.classList.add('hidden');
        });
    }

    if (fsBtnPaint) {
        fsBtnPaint.addEventListener('click', () => {
            setMode('highlighter');
            if (fsEraserPopover) fsEraserPopover.classList.add('hidden');
            if (fsColorPopover) fsColorPopover.classList.add('hidden');
        });
    }

    if (fsBtnEraser) {
        fsBtnEraser.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentMode !== 'eraser') {
                setMode('eraser');
            } else {
                setEraserSubMode(eraserSubMode === 'brush' ? 'area' : 'brush');
            }
            if (fsColorPopover) fsColorPopover.classList.add('hidden');
            if (fsEraserPopover) fsEraserPopover.classList.add('hidden');
        });
    }

    if (fsBtnColor) {
        fsBtnColor.addEventListener('click', (e) => {
            e.stopPropagation();
            if (fsEraserPopover) fsEraserPopover.classList.add('hidden');
            if (fsColorPopover) fsColorPopover.classList.toggle('hidden');
        });
    }

    if (fsBtnSelect) {
        fsBtnSelect.addEventListener('click', () => {
            setMode('select');
            if (fsEraserPopover) fsEraserPopover.classList.add('hidden');
            if (fsColorPopover) fsColorPopover.classList.add('hidden');
        });
    }

    if (fsSubEraserBrush) {
        fsSubEraserBrush.addEventListener('click', () => {
            setEraserSubMode('brush');
        });
    }

    if (fsSubEraserArea) {
        fsSubEraserArea.addEventListener('click', () => {
            setEraserSubMode('area');
        });
    }

    if (fsBtnSizeDec) {
        fsBtnSizeDec.addEventListener('click', () => {
            if (currentMode === 'eraser') {
                setEraserSize(eraserSize - 6);
            } else {
                setStrokeSize(strokeSize - 1);
            }
        });
    }

    if (fsBtnSizeInc) {
        fsBtnSizeInc.addEventListener('click', () => {
            if (currentMode === 'eraser') {
                setEraserSize(eraserSize + 6);
            } else {
                setStrokeSize(strokeSize + 1);
            }
        });
    }

    if (fsSizeSlider) {
        fsSizeSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            if (currentMode === 'eraser') {
                setEraserSize(val);
            } else {
                setStrokeSize(val);
            }
        });
    }

    if (fsBtnEraserDec) {
        fsBtnEraserDec.addEventListener('click', () => {
            setEraserSize(eraserSize - 6);
        });
    }

    if (fsBtnEraserInc) {
        fsBtnEraserInc.addEventListener('click', () => {
            setEraserSize(eraserSize + 6);
        });
    }

    if (fsColorSwatches) {
        fsColorSwatches.forEach(swatch => {
            swatch.addEventListener('click', (e) => {
                e.stopPropagation();
                const col = swatch.getAttribute('data-color');
                if (col) {
                    updateActiveDrawingColor(col);
                    if (fsColorPopover) fsColorPopover.classList.add('hidden');
                    showToast(`Color: ${col}`);
                }
            });
        });
    }

    if (fsColorInput) {
        fsColorInput.addEventListener('input', (e) => {
            updateActiveDrawingColor(e.target.value);
        });
        fsColorInput.addEventListener('change', (e) => {
            updateActiveDrawingColor(e.target.value);
            if (fsColorPopover) fsColorPopover.classList.add('hidden');
        });
    }

    // Top Property Bar Stroke Size Listeners
    if (btnStrokeSizeDec) btnStrokeSizeDec.addEventListener('click', () => setStrokeSize(strokeSize - 1));
    if (btnStrokeSizeInc) btnStrokeSizeInc.addEventListener('click', () => setStrokeSize(strokeSize + 1));
    if (sliderStrokeSize) {
        sliderStrokeSize.addEventListener('input', (e) => {
            setStrokeSize(parseInt(e.target.value, 10));
        });
    }

    // Top Property Bar Eraser Controls Listeners
    if (btnEraserModeBrush) btnEraserModeBrush.addEventListener('click', () => setEraserSubMode('brush'));
    if (btnEraserModeArea) btnEraserModeArea.addEventListener('click', () => setEraserSubMode('area'));
    if (btnEraserSizeDec) btnEraserSizeDec.addEventListener('click', () => setEraserSize(eraserSize - 6));
    if (btnEraserSizeInc) btnEraserSizeInc.addEventListener('click', () => setEraserSize(eraserSize + 6));
    if (sliderEraserSize) {
        sliderEraserSize.addEventListener('input', (e) => {
            setEraserSize(parseInt(e.target.value, 10));
        });
    }

    // Dismiss fullscreen popovers when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.fs-tool-container')) {
            if (fsEraserPopover) fsEraserPopover.classList.add('hidden');
            if (fsColorPopover) fsColorPopover.classList.add('hidden');
        }
    });

    // -------------------------------------------------------------------------
    // Movable Floating Presenter / Tool Dock (Draggable anywhere on canvas)
    // -------------------------------------------------------------------------
    function initMovablePresenterBar() {
        if (!fsPresenterBar) return;
        const dragHandle = document.getElementById('fs-presenter-drag-handle');
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        function updatePopoverPlacement(topPos) {
            if (topPos < 220) {
                fsPresenterBar.classList.add('popover-bottom');
            } else {
                fsPresenterBar.classList.remove('popover-bottom');
            }
        }

        function onPointerDown(e) {
            // Only primary mouse button or touch/stylus
            if (e.button !== undefined && e.button !== 0) return;

            // Do not drag if user clicked interactive buttons/inputs/swatches
            if (!e.target.closest('#fs-presenter-drag-handle') &&
                e.target.closest('button, input, select, .fs-popover, .fs-swatches-grid')) {
                return;
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = fsPresenterBar.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            fsPresenterBar.style.position = 'fixed';
            fsPresenterBar.style.bottom = 'auto';
            fsPresenterBar.style.right = 'auto';
            fsPresenterBar.style.left = initialLeft + 'px';
            fsPresenterBar.style.top = initialTop + 'px';
            fsPresenterBar.dataset.dragged = 'true';
            fsPresenterBar.classList.add('is-dragging');

            updatePopoverPlacement(initialTop);

            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);

            e.preventDefault();
        }

        function onPointerMove(e) {
            if (!isDragging) return;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            let newLeft = initialLeft + deltaX;
            let newTop = initialTop + deltaY;

            const barWidth = fsPresenterBar.offsetWidth || 340;
            const barHeight = fsPresenterBar.offsetHeight || 50;
            const maxLeft = window.innerWidth - barWidth - 10;
            const maxTop = window.innerHeight - barHeight - 10;

            newLeft = Math.max(10, Math.min(maxLeft, newLeft));
            newTop = Math.max(10, Math.min(maxTop, newTop));

            fsPresenterBar.style.left = newLeft + 'px';
            fsPresenterBar.style.top = newTop + 'px';

            updatePopoverPlacement(newTop);

            e.preventDefault();
        }

        function onPointerUp() {
            if (!isDragging) return;
            isDragging = false;
            fsPresenterBar.classList.remove('is-dragging');

            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
        }

        if (dragHandle) {
            dragHandle.addEventListener('pointerdown', onPointerDown);
        }
        fsPresenterBar.addEventListener('pointerdown', onPointerDown);

        window.addEventListener('resize', () => {
            if (fsPresenterBar.dataset.dragged === 'true' && fsPresenterBar.style.left) {
                const rect = fsPresenterBar.getBoundingClientRect();
                const maxLeft = window.innerWidth - rect.width - 10;
                const maxTop = window.innerHeight - rect.height - 10;
                if (rect.left > maxLeft) fsPresenterBar.style.left = Math.max(10, maxLeft) + 'px';
                if (rect.top > maxTop) {
                    const clampedTop = Math.max(10, maxTop);
                    fsPresenterBar.style.top = clampedTop + 'px';
                    updatePopoverPlacement(clampedTop);
                }
            }
        });
    }

    initMovablePresenterBar();

    // -------------------------------------------------------------------------
    // Panel Minimize & Three Floating Restore Buttons System
    // (Top Header Toolbar, Left Sidebar, Bottom Presenter/Drawing Dock)
    // -------------------------------------------------------------------------
    function initPanelMinimizeSystem() {
        // 1. Top Bar Elements
        const btnMinimizeTopBar = document.getElementById('btn-minimize-top-bar');
        const btnRestoreTopBar = document.getElementById('btn-restore-top-bar');
        const topBarContainer = document.querySelector('.top-bar-container');

        // 2. Left Sidebar Elements
        const btnMinimizeLeftSidebar = document.getElementById('btn-minimize-left-sidebar');
        const btnRestoreLeftSidebar = document.getElementById('btn-restore-left-sidebar');
        const leftSidebarNav = document.getElementById('left-sidebar');

        // 3. Bottom Presenter / Drawing Dock Elements
        const fsBtnMinimizeDock = document.getElementById('fs-btn-minimize-dock');
        const btnRestoreBottomDock = document.getElementById('btn-restore-bottom-dock');

        // Top Toolbar Minimize & Restore
        if (btnMinimizeTopBar && topBarContainer && btnRestoreTopBar) {
            btnMinimizeTopBar.addEventListener('click', (e) => {
                e.stopPropagation();
                topBarContainer.classList.add('minimized-top-bar');
                btnRestoreTopBar.classList.remove('hidden');
                if (typeof showToast === 'function') showToast('Top toolbar minimized');
            });

            btnRestoreTopBar.addEventListener('click', (e) => {
                e.stopPropagation();
                topBarContainer.classList.remove('minimized-top-bar');
                btnRestoreTopBar.classList.add('hidden');
            });
        }

        // Left Sidebar Minimize & Restore
        if (btnMinimizeLeftSidebar && leftSidebarNav && btnRestoreLeftSidebar) {
            btnMinimizeLeftSidebar.addEventListener('click', (e) => {
                e.stopPropagation();
                leftSidebarNav.classList.add('minimized-sidebar');
                if (typeof closeDrawer === 'function') closeDrawer();
                btnRestoreLeftSidebar.classList.remove('hidden');
                if (typeof showToast === 'function') showToast('Sidebar minimized');
            });

            btnRestoreLeftSidebar.addEventListener('click', (e) => {
                e.stopPropagation();
                leftSidebarNav.classList.remove('minimized-sidebar');
                btnRestoreLeftSidebar.classList.add('hidden');
            });
        }

        // Bottom Drawing Dock Minimize & Restore
        if (fsBtnMinimizeDock && fsPresenterBar && btnRestoreBottomDock) {
            fsBtnMinimizeDock.addEventListener('click', (e) => {
                e.stopPropagation();
                if (fsEraserPopover) fsEraserPopover.classList.add('hidden');
                if (fsColorPopover) fsColorPopover.classList.add('hidden');
                fsPresenterBar.classList.add('minimized-dock');

                // Place restore button at bottom-right or near dock position
                if (fsPresenterBar.dataset.dragged === 'true' && fsPresenterBar.style.left && fsPresenterBar.style.left !== 'auto') {
                    btnRestoreBottomDock.style.left = fsPresenterBar.style.left;
                    btnRestoreBottomDock.style.top = fsPresenterBar.style.top;
                    btnRestoreBottomDock.style.bottom = 'auto';
                    btnRestoreBottomDock.style.right = 'auto';
                } else {
                    btnRestoreBottomDock.style.left = 'auto';
                    btnRestoreBottomDock.style.top = 'auto';
                    btnRestoreBottomDock.style.bottom = '24px';
                    btnRestoreBottomDock.style.right = '28px';
                }

                btnRestoreBottomDock.classList.remove('hidden');
                if (typeof showToast === 'function') showToast('Drawing dock minimized');
            });

            btnRestoreBottomDock.addEventListener('click', (e) => {
                e.stopPropagation();
                fsPresenterBar.classList.remove('minimized-dock');
                btnRestoreBottomDock.classList.add('hidden');
            });
        }
    }

    initPanelMinimizeSystem();

    // -------------------------------------------------------------------------
    // Dark Mode Theme System (with localStorage persistence)
    // -------------------------------------------------------------------------
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const themeIconMoon = document.getElementById('theme-icon-moon');
    const themeIconSun = document.getElementById('theme-icon-sun');
    const themeBtnLabel = document.getElementById('theme-btn-label');

    function applyTheme(theme, save = true) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-theme', isDark);
        document.documentElement.setAttribute('data-theme', theme);

        if (themeIconMoon && themeIconSun) {
            themeIconMoon.style.display = isDark ? 'none' : 'block';
            themeIconSun.style.display = isDark ? 'block' : 'none';
        }
        if (themeBtnLabel) {
            themeBtnLabel.textContent = isDark ? 'Dark' : 'Theme';
        }

        if (save) {
            try {
                localStorage.setItem('whiteboard_theme', theme);
            } catch (e) {}
        }
    }

    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            const currentIsDark = document.body.classList.contains('dark-theme');
            const newTheme = currentIsDark ? 'light' : 'dark';
            applyTheme(newTheme, true);
            showToast(newTheme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled');
        });
    }

    // Load saved theme on boot
    const savedTheme = localStorage.getItem('whiteboard_theme') || 'light';
    applyTheme(savedTheme, false);

    // -------------------------------------------------------------------------
    // Image Upload & Media Management System (PNG, JPG, SVG onto Canvas)
    // -------------------------------------------------------------------------
    const mediaFileInput = document.getElementById('media-file-input');
    const btnBrowseMedia = document.getElementById('btn-browse-media');
    const mediaUploadBox = document.getElementById('media-upload-box');
    const mediaGalleryEl = document.getElementById('media-gallery');
    const mediaCountBadge = document.getElementById('media-count-badge');

    let uploadedMediaList = [];
    try {
        const storedMedia = localStorage.getItem('whiteboard_uploaded_media');
        if (storedMedia) uploadedMediaList = JSON.parse(storedMedia);
    } catch (e) {
        uploadedMediaList = [];
    }

    function saveUploadedMedia() {
        try {
            // Keep recent 20 uploads in localStorage
            const trimmed = uploadedMediaList.slice(0, 20);
            localStorage.setItem('whiteboard_uploaded_media', JSON.stringify(trimmed));
        } catch (e) {
            console.warn('Could not save media to localStorage:', e);
        }
    }

    function renderMediaGallery() {
        if (!mediaGalleryEl) return;
        mediaGalleryEl.innerHTML = '';

        if (!uploadedMediaList || uploadedMediaList.length === 0) {
            if (mediaCountBadge) mediaCountBadge.textContent = '0';
            const emptyEl = document.createElement('div');
            emptyEl.id = 'empty-media-msg';
            emptyEl.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 20px 10px; color: var(--text-muted); font-size: 11px;';
            emptyEl.innerHTML = 'No images uploaded yet.<br>Click "Browse" or drop images to add them.';
            mediaGalleryEl.appendChild(emptyEl);
            return;
        }

        if (mediaCountBadge) mediaCountBadge.textContent = String(uploadedMediaList.length);

        uploadedMediaList.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'media-thumb-card';
            card.title = `Click to add "${item.name}" to canvas`;

            const img = document.createElement('img');
            img.src = item.url;
            img.alt = item.name;
            img.className = 'media-thumb-img';

            const name = document.createElement('span');
            name.className = 'media-thumb-name';
            name.textContent = item.name;

            const btnDel = document.createElement('button');
            btnDel.className = 'media-thumb-delete';
            btnDel.innerHTML = '&times;';
            btnDel.title = 'Remove from uploaded list';
            btnDel.addEventListener('click', (e) => {
                e.stopPropagation();
                uploadedMediaList.splice(idx, 1);
                saveUploadedMedia();
                renderMediaGallery();
            });

            card.appendChild(img);
            card.appendChild(name);
            card.appendChild(btnDel);

            card.addEventListener('click', () => {
                addImageToCanvas(item.url, null, null, item.name);
            });

            mediaGalleryEl.appendChild(card);
        });
    }

    function addImageToCanvas(dataUrl, targetX, targetY, fileName) {
        if (!dataUrl) return;

        fabric.Image.fromURL(dataUrl, (img) => {
            if (!img) {
                showToast('Failed to load image onto canvas');
                return;
            }

            // Calculate viewport placement if coordinates not provided
            let posX = targetX;
            let posY = targetY;

            if (posX === null || posX === undefined || posY === null || posY === undefined) {
                if (currentFrameRatio !== 'infinite' && slideFrameRect) {
                    posX = slideFrameRect.left + slideFrameRect.getScaledWidth() / 2;
                    posY = slideFrameRect.top + slideFrameRect.getScaledHeight() / 2;
                } else {
                    const vpt = canvas.viewportTransform;
                    const zoom = canvas.getZoom() || 1;
                    posX = (-vpt[4] + canvas.getWidth() / 2) / zoom;
                    posY = (-vpt[5] + canvas.getHeight() / 2) / zoom;
                }
            }

            // Scale image proportionally so it fits nicely
            const maxW = Math.min(canvas.getWidth() * 0.65, 600);
            const maxH = Math.min(canvas.getHeight() * 0.65, 500);
            const imgW = img.width || 400;
            const imgH = img.height || 300;
            const scale = Math.min(maxW / imgW, maxH / imgH, 1);

            img.set({
                left: posX,
                top: posY,
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
                shapeUid: generateUid(),
                imageName: fileName || 'Uploaded Image'
            });

            img.connectedLines = [];
            canvas.add(img);

            if (typeof constrainObjectToSlideFrame === 'function') {
                constrainObjectToSlideFrame(img);
            }

            setMode('select');
            canvas.setActiveObject(img);
            canvas.renderAll();
            saveState();
            showToast(`Added image: "${fileName || 'Image'}"`);

            // Also register in recent uploaded media if not already present
            const exists = uploadedMediaList.some(m => m.name === fileName && m.url === dataUrl);
            if (!exists) {
                uploadedMediaList.unshift({
                    name: fileName || 'Uploaded Image',
                    url: dataUrl
                });
                saveUploadedMedia();
                renderMediaGallery();
            }
        });
    }

    function processImageFiles(files, dropX, dropY) {
        if (!files || files.length === 0) return;
        Array.from(files).forEach((file) => {
            const isValid = file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|svg|webp|gif)$/i);
            if (!isValid) {
                showToast(`Skipped non-image file: ${file.name}`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                addImageToCanvas(dataUrl, dropX, dropY, file.name);
            };
            reader.readAsDataURL(file);
        });
    }

    if (btnBrowseMedia && mediaFileInput) {
        btnBrowseMedia.addEventListener('click', () => {
            mediaFileInput.value = '';
            mediaFileInput.click();
        });
    }

    if (mediaUploadBox && mediaFileInput) {
        mediaUploadBox.addEventListener('click', (e) => {
            if (e.target !== btnBrowseMedia) {
                mediaFileInput.value = '';
                mediaFileInput.click();
            }
        });

        mediaUploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mediaUploadBox.style.borderColor = 'var(--primary-color)';
        });

        mediaUploadBox.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mediaUploadBox.style.borderColor = '';
        });

        mediaUploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mediaUploadBox.style.borderColor = '';
            if (e.dataTransfer && e.dataTransfer.files) {
                processImageFiles(e.dataTransfer.files, null, null);
            }
        });
    }

    if (mediaFileInput) {
        mediaFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                processImageFiles(e.target.files, null, null);
            }
        });
    }

    // Drag and drop image files directly onto canvas
    if (canvasContainer) {
        canvasContainer.addEventListener('dragover', (e) => {
            if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                e.preventDefault();
                canvasContainer.classList.add('drag-over-active');
            }
        });

        canvasContainer.addEventListener('dragleave', () => {
            canvasContainer.classList.remove('drag-over-active');
        });

        canvasContainer.addEventListener('drop', (e) => {
            canvasContainer.classList.remove('drag-over-active');
            if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const pointer = canvas.getPointer(e);
                processImageFiles(e.dataTransfer.files, pointer.x, pointer.y);
                e.preventDefault();
            }
        });
    }

    // Paste image from system clipboard (e.g. Snipping tool / screenshots)
    window.addEventListener('paste', (e) => {
        // If user is editing text in an active textbox/input, don't intercept text pastes
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea') return;

        if (e.clipboardData && e.clipboardData.items) {
            const items = Array.from(e.clipboardData.items);
            const imageItem = items.find(item => item.type && item.type.startsWith('image/'));
            if (imageItem) {
                const file = imageItem.getAsFile();
                if (file) {
                    e.preventDefault();
                    processImageFiles([file], null, null);
                }
            }
        }
    });

    renderMediaGallery();

    // -------------------------------------------------------------------------
    // 12. Freehand Brush & Eraser Finalization (path:created)
    // -------------------------------------------------------------------------
    canvas.on('path:created', (opt) => {
        const path = opt.path;
        if (!path) return;

        if (currentMode !== 'eraser' && typeof findStepBoxContaining === 'function') {
            const parentBox = findStepBoxContaining(path);
            if (parentBox) {
                path.stepBoxOwnerId = parentBox.stepBoxId;
                activeStepBox = parentBox;
                if (typeof updateStepBoxFloatingControls === 'function') {
                    updateStepBoxFloatingControls(parentBox);
                }
            }
        }

        if (currentFrameRatio !== 'infinite' && slideFrameRect) {
            path.setCoords();
            const bound = path.getBoundingRect(true, true);
            const fLeft = slideFrameRect.left;
            const fTop = slideFrameRect.top;
            const fRight = fLeft + slideFrameRect.getScaledWidth();
            const fBottom = fTop + slideFrameRect.getScaledHeight();

            // If stroke is completely outside the slide frame (no overlap at all), remove it
            if (bound.left >= fRight || bound.left + bound.width <= fLeft || bound.top >= fBottom || bound.top + bound.height <= fTop) {
                canvas.remove(path);
                canvas.requestRenderAll();
                return;
            }

            // Keep the part of the line drawn inside the slide; erase the part outside the slide!
            applySlideClip(path);
            canvas.requestRenderAll();
        }

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

        // Area / Circle Bound Shape Eraser
        if (currentMode === 'eraser' && eraserSubMode === 'area' && !shouldPan && !isRightClick) {
            isErasingArea = true;
            const pointer = canvas.getPointer(opt.e);
            areaErasePoints = [{ x: pointer.x, y: pointer.y }];
            areaErasePreview = new fabric.Polygon([...areaErasePoints, { x: pointer.x + 1, y: pointer.y + 1 }], {
                fill: 'rgba(239, 68, 68, 0.16)',
                stroke: '#ef4444',
                strokeWidth: 2,
                strokeDashArray: [5, 4],
                selectable: false,
                evented: false
            });
            canvas.add(areaErasePreview);
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

        // Step Box Tool: Drag to create a Step Box
        if (currentMode === 'stepbox' && !shouldPan && !isRightClick) {
            isDrawingStepBox = true;
            const pointer = canvas.getPointer(opt.e);
            stepBoxStartPoint = { x: pointer.x, y: pointer.y };
            stepBoxPreviewRect = new fabric.Rect({
                left: pointer.x,
                top: pointer.y,
                width: 0,
                height: 0,
                fill: 'rgba(99, 102, 241, 0.05)',
                stroke: '#6366f1',
                strokeWidth: 2,
                strokeDashArray: [6, 4],
                rx: 6,
                ry: 6,
                selectable: false,
                evented: false
            });
            canvas.add(stepBoxPreviewRect);
            return;
        }

        // Check if clicking on or inside a Step Box
        const clickPointer = canvas.getPointer(opt.e);
        let clickedBox = (opt.target && opt.target.isStepBox) ? opt.target : null;
        if (!clickedBox && opt.target && opt.target.stepBoxOwnerId) {
            clickedBox = canvas.getObjects().find(o => o.isStepBox && o.stepBoxId === opt.target.stepBoxOwnerId);
        }
        if (!clickedBox && typeof findStepBoxAtPoint === 'function') {
            clickedBox = findStepBoxAtPoint(clickPointer.x, clickPointer.y);
        }
        if (clickedBox) {
            activeStepBox = clickedBox;
            clickedBox._lastMovingLeft = clickedBox.left;
            clickedBox._lastMovingTop = clickedBox.top;
            if (typeof updateStepBoxFloatingControls === 'function') {
                updateStepBoxFloatingControls(clickedBox);
            }
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
                strokeWidth: strokeSize || 2,
                strokeDashArray: getDashArrayForPattern(currentLinePattern) || [4, 4],
                selectable: false,
                evented: false
            });
            canvas.add(connectorPreviewLine);
            return;
        }

        // Sticky Note Tool: click places note
        if (currentMode === 'sticky') {
            let pointer = canvas.getPointer(opt.e);
            if (currentFrameRatio !== 'infinite' && slideFrameRect) {
                const fLeft = slideFrameRect.left;
                const fTop = slideFrameRect.top;
                const fRight = fLeft + slideFrameRect.getScaledWidth();
                const fBottom = fTop + slideFrameRect.getScaledHeight();
                if (pointer.x < fLeft || pointer.x > fRight - 150 || pointer.y < fTop || pointer.y > fBottom - 150) {
                    showToast('Please place sticky notes inside the slide frame');
                    return;
                }
            }
            const { group, text } = createStickyNote(pointer.x, pointer.y, currentStickyColor, 'Type note...');

            canvas.add(group);
            if (typeof constrainObjectToSlideFrame === 'function') constrainObjectToSlideFrame(group);
            canvas.renderAll();
            saveState();

            setMode('select');
            canvas.setActiveObject(text);
            text.enterEditing();
            text.selectAll();
            canvas.renderAll();

            text.on('editing:exited', () => {
                if (typeof constrainObjectToSlideFrame === 'function') constrainObjectToSlideFrame(group);
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

            let pointer = canvas.getPointer(opt.e);
            if (currentFrameRatio !== 'infinite' && slideFrameRect) {
                const fLeft = slideFrameRect.left;
                const fTop = slideFrameRect.top;
                const fRight = fLeft + slideFrameRect.getScaledWidth();
                const fBottom = fTop + slideFrameRect.getScaledHeight();
                if (pointer.x < fLeft || pointer.x > fRight - 60 || pointer.y < fTop || pointer.y > fBottom - 30) {
                    showToast('Please place text inside the slide frame');
                    return;
                }
            }
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
            if (typeof constrainObjectToSlideFrame === 'function') constrainObjectToSlideFrame(textObj);
            canvas.setActiveObject(textObj);
            textObj.enterEditing();
            textObj.selectAll();
            canvas.renderAll();

            textObj.on('editing:exited', () => {
                if (textObj.text.trim() === '') {
                    canvas.remove(textObj);
                    canvas.renderAll();
                } else {
                    if (typeof constrainObjectToSlideFrame === 'function') constrainObjectToSlideFrame(textObj);
                    canvas.renderAll();
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
            if (activeStepBox) {
                updateStepBoxFloatingControls(activeStepBox);
            }
            return;
        }

        if (isDrawingStepBox && stepBoxPreviewRect && stepBoxStartPoint) {
            const pointer = canvas.getPointer(opt.e);
            const left = Math.min(stepBoxStartPoint.x, pointer.x);
            const top = Math.min(stepBoxStartPoint.y, pointer.y);
            const width = Math.abs(pointer.x - stepBoxStartPoint.x);
            const height = Math.abs(pointer.y - stepBoxStartPoint.y);
            stepBoxPreviewRect.set({ left, top, width, height });
            stepBoxPreviewRect.setCoords();
            canvas.requestRenderAll();
            return;
        }

        if (isErasingArea && areaErasePreview && areaErasePoints.length > 0) {
            const pointer = canvas.getPointer(opt.e);
            const lastPt = areaErasePoints[areaErasePoints.length - 1];
            const dist = Math.hypot(pointer.x - lastPt.x, pointer.y - lastPt.y);
            if (dist > 3) {
                areaErasePoints.push({ x: pointer.x, y: pointer.y });
                canvas.remove(areaErasePreview);
                areaErasePreview = new fabric.Polygon([...areaErasePoints], {
                    fill: 'rgba(239, 68, 68, 0.16)',
                    stroke: '#ef4444',
                    strokeWidth: 2,
                    strokeDashArray: [5, 4],
                    selectable: false,
                    evented: false,
                    objectCaching: false
                });
                canvas.add(areaErasePreview);
                canvas.requestRenderAll();
            }
            return;
        }

        if (currentMode === 'eraser' && eraserSubMode === 'brush' && eraserCursorPreview) {
            const evt = opt.e;
            if (evt) {
                const zoom = canvas.getZoom();
                const diameter = Math.max(8, eraserSize * zoom);
                eraserCursorPreview.style.width = diameter + 'px';
                eraserCursorPreview.style.height = diameter + 'px';
                eraserCursorPreview.style.left = evt.clientX + 'px';
                eraserCursorPreview.style.top = evt.clientY + 'px';
                eraserCursorPreview.style.display = 'block';
            }
        } else if (eraserCursorPreview && currentMode !== 'eraser') {
            eraserCursorPreview.style.display = 'none';
        }

        if (isConnecting && connectorPreviewLine) {
            const pointer = canvas.getPointer(opt.e);
            connectorPreviewLine.set({ x2: pointer.x, y2: pointer.y });
            connectorPreviewLine.setCoords();
            canvas.requestRenderAll();
        }
    });

    // Mouse Up: Stop panning, finalize area erase or connector
    function handleMouseUp(opt) {
        if (isPanning) {
            isPanning = false;
            updateCursorForMode();
        }

        if (isErasingArea) {
            finalizeAreaErase();
            return;
        }

        if (isDrawingStepBox) {
            isDrawingStepBox = false;
            if (stepBoxPreviewRect) {
                canvas.remove(stepBoxPreviewRect);
                stepBoxPreviewRect = null;
            }

            const pointer = canvas.getPointer(opt.e);
            let left = Math.min(stepBoxStartPoint.x, pointer.x);
            let top = Math.min(stepBoxStartPoint.y, pointer.y);
            let width = Math.abs(pointer.x - stepBoxStartPoint.x);
            let height = Math.abs(pointer.y - stepBoxStartPoint.y);

            if (width < 30 || height < 30) {
                width = 360;
                height = 240;
                left = stepBoxStartPoint.x - width / 2;
                top = stepBoxStartPoint.y - height / 2;
            }

            stepBoxStartPoint = null;
            const newBox = createStepBox(left, top, width, height);
            setMode('select');
            canvas.setActiveObject(newBox);
            canvas.requestRenderAll();
            saveState();
            showToast(`Created ${newBox.stepBoxName || 'Step Box'}`);
            return;
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
        } else if (currentMode === 'pen' || currentMode === 'highlighter' || currentMode === 'eraser' || currentMode === 'line' || currentMode === 'arrow' || currentMode === 'stepbox') {
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
        if (isDrawingStepBox) {
            isDrawingStepBox = false;
            if (stepBoxPreviewRect) {
                canvas.remove(stepBoxPreviewRect);
                stepBoxPreviewRect = null;
            }
            stepBoxStartPoint = null;
            setMode('select');
        }
        if (isErasingArea) {
            finalizeAreaErase();
        }
    });

    // -------------------------------------------------------------------------
    // 14. Selection, Move, Resize & Delete Controls
    // -------------------------------------------------------------------------
    function updateSelectionUI() {
        const activeObjs = canvas.getActiveObjects();
        btnDelete.disabled = (!activeObjs || activeObjs.length === 0);
        if (typeof updateObjectsCountBadges === 'function') {
            updateObjectsCountBadges();
        }

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
                    setStrokeSize(activeObj.strokeWidth);
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
                        setStrokeSize(shape.strokeWidth);
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

    canvas.on('selection:created', (e) => {
        updateSelectionUI();
        if (typeof handleStepBoxSelection === 'function') handleStepBoxSelection(e);
    });
    canvas.on('selection:updated', (e) => {
        updateSelectionUI();
        if (typeof handleStepBoxSelection === 'function') handleStepBoxSelection(e);
    });
    canvas.on('selection:cleared', () => {
        btnDelete.disabled = true;
        if (currentMode !== 'line' && currentMode !== 'arrow') {
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'inline-flex';
        }
        if (activeStepBox) {
            if (typeof saveStepBoxCurrentStep === 'function') {
                saveStepBoxCurrentStep(activeStepBox);
            }
            if (canvas.contains(activeStepBox) && typeof updateStepBoxFloatingControls === 'function') {
                updateStepBoxFloatingControls(activeStepBox);
                return;
            }
        }
        const existingBoxes = canvas.getObjects().filter(o => o.isStepBox);
        if (existingBoxes.length > 0 && typeof updateStepBoxFloatingControls === 'function') {
            updateStepBoxFloatingControls(existingBoxes[existingBoxes.length - 1]);
        } else {
            if (stepBoxFloatingBar) {
                stepBoxFloatingBar.style.display = 'none';
            }
            activeStepBox = null;
        }
    });

    function deleteSingleObject(obj) {
        if (!obj) return;
        if (obj.isStepBox) {
            const owned = canvas.getObjects().filter(o => o.stepBoxOwnerId === obj.stepBoxId && o !== obj);
            owned.forEach(c => {
                if (c.connectedLines) {
                    c.connectedLines.forEach(l => canvas.remove(l));
                }
                canvas.remove(c);
            });
            if (activeStepBox && (activeStepBox === obj || activeStepBox.stepBoxId === obj.stepBoxId)) {
                activeStepBox = null;
            }
        }
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

        // Verify remaining Step Boxes on canvas
        const remainingBoxes = canvas.getObjects().filter(o => o.isStepBox);
        if (remainingBoxes.length === 0) {
            if (stepBoxFloatingBar) {
                stepBoxFloatingBar.style.display = 'none';
            }
            activeStepBox = null;
        } else if (activeStepBox && canvas.contains(activeStepBox)) {
            updateStepBoxFloatingControls(activeStepBox);
        } else {
            activeStepBox = remainingBoxes[remainingBoxes.length - 1];
            updateStepBoxFloatingControls(activeStepBox);
        }

        canvas.requestRenderAll();
        saveState();
    }

    btnDelete.addEventListener('click', deleteSelectedObjects);

    canvas.on('object:removed', (opt) => {
        const removed = opt ? opt.target : null;
        if (!removed) return;
        if (removed.isStepBox || (activeStepBox && (activeStepBox === removed || activeStepBox.stepBoxId === removed.stepBoxId))) {
            const remaining = canvas.getObjects().filter(o => o.isStepBox && o !== removed);
            if (remaining.length === 0) {
                if (stepBoxFloatingBar) {
                    stepBoxFloatingBar.style.display = 'none';
                }
                activeStepBox = null;
            } else {
                activeStepBox = remaining[remaining.length - 1];
                if (typeof updateStepBoxFloatingControls === 'function') {
                    updateStepBoxFloatingControls(activeStepBox);
                }
            }
        }
        if (typeof debouncedUpdateObjectsList === 'function') {
            debouncedUpdateObjectsList();
        }
    });

    // -------------------------------------------------------------------------
    // 14b. Canvas Objects & Layers Management System
    // -------------------------------------------------------------------------
    const btnTopbarObjects = document.getElementById('btn-topbar-objects');
    const topbarObjectsCount = document.getElementById('topbar-objects-count');
    const fsBtnObjects = document.getElementById('fs-btn-objects');
    const fsObjectsBadge = document.getElementById('fs-objects-badge');
    const sidebarObjectsBadge = document.getElementById('sidebar-objects-badge');
    const drawerObjectsCount = document.getElementById('drawer-objects-count');
    const btnRefreshObjects = document.getElementById('btn-refresh-objects');
    const objectsSearchInput = document.getElementById('objects-search');
    const btnClearObjectsSearch = document.getElementById('btn-clear-objects-search');
    const objFilterChips = document.querySelectorAll('.obj-filter-chip');
    const filterCountAll = document.getElementById('filter-count-all');
    const btnObjectsDeleteSelected = document.getElementById('btn-objects-delete-selected');
    const objectsSelectedCount = document.getElementById('objects-selected-count');
    const btnObjectsClearAll = document.getElementById('btn-objects-clear-all');
    const objectsListWrapper = document.getElementById('objects-list-wrapper');

    let currentObjectsFilter = 'all';
    let currentObjectsSearch = '';
    let objectListDebounceTimer = null;

    function getUserCanvasObjects() {
        if (!canvas) return [];
        return canvas.getObjects().filter(o => {
            if (!o) return false;
            if (o.isSlideFrame || o.isGridLine) return false;
            if (o === stepBoxPreviewRect || o === connectorPreviewLine) return false;
            if (o.isArrowHead) return false;
            return true;
        });
    }

    function getObjectMetadata(obj) {
        if (!obj.__uid) {
            obj.__uid = 'obj_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        }

        const width = Math.round((obj.width || 0) * (obj.scaleX || 1));
        const height = Math.round((obj.height || 0) * (obj.scaleY || 1));
        const left = Math.round(obj.left || 0);
        const top = Math.round(obj.top || 0);

        if (obj.isStepBox) {
            const stepNum = (obj.stepBoxCurrentStep || 0) + 1;
            const totalSteps = obj.stepBoxSteps ? obj.stepBoxSteps.length : 1;
            return {
                type: 'stepbox',
                typeName: 'Step Box',
                title: obj.stepBoxName || 'Step Box',
                meta: `Step ${stepNum}/${totalSteps} • ${width}×${height}px`,
                icon: '📦',
                badgeClass: 'badge-stepbox'
            };
        }

        if (obj.isStickyNote) {
            let noteText = '';
            if (obj._objects) {
                const textChild = obj._objects.find(o => o.type === 'textbox' || o.type === 'i-text' || o.type === 'text');
                if (textChild && textChild.text) noteText = textChild.text.trim();
            }
            return {
                type: 'notes',
                typeName: 'Sticky Note',
                title: noteText.length > 0 ? (noteText.length > 28 ? noteText.substring(0, 28) + '…' : noteText) : 'Sticky Note',
                meta: `Sticky Note (${obj.stickyColor || 'yellow'}) • ${left}, ${top}`,
                icon: '📝',
                badgeClass: 'badge-note'
            };
        }

        if (obj.isSticker) {
            return {
                type: 'images',
                typeName: 'Sticker',
                title: obj.imageName || 'Sticker',
                meta: `Sticker • ${width}×${height}px`,
                icon: '🎨',
                badgeClass: 'badge-sticker'
            };
        }

        if (obj.type === 'image') {
            return {
                type: 'images',
                typeName: 'Image',
                title: obj.imageName || 'Uploaded Image',
                meta: `Image • ${width}×${height}px`,
                icon: '🖼️',
                badgeClass: 'badge-image'
            };
        }

        if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
            const textVal = (obj.text || '').trim();
            return {
                type: 'text',
                typeName: 'Text',
                title: textVal.length > 0 ? (textVal.length > 28 ? textVal.substring(0, 28) + '…' : textVal) : 'Empty Text',
                meta: `Font: ${obj.fontSize || 20}px • ${left}, ${top}`,
                icon: '🔤',
                badgeClass: 'badge-text'
            };
        }

        if (obj.isConnector || obj.isFreeLine || obj.type === 'line') {
            const hasArrow = obj.hasArrow || !!obj.arrowHead;
            return {
                type: 'shapes',
                typeName: hasArrow ? 'Arrow Connector' : 'Line Connector',
                title: hasArrow ? 'Arrow Connector' : 'Line Connector',
                meta: `Color: ${obj.stroke || '#000'} • Width: ${obj.strokeWidth || 2}px`,
                icon: '↗️',
                badgeClass: 'badge-connector'
            };
        }

        if (obj.type === 'path') {
            const isHighlighter = (obj.stroke && (obj.stroke.includes('rgba') || obj.opacity < 1));
            return {
                type: 'drawings',
                typeName: isHighlighter ? 'Highlighter' : 'Pen Stroke',
                title: isHighlighter ? 'Highlighter Stroke' : 'Pen Stroke',
                meta: `Color: ${obj.stroke || '#1e293b'} • Width: ${obj.strokeWidth || 2}px`,
                icon: isHighlighter ? '🖍️' : '✏️',
                badgeClass: isHighlighter ? 'badge-highlighter' : 'badge-pen'
            };
        }

        if (obj.isShapeGroup || obj.isMergedShape || obj.shapeId) {
            let shapeName = obj.shapeName || obj.shapeId || 'Shape';
            if (obj._objects) {
                const textChild = obj._objects.find(o => o.type === 'text' || o.type === 'i-text' || o.type === 'textbox');
                if (textChild && textChild.text && textChild.text.trim()) {
                    shapeName += `: "${textChild.text.trim().substring(0, 18)}"`;
                }
            }
            return {
                type: 'shapes',
                typeName: 'Shape',
                title: shapeName,
                meta: `Shape • ${width}×${height}px`,
                icon: '🔷',
                badgeClass: 'badge-shape'
            };
        }

        const typeCap = obj.type ? obj.type.charAt(0).toUpperCase() + obj.type.slice(1) : 'Object';
        return {
            type: 'shapes',
            typeName: typeCap,
            title: `${typeCap} (${width}×${height}px)`,
            meta: `Position: ${left}, ${top}`,
            icon: '📐',
            badgeClass: 'badge-generic'
        };
    }

    function updateObjectsCountBadges() {
        const objects = getUserCanvasObjects();
        const total = objects.length;

        if (topbarObjectsCount) topbarObjectsCount.textContent = total;
        if (drawerObjectsCount) drawerObjectsCount.textContent = total;
        if (filterCountAll) filterCountAll.textContent = total;

        if (sidebarObjectsBadge) {
            sidebarObjectsBadge.textContent = total;
            sidebarObjectsBadge.style.display = total > 0 ? 'flex' : 'none';
        }

        if (fsObjectsBadge) {
            fsObjectsBadge.textContent = total;
            fsObjectsBadge.style.display = total > 0 ? 'inline-block' : 'none';
        }

        // Selected count
        const activeObjs = canvas ? canvas.getActiveObjects() : [];
        const selCount = activeObjs.filter(o => !o.isSlideFrame && !o.isGridLine && o !== stepBoxPreviewRect && o !== connectorPreviewLine).length;
        if (objectsSelectedCount) objectsSelectedCount.textContent = selCount;
        if (btnObjectsDeleteSelected) btnObjectsDeleteSelected.disabled = (selCount === 0);
    }

    function selectAndPanToObject(obj) {
        if (!obj || !canvas) return;
        canvas.setActiveObject(obj);

        // Center on screen
        const center = obj.getCenterPoint();
        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform;
        vpt[4] = (canvas.getWidth() / 2) - (center.x * zoom);
        vpt[5] = (canvas.getHeight() / 2) - (center.y * zoom);
        canvas.setViewportTransform(vpt);
        if (typeof updateGrid === 'function') updateGrid();

        canvas.requestRenderAll();
        renderObjectsList(currentObjectsFilter, currentObjectsSearch);
    }

    function toggleObjectVisibility(obj) {
        if (!obj || !canvas) return;
        obj.visible = !obj.visible;
        if (!obj.visible && canvas.getActiveObject() === obj) {
            canvas.discardActiveObject();
        }
        canvas.requestRenderAll();
        saveState();
        renderObjectsList(currentObjectsFilter, currentObjectsSearch);
        showToast(obj.visible ? 'Object visible' : 'Object hidden');
    }

    function toggleObjectLock(obj) {
        if (!obj || !canvas) return;
        const isCurrentlyLocked = !!obj.lockMovementX;
        const newLock = !isCurrentlyLocked;

        obj.lockMovementX = newLock;
        obj.lockMovementY = newLock;
        obj.lockRotation = newLock;
        obj.lockScalingX = newLock;
        obj.lockScalingY = newLock;
        obj.hasControls = !newLock;

        canvas.requestRenderAll();
        saveState();
        renderObjectsList(currentObjectsFilter, currentObjectsSearch);
        showToast(newLock ? 'Object locked' : 'Object unlocked');
    }

    function deleteSingleObjectFromList(obj) {
        if (!obj || !canvas) return;
        const meta = getObjectMetadata(obj);
        deleteSingleObject(obj);
        canvas.requestRenderAll();
        saveState();
        updateObjectsCountBadges();
        renderObjectsList(currentObjectsFilter, currentObjectsSearch);
        showToast(`Deleted ${meta.typeName}`);
    }

    function deleteSelectedObjectsFromList() {
        const activeObjs = canvas.getActiveObjects();
        if (!activeObjs || activeObjs.length === 0) return;
        deleteSelectedObjects();
        updateObjectsCountBadges();
        renderObjectsList(currentObjectsFilter, currentObjectsSearch);
        showToast('Selected objects deleted');
    }

    function clearAllCanvasObjects() {
        const userObjects = getUserCanvasObjects();
        if (userObjects.length === 0) {
            showToast('No objects to delete');
            return;
        }

        if (!confirm(`Are you sure you want to delete all ${userObjects.length} objects from this board?`)) {
            return;
        }

        canvas.discardActiveObject();
        userObjects.forEach(obj => {
            deleteSingleObject(obj);
        });

        canvas.requestRenderAll();
        saveState();
        updateObjectsCountBadges();
        renderObjectsList(currentObjectsFilter, currentObjectsSearch);
        showToast('All objects deleted');
    }

    function renderObjectsList(filter = currentObjectsFilter, searchQuery = currentObjectsSearch) {
        if (!objectsListWrapper) return;
        currentObjectsFilter = filter;
        currentObjectsSearch = searchQuery ? searchQuery.toLowerCase().trim() : '';

        updateObjectsCountBadges();

        const allObjects = getUserCanvasObjects();
        // Top-most objects in canvas stacking order appear at the top of the list (reverse order)
        let filtered = [...allObjects].reverse();

        if (filter !== 'all') {
            filtered = filtered.filter(obj => {
                const meta = getObjectMetadata(obj);
                return meta.type === filter;
            });
        }

        if (searchQuery) {
            filtered = filtered.filter(obj => {
                const meta = getObjectMetadata(obj);
                return meta.title.toLowerCase().includes(searchQuery) ||
                       meta.typeName.toLowerCase().includes(searchQuery) ||
                       meta.meta.toLowerCase().includes(searchQuery);
            });
        }

        objectsListWrapper.innerHTML = '';

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'objects-empty-state';
            emptyEl.innerHTML = `
                <div class="objects-empty-icon">${allObjects.length === 0 ? '🎨' : '🔍'}</div>
                <div class="objects-empty-title">${allObjects.length === 0 ? 'No objects on canvas' : 'No matching objects'}</div>
                <div class="objects-empty-sub">
                    ${allObjects.length === 0 
                        ? 'Draw, add shapes, sticky notes, text, or stickers to see and manage them here.'
                        : 'Try searching with different keywords or switch the filter tab.'}
                </div>
            `;
            objectsListWrapper.appendChild(emptyEl);
            return;
        }

        const activeObjs = canvas ? canvas.getActiveObjects() : [];

        filtered.forEach(obj => {
            const meta = getObjectMetadata(obj);
            const isSelected = activeObjs.includes(obj);
            const isVisible = (obj.visible !== false);
            const isLocked = !!obj.lockMovementX;

            const card = document.createElement('div');
            card.className = `object-item-card ${isSelected ? 'active' : ''} ${!isVisible ? 'is-hidden-obj' : ''}`;
            card.dataset.uid = obj.__uid;

            card.innerHTML = `
                <div class="object-item-icon ${meta.badgeClass}">
                    ${meta.icon}
                </div>
                <div class="object-item-details">
                    <div class="object-item-title" title="${meta.title}">${meta.title}</div>
                    <div class="object-item-meta">${meta.meta}</div>
                </div>
                <div class="object-item-actions">
                    <button type="button" class="obj-row-btn btn-obj-visibility ${!isVisible ? 'is-hidden-eye' : ''}" title="${isVisible ? 'Hide object' : 'Show object'}">
                        ${isVisible ? `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                <circle cx="12" cy="12" r="3"/>
                            </svg>
                        ` : `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                <line x1="1" y1="1" x2="23" y2="23"/>
                            </svg>
                        `}
                    </button>
                    <button type="button" class="obj-row-btn btn-obj-lock ${isLocked ? 'is-active-lock' : ''}" title="${isLocked ? 'Unlock object' : 'Lock object'}">
                        ${isLocked ? `
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                        ` : `
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                            </svg>
                        `}
                    </button>
                    <button type="button" class="obj-row-btn danger btn-obj-delete" title="Delete this object">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            `;

            // Click to select & pan to object
            card.addEventListener('click', (e) => {
                if (e.target.closest('.obj-row-btn')) return;
                selectAndPanToObject(obj);
            });

            // Visibility toggle
            card.querySelector('.btn-obj-visibility').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleObjectVisibility(obj);
            });

            // Lock toggle
            card.querySelector('.btn-obj-lock').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleObjectLock(obj);
            });

            // Delete object button
            card.querySelector('.btn-obj-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteSingleObjectFromList(obj);
            });

            objectsListWrapper.appendChild(card);
        });
    }

    function debouncedUpdateObjectsList() {
        updateObjectsCountBadges();
        if (shapesPanel && !shapesPanel.classList.contains('hidden') && activeDrawerPanel === 'layers') {
            clearTimeout(objectListDebounceTimer);
            objectListDebounceTimer = setTimeout(() => {
                renderObjectsList();
            }, 80);
        }
    }

    function toggleObjectsDrawer() {
        if (!shapesPanel) return;

        const isCurrentlyOpen = !shapesPanel.classList.contains('hidden') && activeDrawerPanel === 'layers';

        if (isCurrentlyOpen) {
            closeDrawer();
            return;
        }

        // Check if slide mode or fullscreen is active
        const isSlideMode = document.body.classList.contains('slide-page-fullscreen') || document.body.classList.contains('slide-mode-active');
        if (isSlideMode) {
            shapesPanel.classList.add('open-in-slide');
        } else {
            shapesPanel.classList.remove('open-in-slide');
        }

        const leftSidebar = document.getElementById('left-sidebar');
        const isSidebarMinimized = leftSidebar && leftSidebar.classList.contains('minimized-sidebar');
        if (isSidebarMinimized || isSlideMode) {
            shapesPanel.classList.add('open-floating');
        } else {
            shapesPanel.classList.remove('open-floating');
        }

        openDrawerPanel('layers');
        if (fsBtnObjects) fsBtnObjects.classList.add('active');
        if (btnTopbarObjects) btnTopbarObjects.classList.add('active');
    }

    // Top bar & Bottom Dock Objects buttons toggle the Objects drawer
    if (btnTopbarObjects) {
        btnTopbarObjects.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleObjectsDrawer();
        });
    }

    if (fsBtnObjects) {
        fsBtnObjects.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleObjectsDrawer();
        });
    }

    if (btnRefreshObjects) {
        btnRefreshObjects.addEventListener('click', () => {
            renderObjectsList();
            showToast('Objects refreshed');
        });
    }

    if (objectsSearchInput) {
        objectsSearchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (btnClearObjectsSearch) {
                btnClearObjectsSearch.style.display = query.length > 0 ? 'inline-flex' : 'none';
            }
            renderObjectsList(currentObjectsFilter, query);
        });
    }

    if (btnClearObjectsSearch) {
        btnClearObjectsSearch.addEventListener('click', () => {
            if (objectsSearchInput) objectsSearchInput.value = '';
            btnClearObjectsSearch.style.display = 'none';
            renderObjectsList(currentObjectsFilter, '');
        });
    }

    objFilterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            objFilterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const filter = chip.dataset.filter || 'all';
            renderObjectsList(filter, objectsSearchInput ? objectsSearchInput.value : '');
        });
    });

    if (btnObjectsDeleteSelected) {
        btnObjectsDeleteSelected.addEventListener('click', deleteSelectedObjectsFromList);
    }

    if (btnObjectsClearAll) {
        btnObjectsClearAll.addEventListener('click', clearAllCanvasObjects);
    }

    // Canvas sync listeners
    canvas.on('object:added', () => debouncedUpdateObjectsList());
    canvas.on('object:modified', () => debouncedUpdateObjectsList());
    canvas.on('selection:created', () => {
        updateObjectsCountBadges();
        if (shapesPanel && !shapesPanel.classList.contains('hidden') && activeDrawerPanel === 'layers') {
            renderObjectsList();
        }
    });
    canvas.on('selection:updated', () => {
        updateObjectsCountBadges();
        if (shapesPanel && !shapesPanel.classList.contains('hidden') && activeDrawerPanel === 'layers') {
            renderObjectsList();
        }
    });
    canvas.on('selection:cleared', () => {
        updateObjectsCountBadges();
        if (shapesPanel && !shapesPanel.classList.contains('hidden') && activeDrawerPanel === 'layers') {
            renderObjectsList();
        }
    });

    // Initial badge update
    setTimeout(updateObjectsCountBadges, 500);

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

    if (selectStrokeSize) {
        selectStrokeSize.addEventListener('change', () => {
            const strokeWidth = parseInt(selectStrokeSize.value, 10);
            setStrokeSize(strokeWidth);
        });
    }

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

            // If pasting into slide mode, verify position relative to slide frame
            if (currentFrameRatio !== 'infinite' && slideFrameRect) {
                const sLeft = slideFrameRect.left;
                const sTop = slideFrameRect.top;
                const sRight = sLeft + slideFrameRect.getScaledWidth();
                const sBottom = sTop + slideFrameRect.getScaledHeight();

                clonedObj.setCoords();
                const bound = (typeof clonedObj.getBoundingRect === 'function')
                    ? clonedObj.getBoundingRect(true, true)
                    : { left: clonedObj.left, top: clonedObj.top, width: clonedObj.width || 50, height: clonedObj.height || 50 };

                // If completely outside the slide, place near center of the slide
                if (bound.left > sRight || bound.left + bound.width < sLeft ||
                    bound.top > sBottom || bound.top + bound.height < sTop) {
                    const center = slideFrameRect.getCenterPoint();
                    if (typeof clonedObj.setPositionByOrigin === 'function') {
                        clonedObj.setPositionByOrigin(center, 'center', 'center');
                    } else {
                        clonedObj.left = sLeft + (slideFrameRect.width - bound.width) / 2;
                        clonedObj.top = sTop + (slideFrameRect.height - bound.height) / 2;
                    }
                    clonedObj.setCoords();
                }
            }

            const prepareObj = (obj) => {
                if (obj.shapeUid) obj.shapeUid = generateUid();
                obj.connectedLines = [];
                if (currentFrameRatio !== 'infinite') {
                    if (typeof applySlideClip === 'function') applySlideClip(obj);
                } else {
                    if (obj.clipPath && obj.clipPath.isSlideClip) {
                        delete obj.clipPath;
                        obj.dirty = true;
                    }
                }
                canvas.add(obj);
            };

            if (clonedObj.type === 'activeSelection') {
                clonedObj.canvas = canvas;
                clonedObj.forEachObject((obj) => {
                    prepareObj(obj);
                });
                clonedObj.setCoords();
            } else {
                prepareObj(clonedObj);
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
    // Phase 8: Step Box System
    // -------------------------------------------------------------------------
    function attachStepBoxRendering(box) {
        if (!box) return;
        box._render = function(ctx) {
            fabric.Rect.prototype._render.call(this, ctx);

            // Draw top-left step box label & badge
            ctx.save();
            const curStep = (this.stepBoxCurrentStep !== undefined) ? this.stepBoxCurrentStep + 1 : 1;
            const totalSteps = (this.stepBoxSteps && this.stepBoxSteps.length) ? this.stepBoxSteps.length : 1;
            const name = this.stepBoxName || 'Step Box';
            const label = `${name} (Step ${curStep}/${totalSteps})`;

            ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
            const textWidth = ctx.measureText(label).width;
            const badgeW = textWidth + 16;
            const badgeH = 22;
            const x = -this.width / 2 + 6;
            const y = -this.height / 2 + 6;

            // Background badge
            ctx.fillStyle = '#4f46e5';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(x, y, badgeW, badgeH, 5);
            } else {
                ctx.rect(x, y, badgeW, badgeH);
            }
            ctx.fill();

            // Label text
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, x + 8, y + badgeH / 2);

            ctx.restore();
        };
    }

    function createStepBox(left, top, width, height, options = {}) {
        const existingBoxes = canvas.getObjects().filter(o => o.isStepBox);
        const boxNum = existingBoxes.length + 1;
        const boxId = options.stepBoxId || ('stepbox_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
        const boxName = options.stepBoxName || `Step Box ${boxNum}`;
        const initialSteps = options.stepBoxSteps || [
            {
                id: 'step_1',
                name: 'Step 1',
                objects: []
            }
        ];
        const initialStepIndex = options.stepBoxCurrentStep !== undefined ? options.stepBoxCurrentStep : 0;

        const box = new fabric.Rect({
            left: Math.round(left),
            top: Math.round(top),
            width: Math.max(80, Math.round(width)),
            height: Math.max(60, Math.round(height)),
            fill: options.fill || 'rgba(99, 102, 241, 0.04)',
            stroke: options.stroke || '#6366f1',
            strokeWidth: options.strokeWidth || 2,
            strokeDashArray: [6, 4],
            rx: 6,
            ry: 6,
            selectable: currentMode === 'select',
            evented: true,
            isStepBox: true,
            stepBoxId: boxId,
            stepBoxName: boxName,
            stepBoxSteps: initialSteps,
            stepBoxCurrentStep: initialStepIndex
        });

        attachStepBoxRendering(box);
        canvas.add(box);
        canvas.sendToBack(box);

        return box;
    }

    function findStepBoxContaining(obj) {
        if (!obj || obj.isStepBox || obj.isArrowHead) return null;
        const center = obj.getCenterPoint ? obj.getCenterPoint() : new fabric.Point(obj.left + (obj.width || 0) / 2, obj.top + (obj.height || 0) / 2);
        const stepBoxes = canvas.getObjects().filter(o => o.isStepBox);
        for (const box of stepBoxes) {
            const left = box.left;
            const top = box.top;
            const right = box.left + (box.width * (box.scaleX || 1));
            const bottom = box.top + (box.height * (box.scaleY || 1));
            if (center.x >= left && center.x <= right && center.y >= top && center.y <= bottom) {
                return box;
            }
        }
        return null;
    }

    function saveStepBoxCurrentStep(box, showNotification = false) {
        if (!box || !box.isStepBox || !box.stepBoxSteps) return;
        const curIdx = box.stepBoxCurrentStep || 0;
        if (curIdx < 0 || curIdx >= box.stepBoxSteps.length) return;

        // Auto-associate any unowned objects currently within this step box
        canvas.forEachObject(o => {
            if (!o.isStepBox && !o.isArrowHead && !o.isSlideFrame && !o.isGridLine && o.globalCompositeOperation !== 'destination-out') {
                const parent = findStepBoxContaining(o);
                if (parent && parent.stepBoxId === box.stepBoxId) {
                    o.stepBoxOwnerId = box.stepBoxId;
                }
            }
        });

        const owned = canvas.getObjects().filter(o => o.stepBoxOwnerId === box.stepBoxId && !o.isStepBox && !o.isArrowHead && o.globalCompositeOperation !== 'destination-out');
        const serialized = owned.map(o => {
            const json = o.toJSON(EXTRA_PROPS);
            json.relLeft = o.left - box.left;
            json.relTop = o.top - box.top;
            return json;
        });

        box.stepBoxSteps[curIdx].objects = serialized;
        if (showNotification) {
            const curStepObj = box.stepBoxSteps[curIdx];
            const name = (curStepObj && curStepObj.name) ? curStepObj.name : `Step ${curIdx + 1}`;
            showToast(`Saved ${name} (${owned.length} item${owned.length === 1 ? '' : 's'})`);
        }
    }

    function loadStepBoxStep(box, targetIdx) {
        if (!box || !box.isStepBox || !box.stepBoxSteps) return;
        if (targetIdx < 0 || targetIdx >= box.stepBoxSteps.length) return;

        // 1. Save current step state first
        saveStepBoxCurrentStep(box);

        // 2. Remove all canvas objects owned by this step box
        const currentOwned = canvas.getObjects().filter(o => o.stepBoxOwnerId === box.stepBoxId && !o.isStepBox);
        currentOwned.forEach(o => {
            if (o.connectedLines) {
                o.connectedLines.forEach(l => canvas.remove(l));
            }
            canvas.remove(o);
        });

        // 3. Switch active step index
        box.stepBoxCurrentStep = targetIdx;
        const stepRecord = box.stepBoxSteps[targetIdx];
        const objectsToLoad = (stepRecord && Array.isArray(stepRecord.objects)) ? stepRecord.objects : [];

        // 4. Enliven and add new step objects
        if (objectsToLoad.length > 0) {
            fabric.util.enlivenObjects(objectsToLoad, (enlivenedObjects) => {
                enlivenedObjects.forEach((obj, idx) => {
                    const storedJson = objectsToLoad[idx];
                    const relL = (storedJson && storedJson.relLeft !== undefined) ? storedJson.relLeft : (obj.left || 0);
                    const relT = (storedJson && storedJson.relTop !== undefined) ? storedJson.relTop : (obj.top || 0);
                    obj.set({
                        left: box.left + relL,
                        top: box.top + relT,
                        stepBoxOwnerId: box.stepBoxId,
                        selectable: currentMode === 'select'
                    });
                    obj.setCoords();
                    canvas.add(obj);
                });
                box.dirty = true;
                canvas.requestRenderAll();
                updateStepBoxFloatingControls(box);
                saveState();
            });
        } else {
            box.dirty = true;
            canvas.requestRenderAll();
            updateStepBoxFloatingControls(box);
            saveState();
        }
    }

    function addStepBoxStep(box) {
        if (!box || !box.isStepBox || !box.stepBoxSteps) return;
        saveStepBoxCurrentStep(box);

        const curIdx = box.stepBoxCurrentStep || 0;
        const curStep = box.stepBoxSteps[curIdx] || { objects: [] };
        const newStepNum = box.stepBoxSteps.length + 1;
        const copiedObjects = JSON.parse(JSON.stringify(curStep.objects || []));

        const newStep = {
            id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: `Step ${newStepNum}`,
            objects: copiedObjects
        };

        const newIdx = curIdx + 1;
        box.stepBoxSteps.splice(newIdx, 0, newStep);
        box.stepBoxCurrentStep = newIdx;

        box.dirty = true;
        canvas.requestRenderAll();
        updateStepBoxFloatingControls(box);
        if (stepboxManagerModal && !stepboxManagerModal.classList.contains('hidden')) {
            renderStepBoxManagerList(box);
        }
        saveState();
        showToast(`Created Step ${newIdx + 1} of ${box.stepBoxSteps.length} (copy of Step ${curIdx + 1})`);
    }

    function duplicateStepBoxStep(box, stepIdx) {
        if (!box || !box.isStepBox || !box.stepBoxSteps) return;
        saveStepBoxCurrentStep(box);

        const targetIdx = (stepIdx !== undefined) ? stepIdx : (box.stepBoxCurrentStep || 0);
        if (targetIdx < 0 || targetIdx >= box.stepBoxSteps.length) return;

        const srcStep = box.stepBoxSteps[targetIdx];
        const copiedObjects = JSON.parse(JSON.stringify(srcStep.objects || []));
        const newStep = {
            id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name: `${srcStep.name || `Step ${targetIdx + 1}`} (Copy)`,
            objects: copiedObjects
        };

        box.stepBoxSteps.splice(targetIdx + 1, 0, newStep);
        loadStepBoxStep(box, targetIdx + 1);
        if (stepboxManagerModal && !stepboxManagerModal.classList.contains('hidden')) {
            renderStepBoxManagerList(box);
        }
        saveState();
        showToast(`Duplicated ${srcStep.name || `Step ${targetIdx + 1}`}`);
    }

    function moveStepBoxStep(box, fromIdx, toIdx) {
        if (!box || !box.isStepBox || !box.stepBoxSteps) return;
        if (fromIdx < 0 || fromIdx >= box.stepBoxSteps.length || toIdx < 0 || toIdx >= box.stepBoxSteps.length || fromIdx === toIdx) return;
        saveStepBoxCurrentStep(box);

        const activeIdx = box.stepBoxCurrentStep || 0;
        const [movedStep] = box.stepBoxSteps.splice(fromIdx, 1);
        box.stepBoxSteps.splice(toIdx, 0, movedStep);

        if (activeIdx === fromIdx) {
            box.stepBoxCurrentStep = toIdx;
        } else if (fromIdx < activeIdx && toIdx >= activeIdx) {
            box.stepBoxCurrentStep--;
        } else if (fromIdx > activeIdx && toIdx <= activeIdx) {
            box.stepBoxCurrentStep++;
        }

        box.dirty = true;
        canvas.requestRenderAll();
        updateStepBoxFloatingControls(box);
        if (stepboxManagerModal && !stepboxManagerModal.classList.contains('hidden')) {
            renderStepBoxManagerList(box);
        }
        saveState();
    }

    function deleteStepBoxStep(box, stepIdx) {
        if (!box || !box.isStepBox || !box.stepBoxSteps) return;
        if (box.stepBoxSteps.length <= 1) {
            showToast('A Step Box must always have at least one step');
            return;
        }

        const curIdx = (stepIdx !== undefined) ? stepIdx : (box.stepBoxCurrentStep || 0);
        const stepNum = curIdx + 1;
        if (!confirm(`Are you sure you want to delete Step ${stepNum} of ${box.stepBoxSteps.length}?`)) {
            return;
        }

        // If deleting the active step, remove current canvas objects
        if (curIdx === (box.stepBoxCurrentStep || 0)) {
            const currentOwned = canvas.getObjects().filter(o => o.stepBoxOwnerId === box.stepBoxId && !o.isStepBox);
            currentOwned.forEach(o => canvas.remove(o));
        }

        box.stepBoxSteps.splice(curIdx, 1);
        box.stepBoxCurrentStep = Math.max(0, Math.min(box.stepBoxCurrentStep || 0, box.stepBoxSteps.length - 1));

        // Load new active step
        const targetStep = box.stepBoxSteps[box.stepBoxCurrentStep];
        const objectsToLoad = (targetStep && Array.isArray(targetStep.objects)) ? targetStep.objects : [];

        if (objectsToLoad.length > 0) {
            fabric.util.enlivenObjects(objectsToLoad, (enlivenedObjects) => {
                enlivenedObjects.forEach((obj, idx) => {
                    const storedJson = objectsToLoad[idx];
                    const relL = (storedJson && storedJson.relLeft !== undefined) ? storedJson.relLeft : (obj.left || 0);
                    const relT = (storedJson && storedJson.relTop !== undefined) ? storedJson.relTop : (obj.top || 0);
                    obj.set({
                        left: box.left + relL,
                        top: box.top + relT,
                        stepBoxOwnerId: box.stepBoxId,
                        selectable: currentMode === 'select'
                    });
                    obj.setCoords();
                    canvas.add(obj);
                });
                box.dirty = true;
                canvas.requestRenderAll();
                updateStepBoxFloatingControls(box);
                if (stepboxManagerModal && !stepboxManagerModal.classList.contains('hidden')) {
                    renderStepBoxManagerList(box);
                }
                saveState();
                showToast(`Deleted step. Now on Step ${box.stepBoxCurrentStep + 1} of ${box.stepBoxSteps.length}`);
            });
        } else {
            box.dirty = true;
            canvas.requestRenderAll();
            updateStepBoxFloatingControls(box);
            if (stepboxManagerModal && !stepboxManagerModal.classList.contains('hidden')) {
                renderStepBoxManagerList(box);
            }
            saveState();
            showToast(`Deleted step. Now on Step ${box.stepBoxCurrentStep + 1} of ${box.stepBoxSteps.length}`);
        }
    }

    function toggleStepBoxPlay(box) {
        if (!box || !box.isStepBox || !box.stepBoxSteps) return;
        if (box.stepBoxSteps.length <= 1) {
            showToast('Add more steps to play slideshow');
            return;
        }

        if (isStepBoxPlaying) {
            stopStepBoxPlay();
            showToast('Playback paused');
            return;
        }

        saveStepBoxCurrentStep(box);
        isStepBoxPlaying = true;
        if (btnStepBoxPlay) {
            btnStepBoxPlay.classList.add('active');
        }
        if (stepBoxPlayLabel) {
            stepBoxPlayLabel.textContent = 'Pause';
        }
        showToast('Playing step presentation (1.8s auto-cycle)...');

        stepBoxPlayInterval = setInterval(() => {
            if (!activeStepBox || !canvas.contains(activeStepBox) || !isStepBoxPlaying) {
                stopStepBoxPlay();
                return;
            }
            const nextIdx = ((activeStepBox.stepBoxCurrentStep || 0) + 1) % activeStepBox.stepBoxSteps.length;
            loadStepBoxStep(activeStepBox, nextIdx);
        }, 1800);
    }

    function stopStepBoxPlay() {
        if (stepBoxPlayInterval) {
            clearInterval(stepBoxPlayInterval);
            stepBoxPlayInterval = null;
        }
        isStepBoxPlaying = false;
        if (btnStepBoxPlay) {
            btnStepBoxPlay.classList.remove('active');
        }
        if (stepBoxPlayLabel) {
            stepBoxPlayLabel.textContent = 'Play';
        }
    }

    function openStepBoxManager(box) {
        if (!stepboxManagerModal) return;
        if (!box || !box.isStepBox) {
            const boxes = canvas.getObjects().filter(o => o.isStepBox);
            if (boxes.length > 0) box = boxes[boxes.length - 1];
            else return;
        }
        activeStepBox = box;
        saveStepBoxCurrentStep(box);
        if (stepboxModalTitle) {
            stepboxModalTitle.textContent = `${box.stepBoxName || 'Step Box'} - Step Manager`;
        }
        renderStepBoxManagerList(box);
        stepboxManagerModal.classList.remove('hidden');
        stepboxManagerModal.setAttribute('aria-hidden', 'false');
    }

    function closeStepBoxManager() {
        if (!stepboxManagerModal) return;
        stepboxManagerModal.classList.add('hidden');
        stepboxManagerModal.setAttribute('aria-hidden', 'true');
        if (activeStepBox && canvas.contains(activeStepBox)) {
            updateStepBoxFloatingControls(activeStepBox);
        }
    }

    function renderStepBoxManagerList(box) {
        if (!stepboxStepsList || !box || !box.isStepBox) return;
        stepboxStepsList.innerHTML = '';

        const steps = box.stepBoxSteps || [];
        const curIdx = box.stepBoxCurrentStep || 0;

        if (stepboxManagerCountBadge) {
            stepboxManagerCountBadge.textContent = `Total Steps: ${steps.length}`;
        }
        if (stepboxManagerActiveBadge) {
            const curStepObj = steps[curIdx];
            const curName = (curStepObj && curStepObj.name) ? curStepObj.name : `Step ${curIdx + 1}`;
            stepboxManagerActiveBadge.textContent = `Active: ${curName}`;
        }

        steps.forEach((step, idx) => {
            const card = document.createElement('div');
            card.className = `stepbox-step-card ${idx === curIdx ? 'active' : ''}`;

            const itemCount = Array.isArray(step.objects) ? step.objects.length : 0;
            const stepName = step.name || `Step ${idx + 1}`;

            card.innerHTML = `
                <div class="stepbox-step-card-left">
                    <span class="stepbox-step-num">#${idx + 1}</span>
                    <input type="text" class="stepbox-step-input" value="${stepName.replace(/"/g, '&quot;')}" placeholder="Step name..." title="Click to rename step" />
                    <span class="stepbox-step-meta">${itemCount} item${itemCount === 1 ? '' : 's'}</span>
                </div>
                <div class="stepbox-step-actions">
                    <button type="button" class="stepbox-action-icon-btn btn-step-jump" title="Switch to this step">
                        <span>${idx === curIdx ? '✓ Current' : 'Activate'}</span>
                    </button>
                    <button type="button" class="stepbox-action-icon-btn btn-step-up" title="Move Up" ${idx === 0 ? 'disabled' : ''}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button type="button" class="stepbox-action-icon-btn btn-step-down" title="Move Down" ${idx === steps.length - 1 ? 'disabled' : ''}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                    <button type="button" class="stepbox-action-icon-btn btn-step-dup" title="Duplicate Step">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button type="button" class="stepbox-action-icon-btn btn-step-delete" title="Delete Step" ${steps.length <= 1 ? 'disabled' : ''}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                    </button>
                </div>
            `;

            // Rename listener
            const nameInput = card.querySelector('.stepbox-step-input');
            if (nameInput) {
                const handleRename = () => {
                    const newName = nameInput.value.trim() || `Step ${idx + 1}`;
                    step.name = newName;
                    box.dirty = true;
                    canvas.requestRenderAll();
                    updateStepBoxFloatingControls(box);
                    if (stepboxManagerActiveBadge && idx === box.stepBoxCurrentStep) {
                        stepboxManagerActiveBadge.textContent = `Active: ${newName}`;
                    }
                    saveState();
                };
                nameInput.addEventListener('change', handleRename);
                nameInput.addEventListener('blur', handleRename);
                nameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.target.blur();
                    }
                });
            }

            // Jump / Activate listener
            const jumpBtn = card.querySelector('.btn-step-jump');
            if (jumpBtn) {
                jumpBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (idx !== box.stepBoxCurrentStep) {
                        loadStepBoxStep(box, idx);
                        renderStepBoxManagerList(box);
                    }
                });
            }

            // Up / Down listeners
            const upBtn = card.querySelector('.btn-step-up');
            if (upBtn) {
                upBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    moveStepBoxStep(box, idx, idx - 1);
                });
            }
            const downBtn = card.querySelector('.btn-step-down');
            if (downBtn) {
                downBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    moveStepBoxStep(box, idx, idx + 1);
                });
            }

            // Duplicate listener
            const dupBtn = card.querySelector('.btn-step-dup');
            if (dupBtn) {
                dupBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    duplicateStepBoxStep(box, idx);
                });
            }

            // Delete listener
            const delBtn = card.querySelector('.btn-step-delete');
            if (delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteStepBoxStep(box, idx);
                });
            }

            stepboxStepsList.appendChild(card);
        });
    }

    async function exportStepBoxAsPPTX(box) {
        if (!box || !box.isStepBox || !box.stepBoxSteps || box.stepBoxSteps.length === 0) {
            showToast('No steps to export in this Step Box');
            return;
        }

        saveStepBoxCurrentStep(box);
        const originalStep = box.stepBoxCurrentStep || 0;
        const boxTitle = box.stepBoxName || 'Step Box Presentation';
        const totalSteps = box.stepBoxSteps.length;

        showToast(`Preparing presentation (${totalSteps} slide${totalSteps > 1 ? 's' : ''})...`);

        const prevVpt = canvas.viewportTransform.slice();
        const slides = [];

        try {
            const bw = box.width * (box.scaleX || 1);
            const bh = box.height * (box.scaleY || 1);
            const bx = box.left;
            const by = box.top;

            for (let i = 0; i < totalSteps; i++) {
                await new Promise(resolve => {
                    loadStepBoxStep(box, i);
                    setTimeout(resolve, 80);
                });

                const stepObj = box.stepBoxSteps[i];
                const stepTitle = (stepObj && stepObj.name) ? stepObj.name : `Step ${i + 1}`;

                // Crop and capture this step box area
                const dataUrl = canvas.toDataURL({
                    format: 'png',
                    left: bx,
                    top: by,
                    width: bw,
                    height: bh,
                    multiplier: 2
                });

                slides.push({
                    image_data: dataUrl,
                    title: stepTitle,
                    step_num: i + 1
                });
            }

            // Restore original active step
            await new Promise(resolve => {
                loadStepBoxStep(box, originalStep);
                setTimeout(resolve, 80);
            });
            canvas.setViewportTransform(prevVpt);
            canvas.requestRenderAll();

            // Send to backend /api/export/pptx
            const res = await fetch('/api/export/pptx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: boxTitle,
                    aspect_ratio: '16:9',
                    slides: slides
                })
            });

            if (!res.ok) {
                throw new Error(`Server returned HTTP ${res.status}`);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = boxTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'step_box_presentation';
            a.download = `${safeName}.pptx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);

            showToast(`Exported "${a.download}" (${slides.length} slide${slides.length > 1 ? 's' : ''})!`);
        } catch (err) {
            console.error('PPTX export error:', err);
            canvas.setViewportTransform(prevVpt);
            canvas.requestRenderAll();
            showToast('Failed to export PPTX');
        }
    }

    function findStepBoxAtPoint(x, y) {
        const boxes = canvas.getObjects().filter(o => o.isStepBox);
        for (let i = boxes.length - 1; i >= 0; i--) {
            const b = boxes[i];
            const w = (b.width || 0) * (b.scaleX || 1);
            const h = (b.height || 0) * (b.scaleY || 1);
            if (x >= b.left && x <= b.left + w && y >= b.top && y <= b.top + h) {
                return b;
            }
        }
        return null;
    }

    function updateStepBoxFloatingControls(box) {
        if (!stepBoxFloatingBar) return;

        const allBoxes = canvas.getObjects().filter(o => o.isStepBox);
        if (allBoxes.length === 0) {
            stepBoxFloatingBar.style.display = 'none';
            activeStepBox = null;
            return;
        }

        if (!box || !box.isStepBox || !canvas.contains(box)) {
            if (activeStepBox && canvas.contains(activeStepBox) && activeStepBox.isStepBox) {
                box = activeStepBox;
            } else {
                box = allBoxes[allBoxes.length - 1];
            }
        }

        activeStepBox = box;
        const curIdx = box.stepBoxCurrentStep || 0;
        const totalSteps = box.stepBoxSteps ? box.stepBoxSteps.length : 1;

        if (stepBoxCounterLabel) {
            stepBoxCounterLabel.textContent = `Step ${curIdx + 1} / ${totalSteps}`;
        }

        if (btnStepBoxPrev) {
            btnStepBoxPrev.disabled = (curIdx === 0);
        }
        if (btnStepBoxNext) {
            btnStepBoxNext.disabled = (curIdx >= totalSteps - 1);
        }
        if (btnStepBoxDel) {
            btnStepBoxDel.disabled = (totalSteps <= 1);
        }
        if (btnStepBoxPlay) {
            btnStepBoxPlay.disabled = (totalSteps <= 1);
        }

        box.setCoords();
        const aCoords = box.aCoords || {
            tl: new fabric.Point(box.left, box.top),
            tr: new fabric.Point(box.left + (box.width * (box.scaleX || 1)), box.top),
            br: new fabric.Point(box.left + (box.width * (box.scaleX || 1)), box.top + (box.height * (box.scaleY || 1))),
            bl: new fabric.Point(box.left, box.top + (box.height * (box.scaleY || 1)))
        };

        const vpt = canvas.viewportTransform;
        const pts = [aCoords.tl, aCoords.tr, aCoords.br, aCoords.bl].map(pt => 
            fabric.util.transformPoint(pt, vpt)
        );

        let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
        pts.forEach(pt => {
            if (pt.x < minX) minX = pt.x;
            if (pt.x > maxX) maxX = pt.x;
            if (pt.y > maxY) maxY = pt.y;
        });

        const canvasEl = canvas.upperCanvasEl || canvas.lowerCanvasEl;
        const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };

        const screenCenterX = rect.left + (minX + maxX) / 2;
        const screenBottomY = rect.top + maxY;

        stepBoxFloatingBar.style.display = 'flex';
        const barWidth = stepBoxFloatingBar.offsetWidth || 440;
        const posX = Math.max(16, Math.min(window.innerWidth - barWidth - 16, screenCenterX - barWidth / 2));
        const posY = Math.min(window.innerHeight - 52, screenBottomY + 8);

        stepBoxFloatingBar.style.left = `${posX}px`;
        stepBoxFloatingBar.style.top = `${posY}px`;
    }

    function handleStepBoxSelection(e) {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isStepBox) {
            updateStepBoxFloatingControls(activeObj);
            return;
        }

        if (activeObj) {
            let parentBox = null;
            if (activeObj.stepBoxOwnerId) {
                parentBox = canvas.getObjects().find(o => o.isStepBox && o.stepBoxId === activeObj.stepBoxOwnerId);
            }
            if (!parentBox) {
                parentBox = findStepBoxContaining(activeObj);
            }
            if (parentBox) {
                updateStepBoxFloatingControls(parentBox);
                return;
            }

            if (activeStepBox) {
                saveStepBoxCurrentStep(activeStepBox);
            }
            if (stepBoxFloatingBar) {
                stepBoxFloatingBar.style.display = 'none';
            }
            activeStepBox = null;
            return;
        }

        if (activeStepBox && canvas.contains(activeStepBox)) {
            updateStepBoxFloatingControls(activeStepBox);
            return;
        }

        const allBoxes = canvas.getObjects().filter(o => o.isStepBox);
        if (allBoxes.length > 0) {
            updateStepBoxFloatingControls(allBoxes[allBoxes.length - 1]);
        } else {
            if (stepBoxFloatingBar) {
                stepBoxFloatingBar.style.display = 'none';
            }
            activeStepBox = null;
        }
    }

    function handleStepBoxMoving(target) {
        if (!target || !target.isStepBox) return;
        const box = target;
        const curLeft = box.left;
        const curTop = box.top;
        const lastLeft = box._lastMovingLeft !== undefined ? box._lastMovingLeft : curLeft;
        const lastTop = box._lastMovingTop !== undefined ? box._lastMovingTop : curTop;
        const dx = curLeft - lastLeft;
        const dy = curTop - lastTop;
        box._lastMovingLeft = curLeft;
        box._lastMovingTop = curTop;

        canvas.forEachObject(o => {
            if (o.stepBoxOwnerId === box.stepBoxId && o !== box) {
                o.left += dx;
                o.top += dy;
                o.setCoords();
                if (o.connectedLines) {
                    updateConnectedLinesFor(o);
                }
            }
        });
        updateStepBoxFloatingControls(box);
    }

    function handleStepBoxScaling(target) {
        if (!target || !target.isStepBox) return;
        updateStepBoxFloatingControls(target);
    }

    function handleStepBoxModified(target) {
        if (!target) return;
        if (target.isStepBox) {
            const box = target;
            delete box._lastMovingLeft;
            delete box._lastMovingTop;

            const sx = box.scaleX || 1;
            const sy = box.scaleY || 1;
            if (sx !== 1 || sy !== 1) {
                const ow = box.width;
                const oh = box.height;
                const nw = Math.max(80, Math.round(ow * sx));
                const nh = Math.max(60, Math.round(oh * sy));
                const ox = box.left;
                const oy = box.top;

                canvas.forEachObject(o => {
                    if (o.stepBoxOwnerId === box.stepBoxId && o !== box) {
                        const relX = o.left - ox;
                        const relY = o.top - oy;
                        o.left = ox + relX * (nw / ow);
                        o.top = oy + relY * (nh / oh);
                        o.scaleX = (o.scaleX || 1) * (nw / ow);
                        o.scaleY = (o.scaleY || 1) * (nh / oh);
                        o.setCoords();
                        if (o.connectedLines) {
                            updateConnectedLinesFor(o);
                        }
                    }
                });

                box.set({
                    width: nw,
                    height: nh,
                    scaleX: 1,
                    scaleY: 1
                });
                box.setCoords();
                box.dirty = true;
                canvas.requestRenderAll();
            }
            updateStepBoxFloatingControls(box);
        } else {
            const parentBox = findStepBoxContaining(target);
            if (parentBox) {
                target.stepBoxOwnerId = parentBox.stepBoxId;
            } else if (target.stepBoxOwnerId) {
                target.stepBoxOwnerId = null;
            }
        }
    }

    if (btnStepBoxPrev) {
        btnStepBoxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeStepBox) {
                loadStepBoxStep(activeStepBox, (activeStepBox.stepBoxCurrentStep || 0) - 1);
            }
        });
    }

    if (btnStepBoxNext) {
        btnStepBoxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeStepBox) {
                loadStepBoxStep(activeStepBox, (activeStepBox.stepBoxCurrentStep || 0) + 1);
            }
        });
    }

    if (btnStepBoxAdd) {
        btnStepBoxAdd.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeStepBox) {
                addStepBoxStep(activeStepBox);
            }
        });
    }

    if (btnStepBoxDel) {
        btnStepBoxDel.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeStepBox) {
                deleteStepBoxStep(activeStepBox);
            }
        });
    }

    if (btnStepBoxSave) {
        btnStepBoxSave.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeStepBox) {
                saveStepBoxCurrentStep(activeStepBox, true);
            }
        });
    }

    if (btnStepBoxPlay) {
        btnStepBoxPlay.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeStepBox) {
                toggleStepBoxPlay(activeStepBox);
            }
        });
    }

    if (btnStepBoxManage) {
        btnStepBoxManage.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeStepBox) {
                openStepBoxManager(activeStepBox);
            }
        });
    }

    if (btnStepBoxPptx) {
        btnStepBoxPptx.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeStepBox) {
                exportStepBoxAsPPTX(activeStepBox);
            }
        });
    }

    if (btnCloseStepboxManager) {
        btnCloseStepboxManager.addEventListener('click', closeStepBoxManager);
    }
    if (btnStepboxManagerDone) {
        btnStepboxManagerDone.addEventListener('click', closeStepBoxManager);
    }
    if (btnStepboxManagerAdd) {
        btnStepboxManagerAdd.addEventListener('click', () => {
            if (activeStepBox) {
                addStepBoxStep(activeStepBox);
            }
        });
    }
    if (btnStepboxManagerPptx) {
        btnStepboxManagerPptx.addEventListener('click', () => {
            if (activeStepBox) {
                exportStepBoxAsPPTX(activeStepBox);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Protected Overlays: Step Box & Slide Frame (Immune to Eraser / destination-out)
    // -------------------------------------------------------------------------
    function renderStepBoxOverlays(ctx) {
        const stepBoxes = canvas.getObjects().filter(o => o.isStepBox && !o._deleted);
        if (!stepBoxes.length) return;

        stepBoxes.forEach(box => {
            if (!box.visible) return;
            ctx.save();
            const m = box.calcTransformMatrix();
            ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);

            const w = box.width;
            const h = box.height;
            const rx = box.rx || 6;
            const ry = box.ry || 6;
            const x = -w / 2;
            const y = -h / 2;

            // Draw crisp dashed border
            ctx.save();
            ctx.strokeStyle = box.stroke || '#6366f1';
            ctx.lineWidth = box.strokeWidth || 2;
            if (ctx.setLineDash) {
                ctx.setLineDash(box.strokeDashArray || [6, 4]);
            }
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(x, y, w, h, [rx, ry, rx, ry]);
            } else {
                ctx.rect(x, y, w, h);
            }
            ctx.stroke();
            ctx.restore();

            // Draw Step Box badge (top-left)
            const curStep = (box.stepBoxCurrentStep !== undefined) ? box.stepBoxCurrentStep + 1 : 1;
            const totalSteps = (box.stepBoxSteps && box.stepBoxSteps.length) ? box.stepBoxSteps.length : 1;
            const curStepObj = (box.stepBoxSteps && box.stepBoxSteps[box.stepBoxCurrentStep]);
            const stepName = (curStepObj && curStepObj.name) ? curStepObj.name : `Step ${curStep}`;
            const boxName = box.stepBoxName || 'Step Box';
            const label = `${boxName} • ${stepName} (${curStep}/${totalSteps})`;

            ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
            const textWidth = ctx.measureText(label).width;
            const badgeW = textWidth + 16;
            const badgeH = 22;
            const bx = -w / 2 + 6;
            const by = -h / 2 + 6;

            ctx.fillStyle = '#4f46e5';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(bx, by, badgeW, badgeH, 5);
            } else {
                ctx.rect(bx, by, badgeW, badgeH);
            }
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, bx + 8, by + badgeH / 2);

            ctx.restore();
        });
    }

    function renderSlideFrameOverlays(ctx) {
        if (currentFrameRatio === 'infinite' || !slideFrameRect || !slideFrameRect.visible) return;
        ctx.save();
        const m = slideFrameRect.calcTransformMatrix();
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);

        const w = slideFrameRect.width;
        const h = slideFrameRect.height;
        const x = -w / 2;
        const y = -h / 2;

        ctx.strokeStyle = slideFrameRect.stroke || '#94a3b8';
        ctx.lineWidth = slideFrameRect.strokeWidth || 2;
        if (ctx.setLineDash) ctx.setLineDash([]);
        ctx.strokeRect(x, y, w, h);

        ctx.restore();
    }

    canvas.on('after:render', (opt) => {
        const ctx = (opt && opt.ctx) ? opt.ctx : canvas.getContext();
        if (!ctx) return;
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        ctx.save();
        ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

        renderStepBoxOverlays(ctx);
        renderSlideFrameOverlays(ctx);

        ctx.restore();
    });

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
    let autoSaveIntervalId = null;
    let isBoardDirty = false;
    let isSavingBoard = false;
    let isBoardLoading = false;
    let lastSavedTime = null;

    const autosaveStatusEl = document.getElementById('autosave-status');

    function updateAutosaveIndicator(state, customMessage) {
        if (!autosaveStatusEl) return;
        autosaveStatusEl.classList.remove('saving', 'dirty', 'error');

        const dotEl = autosaveStatusEl.querySelector('.autosave-dot');
        const textEl = autosaveStatusEl.querySelector('.autosave-text');

        if (state === 'saving') {
            autosaveStatusEl.classList.add('saving');
            if (textEl) textEl.textContent = customMessage || 'Saving...';
            autosaveStatusEl.title = 'Saving board changes to SQLite database...';
        } else if (state === 'dirty') {
            autosaveStatusEl.classList.add('dirty');
            if (textEl) textEl.textContent = customMessage || 'Unsaved changes';
            autosaveStatusEl.title = 'Unsaved changes will auto-save in a few seconds';
        } else if (state === 'error') {
            autosaveStatusEl.classList.add('error');
            if (textEl) textEl.textContent = customMessage || 'Save error';
            autosaveStatusEl.title = 'Failed to save to database. Will retry automatically.';
        } else {
            // 'saved'
            if (textEl) textEl.textContent = customMessage || 'Saved';
            const timeStr = lastSavedTime ? lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'recently';
            autosaveStatusEl.title = `Auto-saved to SQLite database (${timeStr})`;
        }
    }

    function markBoardDirty() {
        if (isProcessingHistory || isBoardLoading) return;
        isBoardDirty = true;
        updateAutosaveIndicator('dirty');
    }

    async function saveActiveBoardToServer(force = false) {
        if (!activeBoardId || isSavingBoard || isBoardLoading) return;
        if (!isBoardDirty && !force) return;

        isSavingBoard = true;
        updateAutosaveIndicator('saving');

        try {
            // Save active step snapshot for all Step Boxes before serializing
            if (typeof saveStepBoxCurrentStep === 'function') {
                const stepBoxes = canvas.getObjects().filter(o => o.isStepBox);
                stepBoxes.forEach(sb => saveStepBoxCurrentStep(sb));
            }

            if (currentFrameRatio !== 'infinite' && typeof saveCurrentSlide === 'function') {
                saveCurrentSlide();
            }

            let dataObj;
            if (currentFrameRatio === 'infinite') {
                dataObj = canvas.toJSON(EXTRA_PROPS);
                infiniteBoardObjects = dataObj.objects.filter(o => !o.isSlideFrame);
            } else {
                dataObj = {
                    version: '5.3.0',
                    objects: infiniteBoardObjects || []
                };
            }
            dataObj.infiniteBoardObjects = infiniteBoardObjects;
            dataObj.boardSlides = boardSlides;
            dataObj.currentSlideIndex = currentSlideIndex;
            dataObj.currentFrameRatio = currentFrameRatio;
            const activeBoard = boards.find(b => b.id === activeBoardId);
            const bgColor = (activeBoard && (activeBoard.bg_color || activeBoard.bgColor)) ? (activeBoard.bg_color || activeBoard.bgColor) : '#f8fafc';

            const res = await fetch(`/api/boards/${activeBoardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: JSON.stringify(dataObj),
                    bg_color: bgColor
                })
            });

            if (!res.ok) {
                throw new Error(`Server returned HTTP ${res.status}`);
            }

            const updatedBoard = await res.json();
            isBoardDirty = false;
            lastSavedTime = new Date();
            updateAutosaveIndicator('saved');

            if (activeBoard) {
                activeBoard.updated_at = updatedBoard.updated_at || Date.now();
                activeBoard.updatedAt = activeBoard.updated_at;
            }

            try {
                localStorage.setItem('whiteboard_board_data_' + activeBoardId, JSON.stringify(dataObj));
                localStorage.setItem('whiteboard_saved_board', JSON.stringify(dataObj));
            } catch (storageErr) {}
        } catch (err) {
            console.error('Auto-save error:', err);
            updateAutosaveIndicator('error');
        } finally {
            isSavingBoard = false;
        }
    }

    function saveCurrentBoardData() {
        saveActiveBoardToServer(true);
    }

    function saveActiveBoardDebounced() {
        if (isBoardLoading) return;
        markBoardDirty();
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveActiveBoardToServer();
        }, 500);
    }

    function startAutosaveLoop() {
        if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
        autoSaveIntervalId = setInterval(() => {
            if (isBoardDirty && !isSavingBoard && !isBoardLoading && activeBoardId) {
                saveActiveBoardToServer();
            }
        }, 3000);
    }

    function reconnectLoadedObjects() {
        const shapesByUid = {};
        canvas.forEachObject(obj => {
            if (obj.shapeUid) {
                shapesByUid[obj.shapeUid] = obj;
                obj.connectedLines = [];
            }
        });

        canvas.forEachObject(obj => {
            if (obj.isArrowHead) {
                obj.selectable = false;
                obj.evented = false;
            }

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

            if (obj.isStepBox) {
                if (typeof attachStepBoxRendering === 'function') {
                    attachStepBoxRendering(obj);
                }
                obj.dirty = true;
            }

            if (obj.isSlideFrame) {
                slideFrameRect = obj;
                obj.selectable = false;
                obj.evented = false;
                if (typeof attachSlideFrameRendering === 'function') {
                    attachSlideFrameRendering(obj);
                }
                currentFrameRatio = obj.slideFrameRatio || '16:9';
                document.body.classList.add('slide-mode-active');
                if (slideFrameBanner) {
                    slideFrameBanner.classList.remove('hidden');
                    const preset = SLIDE_PRESETS[currentFrameRatio] || SLIDE_PRESETS['16:9'];
                    if (slideFrameTitle) slideFrameTitle.textContent = preset.title;
                }
                if (frameModeLabel) {
                    const preset = SLIDE_PRESETS[currentFrameRatio];
                    frameModeLabel.textContent = preset ? preset.shortName : 'Slide';
                }
                if (frameMenuItems) {
                    frameMenuItems.forEach(item => {
                        item.classList.toggle('active', item.getAttribute('data-ratio') === currentFrameRatio);
                    });
                }
                if (typeof updateSlideNavigationUI === 'function') {
                    updateSlideNavigationUI();
                }
                obj.dirty = true;
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

        const hasSlide = canvas.getObjects().some(o => o.isSlideFrame);
        if (!hasSlide) {
            currentFrameRatio = 'infinite';
            document.body.classList.remove('slide-mode-active');
            if (slideFrameBanner) slideFrameBanner.classList.add('hidden');
            if (frameModeLabel) frameModeLabel.textContent = 'Canvas: Infinite';
            if (frameMenuItems) {
                frameMenuItems.forEach(item => {
                    item.classList.toggle('active', item.getAttribute('data-ratio') === 'infinite');
                });
            }
        }

        const stepBoxes = canvas.getObjects().filter(o => o.isStepBox);
        if (stepBoxes.length > 0 && typeof updateStepBoxFloatingControls === 'function') {
            updateStepBoxFloatingControls(stepBoxes[stepBoxes.length - 1]);
        }
    }

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
            activeBoard.bg_color = color;
            if (save) {
                markBoardDirty();
                saveActiveBoardDebounced();
            }
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
                    canvasContainer.style.setProperty('--grid-line-color', 'rgba(255, 255, 255, 0.12)');
                } else {
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

    async function downloadBoard(boardId) {
        const board = boards.find(b => b.id === boardId);
        if (!board) return;

        let boardObj;
        if (boardId === activeBoardId) {
            boardObj = canvas.toJSON(EXTRA_PROPS);
            boardObj.bgColor = board.bg_color || board.bgColor || '#f8fafc';
        } else {
            try {
                const res = await fetch(`/api/boards/${boardId}`);
                if (res.ok) {
                    const full = await res.json();
                    boardObj = typeof full.data === 'string' ? JSON.parse(full.data) : full.data;
                    boardObj.bgColor = full.bg_color || '#f8fafc';
                } else {
                    throw new Error(`HTTP ${res.status}`);
                }
            } catch (e) {
                const stored = localStorage.getItem('whiteboard_board_data_' + boardId);
                boardObj = stored ? JSON.parse(stored) : { version: '5.3.0', objects: [] };
                boardObj.bgColor = board.bg_color || board.bgColor || '#f8fafc';
            }
        }

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

    function exportCanvasAsPNG() {
        if (downloadDropdown) downloadDropdown.classList.add('hidden');
        if (activeStepBox && typeof saveStepBoxCurrentStep === 'function') {
            saveStepBoxCurrentStep(activeStepBox);
        }
        const objects = canvas.getObjects().filter(o => !o.isGridLine && o !== stepBoxPreviewRect && o !== connectorPreviewLine);
        if (!objects || objects.length === 0) {
            showToast('Canvas is empty');
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        objects.forEach(obj => {
            const b = obj.getBoundingRect(true, true);
            if (b.left < minX) minX = b.left;
            if (b.top < minY) minY = b.top;
            if (b.left + b.width > maxX) maxX = b.left + b.width;
            if (b.top + b.height > maxY) maxY = b.top + b.height;
        });

        if (!isFinite(minX) || !isFinite(minY)) {
            minX = 0; minY = 0; maxX = canvas.getWidth(); maxY = canvas.getHeight();
        }

        const padding = 40;
        const cropX = Math.max(0, minX - padding);
        const cropY = Math.max(0, minY - padding);
        const cropWidth = (maxX - minX) + padding * 2;
        const cropHeight = (maxY - minY) + padding * 2;

        const prevVpt = canvas.viewportTransform.slice();
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

        const dataUrl = canvas.toDataURL({
            format: 'png',
            left: cropX,
            top: cropY,
            width: cropWidth,
            height: cropHeight,
            multiplier: 2,
            enableRetinaScaling: true
        });

        canvas.setViewportTransform(prevVpt);
        canvas.requestRenderAll();

        const curBoard = (Array.isArray(boards) ? boards.find(b => b.id === activeBoardId) : null);
        const safeName = (curBoard ? curBoard.name : 'whiteboard').toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'whiteboard';
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast(`Exported "${a.download}"`);
    }

    function exportCanvasAsSVG() {
        if (downloadDropdown) downloadDropdown.classList.add('hidden');
        if (activeStepBox && typeof saveStepBoxCurrentStep === 'function') {
            saveStepBoxCurrentStep(activeStepBox);
        }
        const objects = canvas.getObjects().filter(o => !o.isGridLine && o !== stepBoxPreviewRect && o !== connectorPreviewLine);
        if (!objects || objects.length === 0) {
            showToast('Canvas is empty');
            return;
        }

        const svgContent = canvas.toSVG({
            suppressPreamble: false,
            width: canvas.getWidth(),
            height: canvas.getHeight()
        }, EXTRA_PROPS);
        const curBoard = (Array.isArray(boards) ? boards.find(b => b.id === activeBoardId) : null);
        const safeName = (curBoard ? curBoard.name : 'whiteboard').toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'whiteboard';
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        showToast(`Exported "${a.download}"`);
    }

    async function collectPresentationSlides(format) {
        const slideCaptures = [];

        // 1. If in Fixed Width / Slide Mode, capture all slides in boardSlides
        if (currentFrameRatio !== 'infinite' && slideFrameRect) {
            saveCurrentSlide();
            const originalSlideIndex = currentSlideIndex;

            const prevVpt = canvas.viewportTransform.slice();
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

            const cropX = slideFrameRect.left;
            const cropY = slideFrameRect.top;
            const cropW = slideFrameRect.width;
            const cropH = slideFrameRect.height;

            for (let i = 0; i < boardSlides.length; i++) {
                await new Promise((resolve) => {
                    loadSlide(i);
                    setTimeout(resolve, 90);
                });
                canvas.requestRenderAll();

                const dataUrl = canvas.toDataURL({
                    format: 'png',
                    left: cropX,
                    top: cropY,
                    width: cropW,
                    height: cropH,
                    multiplier: 2,
                    enableRetinaScaling: true
                });

                slideCaptures.push({
                    image_data: dataUrl,
                    title: (boardSlides[i] && boardSlides[i].name) ? boardSlides[i].name : `Slide ${i + 1}`,
                    step_num: i + 1
                });
            }

            await new Promise((resolve) => {
                loadSlide(originalSlideIndex);
                setTimeout(resolve, 80);
            });

            canvas.setViewportTransform(prevVpt);
            canvas.requestRenderAll();
            return slideCaptures;
        }

        // 2. Otherwise (Infinite Canvas): Step Box steps or whole canvas
        const frame = canvas.getObjects().find(o => o.isSlideFrame);
        let cropX = 100, cropY = 100, cropW = 1920, cropH = 1080;
        if (frame) {
            cropX = frame.left;
            cropY = frame.top;
            cropW = frame.width;
            cropH = frame.height;
        } else {
            const objs = canvas.getObjects().filter(o => !o.isGridLine && !o.isSlideFrame && o !== stepBoxPreviewRect && o !== connectorPreviewLine);
            if (objs.length === 0) return null;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            objs.forEach(o => {
                const b = o.getBoundingRect(true, true);
                if (b.left < minX) minX = b.left;
                if (b.top < minY) minY = b.top;
                if (b.left + b.width > maxX) maxX = b.left + b.width;
                if (b.top + b.height > maxY) maxY = b.top + b.height;
            });
            const pad = 40;
            cropX = Math.max(0, minX - pad);
            cropY = Math.max(0, minY - pad);
            cropW = (maxX - minX) + pad * 2;
            cropH = (maxY - minY) + pad * 2;
        }

        const stepBoxes = canvas.getObjects().filter(o => o.isStepBox && o.stepBoxSteps && o.stepBoxSteps.length > 1);
        const primaryBox = activeStepBox || (stepBoxes.length > 0 ? stepBoxes[0] : null);

        if (primaryBox && primaryBox.stepBoxSteps && primaryBox.stepBoxSteps.length > 1) {
            saveStepBoxCurrentStep(primaryBox);
            const originalStep = primaryBox.stepBoxCurrentStep;

            const prevVpt = canvas.viewportTransform.slice();
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

            for (let i = 0; i < primaryBox.stepBoxSteps.length; i++) {
                await new Promise(res => {
                    loadStepBoxStep(primaryBox, i);
                    setTimeout(res, 80);
                });
                canvas.requestRenderAll();

                const dataUrl = canvas.toDataURL({
                    format: 'png',
                    left: cropX,
                    top: cropY,
                    width: cropW,
                    height: cropH,
                    multiplier: 2,
                    enableRetinaScaling: true
                });

                slideCaptures.push({
                    image_data: dataUrl,
                    title: `Step ${i + 1}`,
                    step_num: i + 1
                });
            }

            await new Promise(res => {
                loadStepBoxStep(primaryBox, originalStep);
                setTimeout(res, 80);
            });
            canvas.setViewportTransform(prevVpt);
            canvas.requestRenderAll();
        } else {
            if (activeStepBox) saveStepBoxCurrentStep(activeStepBox);
            const prevVpt = canvas.viewportTransform.slice();
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

            const dataUrl = canvas.toDataURL({
                format: 'png',
                left: cropX,
                top: cropY,
                width: cropW,
                height: cropH,
                multiplier: 2,
                enableRetinaScaling: true
            });

            canvas.setViewportTransform(prevVpt);
            canvas.requestRenderAll();

            slideCaptures.push({
                image_data: dataUrl,
                title: 'Slide 1',
                step_num: 1
            });
        }

        return slideCaptures;
    }

    async function exportAsPPTX() {
        if (downloadDropdown) downloadDropdown.classList.add('hidden');
        showToast('Preparing PowerPoint presentation (.pptx)...');

        const slides = await collectPresentationSlides('pptx');
        if (!slides || slides.length === 0) {
            showToast('Canvas is empty');
            return;
        }

        const curBoard = (Array.isArray(boards) ? boards.find(b => b.id === activeBoardId) : null);
        const title = (curBoard ? curBoard.name : 'presentation');

        try {
            const res = await fetch('/api/export/pptx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title,
                    aspect_ratio: currentFrameRatio === '4:3' ? '4:3' : (currentFrameRatio === 'a4' ? 'a4' : '16:9'),
                    slides: slides
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'presentation';
            a.download = `${safeName}.pptx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            showToast(`Exported "${a.download}" (${slides.length} slide${slides.length > 1 ? 's' : ''})`);
        } catch (err) {
            console.error('PPTX export error:', err);
            showToast('Failed to export PPTX');
        }
    }

    async function exportAsPDF() {
        if (downloadDropdown) downloadDropdown.classList.add('hidden');
        showToast('Preparing PDF document (.pdf)...');

        const slides = await collectPresentationSlides('pdf');
        if (!slides || slides.length === 0) {
            showToast('Canvas is empty');
            return;
        }

        const curBoard = (Array.isArray(boards) ? boards.find(b => b.id === activeBoardId) : null);
        const title = (curBoard ? curBoard.name : 'document');

        try {
            const res = await fetch('/api/export/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title,
                    aspect_ratio: currentFrameRatio === '4:3' ? '4:3' : (currentFrameRatio === 'a4' ? 'a4' : '16:9'),
                    slides: slides
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'document';
            a.download = `${safeName}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            showToast(`Exported "${a.download}" (${slides.length} page${slides.length > 1 ? 's' : ''})`);
        } catch (err) {
            console.error('PDF export error:', err);
            showToast('Failed to export PDF');
        }
    }

    async function switchBoard(targetBoardId) {
        if (targetBoardId === activeBoardId) return;
        const targetBoard = boards.find(b => b.id === targetBoardId);
        if (!targetBoard) return;

        // Save current board data first if dirty
        if (isBoardDirty) {
            await saveActiveBoardToServer(true);
        }

        activeBoardId = targetBoardId;
        localStorage.setItem('whiteboard_active_board_id', activeBoardId);

        // Update URL cleanly without reloading page
        if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', `/board/${targetBoardId}`);
        }

        // Restore target board's background color
        const targetBg = targetBoard.bg_color || targetBoard.bgColor || '#f8fafc';
        setBoardBackgroundColor(targetBg, false);

        isBoardLoading = true;
        isProcessingHistory = true;
        undoStack.length = 0;
        redoStack.length = 0;
        updateHistoryButtons();

        // Load new board from server
        try {
            const res = await fetch(`/api/boards/${targetBoardId}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const fullBoard = await res.json();

            let parsedData = null;
            if (typeof fullBoard.data === 'string') {
                try {
                    parsedData = JSON.parse(fullBoard.data);
                } catch (e) {
                    parsedData = { version: '5.3.0', objects: [] };
                }
            } else {
                parsedData = fullBoard.data || { version: '5.3.0', objects: [] };
            }

            if (parsedData.infiniteBoardObjects && Array.isArray(parsedData.infiniteBoardObjects)) {
                infiniteBoardObjects = parsedData.infiniteBoardObjects;
            } else if (Array.isArray(parsedData.objects)) {
                infiniteBoardObjects = parsedData.objects.filter(o => !o.isSlideFrame);
            } else {
                infiniteBoardObjects = [];
            }

            if (parsedData.boardSlides && Array.isArray(parsedData.boardSlides) && parsedData.boardSlides.length > 0) {
                boardSlides = parsedData.boardSlides;
                currentSlideIndex = parsedData.currentSlideIndex || 0;
            } else {
                boardSlides = [
                    { id: 'slide_' + Date.now(), name: 'Slide 1', objects: [] }
                ];
                currentSlideIndex = 0;
            }

            const loadPayload = (parsedData.currentFrameRatio && parsedData.currentFrameRatio !== 'infinite')
                ? parsedData
                : { version: '5.3.0', objects: infiniteBoardObjects };

            canvas.loadFromJSON(loadPayload, () => {
                reconnectLoadedObjects();
                canvas.renderAll();
                isBoardLoading = false;
                isProcessingHistory = false;
                isBoardDirty = false;
                updateSelectionUI();
                saveState();
                updateAutosaveIndicator('saved');
                showToast(`Switched to "${targetBoard.name}"`);
            });
        } catch (err) {
            console.error('Error switching board from server:', err);
            const saved = localStorage.getItem('whiteboard_board_data_' + targetBoardId);
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    canvas.loadFromJSON(data, () => {
                        reconnectLoadedObjects();
                        canvas.renderAll();
                        isBoardLoading = false;
                        isProcessingHistory = false;
                        isBoardDirty = false;
                        updateSelectionUI();
                        saveState();
                        updateAutosaveIndicator('saved');
                        showToast(`Switched to "${targetBoard.name}" (cached)`);
                    });
                    return;
                } catch (e) {}
            }
            canvas.clear();
            isBoardLoading = false;
            isProcessingHistory = false;
            isBoardDirty = false;
            canvas.renderAll();
            saveState();
            updateAutosaveIndicator('saved');
            showToast(`Switched to "${targetBoard.name}"`);
        }

        renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
    }

    async function addNewBoard() {
        if (isBoardDirty) {
            await saveActiveBoardToServer(true);
        }

        const newNum = boards.length + 1;
        const boardName = prompt('Enter a name for the new board:', `Board ${newNum}`);
        if (boardName === null) return;
        const finalName = boardName.trim() || `Board ${newNum}`;

        try {
            const res = await fetch('/api/boards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: finalName,
                    bg_color: '#f8fafc',
                    data: JSON.stringify({ version: '5.3.0', objects: [] })
                })
            });

            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const newBoard = await res.json();
            newBoard.bgColor = newBoard.bg_color || '#f8fafc';

            boards.push(newBoard);
            activeBoardId = newBoard.id;
            localStorage.setItem('whiteboard_active_board_id', activeBoardId);

            setBoardBackgroundColor('#f8fafc', false);
            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', `/board/${newBoard.id}`);
            }

            isBoardLoading = false;
            isProcessingHistory = true;
            undoStack.length = 0;
            redoStack.length = 0;
            updateHistoryButtons();

            canvas.clear();
            isProcessingHistory = false;
            canvas.renderAll();
            saveState();
            isBoardDirty = false;
            updateAutosaveIndicator('saved');

            expandBoardsSidebar();
            renderBoardsList();
            showToast(`Created "${finalName}"`);
        } catch (err) {
            console.error('Error creating board:', err);
            showToast('Failed to create board on server');
        }
    }

    async function deleteBoard(boardId) {
        if (boards.length <= 1) {
            showToast('Cannot delete the only board');
            return;
        }

        const board = boards.find(b => b.id === boardId);
        if (!board) return;

        if (!confirm(`Are you sure you want to delete "${board.name}"?`)) return;

        try {
            const res = await fetch(`/api/boards/${boardId}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            boards = boards.filter(b => b.id !== boardId);
            localStorage.removeItem('whiteboard_board_data_' + boardId);

            showToast(`Deleted "${board.name}"`);

            if (activeBoardId === boardId) {
                await switchBoard(boards[0].id);
            } else {
                renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
            }
        } catch (err) {
            console.error('Failed to delete board:', err);
            showToast('Failed to delete board on server');
        }
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

        async function commitRename() {
            if (finished) return;
            finished = true;
            const val = input.value.trim();
            if (val && val !== originalName) {
                board.name = val;
                try {
                    await fetch(`/api/boards/${boardId}/rename`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: val })
                    });
                    showToast(`Renamed to "${board.name}"`);
                } catch (err) {
                    console.error('Failed to rename board on server:', err);
                }
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

    async function renameBoard(boardId) {
        const board = boards.find(b => b.id === boardId);
        if (!board) return;

        const newName = prompt('Enter new board name:', board.name);
        if (newName === null) return;
        const finalName = newName.trim();
        if (!finalName || finalName === board.name) return;

        board.name = finalName;
        try {
            await fetch(`/api/boards/${boardId}/rename`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: finalName })
            });
            showToast(`Renamed to "${board.name}"`);
        } catch (err) {
            console.error('Failed to rename board on server:', err);
        }
        renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
    }

    function handleImportBoardFile(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(event) {
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
            const isImportable = parsedData &&
                typeof parsedData === 'object' &&
                !Array.isArray(parsedData) &&
                Array.isArray(parsedData.objects);

            if (!isImportable) {
                showToast('Import failed: JSON file is not an importable whiteboard board!');
                return;
            }

            // Save active board before loading imported one if dirty
            if (isBoardDirty) {
                await saveActiveBoardToServer(true);
            }

            let boardName = file.name.replace(/\.[^/.]+$/, '').trim();
            if (!boardName) boardName = 'Imported Board';

            const importedBg = (parsedData.bgColor && typeof parsedData.bgColor === 'string')
                ? parsedData.bgColor
                : '#f8fafc';

            try {
                const res = await fetch('/api/boards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: boardName,
                        bg_color: importedBg,
                        data: JSON.stringify(parsedData)
                    })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const newBoard = await res.json();
                newBoard.bgColor = importedBg;
                boards.push(newBoard);

                await switchBoard(newBoard.id);
                expandBoardsSidebar();
                showToast(`Board "${boardName}" imported successfully!`);
            } catch (err) {
                console.error('Import board error:', err);
                showToast('Error saving imported board to database');
            }
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

    async function initBoards() {
        isBoardLoading = true;
        updateAutosaveIndicator('saving', 'Loading...');

        // 1. Determine requested board ID
        const bodyInitialId = (document.body.dataset && document.body.dataset.initialBoardId) ? document.body.dataset.initialBoardId.trim() : '';
        const urlParams = new URLSearchParams(window.location.search);
        const queryBoardId = urlParams.get('board');
        let preferredId = bodyInitialId || queryBoardId || localStorage.getItem('whiteboard_active_board_id') || null;

        // 2. Fetch boards list from SQLite
        try {
            const res = await fetch('/api/boards');
            if (res.ok) {
                const serverBoards = await res.json();
                if (Array.isArray(serverBoards) && serverBoards.length > 0) {
                    boards = serverBoards.map(b => ({
                        ...b,
                        bgColor: b.bg_color || b.bgColor || '#f8fafc'
                    }));
                }
            }
        } catch (fetchErr) {
            console.warn('Could not fetch boards from server, checking fallback:', fetchErr);
        }

        // 3. Fallback / legacy check if server returned no boards
        if (!boards || boards.length === 0) {
            try {
                const meta = localStorage.getItem('whiteboard_boards_meta');
                if (meta) boards = JSON.parse(meta);
            } catch (e) {}

            if (!boards || boards.length === 0) {
                boards = [{
                    id: 'board_main',
                    name: 'Main Board',
                    bgColor: '#f8fafc',
                    created_at: Date.now(),
                    updated_at: Date.now()
                }];
            }
        }

        // 4. Select active board ID
        if (preferredId && boards.some(b => b.id === preferredId)) {
            activeBoardId = preferredId;
        } else {
            activeBoardId = boards[0].id;
        }
        localStorage.setItem('whiteboard_active_board_id', activeBoardId);

        // 5. Fetch full board data for active board from SQLite
        const activeBoard = boards.find(b => b.id === activeBoardId);
        const currentBg = (activeBoard && (activeBoard.bg_color || activeBoard.bgColor)) ? (activeBoard.bg_color || activeBoard.bgColor) : '#f8fafc';
        setBoardBackgroundColor(currentBg, false);

        try {
            const res = await fetch(`/api/boards/${activeBoardId}`);
            if (res.ok) {
                const boardRecord = await res.json();
                let parsedData = null;
                if (typeof boardRecord.data === 'string') {
                    try {
                        parsedData = JSON.parse(boardRecord.data);
                    } catch (e) {
                        parsedData = { version: '5.3.0', objects: [] };
                    }
                } else {
                    parsedData = boardRecord.data || { version: '5.3.0', objects: [] };
                }

                if (boardRecord.bg_color) {
                    setBoardBackgroundColor(boardRecord.bg_color, false);
                }

                if (parsedData.infiniteBoardObjects && Array.isArray(parsedData.infiniteBoardObjects)) {
                    infiniteBoardObjects = parsedData.infiniteBoardObjects;
                } else if (Array.isArray(parsedData.objects)) {
                    infiniteBoardObjects = parsedData.objects.filter(o => !o.isSlideFrame);
                } else {
                    infiniteBoardObjects = [];
                }

                if (parsedData.boardSlides && Array.isArray(parsedData.boardSlides) && parsedData.boardSlides.length > 0) {
                    boardSlides = parsedData.boardSlides;
                    currentSlideIndex = parsedData.currentSlideIndex || 0;
                } else {
                    boardSlides = [
                        { id: 'slide_' + Date.now(), name: 'Slide 1', objects: [] }
                    ];
                    currentSlideIndex = 0;
                }

                const loadPayload = (parsedData.currentFrameRatio && parsedData.currentFrameRatio !== 'infinite')
                    ? parsedData
                    : { version: '5.3.0', objects: infiniteBoardObjects };

                isProcessingHistory = true;
                canvas.loadFromJSON(loadPayload, () => {
                    reconnectLoadedObjects();
                    canvas.renderAll();
                    isBoardLoading = false;
                    isProcessingHistory = false;
                    isBoardDirty = false;
                    undoStack.length = 0;
                    redoStack.length = 0;
                    saveState();
                    isBoardDirty = false;
                    updateAutosaveIndicator('saved');
                });
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (loadErr) {
            console.warn('Could not load board from server, trying local cache:', loadErr);
            const currentBoardData = localStorage.getItem('whiteboard_board_data_' + activeBoardId);
            if (currentBoardData) {
                try {
                    const data = JSON.parse(currentBoardData);
                    isProcessingHistory = true;
                    canvas.loadFromJSON(data, () => {
                        reconnectLoadedObjects();
                        canvas.renderAll();
                        isBoardLoading = false;
                        isProcessingHistory = false;
                        isBoardDirty = false;
                        undoStack.length = 0;
                        redoStack.length = 0;
                        saveState();
                        isBoardDirty = false;
                        updateAutosaveIndicator('saved');
                    });
                } catch (e) {
                    isBoardLoading = false;
                    isProcessingHistory = false;
                    updateAutosaveIndicator('saved');
                }
            } else {
                isBoardLoading = false;
                isProcessingHistory = false;
                updateAutosaveIndicator('saved');
            }
        }

        renderBoardsList();
        startAutosaveLoop();
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

        // Dismiss modals or exit fullscreen if open and user presses Escape
        if (key === 'Escape' || code === 'Escape') {
            if (modalExitSlide && !modalExitSlide.classList.contains('hidden')) {
                e.preventDefault();
                closeExitSlideModal();
                return;
            }
            if (isSlidePageFullscreen) {
                e.preventDefault();
                toggleSlidePageFullscreen(false);
                return;
            }
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
        if (!isCtrl && (key === 'c' || key === 'C')) {
            addBuiltinShape('circle');
            return;
        }
        if (!isCtrl && (key === 'o' || key === 'O')) {
            toggleObjectsDrawer();
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
            if (currentMode === 'eraser') {
                setEraserSubMode(eraserSubMode === 'brush' ? 'area' : 'brush');
            } else {
                setMode('eraser');
            }
            return;
        }
        if (!isCtrl && (key === '[' || code === 'BracketLeft')) {
            if (currentMode === 'eraser') {
                setEraserSize(eraserSize - 6);
                showToast(`Eraser Size: ${eraserSize}px`);
            } else {
                setStrokeSize(strokeSize - 1);
                showToast(`Writing Size: ${strokeSize}px`);
            }
            return;
        }
        if (!isCtrl && (key === ']' || code === 'BracketRight')) {
            if (currentMode === 'eraser') {
                setEraserSize(eraserSize + 6);
                showToast(`Eraser Size: ${eraserSize}px`);
            } else {
                setStrokeSize(strokeSize + 1);
                showToast(`Writing Size: ${strokeSize}px`);
            }
            return;
        }
        if (key === 'Escape') {
            if (typeof closeStepBoxManager === 'function') closeStepBoxManager();
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
                if (typeof constrainObjectToSlideFrame === 'function') {
                    constrainObjectToSlideFrame(activeObj);
                }
                updateConnectedLinesFor(activeObj);
                canvas.requestRenderAll();
                saveState();
                e.preventDefault();
            }
            return;
        }

        // Slide Navigation Shortcuts (PageDown / PageUp or Alt + ArrowRight / Alt + ArrowLeft)
        if (currentFrameRatio !== 'infinite' && !isUserTyping()) {
            if (key === 'PageDown' || (e.altKey && key === 'ArrowRight')) {
                e.preventDefault();
                if (currentSlideIndex < boardSlides.length - 1) {
                    saveCurrentSlide();
                    loadSlide(currentSlideIndex + 1);
                }
                return;
            }
            if (key === 'PageUp' || (e.altKey && key === 'ArrowLeft')) {
                e.preventDefault();
                if (currentSlideIndex > 0) {
                    saveCurrentSlide();
                    loadSlide(currentSlideIndex - 1);
                }
                return;
            }
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
        if (typeof markBoardDirty === 'function') {
            markBoardDirty();
        }
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
        if (typeof markBoardDirty === 'function') {
            markBoardDirty();
        }
        if (typeof saveActiveBoardDebounced === 'function') {
            saveActiveBoardDebounced();
        }
    }

    function redo() {
        if (redoStack.length === 0) return;

        const nextState = redoStack.pop();
        undoStack.push(nextState);

        loadCanvasState(nextState);
        if (typeof markBoardDirty === 'function') {
            markBoardDirty();
        }
        if (typeof saveActiveBoardDebounced === 'function') {
            saveActiveBoardDebounced();
        }
    }

    function loadCanvasState(jsonState) {
        isProcessingHistory = true;
        const currentVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : null;

        canvas.loadFromJSON(jsonState, () => {
            if (currentVpt) {
                canvas.setViewportTransform(currentVpt);
            }

            reconnectLoadedObjects();

            canvas.renderAll();
            isProcessingHistory = false;
            updateHistoryButtons();
            updateSelectionUI();
        });
    }

    btnUndo.addEventListener('click', undo);
    btnRedo.addEventListener('click', redo);

    canvas.on('object:added', (opt) => {
        const addedObj = opt.target;
        if (addedObj && !addedObj.isStepBox && !addedObj.isArrowHead && !addedObj.stepBoxOwnerId && currentMode !== 'eraser' && addedObj.globalCompositeOperation !== 'destination-out') {
            if (typeof findStepBoxContaining === 'function') {
                const parentBox = findStepBoxContaining(addedObj);
                if (parentBox) {
                    addedObj.stepBoxOwnerId = parentBox.stepBoxId;
                }
            }
        }
        if (addedObj && !addedObj.isSlideFrame && currentFrameRatio !== 'infinite') {
            if (typeof applySlideClip === 'function') {
                applySlideClip(addedObj);
            }
        }
        saveState();
    });
    canvas.on('object:modified', () => saveState());
    canvas.on('object:removed', () => saveState());

    // Flush dirty board save on window unload
    window.addEventListener('beforeunload', () => {
        if (isBoardDirty && activeBoardId && !isBoardLoading) {
            try {
                const dataObj = canvas.toJSON(EXTRA_PROPS);
                const activeBoard = boards.find(b => b.id === activeBoardId);
                const bgColor = (activeBoard && (activeBoard.bg_color || activeBoard.bgColor)) ? (activeBoard.bg_color || activeBoard.bgColor) : '#f8fafc';
                const payload = JSON.stringify({
                    data: JSON.stringify(dataObj),
                    bg_color: bgColor
                });
                const blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon(`/api/boards/${activeBoardId}`, blob);
            } catch (e) {}
        }
    });

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
        if (currentFrameRatio !== 'infinite' && slideFrameRect) {
            const toRemove = canvas.getObjects().filter(o => !o.isSlideFrame);
            toRemove.forEach(o => canvas.remove(o));
            if (boardSlides[currentSlideIndex]) {
                boardSlides[currentSlideIndex].objects = [];
            }
        } else {
            canvas.clear();
        }
        if (stepBoxFloatingBar) {
            stepBoxFloatingBar.style.display = 'none';
        }
        activeStepBox = null;
        saveState();
    });

    // -------------------------------------------------------------------------
    // 19. Initial Boot
    // -------------------------------------------------------------------------
    updateZoomDisplay();
    updateGrid();
    loadShapes();
    loadTemplates();
    loadStickers();
});

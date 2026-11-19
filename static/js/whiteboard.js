/**
 * Whiteboard Web App - Client-side Logic (Phase 3)
 *
 * Implements:
 * - Full-screen Fabric.js canvas with responsive grid background
 * - Freehand pen (color, size) using Fabric.js PencilBrush
 * - Translucent highlighter using Fabric.js PencilBrush
 * - Eraser using Fabric.js PencilBrush (destination-out & object removal)
 * - Text tool: Click anywhere and type with font size, color, bold, and italic using Fabric.js IText
 * - Sticky Note tool: Fabric.js Group of a rectangle and editable text with 4 pastel colors (yellow, pink, green, blue)
 * - Select tool: Move, resize, rotate, and delete objects & sticky notes
 * - Pan (drag) & Zoom (wheel & controls) with zoom percentage indicator
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

    // Tool Properties
    const colorPicker = document.getElementById('color-picker');
    const colorPreview = document.getElementById('color-preview');
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
    // Modes: 'select', 'pan', 'pen', 'highlighter', 'eraser', 'text', 'sticky'
    let currentMode = 'select';

    // Tool settings
    let currentColor = colorPicker.value || '#1e293b';
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

    // Grid size constant (in canvas pixels at 100% zoom)
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

    // Handle window resize dynamically
    window.addEventListener('resize', () => {
        canvas.setWidth(window.innerWidth);
        canvas.setHeight(window.innerHeight);
        canvas.renderAll();
        updateGrid();
    });

    // -------------------------------------------------------------------------
    // 4. Color & Brush Helpers
    // -------------------------------------------------------------------------
    /**
     * Converts a hex color (#RRGGBB or #RGB) to rgba string with given alpha.
     */
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

    /**
     * Updates Fabric.js freeDrawingBrush (PencilBrush) properties based on active mode.
     */
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
    // 5. Sticky Note Factory Function
    // -------------------------------------------------------------------------
    /**
     * Builds a sticky note as a Fabric.js group of a rectangle and a textbox.
     */
    function createStickyNote(x, y, colorKey = currentStickyColor, initialText = 'Type a note...') {
        const colors = STICKY_COLORS[colorKey] || STICKY_COLORS.yellow;
        const noteWidth = 180;
        const noteHeight = 180;

        // Sticky note background rectangle
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

        // Sticky note text
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

        // Group rectangle and text together
        const group = new fabric.Group([rect, text], {
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            isStickyNote: true,
            stickyColor: colorKey,
            subTargetCheck: false // Group moves, resizes, and deletes as one object
        });

        return { group, rect, text };
    }

    /**
     * Sets active sticky note color and updates selected note if applicable.
     */
    function setStickyColor(colorKey, shouldUpdateSelection = true) {
        currentStickyColor = colorKey;

        // Update active class on toolbar color swatches
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
    // 6. Grid Background Synchronization
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
    // 7. Zoom Controls & Indicator
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
    // 8. Mode Management
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

    /**
     * Switches the active tool mode and updates canvas and toolbar states.
     */
    function setMode(mode) {
        currentMode = mode;

        // Update active class on toolbar buttons
        Object.entries(toolButtons).forEach(([key, btn]) => {
            if (btn) btn.classList.toggle('active', key === mode);
        });

        // Configure canvas based on mode
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

    // Attach tool button click handlers
    btnSelect.addEventListener('click', () => setMode('select'));
    btnPan.addEventListener('click', () => setMode('pan'));
    btnPen.addEventListener('click', () => setMode('pen'));
    btnHighlighter.addEventListener('click', () => setMode('highlighter'));
    btnEraser.addEventListener('click', () => setMode('eraser'));
    btnText.addEventListener('click', () => setMode('text'));
    btnSticky.addEventListener('click', () => setMode('sticky'));

    // -------------------------------------------------------------------------
    // 9. Freehand Brush & Eraser Finalization (path:created)
    // -------------------------------------------------------------------------
    canvas.on('path:created', (opt) => {
        const path = opt.path;
        if (!path) return;

        if (currentMode === 'eraser') {
            // PencilBrush Eraser: destination-out clears pixels on lowerCanvasEl
            path.set({
                stroke: '#000000',
                globalCompositeOperation: 'destination-out',
                selectable: false,
                evented: false,
                objectCaching: false
            });
            canvas.renderAll();
        } else if (currentMode === 'highlighter') {
            // Highlighter: apply translucent stroke
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
    // 10. Mouse Down: Pan, Sticky Notes, Text, Eraser Clicks
    // -------------------------------------------------------------------------
    canvas.on('mouse:down', (opt) => {
        const evt = opt.e;
        const isMiddleClick = evt.button === 1;
        const shouldPan = currentMode === 'pan' || isSpacePressed || isMiddleClick;

        // 1. Pan handling
        if (shouldPan) {
            isPanning = true;
            lastPosX = evt.clientX;
            lastPosY = evt.clientY;
            canvas.defaultCursor = 'grabbing';
            evt.preventDefault();
            return;
        }

        // 2. Eraser click on existing object deletes it directly
        if (currentMode === 'eraser' && opt.target) {
            canvas.remove(opt.target);
            canvas.renderAll();
            saveState();
            return;
        }

        // 3. Sticky Note Tool: Click places a sticky note with editable text
        if (currentMode === 'sticky') {
            const pointer = canvas.getPointer(opt.e);
            const { group, text } = createStickyNote(pointer.x, pointer.y, currentStickyColor, 'Type note...');

            canvas.add(group);
            canvas.renderAll();
            saveState();

            // Switch to select mode and immediately enter editing on the note's text
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

        // 4. Text Tool: Click anywhere to type using Fabric.js IText
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

    // Double-click on sticky note enters text editing mode
    canvas.on('mouse:dblclick', (opt) => {
        if (opt.target && opt.target.isStickyNote) {
            const group = opt.target;
            const textObj = group.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text');
            if (textObj) {
                canvas.setActiveObject(textObj);
                textObj.enterEditing();
                textObj.selectAll();
                canvas.renderAll();

                textObj.on('editing:exited', () => {
                    canvas.setActiveObject(group);
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

    // Mouse Up: Stop panning
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
    // 11. Selection, Move, Resize & Delete Controls
    // -------------------------------------------------------------------------
    function updateSelectionUI() {
        const activeObjs = canvas.getActiveObjects();
        btnDelete.disabled = (!activeObjs || activeObjs.length === 0);

        const activeObj = canvas.getActiveObject();
        if (activeObj) {
            // If sticky note selected, highlight its color swatch
            if (activeObj.isStickyNote && activeObj.stickyColor) {
                setStickyColor(activeObj.stickyColor, false);
            }

            // If a standalone IText is selected, sync font formatting controls
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

    /**
     * Deletes currently selected objects or sticky notes.
     */
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
    // 12. Property Handlers (Color, Stroke Size, Font Size, Bold, Italic)
    // -------------------------------------------------------------------------
    colorPicker.addEventListener('input', (e) => {
        currentColor = e.target.value;
        colorPreview.style.backgroundColor = currentColor;

        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.type === 'i-text') {
            activeObj.set('fill', currentColor);
            canvas.renderAll();
            saveState();
        }

        if (canvas.isDrawingMode) {
            updateBrushSettings();
        }
    });

    selectStrokeSize.addEventListener('change', () => {
        if (canvas.isDrawingMode) {
            updateBrushSettings();
        }
    });

    selectFontSize.addEventListener('change', () => {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.type === 'i-text') {
            activeObj.set('fontSize', parseInt(selectFontSize.value, 10));
            canvas.renderAll();
            saveState();
        }
    });

    btnBold.addEventListener('click', () => {
        isBold = !isBold;
        btnBold.classList.toggle('active', isBold);

        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.type === 'i-text') {
            activeObj.set('fontWeight', isBold ? 'bold' : 'normal');
            canvas.renderAll();
            saveState();
        }
    });

    btnItalic.addEventListener('click', () => {
        isItalic = !isItalic;
        btnItalic.classList.toggle('active', isItalic);

        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.type === 'i-text') {
            activeObj.set('fontStyle', isItalic ? 'italic' : 'normal');
            canvas.renderAll();
            saveState();
        }
    });

    // -------------------------------------------------------------------------
    // 13. Keyboard Shortcuts & Typing Detection
    // -------------------------------------------------------------------------
    function isUserTyping() {
        const activeObj = canvas.getActiveObject();
        if (activeObj && activeObj.isEditing) return true;
        const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        return tag === 'input' || tag === 'textarea' || tag === 'select';
    }

    window.addEventListener('keydown', (e) => {
        // Spacebar hold for temporary panning
        if (e.code === 'Space' && !isSpacePressed && !isUserTyping()) {
            isSpacePressed = true;
            wasDrawingMode = canvas.isDrawingMode;
            canvas.isDrawingMode = false;
            canvas.defaultCursor = 'grab';
            canvas.selection = false;
            e.preventDefault();
            return;
        }

        // Ignore hotkeys while actively typing text
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

        // Delete / Backspace: Delete selected object(s)
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
    // 14. Undo / Redo History Management
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
    // 15. Sample Shapes & Clear
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
    // 16. Initial Boot
    // -------------------------------------------------------------------------
    saveState();
    updateZoomDisplay();
    updateGrid();
});

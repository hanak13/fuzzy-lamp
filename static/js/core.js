/**
 * Whiteboard Application - Core Engine Module
 * static/js/core.js
 *
 * Implements Phase 0 / Step 1:
 * - Shared application namespace: window.WhiteboardApp
 * - DOM element caching and accessors
 * - Shared state variables & synchronization bridge
 * - Fabric.js Canvas initialization and responsive viewport resize
 * - Responsive grid background positioning (updateGrid)
 * - Canvas Zoom engine, wheel navigation, and zoom percentage indicator
 * - Global toast notification dispatcher
 */

(function (window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    const GRID_BASE_SIZE = 30;
    const MAX_HISTORY = 50;

    // Extra properties to serialize in Fabric JSON history and LAN sync
    const EXTRA_PROPS = [
        'id',
        'isSmartShape',
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
        'imageName',
        'isIcon',
        'iconName',
        'iconCategory',
        'iconSvg'
    ];

    const STICKY_COLORS = {
        yellow: { bg: '#fef08a', border: '#fde047', text: '#1e293b' },
        pink: { bg: '#fbcfe8', border: '#f9a8d4', text: '#1e293b' },
        green: { bg: '#bbf7d0', border: '#86efac', text: '#1e293b' },
        blue: { bg: '#bfdbfe', border: '#93c5fd', text: '#1e293b' }
    };

    // Shared State Container
    const state = {
        currentMode: 'select',
        currentColor: '#1e293b',
        currentFillColor: 'transparent',
        strokeSize: 4,
        eraserSize: 30,
        eraserSubMode: 'brush',
        currentStickyColor: 'yellow',
        currentLinePattern: 'solid',
        currentArrowHeadStyle: 'end',
        activeCategory: 'all',
        activeFlowchartSection: 'all',
        currentFrameRatio: 'infinite',
        slideFrameRect: null,
        boardSlides: [],
        currentSlideIndex: 0,
        boards: [],
        activeBoardId: null,
        isProcessingHistory: false,
        undoStack: [],
        redoStack: []
    };

    let canvas = null;
    let toastTimeout = null;

    // DOM Element References (cached lazily)
    const dom = {
        get container() { return document.getElementById('canvas-container'); },
        get canvasEl() { return document.getElementById('whiteboard-canvas'); },
        get toast() { return document.getElementById('toast'); },
        get zoomPercentage() { return document.getElementById('zoom-percentage'); },
        get btnZoomIn() { return document.getElementById('btn-zoom-in'); },
        get btnZoomOut() { return document.getElementById('btn-zoom-out'); },
        get btnResetView() { return document.getElementById('btn-reset-view'); }
    };

    function showToast(message) {
        const toastEl = dom.toast;
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.remove('hidden');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toastEl.classList.add('hidden');
        }, 2200);
    }

    function updateGrid() {
        if (!canvas) return;
        const container = dom.container;
        if (!container) return;

        const zoom = canvas.getZoom();
        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];

        const scaledGrid = GRID_BASE_SIZE * zoom;
        const posX = ((vpt[4] % scaledGrid) + scaledGrid) % scaledGrid;
        const posY = ((vpt[5] % scaledGrid) + scaledGrid) % scaledGrid;

        container.style.backgroundSize = `${scaledGrid}px ${scaledGrid}px`;
        container.style.backgroundPosition = `${posX}px ${posY}px`;
    }

    function updateZoomDisplay() {
        if (!canvas) return;
        const zoomEl = dom.zoomPercentage;
        if (!zoomEl) return;
        const zoom = canvas.getZoom();
        const percentage = Math.round(zoom * 100);
        zoomEl.textContent = `${percentage}%`;
    }

    function setZoom(newZoom, point) {
        if (!canvas) return;
        const clampedZoom = Math.max(0.1, Math.min(5.0, newZoom));
        const targetPoint = point || new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);

        canvas.zoomToPoint(targetPoint, clampedZoom);
        updateZoomDisplay();
        updateGrid();

        if (window.activeStepBox && typeof window.updateStepBoxFloatingControls === 'function') {
            window.updateStepBoxFloatingControls(window.activeStepBox);
        }
    }

    function resetView() {
        if (!canvas) return;
        canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        updateZoomDisplay();
        updateGrid();

        if (window.activeStepBox && typeof window.updateStepBoxFloatingControls === 'function') {
            window.updateStepBoxFloatingControls(window.activeStepBox);
        }
    }

    function initCanvas() {
        if (canvas) return canvas;
        const canvasEl = document.getElementById('whiteboard-canvas');
        if (!canvasEl || typeof fabric === 'undefined') return null;

        canvas = new fabric.Canvas('whiteboard-canvas', {
            width: window.innerWidth,
            height: window.innerHeight,
            selection: true,
            preserveObjectStacking: true,
            stopContextMenu: true,
            fireRightClick: true
        });

        // Publish canvas immediately to all namespaces
        window.__canvas = canvas;
        window.canvas = canvas;
        window.WhiteboardApp.canvas = canvas;

        window.addEventListener('resize', () => {
            if (!canvas) return;
            canvas.setWidth(window.innerWidth);
            canvas.setHeight(window.innerHeight);
            canvas.renderAll();
            updateGrid();
        });

        // Wheel zoom handling
        canvas.on('mouse:wheel', (opt) => {
            const delta = opt.e.deltaY;
            let zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;
            setZoom(zoom, new fabric.Point(opt.e.offsetX, opt.e.offsetY));
            opt.e.preventDefault();
            opt.e.stopPropagation();
        });

        // Top-level canvas overlay rendering hook (Step Box borders & Slide Frame guidelines)
        canvas.on('after:render', (opt) => {
            const ctx = (opt && opt.ctx) ? opt.ctx : canvas.getContext();
            if (!ctx) return;
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            ctx.save();
            ctx.transform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);

            if (window.WhiteboardApp && window.WhiteboardApp.steps && typeof window.WhiteboardApp.steps.renderStepBoxOverlays === 'function') {
                window.WhiteboardApp.steps.renderStepBoxOverlays(ctx);
            } else if (typeof window.renderStepBoxOverlays === 'function') {
                window.renderStepBoxOverlays(ctx);
            }

            if (window.WhiteboardApp && window.WhiteboardApp.slides && typeof window.WhiteboardApp.slides.renderSlideFrameOverlays === 'function') {
                window.WhiteboardApp.slides.renderSlideFrameOverlays(ctx);
            } else if (typeof window.renderSlideFrameOverlays === 'function') {
                window.renderSlideFrameOverlays(ctx);
            }

            ctx.restore();
        });

        // Zoom button event bindings
        const btnIn = dom.btnZoomIn;
        const btnOut = dom.btnZoomOut;
        const btnReset = dom.btnResetView;
        const zoomEl = dom.zoomPercentage;
        const btnFullscreenToggle = document.getElementById('btn-fullscreen-toggle');
        const btnZoomFullscreen = document.getElementById('btn-zoom-fullscreen');
        const fullscreenIconExpand = document.getElementById('fullscreen-icon-expand');
        const fullscreenIconCompress = document.getElementById('fullscreen-icon-compress');

        if (btnIn) btnIn.addEventListener('click', () => setZoom(canvas.getZoom() * 1.2));
        if (btnOut) btnOut.addEventListener('click', () => setZoom(canvas.getZoom() / 1.2));
        if (btnReset) btnReset.addEventListener('click', resetView);
        if (zoomEl) zoomEl.addEventListener('click', resetView);
        if (btnFullscreenToggle) btnFullscreenToggle.addEventListener('click', toggleFullscreen);
        if (btnZoomFullscreen) btnZoomFullscreen.addEventListener('click', toggleFullscreen);

        document.addEventListener('fullscreenchange', () => {
            const isFull = !!document.fullscreenElement;
            if (fullscreenIconExpand && fullscreenIconCompress) {
                fullscreenIconExpand.style.display = isFull ? 'none' : 'block';
                fullscreenIconCompress.style.display = isFull ? 'block' : 'none';
            }
            const zoomExpand = document.getElementById('zoom-fullscreen-icon-expand');
            const zoomCompress = document.getElementById('zoom-fullscreen-icon-compress');
            if (zoomExpand && zoomCompress) {
                zoomExpand.style.display = isFull ? 'none' : 'block';
                zoomCompress.style.display = isFull ? 'block' : 'none';
            }
            const label = document.getElementById('fullscreen-btn-label');
            if (label) {
                label.textContent = isFull ? 'Exit' : 'Fullscreen';
            }
            const zoomBtn = document.getElementById('btn-zoom-fullscreen');
            if (zoomBtn) {
                zoomBtn.title = isFull ? 'Exit Fullscreen (Escape or F11)' : 'Toggle Fullscreen (F11)';
            }
            if (btnFullscreenToggle) {
                btnFullscreenToggle.title = isFull ? 'Exit Fullscreen (Escape or F11)' : 'Toggle Fullscreen (F11)';
            }
        });

        updateGrid();
        updateZoomDisplay();

        return canvas;
    }

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

    function fitEntireCanvas() {
        if (!canvas) return;
        const objs = canvas.getObjects().filter(o => !o.isArrowHead && o.globalCompositeOperation !== 'destination-out' && !o.isSlideFrame);
        if (objs.length === 0) {
            resetView();
            return;
        }
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        objs.forEach(o => {
            const b = o.getBoundingRect ? o.getBoundingRect(true) : null;
            if (b) {
                minX = Math.min(minX, b.left);
                minY = Math.min(minY, b.top);
                maxX = Math.max(maxX, b.left + b.width);
                maxY = Math.max(maxY, b.top + b.height);
            }
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
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (!activeObj) {
            showToast('Select an object first (Shift + 2)');
            return;
        }
        const b = activeObj.getBoundingRect ? activeObj.getBoundingRect(true) : null;
        if (!b) return;
        const padding = 80;
        const zoomX = (canvas.getWidth() - padding * 2) / Math.max(20, b.width);
        const zoomY = (canvas.getHeight() - padding * 2) / Math.max(20, b.height);
        const newZoom = Math.max(0.1, Math.min(4.0, Math.min(zoomX, zoomY)));
        const center = activeObj.getCenterPoint ? activeObj.getCenterPoint() : { x: b.left + b.width / 2, y: b.top + b.height / 2 };
        canvas.setZoom(newZoom);
        canvas.viewportTransform[4] = canvas.getWidth() / 2 - center.x * newZoom;
        canvas.viewportTransform[5] = canvas.getHeight() / 2 - center.y * newZoom;
        canvas.requestRenderAll();
        updateGrid();
        updateZoomDisplay();
        showToast('Zoomed to selection (Shift + 2)');
    }

    function goToOrigin() {
        if (!canvas) return;
        canvas.viewportTransform[4] = 0;
        canvas.viewportTransform[5] = 0;
        canvas.requestRenderAll();
        updateGrid();
        updateZoomDisplay();
        showToast('Canvas origin (Home)');
    }

    // Auto-init canvas on DOM ready if not yet created
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initCanvas();
        });
    } else {
        initCanvas();
    }

    const CoreModule = {
        get canvas() { return canvas || initCanvas(); },
        initCanvas,
        state,
        dom,
        GRID_BASE_SIZE,
        MAX_HISTORY,
        EXTRA_PROPS,
        STICKY_COLORS,
        showToast,
        updateGrid,
        updateZoomDisplay,
        setZoom,
        resetView,
        toggleFullscreen,
        fitEntireCanvas,
        zoomToSelection,
        goToOrigin
    };

    window.WhiteboardApp.core = CoreModule;
    window.WhiteboardApp.canvas = canvas;
    window.WhiteboardApp.state = state;
    window.WhiteboardApp.GRID_BASE_SIZE = GRID_BASE_SIZE;
    window.WhiteboardApp.MAX_HISTORY = MAX_HISTORY;
    window.WhiteboardApp.EXTRA_PROPS = EXTRA_PROPS;
    window.WhiteboardApp.STICKY_COLORS = STICKY_COLORS;

    // Backward compatibility direct window exports
    window.EXTRA_PROPS = EXTRA_PROPS;
    window.currentLinePattern = state.currentLinePattern;
    window.currentArrowHeadStyle = state.currentArrowHeadStyle;
    window.showToast = showToast;
    window.updateGrid = updateGrid;
    window.updateZoomDisplay = updateZoomDisplay;
    window.setZoom = setZoom;
    window.resetView = resetView;
    window.toggleFullscreen = toggleFullscreen;
    window.fitEntireCanvas = fitEntireCanvas;
    window.zoomToSelection = zoomToSelection;
    window.goToOrigin = goToOrigin;

    // Global Fabric textBaseline sanitization: convert non-standard 'alphabetical' -> 'alphabetic'
    if (window.fabric && window.fabric.Text) {
        const origTextInit = window.fabric.Text.prototype.initialize;
        window.fabric.Text.prototype.initialize = function(text, options) {
            if (options && options.textBaseline === 'alphabetical') {
                options.textBaseline = 'alphabetic';
            }
            return origTextInit.call(this, text, options);
        };
        const origSet = window.fabric.Text.prototype._set;
        window.fabric.Text.prototype._set = function(key, value) {
            if (key === 'textBaseline' && value === 'alphabetical') {
                value = 'alphabetic';
            }
            return origSet.call(this, key, value);
        };
    }

    // Modal accessibility synchronization: ensures aria-hidden matches visibility
    // to prevent browser "Blocked aria-hidden on an element because its descendant retained focus"
    function initModalAccessibilityObserver() {
        const syncModalAria = (el) => {
            const isHidden = el.classList.contains('hidden');
            el.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
        };
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            syncModalAria(modal);
            const observer = new MutationObserver(() => syncModalAria(modal));
            observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModalAccessibilityObserver);
    } else {
        initModalAccessibilityObserver();
    }

})(window);

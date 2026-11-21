/**
 * Whiteboard Application - Modes & Dock Management Module
 * static/js/modes.js
 *
 * Implements:
 * - Mode state switching (Select, Pan, Pen, Highlighter, Eraser, Text, Sticky, Line, Arrow, StepBox)
 * - Canvas cursor, selection state, and drawing brush synchronization
 * - Floating dock toolbar and fullscreen presenter controls (pen, paint, eraser, color swatches)
 * - Dark / Light theme toggling with localStorage persistence
 */

(function (window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    let currentMode = 'select';
    window.currentMode = 'select';
    window.__currentMode = 'select';
    window.WhiteboardApp.currentMode = 'select';

    function getCanvas() {
        return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
    }

    function setMode(mode) {
        currentMode = mode;
        window.currentMode = mode;
        window.__currentMode = mode;
        if (window.WhiteboardApp) {
            window.WhiteboardApp.currentMode = mode;
            if (window.WhiteboardApp.state) {
                window.WhiteboardApp.state.currentMode = mode;
            }
        }

        const toolButtons = {
            select: document.getElementById('btn-select'),
            pan: document.getElementById('btn-pan'),
            pen: document.getElementById('btn-pen'),
            highlighter: document.getElementById('btn-highlighter'),
            eraser: document.getElementById('btn-eraser'),
            text: document.getElementById('btn-text'),
            sticky: document.getElementById('btn-sticky') || document.getElementById('btn-sidebar-notes'),
            line: document.getElementById('btn-line'),
            arrow: document.getElementById('btn-arrow')
        };

        Object.entries(toolButtons).forEach(([key, btn]) => {
            if (btn) btn.classList.toggle('active', key === mode);
        });

        const btnSidebarStepbox = document.getElementById('btn-sidebar-stepbox');
        if (btnSidebarStepbox) {
            btnSidebarStepbox.classList.toggle('active', mode === 'stepbox');
        }

        const fsBtnPen = document.getElementById('fs-btn-pen');
        const fsBtnPaint = document.getElementById('fs-btn-paint');
        const fsBtnEraser = document.getElementById('fs-btn-eraser');
        const fsBtnSelect = document.getElementById('fs-btn-select');

        if (fsBtnPen) fsBtnPen.classList.toggle('active', mode === 'pen');
        if (fsBtnPaint) fsBtnPaint.classList.toggle('active', mode === 'highlighter');
        if (fsBtnEraser) fsBtnEraser.classList.toggle('active', mode === 'eraser');
        if (fsBtnSelect) fsBtnSelect.classList.toggle('active', mode === 'select');

        const propEraserGroup = document.getElementById('prop-eraser-group');
        const eraserCursorPreview = document.getElementById('eraser-cursor-preview');
        const propSizeGroup = document.getElementById('prop-size-group');
        const fsEraserModeGroup = document.getElementById('fs-eraser-mode-group');
        const fsSizeDisplay = document.getElementById('fs-size-display');
        const fsSizeSlider = document.getElementById('fs-size-slider');
        const propLineGroup = document.getElementById('prop-line-group');
        const propFillGroup = document.getElementById('prop-fill-group');
        const propTextGroup = document.getElementById('prop-text-group');

        const strokeSize = window.strokeSize || 4;
        const eraserSize = window.eraserSize || 30;

        if (mode !== 'eraser') {
            if (propEraserGroup) propEraserGroup.style.display = 'none';
            if (eraserCursorPreview) eraserCursorPreview.style.display = 'none';
            if (propSizeGroup) propSizeGroup.style.display = 'none';
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

        const canvas = getCanvas();
        if (!canvas) return;

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
            if (typeof window.updatePropertiesUIForSelection === 'function') {
                window.updatePropertiesUIForSelection(canvas.getActiveObject());
            }
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
            if (typeof window.updateBrushSettings === 'function') window.updateBrushSettings();
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
            if (typeof window.updateBrushSettings === 'function') window.updateBrushSettings();
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'none';
            canvas.renderAll();
        } else if (mode === 'eraser') {
            canvas.discardActiveObject();
            canvas.selection = false;
            canvas.isDrawingMode = false;
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
            const eraserSubMode = window.eraserSubMode || (window.WhiteboardApp && window.WhiteboardApp.eraserSubMode) || 'brush';
            if (typeof window.setEraserSubMode === 'function') {
                window.setEraserSubMode(eraserSubMode);
            }
            canvas.isDrawingMode = false;
            canvas.renderAll();
        } else if (mode === 'text' || mode === 'sticky') {
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

    // -------------------------------------------------------------------------
    // Theme Management
    // -------------------------------------------------------------------------
    function initTheme() {
        const themeBtn = document.getElementById('theme-toggle');
        const savedTheme = localStorage.getItem('whiteboard_theme');

        if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-theme');
            if (themeBtn) themeBtn.classList.add('active');
        }

        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const isDark = document.body.classList.toggle('dark-theme');
                themeBtn.classList.toggle('active', isDark);
                localStorage.setItem('whiteboard_theme', isDark ? 'dark' : 'light');
                if (typeof window.updateGrid === 'function') window.updateGrid();
            });
        }
    }

    function initModesUI() {
        const btnSelect = document.getElementById('btn-select');
        const btnPan = document.getElementById('btn-pan');
        const btnPen = document.getElementById('btn-pen');
        const btnHighlighter = document.getElementById('btn-highlighter');
        const btnEraser = document.getElementById('btn-eraser');
        const btnText = document.getElementById('btn-text');
        const btnSticky = document.getElementById('btn-sticky') || document.getElementById('btn-sidebar-notes');
        const btnLine = document.getElementById('btn-line');
        const btnArrow = document.getElementById('btn-arrow');

        if (btnSelect) btnSelect.addEventListener('click', () => setMode('select'));
        if (btnPan) btnPan.addEventListener('click', () => setMode('pan'));
        if (btnPen) btnPen.addEventListener('click', () => setMode('pen'));
        if (btnHighlighter) btnHighlighter.addEventListener('click', () => setMode('highlighter'));
        if (btnEraser) btnEraser.addEventListener('click', () => setMode('eraser'));
        if (btnText) btnText.addEventListener('click', () => setMode('text'));
        if (btnSticky) btnSticky.addEventListener('click', () => setMode('sticky'));
        if (btnLine) btnLine.addEventListener('click', () => setMode('line'));
        if (btnArrow) btnArrow.addEventListener('click', () => setMode('arrow'));

        // Fullscreen Presenter Controls Listeners (Bottom Right dock)
        const fsBtnPen = document.getElementById('fs-btn-pen');
        const fsBtnPaint = document.getElementById('fs-btn-paint');
        const fsBtnEraser = document.getElementById('fs-btn-eraser');
        const fsBtnSelect = document.getElementById('fs-btn-select');

        if (fsBtnPen) fsBtnPen.addEventListener('click', () => setMode('pen'));
        if (fsBtnPaint) fsBtnPaint.addEventListener('click', () => setMode('highlighter'));
        if (fsBtnEraser) fsBtnEraser.addEventListener('click', () => setMode('eraser'));
        if (fsBtnSelect) fsBtnSelect.addEventListener('click', () => setMode('select'));

        initTheme();
        setMode('select');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initModesUI);
    } else {
        initModesUI();
    }

    const ModesModule = {
        get currentMode() { return currentMode; },
        setMode,
        initTheme
    };

    window.WhiteboardApp.modes = ModesModule;

    // Direct global exports for backwards compatibility
    window.setMode = setMode;

})(window);

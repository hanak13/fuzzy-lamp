/**
 * Whiteboard Application - UI & Properties Management Module
 * static/js/ui.js
 *
 * Implements:
 * - Sidebar dock and flyout drawer opening/closing (Shapes, Flowchart, Notes, Stickers, Objects/Layers)
 * - Property bar controls: Fill color, Border/Stroke color, Line Pattern (solid/dashed/dotted), Arrowheads
 * - Text styling controls: Font size, Bold toggle, Italic toggle
 * - Dynamic property panel visibility based on active canvas selection
 */

(function (window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    let activeDrawerPanel = null;

    function getCanvas() {
        return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
    }

    // -------------------------------------------------------------------------
    // 1. Sidebar Dock & Drawer Controller
    // -------------------------------------------------------------------------
    function openDrawerPanel(panelId) {
        if (panelId === 'stepbox') {
            closeDrawer();
            if (typeof window.setMode === 'function') window.setMode('stepbox');
            if (typeof window.showToast === 'function') window.showToast('Drag on canvas to create a Step Box');
            return;
        }

        const shapesPanel = document.getElementById('shapes-panel');
        if (!shapesPanel) return;

        if (!shapesPanel.classList.contains('hidden') && activeDrawerPanel === panelId) {
            closeDrawer();
            return;
        }

        shapesPanel.classList.remove('hidden');
        activeDrawerPanel = panelId;

        const sidebarBtns = document.querySelectorAll('.sidebar-btn');
        sidebarBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panelId);
        });

        const btnToggleShapes = document.getElementById('btn-toggle-shapes');
        if (btnToggleShapes) {
            btnToggleShapes.classList.toggle('active', panelId === 'shapes' || panelId === 'flowchart');
        }

        const drawerPanels = document.querySelectorAll('.drawer-panel-content');
        const fcSubPills = document.querySelectorAll('.fc-sub-pill');
        const categoryChips = document.querySelectorAll('.category-chip');
        const shapesCategoriesEl = document.getElementById('shapes-categories');
        const shapesSearch = document.getElementById('shapes-search');

        if (panelId === 'flowchart') {
            drawerPanels.forEach(panel => {
                panel.style.display = (panel.id === 'drawer-panel-shapes') ? 'flex' : 'none';
            });
            window.activeCategory = 'Flowchart';
            window.activeFlowchartSection = 'all';
            fcSubPills.forEach(p => p.classList.toggle('active', p.dataset.section === 'all'));
            categoryChips.forEach(chip => {
                const isFc = (chip.dataset.category && chip.dataset.category.toLowerCase() === 'flowchart');
                chip.classList.toggle('active', isFc);
                if (isFc && shapesCategoriesEl) {
                    chip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            });
            if (shapesSearch) shapesSearch.value = '';
            if (typeof window.renderShapesList === 'function') window.renderShapesList();
        } else {
            drawerPanels.forEach(panel => {
                panel.style.display = (panel.id === `drawer-panel-${panelId}`) ? 'flex' : 'none';
            });
        }

        if (panelId === 'shapes') {
            categoryChips.forEach(c => c.classList.remove('active'));
            const allChip = document.querySelector('.category-chip[data-category="all"]');
            if (allChip) allChip.classList.add('active');
            window.activeCategory = 'all';
            if (typeof window.renderShapesList === 'function') window.renderShapesList();
        } else if (panelId === 'templates') {
            if (typeof window.renderTemplatesList === 'function') window.renderTemplatesList();
        } else if (panelId === 'stickers') {
            if (typeof window.renderStickersGallery === 'function') window.renderStickersGallery();
        } else if (panelId === 'layers') {
            if (typeof window.updateObjectsCountBadges === 'function') window.updateObjectsCountBadges();
            if (typeof window.renderObjectsList === 'function') window.renderObjectsList();
            const fsBtnObj = document.getElementById('fs-btn-objects');
            if (fsBtnObj) fsBtnObj.classList.add('active');
            const btnTopObj = document.getElementById('btn-topbar-objects');
            if (btnTopObj) btnTopObj.classList.add('active');
            const objSearch = document.getElementById('objects-search');
            if (objSearch) setTimeout(() => objSearch.focus(), 50);
        }
    }

    function closeDrawer() {
        const shapesPanel = document.getElementById('shapes-panel');
        if (!shapesPanel) return;
        shapesPanel.classList.add('hidden');
        shapesPanel.classList.remove('open-in-slide');
        shapesPanel.classList.remove('open-floating');
        activeDrawerPanel = null;

        const sidebarBtns = document.querySelectorAll('.sidebar-btn');
        sidebarBtns.forEach(btn => btn.classList.remove('active'));
        const btnToggleShapes = document.getElementById('btn-toggle-shapes');
        if (btnToggleShapes) btnToggleShapes.classList.remove('active');
        const fsBtnObj = document.getElementById('fs-btn-objects');
        if (fsBtnObj) fsBtnObj.classList.remove('active');
        const btnTopObj = document.getElementById('btn-topbar-objects');
        if (btnTopObj) btnTopObj.classList.remove('active');
    }

    // -------------------------------------------------------------------------
    // 2. Property Handlers (Fill, Stroke, Sizes, Text Formatting)
    // -------------------------------------------------------------------------
    function updateFillUI(fillVal) {
        const btnFillNone = document.getElementById('btn-fill-none');
        const fillColorPreview = document.getElementById('fill-color-preview');
        const fillColorPicker = document.getElementById('fill-color-picker');

        if (!fillVal || fillVal === 'transparent' || fillVal === 'none' || fillVal === 'rgba(0,0,0,0)') {
            window.currentFillColor = 'transparent';
            if (btnFillNone) btnFillNone.classList.add('active');
            if (fillColorPreview) {
                fillColorPreview.classList.add('is-transparent');
                fillColorPreview.style.background = 'transparent';
            }
        } else {
            window.currentFillColor = fillVal;
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

    function updatePropertiesUIForSelection(target) {
        const propLineGroup = document.getElementById('prop-line-group');
        const propFillGroup = document.getElementById('prop-fill-group');
        const propTextGroup = document.getElementById('prop-text-group');
        const propSizeGroup = document.getElementById('prop-size-group');
        const selectLinePattern = document.getElementById('select-line-pattern');
        const selectArrowHead = document.getElementById('select-arrow-head');
        const selectFontSize = document.getElementById('select-font-size');
        const btnBold = document.getElementById('btn-bold');
        const btnItalic = document.getElementById('btn-italic');
        const colorPicker = document.getElementById('color-picker');
        const colorPreview = document.getElementById('color-preview');

        if (!target) {
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'inline-flex';
            if (propTextGroup) propTextGroup.style.display = 'none';
            if (propSizeGroup) propSizeGroup.style.display = 'inline-flex';
            return;
        }

        if (target.isConnector || target.isFreeLine || target.type === 'line') {
            if (propLineGroup) propLineGroup.style.display = 'inline-flex';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'none';
            if (propSizeGroup) propSizeGroup.style.display = 'inline-flex';

            if (selectLinePattern) {
                if (target.strokeDashArray) {
                    selectLinePattern.value = (target.strokeDashArray[0] === 8) ? 'dashed' : 'dotted';
                } else {
                    selectLinePattern.value = 'solid';
                }
            }
            if (selectArrowHead) {
                selectArrowHead.value = target.arrowHeadStyle || 'none';
            }
        } else if (target.type === 'i-text' || target.type === 'textbox') {
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'none';
            if (propTextGroup) propTextGroup.style.display = 'inline-flex';
            if (propSizeGroup) propSizeGroup.style.display = 'none';

            if (selectFontSize) selectFontSize.value = target.fontSize || 24;
            if (btnBold) btnBold.classList.toggle('active', target.fontWeight === 'bold');
            if (btnItalic) btnItalic.classList.toggle('active', target.fontStyle === 'italic');
        } else if (target.isShapeGroup) {
            if (propLineGroup) propLineGroup.style.display = 'none';
            if (propFillGroup) propFillGroup.style.display = 'inline-flex';
            if (propTextGroup) propTextGroup.style.display = 'inline-flex';
            if (propSizeGroup) propSizeGroup.style.display = 'inline-flex';

            const shape = target.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
            if (shape) {
                updateFillUI(shape.fill);
                if (colorPicker && shape.stroke) {
                    colorPicker.value = shape.stroke;
                    if (colorPreview) colorPreview.style.backgroundColor = shape.stroke;
                }
            }
        }
    }

    function initUIModule() {
        const sidebarBtns = document.querySelectorAll('.sidebar-btn');
        sidebarBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetPanel = btn.dataset.panel;
                if (targetPanel) openDrawerPanel(targetPanel);
            });
        });

        const closeDrawerBtns = document.querySelectorAll('.btn-close-drawer');
        closeDrawerBtns.forEach(btn => {
            btn.addEventListener('click', closeDrawer);
        });

        const btnToggleShapes = document.getElementById('btn-toggle-shapes');
        if (btnToggleShapes) {
            btnToggleShapes.addEventListener('click', () => {
                openDrawerPanel('shapes');
            });
        }

        // Fill color picker & None button
        const btnFillNone = document.getElementById('btn-fill-none');
        if (btnFillNone) {
            btnFillNone.addEventListener('click', () => {
                updateFillUI('transparent');
                const canvas = getCanvas();
                if (!canvas) return;
                const activeObj = canvas.getActiveObject();
                if (activeObj && activeObj.isShapeGroup) {
                    const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
                    if (shape) {
                        shape.set('fill', 'transparent');
                        canvas.renderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                    }
                }
            });
        }

        const fillColorPicker = document.getElementById('fill-color-picker');
        if (fillColorPicker) {
            fillColorPicker.addEventListener('input', (e) => {
                updateFillUI(e.target.value);
                const canvas = getCanvas();
                if (!canvas) return;
                const activeObj = canvas.getActiveObject();
                if (activeObj && activeObj.isShapeGroup) {
                    const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
                    if (shape) {
                        shape.set('fill', window.currentFillColor);
                        canvas.renderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                    }
                }
            });
        }

        // Color Picker (stroke/draw color)
        const colorPicker = document.getElementById('color-picker');
        const colorPreview = document.getElementById('color-preview');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                const newColor = e.target.value;
                window.currentColor = newColor;
                if (colorPreview) colorPreview.style.backgroundColor = newColor;

                const canvas = getCanvas();
                if (!canvas) return;
                const activeObj = canvas.getActiveObject();
                if (activeObj && activeObj.isShapeGroup) {
                    const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
                    if (shape) {
                        shape.set('stroke', newColor);
                        canvas.renderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                    }
                } else if (activeObj && activeObj.type === 'i-text') {
                    activeObj.set('fill', newColor);
                    canvas.renderAll();
                    if (typeof window.saveState === 'function') window.saveState();
                }

                if (canvas.isDrawingMode && typeof window.updateBrushSettings === 'function') {
                    window.updateBrushSettings();
                }
            });
        }

        // Stroke Size selector
        const selectStrokeSize = document.getElementById('select-stroke-size');
        if (selectStrokeSize) {
            selectStrokeSize.addEventListener('change', () => {
                const strokeWidth = parseInt(selectStrokeSize.value, 10);
                if (typeof window.setStrokeSize === 'function') {
                    window.setStrokeSize(strokeWidth);
                }
            });
        }

        // Font Size selector
        const selectFontSize = document.getElementById('select-font-size');
        if (selectFontSize) {
            selectFontSize.addEventListener('change', () => {
                const size = parseInt(selectFontSize.value, 10);
                const canvas = getCanvas();
                if (!canvas) return;
                const activeObj = canvas.getActiveObject();
                if (activeObj) {
                    if (activeObj.type === 'i-text' || activeObj.type === 'textbox') {
                        activeObj.set('fontSize', size);
                        canvas.renderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                    } else if (activeObj.isShapeGroup) {
                        const textChild = activeObj.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text');
                        if (textChild) {
                            textChild.set('fontSize', size);
                            canvas.renderAll();
                            if (typeof window.saveState === 'function') window.saveState();
                        }
                    }
                }
            });
        }

        // Bold & Italic
        const btnBold = document.getElementById('btn-bold');
        if (btnBold) {
            btnBold.addEventListener('click', () => {
                const canvas = getCanvas();
                if (!canvas) return;
                const activeObj = canvas.getActiveObject();
                if (activeObj) {
                    const textObj = (activeObj.type === 'i-text' || activeObj.type === 'textbox') 
                        ? activeObj 
                        : (activeObj.isShapeGroup ? activeObj.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text') : null);
                    if (textObj) {
                        const isCurBold = textObj.fontWeight === 'bold';
                        textObj.set('fontWeight', isCurBold ? 'normal' : 'bold');
                        btnBold.classList.toggle('active', !isCurBold);
                        canvas.renderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                    }
                }
            });
        }

        const btnItalic = document.getElementById('btn-italic');
        if (btnItalic) {
            btnItalic.addEventListener('click', () => {
                const canvas = getCanvas();
                if (!canvas) return;
                const activeObj = canvas.getActiveObject();
                if (activeObj) {
                    const textObj = (activeObj.type === 'i-text' || activeObj.type === 'textbox') 
                        ? activeObj 
                        : (activeObj.isShapeGroup ? activeObj.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text') : null);
                    if (textObj) {
                        const isCurItalic = textObj.fontStyle === 'italic';
                        textObj.set('fontStyle', isCurItalic ? 'normal' : 'italic');
                        btnItalic.classList.toggle('active', !isCurItalic);
                        canvas.renderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                    }
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUIModule);
    } else {
        initUIModule();
    }

    const UIModule = {
        get activeDrawerPanel() { return activeDrawerPanel; },
        openDrawerPanel,
        closeDrawer,
        updateFillUI,
        updatePropertiesUIForSelection
    };

    window.WhiteboardApp.ui = UIModule;

    // Backward compatibility direct window exports
    window.openDrawerPanel = openDrawerPanel;
    window.closeDrawer = closeDrawer;
    window.updateFillUI = updateFillUI;
    window.updatePropertiesUIForSelection = updatePropertiesUIForSelection;

})(window);

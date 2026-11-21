/**
 * Whiteboard Web Application - Client-side Application Coordinator
 * static/js/whiteboard.js
 *
 * Coordinates modular subsystems:
 * - core.js: Fabric canvas singleton, viewport transform, grid, and zoom engine
 * - tools.js: Brush configuration, stroke & eraser sizing, dynamic connector arrows
 * - shapes.js: Built-in & custom SVG shapes library, templates gallery
 * - notes.js: Sticky notes factory & stickers/media gallery controller
 * - ui.js: Flyout sidebar drawer & object property controls
 * - slides.js: Slide mode (16:9, 4:3, A4), multi-slide deck, presenter view
 * - modes.js: Mode switching, dock bar controls, theme toggling
 * - steps.js: Step Box sequential diagrams & step manager modal
 * - objects.js: Objects & layers drawer, inspection, locking, visibility
 * - interactions.js: Canvas mouse events, pan, area erase, transform controls
 * - commands.js: Keyboard shortcuts, clipboard, context menu, undo/redo
 * - boards.js: SQLite multi-board manager, autosave loop, boards sidebar
 * - export.js: PNG, SVG, PDF, and PowerPoint PPTX presentation exports
 */

document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    const canvas = (window.WhiteboardApp && window.WhiteboardApp.canvas) || window.__canvas;
    if (!canvas) {
        console.error('[Whiteboard] Fabric canvas not found on DOMContentLoaded');
        return;
    }

    // -------------------------------------------------------------------------
    // Top-level Canvas Overlays (Step Box dashed borders & Slide Frame outline)
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // Transform Synchronization (Connectors and Step Boxes)
    // -------------------------------------------------------------------------
    canvas.on('object:moving', (opt) => {
        const target = opt.target;
        if (!target) return;

        if (target.isStepBox) {
            const curLeft = target.left;
            const curTop = target.top;
            const lastLeft = target._lastMovingLeft !== undefined ? target._lastMovingLeft : curLeft;
            const lastTop = target._lastMovingTop !== undefined ? target._lastMovingTop : curTop;
            const dx = curLeft - lastLeft;
            const dy = curTop - lastTop;
            target._lastMovingLeft = curLeft;
            target._lastMovingTop = curTop;

            canvas.forEachObject(o => {
                if (o.stepBoxOwnerId === target.stepBoxId && o !== target) {
                    o.left += dx;
                    o.top += dy;
                    o.setCoords();
                    if (o.connectedLines && typeof window.updateConnectedLinesFor === 'function') {
                        window.updateConnectedLinesFor(o);
                    }
                }
            });

            if (typeof window.updateStepBoxFloatingControls === 'function') {
                window.updateStepBoxFloatingControls(target);
            }
        } else {
            if (typeof window.constrainObjectToSlideFrame === 'function') {
                window.constrainObjectToSlideFrame(target);
            }
            if (target.connectedLines && typeof window.updateConnectedLinesFor === 'function') {
                window.updateConnectedLinesFor(target);
            }
        }
    });

    canvas.on('object:scaling', (opt) => {
        const target = opt.target;
        if (!target) return;
        if (target.isStepBox && typeof window.updateStepBoxFloatingControls === 'function') {
            window.updateStepBoxFloatingControls(target);
        }
    });

    canvas.on('object:modified', (opt) => {
        const target = opt.target;
        if (!target) return;

        if (target.isStepBox) {
            delete target._lastMovingLeft;
            delete target._lastMovingTop;

            const sx = target.scaleX || 1;
            const sy = target.scaleY || 1;
            if (sx !== 1 || sy !== 1) {
                const ow = target.width;
                const oh = target.height;
                const nw = Math.max(80, Math.round(ow * sx));
                const nh = Math.max(60, Math.round(oh * sy));
                const ox = target.left;
                const oy = target.top;

                canvas.forEachObject(o => {
                    if (o.stepBoxOwnerId === target.stepBoxId && o !== target) {
                        const relX = o.left - ox;
                        const relY = o.top - oy;
                        o.left = ox + relX * (nw / ow);
                        o.top = oy + relY * (nh / oh);
                        o.scaleX = (o.scaleX || 1) * (nw / ow);
                        o.scaleY = (o.scaleY || 1) * (nh / oh);
                        o.setCoords();
                        if (o.connectedLines && typeof window.updateConnectedLinesFor === 'function') {
                            window.updateConnectedLinesFor(o);
                        }
                    }
                });

                target.set({
                    width: nw,
                    height: nh,
                    scaleX: 1,
                    scaleY: 1
                });
                target.setCoords();
                target.dirty = true;
                canvas.requestRenderAll();
            }
            if (typeof window.updateStepBoxFloatingControls === 'function') {
                window.updateStepBoxFloatingControls(target);
            }
        } else {
            if (typeof window.findStepBoxContaining === 'function') {
                const parentBox = window.findStepBoxContaining(target);
                if (parentBox) {
                    target.stepBoxOwnerId = parentBox.stepBoxId;
                } else if (target.stepBoxOwnerId) {
                    target.stepBoxOwnerId = null;
                }
            }
        }

        if (typeof window.saveState === 'function') {
            window.saveState();
        }
    });

    // -------------------------------------------------------------------------
    // Top-level Quick Actions: Add Sample Box & Clear Canvas
    // -------------------------------------------------------------------------
    const btnAddBox = document.getElementById('btn-add-box');
    const btnClear = document.getElementById('btn-clear');
    const colors = ['#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#f472b6'];
    let colorIndex = 0;

    if (btnAddBox) {
        btnAddBox.addEventListener('click', () => {
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const centerX = (-vpt[4] + canvas.getWidth() / 2) / canvas.getZoom();
            const centerY = (-vpt[5] + canvas.getHeight() / 2) / canvas.getZoom();

            const color = colors[colorIndex % colors.length];
            colorIndex++;

            const generateUid = window.generateUid || (() => 'uid_' + Math.random().toString(36).substr(2, 9));
            const currentMode = window.WhiteboardApp.currentMode || window.currentMode || 'select';

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
            if (typeof window.saveState === 'function') window.saveState();
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            if (canvas.getObjects().length === 0) return;

            const currentFrameRatio = window.WhiteboardApp.currentFrameRatio || window.currentFrameRatio || 'infinite';
            const slideFrameRect = window.WhiteboardApp.slideFrameRect || window.slideFrameRect;

            if (currentFrameRatio !== 'infinite' && slideFrameRect) {
                const toRemove = canvas.getObjects().filter(o => !o.isSlideFrame);
                toRemove.forEach(o => canvas.remove(o));
                const slides = window.WhiteboardApp.boardSlides || window.boardSlides;
                const curIdx = window.WhiteboardApp.currentSlideIndex || window.currentSlideIndex || 0;
                if (slides && slides[curIdx]) {
                    slides[curIdx].objects = [];
                }
            } else {
                canvas.clear();
            }

            const stepBoxFloatingBar = document.getElementById('stepbox-floating-bar');
            if (stepBoxFloatingBar) {
                stepBoxFloatingBar.style.display = 'none';
            }
            window.__activeStepBox = null;
            if (window.WhiteboardApp) window.WhiteboardApp.activeStepBox = null;

            if (typeof window.saveState === 'function') window.saveState();
            if (typeof window.showToast === 'function') window.showToast('Canvas cleared');
        });
    }

    // -------------------------------------------------------------------------
    // Initial Bootloader Sequence
    // -------------------------------------------------------------------------
    if (typeof window.updateZoomDisplay === 'function') window.updateZoomDisplay();
    if (typeof window.updateGrid === 'function') window.updateGrid();

    if (window.WhiteboardApp.shapes) {
        if (typeof window.WhiteboardApp.shapes.loadShapes === 'function') window.WhiteboardApp.shapes.loadShapes();
        if (typeof window.WhiteboardApp.shapes.loadTemplates === 'function') window.WhiteboardApp.shapes.loadTemplates();
    } else {
        if (typeof window.loadShapes === 'function') window.loadShapes();
        if (typeof window.loadTemplates === 'function') window.loadTemplates();
    }

    if (window.WhiteboardApp.notes && typeof window.WhiteboardApp.notes.loadStickers === 'function') {
        window.WhiteboardApp.notes.loadStickers();
    } else if (typeof window.loadStickers === 'function') {
        window.loadStickers();
    }

    if (window.WhiteboardApp.boards && typeof window.WhiteboardApp.boards.init === 'function') {
        window.WhiteboardApp.boards.init();
    } else if (typeof window.initBoards === 'function') {
        window.initBoards();
    }

    console.log('[WhiteboardApp] Initialized cleanly with 12 modular subsystems.');
});

/**
 * Whiteboard App - Commands, Shortcuts, Clipboard & History Module
 * Handles keyboard shortcuts, clipboard (cut, copy, paste, duplicate),
 * right-click context menu, shape grouping, and undo/redo history stacks.
 */

(function(window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    let _clipboard = null;
    const undoStack = [];
    const redoStack = [];
    const MAX_HISTORY = 30;
    let isProcessingHistory = false;

    const EXTRA_PROPS = [
        'shapeUid', 'connectedLines', 'isConnector', 'isArrowHead',
        'isStepBox', 'stepBoxId', 'stepBoxName', 'stepBoxSteps', 'stepBoxCurrentStep', 'stepBoxOwnerId',
        'isStickyNote', 'stickyColor', 'isSticker', 'imageName'
    ];

    const CommandsModule = {
        getCanvas() {
            return (window.WhiteboardApp && window.WhiteboardApp.canvas) || window.__canvas;
        },

        undoStack,
        redoStack,

        isUserTyping() {
            const canvas = CommandsModule.getCanvas();
            const activeObj = canvas ? canvas.getActiveObject() : null;
            if (activeObj && activeObj.isEditing) return true;
            const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            return tag === 'input' || tag === 'textarea' || tag === 'select';
        },

        // --- History Management ---
        updateHistoryButtons() {
            const btnUndo = document.getElementById('btn-undo');
            const btnRedo = document.getElementById('btn-redo');
            if (btnUndo) btnUndo.disabled = undoStack.length <= 1;
            if (btnRedo) btnRedo.disabled = redoStack.length === 0;
        },

        saveState() {
            if (isProcessingHistory) return;
            const canvas = CommandsModule.getCanvas();
            if (!canvas) return;

            const currentState = JSON.stringify(canvas.toJSON(EXTRA_PROPS));
            if (undoStack.length > 0 && undoStack[undoStack.length - 1] === currentState) {
                return;
            }

            undoStack.push(currentState);
            if (undoStack.length > MAX_HISTORY) {
                undoStack.shift();
            }

            redoStack.length = 0;
            CommandsModule.updateHistoryButtons();

            if (typeof window.markBoardDirty === 'function') {
                window.markBoardDirty();
            }
            if (typeof window.saveActiveBoardDebounced === 'function') {
                window.saveActiveBoardDebounced();
            }
        },

        undo() {
            if (undoStack.length <= 1) return;
            const currentState = undoStack.pop();
            redoStack.push(currentState);
            const previousState = undoStack[undoStack.length - 1];
            CommandsModule.loadCanvasState(previousState);

            if (typeof window.markBoardDirty === 'function') {
                window.markBoardDirty();
            }
            if (typeof window.saveActiveBoardDebounced === 'function') {
                window.saveActiveBoardDebounced();
            }
        },

        redo() {
            if (redoStack.length === 0) return;
            const nextState = redoStack.pop();
            undoStack.push(nextState);
            CommandsModule.loadCanvasState(nextState);

            if (typeof window.markBoardDirty === 'function') {
                window.markBoardDirty();
            }
            if (typeof window.saveActiveBoardDebounced === 'function') {
                window.saveActiveBoardDebounced();
            }
        },

        loadCanvasState(jsonState) {
            const canvas = CommandsModule.getCanvas();
            if (!canvas) return;

            isProcessingHistory = true;
            const currentVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : null;

            canvas.loadFromJSON(jsonState, () => {
                if (currentVpt) {
                    canvas.setViewportTransform(currentVpt);
                }

                if (typeof window.reconnectLoadedObjects === 'function') {
                    window.reconnectLoadedObjects();
                }

                canvas.renderAll();
                isProcessingHistory = false;
                CommandsModule.updateHistoryButtons();

                if (typeof window.updateSelectionUI === 'function') {
                    window.updateSelectionUI();
                }
                if (typeof window.updateObjectsCountBadges === 'function') {
                    window.updateObjectsCountBadges();
                }
            });
        },

        // --- Clipboard Operations ---
        copySelected() {
            const canvas = CommandsModule.getCanvas();
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return;

            activeObj.clone((cloned) => {
                _clipboard = cloned;
                if (typeof window.showToast === 'function') window.showToast('Copied to clipboard (Ctrl + C)');
            }, EXTRA_PROPS);
        },

        pasteClipboard() {
            const canvas = CommandsModule.getCanvas();
            if (!canvas || !_clipboard) return;

            _clipboard.clone((clonedObj) => {
                canvas.discardActiveObject();
                clonedObj.set({
                    left: clonedObj.left + 24,
                    top: clonedObj.top + 24,
                    evented: true
                });

                const currentFrameRatio = window.WhiteboardApp.currentFrameRatio || window.currentFrameRatio || 'infinite';
                const slideFrameRect = window.WhiteboardApp.slideFrameRect || window.slideFrameRect;

                if (currentFrameRatio !== 'infinite' && slideFrameRect) {
                    const sLeft = slideFrameRect.left;
                    const sTop = slideFrameRect.top;
                    const sRight = sLeft + slideFrameRect.getScaledWidth();
                    const sBottom = sTop + slideFrameRect.getScaledHeight();

                    clonedObj.setCoords();
                    const bound = (typeof clonedObj.getBoundingRect === 'function')
                        ? clonedObj.getBoundingRect(true, true)
                        : { left: clonedObj.left, top: clonedObj.top, width: clonedObj.width || 50, height: clonedObj.height || 50 };

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
                    if (obj.shapeUid && typeof window.generateUid === 'function') obj.shapeUid = window.generateUid();
                    obj.connectedLines = [];
                    if (currentFrameRatio !== 'infinite') {
                        if (typeof window.applySlideClip === 'function') window.applySlideClip(obj);
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
                    clonedObj.forEachObject((obj) => prepareObj(obj));
                    clonedObj.setCoords();
                } else {
                    prepareObj(clonedObj);
                }

                _clipboard.top += 24;
                _clipboard.left += 24;
                canvas.setActiveObject(clonedObj);
                canvas.requestRenderAll();
                CommandsModule.saveState();
                if (typeof window.showToast === 'function') window.showToast('Pasted object (Ctrl + V)');
            }, EXTRA_PROPS);
        },

        cutSelected() {
            CommandsModule.copySelected();
            if (typeof window.deleteSelectedObjects === 'function') {
                window.deleteSelectedObjects();
            }
            if (typeof window.showToast === 'function') window.showToast('Cut selected object (Ctrl + X)');
        },

        duplicateSelected() {
            const canvas = CommandsModule.getCanvas();
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (!activeObj) return;

            activeObj.clone((clonedObj) => {
                canvas.discardActiveObject();
                clonedObj.set({
                    left: clonedObj.left + 24,
                    top: clonedObj.top + 24,
                    evented: true
                });

                if (clonedObj.type === 'activeSelection') {
                    clonedObj.canvas = canvas;
                    clonedObj.forEachObject((obj) => {
                        if (obj.shapeUid && typeof window.generateUid === 'function') obj.shapeUid = window.generateUid();
                        obj.connectedLines = [];
                        canvas.add(obj);
                    });
                    clonedObj.setCoords();
                } else {
                    if (clonedObj.shapeUid && typeof window.generateUid === 'function') clonedObj.shapeUid = window.generateUid();
                    clonedObj.connectedLines = [];
                    canvas.add(clonedObj);
                }

                canvas.setActiveObject(clonedObj);
                canvas.requestRenderAll();
                CommandsModule.saveState();
                if (typeof window.showToast === 'function') window.showToast('Duplicated object (Ctrl + D)');
            }, EXTRA_PROPS);
        },

        selectAllObjects() {
            const canvas = CommandsModule.getCanvas();
            if (!canvas) return;

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
            if (typeof window.showToast === 'function') window.showToast(`Selected all (${selectableObjs.length} objects)`);
        },

        // --- Grouping & Ungrouping ---
        groupSelectedObjects() {
            const canvas = CommandsModule.getCanvas();
            if (!canvas) return;

            const activeObj = canvas.getActiveObject();
            if (!activeObj || activeObj.type !== 'activeSelection') {
                if (typeof window.showToast === 'function') window.showToast('Select multiple objects to merge (Ctrl + G)');
                return;
            }

            const group = activeObj.toGroup();
            group.set({
                isMergedShape: true,
                shapeUid: (typeof window.generateUid === 'function') ? window.generateUid() : 'uid_' + Date.now(),
                selectable: true,
                evented: true
            });
            group.setCoords();
            canvas.setActiveObject(group);
            canvas.requestRenderAll();
            CommandsModule.saveState();
            if (typeof window.showToast === 'function') window.showToast('Objects merged! Right-click to Save to My Shapes');
        },

        ungroupSelectedObjects() {
            const canvas = CommandsModule.getCanvas();
            if (!canvas) return;

            const activeObj = canvas.getActiveObject();
            if (!activeObj || activeObj.type !== 'group' || activeObj.isShapeGroup || activeObj.isStickyNote) {
                if (typeof window.showToast === 'function') window.showToast('Select a grouped object to ungroup');
                return;
            }

            activeObj.toActiveSelection();
            canvas.requestRenderAll();
            CommandsModule.saveState();
            if (typeof window.showToast === 'function') window.showToast('Objects Ungrouped (Ctrl + Shift + G)');
        },

        // --- Context Menu Management ---
        showContextMenu(clientX, clientY) {
            const contextMenu = document.getElementById('context-menu');
            const canvas = CommandsModule.getCanvas();
            if (!contextMenu || !canvas) return;

            const activeObj = canvas.getActiveObject();
            if (!activeObj) {
                CommandsModule.hideContextMenu();
                return;
            }

            const ctxMerge = document.getElementById('ctx-merge');
            const ctxSaveShape = document.getElementById('ctx-save-shape');
            const ctxUngroup = document.getElementById('ctx-ungroup');

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

            const menuWidth = contextMenu.offsetWidth || 210;
            const menuHeight = contextMenu.offsetHeight || 220;
            let posX = clientX;
            let posY = clientY;

            if (posX + menuWidth > window.innerWidth) posX = window.innerWidth - menuWidth - 12;
            if (posY + menuHeight > window.innerHeight) posY = window.innerHeight - menuHeight - 12;

            contextMenu.style.left = `${Math.max(10, posX)}px`;
            contextMenu.style.top = `${Math.max(10, posY)}px`;
        },

        hideContextMenu() {
            const contextMenu = document.getElementById('context-menu');
            if (contextMenu && !contextMenu.classList.contains('hidden')) {
                contextMenu.classList.add('hidden');
            }
        },

        // --- Modals ---
        openShortcutsModal() {
            const modal = document.getElementById('shortcuts-modal');
            if (!modal) return;
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        },

        closeShortcutsModal() {
            const modal = document.getElementById('shortcuts-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        },

        toggleShortcutsModal() {
            const modal = document.getElementById('shortcuts-modal');
            if (!modal) return;
            if (modal.classList.contains('hidden')) {
                CommandsModule.openShortcutsModal();
            } else {
                CommandsModule.closeShortcutsModal();
            }
        },

        init() {
            // Context menu element actions
            const ctxMerge = document.getElementById('ctx-merge');
            const ctxSaveShape = document.getElementById('ctx-save-shape');
            const ctxUngroup = document.getElementById('ctx-ungroup');
            const ctxExportSvg = document.getElementById('ctx-export-svg');
            const ctxExportJpg = document.getElementById('ctx-export-jpg');
            const ctxDuplicate = document.getElementById('ctx-duplicate');
            const ctxBringFront = document.getElementById('ctx-bring-front');
            const ctxSendBack = document.getElementById('ctx-send-back');
            const ctxDelete = document.getElementById('ctx-delete');

            if (ctxMerge) {
                ctxMerge.addEventListener('click', () => {
                    CommandsModule.hideContextMenu();
                    CommandsModule.groupSelectedObjects();
                });
            }

            if (ctxSaveShape) {
                ctxSaveShape.addEventListener('click', () => {
                    CommandsModule.hideContextMenu();
                    if (typeof window.saveActiveObjectAsCustomShape === 'function') {
                        window.saveActiveObjectAsCustomShape();
                    }
                });
            }

            if (ctxUngroup) {
                ctxUngroup.addEventListener('click', () => {
                    CommandsModule.hideContextMenu();
                    CommandsModule.ungroupSelectedObjects();
                });
            }

            if (ctxExportSvg) {
                ctxExportSvg.addEventListener('click', () => {
                    CommandsModule.hideContextMenu();
                    if (typeof window.exportActiveObjectAs === 'function') {
                        window.exportActiveObjectAs('svg');
                    }
                });
            }

            if (ctxExportJpg) {
                ctxExportJpg.addEventListener('click', () => {
                    CommandsModule.hideContextMenu();
                    if (typeof window.exportActiveObjectAs === 'function') {
                        window.exportActiveObjectAs('jpg');
                    }
                });
            }

            if (ctxDuplicate) {
                ctxDuplicate.addEventListener('click', () => {
                    CommandsModule.hideContextMenu();
                    CommandsModule.duplicateSelected();
                });
            }

            if (ctxBringFront) {
                ctxBringFront.addEventListener('click', () => {
                    CommandsModule.hideContextMenu();
                    const canvas = CommandsModule.getCanvas();
                    const activeObj = canvas ? canvas.getActiveObject() : null;
                    if (activeObj) {
                        canvas.bringToFront(activeObj);
                        canvas.requestRenderAll();
                        CommandsModule.saveState();
                        if (typeof window.showToast === 'function') window.showToast('Brought to Front');
                    }
                });
            }

            if (ctxSendBack) {
                ctxSendBack.addEventListener('click', () => {
                    CommandsModule.hideContextMenu();
                    const canvas = CommandsModule.getCanvas();
                    const activeObj = canvas ? canvas.getActiveObject() : null;
                    if (activeObj) {
                        canvas.sendToBack(activeObj);
                        canvas.requestRenderAll();
                        CommandsModule.saveState();
                        if (typeof window.showToast === 'function') window.showToast('Sent to Back');
                    }
                });
            }

            if (ctxDelete) {
                ctxDelete.addEventListener('click', () => {
                    CommandsModule.hideContextMenu();
                    if (typeof window.deleteSelectedObjects === 'function') {
                        window.deleteSelectedObjects();
                    }
                });
            }

            document.addEventListener('click', (e) => {
                if (!e.target.closest('#context-menu')) {
                    CommandsModule.hideContextMenu();
                }
            });

            const canvasContainerEl = document.getElementById('canvas-container');
            if (canvasContainerEl) {
                canvasContainerEl.addEventListener('contextmenu', (e) => e.preventDefault());
            }

            // Shortcuts modal triggers
            const btnShortcutsToggle = document.getElementById('btn-shortcuts-toggle');
            const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
            const shortcutsModal = document.getElementById('shortcuts-modal');

            if (btnShortcutsToggle) btnShortcutsToggle.addEventListener('click', CommandsModule.toggleShortcutsModal);
            if (btnCloseShortcuts) btnCloseShortcuts.addEventListener('click', CommandsModule.closeShortcutsModal);
            if (shortcutsModal) {
                shortcutsModal.addEventListener('click', (e) => {
                    if (e.target === shortcutsModal) CommandsModule.closeShortcutsModal();
                });
            }

            // Undo / Redo buttons
            const btnUndo = document.getElementById('btn-undo');
            const btnRedo = document.getElementById('btn-redo');
            if (btnUndo) btnUndo.addEventListener('click', CommandsModule.undo);
            if (btnRedo) btnRedo.addEventListener('click', CommandsModule.redo);

            // Quick action buttons: Add Box and Clear Canvas
            const btnAddBox = document.getElementById('btn-add-box');
            const btnClear = document.getElementById('btn-clear');
            const quickColors = ['#60a5fa', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#f472b6'];
            let quickColorIndex = 0;

            if (btnAddBox) {
                btnAddBox.addEventListener('click', () => {
                    const canvas = CommandsModule.getCanvas();
                    if (!canvas) return;
                    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
                    const centerX = (-vpt[4] + canvas.getWidth() / 2) / canvas.getZoom();
                    const centerY = (-vpt[5] + canvas.getHeight() / 2) / canvas.getZoom();

                    const color = quickColors[quickColorIndex % quickColors.length];
                    quickColorIndex++;

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
                    CommandsModule.saveState();
                });
            }

            if (btnClear) {
                btnClear.addEventListener('click', () => {
                    const canvas = CommandsModule.getCanvas();
                    if (!canvas || canvas.getObjects().length === 0) return;

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

                    CommandsModule.saveState();
                    if (typeof window.showToast === 'function') window.showToast('Canvas cleared');
                });
            }

            // Canvas change listeners for history
            const canvas = CommandsModule.getCanvas();
            if (canvas) {
                canvas.on('object:added', (opt) => {
                    const addedObj = opt.target;
                    const currentMode = window.WhiteboardApp.currentMode || window.currentMode;
                    const currentFrameRatio = window.WhiteboardApp.currentFrameRatio || window.currentFrameRatio || 'infinite';

                    if (addedObj && !addedObj.isStepBox && !addedObj.isArrowHead && !addedObj.stepBoxOwnerId && currentMode !== 'eraser' && addedObj.globalCompositeOperation !== 'destination-out') {
                        if (typeof window.findStepBoxContaining === 'function') {
                            const parentBox = window.findStepBoxContaining(addedObj);
                            if (parentBox) addedObj.stepBoxOwnerId = parentBox.stepBoxId;
                        }
                    }
                    if (addedObj && !addedObj.isSlideFrame && currentFrameRatio !== 'infinite') {
                        if (typeof window.applySlideClip === 'function') window.applySlideClip(addedObj);
                    }
                    CommandsModule.saveState();
                });
                canvas.on('object:removed', () => CommandsModule.saveState());
            }

            // Global Keydown Handler
            window.addEventListener('keydown', (e) => {
                const canvas = CommandsModule.getCanvas();
                if (!canvas) return;

                const isCtrl = e.ctrlKey || e.metaKey;
                const isShift = e.shiftKey;
                const key = e.key;
                const code = e.code;

                // Escape handling
                if (key === 'Escape' || code === 'Escape') {
                    const modalExitSlide = document.getElementById('modal-exit-slide');
                    if (modalExitSlide && !modalExitSlide.classList.contains('hidden')) {
                        e.preventDefault();
                        if (typeof window.closeExitSlideModal === 'function') window.closeExitSlideModal();
                        return;
                    }
                    if (window.isSlidePageFullscreen) {
                        e.preventDefault();
                        if (typeof window.toggleSlidePageFullscreen === 'function') window.toggleSlidePageFullscreen(false);
                        return;
                    }
                    const shortcutsModal = document.getElementById('shortcuts-modal');
                    if (shortcutsModal && !shortcutsModal.classList.contains('hidden')) {
                        e.preventDefault();
                        CommandsModule.closeShortcutsModal();
                        return;
                    }
                }

                // Help shortcut (? or Ctrl+/ or F1)
                const isHelpShortcut = (key === 'F1' || code === 'F1') ||
                                       (isCtrl && (key === '/' || code === 'Slash')) ||
                                       (!isCtrl && (key === '?' || (isShift && (key === '/' || code === 'Slash'))));

                if (isHelpShortcut) {
                    if (CommandsModule.isUserTyping() && !isCtrl && key !== 'F1') {
                        // Let typing proceed
                    } else {
                        e.preventDefault();
                        CommandsModule.toggleShortcutsModal();
                        return;
                    }
                }

                // Spacebar panning
                if (e.code === 'Space' && !window.isSpacePressed && !CommandsModule.isUserTyping()) {
                    window.isSpacePressed = true;
                    if (window.WhiteboardApp) window.WhiteboardApp.isSpacePressed = true;
                    window.wasDrawingMode = canvas.isDrawingMode;
                    canvas.isDrawingMode = false;
                    canvas.defaultCursor = 'grab';
                    canvas.selection = false;
                    e.preventDefault();
                    return;
                }

                // Typing in inputs/text
                if (CommandsModule.isUserTyping()) {
                    if (key === 'Escape') {
                        const activeObj = canvas.getActiveObject();
                        if (activeObj && activeObj.isEditing) {
                            activeObj.exitEditing();
                            canvas.requestRenderAll();
                        }
                    }
                    return;
                }

                // Basic Editing
                if (isCtrl && !isShift && (key === 'z' || key === 'Z')) {
                    e.preventDefault();
                    CommandsModule.undo();
                    return;
                }
                if ((isCtrl && !isShift && (key === 'y' || key === 'Y')) ||
                    (isCtrl && isShift && (key === 'z' || key === 'Z'))) {
                    e.preventDefault();
                    CommandsModule.redo();
                    return;
                }
                if (isCtrl && !isShift && (key === 'c' || key === 'C')) {
                    e.preventDefault();
                    CommandsModule.copySelected();
                    return;
                }
                if (isCtrl && !isShift && (key === 'v' || key === 'V')) {
                    e.preventDefault();
                    CommandsModule.pasteClipboard();
                    return;
                }
                if (isCtrl && !isShift && (key === 'x' || key === 'X')) {
                    e.preventDefault();
                    CommandsModule.cutSelected();
                    return;
                }
                if (isCtrl && !isShift && (key === 'a' || key === 'A')) {
                    e.preventDefault();
                    CommandsModule.selectAllObjects();
                    return;
                }
                if (isCtrl && !isShift && (key === 'd' || key === 'D')) {
                    e.preventDefault();
                    CommandsModule.duplicateSelected();
                    return;
                }
                if (key === 'Delete' || key === 'Backspace') {
                    e.preventDefault();
                    if (typeof window.deleteSelectedObjects === 'function') {
                        window.deleteSelectedObjects();
                    }
                    return;
                }

                // Canvas Navigation
                if (!isCtrl && (key === '+' || key === '=')) {
                    e.preventDefault();
                    if (typeof window.setZoom === 'function') window.setZoom(canvas.getZoom() * 1.15);
                    return;
                }
                if (!isCtrl && (key === '-' || key === '_')) {
                    e.preventDefault();
                    if (typeof window.setZoom === 'function') window.setZoom(canvas.getZoom() / 1.15);
                    return;
                }
                if (isCtrl && key === '0') {
                    e.preventDefault();
                    if (typeof window.resetView === 'function') window.resetView();
                    return;
                }
                if (isCtrl && !isShift && key === '1') {
                    e.preventDefault();
                    if (typeof window.setZoom === 'function') window.setZoom(1.0);
                    if (typeof window.showToast === 'function') window.showToast('Zoom: 100%');
                    return;
                }

                // Drawing Tools Shortcuts
                if (!isCtrl && (key === 'v' || key === 'V')) {
                    if (typeof window.setMode === 'function') window.setMode('select');
                    return;
                }
                if (!isCtrl && (key === 'h' || key === 'H')) {
                    if (typeof window.setMode === 'function') window.setMode('pan');
                    return;
                }
                if (!isCtrl && (key === 'p' || key === 'P')) {
                    if (typeof window.setMode === 'function') window.setMode('pen');
                    return;
                }
                if (!isCtrl && (key === 't' || key === 'T')) {
                    if (typeof window.setMode === 'function') window.setMode('text');
                    return;
                }
                if (!isCtrl && (key === 'l' || key === 'L')) {
                    if (typeof window.setMode === 'function') window.setMode('line');
                    return;
                }
                if (!isCtrl && (key === 'a' || key === 'A')) {
                    if (typeof window.setMode === 'function') window.setMode('arrow');
                    return;
                }
                if (!isCtrl && (key === 'n' || key === 'N' || key === 's' || key === 'S')) {
                    if (typeof window.setMode === 'function') window.setMode('sticky');
                    return;
                }
                if (!isCtrl && (key === 'e' || key === 'E')) {
                    const currentMode = window.WhiteboardApp.currentMode || window.currentMode;
                    if (currentMode === 'eraser') {
                        const currentSub = window.WhiteboardApp.eraserSubMode || window.eraserSubMode || 'brush';
                        if (typeof window.setEraserSubMode === 'function') {
                            window.setEraserSubMode(currentSub === 'brush' ? 'area' : 'brush');
                        }
                    } else if (typeof window.setMode === 'function') {
                        window.setMode('eraser');
                    }
                    return;
                }

                // Object Arrangement
                if (isCtrl && !isShift && (key === 'g' || key === 'G')) {
                    e.preventDefault();
                    CommandsModule.groupSelectedObjects();
                    return;
                }
                if (isCtrl && isShift && (key === 'g' || key === 'G')) {
                    e.preventDefault();
                    CommandsModule.ungroupSelectedObjects();
                    return;
                }

                // Nudge with arrow keys
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) {
                    const activeObj = canvas.getActiveObject();
                    if (activeObj) {
                        const step = isShift ? 20 : 2;
                        if (key === 'ArrowLeft') activeObj.left -= step;
                        if (key === 'ArrowRight') activeObj.left += step;
                        if (key === 'ArrowUp') activeObj.top -= step;
                        if (key === 'ArrowDown') activeObj.top += step;
                        activeObj.setCoords();
                        if (typeof window.constrainObjectToSlideFrame === 'function') window.constrainObjectToSlideFrame(activeObj);
                        if (typeof window.updateConnectedLinesFor === 'function') window.updateConnectedLinesFor(activeObj);
                        canvas.requestRenderAll();
                        CommandsModule.saveState();
                        e.preventDefault();
                    }
                }
            });

            window.addEventListener('keyup', (e) => {
                if (e.code === 'Space') {
                    window.isSpacePressed = false;
                    if (window.WhiteboardApp) window.WhiteboardApp.isSpacePressed = false;
                    const canvas = CommandsModule.getCanvas();
                    if (canvas) {
                        canvas.isDrawingMode = window.wasDrawingMode || false;
                        if (window.WhiteboardApp && window.WhiteboardApp.interactions && typeof window.WhiteboardApp.interactions.updateCursorForMode === 'function') {
                            window.WhiteboardApp.interactions.updateCursorForMode();
                        }
                    }
                }
            });
        }
    };

    // Exports
    window.WhiteboardApp.commands = CommandsModule;
    window.saveState = CommandsModule.saveState;
    window.undo = CommandsModule.undo;
    window.redo = CommandsModule.redo;
    window.copySelected = CommandsModule.copySelected;
    window.pasteClipboard = CommandsModule.pasteClipboard;
    window.cutSelected = CommandsModule.cutSelected;
    window.duplicateSelected = CommandsModule.duplicateSelected;
    window.selectAllObjects = CommandsModule.selectAllObjects;
    window.showContextMenu = CommandsModule.showContextMenu;
    window.hideContextMenu = CommandsModule.hideContextMenu;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CommandsModule.init());
    } else {
        CommandsModule.init();
    }
})(window);

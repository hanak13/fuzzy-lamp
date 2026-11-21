/**
 * Whiteboard App - Interactions Module
 * Handles canvas mouse events (down/move/up/dblclick), freehand brush & eraser finalization,
 * panning, connectors preview & creation, area erasing, and selection/transform events.
 */

(function(window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    const InteractionsModule = {
        getCanvas() {
            return (window.WhiteboardApp && window.WhiteboardApp.canvas) || window.__canvas;
        },

        getCore() {
            return (window.WhiteboardApp && window.WhiteboardApp.core) || {};
        },

        updateCursorForMode() {
            const canvas = InteractionsModule.getCanvas();
            if (!canvas) return;

            const mode = window.currentMode || (window.WhiteboardApp && window.WhiteboardApp.currentMode) || 'select';
            const isSpace = window.isSpacePressed || (window.WhiteboardApp && window.WhiteboardApp.isSpacePressed);

            if (mode === 'pan' || isSpace) {
                canvas.defaultCursor = 'grab';
            } else if (['pen', 'highlighter', 'eraser', 'line', 'arrow', 'stepbox'].includes(mode)) {
                canvas.defaultCursor = 'crosshair';
            } else if (mode === 'text') {
                canvas.defaultCursor = 'text';
            } else if (mode === 'sticky') {
                canvas.defaultCursor = 'copy';
            } else {
                canvas.defaultCursor = 'default';
            }
        },

        init() {
            const canvas = InteractionsModule.getCanvas();
            if (!canvas) {
                console.warn('[InteractionsModule] Canvas not available on init');
                return;
            }

            // 1. Freehand Brush & Eraser Finalization (path:created)
            canvas.on('path:created', (opt) => {
                const path = opt.path;
                if (!path) return;

                const currentMode = window.currentMode || (window.WhiteboardApp && window.WhiteboardApp.currentMode) || 'select';
                const currentFrameRatio = window.WhiteboardApp.currentFrameRatio || window.currentFrameRatio || 'infinite';
                const slideFrameRect = window.WhiteboardApp.slideFrameRect || window.slideFrameRect;
                const currentColor = window.WhiteboardApp.currentColor || window.currentColor || '#1e293b';

                if (currentMode !== 'eraser' && typeof window.findStepBoxContaining === 'function') {
                    const parentBox = window.findStepBoxContaining(path);
                    if (parentBox) {
                        path.stepBoxOwnerId = parentBox.stepBoxId;
                        window.activeStepBox = parentBox;
                        if (window.WhiteboardApp) window.WhiteboardApp.activeStepBox = parentBox;
                        if (typeof window.updateStepBoxFloatingControls === 'function') {
                            window.updateStepBoxFloatingControls(parentBox);
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

                    // If stroke is completely outside slide frame, remove it
                    if (bound.left >= fRight || bound.left + bound.width <= fLeft || bound.top >= fBottom || bound.top + bound.height <= fTop) {
                        canvas.remove(path);
                        canvas.requestRenderAll();
                        return;
                    }

                    if (typeof window.applySlideClip === 'function') {
                        window.applySlideClip(path);
                    }
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
                    if (typeof window.saveState === 'function') window.saveState();
                } else if (currentMode === 'highlighter') {
                    const hexToRgba = (hex, alpha) => {
                        let c = hex.replace('#', '');
                        if (c.length === 3) c = c.split('').map(x => x + x).join('');
                        const num = parseInt(c, 16);
                        return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
                    };
                    path.set({
                        stroke: hexToRgba(currentColor, 0.35),
                        selectable: currentMode === 'select'
                    });
                    canvas.renderAll();
                    if (typeof window.saveState === 'function') window.saveState();
                } else if (currentMode === 'pen') {
                    path.set({
                        selectable: currentMode === 'select'
                    });
                    if (typeof window.saveState === 'function') window.saveState();
                }
            });

            // 2. Mouse Down Event
            canvas.on('mouse:down', (opt) => {
                const evt = opt.e;
                const isRightClick = (opt.button === 3 || (evt && evt.button === 2));

                // Right-Click Context Menu
                if (isRightClick) {
                    if (evt) {
                        evt.preventDefault();
                        evt.stopPropagation();
                    }

                    if (opt.target) {
                        const currentActive = canvas.getActiveObject();
                        if (!currentActive || !canvas.getActiveObjects().includes(opt.target)) {
                            canvas.setActiveObject(opt.target);
                            canvas.requestRenderAll();
                        }
                    }

                    const activeObj = canvas.getActiveObject();
                    if (activeObj && typeof window.showContextMenu === 'function') {
                        window.showContextMenu(evt ? evt.clientX : 100, evt ? evt.clientY : 100);
                    } else if (typeof window.hideContextMenu === 'function') {
                        window.hideContextMenu();
                    }
                    return;
                }

                if (typeof window.hideContextMenu === 'function') {
                    window.hideContextMenu();
                }

                const isMiddleClick = evt && evt.button === 1;
                const currentMode = window.currentMode || (window.WhiteboardApp && window.WhiteboardApp.currentMode) || 'select';
                const isSpacePressed = window.isSpacePressed || (window.WhiteboardApp && window.WhiteboardApp.isSpacePressed);
                const shouldPan = currentMode === 'pan' || isSpacePressed || isMiddleClick;

                if (shouldPan) {
                    window.isPanning = true;
                    if (window.WhiteboardApp) window.WhiteboardApp.isPanning = true;
                    window.lastPosX = evt.clientX;
                    window.lastPosY = evt.clientY;
                    canvas.defaultCursor = 'grabbing';
                    if (evt) evt.preventDefault();
                    return;
                }

                // Area Eraser mode
                const eraserSubMode = window.WhiteboardApp.eraserSubMode || window.eraserSubMode || 'brush';
                if (currentMode === 'eraser' && eraserSubMode === 'area' && !shouldPan && !isRightClick) {
                    window.isErasingArea = true;
                    const pointer = canvas.getPointer(opt.e);
                    window.areaErasePoints = [{ x: pointer.x, y: pointer.y }];
                    window.areaErasePreview = new fabric.Polygon([...window.areaErasePoints, { x: pointer.x + 1, y: pointer.y + 1 }], {
                        fill: 'rgba(239, 68, 68, 0.16)',
                        stroke: '#ef4444',
                        strokeWidth: 2,
                        strokeDashArray: [5, 4],
                        selectable: false,
                        evented: false
                    });
                    canvas.add(window.areaErasePreview);
                    return;
                }

                // Alt + Drag: Duplicate while dragging (Select mode)
                const EXTRA_PROPS = window.EXTRA_PROPS || ['shapeUid', 'connectedLines', 'isConnector', 'isArrowHead', 'isStepBox', 'stepBoxId', 'stepBoxName', 'stepBoxSteps', 'stepBoxCurrentStep', 'stepBoxOwnerId', 'isStickyNote', 'stickyColor', 'isSticker', 'imageName'];
                if (evt && evt.altKey && opt.target && currentMode === 'select' && !opt.target.isConnector && !opt.target.isArrowHead) {
                    opt.target.clone((cloned) => {
                        if (cloned.shapeUid && typeof window.generateUid === 'function') cloned.shapeUid = window.generateUid();
                        cloned.connectedLines = [];
                        canvas.add(cloned);
                        canvas.setActiveObject(cloned);
                        canvas.requestRenderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                        if (typeof window.showToast === 'function') window.showToast('Duplicated with Alt+Drag');
                    }, EXTRA_PROPS);
                }

                // Step Box Tool: Drag to create a Step Box
                if (currentMode === 'stepbox' && !shouldPan && !isRightClick) {
                    window.isDrawingStepBox = true;
                    const pointer = canvas.getPointer(opt.e);
                    window.stepBoxStartPoint = { x: pointer.x, y: pointer.y };
                    window.stepBoxPreviewRect = new fabric.Rect({
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
                    canvas.add(window.stepBoxPreviewRect);
                    return;
                }

                // Check clicking inside a Step Box
                const clickPointer = canvas.getPointer(opt.e);
                let clickedBox = (opt.target && opt.target.isStepBox) ? opt.target : null;
                if (!clickedBox && opt.target && opt.target.stepBoxOwnerId) {
                    clickedBox = canvas.getObjects().find(o => o.isStepBox && o.stepBoxId === opt.target.stepBoxOwnerId);
                }
                if (!clickedBox && typeof window.findStepBoxAtPoint === 'function') {
                    clickedBox = window.findStepBoxAtPoint(clickPointer.x, clickPointer.y);
                }
                if (clickedBox) {
                    window.activeStepBox = clickedBox;
                    if (window.WhiteboardApp) window.WhiteboardApp.activeStepBox = clickedBox;
                    clickedBox._lastMovingLeft = clickedBox.left;
                    clickedBox._lastMovingTop = clickedBox.top;
                    if (typeof window.updateStepBoxFloatingControls === 'function') {
                        window.updateStepBoxFloatingControls(clickedBox);
                    }
                }

                // Connector Line / Arrow: start connecting
                if ((currentMode === 'line' || currentMode === 'arrow') && !shouldPan) {
                    window.isConnecting = true;
                    window.connectorModeType = currentMode;
                    const pointer = canvas.getPointer(opt.e);
                    const findTarget = window.findConnectableTarget || ((t) => t);
                    window.connectorStartObj = findTarget(opt.target || canvas.findTarget(opt.e));

                    if (window.connectorStartObj && typeof window.getObjectAnchors === 'function' && typeof window.getClosestAnchor === 'function') {
                        const anchors = window.getObjectAnchors(window.connectorStartObj);
                        window.connectorStartPoint = window.getClosestAnchor(anchors, pointer);
                    } else {
                        window.connectorStartPoint = pointer;
                    }

                    const strokeColor = window.WhiteboardApp.currentColor || window.currentColor || '#1e293b';
                    const strokeWidth = window.WhiteboardApp.strokeSize || window.strokeSize || 2;
                    const dashPattern = (typeof window.getDashArrayForPattern === 'function') ? window.getDashArrayForPattern(window.currentLinePattern) : [4, 4];

                    window.connectorPreviewLine = new fabric.Line([window.connectorStartPoint.x, window.connectorStartPoint.y, pointer.x, pointer.y], {
                        stroke: strokeColor,
                        strokeWidth: strokeWidth,
                        strokeDashArray: dashPattern || [4, 4],
                        selectable: false,
                        evented: false
                    });
                    canvas.add(window.connectorPreviewLine);
                    return;
                }

                // Sticky Note Tool: click places note
                if (currentMode === 'sticky') {
                    const pointer = canvas.getPointer(opt.e);
                    const currentFrameRatio = window.WhiteboardApp.currentFrameRatio || window.currentFrameRatio || 'infinite';
                    const slideFrameRect = window.WhiteboardApp.slideFrameRect || window.slideFrameRect;
                    if (currentFrameRatio !== 'infinite' && slideFrameRect) {
                        const fLeft = slideFrameRect.left;
                        const fTop = slideFrameRect.top;
                        const fRight = fLeft + slideFrameRect.getScaledWidth();
                        const fBottom = fTop + slideFrameRect.getScaledHeight();
                        if (pointer.x < fLeft || pointer.x > fRight - 150 || pointer.y < fTop || pointer.y > fBottom - 150) {
                            if (typeof window.showToast === 'function') window.showToast('Please place sticky notes inside the slide frame');
                            return;
                        }
                    }

                    const stickyColor = window.WhiteboardApp.currentStickyColor || window.currentStickyColor || 'yellow';
                    const createNote = (window.WhiteboardApp && window.WhiteboardApp.notes && window.WhiteboardApp.notes.createStickyNote) || window.createStickyNote;
                    if (typeof createNote === 'function') {
                        const { group, text } = createNote(pointer.x, pointer.y, stickyColor, 'Type note...');
                        canvas.add(group);
                        if (typeof window.constrainObjectToSlideFrame === 'function') window.constrainObjectToSlideFrame(group);
                        canvas.renderAll();
                        if (typeof window.saveState === 'function') window.saveState();

                        if (typeof window.setMode === 'function') window.setMode('select');
                        canvas.setActiveObject(text);
                        text.enterEditing();
                        text.selectAll();
                        canvas.renderAll();

                        text.on('editing:exited', () => {
                            if (typeof window.constrainObjectToSlideFrame === 'function') window.constrainObjectToSlideFrame(group);
                            canvas.setActiveObject(group);
                            canvas.renderAll();
                            if (typeof window.saveState === 'function') window.saveState();
                        });
                    }
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
                    const currentFrameRatio = window.WhiteboardApp.currentFrameRatio || window.currentFrameRatio || 'infinite';
                    const slideFrameRect = window.WhiteboardApp.slideFrameRect || window.slideFrameRect;
                    if (currentFrameRatio !== 'infinite' && slideFrameRect) {
                        const fLeft = slideFrameRect.left;
                        const fTop = slideFrameRect.top;
                        const fRight = fLeft + slideFrameRect.getScaledWidth();
                        const fBottom = fTop + slideFrameRect.getScaledHeight();
                        if (pointer.x < fLeft || pointer.x > fRight - 60 || pointer.y < fTop || pointer.y > fBottom - 30) {
                            if (typeof window.showToast === 'function') window.showToast('Please place text inside the slide frame');
                            return;
                        }
                    }

                    const selectFontSize = document.getElementById('select-font-size');
                    const fontSize = selectFontSize ? (parseInt(selectFontSize.value, 10) || 24) : 24;
                    const strokeColor = window.WhiteboardApp.currentColor || window.currentColor || '#1e293b';
                    const isBold = window.WhiteboardApp.isBold || window.isBold || false;
                    const isItalic = window.WhiteboardApp.isItalic || window.isItalic || false;

                    const textObj = new fabric.IText('Type here', {
                        left: pointer.x,
                        top: pointer.y,
                        fontFamily: 'sans-serif',
                        fontSize: fontSize,
                        fill: strokeColor,
                        fontWeight: isBold ? 'bold' : 'normal',
                        fontStyle: isItalic ? 'italic' : 'normal',
                        editable: true,
                        selectable: true
                    });

                    canvas.add(textObj);
                    if (typeof window.constrainObjectToSlideFrame === 'function') window.constrainObjectToSlideFrame(textObj);
                    canvas.setActiveObject(textObj);
                    textObj.enterEditing();
                    textObj.selectAll();
                    canvas.renderAll();

                    textObj.on('editing:exited', () => {
                        if (textObj.text.trim() === '') {
                            canvas.remove(textObj);
                            canvas.renderAll();
                        } else {
                            if (typeof window.constrainObjectToSlideFrame === 'function') window.constrainObjectToSlideFrame(textObj);
                            canvas.renderAll();
                            if (typeof window.saveState === 'function') window.saveState();
                        }
                    });
                }
            });

            // 3. Double-Click to edit text
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
                            if (typeof window.saveState === 'function') window.saveState();
                        });
                    }
                }
            });

            // 4. Shift + Drag: Maintain aspect ratio
            canvas.on('before:transform', (opt) => {
                if (opt.e && opt.e.shiftKey && opt.transform) {
                    opt.transform.uniform = true;
                }
            });

            // 5. Mouse Move Event
            canvas.on('mouse:move', (opt) => {
                const isPanning = window.WhiteboardApp.isPanning || window.isPanning;
                if (isPanning) {
                    const evt = opt.e;
                    const deltaX = evt.clientX - (window.lastPosX || 0);
                    const deltaY = evt.clientY - (window.lastPosY || 0);

                    canvas.relativePan(new fabric.Point(deltaX, deltaY));
                    window.lastPosX = evt.clientX;
                    window.lastPosY = evt.clientY;

                    if (typeof window.updateGrid === 'function') window.updateGrid();
                    const activeStepBox = window.WhiteboardApp.activeStepBox || window.activeStepBox;
                    if (activeStepBox && typeof window.updateStepBoxFloatingControls === 'function') {
                        window.updateStepBoxFloatingControls(activeStepBox);
                    }
                    return;
                }

                if (window.isDrawingStepBox && window.stepBoxPreviewRect && window.stepBoxStartPoint) {
                    const pointer = canvas.getPointer(opt.e);
                    const left = Math.min(window.stepBoxStartPoint.x, pointer.x);
                    const top = Math.min(window.stepBoxStartPoint.y, pointer.y);
                    const width = Math.abs(pointer.x - window.stepBoxStartPoint.x);
                    const height = Math.abs(pointer.y - window.stepBoxStartPoint.y);
                    window.stepBoxPreviewRect.set({ left, top, width, height });
                    window.stepBoxPreviewRect.setCoords();
                    canvas.requestRenderAll();
                    return;
                }

                if (window.isErasingArea && window.areaErasePreview && window.areaErasePoints && window.areaErasePoints.length > 0) {
                    const pointer = canvas.getPointer(opt.e);
                    const lastPt = window.areaErasePoints[window.areaErasePoints.length - 1];
                    const dist = Math.hypot(pointer.x - lastPt.x, pointer.y - lastPt.y);
                    if (dist > 3) {
                        window.areaErasePoints.push({ x: pointer.x, y: pointer.y });
                        canvas.remove(window.areaErasePreview);
                        window.areaErasePreview = new fabric.Polygon([...window.areaErasePoints], {
                            fill: 'rgba(239, 68, 68, 0.16)',
                            stroke: '#ef4444',
                            strokeWidth: 2,
                            strokeDashArray: [5, 4],
                            selectable: false,
                            evented: false,
                            objectCaching: false
                        });
                        canvas.add(window.areaErasePreview);
                        canvas.requestRenderAll();
                    }
                    return;
                }

                const currentMode = window.currentMode || (window.WhiteboardApp && window.WhiteboardApp.currentMode) || 'select';
                const eraserSubMode = window.WhiteboardApp.eraserSubMode || window.eraserSubMode || 'brush';
                const eraserCursorPreview = document.getElementById('eraser-cursor-preview');
                const eraserSize = window.WhiteboardApp.eraserSize || window.eraserSize || 24;

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

                if (window.isConnecting && window.connectorPreviewLine) {
                    const pointer = canvas.getPointer(opt.e);
                    window.connectorPreviewLine.set({ x2: pointer.x, y2: pointer.y });
                    window.connectorPreviewLine.setCoords();
                    canvas.requestRenderAll();
                }
            });

            // 6. Mouse Up Handler
            function handleMouseUp(opt) {
                if (window.isPanning) {
                    window.isPanning = false;
                    if (window.WhiteboardApp) window.WhiteboardApp.isPanning = false;
                    InteractionsModule.updateCursorForMode();
                }

                if (window.isErasingArea && typeof window.finalizeAreaErase === 'function') {
                    window.finalizeAreaErase();
                    return;
                }

                if (window.isDrawingStepBox) {
                    window.isDrawingStepBox = false;
                    if (window.stepBoxPreviewRect) {
                        canvas.remove(window.stepBoxPreviewRect);
                        window.stepBoxPreviewRect = null;
                    }

                    const pointer = canvas.getPointer(opt.e);
                    let left = Math.min(window.stepBoxStartPoint.x, pointer.x);
                    let top = Math.min(window.stepBoxStartPoint.y, pointer.y);
                    let width = Math.abs(pointer.x - window.stepBoxStartPoint.x);
                    let height = Math.abs(pointer.y - window.stepBoxStartPoint.y);

                    if (width < 30 || height < 30) {
                        width = 360;
                        height = 240;
                        left = window.stepBoxStartPoint.x - width / 2;
                        top = window.stepBoxStartPoint.y - height / 2;
                    }

                    window.stepBoxStartPoint = null;
                    if (typeof window.createStepBox === 'function') {
                        const newBox = window.createStepBox(left, top, width, height);
                        if (typeof window.setMode === 'function') window.setMode('select');
                        canvas.setActiveObject(newBox);
                        canvas.requestRenderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                        if (typeof window.showToast === 'function') window.showToast(`Created ${newBox.stepBoxName || 'Step Box'}`);
                    }
                    return;
                }

                if (window.isConnecting) {
                    window.isConnecting = false;
                    if (window.connectorPreviewLine) {
                        canvas.remove(window.connectorPreviewLine);
                        window.connectorPreviewLine = null;
                    }

                    const pointer = canvas.getPointer(opt.e);
                    const findTarget = window.findConnectableTarget || ((t) => t);
                    const endObj = findTarget(opt.target || canvas.findTarget(opt.e));

                    if (window.connectorStartObj && endObj && window.connectorStartObj !== endObj) {
                        if (typeof window.createAttachedConnector === 'function') {
                            window.createAttachedConnector(window.connectorStartObj, endObj, window.connectorModeType === 'arrow');
                        }
                    } else if (window.connectorStartPoint) {
                        const dist = Math.hypot(pointer.x - window.connectorStartPoint.x, pointer.y - window.connectorStartPoint.y);
                        if (dist > 10 && typeof window.createFreeformLine === 'function') {
                            window.createFreeformLine(window.connectorStartPoint, pointer, window.connectorModeType === 'arrow');
                        }
                    }

                    window.connectorStartObj = null;
                    window.connectorStartPoint = null;
                    if (typeof window.setMode === 'function') window.setMode('select');
                }
            }

            canvas.on('mouse:up', handleMouseUp);
            window.addEventListener('mouseup', () => {
                if (window.isPanning) {
                    window.isPanning = false;
                    if (window.WhiteboardApp) window.WhiteboardApp.isPanning = false;
                    InteractionsModule.updateCursorForMode();
                }
                if (window.isConnecting) {
                    window.isConnecting = false;
                    if (window.connectorPreviewLine) {
                        canvas.remove(window.connectorPreviewLine);
                        window.connectorPreviewLine = null;
                    }
                    if (typeof window.setMode === 'function') window.setMode('select');
                }
                if (window.isDrawingStepBox) {
                    window.isDrawingStepBox = false;
                    if (window.stepBoxPreviewRect) {
                        canvas.remove(window.stepBoxPreviewRect);
                        window.stepBoxPreviewRect = null;
                    }
                    window.stepBoxStartPoint = null;
                    if (typeof window.setMode === 'function') window.setMode('select');
                }
                if (window.isErasingArea && typeof window.finalizeAreaErase === 'function') {
                    window.finalizeAreaErase();
                }
            });

            // 7. Transform Synchronization (Connectors and Step Boxes)
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
        }
    };

    window.WhiteboardApp.interactions = InteractionsModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => InteractionsModule.init());
    } else {
        InteractionsModule.init();
    }
})(window);

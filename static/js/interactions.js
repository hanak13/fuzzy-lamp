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

            if (document.body.classList.contains('view-only-mode') || mode === 'pan' || isSpace) {
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

        // Geometry helpers for stroke erasing
        sqr(x) { return x * x; },
        dist2(v, w) { return (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y); },

        distToSegmentSquared(p, v, w) {
            const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
            if (l2 === 0) return (p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y);
            let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
            t = Math.max(0, Math.min(1, t));
            const projX = v.x + t * (w.x - v.x);
            const projY = v.y + t * (w.y - v.y);
            return (p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY);
        },

        segmentsIntersect(a, b, c, d) {
            const ccw = (p1, p2, p3) => (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
            return (ccw(a, c, d) !== ccw(b, c, d)) && (ccw(a, b, c) !== ccw(a, b, d));
        },

        distBetweenSegmentsSquared(a, b, c, d) {
            if (InteractionsModule.segmentsIntersect(a, b, c, d)) return 0;
            return Math.min(
                InteractionsModule.distToSegmentSquared(a, c, d),
                InteractionsModule.distToSegmentSquared(b, c, d),
                InteractionsModule.distToSegmentSquared(c, a, b),
                InteractionsModule.distToSegmentSquared(d, a, b)
            );
        },

        getPathPolyline(pathObj) {
            if (!pathObj.path || !Array.isArray(pathObj.path)) return [];
            if (pathObj._cachedCanvasPoints && !pathObj.dirty) {
                return pathObj._cachedCanvasPoints;
            }
            const matrix = pathObj.calcTransformMatrix ? pathObj.calcTransformMatrix() : [1, 0, 0, 1, 0, 0];
            const offsetX = (pathObj.pathOffset && pathObj.pathOffset.x) || 0;
            const offsetY = (pathObj.pathOffset && pathObj.pathOffset.y) || 0;
            const points = [];

            const transform = (x, y) => {
                return fabric.util.transformPoint({ x: x - offsetX, y: y - offsetY }, matrix);
            };

            const pathData = pathObj.path;
            for (let i = 0; i < pathData.length; i++) {
                const cmd = pathData[i];
                if (!cmd || cmd.length < 3) continue;
                const op = cmd[0];
                if (op === 'M' || op === 'L') {
                    points.push(transform(cmd[1], cmd[2]));
                } else if (op === 'Q') {
                    const cpX = cmd[1], cpY = cmd[2], endX = cmd[3], endY = cmd[4];
                    const prev = points[points.length - 1] || transform(cpX, cpY);
                    const midX = 0.25 * prev.x + 0.5 * cpX + 0.25 * endX;
                    const midY = 0.25 * prev.y + 0.5 * cpY + 0.25 * endY;
                    points.push(transform(midX, midY));
                    points.push(transform(endX, endY));
                } else if (op === 'C') {
                    const endX = cmd[5], endY = cmd[6];
                    points.push(transform(endX, endY));
                }
            }
            pathObj._cachedCanvasPoints = points;
            return points;
        },

        eraseStrokesBetween(p1, p2, radius) {
            const canvas = InteractionsModule.getCanvas();
            if (!canvas) return;

            const allObjects = canvas.getObjects();
            if (!allObjects || allObjects.length === 0) return;

            const margin = radius + 64;
            const minX = Math.min(p1.x, p2.x) - margin;
            const maxX = Math.max(p1.x, p2.x) + margin;
            const minY = Math.min(p1.y, p2.y) - margin;
            const maxY = Math.max(p1.y, p2.y) + margin;

            const toRemove = [];

            for (let i = 0; i < allObjects.length; i++) {
                const obj = allObjects[i];
                if (!obj) continue;

                // Strictly protect media / image objects, sticky notes, slide frames, shapes, text, etc.
                if (obj.type === 'image' || obj.isImage || obj.imageName) continue;
                if (obj.isSlideFrame || obj.isGridLine || obj.isStepBox || obj.stepBoxOwnerId) continue;
                if (obj.isStickyNote || obj.isShapeGroup || obj.type === 'textbox' || obj.type === 'i-text') continue;
                if (obj === window.stepBoxPreviewRect || obj === window.connectorPreviewLine || obj === window.areaErasePreview) continue;

                // Target paths (pen, highlighter), connector / free lines, and Smart Shapes
                const isPath = obj.type === 'path';
                const isLine = obj.isConnector || obj.isFreeLine || obj.type === 'line';
                const isSmart = Boolean(obj.isSmartShape);
                if (!isPath && !isLine && !isSmart) continue;

                // Broad-phase AABB test
                const bound = obj.getBoundingRect ? obj.getBoundingRect(true, true) : null;
                if (bound) {
                    if (bound.left > maxX || bound.left + bound.width < minX ||
                        bound.top > maxY || bound.top + bound.height < minY) {
                        continue;
                    }
                }

                const strokeHalfWidth = (obj.strokeWidth || 2) / 2;
                const maxDistSq = (radius + strokeHalfWidth) * (radius + strokeHalfWidth);

                let hit = false;
                if (isPath) {
                    const points = InteractionsModule.getPathPolyline(obj);
                    if (points.length === 0) {
                        if (bound) {
                            const center = { x: bound.left + bound.width / 2, y: bound.top + bound.height / 2 };
                            if (InteractionsModule.distToSegmentSquared(center, p1, p2) <= maxDistSq) {
                                hit = true;
                            }
                        }
                    } else if (points.length === 1) {
                        if (InteractionsModule.distToSegmentSquared(points[0], p1, p2) <= maxDistSq) {
                            hit = true;
                        }
                    } else {
                        for (let k = 0; k < points.length - 1; k++) {
                            if (InteractionsModule.distBetweenSegmentsSquared(p1, p2, points[k], points[k + 1]) <= maxDistSq) {
                                hit = true;
                                break;
                            }
                        }
                    }
                } else if (isLine) {
                    const matrix = obj.calcTransformMatrix ? obj.calcTransformMatrix() : [1, 0, 0, 1, 0, 0];
                    let pA, pB;
                    if (obj.calcLinePoints) {
                        const lp = obj.calcLinePoints();
                        pA = fabric.util.transformPoint({ x: lp.x1, y: lp.y1 }, matrix);
                        pB = fabric.util.transformPoint({ x: lp.x2, y: lp.y2 }, matrix);
                    } else {
                        pA = { x: obj.x1 || 0, y: obj.y1 || 0 };
                        pB = { x: obj.x2 || 0, y: obj.y2 || 0 };
                    }
                    if (InteractionsModule.distBetweenSegmentsSquared(p1, p2, pA, pB) <= maxDistSq) {
                        hit = true;
                    }
                } else if (isSmart && bound) {
                    const bLeft = bound.left;
                    const bTop = bound.top;
                    const bRight = bound.left + bound.width;
                    const bBottom = bound.top + bound.height;
                    if (obj.type === 'circle' || obj.type === 'ellipse') {
                        const cx = (bLeft + bRight) / 2;
                        const cy = (bTop + bBottom) / 2;
                        const rx = Math.max(1, bound.width / 2);
                        const ry = Math.max(1, bound.height / 2);
                        const steps = 32;
                        let prevPt = { x: cx + rx, y: cy };
                        for (let s = 1; s <= steps; s++) {
                            const angle = (s / steps) * Math.PI * 2;
                            const nextPt = { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
                            if (InteractionsModule.distBetweenSegmentsSquared(p1, p2, prevPt, nextPt) <= maxDistSq) {
                                hit = true;
                                break;
                            }
                            prevPt = nextPt;
                        }
                    } else {
                        const corners = [
                            { x: bLeft, y: bTop },
                            { x: bRight, y: bTop },
                            { x: bRight, y: bBottom },
                            { x: bLeft, y: bBottom }
                        ];
                        for (let c = 0; c < 4; c++) {
                            if (InteractionsModule.distBetweenSegmentsSquared(p1, p2, corners[c], corners[(c + 1) % 4]) <= maxDistSq) {
                                hit = true;
                                break;
                            }
                        }
                    }
                }

                if (hit) {
                    toRemove.push(obj);
                }
            }

            if (toRemove.length > 0) {
                toRemove.forEach(obj => {
                    if (obj.arrowHead) {
                        try { canvas.remove(obj.arrowHead); } catch (e) {}
                    }
                    if (obj.startArrowHead) {
                        try { canvas.remove(obj.startArrowHead); } catch (e) {}
                    }
                    if (obj.isConnector && typeof window.detachConnector === 'function') {
                        try { window.detachConnector(obj); } catch (e) {}
                    }
                    canvas.remove(obj);
                });
                window._erasedStrokesCount = (window._erasedStrokesCount || 0) + toRemove.length;
                canvas.requestRenderAll();
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
                    canvas.remove(path);
                    canvas.requestRenderAll();
                    return;
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
                    if (smartShapeEnabled && recognizeAndSnapShape(path, canvas)) {
                        if (typeof window.saveState === 'function') window.saveState();
                        return;
                    }
                    path.set({
                        selectable: currentMode === 'select'
                    });
                    if (typeof window.saveState === 'function') window.saveState();
                }
            });

            // Smart Shape Recognition (Opt-in toggle)
            let smartShapeEnabled = false;
            const btnSmartShape = document.getElementById('btn-smart-shape');
            if (btnSmartShape) {
                btnSmartShape.addEventListener('click', () => {
                    smartShapeEnabled = !smartShapeEnabled;
                    btnSmartShape.classList.toggle('active', smartShapeEnabled);
                    if (typeof window.showToast === 'function') {
                        window.showToast(smartShapeEnabled ? 'Smart Shape Recognition ON' : 'Smart Shape Recognition OFF');
                    }
                });
            }

            function recognizeAndSnapShape(pathObj, targetCanvas) {
                if (!pathObj || !Array.isArray(pathObj.path) || pathObj.path.length < 3) return false;
                const pts = [];
                pathObj.path.forEach(cmd => {
                    if (cmd.length >= 3) {
                        pts.push({ x: cmd[cmd.length - 2], y: cmd[cmd.length - 1] });
                    }
                });
                if (pts.length < 3) return false;

                const offsetX = pathObj.left - pathObj.pathOffset.x;
                const offsetY = pathObj.top - pathObj.pathOffset.y;
                const worldPts = pts.map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));

                const br = pathObj.getBoundingRect(true, true);
                const w = br.width;
                const h = br.height;
                const diag = Math.hypot(w, h);
                if (diag < 24) return false;

                const first = worldPts[0];
                const last = worldPts[worldPts.length - 1];
                const endDist = Math.hypot(last.x - first.x, last.y - first.y);
                const stroke = pathObj.stroke || '#1e293b';
                const strokeWidth = pathObj.strokeWidth || 4;

                // 1. Straight Line detection
                if (endDist > 28 && endDist > diag * 0.72) {
                    const dx = last.x - first.x;
                    const dy = last.y - first.y;
                    let maxDev = 0;
                    for (let i = 1; i < worldPts.length - 1; i++) {
                        const p = worldPts[i];
                        const dist = Math.abs(dy * p.x - dx * p.y + last.x * first.y - last.y * first.x) / endDist;
                        if (dist > maxDev) maxDev = dist;
                    }
                    if (maxDev < endDist * 0.12) {
                        const line = new fabric.Line([first.x, first.y, last.x, last.y], {
                            stroke, strokeWidth, strokeLineCap: 'round', selectable: false, isSmartShape: true
                        });
                        targetCanvas.remove(pathObj);
                        targetCanvas.add(line);
                        targetCanvas.requestRenderAll();
                        return true;
                    }
                }

                // Closed-ish loop check for Circle / Ellipse / Rectangle
                if (endDist > diag * 0.4 || w < 20 || h < 20) return false;

                const cx = br.left + w / 2;
                const cy = br.top + h / 2;
                const rx = w / 2;
                const ry = h / 2;

                // 2. Circle / Ellipse check via normalized ellipse distance
                let ellipErrSum = 0;
                let boxEdgeHits = 0;
                const edgeTol = Math.max(8, Math.min(w, h) * 0.18);
                for (const p of worldPts) {
                    const normR = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
                    ellipErrSum += Math.abs(normR - 1);
                    const nearEdge =
                        Math.abs(p.x - br.left) < edgeTol ||
                        Math.abs(p.x - (br.left + w)) < edgeTol ||
                        Math.abs(p.y - br.top) < edgeTol ||
                        Math.abs(p.y - (br.top + h)) < edgeTol;
                    if (nearEdge) boxEdgeHits++;
                }
                const meanEllipErr = ellipErrSum / worldPts.length;
                const boxRatio = boxEdgeHits / worldPts.length;

                if (meanEllipErr < 0.18 && meanEllipErr <= (1 - boxRatio) + 0.05) {
                    const aspect = w / h;
                    const shape = (aspect >= 0.78 && aspect <= 1.28)
                        ? new fabric.Circle({
                            left: cx, top: cy, radius: (rx + ry) / 2,
                            originX: 'center', originY: 'center',
                            fill: 'transparent', stroke, strokeWidth, selectable: false, isSmartShape: true
                        })
                        : new fabric.Ellipse({
                            left: cx, top: cy, rx, ry,
                            originX: 'center', originY: 'center',
                            fill: 'transparent', stroke, strokeWidth, selectable: false, isSmartShape: true
                        });
                    targetCanvas.remove(pathObj);
                    targetCanvas.add(shape);
                    targetCanvas.requestRenderAll();
                    return true;
                }

                // 3. Rectangle check
                if (boxRatio >= 0.72) {
                    const rect = new fabric.Rect({
                        left: br.left, top: br.top, width: w, height: h,
                        fill: 'transparent', stroke, strokeWidth, rx: 4, ry: 4, selectable: false, isSmartShape: true
                    });
                    targetCanvas.remove(pathObj);
                    targetCanvas.add(rect);
                    targetCanvas.requestRenderAll();
                    return true;
                }

                return false;
            }

            // Long-press drag duplication state
            let longPressTimer = null;
            let longPressActive = false;
            let longPressStartClient = null;
            let longPressTarget = null;
            let longPressDuplicated = false;
            let longPressClonedObj = null;
            const LONG_PRESS_MS = 450;
            const LONG_PRESS_MOVE_TOLERANCE = 6;

            function getClientXY(evt) {
                if (!evt) return { x: 0, y: 0 };
                if (evt.touches && evt.touches.length > 0) {
                    return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
                }
                if (evt.changedTouches && evt.changedTouches.length > 0) {
                    return { x: evt.changedTouches[0].clientX, y: evt.changedTouches[0].clientY };
                }
                return { x: evt.clientX || 0, y: evt.clientY || 0 };
            }

            function cancelLongPress() {
                longPressActive = false;
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            }

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
                const shouldPan = currentMode === 'pan' || isSpacePressed || isMiddleClick || document.body.classList.contains('view-only-mode');

                if (shouldPan) {
                    window.isPanning = true;
                    if (window.WhiteboardApp) window.WhiteboardApp.isPanning = true;
                    window.lastPosX = evt.clientX;
                    window.lastPosY = evt.clientY;
                    canvas.defaultCursor = 'grabbing';
                    if (evt) evt.preventDefault();
                    return;
                }

                // Brush Eraser mode: Erase strokes under pointer directly without adding objects or erasing media
                const eraserSubMode = (window.WhiteboardApp && window.WhiteboardApp.eraserSubMode) || window.eraserSubMode || 'brush';
                if (currentMode === 'eraser' && eraserSubMode === 'brush' && !shouldPan && !isRightClick) {
                    window.isErasingStrokes = true;
                    window._erasedStrokesCount = 0;
                    const pointer = canvas.getPointer(opt.e);
                    window._lastErasePoint = { x: pointer.x, y: pointer.y };
                    const eraserRadius = ((window.WhiteboardApp && window.WhiteboardApp.eraserSize) || window.eraserSize || 24) / 2;
                    InteractionsModule.eraseStrokesBetween(window._lastErasePoint, window._lastErasePoint, eraserRadius);
                    return;
                }

                // Area Eraser mode
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
                        delete cloned.id;
                        if (cloned.shapeUid && typeof window.generateUid === 'function') cloned.shapeUid = window.generateUid();
                        cloned.connectedLines = [];
                        canvas.add(cloned);
                        canvas.setActiveObject(cloned);
                        canvas.requestRenderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                        if (typeof window.showToast === 'function') window.showToast('Duplicated with Alt+Drag');
                    }, EXTRA_PROPS);
                } else if (
                    !isRightClick &&
                    !shouldPan &&
                    currentMode === 'select' &&
                    opt.target &&
                    !opt.target.isConnector &&
                    !opt.target.isArrowHead &&
                    !opt.target.isSlideFrame &&
                    !opt.target.isGridLine &&
                    !opt.target.isStepBox &&
                    !document.body.classList.contains('view-only-mode')
                ) {
                    // Long-Press Drag: Hold 450ms on an object without moving to duplicate and drag it
                    cancelLongPress();
                    longPressActive = true;
                    longPressDuplicated = false;
                    longPressClonedObj = null;
                    longPressTarget = opt.target;
                    longPressStartClient = getClientXY(evt);

                    longPressTimer = setTimeout(() => {
                        longPressTimer = null;
                        if (!longPressActive || !longPressTarget) return;
                        if (canvas._currentTransform && canvas._currentTransform.action !== 'drag') return;

                        const targetToClone = longPressTarget;
                        targetToClone.clone((clonedObj) => {
                            if (!longPressActive) return;
                            longPressDuplicated = true;
                            longPressClonedObj = clonedObj;

                            const prepClone = (obj) => {
                                delete obj.id;
                                if (obj.shapeUid && typeof window.generateUid === 'function') {
                                    obj.shapeUid = window.generateUid();
                                }
                                obj.connectedLines = [];
                            };

                            if (clonedObj.type === 'activeSelection') {
                                clonedObj.canvas = canvas;
                                clonedObj.forEachObject((obj) => {
                                    prepClone(obj);
                                    canvas.add(obj);
                                });
                                clonedObj.setCoords();
                            } else {
                                prepClone(clonedObj);
                                canvas.add(clonedObj);
                            }

                            if (canvas._currentTransform && canvas._currentTransform.target === targetToClone) {
                                canvas._currentTransform.target = clonedObj;
                                canvas._currentTransform.original.left = clonedObj.left;
                                canvas._currentTransform.original.top = clonedObj.top;
                            }
                            canvas.setActiveObject(clonedObj);
                            canvas.defaultCursor = 'copy';
                            canvas.setCursor('copy');
                            canvas.requestRenderAll();
                            if (typeof window.showToast === 'function') {
                                window.showToast('Duplicated! Drag to place');
                            }
                        }, EXTRA_PROPS);
                    }, LONG_PRESS_MS);
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
                        strokeUniform: true,
                        objectCaching: false,
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
                    if (currentMode === 'select' && (!opt.target || opt.target === clickedBox)) {
                        canvas.setActiveObject(clickedBox);
                        canvas.requestRenderAll();
                    }
                    if (typeof window.updateStepBoxFloatingControls === 'function') {
                        window.updateStepBoxFloatingControls(clickedBox);
                    }
                } else if (!opt.target || (!opt.target.isStepBox && !opt.target.stepBoxOwnerId)) {
                    if (typeof window.hideStepBoxFloatingControls === 'function') {
                        window.hideStepBoxFloatingControls();
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

            // 4. Shift + Drag: Maintain aspect ratio; cancel long-press if resizing/rotating
            canvas.on('before:transform', (opt) => {
                if (opt.transform && opt.transform.action !== 'drag') {
                    cancelLongPress();
                }
                if (opt.e && opt.e.shiftKey && opt.transform) {
                    opt.transform.uniform = true;
                }
            });

            // 5. Mouse Move Event
            canvas.on('mouse:move', (opt) => {
                if (longPressTimer && longPressStartClient && opt.e) {
                    const pt = getClientXY(opt.e);
                    if (Math.hypot(pt.x - longPressStartClient.x, pt.y - longPressStartClient.y) > LONG_PRESS_MOVE_TOLERANCE) {
                        cancelLongPress();
                    }
                }
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

                // Stroke erasing while dragging in brush eraser mode
                if (window.isErasingStrokes && currentMode === 'eraser' && eraserSubMode === 'brush') {
                    const pointer = canvas.getPointer(opt.e);
                    const eraserRadius = eraserSize / 2;
                    const fromPt = window._lastErasePoint || pointer;
                    InteractionsModule.eraseStrokesBetween(fromPt, pointer, eraserRadius);
                    window._lastErasePoint = { x: pointer.x, y: pointer.y };
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

                if (window.isErasingStrokes) {
                    window.isErasingStrokes = false;
                    window._lastErasePoint = null;
                    if (window._erasedStrokesCount > 0) {
                        canvas.requestRenderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                        if (typeof window.updateObjectsCountBadges === 'function') window.updateObjectsCountBadges();
                        window._erasedStrokesCount = 0;
                    }
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
                        if (newBox) {
                            canvas.setActiveObject(newBox);
                            if (typeof window.updateStepBoxFloatingControls === 'function') {
                                window.updateStepBoxFloatingControls(newBox);
                            }
                        }
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

            canvas.on('mouse:up', (opt) => {
                cancelLongPress();
                if (longPressDuplicated && longPressClonedObj) {
                    const endPt = getClientXY(opt && opt.e);
                    const movedDist = longPressStartClient
                        ? Math.hypot(endPt.x - longPressStartClient.x, endPt.y - longPressStartClient.y)
                        : 0;
                    if (movedDist < LONG_PRESS_MOVE_TOLERANCE) {
                        longPressClonedObj.set({
                            left: longPressClonedObj.left + 20,
                            top: longPressClonedObj.top + 20
                        });
                    }
                    longPressClonedObj.setCoords();
                    longPressDuplicated = false;
                    longPressClonedObj = null;
                    longPressTarget = null;
                    longPressStartClient = null;
                    InteractionsModule.updateCursorForMode();
                    canvas.requestRenderAll();
                    if (typeof window.saveState === 'function') window.saveState();
                    if (typeof window.updateObjectsCountBadges === 'function') window.updateObjectsCountBadges();
                    if (typeof window.renderObjectsList === 'function') window.renderObjectsList();
                } else {
                    longPressTarget = null;
                    longPressStartClient = null;
                }
                handleMouseUp(opt);
            });
            window.addEventListener('mouseup', () => {
                cancelLongPress();
                longPressTarget = null;
                longPressStartClient = null;
                if (longPressDuplicated) {
                    longPressDuplicated = false;
                    longPressClonedObj = null;
                    InteractionsModule.updateCursorForMode();
                }
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
                if (window.isErasingStrokes) {
                    window.isErasingStrokes = false;
                    window._lastErasePoint = null;
                    if (window._erasedStrokesCount > 0) {
                        canvas.requestRenderAll();
                        if (typeof window.saveState === 'function') window.saveState();
                        if (typeof window.updateObjectsCountBadges === 'function') window.updateObjectsCountBadges();
                        window._erasedStrokesCount = 0;
                    }
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
                    if ((target.connectedLines || target.isFreeLine) && typeof window.updateConnectedLinesFor === 'function') {
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
                if ((target.connectedLines || target.isFreeLine) && typeof window.updateConnectedLinesFor === 'function') {
                    window.updateConnectedLinesFor(target);
                }
            });

            canvas.on('object:rotating', (opt) => {
                const target = opt.target;
                if (!target) return;
                if ((target.connectedLines || target.isFreeLine) && typeof window.updateConnectedLinesFor === 'function') {
                    window.updateConnectedLinesFor(target);
                }
            });

            canvas.on('object:modified', (opt) => {
                const target = opt.target;
                if (!target) return;
                if ((target.connectedLines || target.isFreeLine) && typeof window.updateConnectedLinesFor === 'function') {
                    window.updateConnectedLinesFor(target);
                }

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
    window.eraseStrokesBetween = InteractionsModule.eraseStrokesBetween;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => InteractionsModule.init());
    } else {
        InteractionsModule.init();
    }
})(window);

/**
 * Whiteboard Application - Tools, Brushes, Dual Eraser, and Connectors Module
 * static/js/tools.js
 *
 * Handles pen/highlighter brush configuration, stroke & eraser sizing, dual eraser engine
 * (brush erasing and inverted polygon area erasing), and connector arrow routing with anchor snapping.
 */

(function () {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    function getCanvas() {
        return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
    }

    // -------------------------------------------------------------------------
    // 1. Color & Brush Helpers
    // -------------------------------------------------------------------------
    function hexToRgba(hex, alpha) {
        if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`;
        let cleanHex = hex.replace('#', '');
        if (cleanHex.length === 3) {
            cleanHex = cleanHex.split('').map(ch => ch + ch).join('');
        }
        const num = parseInt(cleanHex, 16);
        if (isNaN(num)) return `rgba(0,0,0,${alpha})`;
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function updateBrushSettings() {
        const canvas = getCanvas();
        if (!canvas) return;

        if (!canvas.freeDrawingBrush && typeof fabric !== 'undefined') {
            canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        }
        if (!canvas.freeDrawingBrush) return;

        const baseSize = window.strokeSize || 4;
        const currentMode = window.currentMode;
        const currentColor = window.currentColor || '#1e293b';
        const eraserSubMode = window.eraserSubMode || 'brush';
        const eraserSize = window.eraserSize || 24;

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
            canvas.isDrawingMode = false;
        } else {
            canvas.isDrawingMode = false;
        }
    }

    function setStrokeSize(newSize) {
        window.strokeSize = Math.max(1, Math.min(64, Math.round(newSize)));
        const strokeSizeVal = document.getElementById('stroke-size-val');
        const sliderStrokeSize = document.getElementById('slider-stroke-size');
        const fsSizeDisplay = document.getElementById('fs-size-display');
        const fsSizeSlider = document.getElementById('fs-size-slider');

        if (strokeSizeVal) strokeSizeVal.textContent = window.strokeSize + 'px';
        if (sliderStrokeSize) sliderStrokeSize.value = window.strokeSize;

        if (window.currentMode !== 'eraser') {
            if (fsSizeDisplay) fsSizeDisplay.textContent = window.strokeSize + 'px';
            if (fsSizeSlider) {
                fsSizeSlider.min = '1';
                fsSizeSlider.max = '64';
                fsSizeSlider.value = window.strokeSize;
            }
        }

        if (window.currentMode === 'pen' || window.currentMode === 'highlighter') {
            updateBrushSettings();
        }

        const canvas = getCanvas();
        if (!canvas) return;

        const activeObj = canvas.getActiveObject();
        if (activeObj && window.currentMode === 'select') {
            if (activeObj.isShapeGroup) {
                const shape = activeObj.getObjects().find(o => o.type !== 'textbox' && o.type !== 'i-text');
                if (shape) {
                    shape.set('strokeWidth', window.strokeSize);
                    canvas.renderAll();
                    if (typeof window.saveState === 'function') window.saveState();
                }
            } else if (activeObj.isConnector || activeObj.isFreeLine || activeObj.type === 'line') {
                activeObj.set('strokeWidth', window.strokeSize);
                if (activeObj.arrowHead) {
                    activeObj.arrowHead.set({
                        width: Math.max(12, window.strokeSize * 5),
                        height: Math.max(12, window.strokeSize * 5)
                    });
                }
                if (activeObj.startArrowHead) {
                    activeObj.startArrowHead.set({
                        width: Math.max(12, window.strokeSize * 5),
                        height: Math.max(12, window.strokeSize * 5)
                    });
                }
                canvas.renderAll();
                if (typeof window.saveState === 'function') window.saveState();
            } else if (!activeObj.isSlideFrame && !activeObj.isGridLine && (activeObj.type === 'rect' || activeObj.type === 'circle' || activeObj.type === 'triangle' || activeObj.type === 'polygon' || activeObj.type === 'path')) {
                activeObj.set('strokeWidth', window.strokeSize);
                canvas.renderAll();
                if (typeof window.saveState === 'function') window.saveState();
            }
        }
    }

    function setEraserSize(newSize) {
        window.eraserSize = Math.max(6, Math.min(150, Math.round(newSize)));
        if (window.WhiteboardApp) {
            window.WhiteboardApp.eraserSize = window.eraserSize;
            if (window.WhiteboardApp.state) window.WhiteboardApp.state.eraserSize = window.eraserSize;
        }
        const eraserSizeVal = document.getElementById('eraser-size-val');
        const sliderEraserSize = document.getElementById('slider-eraser-size');
        const fsSizeDisplay = document.getElementById('fs-size-display');
        const fsSizeSlider = document.getElementById('fs-size-slider');
        const eraserCursorPreview = document.getElementById('eraser-cursor-preview');

        if (eraserSizeVal) eraserSizeVal.textContent = window.eraserSize + 'px';
        if (sliderEraserSize) sliderEraserSize.value = window.eraserSize;

        if (window.currentMode === 'eraser') {
            if (fsSizeDisplay) fsSizeDisplay.textContent = window.eraserSize + 'px';
            if (fsSizeSlider) {
                fsSizeSlider.min = '6';
                fsSizeSlider.max = '150';
                fsSizeSlider.value = window.eraserSize;
            }
        }

        const canvas = getCanvas();
        if (window.currentMode === 'eraser' && window.eraserSubMode === 'brush' && canvas && canvas.freeDrawingBrush) {
            canvas.freeDrawingBrush.width = window.eraserSize;
        }

        if (eraserCursorPreview && window.currentMode === 'eraser' && window.eraserSubMode === 'brush' && canvas) {
            const zoom = canvas.getZoom();
            const diameter = Math.max(8, window.eraserSize * zoom);
            eraserCursorPreview.style.width = diameter + 'px';
            eraserCursorPreview.style.height = diameter + 'px';
        }
    }

    function setEraserSubMode(subMode) {
        window.eraserSubMode = (subMode === 'area') ? 'area' : 'brush';
        if (window.WhiteboardApp) {
            window.WhiteboardApp.eraserSubMode = window.eraserSubMode;
            if (window.WhiteboardApp.state) window.WhiteboardApp.state.eraserSubMode = window.eraserSubMode;
        }

        const btnEraserModeBrush = document.getElementById('btn-eraser-mode-brush');
        const btnEraserModeArea = document.getElementById('btn-eraser-mode-area');
        const fsSubEraserBrush = document.getElementById('fs-sub-eraser-brush');
        const fsSubEraserArea = document.getElementById('fs-sub-eraser-area');
        const eraserCursorPreview = document.getElementById('eraser-cursor-preview');

        if (btnEraserModeBrush) btnEraserModeBrush.classList.toggle('active', window.eraserSubMode === 'brush');
        if (btnEraserModeArea) btnEraserModeArea.classList.toggle('active', window.eraserSubMode === 'area');
        if (fsSubEraserBrush) fsSubEraserBrush.classList.toggle('active', window.eraserSubMode === 'brush');
        if (fsSubEraserArea) fsSubEraserArea.classList.toggle('active', window.eraserSubMode === 'area');

        const canvas = getCanvas();

        if (window.currentMode === 'eraser') {
            canvas.isDrawingMode = false;
            canvas.defaultCursor = 'crosshair';
            if (window.eraserSubMode === 'brush') {
                if (typeof window.showToast === 'function') {
                    window.showToast(`Brush Eraser (${window.eraserSize || 24}px)`);
                }
            } else {
                if (eraserCursorPreview) eraserCursorPreview.style.display = 'none';
                if (typeof window.showToast === 'function') {
                    window.showToast('Circle / Area Erase: Circle or draw a boundary around what to erase');
                }
            }
        }
    }

    function updateActiveDrawingColor(newColor) {
        window.currentColor = newColor;
        if (window.WhiteboardApp) {
            window.WhiteboardApp.currentColor = newColor;
            if (window.WhiteboardApp.state) window.WhiteboardApp.state.currentColor = newColor;
        }

        const colorPicker = document.getElementById('color-picker');
        const colorPreview = document.getElementById('color-preview');
        const fsColorPreviewCircle = document.getElementById('fs-color-preview-circle');
        const fsColorInput = document.getElementById('fs-color-input');
        const fsColorSwatches = document.querySelectorAll('.fs-color-swatch');

        if (colorPicker) colorPicker.value = newColor;
        if (colorPreview) colorPreview.style.backgroundColor = newColor;
        if (fsColorPreviewCircle) fsColorPreviewCircle.style.backgroundColor = newColor;
        if (fsColorInput) fsColorInput.value = newColor;

        if (fsColorSwatches) {
            fsColorSwatches.forEach(sw => {
                sw.classList.toggle('active', sw.getAttribute('data-color') === newColor);
            });
        }

        if (window.currentMode === 'pen' || window.currentMode === 'highlighter') {
            updateBrushSettings();
        }

        const canvas = getCanvas();
        if (!canvas) return;

        const activeObj = canvas.getActiveObject();
        if (activeObj && window.currentMode === 'select') {
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
            if (typeof window.saveState === 'function') window.saveState();
        }
    }

    // -------------------------------------------------------------------------
    // 2. Dual Eraser Engine (Inverted ClipPath Erasing)
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
        const canvas = getCanvas();
        if (!canvas) return;

        if (!window.isErasingArea) return;
        window.isErasingArea = false;

        if (window.areaErasePreview) {
            canvas.remove(window.areaErasePreview);
            window.areaErasePreview = null;
        }

        const areaErasePoints = window.areaErasePoints || [];
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
                if (!obj || obj.isSlideFrame || obj.isStepBox || obj.isGridLine ||
                    obj === window.stepBoxPreviewRect || obj === window.connectorPreviewLine) return;

                // Protect imported media / image objects from area erase
                if (obj.type === 'image' || obj.isImage || obj.imageName) return;

                const bound = obj.getBoundingRect ? obj.getBoundingRect(true, true) : null;
                if (!bound) return;

                if (bound.left > maxX || bound.left + bound.width < minX ||
                    bound.top > maxY || bound.top + bound.height < minY) {
                    return;
                }

                const samplePoints = [
                    { x: bound.left, y: bound.top },
                    { x: bound.left + bound.width, y: bound.top },
                    { x: bound.left, y: bound.top + bound.height },
                    { x: bound.left + bound.width, y: bound.top + bound.height },
                    { x: bound.left + bound.width / 2, y: bound.top + bound.height / 2 }
                ];

                let insideCount = 0;
                samplePoints.forEach(pt => {
                    if (isPointInPolygon(pt, poly)) insideCount++;
                });

                let polyInsideObj = false;
                for (let i = 0; i < poly.length; i++) {
                    const p = poly[i];
                    if (p.x >= bound.left && p.x <= bound.left + bound.width &&
                        p.y >= bound.top && p.y <= bound.top + bound.height) {
                        polyInsideObj = true;
                        break;
                    }
                }

                if (insideCount === 0 && !polyInsideObj) return;

                const isEntirelyInside = (insideCount === samplePoints.length) &&
                    (bound.left >= minX - 4 && bound.left + bound.width <= maxX + 4 &&
                     bound.top >= minY - 4 && bound.top + bound.height <= maxY + 4);

                if (isEntirelyInside) {
                    canvas.remove(obj);
                    removedCount++;
                } else {
                    applyErasePolygonToObject(obj, poly);
                    partialCount++;
                }
            });

            if (removedCount > 0 || partialCount > 0) {
                canvas.requestRenderAll();
                if (typeof window.saveState === 'function') window.saveState();
                if (typeof window.showToast === 'function') {
                    if (partialCount > 0) {
                        window.showToast(`Erased circled portion (${partialCount} object${partialCount > 1 ? 's' : ''})`);
                    } else {
                        window.showToast(`Erased ${removedCount} object${removedCount > 1 ? 's' : ''}`);
                    }
                }
            } else {
                canvas.requestRenderAll();
            }
        }
        window.areaErasePoints = [];
    }

    // -------------------------------------------------------------------------
    // 3. Connectors & Arrows System
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
        let best = { p1: anchorsA[0], p2: anchorsB[0], from: anchorsA[0], to: anchorsB[0] };

        for (const a of anchorsA) {
            for (const b of anchorsB) {
                const dist = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
                if (dist < minDist) {
                    minDist = dist;
                    best = { p1: a, p2: b, from: a, to: b };
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
        const canvas = getCanvas();
        if (!line || !canvas) return;
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
            p1 = pair.p1 || pair.from;
            p2 = pair.p2 || pair.to;
        } else {
            const matrix = line.calcTransformMatrix();
            p1 = fabric.util.transformPoint({ x: line.x1, y: line.y1 }, matrix);
            p2 = fabric.util.transformPoint({ x: line.x2, y: line.y2 }, matrix);
        }

        const color = line.stroke || window.currentColor || '#1e293b';
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
        const canvas = getCanvas();
        if (!canvas) return;

        const strokeWidth = window.strokeSize || 2;
        const strokeColor = window.currentColor || '#1e293b';
        const currentLinePattern = window.currentLinePattern || 'solid';
        const currentArrowHeadStyle = window.currentArrowHeadStyle || 'none';
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
        if (typeof window.applySlideClip === 'function') window.applySlideClip(line);

        if (arrowStyle !== 'none') {
            applyArrowheadStyleToLine(line, arrowStyle);
        }

        canvas.setActiveObject(line);
        canvas.renderAll();
        if (typeof window.saveState === 'function') window.saveState();
    }

    function createAttachedConnector(fromObj, toObj, hasArrow = true) {
        const canvas = getCanvas();
        if (!fromObj || !toObj || !canvas) return;

        const generateUid = (window.WhiteboardApp && window.WhiteboardApp.shapes && window.WhiteboardApp.shapes.generateUid)
            || window.generateUid || (() => 'uid_' + Date.now());

        fromObj.shapeUid = fromObj.shapeUid || generateUid();
        toObj.shapeUid = toObj.shapeUid || generateUid();

        const pair = getBestAnchorPair(fromObj, toObj);
        const strokeWidth = window.strokeSize || 2;
        const strokeColor = window.currentColor || '#1e293b';
        const currentLinePattern = window.currentLinePattern || 'solid';
        const currentArrowHeadStyle = window.currentArrowHeadStyle || 'end';
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
        if (typeof window.applySlideClip === 'function') window.applySlideClip(line);
        canvas.sendToBack(line);

        if (arrowStyle !== 'none') {
            applyArrowheadStyleToLine(line, arrowStyle);
        }

        canvas.renderAll();
        if (typeof window.saveState === 'function') window.saveState();
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

    function detachConnector(line) {
        if (!line) return;
        [line.fromShape, line.toShape].forEach(shape => {
            if (shape && Array.isArray(shape.connectedLines)) {
                shape.connectedLines = shape.connectedLines.filter(l => l !== line);
            }
        });
        line.fromShape = null;
        line.toShape = null;
    }

    function updateConnectedLinesFor(target) {
        const canvas = getCanvas();
        if (!target || !canvas) return;

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

    function initToolsUI() {
        const btnStrokeSizeDec = document.getElementById('btn-stroke-size-dec');
        const btnStrokeSizeInc = document.getElementById('btn-stroke-size-inc');
        const sliderStrokeSize = document.getElementById('slider-stroke-size');

        const btnEraserSizeDec = document.getElementById('btn-eraser-size-dec');
        const btnEraserSizeInc = document.getElementById('btn-eraser-size-inc');
        const sliderEraserSize = document.getElementById('slider-eraser-size');
        const btnEraserModeBrush = document.getElementById('btn-eraser-mode-brush');
        const btnEraserModeArea = document.getElementById('btn-eraser-mode-area');

        // Presenter Dock Controls
        const fsBtnSizeDec = document.getElementById('fs-btn-size-dec');
        const fsBtnSizeInc = document.getElementById('fs-btn-size-inc');
        const fsSizeSlider = document.getElementById('fs-size-slider');
        const fsBtnEraserDec = document.getElementById('fs-btn-eraser-dec');
        const fsBtnEraserInc = document.getElementById('fs-btn-eraser-inc');
        const fsSubEraserBrush = document.getElementById('fs-sub-eraser-brush');
        const fsSubEraserArea = document.getElementById('fs-sub-eraser-area');

        if (btnStrokeSizeDec) btnStrokeSizeDec.addEventListener('click', () => setStrokeSize((window.strokeSize || 4) - 1));
        if (btnStrokeSizeInc) btnStrokeSizeInc.addEventListener('click', () => setStrokeSize((window.strokeSize || 4) + 1));
        if (sliderStrokeSize) {
            sliderStrokeSize.addEventListener('input', (e) => {
                setStrokeSize(parseInt(e.target.value, 10));
            });
        }

        if (btnEraserSizeDec) btnEraserSizeDec.addEventListener('click', () => setEraserSize((window.eraserSize || 30) - 6));
        if (btnEraserSizeInc) btnEraserSizeInc.addEventListener('click', () => setEraserSize((window.eraserSize || 30) + 6));
        if (sliderEraserSize) {
            sliderEraserSize.addEventListener('input', (e) => {
                setEraserSize(parseInt(e.target.value, 10));
            });
        }

        if (btnEraserModeBrush) btnEraserModeBrush.addEventListener('click', () => setEraserSubMode('brush'));
        if (btnEraserModeArea) btnEraserModeArea.addEventListener('click', () => setEraserSubMode('area'));

        if (fsBtnSizeDec) {
            fsBtnSizeDec.addEventListener('click', () => {
                if (window.currentMode === 'eraser') setEraserSize((window.eraserSize || 30) - 6);
                else setStrokeSize((window.strokeSize || 4) - 1);
            });
        }
        if (fsBtnSizeInc) {
            fsBtnSizeInc.addEventListener('click', () => {
                if (window.currentMode === 'eraser') setEraserSize((window.eraserSize || 30) + 6);
                else setStrokeSize((window.strokeSize || 4) + 1);
            });
        }
        if (fsSizeSlider) {
            fsSizeSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10);
                if (window.currentMode === 'eraser') setEraserSize(val);
                else setStrokeSize(val);
            });
        }
        if (fsBtnEraserDec) fsBtnEraserDec.addEventListener('click', () => setEraserSize((window.eraserSize || 30) - 6));
        if (fsBtnEraserInc) fsBtnEraserInc.addEventListener('click', () => setEraserSize((window.eraserSize || 30) + 6));
        if (fsSubEraserBrush) fsSubEraserBrush.addEventListener('click', () => setEraserSubMode('brush'));
        if (fsSubEraserArea) fsSubEraserArea.addEventListener('click', () => setEraserSubMode('area'));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initToolsUI);
    } else {
        initToolsUI();
    }

    const ToolsModule = {
        hexToRgba,
        updateBrushSettings,
        setStrokeSize,
        setEraserSize,
        setEraserSubMode,
        updateActiveDrawingColor,
        isPointInPolygon,
        applyErasePolygonToObject,
        finalizeAreaErase,
        getObjectAnchors,
        getClosestAnchor,
        getBestAnchorPair,
        findConnectableTarget,
        getDashArrayForPattern,
        createArrowHeadTriangle,
        applyArrowheadStyleToLine,
        updateFreeLineArrows,
        createFreeformLine,
        createAttachedConnector,
        updateConnector,
        detachConnector,
        updateConnectedLinesFor
    };

    window.WhiteboardApp.tools = ToolsModule;

    // Direct global exports for backwards compatibility
    window.hexToRgba = hexToRgba;
    window.updateBrushSettings = updateBrushSettings;
    window.setStrokeSize = setStrokeSize;
    window.setEraserSize = setEraserSize;
    window.setEraserSubMode = setEraserSubMode;
    window.updateActiveDrawingColor = updateActiveDrawingColor;
    window.isPointInPolygon = isPointInPolygon;
    window.applyErasePolygonToObject = applyErasePolygonToObject;
    window.finalizeAreaErase = finalizeAreaErase;
    window.getObjectAnchors = getObjectAnchors;
    window.getClosestAnchor = getClosestAnchor;
    window.getBestAnchorPair = getBestAnchorPair;
    window.findConnectableTarget = findConnectableTarget;
    window.getDashArrayForPattern = getDashArrayForPattern;
    window.createArrowHeadTriangle = createArrowHeadTriangle;
    window.applyArrowheadStyleToLine = applyArrowheadStyleToLine;
    window.updateFreeLineArrows = updateFreeLineArrows;
    window.createFreeformLine = createFreeformLine;
    window.createAttachedConnector = createAttachedConnector;
    window.updateConnector = updateConnector;
    window.detachConnector = detachConnector;
    window.updateConnectedLinesFor = updateConnectedLinesFor;
})();

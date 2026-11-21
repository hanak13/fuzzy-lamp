/**
 * Whiteboard App - Step Box Subsystem Module
 * Handles multi-step sequential diagrams, step snapshots,
 * step playback/slideshow, Step Manager modal, and floating controls.
 */

(function(window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    const StepsModule = {
        playInterval: null,
        isPlaying: false,

        getCanvas() {
            return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
        },

        attachStepBoxRendering(box) {
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
        },

        createStepBox(left, top, width, height, options = {}) {
            const canvas = StepsModule.getCanvas();
            if (!canvas) return null;

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

            const currentMode = window.__currentMode || (window.WhiteboardApp && window.WhiteboardApp.currentMode) || 'select';

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

            StepsModule.attachStepBoxRendering(box);
            canvas.add(box);
            canvas.sendToBack(box);

            return box;
        },

        findStepBoxContaining(obj) {
            if (!obj || obj.isStepBox || obj.isArrowHead) return null;
            const canvas = StepsModule.getCanvas();
            if (!canvas) return null;

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
        },

        findStepBoxAtPoint(x, y) {
            const canvas = StepsModule.getCanvas();
            if (!canvas) return null;
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
        },

        saveStepBoxCurrentStep(box, showNotification = false) {
            if (!box || !box.isStepBox || !box.stepBoxSteps) return;
            const curIdx = box.stepBoxCurrentStep || 0;
            if (curIdx < 0 || curIdx >= box.stepBoxSteps.length) return;

            const canvas = StepsModule.getCanvas();
            if (!canvas) return;

            // Auto-associate unowned objects in this box
            canvas.forEachObject(o => {
                if (!o.isStepBox && !o.isArrowHead && !o.isSlideFrame && !o.isGridLine && o.globalCompositeOperation !== 'destination-out') {
                    const parent = StepsModule.findStepBoxContaining(o);
                    if (parent && parent.stepBoxId === box.stepBoxId) {
                        o.stepBoxOwnerId = box.stepBoxId;
                    }
                }
            });

            const extraProps = window.EXTRA_PROPS || [
                'id', 'isStickyNote', 'stickyColor', 'isConnector', 'startObjectId', 'endObjectId',
                'startAnchor', 'endAnchor', 'hasArrow', 'arrowHead', 'startArrowHead', 'shapeId',
                'shapeName', 'isShapeGroup', 'isSticker', 'isSlideFrame', 'isStepBox', 'stepBoxId',
                'stepBoxName', 'stepBoxSteps', 'stepBoxCurrentStep', 'stepBoxOwnerId', 'isMergedShape'
            ];

            const owned = canvas.getObjects().filter(o => o.stepBoxOwnerId === box.stepBoxId && !o.isStepBox && !o.isArrowHead && o.globalCompositeOperation !== 'destination-out');
            const serialized = owned.map(o => {
                const json = o.toJSON(extraProps);
                json.relLeft = o.left - box.left;
                json.relTop = o.top - box.top;
                return json;
            });

            box.stepBoxSteps[curIdx].objects = serialized;
            if (showNotification && typeof window.showToast === 'function') {
                const curStepObj = box.stepBoxSteps[curIdx];
                const name = (curStepObj && curStepObj.name) ? curStepObj.name : `Step ${curIdx + 1}`;
                window.showToast(`Saved ${name} (${owned.length} item${owned.length === 1 ? '' : 's'})`);
            }
        },

        loadStepBoxStep(box, targetIdx) {
            if (!box || !box.isStepBox || !box.stepBoxSteps) return;
            if (targetIdx < 0 || targetIdx >= box.stepBoxSteps.length) return;

            const canvas = StepsModule.getCanvas();
            if (!canvas) return;

            StepsModule.saveStepBoxCurrentStep(box);

            const currentOwned = canvas.getObjects().filter(o => o.stepBoxOwnerId === box.stepBoxId && !o.isStepBox);
            currentOwned.forEach(o => {
                if (o.connectedLines) {
                    o.connectedLines.forEach(l => canvas.remove(l));
                }
                canvas.remove(o);
            });

            box.stepBoxCurrentStep = targetIdx;
            const stepRecord = box.stepBoxSteps[targetIdx];
            const objectsToLoad = (stepRecord && Array.isArray(stepRecord.objects)) ? stepRecord.objects : [];
            const currentMode = window.__currentMode || (window.WhiteboardApp && window.WhiteboardApp.currentMode) || 'select';

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
                    StepsModule.updateFloatingControls(box);
                    if (typeof window.saveState === 'function') window.saveState();
                });
            } else {
                box.dirty = true;
                canvas.requestRenderAll();
                StepsModule.updateFloatingControls(box);
                if (typeof window.saveState === 'function') window.saveState();
            }
        },

        updateFloatingControls(box) {
            const bar = document.getElementById('stepbox-floating-bar');
            if (!bar) return;

            const canvas = StepsModule.getCanvas();
            if (!canvas) return;

            const allBoxes = canvas.getObjects().filter(o => o.isStepBox);
            if (allBoxes.length === 0) {
                bar.style.display = 'none';
                window.__activeStepBox = null;
                return;
            }

            if (!box || !box.isStepBox || !canvas.contains(box)) {
                if (window.__activeStepBox && canvas.contains(window.__activeStepBox) && window.__activeStepBox.isStepBox) {
                    box = window.__activeStepBox;
                } else {
                    box = allBoxes[allBoxes.length - 1];
                }
            }

            window.__activeStepBox = box;
            const curIdx = box.stepBoxCurrentStep || 0;
            const totalSteps = box.stepBoxSteps ? box.stepBoxSteps.length : 1;

            const counterLabel = document.getElementById('stepbox-counter');
            const btnPrev = document.getElementById('btn-stepbox-prev');
            const btnNext = document.getElementById('btn-stepbox-next');
            const btnDel = document.getElementById('btn-stepbox-delete');
            const btnPlay = document.getElementById('btn-stepbox-play');

            if (counterLabel) counterLabel.textContent = `Step ${curIdx + 1} / ${totalSteps}`;
            if (btnPrev) btnPrev.disabled = (curIdx === 0);
            if (btnNext) btnNext.disabled = (curIdx >= totalSteps - 1);
            if (btnDel) btnDel.disabled = (totalSteps <= 1);
            if (btnPlay) btnPlay.disabled = (totalSteps <= 1);

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

            bar.style.display = 'flex';
            bar.style.left = `${Math.round(screenCenterX)}px`;
            bar.style.top = `${Math.round(screenBottomY + 12)}px`;
            bar.style.transform = 'translateX(-50%)';
        },

        initUI() {
            // Expose globally for instant cross-module access
            window.attachStepBoxRendering = StepsModule.attachStepBoxRendering;
            window.createStepBox = StepsModule.createStepBox;
            window.findStepBoxContaining = StepsModule.findStepBoxContaining;
            window.findStepBoxAtPoint = StepsModule.findStepBoxAtPoint;
            window.saveStepBoxCurrentStep = StepsModule.saveStepBoxCurrentStep;
            window.loadStepBoxStep = StepsModule.loadStepBoxStep;
            window.updateStepBoxFloatingControls = StepsModule.updateFloatingControls;
        }
    };

    window.WhiteboardApp.steps = StepsModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', StepsModule.initUI);
    } else {
        StepsModule.initUI();
    }

})(window);

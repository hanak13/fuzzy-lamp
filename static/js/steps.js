/**
 * Whiteboard App - Step Box Subsystem Module
 * Handles multi-step sequential diagrams, step snapshots,
 * step playback/slideshow, Step Manager modal, and floating controls.
 */

(function(window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    // Extra props that must survive a step snapshot. This intentionally
    // excludes live object references (e.g. connectedLines) because they are
    // circular; connectors are re-linked through their id/anchor props.
    function getStepExtraProps() {
        const base = Array.isArray(window.EXTRA_PROPS) ? window.EXTRA_PROPS : [];
        const required = [
            'id', 'shapeUid', 'shapeId', 'shapeName', 'isShapeGroup', 'isMergedShape',
            'isConnector', 'hasArrow', 'fromShapeUid', 'toShapeUid',
            'startObjectId', 'endObjectId', 'startAnchor', 'endAnchor', 'arrowHead',
            'isArrowHead', 'isSticker', 'stickerUrl', 'isStickyNote', 'stickyColor',
            'isStepBox', 'stepBoxId', 'stepBoxName', 'stepBoxSteps', 'stepBoxCurrentStep',
            'stepBoxOwnerId', 'isSlideFrame', 'slideFrameRatio', 'imageName'
        ];
        return Array.from(new Set(base.concat(required)));
    }

    const StepsModule = {
        playInterval: null,
        isPlaying: false,

        getCanvas() {
            return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
        },

        attachStepBoxRendering(box) {
            if (!box) return;

            box.set({
                stroke: box.stroke || '#6366f1',
                strokeWidth: box.strokeWidth || 2,
                strokeDashArray: null,
                strokeUniform: true,
                objectCaching: false,
                hasBorders: true,
                borderColor: '#6366f1',
                borderDashArray: [4, 4],
                cornerColor: '#6366f1',
                cornerStrokeColor: '#ffffff',
                cornerSize: 8,
                cornerStyle: 'circle',
                transparentCorners: false,
                rx: 8,
                ry: 8
            });

            box._render = function(ctx) {
                fabric.Rect.prototype._render.call(this, ctx);

                // Draw top-left step box label & badge
                ctx.save();
                const curStep = (this.stepBoxCurrentStep !== undefined) ? this.stepBoxCurrentStep + 1 : 1;
                const totalSteps = (this.stepBoxSteps && this.stepBoxSteps.length) ? this.stepBoxSteps.length : 1;
                const curStepObj = (this.stepBoxSteps && this.stepBoxSteps[this.stepBoxCurrentStep]);
                const stepName = (curStepObj && curStepObj.name) ? curStepObj.name : `Step ${curStep}`;
                const name = this.stepBoxName || 'Step Box';
                const label = `${name} • ${stepName} (${curStep}/${totalSteps})`;

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
                fill: options.fill || 'rgba(99, 102, 241, 0.05)',
                stroke: options.stroke || '#6366f1',
                strokeWidth: options.strokeWidth || 2,
                strokeDashArray: null,
                strokeUniform: true,
                rx: 8,
                ry: 8,
                objectCaching: false,
                selectable: currentMode === 'select',
                evented: true,
                isStepBox: true,
                stepBoxId: boxId,
                stepBoxName: boxName,
                stepBoxSteps: initialSteps,
                stepBoxCurrentStep: initialStepIndex,
                hasBorders: true,
                borderColor: '#6366f1',
                borderDashArray: [4, 4],
                cornerColor: '#6366f1',
                cornerStrokeColor: '#ffffff',
                cornerSize: 8,
                cornerStyle: 'circle',
                transparentCorners: false
            });

            StepsModule.attachStepBoxRendering(box);
            canvas.add(box);

            // Keep in back of user objects, but above the slide frame if present
            if (window.__slideFrameRect && canvas.contains(window.__slideFrameRect)) {
                const frameIdx = canvas.getObjects().indexOf(window.__slideFrameRect);
                canvas.moveTo(box, frameIdx + 1);
            } else {
                canvas.sendToBack(box);
            }

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

            const extraProps = getStepExtraProps();

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
            if (!box || !box.isStepBox || !box.stepBoxSteps) return Promise.resolve();
            if (targetIdx < 0 || targetIdx >= box.stepBoxSteps.length) return Promise.resolve();

            const canvas = StepsModule.getCanvas();
            if (!canvas) return Promise.resolve();

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

            return new Promise((resolve) => {
                const finalizeStepLoad = () => {
                    box.dirty = true;
                    canvas.requestRenderAll();
                    StepsModule.updateFloatingControls(box);
                    if (typeof window.saveState === 'function') window.saveState();
                    if (window.WhiteboardApp && window.WhiteboardApp.collab && !window.WhiteboardApp.collab.isApplyingRemote()) {
                        window.WhiteboardApp.collab.broadcastStepChanged(box.stepBoxId, targetIdx);
                    }
                    requestAnimationFrame(() => resolve());
                };

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

                        // Re-link connectors to their shapes
                        if (typeof window.reconnectLoadedObjects === 'function') {
                            window.reconnectLoadedObjects();
                        } else if (window.WhiteboardApp && window.WhiteboardApp.boards && typeof window.WhiteboardApp.boards.reconnectLoadedObjects === 'function') {
                            window.WhiteboardApp.boards.reconnectLoadedObjects();
                        }

                        finalizeStepLoad();
                    });
                } else {
                    finalizeStepLoad();
                }
            });
        },

        hideFloatingControls() {
            const bar = document.getElementById('stepbox-floating-bar');
            if (bar) bar.style.display = 'none';
            window.__activeStepBox = null;
            if (window.WhiteboardApp) window.WhiteboardApp.activeStepBox = null;
        },

        deleteStepBox(box) {
            const canvas = StepsModule.getCanvas();
            if (!canvas) return;

            if (!box || !box.isStepBox) {
                box = window.__activeStepBox;
            }
            if (!box || !box.isStepBox || !canvas.contains(box)) {
                StepsModule.hideFloatingControls();
                return;
            }

            const boxName = box.stepBoxName || 'Step Box';

            // Remove all child objects owned by this step box
            const owned = canvas.getObjects().filter(o => o.stepBoxOwnerId === box.stepBoxId && o !== box);
            owned.forEach(c => canvas.remove(c));

            // Remove the step box itself
            canvas.remove(box);
            canvas.discardActiveObject();

            // Immediately hide floating controls
            StepsModule.hideFloatingControls();

            canvas.requestRenderAll();
            if (typeof window.saveState === 'function') window.saveState();
            if (typeof window.updateObjectsCountBadges === 'function') window.updateObjectsCountBadges();
            if (window.WhiteboardApp && window.WhiteboardApp.objects && typeof window.WhiteboardApp.objects.renderObjectsList === 'function') {
                window.WhiteboardApp.objects.renderObjectsList();
            }
            if (typeof window.showToast === 'function') window.showToast(`Deleted ${boxName}`);
        },

        updateFloatingControls(box) {
            const bar = document.getElementById('stepbox-floating-bar');
            if (!bar) return;

            const canvas = StepsModule.getCanvas();
            if (!canvas) {
                StepsModule.hideFloatingControls();
                return;
            }

            if (!box || !box.isStepBox || !canvas.contains(box)) {
                StepsModule.hideFloatingControls();
                return;
            }

            window.__activeStepBox = box;
            if (window.WhiteboardApp) window.WhiteboardApp.activeStepBox = box;
            const curIdx = box.stepBoxCurrentStep || 0;
            const totalSteps = box.stepBoxSteps ? box.stepBoxSteps.length : 1;

            const counterLabel = document.getElementById('stepbox-counter-label') || document.getElementById('stepbox-counter');
            const btnPrev = document.getElementById('btn-stepbox-prev');
            const btnNext = document.getElementById('btn-stepbox-next');
            const btnDelStep = document.getElementById('btn-stepbox-del');
            const btnPlay = document.getElementById('btn-stepbox-play');

            if (counterLabel) counterLabel.textContent = `Step ${curIdx + 1} / ${totalSteps}`;
            if (btnPrev) btnPrev.disabled = (curIdx === 0);
            if (btnNext) btnNext.disabled = (curIdx >= totalSteps - 1);
            if (btnDelStep) btnDelStep.disabled = (totalSteps <= 1);
            if (btnPlay) btnPlay.disabled = (totalSteps <= 1);

            box.setCoords();
            const aCoords = box.aCoords || {
                tl: new fabric.Point(box.left, box.top),
                tr: new fabric.Point(box.left + (box.width * (box.scaleX || 1)), box.top),
                br: new fabric.Point(box.left + (box.width * (box.scaleX || 1)), box.top + (box.height * (box.scaleY || 1))),
                bl: new fabric.Point(box.left, box.top + (box.height * (box.scaleY || 1)))
            };

            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const pts = [aCoords.tl, aCoords.tr, aCoords.br, aCoords.bl].map(pt => 
                fabric.util.transformPoint(pt, vpt)
            );

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            pts.forEach(pt => {
                if (pt.x < minX) minX = pt.x;
                if (pt.x > maxX) maxX = pt.x;
                if (pt.y < minY) minY = pt.y;
                if (pt.y > maxY) maxY = pt.y;
            });

            const canvasEl = canvas.upperCanvasEl || canvas.lowerCanvasEl;
            const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 };

            const screenCenterX = rect.left + (minX + maxX) / 2;
            const screenBottomY = rect.top + maxY;
            const screenTopY = rect.top + minY;

            bar.style.display = 'flex';

            const barW = bar.offsetWidth || 440;
            const barH = bar.offsetHeight || 38;

            // Horizontal position: center on box, clamped inside viewport
            let posX = screenCenterX;
            const minXClamp = (barW / 2) + 16;
            const maxXClamp = window.innerWidth - (barW / 2) - 16;
            posX = Math.max(minXClamp, Math.min(maxXClamp, posX));

            // Vertical placement: place below if there is room; if near bottom edge, flip above the box!
            let posY = screenBottomY + 12;
            if (posY + barH > window.innerHeight - 16) {
                posY = screenTopY - barH - 12;
                if (posY < 65) {
                    posY = window.innerHeight - barH - 24;
                }
            }

            bar.style.left = `${Math.round(posX)}px`;
            bar.style.top = `${Math.round(posY)}px`;
            bar.style.transform = 'translateX(-50%)';
        },

        addStepBoxStep(box) {
            if (!box || !box.isStepBox || !box.stepBoxSteps) return;
            StepsModule.saveStepBoxCurrentStep(box);

            // New steps start from a snapshot of the current step so the
            // previous content is "remembered" and can be built upon.
            const sourceIdx = box.stepBoxCurrentStep || 0;
            const sourceStep = box.stepBoxSteps[sourceIdx];
            const sourceObjects = (sourceStep && Array.isArray(sourceStep.objects)) ? sourceStep.objects : [];
            const copiedObjects = sourceObjects.map(obj => JSON.parse(JSON.stringify(obj)));

            const newStepNum = box.stepBoxSteps.length + 1;
            const newStep = {
                id: 'step_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                name: `Step ${newStepNum}`,
                objects: copiedObjects
            };

            box.stepBoxSteps.push(newStep);
            StepsModule.loadStepBoxStep(box, box.stepBoxSteps.length - 1);
            if (typeof window.showToast === 'function') {
                const count = copiedObjects.length;
                window.showToast(`Added ${newStep.name} (copied ${count} item${count === 1 ? '' : 's'})`);
            }
        },

        deleteStepBoxStep(box, targetIdx) {
            if (!box || !box.isStepBox || !box.stepBoxSteps || box.stepBoxSteps.length <= 1) {
                if (typeof window.showToast === 'function') window.showToast('Cannot delete the only step');
                return;
            }

            const delIdx = (targetIdx !== undefined) ? targetIdx : (box.stepBoxCurrentStep || 0);
            box.stepBoxSteps.splice(delIdx, 1);

            let newIdx = box.stepBoxCurrentStep || 0;
            if (newIdx >= box.stepBoxSteps.length) {
                newIdx = box.stepBoxSteps.length - 1;
            }

            StepsModule.loadStepBoxStep(box, newIdx);
            if (typeof window.showToast === 'function') window.showToast(`Step deleted (Now on Step ${newIdx + 1})`);
        },

        toggleStepBoxPlay(box) {
            if (!box || !box.isStepBox || !box.stepBoxSteps || box.stepBoxSteps.length <= 1) {
                if (typeof window.showToast === 'function') window.showToast('Add more steps to play slideshow');
                return;
            }

            const btnPlay = document.getElementById('btn-stepbox-play');
            const playLabel = document.getElementById('stepbox-play-label');

            if (StepsModule.isPlaying) {
                StepsModule.stopStepBoxPlay();
                if (typeof window.showToast === 'function') window.showToast('Playback paused');
                return;
            }

            StepsModule.saveStepBoxCurrentStep(box);
            StepsModule.isPlaying = true;
            if (btnPlay) btnPlay.classList.add('active');
            if (playLabel) playLabel.textContent = 'Pause';
            if (typeof window.showToast === 'function') window.showToast('Playing step presentation (1.8s auto-cycle)...');

            StepsModule.playInterval = setInterval(() => {
                const canvas = StepsModule.getCanvas();
                const active = window.__activeStepBox || box;
                if (!active || !canvas || !canvas.contains(active) || !StepsModule.isPlaying) {
                    StepsModule.stopStepBoxPlay();
                    return;
                }
                const nextIdx = ((active.stepBoxCurrentStep || 0) + 1) % active.stepBoxSteps.length;
                StepsModule.loadStepBoxStep(active, nextIdx);
            }, 1800);
        },

        stopStepBoxPlay() {
            if (StepsModule.playInterval) {
                clearInterval(StepsModule.playInterval);
                StepsModule.playInterval = null;
            }
            StepsModule.isPlaying = false;
            const btnPlay = document.getElementById('btn-stepbox-play');
            const playLabel = document.getElementById('stepbox-play-label');
            if (btnPlay) btnPlay.classList.remove('active');
            if (playLabel) playLabel.textContent = 'Play';
        },

        openStepBoxManager(box) {
            const modal = document.getElementById('stepbox-manager-modal');
            if (!modal) return;
            const canvas = StepsModule.getCanvas();
            if (!box || !box.isStepBox) {
                const boxes = canvas ? canvas.getObjects().filter(o => o.isStepBox) : [];
                if (boxes.length > 0) box = boxes[boxes.length - 1];
                else return;
            }
            window.__activeStepBox = box;
            StepsModule.saveStepBoxCurrentStep(box);
            const titleEl = document.getElementById('stepbox-modal-title');
            if (titleEl) titleEl.textContent = `${box.stepBoxName || 'Step Box'} - Step Manager`;
            StepsModule.renderStepBoxManagerList(box);
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
        },

        closeStepBoxManager() {
            const modal = document.getElementById('stepbox-manager-modal');
            if (!modal) return;
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            if (window.__activeStepBox) {
                StepsModule.updateFloatingControls(window.__activeStepBox);
            }
        },

        renderStepBoxManagerList(box) {
            const listEl = document.getElementById('stepbox-steps-list');
            if (!listEl || !box || !box.isStepBox) return;
            listEl.innerHTML = '';

            const steps = box.stepBoxSteps || [];
            const curIdx = box.stepBoxCurrentStep || 0;

            const countBadge = document.getElementById('stepbox-manager-count-badge');
            const activeBadge = document.getElementById('stepbox-manager-active-badge');
            if (countBadge) countBadge.textContent = `Total Steps: ${steps.length}`;
            if (activeBadge) {
                const curStepObj = steps[curIdx];
                const curName = (curStepObj && curStepObj.name) ? curStepObj.name : `Step ${curIdx + 1}`;
                activeBadge.textContent = `Active: ${curName}`;
            }

            steps.forEach((step, idx) => {
                const card = document.createElement('div');
                card.className = `stepbox-step-card ${idx === curIdx ? 'active' : ''}`;
                const itemCount = Array.isArray(step.objects) ? step.objects.length : 0;
                const stepName = step.name || `Step ${idx + 1}`;

                card.innerHTML = `
                    <div class="stepbox-step-card-left">
                        <span class="stepbox-step-num">#${idx + 1}</span>
                        <input type="text" class="stepbox-step-input" value="${stepName.replace(/"/g, '&quot;')}" placeholder="Step name..." title="Click to rename step" />
                        <span class="stepbox-step-meta">${itemCount} item${itemCount === 1 ? '' : 's'}</span>
                    </div>
                    <div class="stepbox-step-actions">
                        <button type="button" class="stepbox-action-icon-btn btn-step-jump" title="Switch to this step">
                            <span>${idx === curIdx ? '✓ Current' : 'Activate'}</span>
                        </button>
                        <button type="button" class="stepbox-action-icon-btn btn-step-delete" title="Delete Step" ${steps.length <= 1 ? 'disabled' : ''}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                        </button>
                    </div>
                `;

                const nameInput = card.querySelector('.stepbox-step-input');
                if (nameInput) {
                    nameInput.addEventListener('change', () => {
                        step.name = nameInput.value.trim() || `Step ${idx + 1}`;
                        box.dirty = true;
                        StepsModule.getCanvas().requestRenderAll();
                    });
                }

                const jumpBtn = card.querySelector('.btn-step-jump');
                if (jumpBtn) {
                    jumpBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (idx !== box.stepBoxCurrentStep) {
                            StepsModule.loadStepBoxStep(box, idx);
                            StepsModule.renderStepBoxManagerList(box);
                        }
                    });
                }

                const delBtn = card.querySelector('.btn-step-delete');
                if (delBtn) {
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        StepsModule.deleteStepBoxStep(box, idx);
                        StepsModule.renderStepBoxManagerList(box);
                    });
                }

                listEl.appendChild(card);
            });
        },

        renderStepBoxOverlays(ctx) {
            // Hook reserved for non-destructive canvas overlays.
            // Step Box border and badge are rendered cleanly by fabric.Rect (box._render)
            // at the base layer beneath child objects, preventing borders from cutting
            // across contained shapes and eliminating duplicate stroke antialiasing.
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
            window.hideStepBoxFloatingControls = StepsModule.hideFloatingControls;
            window.deleteStepBox = StepsModule.deleteStepBox;
            window.renderStepBoxOverlays = StepsModule.renderStepBoxOverlays;
            window.openStepBoxManager = StepsModule.openStepBoxManager;
            window.closeStepBoxManager = StepsModule.closeStepBoxManager;

            // Wire floating toolbar controls
            const btnPrev = document.getElementById('btn-stepbox-prev');
            const btnNext = document.getElementById('btn-stepbox-next');
            const btnAdd = document.getElementById('btn-stepbox-add');
            const btnDel = document.getElementById('btn-stepbox-del');
            const btnDeleteBox = document.getElementById('btn-stepbox-delete-box');
            const btnSave = document.getElementById('btn-stepbox-save');
            const btnPlay = document.getElementById('btn-stepbox-play');
            const btnManage = document.getElementById('btn-stepbox-manage');
            const btnPptx = document.getElementById('btn-stepbox-pptx');
            const btnCloseManager = document.getElementById('btn-close-stepbox-manager');
            const btnManagerDone = document.getElementById('btn-stepbox-manager-done');
            const btnManagerAdd = document.getElementById('btn-stepbox-manager-add');

            if (btnPrev) {
                btnPrev.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.__activeStepBox) {
                        StepsModule.loadStepBoxStep(window.__activeStepBox, (window.__activeStepBox.stepBoxCurrentStep || 0) - 1);
                    }
                });
            }
            if (btnNext) {
                btnNext.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.__activeStepBox) {
                        StepsModule.loadStepBoxStep(window.__activeStepBox, (window.__activeStepBox.stepBoxCurrentStep || 0) + 1);
                    }
                });
            }
            if (btnAdd) {
                btnAdd.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.__activeStepBox) StepsModule.addStepBoxStep(window.__activeStepBox);
                });
            }
            if (btnDel) {
                btnDel.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.__activeStepBox) StepsModule.deleteStepBoxStep(window.__activeStepBox);
                });
            }
            if (btnDeleteBox) {
                btnDeleteBox.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.__activeStepBox) {
                        StepsModule.deleteStepBox(window.__activeStepBox);
                    }
                });
            }
            if (btnSave) {
                btnSave.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.__activeStepBox) StepsModule.saveStepBoxCurrentStep(window.__activeStepBox, true);
                });
            }
            if (btnPlay) {
                btnPlay.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.__activeStepBox) StepsModule.toggleStepBoxPlay(window.__activeStepBox);
                });
            }
            if (btnManage) {
                btnManage.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.__activeStepBox) StepsModule.openStepBoxManager(window.__activeStepBox);
                });
            }
            if (btnPptx) {
                btnPptx.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (window.__activeStepBox && typeof window.exportStepBoxAsPPTX === 'function') {
                        window.exportStepBoxAsPPTX(window.__activeStepBox);
                    }
                });
            }
            if (btnCloseManager) btnCloseManager.addEventListener('click', StepsModule.closeStepBoxManager);
            if (btnManagerDone) btnManagerDone.addEventListener('click', StepsModule.closeStepBoxManager);
            if (btnManagerAdd) {
                btnManagerAdd.addEventListener('click', () => {
                    if (!window.__activeStepBox) return;
                    StepsModule.addStepBoxStep(window.__activeStepBox);
                    StepsModule.renderStepBoxManagerList(window.__activeStepBox);
                });
            }
        }
    };

    window.WhiteboardApp.steps = StepsModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', StepsModule.initUI);
    } else {
        StepsModule.initUI();
    }

})(window);

/**
 * Whiteboard App - Objects & Layers Management Module
 * Handles canvas object discovery, categorization, visibility, locking,
 * inspection, search/filtering, and single/bulk deletion.
 */

(function(window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    const ObjectsModule = {
        currentFilter: 'all',
        currentSearch: '',
        debounceTimer: null,

        getCanvas() {
            return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
        },

        getUserCanvasObjects() {
            const canvas = ObjectsModule.getCanvas();
            if (!canvas) return [];
            const all = (typeof canvas.getObjects === 'function') ? (canvas.getObjects() || []) : [];
            const previewStepBox = window.__stepBoxPreviewRect || (window.WhiteboardApp && window.WhiteboardApp.stepBoxPreviewRect);
            const previewLine = window.__connectorPreviewLine || (window.WhiteboardApp && window.WhiteboardApp.connectorPreviewLine);

            return all.filter(o => {
                if (!o) return false;
                if (o.isSlideFrame || o.isGridLine) return false;
                if (previewStepBox && o === previewStepBox) return false;
                if (previewLine && o === previewLine) return false;
                if (o.isArrowHead) return false;
                if (o.type === 'activeSelection') return false;
                return true;
            });
        },

        getObjectMetadata(obj) {
            if (!obj) {
                return {
                    type: 'shapes',
                    typeName: 'Object',
                    title: 'Object',
                    meta: '0×0px',
                    icon: '📐',
                    badgeClass: 'badge-generic'
                };
            }

            if (!obj.__uid) {
                obj.__uid = 'obj_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            }

            const width = Math.round((obj.width || 0) * (obj.scaleX || 1));
            const height = Math.round((obj.height || 0) * (obj.scaleY || 1));
            const left = Math.round(obj.left || 0);
            const top = Math.round(obj.top || 0);

            if (obj.isStepBox) {
                const stepNum = (obj.stepBoxCurrentStep || 0) + 1;
                const totalSteps = (obj.stepBoxSteps && Array.isArray(obj.stepBoxSteps)) ? obj.stepBoxSteps.length : 1;
                return {
                    type: 'stepbox',
                    typeName: 'Step Box',
                    title: obj.stepBoxName || 'Step Box',
                    meta: `Step ${stepNum}/${totalSteps} • ${width}×${height}px`,
                    icon: '📦',
                    badgeClass: 'badge-stepbox'
                };
            }

            if (obj.isStickyNote) {
                let noteText = '';
                if (obj._objects && Array.isArray(obj._objects)) {
                    const textChild = obj._objects.find(o => o && (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text'));
                    if (textChild && typeof textChild.text === 'string') noteText = textChild.text.trim();
                }
                return {
                    type: 'notes',
                    typeName: 'Sticky Note',
                    title: noteText.length > 0 ? (noteText.length > 28 ? noteText.substring(0, 28) + '…' : noteText) : 'Sticky Note',
                    meta: `Sticky Note (${obj.stickyColor || 'yellow'}) • ${left}, ${top}`,
                    icon: '📝',
                    badgeClass: 'badge-note'
                };
            }

            if (obj.isSticker) {
                return {
                    type: 'images',
                    typeName: 'Sticker',
                    title: obj.imageName || 'Sticker',
                    meta: `Sticker • ${width}×${height}px`,
                    icon: '🎨',
                    badgeClass: 'badge-sticker'
                };
            }

            if (obj.type === 'image') {
                return {
                    type: 'images',
                    typeName: 'Image',
                    title: obj.imageName || 'Uploaded Image',
                    meta: `Image • ${width}×${height}px`,
                    icon: '🖼️',
                    badgeClass: 'badge-image'
                };
            }

            if (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text') {
                const textVal = (typeof obj.text === 'string') ? obj.text.trim() : '';
                return {
                    type: 'text',
                    typeName: 'Text',
                    title: textVal.length > 0 ? (textVal.length > 28 ? textVal.substring(0, 28) + '…' : textVal) : 'Empty Text',
                    meta: `Font: ${obj.fontSize || 20}px • ${left}, ${top}`,
                    icon: '🔤',
                    badgeClass: 'badge-text'
                };
            }

            if (obj.isIcon) {
                const iconName = obj.iconName || 'Vector Icon';
                return {
                    type: 'shapes',
                    typeName: 'Vector Icon',
                    title: `Icon: ${iconName}`,
                    meta: `${obj.iconCategory || 'Icon'} • ${width}×${height}px`,
                    icon: '⭐',
                    badgeClass: 'badge-icon'
                };
            }

            if (obj.isConnector || obj.isFreeLine || obj.type === 'line') {
                const hasArrow = obj.hasArrow || !!obj.arrowHead;
                const strokeColor = (typeof obj.stroke === 'string') ? obj.stroke : '#000';
                return {
                    type: 'shapes',
                    typeName: hasArrow ? 'Arrow Connector' : 'Line Connector',
                    title: hasArrow ? 'Arrow Connector' : 'Line Connector',
                    meta: `Color: ${strokeColor} • Width: ${obj.strokeWidth || 2}px`,
                    icon: '↗️',
                    badgeClass: 'badge-connector'
                };
            }

            if (obj.type === 'path') {
                const strokeStr = (typeof obj.stroke === 'string') ? obj.stroke : '';
                const isHighlighter = (strokeStr.includes('rgba') || (typeof obj.opacity === 'number' && obj.opacity < 1));
                return {
                    type: 'drawings',
                    typeName: isHighlighter ? 'Highlighter' : 'Pen Stroke',
                    title: isHighlighter ? 'Highlighter Stroke' : 'Pen Stroke',
                    meta: `Color: ${strokeStr || '#1e293b'} • Width: ${obj.strokeWidth || 2}px`,
                    icon: isHighlighter ? '🖍️' : '✏️',
                    badgeClass: isHighlighter ? 'badge-highlighter' : 'badge-pen'
                };
            }

            if (obj.isShapeGroup || obj.isMergedShape || obj.shapeId) {
                let shapeName = obj.shapeName || obj.shapeId || 'Shape';
                if (obj._objects && Array.isArray(obj._objects)) {
                    const textChild = obj._objects.find(o => o && (o.type === 'text' || o.type === 'i-text' || o.type === 'textbox'));
                    if (textChild && typeof textChild.text === 'string' && textChild.text.trim()) {
                        shapeName += `: "${textChild.text.trim().substring(0, 18)}"`;
                    }
                }
                return {
                    type: 'shapes',
                    typeName: 'Shape',
                    title: shapeName,
                    meta: `Shape • ${width}×${height}px`,
                    icon: '🔷',
                    badgeClass: 'badge-shape'
                };
            }

            const typeCap = obj.type ? (obj.type.charAt(0).toUpperCase() + obj.type.slice(1)) : 'Object';
            return {
                type: 'shapes',
                typeName: typeCap,
                title: `${typeCap} (${width}×${height}px)`,
                meta: `Position: ${left}, ${top}`,
                icon: '📐',
                badgeClass: 'badge-generic'
            };
        },

        updateCountBadges() {
            try {
                const objects = ObjectsModule.getUserCanvasObjects();
                const total = objects.length;

                const topbarCount = document.getElementById('topbar-objects-count');
                const drawerCount = document.getElementById('drawer-objects-count');
                const filterCountAll = document.getElementById('filter-count-all');
                const sidebarBadge = document.getElementById('sidebar-objects-badge');
                const fsBadge = document.getElementById('fs-objects-badge');
                const selectedCount = document.getElementById('objects-selected-count');
                const btnDeleteSelected = document.getElementById('btn-objects-delete-selected');

                if (topbarCount) topbarCount.textContent = total;
                if (drawerCount) drawerCount.textContent = total;
                if (filterCountAll) filterCountAll.textContent = total;

                if (sidebarBadge) {
                    sidebarBadge.textContent = total;
                    sidebarBadge.style.display = total > 0 ? 'flex' : 'none';
                }

                if (fsBadge) {
                    fsBadge.textContent = total;
                    fsBadge.style.display = total > 0 ? 'inline-block' : 'none';
                }

                const canvas = ObjectsModule.getCanvas();
                const activeObjs = (canvas && typeof canvas.getActiveObjects === 'function') ? canvas.getActiveObjects() : [];
                const previewStepBox = window.__stepBoxPreviewRect || (window.WhiteboardApp && window.WhiteboardApp.stepBoxPreviewRect);
                const previewLine = window.__connectorPreviewLine || (window.WhiteboardApp && window.WhiteboardApp.connectorPreviewLine);
                const selCount = activeObjs.filter(o => o && !o.isSlideFrame && !o.isGridLine && o !== previewStepBox && o !== previewLine).length;

                if (selectedCount) selectedCount.textContent = selCount;
                if (btnDeleteSelected) btnDeleteSelected.disabled = (selCount === 0);
            } catch (err) {
                console.error('Error updating objects count badges:', err);
            }
        },

        selectAndPanToObject(obj) {
            const canvas = ObjectsModule.getCanvas();
            if (!obj || !canvas) return;
            canvas.setActiveObject(obj);

            const center = obj.getCenterPoint();
            const zoom = canvas.getZoom();
            const vpt = canvas.viewportTransform;
            if (vpt) {
                vpt[4] = (canvas.getWidth() / 2) - (center.x * zoom);
                vpt[5] = (canvas.getHeight() / 2) - (center.y * zoom);
                canvas.setViewportTransform(vpt);
            }
            if (typeof window.updateGrid === 'function') window.updateGrid();
            canvas.requestRenderAll();
            ObjectsModule.renderObjectsList(ObjectsModule.currentFilter, ObjectsModule.currentSearch);
        },

        toggleObjectVisibility(obj) {
            const canvas = ObjectsModule.getCanvas();
            if (!obj || !canvas) return;
            obj.visible = !obj.visible;
            if (!obj.visible && canvas.getActiveObject() === obj) {
                canvas.discardActiveObject();
            }
            canvas.requestRenderAll();
            if (typeof window.saveState === 'function') window.saveState();
            ObjectsModule.renderObjectsList(ObjectsModule.currentFilter, ObjectsModule.currentSearch);
            if (typeof window.showToast === 'function') {
                window.showToast(obj.visible ? 'Object visible' : 'Object hidden');
            }
        },

        toggleObjectLock(obj) {
            const canvas = ObjectsModule.getCanvas();
            if (!obj || !canvas) return;
            const isCurrentlyLocked = !!obj.lockMovementX;
            const newLock = !isCurrentlyLocked;

            obj.lockMovementX = newLock;
            obj.lockMovementY = newLock;
            obj.lockRotation = newLock;
            obj.lockScalingX = newLock;
            obj.lockScalingY = newLock;
            obj.hasControls = !newLock;

            canvas.requestRenderAll();
            if (typeof window.saveState === 'function') window.saveState();
            ObjectsModule.renderObjectsList(ObjectsModule.currentFilter, ObjectsModule.currentSearch);
            if (typeof window.showToast === 'function') {
                window.showToast(newLock ? 'Object locked' : 'Object unlocked');
            }
        },

        deleteSingleObject(obj) {
            if (!obj) return;
            const canvas = ObjectsModule.getCanvas();
            if (!canvas) return;

            // 1. If this object is currently selected or in an activeSelection, discard active object immediately
            const activeObj = canvas.getActiveObject();
            if (activeObj) {
                if (activeObj === obj) {
                    canvas.discardActiveObject();
                } else if (activeObj.type === 'activeSelection') {
                    if (typeof activeObj.contains === 'function' && activeObj.contains(obj)) {
                        activeObj.removeWithUpdate(obj);
                        if (activeObj.size() === 0) {
                            canvas.discardActiveObject();
                        }
                    } else if (canvas.getActiveObjects && canvas.getActiveObjects().includes(obj)) {
                        canvas.discardActiveObject();
                    }
                }
            }

            // 2. Perform robust removal
            if (obj.isStepBox) {
                const owned = canvas.getObjects().filter(o => o.stepBoxOwnerId === obj.stepBoxId && o !== obj);
                owned.forEach(c => canvas.remove(c));
                if (typeof window.hideStepBoxFloatingControls === 'function') {
                    window.hideStepBoxFloatingControls();
                }
            }
            if (obj.connectedLines && Array.isArray(obj.connectedLines)) {
                obj.connectedLines.forEach(line => {
                    if (typeof window.detachConnector === 'function') window.detachConnector(line);
                    if (line.arrowHead) canvas.remove(line.arrowHead);
                    if (line.startArrowHead) canvas.remove(line.startArrowHead);
                    canvas.remove(line);
                });
            }
            if (obj.isConnector && typeof window.detachConnector === 'function') window.detachConnector(obj);
            if (obj.arrowHead) canvas.remove(obj.arrowHead);
            if (obj.startArrowHead) canvas.remove(obj.startArrowHead);
            canvas.remove(obj);

            canvas.requestRenderAll();
            if (typeof window.saveState === 'function') window.saveState();
            ObjectsModule.updateCountBadges();
            ObjectsModule.renderObjectsList(ObjectsModule.currentFilter, ObjectsModule.currentSearch);
        },

        deleteSelectedObjects() {
            const canvas = ObjectsModule.getCanvas();
            if (!canvas) return;
            const activeObjs = canvas.getActiveObjects() ? canvas.getActiveObjects().slice() : [];
            if (!activeObjs || activeObjs.length === 0) {
                if (window.__activeStepBox && canvas.contains(window.__activeStepBox)) {
                    if (typeof window.deleteStepBox === 'function') {
                        window.deleteStepBox(window.__activeStepBox);
                        return;
                    }
                }
                if (typeof window.showToast === 'function') window.showToast('No objects selected to delete');
                return;
            }

            canvas.discardActiveObject();
            activeObjs.forEach(o => {
                ObjectsModule.deleteSingleObject(o);
            });

            canvas.requestRenderAll();
            if (typeof window.saveState === 'function') window.saveState();
            ObjectsModule.updateCountBadges();
            ObjectsModule.renderObjectsList(ObjectsModule.currentFilter, ObjectsModule.currentSearch);
            if (typeof window.showToast === 'function') {
                window.showToast(`Deleted ${activeObjs.length} selected object${activeObjs.length > 1 ? 's' : ''}`);
            }
        },

        clearAllObjects() {
            const userObjects = ObjectsModule.getUserCanvasObjects();
            if (userObjects.length === 0) {
                if (typeof window.showToast === 'function') window.showToast('No objects to delete');
                return;
            }
            if (!confirm(`Are you sure you want to delete all ${userObjects.length} objects from this board?`)) {
                return;
            }
            const canvas = ObjectsModule.getCanvas();
            if (!canvas) return;

            canvas.discardActiveObject();
            userObjects.forEach(obj => {
                ObjectsModule.deleteSingleObject(obj);
            });

            canvas.requestRenderAll();
            if (typeof window.saveState === 'function') window.saveState();
            ObjectsModule.updateCountBadges();
            ObjectsModule.renderObjectsList(ObjectsModule.currentFilter, ObjectsModule.currentSearch);
            if (typeof window.showToast === 'function') window.showToast('All objects deleted');
        },

        renderObjectsList(filter = ObjectsModule.currentFilter, searchQuery = ObjectsModule.currentSearch) {
            const wrapper = document.getElementById('objects-list-wrapper');
            if (!wrapper) return;

            ObjectsModule.currentFilter = filter;
            ObjectsModule.currentSearch = searchQuery ? searchQuery.toLowerCase().trim() : '';
            ObjectsModule.updateCountBadges();

            try {
                const allObjects = ObjectsModule.getUserCanvasObjects();
                let filtered = [...allObjects].reverse();

                if (filter !== 'all') {
                    filtered = filtered.filter(obj => {
                        const meta = ObjectsModule.getObjectMetadata(obj);
                        return meta.type === filter;
                    });
                }

                if (searchQuery) {
                    const q = searchQuery.toLowerCase().trim();
                    filtered = filtered.filter(obj => {
                        const meta = ObjectsModule.getObjectMetadata(obj);
                        return meta.title.toLowerCase().includes(q) ||
                               meta.typeName.toLowerCase().includes(q) ||
                               meta.meta.toLowerCase().includes(q);
                    });
                }

                wrapper.innerHTML = '';

                if (filtered.length === 0) {
                    const emptyEl = document.createElement('div');
                    emptyEl.className = 'objects-empty-state';
                    emptyEl.innerHTML = `
                        <div class="objects-empty-icon">${allObjects.length === 0 ? '🎨' : '🔍'}</div>
                        <div class="objects-empty-title">${allObjects.length === 0 ? 'No objects on canvas' : 'No matching objects'}</div>
                        <div class="objects-empty-sub">
                            ${allObjects.length === 0 
                                ? 'Draw, add shapes, sticky notes, text, or stickers to see and manage them here.'
                                : 'Try searching with different keywords or switch the filter tab.'}
                        </div>
                    `;
                    wrapper.appendChild(emptyEl);
                    return;
                }

                const canvas = ObjectsModule.getCanvas();
                const activeObjs = (canvas && typeof canvas.getActiveObjects === 'function') ? canvas.getActiveObjects() : [];

                filtered.forEach(obj => {
                    const meta = ObjectsModule.getObjectMetadata(obj);
                    const isSelected = activeObjs.includes(obj);
                    const isVisible = (obj.visible !== false);
                    const isLocked = !!obj.lockMovementX;

                    const card = document.createElement('div');
                    card.className = `object-item-card ${isSelected ? 'active' : ''} ${!isVisible ? 'is-hidden-obj' : ''}`;
                    card.dataset.uid = obj.__uid;

                    card.innerHTML = `
                        <input type="checkbox" class="obj-item-checkbox" ${isSelected ? 'checked' : ''} title="Select this object for bulk delete or actions">
                        <div class="object-item-icon ${meta.badgeClass}">
                            ${meta.icon}
                        </div>
                        <div class="object-item-details">
                            <div class="object-item-title" title="${meta.title}">${meta.title}</div>
                            <div class="object-item-meta">${meta.meta}</div>
                        </div>
                        <div class="object-item-actions">
                            <button type="button" class="obj-row-btn btn-obj-visibility ${!isVisible ? 'is-hidden-eye' : ''}" title="${isVisible ? 'Hide object' : 'Show object'}">
                                ${isVisible ? `
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                ` : `
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                        <line x1="1" y1="1" x2="23" y2="23"/>
                                    </svg>
                                `}
                            </button>
                            <button type="button" class="obj-row-btn btn-obj-lock ${isLocked ? 'is-active-lock' : ''}" title="${isLocked ? 'Unlock object' : 'Lock object'}">
                                ${isLocked ? `
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                ` : `
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                        <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                                    </svg>
                                `}
                            </button>
                            <button type="button" class="obj-row-btn danger btn-obj-delete" title="Delete this object">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    `;

                    // Checkbox for item selection
                    const chk = card.querySelector('.obj-item-checkbox');
                    if (chk) {
                        chk.addEventListener('click', (e) => e.stopPropagation());
                        chk.addEventListener('change', (e) => {
                            e.stopPropagation();
                            const canvas = ObjectsModule.getCanvas();
                            if (!canvas) return;
                            let currentActive = canvas.getActiveObjects() ? canvas.getActiveObjects().slice() : [];
                            if (chk.checked) {
                                if (!currentActive.includes(obj)) currentActive.push(obj);
                            } else {
                                currentActive = currentActive.filter(o => o !== obj);
                            }
                            if (currentActive.length === 0) {
                                canvas.discardActiveObject();
                            } else if (currentActive.length === 1) {
                                canvas.setActiveObject(currentActive[0]);
                            } else {
                                const sel = new fabric.ActiveSelection(currentActive, { canvas: canvas });
                                canvas.setActiveObject(sel);
                            }
                            canvas.requestRenderAll();
                            ObjectsModule.updateCountBadges();
                            ObjectsModule.renderObjectsList(ObjectsModule.currentFilter, ObjectsModule.currentSearch);
                        });
                    }

                    // Click card body to select & pan to object (or Ctrl/Shift multi-select)
                    card.addEventListener('click', (e) => {
                        if (e.target.closest('.obj-row-btn') || e.target.closest('.obj-item-checkbox')) return;
                        const canvas = ObjectsModule.getCanvas();
                        if (!canvas) return;

                        if (e.shiftKey || e.ctrlKey || e.metaKey) {
                            let currentActive = canvas.getActiveObjects() ? canvas.getActiveObjects().slice() : [];
                            if (currentActive.includes(obj)) {
                                currentActive = currentActive.filter(o => o !== obj);
                            } else {
                                currentActive.push(obj);
                            }
                            if (currentActive.length === 0) {
                                canvas.discardActiveObject();
                            } else if (currentActive.length === 1) {
                                canvas.setActiveObject(currentActive[0]);
                            } else {
                                const sel = new fabric.ActiveSelection(currentActive, { canvas: canvas });
                                canvas.setActiveObject(sel);
                            }
                            canvas.requestRenderAll();
                            ObjectsModule.updateCountBadges();
                            ObjectsModule.renderObjectsList(ObjectsModule.currentFilter, ObjectsModule.currentSearch);
                        } else {
                            ObjectsModule.selectAndPanToObject(obj);
                        }
                    });

                    // Visibility toggle
                    card.querySelector('.btn-obj-visibility').addEventListener('click', (e) => {
                        e.stopPropagation();
                        ObjectsModule.toggleObjectVisibility(obj);
                    });

                    // Lock toggle
                    card.querySelector('.btn-obj-lock').addEventListener('click', (e) => {
                        e.stopPropagation();
                        ObjectsModule.toggleObjectLock(obj);
                    });

                    // Delete single object button
                    card.querySelector('.btn-obj-delete').addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const meta = ObjectsModule.getObjectMetadata(obj);
                        ObjectsModule.deleteSingleObject(obj);
                        if (typeof window.showToast === 'function') window.showToast(`Deleted ${meta.typeName}`);
                    });

                    wrapper.appendChild(card);
                });
            } catch (renderErr) {
                console.error('Error rendering objects list:', renderErr);
                if (wrapper) {
                    wrapper.innerHTML = `
                        <div class="objects-empty-state">
                            <div class="objects-empty-icon">⚠️</div>
                            <div class="objects-empty-title">Error rendering objects</div>
                            <div class="objects-empty-sub">${renderErr.message || 'Unknown error'}</div>
                        </div>
                    `;
                }
            }
        },

        debouncedUpdateList() {
            ObjectsModule.updateCountBadges();
            clearTimeout(ObjectsModule.debounceTimer);
            ObjectsModule.debounceTimer = setTimeout(() => {
                ObjectsModule.updateCountBadges();
                const shapesPanel = document.getElementById('shapes-panel');
                if (shapesPanel && !shapesPanel.classList.contains('hidden')) {
                    ObjectsModule.renderObjectsList();
                }
            }, 50);
        },

        attachCanvasListeners() {
            const canvas = ObjectsModule.getCanvas();
            if (!canvas || ObjectsModule._listenersAttached) return;
            ObjectsModule._listenersAttached = true;

            canvas.on('object:added', () => ObjectsModule.debouncedUpdateList());
            canvas.on('object:removed', () => ObjectsModule.debouncedUpdateList());
            canvas.on('object:modified', () => ObjectsModule.debouncedUpdateList());
            canvas.on('selection:created', () => ObjectsModule.debouncedUpdateList());
            canvas.on('selection:updated', () => ObjectsModule.debouncedUpdateList());
            canvas.on('selection:cleared', () => ObjectsModule.debouncedUpdateList());
        },

        toggleDrawer() {
            const shapesPanel = document.getElementById('shapes-panel');
            if (!shapesPanel) return;

            const isCurrentlyOpen = !shapesPanel.classList.contains('hidden') && window.activeDrawerPanel === 'layers';

            if (isCurrentlyOpen) {
                if (typeof window.closeDrawer === 'function') window.closeDrawer();
                return;
            }

            const isSlideMode = document.body.classList.contains('slide-page-fullscreen') || document.body.classList.contains('slide-mode-active');
            if (isSlideMode) {
                shapesPanel.classList.add('open-in-slide');
            } else {
                shapesPanel.classList.remove('open-in-slide');
            }

            const leftSidebar = document.getElementById('left-sidebar');
            const isSidebarMinimized = leftSidebar && leftSidebar.classList.contains('minimized-sidebar');
            if (isSidebarMinimized || isSlideMode) {
                shapesPanel.classList.add('open-floating');
            } else {
                shapesPanel.classList.remove('open-floating');
            }

            if (typeof window.openDrawerPanel === 'function') {
                window.openDrawerPanel('layers');
            }

            const fsBtnObjects = document.getElementById('fs-btn-objects');
            const btnTopbarObjects = document.getElementById('btn-topbar-objects');
            if (fsBtnObjects) fsBtnObjects.classList.add('active');
            if (btnTopbarObjects) btnTopbarObjects.classList.add('active');
        },

        initUI() {
            const btnTopbarObjects = document.getElementById('btn-topbar-objects');
            const fsBtnObjects = document.getElementById('fs-btn-objects');
            const btnRefreshObjects = document.getElementById('btn-refresh-objects');
            const objectsSearchInput = document.getElementById('objects-search');
            const btnClearObjectsSearch = document.getElementById('btn-clear-objects-search');
            const objFilterChips = document.querySelectorAll('.obj-filter-chip');
            const btnObjectsDeleteSelected = document.getElementById('btn-objects-delete-selected');
            const btnObjectsClearAll = document.getElementById('btn-objects-clear-all');

            if (btnTopbarObjects) {
                btnTopbarObjects.addEventListener('click', (e) => {
                    e.stopPropagation();
                    ObjectsModule.toggleDrawer();
                });
            }

            if (fsBtnObjects) {
                fsBtnObjects.addEventListener('click', (e) => {
                    e.stopPropagation();
                    ObjectsModule.toggleDrawer();
                });
            }

            if (btnRefreshObjects) {
                btnRefreshObjects.addEventListener('click', () => {
                    ObjectsModule.renderObjectsList();
                    if (typeof window.showToast === 'function') window.showToast('Objects refreshed');
                });
            }

            if (objectsSearchInput) {
                objectsSearchInput.addEventListener('input', (e) => {
                    const query = e.target.value;
                    if (btnClearObjectsSearch) {
                        btnClearObjectsSearch.style.display = query.length > 0 ? 'inline-flex' : 'none';
                    }
                    ObjectsModule.renderObjectsList(ObjectsModule.currentFilter, query);
                });
            }

            if (btnClearObjectsSearch) {
                btnClearObjectsSearch.addEventListener('click', () => {
                    if (objectsSearchInput) objectsSearchInput.value = '';
                    btnClearObjectsSearch.style.display = 'none';
                    ObjectsModule.renderObjectsList(ObjectsModule.currentFilter, '');
                });
            }

            objFilterChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    objFilterChips.forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    const filter = chip.dataset.filter || 'all';
                    ObjectsModule.renderObjectsList(filter, objectsSearchInput ? objectsSearchInput.value : '');
                });
            });

            if (btnObjectsDeleteSelected) {
                btnObjectsDeleteSelected.addEventListener('click', ObjectsModule.deleteSelectedObjects);
            }

            if (btnObjectsClearAll) {
                btnObjectsClearAll.addEventListener('click', ObjectsModule.clearAllObjects);
            }

            // Expose globally for instant cross-module access
            window.getUserCanvasObjects = ObjectsModule.getUserCanvasObjects;
            window.getObjectMetadata = ObjectsModule.getObjectMetadata;
            window.updateObjectsCountBadges = ObjectsModule.updateCountBadges;
            window.renderObjectsList = ObjectsModule.renderObjectsList;
            window.debouncedUpdateObjectsList = ObjectsModule.debouncedUpdateList;
            window.toggleObjectsDrawer = ObjectsModule.toggleDrawer;
            window.deleteSingleObject = ObjectsModule.deleteSingleObject;
            window.deleteSelectedObjects = ObjectsModule.deleteSelectedObjects;

            // Delayed updates and canvas listeners
            ObjectsModule.attachCanvasListeners();
            setTimeout(() => {
                ObjectsModule.attachCanvasListeners();
                ObjectsModule.updateCountBadges();
            }, 200);
            setTimeout(() => {
                ObjectsModule.attachCanvasListeners();
                ObjectsModule.updateCountBadges();
            }, 800);
            setTimeout(() => {
                ObjectsModule.attachCanvasListeners();
                ObjectsModule.updateCountBadges();
            }, 1800);
        }
    };

    window.WhiteboardApp.objects = ObjectsModule;

    // Attach listeners on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ObjectsModule.initUI);
    } else {
        ObjectsModule.initUI();
    }

})(window);

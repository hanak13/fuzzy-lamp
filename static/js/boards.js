/**
 * Whiteboard App - Multi-Board System & Right Sidebar Controller
 * Manages SQLite multi-board state, background colors, autosave debouncing,
 * board list rendering, board switching, import/export, and right sidebar drawer.
 */

(function(window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    let boards = [];
    let activeBoardId = null;
    let autoSaveTimer = null;
    let autoSaveIntervalId = null;
    let isBoardDirty = false;
    let isSavingBoard = false;
    let isBoardLoading = false;
    let lastSavedTime = null;

    const EXTRA_PROPS = [
        'id', 'shapeUid', 'connectedLines', 'isConnector', 'isArrowHead',
        'isStepBox', 'stepBoxId', 'stepBoxName', 'stepBoxSteps', 'stepBoxCurrentStep', 'stepBoxOwnerId',
        'isStickyNote', 'stickyColor', 'isSticker', 'imageName',
        'isIcon', 'iconName', 'iconCategory', 'iconSvg'
    ];

    const BoardsModule = {
        getCanvas() {
            return (window.WhiteboardApp && window.WhiteboardApp.canvas) || window.__canvas;
        },

        getBoards() {
            return boards;
        },

        getActiveBoardId() {
            return activeBoardId;
        },

        updateAutosaveIndicator(state, customMessage) {
            const autosaveStatusEl = document.getElementById('autosave-status');
            if (!autosaveStatusEl) return;
            autosaveStatusEl.classList.remove('saving', 'dirty', 'error');

            const textEl = autosaveStatusEl.querySelector('.autosave-text');

            if (state === 'saving') {
                autosaveStatusEl.classList.add('saving');
                if (textEl) textEl.textContent = customMessage || 'Saving...';
                autosaveStatusEl.title = 'Saving board changes to SQLite database...';
            } else if (state === 'dirty') {
                autosaveStatusEl.classList.add('dirty');
                if (textEl) textEl.textContent = customMessage || 'Unsaved changes';
                autosaveStatusEl.title = 'Unsaved changes will auto-save in a few seconds';
            } else if (state === 'error') {
                autosaveStatusEl.classList.add('error');
                if (textEl) textEl.textContent = customMessage || 'Save error';
                autosaveStatusEl.title = 'Failed to save to database. Will retry automatically.';
            } else {
                if (textEl) textEl.textContent = customMessage || 'Saved';
                const timeStr = lastSavedTime ? lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'recently';
                autosaveStatusEl.title = `Auto-saved to SQLite database (${timeStr})`;
            }
        },

        markBoardDirty() {
            if (isBoardLoading) return;
            isBoardDirty = true;
            BoardsModule.updateAutosaveIndicator('dirty');
        },

        async saveActiveBoardToServer(force = false) {
            const canvas = BoardsModule.getCanvas();
            if (!canvas || !activeBoardId || isSavingBoard || isBoardLoading) return;
            if (!isBoardDirty && !force) return;

            // In LAN collaboration, only the designated saver client auto-saves to SQLite to avoid overwrites
            if (window.WhiteboardApp && window.WhiteboardApp.collab && !window.WhiteboardApp.collab.isSaver()) {
                isBoardDirty = false;
                BoardsModule.updateAutosaveIndicator('saved', 'Synced (LAN)');
                return;
            }

            isSavingBoard = true;
            BoardsModule.updateAutosaveIndicator('saving');

            try {
                if (typeof window.saveStepBoxCurrentStep === 'function') {
                    const stepBoxes = canvas.getObjects().filter(o => o.isStepBox);
                    stepBoxes.forEach(sb => window.saveStepBoxCurrentStep(sb));
                }

                const currentFrameRatio = window.WhiteboardApp.currentFrameRatio || window.currentFrameRatio || 'infinite';
                if (currentFrameRatio !== 'infinite' && typeof window.saveCurrentSlide === 'function') {
                    window.saveCurrentSlide();
                }

                let dataObj;
                let infiniteObjs = window.WhiteboardApp.infiniteBoardObjects || window.infiniteBoardObjects || [];
                if (currentFrameRatio === 'infinite') {
                    dataObj = canvas.toJSON(EXTRA_PROPS);
                    infiniteObjs = dataObj.objects.filter(o => !o.isSlideFrame);
                    window.infiniteBoardObjects = infiniteObjs;
                    if (window.WhiteboardApp) window.WhiteboardApp.infiniteBoardObjects = infiniteObjs;
                } else {
                    dataObj = {
                        version: '5.3.0',
                        objects: infiniteObjs
                    };
                }

                dataObj.infiniteBoardObjects = infiniteObjs;
                dataObj.boardSlides = window.WhiteboardApp.boardSlides || window.boardSlides || [];
                dataObj.currentSlideIndex = window.WhiteboardApp.currentSlideIndex || window.currentSlideIndex || 0;
                dataObj.currentFrameRatio = currentFrameRatio;

                const activeBoard = boards.find(b => b.id === activeBoardId);
                const bgColor = (activeBoard && (activeBoard.bg_color || activeBoard.bgColor)) ? (activeBoard.bg_color || activeBoard.bgColor) : '#f8fafc';

                const res = await fetch(`/api/boards/${activeBoardId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: JSON.stringify(dataObj),
                        bg_color: bgColor
                    })
                });

                if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);

                const updatedBoard = await res.json();
                isBoardDirty = false;
                lastSavedTime = new Date();
                BoardsModule.updateAutosaveIndicator('saved');

                if (activeBoard) {
                    activeBoard.updated_at = updatedBoard.updated_at || Date.now();
                    activeBoard.updatedAt = activeBoard.updated_at;
                }

                try {
                    localStorage.setItem('whiteboard_board_data_' + activeBoardId, JSON.stringify(dataObj));
                    localStorage.setItem('whiteboard_saved_board', JSON.stringify(dataObj));
                } catch (storageErr) {}
            } catch (err) {
                console.error('Auto-save error:', err);
                BoardsModule.updateAutosaveIndicator('error');
            } finally {
                isSavingBoard = false;
            }
        },

        saveCurrentBoardData() {
            BoardsModule.saveActiveBoardToServer(true);
        },

        saveActiveBoardDebounced() {
            if (isBoardLoading) return;
            BoardsModule.markBoardDirty();
            if (autoSaveTimer) clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                BoardsModule.saveActiveBoardToServer();
            }, 500);
        },

        startAutosaveLoop() {
            if (autoSaveIntervalId) clearInterval(autoSaveIntervalId);
            autoSaveIntervalId = setInterval(() => {
                if (isBoardDirty && !isSavingBoard && !isBoardLoading && activeBoardId) {
                    BoardsModule.saveActiveBoardToServer();
                }
            }, 3000);
        },

        sanitizeBoardPayload(payload) {
            if (!payload) return payload;
            const fix = (obj) => {
                if (!obj || typeof obj !== 'object') return;
                if (obj.textBaseline === 'alphabetical') obj.textBaseline = 'alphabetic';
                if (Array.isArray(obj.objects)) obj.objects.forEach(fix);
            };
            if (Array.isArray(payload.objects)) {
                payload.objects.forEach(fix);
            }
            return payload;
        },

        reconnectLoadedObjects() {
            const canvas = BoardsModule.getCanvas();
            if (!canvas) return;

            const shapesByUid = {};
            canvas.forEachObject(obj => {
                if (obj.shapeUid) {
                    shapesByUid[obj.shapeUid] = obj;
                    obj.connectedLines = [];
                }
            });

            canvas.forEachObject(obj => {
                if (obj.isArrowHead) {
                    obj.selectable = false;
                    obj.evented = false;
                }

                if (obj.isConnector && obj.fromShapeUid && obj.toShapeUid) {
                    const fromShape = shapesByUid[obj.fromShapeUid];
                    const toShape = shapesByUid[obj.toShapeUid];
                    if (fromShape && toShape) {
                        obj.fromShape = fromShape;
                        obj.toShape = toShape;
                        fromShape.connectedLines.push(obj);
                        toShape.connectedLines.push(obj);
                    }
                }

                if (obj.isStepBox) {
                    if (typeof window.attachStepBoxRendering === 'function') {
                        window.attachStepBoxRendering(obj);
                    }
                    obj.dirty = true;
                }

                if (obj.isSlideFrame) {
                    window.slideFrameRect = obj;
                    if (window.WhiteboardApp) window.WhiteboardApp.slideFrameRect = obj;
                    obj.selectable = false;
                    obj.evented = false;
                    if (typeof window.attachSlideFrameRendering === 'function') {
                        window.attachSlideFrameRendering(obj);
                    }
                    const ratio = obj.slideFrameRatio || '16:9';
                    window.currentFrameRatio = ratio;
                    if (window.WhiteboardApp) window.WhiteboardApp.currentFrameRatio = ratio;
                    document.body.classList.add('slide-mode-active');
                    obj.dirty = true;
                }

                if (obj.isIcon) {
                    obj.set('objectCaching', false);
                    obj.set('strokeUniform', true);
                }

                const currentMode = window.WhiteboardApp.currentMode || window.currentMode || 'select';
                if (obj.globalCompositeOperation === 'destination-out') {
                    obj.selectable = false;
                    obj.evented = false;
                } else if (currentMode === 'select' && !obj.isArrowHead) {
                    obj.selectable = true;
                } else if (currentMode === 'text') {
                    obj.selectable = (obj.type === 'i-text');
                } else {
                    obj.selectable = false;
                }
            });

            const hasSlide = canvas.getObjects().some(o => o.isSlideFrame);
            const slideFrameBanner = document.getElementById('slide-frame-banner');
            if (!hasSlide) {
                window.currentFrameRatio = 'infinite';
                if (window.WhiteboardApp) window.WhiteboardApp.currentFrameRatio = 'infinite';
                document.body.classList.remove('slide-mode-active');
                if (slideFrameBanner) {
                    slideFrameBanner.classList.add('hidden');
                    slideFrameBanner.style.display = 'none';
                }
                const frameModeLabel = document.getElementById('frame-mode-label');
                if (frameModeLabel) frameModeLabel.textContent = 'Canvas: Infinite';
            } else {
                document.body.classList.add('slide-mode-active');
                if (slideFrameBanner) {
                    slideFrameBanner.classList.remove('hidden');
                    slideFrameBanner.style.display = 'flex';
                }
                if (typeof window.updateSlideNavigationUI === 'function') {
                    window.updateSlideNavigationUI();
                }
            }

            const stepBoxes = canvas.getObjects().filter(o => o.isStepBox);
            if (stepBoxes.length > 0 && typeof window.updateStepBoxFloatingControls === 'function') {
                window.updateStepBoxFloatingControls(stepBoxes[stepBoxes.length - 1]);
            }

            // Reset undo/redo history to clean baseline state for loaded board
            if (typeof window.resetHistoryWithState === 'function') {
                window.resetHistoryWithState();
            }
        },

        hexToRgb(hex) {
            if (!hex || typeof hex !== 'string') return null;
            let cleanHex = hex.replace('#', '');
            if (cleanHex.length === 3) {
                cleanHex = cleanHex.split('').map(ch => ch + ch).join('');
            }
            if (cleanHex.length !== 6) return null;
            const num = parseInt(cleanHex, 16);
            return {
                r: (num >> 16) & 255,
                g: (num >> 8) & 255,
                b: num & 255
            };
        },

        getBoardBackgroundColor() {
            const activeBoard = boards.find(b => b.id === activeBoardId);
            if (activeBoard && (activeBoard.bgColor || activeBoard.bg_color)) {
                return activeBoard.bgColor || activeBoard.bg_color;
            }
            const canvasContainer = document.getElementById('canvas-container');
            if (canvasContainer) {
                const bg = canvasContainer.style.getPropertyValue('--board-bg-color') || canvasContainer.style.backgroundColor;
                if (bg) return bg;
            }
            const canvas = BoardsModule.getCanvas();
            if (canvas && canvas.backgroundColor && typeof canvas.backgroundColor === 'string') {
                return canvas.backgroundColor;
            }
            return '#f8fafc';
        },

        setBoardBackgroundColor(color, save = true) {
            if (!color) return;
            const activeBoard = boards.find(b => b.id === activeBoardId);
            if (activeBoard) {
                activeBoard.bgColor = color;
                activeBoard.bg_color = color;
                if (save) {
                    BoardsModule.markBoardDirty();
                    BoardsModule.saveActiveBoardDebounced();
                    if (window.WhiteboardApp && window.WhiteboardApp.collab && typeof window.WhiteboardApp.collab.broadcastBoardBg === 'function') {
                        window.WhiteboardApp.collab.broadcastBoardBg(color);
                    }
                }
            }

            const canvasContainer = document.getElementById('canvas-container');
            if (canvasContainer) {
                canvasContainer.style.setProperty('--board-bg-color', color);
                canvasContainer.style.backgroundColor = color;

                const rgb = BoardsModule.hexToRgb(color);
                if (rgb) {
                    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
                    if (brightness < 128) {
                        canvasContainer.style.setProperty('--grid-line-color', 'rgba(255, 255, 255, 0.12)');
                        // Auto-switch default currentColor to white if it was dark default
                        if (!window.currentColor || window.currentColor === '#1e293b' || window.currentColor === '#334155' || window.currentColor === '#000000') {
                            if (typeof window.updateActiveDrawingColor === 'function') {
                                window.updateActiveDrawingColor('#f8fafc');
                            }
                        }
                    } else {
                        canvasContainer.style.setProperty('--grid-line-color', '#e2e8f0');
                        // Auto-switch default currentColor to dark if it was light default
                        if (window.currentColor === '#f8fafc' || window.currentColor === '#ffffff') {
                            if (typeof window.updateActiveDrawingColor === 'function') {
                                window.updateActiveDrawingColor('#1e293b');
                            }
                        }
                    }
                }
            }

            const boardBgPicker = document.getElementById('board-bg-picker');
            const boardBgPreview = document.getElementById('board-bg-preview');
            const sidebarBoardBgPicker = document.getElementById('board-bg-picker-sidebar');
            if (boardBgPicker) boardBgPicker.value = color;
            if (boardBgPreview) boardBgPreview.style.backgroundColor = color;
            if (sidebarBoardBgPicker) sidebarBoardBgPicker.value = color;

            const boardBgSwatches = document.querySelectorAll('.board-bg-swatch');
            if (boardBgSwatches && boardBgSwatches.length > 0) {
                boardBgSwatches.forEach(swatch => {
                    if (swatch.dataset.color && swatch.dataset.color.toLowerCase() === color.toLowerCase()) {
                        swatch.classList.add('active');
                    } else {
                        swatch.classList.remove('active');
                    }
                });
            }
        },

        expandBoardsSidebar() {
            const rightBoardsSidebar = document.getElementById('right-boards-sidebar');
            if (!rightBoardsSidebar) return;
            rightBoardsSidebar.classList.remove('collapsed');
            rightBoardsSidebar.classList.add('expanded');
            const boardsSearchEl = document.getElementById('boards-search');
            if (boardsSearchEl) {
                setTimeout(() => boardsSearchEl.focus(), 60);
            }
        },

        collapseBoardsSidebar() {
            const rightBoardsSidebar = document.getElementById('right-boards-sidebar');
            if (!rightBoardsSidebar) return;
            rightBoardsSidebar.classList.remove('expanded');
            rightBoardsSidebar.classList.add('collapsed');
        },

        toggleBoardsSidebar() {
            const rightBoardsSidebar = document.getElementById('right-boards-sidebar');
            if (!rightBoardsSidebar) return;
            if (rightBoardsSidebar.classList.contains('expanded')) {
                BoardsModule.collapseBoardsSidebar();
            } else {
                BoardsModule.expandBoardsSidebar();
            }
        },

        async downloadBoard(boardId) {
            const canvas = BoardsModule.getCanvas();
            const board = boards.find(b => b.id === boardId);
            if (!board) return;

            let boardObj;
            if (boardId === activeBoardId && canvas) {
                boardObj = canvas.toJSON(EXTRA_PROPS);
                boardObj.bgColor = board.bg_color || board.bgColor || '#f8fafc';
            } else {
                try {
                    const res = await fetch(`/api/boards/${boardId}`);
                    if (res.ok) {
                        const full = await res.json();
                        boardObj = typeof full.data === 'string' ? JSON.parse(full.data) : full.data;
                        boardObj.bgColor = full.bg_color || '#f8fafc';
                    } else {
                        throw new Error(`HTTP ${res.status}`);
                    }
                } catch (e) {
                    const stored = localStorage.getItem('whiteboard_board_data_' + boardId);
                    boardObj = stored ? JSON.parse(stored) : { version: '5.3.0', objects: [] };
                    boardObj.bgColor = board.bg_color || board.bgColor || '#f8fafc';
                }
            }

            const boardDataJson = JSON.stringify(boardObj, null, 2);
            const safeName = board.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'board';
            const blob = new Blob([boardDataJson], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeName}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            if (typeof window.showToast === 'function') window.showToast(`Downloaded "${board.name}" (.json)`);
        },

        async switchBoard(targetBoardId) {
            if (targetBoardId === activeBoardId) return;
            const targetBoard = boards.find(b => b.id === targetBoardId);
            if (!targetBoard) return;

            const canvas = BoardsModule.getCanvas();
            if (!canvas) return;

            if (isBoardDirty) {
                await BoardsModule.saveActiveBoardToServer(true);
            }

            activeBoardId = targetBoardId;
            localStorage.setItem('whiteboard_active_board_id', activeBoardId);
            if (window.WhiteboardApp) window.WhiteboardApp.activeBoardId = activeBoardId;

            if (window.history && window.history.replaceState) {
                window.history.replaceState(null, '', `/board/${targetBoardId}`);
            }

            const targetBg = targetBoard.bg_color || targetBoard.bgColor || '#f8fafc';
            BoardsModule.setBoardBackgroundColor(targetBg, false);

            isBoardLoading = true;

            try {
                const res = await fetch(`/api/boards/${targetBoardId}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const fullBoard = await res.json();

                let parsedData = null;
                if (typeof fullBoard.data === 'string') {
                    try {
                        parsedData = JSON.parse(fullBoard.data);
                    } catch (e) {
                        parsedData = { version: '5.3.0', objects: [] };
                    }
                } else {
                    parsedData = fullBoard.data || { version: '5.3.0', objects: [] };
                }

                let infiniteObjs = [];
                if (parsedData.infiniteBoardObjects && Array.isArray(parsedData.infiniteBoardObjects)) {
                    infiniteObjs = parsedData.infiniteBoardObjects;
                } else if (Array.isArray(parsedData.objects)) {
                    infiniteObjs = parsedData.objects.filter(o => !o.isSlideFrame);
                }
                window.infiniteBoardObjects = infiniteObjs;
                if (window.WhiteboardApp) window.WhiteboardApp.infiniteBoardObjects = infiniteObjs;

                if (parsedData.boardSlides && Array.isArray(parsedData.boardSlides) && parsedData.boardSlides.length > 0) {
                    window.boardSlides = parsedData.boardSlides;
                    window.currentSlideIndex = parsedData.currentSlideIndex || 0;
                } else {
                    window.boardSlides = [{ id: 'slide_' + Date.now(), name: 'Slide 1', objects: [] }];
                    window.currentSlideIndex = 0;
                }
                if (window.WhiteboardApp) {
                    window.WhiteboardApp.boardSlides = window.boardSlides;
                    window.WhiteboardApp.currentSlideIndex = window.currentSlideIndex;
                }

                const loadPayload = (parsedData.currentFrameRatio && parsedData.currentFrameRatio !== 'infinite')
                    ? parsedData
                    : { version: '5.3.0', objects: infiniteObjs };

                canvas.loadFromJSON(BoardsModule.sanitizeBoardPayload(loadPayload), () => {
                    BoardsModule.reconnectLoadedObjects();
                    canvas.renderAll();
                    isBoardLoading = false;
                    isBoardDirty = false;
                    if (typeof window.saveState === 'function') window.saveState();
                    BoardsModule.updateAutosaveIndicator('saved');
                    if (typeof window.updateObjectsCountBadges === 'function') window.updateObjectsCountBadges();
                    if (typeof window.renderObjectsList === 'function') window.renderObjectsList();
                    if (typeof window.showToast === 'function') window.showToast(`Switched to "${targetBoard.name}"`);
                    if (window.WhiteboardApp && window.WhiteboardApp.collab && typeof window.WhiteboardApp.collab.switchBoard === 'function') {
                        window.WhiteboardApp.collab.switchBoard(targetBoardId);
                    }
                });
            } catch (err) {
                console.error('Error switching board from server:', err);
                canvas.clear();
                isBoardLoading = false;
                isBoardDirty = false;
                canvas.renderAll();
                if (typeof window.saveState === 'function') window.saveState();
                BoardsModule.updateAutosaveIndicator('saved');
            }

            const boardsSearchEl = document.getElementById('boards-search');
            BoardsModule.renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
        },

        async addNewBoard() {
            if (isBoardDirty) {
                await BoardsModule.saveActiveBoardToServer(true);
            }

            const canvas = BoardsModule.getCanvas();
            const newNum = boards.length + 1;
            const boardName = prompt('Enter a name for the new board:', `Board ${newNum}`);
            if (boardName === null) return;
            const finalName = boardName.trim() || `Board ${newNum}`;

            try {
                const res = await fetch('/api/boards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: finalName,
                        bg_color: '#f8fafc',
                        data: JSON.stringify({ version: '5.3.0', objects: [] })
                    })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const newBoard = await res.json();
                newBoard.bgColor = newBoard.bg_color || '#f8fafc';

                boards.push(newBoard);
                activeBoardId = newBoard.id;
                localStorage.setItem('whiteboard_active_board_id', activeBoardId);
                if (window.WhiteboardApp) window.WhiteboardApp.activeBoardId = activeBoardId;

                BoardsModule.setBoardBackgroundColor('#f8fafc', false);
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(null, '', `/board/${newBoard.id}`);
                }

                if (canvas) {
                    canvas.clear();
                    canvas.renderAll();
                }

                if (typeof window.saveState === 'function') window.saveState();
                isBoardDirty = false;
                BoardsModule.updateAutosaveIndicator('saved');

                BoardsModule.expandBoardsSidebar();
                BoardsModule.renderBoardsList();
                if (typeof window.showToast === 'function') window.showToast(`Created "${finalName}"`);
            } catch (err) {
                console.error('Error creating board:', err);
                if (typeof window.showToast === 'function') window.showToast('Failed to create board on server');
            }
        },

        async deleteBoard(boardId) {
            if (boards.length <= 1) {
                if (typeof window.showToast === 'function') window.showToast('Cannot delete the only board');
                return;
            }

            const board = boards.find(b => b.id === boardId);
            if (!board) return;

            if (!confirm(`Are you sure you want to delete "${board.name}"?`)) return;

            try {
                const res = await fetch(`/api/boards/${boardId}`, { method: 'DELETE' });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                boards = boards.filter(b => b.id !== boardId);
                localStorage.removeItem('whiteboard_board_data_' + boardId);
                if (typeof window.showToast === 'function') window.showToast(`Deleted "${board.name}"`);

                if (activeBoardId === boardId) {
                    await BoardsModule.switchBoard(boards[0].id);
                } else {
                    const boardsSearchEl = document.getElementById('boards-search');
                    BoardsModule.renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
                }
            } catch (err) {
                console.error('Failed to delete board:', err);
                if (typeof window.showToast === 'function') window.showToast('Failed to delete board on server');
            }
        },

        startRenameBoard(boardId, titleEl) {
            const board = boards.find(b => b.id === boardId);
            if (!board || !titleEl) return;
            if (titleEl.querySelector('.board-rename-input')) return;

            const originalName = board.name;
            titleEl.innerHTML = '';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'board-rename-input';
            input.value = originalName;
            titleEl.appendChild(input);
            input.focus();
            input.select();

            let finished = false;

            async function commitRename() {
                if (finished) return;
                finished = true;
                const val = input.value.trim();
                if (val && val !== originalName) {
                    board.name = val;
                    try {
                        await fetch(`/api/boards/${boardId}/rename`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: val })
                        });
                        if (typeof window.showToast === 'function') window.showToast(`Renamed to "${board.name}"`);
                        if (window.WhiteboardApp && window.WhiteboardApp.collab && typeof window.WhiteboardApp.collab.broadcastBoardRenamed === 'function') {
                            window.WhiteboardApp.collab.broadcastBoardRenamed(val);
                        }
                    } catch (err) {
                        console.error('Failed to rename board on server:', err);
                    }
                }
                const boardsSearchEl = document.getElementById('boards-search');
                BoardsModule.renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
            }

            function cancelRename() {
                if (finished) return;
                finished = true;
                const boardsSearchEl = document.getElementById('boards-search');
                BoardsModule.renderBoardsList(boardsSearchEl ? boardsSearchEl.value : '');
            }

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    commitRename();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    cancelRename();
                }
            });

            input.addEventListener('blur', () => commitRename());
            input.addEventListener('click', (e) => e.stopPropagation());
        },

        handleImportBoardFile(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async function(event) {
                const content = event.target.result;
                let parsedData;
                try {
                    parsedData = JSON.parse(content);
                } catch (jsonErr) {
                    if (typeof window.showToast === 'function') window.showToast('Import failed: File is not valid JSON!');
                    return;
                }

                const isImportable = parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData) && Array.isArray(parsedData.objects);
                if (!isImportable) {
                    if (typeof window.showToast === 'function') window.showToast('Import failed: JSON file is not an importable whiteboard board!');
                    return;
                }

                if (isBoardDirty) {
                    await BoardsModule.saveActiveBoardToServer(true);
                }

                let boardName = file.name.replace(/\.[^/.]+$/, '').trim() || 'Imported Board';
                const importedBg = (parsedData.bgColor && typeof parsedData.bgColor === 'string') ? parsedData.bgColor : '#f8fafc';

                try {
                    const res = await fetch('/api/boards', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: boardName,
                            bg_color: importedBg,
                            data: JSON.stringify(parsedData)
                        })
                    });

                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const newBoard = await res.json();
                    newBoard.bgColor = importedBg;
                    boards.push(newBoard);

                    await BoardsModule.switchBoard(newBoard.id);
                    BoardsModule.expandBoardsSidebar();
                    if (typeof window.showToast === 'function') window.showToast(`Board "${boardName}" imported successfully!`);
                } catch (err) {
                    console.error('Import board error:', err);
                    if (typeof window.showToast === 'function') window.showToast('Error saving imported board to database');
                }
            };

            reader.readAsText(file);
        },

        renderBoardsList(filterText = '') {
            const boardsListEl = document.getElementById('boards-list');
            if (!boardsListEl) return;
            boardsListEl.innerHTML = '';

            const boardsCountBadge = document.getElementById('boards-count-badge');
            const boardsStripBadge = document.getElementById('boards-strip-badge');
            if (boardsCountBadge) boardsCountBadge.textContent = String(boards.length);
            if (boardsStripBadge) boardsStripBadge.textContent = String(boards.length);

            const query = filterText.trim().toLowerCase();
            const filtered = query
                ? boards.filter(b => b.name.toLowerCase().includes(query))
                : boards;

            if (filtered.length === 0) {
                const emptyEl = document.createElement('div');
                emptyEl.className = 'boards-empty-state';
                emptyEl.textContent = query ? 'No matching boards found.' : 'No boards yet.';
                boardsListEl.appendChild(emptyEl);
                return;
            }

            filtered.forEach(board => {
                const item = document.createElement('div');
                item.className = 'board-item' + (board.id === activeBoardId ? ' active' : '');
                item.dataset.boardId = board.id;

                const leftEl = document.createElement('div');
                leftEl.className = 'board-item-left';
                leftEl.title = `Switch to "${board.name}" (Double-click to rename)`;

                const dotEl = document.createElement('span');
                dotEl.className = 'board-item-dot';

                const titleEl = document.createElement('span');
                titleEl.className = 'board-item-title';
                titleEl.textContent = board.name;

                leftEl.appendChild(dotEl);
                leftEl.appendChild(titleEl);

                const actionsEl = document.createElement('div');
                actionsEl.className = 'board-item-actions';

                // Rename
                const btnRename = document.createElement('button');
                btnRename.className = 'btn-board-action btn-board-rename';
                btnRename.title = `Rename "${board.name}"`;
                btnRename.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                `;
                btnRename.addEventListener('click', (e) => {
                    e.stopPropagation();
                    BoardsModule.startRenameBoard(board.id, titleEl);
                });

                // Delete
                const btnDelete = document.createElement('button');
                btnDelete.className = 'btn-board-action btn-board-delete';
                btnDelete.title = `Delete "${board.name}"`;
                btnDelete.innerHTML = `
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                `;
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    BoardsModule.deleteBoard(board.id);
                });

                // Download
                const btnDownload = document.createElement('button');
                btnDownload.className = 'btn-board-action btn-board-download';
                btnDownload.title = `Download "${board.name}" (.json)`;
                btnDownload.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                `;
                btnDownload.addEventListener('click', (e) => {
                    e.stopPropagation();
                    BoardsModule.downloadBoard(board.id);
                });

                actionsEl.appendChild(btnRename);
                actionsEl.appendChild(btnDelete);
                actionsEl.appendChild(btnDownload);

                item.appendChild(leftEl);
                item.appendChild(actionsEl);

                item.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-board-action') || e.target.closest('.board-rename-input')) return;
                    BoardsModule.switchBoard(board.id);
                });

                item.addEventListener('dblclick', () => {
                    BoardsModule.startRenameBoard(board.id, titleEl);
                });

                boardsListEl.appendChild(item);
            });
        },

        async init() {
            if (BoardsModule._isInitialized) return;
            BoardsModule._isInitialized = true;
            isBoardLoading = true;
            BoardsModule.updateAutosaveIndicator('saving', 'Loading...');

            const bodyInitialId = (document.body.dataset && document.body.dataset.initialBoardId) ? document.body.dataset.initialBoardId.trim() : '';
            const urlParams = new URLSearchParams(window.location.search);
            const queryBoardId = urlParams.get('board');
            let preferredId = bodyInitialId || queryBoardId || localStorage.getItem('whiteboard_active_board_id') || null;

            try {
                const res = await fetch('/api/boards');
                if (res.ok) {
                    const serverBoards = await res.json();
                    if (Array.isArray(serverBoards) && serverBoards.length > 0) {
                        boards = serverBoards.map(b => ({
                            ...b,
                            bgColor: b.bg_color || b.bgColor || '#f8fafc'
                        }));
                    }
                }
            } catch (fetchErr) {
                console.warn('Could not fetch boards from server, fallback:', fetchErr);
            }

            if (!boards || boards.length === 0) {
                boards = [{
                    id: 'board_main',
                    name: 'Main Board',
                    bgColor: '#f8fafc',
                    created_at: Date.now(),
                    updated_at: Date.now()
                }];
            }

            if (preferredId && boards.some(b => b.id === preferredId)) {
                activeBoardId = preferredId;
            } else {
                activeBoardId = boards[0].id;
            }
            localStorage.setItem('whiteboard_active_board_id', activeBoardId);
            if (window.WhiteboardApp) {
                window.WhiteboardApp.boards = boards;
                window.WhiteboardApp.activeBoardId = activeBoardId;
            }

            const activeBoard = boards.find(b => b.id === activeBoardId);
            const currentBg = (activeBoard && (activeBoard.bg_color || activeBoard.bgColor)) ? (activeBoard.bg_color || activeBoard.bgColor) : '#f8fafc';
            BoardsModule.setBoardBackgroundColor(currentBg, false);

            const canvas = BoardsModule.getCanvas();
            try {
                const res = await fetch(`/api/boards/${activeBoardId}`);
                if (res.ok) {
                    const boardRecord = await res.json();
                    let parsedData = null;
                    if (typeof boardRecord.data === 'string') {
                        try {
                            parsedData = JSON.parse(boardRecord.data);
                        } catch (e) {
                            parsedData = { version: '5.3.0', objects: [] };
                        }
                    } else {
                        parsedData = boardRecord.data || { version: '5.3.0', objects: [] };
                    }

                    if (boardRecord.bg_color) {
                        BoardsModule.setBoardBackgroundColor(boardRecord.bg_color, false);
                    }

                    let infiniteObjs = [];
                    if (parsedData.infiniteBoardObjects && Array.isArray(parsedData.infiniteBoardObjects)) {
                        infiniteObjs = parsedData.infiniteBoardObjects;
                    } else if (Array.isArray(parsedData.objects)) {
                        infiniteObjs = parsedData.objects.filter(o => !o.isSlideFrame);
                    }
                    window.infiniteBoardObjects = infiniteObjs;
                    if (window.WhiteboardApp) window.WhiteboardApp.infiniteBoardObjects = infiniteObjs;

                    if (parsedData.boardSlides && Array.isArray(parsedData.boardSlides) && parsedData.boardSlides.length > 0) {
                        window.boardSlides = parsedData.boardSlides;
                        window.currentSlideIndex = parsedData.currentSlideIndex || 0;
                    } else {
                        window.boardSlides = [{ id: 'slide_' + Date.now(), name: 'Slide 1', objects: [] }];
                        window.currentSlideIndex = 0;
                    }

                    const loadPayload = (parsedData.currentFrameRatio && parsedData.currentFrameRatio !== 'infinite')
                        ? parsedData
                        : { version: '5.3.0', objects: infiniteObjs };

                    if (canvas) {
                        canvas.loadFromJSON(BoardsModule.sanitizeBoardPayload(loadPayload), () => {
                            BoardsModule.reconnectLoadedObjects();
                            canvas.renderAll();
                            isBoardLoading = false;
                            isBoardDirty = false;
                            if (typeof window.saveState === 'function') window.saveState();
                            isBoardDirty = false;
                            BoardsModule.updateAutosaveIndicator('saved');
                            if (typeof window.updateObjectsCountBadges === 'function') window.updateObjectsCountBadges();
                            if (typeof window.renderObjectsList === 'function') window.renderObjectsList();
                        });
                    }
                }
            } catch (loadErr) {
                console.warn('Could not load board data:', loadErr);
                isBoardLoading = false;
                BoardsModule.updateAutosaveIndicator('saved');
            }

            BoardsModule.renderBoardsList();
            BoardsModule.startAutosaveLoop();

            // Setup listeners
            const boardsCollapsedStrip = document.getElementById('boards-collapsed-strip');
            const btnExpandBoards = document.getElementById('btn-expand-boards');
            const btnCollapseBoards = document.getElementById('btn-collapse-boards');
            const btnAddBoard = document.getElementById('btn-add-board');
            const btnImportBoard = document.getElementById('btn-import-board');
            const boardFileInput = document.getElementById('board-file-input');
            const boardsSearchEl = document.getElementById('boards-search');

            if (boardsCollapsedStrip) boardsCollapsedStrip.addEventListener('click', BoardsModule.expandBoardsSidebar);
            if (btnExpandBoards) {
                btnExpandBoards.addEventListener('click', (e) => {
                    e.stopPropagation();
                    BoardsModule.expandBoardsSidebar();
                });
            }
            if (btnCollapseBoards) {
                btnCollapseBoards.addEventListener('click', (e) => {
                    e.stopPropagation();
                    BoardsModule.collapseBoardsSidebar();
                });
            }
            if (btnAddBoard) btnAddBoard.addEventListener('click', BoardsModule.addNewBoard);
            if (btnImportBoard && boardFileInput) {
                btnImportBoard.addEventListener('click', () => {
                    boardFileInput.value = '';
                    boardFileInput.click();
                });
                boardFileInput.addEventListener('change', BoardsModule.handleImportBoardFile);
            }
            if (boardsSearchEl) {
                boardsSearchEl.addEventListener('input', () => {
                    BoardsModule.renderBoardsList(boardsSearchEl.value);
                });
            }

            const boardBgPicker = document.getElementById('board-bg-picker');
            const sidebarBoardBgPicker = document.getElementById('board-bg-picker-sidebar');
            const boardBgSwatches = document.querySelectorAll('.board-bg-swatch');

            if (boardBgPicker) {
                boardBgPicker.addEventListener('input', (e) => BoardsModule.setBoardBackgroundColor(e.target.value, true));
            }
            if (sidebarBoardBgPicker) {
                sidebarBoardBgPicker.addEventListener('input', (e) => BoardsModule.setBoardBackgroundColor(e.target.value, true));
            }
            if (boardBgSwatches) {
                boardBgSwatches.forEach(swatch => {
                    swatch.addEventListener('click', () => {
                        const color = swatch.dataset.color;
                        if (color) {
                            BoardsModule.setBoardBackgroundColor(color, true);
                            if (typeof window.showToast === 'function') window.showToast(`Background changed to ${color}`);
                        }
                    });
                });
            }

            window.addEventListener('beforeunload', () => {
                if (isBoardDirty && activeBoardId && !isBoardLoading && canvas) {
                    try {
                        const dataObj = canvas.toJSON(EXTRA_PROPS);
                        const activeBoard = boards.find(b => b.id === activeBoardId);
                        const bgColor = (activeBoard && (activeBoard.bg_color || activeBoard.bgColor)) ? (activeBoard.bg_color || activeBoard.bgColor) : '#f8fafc';
                        const payload = JSON.stringify({
                            data: JSON.stringify(dataObj),
                            bg_color: bgColor
                        });
                        const blob = new Blob([payload], { type: 'application/json' });
                        navigator.sendBeacon(`/api/boards/${activeBoardId}`, blob);
                    } catch (e) {}
                }
            });
        }
    };

    // Exports
    window.WhiteboardApp.boards = BoardsModule;
    window.getBoardBackgroundColor = BoardsModule.getBoardBackgroundColor;
    window.saveActiveBoardDebounced = BoardsModule.saveActiveBoardDebounced;
    window.markBoardDirty = BoardsModule.markBoardDirty;
    window.setBoardBackgroundColor = BoardsModule.setBoardBackgroundColor;
    window.switchBoard = BoardsModule.switchBoard;
    window.initBoards = BoardsModule.init;
    window.reconnectLoadedObjects = BoardsModule.reconnectLoadedObjects;
    window.saveBoard = () => {
        BoardsModule.saveActiveBoardToServer(true);
        if (typeof window.showToast === 'function') window.showToast('Board saved (Ctrl + S)');
    };
    window.saveBoardAs = () => {
        const activeId = BoardsModule.getActiveBoardId() || (window.WhiteboardApp && window.WhiteboardApp.activeBoardId) || 'board_main';
        BoardsModule.downloadBoard(activeId);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => BoardsModule.init());
    } else {
        BoardsModule.init();
    }
})(window);

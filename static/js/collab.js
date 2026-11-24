/**
 * Whiteboard App - LAN Real-Time Collaboration Module
 * Provides offline, zero-cloud peer collaboration over local Wi-Fi / LAN via WebSockets.
 * Handles Master vs Guest roles, custom Master names, live cursor tracking,
 * granular object sync, presence avatars, saver coordination, view-only links,
 * and Master-controlled guest edit permissions.
 */

(function(window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    let ws = null;
    let clientId = null;
    let currentUser = null;
    let activeBoardId = null;
    let isSaverClient = false;
    let isReadOnly = false;
    let isApplyingRemoteChange = false;
    let guestsCanEdit = false;
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    let roomPassword = null;
    let onlineUsers = [];
    const remoteCursors = {}; // userId -> { el, x, y, name, color, role }

    // Teacher / Master viewport tracking
    let masterViewport = null; // { x, y, width, height, screenWidth, screenHeight, zoom, master_name, master_id }
    let lastViewportSendTime = 0;
    let lastSentViewport = null;
    const VIEWPORT_THROTTLE_MS = 60;

    // Throttled local cursor dispatch (~20 updates per second / 50ms)
    let lastCursorSendTime = 0;
    const CURSOR_THROTTLE_MS = 50;

    // Retrieve or generate persistent client identifier in sessionStorage
    function getOrCreateClientId() {
        let id = sessionStorage.getItem('whiteboard_collab_client_id');
        if (!id) {
            id = 'client_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
            sessionStorage.setItem('whiteboard_collab_client_id', id);
        }
        return id;
    }

    function getCanvas() {
        return (window.WhiteboardApp && window.WhiteboardApp.canvas) || window.__canvas;
    }

    function getActiveBoardId() {
        if (window.WhiteboardApp && window.WhiteboardApp.boards && typeof window.WhiteboardApp.boards.getActiveBoardId === 'function') {
            const bId = window.WhiteboardApp.boards.getActiveBoardId();
            if (bId) return bId;
        }
        return document.body.dataset.initialBoardId || 'board_main';
    }

    // Ensure Fabric object has a persistent unique ID for cross-client tracking
    function ensureObjectId(obj) {
        if (!obj) return null;
        if (!obj.id) {
            obj.id = 'obj_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        }
        return obj.id;
    }

    // Determine if an object should be synchronized across peers
    function isSyncableObject(obj) {
        if (!obj) return false;
        if (obj.isGridLine) return false;
        if (obj.isSlideFrame) return false;
        if (obj.isArrowHead) return false; // Arrowheads are generated/updated dynamically by lines
        if (obj.isStepBoxPreview) return false;
        if (obj.isAreaErasePreview) return false;
        if (obj.isSelectionElement) return false;
        if (obj.globalCompositeOperation === 'destination-out') return false;
        if (obj.excludeFromExport) return false;
        return true;
    }

    const CollabModule = {
        isSaver() {
            return isSaverClient;
        },

        isApplyingRemote() {
            return isApplyingRemoteChange;
        },

        getCurrentUser() {
            return currentUser;
        },

        isMaster() {
            return Boolean(currentUser && currentUser.role === 'master');
        },

        canEdit() {
            return currentUser ? Boolean(currentUser.can_edit) : true;
        },

        getOnlineUsers() {
            return onlineUsers;
        },

        // --- WebSocket Lifecycle ---
        connect(boardId, password) {
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
                reconnectTimer = null;
            }

            if (ws) {
                try {
                    ws.onclose = null;
                    ws.onerror = null;
                    ws.close();
                } catch (e) {}
                ws = null;
            }

            activeBoardId = boardId || getActiveBoardId();
            clientId = getOrCreateClientId();

            // Check URL parameters for view-only mode
            const urlParams = new URLSearchParams(window.location.search);
            isReadOnly = urlParams.get('viewonly') === '1' || urlParams.get('readonly') === '1';

            if (password !== undefined) {
                roomPassword = password;
            }

            // Token is stored per session tab so multiple browser tabs do not inadvertently share Master role
            const storedMasterToken = sessionStorage.getItem('whiteboard_master_token_' + activeBoardId);
            const storedUserName = localStorage.getItem('whiteboard_user_name') || '';

            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            let wsUrl = `${protocol}//${window.location.host}/ws/${activeBoardId}?client_id=${encodeURIComponent(clientId)}&readonly=${isReadOnly ? '1' : '0'}`;
            if (storedMasterToken) {
                wsUrl += `&token=${encodeURIComponent(storedMasterToken)}`;
            }
            if (storedUserName) {
                wsUrl += `&user_name=${encodeURIComponent(storedUserName)}`;
            }
            if (roomPassword) {
                wsUrl += `&password=${encodeURIComponent(roomPassword)}`;
            }

            try {
                ws = new WebSocket(wsUrl);
            } catch (err) {
                console.error('[Collab] Failed to instantiate WebSocket:', err);
                CollabModule.scheduleReconnect();
                return;
            }

            ws.onopen = () => {
                reconnectAttempts = 0;
                console.log(`[Collab] Connected to room for board "${activeBoardId}"`);
                CollabModule.updateConnectionStatus(true);
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    CollabModule.handleMessage(message);
                } catch (err) {
                    console.error('[Collab] Error parsing message:', err, event.data);
                }
            };

            ws.onerror = (err) => {
                console.warn('[Collab] WebSocket error:', err);
            };

            ws.onclose = (event) => {
                CollabModule.updateConnectionStatus(false);
                if (event.code === 4001) {
                    // Password required or incorrect
                    CollabModule.promptPasswordModal();
                } else {
                    console.log('[Collab] Connection closed. Reconnecting...');
                    CollabModule.scheduleReconnect();
                }
            };
        },

        scheduleReconnect() {
            if (reconnectTimer) return;
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 10000);
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                CollabModule.connect(activeBoardId, roomPassword);
            }, delay);
        },

        send(message) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                try {
                    ws.send(JSON.stringify(message));
                } catch (err) {
                    console.error('[Collab] Failed to send message:', err);
                }
            }
        },

        switchBoard(newBoardId) {
            CollabModule.clearAllRemoteCursors();
            CollabModule.connect(newBoardId, roomPassword);
        },

        // --- Custom Name & Permissions APIs ---
        setUserName(newName) {
            const clean = (newName || '').trim();
            if (!clean) return;
            localStorage.setItem('whiteboard_user_name', clean);
            if (currentUser) {
                currentUser.name = clean;
            }
            CollabModule.send({
                type: 'set_name',
                name: clean
            });
            CollabModule.updatePresenceUI();
            if (typeof window.showToast === 'function') {
                window.showToast(`Name updated to: ${clean}`);
            }
        },

        setGuestsCanEdit(allowEdit) {
            if (!CollabModule.isMaster()) return;
            guestsCanEdit = Boolean(allowEdit);
            CollabModule.send({
                type: 'set_guest_permissions',
                allow_edit: guestsCanEdit
            });
            if (typeof window.showToast === 'function') {
                window.showToast(guestsCanEdit ? 'Guest editing allowed' : 'Guest editing locked (View Only)');
            }
        },

        setUserCanEdit(userId, canEdit) {
            if (!CollabModule.isMaster()) return;
            CollabModule.send({
                type: 'set_user_permission',
                user_id: userId,
                can_edit: Boolean(canEdit)
            });
        },

        // --- Message Handling ---
        handleMessage(msg) {
            switch (msg.type) {
                case 'init':
                    currentUser = msg.user;
                    isSaverClient = Boolean(msg.user && msg.user.is_saver);
                    guestsCanEdit = Boolean(msg.guests_can_edit);

                    if (msg.master_token) {
                        sessionStorage.setItem('whiteboard_master_token_' + activeBoardId, msg.master_token);
                    } else {
                        sessionStorage.removeItem('whiteboard_master_token_' + activeBoardId);
                    }
                    localStorage.removeItem('whiteboard_master_token_' + activeBoardId);

                    if (isReadOnly || !currentUser.can_edit) {
                        CollabModule.applyViewOnlyMode(currentUser.role === 'guest' ? 'Guest (View Only)' : 'View Only');
                    } else {
                        CollabModule.removeViewOnlyMode();
                    }

                    if (msg.master_viewport) {
                        masterViewport = msg.master_viewport;
                        CollabModule.updateTeacherScreenFrame();
                        CollabModule.updateTeacherUIControls();
                    }
                    if (currentUser && currentUser.role === 'master') {
                        setTimeout(() => CollabModule.broadcastMasterViewport(true), 250);
                    }

                    CollabModule.updatePresenceUI();
                    break;

                case 'master_viewport':
                    masterViewport = msg;
                    CollabModule.updateTeacherScreenFrame();
                    CollabModule.updateTeacherUIControls();
                    break;

                case 'master_viewport_cleared':
                    masterViewport = null;
                    CollabModule.updateTeacherScreenFrame();
                    CollabModule.updateTeacherUIControls();
                    break;

                case 'users':
                    onlineUsers = msg.users || [];
                    CollabModule.updatePresenceUI();
                    break;

                case 'join':
                    if (msg.user) {
                        const existingIdx = onlineUsers.findIndex(u => u.id === msg.user.id);
                        if (existingIdx >= 0) {
                            onlineUsers[existingIdx] = msg.user;
                        } else {
                            onlineUsers.push(msg.user);
                            if (typeof window.showToast === 'function') {
                                const roleLabel = msg.user.role === 'master' ? '👑 Master' : '👤 Guest';
                                window.showToast(`${roleLabel} ${msg.user.name} joined`);
                            }
                        }
                        CollabModule.updatePresenceUI();
                    }
                    break;

                case 'leave':
                    if (msg.user_id) {
                        const leavingUser = onlineUsers.find(u => u.id === msg.user_id);
                        onlineUsers = onlineUsers.filter(u => u.id !== msg.user_id);
                        CollabModule.removeRemoteCursor(msg.user_id);
                        if (masterViewport && (masterViewport.master_id === msg.user_id || leavingUser?.role === 'master')) {
                            masterViewport = null;
                            CollabModule.updateTeacherScreenFrame();
                            CollabModule.updateTeacherUIControls();
                        }
                        if (leavingUser && typeof window.showToast === 'function') {
                            window.showToast(`${leavingUser.name} left the board`);
                        }
                        CollabModule.updatePresenceUI();
                    }
                    break;

                case 'user_renamed':
                    if (msg.user_id && msg.name) {
                        if (currentUser && currentUser.id === msg.user_id) {
                            currentUser.name = msg.name;
                        }
                        const u = onlineUsers.find(item => item.id === msg.user_id);
                        if (u) u.name = msg.name;

                        if (remoteCursors[msg.user_id]) {
                            remoteCursors[msg.user_id].name = msg.name;
                            const labelEl = remoteCursors[msg.user_id].el.querySelector('.remote-cursor-label');
                            if (labelEl) {
                                const isM = remoteCursors[msg.user_id].role === 'master';
                                labelEl.textContent = (isM ? '👑 ' : '') + msg.name;
                            }
                        }
                        CollabModule.updatePresenceUI();
                    }
                    break;

                case 'guest_permissions':
                    guestsCanEdit = Boolean(msg.guests_can_edit);
                    if (currentUser && currentUser.role === 'guest') {
                        currentUser.can_edit = guestsCanEdit && !isReadOnly;
                        if (!currentUser.can_edit) {
                            CollabModule.applyViewOnlyMode('Guest (View Only)');
                            if (typeof window.showToast === 'function') {
                                window.showToast('Master disabled editing for guests (View Only)', 'warning');
                            }
                        } else {
                            CollabModule.removeViewOnlyMode();
                            if (typeof window.showToast === 'function') {
                                window.showToast('Master allowed editing for guests!', 'success');
                            }
                        }
                    }
                    CollabModule.updatePresenceUI();
                    break;

                case 'permission_updated':
                    if (currentUser) {
                        currentUser.can_edit = Boolean(msg.can_edit);
                        if (!currentUser.can_edit) {
                            CollabModule.applyViewOnlyMode('Guest (View Only)');
                            if (typeof window.showToast === 'function') {
                                window.showToast('Your edit access was disabled by Master', 'warning');
                            }
                        } else {
                            isReadOnly = false;
                            CollabModule.removeViewOnlyMode();
                            if (typeof window.showToast === 'function') {
                                window.showToast('Your edit access was enabled by Master!', 'success');
                            }
                        }
                        CollabModule.updatePresenceUI();
                    }
                    break;

                case 'saver_status':
                    isSaverClient = Boolean(msg.is_saver);
                    console.log(`[Collab] Saver status updated: ${isSaverClient ? 'DESIGNATED SAVER' : 'PEER'}`);
                    break;

                case 'cursor':
                    CollabModule.renderRemoteCursor(msg);
                    break;

                case 'object_added':
                    CollabModule.applyRemoteObjectAdded(msg.object);
                    break;

                case 'object_modified':
                    CollabModule.applyRemoteObjectModified(msg.id, msg.object);
                    break;

                case 'object_removed':
                    CollabModule.applyRemoteObjectRemoved(msg.id);
                    break;

                case 'board_bg_changed':
                    CollabModule.applyRemoteBoardBg(msg.bg_color);
                    break;

                case 'step_changed':
                    CollabModule.applyRemoteStepChanged(msg.stepBoxId, msg.currentStep);
                    break;

                case 'slide_changed':
                    if (typeof window.loadSlide === 'function' && typeof window.saveCurrentSlide === 'function') {
                        isApplyingRemoteChange = true;
                        window.saveCurrentSlide();
                        window.loadSlide(msg.slideIndex);
                        isApplyingRemoteChange = false;
                    }
                    break;

                case 'board_renamed':
                    CollabModule.applyRemoteBoardRenamed(msg.name);
                    break;

                case 'error':
                    if (msg.code === 'PASSWORD_REQUIRED') {
                        CollabModule.promptPasswordModal(msg.message);
                    } else if (typeof window.showToast === 'function') {
                        window.showToast(msg.message || 'Collaboration error', 'warning');
                    }
                    break;

                default:
                    break;
            }
        },

        // --- Canvas Remote Synchronization ---
        applyRemoteObjectAdded(objData) {
            if (!objData) return;
            const canvas = getCanvas();
            if (!canvas) return;

            // Check if object already exists to avoid duplicates
            if (objData.id) {
                const existing = canvas.getObjects().find(o => o.id === objData.id);
                if (existing) {
                    CollabModule.applyRemoteObjectModified(objData.id, objData);
                    return;
                }
            }

            isApplyingRemoteChange = true;
            try {
                if (objData && objData.textBaseline === 'alphabetical') {
                    objData.textBaseline = 'alphabetic';
                }
                fabric.util.enlivenObjects([objData], (enlivenedObjects) => {
                    enlivenedObjects.forEach((newObj) => {
                        ensureObjectId(newObj);
                        if (objData.id) newObj.id = objData.id;
                        if (objData.shapeUid) newObj.shapeUid = objData.shapeUid;
                        if (objData.fromShapeUid) newObj.fromShapeUid = objData.fromShapeUid;
                        if (objData.toShapeUid) newObj.toShapeUid = objData.toShapeUid;
                        if (objData.connectedLines) newObj.connectedLines = objData.connectedLines;
                        if (objData.stepBoxId) newObj.stepBoxId = objData.stepBoxId;
                        if (objData.stepBoxOwnerId) newObj.stepBoxOwnerId = objData.stepBoxOwnerId;

                        canvas.add(newObj);

                        // If connector or line, reconnect arrows
                        if (newObj.isConnector || newObj.isFreeLine) {
                            if (typeof window.applyArrowheadStyleToLine === 'function') {
                                window.applyArrowheadStyleToLine(newObj);
                            }
                        }
                    });
                    canvas.requestRenderAll();
                    if (typeof window.updateObjectsCountBadges === 'function') {
                        window.updateObjectsCountBadges();
                    }
                    if (typeof window.renderObjectsList === 'function') {
                        window.renderObjectsList();
                    }
                    isApplyingRemoteChange = false;
                });
            } catch (err) {
                console.error('[Collab] Failed to apply remote object_added:', err);
                isApplyingRemoteChange = false;
            }
        },

        applyRemoteObjectModified(objId, objData) {
            if (!objId || !objData) return;
            const canvas = getCanvas();
            if (!canvas) return;

            const targetObj = canvas.getObjects().find(o => o.id === objId || (o.shapeUid && o.shapeUid === objData.shapeUid));
            if (!targetObj) {
                // If not found locally, add it
                CollabModule.applyRemoteObjectAdded(objData);
                return;
            }

            isApplyingRemoteChange = true;
            try {
                // Copy transformed properties
                targetObj.set({
                    left: objData.left,
                    top: objData.top,
                    width: objData.width,
                    height: objData.height,
                    scaleX: objData.scaleX,
                    scaleY: objData.scaleY,
                    angle: objData.angle,
                    fill: objData.fill,
                    stroke: objData.stroke,
                    strokeWidth: objData.strokeWidth,
                    strokeDashArray: objData.strokeDashArray,
                    opacity: objData.opacity,
                    text: objData.text,
                    fontSize: objData.fontSize,
                    fontFamily: objData.fontFamily,
                    textAlign: objData.textAlign
                });

                if (objData.stepBoxCurrentStep !== undefined) {
                    targetObj.stepBoxCurrentStep = objData.stepBoxCurrentStep;
                }
                if (objData.stepBoxSteps !== undefined) {
                    targetObj.stepBoxSteps = objData.stepBoxSteps;
                }

                targetObj.setCoords();

                // Update connected lines if shape or line
                if (targetObj.isConnector || targetObj.isFreeLine) {
                    if (typeof window.applyArrowheadStyleToLine === 'function') {
                        window.applyArrowheadStyleToLine(targetObj);
                    }
                }
                if ((targetObj.connectedLines || targetObj.isFreeLine) && typeof window.updateConnectedLinesFor === 'function') {
                    window.updateConnectedLinesFor(targetObj);
                }

                canvas.requestRenderAll();
            } catch (err) {
                console.error('[Collab] Error in applyRemoteObjectModified:', err);
            } finally {
                isApplyingRemoteChange = false;
            }
        },

        applyRemoteObjectRemoved(objId) {
            if (!objId) return;
            const canvas = getCanvas();
            if (!canvas) return;

            const targetObj = canvas.getObjects().find(o => o.id === objId);
            if (!targetObj) return;

            isApplyingRemoteChange = true;
            try {
                if (typeof window.detachConnector === 'function') {
                    window.detachConnector(targetObj);
                }
                canvas.remove(targetObj);
                canvas.requestRenderAll();
                if (typeof window.updateObjectsCountBadges === 'function') {
                    window.updateObjectsCountBadges();
                }
                if (typeof window.renderObjectsList === 'function') {
                    window.renderObjectsList();
                }
            } catch (err) {
                console.error('[Collab] Error in applyRemoteObjectRemoved:', err);
            } finally {
                isApplyingRemoteChange = false;
            }
        },

        applyRemoteBoardBg(color) {
            if (!color) return;
            if (window.WhiteboardApp && window.WhiteboardApp.boards && typeof window.WhiteboardApp.boards.setBoardBackgroundColor === 'function') {
                window.WhiteboardApp.boards.setBoardBackgroundColor(color, false);
            }
        },

        applyRemoteStepChanged(stepBoxId, currentStep) {
            const canvas = getCanvas();
            if (!canvas) return;
            const stepBox = canvas.getObjects().find(o => o.isStepBox && (o.stepBoxId === stepBoxId || o.id === stepBoxId));
            if (stepBox) {
                stepBox.stepBoxCurrentStep = currentStep;
                if (typeof window.loadStepBoxStep === 'function') {
                    window.loadStepBoxStep(stepBox, currentStep);
                }
            }
        },

        applyRemoteBoardRenamed(newName) {
            if (!newName) return;
            const boardTitleEl = document.querySelector('.board-title, #board-title');
            if (boardTitleEl) {
                boardTitleEl.textContent = newName;
            }
            if (window.WhiteboardApp && window.WhiteboardApp.boards) {
                const boards = window.WhiteboardApp.boards.getBoards();
                const active = boards.find(b => b.id === activeBoardId);
                if (active) active.name = newName;
            }
        },

        // --- Outgoing Event Broadcasts ---
        broadcastObjectAdded(obj) {
            if (isApplyingRemoteChange || isReadOnly || !CollabModule.canEdit()) return;
            if (!isSyncableObject(obj)) return;
            ensureObjectId(obj);

            const extraProps = window.WhiteboardApp.EXTRA_PROPS || window.EXTRA_PROPS || ['id'];
            const serialized = obj.toObject(extraProps);
            CollabModule.send({
                type: 'object_added',
                object: serialized
            });
        },

        broadcastObjectModified(obj) {
            if (isApplyingRemoteChange || isReadOnly || !CollabModule.canEdit()) return;
            if (!isSyncableObject(obj)) return;
            ensureObjectId(obj);

            const extraProps = window.WhiteboardApp.EXTRA_PROPS || window.EXTRA_PROPS || ['id'];
            const serialized = obj.toObject(extraProps);
            CollabModule.send({
                type: 'object_modified',
                id: obj.id,
                object: serialized
            });
        },

        broadcastObjectRemoved(obj) {
            if (isApplyingRemoteChange || isReadOnly || !CollabModule.canEdit()) return;
            if (!isSyncableObject(obj)) return;
            if (!obj.id) return;

            CollabModule.send({
                type: 'object_removed',
                id: obj.id
            });
        },

        broadcastBoardBg(color) {
            if (isReadOnly || !CollabModule.canEdit()) return;
            CollabModule.send({
                type: 'board_bg_changed',
                bg_color: color
            });
        },

        broadcastStepChanged(stepBoxId, currentStep) {
            if (isReadOnly || !CollabModule.canEdit()) return;
            CollabModule.send({
                type: 'step_changed',
                stepBoxId: stepBoxId,
                currentStep: currentStep
            });
        },

        broadcastBoardRenamed(name) {
            if (isReadOnly || !CollabModule.canEdit()) return;
            CollabModule.send({
                type: 'board_renamed',
                name: name
            });
        },

        broadcastCursor(canvasX, canvasY) {
            const now = Date.now();
            if (now - lastCursorSendTime < CURSOR_THROTTLE_MS) return;
            lastCursorSendTime = now;

            CollabModule.send({
                type: 'cursor',
                x: Math.round(canvasX),
                y: Math.round(canvasY)
            });
        },

        // --- Live Remote Cursor Rendering ---
        renderRemoteCursor(data) {
            const userId = data.user_id;
            if (!userId || (currentUser && userId === currentUser.id)) return;

            const container = document.getElementById('collab-cursors-container');
            if (!container) return;

            const isM = data.role === 'master';
            let cursorInfo = remoteCursors[userId];
            if (!cursorInfo) {
                const el = document.createElement('div');
                el.className = `remote-cursor ${isM ? 'remote-cursor-master' : ''}`;
                el.id = `remote-cursor-${userId}`;

                // Custom SVG pointer colored with user's assigned palette color
                el.innerHTML = `
                    <svg class="remote-cursor-pointer" width="20" height="20" viewBox="0 0 24 24" fill="${data.color || '#3b82f6'}" stroke="#ffffff" stroke-width="1.5">
                        <path d="M3 3l7 18 3-7 7-3L3 3z"/>
                    </svg>
                    <div class="remote-cursor-label ${isM ? 'label-master' : ''}" style="background-color: ${data.color || '#3b82f6'};">
                        ${isM ? '👑 ' : ''}${data.name || 'Collaborator'}
                    </div>
                `;
                container.appendChild(el);
                cursorInfo = { el, x: data.x, y: data.y, name: data.name, color: data.color, role: data.role };
                remoteCursors[userId] = cursorInfo;
            } else {
                cursorInfo.x = data.x;
                cursorInfo.y = data.y;
                cursorInfo.role = data.role;
            }

            CollabModule.updateCursorScreenPosition(cursorInfo);
        },

        updateCursorScreenPosition(cursorInfo) {
            const canvas = getCanvas();
            if (!canvas || !cursorInfo || !cursorInfo.el) return;

            // Transform canvas point into viewport screen coordinate
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const pt = fabric.util.transformPoint(new fabric.Point(cursorInfo.x, cursorInfo.y), vpt);

            cursorInfo.el.style.transform = `translate3d(${pt.x}px, ${pt.y}px, 0)`;
        },

        updateAllRemoteCursorPositions() {
            Object.values(remoteCursors).forEach(c => CollabModule.updateCursorScreenPosition(c));
        },

        removeRemoteCursor(userId) {
            const info = remoteCursors[userId];
            if (info && info.el && info.el.parentNode) {
                info.el.parentNode.removeChild(info.el);
            }
            delete remoteCursors[userId];
        },

        clearAllRemoteCursors() {
            Object.keys(remoteCursors).forEach(uid => CollabModule.removeRemoteCursor(uid));
        },

        // --- Teacher Screen Broadcasting & Viewport Synchronization ---
        broadcastMasterViewport(force = false) {
            if (!currentUser || currentUser.role !== 'master') return;
            const canvas = getCanvas();
            if (!canvas) return;

            const now = Date.now();
            if (!force && now - lastViewportSendTime < VIEWPORT_THROTTLE_MS) return;

            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = canvas.getZoom();
            const w = canvas.getWidth();
            const h = canvas.getHeight();

            const sceneX = -vpt[4] / zoom;
            const sceneY = -vpt[5] / zoom;
            const sceneW = w / zoom;
            const sceneH = h / zoom;

            // Check if meaningfully changed (> 1.5px or 0.005 zoom)
            if (!force && lastSentViewport) {
                const dx = Math.abs(sceneX - lastSentViewport.x);
                const dy = Math.abs(sceneY - lastSentViewport.y);
                const dw = Math.abs(sceneW - lastSentViewport.width);
                const dh = Math.abs(sceneH - lastSentViewport.height);
                const dz = Math.abs(zoom - lastSentViewport.zoom);
                if (dx < 1.5 && dy < 1.5 && dw < 1.5 && dh < 1.5 && dz < 0.005) {
                    return;
                }
            }

            lastViewportSendTime = now;
            lastSentViewport = { x: sceneX, y: sceneY, width: sceneW, height: sceneH, zoom: zoom };

            CollabModule.send({
                type: 'master_viewport',
                x: Math.round(sceneX),
                y: Math.round(sceneY),
                width: Math.round(sceneW),
                height: Math.round(sceneH),
                screenWidth: Math.round(w),
                screenHeight: Math.round(h),
                zoom: parseFloat(zoom.toFixed(4)),
                master_name: currentUser.name || 'Teacher'
            });
        },

        updateTeacherScreenFrame() {
            const frameEl = document.getElementById('teacher-screen-frame');
            if (!frameEl) return;

            // If user is Master or no active master viewport, hide frame
            if (!masterViewport || (currentUser && currentUser.role === 'master')) {
                frameEl.classList.add('hidden');
                return;
            }

            const canvas = getCanvas();
            if (!canvas) return;

            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = canvas.getZoom();

            // Transform top-left from scene coords to guest screen coords
            const pt = fabric.util.transformPoint(new fabric.Point(masterViewport.x, masterViewport.y), vpt);
            const frameW = masterViewport.width * zoom;
            const frameH = masterViewport.height * zoom;

            frameEl.style.transform = `translate3d(${Math.round(pt.x)}px, ${Math.round(pt.y)}px, 0)`;
            frameEl.style.width = `${Math.round(frameW)}px`;
            frameEl.style.height = `${Math.round(frameH)}px`;

            // Update badge label with Teacher's name
            const nameEl = document.getElementById('teacher-screen-badge-name');
            if (nameEl) {
                nameEl.textContent = `${masterViewport.master_name || 'Teacher'}'s Screen`;
            }

            frameEl.classList.remove('hidden');
        },

        updateTeacherUIControls() {
            const topBtn = document.getElementById('btn-return-teacher-view');
            const floatingIndicator = document.getElementById('teacher-view-floating-indicator');

            const isGuest = currentUser && currentUser.role !== 'master';
            const hasTeacher = Boolean(masterViewport);

            if (isGuest && hasTeacher) {
                if (topBtn) topBtn.classList.remove('hidden');
                if (floatingIndicator) floatingIndicator.classList.remove('hidden');
            } else {
                if (topBtn) topBtn.classList.add('hidden');
                if (floatingIndicator) floatingIndicator.classList.add('hidden');
            }
        },

        resetViewToTeacher(smooth = true) {
            if (!masterViewport) {
                if (typeof window.showToast === 'function') {
                    window.showToast("Teacher's screen is not active yet", 'warning');
                }
                return;
            }
            const canvas = getCanvas();
            if (!canvas) return;

            // Target viewport calculation: fit teacher's screen comfortably into guest's window
            const guestW = canvas.getWidth();
            const guestH = canvas.getHeight();
            const teacherW = masterViewport.width;
            const teacherH = masterViewport.height;

            if (teacherW <= 0 || teacherH <= 0) return;

            // Scale factor to fit teacher's screen with comfortable breathing room
            const scaleX = guestW / teacherW;
            const scaleY = guestH / teacherH;
            let targetZoom = Math.min(scaleX, scaleY) * 0.96;
            targetZoom = Math.max(0.05, Math.min(5.0, targetZoom));

            // Center teacher's bounding box in guest canvas
            const teacherCenterX = masterViewport.x + teacherW / 2;
            const teacherCenterY = masterViewport.y + teacherH / 2;

            const targetPanX = (guestW / 2) - (teacherCenterX * targetZoom);
            const targetPanY = (guestH / 2) - (teacherCenterY * targetZoom);

            if (smooth) {
                const startVpt = (canvas.viewportTransform || [1, 0, 0, 1, 0, 0]).slice();
                const startZoom = startVpt[0];
                const startPanX = startVpt[4];
                const startPanY = startVpt[5];
                const duration = 280; // ms
                const startTime = performance.now();

                const animateFrame = (now) => {
                    const elapsed = now - startTime;
                    const progress = Math.min(1, elapsed / duration);
                    // Ease out cubic
                    const ease = 1 - Math.pow(1 - progress, 3);

                    const curZoom = startZoom + (targetZoom - startZoom) * ease;
                    const curPanX = startPanX + (targetPanX - startPanX) * ease;
                    const curPanY = startPanY + (targetPanY - startPanY) * ease;

                    canvas.setViewportTransform([curZoom, 0, 0, curZoom, curPanX, curPanY]);
                    canvas.requestRenderAll();
                    if (typeof window.updateGrid === 'function') window.updateGrid();
                    if (typeof window.updateZoomDisplay === 'function') window.updateZoomDisplay();
                    CollabModule.updateAllRemoteCursorPositions();
                    CollabModule.updateTeacherScreenFrame();

                    if (progress < 1) {
                        requestAnimationFrame(animateFrame);
                    } else {
                        if (typeof window.showToast === 'function') {
                            window.showToast(`Centered on ${masterViewport.master_name || 'Teacher'}'s screen`);
                        }
                    }
                };
                requestAnimationFrame(animateFrame);
            } else {
                canvas.setViewportTransform([targetZoom, 0, 0, targetZoom, targetPanX, targetPanY]);
                canvas.requestRenderAll();
                if (typeof window.updateGrid === 'function') window.updateGrid();
                if (typeof window.updateZoomDisplay === 'function') window.updateZoomDisplay();
                CollabModule.updateAllRemoteCursorPositions();
                CollabModule.updateTeacherScreenFrame();
            }
        },

        // --- Presence & Top Bar Avatars UI ---
        getConsolidatedUsers() {
            const userMap = new Map();
            if (currentUser && currentUser.id) {
                userMap.set(currentUser.id, { ...currentUser });
            }
            if (Array.isArray(onlineUsers)) {
                onlineUsers.forEach(u => {
                    if (u && u.id) {
                        if (currentUser && u.id === currentUser.id) {
                            userMap.set(u.id, { ...u, ...currentUser });
                        } else {
                            userMap.set(u.id, u);
                        }
                    }
                });
            }
            const list = Array.from(userMap.values());
            // Strictly enforce only ONE Master displayed across the entire room
            let foundMaster = false;
            list.forEach(u => {
                if (u.role === 'master') {
                    if (!foundMaster) {
                        foundMaster = true;
                    } else {
                        u.role = 'guest';
                    }
                }
            });
            return list;
        },

        updatePresenceUI() {
            const avatarsContainer = document.getElementById('collab-avatars');
            const countBadge = document.getElementById('collab-count');
            if (!avatarsContainer || !countBadge) return;

            avatarsContainer.innerHTML = '';
            const allUsers = CollabModule.getConsolidatedUsers();

            countBadge.textContent = allUsers.length.toString();

            // Render up to 5 user avatars, then a +N overflow counter
            const maxVisible = 4;
            const visible = allUsers.slice(0, maxVisible);

            visible.forEach(user => {
                const isM = user.role === 'master';
                const pill = document.createElement('div');
                pill.className = `collab-avatar-pill ${isM ? 'avatar-master' : ''}`;
                pill.style.backgroundColor = user.color || '#3b82f6';

                const roleText = isM ? '👑 Master' : '👤 Guest';
                const editStatus = user.can_edit ? 'Can Edit' : 'View Only';
                pill.title = `${user.name || 'Collaborator'} (${roleText} - ${editStatus})${user.id === (currentUser && currentUser.id) ? ' [You]' : ''}`;

                // Initials from name
                const initials = (user.name || 'User')
                    .split(' ')
                    .map(w => w[0])
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);

                pill.innerHTML = isM ? `<span class="pill-crown">👑</span>${initials}` : initials;
                avatarsContainer.appendChild(pill);
            });

            if (allUsers.length > maxVisible) {
                const overflow = document.createElement('div');
                overflow.className = 'collab-avatar-pill collab-avatar-more';
                overflow.textContent = `+${allUsers.length - maxVisible}`;
                overflow.title = allUsers.slice(maxVisible).map(u => (u.role === 'master' ? '👑 ' : '') + u.name).join(', ');
                avatarsContainer.appendChild(overflow);
            }

            // Sync Dropdown Profile and User List
            CollabModule.renderCollaboratorsDropdown();
        },

        renderCollaboratorsDropdown() {
            const dropdown = document.getElementById('collab-users-dropdown');
            if (!dropdown) return;

            const myBadge = document.getElementById('collab-my-role-badge');
            const nameInput = document.getElementById('collab-dropdown-name-input');
            const guestControls = document.getElementById('collab-dropdown-guest-controls');
            const guestToggle = document.getElementById('collab-dropdown-guest-toggle');
            const shareModalGuestToggle = document.getElementById('share-modal-guest-toggle');
            const shareMasterInput = document.getElementById('share-master-name-input');
            const usersList = document.getElementById('collab-dropdown-users-list');

            const isM = CollabModule.isMaster();

            if (myBadge) {
                myBadge.textContent = isM ? '👑 You are Master (Host)' : '👤 You are a Guest';
                myBadge.className = `collab-profile-badge ${isM ? 'badge-master' : 'badge-guest'}`;
            }

            if (nameInput && (!nameInput.value || document.activeElement !== nameInput)) {
                nameInput.value = (currentUser && currentUser.name) || '';
            }

            if (shareMasterInput && (!shareMasterInput.value || document.activeElement !== shareMasterInput)) {
                shareMasterInput.value = (currentUser && currentUser.name) || '';
            }

            if (guestControls) {
                guestControls.style.display = isM ? 'block' : 'none';
            }

            if (guestToggle) {
                guestToggle.checked = guestsCanEdit;
            }

            if (shareModalGuestToggle) {
                shareModalGuestToggle.checked = guestsCanEdit;
            }

            if (usersList) {
                usersList.innerHTML = '';
                const allUsers = CollabModule.getConsolidatedUsers();

                allUsers.forEach(user => {
                    const isUserMaster = user.role === 'master';
                    const isMe = currentUser && user.id === currentUser.id;

                    const row = document.createElement('div');
                    row.className = 'collab-user-row';

                    const userInitials = (user.name || 'User')
                        .split(' ')
                        .map(w => w[0])
                        .join('')
                        .toUpperCase()
                        .substring(0, 2);

                    row.innerHTML = `
                        <div class="collab-user-left">
                            <div class="collab-user-avatar" style="background-color: ${user.color || '#3b82f6'};">
                                ${userInitials}
                            </div>
                            <div class="collab-user-info">
                                <span class="collab-user-name">${user.name || 'User'} ${isMe ? '<span class="tag-you">(You)</span>' : ''}</span>
                                <span class="collab-user-role ${isUserMaster ? 'role-master' : 'role-guest'}">
                                    ${isUserMaster ? '👑 Master' : '👤 Guest'}
                                </span>
                            </div>
                        </div>
                        <div class="collab-user-right">
                            ${isM && !isUserMaster ? `
                                <button type="button" class="btn-toggle-perm ${user.can_edit ? 'perm-can-edit' : 'perm-view-only'}" data-userid="${user.id}" data-canedit="${user.can_edit}">
                                    ${user.can_edit ? '✓ Can Edit' : '🔒 View Only'}
                                </button>
                            ` : `
                                <span class="collab-perm-badge ${user.can_edit ? 'perm-can-edit' : 'perm-view-only'}">
                                    ${user.can_edit ? 'Can Edit' : 'View Only'}
                                </span>
                            `}
                        </div>
                    `;

                    // Wire per-user toggle for Master
                    if (isM && !isUserMaster) {
                        const permBtn = row.querySelector('.btn-toggle-perm');
                        if (permBtn) {
                            permBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                const uId = permBtn.dataset.userid;
                                const currentPerm = permBtn.dataset.canedit === 'true';
                                CollabModule.setUserCanEdit(uId, !currentPerm);
                            });
                        }
                    }

                    usersList.appendChild(row);
                });
            }
        },

        updateConnectionStatus(isConnected) {
            const container = document.getElementById('collab-users-container');
            if (container) {
                container.classList.toggle('connected', isConnected);
                container.classList.toggle('disconnected', !isConnected);
            }
        },

        // --- View-Only Mode Enforcement ---
        applyViewOnlyMode(label = 'View Only') {
            document.body.classList.add('view-only-mode');
            if (typeof window.setMode === 'function') {
                window.setMode('pan');
            }
            const canvas = getCanvas();
            if (canvas) {
                canvas.selection = false;
                canvas.isDrawingMode = false;
                canvas.defaultCursor = 'grab';
                canvas.hoverCursor = 'grab';
                canvas.discardActiveObject();
                canvas.forEachObject(o => {
                    o.selectable = false;
                    o.evented = false;
                });
                canvas.requestRenderAll();
            }

            // Disable board logo link so view-only users cannot navigate to /boards or other boards
            const brandLink = document.querySelector('.brand-link');
            if (brandLink) {
                brandLink.removeAttribute('href');
                brandLink.removeAttribute('title');
                brandLink.style.pointerEvents = 'none';
                brandLink.style.cursor = 'default';
            }

            // Hide floating presenter / drawing dock, restore buttons, and zoom widget
            const presenterBar = document.getElementById('fullscreen-presenter-bar');
            if (presenterBar) presenterBar.style.display = 'none';
            const restoreButtons = document.getElementById('panel-restore-buttons');
            if (restoreButtons) restoreButtons.style.display = 'none';
            const zoomWidget = document.getElementById('zoom-widget');
            if (zoomWidget) zoomWidget.style.display = 'none';

            // Close any open side drawers, dropdowns or modals
            const shapesPanel = document.getElementById('shapes-panel');
            if (shapesPanel) shapesPanel.classList.add('hidden');
            const rightSidebar = document.getElementById('right-boards-sidebar');
            if (rightSidebar) rightSidebar.classList.remove('open');
            const shareModal = document.getElementById('modal-share-board');
            if (shareModal) shareModal.classList.add('hidden');
            if (typeof window.hideContextMenu === 'function') {
                window.hideContextMenu();
            }
            CollabModule.updateTeacherUIControls();
        },

        removeViewOnlyMode() {
            if (isReadOnly) return; // Keep locked if specifically opened with ?viewonly=1
            document.body.classList.remove('view-only-mode');

            // Restore floating presenter / drawing dock, restore buttons, and zoom widget
            const presenterBar = document.getElementById('fullscreen-presenter-bar');
            if (presenterBar) presenterBar.style.display = '';
            const restoreButtons = document.getElementById('panel-restore-buttons');
            if (restoreButtons) restoreButtons.style.display = '';
            const zoomWidget = document.getElementById('zoom-widget');
            if (zoomWidget) zoomWidget.style.display = '';

            // Restore board logo link when edit access is enabled
            const brandLink = document.querySelector('.brand-link');
            if (brandLink) {
                brandLink.setAttribute('href', '/boards');
                brandLink.setAttribute('title', 'Whiteboard Boards Dashboard');
                brandLink.style.pointerEvents = '';
                brandLink.style.cursor = '';
            }

            const canvas = getCanvas();
            if (canvas) {
                canvas.selection = true;
                canvas.defaultCursor = 'default';
                canvas.hoverCursor = 'move';
                canvas.forEachObject(o => {
                    if (!o.isSlideFrame && !o.isGridLine) {
                        o.selectable = true;
                        o.evented = true;
                    }
                });
                canvas.requestRenderAll();
            }
            if (typeof window.setMode === 'function') {
                window.setMode('select');
            }
            CollabModule.updateTeacherUIControls();
        },

        initViewOnlyShield() {
            const shield = document.getElementById('view-only-shield');
            if (!shield) return;

            let isDragging = false;
            let lastX = 0;
            let lastY = 0;

            shield.addEventListener('pointerdown', (e) => {
                if (e.button !== 0 && e.button !== 1) return; // Left or middle click
                isDragging = true;
                lastX = e.clientX;
                lastY = e.clientY;
                shield.classList.add('is-panning');
                try {
                    shield.setPointerCapture(e.pointerId);
                } catch (err) {}
                e.preventDefault();
            });

            shield.addEventListener('pointermove', (e) => {
                const canvas = getCanvas();
                if (isDragging && canvas) {
                    const dx = e.clientX - lastX;
                    const dy = e.clientY - lastY;
                    lastX = e.clientX;
                    lastY = e.clientY;
                    canvas.relativePan(new fabric.Point(dx, dy));
                    if (typeof window.updateGrid === 'function') window.updateGrid();
                    e.preventDefault();
                }

                // Broadcast viewer pointer position as cursor to peers
                if (canvas) {
                    const pointer = canvas.getPointer(e);
                    CollabModule.broadcastCursor(pointer.x, pointer.y);
                }
            });

            const stopDrag = (e) => {
                if (isDragging) {
                    isDragging = false;
                    shield.classList.remove('is-panning');
                    try {
                        shield.releasePointerCapture(e.pointerId);
                    } catch (err) {}
                }
            };

            shield.addEventListener('pointerup', stopDrag);
            shield.addEventListener('pointercancel', stopDrag);

            // Wheel zoom through shield
            shield.addEventListener('wheel', (e) => {
                e.preventDefault();
                const canvas = getCanvas();
                if (!canvas) return;

                const delta = e.deltaY;
                let zoom = canvas.getZoom();
                zoom *= 0.999 ** delta;

                if (typeof window.setZoom === 'function') {
                    window.setZoom(zoom, new fabric.Point(e.clientX, e.clientY));
                } else {
                    canvas.zoomToPoint(new fabric.Point(e.clientX, e.clientY), zoom);
                    if (typeof window.updateGrid === 'function') window.updateGrid();
                }
                if (typeof window.updateZoomDisplay === 'function') {
                    window.updateZoomDisplay();
                }
            }, { passive: false });
        },

        // --- Share Board Modal ---
        async openShareModal() {
            const modal = document.getElementById('modal-share-board');
            if (!modal) return;

            let ip = window.location.hostname;
            let port = window.location.port || '8000';

            try {
                const res = await fetch('/api/network-info');
                if (res.ok) {
                    const info = await res.json();
                    if (info.ip) ip = info.ip;
                    if (info.port) port = info.port;
                }
            } catch (e) {}

            const currentBoard = getActiveBoardId();
            const editUrl = `http://${ip}:${port}/board/${currentBoard}`;
            const viewUrl = `http://${ip}:${port}/board/${currentBoard}?viewonly=1`;

            const inputEdit = document.getElementById('share-link-edit');
            const inputView = document.getElementById('share-link-view');
            const qrImg = document.getElementById('share-qr-code-img');

            if (inputEdit) inputEdit.value = editUrl;
            if (inputView) inputView.value = viewUrl;

            if (qrImg) {
                qrImg.src = `/api/qrcode?data=${encodeURIComponent(editUrl)}`;
            }

            // Sync Master name field in modal
            const masterInput = document.getElementById('share-master-name-input');
            if (masterInput && currentUser) {
                masterInput.value = currentUser.name || '';
            }

            // Sync Guest toggle in modal
            const guestToggle = document.getElementById('share-modal-guest-toggle');
            if (guestToggle) {
                guestToggle.checked = guestsCanEdit;
            }

            modal.classList.remove('hidden');
        },

        closeShareModal() {
            const modal = document.getElementById('modal-share-board');
            if (modal) modal.classList.add('hidden');
        },

        promptPasswordModal(errorMsg) {
            const modal = document.getElementById('modal-password-prompt');
            const errEl = document.getElementById('password-prompt-error');
            const input = document.getElementById('room-password-input');
            if (errEl) {
                errEl.textContent = errorMsg || 'This board is password-protected. Enter the room password to join.';
                errEl.style.display = 'block';
            }
            if (input) {
                input.value = '';
                input.focus();
            }
            if (modal) modal.classList.remove('hidden');
        },

        closePasswordModal() {
            const modal = document.getElementById('modal-password-prompt');
            if (modal) modal.classList.add('hidden');
        },

        promptJoinModal(boardId, existingName = '') {
            const modal = document.getElementById('modal-join-board');
            const input = document.getElementById('join-user-name-input');
            if (!modal) {
                CollabModule.connect(boardId);
                return;
            }
            if (input) {
                input.value = existingName;
                setTimeout(() => input.focus(), 150);
            }
            modal.classList.remove('hidden');
        },

        closeJoinModal() {
            const modal = document.getElementById('modal-join-board');
            if (modal) modal.classList.add('hidden');
        },

        // --- Initialization ---
        init() {
            const canvas = getCanvas();
            if (!canvas) {
                setTimeout(() => CollabModule.init(), 100);
                return;
            }

            // Assign unique ID to existing objects that do not have one
            canvas.forEachObject(o => ensureObjectId(o));

            // If opened in View-Only mode via URL query parameter, enforce immediately
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('viewonly') === '1' || urlParams.get('readonly') === '1') {
                isReadOnly = true;
                CollabModule.applyViewOnlyMode('View Only');
            }

            // Setup canvas listeners for Granular Object Synchronization
            canvas.on('object:added', (e) => {
                const obj = e.target;
                if (!obj || isApplyingRemoteChange) return;
                ensureObjectId(obj);
                CollabModule.broadcastObjectAdded(obj);
            });

            canvas.on('object:modified', (e) => {
                const obj = e.target;
                if (!obj || isApplyingRemoteChange) return;
                CollabModule.broadcastObjectModified(obj);
            });

            canvas.on('text:changed', (e) => {
                const obj = e.target;
                if (!obj || isApplyingRemoteChange) return;
                CollabModule.broadcastObjectModified(obj);
            });

            canvas.on('object:removed', (e) => {
                const obj = e.target;
                if (!obj || isApplyingRemoteChange) return;
                CollabModule.broadcastObjectRemoved(obj);
            });

            // Live Cursor Tracking over canvas
            canvas.on('mouse:move', (opt) => {
                if (isReadOnly || !CollabModule.canEdit()) return;
                const pointer = canvas.getPointer(opt.e);
                CollabModule.broadcastCursor(pointer.x, pointer.y);
            });

            // Sync remote cursor screen positions and teacher screen frame when canvas pans or zooms
            canvas.on('after:render', () => {
                CollabModule.updateAllRemoteCursorPositions();
                if (currentUser && currentUser.role === 'master') {
                    CollabModule.broadcastMasterViewport();
                } else {
                    CollabModule.updateTeacherScreenFrame();
                }
            });

            window.addEventListener('resize', () => {
                if (currentUser && currentUser.role === 'master') {
                    CollabModule.broadcastMasterViewport(true);
                } else {
                    CollabModule.updateTeacherScreenFrame();
                }
            });

            // Wire reset view to teacher buttons
            const btnReturnTeacher = document.getElementById('btn-return-teacher-view');
            if (btnReturnTeacher) {
                btnReturnTeacher.addEventListener('click', () => CollabModule.resetViewToTeacher(true));
            }

            const btnFloatingReturn = document.getElementById('btn-floating-return-teacher');
            if (btnFloatingReturn) {
                btnFloatingReturn.addEventListener('click', () => CollabModule.resetViewToTeacher(true));
            }

            const btnFrameReset = document.getElementById('btn-frame-reset-teacher');
            if (btnFrameReset) {
                btnFrameReset.addEventListener('click', (e) => {
                    e.stopPropagation();
                    CollabModule.resetViewToTeacher(true);
                });
            }

            // Toggle Collaborators dropdown on avatar bar click
            const collabContainer = document.getElementById('collab-users-container');
            const collabDropdown = document.getElementById('collab-users-dropdown');
            if (collabContainer && collabDropdown) {
                collabContainer.addEventListener('click', (e) => {
                    e.stopPropagation();
                    collabDropdown.classList.toggle('hidden');
                });

                document.addEventListener('click', (e) => {
                    if (!collabDropdown.contains(e.target) && !collabContainer.contains(e.target)) {
                        collabDropdown.classList.add('hidden');
                    }
                });
            }

            const btnCloseDropdown = document.getElementById('btn-close-collab-dropdown');
            if (btnCloseDropdown && collabDropdown) {
                btnCloseDropdown.addEventListener('click', () => collabDropdown.classList.add('hidden'));
            }

            // Wire Master name save in dropdown
            const btnSaveDropdownName = document.getElementById('btn-collab-dropdown-save-name');
            const dropdownNameInput = document.getElementById('collab-dropdown-name-input');
            if (btnSaveDropdownName && dropdownNameInput) {
                btnSaveDropdownName.addEventListener('click', () => {
                    CollabModule.setUserName(dropdownNameInput.value);
                });
                dropdownNameInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        CollabModule.setUserName(dropdownNameInput.value);
                    }
                });
            }

            // Wire Master name save in share modal
            const btnSaveMasterNameModal = document.getElementById('btn-save-master-name-modal');
            const shareMasterInput = document.getElementById('share-master-name-input');
            if (btnSaveMasterNameModal && shareMasterInput) {
                btnSaveMasterNameModal.addEventListener('click', () => {
                    CollabModule.setUserName(shareMasterInput.value);
                });
                shareMasterInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        CollabModule.setUserName(shareMasterInput.value);
                    }
                });
            }

            // Wire Guest edit permission toggle in dropdown
            const dropdownGuestToggle = document.getElementById('collab-dropdown-guest-toggle');
            if (dropdownGuestToggle) {
                dropdownGuestToggle.addEventListener('change', () => {
                    CollabModule.setGuestsCanEdit(dropdownGuestToggle.checked);
                });
            }

            // Wire Guest edit permission toggle in share modal
            const shareModalGuestToggle = document.getElementById('share-modal-guest-toggle');
            if (shareModalGuestToggle) {
                shareModalGuestToggle.addEventListener('change', () => {
                    CollabModule.setGuestsCanEdit(shareModalGuestToggle.checked);
                });
            }

            // Wire Share Button in top bar
            const btnShare = document.getElementById('btn-share-board');
            if (btnShare) {
                btnShare.addEventListener('click', () => CollabModule.openShareModal());
            }

            // Wire Share Modal Buttons
            const btnCloseShare = document.getElementById('btn-close-share-modal');
            if (btnCloseShare) {
                btnCloseShare.addEventListener('click', () => CollabModule.closeShareModal());
            }

            const btnCopyEdit = document.getElementById('btn-copy-edit-link');
            if (btnCopyEdit) {
                btnCopyEdit.addEventListener('click', () => {
                    const input = document.getElementById('share-link-edit');
                    if (input) {
                        navigator.clipboard.writeText(input.value).then(() => {
                            if (typeof window.showToast === 'function') window.showToast('Copied edit link to clipboard!');
                        });
                    }
                });
            }

            const btnCopyView = document.getElementById('btn-copy-view-link');
            if (btnCopyView) {
                btnCopyView.addEventListener('click', () => {
                    const input = document.getElementById('share-link-view');
                    if (input) {
                        navigator.clipboard.writeText(input.value).then(() => {
                            if (typeof window.showToast === 'function') window.showToast('Copied view-only link to clipboard!');
                        });
                    }
                });
            }

            // Share Modal Tab Switching (Edit vs View-Only for QR Code)
            const tabEdit = document.getElementById('tab-share-edit');
            const tabView = document.getElementById('tab-share-view');
            const qrImg = document.getElementById('share-qr-code-img');

            if (tabEdit && tabView && qrImg) {
                tabEdit.addEventListener('click', () => {
                    tabEdit.classList.add('active');
                    tabView.classList.remove('active');
                    const input = document.getElementById('share-link-edit');
                    if (input) qrImg.src = `/api/qrcode?data=${encodeURIComponent(input.value)}`;
                });
                tabView.addEventListener('click', () => {
                    tabView.classList.add('active');
                    tabEdit.classList.remove('active');
                    const input = document.getElementById('share-link-view');
                    if (input) qrImg.src = `/api/qrcode?data=${encodeURIComponent(input.value)}`;
                });
            }

            // Room Password Setting in Share Modal
            const btnSetPassword = document.getElementById('btn-set-room-password');
            if (btnSetPassword) {
                btnSetPassword.addEventListener('click', () => {
                    const pwInput = document.getElementById('share-room-password-input');
                    const pw = pwInput ? pwInput.value.trim() : '';
                    CollabModule.send({
                        type: 'set_password',
                        password: pw || null
                    });
                    if (typeof window.showToast === 'function') {
                        window.showToast(pw ? 'Room password protected' : 'Room password removed');
                    }
                });
            }

            // Password Prompt Form Submission
            const btnSubmitPassword = document.getElementById('btn-submit-room-password');
            if (btnSubmitPassword) {
                btnSubmitPassword.addEventListener('click', () => {
                    const input = document.getElementById('room-password-input');
                    const pw = input ? input.value : '';
                    CollabModule.closePasswordModal();
                    CollabModule.connect(activeBoardId, pw);
                });
            }

            // Join Board Form Submission (prompts for display name before joining)
            const formJoin = document.getElementById('form-join-board');
            if (formJoin) {
                formJoin.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const input = document.getElementById('join-user-name-input');
                    const name = input ? input.value.trim() : '';
                    if (!name) {
                        if (input) input.focus();
                        return;
                    }
                    localStorage.setItem('whiteboard_user_name', name);
                    sessionStorage.setItem('whiteboard_joined_' + activeBoardId, '1');
                    CollabModule.closeJoinModal();
                    CollabModule.connect(activeBoardId);
                });
            }

            // Click interceptor: prevent view-only users from following .brand-link to /boards
            document.addEventListener('click', (e) => {
                const link = e.target.closest('.brand-link');
                if (link && document.body.classList.contains('view-only-mode')) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);

            // Initialize invisible shield for viewers
            CollabModule.initViewOnlyShield();

            // Ask for name before joining if not entered in this session
            const currentBoard = getActiveBoardId();
            const sessionJoined = sessionStorage.getItem('whiteboard_joined_' + currentBoard);
            const savedName = localStorage.getItem('whiteboard_user_name') || '';

            if (!sessionJoined || !savedName) {
                CollabModule.promptJoinModal(currentBoard, savedName);
            } else {
                CollabModule.connect(currentBoard);
            }
        }
    };

    // Exports
    window.WhiteboardApp.collab = CollabModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CollabModule.init());
    } else {
        CollabModule.init();
    }

})(window);

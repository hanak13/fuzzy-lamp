/**
 * Whiteboard Application - Shapes & Templates Module
 * static/js/shapes.js
 *
 * Handles built-in and JSON shapes library, flowchart symbols, custom user shapes (local storage),
 * and flowchart diagram templates gallery.
 */

(function () {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    const USER_SHAPES_STORAGE_KEY = 'whiteboard_user_custom_shapes';

    const BUILTIN_SHAPES = [
        {
            id: 'rectangle',
            name: 'Rectangle',
            category: 'Basic',
            isBuiltin: true,
            viewBox: '0 0 32 32',
            svgIcon: '<rect x="3" y="6" width="26" height="20" fill="none" stroke="currentColor" stroke-width="2"/>',
            create: (fill, stroke, strokeWidth) => new fabric.Rect({
                width: 120,
                height: 80,
                rx: 0,
                ry: 0,
                fill: fill,
                stroke: stroke,
                strokeWidth: strokeWidth,
                originX: 'center',
                originY: 'center'
            })
        },
        {
            id: 'rounded-rectangle',
            name: 'Rounded Rect',
            category: 'Basic',
            isBuiltin: true,
            viewBox: '0 0 32 32',
            svgIcon: '<rect x="3" y="6" width="26" height="20" rx="6" fill="none" stroke="currentColor" stroke-width="2"/>',
            create: (fill, stroke, strokeWidth) => new fabric.Rect({
                width: 120,
                height: 80,
                rx: 12,
                ry: 12,
                fill: fill,
                stroke: stroke,
                strokeWidth: strokeWidth,
                originX: 'center',
                originY: 'center'
            })
        },
        {
            id: 'circle',
            name: 'Circle',
            category: 'Basic',
            isBuiltin: true,
            viewBox: '0 0 32 32',
            svgIcon: '<circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" stroke-width="2"/>',
            create: (fill, stroke, strokeWidth) => new fabric.Circle({
                radius: 45,
                fill: fill,
                stroke: stroke,
                strokeWidth: strokeWidth,
                originX: 'center',
                originY: 'center'
            })
        },
        {
            id: 'triangle',
            name: 'Triangle',
            category: 'Basic',
            isBuiltin: true,
            viewBox: '0 0 32 32',
            svgIcon: '<polygon points="16,5 28,27 4,27" fill="none" stroke="currentColor" stroke-width="2"/>',
            create: (fill, stroke, strokeWidth) => new fabric.Triangle({
                width: 110,
                height: 90,
                fill: fill,
                stroke: stroke,
                strokeWidth: strokeWidth,
                originX: 'center',
                originY: 'center'
            })
        }
    ];

    let staticJsonShapes = [];
    let allShapes = [...BUILTIN_SHAPES];
    let allTemplates = [];

    let activeCategory = 'all';
    let activeFlowchartSection = 'all';

    function getCanvas() {
        return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
    }

    function getBoardBackgroundColor() {
        if (typeof window.getBoardBackgroundColor === 'function') {
            return window.getBoardBackgroundColor();
        }
        if (window.WhiteboardApp && window.WhiteboardApp.boards && typeof window.WhiteboardApp.boards.getBoardBackgroundColor === 'function') {
            return window.WhiteboardApp.boards.getBoardBackgroundColor();
        }
        const canvasContainer = document.getElementById('canvas-container');
        if (canvasContainer) {
            const bg = canvasContainer.style.getPropertyValue('--board-bg-color') || canvasContainer.style.backgroundColor;
            if (bg) return bg;
        }
        return '#f8fafc';
    }

    function hexToRgbValues(color) {
        if (!color) return null;
        let c = color.trim();
        if (c.startsWith('rgb')) {
            const m = c.match(/\d+/g);
            if (m && m.length >= 3) {
                return { r: parseInt(m[0], 10), g: parseInt(m[1], 10), b: parseInt(m[2], 10) };
            }
        }
        c = c.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        if (c.length === 6) {
            const n = parseInt(c, 16);
            return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
        }
        return null;
    }

    function getOppositeColorForBoard(boardBg, preferredColor) {
        const rgbBg = hexToRgbValues(boardBg) || { r: 248, g: 250, b: 252 };
        const lumBg = (rgbBg.r * 299 + rgbBg.g * 587 + rgbBg.b * 114) / 1000;
        const defaultOpposite = (lumBg < 128) ? '#f8fafc' : '#1e293b';

        if (!preferredColor) return defaultOpposite;

        const rgbPref = hexToRgbValues(preferredColor);
        if (!rgbPref) return defaultOpposite;

        const lumPref = (rgbPref.r * 299 + rgbPref.g * 587 + rgbPref.b * 114) / 1000;
        if (Math.abs(lumBg - lumPref) < 80) {
            return defaultOpposite;
        }
        return preferredColor;
    }

    function generateUid() {
        return 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7);
    }

    function getUserCustomShapes() {
        try {
            const raw = localStorage.getItem(USER_SHAPES_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to parse user custom shapes:', e);
            return [];
        }
    }

    function saveUserCustomShape(shapeItem) {
        const list = getUserCustomShapes();
        list.unshift(shapeItem);
        localStorage.setItem(USER_SHAPES_STORAGE_KEY, JSON.stringify(list));
        refreshAllShapes();
    }

    function deleteUserCustomShape(id) {
        let list = getUserCustomShapes();
        list = list.filter(item => item.id !== id);
        localStorage.setItem(USER_SHAPES_STORAGE_KEY, JSON.stringify(list));
        refreshAllShapes();
    }

    function refreshAllShapes() {
        const userShapes = getUserCustomShapes();
        allShapes = [...BUILTIN_SHAPES, ...staticJsonShapes, ...userShapes];
        renderShapesList();
    }

    async function loadShapes() {
        try {
            const res = await fetch('/static/shapes.json');
            if (res.ok) {
                const customShapes = await res.json();
                staticJsonShapes = customShapes.map(shape => ({
                    id: shape.id,
                    name: shape.name,
                    category: shape.category || 'Shapes',
                    section: shape.section || null,
                    tags: Array.isArray(shape.tags) ? shape.tags : [],
                    isBuiltin: false,
                    viewBox: shape.viewBox || '0 0 100 100',
                    svgIcon: `<path d="${shape.path}" fill="none" stroke="currentColor" stroke-width="6"/>`,
                    path: shape.path,
                    defaultWidth: shape.defaultWidth || 100,
                    defaultHeight: shape.defaultHeight || 100,
                    create: (fill, stroke, strokeWidth) => {
                        const pathObj = new fabric.Path(shape.path, {
                            fill: fill,
                            stroke: stroke,
                            strokeWidth: strokeWidth,
                            originX: 'center',
                            originY: 'center'
                        });
                        if (shape.defaultWidth && pathObj.width) {
                            const targetScale = shape.defaultWidth / pathObj.width;
                            pathObj.scale(targetScale);
                        }
                        return pathObj;
                    }
                }));
            }
        } catch (err) {
            console.error('Failed to load /static/shapes.json:', err);
        }
        refreshAllShapes();
    }

    function renderShapesList() {
        const shapesList = document.getElementById('shapes-list');
        const shapesSearch = document.getElementById('shapes-search');
        const fcSubsectionsEl = document.getElementById('flowchart-subsections');
        if (!shapesList) return;

        const query = (shapesSearch ? shapesSearch.value.trim().toLowerCase() : '');
        const isFlowchart = (activeCategory && activeCategory.toLowerCase() === 'flowchart');

        if (fcSubsectionsEl) {
            fcSubsectionsEl.style.display = isFlowchart ? 'flex' : 'none';
        }

        const filtered = allShapes.filter(s => {
            const matchesQuery = !query ||
                s.name.toLowerCase().includes(query) ||
                (s.category && s.category.toLowerCase().includes(query)) ||
                (s.section && s.section.toLowerCase().includes(query)) ||
                (Array.isArray(s.tags) && s.tags.some(t => t.toLowerCase().includes(query)));

            const matchesCategory = (activeCategory === 'all') ||
                (s.category && s.category.toLowerCase() === activeCategory.toLowerCase());

            let matchesSection = true;
            if (isFlowchart && activeFlowchartSection !== 'all') {
                matchesSection = (s.section === activeFlowchartSection);
            }

            return matchesQuery && matchesCategory && matchesSection;
        });

        shapesList.innerHTML = '';

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'shapes-empty';
            emptyEl.textContent = (activeCategory && activeCategory.toLowerCase() === 'my shapes')
                ? 'No saved shapes yet. Multi-select objects, merge them, then right-click "Save to My Shapes".'
                : 'No matching shapes';
            shapesList.appendChild(emptyEl);
            return;
        }

        filtered.forEach(shapeDef => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'shape-card';
            card.title = `Add ${shapeDef.name} (${shapeDef.category || 'Shape'})`;

            if (shapeDef.isUserCustom) {
                card.innerHTML = `
                    <button type="button" class="btn-delete-custom-shape" data-id="${shapeDef.id}" title="Delete this shape">&times;</button>
                    ${shapeDef.thumbnail 
                        ? `<img class="custom-shape-img" src="${shapeDef.thumbnail}" alt="${shapeDef.name}">` 
                        : `<svg viewBox="0 0 24 24" stroke="currentColor" fill="none" width="24" height="24"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`}
                    <span class="shape-card-name">${shapeDef.name}</span>
                `;

                const btnDel = card.querySelector('.btn-delete-custom-shape');
                if (btnDel) {
                    btnDel.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${shapeDef.name}" from My Shapes?`)) {
                            deleteUserCustomShape(shapeDef.id);
                            if (typeof window.showToast === 'function') {
                                window.showToast(`Deleted "${shapeDef.name}" from My Shapes`);
                            }
                        }
                    });
                }

                card.addEventListener('click', () => {
                    addUserCustomShapeToCanvas(shapeDef);
                });
            } else {
                card.innerHTML = `
                    <svg viewBox="${shapeDef.viewBox || '0 0 32 32'}">
                        ${shapeDef.svgIcon}
                    </svg>
                    <span class="shape-card-name">${shapeDef.name}</span>
                `;

                card.addEventListener('click', () => {
                    addShapeToCanvas(shapeDef);
                });
            }

            shapesList.appendChild(card);
        });
    }

    function addShapeToCanvas(shapeDef, x, y) {
        const canvas = getCanvas();
        if (!canvas) return;

        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        let targetX = (x !== undefined) ? x : (-vpt[4] + canvas.getWidth() / 2) / canvas.getZoom();
        let targetY = (y !== undefined) ? y : (-vpt[5] + canvas.getHeight() / 2) / canvas.getZoom();

        const slideFrameRect = window.__slideFrameRect || (window.WhiteboardApp && window.WhiteboardApp.slideFrameRect);
        const currentFrameRatio = window.__currentFrameRatio || 'infinite';

        if (x === undefined && currentFrameRatio !== 'infinite' && slideFrameRect) {
            targetX = slideFrameRect.left + slideFrameRect.width / 2;
            targetY = slideFrameRect.top + slideFrameRect.height / 2;
        }

        const strokeWidth = (window.strokeSize !== undefined ? window.strokeSize : 2);
        const fill = window.currentFillColor || 'transparent';
        const boardBg = getBoardBackgroundColor();
        const oppositeColor = getOppositeColorForBoard(boardBg, window.currentColor);
        const stroke = oppositeColor;

        const shapeObj = shapeDef.create(fill, stroke, strokeWidth);
        if (shapeDef.strokeDashArray) {
            shapeObj.set('strokeDashArray', shapeDef.strokeDashArray);
        }
        const currentScale = shapeObj.scaleX || 1;
        shapeObj.scale(currentScale * 0.85);
        const shapeBoundsWidth = shapeObj.getScaledWidth ? shapeObj.getScaledWidth() : (shapeObj.width || 100);
        const textWidth = Math.max(60, shapeBoundsWidth * 0.75);

        const textObj = new fabric.Textbox('', {
            width: textWidth,
            fontSize: 15,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fill: oppositeColor,
            textAlign: 'center',
            originX: 'center',
            originY: 'center',
            splitByGrapheme: true,
            cursorColor: oppositeColor
        });

        const group = new fabric.Group([shapeObj, textObj], {
            left: targetX,
            top: targetY,
            originX: 'center',
            originY: 'center',
            isShapeGroup: true,
            shapeId: shapeDef.id,
            shapeUid: generateUid(),
            subTargetCheck: false
        });

        group.connectedLines = [];

        canvas.add(group);
        if (typeof window.constrainObjectToSlideFrame === 'function') {
            window.constrainObjectToSlideFrame(group);
        }
        if (typeof window.setMode === 'function') {
            window.setMode('select');
        }
        canvas.setActiveObject(group);
        canvas.renderAll();
        if (typeof window.saveState === 'function') {
            window.saveState();
        }
    }

    function addUserCustomShapeToCanvas(shapeDef, x, y) {
        const canvas = getCanvas();
        if (!canvas || !shapeDef || !shapeDef.json) return;

        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const targetX = (x !== undefined) ? x : (-vpt[4] + canvas.getWidth() / 2) / canvas.getZoom();
        const targetY = (y !== undefined) ? y : (-vpt[5] + canvas.getHeight() / 2) / canvas.getZoom();

        fabric.util.enlivenObjects([shapeDef.json], (enlivenedObjects) => {
            if (!enlivenedObjects || enlivenedObjects.length === 0) return;
            const restoredObj = enlivenedObjects[0];

            restoredObj.set({
                left: targetX,
                top: targetY,
                originX: 'center',
                originY: 'center',
                shapeUid: generateUid(),
                selectable: (window.currentMode === 'select'),
                evented: true
            });

            restoredObj.setCoords();
            canvas.add(restoredObj);
            if (window.currentMode === 'select') {
                canvas.setActiveObject(restoredObj);
            }
            canvas.renderAll();
            if (typeof window.saveState === 'function') {
                window.saveState();
            }
            if (typeof window.showToast === 'function') {
                window.showToast(`Added "${shapeDef.name}" to canvas`);
            }
        });
    }

    // --- Templates Subsystem ---
    async function loadTemplates() {
        try {
            const res = await fetch('/static/templates.json');
            if (res.ok) {
                allTemplates = await res.json();
                renderTemplatesList();
            }
        } catch (err) {
            console.error('Failed to load /static/templates.json:', err);
        }
    }

    function renderTemplatesList() {
        const templatesList = document.getElementById('templates-list');
        const templatesSearch = document.getElementById('templates-search');
        if (!templatesList) return;

        const query = (templatesSearch ? templatesSearch.value.trim().toLowerCase() : '');

        const filtered = allTemplates.filter(t => {
            return !query ||
                t.name.toLowerCase().includes(query) ||
                (t.category && t.category.toLowerCase().includes(query)) ||
                (t.description && t.description.toLowerCase().includes(query)) ||
                (t.badge && t.badge.toLowerCase().includes(query));
        });

        templatesList.innerHTML = '';

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'shapes-empty';
            emptyEl.textContent = 'No matching templates found';
            templatesList.appendChild(emptyEl);
            return;
        }

        filtered.forEach(tpl => {
            const card = document.createElement('div');
            card.className = 'template-card';
            const nodeCount = (tpl.nodes && tpl.nodes.length) ? tpl.nodes.length : 0;
            const connCount = (tpl.connections && tpl.connections.length) ? tpl.connections.length : 0;

            card.innerHTML = `
                <div class="template-card-header">
                    <span class="template-card-title">${tpl.name}</span>
                    <span class="template-card-badge">${tpl.badge || tpl.category}</span>
                </div>
                <div class="template-card-desc">${tpl.description}</div>
                <div class="template-card-footer">
                    <span class="template-node-count">${nodeCount} steps &bull; ${connCount} links</span>
                    <button type="button" class="template-btn-insert">Insert &rarr;</button>
                </div>
            `;

            card.addEventListener('click', () => {
                loadTemplateOntoCanvas(tpl);
            });

            templatesList.appendChild(card);
        });
    }

    function loadTemplateOntoCanvas(templateDef) {
        const canvas = getCanvas();
        if (!canvas || !templateDef || !templateDef.nodes || templateDef.nodes.length === 0) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        templateDef.nodes.forEach(n => {
            const nw = n.width || 120;
            const nh = n.height || 70;
            minX = Math.min(minX, n.x - nw / 2);
            maxX = Math.max(maxX, n.x + nw / 2);
            minY = Math.min(minY, n.y - nh / 2);
            maxY = Math.max(maxY, n.y + nh / 2);
        });

        const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
        const zoom = canvas.getZoom();
        const centerX = (-vpt[4] + canvas.getWidth() / 2) / zoom;
        const centerY = (-vpt[5] + canvas.getHeight() / 2) / zoom;
        const templateCenterOrigX = (minX + maxX) / 2;
        const templateCenterOrigY = (minY + maxY) / 2;
        const dx = centerX - templateCenterOrigX;
        const dy = centerY - templateCenterOrigY;

        const nodeMap = {};
        const boardBg = getBoardBackgroundColor();
        const rgbBg = hexToRgbValues(boardBg) || { r: 248, g: 250, b: 252 };
        const isDarkBoard = ((rgbBg.r * 299 + rgbBg.g * 587 + rgbBg.b * 114) / 1000) < 128;
        const nodeTextColor = isDarkBoard ? '#f8fafc' : '#1e293b';
        const defaultConnColor = isDarkBoard ? '#94a3b8' : '#475569';

        templateDef.nodes.forEach(node => {
            const posX = node.x + dx;
            const posY = node.y + dy;
            const nodeWidth = node.width || 120;
            const nodeHeight = node.height || 70;

            const shapeDef = allShapes.find(s => s.id === node.shapeId) || allShapes.find(s => s.id === 'fc-basic-process');
            let shapeObj;
            const fillCol = isDarkBoard ? (node.fill === '#eff6ff' ? '#1e293b' : (node.fill || '#1e293b')) : (node.fill || '#eff6ff');
            const strokeCol = isDarkBoard ? (node.stroke || '#60a5fa') : (node.stroke || '#3b82f6');

            if (shapeDef && shapeDef.path) {
                shapeObj = new fabric.Path(shapeDef.path, {
                    fill: fillCol,
                    stroke: strokeCol,
                    strokeWidth: 2,
                    originX: 'center',
                    originY: 'center'
                });
                if (shapeObj.width) {
                    const scaleX = nodeWidth / shapeObj.width;
                    const scaleY = nodeHeight / (shapeObj.height || 100);
                    shapeObj.scaleX = scaleX;
                    shapeObj.scaleY = scaleY;
                }
            } else {
                shapeObj = new fabric.Rect({
                    width: nodeWidth,
                    height: nodeHeight,
                    rx: 8,
                    ry: 8,
                    fill: fillCol,
                    stroke: strokeCol,
                    strokeWidth: 2,
                    originX: 'center',
                    originY: 'center'
                });
            }

            const textObj = new fabric.Textbox(node.text || '', {
                width: Math.max(60, nodeWidth - 20),
                fontSize: 13,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fill: nodeTextColor,
                fontWeight: 600,
                textAlign: 'center',
                originX: 'center',
                originY: 'center',
                splitByGrapheme: true,
                cursorColor: nodeTextColor
            });

            const group = new fabric.Group([shapeObj, textObj], {
                left: posX,
                top: posY,
                originX: 'center',
                originY: 'center',
                isShapeGroup: true,
                shapeId: node.shapeId,
                shapeUid: generateUid(),
                subTargetCheck: false
            });

            group.connectedLines = [];
            nodeMap[node.id] = group;
            canvas.add(group);
        });

        if (Array.isArray(templateDef.connections)) {
            templateDef.connections.forEach(conn => {
                const fromNode = nodeMap[conn.from];
                const toNode = nodeMap[conn.to];
                if (!fromNode || !toNode) return;

                const getPair = (window.WhiteboardApp && window.WhiteboardApp.tools && window.WhiteboardApp.tools.getBestAnchorPair)
                    || window.getBestAnchorPair;
                const pair = getPair ? getPair(fromNode, toNode) : null;
                const p1 = pair ? (pair.p1 || pair.from) : fromNode.getCenterPoint();
                const p2 = pair ? (pair.p2 || pair.to) : toNode.getCenterPoint();

                const line = new fabric.Line([p1.x, p1.y, p2.x, p2.y], {
                    stroke: defaultConnColor,
                    strokeWidth: 2,
                    selectable: true,
                    isConnector: true,
                    hasArrow: true,
                    arrowHeadStyle: 'end',
                    fromShapeUid: fromNode.shapeUid,
                    toShapeUid: toNode.shapeUid,
                    fromShape: fromNode,
                    toShape: toNode,
                    objectCaching: false
                });

                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
                const arrowHead = new fabric.Triangle({
                    left: p2.x,
                    top: p2.y,
                    originX: 'center',
                    originY: 'center',
                    pointType: 'arrow_end',
                    angle: angle + 90,
                    width: 12,
                    height: 12,
                    fill: defaultConnColor,
                    selectable: false,
                    evented: false,
                    isArrowHead: true
                });

                line.arrowHead = arrowHead;
                fromNode.connectedLines.push(line);
                toNode.connectedLines.push(line);

                canvas.add(line);
                canvas.add(arrowHead);
            });
        }

        if (typeof window.setMode === 'function') {
            window.setMode('select');
        }
        canvas.renderAll();
        if (typeof window.saveState === 'function') {
            window.saveState();
        }
        if (typeof window.showToast === 'function') {
            window.showToast(`Template "${templateDef.name}" inserted!`);
        }
    }

    function initShapesUI() {
        const categoryChips = document.querySelectorAll('.category-chip');
        const fcSubPills = document.querySelectorAll('.fc-sub-pill');
        const btnCatPrev = document.getElementById('btn-cat-prev');
        const btnCatNext = document.getElementById('btn-cat-next');
        const shapesCategoriesEl = document.getElementById('shapes-categories');
        const shapesSearch = document.getElementById('shapes-search');
        const btnClearShapesSearch = document.getElementById('btn-clear-shapes-search');
        const templatesSearch = document.getElementById('templates-search');
        const btnClearTemplatesSearch = document.getElementById('btn-clear-templates-search');

        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                categoryChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                activeCategory = chip.dataset.category || 'all';
                renderShapesList();
            });
        });

        fcSubPills.forEach(pill => {
            pill.addEventListener('click', () => {
                fcSubPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                activeFlowchartSection = pill.dataset.section || 'all';
                renderShapesList();
            });
        });

        if (btnCatPrev && shapesCategoriesEl) {
            btnCatPrev.addEventListener('click', () => {
                shapesCategoriesEl.scrollBy({ left: -140, behavior: 'smooth' });
            });
        }
        if (btnCatNext && shapesCategoriesEl) {
            btnCatNext.addEventListener('click', () => {
                shapesCategoriesEl.scrollBy({ left: 140, behavior: 'smooth' });
            });
        }
        if (shapesCategoriesEl) {
            shapesCategoriesEl.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    shapesCategoriesEl.scrollLeft += e.deltaY;
                }
            });
        }

        if (shapesSearch) {
            shapesSearch.addEventListener('input', () => {
                if (btnClearShapesSearch) {
                    btnClearShapesSearch.style.display = shapesSearch.value ? 'block' : 'none';
                }
                renderShapesList();
            });
        }
        if (btnClearShapesSearch) {
            btnClearShapesSearch.addEventListener('click', () => {
                shapesSearch.value = '';
                btnClearShapesSearch.style.display = 'none';
                shapesSearch.focus();
                renderShapesList();
            });
        }

        if (templatesSearch) {
            templatesSearch.addEventListener('input', () => {
                if (btnClearTemplatesSearch) {
                    btnClearTemplatesSearch.style.display = templatesSearch.value ? 'block' : 'none';
                }
                renderTemplatesList();
            });
        }
        if (btnClearTemplatesSearch) {
            btnClearTemplatesSearch.addEventListener('click', () => {
                templatesSearch.value = '';
                btnClearTemplatesSearch.style.display = 'none';
                templatesSearch.focus();
                renderTemplatesList();
            });
        }

        // Self-load shape definitions and templates
        loadShapes();
        loadTemplates();
    }

    function saveActiveObjectAsCustomShape() {
        const canvas = getCanvas();
        if (!canvas) return;
        const activeObj = canvas.getActiveObject();
        if (!activeObj) {
            if (typeof window.showToast === 'function') window.showToast('Select a merged shape or diagram to save');
            return;
        }

        if (activeObj.type === 'activeSelection') {
            if (typeof window.showToast === 'function') window.showToast('Please merge objects first, then right-click Save');
            return;
        }

        const defaultName = activeObj.isMergedShape ? 'Merged Diagram' : (activeObj.shapeId || 'Custom Shape');
        const shapeName = prompt('Enter a name for your custom shape:', defaultName);
        if (!shapeName || !shapeName.trim()) return;

        let thumbnail = '';
        try {
            thumbnail = activeObj.toDataURL({
                format: 'png',
                multiplier: 0.5,
                enableRetinaScaling: false
            });
        } catch (err) {
            console.warn('Could not generate thumbnail for custom shape:', err);
        }

        const EXTRA_PROPS = window.EXTRA_PROPS || ['shapeUid', 'connectedLines', 'isConnector', 'isArrowHead', 'isStepBox', 'stepBoxId', 'stepBoxName', 'stepBoxSteps', 'stepBoxCurrentStep', 'stepBoxOwnerId', 'isStickyNote', 'stickyColor', 'isSticker', 'imageName'];
        const serializedJson = activeObj.toJSON(EXTRA_PROPS);

        const newCustomShape = {
            id: 'custom_shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            name: shapeName.trim(),
            category: 'My Shapes',
            isUserCustom: true,
            thumbnail: thumbnail,
            json: serializedJson,
            createdAt: Date.now()
        };

        saveUserCustomShape(newCustomShape);

        window.activeCategory = 'My Shapes';
        const categoryChips = document.querySelectorAll('.category-chip');
        categoryChips.forEach(chip => {
            chip.classList.toggle('active', chip.dataset.category === 'My Shapes');
        });

        if (typeof window.openDrawerPanel === 'function') window.openDrawerPanel('shapes');
        renderShapesList();
        if (typeof window.showToast === 'function') window.showToast(`Saved "${shapeName.trim()}" to My Shapes!`);
    }

    function addBuiltinShape(shapeId) {
        const shapeDef = allShapes.find(s => s.id === shapeId);
        if (shapeDef) {
            addShapeToCanvas(shapeDef);
            if (typeof window.showToast === 'function') {
                window.showToast(`Added ${shapeDef.name} (${shapeId === 'rectangle' ? 'R' : 'C'})`);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShapesUI);
    } else {
        initShapesUI();
    }

    const ShapesModule = {
        BUILTIN_SHAPES,
        get allShapes() { return allShapes; },
        get allTemplates() { return allTemplates; },
        generateUid,
        getUserCustomShapes,
        saveUserCustomShape,
        deleteUserCustomShape,
        refreshAllShapes,
        loadShapes,
        renderShapesList,
        addShapeToCanvas,
        addUserCustomShapeToCanvas,
        loadTemplates,
        renderTemplatesList,
        loadTemplateOntoCanvas,
        saveActiveObjectAsCustomShape,
        addBuiltinShape
    };

    window.WhiteboardApp.shapes = ShapesModule;

    // Direct global exports for backwards compatibility
    window.generateUid = generateUid;
    window.getUserCustomShapes = getUserCustomShapes;
    window.saveUserCustomShape = saveUserCustomShape;
    window.deleteUserCustomShape = deleteUserCustomShape;
    window.refreshAllShapes = refreshAllShapes;
    window.loadShapes = loadShapes;
    window.renderShapesList = renderShapesList;
    window.addShapeToCanvas = addShapeToCanvas;
    window.addUserCustomShapeToCanvas = addUserCustomShapeToCanvas;
    window.loadTemplates = loadTemplates;
    window.renderTemplatesList = renderTemplatesList;
    window.loadTemplateOntoCanvas = loadTemplateOntoCanvas;
    window.saveActiveObjectAsCustomShape = saveActiveObjectAsCustomShape;
    window.addBuiltinShape = addBuiltinShape;
})();

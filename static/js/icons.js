/**
 * Whiteboard Application - Vector Icons Library Module
 * static/js/icons.js
 *
 * Implements:
 * - Offline vector icons library (Lucide Icons, ISC License)
 * - Side drawer panel with search by name and tags
 * - Category tabs (Arrows, Files, Communication, Devices, Business, Weather, People, Symbols)
 * - Drag-and-drop & click-to-place as native Fabric.js vector objects
 * - Vector sharpness (objectCaching: false) at any scale or zoom
 * - Stroke color, fill color, and stroke width customization synced with main toolbar
 * - Recent icons row (last 12 icons in localStorage)
 * - Full serialization & export support (JSON, PNG, SVG, PDF, PPTX, Step Boxes, Slides)
 */

(function (window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    const RECENT_KEY = 'whiteboard_recent_icons';
    const MAX_RECENT = 12;

    let iconsData = null;
    let activeCategory = 'all';
    let searchQuery = '';
    let isInitialized = false;

    function getCanvas() {
        return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
    }

    // -------------------------------------------------------------------------
    // 1. Data Loading & Recent Icons Management
    // -------------------------------------------------------------------------
    async function fetchIconsData() {
        if (iconsData && iconsData.length > 0) return iconsData;
        try {
            const res = await fetch('/static/icons.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            iconsData = await res.json();
            const countPill = document.getElementById('icons-count-pill');
            if (countPill) countPill.textContent = iconsData.length;
            return iconsData;
        } catch (e) {
            console.error('Failed to load /static/icons.json:', e);
            if (typeof window.showToast === 'function') {
                window.showToast('Could not load vector icons library');
            }
            return [];
        }
    }

    function getRecentIcons() {
        try {
            const raw = localStorage.getItem(RECENT_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    function addRecentIcon(iconName) {
        if (!iconName) return;
        try {
            let list = getRecentIcons();
            list = [iconName, ...list.filter(n => n !== iconName)].slice(0, MAX_RECENT);
            localStorage.setItem(RECENT_KEY, JSON.stringify(list));
            renderRecentRow();
        } catch (e) {
            console.warn('Error saving recent icons:', e);
        }
    }

    function clearRecentIcons() {
        localStorage.removeItem(RECENT_KEY);
        renderRecentRow();
        if (typeof window.showToast === 'function') {
            window.showToast('Cleared recent icons');
        }
    }

    // -------------------------------------------------------------------------
    // 2. Styling Helpers for Fabric.js Vector Icons
    // -------------------------------------------------------------------------
    function setIconStyles(iconObj, { stroke, fill, strokeWidth }) {
        if (!iconObj || !iconObj.isIcon) return;

        const children = iconObj.getObjects ? iconObj.getObjects() : [iconObj];
        const isTransparent = !fill || fill === 'transparent' || fill === 'none' || fill === 'rgba(0,0,0,0)';

        if (stroke !== undefined && stroke !== null) {
            iconObj.set('stroke', stroke);
            children.forEach(child => {
                if (child.stroke !== undefined) child.set('stroke', stroke);
            });
        }

        if (fill !== undefined && fill !== null) {
            const resolvedFill = isTransparent ? 'transparent' : fill;
            iconObj.set('fill', resolvedFill);
            children.forEach(child => {
                // If fill is transparent, keep shapes outline-only; if colored, apply fill
                child.set('fill', resolvedFill);
            });
        }

        if (strokeWidth !== undefined && strokeWidth !== null) {
            const sw = Math.max(0.5, Number(strokeWidth) || 2);
            iconObj.set('strokeWidth', sw);
            children.forEach(child => {
                if (child.strokeWidth !== undefined) child.set('strokeWidth', sw);
            });
        }

        iconObj.setCoords();
    }

    function setIconStrokeColor(iconObj, color) {
        setIconStyles(iconObj, { stroke: color });
    }

    function setIconFillColor(iconObj, fill) {
        setIconStyles(iconObj, { fill: fill });
    }

    function setIconStrokeWidth(iconObj, width) {
        setIconStyles(iconObj, { strokeWidth: width });
    }

    // -------------------------------------------------------------------------
    // 3. Canvas Placement
    // -------------------------------------------------------------------------
    function placeIconOnCanvas(iconData, x, y) {
        const canvas = getCanvas();
        if (!canvas || !iconData || !iconData.svg) return;

        // Viewport center if coordinates not supplied
        if (x === null || x === undefined || y === null || y === undefined) {
            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = canvas.getZoom() || 1;
            x = (-vpt[4] + canvas.getWidth() / 2) / zoom;
            y = (-vpt[5] + canvas.getHeight() / 2) / zoom;
        }

        fabric.loadSVGFromString(iconData.svg, function (objects, options) {
            if (!objects || objects.length === 0) return;

            const iconGroup = fabric.util.groupSVGElements(objects, options);

            const strokeColor = window.currentColor || '#1e293b';
            const currentFill = window.currentFillColor || 'transparent';
            const fillColor = (currentFill === 'none' || currentFill === 'transparent' || currentFill === 'rgba(0,0,0,0)')
                ? 'transparent'
                : currentFill;
            const strokeWidth = window.strokeSize || 2;

            iconGroup.set({
                left: x,
                top: y,
                originX: 'center',
                originY: 'center',
                scaleX: 2.5,
                scaleY: 2.5,
                objectCaching: false, // Ensures vector sharpness when zoomed or scaled
                strokeUniform: true,
                isIcon: true,
                iconName: iconData.name,
                iconCategory: iconData.category || 'Symbols',
                iconSvg: iconData.svg,
                cornerColor: '#3b82f6',
                cornerSize: 8,
                transparentCorners: false
            });

            setIconStyles(iconGroup, {
                stroke: strokeColor,
                fill: fillColor,
                strokeWidth: strokeWidth
            });

            // Slide frame constraint if inside active slide
            if (typeof window.constrainObjectToSlideFrame === 'function') {
                window.constrainObjectToSlideFrame(iconGroup);
            }
            if (typeof window.applySlideClip === 'function') {
                window.applySlideClip(iconGroup);
            }

            canvas.add(iconGroup);
            canvas.setActiveObject(iconGroup);
            canvas.requestRenderAll();

            if (typeof window.saveState === 'function') window.saveState();
            if (typeof window.updatePropertiesUIForSelection === 'function') {
                window.updatePropertiesUIForSelection(iconGroup);
            }
            if (typeof window.updateObjectsCountBadges === 'function') {
                window.updateObjectsCountBadges();
            }

            addRecentIcon(iconData.name);
        });
    }

    // -------------------------------------------------------------------------
    // 4. UI Rendering (Grid, Category Chips, Recent Row)
    // -------------------------------------------------------------------------
    function renderRecentRow() {
        const container = document.getElementById('icons-recent-container');
        const row = document.getElementById('icons-recent-row');
        if (!container || !row || !iconsData) return;

        const recentNames = getRecentIcons();
        if (!recentNames || recentNames.length === 0) {
            container.style.display = 'none';
            row.innerHTML = '';
            return;
        }

        const iconMap = new Map();
        iconsData.forEach(item => iconMap.set(item.name, item));

        const matched = recentNames.map(name => iconMap.get(name)).filter(Boolean);
        if (matched.length === 0) {
            container.style.display = 'none';
            row.innerHTML = '';
            return;
        }

        container.style.display = 'block';
        row.innerHTML = '';

        matched.forEach(icon => {
            const chip = document.createElement('div');
            chip.className = 'icon-recent-chip';
            chip.title = `${icon.name} (${icon.category})`;
            chip.setAttribute('draggable', 'true');
            chip.innerHTML = `
                <div class="icon-recent-preview">${icon.svg}</div>
                <span class="icon-recent-name">${icon.name}</span>
            `;

            chip.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'icon',
                    name: icon.name,
                    category: icon.category,
                    svg: icon.svg
                }));
                e.dataTransfer.effectAllowed = 'copy';
            });

            chip.addEventListener('click', () => {
                placeIconOnCanvas(icon);
            });

            row.appendChild(chip);
        });
    }

    function renderIconsGrid() {
        const grid = document.getElementById('icons-grid');
        const emptyState = document.getElementById('icons-empty-state');
        if (!grid || !iconsData) return;

        const q = (searchQuery || '').trim().toLowerCase();
        const filtered = iconsData.filter(icon => {
            // Category check
            if (activeCategory !== 'all' && icon.category !== activeCategory) {
                return false;
            }
            // Search query check (matches name or tags)
            if (q) {
                const nameMatch = icon.name.toLowerCase().includes(q);
                const tagMatch = icon.tags && icon.tags.some(t => t.toLowerCase().includes(q));
                if (!nameMatch && !tagMatch) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            grid.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        grid.innerHTML = '';

        const frag = document.createDocumentFragment();
        filtered.forEach(icon => {
            const card = document.createElement('div');
            card.className = 'icon-card';
            card.title = `${icon.name} [${icon.category}]\nTags: ${(icon.tags || []).join(', ')}`;
            card.setAttribute('draggable', 'true');

            card.innerHTML = `
                <div class="icon-card-preview">${icon.svg}</div>
                <span class="icon-card-name">${icon.name}</span>
            `;

            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'icon',
                    name: icon.name,
                    category: icon.category,
                    svg: icon.svg
                }));
                e.dataTransfer.effectAllowed = 'copy';
            });

            card.addEventListener('click', () => {
                placeIconOnCanvas(icon);
            });

            frag.appendChild(card);
        });

        grid.appendChild(frag);
    }

    async function renderIconsPanel() {
        await fetchIconsData();
        renderRecentRow();
        renderIconsGrid();
    }

    // -------------------------------------------------------------------------
    // 5. Canvas Drag & Drop and Event Binding
    // -------------------------------------------------------------------------
    function setupDragAndDrop() {
        const canvasContainer = document.getElementById('canvas-container');
        if (!canvasContainer) return;

        canvasContainer.addEventListener('dragover', (e) => {
            if (e.dataTransfer && e.dataTransfer.types.includes('application/json')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                canvasContainer.classList.add('drag-over-active');
            }
        });

        canvasContainer.addEventListener('dragleave', () => {
            canvasContainer.classList.remove('drag-over-active');
        });

        canvasContainer.addEventListener('drop', (e) => {
            canvasContainer.classList.remove('drag-over-active');
            const raw = e.dataTransfer ? e.dataTransfer.getData('application/json') : null;
            if (!raw) return;

            try {
                const data = JSON.parse(raw);
                if (data && data.type === 'icon') {
                    e.preventDefault();
                    e.stopPropagation();
                    const canvas = getCanvas();
                    const pointer = canvas ? canvas.getPointer(e) : { x: null, y: null };
                    placeIconOnCanvas(data, pointer.x, pointer.y);
                }
            } catch (err) {
                // Not a valid JSON drag payload
            }
        });
    }

    function initIconsUI() {
        if (isInitialized) return;
        isInitialized = true;

        // Search input
        const searchInput = document.getElementById('icons-search');
        const clearBtn = document.getElementById('btn-clear-icons-search');

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                if (clearBtn) {
                    clearBtn.style.display = searchQuery ? 'block' : 'none';
                }
                renderIconsGrid();
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                searchQuery = '';
                clearBtn.style.display = 'none';
                renderIconsGrid();
                if (searchInput) searchInput.focus();
            });
        }

        // Category filter chips
        const categoryChips = document.querySelectorAll('.icon-cat-chip');
        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                categoryChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                activeCategory = chip.dataset.category || 'all';
                renderIconsGrid();
            });
        });

        // Category horizontal navigation buttons
        const catPrevBtn = document.getElementById('btn-icon-cat-prev');
        const catNextBtn = document.getElementById('btn-icon-cat-next');
        const catScrollEl = document.getElementById('icons-categories');

        if (catPrevBtn && catScrollEl) {
            catPrevBtn.addEventListener('click', () => {
                catScrollEl.scrollBy({ left: -140, behavior: 'smooth' });
            });
        }
        if (catNextBtn && catScrollEl) {
            catNextBtn.addEventListener('click', () => {
                catScrollEl.scrollBy({ left: 140, behavior: 'smooth' });
            });
        }

        // Clear recent button
        const btnClearRecent = document.getElementById('btn-clear-recent-icons');
        if (btnClearRecent) {
            btnClearRecent.addEventListener('click', (e) => {
                e.stopPropagation();
                clearRecentIcons();
            });
        }

        setupDragAndDrop();

        // Pre-fetch manifest in background
        fetchIconsData().then(() => {
            renderRecentRow();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initIconsUI);
    } else {
        initIconsUI();
    }

    const IconsModule = {
        fetchIconsData,
        renderIconsPanel,
        placeIconOnCanvas,
        setIconStyles,
        setIconStrokeColor,
        setIconFillColor,
        setIconStrokeWidth,
        getRecentIcons,
        clearRecentIcons
    };

    window.WhiteboardApp.icons = IconsModule;

    // Global exports for backwards compatibility & direct calling
    window.renderIconsPanel = renderIconsPanel;
    window.placeIconOnCanvas = placeIconOnCanvas;
    window.setIconStrokeColor = setIconStrokeColor;
    window.setIconFillColor = setIconFillColor;
    window.setIconStrokeWidth = setIconStrokeWidth;

})(window);

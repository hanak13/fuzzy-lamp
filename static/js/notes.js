/**
 * Whiteboard Application - Notes & Stickers Module
 * static/js/notes.js
 *
 * Implements:
 * - Sticky notes creation with pastel color palettes (Yellow, Pink, Green, Blue)
 * - Sticky note color picker and dynamic active note restyling
 * - Stickers library gallery, instant search, and local image uploads
 * - Canvas placement and drag-and-drop support for sticker assets
 */

(function (window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    const STICKY_COLORS = {
        yellow: { bg: '#fef08a', border: '#fde047', text: '#1e293b' },
        pink: { bg: '#fbcfe8', border: '#f9a8d4', text: '#1e293b' },
        green: { bg: '#bbf7d0', border: '#86efac', text: '#1e293b' },
        blue: { bg: '#bfdbfe', border: '#93c5fd', text: '#1e293b' }
    };

    let currentStickyColor = 'yellow';
    let allStickers = [];

    function getCanvas() {
        return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
    }

    function generateUid() {
        if (window.WhiteboardApp && window.WhiteboardApp.shapes && typeof window.WhiteboardApp.shapes.generateUid === 'function') {
            return window.WhiteboardApp.shapes.generateUid();
        }
        return 'shape_' + Date.now() + '_' + Math.random().toString(36).substr(2, 7);
    }

    // -------------------------------------------------------------------------
    // 1. Sticky Note Factory Function
    // -------------------------------------------------------------------------
    function createStickyNote(x, y, colorKey = currentStickyColor, initialText = 'Type a note...') {
        const colors = STICKY_COLORS[colorKey] || STICKY_COLORS.yellow;
        const noteWidth = 180;
        const noteHeight = 180;

        const rect = new fabric.Rect({
            width: noteWidth,
            height: noteHeight,
            fill: colors.bg,
            stroke: colors.border,
            strokeWidth: 1.5,
            rx: 6,
            ry: 6,
            originX: 'center',
            originY: 'center',
            shadow: new fabric.Shadow({
                color: 'rgba(0, 0, 0, 0.12)',
                blur: 10,
                offsetX: 2,
                offsetY: 4
            })
        });

        const text = new fabric.Textbox(initialText, {
            width: noteWidth - 28,
            fontSize: 16,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fill: colors.text,
            textAlign: 'left',
            originX: 'center',
            originY: 'center',
            splitByGrapheme: true,
            cursorColor: colors.text
        });

        const group = new fabric.Group([rect, text], {
            left: x,
            top: y,
            originX: 'center',
            originY: 'center',
            isStickyNote: true,
            stickyColor: colorKey,
            shapeUid: generateUid(),
            subTargetCheck: false
        });

        group.connectedLines = [];

        return { group, rect, text };
    }

    function setStickyColor(colorKey, shouldUpdateSelection = true) {
        currentStickyColor = colorKey;

        const stickyColorBtns = document.querySelectorAll('.sticky-color-btn');
        stickyColorBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === colorKey);
        });

        if (shouldUpdateSelection) {
            const canvas = getCanvas();
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (activeObj && activeObj.isStickyNote) {
                const colors = STICKY_COLORS[colorKey] || STICKY_COLORS.yellow;
                activeObj.stickyColor = colorKey;
                const rectChild = activeObj.getObjects().find(o => o.type === 'rect');
                const textChild = activeObj.getObjects().find(o => o.type === 'textbox' || o.type === 'i-text');

                if (rectChild) {
                    rectChild.set('fill', colors.bg);
                    rectChild.set('stroke', colors.border);
                }
                if (textChild) {
                    textChild.set('fill', colors.text);
                    textChild.set('cursorColor', colors.text);
                }
                canvas.requestRenderAll();
                if (typeof window.saveState === 'function') window.saveState();
            }
        }
    }

    // -------------------------------------------------------------------------
    // 2. Stickers Gallery & Local Storage Controller
    // -------------------------------------------------------------------------
    async function loadStickers() {
        const stickersCountBadge = document.getElementById('stickers-count-badge');
        try {
            const res = await fetch('/api/stickers');
            if (res.ok) {
                allStickers = await res.json();
                if (stickersCountBadge) {
                    stickersCountBadge.textContent = `${allStickers.length} Sticker${allStickers.length === 1 ? '' : 's'}`;
                }
                renderStickersGallery();
            }
        } catch (err) {
            console.error('Failed to load /api/stickers:', err);
        }
    }

    function renderStickersGallery() {
        const stickersGallery = document.getElementById('stickers-gallery');
        const stickersSearch = document.getElementById('stickers-search');
        if (!stickersGallery) return;

        const query = (stickersSearch ? stickersSearch.value.trim().toLowerCase() : '');

        const filtered = allStickers.filter(s => {
            return !query || s.name.toLowerCase().includes(query) || s.ext.toLowerCase().includes(query);
        });

        stickersGallery.innerHTML = '';

        if (filtered.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'shapes-empty';
            emptyEl.style.gridColumn = 'span 3';
            emptyEl.textContent = query ? 'No matching stickers found' : 'No stickers yet. Upload PNG, SVG or GIF files above!';
            stickersGallery.appendChild(emptyEl);
            return;
        }

        filtered.forEach(sticker => {
            const card = document.createElement('div');
            card.className = 'sticker-card';
            card.draggable = true;
            card.title = `Click or drag "${sticker.name}" onto canvas`;

            card.innerHTML = `
                <span class="sticker-format-badge">.${sticker.ext}</span>
                <button type="button" class="btn-delete-sticker" data-filename="${sticker.filename}" title="Delete sticker">&times;</button>
                <div class="sticker-thumbnail-wrapper">
                    <img class="sticker-thumbnail" src="${sticker.url}" alt="${sticker.name}" loading="lazy">
                </div>
                <span class="sticker-name">${sticker.name}</span>
            `;

            // Drag from gallery
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', sticker.url);
                e.dataTransfer.setData('application/json', JSON.stringify(sticker));
                e.dataTransfer.effectAllowed = 'copy';
            });

            // Click to add to viewport center
            card.addEventListener('click', (e) => {
                if (e.target.closest('.btn-delete-sticker')) return;
                const canvas = getCanvas();
                if (!canvas) return;
                const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
                const zoom = canvas.getZoom();
                const centerX = (-vpt[4] + canvas.getWidth() / 2) / zoom;
                const centerY = (-vpt[5] + canvas.getHeight() / 2) / zoom;
                addStickerToCanvas(sticker.url, centerX, centerY);
            });

            // Delete sticker
            const btnDel = card.querySelector('.btn-delete-sticker');
            if (btnDel) {
                btnDel.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete sticker "${sticker.name}" from library?`)) return;
                    try {
                        const res = await fetch(`/api/stickers/${encodeURIComponent(sticker.filename)}`, {
                            method: 'DELETE'
                        });
                        if (res.ok) {
                            if (typeof window.showToast === 'function') window.showToast(`Sticker "${sticker.name}" deleted`);
                            loadStickers();
                        } else {
                            if (typeof window.showToast === 'function') window.showToast('Failed to delete sticker');
                        }
                    } catch (err) {
                        console.error('Delete error:', err);
                        if (typeof window.showToast === 'function') window.showToast('Error deleting sticker');
                    }
                });
            }

            stickersGallery.appendChild(card);
        });
    }

    function addStickerToCanvas(url, x, y) {
        const canvas = getCanvas();
        if (!canvas) return;

        fabric.Image.fromURL(url, (img) => {
            if (!img) {
                if (typeof window.showToast === 'function') window.showToast('Failed to load sticker image');
                return;
            }

            const maxSize = 130;
            const imgWidth = img.width || 100;
            const imgHeight = img.height || 100;
            const scale = Math.min(maxSize / imgWidth, maxSize / imgHeight, 1);

            img.set({
                left: x,
                top: y,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                isSticker: true,
                stickerUrl: url,
                shapeUid: generateUid()
            });

            canvas.add(img);
            if (typeof window.applySlideClip === 'function') window.applySlideClip(img);
            canvas.setActiveObject(img);
            if (typeof window.setMode === 'function') window.setMode('select');
            canvas.renderAll();
            if (typeof window.saveState === 'function') window.saveState();
            if (typeof window.showToast === 'function') window.showToast('Sticker placed on canvas');
        }, { crossOrigin: 'anonymous' });
    }

    function initNotesUI() {
        const stickyColorBtns = document.querySelectorAll('.sticky-color-btn');
        stickyColorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const colorKey = btn.dataset.color;
                if (colorKey) setStickyColor(colorKey, true);
            });
        });

        const btnDrawerPlaceNote = document.getElementById('btn-drawer-place-note');
        if (btnDrawerPlaceNote) {
            btnDrawerPlaceNote.addEventListener('click', () => {
                if (typeof window.setMode === 'function') window.setMode('sticky');
            });
        }

        const stickersSearch = document.getElementById('stickers-search');
        const btnClearStickersSearch = document.getElementById('btn-clear-stickers-search');
        if (stickersSearch) {
            stickersSearch.addEventListener('input', () => {
                if (btnClearStickersSearch) {
                    btnClearStickersSearch.style.display = stickersSearch.value ? 'block' : 'none';
                }
                renderStickersGallery();
            });
        }
        if (btnClearStickersSearch) {
            btnClearStickersSearch.addEventListener('click', () => {
                stickersSearch.value = '';
                btnClearStickersSearch.style.display = 'none';
                stickersSearch.focus();
                renderStickersGallery();
            });
        }

        // Upload stickers
        const stickersUploadBox = document.getElementById('stickers-upload-box');
        const stickersFileInput = document.getElementById('stickers-file-input');
        const btnBrowseStickers = document.getElementById('btn-browse-stickers');

        if (btnBrowseStickers && stickersFileInput) {
            btnBrowseStickers.addEventListener('click', () => stickersFileInput.click());
        }

        async function handleStickerUpload(files) {
            if (!files || files.length === 0) return;
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
            try {
                if (typeof window.showToast === 'function') window.showToast('Uploading sticker...');
                const res = await fetch('/api/stickers', {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    if (typeof window.showToast === 'function') window.showToast('Sticker uploaded successfully!');
                    loadStickers();
                } else {
                    if (typeof window.showToast === 'function') window.showToast('Failed to upload sticker');
                }
            } catch (err) {
                console.error('Upload error:', err);
                if (typeof window.showToast === 'function') window.showToast('Error uploading sticker');
            }
        }

        if (stickersFileInput) {
            stickersFileInput.addEventListener('change', (e) => {
                handleStickerUpload(e.target.files);
                stickersFileInput.value = '';
            });
        }

        if (stickersUploadBox) {
            stickersUploadBox.addEventListener('dragover', (e) => {
                e.preventDefault();
                stickersUploadBox.classList.add('drag-over');
            });
            stickersUploadBox.addEventListener('dragleave', () => {
                stickersUploadBox.classList.remove('drag-over');
            });
            stickersUploadBox.addEventListener('drop', (e) => {
                e.preventDefault();
                stickersUploadBox.classList.remove('drag-over');
                if (e.dataTransfer && e.dataTransfer.files) {
                    handleStickerUpload(e.dataTransfer.files);
                }
            });
        }

        // Self-load sticker assets
        loadStickers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNotesUI);
    } else {
        initNotesUI();
    }

    const NotesModule = {
        STICKY_COLORS,
        get currentStickyColor() { return currentStickyColor; },
        createStickyNote,
        setStickyColor,
        loadStickers,
        renderStickersGallery,
        addStickerToCanvas
    };

    window.WhiteboardApp.notes = NotesModule;

    // Backward compatibility window exports
    window.createStickyNote = createStickyNote;
    window.setStickyColor = setStickyColor;
    window.loadStickers = loadStickers;
    window.renderStickersGallery = renderStickersGallery;
    window.addStickerToCanvas = addStickerToCanvas;

})(window);

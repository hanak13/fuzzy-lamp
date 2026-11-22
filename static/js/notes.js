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

    const MAX_MEDIA_FILE_SIZE = 10 * 1024 * 1024;

    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

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
            const validFiles = Array.from(files).filter(file => {
                if (file.size > MAX_MEDIA_FILE_SIZE) {
                    if (typeof window.showToast === 'function') {
                        window.showToast(`Skipped "${file.name}": ${formatFileSize(file.size)} exceeds the ${formatFileSize(MAX_MEDIA_FILE_SIZE)} limit`);
                    }
                    return false;
                }
                return true;
            });
            if (validFiles.length === 0) return;
            const formData = new FormData();
            validFiles.forEach(file => formData.append('files', file));
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

        // ---------------------------------------------------------------------
        // Media & Image Upload System (PNG, JPG, SVG onto Canvas)
        // ---------------------------------------------------------------------
        initMediaSystem();
    }

    let uploadedMediaList = [];
    try {
        const storedMedia = localStorage.getItem('whiteboard_uploaded_media');
        if (storedMedia) uploadedMediaList = JSON.parse(storedMedia);
    } catch (e) {
        uploadedMediaList = [];
    }

    function saveUploadedMedia() {
        try {
            const trimmed = uploadedMediaList.slice(0, 20);
            localStorage.setItem('whiteboard_uploaded_media', JSON.stringify(trimmed));
        } catch (e) {
            console.warn('Could not save media to localStorage:', e);
        }
    }

    function renderMediaGallery() {
        const mediaGalleryEl = document.getElementById('media-gallery');
        const mediaCountBadge = document.getElementById('media-count-badge');
        if (!mediaGalleryEl) return;
        mediaGalleryEl.innerHTML = '';

        if (!uploadedMediaList || uploadedMediaList.length === 0) {
            if (mediaCountBadge) mediaCountBadge.textContent = '0';
            const emptyEl = document.createElement('div');
            emptyEl.id = 'empty-media-msg';
            emptyEl.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 20px 10px; color: var(--text-muted); font-size: 11px;';
            emptyEl.innerHTML = 'No images uploaded yet.<br>Click "Browse" or drop images to add them.';
            mediaGalleryEl.appendChild(emptyEl);
            return;
        }

        if (mediaCountBadge) mediaCountBadge.textContent = String(uploadedMediaList.length);

        uploadedMediaList.forEach((item, idx) => {
            const card = document.createElement('div');
            card.className = 'media-thumb-card';
            card.title = `Click to add "${item.name}" to canvas`;

            const img = document.createElement('img');
            img.src = item.url;
            img.alt = item.name;
            img.className = 'media-thumb-img';

            const name = document.createElement('span');
            name.className = 'media-thumb-name';
            name.textContent = item.name;

            const btnDel = document.createElement('button');
            btnDel.className = 'media-thumb-delete';
            btnDel.innerHTML = '&times;';
            btnDel.title = 'Remove from uploaded list';
            btnDel.addEventListener('click', (e) => {
                e.stopPropagation();
                uploadedMediaList.splice(idx, 1);
                saveUploadedMedia();
                renderMediaGallery();
            });

            card.appendChild(img);
            card.appendChild(name);
            card.appendChild(btnDel);

            card.addEventListener('click', () => {
                addImageToCanvas(item.url, null, null, item.name);
            });

            mediaGalleryEl.appendChild(card);
        });
    }

    function addImageToCanvas(dataUrl, targetX, targetY, fileName) {
        if (!dataUrl) return;
        const canvas = getCanvas();
        if (!canvas) return;

        fabric.Image.fromURL(dataUrl, (img) => {
            if (!img) {
                if (typeof window.showToast === 'function') window.showToast('Failed to load image onto canvas');
                return;
            }

            let posX = targetX;
            let posY = targetY;

            const currentFrameRatio = window.WhiteboardApp.currentFrameRatio || window.currentFrameRatio || 'infinite';
            const slideFrameRect = window.WhiteboardApp.slideFrameRect || window.slideFrameRect;

            if (posX === null || posX === undefined || posY === null || posY === undefined) {
                if (currentFrameRatio !== 'infinite' && slideFrameRect) {
                    posX = slideFrameRect.left + slideFrameRect.getScaledWidth() / 2;
                    posY = slideFrameRect.top + slideFrameRect.getScaledHeight() / 2;
                } else {
                    const vpt = canvas.viewportTransform;
                    const zoom = canvas.getZoom() || 1;
                    posX = (-vpt[4] + canvas.getWidth() / 2) / zoom;
                    posY = (-vpt[5] + canvas.getHeight() / 2) / zoom;
                }
            }

            const maxW = Math.min(canvas.getWidth() * 0.65, 600);
            const maxH = Math.min(canvas.getHeight() * 0.65, 500);
            const imgW = img.width || 400;
            const imgH = img.height || 300;
            const scale = Math.min(maxW / imgW, maxH / imgH, 1);

            const genUid = window.generateUid || (() => 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6));

            img.set({
                left: posX,
                top: posY,
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                cornerColor: '#2563eb',
                cornerSize: 10,
                transparentCorners: false,
                hasRotatingPoint: true,
                hasControls: true,
                selectable: true,
                shapeUid: genUid(),
                imageName: fileName || 'Uploaded Image'
            });

            img.connectedLines = [];
            canvas.add(img);

            if (typeof window.constrainObjectToSlideFrame === 'function') {
                window.constrainObjectToSlideFrame(img);
            }

            if (typeof window.setMode === 'function') window.setMode('select');
            canvas.setActiveObject(img);
            canvas.renderAll();
            if (typeof window.saveState === 'function') window.saveState();
            if (typeof window.showToast === 'function') window.showToast(`Added image: "${fileName || 'Image'}"`);

            const exists = uploadedMediaList.some(m => m.name === fileName && m.url === dataUrl);
            if (!exists) {
                uploadedMediaList.unshift({
                    name: fileName || 'Uploaded Image',
                    url: dataUrl
                });
                saveUploadedMedia();
                renderMediaGallery();
            }
        });
    }

    function processImageFiles(files, dropX, dropY) {
        if (!files || files.length === 0) return;
        Array.from(files).forEach((file) => {
            if (file.size > MAX_MEDIA_FILE_SIZE) {
                if (typeof window.showToast === 'function') {
                    window.showToast(`Skipped "${file.name}": ${formatFileSize(file.size)} exceeds the ${formatFileSize(MAX_MEDIA_FILE_SIZE)} limit`);
                }
                return;
            }
            if (file.size === 0) {
                if (typeof window.showToast === 'function') window.showToast(`Skipped empty file: ${file.name}`);
                return;
            }

            const isValid = file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|svg|webp|gif)$/i);
            if (!isValid) {
                if (typeof window.showToast === 'function') window.showToast(`Skipped non-image file: ${file.name}`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                addImageToCanvas(dataUrl, dropX, dropY, file.name);
            };
            reader.readAsDataURL(file);
        });
    }

    function initMediaSystem() {
        const mediaFileInput = document.getElementById('media-file-input');
        const btnBrowseMedia = document.getElementById('btn-browse-media');
        const mediaUploadBox = document.getElementById('media-upload-box');
        const canvasContainer = document.getElementById('canvas-container');

        if (btnBrowseMedia && mediaFileInput) {
            btnBrowseMedia.addEventListener('click', () => {
                mediaFileInput.value = '';
                mediaFileInput.click();
            });
        }

        if (mediaUploadBox && mediaFileInput) {
            mediaUploadBox.addEventListener('click', (e) => {
                if (e.target !== btnBrowseMedia) {
                    mediaFileInput.value = '';
                    mediaFileInput.click();
                }
            });

            mediaUploadBox.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                mediaUploadBox.style.borderColor = 'var(--primary-color)';
            });

            mediaUploadBox.addEventListener('dragleave', (e) => {
                e.preventDefault();
                e.stopPropagation();
                mediaUploadBox.style.borderColor = '';
            });

            mediaUploadBox.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                mediaUploadBox.style.borderColor = '';
                if (e.dataTransfer && e.dataTransfer.files) {
                    processImageFiles(e.dataTransfer.files, null, null);
                }
            });
        }

        if (mediaFileInput) {
            mediaFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    processImageFiles(e.target.files, null, null);
                }
            });
        }

        if (canvasContainer) {
            canvasContainer.addEventListener('dragover', (e) => {
                if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
                    e.preventDefault();
                    canvasContainer.classList.add('drag-over-active');
                }
            });

            canvasContainer.addEventListener('dragleave', () => {
                canvasContainer.classList.remove('drag-over-active');
            });

            canvasContainer.addEventListener('drop', (e) => {
                canvasContainer.classList.remove('drag-over-active');
                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    const canvas = getCanvas();
                    const pointer = canvas ? canvas.getPointer(e) : { x: null, y: null };
                    processImageFiles(e.dataTransfer.files, pointer.x, pointer.y);
                    e.preventDefault();
                }
            });
        }

        window.addEventListener('paste', (e) => {
            const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if (activeTag === 'input' || activeTag === 'textarea') return;

            if (e.clipboardData && e.clipboardData.items) {
                const items = Array.from(e.clipboardData.items);
                const imgItem = items.find(it => it.type.startsWith('image/'));
                if (imgItem) {
                    e.preventDefault();
                    const file = imgItem.getAsFile();
                    if (file) {
                        processImageFiles([file], null, null);
                    }
                }
            }
        });

        renderMediaGallery();
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
        addStickerToCanvas,
        renderMediaGallery,
        addImageToCanvas,
        processImageFiles
    };

    window.WhiteboardApp.notes = NotesModule;

    // Backward compatibility window exports
    window.createStickyNote = createStickyNote;
    window.setStickyColor = setStickyColor;
    window.loadStickers = loadStickers;
    window.renderStickersGallery = renderStickersGallery;
    window.addStickerToCanvas = addStickerToCanvas;
    window.renderMediaGallery = renderMediaGallery;
    window.addImageToCanvas = addImageToCanvas;
    window.processImageFiles = processImageFiles;

})(window);

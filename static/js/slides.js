/**
 * Whiteboard Application - Slide & Presentation Mode Module
 * static/js/slides.js
 *
 * Implements:
 * - Fixed-ratio slide frames (16:9 Presentation, 4:3 Standard, A4 Document Page, Infinite Canvas)
 * - Multi-slide presentation deck management (create, navigate, delete slides)
 * - Slide viewport framing & boundary clipping (applySlideClip, constrainObjectToSlideFrame)
 * - Presenter banner navigation controls & fullscreen presenter view
 * - Exit slide confirmation workflow
 */

(function (window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    const SLIDE_PRESETS = {
        '16:9': {
            width: 1920,
            height: 1080,
            title: '16:9 Presentation Slide (1920 × 1080)',
            shortName: 'Slide: 16:9'
        },
        '4:3': {
            width: 1024,
            height: 768,
            title: '4:3 Standard Slide (1024 × 768)',
            shortName: 'Slide: 4:3'
        },
        'a4': {
            width: 1240,
            height: 1754,
            title: 'A4 Document Page (1240 × 1754)',
            shortName: 'Page: A4'
        }
    };

    let currentFrameRatio = 'infinite';
    let slideFrameRect = null;
    let infiniteBoardObjects = [];
    let isSlidePageFullscreen = false;

    let boardSlides = [
        { id: 'slide_' + Date.now(), name: 'Slide 1', objects: [] }
    ];
    let currentSlideIndex = 0;

    function getCanvas() {
        return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
    }

    function getExtraProps() {
        return (window.WhiteboardApp && window.WhiteboardApp.EXTRA_PROPS) || [
            'stroke', 'strokeWidth', 'fill', 'isShapeGroup', 'shapeUid', 'isStepBox'
        ];
    }

    // -------------------------------------------------------------------------
    // 1. Navigation & State
    // -------------------------------------------------------------------------
    function updateSlideNavigationUI() {
        const slideCounterBadge = document.getElementById('slide-counter-badge');
        const btnPrevSlide = document.getElementById('btn-prev-slide');
        const btnNextSlide = document.getElementById('btn-next-slide');
        const btnDelSlide = document.getElementById('btn-del-slide');

        if (!slideCounterBadge) return;
        const total = Math.max(1, boardSlides.length);
        const cur = Math.min(total, currentSlideIndex + 1);
        slideCounterBadge.textContent = `Slide ${cur} / ${total}`;

        if (btnPrevSlide) btnPrevSlide.disabled = currentSlideIndex <= 0;
        if (btnNextSlide) btnNextSlide.disabled = currentSlideIndex >= boardSlides.length - 1;
        if (btnDelSlide) btnDelSlide.disabled = boardSlides.length <= 1;
    }

    function saveCurrentSlide() {
        const canvas = getCanvas();
        if (!canvas || currentFrameRatio === 'infinite' || !slideFrameRect) return;

        if (!boardSlides[currentSlideIndex]) {
            boardSlides[currentSlideIndex] = {
                id: 'slide_' + Date.now(),
                name: `Slide ${currentSlideIndex + 1}`,
                objects: []
            };
        }

        if (typeof window.saveStepBoxCurrentStep === 'function') {
            const stepBoxes = canvas.getObjects().filter(o => o.isStepBox);
            stepBoxes.forEach(sb => window.saveStepBoxCurrentStep(sb));
        }

        const nonFrameObjects = canvas.getObjects().filter(o => !o.isSlideFrame);
        boardSlides[currentSlideIndex].objects = nonFrameObjects.map(o => o.toJSON(getExtraProps()));
    }

    function loadSlide(index) {
        const canvas = getCanvas();
        if (!canvas || index < 0 || index >= boardSlides.length) return;

        canvas.discardActiveObject();
        const stepBoxFloatingBar = document.getElementById('stepbox-floating-bar');
        if (stepBoxFloatingBar) stepBoxFloatingBar.style.display = 'none';
        window.activeStepBox = null;

        const toRemove = canvas.getObjects().filter(o => !o.isSlideFrame);
        toRemove.forEach(o => canvas.remove(o));

        currentSlideIndex = index;
        const targetSlide = boardSlides[currentSlideIndex];

        if (targetSlide && Array.isArray(targetSlide.objects) && targetSlide.objects.length > 0) {
            fabric.util.enlivenObjects(targetSlide.objects, (enlivenedObjects) => {
                enlivenedObjects.forEach(obj => {
                    canvas.add(obj);
                    applySlideClip(obj);
                });
                if (slideFrameRect) {
                    canvas.sendToBack(slideFrameRect);
                }
                if (typeof window.reconnectLoadedObjects === 'function') {
                    window.reconnectLoadedObjects();
                }
                canvas.renderAll();
                if (typeof window.updateObjectsCountBadges === 'function') {
                    window.updateObjectsCountBadges();
                }
            });
        } else {
            canvas.renderAll();
            if (typeof window.updateObjectsCountBadges === 'function') {
                window.updateObjectsCountBadges();
            }
        }

        updateSlideNavigationUI();
        fitSlideView();
    }

    function addNewSlide() {
        saveCurrentSlide();
        const newSlideIndex = boardSlides.length;
        const newSlide = {
            id: 'slide_' + Date.now(),
            name: `Slide ${newSlideIndex + 1}`,
            objects: []
        };
        boardSlides.push(newSlide);
        loadSlide(newSlideIndex);
        if (typeof window.showToast === 'function') {
            window.showToast(`Created Slide ${boardSlides.length}`);
        }
    }

    function deleteCurrentSlide() {
        if (boardSlides.length <= 1) {
            if (typeof window.showToast === 'function') window.showToast('Cannot delete the only slide');
            return;
        }

        if (!confirm(`Delete Slide ${currentSlideIndex + 1} of ${boardSlides.length}?`)) {
            return;
        }

        boardSlides.splice(currentSlideIndex, 1);
        const targetIndex = Math.max(0, Math.min(currentSlideIndex, boardSlides.length - 1));
        loadSlide(targetIndex);
        if (typeof window.showToast === 'function') window.showToast('Slide deleted');
    }

    // -------------------------------------------------------------------------
    // 2. Framing, Viewport Fitting & Clipping
    // -------------------------------------------------------------------------
    function fitSlideView() {
        const canvas = getCanvas();
        if (!canvas || !slideFrameRect) return;

        const availWidth = canvas.getWidth();
        const availHeight = canvas.getHeight();
        const margin = 40;

        const scaleX = (availWidth - margin * 2) / slideFrameRect.width;
        const scaleY = (availHeight - margin * 2) / slideFrameRect.height;
        const zoom = Math.min(scaleX, scaleY, 1.0);

        const frameCenterX = slideFrameRect.left + slideFrameRect.width / 2;
        const frameCenterY = slideFrameRect.top + slideFrameRect.height / 2;

        const panX = (availWidth / 2) - (frameCenterX * zoom);
        const panY = (availHeight / 2) - (frameCenterY * zoom);

        canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
        if (typeof window.updateZoomDisplay === 'function') window.updateZoomDisplay();
        if (typeof window.updateGrid === 'function') window.updateGrid();
    }

    function applySlideClip(obj) {
        if (!obj || currentFrameRatio === 'infinite' || !slideFrameRect) {
            if (obj && obj.clipPath && obj.clipPath.isSlideFrameClip) {
                obj.clipPath = null;
            }
            return;
        }
        const clipRect = new fabric.Rect({
            left: slideFrameRect.left,
            top: slideFrameRect.top,
            width: slideFrameRect.width,
            height: slideFrameRect.height,
            absolutePositioned: true
        });
        clipRect.isSlideFrameClip = true;
        obj.clipPath = clipRect;
    }

    function constrainObjectToSlideFrame(obj) {
        if (!obj || currentFrameRatio === 'infinite' || !slideFrameRect) return;
        const bound = obj.getBoundingRect ? obj.getBoundingRect(true, true) : null;
        if (!bound) return;

        const minX = slideFrameRect.left;
        const maxX = slideFrameRect.left + slideFrameRect.width;
        const minY = slideFrameRect.top;
        const maxY = slideFrameRect.top + slideFrameRect.height;

        let left = obj.left;
        let top = obj.top;

        if (bound.left < minX) left += (minX - bound.left);
        if (bound.left + bound.width > maxX) left -= ((bound.left + bound.width) - maxX);
        if (bound.top < minY) top += (minY - bound.top);
        if (bound.top + bound.height > maxY) top -= ((bound.top + bound.height) - maxY);

        obj.set({ left, top });
        obj.setCoords();
    }

    function setFrameMode(ratioKey, shouldFit = true) {
        const canvas = getCanvas();
        if (!canvas) return;

        const frameModeLabel = document.getElementById('frame-mode-label');
        const slideFrameBanner = document.getElementById('slide-frame-banner');
        const slideFrameTitle = document.getElementById('slide-frame-title');
        const frameMenuItems = document.querySelectorAll('.frame-menu-item');

        frameMenuItems.forEach(item => {
            item.classList.toggle('active', item.dataset.ratio === ratioKey);
        });

        if (ratioKey === 'infinite') {
            if (currentFrameRatio !== 'infinite') {
                saveCurrentSlide();
            }
            currentFrameRatio = 'infinite';
            window.__currentFrameRatio = 'infinite';

            if (slideFrameRect) {
                canvas.remove(slideFrameRect);
                slideFrameRect = null;
                window.__slideFrameRect = null;
            }

            canvas.getObjects().forEach(o => applySlideClip(o));

            if (frameModeLabel) frameModeLabel.textContent = 'Canvas: Infinite';
            if (slideFrameBanner) slideFrameBanner.style.display = 'none';

            canvas.renderAll();
            if (typeof window.showToast === 'function') window.showToast('Canvas set to Infinite');
            return;
        }

        const preset = SLIDE_PRESETS[ratioKey];
        if (!preset) return;

        currentFrameRatio = ratioKey;
        window.__currentFrameRatio = ratioKey;

        if (frameModeLabel) frameModeLabel.textContent = preset.shortName;
        if (slideFrameTitle) slideFrameTitle.textContent = preset.title;
        if (slideFrameBanner) slideFrameBanner.style.display = 'flex';

        if (slideFrameRect) {
            canvas.remove(slideFrameRect);
        }

        slideFrameRect = new fabric.Rect({
            left: 100,
            top: 100,
            width: preset.width,
            height: preset.height,
            fill: '#ffffff',
            stroke: '#94a3b8',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            isSlideFrame: true,
            slideFrameRatio: ratioKey,
            shadow: new fabric.Shadow({
                color: 'rgba(0, 0, 0, 0.2)',
                blur: 24,
                offsetX: 0,
                offsetY: 8
            })
        });

        window.__slideFrameRect = slideFrameRect;

        canvas.add(slideFrameRect);
        canvas.sendToBack(slideFrameRect);

        canvas.getObjects().forEach(o => {
            if (!o.isSlideFrame) applySlideClip(o);
        });

        updateSlideNavigationUI();

        if (shouldFit) {
            fitSlideView();
        }
        canvas.renderAll();
        if (typeof window.showToast === 'function') window.showToast(`Canvas set to ${preset.title}`);
    }

    function toggleSlidePageFullscreen(force) {
        isSlidePageFullscreen = (typeof force === 'boolean') ? force : !isSlidePageFullscreen;
        document.body.classList.toggle('slide-page-fullscreen', isSlidePageFullscreen);

        const slideFsIconExpand = document.getElementById('slide-fs-icon-expand');
        const slideFsIconCompress = document.getElementById('slide-fs-icon-compress');
        const slideFsBtnLabel = document.getElementById('slide-fs-btn-label');

        if (slideFsIconExpand) slideFsIconExpand.style.display = isSlidePageFullscreen ? 'none' : 'block';
        if (slideFsIconCompress) slideFsIconCompress.style.display = isSlidePageFullscreen ? 'block' : 'none';
        if (slideFsBtnLabel) slideFsBtnLabel.textContent = isSlidePageFullscreen ? 'Exit Presenter' : 'Presenter View';

        fitSlideView();
    }

    function renderSlideFrameOverlays(ctx) {
        if (currentFrameRatio === 'infinite' || !slideFrameRect || !slideFrameRect.visible) return;
        ctx.save();
        const m = slideFrameRect.calcTransformMatrix();
        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);

        const w = slideFrameRect.width;
        const h = slideFrameRect.height;
        const x = -w / 2;
        const y = -h / 2;

        ctx.strokeStyle = slideFrameRect.stroke || '#94a3b8';
        ctx.lineWidth = slideFrameRect.strokeWidth || 2;
        if (ctx.setLineDash) ctx.setLineDash([]);
        ctx.strokeRect(x, y, w, h);

        ctx.restore();
    }

    function initSlidesUI() {
        const btnPrevSlide = document.getElementById('btn-prev-slide');
        const btnNextSlide = document.getElementById('btn-next-slide');
        const btnAddSlide = document.getElementById('btn-add-slide');
        const btnDelSlide = document.getElementById('btn-del-slide');
        const btnFitSlide = document.getElementById('btn-fit-slide');
        const btnSlideFullscreen = document.getElementById('btn-slide-fullscreen');
        const frameMenuItems = document.querySelectorAll('.frame-menu-item');
        const btnFrameMode = document.getElementById('btn-frame-mode');
        const frameModeDropdown = document.getElementById('frame-mode-dropdown');

        if (btnPrevSlide) btnPrevSlide.addEventListener('click', () => {
            saveCurrentSlide();
            loadSlide(currentSlideIndex - 1);
        });
        if (btnNextSlide) btnNextSlide.addEventListener('click', () => {
            saveCurrentSlide();
            loadSlide(currentSlideIndex + 1);
        });
        if (btnAddSlide) btnAddSlide.addEventListener('click', addNewSlide);
        if (btnDelSlide) btnDelSlide.addEventListener('click', deleteCurrentSlide);
        if (btnFitSlide) btnFitSlide.addEventListener('click', fitSlideView);
        if (btnSlideFullscreen) btnSlideFullscreen.addEventListener('click', () => toggleSlidePageFullscreen());

        frameMenuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const ratio = item.dataset.ratio;
                if (ratio) {
                    setFrameMode(ratio);
                    if (frameModeDropdown) frameModeDropdown.classList.add('hidden');
                }
            });
        });

        if (btnFrameMode && frameModeDropdown) {
            btnFrameMode.addEventListener('click', (e) => {
                e.stopPropagation();
                frameModeDropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', () => {
                frameModeDropdown.classList.add('hidden');
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSlidesUI);
    } else {
        initSlidesUI();
    }

    const SlidesModule = {
        SLIDE_PRESETS,
        get currentFrameRatio() { return currentFrameRatio; },
        get slideFrameRect() { return slideFrameRect; },
        get boardSlides() { return boardSlides; },
        set boardSlides(val) { boardSlides = val; },
        get currentSlideIndex() { return currentSlideIndex; },
        setFrameMode,
        fitSlideView,
        applySlideClip,
        constrainObjectToSlideFrame,
        saveCurrentSlide,
        loadSlide,
        addNewSlide,
        deleteCurrentSlide,
        toggleSlidePageFullscreen,
        renderSlideFrameOverlays
    };

    window.WhiteboardApp.slides = SlidesModule;

    // Backward compatibility direct window exports
    window.setFrameMode = setFrameMode;
    window.fitSlideView = fitSlideView;
    window.applySlideClip = applySlideClip;
    window.constrainObjectToSlideFrame = constrainObjectToSlideFrame;
    window.saveCurrentSlide = saveCurrentSlide;
    window.loadSlide = loadSlide;
    window.addNewSlide = addNewSlide;
    window.deleteCurrentSlide = deleteCurrentSlide;
    window.toggleSlidePageFullscreen = toggleSlidePageFullscreen;
    window.renderSlideFrameOverlays = renderSlideFrameOverlays;

})(window);

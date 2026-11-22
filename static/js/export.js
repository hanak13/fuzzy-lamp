/**
 * Whiteboard App - Export Module
 * Handles exporting canvas content to PNG (2x retina), SVG,
 * multi-page PDF documents, and PowerPoint presentations (.pptx).
 */

(function(window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    const ExportModule = {
        getCanvas() {
            return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
        },

        getBoards() {
            return window.__boards || (window.WhiteboardApp && window.WhiteboardApp.boards) || [];
        },

        getActiveBoardId() {
            return window.__activeBoardId || (window.WhiteboardApp && window.WhiteboardApp.activeBoardId) || 'board_main';
        },

        getCurrentFrameRatio() {
            return window.__currentFrameRatio || (window.WhiteboardApp && window.WhiteboardApp.currentFrameRatio) || 'infinite';
        },

        exportCanvasAsPNG() {
            const dropdown = document.getElementById('download-dropdown');
            if (dropdown) dropdown.classList.add('hidden');

            const canvas = ExportModule.getCanvas();
            if (!canvas) return;

            const activeBox = window.__activeStepBox || (window.WhiteboardApp && window.WhiteboardApp.activeStepBox);
            if (activeBox && typeof window.saveStepBoxCurrentStep === 'function') {
                window.saveStepBoxCurrentStep(activeBox);
            }

            const previewStepBox = window.__stepBoxPreviewRect || (window.WhiteboardApp && window.WhiteboardApp.stepBoxPreviewRect);
            const previewLine = window.__connectorPreviewLine || (window.WhiteboardApp && window.WhiteboardApp.connectorPreviewLine);
            const objects = canvas.getObjects().filter(o => !o.isGridLine && !o.isSlideFrame && o !== previewStepBox && o !== previewLine);
            if (!objects || objects.length === 0) {
                if (typeof window.showToast === 'function') window.showToast('Canvas is empty');
                return;
            }

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            objects.forEach(obj => {
                const b = obj.getBoundingRect(true, true);
                if (b.left < minX) minX = b.left;
                if (b.top < minY) minY = b.top;
                if (b.left + b.width > maxX) maxX = b.left + b.width;
                if (b.top + b.height > maxY) maxY = b.top + b.height;
            });

            if (!isFinite(minX) || !isFinite(minY)) {
                minX = 0; minY = 0; maxX = canvas.getWidth(); maxY = canvas.getHeight();
            }

            const padding = 40;
            const cropX = Math.max(0, minX - padding);
            const cropY = Math.max(0, minY - padding);
            const cropWidth = (maxX - minX) + padding * 2;
            const cropHeight = (maxY - minY) + padding * 2;

            const prevVpt = canvas.viewportTransform.slice();
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

            const dataUrl = canvas.toDataURL({
                format: 'png',
                left: cropX,
                top: cropY,
                width: cropWidth,
                height: cropHeight,
                multiplier: 2,
                enableRetinaScaling: true
            });

            canvas.setViewportTransform(prevVpt);
            canvas.requestRenderAll();

            const boards = ExportModule.getBoards();
            const curBoardId = ExportModule.getActiveBoardId();
            const curBoard = Array.isArray(boards) ? boards.find(b => b.id === curBoardId) : null;
            const safeName = (curBoard ? curBoard.name : 'whiteboard').toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'whiteboard';

            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            if (typeof window.showToast === 'function') window.showToast(`Exported "${a.download}"`);
        },

        exportCanvasAsSVG() {
            const dropdown = document.getElementById('download-dropdown');
            if (dropdown) dropdown.classList.add('hidden');

            const canvas = ExportModule.getCanvas();
            if (!canvas) return;

            const activeBox = window.__activeStepBox || (window.WhiteboardApp && window.WhiteboardApp.activeStepBox);
            if (activeBox && typeof window.saveStepBoxCurrentStep === 'function') {
                window.saveStepBoxCurrentStep(activeBox);
            }

            const previewStepBox = window.__stepBoxPreviewRect || (window.WhiteboardApp && window.WhiteboardApp.stepBoxPreviewRect);
            const previewLine = window.__connectorPreviewLine || (window.WhiteboardApp && window.WhiteboardApp.connectorPreviewLine);
            const objects = canvas.getObjects().filter(o => !o.isGridLine && !o.isSlideFrame && o !== previewStepBox && o !== previewLine);
            if (!objects || objects.length === 0) {
                if (typeof window.showToast === 'function') window.showToast('Canvas is empty');
                return;
            }

            const extraProps = window.EXTRA_PROPS || [
                'id', 'isStickyNote', 'stickyColor', 'isConnector', 'startObjectId', 'endObjectId',
                'startAnchor', 'endAnchor', 'hasArrow', 'arrowHead', 'startArrowHead', 'shapeId',
                'shapeName', 'isShapeGroup', 'isSticker', 'isSlideFrame', 'isStepBox', 'stepBoxId',
                'stepBoxName', 'stepBoxSteps', 'stepBoxCurrentStep', 'stepBoxOwnerId', 'isMergedShape',
                'isIcon', 'iconName', 'iconCategory', 'iconSvg'
            ];

            const svgContent = canvas.toSVG({
                suppressPreamble: false,
                width: canvas.getWidth(),
                height: canvas.getHeight()
            }, extraProps);

            const boards = ExportModule.getBoards();
            const curBoardId = ExportModule.getActiveBoardId();
            const curBoard = Array.isArray(boards) ? boards.find(b => b.id === curBoardId) : null;
            const safeName = (curBoard ? curBoard.name : 'whiteboard').toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'whiteboard';

            const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.svg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1500);
            if (typeof window.showToast === 'function') window.showToast(`Exported "${a.download}"`);
        },

        async collectPresentationSlides(format) {
            const canvas = ExportModule.getCanvas();
            if (!canvas) return null;
            const slideCaptures = [];

            const currentRatio = (window.WhiteboardApp && window.WhiteboardApp.currentFrameRatio) || window.currentFrameRatio || window.__currentFrameRatio || 'infinite';
            const slideFrame = (window.WhiteboardApp && window.WhiteboardApp.slideFrameRect) || window.slideFrameRect || window.__slideFrameRect;
            const boardSlides = (window.WhiteboardApp && window.WhiteboardApp.boardSlides) || window.boardSlides || window.__boardSlides || [];

            // 1. If in Fixed Width / Slide Mode, capture all slides in boardSlides
            if (currentRatio !== 'infinite' && slideFrame) {
                if (typeof window.saveCurrentSlide === 'function') window.saveCurrentSlide();
                const originalSlideIndex = (window.WhiteboardApp && window.WhiteboardApp.currentSlideIndex !== undefined)
                    ? window.WhiteboardApp.currentSlideIndex
                    : (window.currentSlideIndex !== undefined ? window.currentSlideIndex : (window.__currentSlideIndex || 0));

                const prevVpt = canvas.viewportTransform.slice();
                canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

                const cropX = slideFrame.left;
                const cropY = slideFrame.top;
                const cropW = slideFrame.width;
                const cropH = slideFrame.height;

                for (let i = 0; i < boardSlides.length; i++) {
                    await new Promise(resolve => {
                        if (typeof window.loadSlide === 'function') window.loadSlide(i);
                        requestAnimationFrame(() => {
                            canvas.requestRenderAll();
                            setTimeout(resolve, 120);
                        });
                    });

                    const dataUrl = canvas.toDataURL({
                        format: 'png',
                        left: cropX,
                        top: cropY,
                        width: cropW,
                        height: cropH,
                        multiplier: 2,
                        enableRetinaScaling: true
                    });

                    slideCaptures.push({
                        image_data: dataUrl,
                        title: (boardSlides[i] && boardSlides[i].name) ? boardSlides[i].name : `Slide ${i + 1}`,
                        step_num: i + 1
                    });
                }

                await new Promise(resolve => {
                    if (typeof window.loadSlide === 'function') window.loadSlide(originalSlideIndex);
                    setTimeout(resolve, 120);
                });

                canvas.setViewportTransform(prevVpt);
                canvas.requestRenderAll();
                return slideCaptures;
            }

            // 2. Otherwise (Infinite Canvas): Step Box steps or whole canvas
            const frame = canvas.getObjects().find(o => o.isSlideFrame);
            let cropX = 100, cropY = 100, cropW = 1920, cropH = 1080;
            if (frame) {
                cropX = frame.left;
                cropY = frame.top;
                cropW = frame.width;
                cropH = frame.height;
            } else {
                const previewStepBox = window.__stepBoxPreviewRect || (window.WhiteboardApp && window.WhiteboardApp.stepBoxPreviewRect);
                const previewLine = window.__connectorPreviewLine || (window.WhiteboardApp && window.WhiteboardApp.connectorPreviewLine);
                const objs = canvas.getObjects().filter(o => !o.isGridLine && !o.isSlideFrame && o !== previewStepBox && o !== previewLine);
                if (objs.length === 0) return null;

                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                objs.forEach(o => {
                    const b = o.getBoundingRect(true, true);
                    if (b.left < minX) minX = b.left;
                    if (b.top < minY) minY = b.top;
                    if (b.left + b.width > maxX) maxX = b.left + b.width;
                    if (b.top + b.height > maxY) maxY = b.top + b.height;
                });
                const pad = 40;
                cropX = Math.max(0, minX - pad);
                cropY = Math.max(0, minY - pad);
                cropW = (maxX - minX) + pad * 2;
                cropH = (maxY - minY) + pad * 2;
            }

            const stepBoxes = canvas.getObjects().filter(o => o.isStepBox && o.stepBoxSteps && o.stepBoxSteps.length > 1);
            const activeBox = window.__activeStepBox || (window.WhiteboardApp && window.WhiteboardApp.activeStepBox);
            const primaryBox = activeBox || (stepBoxes.length > 0 ? stepBoxes[0] : null);

            if (primaryBox && primaryBox.stepBoxSteps && primaryBox.stepBoxSteps.length > 1) {
                if (typeof window.saveStepBoxCurrentStep === 'function') window.saveStepBoxCurrentStep(primaryBox);
                const originalStep = primaryBox.stepBoxCurrentStep;

                const prevVpt = canvas.viewportTransform.slice();
                canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

                for (let i = 0; i < primaryBox.stepBoxSteps.length; i++) {
                    await new Promise(res => {
                        if (typeof window.loadStepBoxStep === 'function') window.loadStepBoxStep(primaryBox, i);
                        requestAnimationFrame(() => {
                            canvas.requestRenderAll();
                            setTimeout(res, 120);
                        });
                    });

                    const dataUrl = canvas.toDataURL({
                        format: 'png',
                        left: cropX,
                        top: cropY,
                        width: cropW,
                        height: cropH,
                        multiplier: 2,
                        enableRetinaScaling: true
                    });

                    slideCaptures.push({
                        image_data: dataUrl,
                        title: `Step ${i + 1}`,
                        step_num: i + 1
                    });
                }

                await new Promise(res => {
                    if (typeof window.loadStepBoxStep === 'function') window.loadStepBoxStep(primaryBox, originalStep);
                    setTimeout(res, 120);
                });
                canvas.setViewportTransform(prevVpt);
                canvas.requestRenderAll();
            } else {
                if (activeBox && typeof window.saveStepBoxCurrentStep === 'function') {
                    window.saveStepBoxCurrentStep(activeBox);
                }
                const prevVpt = canvas.viewportTransform.slice();
                canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

                const dataUrl = canvas.toDataURL({
                    format: 'png',
                    left: cropX,
                    top: cropY,
                    width: cropW,
                    height: cropH,
                    multiplier: 2,
                    enableRetinaScaling: true
                });

                canvas.setViewportTransform(prevVpt);
                canvas.requestRenderAll();

                slideCaptures.push({
                    image_data: dataUrl,
                    title: 'Slide 1',
                    step_num: 1
                });
            }

            return slideCaptures;
        },

        async exportAsPPTX() {
            const dropdown = document.getElementById('download-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
            if (typeof window.showToast === 'function') window.showToast('Preparing PowerPoint presentation (.pptx)...');

            const slides = await ExportModule.collectPresentationSlides('pptx');
            if (!slides || slides.length === 0) {
                if (typeof window.showToast === 'function') window.showToast('Canvas is empty');
                return;
            }

            const boards = ExportModule.getBoards();
            const curBoardId = ExportModule.getActiveBoardId();
            const curBoard = Array.isArray(boards) ? boards.find(b => b.id === curBoardId) : null;
            const title = curBoard ? curBoard.name : 'presentation';
            const currentRatio = ExportModule.getCurrentFrameRatio();

            try {
                const res = await fetch('/api/export/pptx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title,
                        aspect_ratio: currentRatio === '4:3' ? '4:3' : (currentRatio === 'a4' ? 'a4' : '16:9'),
                        slides: slides
                    })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const safeName = title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'presentation';
                a.download = `${safeName}.pptx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 2000);
                if (typeof window.showToast === 'function') {
                    window.showToast(`Exported "${a.download}" (${slides.length} slide${slides.length > 1 ? 's' : ''})`);
                }
            } catch (err) {
                console.error('PPTX export error:', err);
                if (typeof window.showToast === 'function') window.showToast('Failed to export PPTX');
            }
        },

        async exportAsPDF() {
            const dropdown = document.getElementById('download-dropdown');
            if (dropdown) dropdown.classList.add('hidden');
            if (typeof window.showToast === 'function') window.showToast('Preparing PDF document (.pdf)...');

            const slides = await ExportModule.collectPresentationSlides('pdf');
            if (!slides || slides.length === 0) {
                if (typeof window.showToast === 'function') window.showToast('Canvas is empty');
                return;
            }

            const boards = ExportModule.getBoards();
            const curBoardId = ExportModule.getActiveBoardId();
            const curBoard = Array.isArray(boards) ? boards.find(b => b.id === curBoardId) : null;
            const title = curBoard ? curBoard.name : 'document';
            const currentRatio = ExportModule.getCurrentFrameRatio();

            try {
                const res = await fetch('/api/export/pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title,
                        aspect_ratio: currentRatio === '4:3' ? '4:3' : (currentRatio === 'a4' ? 'a4' : '16:9'),
                        slides: slides
                    })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const safeName = title.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'document';
                a.download = `${safeName}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 2000);
                if (typeof window.showToast === 'function') {
                    window.showToast(`Exported "${a.download}" (${slides.length} page${slides.length > 1 ? 's' : ''})`);
                }
            } catch (err) {
                console.error('PDF export error:', err);
                if (typeof window.showToast === 'function') window.showToast('Failed to export PDF');
            }
        },

        async exportStepBoxAsPPTX(box) {
            if (!box || !box.isStepBox || !box.stepBoxSteps || box.stepBoxSteps.length === 0) {
                if (typeof window.showToast === 'function') window.showToast('No steps to export in this Step Box');
                return;
            }

            const canvas = ExportModule.getCanvas();
            if (!canvas) return;

            if (typeof window.saveStepBoxCurrentStep === 'function') window.saveStepBoxCurrentStep(box);
            const originalStep = box.stepBoxCurrentStep || 0;
            const boxTitle = box.stepBoxName || 'Step Box Presentation';
            const totalSteps = box.stepBoxSteps.length;

            if (typeof window.showToast === 'function') {
                window.showToast(`Preparing presentation (${totalSteps} slide${totalSteps > 1 ? 's' : ''})...`);
            }

            const prevVpt = canvas.viewportTransform.slice();
            const slides = [];

            try {
                const bw = box.width * (box.scaleX || 1);
                const bh = box.height * (box.scaleY || 1);
                const bx = box.left;
                const by = box.top;

                for (let i = 0; i < totalSteps; i++) {
                    await new Promise(resolve => {
                        if (typeof window.loadStepBoxStep === 'function') window.loadStepBoxStep(box, i);
                        setTimeout(resolve, 80);
                    });

                    const stepObj = box.stepBoxSteps[i];
                    const stepTitle = (stepObj && stepObj.name) ? stepObj.name : `Step ${i + 1}`;

                    const dataUrl = canvas.toDataURL({
                        format: 'png',
                        left: bx,
                        top: by,
                        width: bw,
                        height: bh,
                        multiplier: 2
                    });

                    slides.push({
                        image_data: dataUrl,
                        title: stepTitle,
                        step_num: i + 1
                    });
                }

                await new Promise(resolve => {
                    if (typeof window.loadStepBoxStep === 'function') window.loadStepBoxStep(box, originalStep);
                    setTimeout(resolve, 80);
                });

                canvas.setViewportTransform(prevVpt);
                canvas.requestRenderAll();

                const res = await fetch('/api/export/pptx', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: boxTitle,
                        aspect_ratio: '16:9',
                        slides: slides
                    })
                });

                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const safeName = boxTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'presentation';
                a.download = `${safeName}.pptx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 2000);
                if (typeof window.showToast === 'function') window.showToast(`Exported "${a.download}"`);
            } catch (err) {
                console.error('Step Box PPTX export error:', err);
                canvas.setViewportTransform(prevVpt);
                canvas.requestRenderAll();
                if (typeof window.showToast === 'function') window.showToast('Failed to export presentation');
            }
        },

        exportActiveObjectAs(format = 'svg') {
            const canvas = ExportModule.getCanvas();
            if (!canvas) return;
            const activeObj = canvas.getActiveObject();
            if (!activeObj) {
                if (typeof window.showToast === 'function') window.showToast('Select a shape to export');
                return;
            }

            let baseName = 'whiteboard_shape';
            if (activeObj.isMergedShape) baseName = 'merged_diagram';
            else if (activeObj.shapeId) baseName = activeObj.shapeId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
            else if (activeObj.type === 'i-text' || activeObj.type === 'textbox') baseName = 'text_snippet';
            else if (activeObj.isStickyNote) baseName = 'sticky_note';
            else if (activeObj.isConnector || activeObj.isFreeLine || activeObj.type === 'line') baseName = 'line_arrow';

            if (format === 'svg') {
                const EXTRA_PROPS = window.EXTRA_PROPS || ['id', 'shapeUid', 'connectedLines', 'isConnector', 'isArrowHead', 'isStepBox', 'stepBoxId', 'stepBoxName', 'stepBoxSteps', 'stepBoxCurrentStep', 'stepBoxOwnerId', 'isStickyNote', 'stickyColor', 'isSticker', 'imageName', 'isIcon', 'iconName', 'iconCategory', 'iconSvg'];
                activeObj.clone((cloned) => {
                    const b = cloned.getBoundingRect(true, true);
                    const padding = 20;
                    const w = Math.max(20, Math.ceil(b.width + padding * 2));
                    const h = Math.max(20, Math.ceil(b.height + padding * 2));

                    const tempCanvasEl = document.createElement('canvas');
                    tempCanvasEl.width = w;
                    tempCanvasEl.height = h;

                    const tempCanvas = new fabric.StaticCanvas(tempCanvasEl, {
                        width: w,
                        height: h,
                        backgroundColor: 'transparent'
                    });

                    cloned.set({
                        left: w / 2,
                        top: h / 2,
                        originX: 'center',
                        originY: 'center'
                    });
                    cloned.setCoords();

                    tempCanvas.add(cloned);
                    tempCanvas.renderAll();

                    const svgContent = tempCanvas.toSVG({
                        viewBox: { x: 0, y: 0, width: w, height: h }
                    });

                    tempCanvas.dispose();

                    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${baseName}.svg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 1500);
                    if (typeof window.showToast === 'function') window.showToast(`Exported "${baseName}.svg"`);
                }, EXTRA_PROPS);
            } else if (format === 'jpg' || format === 'png') {
                const padding = 24;
                const dataUrl = activeObj.toDataURL({
                    format: 'png',
                    multiplier: 2,
                    enableRetinaScaling: true
                });

                const img = new Image();
                img.onload = () => {
                    const offCanvas = document.createElement('canvas');
                    offCanvas.width = img.width + padding * 2;
                    offCanvas.height = img.height + padding * 2;
                    const ctx = offCanvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, offCanvas.width, offCanvas.height);
                    ctx.drawImage(img, padding, padding);

                    const ext = format === 'png' ? 'png' : 'jpg';
                    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
                    const outUrl = offCanvas.toDataURL(mime, 0.95);
                    const a = document.createElement('a');
                    a.href = outUrl;
                    a.download = `${baseName}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    if (typeof window.showToast === 'function') window.showToast(`Exported "${baseName}.${ext}"`);
                };
                img.src = dataUrl;
            }
        },

        initUI() {
            const btnDownloadMenu = document.getElementById('btn-download-menu');
            const downloadDropdown = document.getElementById('download-dropdown');

            if (btnDownloadMenu && downloadDropdown) {
                btnDownloadMenu.addEventListener('click', (e) => {
                    e.stopPropagation();
                    downloadDropdown.classList.toggle('hidden');
                });

                document.addEventListener('click', () => {
                    downloadDropdown.classList.add('hidden');
                });
            }

            const btnDownloadPng = document.getElementById('btn-download-png');
            const btnDownloadSvg = document.getElementById('btn-download-svg');
            const btnDownloadPdf = document.getElementById('btn-download-pdf');
            const btnDownloadPptx = document.getElementById('btn-download-pptx');
            const btnDownloadJson = document.getElementById('btn-download-json');

            if (btnDownloadPng) btnDownloadPng.addEventListener('click', ExportModule.exportCanvasAsPNG);
            if (btnDownloadSvg) btnDownloadSvg.addEventListener('click', ExportModule.exportCanvasAsSVG);
            if (btnDownloadPdf) btnDownloadPdf.addEventListener('click', ExportModule.exportAsPDF);
            if (btnDownloadPptx) btnDownloadPptx.addEventListener('click', ExportModule.exportAsPPTX);
            if (btnDownloadJson) {
                btnDownloadJson.addEventListener('click', () => {
                    if (downloadDropdown) downloadDropdown.classList.add('hidden');
                    if (typeof window.downloadCurrentBoard === 'function') {
                        window.downloadCurrentBoard();
                    } else if (typeof window.WhiteboardApp.boards?.downloadBoard === 'function') {
                        const curId = (window.WhiteboardApp.boards.getActiveBoardId && window.WhiteboardApp.boards.getActiveBoardId()) || 'board_main';
                        window.WhiteboardApp.boards.downloadBoard(curId);
                    }
                });
            }

            // Expose globally
            window.exportCanvasAsPNG = ExportModule.exportCanvasAsPNG;
            window.exportCanvasAsSVG = ExportModule.exportCanvasAsSVG;
            window.exportAsPDF = ExportModule.exportAsPDF;
            window.exportAsPPTX = ExportModule.exportAsPPTX;
            window.exportStepBoxAsPPTX = ExportModule.exportStepBoxAsPPTX;
            window.exportActiveObjectAs = ExportModule.exportActiveObjectAs;
        }
    };

    window.WhiteboardApp.export = ExportModule;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ExportModule.initUI);
    } else {
        ExportModule.initUI();
    }

})(window);

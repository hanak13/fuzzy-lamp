/**
 * Whiteboard Web Application - Client-side Application Coordinator
 * static/js/whiteboard.js
 *
 * All application capabilities are partitioned into standalone, cohesive modules:
 * - core.js: Fabric canvas singleton, viewport transform, grid, and zoom engine
 * - tools.js: Brush configuration, stroke & eraser sizing, dynamic connector arrows
 * - shapes.js: Built-in & custom SVG shapes library, templates gallery
 * - notes.js: Sticky notes factory & stickers/media gallery controller
 * - ui.js: Flyout sidebar drawer & object property controls
 * - slides.js: Slide mode (16:9, 4:3, A4), multi-slide deck, presenter view
 * - modes.js: Mode switching, dock bar controls, theme toggling
 * - steps.js: Step Box sequential diagrams & step manager modal
 * - objects.js: Objects & layers drawer, inspection, locking, visibility
 * - interactions.js: Canvas mouse events, pan, area erase, transform controls
 * - commands.js: Keyboard shortcuts, clipboard, context menu, undo/redo
 * - boards.js: SQLite multi-board manager, autosave loop, boards sidebar
 * - export.js: PNG, SVG, PDF, and PowerPoint PPTX presentation exports
 */

(function (window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    function initWhiteboardCoordinator() {
        const canvas = (window.WhiteboardApp && window.WhiteboardApp.canvas) || window.__canvas;
        if (!canvas) {
            console.warn('[WhiteboardApp] Fabric canvas not yet ready on coordinator init.');
            return;
        }

        console.log('[WhiteboardApp] Application coordinator initialized with 12 modular subsystems.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWhiteboardCoordinator);
    } else {
        initWhiteboardCoordinator();
    }
})(window);

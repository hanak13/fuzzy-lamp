/**
 * Whiteboard Application - Presentation Extras Module
 * static/js/extras.js
 *
 * Implements:
 * - Laser pointer overlay (non-destructive, fades out) for presentations
 * - Presentation timer for slide mode (start / pause / reset)
 * - Infinite-canvas minimap with click-to-pan navigation
 */

(function (window) {
    'use strict';

    window.WhiteboardApp = window.WhiteboardApp || {};

    function getCanvas() {
        return window.__canvas || (window.WhiteboardApp && window.WhiteboardApp.canvas);
    }

    // -------------------------------------------------------------------------
    // 1. Laser Pointer
    // -------------------------------------------------------------------------
    const Laser = {
        active: false,
        overlay: null,
        ctx: null,
        points: [],
        rafId: null,
        prevState: null,

        init() {
            this.overlay = document.getElementById('laser-overlay');
            if (!this.overlay) return;
            this.ctx = this.overlay.getContext('2d');
            this.resize();
            window.addEventListener('resize', () => this.resize());

            window.addEventListener('pointermove', (e) => this.onMove(e), { passive: true });

            ['btn-laser-pointer', 'fs-btn-laser', 'btn-laser-slide'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        this.toggle();
                    });
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.active) {
                    this.disable();
                }
            });
        },

        resize() {
            if (!this.overlay) return;
            const dpr = window.devicePixelRatio || 1;
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.overlay.width = Math.round(w * dpr);
            this.overlay.height = Math.round(h * dpr);
            this.overlay.style.width = w + 'px';
            this.overlay.style.height = h + 'px';
            if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        },

        toggle() {
            if (this.active) this.disable();
            else this.enable();
        },

        enable() {
            this.active = true;
            document.body.classList.add('laser-mode');
            if (this.overlay) this.overlay.classList.remove('hidden');

            const canvas = getCanvas();
            if (canvas) {
                this.prevState = {
                    isDrawingMode: canvas.isDrawingMode,
                    selection: canvas.selection,
                    skipTargetFind: canvas.skipTargetFind,
                    defaultCursor: canvas.defaultCursor
                };
                canvas.isDrawingMode = false;
                canvas.selection = false;
                canvas.skipTargetFind = true;
                canvas.defaultCursor = 'none';
                canvas.requestRenderAll();
            }

            this.syncButtons();
            if (this.ctx) this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        },

        disable() {
            this.active = false;
            document.body.classList.remove('laser-mode');
            if (this.overlay) this.overlay.classList.add('hidden');
            this.points.length = 0;
            if (this.rafId) {
                cancelAnimationFrame(this.rafId);
                this.rafId = null;
            }
            if (this.ctx) this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            const canvas = getCanvas();
            if (canvas && this.prevState) {
                canvas.isDrawingMode = this.prevState.isDrawingMode;
                canvas.selection = this.prevState.selection;
                canvas.skipTargetFind = this.prevState.skipTargetFind;
                canvas.defaultCursor = this.prevState.defaultCursor;
                this.prevState = null;
                canvas.requestRenderAll();
            }

            this.syncButtons();
        },

        syncButtons() {
            ['btn-laser-pointer', 'fs-btn-laser', 'btn-laser-slide'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.toggle('active', this.active);
            });
        },

        onMove(e) {
            if (!this.active || !this.ctx) return;
            this.points.push({ x: e.clientX, y: e.clientY, t: performance.now() });
            if (this.points.length > 80) this.points.shift();
            if (!this.rafId) this.rafId = requestAnimationFrame(() => this.render());
        },

        render() {
            this.rafId = null;
            if (!this.ctx) return;

            const ctx = this.ctx;
            const now = performance.now();
            const W = window.innerWidth;
            const H = window.innerHeight;
            const life = 700;

            ctx.clearRect(0, 0, W, H);
            this.points = this.points.filter(p => now - p.t < life);
            if (this.points.length === 0) return;

            for (let i = 1; i < this.points.length; i++) {
                const p0 = this.points[i - 1];
                const p1 = this.points[i];
                const alpha = Math.max(0, 1 - (now - p1.t) / life);
                ctx.beginPath();
                ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.9})`;
                ctx.lineWidth = 4 + alpha * 6;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.shadowColor = 'rgba(239, 68, 68, 0.9)';
                ctx.shadowBlur = 12;
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
            }

            const last = this.points[this.points.length - 1];
            const grad = ctx.createRadialGradient(last.x, last.y, 0, last.x, last.y, 18);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.25, 'rgba(239, 68, 68, 0.9)');
            grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.shadowBlur = 0;
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(last.x, last.y, 18, 0, Math.PI * 2);
            ctx.fill();

            this.rafId = requestAnimationFrame(() => this.render());
        }
    };

    // -------------------------------------------------------------------------
    // 2. Presentation Timer
    // -------------------------------------------------------------------------
    const Timer = {
        running: false,
        startTs: 0,
        elapsed: 0,
        intervalId: null,
        display: null,
        toggleBtn: null,

        init() {
            this.display = document.getElementById('slide-timer-display');
            this.toggleBtn = document.getElementById('btn-timer-toggle');
            const resetBtn = document.getElementById('btn-timer-reset');

            if (this.toggleBtn) {
                this.toggleBtn.addEventListener('click', () => this.toggle());
            }
            if (resetBtn) {
                resetBtn.addEventListener('click', () => this.reset());
            }
            this.render();
        },

        toggle() {
            if (this.running) this.pause();
            else this.start();
        },

        start() {
            if (this.running) return;
            this.running = true;
            this.startTs = performance.now() - this.elapsed;
            this.intervalId = setInterval(() => this.tick(), 200);
            if (this.toggleBtn) {
                this.toggleBtn.textContent = 'Pause';
                this.toggleBtn.classList.add('running');
            }
            this.render();
        },

        pause() {
            if (!this.running) return;
            this.running = false;
            this.elapsed = performance.now() - this.startTs;
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            if (this.toggleBtn) {
                this.toggleBtn.textContent = 'Start';
                this.toggleBtn.classList.remove('running');
            }
            this.render();
        },

        reset() {
            this.running = false;
            this.elapsed = 0;
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            if (this.toggleBtn) {
                this.toggleBtn.textContent = 'Start';
                this.toggleBtn.classList.remove('running');
            }
            this.render();
        },

        tick() {
            this.elapsed = performance.now() - this.startTs;
            this.render();
        },

        render() {
            if (!this.display) return;
            const totalSeconds = Math.floor(this.elapsed / 1000);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            this.display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    };

    // -------------------------------------------------------------------------
    // 3. Infinite-Canvas Minimap
    // -------------------------------------------------------------------------
    const Minimap = {
        visible: false,
        panel: null,
        canvasEl: null,
        ctx: null,
        scheduled: false,
        transform: null,

        init() {
            this.panel = document.getElementById('canvas-minimap');
            this.canvasEl = document.getElementById('minimap-canvas');
            if (this.canvasEl) this.ctx = this.canvasEl.getContext('2d');

            const toggleBtn = document.getElementById('btn-minimap-toggle');
            const closeBtn = document.getElementById('btn-minimap-close');

            if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggle());
            if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
            if (this.canvasEl) {
                this.canvasEl.addEventListener('click', (e) => this.onClick(e));
            }

            const canvas = getCanvas();
            if (canvas) {
                canvas.on('after:render', () => this.schedule());
            }
            window.addEventListener('resize', () => this.schedule());

            const pref = localStorage.getItem('whiteboard_minimap_visible');
            if (pref === '1') this.show();
            else this.hide();
        },

        show() {
            this.visible = true;
            if (this.panel) this.panel.classList.remove('hidden');
            localStorage.setItem('whiteboard_minimap_visible', '1');
            this.schedule();
        },

        hide() {
            this.visible = false;
            if (this.panel) this.panel.classList.add('hidden');
            localStorage.setItem('whiteboard_minimap_visible', '0');
        },

        toggle() {
            if (this.visible) this.hide();
            else this.show();
        },

        schedule() {
            if (!this.visible || this.scheduled) return;
            this.scheduled = true;
            requestAnimationFrame(() => {
                this.scheduled = false;
                this.draw();
            });
        },

        computeBounds() {
            const canvas = getCanvas();
            if (!canvas) return null;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            canvas.getObjects().forEach(o => {
                if (o.isGridLine || o.isSlideFrame || o.isArrowHead) return;
                if (o.globalCompositeOperation === 'destination-out') return;
                if (o.visible === false) return;
                const b = o.getBoundingRect ? o.getBoundingRect(true, true) : null;
                if (!b) return;
                if (b.left < minX) minX = b.left;
                if (b.top < minY) minY = b.top;
                if (b.left + b.width > maxX) maxX = b.left + b.width;
                if (b.top + b.height > maxY) maxY = b.top + b.height;
            });

            const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
            const zoom = vpt[0] || 1;
            const vpX = -vpt[4] / zoom;
            const vpY = -vpt[5] / zoom;
            const vpW = canvas.getWidth() / zoom;
            const vpH = canvas.getHeight() / zoom;

            if (minX === Infinity) {
                minX = vpX; minY = vpY;
                maxX = vpX + vpW; maxY = vpY + vpH;
            }

            return { minX, minY, maxX, maxY, vpX, vpY, vpW, vpH };
        },

        draw() {
            const canvas = getCanvas();
            const ctx = this.ctx;
            if (!canvas || !ctx || !this.canvasEl) return;

            const W = this.canvasEl.width;
            const H = this.canvasEl.height;
            ctx.clearRect(0, 0, W, H);

            const b = this.computeBounds();
            const pad = 8;
            const contentW = Math.max(1, b.maxX - b.minX);
            const contentH = Math.max(1, b.maxY - b.minY);
            const scale = Math.min((W - pad * 2) / contentW, (H - pad * 2) / contentH);
            const offsetX = (W - contentW * scale) / 2 - b.minX * scale;
            const offsetY = (H - contentH * scale) / 2 - b.minY * scale;
            this.transform = { scale, offsetX, offsetY };

            canvas.getObjects().forEach(o => {
                if (o.isGridLine || o.isSlideFrame || o.isArrowHead) return;
                if (o.globalCompositeOperation === 'destination-out') return;
                if (o.visible === false) return;
                const r = o.getBoundingRect ? o.getBoundingRect(true, true) : null;
                if (!r) return;
                const x = offsetX + r.left * scale;
                const y = offsetY + r.top * scale;
                const w = Math.max(1, r.width * scale);
                const h = Math.max(1, r.height * scale);

                let color = o.stroke;
                if (o.fill && typeof o.fill === 'string' && o.fill !== 'transparent') {
                    color = o.fill;
                }
                ctx.fillStyle = (typeof color === 'string' && color !== 'transparent') ? color : '#94a3b8';
                ctx.globalAlpha = 0.72;
                ctx.fillRect(x, y, w, h);
            });
            ctx.globalAlpha = 1;

            const vx = offsetX + b.vpX * scale;
            const vy = offsetY + b.vpY * scale;
            const vw = b.vpW * scale;
            const vh = b.vpH * scale;
            ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
            ctx.fillRect(vx, vy, vw, vh);
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.strokeRect(vx, vy, vw, vh);
        },

        onClick(e) {
            const canvas = getCanvas();
            if (!canvas || !this.transform || !this.canvasEl) return;
            const rect = this.canvasEl.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const worldX = (px - this.transform.offsetX) / this.transform.scale;
            const worldY = (py - this.transform.offsetY) / this.transform.scale;
            const zoom = canvas.getZoom();

            canvas.viewportTransform[4] = canvas.getWidth() / 2 - worldX * zoom;
            canvas.viewportTransform[5] = canvas.getHeight() / 2 - worldY * zoom;
            canvas.requestRenderAll();

            if (typeof window.updateGrid === 'function') window.updateGrid();
            if (typeof window.updateZoomDisplay === 'function') window.updateZoomDisplay();
        }
    };

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------
    function initExtras() {
        Laser.init();
        Timer.init();
        Minimap.init();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExtras);
    } else {
        initExtras();
    }

    window.WhiteboardApp.extras = { laser: Laser, timer: Timer, minimap: Minimap };
    window.WhiteboardApp.laser = Laser;
    window.WhiteboardApp.timer = Timer;
    window.WhiteboardApp.minimap = Minimap;

})(window);

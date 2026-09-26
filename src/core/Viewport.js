import { CONFIG } from '../data/config.js';
import { clamp } from './math.js';

// Keeps the canvas sized to the available (safe-area aware) space while the
// game itself always works in logical units: width = 400, height derived from
// the aspect ratio (clamped so gameplay never gets distorted).

export class Viewport {
  constructor(app, stage, canvas) {
    this.app = app;
    this.stage = stage;
    this.canvas = canvas;
    this.W = CONFIG.WIDTH;
    this.H = 700;
    this.cssW = 400;
    this.cssH = 700;
    this.dpr = 1;
    this.scale = 1; // device pixels per logical unit
    this.listeners = [];
    this.lowQuality = false;
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', this._onResize);
    this.resize();
  }

  onResize(fn) {
    this.listeners.push(fn);
  }

  resize() {
    const rect = this.app.getBoundingClientRect();
    const cs = getComputedStyle(this.app);
    const availW = Math.max(200, rect.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    const availH = Math.max(300, rect.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));

    const aspect = clamp(availH / availW, CONFIG.MIN_ASPECT, CONFIG.MAX_ASPECT);
    let cssW = availW;
    let cssH = cssW * aspect;
    if (cssH > availH) {
      cssH = availH;
      cssW = cssH / aspect;
    }
    cssW = Math.floor(cssW);
    cssH = Math.floor(cssH);

    const maxDpr = this.lowQuality ? 1.25 : CONFIG.MAX_DPR;
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    this.cssW = cssW;
    this.cssH = cssH;
    this.W = CONFIG.WIDTH;
    this.H = Math.round(CONFIG.WIDTH * (cssH / cssW));
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.scale = this.canvas.width / this.W;

    this.stage.style.width = cssW + 'px';
    this.stage.style.height = cssH + 'px';
    // --u = CSS px per logical unit, used by the DOM UI for consistent sizing.
    const u = cssW / this.W;
    this.stage.style.setProperty('--u', u.toFixed(4));
    this.stage.style.setProperty('--ui', Math.min(u, 1.35).toFixed(4));

    for (const fn of this.listeners) fn(this);
  }

  setLowQuality(on) {
    if (this.lowQuality === on) return;
    this.lowQuality = on;
    this.resize();
  }

  // Convert a client (CSS px) delta to logical units.
  toLogical(px) {
    return px * (this.W / this.cssW);
  }

  destroy() {
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('orientationchange', this._onResize);
    if (window.visualViewport) window.visualViewport.removeEventListener('resize', this._onResize);
  }
}

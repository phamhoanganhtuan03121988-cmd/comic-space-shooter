import { Pool } from '../core/Pool.js';

// Pooled floating combat text (damage numbers, CRITICAL!, +score, item names).

export const FONT_STACK = '"Trebuchet MS", "Segoe UI", "Arial Rounded MT Bold", system-ui, sans-serif';

function makeText() {
  return { alive: false, x: 0, y: 0, vy: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 14, pop: 0, stroke: '#1b1033', style: 0 };
}

export class FloatingText {
  constructor(size) {
    this.pool = new Pool(makeText, size);
    this.fonts = new Map();
  }

  spawn(text, x, y, color = '#fff', size = 14, life = 0.8, vy = -50) {
    let t = this.pool.obtain();
    if (!t) {
      // Recycle the oldest entry so important text (crits, pickups) still shows.
      t = this.pool.active[0];
      if (!t) return null;
    }
    t.text = text;
    t.x = x;
    t.y = y;
    t.vy = vy;
    t.life = life;
    t.maxLife = life;
    t.color = color;
    t.size = size;
    t.pop = 1;
    t.style = 0;
    return t;
  }

  font(size) {
    let f = this.fonts.get(size);
    if (!f) {
      f = '900 ' + size + 'px ' + FONT_STACK;
      this.fonts.set(size, f);
    }
    return f;
  }

  update(dt) {
    const a = this.pool.active;
    for (let i = 0; i < a.length; i++) {
      const t = a[i];
      t.life -= dt;
      if (t.life <= 0) {
        t.alive = false;
        continue;
      }
      t.y += t.vy * dt;
      t.vy *= 1 - Math.min(1, dt * 2.5);
      if (t.pop > 0) t.pop = Math.max(0, t.pop - dt * 6);
    }
    this.pool.sweep();
  }

  render(ctx) {
    const a = this.pool.active;
    if (!a.length) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let i = 0; i < a.length; i++) {
      const t = a[i];
      const k = t.life / t.maxLife;
      const size = Math.round(t.size * (1 + t.pop * 0.5));
      ctx.globalAlpha = Math.min(1, k * 2.5);
      ctx.font = this.font(size);
      if (t.style === 1) {
        // comic CRIT: tilted, thick dark-red outline, two-tone orange/yellow fill
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(-0.12);
        ctx.lineWidth = Math.max(3, size * 0.34);
        ctx.strokeStyle = '#4a0a00';
        ctx.strokeText(t.text, 0, 0);
        ctx.fillStyle = '#ff6a1f';
        ctx.fillText(t.text, 0, 0);
        ctx.fillStyle = '#ffe14d';
        ctx.fillText(t.text, 0, -size * 0.12);
        ctx.restore();
        continue;
      }
      ctx.lineWidth = Math.max(2, size * 0.22);
      ctx.strokeStyle = t.stroke;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.pool.clear();
  }
}

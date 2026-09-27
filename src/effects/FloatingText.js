import { Pool } from '../core/Pool.js';

// Pooled floating combat text (damage numbers, CRITICAL!, +score, item names).

export const FONT_STACK = '"Trebuchet MS", "Segoe UI", "Arial Rounded MT Bold", system-ui, sans-serif';

function makeText() {
  return { alive: false, x: 0, y: 0, vy: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 14, pop: 0, stroke: '#0c0820', style: 0, num: null, hw: 0, hh: 0 };
}

export class FloatingText {
  constructor(size, getW = () => 400) {
    this.pool = new Pool(makeText, size);
    this.getW = getW;
    this.fonts = new Map();
  }

  spawn(text, x, y, color = '#fff', size = 14, life = 0.8, vy = -50) {
    const a = this.pool.active;
    // Small damage numbers are the least important text: skip them when the
    // screen is already busy so crits, pickups and score stay readable.
    if (size <= 12 && a.length > 30) return null;
    const crit = text.startsWith('CRIT ');
    // half extents (crits are drawn bigger, with a tag on top)
    const hw = (crit ? (text.length - 5) * 1.3 + 2 : text.length) * size * 0.32;
    const hh = crit ? size * 0.65 + 7 : size * 0.5;
    // De-overlap: nudge the new text up past recent texts at the same spot.
    // (at most 3 nudges so a busy spot can't push text far away)
    for (let i = a.length - 1, n = 0, moved = 0; i >= 0 && n < 12 && moved < 3; i--, n++) {
      const o = a[i];
      if (o.alive && Math.abs(o.x - x) < o.hw + hw && Math.abs(o.y - y) < o.hh + hh) {
        y = o.y - o.hh - hh - 1;
        moved++;
      }
    }
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
    t.style = crit ? 1 : 0;
    t.num = null;
    t.hw = hw;
    t.hh = hh;
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
    const W = this.getW();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let i = 0; i < a.length; i++) {
      const t = a[i];
      const k = t.life / t.maxLife;
      const size = Math.round(t.size * (1 + t.pop * 0.5));
      // keep the whole text on screen (e.g. tier-up callouts near the edge)
      const m = t.hw * (1 + t.pop * 0.7) + 3;
      const x = t.x < m ? m : t.x > W - m ? W - m : t.x;
      ctx.globalAlpha = Math.min(1, k * 2.5);
      ctx.font = this.font(size);
      if (t.style === 1) {
        // CRIT: small red tag over a big two-tone number, tilted, heavy outline
        if (t.num === null) t.num = t.text.startsWith('CRIT ') ? t.text.slice(5) : t.text;
        const big = Math.round(t.size * 1.3 * (1 + t.pop * 0.7));
        ctx.save();
        ctx.translate(x, t.y);
        ctx.rotate(-0.1);
        ctx.font = this.font(big);
        ctx.lineWidth = Math.max(4, big * 0.3);
        ctx.strokeStyle = '#3a0600';
        ctx.strokeText(t.num, 0, 0);
        ctx.fillStyle = '#ff6a1f';
        ctx.fillText(t.num, 0, 0);
        ctx.fillStyle = '#ffe14d';
        ctx.fillText(t.num, 0, -big * 0.12);
        // tag
        ctx.font = this.font(9);
        const tw = 30;
        ctx.fillStyle = '#e8173c';
        ctx.fillRect(-tw / 2, -big * 0.5 - 12, tw, 11);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('CRIT!', 0, -big * 0.5 - 6.2);
        ctx.restore();
        continue;
      }
      ctx.lineWidth = Math.max(2.5, size * 0.26);
      ctx.strokeStyle = t.stroke;
      ctx.strokeText(t.text, x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.pool.clear();
  }
}

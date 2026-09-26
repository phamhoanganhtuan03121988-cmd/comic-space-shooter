import { TAU } from '../core/math.js';

// Procedural sprite factory + cache. Everything is drawn once into offscreen
// canvases at SPR x resolution and then blitted with drawImage every frame,
// which is far cheaper on mobile than re-drawing paths / shadows per frame.
// To use real artwork later, replace a factory with an Image-backed sprite of
// the same logical size.

export const SPR = 2.5;
const cache = new Map();

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// Create a sprite of logical size w x h. drawFn(ctx) draws around (0, 0).
export function makeSprite(w, h, drawFn) {
  const canvas = makeCanvas(w * SPR, h * SPR);
  const ctx = canvas.getContext('2d');
  ctx.scale(SPR, SPR);
  ctx.translate(w / 2, h / 2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  drawFn(ctx);
  return { canvas, w, h };
}

// White silhouette of a sprite (for hit flashes).
export function whiteVersion(sprite) {
  const canvas = makeCanvas(sprite.canvas.width, sprite.canvas.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sprite.canvas, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, w: sprite.w, h: sprite.h };
}

export function cached(key, factory) {
  let s = cache.get(key);
  if (!s) {
    s = factory();
    cache.set(key, s);
  }
  return s;
}

export function drawSprite(ctx, s, x, y, scale = 1) {
  const w = s.w * scale;
  const h = s.h * scale;
  ctx.drawImage(s.canvas, x - w / 2, y - h / 2, w, h);
}

export function drawSpriteRot(ctx, s, x, y, angle, sx = 1, sy = sx) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.drawImage(s.canvas, (-s.w * sx) / 2, (-s.h * sy) / 2, s.w * sx, s.h * sy);
  ctx.restore();
}

// Soft radial glow, used by particles and light effects (additive blending).
export function glowSprite(color, radius = 16) {
  return cached('glow:' + color + ':' + radius, () =>
    makeSprite(radius * 2, radius * 2, (ctx) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      g.addColorStop(0, color);
      g.addColorStop(0.35, hexA(color, 0.55));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, TAU);
      ctx.fill();
    })
  );
}

export function hexA(hex, a) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function shade(hex, amt) {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  const r = f((n >> 16) & 255);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

// ---------------------------------------------------------------- bullets

export function playerBulletSprite(kind) {
  return cached('pb:' + kind, () => {
    const col = kind === 'multi' ? '#d68bff' : kind === 'rapid' ? '#ffe066' : '#5ef3ff';
    return makeSprite(14, 34, (ctx) => {
      const g = ctx.createLinearGradient(0, -17, 0, 17);
      g.addColorStop(0, hexA(col, 0.95));
      g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g;
      roundRect(ctx, -6, -15, 12, 30, 6);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, -2.6, -13, 5.2, 18, 2.6);
      ctx.fill();
    });
  });
}

export function enemyBulletSprite(kind, color) {
  return cached('eb:' + kind + color, () => {
    switch (kind) {
      case 'needle':
        return makeSprite(12, 26, (ctx) => {
          ctx.fillStyle = hexA(color, 0.35);
          ellipse(ctx, 0, 0, 6, 13);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.strokeStyle = '#2a0a1e';
          ctx.lineWidth = 1.4;
          ellipse(ctx, 0, 0, 3.8, 10);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ellipse(ctx, 0, 1, 1.6, 6);
          ctx.fill();
        });
      case 'petal':
        return makeSprite(20, 20, (ctx) => {
          ctx.fillStyle = hexA(color, 0.3);
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, TAU);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.strokeStyle = '#2a0a1e';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, -7.5);
          ctx.quadraticCurveTo(6.5, 0, 0, 7.5);
          ctx.quadraticCurveTo(-6.5, 0, 0, -7.5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, 2.2, 0, TAU);
          ctx.fill();
        });
      case 'blob':
        return makeSprite(22, 22, (ctx) => {
          ctx.fillStyle = hexA(color, 0.3);
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, TAU);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.strokeStyle = '#0d2a0d';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(-2.2, -2.2, 2.4, 0, TAU);
          ctx.fill();
        });
      case 'big':
        return makeSprite(30, 30, (ctx) => {
          ctx.fillStyle = hexA(color, 0.3);
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, TAU);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.strokeStyle = '#2a0a1e';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, TAU);
          ctx.fill();
        });
      case 'orb':
      default:
        return makeSprite(20, 20, (ctx) => {
          ctx.fillStyle = hexA(color, 0.32);
          ctx.beginPath();
          ctx.arc(0, 0, 10, 0, TAU);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.strokeStyle = '#2a0a1e';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, 6.5, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, TAU);
          ctx.fill();
        });
    }
  });
}

// ---------------------------------------------------------------- coins

export const COIN_FRAMES = 8;
export function coinSprite(frame) {
  return cached('coin:' + frame, () =>
    makeSprite(20, 20, (ctx) => {
      const sx = Math.max(0.15, Math.abs(Math.cos((frame / COIN_FRAMES) * Math.PI)));
      ctx.scale(sx, 1);
      ctx.fillStyle = '#b36b00';
      ctx.beginPath();
      ctx.arc(0, 0.8, 8, 0, TAU);
      ctx.fill();
      const g = ctx.createLinearGradient(0, -8, 0, 8);
      g.addColorStop(0, '#fff3a0');
      g.addColorStop(0.5, '#ffc933');
      g.addColorStop(1, '#ff9d00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#8a4b00';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (sx > 0.4) {
        ctx.fillStyle = '#fff8cf';
        star(ctx, 0, 0, 4, 1.8, 5);
        ctx.fill();
      }
    })
  );
}

// ---------------------------------------------------------------- items

// Glyphs are drawn in a ~16x16 box around the origin with the current style.
export function drawGlyph(ctx, id) {
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (id) {
    case 'power':
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(0, -6);
      ctx.lineTo(6, 0);
      ctx.moveTo(-6, 6);
      ctx.lineTo(0, 0);
      ctx.lineTo(6, 6);
      ctx.stroke();
      break;
    case 'rapid':
      ctx.beginPath();
      ctx.moveTo(2, -8);
      ctx.lineTo(-5, 1);
      ctx.lineTo(0, 1);
      ctx.lineTo(-2, 8);
      ctx.lineTo(5, -1);
      ctx.lineTo(0, -1);
      ctx.closePath();
      ctx.fill();
      break;
    case 'shield':
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, -5);
      ctx.quadraticCurveTo(7, 5, 0, 8.5);
      ctx.quadraticCurveTo(-7, 5, -7, -5);
      ctx.closePath();
      ctx.fill();
      break;
    case 'health':
      ctx.fillRect(-2.6, -7, 5.2, 14);
      ctx.fillRect(-7, -2.6, 14, 5.2);
      break;
    case 'multi':
      for (const a of [-0.5, 0, 0.5]) {
        ctx.save();
        ctx.rotate(a);
        ctx.beginPath();
        ctx.moveTo(0, 7);
        ctx.lineTo(0, -6);
        ctx.moveTo(-3, -3);
        ctx.lineTo(0, -7);
        ctx.lineTo(3, -3);
        ctx.stroke();
        ctx.restore();
      }
      break;
    case 'bomb':
      ctx.beginPath();
      ctx.arc(-1, 2, 5.8, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2.5, -3);
      ctx.quadraticCurveTo(4, -7, 7, -6);
      ctx.stroke();
      star(ctx, 7, -7, 3, 1.2, 4);
      ctx.fill();
      break;
    case 'magnet':
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-5, -7);
      ctx.lineTo(-5, 1);
      ctx.arc(0, 1, 5, Math.PI, 0, true);
      ctx.lineTo(5, -7);
      ctx.stroke();
      break;
    case 'slow':
      ctx.beginPath();
      ctx.moveTo(-6, -7);
      ctx.lineTo(6, -7);
      ctx.lineTo(-6, 7);
      ctx.lineTo(6, 7);
      ctx.closePath();
      ctx.stroke();
      break;
    case 'crit':
      star(ctx, 0, 0, 8.5, 3, 4);
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, TAU);
      ctx.fill();
  }
}

export function itemSprite(id, color) {
  return cached('item:' + id, () =>
    makeSprite(40, 40, (ctx) => {
      const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 20);
      glow.addColorStop(0, hexA(color, 0.6));
      glow.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
      ctx.fill();
      // capsule body
      const g = ctx.createRadialGradient(-4, -5, 2, 0, 0, 14);
      g.addColorStop(0, shade(color, 0.35));
      g.addColorStop(0.7, color);
      g.addColorStop(1, shade(color, -0.25));
      ctx.fillStyle = g;
      ctx.strokeStyle = '#1b1033';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 10.5, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      ctx.save();
      ctx.scale(0.9, 0.9);
      drawGlyph(ctx, id);
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.ellipse(-5, -7, 4, 2.2, -0.5, 0, TAU);
      ctx.fill();
    })
  );
}

// Data URL of an item icon (used by DOM screens, e.g. upgrade list).
export function itemIconDataURL(id, color) {
  return itemSprite(id, color).canvas.toDataURL();
}

// ---------------------------------------------------------------- helpers

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}

export function star(ctx, x, y, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * TAU - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

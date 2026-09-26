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

// 4-point lens flare star (additive): used for impacts and explosion flashes.
export function flareSprite(color) {
  return cached('flare:' + color, () =>
    makeSprite(64, 64, (ctx) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.4, hexA(color, 0.7));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, TAU);
      ctx.fill();
      for (const [len, wid, a] of [
        [32, 3.2, 0],
        [20, 2.2, Math.PI / 4],
      ]) {
        for (let i = 0; i < 4; i++) {
          ctx.save();
          ctx.rotate(a + (i * Math.PI) / 2);
          const rg = ctx.createLinearGradient(0, 0, 0, -len);
          rg.addColorStop(0, 'rgba(255,255,255,0.95)');
          rg.addColorStop(0.3, hexA(color, 0.7));
          rg.addColorStop(1, hexA(color, 0));
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.moveTo(-wid, 0);
          ctx.lineTo(0, -len);
          ctx.lineTo(wid, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    })
  );
}

// Fireball core (additive): white-hot centre fading through the tint colour.
export function fireSprite(color) {
  return cached('fire:' + color, () =>
    makeSprite(48, 48, (ctx) => {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.2, 'rgba(255,245,190,0.95)');
      g.addColorStop(0.45, hexA(color, 0.8));
      g.addColorStop(0.75, hexA(shade(color, -0.25), 0.35));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, TAU);
      ctx.fill();
    })
  );
}

// Soft smoke puff (normal blend).
export function smokeSprite() {
  return cached('smoke', () =>
    makeSprite(40, 40, (ctx) => {
      const g = ctx.createRadialGradient(-3, -3, 2, 0, 0, 20);
      g.addColorStop(0, 'rgba(120,100,160,0.55)');
      g.addColorStop(0.6, 'rgba(60,45,95,0.35)');
      g.addColorStop(1, 'rgba(40,30,70,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, TAU);
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

const PLAYER_BULLET_COLORS = {
  normal: ['#5ef3ff', '#2b8cff'],
  rapid: ['#ffe066', '#ff8a1f'],
  multi: ['#ff9af0', '#b44dff'],
};

// Plasma bolt: tapered glowing trail + hot white core with a pointed tip.
export function playerBulletSprite(kind) {
  return cached('pb:' + kind, () => {
    const [light, deep] = PLAYER_BULLET_COLORS[kind] || PLAYER_BULLET_COLORS.normal;
    return makeSprite(14, 38, (ctx) => {
      // trail
      const tg = ctx.createLinearGradient(0, -8, 0, 19);
      tg.addColorStop(0, hexA(deep, 0.7));
      tg.addColorStop(1, hexA(deep, 0));
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.moveTo(-4.5, -4);
      ctx.lineTo(0, 19);
      ctx.lineTo(4.5, -4);
      ctx.closePath();
      ctx.fill();
      // halo
      const hg = ctx.createRadialGradient(0, -9, 1, 0, -8, 7);
      hg.addColorStop(0, hexA(light, 0.9));
      hg.addColorStop(1, hexA(deep, 0));
      ctx.fillStyle = hg;
      ellipse(ctx, 0, -8, 7, 11);
      ctx.fill();
      // body
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.moveTo(0, -18.5);
      ctx.quadraticCurveTo(4, -12, 3.6, 2);
      ctx.quadraticCurveTo(0, 6, -3.6, 2);
      ctx.quadraticCurveTo(-4, -12, 0, -20);
      ctx.fill();
      // hot core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(2, -11, 1.8, -1);
      ctx.quadraticCurveTo(0, 1.5, -1.8, -1);
      ctx.quadraticCurveTo(-2, -11, 0, -17);
      ctx.fill();
    });
  });
}

// Enemy shots: neon ring + white-hot core + a dark outline so they read on
// any background (enemy bullets must always be the most legible thing).
function enemyOrb(ctx, color, r) {
  const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.75);
  halo.addColorStop(0, hexA(color, 0.55));
  halo.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.75, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1a0716';
  ctx.beginPath();
  ctx.arc(0, 0, r + 1.3, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.42, '#ffffff');
  g.addColorStop(0.6, shade(color, 0.25));
  g.addColorStop(1, color);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = shade(color, 0.4);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.75, 0, TAU);
  ctx.stroke();
}

export function enemyBulletSprite(kind, color) {
  return cached('eb:' + kind + color, () => {
    switch (kind) {
      case 'needle':
        return makeSprite(16, 32, (ctx) => {
          const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 14);
          halo.addColorStop(0, hexA(color, 0.6));
          halo.addColorStop(1, hexA(color, 0));
          ctx.fillStyle = halo;
          ellipse(ctx, 0, 0, 8, 15);
          ctx.fill();
          ctx.fillStyle = '#1a0716';
          ellipse(ctx, 0, 0, 5, 12);
          ctx.fill();
          ctx.fillStyle = color;
          ellipse(ctx, 0, 0, 3.8, 10.5);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ellipse(ctx, 0, 1.5, 1.7, 7);
          ctx.fill();
        });
      case 'petal':
        return makeSprite(24, 24, (ctx) => {
          const halo = ctx.createRadialGradient(0, 0, 3, 0, 0, 12);
          halo.addColorStop(0, hexA(color, 0.55));
          halo.addColorStop(1, hexA(color, 0));
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, TAU);
          ctx.fill();
          const petal = (sc) => {
            ctx.beginPath();
            ctx.moveTo(0, -8 * sc);
            ctx.quadraticCurveTo(7 * sc, 0, 0, 8 * sc);
            ctx.quadraticCurveTo(-7 * sc, 0, 0, -8 * sc);
          };
          ctx.fillStyle = '#1a0716';
          petal(1.2);
          ctx.fill();
          ctx.fillStyle = color;
          petal(1);
          ctx.fill();
          ctx.fillStyle = '#fff';
          petal(0.45);
          ctx.fill();
        });
      case 'blob':
        return makeSprite(26, 26, (ctx) => {
          enemyOrb(ctx, color, 7);
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(-2.4, -2.4, 1.8, 0, TAU);
          ctx.fill();
        });
      case 'big':
        return makeSprite(36, 36, (ctx) => enemyOrb(ctx, color, 10.5));
      case 'orb':
      default:
        return makeSprite(24, 24, (ctx) => enemyOrb(ctx, color, 6.5));
    }
  });
}

// ---------------------------------------------------------------- coins

export const COIN_FRAMES = 8;
export function coinSprite(frame) {
  return cached('coin:' + frame, () =>
    makeSprite(22, 22, (ctx) => {
      const sx = Math.max(0.12, Math.abs(Math.cos((frame / COIN_FRAMES) * Math.PI)));
      // soft golden glow
      const h = ctx.createRadialGradient(0, 0, 4, 0, 0, 11);
      h.addColorStop(0, 'rgba(255,210,63,0.45)');
      h.addColorStop(1, 'rgba(255,210,63,0)');
      ctx.fillStyle = h;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, TAU);
      ctx.fill();
      ctx.scale(sx, 1);
      // edge (thickness shows when the coin turns)
      ctx.fillStyle = '#a35a00';
      ctx.beginPath();
      ctx.arc(0.8 / sx, 0.8, 8, 0, TAU);
      ctx.fill();
      const g = ctx.createLinearGradient(-6, -8, 6, 8);
      g.addColorStop(0, '#fff7c2');
      g.addColorStop(0.45, '#ffcf33');
      g.addColorStop(1, '#e08600');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 7.8, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#7a3f00';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,210,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 5.8, 0, TAU);
      ctx.stroke();
      if (sx > 0.4) {
        ctx.fillStyle = '#b86a00';
        star(ctx, 0.5, 0.6, 3.8, 1.7, 5);
        ctx.fill();
        ctx.fillStyle = '#fff8d6';
        star(ctx, 0, 0, 3.8, 1.7, 5);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ellipse(ctx, -3, -4, 2.2, 1.1, -0.6);
      ctx.fill();
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

// Power-up capsule: glowing halo, chrome bezel ring, glossy coloured gem
// and a bold outlined icon. Glow is baked with shadowBlur at cache time.
export function itemSprite(id, color) {
  return cached('item:' + id, () =>
    makeSprite(44, 44, (ctx) => {
      const glow = ctx.createRadialGradient(0, 0, 9, 0, 0, 22);
      glow.addColorStop(0, hexA(color, 0.75));
      glow.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, TAU);
      ctx.fill();
      // chrome bezel
      const bz = ctx.createLinearGradient(-14, -14, 14, 14);
      bz.addColorStop(0, '#ffffff');
      bz.addColorStop(0.45, '#aeb6de');
      bz.addColorStop(1, '#4b5390');
      ctx.fillStyle = bz;
      ctx.strokeStyle = '#150f2c';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 14.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // gem
      const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, 12);
      g.addColorStop(0, shade(color, 0.45));
      g.addColorStop(0.55, color);
      g.addColorStop(1, shade(color, -0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 11.5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = shade(color, -0.45);
      ctx.lineWidth = 1;
      ctx.stroke();
      // icon: dark outline pass then white
      ctx.save();
      ctx.scale(0.88, 0.88);
      ctx.fillStyle = shade(color, -0.55);
      ctx.strokeStyle = shade(color, -0.55);
      ctx.translate(0.6, 1);
      drawGlyph(ctx, id);
      ctx.translate(-0.6, -1);
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ffffff';
      drawGlyph(ctx, id);
      ctx.restore();
      // glass highlight
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(-4.5, -6.5, 5, 2.4, -0.5, 0, TAU);
      ctx.fill();
    })
  );
}

// Soft rotating light burst drawn behind power-ups (additive).
export function raysSprite(color) {
  return cached('rays:' + color, () =>
    makeSprite(80, 80, (ctx) => {
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((i / 8) * TAU);
        const len = i % 2 ? 26 : 38;
        const g = ctx.createLinearGradient(0, 0, 0, -len);
        g.addColorStop(0, hexA(color, 0.8));
        g.addColorStop(1, hexA(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-4.5, 0);
        ctx.lineTo(0, -len);
        ctx.lineTo(4.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
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

import { makeSprite, cached, whiteVersion, ellipse, shade, hexA, makeCanvas, SPR } from './Sprites.js';
import { TAU } from '../core/math.js';

// Original cartoon space critters, "neon arcade" style: lit gradients, glossy
// highlights, expressive eyes and glowing accents. Each sprite is rendered
// once per animation frame and then gets a coloured glow halo baked around
// its silhouette (shadowBlur at cache time only). Hitboxes come from
// data/enemies.js and are not affected by the art size.

const OUT = '#150f2c';

// Frames per critter (Enemy.js cycles through them).
export const ENEMY_FRAMES = { blobling: 2, zipfly: 3, rockshell: 2, spitter: 2, swirlie: 3, spikeling: 3 };

function neon(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function plain(ctx) {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

function gloss(ctx, x, y, rx, ry, rot = -0.5, a = 0.6) {
  ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fill();
}

// Lit body: light from the top-left, darker rim, thick cartoon outline.
function body(ctx, color, fn, cx = -4, cy = -8, r = 24) {
  const g = ctx.createRadialGradient(cx, cy, 1, 0, 0, r);
  g.addColorStop(0, shade(color, 0.35));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -0.32));
  ctx.fillStyle = g;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.2;
  fn();
  ctx.fill();
  ctx.stroke();
}

function eye(ctx, x, y, r, iris = '#2b1a5c', lookY = 1, closed = false) {
  if (closed) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x, y + r * 0.7, x + r, y);
    ctx.stroke();
    return;
  }
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#d9d6f2');
  ctx.fillStyle = g;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  const py = y + r * 0.28 * lookY;
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x, py, r * 0.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = OUT;
  ctx.beginPath();
  ctx.arc(x, py, r * 0.32, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - r * 0.25, py - r * 0.25, r * 0.2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + r * 0.2, py + r * 0.18, r * 0.09, 0, TAU);
  ctx.fill();
}

const ART = {
  // Green one-eyed goo with a glowing antenna and drippy skirt.
  blobling(ctx, f) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(5, -18, 3, -21);
    ctx.stroke();
    neon(ctx, '#fff27a', 8);
    ctx.fillStyle = '#fff6a8';
    ctx.beginPath();
    ctx.arc(3, -21.5, 3, 0, TAU);
    ctx.fill();
    plain(ctx);
    body(ctx, '#45e05a', () => {
      ctx.beginPath();
      ctx.moveTo(-16, 5);
      ctx.bezierCurveTo(-17, -18, 17, -18, 16, 5);
      ctx.quadraticCurveTo(15, 13, 10, 11);
      ctx.quadraticCurveTo(7, 17, 3.5, 11.5);
      ctx.quadraticCurveTo(0, 15, -3.5, 11.5);
      ctx.quadraticCurveTo(-7, 17, -10, 11);
      ctx.quadraticCurveTo(-15, 13, -16, 5);
      ctx.closePath();
    });
    // inner slime bubbles
    ctx.fillStyle = 'rgba(210,255,190,0.45)';
    ctx.beginPath();
    ctx.arc(9, 4, 2.2, 0, TAU);
    ctx.arc(-10, 2, 1.4, 0, TAU);
    ctx.arc(6, -9, 1.2, 0, TAU);
    ctx.fill();
    gloss(ctx, -8, -8, 3.2, 5.5, -0.5, 0.55);
    eye(ctx, 0, -2, 7, '#1e9e4a', 1, f === 1);
    ctx.fillStyle = '#7a1535';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-4, 6);
    ctx.quadraticCurveTo(0, 10, 4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },

  // Fuzzy neon bee with big glossy compound eyes and glowing veined wings.
  zipfly(ctx, f) {
    const wa = [-0.55, -0.15, 0.2][f];
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.scale(sx, 1);
      ctx.rotate(wa);
      neon(ctx, '#5ef3ff', 6);
      ctx.fillStyle = 'rgba(190,245,255,0.55)';
      ctx.strokeStyle = 'rgba(120,230,255,0.95)';
      ctx.lineWidth = 1.3;
      ellipse(ctx, 12, -7, 10, 5.5, -0.35);
      ctx.fill();
      ctx.stroke();
      plain(ctx);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(4, -4);
      ctx.lineTo(19, -9);
      ctx.moveTo(8, -5);
      ctx.lineTo(15, -3);
      ctx.stroke();
      ctx.restore();
    }
    body(ctx, '#ffcf2e', () => ellipse(ctx, 0, 2, 10.5, 12));
    // fuzz / stripes
    ctx.fillStyle = OUT;
    ctx.beginPath();
    ctx.ellipse(0, 5, 10, 2.2, 0, 0, TAU);
    ctx.ellipse(0, 10, 7.8, 1.9, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,170,0.8)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 3, -9);
      ctx.lineTo(i * 3.4, -11);
      ctx.stroke();
    }
    // stinger
    ctx.fillStyle = OUT;
    ctx.beginPath();
    ctx.moveTo(-2.5, 13);
    ctx.lineTo(0, 19);
    ctx.lineTo(2.5, 13);
    ctx.fill();
    // antennae
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-3, -9);
    ctx.quadraticCurveTo(-7, -15, -9, -14);
    ctx.moveTo(3, -9);
    ctx.quadraticCurveTo(7, -15, 9, -14);
    ctx.stroke();
    // compound eyes
    for (const sx of [-1, 1]) {
      const g = ctx.createRadialGradient(sx * 4.5 - 1.5, -6, 0.5, sx * 4.5, -4, 5.5);
      g.addColorStop(0, '#9ff3ff');
      g.addColorStop(0.5, '#2b8cff');
      g.addColorStop(1, '#1a2b7a');
      ctx.fillStyle = g;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ellipse(ctx, sx * 4.8, -4, 4.6, 5.4);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx * 4.8 - 1.4, -6, 1.4, 0, TAU);
      ctx.fill();
    }
    gloss(ctx, -5, 1, 2, 3, -0.4, 0.45);
  },

  // Armoured crystal beetle: dark violet shell with glowing crystal spikes.
  rockshell(ctx, f) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3.2;
    for (const sx of [-1, 1]) {
      for (const k of [0, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * (12 + k * 5), 6 + k * 2);
        ctx.lineTo(sx * (21 + k * 2), (f === 0 ? 15 : 12) + k * 3);
        ctx.stroke();
      }
    }
    // face under the shell
    body(ctx, '#ff9bc4', () => ellipse(ctx, 0, 12, 11, 8), 0, 8, 12);
    eye(ctx, -4.5, 11, 3.4, '#8a2be2', 1, f === 1);
    eye(ctx, 4.5, 11, 3.4, '#8a2be2', 1, f === 1);
    // shell dome
    body(
      ctx,
      '#6a3fd1',
      () => {
        ctx.beginPath();
        ctx.moveTo(-23, 8);
        ctx.bezierCurveTo(-25, -25, 25, -25, 23, 8);
        ctx.quadraticCurveTo(0, 14, -23, 8);
        ctx.closePath();
      },
      -6,
      -12,
      28
    );
    // armour plates with glowing seams
    neon(ctx, '#c77dff', 6);
    ctx.strokeStyle = '#d9a8ff';
    ctx.lineWidth = 1.3;
    ctx.fillStyle = shade('#6a3fd1', 0.12);
    for (const [x, y, r] of [
      [0, -8, 6.5],
      [-11.5, -1, 5.2],
      [11.5, -1, 5.2],
      [-6, 5, 3.6],
      [6, 5, 3.6],
    ]) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + Math.PI / 6;
        const px = x + Math.cos(a) * r;
        const py = y + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // crystal spikes
    const crystal = (x, y, h, w) => {
      const g = ctx.createLinearGradient(x - w, y, x + w, y - h);
      g.addColorStop(0, '#7a3cff');
      g.addColorStop(0.5, '#e0b3ff');
      g.addColorStop(1, '#ffffff');
      ctx.fillStyle = g;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.lineTo(x, y - h);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    neon(ctx, '#e0a3ff', 10);
    crystal(0, -16, 12, 4);
    crystal(-10, -12, 7, 3);
    crystal(10, -12, 7, 3);
    plain(ctx);
    gloss(ctx, -10, -9, 4.5, 2.5, -0.6, 0.45);
  },

  // Orange squid gunner with a mechanical glowing snout cannon.
  spitter(ctx, f) {
    for (let i = 0; i < 4; i++) {
      const x = -9 + i * 6;
      const tip = x + (i % 2 ? 3 : -3) + (f ? 2 : -2);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, -8);
      ctx.quadraticCurveTo(x + (f ? 4 : -4), -16, tip, -21);
      ctx.stroke();
      ctx.strokeStyle = '#ffb36b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    body(ctx, '#ff7a1f', () => ellipse(ctx, 0, -1, 15.5, 13.5));
    // spots
    ctx.fillStyle = 'rgba(255,220,160,0.55)';
    ctx.beginPath();
    ctx.arc(-10, -7, 1.8, 0, TAU);
    ctx.arc(10, -8, 1.4, 0, TAU);
    ctx.arc(-11, 3, 1.2, 0, TAU);
    ctx.fill();
    // cannon snout (metal)
    const mg = ctx.createLinearGradient(-6, 0, 6, 0);
    mg.addColorStop(0, '#5a6490');
    mg.addColorStop(0.5, '#c9d1f2');
    mg.addColorStop(1, '#4a5380');
    ctx.fillStyle = mg;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6.5, 6);
    ctx.lineTo(-5, 17);
    ctx.lineTo(5, 17);
    ctx.lineTo(6.5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    neon(ctx, '#ff4f5e', 8);
    ctx.fillStyle = '#ff6b5e';
    ellipse(ctx, 0, 17.5, 4.5, 2);
    ctx.fill();
    plain(ctx);
    eye(ctx, -6, -3, 5, '#d1311f', 1, f === 1);
    eye(ctx, 6, -3, 5, '#d1311f', 1, f === 1);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-12, -10);
    ctx.lineTo(-3, -7.5);
    ctx.moveTo(12, -10);
    ctx.lineTo(3, -7.5);
    ctx.stroke();
    gloss(ctx, -8, -9, 3, 1.8, -0.4, 0.5);
  },

  // Neon jellyfish: translucent glowing dome, luminous waving tentacles.
  swirlie(ctx, f) {
    const wave = [0, 1, -1][f];
    neon(ctx, '#ff5ec8', 8);
    for (let i = 0; i < 5; i++) {
      const x = -10 + i * 5;
      const w = (wave + (i % 2 ? 1 : -1)) * 2.4;
      ctx.strokeStyle = i % 2 ? '#ff9ae6' : '#9ff3ff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, 3);
      ctx.bezierCurveTo(x + w, 9, x - w, 14, x + w, 21);
      ctx.stroke();
    }
    plain(ctx);
    // dome (semi translucent)
    const g = ctx.createRadialGradient(-4, -10, 1, 0, -4, 20);
    g.addColorStop(0, '#ffe0f6');
    g.addColorStop(0.45, 'rgba(255,94,200,0.95)');
    g.addColorStop(1, 'rgba(160,30,140,0.95)');
    ctx.fillStyle = g;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.bezierCurveTo(-17, -20, 17, -20, 16, 4);
    ctx.quadraticCurveTo(12, 8, 8, 5);
    ctx.quadraticCurveTo(4, 9, 0, 5);
    ctx.quadraticCurveTo(-4, 9, -8, 5);
    ctx.quadraticCurveTo(-12, 8, -16, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // inner glowing core
    neon(ctx, '#ffffff', 8);
    ctx.fillStyle = 'rgba(255,230,250,0.75)';
    ellipse(ctx, 0, -8, 6, 4);
    ctx.fill();
    plain(ctx);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(-9, -6, 2, 0, TAU);
    ctx.arc(9, -9, 1.5, 0, TAU);
    ctx.fill();
    eye(ctx, -5, -1.5, 3.6, '#7a1a8c', 1, false);
    eye(ctx, 5, -1.5, 3.6, '#7a1a8c', 1, false);
    ctx.fillStyle = '#ff9ad5';
    ellipse(ctx, -10.5, 1.5, 2.4, 1.3);
    ctx.fill();
    ellipse(ctx, 10.5, 1.5, 2.4, 1.3);
    ctx.fill();
    gloss(ctx, -8, -11, 3.5, 2, -0.5, 0.55);
  },

  // Red horned imp-ball with bat wings and spikes — loves dive attacks.
  spikeling(ctx, f) {
    const flap = [-0.35, 0, 0.35][f];
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.scale(sx, 1);
      ctx.rotate(flap);
      ctx.fillStyle = '#8e1030';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(9, -4);
      ctx.lineTo(23, -12);
      ctx.lineTo(21, -3);
      ctx.lineTo(25, 2);
      ctx.lineTo(17, 2);
      ctx.lineTo(18, 7);
      ctx.lineTo(10, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,120,140,0.7)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(10, -2);
      ctx.lineTo(22, -10);
      ctx.moveTo(10, 0);
      ctx.lineTo(23, 1);
      ctx.stroke();
      ctx.restore();
    }
    // spikes
    ctx.fillStyle = '#ffd6dc';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-3, 11.5);
      ctx.lineTo(0, 18);
      ctx.lineTo(3, 11.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // horns
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffe9c4';
      ctx.beginPath();
      ctx.moveTo(sx * 5, -11);
      ctx.quadraticCurveTo(sx * 11, -17, sx * 10, -22);
      ctx.quadraticCurveTo(sx * 8, -15, sx * 1.5, -12.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    body(ctx, '#ff3350', () => {
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, TAU);
    });
    // glowing yellow eyes
    neon(ctx, '#ffd23f', 6);
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#fff27a';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx * 1.5, -3);
      ctx.lineTo(sx * 9, -5.5);
      ctx.lineTo(sx * 7.5, 1);
      ctx.closePath();
      ctx.fill();
    }
    plain(ctx);
    ctx.fillStyle = OUT;
    ctx.beginPath();
    ctx.arc(-5, -2.5, 1.4, 0, TAU);
    ctx.arc(5, -2.5, 1.4, 0, TAU);
    ctx.fill();
    // toothy grin
    ctx.fillStyle = '#3a0612';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.quadraticCurveTo(0, 11, 6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 2.2 - 1, 4.5);
      ctx.lineTo(i * 2.2, 7);
      ctx.lineTo(i * 2.2 + 1, 4.5);
      ctx.fill();
    }
    gloss(ctx, -6, -7, 3.2, 2, -0.6, 0.5);
  },
};

const GLOW_COLORS = {
  blobling: '#6dff6b',
  zipfly: '#ffd23f',
  rockshell: '#b27dff',
  spitter: '#ff9b3d',
  swirlie: '#ff5ec8',
  spikeling: '#ff4d5e',
};

// Bake a soft coloured halo around the silhouette of a sprite.
function withHalo(sprite, color) {
  const c = makeCanvas(sprite.canvas.width, sprite.canvas.height);
  const ctx = c.getContext('2d');
  ctx.shadowColor = hexA(color, 0.85);
  ctx.shadowBlur = 7 * SPR;
  ctx.drawImage(sprite.canvas, 0, 0);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.drawImage(sprite.canvas, 0, 0);
  return { canvas: c, w: sprite.w, h: sprite.h };
}

export function enemySprite(art, radius, frame) {
  return cached('enemy:' + art + ':' + frame, () => {
    const size = radius * 2 + 34;
    const raw = makeSprite(size, size, (ctx) => ART[art](ctx, frame));
    return withHalo(raw, GLOW_COLORS[art] || '#ffffff');
  });
}

export function enemyWhite(art, radius, frame) {
  return cached('enemyW:' + art + ':' + frame, () => whiteVersion(enemySprite(art, radius, frame)));
}

// Exported for the level-select / how-to-play screens.
export function enemyIconDataURL(art, radius) {
  return enemySprite(art, radius, 0).canvas.toDataURL();
}

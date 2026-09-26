import { makeSprite, cached, whiteVersion, ellipse, shade } from './Sprites.js';
import { TAU } from '../core/math.js';

// Original cartoon space critters. Each art function draws frame 0 or 1
// (blink / wing flap / tentacle wave) centred on the origin.

const OUT = '#1b1033';

function eye(ctx, x, y, r, lookY = 1, closed = false) {
  if (closed) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.quadraticCurveTo(x, y + r * 0.6, x + r, y);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = OUT;
  ctx.beginPath();
  ctx.arc(x, y + r * 0.3 * lookY, r * 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.05, r * 0.18, 0, TAU);
  ctx.fill();
}

function body(ctx, color, fn) {
  const g = ctx.createLinearGradient(0, -20, 0, 20);
  g.addColorStop(0, shade(color, 0.22));
  g.addColorStop(1, shade(color, -0.2));
  ctx.fillStyle = g;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  fn();
  ctx.fill();
  ctx.stroke();
}

const ART = {
  blobling(ctx, f) {
    // antenna
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(4, -18, 2, -20);
    ctx.stroke();
    ctx.fillStyle = '#fff27a';
    ctx.beginPath();
    ctx.arc(2, -20, 2.6, 0, TAU);
    ctx.fill();
    ctx.stroke();
    body(ctx, '#62e85a', () => {
      ctx.beginPath();
      ctx.moveTo(-15, 6);
      ctx.bezierCurveTo(-16, -16, 16, -16, 15, 6);
      ctx.quadraticCurveTo(13, 13, 8, 11);
      ctx.quadraticCurveTo(4, 15, 0, 11);
      ctx.quadraticCurveTo(-4, 15, -8, 11);
      ctx.quadraticCurveTo(-13, 13, -15, 6);
      ctx.closePath();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ellipse(ctx, -7, -6, 3, 4.5, -0.4);
    ctx.fill();
    eye(ctx, 0, -2, 6, 1, f === 1);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 5, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  },

  zipfly(ctx, f) {
    // wings
    ctx.fillStyle = 'rgba(200,240,255,0.75)';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    const wa = f === 0 ? -0.5 : 0.1;
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.scale(sx, 1);
      ctx.rotate(wa);
      ellipse(ctx, 11, -6, 9, 5, -0.4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    body(ctx, '#ffd93d', () => ellipse(ctx, 0, 0, 10, 12));
    // stripes
    ctx.fillStyle = OUT;
    ctx.fillRect(-9, 3, 18, 2.6);
    ctx.fillRect(-7.5, 7.5, 15, 2.2);
    // stinger
    ctx.beginPath();
    ctx.moveTo(-2.5, 11);
    ctx.lineTo(0, 17);
    ctx.lineTo(2.5, 11);
    ctx.fill();
    // big compound eyes
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ff3d6e';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.4;
      ellipse(ctx, sx * 4.5, -5, 4.2, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx * 4.5 - 1.2, -6.5, 1.3, 0, TAU);
      ctx.fill();
    }
  },

  rockshell(ctx, f) {
    // legs
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 14, 8);
      ctx.lineTo(sx * 21, f === 0 ? 16 : 13);
      ctx.stroke();
    }
    // face peeking out below
    body(ctx, '#ffb3d1', () => ellipse(ctx, 0, 12, 10, 7));
    eye(ctx, -4, 11, 3, 1, f === 1);
    eye(ctx, 4, 11, 3, 1, f === 1);
    // shell dome
    body(ctx, '#9a6bff', () => {
      ctx.beginPath();
      ctx.moveTo(-22, 8);
      ctx.bezierCurveTo(-24, -24, 24, -24, 22, 8);
      ctx.quadraticCurveTo(0, 13, -22, 8);
      ctx.closePath();
    });
    // hex plates
    ctx.strokeStyle = shade('#9a6bff', -0.35);
    ctx.lineWidth = 1.6;
    ctx.fillStyle = shade('#9a6bff', 0.12);
    for (const [x, y, r] of [
      [0, -8, 6],
      [-11, -1, 5],
      [11, -1, 5],
      [-6, 4, 3.5],
      [6, 4, 3.5],
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
    // crystal spike
    ctx.fillStyle = '#9ff3ff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-3, -16);
    ctx.lineTo(0, -25);
    ctx.lineTo(3, -16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ellipse(ctx, -9, -10, 4, 2.4, -0.6);
    ctx.fill();
  },

  spitter(ctx, f) {
    // top tentacles
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3.2;
    for (let i = 0; i < 4; i++) {
      const x = -9 + i * 6;
      ctx.beginPath();
      ctx.moveTo(x, -8);
      ctx.quadraticCurveTo(x + (f ? 3 : -3), -16, x + (i % 2 ? 3 : -3), -20);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffb36b';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const x = -9 + i * 6;
      ctx.beginPath();
      ctx.moveTo(x, -8);
      ctx.quadraticCurveTo(x + (f ? 3 : -3), -16, x + (i % 2 ? 3 : -3), -20);
      ctx.stroke();
    }
    body(ctx, '#ff8a2e', () => ellipse(ctx, 0, -1, 15, 13));
    // snout / cannon pointing down
    body(ctx, '#ffb36b', () => {
      ctx.beginPath();
      ctx.moveTo(-6, 7);
      ctx.lineTo(-4.5, 17);
      ctx.lineTo(4.5, 17);
      ctx.lineTo(6, 7);
      ctx.closePath();
    });
    ctx.fillStyle = OUT;
    ellipse(ctx, 0, 17, 4.5, 2);
    ctx.fill();
    eye(ctx, -6, -3, 4.5, 1, f === 1);
    eye(ctx, 6, -3, 4.5, 1, f === 1);
    // angry brows
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-11, -10);
    ctx.lineTo(-3, -7);
    ctx.moveTo(11, -10);
    ctx.lineTo(3, -7);
    ctx.stroke();
  },

  swirlie(ctx, f) {
    // tentacles
    ctx.lineWidth = 2.6;
    for (let i = 0; i < 5; i++) {
      const x = -10 + i * 5;
      const w = (f === 0 ? 1 : -1) * (i % 2 ? 1 : -1) * 3;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(x, 3);
      ctx.bezierCurveTo(x + w, 9, x - w, 13, x + w, 19);
      ctx.stroke();
      ctx.strokeStyle = '#ffa8e8';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    body(ctx, '#ff5ec8', () => {
      ctx.beginPath();
      ctx.moveTo(-15, 4);
      ctx.bezierCurveTo(-16, -19, 16, -19, 15, 4);
      ctx.quadraticCurveTo(0, 8, -15, 4);
      ctx.closePath();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const [x, y, r] of [
      [-7, -9, 2.4],
      [6, -11, 1.8],
      [9, -4, 1.4],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    eye(ctx, -5, -3, 3.4, 1, f === 1);
    eye(ctx, 5, -3, 3.4, 1, f === 1);
    ctx.fillStyle = '#ff9ad5';
    ellipse(ctx, -10, 0, 2.4, 1.4);
    ctx.fill();
    ellipse(ctx, 10, 0, 2.4, 1.4);
    ctx.fill();
  },

  spikeling(ctx, f) {
    ctx.fillStyle = '#ffd6dc';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + (f ? 0.12 : 0);
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(-3.5, -11);
      ctx.lineTo(0, -19);
      ctx.lineTo(3.5, -11);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    body(ctx, '#ff4d5e', () => {
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, TAU);
    });
    eye(ctx, -4.5, -2, 3.6, 1.4, false);
    eye(ctx, 4.5, -2, 3.6, 1.4, false);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-9, -8);
    ctx.lineTo(-2, -5);
    ctx.moveTo(9, -8);
    ctx.lineTo(2, -5);
    ctx.stroke();
    // teeth grin
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(-5, 5);
    ctx.lineTo(5, 5);
    ctx.lineTo(3, 9);
    ctx.lineTo(1.5, 6.5);
    ctx.lineTo(0, 9);
    ctx.lineTo(-1.5, 6.5);
    ctx.lineTo(-3, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
};

export function enemySprite(art, radius, frame) {
  return cached('enemy:' + art + ':' + frame, () => {
    const size = radius * 2 + 24;
    return makeSprite(size, size, (ctx) => ART[art](ctx, frame));
  });
}

export function enemyWhite(art, radius, frame) {
  return cached('enemyW:' + art + ':' + frame, () => whiteVersion(enemySprite(art, radius, frame)));
}

// Exported for the level-select / how-to-play screens.
export function enemyIconDataURL(art, radius) {
  return enemySprite(art, radius, 0).canvas.toDataURL();
}


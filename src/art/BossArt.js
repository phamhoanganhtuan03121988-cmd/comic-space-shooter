import { ellipse, shade, star, hexA, makeCanvas, whiteVersion } from './Sprites.js';
import { TAU } from '../core/math.js';

// Boss artwork, split for quality AND speed:
//   base(ctx, phase)  detailed static body, rendered ONCE per phase into a
//                     cached sprite (gradients, trims, baked neon halo)
//   back(ctx, b)      animated parts behind the body (wings, legs, tentacles)
//   front(ctx, b)     animated parts on top (eyes, mouth, lights, charge glow)
// Per-frame neon is faked with layered additive strokes (no shadowBlur per
// frame, which is slow on mobile GPUs).
//
// `b` = boss state: t, charge (0..1 telegraph), lookX/lookY, rage, phaseIndex.

const OUT = '#130d28';
const BOSS_SPR = 2; // cached boss sprites resolution multiplier

function neon(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function plain(ctx) {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

function gloss(ctx, x, y, rx, ry, rot = -0.5, a = 0.55) {
  ctx.fillStyle = 'rgba(255,255,255,' + a + ')';
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fill();
}

function metal(ctx, x0, x1, dark = '#3f4775', light = '#d5dcff') {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, dark);
  g.addColorStop(0.45, light);
  g.addColorStop(1, dark);
  return g;
}

// Cheap neon stroke for per-frame parts: wide faint + medium + bright core.
function glowPath(ctx, pathFn, color, width) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.18;
  ctx.lineWidth = width * 3;
  pathFn();
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = width * 1.6;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = width * 0.45;
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';
}

function glowDot(ctx, x, y, r, color, a = 1) {
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
  g.addColorStop(0.3, hexA(color, 0.9 * a));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

function bigEye(ctx, x, y, r, b, iris) {
  const sg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  sg.addColorStop(0, '#ffffff');
  sg.addColorStop(1, '#cfcbee');
  ctx.fillStyle = sg;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  const px = x + b.lookX * r * 0.35;
  const py = y + b.lookY * r * 0.35;
  const ig = ctx.createRadialGradient(px, py, 1, px, py, r * 0.58);
  ig.addColorStop(0, shade(iris, 0.4));
  ig.addColorStop(1, shade(iris, -0.25));
  ctx.fillStyle = ig;
  ctx.beginPath();
  ctx.arc(px, py, r * 0.58, 0, TAU);
  ctx.fill();
  ctx.fillStyle = OUT;
  ctx.beginPath();
  ctx.arc(px, py, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px - r * 0.22, py - r * 0.24, r * 0.15, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + r * 0.18, py + r * 0.15, r * 0.07, 0, TAU);
  ctx.fill();
}

function chargeGlow(ctx, x, y, r, color, k) {
  if (k <= 0.02) return;
  glowDot(ctx, x, y, r * (0.7 + k), color, Math.min(1, k * 1.2));
}

function crown(ctx, cx, cy, w, h) {
  const g = ctx.createLinearGradient(0, cy - h, 0, cy);
  g.addColorStop(0, '#fff3a0');
  g.addColorStop(0.5, '#ffc933');
  g.addColorStop(1, '#d47a00');
  ctx.fillStyle = g;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(cx - w, cy);
  ctx.lineTo(cx - w - 4, cy - h * 0.9);
  ctx.lineTo(cx - w * 0.5, cy - h * 0.45);
  ctx.lineTo(cx, cy - h * 1.1);
  ctx.lineTo(cx + w * 0.5, cy - h * 0.45);
  ctx.lineTo(cx + w + 4, cy - h * 0.9);
  ctx.lineTo(cx + w, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b35f00';
  ctx.fillRect(cx - w, cy - 6, w * 2, 6);
  ctx.strokeRect(cx - w, cy - 6, w * 2, 6);
  for (const [x, y, c, r] of [
    [cx, cy - h * 0.55, '#ff3d6e', 5.5],
    [cx - w * 0.62, cy - h * 0.38, '#43e6ff', 4],
    [cx + w * 0.62, cy - h * 0.38, '#43e6ff', 4],
  ]) {
    neon(ctx, c, 10);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    plain(ctx);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.3, 0, TAU);
    ctx.fill();
  }
}

export const BOSS_ART = {
  // ------------------------------------------------------------ KING GLOOP
  kingGloop: {
    box: [240, 220],
    halo: '#6dff6b',
    squash: true,
    base(ctx) {
      // slime body with drips
      const g = ctx.createRadialGradient(-30, -25, 8, 0, 10, 100);
      g.addColorStop(0, '#e2ffc9');
      g.addColorStop(0.35, '#7dff6b');
      g.addColorStop(0.75, '#2fc446');
      g.addColorStop(1, '#136b2a');
      ctx.fillStyle = g;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-88, 18);
      ctx.bezierCurveTo(-96, -60, 96, -60, 88, 18);
      ctx.quadraticCurveTo(86, 48, 64, 52);
      ctx.quadraticCurveTo(58, 74, 48, 56);
      ctx.quadraticCurveTo(30, 64, 18, 56);
      ctx.quadraticCurveTo(8, 80, -4, 57);
      ctx.quadraticCurveTo(-22, 66, -34, 55);
      ctx.quadraticCurveTo(-46, 70, -56, 54);
      ctx.quadraticCurveTo(-84, 50, -88, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // inner darker core + rim light
      ctx.fillStyle = 'rgba(20,120,40,0.25)';
      ellipse(ctx, 6, 22, 58, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(230,255,210,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 12, 76, Math.PI * 1.15, Math.PI * 1.55);
      ctx.stroke();
      gloss(ctx, -52, -18, 16, 9, -0.6, 0.55);
      gloss(ctx, -30, -34, 6, 3.5, -0.4, 0.5);
      // cheeks
      ctx.fillStyle = 'rgba(255,120,160,0.45)';
      ellipse(ctx, -54, 18, 10, 6);
      ctx.fill();
      ellipse(ctx, 54, 18, 10, 6);
      ctx.fill();
      crown(ctx, 0, -40, 34, 38);
    },
    front(ctx, b) {
      // bubbles rising inside the slime
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 7; i++) {
        const y = 48 - ((b.t * 16 + i * 21) % 76);
        const x = -62 + i * 21 + Math.sin(b.t + i) * 4;
        ctx.beginPath();
        ctx.arc(x, y, 2.5 + (i % 3), 0, TAU);
        ctx.fill();
      }
      bigEye(ctx, -30, -4, 18, b, '#1e9e4a');
      bigEye(ctx, 30, -4, 18, b, '#1e9e4a');
      if (b.rage > 0 || b.charge > 0.3) {
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-46, -30);
        ctx.lineTo(-16, -22);
        ctx.moveTo(46, -30);
        ctx.lineTo(16, -22);
        ctx.stroke();
      }
      const open = 4 + b.charge * 16;
      ctx.fillStyle = '#5c0b2a';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ellipse(ctx, 0, 30, 25, open);
      ctx.fill();
      ctx.stroke();
      if (open > 8) {
        ctx.fillStyle = '#ff7aa8';
        ellipse(ctx, 0, 30 + open * 0.45, 12, open * 0.35);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillRect(-12, 30 - open + 1, 7, 5);
        ctx.fillRect(5, 30 - open + 1, 7, 5);
      }
      chargeGlow(ctx, 0, 56, 26, '#8cff5a', b.charge);
    },
  },

  // ------------------------------------------------------------ BUZZ BARON
  buzzBaron: {
    box: [220, 190],
    halo: '#ffd23f',
    back(ctx, b) {
      const flap = Math.sin(b.t * 50);
      ctx.globalCompositeOperation = 'lighter';
      for (const sx of [-1, 1]) {
        for (const k of [0, 1]) {
          ctx.save();
          ctx.scale(sx, 1);
          ctx.rotate(-0.6 - k * 0.45 + flap * 0.12);
          ctx.fillStyle = 'rgba(120,220,255,' + (0.28 + 0.1 * flap) + ')';
          ellipse(ctx, 72, -10, 62 - k * 14, 21 - k * 4);
          ctx.fill();
          ctx.strokeStyle = 'rgba(160,240,255,0.7)';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(200,250,255,0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(14, -6);
          ctx.lineTo(120 - k * 20, -14);
          ctx.moveTo(30, -2);
          ctx.lineTo(96 - k * 16, 2);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    base(ctx) {
      // gun pods
      for (const sx of [-1, 1]) {
        ctx.fillStyle = metal(ctx, sx * 55 - 26, sx * 55 + 26);
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.arc(sx * 55, -8, 25, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx * 55, -8, 20, Math.PI * 1.1, Math.PI * 1.5);
        ctx.stroke();
        // barrels
        ctx.fillStyle = metal(ctx, sx * 55 - 8, sx * 55 + 8, '#262c52', '#8d97c8');
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 2.2;
        ctx.fillRect(sx * 55 - 8, 10, 6, 20);
        ctx.strokeRect(sx * 55 - 8, 10, 6, 20);
        ctx.fillRect(sx * 55 + 2, 10, 6, 20);
        ctx.strokeRect(sx * 55 + 2, 10, 6, 20);
        // core socket (lit per frame)
        ctx.fillStyle = '#1b1636';
        ctx.beginPath();
        ctx.arc(sx * 55, -10, 10, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      // thorax: amber armour + black segments + neon stripes
      const g = ctx.createRadialGradient(-12, -36, 4, 0, -18, 46);
      g.addColorStop(0, '#fff4b0');
      g.addColorStop(0.45, '#ffc933');
      g.addColorStop(1, '#a86b00');
      ctx.fillStyle = g;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ellipse(ctx, 0, -18, 39, 42);
      ctx.fill();
      ctx.stroke();
      for (const y of [-42, -22, -2]) {
        ctx.fillStyle = '#1e1734';
        ctx.beginPath();
        ctx.ellipse(0, y, 37 - Math.abs(y + 20) * 0.22, 5.5, 0, 0, TAU);
        ctx.fill();
        neon(ctx, '#ff9b3d', 8);
        ctx.strokeStyle = '#ffb35e';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, y, 30 - Math.abs(y + 20) * 0.2, 2.2, 0, 0, TAU);
        ctx.stroke();
        plain(ctx);
      }
      ctx.fillStyle = '#fff6c2';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(i * 12, -32, 2, 0, TAU);
        ctx.arc(i * 12, -12, 1.6, 0, TAU);
        ctx.fill();
      }
      gloss(ctx, -18, -44, 10, 5, -0.4, 0.5);
      // head
      const hg = ctx.createRadialGradient(-8, 20, 3, 0, 30, 32);
      hg.addColorStop(0, '#6b6390');
      hg.addColorStop(1, '#221c3d');
      ctx.fillStyle = hg;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ellipse(ctx, 0, 30, 31, 25);
      ctx.fill();
      ctx.stroke();
      // mandibles + stinger cannon
      ctx.fillStyle = metal(ctx, -10, 10);
      ctx.beginPath();
      ctx.moveTo(-10, 48);
      ctx.lineTo(0, 66);
      ctx.lineTo(10, 48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-19, 46);
      ctx.quadraticCurveTo(-24, 56, -9, 61);
      ctx.moveTo(19, 46);
      ctx.quadraticCurveTo(24, 56, 9, 61);
      ctx.stroke();
      // visor sockets
      for (const sx of [-1, 1]) {
        ctx.fillStyle = '#12091f';
        ellipse(ctx, sx * 13, 27, 13, 11, sx * 0.3);
        ctx.fill();
        ctx.stroke();
      }
    },
    front(ctx, b) {
      const pulse = 0.75 + 0.25 * Math.sin(b.t * 6);
      for (const sx of [-1, 1]) {
        // red visor eyes
        const eg = ctx.createRadialGradient(sx * 13 + b.lookX * 2, 26, 1, sx * 13, 27, 12);
        eg.addColorStop(0, '#ffffff');
        eg.addColorStop(0.3, '#ff5e7a');
        eg.addColorStop(1, '#8a0022');
        ctx.fillStyle = eg;
        ellipse(ctx, sx * 13, 27, 11, 9.5, sx * 0.3);
        ctx.fill();
        glowDot(ctx, sx * 13, 27, 18, '#ff3d6e', 0.45 * pulse);
        // pod cores
        const pc = b.rage > 0 ? '#ff4f5e' : '#ffd23f';
        ctx.fillStyle = pc;
        ctx.beginPath();
        ctx.arc(sx * 55, -10, 7, 0, TAU);
        ctx.fill();
        glowDot(ctx, sx * 55, -10, 18, pc, pulse);
      }
      chargeGlow(ctx, 0, 66, 22, '#ffd23f', b.charge);
    },
  },

  // ------------------------------------------------------------ BROODMOTHER
  broodmother: {
    box: [230, 230],
    halo: '#b27dff',
    back(ctx, b) {
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        for (const sx of [-1, 1]) {
          const base = -22 + i * 22;
          const sw = Math.sin(b.t * 3 + i + (sx > 0 ? 1.5 : 0)) * 8;
          ctx.strokeStyle = OUT;
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.moveTo(sx * 60, base);
          ctx.quadraticCurveTo(sx * 102, base - 32 + sw, sx * 110, base + 30 + sw);
          ctx.stroke();
          ctx.strokeStyle = '#7a45d6';
          ctx.lineWidth = 4.5;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(220,190,255,0.6)';
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }
    },
    base(ctx) {
      // crystal spikes on the back (behind the sac)
      const crystal = (x, y, h, w, rot) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        const g = ctx.createLinearGradient(-w, 0, w, -h);
        g.addColorStop(0, '#6b2bd9');
        g.addColorStop(0.55, '#e0b3ff');
        g.addColorStop(1, '#ffffff');
        ctx.fillStyle = g;
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-w, 0);
        ctx.lineTo(0, -h);
        ctx.lineTo(w, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      };
      neon(ctx, '#d59bff', 14);
      crystal(0, -64, 34, 10, 0);
      crystal(-34, -58, 26, 8, -0.45);
      crystal(34, -58, 26, 8, 0.45);
      crystal(-60, -36, 18, 6, -0.9);
      crystal(60, -36, 18, 6, 0.9);
      plain(ctx);
      // sac
      const g = ctx.createRadialGradient(-24, -40, 10, 0, -12, 92);
      g.addColorStop(0, '#e6ccff');
      g.addColorStop(0.5, '#8c52e8');
      g.addColorStop(1, '#3a1470');
      ctx.fillStyle = g;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3.2;
      ellipse(ctx, 0, -14, 79, 65);
      ctx.fill();
      ctx.stroke();
      // veins
      ctx.strokeStyle = 'rgba(50,10,100,0.55)';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 6; i++) {
        const a = -2.75 + i * 0.52;
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.quadraticCurveTo(Math.cos(a) * 40 + 8, -14 + Math.sin(a) * 30, Math.cos(a) * 72, -14 + Math.sin(a) * 58);
        ctx.stroke();
      }
      // egg sockets
      for (let i = 0; i < 6; i++) {
        const a = -2.8 + i * 0.5;
        ctx.fillStyle = 'rgba(30,8,60,0.7)';
        ellipse(ctx, Math.cos(a) * 46, -18 + Math.sin(a) * 34, 11, 13);
        ctx.fill();
      }
      gloss(ctx, -38, -48, 14, 7, -0.5, 0.45);
      // head
      const hg = ctx.createRadialGradient(-10, 38, 3, 0, 46, 40);
      hg.addColorStop(0, '#6a3aa8');
      hg.addColorStop(1, '#241046');
      ctx.fillStyle = hg;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ellipse(ctx, 0, 46, 39, 27);
      ctx.fill();
      ctx.stroke();
      gloss(ctx, -16, 36, 8, 3.5, -0.3, 0.35);
    },
    front(ctx, b) {
      // pulsing glowing eggs
      for (let i = 0; i < 6; i++) {
        const a = -2.8 + i * 0.5;
        const x = Math.cos(a) * 46;
        const y = -18 + Math.sin(a) * 34;
        const k = 0.5 + 0.5 * Math.sin(b.t * 4 + i * 1.3);
        const eg = ctx.createRadialGradient(x - 3, y - 4, 1, x, y, 13);
        eg.addColorStop(0, '#f6ffd0');
        eg.addColorStop(0.5, 'rgba(190,255,110,' + (0.6 + k * 0.4) + ')');
        eg.addColorStop(1, 'rgba(60,160,40,0.9)');
        ctx.fillStyle = eg;
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 2;
        ellipse(ctx, x, y, 9 + k * 1.5, 11 + k * 1.5);
        ctx.fill();
        ctx.stroke();
        glowDot(ctx, x, y, 16, '#b8ff3d', 0.25 + k * 0.35);
      }
      // six glowing eyes
      const ec = b.rage > 0 ? '#ff3d6e' : '#ff9b3d';
      for (const [x, y, r] of [
        [-18, 40, 7],
        [18, 40, 7],
        [-7, 35, 5],
        [7, 35, 5],
        [-27, 50, 4],
        [27, 50, 4],
      ]) {
        const ex = x + b.lookX * 2;
        const ey = y + b.lookY * 2;
        ctx.fillStyle = ec;
        ctx.beginPath();
        ctx.arc(ex, ey, r, 0, TAU);
        ctx.fill();
        glowDot(ctx, ex, ey, r * 2.2, ec, 0.5);
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex - r * 0.3, ey - r * 0.3, r * 0.3, 0, TAU);
        ctx.fill();
      }
      // mandibles
      const m = 6 + b.charge * 10;
      ctx.fillStyle = '#efe2ff';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.6;
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sx * 12, 62);
        ctx.quadraticCurveTo(sx * (15 + m), 77, sx * 4, 86);
        ctx.lineTo(sx * 8, 69);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      chargeGlow(ctx, 0, 72, 26, '#c77dff', b.charge);
    },
  },

  // ------------------------------------------------------------ JELLYTRON
  jellytron: {
    box: [240, 190],
    oy: -18,
    halo: '#43e6ff',
    back(ctx, b) {
      // neon tentacles with glowing tips
      for (let i = 0; i < 10; i++) {
        const x0 = -63 + i * 14;
        const sw = Math.sin(b.t * 2.4 + i * 0.7) * 15;
        const sw2 = Math.sin(b.t * 3.1 + i) * 11;
        const len = 104 + (i % 3) * 10;
        const col = i % 2 ? '#43e6ff' : '#ff4fd8';
        glowPath(
          ctx,
          () => {
            ctx.beginPath();
            ctx.moveTo(x0, 30);
            ctx.bezierCurveTo(x0 + sw, 58, x0 - sw2, 82, x0 + sw * 0.8, len);
          },
          col,
          3
        );
        glowDot(ctx, x0 + sw * 0.8, len, 7, col, 0.9);
      }
    },
    base(ctx) {
      // saucer ring
      const rg = ctx.createLinearGradient(0, 8, 0, 44);
      rg.addColorStop(0, '#c9d1f2');
      rg.addColorStop(0.5, '#6f7a99');
      rg.addColorStop(1, '#2f3558');
      ctx.fillStyle = rg;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ellipse(ctx, 0, 26, 92, 22);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#262c52';
      ellipse(ctx, 0, 32, 70, 11);
      ctx.fill();
      neon(ctx, '#43e6ff', 12);
      ctx.strokeStyle = '#7ff3ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 26, 88, 19, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
      plain(ctx);
      // dome glass
      const g = ctx.createRadialGradient(-24, -52, 8, 0, -18, 92);
      g.addColorStop(0, 'rgba(235,255,255,0.97)');
      g.addColorStop(0.45, 'rgba(90,210,255,0.8)');
      g.addColorStop(1, 'rgba(90,50,200,0.92)');
      ctx.fillStyle = g;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-80, 20);
      ctx.bezierCurveTo(-86, -82, 86, -82, 80, 20);
      ctx.quadraticCurveTo(0, 34, -80, 20);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // brain
      const bg = ctx.createRadialGradient(-12, -34, 3, 0, -22, 44);
      bg.addColorStop(0, '#ffe0f0');
      bg.addColorStop(0.6, '#ff8fc6');
      bg.addColorStop(1, '#c2408a');
      ctx.fillStyle = bg;
      ctx.strokeStyle = '#8a1f5a';
      ctx.lineWidth = 2;
      ellipse(ctx, 0, -24, 44, 29);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      for (let i = -3; i <= 3; i++) {
        ctx.moveTo(i * 10, -50);
        ctx.quadraticCurveTo(i * 10 + 7, -26, i * 10, 0);
      }
      ctx.stroke();
      // glass reflections
      gloss(ctx, -46, -40, 16, 7, -0.8, 0.6);
      gloss(ctx, 44, -30, 5, 12, 0.5, 0.25);
    },
    front(ctx, b) {
      // chasing rim lights
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + b.t * 1.6;
        if (Math.sin(a) < -0.05) continue;
        const x = Math.cos(a) * 80;
        const y = 26 + Math.sin(a) * 17;
        const on = (Math.floor(b.t * 8) + i) % 3 === 0;
        glowDot(ctx, x, y, on ? 9 : 6, on ? '#fff275' : b.rage > 0 ? '#ff4f5e' : '#43e6ff', on ? 1 : 0.8);
      }
      // brain pulse + core eye
      glowDot(ctx, 0, -24, 40 + Math.sin(b.t * 3) * 4, b.rage > 0 ? '#ff4f7a' : '#ff9ad5', 0.25);
      const k = 0.6 + 0.4 * Math.sin(b.t * 5);
      glowDot(ctx, 0, 12, 24, b.rage > 0 ? '#ff4f5e' : '#43e6ff', 0.6 + k * 0.4);
      chargeGlow(ctx, 0, 60, 28, '#43e6ff', b.charge);
    },
  },

  // ------------------------------------------------------------ VOID EMPRESS
  voidEmpress: {
    box: [260, 250],
    phased: true,
    halo: '#ff2e88',
    back(ctx, b) {
      const pc = VOID_COLORS[Math.min(b.phaseIndex, 3)];
      // tentacles
      for (let i = 0; i < 6; i++) {
        const x0 = -50 + i * 20;
        const sw = Math.sin(b.t * 2 + i) * 18;
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(x0, 40);
        ctx.bezierCurveTo(x0 + sw, 80, x0 - sw, 100, x0 + sw * 0.5, 124);
        ctx.stroke();
        ctx.strokeStyle = '#4b1a70';
        ctx.lineWidth = 6;
        ctx.stroke();
        glowDot(ctx, x0 + sw * 0.5, 124, 8, pc, 0.8);
      }
      // orbiting crystal shards with light trails
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + b.t * (0.5 + b.rage * 0.6);
        const x = Math.cos(a) * 110;
        const y = Math.sin(a) * 74;
        glowDot(ctx, x, y, 14, pc, 0.45);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = shade(pc, 0.3);
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(6.5, 0);
        ctx.lineTo(0, 13);
        ctx.lineTo(-6.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    },
    base(ctx, phase) {
      const pc = VOID_COLORS[Math.min(phase, 3)];
      // side orbs
      for (const sx of [-1, 1]) {
        const og = ctx.createRadialGradient(sx * 70 - 6, 22, 3, sx * 70, 30, 28);
        og.addColorStop(0, '#ffffff');
        og.addColorStop(0.35, pc);
        og.addColorStop(1, '#2a0630');
        neon(ctx, pc, 18);
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(sx * 70, 30, 27, 0, TAU);
        ctx.fill();
        plain(ctx);
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.strokeStyle = '#c9b3ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx * 70, 30, 31, Math.PI * 0.2, Math.PI * 0.8);
        ctx.stroke();
      }
      // horns
      for (const sx of [-1, 1]) {
        const hg = ctx.createLinearGradient(sx * 12, -66, sx * 56, -114);
        hg.addColorStop(0, '#8e7ab8');
        hg.addColorStop(1, '#f4ecff');
        ctx.fillStyle = hg;
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(sx * 30, -60);
        ctx.quadraticCurveTo(sx * 64, -92, sx * 54, -116);
        ctx.quadraticCurveTo(sx * 44, -86, sx * 10, -66);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // cosmic sphere body
      const g = ctx.createRadialGradient(-26, -32, 8, 0, 0, 82);
      g.addColorStop(0, '#7c4ad0');
      g.addColorStop(0.55, '#2d0f4d');
      g.addColorStop(1, '#0d0318');
      ctx.fillStyle = g;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(0, 0, 73, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // galaxy swirl
      ctx.strokeStyle = hexA(pc, 0.35);
      ctx.lineWidth = 3;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let i = 0; i <= 30; i++) {
          const a = i * 0.25 + k * Math.PI;
          const r = 20 + i * 1.6;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r * 0.8;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      // stars
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 16; i++) {
        const a = i * 2.39;
        const r = 18 + ((i * 17) % 50);
        ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, i % 3 ? 1.6 : 2.4, i % 3 ? 1.6 : 2.4);
      }
      // rim light
      neon(ctx, pc, 16);
      ctx.strokeStyle = hexA(pc, 0.9);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 70, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      plain(ctx);
      // glowing cracks as she gets angrier
      if (phase > 0) {
        neon(ctx, pc, 10);
        ctx.strokeStyle = shade(pc, 0.3);
        ctx.lineWidth = 1.5 + phase;
        ctx.beginPath();
        ctx.moveTo(-62, -22);
        ctx.lineTo(-42, -10);
        ctx.lineTo(-50, 12);
        ctx.moveTo(56, -32);
        ctx.lineTo(38, -12);
        ctx.lineTo(52, 8);
        if (phase > 1) {
          ctx.moveTo(-12, 62);
          ctx.lineTo(0, 46);
          ctx.lineTo(14, 64);
          ctx.moveTo(-30, -62);
          ctx.lineTo(-18, -48);
        }
        ctx.stroke();
        plain(ctx);
      }
      // eye socket
      ctx.fillStyle = '#12041f';
      ellipse(ctx, 0, 0, 53, 37);
      ctx.fill();
      // crown gem
      neon(ctx, pc, 16);
      ctx.fillStyle = pc;
      star(ctx, 0, -82, 14, 5.5, 4);
      ctx.fill();
      plain(ctx);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    front(ctx, b) {
      const pc = VOID_COLORS[Math.min(b.phaseIndex, 3)];
      // side orbs pulse
      const k = 0.5 + 0.5 * Math.sin(b.t * 4);
      glowDot(ctx, -70, 30, 34, pc, 0.25 + k * 0.3);
      glowDot(ctx, 70, 30, 34, pc, 0.25 + k * 0.3);
      // the eye
      const sg = ctx.createRadialGradient(-12, -10, 4, 0, 0, 50);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(1, '#d8cfee');
      ctx.fillStyle = sg;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ellipse(ctx, 0, 0, 49, 33);
      ctx.fill();
      ctx.stroke();
      const px = b.lookX * 16;
      const py = b.lookY * 9;
      const ig = ctx.createRadialGradient(px, py, 2, px, py, 24);
      ig.addColorStop(0, '#ffffff');
      ig.addColorStop(0.3, shade(pc, 0.25));
      ig.addColorStop(1, shade(pc, -0.45));
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.arc(px, py, 24, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = hexA(shade(pc, -0.5), 0.8);
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        ctx.beginPath();
        ctx.moveTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9);
        ctx.lineTo(px + Math.cos(a) * 21, py + Math.sin(a) * 21);
        ctx.stroke();
      }
      ctx.fillStyle = OUT;
      ellipse(ctx, px, py, 5 + b.charge * 5, 17);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px - 9, py - 9, 4.5, 0, TAU);
      ctx.fill();
      // slow blink
      const blink = Math.max(0, Math.sin(b.t * 0.7) - 0.97) * 30;
      if (blink > 0) {
        ctx.fillStyle = '#2d0f4d';
        ellipse(ctx, 0, -33 + blink * 33, 51, 33 * blink);
        ctx.fill();
      }
      glowDot(ctx, 0, -82, 22, pc, 0.35 + k * 0.3);
      chargeGlow(ctx, 0, 0, 44, pc, b.charge * 0.8);
    },
  },
};

const VOID_COLORS = ['#b27dff', '#ff5ec8', '#ff4f5e', '#ffb13d'];

// -------------------------------------------------------------- cache
// Only the bosses currently on screen are kept (big canvases), keyed by
// art + phase; a new boss clears the previous one's sprites.
let cacheArt = '';
const baseCache = new Map();

export function bossBase(artKey, phase) {
  if (artKey !== cacheArt) {
    baseCache.clear();
    cacheArt = artKey;
  }
  const art = BOSS_ART[artKey];
  const key = art.phased ? phase : 0;
  let s = baseCache.get(key);
  if (!s) {
    s = renderBase(art, key);
    baseCache.set(key, s);
  }
  return s;
}

export function bossBaseWhite(artKey, phase) {
  const art = BOSS_ART[artKey];
  const key = 'w' + (art.phased ? phase : 0);
  bossBase(artKey, phase);
  let s = baseCache.get(key);
  if (!s) {
    s = whiteVersion(bossBase(artKey, phase));
    baseCache.set(key, s);
  }
  return s;
}

function renderBase(art, phase) {
  const [w, h] = art.box;
  const c = makeCanvas(w * BOSS_SPR, h * BOSS_SPR);
  const ctx = c.getContext('2d');
  ctx.scale(BOSS_SPR, BOSS_SPR);
  ctx.translate(w / 2, h / 2 - (art.oy || 0));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  art.base(ctx, phase);
  // bake a soft neon halo around the whole silhouette
  const out = makeCanvas(c.width, c.height);
  const o = out.getContext('2d');
  o.shadowColor = hexA(art.halo, 0.7);
  o.shadowBlur = 16 * BOSS_SPR;
  o.drawImage(c, 0, 0);
  o.shadowBlur = 0;
  o.shadowColor = 'transparent';
  o.drawImage(c, 0, 0);
  return { canvas: out, w, h, oy: art.oy || 0 };
}

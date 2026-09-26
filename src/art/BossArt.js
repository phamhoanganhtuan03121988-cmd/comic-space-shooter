import { ellipse, shade, star } from './Sprites.js';
import { TAU } from '../core/math.js';

// Animated boss artwork, redrawn every frame into the boss buffer.
// Each function receives the boss state `b` with:
//   t (time), charge (0..1 attack telegraph), lookX/lookY (-1..1 towards the
//   player), rage (0..1 grows with each phase), phaseIndex.

const OUT = '#1b1033';

function bigEye(ctx, x, y, r, b, irisColor = '#1b1033') {
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  const px = x + b.lookX * r * 0.35;
  const py = y + b.lookY * r * 0.35;
  ctx.fillStyle = irisColor;
  ctx.beginPath();
  ctx.arc(px, py, r * 0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = OUT;
  ctx.beginPath();
  ctx.arc(px, py, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(px - r * 0.2, py - r * 0.22, r * 0.14, 0, TAU);
  ctx.fill();
}

function brows(ctx, x, y, w, angle) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-x - w, y - angle);
  ctx.lineTo(-x + w, y + angle);
  ctx.moveTo(x + w, y - angle);
  ctx.lineTo(x - w, y + angle);
  ctx.stroke();
}

function chargeGlow(ctx, x, y, r, color, k) {
  if (k <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * (0.6 + k));
  g.addColorStop(0, 'rgba(255,255,255,' + 0.9 * k + ')');
  g.addColorStop(0.4, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = k;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * (0.6 + k), 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export const BOSS_ART = {
  kingGloop(ctx, b) {
    const t = b.t;
    // body
    const N = 28;
    const g = ctx.createRadialGradient(-20, -20, 10, 0, 10, 95);
    g.addColorStop(0, '#b6ff9e');
    g.addColorStop(0.6, '#4fd94a');
    g.addColorStop(1, '#23942c');
    ctx.fillStyle = g;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU;
      const w = 1 + 0.04 * Math.sin(a * 3 + t * 3) + 0.03 * Math.sin(a * 5 - t * 2.3);
      let x = Math.cos(a) * 86 * w;
      let y = 12 + Math.sin(a) * 62 * w;
      if (y > 50) y = 50 + (y - 50) * 0.4 + Math.max(0, Math.sin(a * 6 + t * 2)) * 8; // drips
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // bubbles inside
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 6; i++) {
      const y = 50 - ((t * 18 + i * 23) % 80);
      const x = -60 + i * 24 + Math.sin(t + i) * 5;
      ctx.beginPath();
      ctx.arc(x, y, 3 + (i % 3), 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ellipse(ctx, -45, -22, 14, 8, -0.6);
    ctx.fill();
    // crown
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-34, -40);
    ctx.lineTo(-38, -72);
    ctx.lineTo(-18, -54);
    ctx.lineTo(0, -80);
    ctx.lineTo(18, -54);
    ctx.lineTo(38, -72);
    ctx.lineTo(34, -40);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (const [x, y, c] of [
      [0, -52, '#ff4f5e'],
      [-22, -48, '#43e6ff'],
      [22, -48, '#43e6ff'],
    ]) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // eyes
    bigEye(ctx, -30, -6, 17, b);
    bigEye(ctx, 30, -6, 17, b);
    if (b.rage > 0 || b.charge > 0.3) brows(ctx, 30, -28, 14, 6);
    // mouth
    const open = 4 + b.charge * 16;
    ctx.fillStyle = '#6b0f2e';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ellipse(ctx, 0, 32, 24, open);
    ctx.fill();
    ctx.stroke();
    if (open > 8) {
      ctx.fillStyle = '#ff7aa8';
      ellipse(ctx, 0, 32 + open * 0.45, 12, open * 0.35);
      ctx.fill();
    }
    chargeGlow(ctx, 0, 55, 22, 'rgba(120,255,110,0.8)', b.charge);
  },

  buzzBaron(ctx, b) {
    const t = b.t;
    // wings
    const flap = Math.sin(t * 50);
    ctx.strokeStyle = 'rgba(27,16,51,0.6)';
    ctx.lineWidth = 2;
    for (const sx of [-1, 1]) {
      for (const k of [0, 1]) {
        ctx.save();
        ctx.scale(sx, 1);
        ctx.rotate(-0.6 - k * 0.45 + flap * 0.12);
        ctx.fillStyle = 'rgba(190,240,255,' + (0.35 + 0.15 * flap) + ')';
        ellipse(ctx, 70, -10, 60 - k * 14, 20 - k * 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
    // gun pods
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#8d97b5';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx * 55, -8, 24, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5a6485';
      ctx.fillRect(sx * 55 - 6, 8, 12, 18);
      ctx.strokeRect(sx * 55 - 6, 8, 12, 18);
      ctx.fillStyle = b.rage > 0 ? '#ff4f5e' : '#ffd23f';
      ctx.beginPath();
      ctx.arc(sx * 55, -10, 8, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // thorax (metal yellow + black stripes)
    const g = ctx.createLinearGradient(-40, 0, 40, 0);
    g.addColorStop(0, '#c99a00');
    g.addColorStop(0.5, '#ffe066');
    g.addColorStop(1, '#c99a00');
    ctx.fillStyle = g;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ellipse(ctx, 0, -18, 38, 40);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2a1f3d';
    for (const y of [-40, -22, -4]) {
      ctx.beginPath();
      ctx.ellipse(0, y, 36 - Math.abs(y + 20) * 0.2, 5, 0, 0, TAU);
      ctx.fill();
    }
    // rivets
    ctx.fillStyle = '#fff6c2';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(i * 12, -31, 2, 0, TAU);
      ctx.fill();
    }
    // head (towards the player)
    ctx.fillStyle = '#3d3556';
    ctx.strokeStyle = OUT;
    ellipse(ctx, 0, 30, 30, 24);
    ctx.fill();
    ctx.stroke();
    // visor eyes
    for (const sx of [-1, 1]) {
      const eg = ctx.createRadialGradient(sx * 13, 28, 2, sx * 13, 28, 14);
      eg.addColorStop(0, '#fff');
      eg.addColorStop(0.3, '#ff5e7a');
      eg.addColorStop(1, '#a3002b');
      ctx.fillStyle = eg;
      ellipse(ctx, sx * 13, 28, 12, 10, sx * 0.3);
      ctx.fill();
      ctx.stroke();
    }
    // mandibles + stinger cannon
    ctx.fillStyle = '#8d97b5';
    ctx.beginPath();
    ctx.moveTo(-10, 48);
    ctx.lineTo(0, 64);
    ctx.lineTo(10, 48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 4;
    const m = 4 + b.charge * 6;
    ctx.beginPath();
    ctx.moveTo(-18, 46);
    ctx.quadraticCurveTo(-18 - m, 56, -8, 60);
    ctx.moveTo(18, 46);
    ctx.quadraticCurveTo(18 + m, 56, 8, 60);
    ctx.stroke();
    chargeGlow(ctx, 0, 64, 20, 'rgba(255,220,80,0.8)', b.charge);
  },

  broodmother(ctx, b) {
    const t = b.t;
    // legs
    ctx.strokeStyle = OUT;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      for (const sx of [-1, 1]) {
        const base = -20 + i * 22;
        const sw = Math.sin(t * 3 + i + (sx > 0 ? 1.5 : 0)) * 8;
        ctx.lineWidth = 7;
        ctx.strokeStyle = OUT;
        ctx.beginPath();
        ctx.moveTo(sx * 60, base);
        ctx.quadraticCurveTo(sx * 100, base - 30 + sw, sx * 108, base + 30 + sw);
        ctx.stroke();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#6b3fb5';
        ctx.stroke();
      }
    }
    // abdomen sac
    const pulse = 1 + Math.sin(t * 2.2) * 0.03;
    const g = ctx.createRadialGradient(-20, -40, 10, 0, -10, 90);
    g.addColorStop(0, '#d9b8ff');
    g.addColorStop(0.55, '#8c52e8');
    g.addColorStop(1, '#4a1f8a');
    ctx.fillStyle = g;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ellipse(ctx, 0, -14, 78 * pulse, 64 * pulse);
    ctx.fill();
    ctx.stroke();
    // veins
    ctx.strokeStyle = 'rgba(60,20,110,0.6)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const a = -2.6 + i * 0.55;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.quadraticCurveTo(Math.cos(a) * 40, -14 + Math.sin(a) * 30, Math.cos(a) * 70, -14 + Math.sin(a) * 55);
      ctx.stroke();
    }
    // glowing eggs
    for (let i = 0; i < 6; i++) {
      const a = -2.8 + i * 0.5;
      const x = Math.cos(a) * 46;
      const y = -18 + Math.sin(a) * 34;
      const glow = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.3);
      ctx.fillStyle = 'rgba(200,255,120,' + (0.35 + glow * 0.5) + ')';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ellipse(ctx, x, y, 9 + glow * 2, 11 + glow * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(x - 3, y - 4, 2.5, 0, TAU);
      ctx.fill();
    }
    // head
    ctx.fillStyle = b.rage > 0 ? '#5a1a4d' : '#3b2266';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ellipse(ctx, 0, 46, 38, 26);
    ctx.fill();
    ctx.stroke();
    // six eyes
    for (const [x, y, r] of [
      [-18, 40, 7],
      [18, 40, 7],
      [-7, 36, 5],
      [7, 36, 5],
      [-26, 50, 4],
      [26, 50, 4],
    ]) {
      ctx.fillStyle = b.rage > 0 ? '#ff3d6e' : '#ff9b3d';
      ctx.beginPath();
      ctx.arc(x + b.lookX * 2, y + b.lookY * 2, r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + b.lookX * 2 - r * 0.3, y + b.lookY * 2 - r * 0.3, r * 0.3, 0, TAU);
      ctx.fill();
    }
    // mandibles
    const m = 6 + b.charge * 10;
    ctx.fillStyle = '#e8d9ff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.5;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 12, 62);
      ctx.quadraticCurveTo(sx * (14 + m), 76, sx * 4, 84);
      ctx.lineTo(sx * 8, 68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    chargeGlow(ctx, 0, 70, 24, 'rgba(200,120,255,0.8)', b.charge);
  },

  jellytron(ctx, b) {
    const t = b.t;
    // tentacles
    for (let i = 0; i < 8; i++) {
      const x0 = -56 + i * 16;
      const sw = Math.sin(t * 2.5 + i * 0.8) * 16;
      const sw2 = Math.sin(t * 3.1 + i) * 12;
      ctx.lineCap = 'round';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x0, 30);
      ctx.bezierCurveTo(x0 + sw, 60, x0 - sw2, 85, x0 + sw * 0.8, 112 + (i % 3) * 6);
      ctx.stroke();
      ctx.strokeStyle = i % 2 ? '#43e6ff' : '#b27dff';
      ctx.lineWidth = 4.5;
      ctx.stroke();
    }
    // mechanical ring
    ctx.fillStyle = '#6f7a99';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ellipse(ctx, 0, 26, 84, 20);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + t * 1.5;
      const x = Math.cos(a) * 72;
      const y = 26 + Math.sin(a) * 14;
      if (Math.sin(a) < -0.1) continue;
      const on = (Math.floor(t * 6) + i) % 3 === 0;
      ctx.fillStyle = on ? '#fff275' : b.rage > 0 ? '#ff4f5e' : '#43e6ff';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, TAU);
      ctx.fill();
    }
    // dome
    const g = ctx.createRadialGradient(-20, -50, 10, 0, -20, 90);
    g.addColorStop(0, 'rgba(220,255,255,0.95)');
    g.addColorStop(0.5, 'rgba(67,230,255,0.75)');
    g.addColorStop(1, 'rgba(90,60,200,0.9)');
    ctx.fillStyle = g;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-80, 22);
    ctx.bezierCurveTo(-86, -80, 86, -80, 80, 22);
    ctx.quadraticCurveTo(0, 36, -80, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // brain
    ctx.fillStyle = b.rage > 0 ? '#ff7aa8' : '#ffb3d9';
    ctx.strokeStyle = '#b3477a';
    ctx.lineWidth = 2;
    ellipse(ctx, 0, -22, 42 + Math.sin(t * 3) * 2, 28);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(i * 10, -46);
      ctx.quadraticCurveTo(i * 10 + 6, -22, i * 10, 2);
    }
    ctx.stroke();
    // core eye
    const ek = 0.6 + 0.4 * Math.sin(t * 5);
    const cg = ctx.createRadialGradient(0, 10, 2, 0, 10, 20);
    cg.addColorStop(0, '#fff');
    cg.addColorStop(0.4, b.rage > 0 ? '#ff4f5e' : '#43e6ff');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.6 + ek * 0.4;
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 10, 20, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ellipse(ctx, -44, -40, 14, 7, -0.7);
    ctx.fill();
    chargeGlow(ctx, 0, 70, 26, 'rgba(67,230,255,0.8)', b.charge);
  },

  voidEmpress(ctx, b) {
    const t = b.t;
    const phaseColors = ['#b27dff', '#ff5ec8', '#ff4f5e', '#ffb13d'];
    const pc = phaseColors[Math.min(b.phaseIndex, 3)];
    // orbiting shards
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * (0.5 + b.rage * 0.6);
      const x = Math.cos(a) * 104;
      const y = Math.sin(a) * 70;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = shade(pc, 0.15);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // tentacles
    for (let i = 0; i < 6; i++) {
      const x0 = -50 + i * 20;
      const sw = Math.sin(t * 2 + i) * 18;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(x0, 40);
      ctx.bezierCurveTo(x0 + sw, 80, x0 - sw, 100, x0 + sw * 0.5, 122);
      ctx.stroke();
      ctx.strokeStyle = '#4b1a70';
      ctx.lineWidth = 5;
      ctx.stroke();
    }
    // side orbs
    for (const sx of [-1, 1]) {
      const og = ctx.createRadialGradient(sx * 70, 26, 3, sx * 70, 30, 28);
      og.addColorStop(0, '#fff');
      og.addColorStop(0.35, pc);
      og.addColorStop(1, '#2a0630');
      ctx.fillStyle = og;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx * 70, 30, 26, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // horns
    ctx.fillStyle = '#e8d9ff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 30, -60);
      ctx.quadraticCurveTo(sx * 60, -90, sx * 52, -112);
      ctx.quadraticCurveTo(sx * 44, -84, sx * 12, -66);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // body sphere
    const g = ctx.createRadialGradient(-24, -30, 10, 0, 0, 80);
    g.addColorStop(0, '#6b3fb5');
    g.addColorStop(0.6, '#2d0f4d');
    g.addColorStop(1, '#12041f');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // star speckles
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 10; i++) {
      const a = i * 2.4;
      const r = 20 + ((i * 13) % 45);
      const tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
      ctx.globalAlpha = tw;
      ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, 2, 2);
    }
    ctx.globalAlpha = 1;
    // glowing cracks as she gets angrier
    if (b.rage > 0) {
      ctx.strokeStyle = pc;
      ctx.lineWidth = 2 + b.rage * 2;
      ctx.beginPath();
      ctx.moveTo(-60, -20);
      ctx.lineTo(-40, -10);
      ctx.lineTo(-48, 10);
      ctx.moveTo(55, -30);
      ctx.lineTo(38, -12);
      ctx.lineTo(50, 8);
      ctx.moveTo(-10, 60);
      ctx.lineTo(0, 45);
      ctx.lineTo(12, 62);
      ctx.stroke();
    }
    // the eye
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ellipse(ctx, 0, 0, 48, 32);
    ctx.fill();
    ctx.stroke();
    const px = b.lookX * 16;
    const py = b.lookY * 9;
    const ig = ctx.createRadialGradient(px, py, 2, px, py, 24);
    ig.addColorStop(0, '#fff');
    ig.addColorStop(0.35, pc);
    ig.addColorStop(1, shade(pc, -0.4));
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(px, py, 23, 0, TAU);
    ctx.fill();
    ctx.fillStyle = OUT;
    ellipse(ctx, px, py, 5 + b.charge * 5, 16);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(px - 8, py - 9, 4, 0, TAU);
    ctx.fill();
    // eyelid (blinks slowly)
    const blink = Math.max(0, Math.sin(t * 0.7) - 0.97) * 30;
    if (blink > 0) {
      ctx.fillStyle = '#2d0f4d';
      ellipse(ctx, 0, -32 + blink * 32, 50, 32 * blink);
      ctx.fill();
    }
    // crown gem
    ctx.fillStyle = pc;
    star(ctx, 0, -80, 12, 5, 4);
    ctx.fill();
    ctx.stroke();
    chargeGlow(ctx, 0, 0, 40, pc, b.charge * 0.8);
  },
};

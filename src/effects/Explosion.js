import { rand, TAU } from '../core/math.js';

// Pre-composed effect recipes built on the particle system, so gameplay code
// just says "enemy exploded here" and the look stays consistent.

export class Effects {
  constructor(particles) {
    this.p = particles;
  }

  hitSpark(x, y, color, crit) {
    const p = this.p;
    const n = crit ? 9 : 4;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-1.3, 1.3) + Math.PI; // sprays back down/outwards
      const s = rand(140, crit ? 420 : 280);
      p.spawn('spark', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.12, 0.25), rand(3, 6), crit ? '#fff275' : color, { drag: 6, width: crit ? 2.4 : 1.6 });
    }
    p.spawn('flare', x, y, 0, 0, crit ? 0.26 : 0.12, crit ? 30 : 11, crit ? '#ffd23f' : color, { endSize: crit ? 8 : 3 });
    if (crit) {
      p.spawn('ring', x, y, 0, 0, 0.32, 6, '#fff275', { endSize: 34, width: 3.5 });
      p.spawn('glow', x, y, 0, 0, 0.2, 24, '#fff6a8', { endSize: 2 });
    }
  }

  enemyExplosion(x, y, color, scale = 1) {
    const p = this.p;
    p.spawn('flare', x, y, 0, 0, 0.28, 40 * scale, '#ffffff', { endSize: 6 });
    p.spawn('fire', x, y, 0, 0, 0.42, 10 * scale, color, { endSize: 30 * scale });
    p.spawn('ring', x, y, 0, 0, 0.35, 8 * scale, color, { endSize: 50 * scale, width: 4 });
    p.burst('spark', x, y, 10 * scale, 140, 400 * scale, 0.35, 5, color, { drag: 4, width: 2.2 });
    p.burst('glow', x, y, 7 * scale, 40, 190 * scale, 0.55, 6, color, { drag: 3 });
    p.burst('glow', x, y, 4 * scale, 30, 120 * scale, 0.5, 4, '#fff3a0', { drag: 3 });
    p.burst('debris', x, y, 5 * scale, 60, 220, 0.7, 4 * scale, color, { drag: 1.5, gravity: 160 });
    p.burst('smoke', x, y, 3 * scale, 10, 50, 0.8, 7 * scale, '#3c2d5f', { drag: 2 });
  }

  bigExplosion(x, y, color, scale = 1) {
    const p = this.p;
    p.spawn('flare', x, y, 0, 0, 0.5, 90 * scale, '#ffffff', { endSize: 12 });
    p.spawn('fire', x, y, 0, 0, 0.7, 18 * scale, color, { endSize: 60 * scale });
    p.spawn('fire', x + 14 * scale, y - 10 * scale, 0, 0, 0.55, 10 * scale, '#ffb13d', { endSize: 36 * scale });
    p.spawn('fire', x - 16 * scale, y + 8 * scale, 0, 0, 0.6, 10 * scale, '#ff5e3d', { endSize: 38 * scale });
    p.spawn('ring', x, y, 0, 0, 0.6, 10, '#ffffff', { endSize: 130 * scale, width: 6 });
    p.spawn('ring', x, y, 0, 0, 0.8, 10, color, { endSize: 95 * scale, width: 5 });
    p.burst('spark', x, y, 24 * scale, 200, 640 * scale, 0.5, 7, color, { drag: 3, width: 3 });
    p.burst('glow', x, y, 16 * scale, 60, 300 * scale, 0.8, 10, color, { drag: 2.5 });
    p.burst('glow', x, y, 10 * scale, 40, 220 * scale, 0.8, 7, '#fff6a8', { drag: 2.5 });
    p.burst('debris', x, y, 12 * scale, 80, 340, 1.1, 6, color, { drag: 1.2, gravity: 200 });
    p.burst('smoke', x, y, 7 * scale, 20, 90, 1.2, 12 * scale, '#3c2d5f', { drag: 1.5 });
  }

  pickupBurst(x, y, color) {
    const p = this.p;
    p.spawn('flare', x, y, 0, 0, 0.35, 34, color, { endSize: 6 });
    p.spawn('ring', x, y, 0, 0, 0.4, 8, color, { endSize: 48, width: 4 });
    p.spawn('ring', x, y, 0, 0, 0.3, 4, '#ffffff', { endSize: 28, width: 2 });
    const n = Math.round(12 * p.quality);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      p.spawn('spark', x, y, Math.cos(a) * 260, Math.sin(a) * 260, 0.3, 5, color, { drag: 5, width: 2.2 });
    }
    // sparkles drifting upward
    p.burst('glow', x, y, 6, 20, 70, 0.7, 4, '#ffffff', { drag: 1, gravity: -120 });
  }

  coinSparkle(x, y) {
    this.p.spawn('glow', x, y, 0, -20, 0.25, 12, '#ffd23f', { endSize: 2 });
    this.p.burst('spark', x, y, 3, 60, 140, 0.2, 3, '#fff3a0', { drag: 5 });
  }

  shockwave(x, y, color, radius, life = 0.6) {
    this.p.spawn('ring', x, y, 0, 0, life * 1.1, 12, color, { endSize: radius * 1.05, width: 14 });
    this.p.spawn('ring', x, y, 0, 0, life, 10, color, { endSize: radius, width: 8 });
    this.p.spawn('ring', x, y, 0, 0, life * 0.8, 6, '#ffffff', { endSize: radius * 0.8, width: 4 });
  }

  bulletPop(x, y, color) {
    this.p.spawn('flare', x, y, 0, 0, 0.22, 9, color, { endSize: 1 });
  }

  muzzle(x, y) {
    this.p.spawn('glow', x, y, 0, -40, 0.06, 9, '#9ff9ff', { endSize: 3 });
  }

  engineTrail(x, y) {
    this.p.spawn('glow', x + rand(-2, 2), y, rand(-10, 10), rand(90, 150), 0.22, 6, '#ff9b3d', { endSize: 1, drag: 1 });
  }
}

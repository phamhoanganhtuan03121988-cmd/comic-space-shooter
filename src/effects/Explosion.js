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
    p.spawn('glow', x, y, 0, 0, crit ? 0.22 : 0.12, crit ? 22 : 12, crit ? '#fff6a8' : '#ffffff', { endSize: 2 });
    if (crit) p.spawn('ring', x, y, 0, 0, 0.3, 6, '#fff275', { endSize: 30, width: 3 });
  }

  enemyExplosion(x, y, color, scale = 1) {
    const p = this.p;
    p.spawn('glow', x, y, 0, 0, 0.3, 34 * scale, '#ffffff', { endSize: 4 });
    p.spawn('glow', x, y, 0, 0, 0.45, 26 * scale, color, { endSize: 6 });
    p.spawn('ring', x, y, 0, 0, 0.35, 8 * scale, color, { endSize: 46 * scale, width: 4 });
    p.burst('spark', x, y, 10 * scale, 120, 380 * scale, 0.35, 5, color, { drag: 4, width: 2 });
    p.burst('glow', x, y, 8 * scale, 40, 180 * scale, 0.5, 7, color, { drag: 3 });
    p.burst('debris', x, y, 6 * scale, 60, 220, 0.7, 4 * scale, color, { drag: 1.5, gravity: 160 });
    p.burst('smoke', x, y, 3 * scale, 10, 50, 0.7, 8 * scale, 'rgba(60,40,90,1)', { drag: 2 });
  }

  bigExplosion(x, y, color, scale = 1) {
    const p = this.p;
    p.spawn('glow', x, y, 0, 0, 0.5, 70 * scale, '#ffffff', { endSize: 10 });
    p.spawn('ring', x, y, 0, 0, 0.6, 10, '#ffffff', { endSize: 120 * scale, width: 6 });
    p.spawn('ring', x, y, 0, 0, 0.8, 10, color, { endSize: 90 * scale, width: 5 });
    p.burst('spark', x, y, 26 * scale, 200, 620 * scale, 0.5, 7, color, { drag: 3, width: 3 });
    p.burst('glow', x, y, 20 * scale, 60, 300 * scale, 0.8, 12, color, { drag: 2.5 });
    p.burst('glow', x, y, 10 * scale, 40, 200 * scale, 0.7, 10, '#fff6a8', { drag: 2.5 });
    p.burst('debris', x, y, 14 * scale, 80, 340, 1.1, 6, color, { drag: 1.2, gravity: 200 });
    p.burst('smoke', x, y, 8 * scale, 20, 90, 1.1, 14 * scale, 'rgba(60,40,90,1)', { drag: 1.5 });
  }

  pickupBurst(x, y, color) {
    const p = this.p;
    p.spawn('ring', x, y, 0, 0, 0.4, 8, color, { endSize: 44, width: 4 });
    p.spawn('glow', x, y, 0, 0, 0.3, 30, '#ffffff', { endSize: 4 });
    const n = Math.round(12 * p.quality);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      p.spawn('spark', x, y, Math.cos(a) * 260, Math.sin(a) * 260, 0.3, 5, color, { drag: 5, width: 2.2 });
    }
  }

  coinSparkle(x, y) {
    this.p.spawn('glow', x, y, 0, -20, 0.25, 12, '#ffd23f', { endSize: 2 });
    this.p.burst('spark', x, y, 3, 60, 140, 0.2, 3, '#fff3a0', { drag: 5 });
  }

  shockwave(x, y, color, radius, life = 0.6) {
    this.p.spawn('ring', x, y, 0, 0, life, 10, color, { endSize: radius, width: 8 });
    this.p.spawn('ring', x, y, 0, 0, life * 0.8, 6, '#ffffff', { endSize: radius * 0.8, width: 4 });
  }

  bulletPop(x, y, color) {
    this.p.spawn('glow', x, y, 0, 0, 0.25, 10, color, { endSize: 1 });
  }

  muzzle(x, y) {
    this.p.spawn('glow', x, y, 0, -40, 0.06, 9, '#9ff9ff', { endSize: 3 });
  }

  engineTrail(x, y) {
    this.p.spawn('glow', x + rand(-2, 2), y, rand(-10, 10), rand(90, 150), 0.22, 6, '#ff9b3d', { endSize: 1, drag: 1 });
  }
}

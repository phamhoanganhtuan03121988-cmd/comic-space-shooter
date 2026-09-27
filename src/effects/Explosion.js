import { rand, TAU } from '../core/math.js';
import { shade } from '../art/Sprites.js';

// Pre-composed effect recipes built on the particle system, so gameplay code
// just says "enemy exploded here" and the look stays consistent.

export class Effects {
  constructor(particles) {
    this.p = particles;
  }

  hitSpark(x, y, color, crit) {
    const p = this.p;
    const n = crit ? 8 : 4;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + rand(-1.3, 1.3) + Math.PI; // sprays back down/outwards
      const s = rand(140, crit ? 420 : 280);
      p.spawn('spark', x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.12, 0.25), rand(3, 6), crit ? '#fff275' : color, { drag: 6, width: crit ? 2.4 : 1.6 });
    }
    if (crit) {
      // comic CRIT burst behind the number
      p.spawn('burst', x, y - 10, 0, -20, 0.38, 14, '#ff4a1f', { endSize: 24, drag: 3 });
      p.spawn('flare', x, y, 0, 0, 0.26, 30, '#ffd23f', { endSize: 8 });
      p.spawn('ring', x, y, 0, 0, 0.32, 6, '#fff275', { endSize: 34, width: 3.5 });
    } else {
      p.spawn('burst', x, y, 0, 0, 0.1, 4, '#ffd23f', { endSize: 7 });
    }
  }

  // Small / medium explosion: white-yellow starburst, cartoon fire puffs,
  // sparks, chunky debris and a smoke tail.
  enemyExplosion(x, y, color, scale = 1) {
    const p = this.p;
    p.spawn('burst', x, y, 0, 0, 0.22, 12 * scale, '#ffc21a', { endSize: 26 * scale });
    p.spawn('flare', x, y, 0, 0, 0.2, 34 * scale, '#ffffff', { endSize: 6 });
    const puffs = Math.max(2, Math.round((scale > 1.2 ? 6 : 4) * p.quality));
    for (let i = 0; i < puffs; i++) {
      const a = rand(0, TAU);
      const sp = rand(30, 90) * scale;
      p.spawn('puff', x + Math.cos(a) * 4, y + Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.42, 0.6), rand(6, 9) * scale, i % 3 === 0 ? '#ff4a1f' : i % 3 === 1 ? '#ff8a1f' : '#ffc21a', { endSize: rand(13, 19) * scale, drag: 3.5 });
    }
    p.spawn('ring', x, y, 0, 0, 0.3, 8 * scale, color, { endSize: 44 * scale, width: 3 });
    p.burst('spark', x, y, 8 * scale, 150, 420 * scale, 0.32, 5, '#fff3a0', { drag: 4, width: 2 });
    p.burst('debris', x, y, 5 * scale, 70, 240, 0.7, 4.5 * scale, color, { drag: 1.5, gravity: 170 });
    p.burst('smoke', x, y, 3 * scale, 10, 50, 0.9, 8 * scale, '#3c2d5f', { drag: 2 });
  }

  // Big (boss) explosion: tinted fire-cloud mass, shockwaves, rock debris.
  bigExplosion(x, y, color, scale = 1) {
    const p = this.p;
    p.spawn('flare', x, y, 0, 0, 0.5, 90 * scale, '#ffffff', { endSize: 12 });
    p.spawn('burst', x, y, 0, 0, 0.35, 26 * scale, '#fff3a0', { endSize: 52 * scale });
    const puffs = Math.round(9 * p.quality);
    for (let i = 0; i < puffs; i++) {
      const a = rand(0, TAU);
      const sp = rand(40, 150) * scale;
      p.spawn('puff', x, y, Math.cos(a) * sp, Math.sin(a) * sp, rand(0.5, 0.8), rand(7, 12) * scale, i % 2 ? color : shade(color, 0.25), { endSize: rand(18, 26) * scale, drag: 2.5 });
    }
    p.spawn('ring', x, y, 0, 0, 0.6, 10, '#ffffff', { endSize: 130 * scale, width: 6 });
    p.spawn('ring', x, y, 0, 0, 0.8, 10, color, { endSize: 95 * scale, width: 5 });
    p.burst('spark', x, y, 22 * scale, 200, 640 * scale, 0.5, 7, color, { drag: 3, width: 3 });
    p.burst('glow', x, y, 10 * scale, 60, 280 * scale, 0.8, 9, color, { drag: 2.5 });
    p.burst('debris', x, y, 12 * scale, 80, 360, 1.2, 7, '#5a4a7a', { drag: 1.2, gravity: 200 });
    p.burst('smoke', x, y, 6 * scale, 20, 90, 1.3, 13 * scale, '#3c2d5f', { drag: 1.5 });
  }

  // Item pickup: light column + rings + rising sparkles.
  pickupBurst(x, y, color) {
    const p = this.p;
    p.spawn('beam', x, y, 0, 0, 0.5, 60, color, { endSize: 60 });
    p.spawn('flare', x, y, 0, 0, 0.35, 34, color, { endSize: 6 });
    p.spawn('ring', x, y, 0, 0, 0.4, 8, color, { endSize: 48, width: 4 });
    p.spawn('ring', x, y, 0, 0, 0.3, 4, '#ffffff', { endSize: 28, width: 2 });
    const n = Math.round(10 * p.quality);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      p.spawn('spark', x, y, Math.cos(a) * 240, Math.sin(a) * 240, 0.28, 5, color, { drag: 5, width: 2.2 });
    }
    p.burst('glow', x, y, 7, 20, 80, 0.8, 4, '#ffffff', { drag: 1, gravity: -160 });
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

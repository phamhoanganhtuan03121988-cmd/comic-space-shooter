import { Pool } from '../core/Pool.js';
import { glowSprite, flareSprite, fireSprite, smokeSprite } from '../art/Sprites.js';
import { rand, TAU } from '../core/math.js';

// Lightweight pooled particles. Kinds:
//   glow   additive soft dot (sprite)        spark  additive streak along velocity
//   ring   expanding stroked circle          debris rotating chunk (normal blend)
//   smoke  growing translucent puff          flare  4-point lens star (additive)
//   fire   expanding fireball core (additive)
// `quality` (0.35..1) scales spawn counts when the frame rate drops.

const KIND = { glow: 0, spark: 1, ring: 2, debris: 3, smoke: 4, flare: 5, fire: 6 };

function makeParticle() {
  return {
    alive: false,
    kind: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    life: 0,
    maxLife: 1,
    size: 1,
    endSize: 0,
    color: '#fff',
    sprite: null,
    drag: 0,
    gravity: 0,
    rot: 0,
    vrot: 0,
    width: 2,
  };
}

export class ParticleSystem {
  constructor(size) {
    this.pool = new Pool(makeParticle, size);
    this.quality = 1;
  }

  spawn(kind, x, y, vx, vy, life, size, color, opts) {
    const p = this.pool.obtain();
    if (!p) return null;
    p.kind = KIND[kind];
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.endSize = opts && opts.endSize !== undefined ? opts.endSize : kind === 'ring' || kind === 'smoke' || kind === 'fire' ? size * 3 : 0;
    p.color = color;
    p.sprite = p.kind === 0 ? glowSprite(color, 16) : p.kind === 5 ? flareSprite(color) : p.kind === 6 ? fireSprite(color) : p.kind === 4 ? smokeSprite() : null;
    p.drag = opts && opts.drag !== undefined ? opts.drag : 2;
    p.gravity = opts && opts.gravity ? opts.gravity : 0;
    p.rot = rand(0, TAU);
    p.vrot = rand(-8, 8);
    p.width = opts && opts.width ? opts.width : 2;
    return p;
  }

  // Radial burst helper.
  burst(kind, x, y, count, speedMin, speedMax, life, size, color, opts) {
    const n = Math.max(1, Math.round(count * this.quality));
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(speedMin, speedMax);
      this.spawn(kind, x, y, Math.cos(a) * s, Math.sin(a) * s, life * rand(0.7, 1.2), size * rand(0.7, 1.3), color, opts);
    }
  }

  update(dt) {
    const a = this.pool.active;
    for (let i = 0; i < a.length; i++) {
      const p = a[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      const d = 1 - Math.min(1, p.drag * dt);
      p.vx *= d;
      p.vy = p.vy * d + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
    this.pool.sweep();
  }

  render(ctx) {
    const a = this.pool.active;
    // pass 1: normal blending (debris, smoke)
    for (let i = 0; i < a.length; i++) {
      const p = a[i];
      if (p.kind !== 3 && p.kind !== 4) continue;
      const k = p.life / p.maxLife;
      if (p.kind === 3) {
        ctx.globalAlpha = Math.min(1, k * 2);
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      } else {
        const s = (p.size + (p.endSize - p.size) * (1 - k)) * 2;
        ctx.globalAlpha = k;
        ctx.drawImage(p.sprite.canvas, p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    // pass 2: additive (glow, spark, ring)
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < a.length; i++) {
      const p = a[i];
      const k = p.life / p.maxLife;
      if (p.kind === 0) {
        const s = (p.endSize + (p.size - p.endSize) * k) * 2;
        ctx.globalAlpha = k;
        ctx.drawImage(p.sprite.canvas, p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.kind === 1) {
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width * (0.5 + k * 0.5);
        const len = p.size * 0.02;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * len, p.y - p.vy * len);
        ctx.stroke();
      } else if (p.kind === 5) {
        const s = (p.endSize + (p.size - p.endSize) * k) * 2;
        ctx.globalAlpha = Math.min(1, k * 1.6);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * 0.15);
        ctx.drawImage(p.sprite.canvas, -s / 2, -s / 2, s, s);
        ctx.restore();
      } else if (p.kind === 6) {
        const s = (p.size + (p.endSize - p.size) * (1 - k * k)) * 2;
        ctx.globalAlpha = k;
        ctx.drawImage(p.sprite.canvas, p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.kind === 2) {
        const s = p.size + (p.endSize - p.size) * (1 - k);
        ctx.globalAlpha = k;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width * k + 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  clear() {
    this.pool.clear();
  }

  get count() {
    return this.pool.count;
  }
}

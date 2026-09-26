import { Pool } from '../core/Pool.js';
import { CONFIG } from '../data/config.js';
import { playerBulletSprite, enemyBulletSprite } from '../art/Sprites.js';

// Pooled bullets for both sides. Enemy bullets use a hitbox smaller than
// their visual size (readable but forgiving, standard for the genre).

function makeBullet() {
  return {
    alive: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    ax: 0,
    ay: 0,
    r: 4,
    damage: 1,
    sprite: null,
    angle: 0,
    spin: false,
    color: '#fff',
    life: 0,
  };
}

export const ENEMY_BULLET_COLORS = {
  orb: '#ff4f8b',
  big: '#ff7a3d',
  needle: '#ff3d6e',
  petal: '#ff6ad5',
  blob: '#8cff5a',
};

const HIT_RADIUS = { orb: 5, big: 8, needle: 4, petal: 5, blob: 5.5 };

export class BulletSystem {
  constructor() {
    this.player = new Pool(makeBullet, CONFIG.POOL.playerBullets);
    this.enemy = new Pool(makeBullet, CONFIG.POOL.enemyBullets);
    this.W = 400;
    this.H = 700;
  }

  resize(W, H) {
    this.W = W;
    this.H = H;
  }

  firePlayer(x, y, angle, speed, damage, kind) {
    const b = this.player.obtain();
    if (!b) return null;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.ax = b.ay = 0;
    b.r = 6;
    b.damage = damage;
    b.sprite = playerBulletSprite(kind);
    b.angle = angle + Math.PI / 2;
    b.life = 2;
    return b;
  }

  fireEnemy(x, y, angle, speed, damage, kind = 'orb', color) {
    const b = this.enemy.obtain();
    if (!b) return null;
    const c = color || ENEMY_BULLET_COLORS[kind] || ENEMY_BULLET_COLORS.orb;
    b.x = x;
    b.y = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.ax = b.ay = 0;
    b.r = HIT_RADIUS[kind] || 5;
    b.damage = damage;
    b.color = c;
    b.sprite = enemyBulletSprite(kind, c);
    b.angle = kind === 'needle' ? angle - Math.PI / 2 : 0;
    b.spin = kind === 'petal';
    b.life = 12;
    return b;
  }

  update(dt, enemyDt) {
    const W = this.W;
    const H = this.H;
    let a = this.player.active;
    for (let i = 0; i < a.length; i++) {
      const b = a[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.y < -30 || b.x < -30 || b.x > W + 30 || b.life <= 0) b.alive = false;
    }
    this.player.sweep();
    a = this.enemy.active;
    for (let i = 0; i < a.length; i++) {
      const b = a[i];
      b.vx += b.ax * enemyDt;
      b.vy += b.ay * enemyDt;
      b.x += b.vx * enemyDt;
      b.y += b.vy * enemyDt;
      b.life -= enemyDt;
      if (b.spin) b.angle += enemyDt * 6;
      if (b.y > H + 30 || b.y < -80 || b.x < -30 || b.x > W + 30 || b.life <= 0) b.alive = false;
    }
    this.enemy.sweep();
  }

  renderPlayer(ctx) {
    const a = this.player.active;
    for (let i = 0; i < a.length; i++) {
      const b = a[i];
      const s = b.sprite;
      if (b.angle === 0) {
        ctx.drawImage(s.canvas, b.x - s.w / 2, b.y - s.h / 2, s.w, s.h);
      } else {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.drawImage(s.canvas, -s.w / 2, -s.h / 2, s.w, s.h);
        ctx.restore();
      }
    }
  }

  renderEnemy(ctx) {
    const a = this.enemy.active;
    for (let i = 0; i < a.length; i++) {
      const b = a[i];
      const s = b.sprite;
      if (b.angle === 0) {
        ctx.drawImage(s.canvas, b.x - s.w / 2, b.y - s.h / 2, s.w, s.h);
      } else {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        ctx.drawImage(s.canvas, -s.w / 2, -s.h / 2, s.w, s.h);
        ctx.restore();
      }
    }
  }

  clearEnemy(onEach) {
    const a = this.enemy.active;
    for (let i = 0; i < a.length; i++) {
      if (onEach) onEach(a[i]);
      a[i].alive = false;
    }
    this.enemy.sweep();
  }

  clear() {
    this.player.clear();
    this.enemy.clear();
  }
}

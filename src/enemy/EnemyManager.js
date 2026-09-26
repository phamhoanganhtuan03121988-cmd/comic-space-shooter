import { Pool } from '../core/Pool.js';
import { CONFIG } from '../data/config.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { bezier, easeInOutSine, rand, DEG, TAU, weightedPick } from '../core/math.js';
import { makeEnemy, renderEnemy } from './Enemy.js';
import { PASS_PATHS } from './Paths.js';

// Owns all regular enemies: spawning, movement, dives and their attacks.

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.pool = new Pool(makeEnemy, CONFIG.POOL.enemies);
    this.time = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.mods = { hp: 1, speed: 1, bulletSpeed: 1, fireRate: 1, dive: 0, ambientFire: 0, extraShots: 0, drop: 1 };
    this.levelId = 1;
    this._pos = { x: 0, y: 0 };
    this._holders = [];
  }

  setLevel(level) {
    this.mods = level.mods;
    this.levelId = level.id;
  }

  get active() {
    return this.pool.active;
  }

  get count() {
    return this.pool.count;
  }

  // opts: { mode, slotX, slotY, entry, index, path, dir, x, y, amp, duration, waveId, minion, fromX, fromY }
  spawn(typeId, opts) {
    const type = ENEMY_TYPES[typeId];
    if (!type) return null;
    const e = this.pool.obtain();
    if (!e) return null;
    const g = this.game;
    const W = g.W;
    const H = g.H;
    const m = this.mods;
    e.type = type;
    e.typeId = typeId;
    e.maxHp = Math.round(type.hp * m.hp);
    e.hp = e.maxHp;
    e.r = type.radius;
    e.flash = 0;
    e.age = 0;
    e.phase = Math.random() * 10;
    e.charging = 0;
    e.fireKind = 0;
    e.waveId = opts.waveId != null ? opts.waveId : -1;
    e.minion = !!opts.minion;
    e.dying = false;
    e.vx = 0;
    e.slotX = opts.slotX || W / 2;
    e.slotY = opts.slotY || 150;
    this.resetFireTimer(e);

    const speed = m.speed;
    const i = opts.index || 0;
    if (opts.mode === 'pass') {
      e.mode = 'pass';
      e.path = PASS_PATHS[opts.path] || PASS_PATHS.sine;
      const pp = e.pathParams;
      pp.dir = opts.dir === 'alt' ? (i % 2 ? -1 : 1) : opts.dir || 1;
      pp.x = opts.x != null ? opts.x : W / 2;
      pp.y = opts.y != null ? opts.y : 200;
      pp.amp = opts.amp != null ? opts.amp : 40;
      e.t = 0;
      e.dur = (opts.duration || 4) / speed;
      e.path(0, pp, W, H, this._pos);
      e.x = this._pos.x;
      e.y = this._pos.y;
    } else if (opts.mode === 'fall') {
      e.mode = 'fall';
      e.x = opts.fromX;
      e.y = opts.fromY;
      e.baseX = opts.fromX + rand(-60, 60);
      e.vy = rand(50, 80) * speed;
      e.swayAmp = rand(30, 70);
      e.t = rand(0, TAU);
    } else {
      e.mode = 'enter';
      this.buildEntry(e, opts.entry || 'top', i, W, H);
    }
    e.prevX = e.x;
    return e;
  }

  buildEntry(e, entry, i, W, H) {
    const sx = e.slotX;
    const sy = e.slotY;
    let kind = entry;
    if (kind === 'sides') kind = i % 2 ? 'right' : 'left';
    let dur = 1.4;
    switch (kind) {
      case 'left':
        this.setBezier(e, -40, H * 0.12, W * 0.8, H * 0.5, W * 0.15, H * 0.3);
        dur = 2.2;
        break;
      case 'right':
        this.setBezier(e, W + 40, H * 0.12, W * 0.2, H * 0.5, W * 0.85, H * 0.3);
        dur = 2.2;
        break;
      case 'swoop': {
        const fromLeft = i % 2 === 0;
        this.setBezier(e, fromLeft ? -40 : W + 40, -40, W / 2, H * 0.75, sx, H * 0.55);
        dur = 2.3;
        break;
      }
      case 'top':
      default:
        this.setBezier(e, sx, -40, sx, sy * 0.3, sx, sy - 30);
        dur = 1.3;
    }
    e.t = 0;
    e.dur = dur / this.mods.speed;
    e.x = e.p0x;
    e.y = e.p0y;
    e.mode = 'enter';
  }

  setBezier(e, x0, y0, x1, y1, x2, y2) {
    e.p0x = x0;
    e.p0y = y0;
    e.p1x = x1;
    e.p1y = y1;
    e.p2x = x2;
    e.p2y = y2;
  }

  resetFireTimer(e) {
    const f = e.type.fire;
    const m = this.mods;
    if (f && this.levelId >= f.minLevel) {
      e.fireTimer = rand(f.interval[0], f.interval[1]) / m.fireRate + rand(0.5, 1.5);
      e.fireKind = 1;
    } else {
      e.fireTimer = 0;
      e.fireKind = m.ambientFire > 0 ? 2 : 0;
    }
  }

  startDive(e) {
    const g = this.game;
    const p = g.player;
    const W = g.W;
    const H = g.H;
    const side = e.x < W / 2 ? 1 : -1;
    e.mode = 'dive';
    e.t = 0;
    e.dur = 2.4 / this.mods.speed;
    this.setBezier(e, e.x, e.y, e.x + side * 70, e.y - 50, p.x - side * 40, H * 0.6);
    e.p3x = p.x + rand(-40, 40);
    e.p3y = H + 50;
    g.audio.play('enemyShoot');
  }

  update(dt) {
    const g = this.game;
    const W = g.W;
    const H = g.H;
    this.time += dt;
    this.swayX = Math.sin(this.time * 0.8) * 22;
    this.swayY = Math.sin(this.time * 1.3) * 6;
    const a = this.pool.active;
    const pos = this._pos;
    let divers = 0;

    for (let i = 0; i < a.length; i++) {
      const e = a[i];
      if (!e.alive) continue;
      e.age += dt;
      if (e.flash > 0) e.flash -= dt;
      e.prevX = e.x;
      switch (e.mode) {
        case 'enter': {
          e.t += dt / e.dur;
          const tx = e.slotX + this.swayX;
          const ty = e.slotY + this.swayY;
          if (e.t >= 1) {
            e.mode = 'hold';
            e.x = tx;
            e.y = ty;
          } else {
            const k = easeInOutSine(e.t);
            e.x = bezier(e.p0x, e.p1x, e.p2x, tx, k);
            e.y = bezier(e.p0y, e.p1y, e.p2y, ty, k);
          }
          break;
        }
        case 'hold':
          e.x = e.slotX + this.swayX + Math.sin(e.age * 2 + e.phase) * 3;
          e.y = e.slotY + this.swayY + Math.cos(e.age * 1.7 + e.phase) * 3;
          break;
        case 'dive':
          divers++;
          e.t += dt / e.dur;
          if (e.t >= 1) {
            // wrap to the top and fly back into the slot
            e.x = e.slotX;
            e.y = -40;
            this.setBezier(e, e.slotX, -40, e.slotX, 20, e.slotX, e.slotY - 40);
            e.t = 0;
            e.dur = 1.3 / this.mods.speed;
            e.mode = 'enter';
          } else {
            e.x = bezier(e.p0x, e.p1x, e.p2x, e.p3x, e.t);
            e.y = bezier(e.p0y, e.p1y, e.p2y, e.p3y, e.t);
          }
          break;
        case 'pass':
          e.t += dt / e.dur;
          if (e.t >= 1) {
            this.escape(e);
            continue;
          }
          e.path(e.t, e.pathParams, W, H, pos);
          e.x = pos.x;
          e.y = pos.y;
          break;
        case 'fall':
          e.t += dt;
          e.y += e.vy * dt;
          e.x = e.baseX + Math.sin(e.t * 1.6) * e.swayAmp;
          if (e.y > H + 40) {
            this.escape(e);
            continue;
          }
          break;
      }
      e.vx = dt > 0 ? (e.x - e.prevX) / dt : 0;
      this.updateAttack(e, dt, H);
    }

    // dive attacks
    const m = this.mods;
    if (m.dive > 0 && g.player.alive && Math.random() < m.dive * dt) {
      const maxDivers = 1 + Math.floor(this.levelId / 2);
      if (divers < maxDivers) {
        const holders = this._holders;
        holders.length = 0;
        for (let i = 0; i < a.length; i++) if (a[i].alive && a[i].mode === 'hold') holders.push(a[i]);
        if (holders.length) this.startDive(weightedPick(holders, (e) => e.type.diveWeight));
      }
    }
    this.pool.sweep();
  }

  updateAttack(e, dt, H) {
    const g = this.game;
    if (!g.player.alive || e.mode === 'enter' || e.y < 10 || e.y > H * 0.7) {
      e.charging = 0;
      return;
    }
    if (e.fireKind === 1) {
      const f = e.type.fire;
      e.fireTimer -= dt;
      if (e.fireTimer <= f.telegraph && e.charging <= 0 && e.fireTimer > 0) {
        e.charging = e.fireTimer;
        e.chargeTime = f.telegraph;
      }
      if (e.charging > 0) e.charging -= dt;
      if (e.fireTimer <= 0) {
        e.charging = 0;
        this.fire(e, f);
        e.fireTimer = rand(f.interval[0], f.interval[1]) / this.mods.fireRate;
      }
    } else if (e.fireKind === 2) {
      if (e.charging > 0) {
        e.charging -= dt;
        if (e.charging <= 0) {
          e.charging = 0;
          const ang = Math.atan2(g.player.y - e.y, g.player.x - e.x);
          g.bullets.fireEnemy(e.x, e.y + e.r, ang, 130 * this.mods.bulletSpeed, 10, 'orb');
          g.audio.play('enemyShoot');
        }
      } else if (Math.random() < this.mods.ambientFire * dt) {
        e.charging = 0.45;
        e.chargeTime = 0.45;
      }
    }
  }

  fire(e, f) {
    const g = this.game;
    const p = g.player;
    const m = this.mods;
    const speed = f.speed * m.bulletSpeed;
    const ox = e.x;
    const oy = e.y + e.r * 0.8;
    const extra = m.extraShots || 0;
    if (f.pattern === 'ring') {
      const n = f.count + extra * 2;
      const off = rand(0, TAU);
      for (let i = 0; i < n; i++) g.bullets.fireEnemy(ox, oy, off + (i / n) * TAU, speed, f.damage, f.bullet);
    } else {
      const aim = Math.atan2(p.y - oy, p.x - ox);
      const n = f.count + extra;
      const spread = (f.spread || 12) * DEG;
      for (let i = 0; i < n; i++) {
        const a = n === 1 ? aim : aim + (i - (n - 1) / 2) * (spread / Math.max(1, n - 1));
        g.bullets.fireEnemy(ox, oy, a, speed, f.damage, f.bullet);
      }
    }
    g.audio.play('enemyShoot');
  }

  escape(e) {
    e.alive = false;
    this.game.waves.onEnemyGone(e, false);
  }

  countWave(waveId) {
    let n = 0;
    const a = this.pool.active;
    for (let i = 0; i < a.length; i++) if (a[i].alive && a[i].waveId === waveId) n++;
    return n;
  }

  countMinions() {
    let n = 0;
    const a = this.pool.active;
    for (let i = 0; i < a.length; i++) if (a[i].alive && a[i].minion) n++;
    return n;
  }

  render(ctx) {
    const a = this.pool.active;
    for (let i = 0; i < a.length; i++) if (a[i].alive) renderEnemy(ctx, a[i]);
  }

  clear() {
    this.pool.clear();
  }
}

import { BOSS_ART } from '../art/BossArt.js';
import { PATTERNS } from './BossPatterns.js';
import { clamp, easeOutCubic, rand, DEG } from '../core/math.js';

// Boss entity: entrance, phase-based attack rotation with telegraphs, movement
// styles, phase transitions and a multi-stage death sequence.

export const BOSS_STATE = Object.freeze({
  ENTER: 'enter',
  FIGHT: 'fight',
  TRANSITION: 'transition',
  DYING: 'dying',
  DEAD: 'dead',
});

export class Boss {
  constructor(game) {
    this.game = game;
    this.alive = false;
    this.st = {};
  }

  init(def) {
    const g = this.game;
    this.def = def;
    this.alive = true;
    this.state = BOSS_STATE.ENTER;
    this.maxHp = def.hp;
    this.hp = def.hp;
    this.displayHp = 0; // animated HP bar value (fills during entrance)
    this.trailHp = def.hp; // white "damage trail" segment
    this.x = g.W / 2;
    this.y = -def.size[1];
    this.t = 0;
    this.moveT = 0;
    this.stateTimer = 0;
    this.phaseIndex = 0;
    this.phase = def.phases[0];
    this.flash = 0;
    this.flashCd = 0;
    this.charge = 0;
    this.lookX = 0;
    this.lookY = 1;
    this.rage = 0;
    this.moveOverride = false;
    this.attackIdx = 0;
    this.attack = null;
    this.attackMode = 'rest'; // rest | telegraph | active
    this.attackTimer = 2;
    this.passiveTimer = 2;
    this.driftX = g.W / 2;
    this.driftY = def.holdY;
    this.driftTimer = 0;
    this.explTimer = 0;
    this.shakeHp = 0;
    this.enterDur = 2.8;
    this.st = {};
  }

  get hpFrac() {
    return this.hp / this.maxHp;
  }

  get vulnerable() {
    return this.state === BOSS_STATE.FIGHT;
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.flashCd > 0) this.flashCd -= dt;
    // eyes follow the player
    const dx = g.player.x - this.x;
    const dy = g.player.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.lookX += (dx / d - this.lookX) * Math.min(1, dt * 5);
    this.lookY += (dy / d - this.lookY) * Math.min(1, dt * 5);
    // HP bar animation
    if (this.trailHp > this.hp) this.trailHp = Math.max(this.hp, this.trailHp - this.maxHp * 0.25 * dt);

    switch (this.state) {
      case BOSS_STATE.ENTER: {
        this.stateTimer += dt;
        const k = Math.min(1, this.stateTimer / this.enterDur);
        this.y = -this.def.size[1] + (this.def.holdY + this.def.size[1]) * easeOutCubic(k);
        this.x = g.W / 2 + Math.sin(this.t * 1.5) * 10 * (1 - k);
        this.displayHp = this.maxHp * k;
        if (k >= 1) {
          this.state = BOSS_STATE.FIGHT;
          this.displayHp = this.maxHp;
          this.attackTimer = 1;
          g.bg.targetSpeedMul = 1.4;
        }
        break;
      }
      case BOSS_STATE.FIGHT:
        this.displayHp = this.hp;
        this.updateMovement(dt);
        this.updateAttacks(dt);
        this.updatePassive(dt);
        break;
      case BOSS_STATE.TRANSITION:
        this.displayHp = this.hp;
        this.stateTimer -= dt;
        this.charge = Math.min(1, this.charge + dt * 2);
        this.x += (g.W / 2 - this.x) * Math.min(1, dt * 2);
        this.y += (this.def.holdY - this.y) * Math.min(1, dt * 2);
        if (Math.random() < dt * 10) g.effects.bulletPop(this.x + rand(-80, 80), this.y + rand(-60, 60), this.def.color);
        if (this.stateTimer <= 0) {
          this.state = BOSS_STATE.FIGHT;
          this.charge = 0;
          this.attackTimer = 0.6;
        }
        break;
      case BOSS_STATE.DYING:
        this.updateDeath(dt);
        break;
      default:
        break;
    }
  }

  updateMovement(dt) {
    if (this.moveOverride) return;
    const g = this.game;
    const m = this.phase.move;
    this.moveT += dt;
    const t = this.moveT;
    const cx = g.W / 2;
    const hy = this.def.holdY;
    let tx = cx;
    let ty = hy;
    switch (m.type) {
      case 'figure8':
        tx = cx + Math.sin(t * m.speed) * m.range;
        ty = hy + Math.sin(t * m.speed * 2) * (m.rangeY || 30);
        break;
      case 'drift':
        this.driftTimer -= dt;
        if (this.driftTimer <= 0) {
          this.driftTimer = 2.2 / m.speed;
          this.driftX = cx + rand(-m.range, m.range);
          this.driftY = hy + rand(-25, 25);
        }
        tx = this.driftX;
        ty = this.driftY;
        break;
      case 'track':
        tx = clamp(g.player.x, cx - m.range, cx + m.range);
        ty = hy + Math.sin(t * 1.2) * 12;
        break;
      case 'sway':
      default:
        tx = cx + Math.sin(t * m.speed) * m.range;
        ty = hy + Math.sin(t * 1.3) * 8;
    }
    const k = Math.min(1, dt * (m.type === 'track' ? 1.2 * m.speed : 2.5));
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  }

  updateAttacks(dt) {
    const g = this.game;
    const atk = this.attack;
    if (this.attackMode === 'rest') {
      this.charge = Math.max(0, this.charge - dt * 3);
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.beginAttack();
    } else if (this.attackMode === 'telegraph') {
      this.attackTimer -= dt;
      const k = 1 - Math.max(0, this.attackTimer) / atk.telegraph;
      this.charge = k;
      const runner = PATTERNS[atk.type];
      if (runner.telegraph) runner.telegraph(this, atk, this.st, g, dt, k);
      if (this.attackTimer <= 0) this.attackMode = 'active';
    } else {
      this.charge = Math.max(0, this.charge - dt * 4);
      const runner = PATTERNS[atk.type];
      if (runner.update(this, atk, this.st, g, dt)) {
        this.attackMode = 'rest';
        this.attackTimer = this.phase.rest;
        this.attack = null;
      }
    }
  }

  beginAttack() {
    const g = this.game;
    const list = this.phase.attacks;
    const atk = list[this.attackIdx % list.length];
    this.attackIdx++;
    this.attack = atk;
    const st = this.st;
    for (const k in st) if (k !== 'xs' && k !== 'opts') delete st[k];
    PATTERNS[atk.type].start(this, atk, st, g);
    this.attackMode = 'telegraph';
    this.attackTimer = atk.telegraph || 0.5;
    if (atk.type !== 'laser') g.audio.play('bossAttack');
  }

  updatePassive(dt) {
    const p = this.phase.passive;
    if (!p || this.attackMode === 'telegraph' || this.moveOverride) return;
    this.passiveTimer -= dt;
    if (this.passiveTimer > 0) return;
    this.passiveTimer = p.interval;
    const g = this.game;
    const ex = this.x + p.from[0];
    const ey = this.y + p.from[1];
    const aim = Math.atan2(g.player.y - ey, g.player.x - ex);
    const spread = p.spread * DEG;
    for (let i = 0; i < p.count; i++) {
      const a = p.count === 1 ? aim : aim - spread / 2 + (spread * i) / (p.count - 1);
      g.bullets.fireEnemy(ex, ey, a, p.speed, p.damage, p.bullet);
    }
  }

  // Returns true if the hit landed.
  damage(amount) {
    if (this.state !== BOSS_STATE.FIGHT) return false;
    this.hp -= amount;
    if (this.flashCd <= 0) {
      this.flash = 0.05;
      this.flashCd = 0.09;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.startDeath();
      return true;
    }
    const next = this.def.phases[this.phaseIndex + 1];
    if (next && this.hpFrac <= next.at) this.startTransition(this.phaseIndex + 1);
    return true;
  }

  startTransition(index) {
    const g = this.game;
    this.phaseIndex = index;
    this.phase = this.def.phases[index];
    this.state = BOSS_STATE.TRANSITION;
    this.stateTimer = 1.8;
    this.rage = index / Math.max(1, this.def.phases.length - 1);
    this.attack = null;
    this.attackMode = 'rest';
    this.attackIdx = 0;
    this.moveOverride = false;
    this.moveT = 0;
    g.onBossPhase(this, index);
  }

  startDeath() {
    const g = this.game;
    this.state = BOSS_STATE.DYING;
    this.stateTimer = 2.6;
    this.explTimer = 0;
    this.attack = null;
    this.moveOverride = false;
    g.onBossDying(this);
  }

  updateDeath(dt) {
    const g = this.game;
    this.stateTimer -= dt;
    this.explTimer -= dt;
    this.x += Math.sin(this.t * 40) * 1.5;
    this.charge = 0.5 + Math.random() * 0.5;
    if (this.explTimer <= 0) {
      this.explTimer = 0.12;
      const [w, h] = this.def.size;
      const ex = this.x + rand(-w * 0.4, w * 0.4);
      const ey = this.y + rand(-h * 0.4, h * 0.4);
      g.effects.enemyExplosion(ex, ey, Math.random() < 0.5 ? this.def.color : '#ffd23f', 1.2);
      g.audio.play('enemyDie');
      g.shake.add(0.15);
      this.flash = 0.05;
    }
    if (this.stateTimer <= 0) {
      this.state = BOSS_STATE.DEAD;
      this.alive = false;
      g.onBossDefeated(this);
    }
  }

  render(ctx) {
    const g = this.game;
    // attack warning visuals behind the boss
    if (this.attack && (this.attackMode === 'telegraph' || this.attackMode === 'active')) {
      const runner = PATTERNS[this.attack.type];
      if (runner.render) {
        const k = this.attackMode === 'telegraph' ? 1 - Math.max(0, this.attackTimer) / (this.attack.telegraph || 0.5) : -1;
        runner.render(this, this.attack, this.st, g, ctx, k);
      }
    }
    const art = BOSS_ART[this.def.art];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    art(ctx, this);
    if (this.flash > 0 || this.state === BOSS_STATE.TRANSITION) {
      // hit flash: redraw additively for a bright pop
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.state === BOSS_STATE.TRANSITION ? 0.25 + 0.25 * Math.sin(this.t * 30) : 0.55;
      art(ctx, this);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  // Circle hit test against a point + radius.
  hits(x, y, r) {
    const hc = this.def.hit;
    for (let i = 0; i < hc.length; i++) {
      const c = hc[i];
      const dx = x - (this.x + c[0]);
      const dy = y - (this.y + c[1]);
      const rr = c[2] + r;
      if (dx * dx + dy * dy < rr * rr) return true;
    }
    return false;
  }
}

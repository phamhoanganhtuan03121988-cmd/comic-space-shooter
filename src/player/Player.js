import { CONFIG } from '../data/config.js';
import { BUFF_IDS } from '../data/items.js';
import { clamp } from '../core/math.js';
import { shipSprite, shipWhite, flameSprite, shieldBubbleSprite } from '../art/ShipArt.js';
import { glowSprite } from '../art/Sprites.js';
import { computeStats } from './PlayerStats.js';

const PC = CONFIG.PLAYER;

// The player's fighter. Movement follows the drag delta with a speed cap so it
// feels glued to the finger yet still smooth; keyboard adds a direct axis.

export class Player {
  constructor(game) {
    this.game = game;
    this.buffs = {};
    for (const id of BUFF_IDS) this.buffs[id] = 0;
    this.stats = computeStats({});
    this._drag = { x: 0, y: 0 };
    this.reset(400, 700);
  }

  applyUpgrades(upgrades) {
    this.stats = computeStats(upgrades);
  }

  reset(W, H) {
    this.x = W / 2;
    this.y = H - 110;
    this.tx = this.x;
    this.ty = this.y;
    this.vx = 0;
    this.tilt = 0;
    this.maxHp = this.stats.hp;
    this.hp = this.maxHp;
    this.maxShield = this.stats.shield;
    this.shield = this.maxShield;
    this.shieldDelay = 0;
    this.invuln = 0;
    this.hitFlash = 0;
    this.muzzle = 0;
    this.alive = true;
    this.canShoot = true;
    this.power = 1;
    this.t = 0;
    this.entering = 1; // fly-in animation
    this.deathTimer = 0;
    this.skillCooldown = 0;
    this.lastHitShield = 0;
    for (const id of BUFF_IDS) this.buffs[id] = 0;
  }

  get hpFrac() {
    return this.hp / this.maxHp;
  }

  update(dt, input, W, H) {
    this.t += dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.muzzle > 0) this.muzzle -= dt;
    if (this.lastHitShield > 0) this.lastHitShield -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.skillCooldown > 0) this.skillCooldown = Math.max(0, this.skillCooldown - dt);
    for (const id of BUFF_IDS) if (this.buffs[id] > 0) this.buffs[id] = Math.max(0, this.buffs[id] - dt);

    if (!this.alive) return;

    // shield regeneration
    if (this.shieldDelay > 0) this.shieldDelay -= dt;
    else if (this.shield < this.maxShield) this.shield = Math.min(this.maxShield, this.shield + PC.shieldRegenRate * dt);

    const minX = 18;
    const maxX = W - 18;
    const minY = H * PC.topLimit;
    const maxY = H - PC.bottomMargin;

    if (this.entering > 0) {
      this.entering = Math.max(0, this.entering - dt * 1.2);
      this.y = maxY - 50 + this.entering * 160;
      this.tx = this.x;
      this.ty = this.y;
      input.resetDrag();
      return;
    }

    const d = input.consumeDrag(this._drag);
    const sens = PC.dragSensitivity;
    this.tx += d.x * sens;
    this.ty += d.y * sens;
    const ax = input.axisX();
    const ay = input.axisY();
    if (ax || ay) {
      const kspeed = this.stats.moveSpeed * 0.75;
      this.tx = this.x + ax * kspeed * 0.1;
      this.ty = this.y + ay * kspeed * 0.1;
    }
    this.tx = clamp(this.tx, minX, maxX);
    this.ty = clamp(this.ty, minY, maxY);

    // move toward target with a speed cap (Thrusters upgrade raises the cap)
    const dx = this.tx - this.x;
    const dy = this.ty - this.y;
    const dist = Math.hypot(dx, dy);
    const maxStep = this.stats.moveSpeed * dt * (ax || ay ? 0.75 : 1);
    const prevX = this.x;
    if (dist <= maxStep || dist < 0.5) {
      this.x = this.tx;
      this.y = this.ty;
    } else {
      this.x += (dx / dist) * maxStep;
      this.y += (dy / dist) * maxStep;
    }
    this.vx = dt > 0 ? (this.x - prevX) / dt : 0;
    const targetTilt = clamp(this.vx / 500, -1, 1);
    this.tilt += (targetTilt - this.tilt) * Math.min(1, dt * 12);
  }

  render(ctx, fx) {
    if (!this.alive) return;
    const x = this.x;
    const y = this.y + Math.sin(this.t * 3) * 1.5; // idle bob
    // blink while invulnerable
    if (this.invuln > 0 && this.hitFlash <= 0 && Math.floor(this.t * 20) % 2 === 0) return;

    // engine flames (flicker)
    const fl = flameSprite();
    const flick = 0.8 + Math.random() * 0.4 + Math.max(0, -this.vx / 1500);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(fl.canvas, x - 14, y + 24, 10, 22 * flick);
    ctx.drawImage(fl.canvas, x + 4, y + 24, 10, 22 * flick);
    const glow = glowSprite('#ff9b3d', 16);
    ctx.globalAlpha = 0.6;
    ctx.drawImage(glow.canvas, x - 22, y + 18, 44, 30);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (fx && Math.random() < 0.5) fx.engineTrail(x + (Math.random() < 0.5 ? -9 : 9), y + 36);

    // ship with banking (horizontal squash) + slight rotation
    const s = this.hitFlash > 0 ? shipWhite() : shipSprite();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.tilt * 0.12);
    ctx.scale(1 - Math.abs(this.tilt) * 0.18, 1);
    ctx.drawImage(s.canvas, -s.w / 2, -s.h / 2, s.w, s.h);
    ctx.restore();

    // muzzle flash
    if (this.muzzle > 0) {
      const m = glowSprite('#9ff9ff', 16);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = this.muzzle / 0.06;
      ctx.drawImage(m.canvas, x - 12, y - 38, 24, 24);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // shield bubble (item buff) or regenerating shield shimmer
    if (this.buffs.shield > 0) {
      const b = shieldBubbleSprite();
      const pulse = 1 + Math.sin(this.t * 8) * 0.03;
      const ending = this.buffs.shield < 1.5 && Math.floor(this.t * 10) % 2 === 0;
      ctx.globalAlpha = ending ? 0.35 : 0.9;
      ctx.drawImage(b.canvas, x - 40 * pulse, y - 40 * pulse, 80 * pulse, 80 * pulse);
      ctx.globalAlpha = 1;
    } else if (this.lastHitShield > 0) {
      const b = shieldBubbleSprite();
      ctx.globalAlpha = Math.min(1, this.lastHitShield * 3);
      ctx.drawImage(b.canvas, x - 34, y - 34, 68, 68);
      ctx.globalAlpha = 1;
    }

    // hitbox core so players know exactly what can be hit
    const core = glowSprite('#ffffff', 16);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.8;
    ctx.drawImage(core.canvas, x - 6, y - 6, 12, 12);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
}

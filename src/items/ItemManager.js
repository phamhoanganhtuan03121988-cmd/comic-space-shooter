import { Pool } from '../core/Pool.js';
import { CONFIG } from '../data/config.js';
import { ITEM_TYPES, ITEM_IDS } from '../data/items.js';
import { itemSprite, coinSprite, COIN_FRAMES } from '../art/Sprites.js';
import { rand, weightedPick, TAU } from '../core/math.js';

// Pickups: coins and power-up capsules. Handles drop rolls, falling / bobbing,
// magnet attraction, pickup detection and applying item effects.

function makePickup() {
  return { alive: false, coin: false, id: '', def: null, x: 0, y: 0, vx: 0, vy: 0, t: 0, value: 1, homing: false };
}

export class ItemManager {
  constructor(game) {
    this.game = game;
    this.pool = new Pool(makePickup, CONFIG.POOL.pickups);
    this.sinceLastPower = 0;
  }

  reset() {
    this.pool.clear();
    this.sinceLastPower = 0;
  }

  spawnCoins(x, y, count, homing = false) {
    for (let i = 0; i < count; i++) {
      const c = this.pool.obtain();
      if (!c) return;
      c.coin = true;
      c.x = x + rand(-6, 6);
      c.y = y + rand(-6, 6);
      const a = rand(-Math.PI, 0);
      const s = rand(60, 170);
      c.vx = Math.cos(a) * s;
      c.vy = Math.sin(a) * s - 40;
      c.t = rand(0, 10);
      c.value = 1;
      c.homing = homing;
    }
  }

  spawnItem(id, x, y) {
    const it = this.pool.obtain();
    if (!it) return null;
    it.coin = false;
    it.id = id;
    it.def = ITEM_TYPES[id];
    it.x = x;
    it.y = y;
    it.vx = rand(-30, 30);
    it.vy = -60;
    it.t = 0;
    it.homing = false;
    if (id === 'power') this.sinceLastPower = 0;
    return it;
  }

  // Roll a drop for a killed enemy.
  rollDrop(x, y, chance) {
    this.sinceLastPower++;
    // pity timer: guarantee a POWER capsule every so often early in a level
    const g = this.game;
    if (g.player.power < CONFIG.PLAYER.maxPower && this.sinceLastPower >= 16) {
      this.spawnItem('power', x, y);
      return;
    }
    if (Math.random() >= chance) return;
    const id = weightedPick(ITEM_IDS, (k) => this.dropWeight(k));
    this.spawnItem(id, x, y);
  }

  dropWeight(id) {
    const p = this.game.player;
    const def = ITEM_TYPES[id];
    if (id === 'power' && p.power >= CONFIG.PLAYER.maxPower) return def.weight * 0.2;
    if (id === 'health' && p.hp >= p.maxHp) return def.weight * 0.2;
    if (id === 'health' && p.hp < p.maxHp * 0.4) return def.weight * 2.5;
    return def.weight;
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    const H = g.H;
    const PC = CONFIG.PLAYER;
    const magnet = p.buffs.magnet > 0;
    const a = this.pool.active;
    for (let i = 0; i < a.length; i++) {
      const it = a[i];
      it.t += dt;
      const dx = p.x - it.x;
      const dy = p.y - it.y;
      const d2 = dx * dx + dy * dy;
      const attractR = it.coin ? (magnet ? 9999 : PC.coinAttractRadius) : magnet ? 9999 : 0;
      if (p.alive && (it.homing || (attractR > 0 && d2 < attractR * attractR && it.t > 0.25))) {
        const d = Math.sqrt(d2) || 1;
        const pull = it.homing ? 900 : 620;
        it.vx += (dx / d) * pull * dt * 3;
        it.vy += (dy / d) * pull * dt * 3;
        const sp = Math.hypot(it.vx, it.vy);
        const max = it.homing ? 700 : 520;
        if (sp > max) {
          it.vx *= max / sp;
          it.vy *= max / sp;
        }
      } else if (it.coin) {
        it.vx *= 1 - Math.min(1, dt * 2);
        it.vy += 260 * dt;
        if (it.vy > 110) it.vy = 110;
      } else {
        it.vx *= 1 - Math.min(1, dt * 1.5);
        it.vy += 120 * dt;
        if (it.vy > 70) it.vy = 70;
        it.x += Math.sin(it.t * 2.5) * 20 * dt;
      }
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      if (it.x < 12) it.x = 12;
      if (it.x > g.W - 12) it.x = g.W - 12;

      if (p.alive) {
        const pr = PC.pickupRadius + (it.coin ? 4 : 10);
        if (d2 < pr * pr) {
          it.alive = false;
          if (it.coin) g.collectCoin(it);
          else this.applyItem(it.id, it.x, it.y);
          continue;
        }
      }
      if (it.y > H + 30) it.alive = false;
    }
    this.pool.sweep();
  }

  applyItem(id, x, y) {
    const g = this.game;
    const p = g.player;
    const def = ITEM_TYPES[id];
    g.run.itemsCollected++;
    g.effects.pickupBurst(x, y, def.color);
    let label = def.label;
    switch (def.effect) {
      case 'power':
        if (p.power < CONFIG.PLAYER.maxPower) {
          p.power++;
          label = p.power >= CONFIG.PLAYER.maxPower ? 'MAX POWER!' : 'POWER ' + p.power;
          g.audio.play('powerUp');
        } else {
          const pts = g.score.addRaw(500);
          label = 'MAX POWER +' + pts;
          g.audio.play('pickup');
        }
        break;
      case 'health': {
        const heal = Math.round(p.maxHp * def.amount);
        p.hp = Math.min(p.maxHp, p.hp + heal);
        label = 'REPAIR +' + heal;
        g.audio.play('heal');
        break;
      }
      case 'bomb':
        g.bombBlast(p.x, p.y - 40, def);
        break;
      case 'buff':
        p.buffs[id] = def.duration;
        g.audio.play(id === 'shield' ? 'shieldUp' : 'pickup');
        break;
      default:
        break;
    }
    g.texts.spawn(label, x, y - 18, def.color, 17, 1.1, -45);
    g.hud.flashBuff(id);
  }

  render(ctx) {
    const a = this.pool.active;
    for (let i = 0; i < a.length; i++) {
      const it = a[i];
      if (it.coin) {
        const s = coinSprite(Math.floor(it.t * 12) % COIN_FRAMES);
        ctx.drawImage(s.canvas, it.x - 9, it.y - 9, 18, 18);
      } else {
        const s = itemSprite(it.id, it.def.color);
        const bob = Math.sin(it.t * 4) * 2;
        const pulse = 1 + Math.sin(it.t * 7) * 0.06;
        const size = 38 * pulse;
        // rotating light rays so capsules are impossible to miss
        ctx.save();
        ctx.translate(it.x, it.y + bob);
        ctx.rotate(it.t * 1.5);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = it.def.color;
        for (let k = 0; k < 4; k++) {
          ctx.rotate(TAU / 4);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(-5, -30);
          ctx.lineTo(5, -30);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.drawImage(s.canvas, it.x - size / 2, it.y + bob - size / 2, size, size);
      }
    }
  }

  clear() {
    this.pool.clear();
  }
}

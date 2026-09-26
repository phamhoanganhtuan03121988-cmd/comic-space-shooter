import { CONFIG } from '../data/config.js';
import { DEG } from '../core/math.js';

// Auto-fire. Weapon power (1..5, raised by POWER items) selects the stream
// layout; RAPID and MULTI buffs modify rate and add side streams.
// Each entry: [x offset, angle offset in degrees, damage multiplier].

export const WEAPON_PATTERNS = [
  null,
  [[0, 0, 1]],
  [
    [-7, 0, 0.9],
    [7, 0, 0.9],
  ],
  [
    [0, 0, 1],
    [-10, -6, 0.8],
    [10, 6, 0.8],
  ],
  [
    [-6, 0, 0.9],
    [6, 0, 0.9],
    [-14, -8, 0.75],
    [14, 8, 0.75],
  ],
  [
    [0, 0, 1],
    [-9, 0, 0.85],
    [9, 0, 0.85],
    [-16, -10, 0.7],
    [16, 10, 0.7],
  ],
];

const MULTI_EXTRA = [
  [-20, -22, 0.6],
  [20, 22, 0.6],
  [-22, -38, 0.5],
  [22, 38, 0.5],
];

export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.cooldown = 0;
    this.shots = 0;
  }

  reset() {
    this.cooldown = 0.2;
    this.shots = 0;
  }

  fireRate() {
    const p = this.game.player;
    let rate = p.stats.fireRate;
    if (p.buffs.rapid > 0) rate *= 1.7;
    return rate;
  }

  update(dt) {
    const p = this.game.player;
    if (!p.alive || !p.canShoot) return;
    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      this.fire();
      this.cooldown += 1 / this.fireRate();
      if (this.cooldown < 0) this.cooldown = 0;
    }
  }

  fire() {
    const g = this.game;
    const p = g.player;
    const pattern = WEAPON_PATTERNS[Math.min(CONFIG.PLAYER.maxPower, Math.max(1, p.power))];
    const speed = CONFIG.PLAYER.bulletSpeed;
    const dmg = p.stats.attack;
    const kind = p.buffs.rapid > 0 ? 'rapid' : 'normal';
    const baseAngle = -Math.PI / 2;
    for (let i = 0; i < pattern.length; i++) {
      const s = pattern[i];
      g.bullets.firePlayer(p.x + s[0], p.y - 22, baseAngle + s[1] * DEG, speed, dmg * s[2], kind);
    }
    if (p.buffs.multi > 0) {
      for (let i = 0; i < MULTI_EXTRA.length; i++) {
        const s = MULTI_EXTRA[i];
        g.bullets.firePlayer(p.x + s[0], p.y - 8, baseAngle + s[1] * DEG, speed * 0.95, dmg * s[2], 'multi');
      }
    }
    p.muzzle = 0.06;
    this.shots++;
    g.audio.play('shoot');
  }
}

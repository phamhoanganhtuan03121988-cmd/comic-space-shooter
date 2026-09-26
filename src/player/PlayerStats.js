import { UPGRADES } from '../data/upgrades.js';

// Converts saved upgrade levels into concrete combat stats. Kept pure so it
// can be unit tested and reused by the upgrade screen for previews.

export const BASE_STATS = {
  hp: 100,
  shield: 20,
  attack: 8,
  fireRate: 7.5, // shots per second
  moveSpeed: 640, // max follow speed, logical px / s
  critChance: 0.05,
  critDamage: 2.0,
};

const byId = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export function computeStats(upgrades = {}) {
  const lv = (id) => Math.max(0, Math.min(byId[id].maxLevel, upgrades[id] | 0));
  return {
    hp: BASE_STATS.hp + lv('hp') * byId.hp.perLevel,
    shield: BASE_STATS.shield + lv('shield') * byId.shield.perLevel,
    attack: BASE_STATS.attack * (1 + lv('attack') * byId.attack.perLevel),
    fireRate: BASE_STATS.fireRate * (1 + lv('fireRate') * byId.fireRate.perLevel),
    moveSpeed: BASE_STATS.moveSpeed * (1 + lv('moveSpeed') * byId.moveSpeed.perLevel),
    critChance: Math.min(0.9, BASE_STATS.critChance + lv('critChance') * byId.critChance.perLevel),
    critDamage: BASE_STATS.critDamage,
  };
}

// Human readable stat value for the upgrade screen.
export function describeStat(id, stats) {
  switch (id) {
    case 'attack':
      return stats.attack.toFixed(1) + ' dmg';
    case 'fireRate':
      return stats.fireRate.toFixed(1) + ' /s';
    case 'hp':
      return Math.round(stats.hp) + ' HP';
    case 'shield':
      return Math.round(stats.shield) + ' SP';
    case 'moveSpeed':
      return Math.round((stats.moveSpeed / BASE_STATS.moveSpeed) * 100) + '%';
    case 'critChance':
      return Math.round(stats.critChance * 100) + '%';
    default:
      return '';
  }
}

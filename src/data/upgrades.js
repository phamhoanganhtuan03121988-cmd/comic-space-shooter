// Permanent upgrades bought with coins. Cost of the next level:
//   round(baseCost * growth ^ currentLevel)
// `perLevel` is consumed by PlayerStats.

export const UPGRADES = [
  {
    id: 'attack',
    name: 'Attack',
    desc: '+15% bullet damage',
    icon: 'power',
    maxLevel: 10,
    baseCost: 40,
    growth: 1.42,
    perLevel: 0.15,
  },
  {
    id: 'fireRate',
    name: 'Fire Rate',
    desc: '+7% shots per second',
    icon: 'rapid',
    maxLevel: 10,
    baseCost: 45,
    growth: 1.42,
    perLevel: 0.07,
  },
  {
    id: 'hp',
    name: 'Hull',
    desc: '+15 max HP',
    icon: 'health',
    maxLevel: 10,
    baseCost: 35,
    growth: 1.4,
    perLevel: 15,
  },
  {
    id: 'shield',
    name: 'Shield',
    desc: '+12 regenerating shield',
    icon: 'shield',
    maxLevel: 10,
    baseCost: 40,
    growth: 1.4,
    perLevel: 12,
  },
  {
    id: 'moveSpeed',
    name: 'Thrusters',
    desc: '+7% movement speed',
    icon: 'slow',
    maxLevel: 8,
    baseCost: 30,
    growth: 1.45,
    perLevel: 0.07,
  },
  {
    id: 'critChance',
    name: 'Critical',
    desc: '+3% critical chance',
    icon: 'crit',
    maxLevel: 10,
    baseCost: 50,
    growth: 1.45,
    perLevel: 0.03,
  },
];

export function upgradeCost(def, level) {
  if (level >= def.maxLevel) return Infinity;
  return Math.round(def.baseCost * Math.pow(def.growth, level));
}

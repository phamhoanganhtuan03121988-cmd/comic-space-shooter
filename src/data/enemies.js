// Enemy archetypes. Every field is plain data so new critters can be added
// without touching engine code. See README "How to add an enemy".
//
//  hp            base hit points (multiplied by level mods.hp)
//  radius        collision radius in logical pixels
//  speed         base travel speed used by entry / fall movement
//  score         base score (multiplied by combo)
//  coins         coins dropped on death
//  dropChance    chance to drop a power-up item
//  art           key into src/art/EnemyArt.js
//  color         main particle / explosion color
//  contactDamage damage dealt when the player rams it
//  diveWeight    how likely it is to be picked for dive attacks while holding
//  fire          optional attack: { minLevel, interval:[min,max], pattern,
//                count, spread (deg), speed, damage, telegraph (s), bullet }

export const ENEMY_TYPES = {
  blobling: {
    name: 'Blobling',
    hp: 18,
    radius: 16,
    speed: 80,
    score: 100,
    coins: 1,
    dropChance: 0.06,
    art: 'blobling',
    color: '#6dff6b',
    contactDamage: 20,
    diveWeight: 1,
    fire: null,
  },
  zipfly: {
    name: 'Zipfly',
    hp: 9,
    radius: 13,
    speed: 200,
    score: 120,
    coins: 1,
    dropChance: 0.05,
    art: 'zipfly',
    color: '#ffe14d',
    contactDamage: 15,
    diveWeight: 1.5,
    fire: null,
  },
  rockshell: {
    name: 'Rockshell',
    hp: 80,
    radius: 22,
    speed: 50,
    score: 320,
    coins: 3,
    dropChance: 0.16,
    art: 'rockshell',
    color: '#b27dff',
    contactDamage: 30,
    diveWeight: 0.3,
    fire: {
      minLevel: 4,
      interval: [3.2, 5],
      pattern: 'fan',
      count: 3,
      spread: 36,
      speed: 150,
      damage: 14,
      telegraph: 0.6,
      bullet: 'big',
    },
  },
  spitter: {
    name: 'Spitter',
    hp: 30,
    radius: 17,
    speed: 70,
    score: 220,
    coins: 2,
    dropChance: 0.1,
    art: 'spitter',
    color: '#ff9b3d',
    contactDamage: 20,
    diveWeight: 0.6,
    fire: {
      minLevel: 1,
      interval: [2.2, 3.6],
      pattern: 'aimed',
      count: 1,
      spread: 14,
      speed: 165,
      damage: 12,
      telegraph: 0.5,
      bullet: 'orb',
    },
  },
  swirlie: {
    name: 'Swirlie',
    hp: 24,
    radius: 16,
    speed: 110,
    score: 180,
    coins: 2,
    dropChance: 0.08,
    art: 'swirlie',
    color: '#ff6ad5',
    contactDamage: 18,
    diveWeight: 0.8,
    fire: {
      minLevel: 3,
      interval: [3, 4.5],
      pattern: 'ring',
      count: 6,
      spread: 0,
      speed: 115,
      damage: 10,
      telegraph: 0.55,
      bullet: 'petal',
    },
  },
  spikeling: {
    name: 'Spikeling',
    hp: 22,
    radius: 15,
    speed: 150,
    score: 160,
    coins: 1,
    dropChance: 0.07,
    art: 'spikeling',
    color: '#ff4d5e',
    contactDamage: 25,
    diveWeight: 4,
    fire: null,
  },
};

// Boss definitions. Each boss has phases; a phase becomes active when the
// boss HP fraction drops to or below its `at` value. Phases define a movement
// style, an attack rotation and an optional passive fire. Attack `type`s are
// implemented in src/boss/BossPatterns.js:
//
//   fan     count, spread(deg), speed, repeat, interval, aim(bool)
//   aimed   count, interval, speed               (stream at the player)
//   ring    count, speed, repeat, interval, rotate(deg per repeat)
//   spiral  arms, rate (volleys/s), duration, speed, turn (deg per volley)
//   rain    duration, rate (bullets/s), speed    (droplets from the boss body)
//   wall    rows, interval, speed, gap (px)      (curtain with a guaranteed gap)
//   laser   count, duration, width, track(bool)  (vertical beams, telegraphed)
//   charge  speed                                (telegraphed dash at the player)
//   summon  enemy, count, max                    (spawn minions that drift down)
//   nova    rings, count, speed, interval        (big telegraphed multi-ring burst)
//
// Common fields: telegraph (s of warning before firing), bullet (sprite kind:
// orb | big | needle | petal | blob), damage, from ([dx, dy] emitter offset).

import { buildBossVariants } from './expansion/bosses.js';

// The five core bosses (sectors 1-5).
export const CORE_BOSSES = {
  kingGloop: {
    name: 'KING GLOOP',
    title: 'Monarch of the Slime Moons',
    art: 'kingGloop',
    color: '#6dff6b',
    hp: 1500,
    score: 5000,
    coins: 40,
    holdY: 165,
    size: [190, 160],
    hit: [[0, 8, 64]],
    contactDamage: 30,
    phases: [
      {
        at: 1,
        label: 'SLIME TIME',
        move: { type: 'sway', speed: 0.7, range: 100 },
        rest: 1.1,
        attacks: [
          { type: 'fan', count: 5, spread: 64, speed: 150, repeat: 2, interval: 0.7, aim: false, telegraph: 0.6, bullet: 'blob', damage: 12, from: [0, 55] },
          { type: 'aimed', count: 4, interval: 0.25, speed: 185, telegraph: 0.5, bullet: 'blob', damage: 12, from: [0, 55] },
          { type: 'rain', duration: 2.4, rate: 5, speed: 140, telegraph: 0.6, bullet: 'blob', damage: 10 },
        ],
      },
    ],
  },

  buzzBaron: {
    name: 'BUZZ BARON',
    title: 'Chrome Hornet of the Amber Belt',
    art: 'buzzBaron',
    color: '#ffd23f',
    hp: 2700,
    score: 8000,
    coins: 60,
    holdY: 160,
    size: [210, 150],
    hit: [[0, 0, 44], [-55, -8, 26], [55, -8, 26]],
    contactDamage: 35,
    phases: [
      {
        at: 1,
        label: 'SWARM LEADER',
        move: { type: 'sway', speed: 1.05, range: 120 },
        rest: 0.9,
        attacks: [
          { type: 'fan', count: 7, spread: 70, speed: 170, repeat: 3, interval: 0.55, aim: true, telegraph: 0.55, bullet: 'needle', damage: 12, from: [0, 60] },
          { type: 'aimed', count: 6, interval: 0.14, speed: 250, telegraph: 0.6, bullet: 'needle', damage: 12, from: [0, 60] },
          { type: 'charge', speed: 720, telegraph: 0.9 },
          { type: 'fan', count: 4, spread: 30, speed: 200, repeat: 4, interval: 0.3, aim: true, telegraph: 0.4, bullet: 'orb', damage: 10, from: [-55, 20] },
        ],
      },
    ],
  },

  broodmother: {
    name: 'BROODMOTHER',
    title: 'Queen of the Crystal Hive',
    art: 'broodmother',
    color: '#b27dff',
    hp: 4800,
    score: 12000,
    coins: 80,
    holdY: 170,
    size: [220, 170],
    hit: [[0, 0, 70]],
    contactDamage: 35,
    phases: [
      {
        at: 1,
        label: 'THE HIVE STIRS',
        move: { type: 'drift', speed: 1, range: 110 },
        rest: 1,
        attacks: [
          { type: 'ring', count: 14, speed: 140, repeat: 2, interval: 0.7, rotate: 12, telegraph: 0.7, bullet: 'petal', damage: 12, from: [0, 20] },
          { type: 'summon', enemy: 'zipfly', count: 5, max: 8, telegraph: 0.7 },
          { type: 'fan', count: 5, spread: 50, speed: 180, repeat: 2, interval: 0.5, aim: true, telegraph: 0.5, bullet: 'orb', damage: 12, from: [0, 60] },
        ],
      },
      {
        at: 0.5,
        label: 'HIVE FRENZY',
        move: { type: 'sway', speed: 1.3, range: 120 },
        rest: 0.8,
        passive: { interval: 1.8, count: 2, spread: 16, speed: 190, bullet: 'orb', damage: 10, from: [0, 60] },
        attacks: [
          { type: 'spiral', arms: 3, rate: 9, duration: 2.6, speed: 150, turn: 11, telegraph: 0.7, bullet: 'petal', damage: 11, from: [0, 10] },
          { type: 'summon', enemy: 'spitter', count: 3, max: 6, telegraph: 0.7 },
          { type: 'ring', count: 18, speed: 150, repeat: 3, interval: 0.6, rotate: 10, telegraph: 0.7, bullet: 'petal', damage: 12, from: [0, 20] },
        ],
      },
    ],
  },

  jellytron: {
    name: 'JELLYTRON',
    title: 'Storm Engine of Toxic Tempest',
    art: 'jellytron',
    color: '#43e6ff',
    hp: 7400,
    score: 16000,
    coins: 100,
    holdY: 175,
    size: [220, 190],
    hit: [[0, -10, 66], [0, 50, 40]],
    contactDamage: 35,
    phases: [
      {
        at: 1,
        label: 'CHARGING UP',
        move: { type: 'figure8', speed: 0.7, range: 110, rangeY: 30 },
        rest: 0.9,
        passive: { interval: 2.2, count: 1, spread: 0, speed: 200, bullet: 'orb', damage: 10, from: [0, 70] },
        attacks: [
          { type: 'fan', count: 9, spread: 110, speed: 160, repeat: 3, interval: 0.6, aim: false, telegraph: 0.6, bullet: 'orb', damage: 12, from: [0, 70] },
          { type: 'wall', rows: 3, interval: 1.2, speed: 120, gap: 95, telegraph: 0.8, bullet: 'big', damage: 14 },
          { type: 'summon', enemy: 'swirlie', count: 4, max: 6, telegraph: 0.7 },
          { type: 'aimed', count: 8, interval: 0.12, speed: 260, telegraph: 0.6, bullet: 'needle', damage: 11, from: [0, 70] },
        ],
      },
      {
        at: 0.5,
        label: 'OVERCHARGE',
        move: { type: 'figure8', speed: 1.05, range: 125, rangeY: 40 },
        rest: 0.7,
        passive: { interval: 1.5, count: 3, spread: 30, speed: 210, bullet: 'orb', damage: 10, from: [0, 70] },
        attacks: [
          { type: 'spiral', arms: 4, rate: 8, duration: 3, speed: 150, turn: -9, telegraph: 0.7, bullet: 'petal', damage: 11, from: [0, 10] },
          { type: 'laser', count: 2, duration: 1.3, width: 34, track: true, telegraph: 1.1, damage: 22 },
          { type: 'summon', enemy: 'spikeling', count: 4, max: 6, telegraph: 0.7 },
          { type: 'fan', count: 11, spread: 130, speed: 170, repeat: 3, interval: 0.55, aim: true, telegraph: 0.6, bullet: 'orb', damage: 12, from: [0, 70] },
        ],
      },
    ],
  },

  voidEmpress: {
    name: 'VOID EMPRESS ZORBA',
    title: 'Devourer of Farms and Stars',
    art: 'voidEmpress',
    color: '#ff2e88',
    hp: 12500,
    score: 30000,
    coins: 160,
    holdY: 200,
    size: [240, 210],
    hit: [[0, 0, 72], [-70, 30, 28], [70, 30, 28]],
    contactDamage: 40,
    phases: [
      {
        at: 1,
        label: 'THE EYE OPENS',
        move: { type: 'sway', speed: 0.8, range: 100 },
        rest: 0.9,
        attacks: [
          { type: 'fan', count: 7, spread: 80, speed: 180, repeat: 3, interval: 0.5, aim: true, telegraph: 0.55, bullet: 'orb', damage: 13, from: [0, 60] },
          { type: 'ring', count: 16, speed: 150, repeat: 3, interval: 0.55, rotate: 11, telegraph: 0.7, bullet: 'petal', damage: 12, from: [0, 0] },
          { type: 'aimed', count: 8, interval: 0.13, speed: 270, telegraph: 0.6, bullet: 'needle', damage: 12, from: [0, 60] },
        ],
      },
      {
        at: 0.75,
        label: 'SWARM OF THE VOID',
        move: { type: 'drift', speed: 1.2, range: 120 },
        rest: 0.8,
        passive: { interval: 2, count: 3, spread: 24, speed: 200, bullet: 'orb', damage: 11, from: [0, 60] },
        attacks: [
          { type: 'summon', enemy: 'spikeling', count: 5, max: 7, telegraph: 0.7 },
          { type: 'spiral', arms: 2, rate: 12, duration: 2.8, speed: 165, turn: 13, telegraph: 0.7, bullet: 'petal', damage: 12, from: [0, 0] },
          { type: 'wall', rows: 3, interval: 1.1, speed: 130, gap: 90, telegraph: 0.8, bullet: 'big', damage: 14 },
        ],
      },
      {
        at: 0.5,
        label: 'STARLIGHT LANCES',
        move: { type: 'figure8', speed: 0.9, range: 120, rangeY: 35 },
        rest: 0.75,
        passive: { interval: 1.6, count: 3, spread: 30, speed: 210, bullet: 'orb', damage: 11, from: [0, 60] },
        attacks: [
          { type: 'laser', count: 3, duration: 1.4, width: 32, track: true, telegraph: 1.15, damage: 24 },
          { type: 'ring', count: 20, speed: 160, repeat: 3, interval: 0.5, rotate: 9, telegraph: 0.7, bullet: 'petal', damage: 12, from: [0, 0] },
          { type: 'summon', enemy: 'swirlie', count: 4, max: 6, telegraph: 0.7 },
          { type: 'spiral', arms: 3, rate: 10, duration: 2.6, speed: 170, turn: -12, telegraph: 0.7, bullet: 'petal', damage: 12, from: [0, 0] },
        ],
      },
      {
        at: 0.25,
        label: 'FINAL ECLIPSE',
        move: { type: 'track', speed: 1.4, range: 130 },
        rest: 0.65,
        passive: { interval: 1.3, count: 3, spread: 34, speed: 220, bullet: 'orb', damage: 12, from: [0, 60] },
        attacks: [
          { type: 'nova', rings: 3, count: 22, speed: 150, interval: 0.45, telegraph: 1.3, bullet: 'big', damage: 15, from: [0, 0] },
          { type: 'laser', count: 2, duration: 1.2, width: 36, track: true, telegraph: 1.0, damage: 24 },
          { type: 'spiral', arms: 5, rate: 8, duration: 3, speed: 150, turn: 10, telegraph: 0.7, bullet: 'petal', damage: 12, from: [0, 0] },
          { type: 'rain', duration: 2.6, rate: 9, speed: 170, telegraph: 0.6, bullet: 'orb', damage: 11 },
          { type: 'summon', enemy: 'spitter', count: 3, max: 5, telegraph: 0.6 },
        ],
      },
    ],
  },
};

// Core bosses + their remixed encounters for sectors 6-15.
export const BOSSES = { ...CORE_BOSSES, ...buildBossVariants(CORE_BOSSES) };

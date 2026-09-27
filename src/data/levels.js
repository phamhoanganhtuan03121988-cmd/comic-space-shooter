// Level + wave definitions (fully data-driven). See README "How to add a level".
//
// Level fields
//   id, name, subtitle, theme (background palette), boss (key in bosses.js)
//   mods: difficulty multipliers applied to every enemy of the level
//     hp, speed, bulletSpeed, fireRate (higher = shoots more often),
//     dive (dive attempts per second across the formation), ambientFire
//     (chance per second for non-shooters to drop a bullet), extraShots
//     (bonus bullets added to enemy fan/aimed/ring patterns), drop (item mult)
//   tutorial: shows control hints
//   waves: [{ groups: [...] }]
//
// Group fields
//   enemy      key in enemies.js
//   count      number of enemies
//   behavior   'hold' (fly in, hold formation, may dive) | 'pass' (fly a path and leave)
//   formation  hold only: row | grid | vee | arc | diamond | circle | zigzag | wings
//   entry      hold only: top | left | right | sides | swoop
//   rows       grid rows; y = formation centre y; spacing = slot spacing
//   path       pass only: sine | dropSine | loop | zigzag | cross | uturn
//   dir        pass only: 1 | -1 | 'alt'  (direction; 'alt' alternates per enemy)
//   x, amp, duration  pass path parameters
//   delay      seconds after the wave starts; interval = seconds between members

import { EXPANSION_LEVELS, EXPANSION_THEMES } from './expansion/sectors.js';

// Palettes of the core sectors 1-5.
export const CORE_THEMES = {
  meadow: {
    top: '#030920',
    bottom: '#0a2146',
    nebula: ['#1a4dff', '#18c8ff', '#7a5cff'],
    star: '#e2f6ff',
    dust: '#8fe6ff',
    planet: { color: '#2f7fd6', ring: '#9feaff', x: 0.96, y: 0.2, r: 70 },
  },
  amber: {
    top: '#06120c',
    bottom: '#2a1d06',
    nebula: ['#1fae5a', '#ffa12e', '#ff7a3d'],
    star: '#fff2d8',
    dust: '#ffd08a',
    planet: { color: '#3fae5a', ring: '#ffd27a', x: 0.06, y: 0.26, r: 60 },
  },
  crystal: {
    top: '#0a0526',
    bottom: '#260d4e',
    nebula: ['#7a2bff', '#2fc8ff', '#ff6ad5'],
    star: '#efe6ff',
    dust: '#c9a8ff',
    planet: { color: '#7b4dff', ring: '#8ff0ff', x: 0.8, y: 0.3, r: 40 },
  },
  toxic: {
    top: '#150307',
    bottom: '#3a0b05',
    nebula: ['#e0321a', '#ff8a1f', '#b3123d'],
    star: '#ffe6d6',
    dust: '#ffab6b',
    planet: { color: '#5a1d12', ring: '#ff8a2e', x: 0.9, y: 0.22, r: 62 },
  },
  void: {
    top: '#020007',
    bottom: '#12031e',
    nebula: ['#4a16b8', '#d0247a', '#2b3cff'],
    star: '#f2e6ff',
    dust: '#c78aff',
    planet: { color: '#05010c', ring: '#ff5ec8', x: 0.7, y: 0.26, r: 26 },
  },
};

// The core campaign: sectors 1-5 (locked content, do not edit).
export const CORE_LEVELS = [
  {
    id: 1,
    name: 'MEADOW NEBULA',
    subtitle: 'The space farm is under attack!',
    theme: 'meadow',
    tutorial: true,
    boss: 'kingGloop',
    mods: { hp: 1, speed: 0.9, bulletSpeed: 0.9, fireRate: 0.7, dive: 0, ambientFire: 0, extraShots: 0, drop: 1.4 },
    waves: [
      { groups: [{ enemy: 'blobling', count: 6, behavior: 'hold', formation: 'row', entry: 'top', y: 140, interval: 0.15 }] },
      {
        groups: [
          { enemy: 'blobling', count: 7, behavior: 'hold', formation: 'vee', entry: 'left', y: 150, interval: 0.18 },
          { enemy: 'zipfly', count: 6, behavior: 'pass', path: 'sine', dir: 1, y: 300, amp: 40, duration: 4.2, delay: 2.2, interval: 0.3 },
        ],
      },
      {
        groups: [
          { enemy: 'blobling', count: 8, behavior: 'hold', formation: 'arc', entry: 'right', y: 150, interval: 0.14 },
          { enemy: 'zipfly', count: 8, behavior: 'pass', path: 'dropSine', x: 200, amp: 110, duration: 5, delay: 1.5, interval: 0.35 },
        ],
      },
      {
        groups: [
          { enemy: 'blobling', count: 10, behavior: 'hold', formation: 'grid', rows: 2, entry: 'sides', y: 140, interval: 0.12 },
          { enemy: 'spitter', count: 2, behavior: 'hold', formation: 'row', entry: 'top', y: 70, spacing: 160, delay: 1.5, interval: 0.3 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'AMBER BELT',
    subtitle: 'Something fast is buzzing around...',
    theme: 'amber',
    boss: 'buzzBaron',
    mods: { hp: 1.15, speed: 1.15, bulletSpeed: 1, fireRate: 0.9, dive: 0.12, ambientFire: 0, extraShots: 0, drop: 1.2 },
    waves: [
      {
        groups: [
          { enemy: 'zipfly', count: 8, behavior: 'pass', path: 'sine', dir: 'alt', y: 220, amp: 50, duration: 3.6, interval: 0.25 },
          { enemy: 'blobling', count: 6, behavior: 'hold', formation: 'row', entry: 'top', y: 120, delay: 1, interval: 0.12 },
        ],
      },
      {
        groups: [
          { enemy: 'zipfly', count: 9, behavior: 'hold', formation: 'vee', entry: 'swoop', y: 150, interval: 0.16 },
          { enemy: 'spitter', count: 2, behavior: 'hold', formation: 'row', entry: 'top', y: 70, spacing: 200, delay: 2, interval: 0.2 },
        ],
      },
      {
        groups: [
          { enemy: 'spitter', count: 4, behavior: 'hold', formation: 'row', entry: 'top', y: 90, spacing: 80, interval: 0.2 },
          { enemy: 'blobling', count: 7, behavior: 'hold', formation: 'arc', entry: 'left', y: 170, delay: 0.8, interval: 0.14 },
        ],
      },
      {
        groups: [
          { enemy: 'zipfly', count: 7, behavior: 'pass', path: 'zigzag', x: 110, amp: 90, duration: 4.5, interval: 0.28 },
          { enemy: 'zipfly', count: 7, behavior: 'pass', path: 'zigzag', x: 290, amp: -90, duration: 4.5, interval: 0.28 },
          { enemy: 'rockshell', count: 2, behavior: 'hold', formation: 'row', entry: 'top', y: 110, spacing: 150, delay: 1.5, interval: 0.5 },
        ],
      },
      {
        groups: [
          { enemy: 'zipfly', count: 6, behavior: 'hold', formation: 'row', entry: 'left', y: 190, interval: 0.1 },
          { enemy: 'blobling', count: 6, behavior: 'hold', formation: 'row', entry: 'right', y: 145, interval: 0.1 },
          { enemy: 'spitter', count: 3, behavior: 'hold', formation: 'row', entry: 'top', y: 95, spacing: 110, delay: 0.8, interval: 0.2 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'CRYSTAL CAVERNS',
    subtitle: 'New critters hatch in the crystal dark.',
    theme: 'crystal',
    boss: 'broodmother',
    mods: { hp: 1.3, speed: 1.15, bulletSpeed: 1.05, fireRate: 1.15, dive: 0.22, ambientFire: 0.02, extraShots: 0, drop: 1.1 },
    waves: [
      {
        groups: [
          { enemy: 'swirlie', count: 6, behavior: 'pass', path: 'loop', x: 130, dir: 1, duration: 6, interval: 0.45 },
          { enemy: 'swirlie', count: 6, behavior: 'pass', path: 'loop', x: 270, dir: -1, duration: 6, delay: 0.2, interval: 0.45 },
          { enemy: 'blobling', count: 7, behavior: 'hold', formation: 'vee', entry: 'top', y: 130, delay: 2, interval: 0.12 },
        ],
      },
      {
        groups: [
          { enemy: 'rockshell', count: 3, behavior: 'hold', formation: 'row', entry: 'top', y: 110, spacing: 110, interval: 0.3 },
          { enemy: 'spitter', count: 4, behavior: 'hold', formation: 'zigzag', entry: 'sides', y: 175, interval: 0.2 },
          { enemy: 'zipfly', count: 8, behavior: 'pass', path: 'cross', dir: 'alt', duration: 3.4, delay: 2.5, interval: 0.3 },
        ],
      },
      {
        groups: [
          { enemy: 'spikeling', count: 8, behavior: 'hold', formation: 'circle', entry: 'swoop', y: 160, interval: 0.14 },
          { enemy: 'spitter', count: 2, behavior: 'hold', formation: 'row', entry: 'top', y: 70, spacing: 220, delay: 1.2, interval: 0.2 },
        ],
      },
      {
        groups: [
          { enemy: 'swirlie', count: 8, behavior: 'hold', formation: 'diamond', entry: 'left', y: 160, interval: 0.14 },
          { enemy: 'zipfly', count: 10, behavior: 'pass', path: 'uturn', x: 40, duration: 4, delay: 1.5, interval: 0.22 },
        ],
      },
      {
        groups: [
          { enemy: 'rockshell', count: 2, behavior: 'hold', formation: 'row', entry: 'top', y: 90, spacing: 180, interval: 0.3 },
          { enemy: 'spitter', count: 5, behavior: 'hold', formation: 'row', entry: 'right', y: 140, interval: 0.14 },
          { enemy: 'spikeling', count: 6, behavior: 'hold', formation: 'row', entry: 'left', y: 190, interval: 0.14 },
        ],
      },
    ],
  },
  {
    id: 4,
    name: 'TOXIC TEMPEST',
    subtitle: 'The storm is full of bullets.',
    theme: 'toxic',
    boss: 'jellytron',
    mods: { hp: 1.5, speed: 1.2, bulletSpeed: 1.12, fireRate: 1.5, dive: 0.3, ambientFire: 0.04, extraShots: 1, drop: 1.1 },
    waves: [
      {
        groups: [
          { enemy: 'spitter', count: 5, behavior: 'hold', formation: 'arc', entry: 'swoop', y: 140, interval: 0.15 },
          { enemy: 'zipfly', count: 10, behavior: 'pass', path: 'sine', dir: 'alt', y: 260, amp: 60, duration: 3.4, delay: 1, interval: 0.22 },
        ],
      },
      {
        groups: [
          { enemy: 'swirlie', count: 8, behavior: 'hold', formation: 'circle', entry: 'top', y: 150, interval: 0.12 },
          { enemy: 'rockshell', count: 2, behavior: 'hold', formation: 'row', entry: 'sides', y: 80, spacing: 250, delay: 1.5, interval: 0.3 },
        ],
      },
      {
        groups: [
          { enemy: 'spikeling', count: 10, behavior: 'hold', formation: 'wings', entry: 'sides', y: 160, interval: 0.1 },
          { enemy: 'spitter', count: 3, behavior: 'hold', formation: 'row', entry: 'top', y: 80, spacing: 120, delay: 1, interval: 0.2 },
        ],
      },
      {
        groups: [
          { enemy: 'swirlie', count: 7, behavior: 'pass', path: 'loop', x: 120, dir: 1, duration: 5.5, interval: 0.4 },
          { enemy: 'swirlie', count: 7, behavior: 'pass', path: 'loop', x: 280, dir: -1, duration: 5.5, interval: 0.4 },
          { enemy: 'rockshell', count: 3, behavior: 'hold', formation: 'vee', entry: 'top', y: 120, delay: 1, interval: 0.3 },
        ],
      },
      {
        groups: [
          { enemy: 'blobling', count: 12, behavior: 'hold', formation: 'grid', rows: 2, entry: 'left', y: 170, interval: 0.08 },
          { enemy: 'spitter', count: 4, behavior: 'hold', formation: 'row', entry: 'right', y: 95, spacing: 85, delay: 0.5, interval: 0.15 },
          { enemy: 'zipfly', count: 8, behavior: 'pass', path: 'cross', dir: 'alt', duration: 3, delay: 3, interval: 0.25 },
        ],
      },
      {
        groups: [
          { enemy: 'rockshell', count: 3, behavior: 'hold', formation: 'row', entry: 'top', y: 90, spacing: 120, interval: 0.25 },
          { enemy: 'swirlie', count: 6, behavior: 'hold', formation: 'zigzag', entry: 'swoop', y: 160, delay: 0.5, interval: 0.14 },
          { enemy: 'spikeling', count: 6, behavior: 'hold', formation: 'row', entry: 'sides', y: 215, delay: 1.2, interval: 0.14 },
        ],
      },
    ],
  },
  {
    id: 5,
    name: 'VOID RIFT',
    subtitle: 'The Void Empress awaits at the edge of space.',
    theme: 'void',
    boss: 'voidEmpress',
    mods: { hp: 1.8, speed: 1.3, bulletSpeed: 1.2, fireRate: 1.8, dive: 0.4, ambientFire: 0.06, extraShots: 2, drop: 1.1 },
    waves: [
      {
        groups: [
          { enemy: 'spikeling', count: 8, behavior: 'hold', formation: 'vee', entry: 'swoop', y: 150, interval: 0.12 },
          { enemy: 'spitter', count: 4, behavior: 'hold', formation: 'row', entry: 'top', y: 80, spacing: 90, delay: 0.8, interval: 0.15 },
        ],
      },
      {
        groups: [
          { enemy: 'zipfly', count: 12, behavior: 'pass', path: 'zigzag', x: 200, amp: 150, duration: 4, interval: 0.2 },
          { enemy: 'swirlie', count: 8, behavior: 'hold', formation: 'arc', entry: 'left', y: 140, delay: 1, interval: 0.12 },
          { enemy: 'rockshell', count: 2, behavior: 'hold', formation: 'row', entry: 'top', y: 75, spacing: 200, delay: 2, interval: 0.3 },
        ],
      },
      {
        groups: [
          { enemy: 'rockshell', count: 4, behavior: 'hold', formation: 'diamond', entry: 'top', y: 130, interval: 0.25 },
          { enemy: 'spitter', count: 6, behavior: 'hold', formation: 'wings', entry: 'sides', y: 170, delay: 0.6, interval: 0.12 },
        ],
      },
      {
        groups: [
          { enemy: 'swirlie', count: 8, behavior: 'pass', path: 'loop', x: 110, dir: 1, duration: 5, interval: 0.35 },
          { enemy: 'swirlie', count: 8, behavior: 'pass', path: 'loop', x: 290, dir: -1, duration: 5, interval: 0.35 },
          { enemy: 'spikeling', count: 8, behavior: 'hold', formation: 'circle', entry: 'swoop', y: 150, delay: 1.5, interval: 0.1 },
        ],
      },
      {
        groups: [
          { enemy: 'blobling', count: 14, behavior: 'hold', formation: 'grid', rows: 2, entry: 'sides', y: 175, interval: 0.07 },
          { enemy: 'spitter', count: 5, behavior: 'hold', formation: 'arc', entry: 'top', y: 90, delay: 0.5, interval: 0.12 },
          { enemy: 'zipfly', count: 10, behavior: 'pass', path: 'uturn', x: 360, duration: 3.6, delay: 3, interval: 0.2 },
        ],
      },
      {
        groups: [
          { enemy: 'rockshell', count: 3, behavior: 'hold', formation: 'row', entry: 'top', y: 80, spacing: 120, interval: 0.2 },
          { enemy: 'swirlie', count: 6, behavior: 'hold', formation: 'row', entry: 'left', y: 130, delay: 0.4, interval: 0.1 },
          { enemy: 'spitter', count: 6, behavior: 'hold', formation: 'zigzag', entry: 'right', y: 180, delay: 0.8, interval: 0.1 },
          { enemy: 'spikeling', count: 6, behavior: 'hold', formation: 'row', entry: 'swoop', y: 225, delay: 1.4, interval: 0.1 },
        ],
      },
    ],
  },
];

// Full 15-sector campaign: the core sectors followed by the expansion
// (src/data/expansion/sectors.js).
export const THEMES = { ...CORE_THEMES, ...EXPANSION_THEMES };
export const LEVELS = [...CORE_LEVELS, ...EXPANSION_LEVELS];

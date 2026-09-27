// Sectors 6-15 (campaign expansion). Same schema as the core levels in
// ../levels.js; appended to LEVELS there, so progression, saves, the sector
// list and victory flow pick them up automatically.
//
// Difficulty philosophy: enemy HP creeps up only slightly (upgrades keep
// pace). Pressure comes from density, mixed ranged + melee groups, flanking
// and staggered entrances, the new paths (spiral / hook / diag / orbit) and
// formations (flanks / hex / stairs / crown), faster fire and bullet
// patterns (fireRate, bulletSpeed, extraShots, ambientFire, dive) and the
// remixed bosses in ./bosses.js.

// Group helpers (produce plain wave-group objects).
const hold = (enemy, count, formation, entry, y, o) => ({ enemy, count, behavior: 'hold', formation, entry, y, ...o });
const pass = (enemy, count, path, o) => ({ enemy, count, behavior: 'pass', path, ...o });
const wave = (...groups) => ({ groups });

// Acts shown as headers in the sector list.
export const ACTS = [
  { from: 1, to: 5, name: 'ACT I', title: 'THE FARM FRONTIER' },
  { from: 6, to: 10, name: 'ACT II', title: 'THE DEEP BELT' },
  { from: 11, to: 13, name: 'ACT III', title: 'THE DARK REACHES' },
  { from: 14, to: 15, name: 'ACT IV', title: 'THE SINGULARITY' },
];

// Background palettes (the scene art per key lives in effects/Background.js).
export const EXPANSION_THEMES = {
  solar: { top: '#0a0d1c', bottom: '#2e1a06', nebula: ['#ffb13d', '#ffe07a', '#2fb8c8'], star: '#fff6e0', dust: '#ffd98a', planet: { color: '#ffb13d', ring: '#fff0b8', x: 0.02, y: 0.18, r: 80 } },
  frost: { top: '#050c1c', bottom: '#1a2a44', nebula: ['#bfe8ff', '#8fa8ff', '#e8f6ff'], star: '#f4fbff', dust: '#d8f2ff', planet: { color: '#a8d8ff', ring: '#ffffff', x: 0.84, y: 0.24, r: 50 } },
  storm: { top: '#02110f', bottom: '#062a24', nebula: ['#18d9a0', '#5dff5a', '#1a7fd1'], star: '#e0fff4', dust: '#8dffcf', planet: { color: '#1a8a78', ring: '#b8ff9a', x: 0.9, y: 0.24, r: 66 } },
  prism: { top: '#020208', bottom: '#0c0a1c', nebula: ['#2fc8ff', '#ff6ad5', '#b8a8ff'], star: '#f2f6ff', dust: '#c8e8ff', planet: { color: '#8ff0ff', ring: '#ff9ad8', x: 0.1, y: 0.3, r: 40 } },
  scrap: { top: '#0a0a0e', bottom: '#241810', nebula: ['#8a6a4a', '#c86a2a', '#4a5a6a'], star: '#f0e8e0', dust: '#e0b890', planet: { color: '#6a6a78', ring: '#ff9b3d', x: 0.86, y: 0.22, r: 60 } },
  ocean: { top: '#020a1a', bottom: '#03283a', nebula: ['#0a8ad0', '#12e0c8', '#3a5aff'], star: '#e0fbff', dust: '#8ff6ff', planet: { color: '#0a6ab0', ring: '#9ffff0', x: 0.08, y: 0.26, r: 68 } },
  rift: { top: '#08020f', bottom: '#1e0630', nebula: ['#c01ed0', '#4a2bff', '#ff4fa0'], star: '#fbe6ff', dust: '#e08aff', planet: { color: '#5a1a8a', ring: '#ff5ec8', x: 0.84, y: 0.3, r: 36 } },
  darkstar: { top: '#050002', bottom: '#1c0206', nebula: ['#a0101e', '#ff3a2a', '#5a0a3a'], star: '#ffe0e0', dust: '#ff8a8a', planet: { color: '#000000', ring: '#ff3a2a', x: 0.12, y: 0.22, r: 70 } },
  abyss: { top: '#010108', bottom: '#050a1e', nebula: ['#1a2a8a', '#4a3ac0', '#0a6a9a'], star: '#e6ecff', dust: '#9fb3ff', planet: { color: '#0a0a2a', ring: '#9fb3ff', x: 0.8, y: 0.2, r: 50 } },
  singularity: { top: '#040108', bottom: '#1a0a14', nebula: ['#ffb13d', '#b04aff', '#ff5ec8'], star: '#fff4e6', dust: '#ffd9a0', planet: { color: '#000000', ring: '#ffd23f', x: 0.9, y: 0.2, r: 44 } },
};

export const EXPANSION_LEVELS = [
  // ------------------------------------------------ ACT II (mid-game)
  {
    id: 6,
    name: 'SOLAR FRONTIER',
    subtitle: 'Beyond the farm, the sun burns hotter.',
    theme: 'solar',
    boss: 'kingGloop2',
    mods: { hp: 1.85, speed: 1.3, bulletSpeed: 1.18, fireRate: 1.8, dive: 0.35, ambientFire: 0.05, extraShots: 1, drop: 1.15 },
    waves: [
      // warm-up: familiar critters, new shapes
      wave(hold('blobling', 8, 'crown', 'top', 140, { interval: 0.13 }), pass('zipfly', 6, 'hook', { x: 120, y: 200, dir: 1, duration: 4.5, delay: 1.5, interval: 0.3 })),
      // flanking spitters cover a staircase of bloblings
      wave(hold('spitter', 4, 'flanks', 'sides', 150, { interval: 0.2 }), hold('blobling', 8, 'stairs', 'left', 150, { delay: 0.6, interval: 0.13 })),
      wave(pass('zipfly', 8, 'diag', { dir: 'alt', duration: 4, interval: 0.3 }), hold('rockshell', 2, 'row', 'top', 90, { spacing: 180, delay: 1, interval: 0.4 })),
      wave(hold('swirlie', 6, 'hex', 'swoop', 160, { interval: 0.14 }), hold('spikeling', 6, 'row', 'sides', 220, { delay: 1.2, interval: 0.14 })),
      // high pressure: three layers at once
      wave(
        hold('blobling', 10, 'grid', 'left', 165, { rows: 2, interval: 0.1 }),
        hold('spitter', 4, 'crown', 'top', 85, { spacing: 70, delay: 0.6, interval: 0.15 }),
        pass('zipfly', 8, 'spiral', { x: 200, dir: 'alt', duration: 5, delay: 2.5, interval: 0.35 })
      ),
    ],
  },
  {
    id: 7,
    name: 'FROZEN NEBULA',
    subtitle: 'Ice drifts hide mixed patrols.',
    theme: 'frost',
    boss: 'buzzBaron2',
    mods: { hp: 1.9, speed: 1.32, bulletSpeed: 1.2, fireRate: 1.85, dive: 0.38, ambientFire: 0.06, extraShots: 1, drop: 1.15 },
    waves: [
      wave(pass('zipfly', 10, 'orbit', { x: 200, y: 230, dir: 'alt', duration: 5, interval: 0.25 }), hold('blobling', 6, 'row', 'top', 120, { delay: 1, interval: 0.12 })),
      wave(
        hold('swirlie', 6, 'flanks', 'sides', 150, { interval: 0.15 }),
        hold('spitter', 3, 'row', 'top', 85, { spacing: 110, delay: 0.5, interval: 0.2 }),
        pass('zipfly', 6, 'hook', { x: 280, y: 180, dir: -1, duration: 4.2, delay: 2.5, interval: 0.28 })
      ),
      wave(hold('rockshell', 3, 'crown', 'top', 110, { spacing: 100, interval: 0.3 }), hold('spikeling', 8, 'vee', 'swoop', 170, { delay: 1, interval: 0.12 })),
      wave(
        hold('blobling', 8, 'hex', 'left', 150, { interval: 0.12 }),
        pass('swirlie', 7, 'spiral', { x: 120, dir: 1, duration: 6, delay: 1, interval: 0.4 }),
        pass('swirlie', 7, 'spiral', { x: 280, dir: -1, duration: 6, delay: 1.2, interval: 0.4 })
      ),
      wave(
        hold('spitter', 5, 'stairs', 'right', 140, { interval: 0.14 }),
        hold('spikeling', 6, 'row', 'left', 215, { delay: 0.5, interval: 0.12 }),
        pass('zipfly', 10, 'diag', { dir: 'alt', duration: 3.8, delay: 2, interval: 0.22 }),
        hold('rockshell', 2, 'row', 'top', 80, { spacing: 220, delay: 3, interval: 0.3 })
      ),
    ],
  },
  {
    id: 8,
    name: 'BIOELECTRIC STORM',
    subtitle: 'Every cloud crackles with fire.',
    theme: 'storm',
    boss: 'jellytron2',
    mods: { hp: 1.95, speed: 1.33, bulletSpeed: 1.24, fireRate: 2, dive: 0.38, ambientFire: 0.09, extraShots: 2, drop: 1.1 },
    waves: [
      wave(hold('spitter', 6, 'arc', 'swoop', 130, { interval: 0.14 }), pass('zipfly', 8, 'sine', { y: 260, dir: 'alt', amp: 60, duration: 3.4, delay: 1, interval: 0.22 })),
      wave(hold('swirlie', 8, 'circle', 'top', 150, { interval: 0.12 }), hold('spitter', 4, 'flanks', 'sides', 110, { delay: 0.8, interval: 0.15 })),
      wave(hold('rockshell', 4, 'row', 'top', 95, { spacing: 90, interval: 0.25 }), hold('swirlie', 6, 'zigzag', 'left', 170, { delay: 0.6, interval: 0.12 })),
      // bullet curtain: two rows of spitters, spikelings dive through it
      wave(hold('spitter', 8, 'grid', 'sides', 130, { rows: 2, interval: 0.1 }), hold('spikeling', 8, 'wings', 'sides', 210, { delay: 1.2, interval: 0.1 })),
      wave(
        pass('swirlie', 8, 'orbit', { x: 200, y: 220, dir: 'alt', duration: 5, interval: 0.35 }),
        hold('rockshell', 3, 'vee', 'top', 100, { delay: 1, interval: 0.3 }),
        hold('spitter', 4, 'row', 'right', 160, { delay: 2, interval: 0.14 })
      ),
      wave(
        hold('blobling', 12, 'grid', 'left', 180, { rows: 2, interval: 0.08 }),
        hold('spitter', 6, 'crown', 'top', 90, { spacing: 60, delay: 0.5, interval: 0.12 }),
        hold('swirlie', 6, 'hex', 'swoop', 140, { delay: 1.5, interval: 0.12 })
      ),
    ],
  },
  {
    id: 9,
    name: 'CRYSTAL VOID',
    subtitle: 'Nothing here holds still.',
    theme: 'prism',
    boss: 'broodmother2',
    mods: { hp: 2, speed: 1.4, bulletSpeed: 1.24, fireRate: 2, dive: 0.45, ambientFire: 0.07, extraShots: 2, drop: 1.1 },
    waves: [
      wave(
        pass('zipfly', 8, 'spiral', { x: 130, dir: 1, duration: 5, interval: 0.3 }),
        pass('zipfly', 8, 'spiral', { x: 270, dir: -1, duration: 5, delay: 0.15, interval: 0.3 }),
        hold('spikeling', 6, 'stairs', 'swoop', 160, { delay: 2, interval: 0.12 })
      ),
      wave(
        pass('swirlie', 7, 'hook', { x: 100, y: 200, dir: 1, duration: 4.6, interval: 0.3 }),
        pass('swirlie', 7, 'hook', { x: 300, y: 200, dir: -1, duration: 4.6, delay: 0.15, interval: 0.3 }),
        hold('rockshell', 2, 'row', 'top', 90, { spacing: 200, delay: 1.5, interval: 0.3 })
      ),
      wave(hold('spikeling', 10, 'circle', 'swoop', 160, { interval: 0.1 }), hold('spitter', 4, 'flanks', 'sides', 120, { delay: 1, interval: 0.15 })),
      wave(pass('zipfly', 12, 'orbit', { x: 200, y: 210, dir: 'alt', duration: 5.5, interval: 0.22 }), hold('blobling', 8, 'crown', 'right', 150, { delay: 1, interval: 0.12 })),
      wave(
        pass('swirlie', 8, 'diag', { dir: 'alt', duration: 4.2, interval: 0.3 }),
        hold('spitter', 6, 'hex', 'top', 140, { delay: 0.8, interval: 0.12 }),
        hold('spikeling', 6, 'row', 'left', 225, { delay: 2, interval: 0.12 })
      ),
      wave(
        hold('rockshell', 3, 'stairs', 'top', 100, { interval: 0.3 }),
        hold('spikeling', 8, 'wings', 'sides', 190, { delay: 0.6, interval: 0.1 }),
        pass('zipfly', 10, 'loop', { x: 200, dir: 'alt', duration: 5, delay: 2, interval: 0.25 })
      ),
    ],
  },
  {
    id: 10,
    name: 'MECHANICAL GRAVEYARD',
    subtitle: 'The wreckage is still shooting back.',
    theme: 'scrap',
    boss: 'buzzBaron3',
    mods: { hp: 2.05, speed: 1.42, bulletSpeed: 1.26, fireRate: 2.1, dive: 0.5, ambientFire: 0.08, extraShots: 2, drop: 1.1 },
    waves: [
      wave(hold('rockshell', 3, 'row', 'top', 90, { spacing: 120, interval: 0.25 }), hold('blobling', 10, 'grid', 'sides', 170, { rows: 2, delay: 0.5, interval: 0.1 })),
      wave(hold('spitter', 6, 'stairs', 'left', 130, { interval: 0.13 }), pass('zipfly', 10, 'hook', { x: 200, y: 220, dir: 'alt', duration: 4.2, delay: 1, interval: 0.22 })),
      wave(hold('spikeling', 10, 'hex', 'swoop', 150, { interval: 0.1 }), hold('swirlie', 6, 'flanks', 'sides', 120, { delay: 1, interval: 0.12 })),
      wave(
        hold('rockshell', 4, 'crown', 'top', 110, { spacing: 85, interval: 0.25 }),
        hold('spitter', 6, 'zigzag', 'right', 170, { delay: 0.6, interval: 0.12 }),
        pass('zipfly', 8, 'cross', { dir: 'alt', duration: 3, delay: 2.5, interval: 0.25 })
      ),
      wave(
        hold('blobling', 14, 'grid', 'left', 175, { rows: 2, interval: 0.07 }),
        hold('spitter', 5, 'arc', 'top', 90, { delay: 0.5, interval: 0.12 }),
        hold('spikeling', 6, 'row', 'sides', 230, { delay: 2, interval: 0.12 })
      ),
      wave(
        pass('swirlie', 8, 'spiral', { x: 120, dir: 1, duration: 5.5, interval: 0.35 }),
        pass('swirlie', 8, 'spiral', { x: 280, dir: -1, duration: 5.5, delay: 0.2, interval: 0.35 }),
        hold('rockshell', 3, 'vee', 'top', 100, { delay: 1, interval: 0.3 }),
        hold('spitter', 4, 'flanks', 'sides', 150, { delay: 2, interval: 0.14 })
      ),
    ],
  },

  // ------------------------------------------------ ACT III (late game)
  {
    id: 11,
    name: 'CELESTIAL OCEAN',
    subtitle: 'Currents of light carry whole schools.',
    theme: 'ocean',
    boss: 'jellytron3',
    mods: { hp: 2.1, speed: 1.45, bulletSpeed: 1.28, fireRate: 2.2, dive: 0.5, ambientFire: 0.09, extraShots: 2, drop: 1.1 },
    waves: [
      wave(pass('swirlie', 10, 'orbit', { x: 200, y: 220, dir: 'alt', duration: 5, interval: 0.3 }), hold('spitter', 4, 'row', 'top', 85, { spacing: 90, delay: 1, interval: 0.15 })),
      wave(pass('zipfly', 12, 'diag', { dir: 'alt', duration: 3.8, interval: 0.18 }), hold('blobling', 10, 'hex', 'left', 150, { delay: 0.5, interval: 0.1 })),
      wave(hold('rockshell', 4, 'flanks', 'sides', 110, { interval: 0.25 }), hold('spikeling', 8, 'crown', 'swoop', 180, { delay: 1, interval: 0.1 })),
      wave(
        hold('spitter', 8, 'wings', 'sides', 150, { interval: 0.1 }),
        pass('swirlie', 8, 'hook', { x: 120, y: 240, dir: 1, duration: 4.6, delay: 1.5, interval: 0.3 }),
        pass('swirlie', 8, 'hook', { x: 280, y: 240, dir: -1, duration: 4.6, delay: 1.65, interval: 0.3 })
      ),
      wave(
        hold('blobling', 14, 'grid', 'sides', 180, { rows: 2, interval: 0.07 }),
        hold('rockshell', 3, 'row', 'top', 90, { spacing: 130, delay: 0.8, interval: 0.25 }),
        pass('zipfly', 10, 'spiral', { x: 200, dir: 'alt', duration: 5, delay: 2.5, interval: 0.25 })
      ),
      wave(
        hold('spikeling', 10, 'circle', 'swoop', 160, { interval: 0.1 }),
        hold('spitter', 6, 'stairs', 'right', 110, { delay: 0.6, interval: 0.12 }),
        pass('swirlie', 6, 'diag', { dir: 'alt', duration: 4.2, delay: 2.5, interval: 0.3 })
      ),
    ],
  },
  {
    id: 12,
    name: 'GRAVITY RIFT',
    subtitle: 'Space itself bends toward you.',
    theme: 'rift',
    boss: 'broodmother3',
    mods: { hp: 2.15, speed: 1.5, bulletSpeed: 1.3, fireRate: 2.3, dive: 0.55, ambientFire: 0.1, extraShots: 3, drop: 1.05 },
    waves: [
      wave(hold('spikeling', 10, 'vee', 'swoop', 150, { interval: 0.1 }), pass('zipfly', 10, 'orbit', { x: 200, y: 230, dir: 'alt', duration: 4.5, delay: 1, interval: 0.22 })),
      wave(hold('spitter', 8, 'crown', 'top', 110, { spacing: 48, interval: 0.1 }), hold('rockshell', 3, 'flanks', 'sides', 90, { delay: 0.8, interval: 0.25 })),
      wave(
        hold('swirlie', 10, 'hex', 'swoop', 150, { interval: 0.1 }),
        pass('zipfly', 8, 'hook', { x: 200, y: 260, dir: 'alt', duration: 4, delay: 1.5, interval: 0.22 }),
        hold('spikeling', 6, 'row', 'sides', 230, { delay: 2.5, interval: 0.12 })
      ),
      wave(
        hold('rockshell', 4, 'stairs', 'top', 100, { interval: 0.25 }),
        hold('spitter', 6, 'zigzag', 'left', 170, { delay: 0.5, interval: 0.12 }),
        pass('swirlie', 8, 'spiral', { x: 200, dir: 'alt', duration: 5.5, delay: 2, interval: 0.3 })
      ),
      wave(
        hold('blobling', 16, 'grid', 'sides', 180, { rows: 2, interval: 0.06 }),
        hold('spitter', 6, 'arc', 'top', 90, { delay: 0.5, interval: 0.12 }),
        hold('spikeling', 8, 'wings', 'swoop', 230, { delay: 2, interval: 0.1 })
      ),
      wave(
        pass('zipfly', 12, 'diag', { dir: 'alt', duration: 3.6, interval: 0.16 }),
        pass('zipfly', 12, 'loop', { x: 200, dir: 'alt', duration: 5, delay: 1, interval: 0.2 }),
        hold('rockshell', 3, 'crown', 'top', 100, { spacing: 110, delay: 2, interval: 0.3 }),
        hold('spitter', 4, 'flanks', 'sides', 150, { delay: 3, interval: 0.14 })
      ),
    ],
  },
  {
    id: 13,
    name: 'DARK STAR',
    subtitle: 'A dying sun, and everything it feeds.',
    theme: 'darkstar',
    boss: 'kingGloop3',
    mods: { hp: 2.2, speed: 1.52, bulletSpeed: 1.32, fireRate: 2.4, dive: 0.6, ambientFire: 0.11, extraShots: 3, drop: 1.05 },
    waves: [
      wave(hold('blobling', 14, 'grid', 'top', 150, { rows: 2, interval: 0.07 }), hold('spitter', 6, 'flanks', 'sides', 110, { delay: 0.6, interval: 0.12 })),
      wave(hold('spikeling', 12, 'circle', 'swoop', 160, { interval: 0.09 }), pass('zipfly', 10, 'spiral', { x: 200, dir: 'alt', duration: 5, delay: 1.5, interval: 0.22 })),
      wave(
        hold('rockshell', 4, 'row', 'top', 90, { spacing: 100, interval: 0.25 }),
        hold('swirlie', 10, 'hex', 'left', 170, { delay: 0.6, interval: 0.1 }),
        pass('zipfly', 8, 'hook', { x: 200, y: 250, dir: 'alt', duration: 4, delay: 2.5, interval: 0.25 })
      ),
      wave(
        hold('spitter', 8, 'stairs', 'right', 130, { interval: 0.1 }),
        hold('spikeling', 8, 'crown', 'swoop', 200, { delay: 1, interval: 0.1 }),
        pass('swirlie', 8, 'orbit', { x: 200, y: 240, dir: 'alt', duration: 5, delay: 2, interval: 0.3 })
      ),
      wave(
        hold('swirlie', 10, 'wings', 'sides', 150, { interval: 0.1 }),
        hold('rockshell', 3, 'vee', 'top', 100, { delay: 0.6, interval: 0.3 }),
        pass('zipfly', 12, 'diag', { dir: 'alt', duration: 3.6, delay: 2, interval: 0.18 })
      ),
      wave(
        hold('blobling', 16, 'grid', 'left', 180, { rows: 2, interval: 0.06 }),
        hold('spitter', 6, 'crown', 'top', 90, { spacing: 60, delay: 0.4, interval: 0.12 }),
        hold('spikeling', 8, 'row', 'sides', 235, { delay: 1.6, interval: 0.1 })
      ),
      wave(
        hold('rockshell', 4, 'flanks', 'sides', 100, { interval: 0.25 }),
        hold('spitter', 6, 'hex', 'top', 150, { delay: 0.5, interval: 0.12 }),
        hold('swirlie', 8, 'zigzag', 'right', 205, { delay: 1.2, interval: 0.1 }),
        pass('zipfly', 10, 'cross', { dir: 'alt', duration: 3, delay: 3, interval: 0.22 })
      ),
    ],
  },

  // ------------------------------------------------ ACT IV (endgame)
  {
    id: 14,
    name: 'COSMIC ABYSS',
    subtitle: 'The last light before the end of space.',
    theme: 'abyss',
    boss: 'buzzBaron4',
    mods: { hp: 2.25, speed: 1.55, bulletSpeed: 1.35, fireRate: 2.5, dive: 0.65, ambientFire: 0.12, extraShots: 3, drop: 1 },
    waves: [
      wave(
        hold('spikeling', 12, 'hex', 'swoop', 150, { interval: 0.09 }),
        hold('spitter', 6, 'flanks', 'sides', 110, { delay: 0.6, interval: 0.12 }),
        pass('zipfly', 10, 'orbit', { x: 200, y: 240, dir: 'alt', duration: 4.5, delay: 2, interval: 0.2 })
      ),
      wave(
        hold('rockshell', 4, 'crown', 'top', 100, { spacing: 90, interval: 0.25 }),
        pass('swirlie', 10, 'spiral', { x: 120, dir: 1, duration: 5, delay: 0.8, interval: 0.3 }),
        pass('swirlie', 10, 'spiral', { x: 280, dir: -1, duration: 5, delay: 0.95, interval: 0.3 })
      ),
      wave(
        hold('blobling', 16, 'grid', 'sides', 170, { rows: 2, interval: 0.06 }),
        hold('spitter', 8, 'stairs', 'left', 100, { delay: 0.5, interval: 0.1 }),
        hold('spikeling', 8, 'row', 'right', 235, { delay: 2, interval: 0.1 })
      ),
      wave(
        pass('zipfly', 14, 'hook', { x: 200, y: 230, dir: 'alt', duration: 4, interval: 0.16 }),
        hold('spitter', 6, 'wings', 'sides', 150, { delay: 1, interval: 0.12 }),
        hold('rockshell', 3, 'row', 'top', 85, { spacing: 140, delay: 2, interval: 0.25 })
      ),
      wave(
        hold('swirlie', 12, 'circle', 'swoop', 160, { interval: 0.09 }),
        hold('spikeling', 10, 'vee', 'left', 205, { delay: 1, interval: 0.09 }),
        pass('zipfly', 10, 'diag', { dir: 'alt', duration: 3.6, delay: 2.5, interval: 0.2 })
      ),
      wave(
        hold('rockshell', 5, 'hex', 'top', 130, { interval: 0.22 }),
        hold('spitter', 8, 'zigzag', 'sides', 195, { delay: 0.6, interval: 0.1 }),
        pass('swirlie', 8, 'orbit', { x: 200, y: 260, dir: 'alt', duration: 5, delay: 2.5, interval: 0.3 })
      ),
      wave(
        hold('blobling', 16, 'grid', 'left', 175, { rows: 2, interval: 0.06 }),
        hold('spitter', 6, 'crown', 'top', 90, { spacing: 60, delay: 0.4, interval: 0.12 }),
        hold('spikeling', 10, 'wings', 'swoop', 230, { delay: 1.4, interval: 0.09 }),
        pass('zipfly', 12, 'loop', { x: 200, dir: 'alt', duration: 5, delay: 3, interval: 0.2 })
      ),
    ],
  },
  {
    id: 15,
    name: 'FINAL SINGULARITY',
    subtitle: 'Everything ends where she waits.',
    theme: 'singularity',
    boss: 'voidEmpress2',
    mods: { hp: 2.3, speed: 1.6, bulletSpeed: 1.38, fireRate: 2.6, dive: 0.7, ambientFire: 0.13, extraShots: 3, drop: 1 },
    waves: [
      wave(
        hold('spikeling', 12, 'crown', 'swoop', 150, { interval: 0.09 }),
        hold('spitter', 6, 'flanks', 'sides', 110, { delay: 0.5, interval: 0.12 }),
        pass('zipfly', 12, 'spiral', { x: 200, dir: 'alt', duration: 5, delay: 2, interval: 0.2 })
      ),
      wave(
        hold('rockshell', 4, 'stairs', 'top', 100, { interval: 0.25 }),
        hold('swirlie', 12, 'hex', 'left', 170, { delay: 0.6, interval: 0.09 }),
        pass('zipfly', 10, 'hook', { x: 200, y: 240, dir: 'alt', duration: 4, delay: 2.5, interval: 0.2 })
      ),
      wave(
        hold('blobling', 16, 'grid', 'sides', 175, { rows: 2, interval: 0.06 }),
        hold('spitter', 8, 'arc', 'top', 90, { delay: 0.4, interval: 0.1 }),
        hold('spikeling', 8, 'row', 'sides', 235, { delay: 1.6, interval: 0.1 })
      ),
      wave(
        pass('swirlie', 10, 'orbit', { x: 200, y: 220, dir: 'alt', duration: 5, interval: 0.25 }),
        hold('rockshell', 4, 'crown', 'top', 100, { spacing: 90, delay: 1, interval: 0.25 }),
        hold('spitter', 6, 'wings', 'sides', 160, { delay: 2, interval: 0.12 })
      ),
      wave(
        pass('zipfly', 14, 'diag', { dir: 'alt', duration: 3.4, interval: 0.15 }),
        pass('zipfly', 14, 'loop', { x: 200, dir: 'alt', duration: 5, delay: 1, interval: 0.18 }),
        hold('spikeling', 10, 'circle', 'swoop', 160, { delay: 2, interval: 0.09 })
      ),
      wave(
        hold('rockshell', 5, 'hex', 'top', 130, { interval: 0.22 }),
        hold('spitter', 8, 'stairs', 'right', 110, { delay: 0.5, interval: 0.1 }),
        pass('swirlie', 10, 'spiral', { x: 200, dir: 'alt', duration: 5, delay: 2, interval: 0.25 }),
        hold('spikeling', 8, 'wings', 'sides', 230, { delay: 3, interval: 0.1 })
      ),
      // final gauntlet before the Empress: every archetype at once
      wave(
        hold('blobling', 14, 'grid', 'left', 180, { rows: 2, interval: 0.06 }),
        hold('spitter', 6, 'crown', 'top', 85, { spacing: 60, delay: 0.3, interval: 0.1 }),
        hold('swirlie', 8, 'flanks', 'sides', 140, { delay: 1, interval: 0.1 }),
        hold('spikeling', 10, 'vee', 'swoop', 220, { delay: 1.8, interval: 0.09 }),
        pass('zipfly', 12, 'cross', { dir: 'alt', duration: 3, delay: 3.5, interval: 0.2 })
      ),
    ],
  },
];

// Campaign tier per sector id (used by the sector list and tests).
export function sectorTier(id) {
  if (id <= 5) return 'early';
  if (id <= 10) return 'mid';
  if (id <= 13) return 'late';
  return 'endgame';
}

// Boss encounters for sectors 6-15. No new boss art or mechanics: every
// variant reuses one of the five core bosses (same art, size, hitboxes and
// contact damage) and only remixes its phases from the existing attack
// types in src/boss/BossPatterns.js: new phase orders, faster / denser
// versions of known attacks, extra phases and combined rotations.
// `aura` adds a pulsing back glow so returning bosses read as upgraded.

// Attack factories (same fields as the hand-written core bosses).
const fan = (count, spread, speed, repeat, interval, aim, bullet, damage, from, telegraph = 0.55) => ({ type: 'fan', count, spread, speed, repeat, interval, aim, telegraph, bullet, damage, from });
const aimed = (count, interval, speed, bullet, damage, from, telegraph = 0.55) => ({ type: 'aimed', count, interval, speed, telegraph, bullet, damage, from });
const ring = (count, speed, repeat, interval, rotate, bullet, damage, from, telegraph = 0.7) => ({ type: 'ring', count, speed, repeat, interval, rotate, telegraph, bullet, damage, from });
const spiral = (arms, rate, duration, speed, turn, bullet, damage, from, telegraph = 0.7) => ({ type: 'spiral', arms, rate, duration, speed, turn, telegraph, bullet, damage, from });
const rain = (duration, rate, speed, bullet, damage, telegraph = 0.6) => ({ type: 'rain', duration, rate, speed, telegraph, bullet, damage });
const wall = (rows, interval, speed, gap, bullet = 'big', damage = 14, telegraph = 0.8) => ({ type: 'wall', rows, interval, speed, gap, telegraph, bullet, damage });
const laser = (count, duration, width, damage, telegraph = 1.1) => ({ type: 'laser', count, duration, width, track: true, telegraph, damage });
const charge = (speed, telegraph = 0.9) => ({ type: 'charge', speed, telegraph });
const summon = (enemy, count, max, telegraph = 0.7) => ({ type: 'summon', enemy, count, max, telegraph });
const nova = (rings, count, speed, interval, bullet = 'big', damage = 15, telegraph = 1.3) => ({ type: 'nova', rings, count, speed, interval, telegraph, bullet, damage, from: [0, 0] });
const passive = (interval, count, spread, speed, bullet, damage, from) => ({ interval, count, spread, speed, bullet, damage, from });
const phase = (at, label, move, rest, attacks, pas) => (pas ? { at, label, move, rest, passive: pas, attacks } : { at, label, move, rest, attacks });

// A variant keeps the base boss's body; only presentation + phases change.
function variant(base, v) {
  return {
    name: v.name,
    title: v.title,
    art: base.art,
    color: base.color,
    aura: v.aura,
    hp: v.hp,
    score: v.score,
    coins: v.coins,
    holdY: base.holdY,
    size: base.size,
    hit: base.hit,
    contactDamage: base.contactDamage,
    phases: v.phases,
  };
}

export function buildBossVariants(CORE) {
  const G = [0, 55]; // King Gloop mouth
  const BZ = [0, 60]; // Buzz Baron stinger
  const BZL = [-55, 20];
  const BZR = [55, 20];
  const J = [0, 70]; // Jellytron core
  const BM = [0, 60]; // Broodmother fangs
  const V = [0, 60]; // Void Empress eye

  return {
    // S6 Solar Frontier — the first boss returns with two new phases.
    kingGloop2: variant(CORE.kingGloop, {
      name: 'KING GLOOP II',
      title: 'Crowned in Solar Fire',
      aura: '#ffb13d',
      hp: 13500,
      score: 32000,
      coins: 170,
      phases: [
        phase(1, 'SOLAR SLIME', { type: 'sway', speed: 0.85, range: 110 }, 0.9, [
          fan(7, 80, 165, 3, 0.6, false, 'blob', 12, G, 0.6),
          aimed(6, 0.2, 210, 'blob', 12, G, 0.5),
          rain(2.4, 7, 150, 'blob', 10),
        ]),
        phase(0.6, 'FLARE BURST', { type: 'drift', speed: 1.1, range: 120 }, 0.8, [
          ring(14, 145, 2, 0.6, 12, 'blob', 12, [0, 20]),
          summon('blobling', 4, 6),
          fan(5, 50, 190, 3, 0.45, true, 'blob', 12, G, 0.5),
        ], passive(2.2, 2, 20, 190, 'blob', 10, G)),
        phase(0.3, 'CORONA MELTDOWN', { type: 'sway', speed: 1.2, range: 130 }, 0.7, [
          spiral(3, 9, 2.6, 150, 12, 'blob', 11, [0, 20]),
          wall(2, 1.2, 120, 100, 'big', 14),
          rain(2.6, 9, 165, 'blob', 10),
        ], passive(2, 3, 30, 200, 'blob', 10, G)),
      ],
    }),

    // S7 Frozen Nebula — faster needles, a mid-fight swarm + blizzard.
    buzzBaron2: variant(CORE.buzzBaron, {
      name: 'BUZZ BARON II',
      title: 'Frostwing Ace of the Frozen Nebula',
      aura: '#9ff3ff',
      hp: 15000,
      score: 34000,
      coins: 180,
      phases: [
        phase(1, 'COLD SNAP', { type: 'sway', speed: 1.1, range: 125 }, 0.85, [
          fan(7, 70, 185, 3, 0.5, true, 'needle', 12, BZ),
          aimed(8, 0.12, 260, 'needle', 12, BZ, 0.6),
          charge(760),
          fan(4, 30, 210, 4, 0.28, true, 'orb', 10, BZL, 0.4),
        ]),
        phase(0.55, 'BLIZZARD SWARM', { type: 'sway', speed: 1.25, range: 130 }, 0.75, [
          summon('zipfly', 5, 8),
          rain(2.4, 8, 175, 'needle', 10),
          charge(800),
          fan(4, 30, 210, 4, 0.28, true, 'orb', 10, BZR, 0.4),
        ], passive(1.9, 2, 16, 210, 'needle', 10, BZ)),
      ],
    }),

    // S8 Bioelectric Storm — lasers arrive in phase 1, three phases.
    jellytron2: variant(CORE.jellytron, {
      name: 'JELLYTRON II',
      title: 'Stormcore of the Bioelectric Sea',
      aura: '#5dff9a',
      hp: 16500,
      score: 36000,
      coins: 190,
      phases: [
        phase(1, 'LIVE WIRE', { type: 'figure8', speed: 0.8, range: 115, rangeY: 30 }, 0.85, [
          fan(9, 110, 170, 3, 0.55, false, 'orb', 12, J, 0.6),
          laser(1, 1.1, 30, 20),
          aimed(8, 0.12, 265, 'needle', 11, J, 0.6),
        ], passive(2.2, 1, 0, 205, 'orb', 10, J)),
        phase(0.66, 'ARC FLASH', { type: 'figure8', speed: 1, range: 120, rangeY: 36 }, 0.8, [
          wall(3, 1.1, 125, 95),
          summon('swirlie', 4, 6),
          spiral(4, 8, 2.8, 150, -9, 'petal', 11, [0, 10]),
        ], passive(1.8, 2, 20, 205, 'orb', 10, J)),
        phase(0.33, 'SUPERCELL', { type: 'figure8', speed: 1.15, range: 128, rangeY: 42 }, 0.7, [
          laser(2, 1.3, 34, 22),
          ring(18, 155, 3, 0.55, 10, 'petal', 12, [0, 20]),
          summon('spikeling', 4, 6),
          fan(11, 130, 175, 3, 0.5, true, 'orb', 12, J, 0.6),
        ], passive(1.5, 3, 30, 210, 'orb', 10, J)),
      ],
    }),

    // S9 Crystal Void — the hive gains a shard-storm phase and a nova.
    broodmother2: variant(CORE.broodmother, {
      name: 'BROODMOTHER II',
      title: 'Prism Queen of the Crystal Void',
      aura: '#8ff0ff',
      hp: 18000,
      score: 38000,
      coins: 200,
      phases: [
        phase(1, 'CRYSTAL CLUTCH', { type: 'drift', speed: 1.1, range: 115 }, 0.9, [
          ring(16, 145, 2, 0.65, 12, 'petal', 12, [0, 20]),
          summon('zipfly', 5, 8),
          fan(5, 50, 185, 2, 0.45, true, 'orb', 12, BM, 0.5),
        ]),
        phase(0.66, 'SHARD STORM', { type: 'drift', speed: 1.25, range: 120 }, 0.8, [
          spiral(3, 9, 2.6, 155, 11, 'petal', 11, [0, 10]),
          wall(2, 1.1, 125, 100),
          summon('spitter', 3, 5),
        ], passive(1.8, 2, 16, 195, 'orb', 10, BM)),
        phase(0.33, 'HIVE NOVA', { type: 'sway', speed: 1.4, range: 125 }, 0.7, [
          nova(2, 18, 140, 0.5, 'petal', 13, 1.2),
          ring(20, 155, 3, 0.55, 10, 'petal', 12, [0, 20]),
          summon('spikeling', 4, 6),
          spiral(4, 8, 2.6, 150, -10, 'petal', 11, [0, 10]),
        ], passive(1.6, 3, 24, 200, 'orb', 10, BM)),
      ],
    }),

    // S10 Mechanical Graveyard — mid-game capstone: chained charges + walls.
    buzzBaron3: variant(CORE.buzzBaron, {
      name: 'BUZZ BARON MK III',
      title: 'Scrap King of the Graveyard',
      aura: '#ff9b3d',
      hp: 19500,
      score: 40000,
      coins: 210,
      phases: [
        phase(1, 'ASSEMBLY LINE', { type: 'sway', speed: 1.15, range: 130 }, 0.8, [
          fan(7, 70, 190, 3, 0.48, true, 'needle', 12, BZ),
          charge(780),
          fan(4, 30, 215, 4, 0.26, true, 'orb', 10, BZL, 0.4),
          fan(4, 30, 215, 4, 0.26, true, 'orb', 10, BZR, 0.4),
        ]),
        phase(0.7, 'SCRAP STORM', { type: 'drift', speed: 1.3, range: 130 }, 0.75, [
          wall(3, 1.05, 130, 95),
          aimed(10, 0.1, 270, 'needle', 11, BZ, 0.6),
          summon('rockshell', 2, 3),
        ], passive(1.9, 2, 16, 215, 'needle', 10, BZ)),
        phase(0.4, 'OVERDRIVE', { type: 'track', speed: 1.3, range: 130 }, 0.65, [
          charge(840),
          spiral(2, 12, 2.4, 170, 14, 'needle', 11, BZ),
          charge(840),
          rain(2.4, 9, 185, 'orb', 10),
        ], passive(1.6, 3, 24, 215, 'needle', 10, BZ)),
      ],
    }),

    // S11 Celestial Ocean — tidal rotations: rings, walls, drifting lasers.
    jellytron3: variant(CORE.jellytron, {
      name: 'JELLYTRON PRIME',
      title: 'Leviathan of the Celestial Ocean',
      aura: '#43e6ff',
      hp: 21000,
      score: 43000,
      coins: 220,
      phases: [
        phase(1, 'HIGH TIDE', { type: 'figure8', speed: 0.85, range: 120, rangeY: 34 }, 0.8, [
          ring(18, 150, 3, 0.55, 10, 'petal', 12, [0, 20]),
          wall(2, 1.2, 120, 100),
          fan(9, 110, 175, 3, 0.55, true, 'orb', 12, J, 0.6),
        ], passive(2, 2, 20, 205, 'orb', 10, J)),
        phase(0.7, 'UNDERTOW', { type: 'drift', speed: 1.2, range: 125 }, 0.75, [
          laser(2, 1.2, 32, 22),
          summon('swirlie', 5, 7),
          spiral(4, 9, 2.8, 150, 9, 'petal', 11, [0, 10]),
        ], passive(1.7, 3, 26, 210, 'orb', 10, J)),
        phase(0.4, 'MAELSTROM', { type: 'figure8', speed: 1.2, range: 130, rangeY: 44 }, 0.65, [
          nova(2, 20, 145, 0.45),
          laser(3, 1.2, 30, 22, 1.15),
          aimed(10, 0.1, 275, 'needle', 11, J, 0.6),
          wall(3, 1, 130, 95),
        ], passive(1.4, 3, 30, 215, 'orb', 11, J)),
      ],
    }),

    // S12 Gravity Rift — four phases, the queen tracks the player at the end.
    broodmother3: variant(CORE.broodmother, {
      name: 'BROODMOTHER PRIME',
      title: 'Matriarch of the Gravity Rift',
      aura: '#ff5ec8',
      hp: 22500,
      score: 46000,
      coins: 230,
      phases: [
        phase(1, 'GRAVITY WELL', { type: 'drift', speed: 1.15, range: 120 }, 0.8, [
          spiral(3, 10, 2.6, 150, 11, 'petal', 11, [0, 10]),
          summon('zipfly', 6, 9),
          fan(7, 70, 190, 3, 0.45, true, 'orb', 12, BM, 0.5),
        ], passive(2, 2, 16, 200, 'orb', 10, BM)),
        phase(0.7, 'EVENT HORIZON', { type: 'sway', speed: 1.3, range: 125 }, 0.75, [
          ring(20, 150, 3, 0.55, 9, 'petal', 12, [0, 20]),
          wall(2, 1.1, 130, 95),
          summon('spitter', 3, 5),
        ], passive(1.8, 3, 24, 205, 'orb', 10, BM)),
        phase(0.45, 'TIDAL LOCK', { type: 'figure8', speed: 1.1, range: 125, rangeY: 38 }, 0.7, [
          nova(2, 20, 145, 0.5, 'petal', 13, 1.2),
          laser(2, 1.2, 30, 22),
          spiral(4, 9, 2.6, 155, -10, 'petal', 11, [0, 10]),
        ], passive(1.6, 3, 28, 210, 'orb', 11, BM)),
        phase(0.2, 'COLLAPSE', { type: 'track', speed: 1.3, range: 130 }, 0.6, [
          summon('spikeling', 5, 7),
          ring(22, 160, 3, 0.5, 8, 'petal', 12, [0, 20]),
          rain(2.6, 10, 175, 'orb', 11),
          fan(9, 90, 195, 3, 0.4, true, 'orb', 12, BM, 0.5),
        ], passive(1.4, 3, 32, 215, 'orb', 11, BM)),
      ],
    }),

    // S13 Dark Star — the slime king at his most dangerous: four phases.
    kingGloop3: variant(CORE.kingGloop, {
      name: 'KING GLOOP PRIME',
      title: 'Tyrant of the Dark Star',
      aura: '#ff4f5e',
      hp: 24000,
      score: 50000,
      coins: 240,
      phases: [
        phase(1, 'DARK TIDE', { type: 'sway', speed: 0.95, range: 120 }, 0.8, [
          fan(9, 100, 175, 3, 0.5, false, 'blob', 12, G, 0.6),
          rain(2.4, 9, 160, 'blob', 10),
          aimed(8, 0.14, 230, 'blob', 12, G, 0.5),
        ], passive(2.1, 2, 18, 195, 'blob', 10, G)),
        phase(0.75, 'GRAVITY GLOOP', { type: 'drift', speed: 1.2, range: 125 }, 0.75, [
          ring(18, 150, 3, 0.55, 10, 'blob', 12, [0, 20]),
          summon('blobling', 5, 7),
          wall(2, 1.15, 125, 100),
        ], passive(1.9, 3, 24, 200, 'blob', 10, G)),
        phase(0.5, 'BLACK CORONA', { type: 'figure8', speed: 1, range: 125, rangeY: 36 }, 0.7, [
          spiral(4, 9, 2.8, 155, 11, 'blob', 11, [0, 20]),
          laser(2, 1.2, 32, 22),
          fan(7, 60, 200, 3, 0.4, true, 'blob', 12, G, 0.5),
        ], passive(1.7, 3, 28, 205, 'blob', 11, G)),
        phase(0.25, 'SUPERNOVA', { type: 'track', speed: 1.3, range: 130 }, 0.6, [
          nova(3, 20, 145, 0.45),
          rain(2.6, 11, 175, 'blob', 11),
          spiral(5, 8, 2.6, 150, -10, 'blob', 11, [0, 20]),
          summon('spikeling', 4, 6),
        ], passive(1.4, 3, 32, 210, 'blob', 11, G)),
      ],
    }),

    // S14 Cosmic Abyss — the Baron's final form: four phases, relentless.
    buzzBaron4: variant(CORE.buzzBaron, {
      name: 'BUZZ BARON OMEGA',
      title: 'Last Knight of the Cosmic Abyss',
      aura: '#b27dff',
      hp: 26000,
      score: 55000,
      coins: 260,
      phases: [
        phase(1, 'ABYSS DIVE', { type: 'sway', speed: 1.2, range: 130 }, 0.75, [
          fan(9, 80, 195, 3, 0.45, true, 'needle', 12, BZ),
          charge(800),
          aimed(10, 0.1, 275, 'needle', 11, BZ, 0.6),
          fan(5, 34, 220, 4, 0.25, true, 'orb', 10, BZL, 0.4),
        ], passive(2, 2, 16, 215, 'needle', 10, BZ)),
        phase(0.75, 'HIVE LEGION', { type: 'drift', speed: 1.35, range: 130 }, 0.7, [
          summon('zipfly', 6, 9),
          wall(3, 1, 135, 95),
          fan(5, 34, 220, 4, 0.25, true, 'orb', 10, BZR, 0.4),
        ], passive(1.8, 3, 24, 215, 'needle', 10, BZ)),
        phase(0.5, 'STINGER STORM', { type: 'figure8', speed: 1.1, range: 130, rangeY: 38 }, 0.65, [
          spiral(3, 11, 2.6, 170, 13, 'needle', 11, BZ),
          laser(2, 1.2, 30, 22),
          charge(860),
        ], passive(1.6, 3, 28, 220, 'needle', 11, BZ)),
        phase(0.25, 'OMEGA SWARM', { type: 'track', speed: 1.4, range: 130 }, 0.55, [
          nova(3, 22, 150, 0.45, 'needle', 14),
          charge(880),
          rain(2.6, 11, 190, 'needle', 11),
          summon('spikeling', 5, 7),
        ], passive(1.3, 3, 32, 225, 'needle', 11, BZ)),
      ],
    }),

    // S15 Final Singularity — the campaign finale. Five phases (75/50/25/10%),
    // every Void Empress technique, faster and layered.
    voidEmpress2: variant(CORE.voidEmpress, {
      name: 'VOID EMPRESS ASCENDED',
      title: 'Heart of the Final Singularity',
      aura: '#ffd23f',
      hp: 30000,
      score: 80000,
      coins: 320,
      phases: [
        phase(1, 'THE EYE OPENS', { type: 'sway', speed: 0.9, range: 110 }, 0.8, [
          fan(9, 90, 190, 3, 0.45, true, 'orb', 13, V),
          ring(18, 155, 3, 0.5, 11, 'petal', 12, [0, 0]),
          aimed(10, 0.11, 280, 'needle', 12, V, 0.6),
        ], passive(2.1, 2, 18, 205, 'orb', 11, V)),
        phase(0.75, 'SWARM OF THE VOID', { type: 'drift', speed: 1.25, range: 125 }, 0.75, [
          summon('spikeling', 5, 7),
          spiral(3, 11, 2.8, 165, 13, 'petal', 12, [0, 0]),
          wall(3, 1.05, 135, 90),
          summon('swirlie', 4, 6),
        ], passive(1.9, 3, 24, 205, 'orb', 11, V)),
        phase(0.5, 'STARLIGHT LANCES', { type: 'figure8', speed: 0.95, range: 125, rangeY: 38 }, 0.7, [
          laser(3, 1.4, 32, 24, 1.15),
          ring(22, 165, 3, 0.48, 9, 'petal', 12, [0, 0]),
          spiral(3, 10, 2.6, 170, -12, 'petal', 12, [0, 0]),
          fan(11, 110, 200, 3, 0.4, true, 'orb', 13, V),
        ], passive(1.6, 3, 30, 215, 'orb', 11, V)),
        phase(0.25, 'FINAL ECLIPSE', { type: 'track', speed: 1.4, range: 130 }, 0.62, [
          nova(3, 24, 150, 0.45),
          laser(2, 1.2, 36, 24, 1),
          spiral(5, 8, 3, 150, 10, 'petal', 12, [0, 0]),
          rain(2.6, 10, 175, 'orb', 11),
          summon('spitter', 3, 5),
        ], passive(1.3, 3, 34, 220, 'orb', 12, V)),
        phase(0.1, 'SINGULARITY', { type: 'figure8', speed: 1.25, range: 130, rangeY: 40 }, 0.55, [
          nova(4, 24, 150, 0.4, 'big', 15, 1.2),
          spiral(6, 8, 3, 155, -11, 'petal', 12, [0, 0]),
          laser(3, 1.2, 30, 24, 1.1),
          wall(3, 1, 140, 90),
        ], passive(1.1, 4, 40, 225, 'orb', 12, V)),
      ],
    }),
  };
}

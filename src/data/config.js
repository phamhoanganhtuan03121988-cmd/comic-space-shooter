// Global tuning constants. Gameplay content (enemies, levels, bosses, items,
// upgrades) lives in the sibling data files; this file only holds engine-level
// numbers that rarely change.

export const CONFIG = {
  // Logical playfield width. Height is derived from the device aspect ratio.
  WIDTH: 400,
  MIN_ASPECT: 1.45, // height / width (wider screens are letterboxed)
  MAX_ASPECT: 2.3, // taller screens are letterboxed vertically
  MAX_DPR: 2,

  // Pool sizes (hard caps => predictable memory and frame time).
  POOL: {
    playerBullets: 260,
    enemyBullets: 420,
    enemies: 64,
    particles: 650,
    texts: 64,
    pickups: 120,
  },

  PLAYER: {
    hitRadius: 6, // bullet-hell style small core hitbox
    bodyRadius: 18, // for contact with enemy bodies
    pickupRadius: 30,
    coinAttractRadius: 80,
    invulnTime: 1.1,
    shieldRegenDelay: 3.5,
    shieldRegenRate: 9, // points per second
    maxPower: 5,
    bottomMargin: 56,
    topLimit: 0.38, // fraction of height the ship can climb to
    bulletSpeed: 860,
    dragSensitivity: 1.15,
  },

  COMBO: {
    window: 2.6, // seconds without a kill before the combo resets
    tiers: [
      { kills: 0, mult: 1 },
      { kills: 5, mult: 2 },
      { kills: 10, mult: 3 },
      { kills: 20, mult: 4 },
      { kills: 30, mult: 5 },
    ],
  },

  SKILL: {
    name: 'NOVA',
    cooldown: 22,
    damage: 90, // + attack * 4
    bossDamage: 260,
    invuln: 1.0,
  },

  SCORE: {
    critBonus: 5,
    perfectWave: 1000, // * level
    noDamageWave: 500, // * level
    levelClear: 2000, // * level
    bulletCleared: 10,
  },

  REWARD: {
    levelClearCoins: 20, // + perLevelCoins * level
    perLevelCoins: 10,
    comboCoinsPer5: 1, // coins per 5 max-combo kills
  },

  SHAKE_MAX: 7,
};

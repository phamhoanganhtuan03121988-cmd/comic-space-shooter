// localStorage persistence with a schema version + migrations.
// Every write is wrapped in try/catch: private browsing or full storage must
// never crash the game (it falls back to in-memory data for the session).

export const SAVE_KEY = 'cfd_save';
export const SAVE_VERSION = 2;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    coins: 0,
    bestScore: 0,
    unlockedLevel: 1, // highest playable level id
    clearedLevels: [], // level ids beaten at least once
    lastLevel: 1, // last level played (menu PLAY shortcut / progression)
    upgrades: { attack: 0, fireRate: 0, hp: 0, shield: 0, moveSpeed: 0, critChance: 0 },
    settings: { sound: true, music: true, shake: true, vibration: true, debug: false },
    stats: { totalKills: 0, totalCoins: 0, bossesDefeated: 0, gamesPlayed: 0 },
  };
}

// Migrations take data of version N and return version N+1.
const MIGRATIONS = {
  // v1 stored `level` instead of `unlockedLevel` and had no stats / clearedLevels.
  1: (d) => {
    const out = { ...d };
    if (out.unlockedLevel == null) out.unlockedLevel = out.level || 1;
    delete out.level;
    out.clearedLevels = out.clearedLevels || [];
    out.stats = out.stats || {};
    out.version = 2;
    return out;
  },
};

export function migrate(data) {
  let d = data;
  let guard = 0;
  while (d.version < SAVE_VERSION && MIGRATIONS[d.version] && guard++ < 50) {
    d = MIGRATIONS[d.version](d);
  }
  return d;
}

// Deep-merge loaded data over defaults so newly added fields always exist.
function mergeDefaults(def, data) {
  const out = Array.isArray(def) ? [] : {};
  for (const k of Object.keys(def)) {
    const dv = def[k];
    const v = data ? data[k] : undefined;
    if (v === undefined || v === null) out[k] = Array.isArray(dv) ? dv.slice() : typeof dv === 'object' ? mergeDefaults(dv, null) : dv;
    else if (Array.isArray(dv)) out[k] = Array.isArray(v) ? v.slice() : dv.slice();
    else if (typeof dv === 'object') out[k] = mergeDefaults(dv, v);
    else out[k] = typeof v === typeof dv ? v : dv;
  }
  return out;
}

// Records a sector clear and unlocks the next one (capped at the campaign
// size). Returns true when a new sector was unlocked.
export function recordClear(data, levelId, totalLevels) {
  const was = data.unlockedLevel;
  data.unlockedLevel = Math.min(totalLevels, Math.max(data.unlockedLevel, levelId + 1));
  if (!data.clearedLevels.includes(levelId)) data.clearedLevels.push(levelId);
  return data.unlockedLevel > was;
}

// Keeps unlock progress consistent with the campaign size. Saves made when
// the campaign had 5 sectors capped unlockedLevel at 5 even after clearing
// sector 5; now that more sectors exist, the next one opens automatically.
// Never lowers progress except to clamp into the valid range.
export function repairProgress(data, totalLevels) {
  const cleared = data.clearedLevels.filter((n) => Number.isInteger(n) && n >= 1 && n <= totalLevels);
  data.clearedLevels = cleared;
  const next = cleared.length ? Math.max(...cleared) + 1 : 1;
  data.unlockedLevel = Math.max(1, Math.min(totalLevels, Math.max(data.unlockedLevel, next)));
  return data;
}

export class SaveSystem {
  constructor(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.storage = storage;
    this.available = true;
    this.data = this.load();
  }

  load() {
    let raw = null;
    try {
      raw = this.storage ? this.storage.getItem(SAVE_KEY) : null;
    } catch (_) {
      this.available = false;
    }
    if (!raw) return defaultSave();
    try {
      let parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return defaultSave();
      if (typeof parsed.version !== 'number') parsed.version = 1;
      parsed = migrate(parsed);
      const merged = mergeDefaults(defaultSave(), parsed);
      merged.version = SAVE_VERSION;
      return merged;
    } catch (_) {
      // Corrupted save: keep a backup copy so it can be inspected, start fresh.
      try {
        this.storage.setItem(SAVE_KEY + '_corrupt', raw);
      } catch (__) {
        /* ignore */
      }
      return defaultSave();
    }
  }

  save() {
    try {
      if (this.storage) this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      return true;
    } catch (_) {
      this.available = false;
      return false;
    }
  }

  reset() {
    const settings = this.data.settings;
    this.data = defaultSave();
    this.data.settings = { ...settings, debug: false };
    this.save();
  }

  addCoins(n) {
    this.data.coins = Math.max(0, Math.floor(this.data.coins + n));
    if (n > 0) this.data.stats.totalCoins += Math.floor(n);
  }

  spendCoins(n) {
    if (this.data.coins < n) return false;
    this.data.coins -= n;
    return true;
  }
}

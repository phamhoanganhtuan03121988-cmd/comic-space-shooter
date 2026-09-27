import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { LEVELS, CORE_LEVELS, THEMES, CORE_THEMES } from '../../src/data/levels.js';
import { BOSSES, CORE_BOSSES } from '../../src/data/bosses.js';
import { ACTS, sectorTier } from '../../src/data/expansion/sectors.js';
import { SaveSystem, SAVE_KEY, defaultSave, recordClear, repairProgress } from '../../src/systems/SaveSystem.js';

// 15-sector campaign expansion (sectors 6-15).

const fingerprint = (o) => createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);
const enemiesIn = (w) => w.groups.reduce((n, g) => n + g.count, 0);

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('campaign: 15 sectors, sequential ids, sectors 1-5 are the unchanged core', () => {
  assert.equal(LEVELS.length, 15);
  LEVELS.forEach((l, i) => assert.equal(l.id, i + 1));
  assert.deepEqual(LEVELS.slice(0, 5), CORE_LEVELS);
  // Fingerprints of the core content as shipped before the expansion:
  // any edit to sectors 1-5 (waves, mods, bosses, palettes) fails here.
  assert.equal(fingerprint(CORE_LEVELS), 'e31b22fd8a2ed69e', 'sector 1-5 wave data changed');
  assert.equal(fingerprint(CORE_BOSSES), 'dc471cb2c6d6c622', 'core boss data changed');
  assert.equal(fingerprint(CORE_THEMES), 'd2492bc3a4e36a6f', 'sector 1-5 palettes changed');
  for (const k of Object.keys(CORE_BOSSES)) assert.equal(BOSSES[k], CORE_BOSSES[k]);
});

test('campaign: correct boss assignment, Void Empress ends the campaign', () => {
  const expected = ['kingGloop', 'buzzBaron', 'broodmother', 'jellytron', 'voidEmpress', 'kingGloop2', 'buzzBaron2', 'jellytron2', 'broodmother2', 'buzzBaron3', 'jellytron3', 'broodmother3', 'kingGloop3', 'buzzBaron4', 'voidEmpress2'];
  assert.deepEqual(
    LEVELS.map((l) => l.boss),
    expected
  );
  const final = BOSSES[LEVELS[14].boss];
  assert.equal(final.art, 'voidEmpress', 'sector 15 is fought against the Void Empress');
  assert.ok(final.phases.length >= 5, 'the finale has more phases than sector 5');
  assert.ok(final.hp >= Math.max(...LEVELS.slice(0, 14).map((l) => BOSSES[l.boss].hp)), 'final boss is the toughest');
});

test('campaign: remixed bosses reuse core art, hitboxes and body stats', () => {
  for (const l of LEVELS.slice(5)) {
    const b = BOSSES[l.boss];
    const base = CORE_BOSSES[b.art];
    assert.ok(base, `${l.boss} is based on a core boss`);
    assert.deepEqual(b.hit, base.hit, `${l.boss} keeps its hitboxes`);
    assert.deepEqual(b.size, base.size);
    assert.equal(b.contactDamage, base.contactDamage);
    assert.ok(b.phases.length >= 2, `${l.boss} has phase changes`);
  }
});

test('campaign: wave counts per sector and a rising difficulty curve', () => {
  assert.deepEqual(
    LEVELS.map((l) => l.waves.length),
    [4, 5, 5, 6, 6, 5, 5, 6, 6, 6, 6, 6, 7, 7, 7]
  );
  // density grows by tier rather than enemy HP: compare average enemies/wave
  const avg = (ls) => ls.reduce((s, l) => s + l.waves.reduce((n, w) => n + enemiesIn(w), 0) / l.waves.length, 0) / ls.length;
  const early = avg(LEVELS.slice(0, 5));
  const mid = avg(LEVELS.slice(5, 10));
  const late = avg(LEVELS.slice(10, 13));
  const end = avg(LEVELS.slice(13));
  assert.ok(early < mid && mid < late && late < end, `density ${early.toFixed(1)} < ${mid.toFixed(1)} < ${late.toFixed(1)} < ${end.toFixed(1)}`);
  // enemy HP multiplier rises far less than density from sector 5 to 15
  const hpGrowth = LEVELS[14].mods.hp / LEVELS[4].mods.hp;
  const densityGrowth = avg([LEVELS[14]]) / avg([LEVELS[4]]);
  assert.ok(hpGrowth < 1.35, 'hp growth is modest');
  assert.ok(densityGrowth > hpGrowth, 'pressure comes from density, not hp');
  // every expansion sector mixes enemy types and uses the new movement kit
  for (const l of LEVELS.slice(5)) {
    const types = new Set();
    let newKit = 0;
    for (const w of l.waves) {
      for (const g of w.groups) {
        types.add(g.enemy);
        if (['spiral', 'hook', 'diag', 'orbit'].includes(g.path) || ['flanks', 'hex', 'stairs', 'crown'].includes(g.formation)) newKit++;
      }
    }
    assert.ok(types.size >= 5, `sector ${l.id} mixes enemy types`);
    assert.ok(newKit >= 3, `sector ${l.id} uses the new formations / paths`);
  }
});

test('campaign: every sector has its own palette, acts and tiers cover 1-15', () => {
  const themes = LEVELS.map((l) => l.theme);
  assert.equal(new Set(themes).size, 15, 'unique theme per sector');
  for (const t of themes) assert.ok(THEMES[t]);
  assert.deepEqual(
    ACTS.map((a) => [a.from, a.to]),
    [
      [1, 5],
      [6, 10],
      [11, 13],
      [14, 15],
    ]
  );
  assert.deepEqual(
    [1, 5, 6, 10, 11, 13, 14, 15].map(sectorTier),
    ['early', 'early', 'mid', 'mid', 'late', 'late', 'endgame', 'endgame']
  );
});

test('progression: clearing sector 5 unlocks 6, 10 unlocks 11, 15 stays capped', () => {
  const d = defaultSave();
  d.unlockedLevel = 5;
  d.clearedLevels = [1, 2, 3, 4];
  assert.equal(recordClear(d, 5, LEVELS.length), true);
  assert.equal(d.unlockedLevel, 6, 'sector 6 unlocked');
  d.unlockedLevel = 10;
  assert.equal(recordClear(d, 10, LEVELS.length), true);
  assert.equal(d.unlockedLevel, 11, 'sector 11 unlocked after sector 10');
  d.unlockedLevel = 15;
  assert.equal(recordClear(d, 15, LEVELS.length), false, 'nothing after the finale');
  assert.equal(d.unlockedLevel, 15);
  assert.equal(recordClear(d, 15, LEVELS.length), false);
  assert.equal(d.clearedLevels.filter((n) => n === 15).length, 1, 'no duplicate clears');
});

test('save: progress beyond sector 5 survives save/load', () => {
  const st = memoryStorage();
  const a = new SaveSystem(st);
  a.data.unlockedLevel = 12;
  a.data.clearedLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  a.data.coins = 4321;
  assert.ok(a.save());
  const b = new SaveSystem(st);
  repairProgress(b.data, LEVELS.length);
  assert.equal(b.data.unlockedLevel, 12);
  assert.deepEqual(b.data.clearedLevels, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(b.data.coins, 4321);
});

test('save: players who finished the old 5-sector campaign get sector 6', () => {
  // a save written by the 5-sector build: unlockedLevel was capped at 5
  const old = { ...defaultSave(), unlockedLevel: 5, clearedLevels: [1, 2, 3, 4, 5], coins: 900 };
  const s = new SaveSystem(memoryStorage({ [SAVE_KEY]: JSON.stringify(old) }));
  repairProgress(s.data, LEVELS.length);
  assert.equal(s.data.unlockedLevel, 6);
  assert.equal(s.data.coins, 900, 'nothing else changes');
  // mid-campaign saves are left alone, bad values are clamped
  const mid = { ...defaultSave(), unlockedLevel: 3, clearedLevels: [1, 2] };
  assert.equal(repairProgress(mid, LEVELS.length).unlockedLevel, 3);
  const bad = { ...defaultSave(), unlockedLevel: 99, clearedLevels: [1, 2, 'x', 40] };
  repairProgress(bad, LEVELS.length);
  assert.equal(bad.unlockedLevel, 15);
  assert.deepEqual(bad.clearedLevels, [1, 2]);
});

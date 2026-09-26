import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveSystem, SAVE_KEY, SAVE_VERSION, defaultSave, migrate } from '../../src/systems/SaveSystem.js';
import { ComboSystem } from '../../src/systems/ComboSystem.js';
import { ScoreSystem } from '../../src/systems/ScoreSystem.js';
import { RunState } from '../../src/game/GameState.js';
import { computeStats, BASE_STATS } from '../../src/player/PlayerStats.js';
import { UPGRADES, upgradeCost } from '../../src/data/upgrades.js';

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

test('save: fresh storage gives defaults', () => {
  const s = new SaveSystem(memoryStorage());
  assert.equal(s.data.version, SAVE_VERSION);
  assert.equal(s.data.coins, 0);
  assert.equal(s.data.unlockedLevel, 1);
  assert.equal(s.data.settings.debug, false, 'debug must be off by default');
});

test('save: round trip keeps progression', () => {
  const st = memoryStorage();
  const a = new SaveSystem(st);
  a.addCoins(250);
  a.data.upgrades.attack = 3;
  a.data.unlockedLevel = 3;
  a.data.bestScore = 12345;
  a.data.settings.music = false;
  assert.ok(a.save());
  const b = new SaveSystem(st);
  assert.equal(b.data.coins, 250);
  assert.equal(b.data.upgrades.attack, 3);
  assert.equal(b.data.unlockedLevel, 3);
  assert.equal(b.data.bestScore, 12345);
  assert.equal(b.data.settings.music, false);
});

test('save: migrates v1 data', () => {
  const v1 = { version: 1, coins: 77, level: 4, upgrades: { attack: 2 }, settings: { sound: false } };
  const st = memoryStorage({ [SAVE_KEY]: JSON.stringify(v1) });
  const s = new SaveSystem(st);
  assert.equal(s.data.version, SAVE_VERSION);
  assert.equal(s.data.unlockedLevel, 4);
  assert.equal(s.data.coins, 77);
  assert.equal(s.data.upgrades.attack, 2);
  assert.equal(s.data.upgrades.hp, 0, 'missing fields filled from defaults');
  assert.equal(s.data.settings.sound, false);
  assert.equal(s.data.settings.music, true);
  assert.deepEqual(migrate({ version: SAVE_VERSION, coins: 1 }).coins, 1);
});

test('save: corrupted JSON falls back to defaults and keeps a backup', () => {
  const st = memoryStorage({ [SAVE_KEY]: '{not json' });
  const s = new SaveSystem(st);
  assert.deepEqual(s.data.coins, defaultSave().coins);
  assert.equal(st.dump()[SAVE_KEY + '_corrupt'], '{not json');
});

test('save: storage that throws never crashes', () => {
  const bad = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('quota');
    },
  };
  const s = new SaveSystem(bad);
  assert.equal(s.data.coins, 0);
  assert.equal(s.save(), false);
  assert.equal(s.available, false);
});

test('save: spendCoins refuses when poor', () => {
  const s = new SaveSystem(memoryStorage());
  s.addCoins(10);
  assert.equal(s.spendCoins(11), false);
  assert.equal(s.spendCoins(10), true);
  assert.equal(s.data.coins, 0);
});

test('save: reset keeps settings but wipes progress', () => {
  const s = new SaveSystem(memoryStorage());
  s.addCoins(99);
  s.data.settings.sound = false;
  s.data.settings.debug = true;
  s.reset();
  assert.equal(s.data.coins, 0);
  assert.equal(s.data.settings.sound, false);
  assert.equal(s.data.settings.debug, false);
});

test('combo: tiers 5/10/20/30 => x2/x3/x4/x5', () => {
  const c = new ComboSystem();
  const seen = [];
  c.onTierUp = (m) => seen.push(m);
  for (let i = 0; i < 30; i++) c.addKill();
  assert.deepEqual(seen, [2, 3, 4, 5]);
  assert.equal(c.mult, 5);
  assert.equal(c.max, 30);
});

test('combo: resets after window or on hit', () => {
  const c = new ComboSystem();
  for (let i = 0; i < 6; i++) c.addKill();
  assert.equal(c.mult, 2);
  c.update(c.window + 0.01);
  assert.equal(c.count, 0);
  assert.equal(c.mult, 1);
  for (let i = 0; i < 12; i++) c.addKill();
  c.break();
  assert.equal(c.mult, 1);
  assert.equal(c.max, 12);
});

test('score: combo multiplies kill score, bonus tracked separately', () => {
  const run = new RunState();
  const c = new ComboSystem();
  const s = new ScoreSystem(run, c);
  for (let i = 0; i < 10; i++) c.addKill();
  assert.equal(s.addKill(100), 300);
  assert.equal(s.addBonus(1000), 1000);
  assert.equal(run.score, 1300);
  assert.equal(run.bonus, 1000);
  s.update(10);
  assert.equal(s.displayScore, 1300);
});

test('player stats: base values and upgrade scaling', () => {
  const base = computeStats({});
  assert.equal(base.hp, BASE_STATS.hp);
  assert.equal(base.attack, BASE_STATS.attack);
  const up = computeStats({ attack: 2, fireRate: 1, hp: 3, shield: 1, moveSpeed: 1, critChance: 2 });
  assert.ok(Math.abs(up.attack - BASE_STATS.attack * 1.3) < 1e-9);
  assert.equal(up.hp, BASE_STATS.hp + 45);
  assert.ok(up.critChance > base.critChance);
  assert.ok(up.fireRate > base.fireRate);
  assert.ok(up.moveSpeed > base.moveSpeed);
  // clamps silly values
  assert.equal(computeStats({ hp: 999 }).hp, BASE_STATS.hp + 10 * 15);
});

test('upgrades: cost increases every level and is Infinity when maxed', () => {
  for (const u of UPGRADES) {
    let prev = 0;
    for (let lv = 0; lv < u.maxLevel; lv++) {
      const c = upgradeCost(u, lv);
      assert.ok(c > prev, `${u.id} lv${lv} cost must grow`);
      prev = c;
    }
    assert.equal(upgradeCost(u, u.maxLevel), Infinity);
  }
});

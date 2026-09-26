import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, THEMES } from '../../src/data/levels.js';
import { ENEMY_TYPES } from '../../src/data/enemies.js';
import { BOSSES } from '../../src/data/bosses.js';
import { ITEM_TYPES } from '../../src/data/items.js';
import { UPGRADES } from '../../src/data/upgrades.js';
import { FORMATIONS, formationSlots } from '../../src/levels/Formations.js';
import { PASS_PATHS } from '../../src/enemy/Paths.js';
import { PATTERNS } from '../../src/boss/BossPatterns.js';
import { WEAPON_PATTERNS } from '../../src/weapons/WeaponSystem.js';

test('at least 5 levels, each with waves and a valid boss + theme', () => {
  assert.ok(LEVELS.length >= 5);
  LEVELS.forEach((l, i) => {
    assert.equal(l.id, i + 1, 'level ids are sequential');
    assert.ok(l.waves.length >= 4, `level ${l.id} has enough waves`);
    assert.ok(BOSSES[l.boss], `level ${l.id} boss exists`);
    assert.ok(THEMES[l.theme], `level ${l.id} theme exists`);
    for (const k of ['hp', 'speed', 'bulletSpeed', 'fireRate', 'dive', 'ambientFire', 'extraShots', 'drop']) assert.equal(typeof l.mods[k], 'number', `level ${l.id} mods.${k}`);
  });
});

test('difficulty ramps up across levels', () => {
  for (let i = 1; i < LEVELS.length; i++) {
    const a = LEVELS[i - 1].mods;
    const b = LEVELS[i].mods;
    assert.ok(b.hp >= a.hp && b.speed >= a.speed && b.fireRate >= a.fireRate, `level ${i + 1} not easier than ${i}`);
    assert.ok(BOSSES[LEVELS[i].boss].hp > BOSSES[LEVELS[i - 1].boss].hp, 'boss hp increases');
  }
});

test('every wave group references valid data', () => {
  for (const l of LEVELS) {
    for (const w of l.waves) {
      assert.ok(w.groups.length > 0);
      for (const g of w.groups) {
        assert.ok(ENEMY_TYPES[g.enemy], `unknown enemy ${g.enemy}`);
        assert.ok(g.count > 0);
        if (g.behavior === 'pass') assert.ok(PASS_PATHS[g.path], `unknown path ${g.path}`);
        else {
          assert.ok(FORMATIONS[g.formation], `unknown formation ${g.formation}`);
          assert.ok(['top', 'left', 'right', 'sides', 'swoop'].includes(g.entry), `bad entry ${g.entry}`);
        }
      }
    }
  }
});

test('at least 5 enemy archetypes with required fields', () => {
  const ids = Object.keys(ENEMY_TYPES);
  assert.ok(ids.length >= 5);
  for (const id of ids) {
    const e = ENEMY_TYPES[id];
    for (const k of ['hp', 'radius', 'score', 'coins', 'dropChance', 'contactDamage']) assert.equal(typeof e[k], 'number', `${id}.${k}`);
    if (e.fire) assert.ok(['aimed', 'fan', 'ring'].includes(e.fire.pattern));
  }
  assert.ok(ids.some((id) => ENEMY_TYPES[id].fire), 'some enemies can shoot');
});

test('bosses: phases sorted, thresholds valid, attacks implemented', () => {
  for (const [id, b] of Object.entries(BOSSES)) {
    assert.equal(b.phases[0].at, 1, `${id} first phase starts at full hp`);
    for (let i = 1; i < b.phases.length; i++) assert.ok(b.phases[i].at < b.phases[i - 1].at, `${id} phases descending`);
    for (const p of b.phases) {
      assert.ok(p.attacks.length > 0);
      for (const a of p.attacks) {
        assert.ok(PATTERNS[a.type], `${id} attack type ${a.type} implemented`);
        if (a.type === 'summon') assert.ok(ENEMY_TYPES[a.enemy]);
      }
    }
    assert.ok(b.hit.length > 0);
  }
  const final = BOSSES[LEVELS[LEVELS.length - 1].boss];
  assert.ok(final.phases.length >= 3, 'final boss has at least 3 phases');
  const ats = final.phases.map((p) => p.at);
  for (const t of [0.75, 0.5, 0.25]) assert.ok(ats.includes(t), `final boss changes phase at ${t * 100}%`);
});

test('dangerous boss attacks are telegraphed', () => {
  for (const b of Object.values(BOSSES)) {
    for (const p of b.phases) {
      for (const a of p.attacks) {
        if (['laser', 'charge', 'nova', 'wall'].includes(a.type)) assert.ok(a.telegraph >= 0.7, `${a.type} telegraph too short`);
      }
    }
  }
});

test('walls always leave a gap wider than the ship hitbox', () => {
  for (const b of Object.values(BOSSES)) for (const p of b.phases) for (const a of p.attacks) if (a.type === 'wall') assert.ok(a.gap >= 80);
});

test('9 item types incl. required ones', () => {
  for (const id of ['power', 'rapid', 'shield', 'health', 'multi', 'bomb', 'magnet', 'slow', 'crit']) {
    assert.ok(ITEM_TYPES[id], id);
    assert.ok(ITEM_TYPES[id].weight > 0);
  }
});

test('upgrades cover the requested stats', () => {
  const ids = UPGRADES.map((u) => u.id);
  for (const id of ['attack', 'fireRate', 'hp', 'shield', 'moveSpeed', 'critChance']) assert.ok(ids.includes(id), id);
});

test('formations return the requested count within the playfield', () => {
  for (const name of Object.keys(FORMATIONS)) {
    for (const n of [1, 5, 8, 14]) {
      const slots = formationSlots(name, n, { W: 400, y: 150, rows: 2 });
      assert.equal(slots.length, n, `${name} x${n}`);
      for (const s of slots) {
        assert.ok(s.x >= 24 && s.x <= 376, `${name} x in bounds`);
        assert.ok(s.y >= 50 && s.y <= 320, `${name} y in bounds`);
      }
    }
  }
});

test('pass paths start and end off-screen', () => {
  const out = { x: 0, y: 0 };
  const W = 400;
  const H = 800;
  const off = (p) => p.x < 0 || p.x > W || p.y < 0 || p.y > H;
  for (const [name, fn] of Object.entries(PASS_PATHS)) {
    for (const dir of [1, -1]) {
      const p = { dir, x: 120, y: 250, amp: 60 };
      fn(1, p, W, H, out);
      assert.ok(off(out), `${name} ends off-screen`);
      fn(0, p, W, H, out);
      assert.ok(off(out) || out.y <= 0, `${name} starts off-screen`);
    }
  }
});

test('weapon patterns exist for power 1..5 and grow', () => {
  for (let p = 1; p <= 5; p++) assert.ok(WEAPON_PATTERNS[p].length >= WEAPON_PATTERNS[Math.max(1, p - 1)].length);
});

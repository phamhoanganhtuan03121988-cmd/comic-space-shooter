// End-to-end QA suite. Starts the local server, drives the real game in
// headless Chromium (mobile emulation + real touch events) and verifies the
// full acceptance flow plus responsive layouts.
//
//   npm run test:e2e            (screenshots land in tests/e2e/output/)

import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'tests/e2e/output');
fs.mkdirSync(outDir, { recursive: true });

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch (_) {
    const globalRoot = execSync('npm root -g').toString().trim();
    return import(pathToFileURL(path.join(globalRoot, 'playwright/index.mjs')).href);
  }
}
const { chromium } = await loadPlaywright();

// ------------------------------------------------------------------ server
const port = 8200 + Math.floor(Math.random() * 500);
const server = spawn(process.execPath, [path.join(root, 'tools/serve.mjs'), String(port)], { stdio: 'ignore' });
const BASE = `http://localhost:${port}/`;
for (let i = 0; i < 50; i++) {
  try {
    const r = await fetch(BASE);
    if (r.ok) break;
  } catch (_) {
    /* not up yet */
  }
  await new Promise((r) => setTimeout(r, 100));
}

// ------------------------------------------------------------------ harness
const results = [];
const errors = [];
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log('  ✔ ' + name);
  } catch (e) {
    results.push({ name, ok: false, err: e.message });
    console.log('  ✘ ' + name + '\n      ' + e.message);
  }
}

// In-page helper: aim-bot used to fast-forward gameplay deterministically.
const BOT = `window.__simBot = function (seconds, opts) {
  const g = window.__cfd; opts = opts || {};
  const dt = 1 / 60;
  for (let i = 0; i < seconds * 60; i++) {
    const p = g.player;
    if (p.alive) {
      let target = g.W / 2;
      const boss = g.bossManager.active;
      if (boss) target = boss.x; else {
        let best = null;
        for (const e of g.enemies.active) if (e.alive && e.y > 0 && (!best || e.y > best.y)) best = e;
        if (best) target = best.x;
      }
      p.tx = target; p.ty = g.H - 120;
    }
    g.update(dt);
    if (opts.until && opts.until(g)) return true;
    if (g.state !== 'playing' && !opts.keepGoing) return g.state;
  }
  return false;
};`;

async function newMobile(browser, width, height, dpr = 3) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${width}x${height}] pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[${width}x${height}] console.error: ${m.text()}`);
  });
  await page.goto(BASE);
  await page.waitForFunction(() => window.__cfd && window.__cfd.loop && window.__cfd.loop.running);
  await page.evaluate(BOT);
  return { ctx, page };
}

const active = (page, id) => page.evaluate((id) => document.getElementById('screen-' + id).classList.contains('active'), id);
const G = (page, fn, arg) => page.evaluate(fn, arg);

const browser = await chromium.launch();
console.log('\nCosmic Farm Defenders — E2E QA\n');

// ================================================================== main flow
const { ctx, page } = await newMobile(browser, 390, 844);
const cdp = await ctx.newCDPSession(page);
async function touchDrag(x0, y0, x1, y1, steps = 12) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    const k = i / steps;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + (x1 - x0) * k, y: y0 + (y1 - y0) * k }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

await check('1. Game opens (canvas sized, menu state, no errors)', async () => {
  const s = await G(page, () => ({ state: window.__cfd.state, cw: document.getElementById('game-canvas').width, W: window.__cfd.W, H: window.__cfd.H }));
  assert(s.state === 'menu', 'state ' + s.state);
  assert(s.cw > 300, 'canvas width ' + s.cw);
  assert(s.W === 400 && s.H > 500, `logical size ${s.W}x${s.H}`);
  await page.screenshot({ path: path.join(outDir, 'menu-390.png') });
});

await check('2. Main menu buttons (How to play / Settings / Upgrade / Back)', async () => {
  assert(await active(page, 'menu'), 'menu not visible');
  await page.click('#screen-menu [data-action="howto"]');
  assert(await active(page, 'howto'), 'howto not shown');
  const imgs = await page.locator('#screen-howto img').count();
  assert(imgs >= 15, 'howto icons ' + imgs);
  await page.screenshot({ path: path.join(outDir, 'howto-390.png') });
  await page.click('#screen-howto [data-action="back"]');
  await page.click('#screen-menu [data-action="settings"]');
  assert(await active(page, 'settings'), 'settings not shown');
  await page.click('#screen-settings [data-action="back"]');
  await page.click('#screen-menu [data-action="upgrade"]');
  assert(await active(page, 'upgrade'), 'upgrade not shown');
  await page.click('#screen-upgrade [data-action="back"]');
  assert(await active(page, 'menu'), 'back to menu failed');
});

await check('3. PLAY -> sector select -> Level 1 starts (locked levels disabled)', async () => {
  await page.click('#screen-menu [data-action="play"]');
  assert(await active(page, 'levels'), 'levels not shown');
  const cards = await page.locator('.level-card').count();
  assert(cards === 5, 'cards ' + cards);
  assert(await page.locator('.level-card[data-level="1"]').isDisabled(), 'level 2 should be locked');
  await page.screenshot({ path: path.join(outDir, 'levels-390.png') });
  await page.click('.level-card[data-level="0"]');
  const s = await G(page, () => window.__cfd.state);
  assert(s === 'playing', 'state ' + s);
  assert(await page.locator('#controls').isVisible(), 'controls hidden');
});

await check('4. Player moves with touch drag (relative) and keyboard; page never scrolls', async () => {
  await page.waitForTimeout(1300); // fly-in
  const x0 = await G(page, () => window.__cfd.player.x);
  await touchDrag(150, 600, 250, 600);
  await page.waitForTimeout(250);
  const x1 = await G(page, () => window.__cfd.player.x);
  assert(x1 - x0 > 60, `touch drag moved ${x1 - x0}`);
  // second finger / drag starting elsewhere keeps working
  await touchDrag(300, 700, 180, 650);
  await page.waitForTimeout(250);
  const x2 = await G(page, () => window.__cfd.player.x);
  assert(x2 < x1 - 60, `second drag moved ${x2 - x1}`);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowRight');
  const x3 = await G(page, () => window.__cfd.player.x);
  assert(x3 > x2 + 20, 'keyboard move ' + (x3 - x2));
  const scroll = await G(page, () => [window.scrollX, window.scrollY, document.scrollingElement.scrollTop]);
  assert(scroll.every((v) => v === 0), 'page scrolled ' + scroll);
  const ta = await G(page, () => getComputedStyle(document.getElementById('game-canvas')).touchAction);
  assert(ta === 'none', 'touch-action ' + ta);
});

await check('5. Auto fire', async () => {
  const s = await G(page, () => ({ shots: window.__cfd.weapons.shots, pb: window.__cfd.bullets.player.count }));
  assert(s.shots > 5 && s.pb > 0, JSON.stringify(s));
});

await check('6. Enemies spawn in formation', async () => {
  await page.waitForFunction(() => window.__cfd.enemies.count > 0, null, { timeout: 8000 });
  await page.screenshot({ path: path.join(outDir, 'gameplay-390.png') });
});

await check('7-9. Collision, enemy damage (flash/number) and enemy death', async () => {
  const r = await G(page, () => {
    const g = window.__cfd;
    g.debug.god = true;
    const p = g.player;
    const e = g.enemies.spawn('rockshell', { mode: 'fall', fromX: p.x, fromY: p.y - 260 });
    e.vy = 0;
    e.baseX = p.x;
    e.swayAmp = 0;
    const kills0 = g.run.kills;
    const texts0 = g.texts.pool.count;
    for (let i = 0; i < 20; i++) {
      p.tx = e.x;
      g.update(1 / 60);
    }
    const damaged = e.hp < e.maxHp;
    const flashed = e.flash > 0 || damaged;
    const texts = g.texts.pool.count > texts0;
    for (let i = 0; i < 400 && e.alive; i++) {
      p.tx = e.x;
      g.update(1 / 60);
    }
    return { damaged, flashed, texts, dead: !e.alive, kills: g.run.kills - kills0, particles: g.particles.count };
  });
  assert(r.damaged && r.flashed && r.texts, 'hit feedback ' + JSON.stringify(r));
  assert(r.dead && r.kills >= 1, 'enemy death ' + JSON.stringify(r));
  assert(r.particles > 0, 'no particles');
});

await check('10-11. Item drop + pickup for all 9 items', async () => {
  const r = await G(page, () => {
    const g = window.__cfd;
    const p = g.player;
    const n0 = g.items.pool.count;
    g.items.rollDrop(200, 200, 1);
    const dropped = g.items.pool.active.some((i) => !i.coin);
    const out = { dropped, n: g.items.pool.count - n0, applied: {} };
    const ids = ['power', 'rapid', 'shield', 'health', 'multi', 'bomb', 'magnet', 'slow', 'crit'];
    for (const id of ids) {
      const before = { power: p.power, items: g.run.itemsCollected };
      p.hp = p.maxHp * 0.5;
      const hp0 = p.hp;
      g.items.spawnItem(id, p.x, p.y - 20);
      for (let i = 0; i < 30; i++) g.update(1 / 60);
      const got = g.run.itemsCollected > before.items;
      let effect = true;
      if (id === 'power') effect = p.power === Math.min(5, before.power + 1);
      else if (id === 'health') effect = p.hp > hp0;
      else if (id !== 'bomb') effect = p.buffs[id] > 0;
      out.applied[id] = got && effect;
    }
    return out;
  });
  assert(r.dropped && r.n >= 1, 'drop ' + JSON.stringify(r));
  const bad = Object.entries(r.applied).filter(([, v]) => !v);
  assert(!bad.length, 'items not applied: ' + JSON.stringify(bad));
});

await check('12-13. Combo multiplier + score', async () => {
  const r = await G(page, () => {
    const g = window.__cfd;
    g.combo.reset();
    const s0 = g.run.score;
    for (let i = 0; i < 11; i++) {
      const e = g.enemies.spawn('blobling', { mode: 'fall', fromX: 200, fromY: 200 });
      g.killEnemy(e);
    }
    return { mult: g.combo.mult, count: g.combo.count, gained: g.run.score - s0 };
  });
  assert(r.mult === 3 && r.count === 11, JSON.stringify(r));
  assert(r.gained > 11 * 100, 'score gained ' + r.gained);
});

await check('14. Waves advance to the boss', async () => {
  const r = await G(page, () => {
    const g = window.__cfd;
    g.startLevel(0, 0);
    g.debug.god = true;
    const seen = new Set();
    window.__simBot(240, { until: (g) => (seen.add(g.waves.waveIndex), g.waves.phase === 'boss') });
    return { seen: [...seen], phase: g.waves.phase, total: g.waves.totalWaves, perfect: g.run.perfectWaves };
  });
  assert(r.phase === 'boss', 'phase ' + r.phase);
  assert(r.seen.includes(r.total - 1), 'waves seen ' + r.seen);
});

await check('15-16. Boss spawns with entrance + HP bar and attacks', async () => {
  const r = await G(page, () => {
    const g = window.__cfd;
    const b = g.bossManager.active;
    const enter = b.state;
    let fired = 0;
    const orig = g.bullets.fireEnemy.bind(g.bullets);
    g.bullets.fireEnemy = (...a) => (fired++, orig(...a));
    window.__simBot(9, { until: () => false });
    g.bullets.fireEnemy = orig;
    return { name: b.def.name, enter, state: b.state, fired, display: b.displayHp };
  });
  assert(r.enter === 'enter', 'entrance ' + r.enter);
  assert(r.fired > 5, 'boss bullets ' + r.fired);
  assert(r.display > 0, 'hp bar');
  await page.screenshot({ path: path.join(outDir, 'boss1-390.png') });
});

await check('18-19. Boss death -> VICTORY screen with stats', async () => {
  const r = await G(page, () => {
    const g = window.__cfd;
    const b = g.bossManager.active;
    b.damage(b.hp + 10);
    const dying = b.state;
    window.__simBot(8);
    return { dying, state: g.state, defeated: g.run.bossDefeated };
  });
  assert(r.dying === 'dying' && r.defeated, JSON.stringify(r));
  assert(r.state === 'victory', 'state ' + r.state);
  await page.waitForTimeout(900);
  assert(await active(page, 'victory'), 'victory screen hidden');
  const rows = await page.locator('#victory-stats .stat').count();
  assert(rows === 6, 'stat rows ' + rows);
  const txt = await page.locator('#screen-victory').innerText();
  for (const s of ['Score', 'Enemies Destroyed', 'Coins Earned', 'Items Collected', 'Bonus', 'NEXT LEVEL', 'UNLOCKED']) assert(txt.includes(s), 'missing ' + s);
  await page.screenshot({ path: path.join(outDir, 'victory-390.png') });
});

let coinsAfterVictory = 0;
await check('20. Coin reward banked to save', async () => {
  const r = await G(page, () => ({ run: window.__cfd.run.coins, saved: window.__cfd.save.data.coins, ls: JSON.parse(localStorage.getItem('cfd_save')).coins }));
  assert(r.run > 0 && r.saved >= r.run && r.ls === r.saved, JSON.stringify(r));
  coinsAfterVictory = r.saved;
});

await check('21. Upgrade purchase from victory screen (and back)', async () => {
  await G(page, () => {
    window.__cfd.save.addCoins(500);
    window.__cfd.save.save();
  });
  await page.click('#screen-victory [data-action="upgrade"]');
  assert(await active(page, 'upgrade'), 'upgrade screen');
  const before = await G(page, () => ({ c: window.__cfd.save.data.coins, lv: window.__cfd.save.data.upgrades.attack }));
  await page.click('#upgrade-list [data-id="attack"]');
  const after = await G(page, () => ({ c: window.__cfd.save.data.coins, lv: window.__cfd.save.data.upgrades.attack, atk: window.__cfd.player.stats.attack }));
  assert(after.lv === before.lv + 1, 'level ' + JSON.stringify(after));
  assert(after.c < before.c, 'coins not spent');
  await page.screenshot({ path: path.join(outDir, 'upgrade-390.png') });
  await page.click('#screen-upgrade [data-action="back"]');
  assert(await active(page, 'victory'), 'back should return to victory');
});

await check('NEXT LEVEL starts sector 2', async () => {
  await page.click('#btn-next');
  const r = await G(page, () => ({ s: window.__cfd.state, id: window.__cfd.level.id }));
  assert(r.s === 'playing' && r.id === 2, JSON.stringify(r));
});

await check('26. Pause / resume / restart', async () => {
  await page.waitForTimeout(300);
  await page.click('#btn-pause');
  assert((await G(page, () => window.__cfd.state)) === 'paused', 'not paused');
  assert(await active(page, 'pause'), 'pause menu hidden');
  const t0 = await G(page, () => window.__cfd.run.time);
  await page.waitForTimeout(400);
  const t1 = await G(page, () => window.__cfd.run.time);
  assert(t0 === t1, 'time advanced while paused');
  await page.screenshot({ path: path.join(outDir, 'pause-390.png') });
  await page.click('#screen-pause [data-action="resume"]');
  assert((await G(page, () => window.__cfd.state)) === 'playing', 'resume failed');
  await page.click('#btn-pause');
  await page.click('#screen-pause [data-action="restart"]');
  const r = await G(page, () => ({ s: window.__cfd.state, id: window.__cfd.level.id, t: window.__cfd.run.time }));
  assert(r.s === 'playing' && r.id === 2 && r.t < 0.5, 'restart ' + JSON.stringify(r));
});

await check('NOVA special skill (button, cooldown, clears bullets)', async () => {
  await page.waitForTimeout(1300);
  await G(page, () => {
    const g = window.__cfd;
    for (let i = 0; i < 12; i++) g.bullets.fireEnemy(50 + i * 25, 300, Math.PI / 2, 50, 10, 'orb');
  });
  const box = await page.locator('#btn-skill').boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  const r = await G(page, () => ({ cd: window.__cfd.player.skillCooldown, eb: window.__cfd.bullets.enemy.count }));
  assert(r.cd > 0, 'cooldown not started');
  assert(r.eb === 0, 'bullets left ' + r.eb);
  await page.waitForTimeout(200);
  const cls = await page.locator('#btn-skill').getAttribute('class');
  assert(cls.includes('cooling'), 'cooldown indicator ' + cls);
});

await check('17. Boss phases (sector 3: 2 phases; sector 5: 4 phases at 75/50/25%)', async () => {
  const r = await G(page, () => {
    const g = window.__cfd;
    const out = {};
    for (const idx of [2, 4]) {
      g.startLevel(idx, 0);
      g.debug.god = true;
      g.waves.skipToBoss();
      window.__simBot(7);
      const b = g.bossManager.active;
      const phases = [b.phaseIndex];
      const bullets = [];
      for (const frac of [0.74, 0.49, 0.24]) {
        if (!b.alive || b.state === 'dying') break;
        b.hp = b.maxHp * frac + 1;
        b.damage(2);
        phases.push(b.phaseIndex + ':' + b.state);
        let fired = 0;
        const orig = g.bullets.fireEnemy.bind(g.bullets);
        g.bullets.fireEnemy = (...a) => (fired++, orig(...a));
        window.__simBot(6);
        g.bullets.fireEnemy = orig;
        bullets.push(fired);
      }
      out[idx + 1] = { phases, bullets, total: b.def.phases.length };
    }
    return out;
  });
  assert(r[3].phases[1] === '0:fight' && r[3].phases[2] === '1:transition', 'sector3 ' + JSON.stringify(r[3]));
  assert(r[5].phases.join() === '0,1:transition,2:transition,3:transition', 'sector5 ' + JSON.stringify(r[5]));
  assert(r[5].bullets.every((n) => n > 0), 'each phase attacks ' + r[5].bullets);
  await page.screenshot({ path: path.join(outDir, 'boss5-390.png') });
});

await check('24-25. Game over screen, best score, RETRY', async () => {
  const r = await G(page, () => {
    const g = window.__cfd;
    g.startLevel(0, 0);
    g.debug.god = false;
    g.simulate(1.5);
    const p = g.player;
    p.shield = 0;
    p.invuln = 0;
    p.hp = 5;
    g.damagePlayer(50, p.x, p.y);
    const dead = !p.alive;
    g.simulate(3);
    return { dead, state: g.state };
  });
  assert(r.dead && r.state === 'gameover', JSON.stringify(r));
  await page.waitForTimeout(800);
  assert(await active(page, 'gameover'), 'gameover screen hidden');
  const txt = await page.locator('#screen-gameover').innerText();
  for (const s of ['GAME OVER', 'Score', 'Best Score', 'Enemies Destroyed', 'Coins Earned', 'Level', 'RETRY', 'MAIN MENU']) assert(txt.includes(s), 'missing ' + s);
  await page.screenshot({ path: path.join(outDir, 'gameover-390.png') });
  await page.click('#screen-gameover [data-action="retry"]');
  const s = await G(page, () => ({ s: window.__cfd.state, id: window.__cfd.level.id }));
  assert(s.s === 'playing' && s.id === 1, JSON.stringify(s));
});

await check('EXIT TO MENU from pause', async () => {
  await page.click('#btn-pause');
  await page.click('#screen-pause [data-action="menu"]');
  assert((await G(page, () => window.__cfd.state)) === 'menu', 'not in menu');
  assert(await active(page, 'menu'), 'menu hidden');
});

await check('27. Sound / music toggles persist; debug mode off by default', async () => {
  assert(!(await G(page, () => window.__cfd.debug.enabled)), 'debug must be off by default');
  assert(await page.locator('#debug-panel').isHidden(), 'debug panel visible');
  await page.click('#screen-menu [data-action="settings"]');
  await page.click('#screen-settings [data-setting="sound"]');
  let s = await G(page, () => ({ set: window.__cfd.save.data.settings.sound, audio: window.__cfd.audio.soundOn, ls: JSON.parse(localStorage.getItem('cfd_save')).settings.sound }));
  assert(s.set === false && s.audio === false && s.ls === false, JSON.stringify(s));
  assert((await page.locator('#screen-settings [data-setting="sound"]').innerText()) === 'OFF', 'label');
  await page.click('#screen-settings [data-setting="sound"]');
  await page.click('#screen-settings [data-setting="music"]');
  await page.click('#screen-settings [data-setting="music"]');
  s = await G(page, () => window.__cfd.save.data.settings);
  assert(s.sound && s.music, 'toggles back on');
  await page.click('#screen-settings [data-setting="debug"]');
  assert(await page.locator('#debug-panel').isVisible(), 'debug panel should show');
  await page.screenshot({ path: path.join(outDir, 'settings-debug-390.png') });
  await page.click('#screen-settings [data-setting="debug"]');
  assert(await page.locator('#debug-panel').isHidden(), 'debug panel should hide');
  await page.click('#screen-settings [data-action="back"]');
});

await check('22-23. Save persists across reload (coins, upgrades, unlocked sector)', async () => {
  const before = await G(page, () => JSON.parse(localStorage.getItem('cfd_save')));
  assert(before.version === 2, 'schema version');
  assert(before.coins >= coinsAfterVictory - 1000, 'coins saved');
  await page.reload();
  await page.waitForFunction(() => window.__cfd && window.__cfd.loop.running);
  await page.evaluate(BOT);
  const after = await G(page, () => window.__cfd.save.data);
  assert(after.coins === before.coins, `coins ${after.coins} vs ${before.coins}`);
  assert(after.upgrades.attack === 1, 'upgrade lost');
  assert(after.unlockedLevel >= 2, 'unlock lost');
  const chip = await page.locator('#screen-menu [data-bind="coins"]').innerText();
  assert(chip.replace(/,/g, '') === String(after.coins), 'chip ' + chip);
  await page.click('#screen-menu [data-action="play"]');
  assert(!(await page.locator('.level-card[data-level="1"]').isDisabled()), 'sector 2 should be unlocked');
  await page.click('#screen-levels [data-action="back"]');
});

await check('Full campaign: all 5 sectors can be completed in sequence', async () => {
  const r = await G(page, () => {
    const g = window.__cfd;
    const out = [];
    for (let idx = 0; idx < 5; idx++) {
      g.startLevel(idx, idx === 0 ? 0 : g.run.score);
      g.debug.god = true;
      const res = window.__simBot(420);
      out.push(g.level.id + ':' + g.state + ':' + res);
      if (g.state !== 'victory') break;
    }
    return { out, unlocked: g.save.data.unlockedLevel, cleared: g.save.data.clearedLevels.length };
  });
  assert(r.out.length === 5 && r.out.every((s) => s.includes(':victory')), JSON.stringify(r));
  assert(r.unlocked === 5 && r.cleared === 5, JSON.stringify(r));
  await page.waitForTimeout(700);
  const title = await page.locator('#victory-title').innerText();
  assert(title.includes('GALAXY SAVED'), 'final title ' + title);
  await page.screenshot({ path: path.join(outDir, 'campaign-complete-390.png') });
});

await check('Real-time play for 6s with touch input stays stable', async () => {
  await G(page, () => {
    const g = window.__cfd;
    g.debug.god = false;
    g.startLevel(3, 0);
  });
  for (let i = 0; i < 6; i++) {
    await touchDrag(200, 650, 200 + (i % 2 ? -120 : 120), 620, 8);
    await page.waitForTimeout(700);
  }
  const r = await G(page, () => ({ fps: window.__cfd.loop.fps, state: window.__cfd.state, frame: window.__cfd.loop.frameMs }));
  assert(['playing', 'gameover'].includes(r.state), JSON.stringify(r));
  console.log(`      (headless fps ${r.fps.toFixed(0)}, update+render ${r.frame.toFixed(2)} ms/frame)`);
});
await ctx.close();

// ================================================================== responsive
const SIZES = [
  [320, 568],
  [360, 740],
  [375, 667],
  [390, 844],
  [414, 896],
  [430, 932],
  [768, 1024],
  [1280, 720],
];
for (const [w, h] of SIZES) {
  await check(`28. Responsive ${w}x${h}: fits, no overflow, touch targets >= 44px`, async () => {
    const mobile = w < 1000;
    const c = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    const p = await c.newPage();
    p.on('pageerror', (e) => errors.push(`[${w}x${h}] pageerror: ${e.message}`));
    await p.goto(BASE);
    await p.waitForFunction(() => window.__cfd && window.__cfd.loop.running);
    const m = await p.evaluate(() => {
      const st = document.getElementById('stage').getBoundingClientRect();
      const btns = [...document.querySelectorAll('#screen-menu .btn')].map((b) => b.getBoundingClientRect());
      return {
        st: { l: st.left, t: st.top, r: st.right, b: st.bottom, w: st.width, h: st.height },
        vw: innerWidth,
        vh: innerHeight,
        sw: document.documentElement.scrollWidth,
        btns: btns.map((b) => ({ l: b.left, r: b.right, t: b.top, b: b.bottom, h: b.height })),
        W: window.__cfd.W,
        H: window.__cfd.H,
        cw: document.getElementById('game-canvas').width,
        ch: document.getElementById('game-canvas').height,
      };
    });
    assert(m.st.l >= -0.5 && m.st.t >= -0.5 && m.st.r <= m.vw + 0.5 && m.st.b <= m.vh + 0.5, 'stage outside viewport ' + JSON.stringify(m.st));
    assert(m.sw <= m.vw, 'horizontal overflow');
    assert(Math.abs(m.cw / m.ch - m.st.w / m.st.h) < 0.02, 'canvas aspect distorted');
    assert(Math.abs(m.W / m.H - m.st.w / m.st.h) < 0.02, 'logical aspect mismatch');
    for (const b of m.btns) {
      assert(b.l >= m.st.l - 0.5 && b.r <= m.st.r + 0.5 && b.t >= m.st.t - 0.5 && b.b <= m.st.b + 0.5, 'menu button outside stage');
      assert(b.h >= 44, 'menu button too small ' + b.h);
    }
    await p.screenshot({ path: path.join(outDir, `menu-${w}x${h}.png`) });
    await p.evaluate(() => window.__cfd.startLevel(0, 0));
    await p.waitForTimeout(2500);
    const ctl = await p.evaluate(() => ['btn-pause', 'btn-skill'].map((id) => document.getElementById(id).getBoundingClientRect()).map((r) => ({ l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height })));
    for (const r of ctl) {
      assert(r.w >= 44 && r.h >= 44, 'control too small ' + JSON.stringify(r));
      assert(r.l >= m.st.l - 0.5 && r.r <= m.st.r + 0.5 && r.t >= m.st.t - 0.5 && r.b <= m.st.b + 0.5, 'control outside stage ' + JSON.stringify(r));
    }
    // pause card must fit
    await p.evaluate(() => window.__cfd.pause());
    const card = await p.evaluate(() => {
      const r = document.querySelector('#screen-pause .card').getBoundingClientRect();
      return { t: r.top, b: r.bottom, l: r.left, r: r.right };
    });
    assert(card.t >= m.st.t - 0.5 && card.b <= m.st.b + 0.5 && card.l >= m.st.l - 0.5 && card.r <= m.st.r + 0.5, 'pause card overflow ' + JSON.stringify(card));
    await p.evaluate(() => window.__cfd.resume());
    await p.screenshot({ path: path.join(outDir, `game-${w}x${h}.png`) });
    // victory card fits (scrollable if needed, never cut off horizontally)
    await p.evaluate(() => {
      const g = window.__cfd;
      g.debug.god = true;
      g.waves.skipToBoss();
      g.simulate(6.5);
      g.bossManager.active.damage(1e9);
      g.simulate(8);
    });
    await p.waitForTimeout(900);
    const v = await p.evaluate(() => {
      const r = document.querySelector('#screen-victory .card').getBoundingClientRect();
      const n = document.getElementById('btn-next').getBoundingClientRect();
      return { l: r.left, r: r.right, t: r.top, b: r.bottom, nh: n.height };
    });
    assert(v.l >= m.st.l - 0.5 && v.r <= m.st.r + 0.5 && v.t >= m.st.t - 0.5 && v.b <= m.st.b + 0.5, 'victory card overflow ' + JSON.stringify(v));
    assert(v.nh >= 44, 'next button too small');
    await p.screenshot({ path: path.join(outDir, `victory-${w}x${h}.png`) });
    await c.close();
  });
}

await check('No page errors / console errors during the whole run', async () => {
  assert(errors.length === 0, errors.join('\n'));
});

await browser.close();
server.kill();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: tests/e2e/output/`);
if (failed.length) {
  console.log('FAILED:\n' + failed.map((f) => ' - ' + f.name + ': ' + f.err).join('\n'));
  process.exit(1);
}

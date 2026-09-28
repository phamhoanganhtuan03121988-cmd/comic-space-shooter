// Android emulator smoke test for the packaged APK (run by CI, see
// .github/workflows/android.yml). Installs the debug APK, launches it, drives
// it with REAL touch input through adb (taps, drags) and inspects the game
// through the WebView debugger (debug builds only). Writes screenshots and a
// JSON report to docs/android/.
//
// usage: node tools/android-smoke.mjs <path-to-apk>
import { _android as android } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PKG = 'com.cosmicfarm.defenders';
const apk = process.argv[2] || 'dist/android/CosmicFarmDefenders-debug.apk';
const out = 'docs/android';
fs.mkdirSync(out, { recursive: true });
const report = { apk, checks: [], errors: [] };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function check(name, ok, detail) {
  report.checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined ? '  ' + JSON.stringify(detail) : ''}`);
}

const [device] = await android.devices();
if (!device) throw new Error('no Android device / emulator found');
report.device = { model: device.model(), serial: device.serial() };
const sh = async (cmd) => (await device.shell(cmd)).toString().trim();

async function launch() {
  await sh(`am force-stop ${PKG}`);
  await sh(`am start -W -n ${PKG}/.MainActivity`);
  const webview = await device.webView({ pkg: PKG }, { timeout: 60000 });
  const page = await webview.page();
  page.on('pageerror', (e) => report.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && report.errors.push('console: ' + m.text()));
  await page.waitForFunction(() => window.__cfd && window.__cfd.loop.running, null, { timeout: 60000 });
  return page;
}

// CSS px inside the WebView -> physical screen px (WebView is offset by any
// cutout padding at the top; system bars are hidden).
async function toScreen(page, sel) {
  const r = await page.evaluate((sel) => {
    const e = document.querySelector(sel).getBoundingClientRect();
    return { x: e.left + e.width / 2, y: e.top + e.height / 2, dpr: devicePixelRatio, w: innerWidth, h: innerHeight };
  }, sel);
  const size = (await sh('wm size')).match(/(\d+)x(\d+)/g).pop().split('x').map(Number);
  const offY = Math.max(0, size[1] - r.h * r.dpr);
  return { x: Math.round(r.x * r.dpr), y: Math.round(r.y * r.dpr + offY), screen: size, dpr: r.dpr };
}

async function realTap(page, sel) {
  const p = await toScreen(page, sel);
  await device.input.tap({ x: p.x, y: p.y });
  await sleep(700);
  return p;
}

const shot = async (name) => fs.writeFileSync(path.join(out, name), await device.screenshot());

try {
  await device.installApk(fs.readFileSync(apk));
  await sh(`pm clear ${PKG}`); // fresh install state
  // try to force landscape at system level: the app must stay portrait
  await sh('settings put system accelerometer_rotation 0');
  await sh('settings put system user_rotation 1');

  let page = await launch();
  await sleep(2500);
  const boot = await page.evaluate(() => ({ state: window.__cfd.state, w: innerWidth, h: innerHeight, scrollH: document.documentElement.scrollHeight, save: window.__cfd.save.available }));
  check('game starts (menu state)', boot.state === 'menu', boot);
  check('portrait orientation even with system rotation forced to landscape', boot.h > boot.w, { w: boot.w, h: boot.h });
  check('no page scroll (content fits the viewport)', boot.scrollH <= boot.h + 1, { scrollH: boot.scrollH, h: boot.h });
  check('localStorage available', boot.save === true);
  await shot('01-menu.png');

  // real taps: PLAY -> sector 1
  await realTap(page, '#screen-menu [data-action="play"]');
  check('real tap: PLAY opens sector select', await page.evaluate(() => document.getElementById('screen-levels').classList.contains('active')));
  check('15 sectors listed', (await page.evaluate(() => document.querySelectorAll('.level-card').length)) === 15);
  await realTap(page, '.level-card[data-level="0"]');
  const started = await page.evaluate(() => ({ state: window.__cfd.state, id: window.__cfd.level && window.__cfd.level.id }));
  check('real tap: sector 1 starts', started.state === 'playing' && started.id === 1, started);
  await page.evaluate(() => (window.__cfd.debug.god = true)); // keep the test run alive
  await sleep(4500);

  // shooting (auto-fire) + real drag movement
  const before = await page.evaluate(() => ({ x: window.__cfd.player.x, shots: window.__cfd.bullets.player.count }));
  check('auto-fire shooting', before.shots > 0, before);
  const size = (await sh('wm size')).match(/(\d+)x(\d+)/g).pop().split('x').map(Number);
  const cy = Math.round(size[1] * 0.75);
  await device.input.drag({ x: Math.round(size[0] * 0.5), y: cy }, { x: Math.round(size[0] * 0.15), y: cy }, 25);
  await sleep(500);
  const afterMove = await page.evaluate(() => window.__cfd.player.x);
  check('real touch drag moves the ship', Math.abs(afterMove - before.x) > 25, { from: Math.round(before.x), to: Math.round(afterMove) });
  await shot('02-gameplay.png');

  // NOVA via real tap
  const nova = await realTap(page, '#btn-skill');
  const cd = await page.evaluate(() => window.__cfd.player.skillCooldown);
  check('real tap: NOVA fires (cooldown started)', cd > 0, { cooldown: +cd.toFixed(1), tap: nova });
  await sleep(1200);
  await shot('03-nova-cooldown.png');

  // sector progression: clearing sector 1 unlocks 2 (real game code path)
  await page.evaluate(() => window.__cfd.completeLevel());
  const prog = await page.evaluate(() => ({ state: window.__cfd.state, unlocked: window.__cfd.save.data.unlockedLevel }));
  check('sector clear unlocks the next sector', prog.state === 'victory' && prog.unlocked === 2, prog);
  await sleep(800);
  await shot('04-victory.png');
  // mid-campaign progress beyond sector 5, saved through the game's save system
  await page.evaluate(() => {
    const d = window.__cfd.save.data;
    d.unlockedLevel = 9;
    d.clearedLevels = [1, 2, 3, 4, 5, 6, 7, 8];
    d.coins = 1234;
    window.__cfd.save.save();
  });

  // kill the app process and relaunch: progress must survive
  page = await launch();
  await sleep(1500);
  const reloaded = await page.evaluate(() => {
    const d = window.__cfd.save.data;
    return { unlocked: d.unlockedLevel, cleared: d.clearedLevels.length, coins: d.coins };
  });
  check('save survives app restart (sector 9 unlocked, 8 cleared, coins)', reloaded.unlocked === 9 && reloaded.cleared === 8 && reloaded.coins === 1234, reloaded);
  await realTap(page, '#screen-menu [data-action="play"]');
  const cards = await page.evaluate(() => [...document.querySelectorAll('.level-card')].map((b) => !b.disabled));
  check('sector list after restart: 1-9 open, 10-15 locked', cards.slice(0, 9).every(Boolean) && !cards.slice(9).some(Boolean), cards);
  await page.evaluate(() => {
    const l = document.getElementById('level-list');
    l.scrollTop = l.scrollHeight;
  });
  await sleep(400);
  await shot('05-sectors-after-restart.png');

  // start a sector beyond 5 on device
  await page.evaluate(() => (document.getElementById('level-list').scrollTop = 0));
  await page.evaluate(() => document.querySelector('.level-card[data-level="8"]').scrollIntoView({ block: 'center' }));
  await sleep(300);
  await realTap(page, '.level-card[data-level="8"]');
  const s9 = await page.evaluate(() => ({ state: window.__cfd.state, id: window.__cfd.level && window.__cfd.level.id }));
  check('real tap: sector 9 (expansion) starts', s9.state === 'playing' && s9.id === 9, s9);
  await page.evaluate(() => (window.__cfd.debug.god = true));
  await sleep(6000);
  await shot('06-sector9.png');

  const logcat = await sh('logcat -d -s Capacitor/Console:E chromium:E');
  const jsErrors = logcat.split('\n').filter((l) => /Uncaught|TypeError|ReferenceError/.test(l));
  report.errors.push(...jsErrors);
  check('no JavaScript errors', report.errors.length === 0, report.errors.slice(0, 5));
} catch (e) {
  report.checks.push({ name: 'smoke test crashed', ok: false, detail: String(e && e.stack ? e.stack : e) });
  console.error(e);
} finally {
  await sh('settings put system user_rotation 0').catch(() => {});
  report.passed = report.checks.filter((c) => c.ok).length;
  report.total = report.checks.length;
  fs.writeFileSync(path.join(out, 'smoke-report.json'), JSON.stringify(report, null, 2));
  console.log(`\n${report.passed}/${report.total} Android smoke checks passed`);
  await device.close();
  process.exitCode = report.passed === report.total ? 0 : 1;
}

// Renders the Android launcher icons and splash screens from icon.svg
// (the web app's own icon) into android/app/src/main/res, overwriting
// Capacitor's placeholder images. Re-run after changing icon.svg.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const res = path.join(root, 'android/app/src/main/res');
const svg = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'icon.svg')).toString('base64');
const BG = '#0b0620';

// kind: legacy (full icon), round (circle crop), fg (adaptive foreground, safe zone), splash
const jobs = [];
for (const [d, s] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  jobs.push([`mipmap-${d}/ic_launcher.png`, s, s, 'legacy']);
  jobs.push([`mipmap-${d}/ic_launcher_round.png`, s, s, 'round']);
  jobs.push([`mipmap-${d}/ic_launcher_foreground.png`, s * 2.25, s * 2.25, 'fg']);
}
for (const f of fs.readdirSync(res).filter((n) => n.startsWith('drawable'))) {
  const p = path.join(res, f, 'splash.png');
  if (!fs.existsSync(p)) continue;
  const b = fs.readFileSync(p);
  jobs.push([`${f}/splash.png`, b.readUInt32BE(16), b.readUInt32BE(20), 'splash']);
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [rel, w, h, kind] of jobs) {
  await page.setViewportSize({ width: w, height: h });
  let body;
  if (kind === 'legacy') body = `<img src="${svg}" style="width:${w}px;height:${h}px">`;
  else if (kind === 'round') body = `<div style="width:${w}px;height:${h}px;border-radius:50%;overflow:hidden;background:#1d1045"><img src="${svg}" style="width:100%;height:100%;transform:scale(1.12)"></div>`;
  else if (kind === 'fg') body = `<div style="width:${w}px;height:${h}px;display:grid;place-items:center"><img src="${svg}" style="width:${w * 0.62}px;height:${h * 0.62}px"></div>`;
  else {
    const s = Math.round(Math.min(w, h) * 0.28);
    body = `<div style="width:${w}px;height:${h}px;background:${BG};display:grid;place-items:center"><img src="${svg}" style="width:${s}px;height:${s}px;border-radius:${s * 0.22}px"></div>`;
  }
  await page.setContent(`<html><body style="margin:0;background:transparent">${body}</body></html>`);
  await page.waitForTimeout(30);
  await page.screenshot({ path: path.join(res, rel), omitBackground: kind !== 'splash' });
}
await browser.close();
console.log(`${jobs.length} Android icon/splash images written`);

// Stages the web build for the Android (Capacitor) app. The Android app ships
// the exact same self-contained dist/index.html as the web version, so the
// web game stays the single source of truth. Run `npm run build` first.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'dist', 'index.html');
const out = path.join(root, 'build', 'android-web');
if (!fs.existsSync(src)) throw new Error('dist/index.html missing: run `npm run build` first');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(src, path.join(out, 'index.html'));
console.log('build/android-web/index.html staged for Capacitor');

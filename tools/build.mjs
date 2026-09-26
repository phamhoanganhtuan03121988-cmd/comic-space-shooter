// Builds dist/index.html: one self-contained file (JS bundled + CSS/icon
// inlined) that works from file://, email attachments or any static host.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
fs.mkdirSync(out, { recursive: true });

const result = await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2020'],
  write: false,
});
const js = result.outputFiles[0].text;
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const icon = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'icon.svg')).toString('base64');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html
  .replace('<link rel="stylesheet" href="styles.css" />', () => `<style>${css}</style>`)
  .replace('<link rel="manifest" href="manifest.webmanifest" />', '')
  .replace('href="icon.svg"', `href="${icon}"`)
  .replace('<script type="module" src="src/main.js"></script>', () => `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
fs.writeFileSync(path.join(out, 'index.html'), html);
console.log(`dist/index.html written (${(html.length / 1024).toFixed(0)} KB)`);

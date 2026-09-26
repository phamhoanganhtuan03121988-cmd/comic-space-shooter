import { THEMES } from '../data/levels.js';
import { makeCanvas, hexA, shade } from '../art/Sprites.js';
import { rand, TAU } from '../core/math.js';

// Parallax space background: pre-rendered nebula tile (scrolls slowly and
// wraps seamlessly), a distant planet, three star layers and speed dust.
// Colours come from the level theme; content stays dim so bullets pop.

const LAYERS = [
  { count: 46, speed: 10, size: 1, alpha: 0.55 },
  { count: 30, speed: 26, size: 1.6, alpha: 0.8 },
  { count: 14, speed: 60, size: 2.3, alpha: 1 },
];

export class Background {
  constructor(W, H) {
    this.W = W;
    this.H = H;
    this.theme = THEMES.meadow;
    this.themeKey = '';
    this.scroll = 0;
    this.speedMul = 1;
    this.targetSpeedMul = 1;
    this.stars = LAYERS.map((l) => {
      const arr = [];
      for (let i = 0; i < l.count; i++) arr.push({ x: rand(0, W), y: rand(0, H), tw: rand(0, TAU) });
      return arr;
    });
    this.dust = [];
    for (let i = 0; i < 8; i++) this.dust.push({ x: rand(0, W), y: rand(0, H), len: rand(10, 26), speed: rand(180, 320) });
    this.planetY = 0;
    this.nebula = null;
    this.setTheme('meadow');
  }

  resize(W, H) {
    const changed = H !== this.H;
    this.W = W;
    this.H = H;
    if (changed) this.buildNebula();
  }

  setTheme(key) {
    if (key === this.themeKey && this.nebula) return;
    this.themeKey = key;
    this.theme = THEMES[key] || THEMES.meadow;
    this.planetY = this.theme.planet.y * this.H;
    this.buildNebula();
  }

  buildNebula() {
    const W = this.W;
    const H = this.H;
    const th = this.theme;
    // static vertical gradient (never scrolls, so no seam)
    const base = makeCanvas(W, H);
    const bctx = base.getContext('2d');
    const bg = bctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, th.top);
    bg.addColorStop(1, th.bottom);
    bctx.fillStyle = bg;
    bctx.fillRect(0, 0, W, H);
    this.base = base;
    // transparent nebula layer, blobs drawn with vertical wrap => seamless scroll
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.globalCompositeOperation = 'lighter';
    let seed = th.top.charCodeAt(2) * 97 + th.bottom.charCodeAt(3);
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed % 10000) / 10000;
    };
    for (let i = 0; i < 16; i++) {
      const col = th.nebula[i % th.nebula.length];
      const x = rnd() * W;
      const y = rnd() * H;
      const r = 60 + rnd() * 140;
      const a = 0.05 + rnd() * 0.09;
      for (const oy of [-H, 0, H]) {
        const g = ctx.createRadialGradient(x, y + oy, 0, x, y + oy, r);
        g.addColorStop(0, hexA(col, a));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y + oy - r, r * 2, r * 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // faint fixed tiny stars baked in
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = hexA(th.star, 0.15 + rnd() * 0.35);
      ctx.fillRect(rnd() * W, rnd() * H, 1, 1);
    }
    this.nebula = c;

    // planet sprite
    const p = th.planet;
    const size = p.r * 2 + 40;
    const pc = makeCanvas(size * 2, size * 2);
    const pctx = pc.getContext('2d');
    pctx.scale(2, 2);
    pctx.translate(size / 2, size / 2);
    const pg = pctx.createRadialGradient(-p.r * 0.4, -p.r * 0.4, p.r * 0.1, 0, 0, p.r);
    pg.addColorStop(0, shade(p.color, 0.3));
    pg.addColorStop(0.7, p.color);
    pg.addColorStop(1, shade(p.color, -0.35));
    pctx.globalAlpha = 0.7;
    pctx.fillStyle = pg;
    pctx.beginPath();
    pctx.arc(0, 0, p.r, 0, TAU);
    pctx.fill();
    pctx.strokeStyle = hexA(p.ring, 0.6);
    pctx.lineWidth = 3;
    pctx.beginPath();
    pctx.ellipse(0, 0, p.r * 1.6, p.r * 0.35, -0.35, 0, TAU);
    pctx.stroke();
    this.planet = { canvas: pc, size };
  }

  update(dt) {
    this.speedMul += (this.targetSpeedMul - this.speedMul) * Math.min(1, dt * 2);
    const sm = this.speedMul;
    this.scroll = (this.scroll + dt * 8 * sm) % this.H;
    this.planetY += dt * 5 * sm;
    if (this.planetY > this.H + this.planet.size) this.planetY = -this.planet.size;
    for (let l = 0; l < LAYERS.length; l++) {
      const sp = LAYERS[l].speed * sm;
      const arr = this.stars[l];
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        s.y += sp * dt;
        s.tw += dt * 3;
        if (s.y > this.H) {
          s.y -= this.H;
          s.x = rand(0, this.W);
        }
      }
    }
    for (const d of this.dust) {
      d.y += d.speed * sm * dt;
      if (d.y > this.H + d.len) {
        d.y = -d.len;
        d.x = rand(0, this.W);
      }
    }
  }

  render(ctx) {
    const H = this.H;
    const y = this.scroll;
    ctx.drawImage(this.base, 0, 0, this.W, H);
    ctx.drawImage(this.nebula, 0, y, this.W, H);
    ctx.drawImage(this.nebula, 0, y - H, this.W, H);
    const p = this.planet;
    ctx.drawImage(p.canvas, this.theme.planet.x * this.W - p.size / 2, this.planetY - p.size / 2, p.size, p.size);

    ctx.fillStyle = this.theme.star;
    for (let l = 0; l < LAYERS.length; l++) {
      const L = LAYERS[l];
      const arr = this.stars[l];
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        ctx.globalAlpha = L.alpha * (0.6 + 0.4 * Math.sin(s.tw));
        ctx.fillRect(s.x, s.y, L.size, L.size * (1 + (this.speedMul - 1) * 3));
      }
    }
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = this.theme.dust;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of this.dust) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y - d.len * this.speedMul);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

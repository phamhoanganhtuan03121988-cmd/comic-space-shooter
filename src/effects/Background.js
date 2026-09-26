import { THEMES } from '../data/levels.js';
import { makeCanvas, hexA, shade, glowSprite, flareSprite } from '../art/Sprites.js';
import { rand, TAU } from '../core/math.js';

// Parallax space background (all heavy work pre-rendered once per theme):
//   base      static vertical gradient + edge vignette (keeps the centre calm)
//   nebula    transparent tile of clouds, wisps and dust lanes; scrolls and
//             wraps seamlessly
//   planet    shaded planet with atmosphere rim + ring (+ a small moon)
//   asteroids a few slow drifting rocks (mid parallax)
//   stars     three twinkling layers + a handful of bright glowing stars
//   dust      speed streaks (stretch when the boss warp kicks in)
// Colours come from the level theme; everything stays dimmer than bullets.

const LAYERS = [
  { count: 46, speed: 10, size: 1, alpha: 0.55 },
  { count: 30, speed: 26, size: 1.6, alpha: 0.8 },
  { count: 12, speed: 60, size: 2.2, alpha: 1 },
];
const BRIGHT_STARS = 7;
const ASTEROIDS = 5;

// Extra per-theme flavour, purely visual.
const FEATURES = {
  meadow: { wisps: 3, galaxy: false, asteroidTint: '#6d7f8a' },
  amber: { wisps: 2, galaxy: false, asteroidTint: '#8a5a3c' },
  crystal: { wisps: 3, galaxy: true, asteroidTint: '#5d5a99' },
  toxic: { wisps: 4, galaxy: false, asteroidTint: '#56703a' },
  void: { wisps: 3, galaxy: true, asteroidTint: '#4d2a5c' },
};

export class Background {
  constructor(W, H) {
    this.W = W;
    this.H = H;
    this.theme = THEMES.meadow;
    this.themeKey = '';
    this.scroll = 0;
    this.speedMul = 1;
    this.targetSpeedMul = 1;
    this.t = 0;
    this.stars = LAYERS.map((l) => {
      const arr = [];
      for (let i = 0; i < l.count; i++) arr.push({ x: rand(0, W), y: rand(0, H), tw: rand(0, TAU) });
      return arr;
    });
    this.bright = [];
    for (let i = 0; i < BRIGHT_STARS; i++) this.bright.push({ x: rand(0, W), y: rand(0, H), tw: rand(0, TAU), s: rand(10, 18) });
    this.dust = [];
    for (let i = 0; i < 8; i++) this.dust.push({ x: rand(0, W), y: rand(0, H), len: rand(10, 26), speed: rand(180, 320) });
    this.rocks = [];
    for (let i = 0; i < ASTEROIDS; i++) this.rocks.push({ x: rand(0, W), y: rand(0, H), r: rand(6, 12), rot: rand(0, TAU), vr: rand(-0.6, 0.6), speed: rand(14, 24), k: i % 3 });
    this.rockSprites = [];
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
    this.feature = FEATURES[key] || FEATURES.meadow;
    this.planetY = this.theme.planet.y * this.H;
    this.buildNebula();
  }

  buildNebula() {
    const W = this.W;
    const H = this.H;
    const th = this.theme;
    let seed = th.top.charCodeAt(2) * 97 + th.bottom.charCodeAt(3);
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed % 10000) / 10000;
    };

    // --- static base: gradient + vignette (never scrolls, so no seam)
    const base = makeCanvas(W, H);
    const bctx = base.getContext('2d');
    const bg = bctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, th.top);
    bg.addColorStop(0.55, shade(th.top, 0.03));
    bg.addColorStop(1, th.bottom);
    bctx.fillStyle = bg;
    bctx.fillRect(0, 0, W, H);
    const vig = bctx.createRadialGradient(W / 2, H * 0.55, H * 0.25, W / 2, H * 0.55, H * 0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(3,0,12,0.55)');
    bctx.fillStyle = vig;
    bctx.fillRect(0, 0, W, H);
    this.base = base;

    // --- scrolling nebula tile (drawn with vertical wrap)
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    const blob = (x, y, r, col, a) => {
      for (const oy of [-H, 0, H]) {
        const g = ctx.createRadialGradient(x, y + oy, 0, x, y + oy, r);
        g.addColorStop(0, hexA(col, a));
        g.addColorStop(0.5, hexA(col, a * 0.45));
        g.addColorStop(1, hexA(col, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y + oy - r, r * 2, r * 2);
      }
    };
    ctx.globalCompositeOperation = 'lighter';
    // big soft clouds
    for (let i = 0; i < 14; i++) blob(rnd() * W, rnd() * H, 80 + rnd() * 150, th.nebula[i % th.nebula.length], 0.05 + rnd() * 0.07);
    // wisps: chains of small blobs along curves
    for (let w = 0; w < this.feature.wisps; w++) {
      const col = th.nebula[w % th.nebula.length];
      let x = rnd() * W;
      let y = rnd() * H;
      let a = rnd() * TAU;
      for (let i = 0; i < 26; i++) {
        blob(x, y, 18 + rnd() * 26, col, 0.05 + rnd() * 0.05);
        a += (rnd() - 0.5) * 0.6;
        x += Math.cos(a) * 14;
        y += Math.sin(a) * 14;
      }
    }
    // distant spiral galaxy
    if (this.feature.galaxy) {
      const gx = W * (0.2 + rnd() * 0.6);
      const gy = H * (0.2 + rnd() * 0.5);
      blob(gx, gy, 30, '#ffffff', 0.18);
      for (let k = 0; k < 2; k++) {
        for (let i = 0; i < 40; i++) {
          const ang = i * 0.18 + k * Math.PI;
          const r = 6 + i * 1.6;
          blob(gx + Math.cos(ang) * r, gy + Math.sin(ang) * r * 0.45, 7 + i * 0.2, th.nebula[k], 0.07);
        }
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    // darker dust lanes for depth
    for (let i = 0; i < 5; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const r = 50 + rnd() * 90;
      for (const oy of [-H, 0, H]) {
        const g = ctx.createRadialGradient(x, y + oy, 0, x, y + oy, r);
        g.addColorStop(0, 'rgba(4,0,14,0.28)');
        g.addColorStop(1, 'rgba(4,0,14,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y + oy - r, r * 2, r * 2);
      }
    }
    // faint fixed tiny stars baked in
    for (let i = 0; i < 110; i++) {
      ctx.fillStyle = hexA(th.star, 0.15 + rnd() * 0.4);
      const s = rnd() < 0.15 ? 1.5 : 1;
      ctx.fillRect(rnd() * W, rnd() * H, s, s);
    }
    this.nebula = c;
    this.buildPlanet();
    this.buildRocks();
  }

  buildPlanet() {
    const p = this.theme.planet;
    const size = p.r * 3.6 + 30;
    const R = 2;
    const pc = makeCanvas(size * R, size * R);
    const x = pc.getContext('2d');
    x.scale(R, R);
    x.translate(size / 2, size / 2);
    const tilt = -0.35;
    const ringBack = () => {
      x.strokeStyle = hexA(p.ring, 0.55);
      x.lineWidth = 4;
      x.beginPath();
      x.ellipse(0, 0, p.r * 1.65, p.r * 0.38, tilt, Math.PI, TAU);
      x.stroke();
      x.strokeStyle = hexA(p.ring, 0.25);
      x.lineWidth = 2;
      x.beginPath();
      x.ellipse(0, 0, p.r * 1.85, p.r * 0.45, tilt, Math.PI, TAU);
      x.stroke();
    };
    const ringFront = () => {
      x.strokeStyle = hexA(p.ring, 0.75);
      x.lineWidth = 4;
      x.beginPath();
      x.ellipse(0, 0, p.r * 1.65, p.r * 0.38, tilt, 0, Math.PI);
      x.stroke();
      x.strokeStyle = hexA(p.ring, 0.3);
      x.lineWidth = 2;
      x.beginPath();
      x.ellipse(0, 0, p.r * 1.85, p.r * 0.45, tilt, 0, Math.PI);
      x.stroke();
    };
    // atmosphere glow
    const ag = x.createRadialGradient(0, 0, p.r * 0.9, 0, 0, p.r * 1.35);
    ag.addColorStop(0, hexA(shade(p.color, 0.3), 0.45));
    ag.addColorStop(1, hexA(p.color, 0));
    x.fillStyle = ag;
    x.beginPath();
    x.arc(0, 0, p.r * 1.35, 0, TAU);
    x.fill();
    ringBack();
    // sphere
    x.save();
    x.beginPath();
    x.arc(0, 0, p.r, 0, TAU);
    x.clip();
    const g = x.createRadialGradient(-p.r * 0.45, -p.r * 0.45, p.r * 0.1, 0, 0, p.r * 1.05);
    g.addColorStop(0, shade(p.color, 0.35));
    g.addColorStop(0.6, p.color);
    g.addColorStop(1, shade(p.color, -0.4));
    x.fillStyle = g;
    x.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
    // bands
    for (let i = -3; i <= 3; i++) {
      x.fillStyle = i % 2 ? hexA(shade(p.color, 0.18), 0.35) : hexA(shade(p.color, -0.2), 0.3);
      x.save();
      x.rotate(tilt);
      x.fillRect(-p.r, i * p.r * 0.26 - p.r * 0.06, p.r * 2, p.r * 0.12);
      x.restore();
    }
    // craters
    for (let i = 0; i < 4; i++) {
      x.fillStyle = hexA(shade(p.color, -0.3), 0.35);
      x.beginPath();
      x.arc(Math.cos(i * 2.1) * p.r * 0.5, Math.sin(i * 1.7) * p.r * 0.45, p.r * (0.08 + i * 0.02), 0, TAU);
      x.fill();
    }
    // terminator shadow
    const sg = x.createLinearGradient(-p.r, -p.r, p.r, p.r);
    sg.addColorStop(0.45, 'rgba(0,0,10,0)');
    sg.addColorStop(1, 'rgba(0,0,10,0.65)');
    x.fillStyle = sg;
    x.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
    x.restore();
    // rim light
    x.strokeStyle = hexA(shade(p.color, 0.45), 0.8);
    x.lineWidth = 1.5;
    x.beginPath();
    x.arc(0, 0, p.r - 0.5, Math.PI * 0.95, Math.PI * 1.6);
    x.stroke();
    ringFront();
    // small moon
    const mx = p.r * 1.35;
    const my = -p.r * 0.95;
    const mr = p.r * 0.22;
    const mg = x.createRadialGradient(mx - mr * 0.4, my - mr * 0.4, 1, mx, my, mr);
    mg.addColorStop(0, '#f0ecff');
    mg.addColorStop(1, '#6c6590');
    x.fillStyle = mg;
    x.beginPath();
    x.arc(mx, my, mr, 0, TAU);
    x.fill();
    this.planet = { canvas: pc, size };
  }

  buildRocks() {
    const tint = this.feature.asteroidTint;
    this.rockSprites = [];
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed % 10000) / 10000;
    };
    for (let k = 0; k < 3; k++) {
      const S = 40;
      const c = makeCanvas(S * 2, S * 2);
      const x = c.getContext('2d');
      x.scale(2, 2);
      x.translate(S / 2, S / 2);
      x.beginPath();
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU;
        const r = 15 * (0.72 + rnd() * 0.32);
        if (i === 0) x.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      x.closePath();
      const g = x.createRadialGradient(-5, -5, 1, 0, 0, 17);
      g.addColorStop(0, shade(tint, 0.3));
      g.addColorStop(1, shade(tint, -0.35));
      x.fillStyle = g;
      x.fill();
      x.strokeStyle = 'rgba(10,5,25,0.8)';
      x.lineWidth = 1.5;
      x.stroke();
      x.fillStyle = hexA(shade(tint, -0.4), 0.8);
      for (let i = 0; i < 3; i++) {
        x.beginPath();
        x.arc((rnd() - 0.5) * 14, (rnd() - 0.5) * 14, 1.5 + rnd() * 2.5, 0, TAU);
        x.fill();
      }
      x.strokeStyle = 'rgba(255,255,255,0.35)';
      x.lineWidth = 1.2;
      x.beginPath();
      x.arc(0, 0, 11, Math.PI * 1.05, Math.PI * 1.5);
      x.stroke();
      this.rockSprites.push({ canvas: c, size: S });
    }
  }

  update(dt) {
    this.t += dt;
    this.speedMul += (this.targetSpeedMul - this.speedMul) * Math.min(1, dt * 2);
    const sm = this.speedMul;
    const H = this.H;
    this.scroll = (this.scroll + dt * 8 * sm) % H;
    this.planetY += dt * 5 * sm;
    if (this.planetY > H + this.planet.size) this.planetY = -this.planet.size;
    for (let l = 0; l < LAYERS.length; l++) {
      const sp = LAYERS[l].speed * sm;
      const arr = this.stars[l];
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        s.y += sp * dt;
        s.tw += dt * 3;
        if (s.y > H) {
          s.y -= H;
          s.x = rand(0, this.W);
        }
      }
    }
    for (let i = 0; i < this.bright.length; i++) {
      const s = this.bright[i];
      s.y += 18 * sm * dt;
      s.tw += dt * 2;
      if (s.y > H + 20) {
        s.y = -20;
        s.x = rand(0, this.W);
      }
    }
    for (let i = 0; i < this.rocks.length; i++) {
      const r = this.rocks[i];
      r.y += r.speed * sm * dt;
      r.rot += r.vr * dt;
      if (r.y > H + 30) {
        r.y = -30;
        r.x = rand(0, this.W);
      }
    }
    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      d.y += d.speed * sm * dt;
      if (d.y > H + d.len) {
        d.y = -d.len;
        d.x = rand(0, this.W);
      }
    }
  }

  render(ctx) {
    const W = this.W;
    const H = this.H;
    const y = this.scroll;
    ctx.drawImage(this.base, 0, 0, W, H);
    ctx.drawImage(this.nebula, 0, y, W, H);
    ctx.drawImage(this.nebula, 0, y - H, W, H);
    const p = this.planet;
    ctx.drawImage(p.canvas, this.theme.planet.x * W - p.size / 2, this.planetY - p.size / 2, p.size, p.size);

    // tiny stars
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
    // bright glowing stars with cross flares
    ctx.globalCompositeOperation = 'lighter';
    const fl = flareSprite(this.theme.star);
    const gl = glowSprite(this.theme.nebula[0], 16);
    for (let i = 0; i < this.bright.length; i++) {
      const s = this.bright[i];
      const k = 0.55 + 0.45 * Math.sin(s.tw);
      ctx.globalAlpha = 0.35 * k;
      ctx.drawImage(gl.canvas, s.x - s.s, s.y - s.s, s.s * 2, s.s * 2);
      ctx.globalAlpha = 0.8 * k;
      const f = s.s * (0.8 + k * 0.4);
      ctx.drawImage(fl.canvas, s.x - f / 2, s.y - f / 2, f, f);
    }
    ctx.globalCompositeOperation = 'source-over';
    // asteroids (dim + small: scenery, never mistaken for enemies)
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < this.rocks.length; i++) {
      const r = this.rocks[i];
      const sp = this.rockSprites[r.k];
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.drawImage(sp.canvas, -r.r, -r.r, r.r * 2, r.r * 2);
      ctx.restore();
    }
    // speed dust
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = this.theme.dust;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x, d.y - d.len * this.speedMul);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

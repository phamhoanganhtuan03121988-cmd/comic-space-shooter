import { THEMES } from '../data/levels.js';
import { flareSprite, glowSprite } from '../art/Sprites.js';
import { nebulaTile, baseLayer, buildPieces, asteroidSprite, seeded } from '../art/SpaceArt.js';
import { rand, TAU } from '../core/math.js';

// Parallax sector background. All heavy work is pre-rendered once per sector
// (src/art/SpaceArt.js); per frame it is only blits and a few rects:
//   base      static gradient + big soft light sources + vignette
//   nebula    tileable noise clouds, filaments, dust lanes (slow scroll)
//   pieces    celestial set pieces (planets, black hole...) drifting slowly
//   stars     three twinkling layers + a handful of flare stars
//   asteroids a few dim themed rocks/crystals (mid parallax)
//   motes     tiny foreground particles (fastest layer)
//   dust      speed streaks (stretch when the boss warp kicks in)
// Scenery stays darker than gameplay; the centre lane is kept the calmest.

const LAYERS = [
  { count: 46, speed: 10, size: 1, alpha: 0.55 },
  { count: 28, speed: 26, size: 1.6, alpha: 0.75 },
  { count: 10, speed: 60, size: 2.2, alpha: 0.9 },
];
const BRIGHT_STARS = 6;
const ASTEROIDS = 5;
const MOTES = 12;

// Per-sector art direction (visual only).
const SCENES = {
  // S1: deep blue / cyan, clean and readable
  meadow: {
    neb: { a: '#1a4dff', b: '#18c8ff', hi: '#c8f6ff', lane: '#01030d', star: '#dff4ff', amount: 0.5, center: 0.5, lo: 0.4 },
    lights: [[0.95, 0.12, 0.9, '#1f8cff', 0.2]],
    rock: ['rock', ['#8fb4d8', '#4a6a94', '#1c2c4c', '#aef4ff']],
    mote: '#9fe8ff',
  },
  // S2: green / amber, organic and warm
  amber: {
    neb: { a: '#1fae5a', b: '#ffa12e', hi: '#fff0b8', lane: '#050803', star: '#fff2d8', amount: 0.4, center: 0.45, lo: 0.43 },
    lights: [
      [0.05, 0.2, 0.8, '#3fdc6a', 0.14],
      [0.9, 0.85, 0.9, '#ff9b2e', 0.16],
    ],
    rock: ['rock', ['#d8a870', '#8a5a2c', '#3a220c', '#ffd98a']],
    mote: '#ffd98a',
  },
  // S3: violet / crystal
  crystal: {
    neb: { a: '#7a2bff', b: '#2fc8ff', hi: '#f0e0ff', lane: '#05010f', star: '#efe6ff', amount: 0.52, center: 0.48, lo: 0.4, galaxy: '#c9a8ff' },
    lights: [[0.5, 0.0, 0.9, '#a45cff', 0.16]],
    rock: ['crystal', ['#d6c2ff', '#7a4de0', '#2a1070', '#8ff0ff']],
    mote: '#d0b8ff',
  },
  // S4: red / orange, dangerous, stronger contrast
  toxic: {
    neb: { a: '#e0321a', b: '#ff8a1f', hi: '#ffe0a0', lane: '#080000', star: '#ffe6d6', amount: 0.44, center: 0.42, lo: 0.41 },
    lights: [
      [0.0, 0.0, 1.1, '#ff3a14', 0.28],
      [1.0, 1.0, 0.8, '#b3123d', 0.18],
    ],
    rock: ['lava', ['#6a4a44', '#3a2420', '#140806', '#ff8a2e']],
    mote: '#ffab6b',
  },
  // S5: dark endgame cosmos, deep purple / black
  void: {
    neb: { a: '#4a16b8', b: '#d0247a', hi: '#ffd0f0', lane: '#000000', star: '#f2e6ff', amount: 0.42, center: 0.42, lo: 0.44, galaxy: '#ff9ad8' },
    lights: [[0.7, 0.26, 0.7, '#7a2bff', 0.14]],
    rock: ['obsidian', ['#5a3a7a', '#2a1440', '#0a0414', '#ff5ec8']],
    mote: '#c78aff',
  },

  // ---- sectors 6-15 --------------------------------------------------
  // S6: golden solar wind over deep teal
  solar: {
    neb: { a: '#e08a1a', b: '#1a8a9a', hi: '#fff0c0', lane: '#040406', star: '#fff6e0', amount: 0.42, center: 0.44, lo: 0.42 },
    lights: [[0.0, 0.18, 1.0, '#ff9b2e', 0.22]],
    rock: ['rock', ['#e8b878', '#a0602c', '#40200c', '#ffe07a']],
    mote: '#ffd98a',
  },
  // S7: pale ice-blue and lavender, crisp and cold
  frost: {
    neb: { a: '#6a8aff', b: '#bfe8ff', hi: '#ffffff', lane: '#02040c', star: '#f4fbff', amount: 0.4, center: 0.46, lo: 0.43 },
    lights: [[0.9, 0.2, 0.8, '#9fd0ff', 0.16]],
    rock: ['crystal', ['#ffffff', '#a8d0f0', '#4a6a9a', '#dff6ff']],
    mote: '#ffffff',
  },
  // S8: electric teal / green with bright filaments
  storm: {
    neb: { a: '#0a8a6a', b: '#3adf5a', hi: '#e0fff0', lane: '#010604', star: '#e0fff4', amount: 0.46, center: 0.44, lo: 0.41 },
    lights: [[0.95, 0.2, 0.8, '#18d9a0', 0.18]],
    rock: ['lava', ['#4a6a64', '#243a36', '#0a1614', '#5dffb0']],
    mote: '#8dffcf',
  },
  // S9: near-black void with prismatic cyan / pink wisps
  prism: {
    neb: { a: '#1a8ad0', b: '#d0408a', hi: '#ffffff', lane: '#000000', star: '#f2f6ff', amount: 0.3, center: 0.4, lo: 0.47 },
    lights: [[0.05, 0.3, 0.7, '#6ad0ff', 0.12]],
    rock: ['crystal', ['#e8f6ff', '#8ab8ff', '#2a3a8a', '#ff9ad8']],
    mote: '#c8e8ff',
  },
  // S10: rust and gunmetal haze
  scrap: {
    neb: { a: '#6a4a2a', b: '#4a5a6a', hi: '#ffc890', lane: '#030303', star: '#f0e8e0', amount: 0.44, center: 0.46, lo: 0.42 },
    lights: [[0.9, 0.2, 0.8, '#c86a2a', 0.14]],
    rock: ['debris', ['#9aa0aa', '#5a606a', '#22262e', '#ff9b3d']],
    mote: '#e0b890',
  },
  // S11: deep ocean blue with aqua bioluminescence
  ocean: {
    neb: { a: '#0a4ad0', b: '#10d0c0', hi: '#d0fff8', lane: '#010410', star: '#e0fbff', amount: 0.46, center: 0.45, lo: 0.41 },
    lights: [[0.05, 0.26, 0.9, '#12e0c8', 0.14], [0.9, 0.95, 0.8, '#3a5aff', 0.14]],
    rock: ['rock', ['#8ac8d8', '#3a7088', '#0e2a3a', '#9ffff0']],
    mote: '#8ff6ff',
  },
  // S12: magenta / indigo, warped and unstable
  rift: {
    neb: { a: '#5a1ad0', b: '#e01ea0', hi: '#ffd0f4', lane: '#020005', star: '#fbe6ff', amount: 0.48, center: 0.42, lo: 0.4 },
    lights: [[0.9, 0.34, 0.7, '#ff4fd0', 0.16]],
    rock: ['obsidian', ['#7a3a9a', '#3a1450', '#10041a', '#ff5ec8']],
    mote: '#e08aff',
  },
  // S13: black and crimson, a dying star
  darkstar: {
    neb: { a: '#8a0a1a', b: '#ff3a2a', hi: '#ffc0a0', lane: '#000000', star: '#ffe0e0', amount: 0.38, center: 0.4, lo: 0.44 },
    lights: [[0.05, 0.2, 0.9, '#ff2a1a', 0.2]],
    rock: ['lava', ['#5a3a3a', '#2a1414', '#0a0404', '#ff3a2a']],
    mote: '#ff8a8a',
  },
  // S14: cold blue-violet abyss, sparse and vast
  abyss: {
    neb: { a: '#1a2a9a', b: '#5a3ad0', hi: '#d8e0ff', lane: '#000002', star: '#e6ecff', amount: 0.32, center: 0.4, lo: 0.46, galaxy: '#9fb3ff' },
    lights: [[0.8, 0.22, 0.8, '#4a5aff', 0.12]],
    rock: ['obsidian', ['#3a4a7a', '#1a2248', '#060a1a', '#9fb3ff']],
    mote: '#9fb3ff',
  },
  // S15: gold and violet spiralling into the singularity
  singularity: {
    neb: { a: '#b04aff', b: '#ff9a2e', hi: '#fff4d0', lane: '#010002', star: '#fff4e6', amount: 0.44, center: 0.4, lo: 0.42, galaxy: '#ffd9a0' },
    lights: [[0.88, 0.26, 0.9, '#ffb13d', 0.18], [0.1, 0.8, 0.8, '#b04aff', 0.14]],
    rock: ['crystal', ['#fff0d0', '#c89a50', '#4a2a1a', '#ffd23f']],
    mote: '#ffd9a0',
  },
};

// Pre-rendered scenes, keyed by sector + size. Only the most recent few are
// kept (15 sectors x full-screen layers would otherwise pile up in memory).
const sceneCache = new Map();
const SCENE_CACHE_MAX = 3;

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
    for (let i = 0; i < BRIGHT_STARS; i++) this.bright.push({ x: rand(0, W), y: rand(0, H), tw: rand(0, TAU), s: rand(9, 16) });
    this.dust = [];
    for (let i = 0; i < 8; i++) this.dust.push({ x: rand(0, W), y: rand(0, H), len: rand(10, 26), speed: rand(180, 320) });
    this.rocks = [];
    for (let i = 0; i < ASTEROIDS; i++) this.rocks.push({ x: rand(0, W), y: rand(0, H), r: rand(6, 12), rot: rand(0, TAU), vr: rand(-0.6, 0.6), speed: rand(14, 24), k: i % 3 });
    this.motes = [];
    for (let i = 0; i < MOTES; i++) this.motes.push({ x: rand(0, W), y: rand(0, H), s: rand(2.5, 6), speed: rand(70, 130), a: rand(0.25, 0.5), drift: rand(-8, 8) });
    this.pieces = [];
    this.nebula = null;
    this.setTheme('meadow');
  }

  resize(W, H) {
    const changed = H !== this.H || W !== this.W;
    this.W = W;
    this.H = H;
    if (changed) this.build();
  }

  setTheme(key) {
    if (key === this.themeKey && this.nebula) return;
    this.themeKey = key;
    this.theme = THEMES[key] || THEMES.meadow;
    this.scene = SCENES[key] || SCENES.meadow;
    this.build();
  }

  build() {
    const W = this.W;
    const H = this.H;
    const key = this.themeKey + ':' + W + 'x' + H;
    let s = sceneCache.get(key);
    if (s) {
      // mark as most recently used
      sceneCache.delete(key);
      sceneCache.set(key, s);
    }
    if (!s) {
      const th = this.theme;
      const sc = this.scene;
      const seed = th.top.charCodeAt(2) * 97 + th.bottom.charCodeAt(3) * 13 + 7;
      const rnd = seeded(seed);
      const [style, pal] = sc.rock;
      s = {
        base: baseLayer(W, H, th, sc),
        nebula: nebulaTile(W, H, sc.neb, seed),
        pieces: buildPieces(this.themeKey, rnd),
        rocks: [0, 1, 2].map(() => asteroidSprite(style, pal, rnd)),
      };
      sceneCache.set(key, s);
      while (sceneCache.size > SCENE_CACHE_MAX) sceneCache.delete(sceneCache.keys().next().value);
    }
    this.base = s.base;
    this.nebula = s.nebula;
    this.rockSprites = s.rocks;
    this.pieces = s.pieces.map((p) => ({ sprite: p.sprite, x: p.x, y: p.y * H, speed: p.speed }));
  }

  update(dt) {
    this.t += dt;
    this.speedMul += (this.targetSpeedMul - this.speedMul) * Math.min(1, dt * 2);
    const sm = this.speedMul;
    const W = this.W;
    const H = this.H;
    this.scroll = (this.scroll + dt * 8 * sm) % H;
    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i];
      p.y += dt * p.speed * sm;
      if (p.y > H + p.sprite.size / 2) p.y = -p.sprite.size / 2;
    }
    for (let l = 0; l < LAYERS.length; l++) {
      const sp = LAYERS[l].speed * sm;
      const arr = this.stars[l];
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        s.y += sp * dt;
        s.tw += dt * 3;
        if (s.y > H) {
          s.y -= H;
          s.x = rand(0, W);
        }
      }
    }
    for (let i = 0; i < this.bright.length; i++) {
      const s = this.bright[i];
      s.y += 18 * sm * dt;
      s.tw += dt * 2;
      if (s.y > H + 20) {
        s.y = -20;
        s.x = rand(0, W);
      }
    }
    for (let i = 0; i < this.rocks.length; i++) {
      const r = this.rocks[i];
      r.y += r.speed * sm * dt;
      r.rot += r.vr * dt;
      if (r.y > H + 30) {
        r.y = -30;
        r.x = rand(0, W);
      }
    }
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      m.y += m.speed * sm * dt;
      m.x += m.drift * dt;
      if (m.y > H + 8) {
        m.y = -8;
        m.x = rand(0, W);
      }
    }
    for (let i = 0; i < this.dust.length; i++) {
      const d = this.dust[i];
      d.y += d.speed * sm * dt;
      if (d.y > H + d.len) {
        d.y = -d.len;
        d.x = rand(0, W);
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
    for (let i = 0; i < this.pieces.length; i++) {
      const p = this.pieces[i];
      const s = p.sprite.size;
      ctx.drawImage(p.sprite.canvas, p.x * W - s / 2, p.y - s / 2, s, s);
    }

    // tiny stars
    ctx.fillStyle = this.theme.star;
    const stretch = 1 + (this.speedMul - 1) * 3;
    for (let l = 0; l < LAYERS.length; l++) {
      const L = LAYERS[l];
      const arr = this.stars[l];
      for (let i = 0; i < arr.length; i++) {
        const s = arr[i];
        ctx.globalAlpha = L.alpha * (0.6 + 0.4 * Math.sin(s.tw));
        ctx.fillRect(s.x, s.y, L.size, L.size * stretch);
      }
    }
    // bright glowing stars with cross flares
    ctx.globalCompositeOperation = 'lighter';
    const fl = flareSprite(this.theme.star);
    for (let i = 0; i < this.bright.length; i++) {
      const s = this.bright[i];
      const k = 0.55 + 0.45 * Math.sin(s.tw);
      ctx.globalAlpha = 0.8 * k;
      const f = s.s * (0.8 + k * 0.4);
      ctx.drawImage(fl.canvas, s.x - f / 2, s.y - f / 2, f, f);
    }
    ctx.globalCompositeOperation = 'source-over';
    // asteroids (dim + small: scenery, never mistaken for enemies)
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < this.rocks.length; i++) {
      const r = this.rocks[i];
      const sp = this.rockSprites[r.k];
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.rot);
      ctx.drawImage(sp.canvas, -r.r, -r.r, r.r * 2, r.r * 2);
      ctx.restore();
    }
    // foreground motes: soft, tiny, low alpha
    ctx.globalCompositeOperation = 'lighter';
    const mg = glowSprite(this.scene.mote, 8);
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      ctx.globalAlpha = m.a;
      ctx.drawImage(mg.canvas, m.x - m.s / 2, m.y - m.s / 2, m.s, m.s * stretch);
    }
    ctx.globalCompositeOperation = 'source-over';
    // speed dust
    ctx.globalAlpha = 0.22;
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

import { makeCanvas, hexA, shade } from './Sprites.js';
import { cel, INK } from './Paint.js';
import { TAU } from '../core/math.js';

// Pre-rendered sector scenery: noise nebula tiles, celestial set pieces and
// themed asteroids. Everything here runs once per sector (at level start or
// resize) and is blitted afterwards, so none of it costs anything per frame.
// Brightness rule: scenery mids stay dark and desaturated; only thin rims and
// small accents glow, so bullets, enemies and bosses always read first.

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a, b, t) => a + (b - a) * t;

function rgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function seeded(seed) {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Value noise on a lattice that wraps every px x py cells (tileable).
function periodicNoise(rnd, px, py) {
  const g = new Float32Array(px * py);
  for (let i = 0; i < g.length; i++) g[i] = rnd();
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = smooth(x - xi);
    const v = smooth(y - yi);
    const x0 = ((xi % px) + px) % px;
    const y0 = ((yi % py) + py) % py;
    const x1 = (x0 + 1) % px;
    const y1 = (y0 + 1) % py;
    const a = g[y0 * px + x0];
    const b = g[y0 * px + x1];
    const c = g[y1 * px + x0];
    const d = g[y1 * px + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

function fbmField(rnd, px, py, octaves) {
  const layers = [];
  for (let o = 0; o < octaves; o++) layers.push(periodicNoise(rnd, px << o, py << o));
  const norm = 1 - Math.pow(0.5, octaves);
  return (x, y) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < octaves; o++) {
      sum += layers[o](x * f, y * f) * amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum / norm;
  };
}

// Scrolling nebula tile (W x H, wraps vertically). Domain-warped fBm clouds
// in two colours, bright ridged filaments and dark dust lanes. The centre
// column is kept dimmer than the edges so the play lane stays calm.
export function nebulaTile(W, H, neb, seed) {
  const rnd = seeded(seed);
  const RES = 2.5;
  const NW = Math.ceil(W / RES);
  const NH = Math.ceil(H / RES);
  const px = 3;
  const py = Math.max(3, Math.round((px * H) / W));
  const dens = fbmField(rnd, px, py, 5);
  const warp = fbmField(rnd, px, py, 3);
  const detail = fbmField(rnd, px, py, 4);
  const A = rgb(neb.a);
  const B = rgb(neb.b);
  const HI = rgb(neb.hi);
  const LANE = rgb(neb.lane);
  const img = new ImageData(NW, NH);
  const d = img.data;
  for (let j = 0; j < NH; j++) {
    const y = (j / NH) * py;
    for (let i = 0; i < NW; i++) {
      const x = (i / NW) * px;
      const w = warp(x, y);
      const n = dens(x + (w - 0.5) * 1.6, y + (w - 0.5) * 1.1);
      const dt = detail(x * 2 + w, y * 2); // x2 frequency, still wraps
      const cloud = Math.pow(smooth((n - neb.lo) / 0.36), 1.35);
      const ridge = 1 - Math.abs(dt * 2 - 1);
      const fil = Math.pow(ridge, 7) * cloud;
      const edge = Math.abs(i / NW - 0.5) * 2;
      const mask = neb.center + (1 - neb.center) * edge * edge;
      const lane = smooth((dt - 0.6) / 0.16) * smooth((n - 0.35) / 0.3) * 0.75;
      const m = smooth((w - 0.3) / 0.4);
      let r = lerp(A[0], B[0], m);
      let g = lerp(A[1], B[1], m);
      let b = lerp(A[2], B[2], m);
      r = lerp(r, HI[0], fil * 0.8);
      g = lerp(g, HI[1], fil * 0.8);
      b = lerp(b, HI[2], fil * 0.8);
      let a = (cloud * neb.amount + fil * 0.3) * mask;
      if (lane > 0.01) {
        r = lerp(r, LANE[0], lane);
        g = lerp(g, LANE[1], lane);
        b = lerp(b, LANE[2], lane);
        a = Math.max(a, lane * 0.55);
      }
      const k = (j * NW + i) * 4;
      d[k] = r;
      d[k + 1] = g;
      d[k + 2] = b;
      d[k + 3] = Math.min(1, a) * 255;
    }
  }
  const small = makeCanvas(NW, NH);
  small.getContext('2d').putImageData(img, 0, 0);
  const tile = makeCanvas(W, H);
  const ctx = tile.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, W, H);
  if (neb.galaxy) drawGalaxy(ctx, W * (0.18 + rnd() * 0.64), H * (0.15 + rnd() * 0.4), neb.galaxy, rnd);
  // faint fixed stars, some in small clusters
  for (let i = 0; i < 130; i++) {
    ctx.fillStyle = hexA(neb.star, 0.12 + rnd() * 0.4);
    ctx.fillRect(rnd() * W, rnd() * H, rnd() < 0.12 ? 1.5 : 1, 1);
  }
  return tile;
}

function drawGalaxy(ctx, gx, gy, col, rnd) {
  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(-0.4 + rnd() * 0.8);
  ctx.scale(1, 0.42);
  ctx.globalCompositeOperation = 'lighter';
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
  core.addColorStop(0, 'rgba(255,245,230,0.5)');
  core.addColorStop(1, 'rgba(255,245,230,0)');
  ctx.fillStyle = core;
  ctx.fillRect(-16, -16, 32, 32);
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 60; i++) {
      const t = i / 60;
      const ang = t * 5 + arm * Math.PI;
      const r = 4 + t * 40;
      ctx.fillStyle = hexA(col, 0.18 * (1 - t));
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * r, Math.sin(ang) * r, 2 + t * 5, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Static base: vertical gradient, big soft light sources, edge vignette.
export function baseLayer(W, H, th, scene) {
  const c = makeCanvas(W, H);
  const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, th.top);
  bg.addColorStop(0.55, shade(th.top, 0.04));
  bg.addColorStop(1, th.bottom);
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  for (const [fx, fy, fr, col, a] of scene.lights) {
    const g = x.createRadialGradient(fx * W, fy * H, 0, fx * W, fy * H, fr * W);
    g.addColorStop(0, hexA(col, a));
    g.addColorStop(0.45, hexA(col, a * 0.35));
    g.addColorStop(1, hexA(col, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  }
  const vig = x.createRadialGradient(W / 2, H * 0.55, H * 0.22, W / 2, H * 0.55, H * 0.82);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(2,0,8,0.6)');
  x.fillStyle = vig;
  x.fillRect(0, 0, W, H);
  return c;
}

// ---------------------------------------------------------------- set pieces

const PR = 2; // set-piece render resolution

function pieceCanvas(size, draw) {
  const c = makeCanvas(size * PR, size * PR);
  const x = c.getContext('2d');
  x.scale(PR, PR);
  x.translate(size / 2, size / 2);
  x.lineJoin = 'round';
  x.lineCap = 'round';
  draw(x);
  return { canvas: c, size };
}

const circle = (r, cx = 0, cy = 0) => (x) => {
  x.beginPath();
  x.arc(cx, cy, r, 0, TAU);
};

function atmosphere(x, r, col, a, k = 1.28) {
  const g = x.createRadialGradient(0, 0, r * 0.92, 0, 0, r * k);
  g.addColorStop(0, hexA(col, a));
  g.addColorStop(1, hexA(col, 0));
  x.fillStyle = g;
  x.beginPath();
  x.arc(0, 0, r * k, 0, TAU);
  x.fill();
}

// Hard cel terminator: lit from the upper left, shadow crescent lower right.
function terminator(x, r, dark, a = 0.72) {
  x.save();
  circle(r)(x);
  x.clip();
  x.fillStyle = hexA(dark, a * 0.55);
  x.beginPath();
  x.arc(r * 0.28, r * 0.22, r * 1.02, 0, TAU);
  x.fill();
  x.fillStyle = hexA(dark, a);
  x.beginPath();
  x.arc(r * 0.52, r * 0.42, r * 0.98, 0, TAU);
  x.fill();
  x.restore();
}

function rimLight(x, r, col, width = 2, a0 = Math.PI * 0.92, a1 = Math.PI * 1.62) {
  x.strokeStyle = col;
  x.lineWidth = width;
  x.beginPath();
  x.arc(0, 0, r - width / 2, a0, a1);
  x.stroke();
}

function sphereBase(x, r, light, mid, dark) {
  const g = x.createRadialGradient(-r * 0.4, -r * 0.45, r * 0.05, 0, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(0.55, mid);
  g.addColorStop(1, dark);
  x.fillStyle = g;
  circle(r)(x);
  x.fill();
}

// S1: banded blue gas giant with a storm eye and cyan rim light.
function gasGiant(r, rnd) {
  return pieceCanvas(r * 2.7, (x) => {
    atmosphere(x, r, '#29b8ff', 0.3);
    sphereBase(x, r, '#4f9ee8', '#1d4f9e', '#0b1f52');
    x.save();
    circle(r)(x);
    x.clip();
    x.rotate(-0.28);
    for (let i = -7; i <= 7; i++) {
      const y = i * r * 0.14 + (rnd() - 0.5) * 4;
      const th = r * (0.03 + rnd() * 0.06);
      x.fillStyle = i % 2 ? hexA('#8fd8ff', 0.16 + rnd() * 0.12) : hexA('#06154a', 0.25 + rnd() * 0.15);
      x.beginPath();
      x.moveTo(-r * 1.2, y);
      for (let s = 0; s <= 12; s++) {
        const px = -r * 1.2 + (s / 12) * r * 2.4;
        x.lineTo(px, y + Math.sin(s * 0.9 + i) * th * 0.6);
      }
      for (let s = 12; s >= 0; s--) {
        const px = -r * 1.2 + (s / 12) * r * 2.4;
        x.lineTo(px, y + th + Math.sin(s * 0.9 + i + 1) * th * 0.6);
      }
      x.fill();
    }
    // storm eye
    x.translate(-r * 0.3, r * 0.28);
    x.scale(1, 0.55);
    x.fillStyle = hexA('#06154a', 0.5);
    circle(r * 0.2)(x);
    x.fill();
    x.strokeStyle = hexA('#8fd8ff', 0.45);
    x.lineWidth = 2;
    x.beginPath();
    x.arc(0, 0, r * 0.14, 0.3, 4.4);
    x.stroke();
    x.restore();
    terminator(x, r, '#020822');
    rimLight(x, r, 'rgba(140,235,255,0.85)', 2.2);
    rimLight(x, r + 2.5, 'rgba(90,200,255,0.3)', 1.5, Math.PI * 0.8, Math.PI * 1.75);
  });
}

// S1/S2/S3 small companion moon.
function moon(r, light, mid, dark, rimCol) {
  return pieceCanvas(r * 2.6 + 6, (x) => {
    cel(x, circle(r), light, mid, dark, { off: r * 0.35, hi: 0.5, line: 1.2 });
    x.fillStyle = hexA(dark, 0.6);
    for (const [cx, cy, cr] of [
      [-0.3, 0.2, 0.2],
      [0.25, -0.3, 0.14],
      [0.35, 0.35, 0.12],
    ]) {
      x.beginPath();
      x.arc(cx * r, cy * r, cr * r, 0, TAU);
      x.fill();
    }
    rimLight(x, r, rimCol, 1.3);
  });
}

// S2: green living planet with continents and warm amber cloud bands.
function terraPlanet(r, rnd) {
  return pieceCanvas(r * 2.7, (x) => {
    atmosphere(x, r, '#9dff6b', 0.22, 1.2);
    atmosphere(x, r, '#ffb13d', 0.14, 1.34);
    sphereBase(x, r, '#2e8a86', '#145a5e', '#06262e');
    x.save();
    circle(r)(x);
    x.clip();
    // continents: lumpy blobs, cel shaded green
    for (let k = 0; k < 6; k++) {
      const cx = (rnd() - 0.5) * r * 1.6;
      const cy = (rnd() - 0.5) * r * 1.6;
      const cr = r * (0.22 + rnd() * 0.25);
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        const rr = cr * (0.65 + rnd() * 0.5);
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.8]);
      }
      const shape = (c) => {
        c.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const q = pts[(i + 1) % pts.length];
          const mx = (p[0] + q[0]) / 2;
          const my = (p[1] + q[1]) / 2;
          if (i === 0) c.moveTo(mx, my);
          else c.quadraticCurveTo(p[0], p[1], mx, my);
        }
        const p = pts[0];
        const q = pts[1];
        c.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
        c.closePath();
      };
      cel(x, shape, '#8fdc5a', '#3f9e3c', '#1d5a2a', { off: 1.6, hi: 0.5, outline: false });
    }
    // amber cloud streaks
    x.rotate(-0.2);
    x.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const y = (rnd() - 0.5) * r * 1.8;
      const x0 = (rnd() - 0.8) * r;
      const len = r * (0.4 + rnd() * 0.8);
      x.strokeStyle = hexA('#ffd9a0', 0.25 + rnd() * 0.2);
      x.lineWidth = 2 + rnd() * 3;
      x.beginPath();
      x.moveTo(x0, y);
      x.quadraticCurveTo(x0 + len / 2, y - 4 - rnd() * 4, x0 + len, y);
      x.stroke();
    }
    x.restore();
    terminator(x, r, '#031012');
    rimLight(x, r, 'rgba(200,255,150,0.85)', 2.2);
    rimLight(x, r + 2.5, 'rgba(255,190,90,0.35)', 1.5, Math.PI * 0.85, Math.PI * 1.7);
  });
}

// S3: faceted crystal planet with a glittering crystal ring.
function crystalPlanet(r, rnd) {
  const tilt = -0.32;
  const ring = (x, front) => {
    x.save();
    x.rotate(tilt);
    for (const [k, w, a] of [
      [1.62, 5, 0.35],
      [1.8, 2, 0.28],
      [1.45, 1.5, 0.3],
    ]) {
      x.strokeStyle = hexA('#8ff0ff', a);
      x.lineWidth = w;
      x.beginPath();
      x.ellipse(0, 0, r * k, r * k * 0.24, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
      x.stroke();
    }
    // crystal glints on the ring
    for (let i = 0; i < 26; i++) {
      const a = (front ? 0 : Math.PI) + rnd() * Math.PI;
      const k = 1.45 + rnd() * 0.35;
      const px = Math.cos(a) * r * k;
      const py = Math.sin(a) * r * k * 0.24;
      x.fillStyle = rnd() < 0.3 ? 'rgba(255,255,255,0.8)' : hexA(rnd() < 0.5 ? '#b27dff' : '#8ff0ff', 0.7);
      x.beginPath();
      x.moveTo(px, py - 2.2);
      x.lineTo(px + 1.2, py);
      x.lineTo(px, py + 2.2);
      x.lineTo(px - 1.2, py);
      x.fill();
    }
    x.restore();
  };
  return pieceCanvas(r * 3.9, (x) => {
    atmosphere(x, r, '#a45cff', 0.3);
    ring(x, false);
    sphereBase(x, r, '#9a7bff', '#4b2aa8', '#1a0a4a');
    x.save();
    circle(r)(x);
    x.clip();
    // facets: large triangles in alternating crystal tones
    const pts = [];
    for (let i = 0; i < 14; i++) pts.push([(rnd() - 0.5) * r * 2.2, (rnd() - 0.5) * r * 2.2]);
    for (let i = 0; i < pts.length - 2; i++) {
      const [a, b, c] = [pts[i], pts[i + 1], pts[i + 2]];
      x.fillStyle = i % 3 === 0 ? hexA('#c9b8ff', 0.18) : i % 3 === 1 ? hexA('#12053a', 0.25) : hexA('#6be8ff', 0.1);
      x.beginPath();
      x.moveTo(a[0], a[1]);
      x.lineTo(b[0], b[1]);
      x.lineTo(c[0], c[1]);
      x.fill();
      x.strokeStyle = hexA('#d8f8ff', 0.18);
      x.lineWidth = 0.8;
      x.stroke();
    }
    x.restore();
    terminator(x, r, '#07021c');
    rimLight(x, r, 'rgba(170,245,255,0.9)', 2);
    ring(x, true);
  });
}

// S4: molten planet: dark crust, glowing lava cracks, hot corona.
function lavaPlanet(r, rnd) {
  return pieceCanvas(r * 2.8, (x) => {
    atmosphere(x, r, '#ff4a1f', 0.38, 1.36);
    sphereBase(x, r, '#5a1d12', '#2c0c08', '#120404');
    x.save();
    circle(r)(x);
    x.clip();
    // magma seas
    for (let i = 0; i < 5; i++) {
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(255,120,40,0.55)');
      g.addColorStop(1, 'rgba(255,60,20,0)');
      x.save();
      x.translate((rnd() - 0.5) * r * 1.4, (rnd() - 0.5) * r * 1.4);
      x.scale(r * (0.2 + rnd() * 0.25), r * (0.12 + rnd() * 0.15));
      x.fillStyle = g;
      x.beginPath();
      x.arc(0, 0, 1, 0, TAU);
      x.fill();
      x.restore();
    }
    // branching cracks
    x.shadowColor = '#ff6a1f';
    x.shadowBlur = 6;
    for (let k = 0; k < 9; k++) {
      let px = (rnd() - 0.5) * r * 1.8;
      let py = (rnd() - 0.5) * r * 1.8;
      let a = rnd() * TAU;
      x.strokeStyle = rnd() < 0.4 ? '#ffd23f' : '#ff7a1f';
      x.lineWidth = 1 + rnd() * 1.4;
      x.beginPath();
      x.moveTo(px, py);
      for (let s = 0; s < 6; s++) {
        a += (rnd() - 0.5) * 1.3;
        px += Math.cos(a) * r * 0.14;
        py += Math.sin(a) * r * 0.14;
        x.lineTo(px, py);
      }
      x.stroke();
    }
    x.shadowBlur = 0;
    x.restore();
    terminator(x, r, '#050000', 0.62);
    rimLight(x, r, 'rgba(255,170,90,0.9)', 2.4);
    rimLight(x, r + 3, 'rgba(255,90,40,0.35)', 2, Math.PI * 0.8, Math.PI * 1.8);
  });
}

// S5: black hole with a tilted accretion disk and lensed halo.
function blackHole(r) {
  const tilt = -0.18;
  const disk = (x, front) => {
    x.save();
    x.rotate(tilt);
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const t = i / 15;
      const k = 1.25 + t * 1.6;
      const col = t < 0.2 ? '#fff0f8' : t < 0.5 ? '#ff5ec8' : t < 0.8 ? '#a23cff' : '#4b1fd1';
      x.strokeStyle = hexA(col, (front ? 0.3 : 0.2) * (1 - t * 0.7));
      x.lineWidth = 3.2;
      x.beginPath();
      x.ellipse(0, 0, r * k, r * k * 0.22, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
      x.stroke();
    }
    x.restore();
  };
  return pieceCanvas(r * 6.2, (x) => {
    const halo = x.createRadialGradient(0, 0, r, 0, 0, r * 3);
    halo.addColorStop(0, 'rgba(255,94,200,0.28)');
    halo.addColorStop(0.4, 'rgba(122,43,255,0.12)');
    halo.addColorStop(1, 'rgba(60,20,140,0)');
    x.fillStyle = halo;
    x.fillRect(-r * 3, -r * 3, r * 6, r * 6);
    disk(x, false);
    // lensed arc of the far disk bending over the top of the horizon
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      x.strokeStyle = hexA(i < 2 ? '#ffd0f0' : '#ff5ec8', 0.22 - i * 0.03);
      x.lineWidth = 3;
      x.beginPath();
      x.ellipse(0, 0, r * (1.18 + i * 0.12), r * (1.1 + i * 0.1), tilt, Math.PI * 1.02, Math.PI * 1.98);
      x.stroke();
    }
    x.restore();
    x.fillStyle = '#000000';
    circle(r)(x);
    x.fill();
    x.strokeStyle = 'rgba(255,230,250,0.9)';
    x.lineWidth = 1.6;
    circle(r + 0.8)(x);
    x.stroke();
    disk(x, true);
  });
}

// S5: eclipsed planet, a black disc with a thin violet rim.
function eclipsePlanet(r) {
  return pieceCanvas(r * 2.6, (x) => {
    atmosphere(x, r, '#7a2bff', 0.3, 1.18);
    x.fillStyle = '#05010c';
    circle(r)(x);
    x.fill();
    rimLight(x, r, 'rgba(210,150,255,0.8)', 2, Math.PI * 1.05, Math.PI * 1.7);
    rimLight(x, r + 2, 'rgba(255,94,200,0.35)', 1.5, Math.PI * 0.9, Math.PI * 1.85);
  });
}

// scene key -> list of set pieces { sprite, x (0..1), y (0..1), speed px/s }
export function buildPieces(kind, rnd) {
  switch (kind) {
    case 'meadow':
      return [
        { sprite: gasGiant(70, rnd), x: 0.96, y: 0.2, speed: 4 },
        { sprite: moon(9, '#c9e8ff', '#6c8fbf', '#243d6a', 'rgba(170,240,255,0.9)'), x: 0.12, y: 0.52, speed: 6 },
      ];
    case 'amber':
      return [
        { sprite: terraPlanet(60, rnd), x: 0.06, y: 0.26, speed: 4.5 },
        { sprite: moon(11, '#ffe0a8', '#c58a3d', '#5a3510', 'rgba(255,230,160,0.9)'), x: 0.84, y: 0.62, speed: 6 },
      ];
    case 'crystal':
      return [
        { sprite: crystalPlanet(40, rnd), x: 0.8, y: 0.3, speed: 4.5 },
        { sprite: moon(7, '#e6d8ff', '#8a6bd8', '#35207a', 'rgba(170,245,255,0.9)'), x: 0.16, y: 0.66, speed: 7 },
      ];
    case 'toxic':
      return [{ sprite: lavaPlanet(62, rnd), x: 0.9, y: 0.22, speed: 4.5 }];
    default:
      return [
        { sprite: blackHole(26), x: 0.82, y: 0.3, speed: 3 },
        { sprite: eclipsePlanet(84), x: -0.02, y: 0.72, speed: 2.5 },
      ];
  }
}

// ----------------------------------------------------------------- asteroids

// style: rock | crystal | lava | obsidian. pal = [light, mid, dark, accent]
export function asteroidSprite(style, pal, rnd) {
  const S = 40;
  const c = makeCanvas(S * 2, S * 2);
  const x = c.getContext('2d');
  x.scale(2, 2);
  x.translate(S / 2, S / 2);
  x.lineJoin = 'round';
  const pts = [];
  if (style === 'crystal' || style === 'obsidian') {
    const len = 15;
    const wid = 7 + rnd() * 2;
    pts.push([0, -len], [wid, -len * 0.35], [wid * 0.8, len * 0.6], [0, len * 0.85], [-wid * 0.9, len * 0.5], [-wid, -len * 0.4]);
  } else {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const r = 15 * (0.72 + rnd() * 0.3);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }
  const shape = (ctx) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  };
  cel(x, shape, pal[0], pal[1], pal[2], { off: 3, hi: 0.55, line: 1.8, ink: INK });
  x.save();
  shape(x);
  x.clip();
  if (style === 'crystal' || style === 'obsidian') {
    // facet lines + bright edge
    x.strokeStyle = hexA(pal[3], 0.7);
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(0, -15);
    x.lineTo(-1, 12);
    x.moveTo(-7, -6);
    x.lineTo(-1, 2);
    x.lineTo(6, -5);
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.35)';
    x.beginPath();
    x.moveTo(0, -15);
    x.lineTo(-7, -6);
    x.lineTo(-3, -2);
    x.closePath();
    x.fill();
  } else {
    x.fillStyle = hexA(pal[2], 0.75);
    for (let i = 0; i < 3; i++) {
      x.beginPath();
      x.arc((rnd() - 0.5) * 14, (rnd() - 0.5) * 14, 1.6 + rnd() * 2.4, 0, TAU);
      x.fill();
    }
    if (style === 'lava') {
      x.shadowColor = pal[3];
      x.shadowBlur = 4;
      x.strokeStyle = pal[3];
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(-10, -2);
      x.lineTo(-3, 1);
      x.lineTo(2, -4);
      x.lineTo(9, 3);
      x.moveTo(-3, 1);
      x.lineTo(-1, 8);
      x.stroke();
      x.shadowBlur = 0;
    }
  }
  x.restore();
  // rim light on the lit edge
  x.save();
  shape(x);
  x.clip();
  x.translate(1.4, 1.4);
  shape(x);
  x.strokeStyle = hexA(pal[3], 0.85);
  x.lineWidth = 1.4;
  x.stroke();
  x.restore();
  return { canvas: c, size: S };
}

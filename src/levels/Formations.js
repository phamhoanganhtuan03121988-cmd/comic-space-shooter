import { clamp, TAU } from '../core/math.js';

// Formation slot generators. Return an array of {x, y} target slots in
// logical coordinates. Called once per wave group (not per frame).

export const FORMATIONS = {
  row(n, o) {
    const sp = Math.min(o.spacing, (o.W - 60) / Math.max(1, n - 1));
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: o.cx + (i - (n - 1) / 2) * sp, y: o.cy });
    return out;
  },
  grid(n, o) {
    const rows = Math.max(1, o.rows || 2);
    const cols = Math.ceil(n / rows);
    const sp = Math.min(o.spacing, (o.W - 60) / Math.max(1, cols - 1));
    const out = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const inRow = Math.min(cols, n - r * cols);
      out.push({ x: o.cx + (c - (inRow - 1) / 2) * sp, y: o.cy + (r - (rows - 1) / 2) * 40 });
    }
    return out;
  },
  vee(n, o) {
    const out = [{ x: o.cx, y: o.cy + 40 }];
    for (let i = 1; i < n; i++) {
      const side = i % 2 ? -1 : 1;
      const k = Math.ceil(i / 2);
      out.push({ x: o.cx + side * k * o.spacing * 0.85, y: o.cy + 40 - k * 24 });
    }
    return out;
  },
  arc(n, o) {
    const out = [];
    const half = Math.min(150, (o.W - 50) / 2);
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      out.push({ x: o.cx + (u - 0.5) * 2 * half, y: o.cy + 30 - Math.sin(u * Math.PI) * 60 });
    }
    return out;
  },
  diamond(n, o) {
    const out = [];
    const r = 62;
    const pts = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
      [-0.5, -0.5],
      [0, 0],
    ];
    for (let i = 0; i < n; i++) {
      const p = pts[i % pts.length];
      const ring = Math.floor(i / pts.length);
      out.push({ x: o.cx + p[0] * (r + ring * 30), y: o.cy + p[1] * (r * 0.8 + ring * 24) });
    }
    return out;
  },
  circle(n, o) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - Math.PI / 2;
      out.push({ x: o.cx + Math.cos(a) * 80, y: o.cy + Math.sin(a) * 58 });
    }
    return out;
  },
  zigzag(n, o) {
    const out = FORMATIONS.row(n, o);
    for (let i = 0; i < out.length; i++) out[i].y += i % 2 ? 20 : -20;
    return out;
  },
  wings(n, o) {
    const out = [];
    const half = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const left = i < half;
      const k = left ? i : i - half;
      const col = k % 3;
      const row = Math.floor(k / 3);
      const side = left ? -1 : 1;
      out.push({ x: o.cx + side * (70 + col * 38), y: o.cy + row * 40 - col * 14 });
    }
    return out;
  },
  // --- added for sectors 6-15 ---------------------------------------
  // two columns hugging the screen edges (flanking pressure)
  flanks(n, o) {
    const out = [];
    const perSide = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? 1 : -1;
      const row = Math.floor(i / 2);
      out.push({ x: o.cx + side * 145, y: o.cy + (row - (perSide - 1) / 2) * 38 });
    }
    return out;
  },
  // hexagon ring, a centre slot, then a wider offset ring
  hex(n, o) {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (i === 6) {
        out.push({ x: o.cx, y: o.cy });
        continue;
      }
      const outer = i > 6;
      const k = outer ? i - 7 : i;
      const a = outer ? (k / 6) * TAU + Math.PI / 6 : (k / 6) * TAU - Math.PI / 2;
      const r = outer ? 112 + Math.floor(k / 6) * 26 : 62;
      out.push({ x: o.cx + Math.cos(a) * r, y: o.cy + Math.sin(a) * r * 0.72 });
    }
    return out;
  },
  // diagonal staircase across the screen
  stairs(n, o) {
    const out = [];
    const half = Math.min(150, (o.W - 60) / 2);
    for (let i = 0; i < n; i++) {
      const u = n === 1 ? 0.5 : i / (n - 1);
      out.push({ x: o.cx + (u - 0.5) * 2 * half, y: o.cy - 45 + u * 90 });
    }
    return out;
  },
  // row with alternating peaks, tallest in the middle
  crown(n, o) {
    const out = FORMATIONS.row(n, o);
    const mid = (n - 1) / 2;
    for (let i = 0; i < out.length; i++) out[i].y += Math.abs(i - mid) * 7 - (i % 2 === 0 ? 18 : 0);
    return out;
  },
};

export function formationSlots(name, count, opts) {
  const fn = FORMATIONS[name] || FORMATIONS.row;
  const o = {
    W: opts.W,
    cx: opts.x != null ? opts.x : opts.W / 2,
    cy: opts.y != null ? opts.y : 150,
    spacing: opts.spacing || 44,
    rows: opts.rows,
  };
  const slots = fn(count, o);
  for (const s of slots) {
    s.x = clamp(s.x, 24, opts.W - 24);
    s.y = clamp(s.y, 50, 320);
  }
  return slots;
}

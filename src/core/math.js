export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const chance = (p) => Math.random() < p;
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
};
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// Cubic bezier evaluated per axis (no allocation).
export function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// Triangle wave in [-1, 1].
export function tri(x) {
  const f = x - Math.floor(x);
  return f < 0.5 ? f * 4 - 1 : 3 - f * 4;
}

export function weightedPick(entries, weightOf) {
  let total = 0;
  for (const e of entries) total += weightOf(e);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= weightOf(e);
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

export function formatNumber(n) {
  return Math.floor(n).toLocaleString('en-US');
}

import { lerp, tri, TAU } from '../core/math.js';

// Parametric fly-through paths for 'pass' enemies. u goes 0 -> 1 over the
// group's duration. Writes the position into `out` (no allocations).

export const PASS_PATHS = {
  sine(u, p, W, H, out) {
    out.x = p.dir > 0 ? lerp(-30, W + 30, u) : lerp(W + 30, -30, u);
    out.y = p.y + Math.sin(u * TAU * 1.25) * p.amp;
  },
  dropSine(u, p, W, H, out) {
    out.y = lerp(-30, H + 30, u);
    out.x = p.x + Math.sin(u * TAU * 1.5) * p.amp * (p.dir || 1);
  },
  loop(u, p, W, H, out) {
    // descending loops (prolate cycloid)
    const a = u * TAU * 3;
    out.x = p.x + (p.dir || 1) * Math.sin(a) * 70;
    out.y = lerp(-80, H + 80, u) - Math.cos(a) * 60 + 60;
  },
  zigzag(u, p, W, H, out) {
    out.y = lerp(-30, H + 30, u);
    out.x = p.x + tri(u * 3 + 0.25) * p.amp;
  },
  cross(u, p, W, H, out) {
    const d = p.dir || 1;
    out.x = d > 0 ? lerp(-30, W + 30, u) : lerp(W + 30, -30, u);
    out.y = lerp(-30, H * 0.85, u) - Math.sin(u * Math.PI) * 60;
  },
  uturn(u, p, W, H, out) {
    out.x = lerp(p.x, W - p.x, u);
    out.y = -40 + Math.sin(u * Math.PI) * (H * 0.62);
  },
};

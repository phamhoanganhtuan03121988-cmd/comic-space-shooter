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
  // --- added for sectors 6-15 ---------------------------------------
  // corkscrew descent
  spiral(u, p, W, H, out) {
    const a = u * TAU * 2.5 * (p.dir || 1);
    out.x = p.x + Math.sin(a) * 58;
    out.y = lerp(-70, H + 70, u) + Math.cos(a) * 29 - 29;
  },
  // drop in to p.y, then hook out sideways
  hook(u, p, W, H, out) {
    const h = p.y;
    if (u < 0.45) {
      const k = u / 0.45;
      out.x = p.x;
      out.y = lerp(-30, h, 1 - (1 - k) * (1 - k));
    } else {
      const k = (u - 0.45) / 0.55;
      out.x = p.x + (p.dir || 1) * k * k * (W + 80);
      out.y = h + Math.sin(k * Math.PI * 0.5) * 90;
    }
  },
  // corner-to-corner sweep with a slight weave
  diag(u, p, W, H, out) {
    out.x = (p.dir || 1) > 0 ? lerp(-40, W + 40, u) : lerp(W + 40, -40, u);
    out.y = lerp(-40, H * 0.8, u) + Math.sin(u * TAU * 2) * 30;
  },
  // descend, circle once around (x, y), then peel away downwards
  orbit(u, p, W, H, out) {
    const R = 70;
    const d = p.dir || 1;
    if (u < 0.25) {
      out.x = p.x;
      out.y = lerp(-40, p.y - R, u / 0.25);
    } else if (u < 0.75) {
      const a = -Math.PI / 2 + d * ((u - 0.25) / 0.5) * TAU;
      out.x = p.x + Math.cos(a) * R;
      out.y = p.y + Math.sin(a) * R;
    } else {
      const k = (u - 0.75) / 0.25;
      out.x = p.x + d * k * k * W;
      out.y = lerp(p.y - R, H + 40, k);
    }
  },
};

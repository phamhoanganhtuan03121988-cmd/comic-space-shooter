// Shared "paint kit" for the polished 2D arcade look: hard-edged cel shading,
// inner rim light, specular streaks and emissive (glowing) parts. All of this
// runs only when sprites are built and cached, never per frame.
//
// Every helper takes `shape(ctx)`, a function that builds the path (no fill),
// so one outline can be shaded several times.

export const INK = '#120c2a';

// Horizontal light direction in the CURRENT coordinate space (-1 = light from
// the left). Mirrored halves flip it so the whole sprite is lit from one side.
let LIGHT_X = -1;
export function setLightX(v) {
  LIGHT_X = v;
}

// Cel-shaded fill: shadow colour as the base, the mid tone offset toward the
// light (top-left) leaves a hard shadow crescent on the bottom-right, then a
// smaller lit patch sits near the top-left. Finishes with a thick outline.
export function cel(ctx, shape, light, mid, dark, opts = {}) {
  const off = opts.off ?? 2.4; // size of the shadow crescent
  const hi = opts.hi ?? 0.55; // scale of the lit patch
  const lx = opts.lx ?? LIGHT_X; // light direction
  const ly = opts.ly ?? -1;
  ctx.save();
  shape(ctx);
  ctx.fillStyle = dark;
  ctx.fill();
  ctx.clip();
  ctx.save();
  ctx.translate(lx * off, ly * off);
  shape(ctx);
  ctx.fillStyle = mid;
  ctx.fill();
  ctx.restore();
  if (hi > 0) {
    const [cx, cy] = opts.hiAt || [0, 0];
    ctx.save();
    ctx.translate(cx + lx * off * 2.2, cy + ly * off * 2.2);
    ctx.scale(hi, hi);
    ctx.translate(-cx, -cy);
    shape(ctx);
    ctx.fillStyle = light;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  if (opts.outline !== false) {
    shape(ctx);
    ctx.strokeStyle = opts.ink || INK;
    ctx.lineWidth = opts.line ?? 2;
    ctx.stroke();
  }
}

// Bright inner edge on the lit side (reads as a metallic / glossy rim).
export function rim(ctx, shape, color = 'rgba(255,255,255,0.85)', width = 1.4, d = 1.2) {
  ctx.save();
  shape(ctx);
  ctx.clip();
  ctx.translate(-LIGHT_X * d, d);
  shape(ctx);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

// Sharp specular streak (tapered, slightly curved).
export function spec(ctx, x, y, len, wid, rot = -0.6, alpha = 0.9) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
  ctx.beginPath();
  ctx.moveTo(0, -len / 2);
  ctx.quadraticCurveTo(wid, 0, 0, len / 2);
  ctx.quadraticCurveTo(-wid * 0.3, 0, 0, -len / 2);
  ctx.fill();
  ctx.restore();
}

export function dot(ctx, x, y, r, alpha = 0.9) {
  ctx.fillStyle = 'rgba(255,255,255,' + alpha + ')';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// Emissive part: glowing fill (shadowBlur baked at cache time) + hot core.
export function emissive(ctx, shape, color, core = '#ffffff', blur = 10) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  shape(ctx);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
  if (core) {
    ctx.save();
    shape(ctx);
    ctx.clip();
    ctx.globalAlpha = 0.85;
    ctx.translate(-0.6, -0.6);
    ctx.scale(0.96, 0.96);
    shape(ctx);
    ctx.lineWidth = 1;
    ctx.strokeStyle = core;
    ctx.stroke();
    ctx.restore();
  }
}

// Panel line (thin dark seam) with a light edge under it for bevel depth.
export function seam(ctx, points, dark = 'rgba(18,12,42,0.55)', light = 'rgba(255,255,255,0.35)') {
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = light;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    if (i === 0) ctx.moveTo(x + 0.6, y + 0.6);
    else ctx.lineTo(x + 0.6, y + 0.6);
  }
  ctx.stroke();
  ctx.strokeStyle = dark;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

// Build a polygon path from [[x,y],...].
export function poly(points, close = true) {
  return (ctx) => {
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    }
    if (close) ctx.closePath();
  };
}

// Mirror an [[x,y]] list across x = 0.
export function mirror(points) {
  return points.map(([x, y]) => [-x, y]);
}

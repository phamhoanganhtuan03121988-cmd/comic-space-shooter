import { makeSprite, cached, whiteVersion, hexA, ellipse } from './Sprites.js';
import { cel, rim, spec, emissive, seam, poly, INK, setLightX } from './Paint.js';
import { TAU } from '../core/math.js';

// "Starhopper" — the player's fighter, polished arcade style: long pointed
// nose, forward bubble canopy, wide swept blade wings with glowing leading
// edges, canards, twin main engines + two wing engines. Hard cel-shaded
// white hull with coloured armour panels; the colour scheme follows weapon
// power (LV1 red, LV2 blue, LV3 green, LV4 gold). Everything is drawn once
// into cached sprites.

const SIZE_W = 86;
const SIZE_H = 80;

export const SHIP_TIERS = [1, 2, 3, 4];

const SCHEMES = {
  1: { light: '#ff8a96', mid: '#e8283f', dark: '#9c0f28', glow: '#3fb6ff', trim: '#b8ecff' },
  2: { light: '#8fb5ff', mid: '#2f6bff', dark: '#1a3a9c', glow: '#5ef3ff', trim: '#d6fbff' },
  3: { light: '#9dffc4', mid: '#22c267', dark: '#0f7a3e', glow: '#b8ff3d', trim: '#efffd0' },
  4: { light: '#fff0a0', mid: '#ffb31a', dark: '#b36b00', glow: '#ff6ad5', trim: '#ffe0f6' },
};

// Engine exhaust points [x, y, size] (used by Player.render / menu).
export const FLAME_POINTS = [
  [-6.5, 27, 1],
  [6.5, 27, 1],
  [-22.5, 25, 0.62],
  [22.5, 25, 0.62],
];

const HULL = { light: '#ffffff', mid: '#e8e6f7', dark: '#9d99c9' };

// --- shapes (right half; left half is mirrored) ---------------------------
const fuselage = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.bezierCurveTo(4, -30, 7.5, -20, 8.5, -8);
  ctx.lineTo(9.5, 6);
  ctx.quadraticCurveTo(9.5, 20, 5, 25);
  ctx.lineTo(-5, 25);
  ctx.quadraticCurveTo(-9.5, 20, -9.5, 6);
  ctx.lineTo(-8.5, -8);
  ctx.bezierCurveTo(-7.5, -20, -4, -30, 0, -34);
  ctx.closePath();
};

// swept arrowhead blade
const wingR = poly([
  [7, -8],
  [21, 3],
  [36, 16],
  [35.5, 22],
  [25, 19],
  [11, 17],
]);

// second, rear blade layered under the main wing
const tailR = poly([
  [8, 10],
  [22, 19],
  [28, 28],
  [21, 27.5],
  [8, 22],
]);

const wingEdgeR = poly([
  [8.4, -6.3],
  [35.6, 15.3],
  [35.4, 17.8],
  [8.1, -3.2],
]);

const tailEdgeR = poly([
  [9, 11],
  [27.6, 26.6],
  [27, 28],
  [9, 13.4],
]);

const canardR = poly([
  [6.5, -17],
  [15, -9],
  [14.5, -5.5],
  [7.5, -9],
]);

const noseCap = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.bezierCurveTo(3.5, -30.5, 5.5, -26, 6, -22.5);
  ctx.quadraticCurveTo(0, -24.5, -6, -22.5);
  ctx.bezierCurveTo(-5.5, -26, -3.5, -30.5, 0, -34);
  ctx.closePath();
};

const canopy = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(0, -23);
  ctx.bezierCurveTo(4.2, -19.5, 4.6, -11, 3.4, -6);
  ctx.quadraticCurveTo(0, -3.5, -3.4, -6);
  ctx.bezierCurveTo(-4.6, -11, -4.2, -19.5, 0, -23);
  ctx.closePath();
};

function rr(x, y, w, h, r) {
  return (ctx) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
}

function mirrored(ctx, fn) {
  ctx.save();
  fn(1);
  ctx.restore();
  ctx.save();
  ctx.scale(-1, 1);
  setLightX(1); // keep the light coming from the screen's left
  fn(-1);
  setLightX(-1);
  ctx.restore();
}

function drawShip(ctx, tier) {
  const C = SCHEMES[tier] || SCHEMES[1];
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // soft under-glow in the scheme's accent colour
  const aura = ctx.createRadialGradient(0, 4, 6, 0, 4, 40);
  aura.addColorStop(0, hexA(C.glow, 0.22));
  aura.addColorStop(1, hexA(C.glow, 0));
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 4, 40, 0, TAU);
  ctx.fill();

  // rear blades + wing engines (behind the main wings)
  mirrored(ctx, () => {
    cel(ctx, tailR, C.light, C.mid, C.dark, { off: 1.6, hi: 0.45, hiAt: [16, 18], line: 1.8 });
    emissive(ctx, tailEdgeR, C.glow, '#ffffff', 8);
    cel(ctx, rr(19.5, 13, 6, 12, 2.5), '#e6ebff', '#8f98c9', '#4a5288', { off: 1.4, hi: 0.4, hiAt: [22.5, 18], line: 1.6 });
    ctx.fillStyle = '#2a2f5c';
    ctx.fillRect(20.4, 22.5, 4.2, 2.5);
    if (tier >= 2) {
      // under-wing missile pod
      cel(ctx, rr(28, 18, 4.6, 11, 2.3), '#ffffff', '#d0d4f0', '#7b82b3', { off: 1.1, hi: 0.4, hiAt: [30, 23], line: 1.4 });
      ctx.fillStyle = C.mid;
      ctx.beginPath();
      ctx.moveTo(28.4, 19.5);
      ctx.lineTo(30.3, 15.5);
      ctx.lineTo(32.2, 19.5);
      ctx.fill();
    }
  });

  // main wings: coloured armour blades with glowing leading edge
  mirrored(ctx, () => {
    cel(ctx, wingR, C.light, C.mid, C.dark, { off: 2.2, hi: 0.5, hiAt: [21, 7], line: 2.1 });
    rim(ctx, wingR, 'rgba(255,255,255,0.7)', 1.2, 1);
    // white chevron stripe + panel seams
    cel(ctx, poly([[12, 5.5], [30, 17.5], [28.5, 19.2], [11.2, 9]]), '#ffffff', '#ebe9f8', '#b1add6', { off: 0.8, hi: 0, line: 1 });
    seam(ctx, [[15, -0.5], [17, 17]]);
    seam(ctx, [[25, 8.5], [26.5, 19]]);
    emissive(ctx, wingEdgeR, C.glow, '#ffffff', 10);
    // wingtip cannon with glowing muzzle light
    cel(ctx, rr(33, 6, 4.6, 18, 2.2), '#ffffff', '#c8cdea', '#6f77a8', { off: 1.2, hi: 0.4, hiAt: [35, 13], line: 1.5 });
    emissive(ctx, (c) => ellipse(c, 35.3, 8, 1.6, 2.2), C.glow, '#ffffff', 8);
    if (tier >= 4) {
      // gold tail fins
      cel(ctx, poly([[14, 19], [22, 31], [17, 31], [11, 22]]), '#fff6c2', '#ffd23f', '#b36b00', { off: 1, hi: 0.5, hiAt: [16, 25], line: 1.4 });
    }
    cel(ctx, canardR, C.light, C.mid, C.dark, { off: 1.2, hi: 0.5, hiAt: [11, -9], line: 1.6 });
  });

  // main engines
  mirrored(ctx, () => {
    cel(ctx, rr(3.2, 11, 7, 16, 3), '#eef1ff', '#99a2d4', '#4e568f', { off: 1.5, hi: 0.45, hiAt: [6.5, 18], line: 1.7 });
    ctx.fillStyle = '#2a2f5c';
    ctx.fillRect(4.2, 24, 5, 3);
  });

  // fuselage (hard-shaded white hull)
  cel(ctx, fuselage, HULL.light, HULL.mid, HULL.dark, { off: 2.6, hi: 0.5, hiAt: [-2, -6], line: 2.2 });
  rim(ctx, fuselage, 'rgba(255,255,255,0.95)', 1.3, 1.2);
  // coloured armour stripes down the hull
  mirrored(ctx, () => {
    cel(ctx, poly([[5.5, -14], [8.6, -6], [9.4, 8], [6.2, 10], [4.4, -4]]), C.light, C.mid, C.dark, { off: 1, hi: 0.5, hiAt: [7, -2], line: 1.2 });
  });
  // nose cap
  cel(ctx, noseCap, C.light, C.mid, C.dark, { off: 1.4, hi: 0.5, hiAt: [0, -29], line: 1.8 });
  spec(ctx, -1.8, -28, 6, 1.6, 0.2, 0.9);
  // panel seams
  seam(ctx, [[-8.6, 3], [8.6, 3]]);
  seam(ctx, [[-8.8, 13], [8.8, 13]]);
  seam(ctx, [[0, 3], [0, 23]]);

  // canopy: dark frame + cyan glass with big reflection
  ctx.save();
  ctx.translate(0, 0.8);
  ctx.scale(1.18, 1.1);
  ctx.translate(0, -0.8);
  canopy(ctx);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.restore();
  const cg = ctx.createLinearGradient(-4, -22, 4, -5);
  cg.addColorStop(0, '#dcffff');
  cg.addColorStop(0.35, '#5ef3ff');
  cg.addColorStop(0.75, '#1a7ad8');
  cg.addColorStop(1, '#0b2c78');
  canopy(ctx);
  ctx.fillStyle = cg;
  ctx.fill();
  spec(ctx, -1.6, -15, 10, 2, 0.08, 0.95);
  spec(ctx, 1.8, -9, 4, 0.9, 0.15, 0.55);

  // emissive details: belly core + running lights
  emissive(ctx, (c) => ellipse(c, 0, 16.5, 2.3, 3.4), '#ffd23f', '#ffffff', 9);
  emissive(ctx, (c) => ellipse(c, -6.8, -2, 0.9, 1.6), C.glow, null, 6);
  emissive(ctx, (c) => ellipse(c, 6.8, -2, 0.9, 1.6), C.glow, null, 6);
}

// Map weapon power 1..5 to the four looks.
export function shipTier(power) {
  return power >= 5 ? 4 : power >= 4 ? 3 : power >= 3 ? 2 : 1;
}

export function shipSprite(tier = 1) {
  return cached('ship2:' + tier, () => makeSprite(SIZE_W, SIZE_H, (ctx) => drawShip(ctx, tier)));
}

export function shipWhite(tier = 1) {
  return cached('shipWhite2:' + tier, () => whiteVersion(shipSprite(tier)));
}

// Engine flame (outer cone), stretched vertically at runtime for flicker.
export function flameSprite() {
  return cached('flame2', () =>
    makeSprite(16, 36, (ctx) => {
      const g = ctx.createLinearGradient(0, -18, 0, 18);
      g.addColorStop(0, '#fff8d6');
      g.addColorStop(0.18, '#ffd23f');
      g.addColorStop(0.5, '#ff7a1f');
      g.addColorStop(0.8, hexA('#ff2e6e', 0.55));
      g.addColorStop(1, hexA('#ff2e6e', 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-7, -18);
      ctx.bezierCurveTo(-7.5, -4, -3, 8, 0, 18);
      ctx.bezierCurveTo(3, 8, 7.5, -4, 7, -18);
      ctx.closePath();
      ctx.fill();
    })
  );
}

// White-hot inner core of the flame (drawn additively on top of the cone).
export function flameCoreSprite() {
  return cached('flameCore2', () =>
    makeSprite(8, 22, (ctx) => {
      const g = ctx.createLinearGradient(0, -11, 0, 11);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.5, '#e6fbff');
      g.addColorStop(1, 'rgba(160,230,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-3.2, -11);
      ctx.quadraticCurveTo(-2.5, 3, 0, 11);
      ctx.quadraticCurveTo(2.5, 3, 3.2, -11);
      ctx.closePath();
      ctx.fill();
    })
  );
}

export function shieldBubbleSprite() {
  return cached('shieldBubble', () =>
    makeSprite(84, 84, (ctx) => {
      const g = ctx.createRadialGradient(0, 0, 20, 0, 0, 40);
      g.addColorStop(0, 'rgba(67,230,255,0)');
      g.addColorStop(0.7, 'rgba(67,230,255,0.18)');
      g.addColorStop(0.93, 'rgba(120,240,255,0.55)');
      g.addColorStop(1, 'rgba(200,255,255,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,250,255,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 16, Math.sin(a) * 16);
        ctx.lineTo(Math.cos(a) * 38, Math.sin(a) * 38);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, TAU);
      ctx.stroke();
      ctx.shadowColor = '#5ef3ff';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = 'rgba(230,255,255,0.9)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 39, 0, TAU);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ellipse(ctx, -15, -20, 9, 4.5, -0.6);
      ctx.fill();
    })
  );
}

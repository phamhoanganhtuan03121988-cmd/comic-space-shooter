import { makeSprite, cached, whiteVersion, hexA, ellipse } from './Sprites.js';
import { TAU } from '../core/math.js';

// "Starhopper" — the player's original fighter: glossy white hull, red swept
// wings with glowing blue wingtips, chrome trims and a big cyan bubble
// cockpit. Three visual tiers follow weapon power (1-2, 3-4, 5): extra wing
// pods and gold trims. Everything is drawn once into cached sprites (glow is
// baked with shadowBlur at cache time, never per frame).

const OUT = '#16122e';
const SIZE = 76; // sprite box (hull fits in ~60, rest is glow padding)

function glowStroke(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow(ctx) {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

function wing(ctx, tier) {
  // main wing
  const wg = ctx.createLinearGradient(6, -6, 26, 20);
  wg.addColorStop(0, '#ff5a6a');
  wg.addColorStop(0.55, '#e0213f');
  wg.addColorStop(1, '#8e0f2a');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.moveTo(6, -8);
  ctx.lineTo(28, 9);
  ctx.quadraticCurveTo(31, 16, 27, 20);
  ctx.lineTo(9, 17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // leading edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(8, -5.5);
  ctx.lineTo(26, 8.5);
  ctx.stroke();
  // white stripe + panel line
  ctx.fillStyle = '#f4f2ff';
  ctx.beginPath();
  ctx.moveTo(11, 5);
  ctx.lineTo(23, 13);
  ctx.lineTo(22, 15.5);
  ctx.lineTo(10.5, 9);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,0,20,0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(13, 1);
  ctx.lineTo(15, 16);
  ctx.stroke();
  // wingtip cannon with glowing blue light
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.8;
  const cg = ctx.createLinearGradient(24, 0, 29, 0);
  cg.addColorStop(0, '#d8e2ff');
  cg.addColorStop(1, '#6f7fb8');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(24, -1, 5, 17, 2.5) : ctx.rect(24, -1, 5, 17);
  ctx.fill();
  ctx.stroke();
  glowStroke(ctx, '#3fb6ff', 8);
  ctx.fillStyle = '#7fd8ff';
  ctx.beginPath();
  ctx.arc(26.5, 11, 2.2, 0, TAU);
  ctx.fill();
  noGlow(ctx);
  if (tier >= 2) {
    // extra missile pod under the wing
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.fillStyle = '#3d4a80';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(16, 14, 6, 12, 3) : ctx.rect(16, 14, 6, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(17.2, 15, 3.6, 2);
  }
  if (tier >= 3) {
    // gold trim fin
    ctx.fillStyle = '#ffd23f';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(20, 4);
    ctx.lineTo(30, -6);
    ctx.lineTo(27, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawShip(ctx, tier) {
  ctx.lineJoin = 'round';
  // soft cyan aura baked behind the silhouette
  const aura = ctx.createRadialGradient(0, 2, 8, 0, 2, 36);
  aura.addColorStop(0, 'rgba(90,200,255,0.28)');
  aura.addColorStop(1, 'rgba(90,200,255,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 2, 36, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;

  // engine pods + glowing nozzles
  for (const sx of [-1, 1]) {
    const pg = ctx.createLinearGradient(sx * 9 - 5, 0, sx * 9 + 5, 0);
    pg.addColorStop(0, '#46528a');
    pg.addColorStop(0.5, '#9aa6d8');
    pg.addColorStop(1, '#3a4478');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(sx * 9 - 5, 10, 10, 16, 3.5) : ctx.rect(sx * 9 - 5, 10, 10, 16);
    ctx.fill();
    ctx.stroke();
    glowStroke(ctx, '#ff9b3d', 8);
    ctx.fillStyle = '#ffb35e';
    ellipse(ctx, sx * 9, 26, 3.6, 1.8);
    ctx.fill();
    noGlow(ctx);
  }

  // wings
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.scale(sx, 1);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    wing(ctx, tier);
    ctx.restore();
  }

  // fuselage (glossy white, cool shading on the right)
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.2;
  const g = ctx.createLinearGradient(-13, 0, 13, 0);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#f3f1ff');
  g.addColorStop(0.75, '#c3c0ee');
  g.addColorStop(1, '#8e8ad0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(9, -25, 13, -6, 12.5, 12);
  ctx.quadraticCurveTo(11.5, 22, 0, 23);
  ctx.quadraticCurveTo(-11.5, 22, -12.5, 12);
  ctx.bezierCurveTo(-13, -6, -9, -25, 0, -30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // red nose cone
  const ng = ctx.createLinearGradient(-8, -30, 8, -18);
  ng.addColorStop(0, '#ff6d7a');
  ng.addColorStop(1, '#c4152f');
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(5, -27.5, 7.5, -22, 8, -17.5);
  ctx.quadraticCurveTo(0, -20.5, -8, -17.5);
  ctx.bezierCurveTo(-7.5, -22, -5, -27.5, 0, -30);
  ctx.fill();
  // blue belly stripe
  ctx.fillStyle = '#2f7dff';
  ctx.beginPath();
  ctx.moveTo(-3, 5);
  ctx.lineTo(3, 5);
  ctx.lineTo(2, 20);
  ctx.lineTo(-2, 20);
  ctx.closePath();
  ctx.fill();
  // chrome highlight down the left side
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.quadraticCurveTo(-10, -4, -9.5, 12);
  ctx.stroke();
  // panel lines
  ctx.strokeStyle = 'rgba(40,30,90,0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-11, 8);
  ctx.lineTo(11, 8);
  ctx.moveTo(-10, 15);
  ctx.lineTo(10, 15);
  ctx.stroke();

  // cockpit: layered glass with reflections
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  const cg = ctx.createRadialGradient(-2, -9, 1, 0, -4, 11);
  cg.addColorStop(0, '#eaffff');
  cg.addColorStop(0.35, '#5ef3ff');
  cg.addColorStop(0.8, '#1a74d6');
  cg.addColorStop(1, '#0c2f7a');
  ctx.fillStyle = cg;
  ellipse(ctx, 0, -5, 7, 10.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ellipse(ctx, -2.6, -9.5, 1.9, 3.6, -0.3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -5, 5.2, 0.3, 1.3);
  ctx.stroke();

  // glowing belly core + running lights
  glowStroke(ctx, '#ffd23f', 8);
  ctx.fillStyle = '#ffe680';
  ctx.beginPath();
  ctx.arc(0, 11, 2.6, 0, TAU);
  ctx.fill();
  glowStroke(ctx, '#5ef3ff', 6);
  ctx.fillStyle = '#b8fbff';
  ctx.beginPath();
  ctx.arc(-6, 2, 1.2, 0, TAU);
  ctx.arc(6, 2, 1.2, 0, TAU);
  ctx.fill();
  noGlow(ctx);
}

// tier: 1 (power 1-2), 2 (power 3-4), 3 (power 5)
export function shipTier(power) {
  return power >= 5 ? 3 : power >= 3 ? 2 : 1;
}

export function shipSprite(tier = 1) {
  return cached('ship:' + tier, () => makeSprite(SIZE, SIZE, (ctx) => drawShip(ctx, tier)));
}

export function shipWhite(tier = 1) {
  return cached('shipWhite:' + tier, () => whiteVersion(shipSprite(tier)));
}

// Engine flame, outer cone: stretched vertically at runtime for flicker.
export function flameSprite() {
  return cached('flame', () =>
    makeSprite(16, 34, (ctx) => {
      const g = ctx.createLinearGradient(0, -17, 0, 17);
      g.addColorStop(0, '#fff6c8');
      g.addColorStop(0.2, '#ffcf4a');
      g.addColorStop(0.55, '#ff6a3d');
      g.addColorStop(1, hexA('#ff2e88', 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-7, -17);
      ctx.quadraticCurveTo(-6, 5, 0, 17);
      ctx.quadraticCurveTo(6, 5, 7, -17);
      ctx.closePath();
      ctx.fill();
    })
  );
}

// White-hot inner core of the flame (drawn additively on top of the cone).
export function flameCoreSprite() {
  return cached('flameCore', () =>
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
      // hex energy pattern
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

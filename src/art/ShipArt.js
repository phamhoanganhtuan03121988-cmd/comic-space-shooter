import { makeSprite, cached, whiteVersion, hexA, ellipse } from './Sprites.js';
import { TAU } from '../core/math.js';

// "Starhopper" — the player's original fighter: a chubby cream fuselage,
// coral swept wings, teal wingtips and a big bubble cockpit with a little
// antenna. Drawn procedurally; swap for a PNG of the same size later.

const OUT = '#1b1033';

function drawShip(ctx) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.2;

  // engine pods
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#5b6b9a';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(sx * 9 - 4.5, 12, 9, 13, 3) : ctx.rect(sx * 9 - 4.5, 12, 9, 13);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2b3558';
    ctx.fillRect(sx * 9 - 3, 22, 6, 3);
  }

  // wings
  for (const sx of [-1, 1]) {
    ctx.save();
    ctx.scale(sx, 1);
    ctx.fillStyle = '#ff6b5e';
    ctx.beginPath();
    ctx.moveTo(6, -4);
    ctx.lineTo(26, 10);
    ctx.quadraticCurveTo(28, 18, 22, 19);
    ctx.lineTo(8, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // wing stripe
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(11, 4);
    ctx.lineTo(20, 11);
    ctx.lineTo(18, 13.5);
    ctx.lineTo(10, 8);
    ctx.closePath();
    ctx.fill();
    // wingtip cannon
    ctx.fillStyle = '#35e0d0';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(21, 2, 5, 14, 2.5) : ctx.rect(21, 2, 5, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // fuselage
  const g = ctx.createLinearGradient(-12, 0, 12, 0);
  g.addColorStop(0, '#d9d4ff');
  g.addColorStop(0.45, '#ffffff');
  g.addColorStop(1, '#b9b2ee');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -27);
  ctx.bezierCurveTo(10, -22, 13, -4, 12, 12);
  ctx.quadraticCurveTo(11, 20, 0, 21);
  ctx.quadraticCurveTo(-11, 20, -12, 12);
  ctx.bezierCurveTo(-13, -4, -10, -22, 0, -27);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // nose stripe
  ctx.fillStyle = '#ff6b5e';
  ctx.beginPath();
  ctx.moveTo(0, -27);
  ctx.bezierCurveTo(5, -24.5, 7, -20, 7.5, -16);
  ctx.quadraticCurveTo(0, -18.5, -7.5, -16);
  ctx.bezierCurveTo(-7, -20, -5, -24.5, 0, -27);
  ctx.fill();

  // cockpit
  const cg = ctx.createRadialGradient(-2, -6, 1, 0, -3, 9);
  cg.addColorStop(0, '#d8ffff');
  cg.addColorStop(0.5, '#4de1ff');
  cg.addColorStop(1, '#1a6bb5');
  ctx.fillStyle = cg;
  ellipse(ctx, 0, -3, 6.5, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ellipse(ctx, -2.3, -7, 1.8, 3.2, -0.3);
  ctx.fill();

  // belly light
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(0, 12, 2.6, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

export function shipSprite() {
  return cached('ship', () => makeSprite(60, 60, drawShip));
}

export function shipWhite() {
  return cached('shipWhite', () => whiteVersion(shipSprite()));
}

// Engine flame: drawn stretched vertically at runtime for flicker.
export function flameSprite() {
  return cached('flame', () =>
    makeSprite(14, 30, (ctx) => {
      const g = ctx.createLinearGradient(0, -15, 0, 15);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.25, '#fff27a');
      g.addColorStop(0.6, '#ff8c42');
      g.addColorStop(1, hexA('#ff3d6e', 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-6, -15);
      ctx.quadraticCurveTo(-5, 4, 0, 15);
      ctx.quadraticCurveTo(5, 4, 6, -15);
      ctx.closePath();
      ctx.fill();
    })
  );
}

export function shieldBubbleSprite() {
  return cached('shieldBubble', () =>
    makeSprite(80, 80, (ctx) => {
      const g = ctx.createRadialGradient(0, 0, 22, 0, 0, 38);
      g.addColorStop(0, 'rgba(67,230,255,0)');
      g.addColorStop(0.75, 'rgba(67,230,255,0.25)');
      g.addColorStop(1, 'rgba(160,250,255,0.85)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 38, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,255,255,0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 37, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ellipse(ctx, -14, -18, 8, 4, -0.6);
      ctx.fill();
    })
  );
}

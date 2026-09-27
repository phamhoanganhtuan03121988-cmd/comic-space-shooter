import { makeSprite, cached, whiteVersion, ellipse, shade, hexA, makeCanvas, SPR } from './Sprites.js';
import { TAU } from '../core/math.js';
import { cel, rim, spec, emissive, dot, setLightX, INK } from './Paint.js';

// Original space critters in the polished arcade style: hard cel shading,
// strong silhouettes, a distinct material per species (slime, robot, armour
// + crystal, squid + metal, glass jelly, spiky fish), emissive details and
// rim light. Each sprite is rendered once per animation frame and gets a
// coloured glow halo baked around its silhouette. Hitboxes come from
// data/enemies.js and are not affected by the art size.

const PINK = INK;

// Frames per critter (Enemy.js cycles through them).
export const ENEMY_FRAMES = { blobling: 2, zipfly: 3, rockshell: 2, spitter: 2, swirlie: 3, spikeling: 3 };

// Draw fn(side) for the right half, then mirrored for the left half, keeping
// the light coming from the screen's left on both.
function mirror(ctx, fn) {
  ctx.save();
  fn(1);
  ctx.restore();
  ctx.save();
  ctx.scale(-1, 1);
  setLightX(1);
  fn(-1);
  setLightX(-1);
  ctx.restore();
}

// Cartoon eye: sclera, coloured iris, pupil (round or slit), double highlight.
function eyeBall(ctx, x, y, r, iris, opts = {}) {
  if (opts.closed) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r, y - 0.5);
    ctx.quadraticCurveTo(x, y + r * 0.8, x + r, y - 0.5);
    ctx.stroke();
    return;
  }
  cel(ctx, (c) => {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
  }, '#ffffff', '#f1efff', '#b9b4e0', { off: r * 0.22, hi: 0, line: 1.8 });
  const px = x + (opts.lookX || 0) * r * 0.25;
  const py = y + (opts.lookY ?? 0.35) * r * 0.3;
  const ir = r * (opts.irisScale || 0.62);
  if (opts.glow) {
    emissive(ctx, (c) => {
      c.beginPath();
      c.arc(px, py, ir, 0, TAU);
    }, iris, null, 8);
  }
  const g = ctx.createRadialGradient(px - ir * 0.3, py - ir * 0.3, ir * 0.1, px, py, ir);
  g.addColorStop(0, shade(iris, 0.45));
  g.addColorStop(0.6, iris);
  g.addColorStop(1, shade(iris, -0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(px, py, ir, 0, TAU);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  if (opts.slit) ctx.ellipse(px, py, ir * 0.24, ir * 0.78, 0, 0, TAU);
  else ctx.arc(px, py, ir * 0.48, 0, TAU);
  ctx.fill();
  dot(ctx, px - ir * 0.38, py - ir * 0.4, ir * 0.3, 1);
  dot(ctx, px + ir * 0.35, py + ir * 0.3, ir * 0.13, 0.8);
}

const ART = {
  // Cyclops goo pod: translucent slime, dark nucleus, glowing antenna bulb.
  blobling(ctx, f) {
    // antenna
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-2, -13);
    ctx.bezierCurveTo(-3, -19, 4, -19, 5, -23);
    ctx.stroke();
    ctx.strokeStyle = '#7ef06a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    emissive(ctx, (c) => {
      c.beginPath();
      c.arc(5, -24, 3.2, 0, TAU);
    }, '#e8ff4a', '#ffffff', 10);
    // body
    const goo = (c) => {
      c.beginPath();
      c.moveTo(-17, 6);
      c.bezierCurveTo(-19, -19, 19, -19, 17, 6);
      c.quadraticCurveTo(17, 12, 12.5, 11.5);
      c.quadraticCurveTo(10, 18.5, 6.5, 12);
      c.quadraticCurveTo(3, 14.5, 0, 12.5);
      c.quadraticCurveTo(-3.5, 17, -6.5, 12);
      c.quadraticCurveTo(-10.5, 15, -12.5, 11.5);
      c.quadraticCurveTo(-17, 12, -17, 6);
      c.closePath();
    };
    cel(ctx, goo, '#d6ffb0', '#56e04a', '#1c8a2c', { off: 2.8, hi: 0.55, hiAt: [-4, -4], line: 2.2 });
    // translucent inner nucleus + bubbles
    ctx.save();
    goo(ctx);
    ctx.clip();
    ctx.fillStyle = 'rgba(10,80,30,0.35)';
    ctx.beginPath();
    ctx.ellipse(3, 6, 9, 5.5, 0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,255,200,0.55)';
    ctx.beginPath();
    ctx.arc(-10, 4, 1.8, 0, TAU);
    ctx.arc(11, -3, 1.3, 0, TAU);
    ctx.arc(8, 8, 1, 0, TAU);
    ctx.fill();
    ctx.restore();
    rim(ctx, goo, 'rgba(235,255,220,0.9)', 1.6, 1.3);
    spec(ctx, -10, -7, 9, 2.4, 0.55, 0.85);
    // cyclops eye with heavy lid
    if (f === 1) eyeBall(ctx, 0, -3, 7.5, '#d4ff3a', { closed: true });
    else eyeBall(ctx, 0, -3, 7.5, '#c8ff2e', { glow: true, slit: true });
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -3, 8.3, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    // grin with tiny fangs
    ctx.fillStyle = '#3a0a1c';
    ctx.beginPath();
    ctx.moveTo(-5, 6.5);
    ctx.quadraticCurveTo(0, 10.5, 5, 6.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-3.3, 7);
    ctx.lineTo(-2.4, 9);
    ctx.lineTo(-1.5, 7.3);
    ctx.moveTo(1.5, 7.3);
    ctx.lineTo(2.4, 9);
    ctx.lineTo(3.3, 7);
    ctx.fill();
  },

  // Robotic space bee: black armoured helmet with a halo antenna, two big
  // glowing lens eyes, amber banded abdomen, two pairs of neon wings.
  zipfly(ctx, f) {
    const flap = [-0.5, -0.12, 0.25][f];
    const wing = (rx, ry) => (c) => {
      c.beginPath();
      c.moveTo(0, 0);
      c.bezierCurveTo(rx * 0.35, -ry * 1.1, rx * 1.05, -ry * 0.9, rx, -ry * 0.15);
      c.bezierCurveTo(rx * 0.95, ry * 0.45, rx * 0.4, ry * 0.5, 0, 0);
      c.closePath();
    };
    for (const sx of [-1, 1]) {
      for (const [len, h, rot, a] of [
        [15, 8, -0.35, 0.5],
        [19, 10, -0.75, 0.7],
      ]) {
        ctx.save();
        ctx.scale(sx, 1);
        ctx.translate(6, -2);
        ctx.rotate(rot + flap);
        const shape = wing(len, h);
        // translucent membrane
        const g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, 'rgba(60,220,255,' + a * 0.75 + ')');
        g.addColorStop(1, 'rgba(150,245,255,' + a + ')');
        ctx.shadowColor = '#43e6ff';
        ctx.shadowBlur = 9;
        shape(ctx);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.shadowBlur = 0;
        // neon edge + veins
        ctx.strokeStyle = '#b8fbff';
        ctx.lineWidth = 1.3;
        shape(ctx);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(1, 0);
        ctx.quadraticCurveTo(len * 0.5, -h * 0.4, len * 0.9, -h * 0.2);
        ctx.moveTo(len * 0.35, -h * 0.25);
        ctx.lineTo(len * 0.55, h * 0.12);
        ctx.stroke();
        ctx.restore();
      }
    }
    // stinger
    cel(ctx, (c) => {
      c.beginPath();
      c.moveTo(-3.2, 14);
      c.lineTo(0, 21.5);
      c.lineTo(3.2, 14);
      c.closePath();
    }, '#8b92c9', '#3b4270', '#1d2148', { off: 0.8, hi: 0, line: 1.4 });
    // abdomen (amber armour)
    const abdomen = (c) => ellipse(c, 0, 5, 12.5, 11.5);
    cel(ctx, abdomen, '#fff1a0', '#ffc21a', '#c86a00', { off: 2.4, hi: 0.5, hiAt: [-3, 5], line: 2 });
    ctx.save();
    abdomen(ctx);
    ctx.clip();
    ctx.fillStyle = '#1b1636';
    ctx.beginPath();
    ctx.ellipse(0, 6, 14, 1.5, 0, 0, TAU);
    ctx.ellipse(0, 11.5, 14, 1.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    abdomen(ctx);
    ctx.strokeStyle = PINK;
    ctx.lineWidth = 2;
    ctx.stroke();
    spec(ctx, -7.5, 7, 6, 1.6, 0.5, 0.8);
    // antenna stalk + glowing halo ring
    ctx.strokeStyle = PINK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -16.5);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = '#43e6ff';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#7ff3ff';
    ctx.lineWidth = 2.2;
    ellipse(ctx, 0, -19, 5, 2.4);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, -19, 5, 2.4, 0, Math.PI * 1.1, Math.PI * 1.7);
    ctx.stroke();
    // helmet (black armour)
    const helmet = (c) => {
      c.beginPath();
      c.moveTo(-12, -3);
      c.bezierCurveTo(-12.5, -15, 12.5, -15, 12, -3);
      c.quadraticCurveTo(11.5, 1.5, 7, 1.8);
      c.lineTo(-7, 1.8);
      c.quadraticCurveTo(-11.5, 1.5, -12, -3);
      c.closePath();
    };
    cel(ctx, helmet, '#5a5f8f', '#2a2d52', '#11122a', { off: 2, hi: 0.5, hiAt: [-3, -8], line: 2 });
    rim(ctx, helmet, 'rgba(160,190,255,0.7)', 1.2, 1);
    spec(ctx, -6, -9, 5, 1.4, -0.9, 0.7);
    // big glowing lens eyes
    for (const sx of [-1, 1]) {
      const ex = sx * 5.2;
      const ey = -5;
      ctx.fillStyle = '#0a0b1e';
      ctx.beginPath();
      ctx.arc(ex, ey, 5.1, 0, TAU);
      ctx.fill();
      emissive(ctx, (c) => {
        c.beginPath();
        c.arc(ex, ey, 3.9, 0, TAU);
      }, '#2fd6ff', null, 10);
      const lg = ctx.createRadialGradient(ex - 1, ey - 1, 0.3, ex, ey, 3.9);
      lg.addColorStop(0, '#ffffff');
      lg.addColorStop(0.35, '#b8fbff');
      lg.addColorStop(1, '#1a8cff');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(ex, ey, 3.7, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,40,90,0.7)';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(ex, ey, 2.2, 0, TAU);
      ctx.stroke();
      dot(ctx, ex - 1.4, ey - 1.5, 1.1, 1);
    }
  },

  // Armoured crystal beetle: layered violet carapace, glowing crystal ridge,
  // steel pincer claws and red slit eyes under the shell.
  rockshell(ctx, f) {
    const open = f === 0 ? 0.3 : 0.06;
    // legs
    mirror(ctx, () => {
      ctx.strokeStyle = INK;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(14 + i * 2, -2 + i * 4);
        ctx.lineTo(25, 0 + i * 5 + (f ? 1.5 : 0));
        ctx.stroke();
      }
    });
    // big steel pincers reaching forward (toward the player)
    mirror(ctx, () => {
      ctx.save();
      ctx.translate(13, 11);
      ctx.rotate(0.15);
      const arm = (c) => {
        c.beginPath();
        c.moveTo(-3, -2);
        c.quadraticCurveTo(5, 0, 6, 7);
        c.lineTo(1, 8);
        c.quadraticCurveTo(-1, 3, -4, 3);
        c.closePath();
      };
      cel(ctx, arm, '#f2efff', '#9d93dc', '#453a8c', { off: 1, hi: 0.4, hiAt: [2, 3], line: 1.7 });
      ctx.translate(4, 7.5);
      const upper = (c) => {
        c.beginPath();
        c.moveTo(-3, 0);
        c.quadraticCurveTo(8, -1, 8, 11);
        c.quadraticCurveTo(4, 6, -1, 5);
        c.closePath();
      };
      const lower = (c) => {
        c.beginPath();
        c.moveTo(-3, 2);
        c.quadraticCurveTo(-3, 12, 3, 14);
        c.quadraticCurveTo(-1, 9, 1, 5);
        c.closePath();
      };
      ctx.save();
      ctx.rotate(-open);
      cel(ctx, upper, '#ffffff', '#b3a9ec', '#4a3d99', { off: 1.1, hi: 0.5, hiAt: [3, 3], line: 1.8 });
      ctx.restore();
      ctx.save();
      ctx.rotate(open);
      cel(ctx, lower, '#ffffff', '#b3a9ec', '#4a3d99', { off: 1, hi: 0.4, hiAt: [0, 8], line: 1.8 });
      ctx.restore();
      ctx.restore();
    });
    // face under the shell: dark slot, red slit eyes, mandibles
    cel(ctx, (c) => ellipse(c, 0, 12, 12.5, 8.5), '#6a5a9a', '#342859', '#150f2c', { off: 1.2, hi: 0, line: 2 });
    for (const sx of [-1, 1]) {
      emissive(ctx, (c) => {
        c.beginPath();
        c.moveTo(sx * 1.2, 10.5);
        c.lineTo(sx * 9.5, 8);
        c.lineTo(sx * 8, 13);
        c.closePath();
      }, '#ff2e4e', '#ffffff', 12);
    }
    ctx.fillStyle = '#d9d4ff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.3;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * 3, 16);
      ctx.quadraticCurveTo(sx * 4.5, 20.5, sx * 1, 21);
      ctx.lineTo(sx * 1.5, 17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    // carapace
    const shell = (c) => {
      c.beginPath();
      c.moveTo(-23, 7);
      c.bezierCurveTo(-26, -24, 26, -24, 23, 7);
      c.quadraticCurveTo(0, 13, -23, 7);
      c.closePath();
    };
    cel(ctx, shell, '#d8c2ff', '#7b4fe0', '#321680', { off: 3, hi: 0.52, hiAt: [-6, -8], line: 2.4 });
    // overlapping armour plates
    ctx.save();
    shell(ctx);
    ctx.clip();
    for (const [y, w] of [
      [-4, 21],
      [3.5, 24],
    ]) {
      ctx.strokeStyle = 'rgba(20,6,60,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, y + 12, w, 12, 0, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(230,210,255,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, y + 13.2, w, 12, 0, Math.PI * 1.1, Math.PI * 1.5);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(20,6,60,0.6)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(0, 9);
    ctx.stroke();
    ctx.restore();
    rim(ctx, shell, 'rgba(240,225,255,0.85)', 1.6, 1.4);
    spec(ctx, -13, -8, 11, 2.6, 0.9, 0.8);
    // gold trim studs + centre gem
    for (const [x, y] of [
      [-15, 3],
      [15, 3],
      [-7, 6],
      [7, 6],
    ]) {
      cel(ctx, (c) => {
        c.beginPath();
        c.arc(x, y, 1.9, 0, TAU);
      }, '#fff6c2', '#ffc21a', '#a86200', { off: 0.5, hi: 0, line: 1 });
    }
    emissive(ctx, (c) => {
      c.beginPath();
      c.moveTo(0, -5);
      c.lineTo(4, 0);
      c.lineTo(0, 5);
      c.lineTo(-4, 0);
      c.closePath();
    }, '#43e6ff', '#ffffff', 10);
    // glowing crystal ridge
    const crystal = (x, y, h, w) => (c) => {
      c.beginPath();
      c.moveTo(x - w, y);
      c.lineTo(x - w * 0.3, y - h);
      c.lineTo(x + w * 0.4, y - h * 0.8);
      c.lineTo(x + w, y);
      c.closePath();
    };
    for (const [x, y, h, w] of [
      [-10, -12, 7, 3],
      [10, -12, 7, 3],
      [0, -17, 11, 4],
    ]) {
      emissive(ctx, crystal(x, y, h, w), '#c77dff', null, 12);
      cel(ctx, crystal(x, y, h, w), '#ffffff', '#e2b8ff', '#8a3cff', { off: 1, hi: 0.45, hiAt: [x - 1, y - h * 0.6], line: 1.6 });
    }
  },

  // Cannon squid: orange mantle with fins, brass goggles, metal cannon snout
  // with a glowing muzzle, tentacles curling up behind.
  spitter(ctx, f) {
    // tentacles curling up behind the mantle
    for (let i = 0; i < 4; i++) {
      const sx = i < 2 ? -1 : 1;
      const k = i % 2;
      const x0 = sx * (4 + k * 6);
      const curl = f ? 1 : 0.7;
      ctx.lineCap = 'round';
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(x0, -6);
        ctx.bezierCurveTo(x0 + sx * 6, -14, x0 + sx * (11 + k * 3), -18 * curl, x0 + sx * (8 + k * 3), -22 * curl);
        ctx.quadraticCurveTo(x0 + sx * (4 + k * 3), -24 * curl, x0 + sx * (5 + k * 2), -20 * curl);
      };
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#ff6a2a';
      ctx.lineWidth = 3.8;
      path();
      ctx.stroke();
      ctx.strokeStyle = '#ffc38a';
      ctx.lineWidth = 1.2;
      path();
      ctx.stroke();
    }
    // side fins
    mirror(ctx, () => {
      cel(ctx, (c) => {
        c.beginPath();
        c.moveTo(12, -8);
        c.lineTo(21, -12 + (f ? 2 : 0));
        c.lineTo(15, 2);
        c.closePath();
      }, '#ffd08a', '#ff8a2e', '#b8400a', { off: 1.2, hi: 0.4, hiAt: [16, -6], line: 1.8 });
    });
    // mantle
    const mantle = (c) => ellipse(c, 0, -2, 15.5, 13.5);
    cel(ctx, mantle, '#ffe0a8', '#ff7a1f', '#b3400a', { off: 2.6, hi: 0.5, hiAt: [-4, -6], line: 2.2 });
    ctx.save();
    mantle(ctx);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,230,170,0.6)';
    for (const [x, y, r] of [
      [-10, -9, 2],
      [9, -10, 1.5],
      [12, 1, 1.3],
      [-12, 2, 1.2],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
    // goggle strap
    ctx.fillStyle = '#3a2a4a';
    ctx.fillRect(-17, -6.5, 34, 4);
    ctx.restore();
    rim(ctx, mantle, 'rgba(255,240,210,0.85)', 1.4, 1.2);
    spec(ctx, -9, -10, 7, 1.8, 0.8, 0.8);
    // brass goggles + eyes
    for (const sx of [-1, 1]) {
      const ex = sx * 6.2;
      cel(ctx, (c) => {
        c.beginPath();
        c.arc(ex, -4.5, 6.2, 0, TAU);
      }, '#fff1b0', '#e0a830', '#8a5a10', { off: 1, hi: 0.5, hiAt: [ex - 1, -6], line: 1.8 });
      eyeBall(ctx, ex, -4.5, 4.4, '#ff3d2e', { closed: f === 1 && false, lookY: 0.6 });
      ctx.fillStyle = 'rgba(160,230,255,0.25)';
      ctx.beginPath();
      ctx.arc(ex, -4.5, 4.4, 0, TAU);
      ctx.fill();
    }
    // cannon snout
    const barrel = (c) => {
      c.beginPath();
      c.moveTo(-5.5, 6);
      c.lineTo(-4.6, 18);
      c.lineTo(4.6, 18);
      c.lineTo(5.5, 6);
      c.closePath();
    };
    cel(ctx, barrel, '#f2f4ff', '#8a93c8', '#3a4175', { off: 1.3, hi: 0.4, hiAt: [-1, 10], line: 1.9 });
    ctx.fillStyle = '#2a2f5c';
    ctx.fillRect(-5.2, 10.5, 10.4, 1.8);
    cel(ctx, (c) => ellipse(c, 0, 18, 6.2, 2.6), '#ffffff', '#aab2e0', '#4a5288', { off: 0.8, hi: 0, line: 1.6 });
    emissive(ctx, (c) => ellipse(c, 0, 18.3, 3.8, 1.5), '#ff5a2e', '#fff3a0', 10);
  },

  // Spiral jelly: glassy scalloped bell with a glowing spiral, cute face,
  // curling cyan tentacles and frilly pink oral arms.
  swirlie(ctx, f) {
    const ph = f * 2.1;
    // curly tentacles (cyan, emissive tips)
    for (let i = 0; i < 4; i++) {
      const x = -9 + i * 6;
      const dir = i % 2 ? 1 : -1;
      const sw = Math.sin(ph + i) * 3;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.bezierCurveTo(x + sw, 11, x - dir * 6, 15, x + dir * 2 + sw, 20);
      ctx.stroke();
      ctx.strokeStyle = '#5ef3ff';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      emissive(ctx, (c) => {
        c.beginPath();
        c.arc(x + dir * 2 + sw, 20.5, 1.8, 0, TAU);
      }, '#5ef3ff', '#ffffff', 7);
    }
    // frilly oral arms
    for (const sx of [-1, 1]) {
      cel(ctx, (c) => {
        c.beginPath();
        c.moveTo(sx * 2, 4);
        c.quadraticCurveTo(sx * (6 + Math.sin(ph) * 2), 11, sx * 2.5, 17);
        c.quadraticCurveTo(sx * 0.5, 11, sx * -1, 4);
        c.closePath();
      }, '#ffd0f2', '#ff6ad5', '#a3207c', { off: 0.8, hi: 0, line: 1.4 });
    }
    // bell
    const bell = (c) => {
      c.beginPath();
      c.moveTo(-17, 4);
      c.bezierCurveTo(-18, -21, 18, -21, 17, 4);
      c.quadraticCurveTo(14.5, 8, 11, 5);
      c.quadraticCurveTo(8.5, 9, 5.5, 5.5);
      c.quadraticCurveTo(2.8, 9, 0, 5.5);
      c.quadraticCurveTo(-2.8, 9, -5.5, 5.5);
      c.quadraticCurveTo(-8.5, 9, -11, 5);
      c.quadraticCurveTo(-14.5, 8, -17, 4);
      c.closePath();
    };
    cel(ctx, bell, '#ff9ae0', '#e8309f', '#7a0e5c', { off: 2.4, hi: 0.5, hiAt: [-4, -8], line: 2.2 });
    // glowing spiral pattern
    ctx.save();
    bell(ctx);
    ctx.clip();
    const spiral = () => {
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const a = i * 0.42;
        const r = 0.8 + i * 0.4;
        const x = Math.cos(a) * r;
        const y = -9.5 + Math.sin(a) * r * 0.62;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    };
    ctx.strokeStyle = 'rgba(110,10,80,0.55)';
    ctx.lineWidth = 3.2;
    spiral();
    ctx.stroke();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 7;
    ctx.strokeStyle = '#fff0fb';
    ctx.lineWidth = 1.6;
    spiral();
    ctx.stroke();
    ctx.restore();
    rim(ctx, bell, 'rgba(255,235,250,0.9)', 1.5, 1.3);
    spec(ctx, -10, -9, 8, 2.2, 0.75, 0.85);
    // cute face
    eyeBall(ctx, -5.2, -1.5, 3.6, '#7a1a8c', { lookY: 0.6 });
    eyeBall(ctx, 5.2, -1.5, 3.6, '#7a1a8c', { lookY: 0.6 });
    ctx.fillStyle = 'rgba(255,150,210,0.7)';
    ellipse(ctx, -10.5, 1.5, 2.4, 1.3);
    ctx.fill();
    ellipse(ctx, 10.5, 1.5, 2.4, 1.3);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 2, 1.8, 0.2, Math.PI - 0.2);
    ctx.stroke();
  },

  // Angry pufferfish: ivory spikes, red body with cream belly, flapping side
  // fins, glowing yellow eyes and a toothy jaw. Loves dive attacks.
  spikeling(ctx, f) {
    const flap = [-0.35, 0, 0.35][f];
    // tail fin (top, since it swims down at the player)
    cel(ctx, (c) => {
      c.beginPath();
      c.moveTo(0, -12);
      c.lineTo(-7, -21);
      c.quadraticCurveTo(0, -17, 7, -21);
      c.closePath();
    }, '#ffb3a8', '#ff4a5e', '#9c1030', { off: 1, hi: 0.3, hiAt: [-2, -17], line: 1.8 });
    // side fins
    mirror(ctx, () => {
      ctx.save();
      ctx.translate(11, -2);
      ctx.rotate(flap);
      cel(ctx, (c) => {
        c.beginPath();
        c.moveTo(0, -4);
        c.quadraticCurveTo(10, -9, 12, -1);
        c.quadraticCurveTo(9, 3, 0, 4);
        c.closePath();
      }, '#ffc2b8', '#ff5a6a', '#a3102f', { off: 1, hi: 0.4, hiAt: [6, -2], line: 1.7 });
      ctx.strokeStyle = 'rgba(120,0,30,0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(1, -1);
      ctx.lineTo(10, -4);
      ctx.moveTo(1, 1);
      ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.restore();
    });
    // spikes all around
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.26;
      if (Math.abs(Math.sin(a)) < 0.35 && Math.cos(a) !== 0 && Math.abs(Math.cos(a)) > 0.93) continue; // leave room for fins
      ctx.save();
      ctx.rotate(a);
      cel(ctx, (c) => {
        c.beginPath();
        c.moveTo(-3.2, -11);
        c.lineTo(0, -19.5);
        c.lineTo(3.2, -11);
        c.closePath();
      }, '#ffffff', '#fff1d6', '#c9a878', { off: 0.9, hi: 0, line: 1.4 });
      ctx.restore();
    }
    // body
    const bodyShape = (c) => {
      c.beginPath();
      c.arc(0, 0, 13.5, 0, TAU);
    };
    cel(ctx, bodyShape, '#ffb3a8', '#ff3350', '#8e0c28', { off: 2.4, hi: 0.5, hiAt: [-4, -4], line: 2.2 });
    ctx.save();
    bodyShape(ctx);
    ctx.clip();
    ctx.fillStyle = '#ffe0c8';
    ctx.beginPath();
    ctx.ellipse(0, 11, 11, 7.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,0,30,0.35)';
    for (const [x, y] of [
      [-8, -6],
      [7, -8],
      [9, -1],
      [-10, 1],
    ]) {
      ctx.beginPath();
      ctx.arc(x, y, 1.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    rim(ctx, bodyShape, 'rgba(255,225,215,0.85)', 1.4, 1.2);
    spec(ctx, -7, -7, 6, 1.7, 0.8, 0.8);
    // angry glowing eyes + brows
    for (const sx of [-1, 1]) {
      emissive(ctx, (c) => {
        c.beginPath();
        c.ellipse(sx * 5, -3, 3.8, 3.2, 0, 0, TAU);
      }, '#ffd23f', null, 8);
      ctx.fillStyle = '#fff6b0';
      ctx.beginPath();
      ctx.ellipse(sx * 5, -3, 3.4, 2.8, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(sx * 4.6, -2.4, 1.1, 1.8, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(sx * 9.5, -8.5);
      ctx.lineTo(sx * 1.5, -5.2);
      ctx.stroke();
    }
    // toothy jaw
    ctx.fillStyle = '#3a0612';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-7, 4);
    ctx.quadraticCurveTo(0, 13, 7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      const x = i * 2;
      ctx.moveTo(x - 0.9, 4.4);
      ctx.lineTo(x, 6.8);
      ctx.lineTo(x + 0.9, 4.4);
    }
    ctx.moveTo(-3, 9.5);
    ctx.lineTo(-2, 7.5);
    ctx.lineTo(-1, 9.8);
    ctx.moveTo(1, 9.8);
    ctx.lineTo(2, 7.5);
    ctx.lineTo(3, 9.5);
    ctx.fill();
  },
};

const GLOW_COLORS = {
  blobling: '#6dff6b',
  zipfly: '#ffd23f',
  rockshell: '#b27dff',
  spitter: '#ff9b3d',
  swirlie: '#ff5ec8',
  spikeling: '#ff4d5e',
};

// Bake a soft coloured halo around the silhouette of a sprite.
function withHalo(sprite, color) {
  const c = makeCanvas(sprite.canvas.width, sprite.canvas.height);
  const ctx = c.getContext('2d');
  ctx.shadowColor = hexA(color, 0.85);
  ctx.shadowBlur = 7 * SPR;
  ctx.drawImage(sprite.canvas, 0, 0);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.drawImage(sprite.canvas, 0, 0);
  return { canvas: c, w: sprite.w, h: sprite.h };
}

export function enemySprite(art, radius, frame) {
  return cached('enemy:' + art + ':' + frame, () => {
    const size = radius * 2 + 34;
    const raw = makeSprite(size, size, (ctx) => ART[art](ctx, frame));
    return withHalo(raw, GLOW_COLORS[art] || '#ffffff');
  });
}

export function enemyWhite(art, radius, frame) {
  return cached('enemyW:' + art + ':' + frame, () => whiteVersion(enemySprite(art, radius, frame)));
}

// Exported for the level-select / how-to-play screens.
export function enemyIconDataURL(art, radius) {
  return enemySprite(art, radius, 0).canvas.toDataURL();
}

import { ellipse, shade, hexA, makeCanvas, whiteVersion, glowSprite } from './Sprites.js';
import { TAU } from '../core/math.js';
import { cel, rim, spec, emissive, seam, setLightX, INK } from './Paint.js';

// Boss artwork, split for quality AND speed:
//   base(ctx, phase)  detailed static body, rendered ONCE per phase into a
//                     cached sprite (cel shading, trims, emissive parts, halo)
//   back(ctx, b)      animated parts behind the body (wings, legs, tentacles)
//   front(ctx, b)     animated parts on top (eyes, mouth, lights, charge glow)
// Per-frame glows use cached glow sprites (no shadowBlur / gradient per frame).
// Big static parts that also animate (e.g. Void Empress wings) are cached as
// separate "parts" and only transformed per frame.
//
// `b` = boss state: t, charge (0..1 telegraph), lookX/lookY, rage, phaseIndex.

const BOSS_SPR = 2; // cached boss sprites resolution multiplier

// Draw fn for the right half, then mirrored for the left, light kept on the left.
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

// Glow blob without touching the blend mode (for batched additive passes).
function glowAt(ctx, x, y, r, color, a) {
  const g = glowSprite(color, 16);
  ctx.globalAlpha = a;
  ctx.drawImage(g.canvas, x - r, y - r, r * 2, r * 2);
}

// Glow blob from the cached sprite (no gradient allocation per frame).
function glowDot(ctx, x, y, r, color, a = 1) {
  const g = glowSprite(color, 16);
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  ctx.drawImage(g.canvas, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function chargeGlow(ctx, x, y, r, color, k) {
  if (k <= 0.02) return;
  glowDot(ctx, x, y, r * (0.7 + k), color, Math.min(1, k * 1.2));
}

// Boss eye: cel sclera, iris following the player, round or slit pupil.
function bossEye(ctx, x, y, r, b, iris, slit = false) {
  cel(ctx, (c) => {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
  }, '#ffffff', '#f2f0ff', '#b3aede', { off: r * 0.2, hi: 0, line: 2.6 });
  const px = x + b.lookX * r * 0.32;
  const py = y + b.lookY * r * 0.32;
  const ir = r * 0.6;
  ctx.fillStyle = shade(iris, -0.3);
  ctx.beginPath();
  ctx.arc(px, py, ir, 0, TAU);
  ctx.fill();
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(px - ir * 0.12, py - ir * 0.12, ir * 0.82, 0, TAU);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  if (slit) ctx.ellipse(px, py, ir * 0.22, ir * 0.8, 0, 0, TAU);
  else ctx.arc(px, py, ir * 0.46, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px - ir * 0.36, py - ir * 0.4, ir * 0.26, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(px + ir * 0.34, py + ir * 0.3, ir * 0.11, 0, TAU);
  ctx.fill();
}

function gem(ctx, x, y, r, color) {
  emissive(ctx, (c) => {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
  }, color, null, 12);
  cel(ctx, (c) => {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
  }, shade(color, 0.5), color, shade(color, -0.4), { off: r * 0.25, hi: 0.5, hiAt: [x - r * 0.2, y - r * 0.2], line: 1.6 });
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, TAU);
  ctx.fill();
}

const GOLD = ['#fff6c2', '#ffc21a', '#9a5800'];
const STEEL = ['#ffffff', '#aeb6e0', '#474f88'];
const BLACK_CHROME = ['#7a7fb0', '#2c2f58', '#0f1026'];

export const BOSS_ART = {
  // ------------------------------------------------------------ KING GLOOP
  // Royal slime monarch: translucent gel mound, purple velvet cape with ermine
  // trim, ornate jewelled crown and a scepter held by a slime arm.
  kingGloop: {
    box: [290, 250],
    halo: '#6dff6b',
    squash: true,
    base(ctx) {
      // cape (behind the body, visible at the sides)
      mirror(ctx, () => {
        const cape = (c) => {
          c.beginPath();
          c.moveTo(40, -40);
          c.quadraticCurveTo(110, -30, 124, 30);
          c.quadraticCurveTo(128, 58, 112, 70);
          c.quadraticCurveTo(100, 56, 92, 66);
          c.quadraticCurveTo(80, 50, 60, 40);
          c.closePath();
        };
        cel(ctx, cape, '#c98cff', '#7a2fd0', '#35106a', { off: 3.5, hi: 0.5, hiAt: [90, 0], line: 2.6 });
        ctx.strokeStyle = 'rgba(30,6,70,0.5)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(84, -20);
        ctx.quadraticCurveTo(104, 20, 100, 58);
        ctx.moveTo(66, -20);
        ctx.quadraticCurveTo(84, 16, 84, 48);
        ctx.stroke();
        // gold hem
        ctx.strokeStyle = '#ffc21a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(123, 32);
        ctx.quadraticCurveTo(126, 58, 112, 68);
        ctx.stroke();
        // ermine trim along the shoulder
        const fur = (c) => {
          c.beginPath();
          c.moveTo(34, -46);
          c.quadraticCurveTo(80, -48, 112, -26);
          c.quadraticCurveTo(118, -16, 108, -12);
          c.quadraticCurveTo(76, -30, 36, -28);
          c.closePath();
        };
        cel(ctx, fur, '#ffffff', '#f1ecff', '#b8b0d8', { off: 1.6, hi: 0, line: 2.2 });
        ctx.fillStyle = '#1b1636';
        for (const [x, y] of [
          [52, -40],
          [74, -36],
          [95, -26],
        ]) {
          ctx.beginPath();
          ctx.moveTo(x, y - 3);
          ctx.lineTo(x + 1.6, y + 2);
          ctx.lineTo(x - 1.6, y + 2);
          ctx.closePath();
          ctx.fill();
        }
      });
      // scepter held by a slime arm (right side)
      ctx.save();
      ctx.translate(104, -6);
      ctx.rotate(0.28);
      cel(ctx, (c) => {
        c.beginPath();
        c.rect(-3, -44, 6, 92);
      }, GOLD[0], GOLD[1], GOLD[2], { off: 1.2, hi: 0.4, hiAt: [-1, 0], line: 2 });
      cel(ctx, (c) => {
        c.beginPath();
        c.moveTo(-8, -44);
        c.lineTo(8, -44);
        c.lineTo(5, -38);
        c.lineTo(-5, -38);
        c.closePath();
      }, GOLD[0], GOLD[1], GOLD[2], { off: 0.8, hi: 0, line: 1.8 });
      gem(ctx, 0, -54, 10, '#8cff3a');
      ctx.restore();
      // gel body
      const gel = (c) => {
        c.beginPath();
        c.moveTo(-94, 30);
        c.bezierCurveTo(-106, -74, 106, -74, 94, 30);
        c.quadraticCurveTo(94, 50, 76, 52);
        c.quadraticCurveTo(70, 76, 58, 56);
        c.quadraticCurveTo(44, 64, 30, 57);
        c.quadraticCurveTo(20, 84, 8, 58);
        c.quadraticCurveTo(-8, 66, -22, 57);
        c.quadraticCurveTo(-34, 78, -46, 56);
        c.quadraticCurveTo(-62, 64, -74, 52);
        c.quadraticCurveTo(-94, 50, -94, 30);
        c.closePath();
      };
      cel(ctx, gel, '#c8ffa8', '#4fdc4a', '#137a2a', { off: 7, hi: 0.45, hiAt: [-34, -14], line: 3.2 });
      // slime arm wrapping the scepter
      cel(ctx, (c) => {
        c.beginPath();
        c.moveTo(80, 0);
        c.quadraticCurveTo(104, -6, 106, 10);
        c.quadraticCurveTo(104, 22, 84, 22);
        c.closePath();
      }, '#d8ffbf', '#4fdc4a', '#137a2a', { off: 2, hi: 0.4, hiAt: [96, 6], line: 2.4 });
      // translucent depth: inner core, floating treasure, bubbles
      ctx.save();
      gel(ctx);
      ctx.clip();
      ctx.fillStyle = 'rgba(8,70,26,0.3)';
      ctx.beginPath();
      ctx.ellipse(10, 24, 64, 26, 0, 0, TAU);
      ctx.fill();
      emissive(ctx, (c) => {
        c.beginPath();
        c.arc(-58, 26, 7, 0, TAU);
      }, '#ffd23f', '#ffffff', 8);
      ctx.fillStyle = '#b36b00';
      ctx.font = '900 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', -58, 26.5);
      ctx.fillStyle = 'rgba(230,255,210,0.55)';
      for (const [x, y, r] of [
        [60, 20, 4],
        [70, 34, 2.5],
        [-30, 40, 3],
        [40, -34, 2],
        [-70, -8, 2.5],
      ]) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      rim(ctx, gel, 'rgba(240,255,225,0.95)', 3, 2.6);
      spec(ctx, -62, -16, 30, 7, 0.75, 0.85);
      spec(ctx, -40, -40, 10, 3, 1.1, 0.7);
      // cheeks
      ctx.fillStyle = 'rgba(255,110,150,0.45)';
      ellipse(ctx, -60, 14, 11, 6);
      ctx.fill();
      ellipse(ctx, 60, 14, 11, 6);
      ctx.fill();
      // ornate crown
      const crownShape = (c) => {
        c.beginPath();
        c.moveTo(-42, -36);
        c.lineTo(-48, -78);
        c.lineTo(-28, -60);
        c.lineTo(-14, -90);
        c.lineTo(0, -64);
        c.lineTo(14, -90);
        c.lineTo(28, -60);
        c.lineTo(48, -78);
        c.lineTo(42, -36);
        c.closePath();
      };
      cel(ctx, crownShape, GOLD[0], GOLD[1], GOLD[2], { off: 3, hi: 0.55, hiAt: [-12, -60], line: 2.6 });
      rim(ctx, crownShape, 'rgba(255,255,230,0.9)', 1.6, 1.4);
      cel(ctx, (c) => {
        c.beginPath();
        c.rect(-44, -46, 88, 11);
      }, '#ffe07a', '#e09a10', '#7a4400', { off: 1.6, hi: 0, line: 2.4 });
      for (const [x, y] of [
        [-48, -78],
        [-14, -90],
        [14, -90],
        [48, -78],
      ]) {
        cel(ctx, (c) => {
          c.beginPath();
          c.arc(x, y, 4, 0, TAU);
        }, '#ffffff', '#ffe07a', '#b36b00', { off: 0.8, hi: 0, line: 1.6 });
      }
      gem(ctx, 0, -40.5, 6.5, '#ff2e55');
      gem(ctx, -26, -40.5, 4, '#43e6ff');
      gem(ctx, 26, -40.5, 4, '#43e6ff');
      gem(ctx, 0, -70, 5, '#b27dff');
    },
    front(ctx, b) {
      // rising bubbles
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (let i = 0; i < 6; i++) {
        const y = 48 - ((b.t * 14 + i * 23) % 80);
        const x = -60 + i * 24 + Math.sin(b.t + i) * 4;
        ctx.beginPath();
        ctx.arc(x, y, 2.4 + (i % 3), 0, TAU);
        ctx.fill();
      }
      bossEye(ctx, -32, -8, 20, b, '#26c24a', true);
      bossEye(ctx, 32, -8, 20, b, '#26c24a', true);
      // heavy royal brows (angrier with rage / charge)
      const tilt = 5 + (b.rage > 0 || b.charge > 0.3 ? 7 : 0);
      ctx.strokeStyle = INK;
      ctx.lineCap = 'round';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-52, -34 - tilt * 0.3);
      ctx.lineTo(-14, -30 + tilt * 0.6);
      ctx.moveTo(52, -34 - tilt * 0.3);
      ctx.lineTo(14, -30 + tilt * 0.6);
      ctx.stroke();
      // mouth opens as attacks charge
      const open = 5 + b.charge * 17;
      ctx.fillStyle = '#4a0822';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 30, 28, open, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      if (open > 8) {
        ctx.fillStyle = '#ff6a9a';
        ctx.beginPath();
        ctx.ellipse(0, 30 + open * 0.45, 13, open * 0.36, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const x = i * 9;
        ctx.moveTo(x - 3.5, 30 - open + 1);
        ctx.lineTo(x, 30 - open + 7);
        ctx.lineTo(x + 3.5, 30 - open + 1);
      }
      ctx.fill();
      chargeGlow(ctx, 0, 56, 28, '#8cff5a', b.charge);
    },
  },

  // ------------------------------------------------------------ BUZZ BARON
  // Armoured mech-hornet: rotary gun pods (its side guns), gold/black chevron
  // armour, glowing red compound visor, steel mandibles, chrome stinger cannon.
  buzzBaron: {
    box: [240, 220],
    halo: '#ffd23f',
    back(ctx, b) {
      const flap = Math.sin(b.t * 48);
      ctx.globalCompositeOperation = 'lighter';
      for (let side = -1; side <= 1; side += 2) {
        for (let k = 0; k < 2; k++) {
          ctx.save();
          ctx.scale(side, 1);
          ctx.translate(24, -40);
          ctx.rotate(-0.55 - k * 0.5 + flap * 0.14);
          const rx = 74 - k * 16;
          const ry = 23 - k * 5;
          ctx.fillStyle = k ? 'rgba(90,200,255,0.22)' : 'rgba(120,230,255,0.3)';
          ctx.beginPath();
          ctx.ellipse(rx * 0.95, 0, rx, ry, 0, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = 'rgba(190,250,255,0.85)';
          ctx.lineWidth = 2;
          ctx.stroke();
          // veins
          ctx.strokeStyle = 'rgba(200,250,255,0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(6, -2);
          ctx.lineTo(rx * 1.75, -ry * 0.3);
          ctx.moveTo(rx * 0.5, -ry * 0.7);
          ctx.lineTo(rx * 0.9, ry * 0.8);
          ctx.moveTo(rx * 1.1, -ry * 0.85);
          ctx.lineTo(rx * 1.4, ry * 0.7);
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    },
    base(ctx) {
      // struts to the gun pods
      mirror(ctx, () => {
        cel(ctx, (c) => {
          c.beginPath();
          c.moveTo(24, -24);
          c.lineTo(44, -18);
          c.lineTo(44, -6);
          c.lineTo(26, -10);
          c.closePath();
        }, STEEL[0], STEEL[1], STEEL[2], { off: 1.2, hi: 0, line: 2 });
      });
      // rotary gun pods (the boss's side guns)
      mirror(ctx, () => {
        for (let i = -1; i <= 1; i++) {
          cel(ctx, (c) => {
            c.beginPath();
            c.rect(55 + i * 7 - 3, 6, 6, 30);
          }, STEEL[0], STEEL[1], STEEL[2], { off: 1, hi: 0.35, hiAt: [55 + i * 7 - 1, 20], line: 1.8 });
          ctx.fillStyle = '#12132a';
          ctx.beginPath();
          ctx.ellipse(55 + i * 7, 36, 2.6, 1.4, 0, 0, TAU);
          ctx.fill();
        }
        cel(ctx, (c) => {
          c.beginPath();
          c.rect(44, 18, 22, 5);
        }, '#ffe07a', '#e09a10', '#7a4400', { off: 0.8, hi: 0, line: 1.6 });
        const pod = (c) => {
          c.beginPath();
          c.arc(55, -8, 25, 0, TAU);
        };
        cel(ctx, pod, GOLD[0], GOLD[1], GOLD[2], { off: 3, hi: 0.5, hiAt: [50, -14], line: 2.6 });
        ctx.save();
        pod(ctx);
        ctx.clip();
        ctx.fillStyle = '#1b1636';
        ctx.fillRect(30, -4, 50, 7);
        ctx.restore();
        rim(ctx, pod, 'rgba(255,255,220,0.9)', 1.6, 1.4);
        cel(ctx, (c) => {
          c.beginPath();
          c.arc(55, -10, 11, 0, TAU);
        }, BLACK_CHROME[0], BLACK_CHROME[1], BLACK_CHROME[2], { off: 1.4, hi: 0, line: 2 });
        spec(ctx, 44, -22, 10, 2.4, 0.9, 0.8);
      });
      // thorax: gold armour with black chevrons
      const thorax = (c) => {
        c.beginPath();
        c.ellipse(0, -22, 40, 45, 0, 0, TAU);
      };
      cel(ctx, thorax, '#fff0a0', '#ffbf1a', '#9a5000', { off: 5, hi: 0.4, hiAt: [-14, -38], line: 3 });
      ctx.save();
      thorax(ctx);
      ctx.clip();
      ctx.fillStyle = '#1b1636';
      for (const y of [-50, -26, -2]) {
        ctx.beginPath();
        ctx.moveTo(-44, y);
        ctx.lineTo(0, y + 12);
        ctx.lineTo(44, y);
        ctx.lineTo(44, y + 9);
        ctx.lineTo(0, y + 21);
        ctx.lineTo(-44, y + 9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      rim(ctx, thorax, 'rgba(255,255,220,0.95)', 2, 2);
      spec(ctx, -22, -46, 16, 4, 0.7, 0.85);
      // rivets
      ctx.fillStyle = '#fff6c2';
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(i * 12, -38 + Math.abs(i) * -2, 1.8, 0, TAU);
        ctx.arc(i * 12, -14 + Math.abs(i) * -2, 1.6, 0, TAU);
        ctx.fill();
      }
      // crest emblem
      emissive(ctx, (c) => {
        c.beginPath();
        c.moveTo(0, -36);
        c.lineTo(8, -30);
        c.lineTo(6, -20);
        c.lineTo(0, -16);
        c.lineTo(-6, -20);
        c.lineTo(-8, -30);
        c.closePath();
      }, '#43e6ff', '#ffffff', 10);
      // head: black chrome helmet
      const head = (c) => {
        c.beginPath();
        c.moveTo(-38, 18);
        c.quadraticCurveTo(-40, 2, -22, 0);
        c.lineTo(22, 0);
        c.quadraticCurveTo(40, 2, 38, 18);
        c.quadraticCurveTo(36, 50, 0, 54);
        c.quadraticCurveTo(-36, 50, -38, 18);
        c.closePath();
      };
      cel(ctx, head, BLACK_CHROME[0], BLACK_CHROME[1], BLACK_CHROME[2], { off: 3, hi: 0.4, hiAt: [-10, 14], line: 2.8 });
      rim(ctx, head, 'rgba(170,190,255,0.8)', 1.6, 1.5);
      // compound eye sockets
      mirror(ctx, () => {
        ctx.fillStyle = '#08070f';
        ctx.beginPath();
        ctx.ellipse(16, 24, 16, 13, 0.35, 0, TAU);
        ctx.fill();
      });
      // mandible blades
      mirror(ctx, () => {
        cel(ctx, (c) => {
          c.beginPath();
          c.moveTo(12, 44);
          c.quadraticCurveTo(28, 52, 18, 66);
          c.quadraticCurveTo(16, 56, 6, 52);
          c.closePath();
        }, STEEL[0], STEEL[1], STEEL[2], { off: 1.2, hi: 0.4, hiAt: [16, 52], line: 2 });
      });
      // stinger cannon
      cel(ctx, (c) => {
        c.beginPath();
        c.moveTo(-9, 48);
        c.lineTo(9, 48);
        c.lineTo(3.5, 68);
        c.lineTo(-3.5, 68);
        c.closePath();
      }, STEEL[0], STEEL[1], STEEL[2], { off: 1.6, hi: 0.4, hiAt: [-2, 56], line: 2.2 });
      ctx.fillStyle = '#1b1636';
      ctx.fillRect(-7, 54, 14, 2.4);
    },
    front(ctx, b) {
      const pulse = 0.75 + 0.25 * Math.sin(b.t * 6);
      const hot = b.rage > 0 ? '#ff4f5e' : '#ffb13d';
      // compound eyes (hex facets)
      for (let side = -1; side <= 1; side += 2) {
        const ex = side * 16 + b.lookX * 1.5;
        const g = glowSprite('#ff2e55', 16);
        ctx.fillStyle = '#ff2e4e';
        ctx.beginPath();
        ctx.ellipse(ex, 24, 14.5, 11.5, side * 0.35, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ff9aa8';
        ctx.beginPath();
        ctx.ellipse(ex - 4, 20, 6, 4, side * 0.35, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,0,20,0.55)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (let i = -2; i <= 2; i++) {
          ctx.moveTo(ex + i * 5, 14);
          ctx.lineTo(ex + i * 5, 34);
        }
        ctx.moveTo(ex - 13, 24);
        ctx.lineTo(ex + 13, 24);
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.45 * pulse;
        ctx.drawImage(g.canvas, ex - 24, 0, 48, 48);
        // gun pod cores + muzzles
        glowAt(ctx, side * 55, -10, 16, hot, pulse);
        glowAt(ctx, side * 55, 38, 12, hot, 0.5 + pulse * 0.4);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = hot;
        ctx.beginPath();
        ctx.arc(side * 55, -10, 6.5, 0, TAU);
        ctx.fill();
      }
      chargeGlow(ctx, 0, 68, 24, '#ffd23f', b.charge);
    },
  },

  // ------------------------------------------------------------ BROODMOTHER
  // Crystal hive queen: chitin abdomen studded with glowing egg clusters and a
  // crystal ridge, 8 jointed walking legs, eye cluster and big fangs.
  broodmother: {
    box: [250, 250],
    halo: '#b27dff',
    back(ctx, b) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < 4; i++) {
        for (let side = -1; side <= 1; side += 2) {
          const phase = b.t * 3.2 + i * 1.3 + (side > 0 ? Math.PI : 0);
          const step = Math.sin(phase) * 7;
          const lift = Math.max(0, Math.cos(phase)) * 6;
          const sx = side * (44 + i * 4);
          const sy = 8 + i * 13;
          const kx = side * (98 + i * 6);
          const ky = sy - 44 + i * 10 + step - lift;
          const fx = side * (112 + i * 3);
          const fy = sy + 26 + i * 8 + step;
          for (let pass = 0; pass < 3; pass++) {
            ctx.strokeStyle = pass === 0 ? INK : pass === 1 ? '#5b2ca8' : '#c9a8ff';
            ctx.lineWidth = pass === 0 ? 14 : pass === 1 ? 9.5 : 2.2;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(kx, ky);
            ctx.lineTo(fx, fy);
            ctx.stroke();
          }
          // knee joint + claw tip
          ctx.fillStyle = '#c9a8ff';
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(kx, ky, 5.5, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#efe2ff';
          ctx.beginPath();
          ctx.moveTo(fx - 4.5, fy - 2);
          ctx.lineTo(fx + side * 3, fy + 12);
          ctx.lineTo(fx + 4.5, fy - 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    },
    base(ctx) {
      // crystal ridge behind the abdomen
      const crystal = (x, y, h, w, rot) => (c) => {
        c.save();
        c.translate(x, y);
        c.rotate(rot);
        c.beginPath();
        c.moveTo(-w, 0);
        c.lineTo(-w * 0.2, -h);
        c.lineTo(w * 0.5, -h * 0.75);
        c.lineTo(w, 0);
        c.closePath();
        c.restore();
      };
      for (const [x, y, h, w, r] of [
        [0, -86, 36, 11, 0],
        [-34, -80, 28, 9, -0.4],
        [34, -80, 28, 9, 0.4],
        [-62, -60, 20, 7, -0.85],
        [62, -60, 20, 7, 0.85],
      ]) {
        emissive(ctx, crystal(x, y, h, w, r), '#c77dff', null, 16);
        cel(ctx, crystal(x, y, h, w, r), '#ffffff', '#e2b8ff', '#7a2bff', { off: 1.4, hi: 0.45, hiAt: [x, y - h * 0.5], line: 2 });
      }
      // abdomen
      const abdomen = (c) => {
        c.beginPath();
        c.ellipse(0, -26, 86, 68, 0, 0, TAU);
      };
      cel(ctx, abdomen, '#a77ef0', '#6b35c8', '#260a5a', { off: 6, hi: 0.4, hiAt: [-30, -52], line: 3.2 });
      ctx.save();
      abdomen(ctx);
      ctx.clip();
      // chitin bands
      for (let i = 0; i < 4; i++) {
        const y = -70 + i * 26;
        ctx.strokeStyle = 'rgba(20,4,50,0.6)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, y + 60, 90, 60, 0, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(220,200,255,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, y + 61.5, 90, 60, 0, Math.PI * 1.15, Math.PI * 1.5);
        ctx.stroke();
      }
      ctx.restore();
      rim(ctx, abdomen, 'rgba(230,210,255,0.85)', 2.2, 2.2);
      spec(ctx, -50, -60, 24, 5, 0.9, 0.7);
      // egg clusters (glow is animated in front)
      for (const [x, y, r] of EGGS) {
        emissive(ctx, (c) => {
          c.beginPath();
          c.ellipse(x, y, r, r * 1.18, 0, 0, TAU);
        }, '#8cff3a', null, 10);
        cel(ctx, (c) => {
          c.beginPath();
          c.ellipse(x, y, r, r * 1.18, 0, 0, TAU);
        }, '#f4ffd0', '#9cff4a', '#2f8a10', { off: r * 0.22, hi: 0.5, hiAt: [x - r * 0.3, y - r * 0.4], line: 1.8 });
        ctx.fillStyle = 'rgba(40,120,20,0.55)';
        ctx.beginPath();
        ctx.arc(x + r * 0.15, y + r * 0.15, r * 0.35, 0, TAU);
        ctx.fill();
      }
      // cephalothorax (head)
      const head = (c) => {
        c.beginPath();
        c.moveTo(-44, 38);
        c.quadraticCurveTo(-46, 16, -24, 14);
        c.quadraticCurveTo(0, 6, 24, 14);
        c.quadraticCurveTo(46, 16, 44, 38);
        c.quadraticCurveTo(38, 66, 0, 70);
        c.quadraticCurveTo(-38, 66, -44, 38);
        c.closePath();
      };
      cel(ctx, head, '#8f6ad6', '#3d1f7a', '#160636', { off: 3.5, hi: 0.5, hiAt: [-12, 30], line: 3 });
      rim(ctx, head, 'rgba(210,180,255,0.8)', 1.6, 1.6);
      // head crown ridges
      mirror(ctx, () => {
        cel(ctx, (c) => {
          c.beginPath();
          c.moveTo(10, 14);
          c.lineTo(26, 0);
          c.lineTo(24, 16);
          c.closePath();
        }, '#ffffff', '#d7b8ff', '#6b35c8', { off: 1, hi: 0, line: 1.8 });
      });
      // eye sockets
      for (const [x, y, r] of BROOD_EYES) {
        ctx.fillStyle = '#0a0418';
        ctx.beginPath();
        ctx.arc(x, y, r + 1.6, 0, TAU);
        ctx.fill();
      }
    },
    front(ctx, b) {
      // egg pulse (one additive batch)
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < EGGS.length; i++) {
        const [x, y, r] = EGGS[i];
        const k = 0.5 + 0.5 * Math.sin(b.t * 4 + i * 1.3);
        glowAt(ctx, x, y, r * 2.4, '#b8ff3d', 0.18 + k * 0.4);
      }
      const ec = b.rage > 0 ? '#ff2e55' : '#ff9b3d';
      for (let i = 0; i < BROOD_EYES.length; i++) {
        const [x, y, r] = BROOD_EYES[i];
        glowAt(ctx, x + b.lookX * 2, y + b.lookY * 2, r * 2.6, ec, 0.6);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < BROOD_EYES.length; i++) {
        const [x, y, r] = BROOD_EYES[i];
        const ex = x + b.lookX * 2;
        const ey = y + b.lookY * 2;
        ctx.fillStyle = ec;
        ctx.beginPath();
        ctx.arc(ex, ey, r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - r * 0.3, ey - r * 0.35, r * 0.32, 0, TAU);
        ctx.fill();
      }
      // fangs (open wider while an attack charges)
      const m = 4 + b.charge * 10;
      for (let side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.translate(side * 12, 62);
        ctx.rotate(side * (0.15 + m * 0.03));
        ctx.fillStyle = '#3d1f7a';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 6, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f4ecff';
        ctx.beginPath();
        ctx.moveTo(-4, 2);
        ctx.quadraticCurveTo(side * 6, 14, -side * 3, 24);
        ctx.quadraticCurveTo(side * 0.5, 13, 4, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      chargeGlow(ctx, 0, 70, 30, '#c77dff', b.charge);
    },
  },

  // ------------------------------------------------------------ JELLYTRON
  // UFO-jellyfish hybrid: heavy metal saucer with a light rim, tall glass
  // dome holding a glowing brain, shaded neon tentacles with glowing tips.
  jellytron: {
    box: [250, 200],
    oy: -18,
    halo: '#ff4fd8',
    back(ctx, b) {
      const n = TENTACLES;
      const pts = TENT_PTS;
      // 1) sample every tentacle's centre line once
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const x0 = -64 + u * 128;
        const len = 92 + Math.sin(i * 2.3) * 14 + (1 - Math.abs(u - 0.5) * 2) * 16;
        const ph = b.t * 2.3 + i * 0.75;
        for (let k = 0; k < TENT_SEG; k++) {
          const v = k / (TENT_SEG - 1);
          const o = (i * TENT_SEG + k) * 2;
          pts[o] = x0 + x0 * 0.25 * v + Math.sin(ph + v * 3.2) * 12 * v;
          pts[o + 1] = 38 + v * len;
        }
      }
      // 2) neon glow: one additive stroke per colour group
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 13;
      for (let grp = 0; grp < 2; grp++) {
        ctx.strokeStyle = grp === 0 ? '#ff4fd8' : '#9d5cff';
        ctx.beginPath();
        for (let i = grp; i < n; i += 2) {
          for (let k = 0; k < TENT_SEG; k++) {
            const o = (i * TENT_SEG + k) * 2;
            if (k === 0) ctx.moveTo(pts[o], pts[o + 1]);
            else ctx.lineTo(pts[o], pts[o + 1]);
          }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // 3) shaded tapered ribbons + highlight + glowing tip
      for (let i = 0; i < n; i++) {
        const pink = i % 2 === 0;
        const base = i * TENT_SEG * 2;
        ctx.beginPath();
        for (let k = 0; k < TENT_SEG; k++) {
          const w = 7 * (1 - (k / (TENT_SEG - 1)) * 0.7);
          const o = base + k * 2;
          if (k === 0) ctx.moveTo(pts[o] - w, pts[o + 1]);
          else ctx.lineTo(pts[o] - w, pts[o + 1]);
        }
        for (let k = TENT_SEG - 1; k >= 0; k--) {
          const w = 7 * (1 - (k / (TENT_SEG - 1)) * 0.7);
          const o = base + k * 2;
          ctx.lineTo(pts[o] + w, pts[o + 1]);
        }
        ctx.closePath();
        ctx.fillStyle = pink ? '#ff4fd8' : '#9d5cff';
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.strokeStyle = pink ? '#ffc2f2' : '#d9c2ff';
        ctx.beginPath();
        for (let k = 0; k < TENT_SEG - 1; k++) {
          const w = 7 * (1 - (k / (TENT_SEG - 1)) * 0.7) * 0.45;
          const o = base + k * 2;
          if (k === 0) ctx.moveTo(pts[o] - w, pts[o + 1]);
          else ctx.lineTo(pts[o] - w, pts[o + 1]);
        }
        ctx.stroke();
      }
      // 4) glowing tips, one additive batch
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const o = (i * TENT_SEG + TENT_SEG - 1) * 2;
        glowAt(ctx, pts[o], pts[o + 1], 12, i % 2 === 0 ? '#ff4fd8' : '#9d5cff', 0.9);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const o = (i * TENT_SEG + TENT_SEG - 1) * 2;
        ctx.moveTo(pts[o] + 2.6, pts[o + 1]);
        ctx.arc(pts[o], pts[o + 1], 2.6, 0, TAU);
      }
      ctx.fill();
    },
    base(ctx) {
      // --- underside hull + core socket
      const under = (c) => {
        c.beginPath();
        c.ellipse(0, 36, 58, 20, 0, 0, TAU);
      };
      cel(ctx, under, '#8c95c9', '#454d85', '#1f2450', { off: 3, hi: 0.5, hiAt: [-10, 34], line: 2.6 });
      for (let i = -2; i <= 2; i++) seam(ctx, [[i * 18, 22], [i * 22, 52]]);
      ctx.fillStyle = '#0d0f24';
      ctx.beginPath();
      ctx.ellipse(0, 48, 15, 7, 0, 0, TAU);
      ctx.fill();
      // --- saucer disc
      const disc = (c) => {
        c.beginPath();
        c.ellipse(0, 22, 104, 26, 0, 0, TAU);
      };
      cel(ctx, disc, '#f0f3ff', '#a9b2e0', '#4e5690', { off: 4, hi: 0.62, hiAt: [-20, 12], line: 3 });
      rim(ctx, disc, 'rgba(255,255,255,0.85)', 1.6, 1.5);
      // rim band with light sockets (lights are lit per frame)
      ctx.strokeStyle = '#262b58';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.ellipse(0, 24, 96, 20, 0, 0.12, Math.PI - 0.12);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 21, 96, 20, 0, 0.12, Math.PI - 0.12);
      ctx.stroke();
      for (let i = 0; i < JELLY_LIGHTS; i++) {
        const a = 0.25 + (i / (JELLY_LIGHTS - 1)) * (Math.PI - 0.5);
        ctx.fillStyle = '#0d0f24';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 96, 24 + Math.sin(a) * 20, 3.6, 0, TAU);
        ctx.fill();
      }
      // top plate ring around the dome
      const collar = (c) => {
        c.beginPath();
        c.ellipse(0, 12, 82, 15, 0, 0, TAU);
      };
      cel(ctx, collar, '#ffffff', '#cfd5f2', '#7a82b8', { off: 2, hi: 0.6, hiAt: [-14, 8], line: 2.4 });
      // neon magenta trim
      emissive(ctx, (c) => {
        c.beginPath();
        c.ellipse(0, 12, 78, 12.5, 0, 0.05, Math.PI - 0.05);
        c.ellipse(0, 13.5, 78, 12, 0, Math.PI - 0.05, 0.05, true);
        c.closePath();
      }, '#ff4fd8', '#ffffff', 12);
      // --- glass dome (back wall)
      const dome = (c) => {
        c.beginPath();
        c.moveTo(-74, 10);
        c.bezierCurveTo(-84, -112, 84, -112, 74, 10);
        c.quadraticCurveTo(0, 20, -74, 10);
        c.closePath();
      };
      const dg = ctx.createRadialGradient(-20, -50, 10, 0, -20, 95);
      dg.addColorStop(0, 'rgba(190,250,255,0.9)');
      dg.addColorStop(0.45, 'rgba(90,200,255,0.75)');
      dg.addColorStop(0.8, 'rgba(80,90,230,0.85)');
      dg.addColorStop(1, 'rgba(90,30,170,0.95)');
      dome(ctx);
      ctx.fillStyle = dg;
      ctx.fill();
      // --- brain (glowing magenta, folded)
      const brain = (c) => {
        c.beginPath();
        c.moveTo(-54, -2);
        c.bezierCurveTo(-66, -76, 66, -76, 54, -2);
        c.quadraticCurveTo(0, 9, -54, -2);
        c.closePath();
      };
      ctx.save();
      ctx.shadowColor = '#ff4fd8';
      ctx.shadowBlur = 22;
      cel(ctx, brain, '#ffe6f8', '#ff7ad6', '#c02596', { off: 4, hi: 0.55, hiAt: [-14, -36], line: 2.4, outline: false });
      ctx.restore();
      brain(ctx);
      ctx.strokeStyle = '#6a0d52';
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.save();
      brain(ctx);
      ctx.clip();
      ctx.strokeStyle = 'rgba(120,10,90,0.6)';
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 15, -58);
        ctx.bezierCurveTo(i * 15 + 10, -40, i * 15 - 10, -20, i * 15 + 4, 2);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,220,245,0.7)';
      ctx.lineWidth = 1;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 15 - 2.5, -56);
        ctx.bezierCurveTo(i * 15 + 7.5, -38, i * 15 - 12.5, -18, i * 15 + 1.5, 2);
        ctx.stroke();
      }
      ctx.restore();
      // --- glass front: rim, reflections
      dome(ctx);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
      rim(ctx, dome, 'rgba(200,250,255,0.9)', 2.4, 2.2);
      // broad glossy reflection band + sharp streaks
      ctx.save();
      dome(ctx);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.arc(8, 8, 76, Math.PI * 1.08, Math.PI * 1.42);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(8, 8, 74, Math.PI * 1.12, Math.PI * 1.36);
      ctx.stroke();
      ctx.restore();
      spec(ctx, -30, -74, 10, 2.4, -1.1, 0.8);
      spec(ctx, 58, -26, 20, 3.2, 0.42, 0.4);
    },
    front(ctx, b) {
      // chasing rim lights: bulbs, then one additive glow batch
      const step = Math.floor(b.t * 9);
      for (let i = 0; i < JELLY_LIGHTS; i++) {
        const a = 0.25 + (i / (JELLY_LIGHTS - 1)) * (Math.PI - 0.5);
        const on = (step + i) % 4 === 0;
        ctx.fillStyle = on ? '#fff275' : b.rage > 0 ? '#ff4f5e' : i % 2 ? '#43e6ff' : '#ff4fd8';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 96, 24 + Math.sin(a) * 20, 3, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < JELLY_LIGHTS; i++) {
        const a = 0.25 + (i / (JELLY_LIGHTS - 1)) * (Math.PI - 0.5);
        const on = (step + i) % 4 === 0;
        const c = on ? '#fff275' : b.rage > 0 ? '#ff4f5e' : i % 2 ? '#43e6ff' : '#ff4fd8';
        glowAt(ctx, Math.cos(a) * 96, 24 + Math.sin(a) * 20, on ? 11 : 7, c, on ? 1 : 0.7);
      }
      // brain pulse + underside core
      const k = 0.5 + 0.5 * Math.sin(b.t * 3.2);
      glowAt(ctx, 0, -26, 46, b.rage > 0 ? '#ff2e6e' : '#ff4fd8', 0.18 + k * 0.14);
      const kc = 0.6 + 0.4 * Math.sin(b.t * 5);
      glowAt(ctx, 0, 48, 20, b.rage > 0 ? '#ff4f5e' : '#43e6ff', 0.7 + kc * 0.3);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 48, 5, 2.6, 0, 0, TAU);
      ctx.fill();
      chargeGlow(ctx, 0, 60, 30, '#ff4fd8', b.charge);
    },
  },

  // ------------------------------------------------------------ VOID EMPRESS
  // Endgame cosmic entity: obsidian armoured orb with one giant eye, star-
  // filled membrane wings, swept horns + crown, talons clutching the void
  // orbs. Her energy colour shifts every phase (purple > pink > red > gold).
  voidEmpress: {
    box: [232, 244],
    oy: -26,
    phased: true,
    halo: '#ff2e88',
    back(ctx, b) {
      const ph = Math.min(b.phaseIndex, 3);
      const pc = VOID_COLORS[ph];
      // star-filled wings (cached part, only rotated per frame)
      // wing cached at its final on-screen size (no per-frame scaling)
      const wing = bossPart('voidWing:' + ph, 141, 141, (c) => {
        c.scale(WING_SCALE, WING_SCALE);
        drawVoidWing(c, pc);
      });
      const flap = Math.sin(b.t * 1.6) * 0.07 + b.charge * 0.08;
      for (let side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.scale(side, 1);
        ctx.translate(46, -24);
        ctx.rotate(-flap);
        ctx.drawImage(wing.canvas, -12 * WING_SCALE, -120 * WING_SCALE, wing.w, wing.h);
        ctx.restore();
      }
      // tentacles
      for (let i = 0; i < 6; i++) {
        const x0 = -50 + i * 20;
        const sw = Math.sin(b.t * 2 + i) * 18;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, 44);
        ctx.bezierCurveTo(x0 + sw, 82, x0 - sw, 102, x0 + sw * 0.5, 126);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 11;
        ctx.stroke();
        ctx.strokeStyle = '#4a1a78';
        ctx.lineWidth = 7;
        ctx.stroke();
      }
      // orbiting crystal shards
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + b.t * (0.5 + b.rage * 0.6);
        glowAt(ctx, Math.cos(a) * 118, Math.sin(a) * 80, 14, pc, 0.45);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + b.t * (0.5 + b.rage * 0.6);
        ctx.save();
        ctx.translate(Math.cos(a) * 118, Math.sin(a) * 80);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = shade(pc, 0.35);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(6.5, 0);
        ctx.lineTo(0, 13);
        ctx.lineTo(-6.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(-4.5, 0);
        ctx.lineTo(0, -3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    },
    base(ctx, phase) {
      const pc = VOID_COLORS[Math.min(phase, 3)];
      // swept horns (behind the head)
      mirror(ctx, () => {
        const horn = (c) => {
          c.beginPath();
          c.moveTo(18, -58);
          c.bezierCurveTo(40, -92, 80, -104, 96, -138);
          c.bezierCurveTo(90, -104, 70, -80, 50, -46);
          c.closePath();
        };
        cel(ctx, horn, '#ffffff', '#d9cfee', '#6f5f99', { off: 3, hi: 0.45, hiAt: [52, -84], line: 2.8 });
        emissive(ctx, (c) => {
          c.beginPath();
          c.moveTo(80, -114);
          c.lineTo(96, -138);
          c.lineTo(86, -110);
          c.closePath();
        }, pc, '#ffffff', 10);
        cel(ctx, (c) => {
          c.beginPath();
          c.moveTo(46, -44);
          c.quadraticCurveTo(72, -54, 82, -76);
          c.quadraticCurveTo(66, -58, 54, -34);
          c.closePath();
        }, '#ffffff', '#cfc4e8', '#5e4f88', { off: 1.6, hi: 0.4, hiAt: [62, -52], line: 2.2 });
      });
      // talons + void orbs (the side hitboxes)
      mirror(ctx, () => {
        for (let k = 0; k < 3; k++) {
          const a = -0.9 + k * 0.55;
          cel(ctx, (c) => {
            c.save();
            c.translate(70, 30);
            c.rotate(a);
            c.beginPath();
            c.moveTo(-5, -26);
            c.quadraticCurveTo(10, -36, 14, -22);
            c.quadraticCurveTo(6, -26, 3, -18);
            c.closePath();
            c.restore();
          }, '#6b5a99', '#2a1a4a', '#0d0520', { off: 1.2, hi: 0, line: 2 });
        }
        emissive(ctx, (c) => {
          c.beginPath();
          c.arc(70, 30, 27, 0, TAU);
        }, pc, null, 22);
        const og = ctx.createRadialGradient(62, 22, 3, 70, 30, 27);
        og.addColorStop(0, '#ffffff');
        og.addColorStop(0.3, shade(pc, 0.3));
        og.addColorStop(0.75, pc);
        og.addColorStop(1, shade(pc, -0.5));
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(70, 30, 26, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.arc(70, 30, 26, 0, TAU);
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) {
          const a = i * 0.45;
          const r = i * 0.9;
          if (i === 0) ctx.moveTo(70, 30);
          else ctx.lineTo(70 + Math.cos(a) * r, 30 + Math.sin(a) * r * 0.8);
        }
        ctx.stroke();
        ctx.restore();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(70, 30, 26, 0, TAU);
        ctx.stroke();
        spec(ctx, 60, 18, 12, 3, 0.8, 0.85);
        // front talon over the orb
        cel(ctx, (c) => {
          c.beginPath();
          c.moveTo(52, 46);
          c.quadraticCurveTo(60, 64, 76, 58);
          c.quadraticCurveTo(66, 54, 62, 44);
          c.closePath();
        }, '#6b5a99', '#2a1a4a', '#0d0520', { off: 1.2, hi: 0, line: 2 });
      });
      // obsidian orb body
      const bodyShape = (c) => {
        c.beginPath();
        c.arc(0, 0, 74, 0, TAU);
      };
      cel(ctx, bodyShape, '#6a4a9e', '#2a1245', '#0a0314', { off: 7, hi: 0.55, hiAt: [-24, -26], line: 3.4 });
      ctx.save();
      bodyShape(ctx);
      ctx.clip();
      // armour plate seams + starfield
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 56, Math.sin(a) * 42);
        ctx.lineTo(Math.cos(a) * 80, Math.sin(a) * 80);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 22; i++) {
        const a = i * 2.39;
        const r = 40 + ((i * 17) % 32);
        const s = i % 4 ? 1.4 : 2.4;
        ctx.fillRect(Math.cos(a) * r, Math.sin(a) * r, s, s);
      }
      ctx.restore();
      // phase-coloured rim light
      rim(ctx, bodyShape, hexA(pc, 0.95), 3, 2.6);
      ctx.save();
      ctx.shadowColor = pc;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = hexA(pc, 0.8);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 72, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
      ctx.restore();
      // glowing cracks as she gets angrier
      if (phase > 0) {
        const crack = (c) => {
          c.beginPath();
          c.moveTo(-66, -24);
          c.lineTo(-46, -12);
          c.lineTo(-54, 12);
          c.moveTo(60, -34);
          c.lineTo(42, -14);
          c.lineTo(56, 8);
          if (phase > 1) {
            c.moveTo(-14, 66);
            c.lineTo(0, 50);
            c.lineTo(14, 68);
            c.moveTo(-34, -62);
            c.lineTo(-20, -50);
          }
          if (phase > 2) {
            c.moveTo(30, -66);
            c.lineTo(20, -50);
            c.lineTo(34, -44);
          }
        };
        ctx.save();
        ctx.shadowColor = pc;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = shade(pc, 0.45);
        ctx.lineWidth = 1.6 + phase;
        crack(ctx);
        ctx.stroke();
        ctx.restore();
      }
      // crown band + gem
      const crownBand = (c) => {
        c.beginPath();
        c.moveTo(-40, -62);
        c.lineTo(-30, -84);
        c.lineTo(-16, -70);
        c.lineTo(0, -96);
        c.lineTo(16, -70);
        c.lineTo(30, -84);
        c.lineTo(40, -62);
        c.quadraticCurveTo(0, -74, -40, -62);
        c.closePath();
      };
      cel(ctx, crownBand, '#9a86c8', '#3a2a66', '#120a26', { off: 2, hi: 0.4, hiAt: [-8, -78], line: 2.4 });
      gem(ctx, 0, -76, 7.5, pc);
      // eye socket
      ctx.fillStyle = '#07020f';
      ctx.beginPath();
      ctx.ellipse(0, 0, 54, 38, 0, 0, TAU);
      ctx.fill();
      ctx.save();
      ctx.shadowColor = pc;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = hexA(pc, 0.9);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 55, 39, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    },
    front(ctx, b) {
      const pc = VOID_COLORS[Math.min(b.phaseIndex, 3)];
      const k = 0.5 + 0.5 * Math.sin(b.t * 4);
      ctx.globalCompositeOperation = 'lighter';
      glowAt(ctx, -70, 30, 36, pc, 0.25 + k * 0.3);
      glowAt(ctx, 70, 30, 36, pc, 0.25 + k * 0.3);
      glowAt(ctx, 0, -76, 22, pc, 0.35 + k * 0.3);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // the eye
      ctx.fillStyle = '#e9e2fb';
      ctx.beginPath();
      ctx.ellipse(0, 0, 50, 34, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#b8acd8';
      ctx.beginPath();
      ctx.ellipse(6, 8, 46, 28, 0, 0, Math.PI);
      ctx.fill();
      const px = b.lookX * 16;
      const py = b.lookY * 9;
      ctx.fillStyle = shade(pc, -0.45);
      ctx.beginPath();
      ctx.arc(px, py, 25, 0, TAU);
      ctx.fill();
      ctx.fillStyle = pc;
      ctx.beginPath();
      ctx.arc(px - 2, py - 2, 21, 0, TAU);
      ctx.fill();
      ctx.fillStyle = shade(pc, 0.4);
      ctx.beginPath();
      ctx.arc(px - 5, py - 5, 11, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = hexA(shade(pc, -0.55), 0.8);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        ctx.moveTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9);
        ctx.lineTo(px + Math.cos(a) * 21, py + Math.sin(a) * 21);
      }
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(px, py, 5 + b.charge * 5, 17, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px - 9, py - 10, 4.8, 0, TAU);
      ctx.arc(px + 8, py + 8, 2, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 0, 50, 34, 0, 0, TAU);
      ctx.stroke();
      // slow blink
      const blink = Math.max(0, Math.sin(b.t * 0.7) - 0.97) * 30;
      if (blink > 0) {
        ctx.fillStyle = '#2a1245';
        ctx.beginPath();
        ctx.ellipse(0, -34 + blink * 34, 52, 34 * blink, 0, 0, TAU);
        ctx.fill();
      }
      chargeGlow(ctx, 0, 0, 46, pc, b.charge * 0.8);
    },
  },
};

// Void Empress wing (right side, origin = shoulder): bone struts, scalloped
// membrane filled with a starfield, glowing leading edge.
function drawVoidWing(ctx, pc) {
  ctx.translate(12, 120);
  const membrane = (c) => {
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(150, -104);
    c.quadraticCurveTo(150, -60, 172, -44);
    c.quadraticCurveTo(140, -30, 150, 4);
    c.quadraticCurveTo(116, -4, 112, 34);
    c.quadraticCurveTo(74, 12, 40, 40);
    c.quadraticCurveTo(30, 20, 0, 18);
    c.closePath();
  };
  const g = ctx.createLinearGradient(0, 0, 160, -80);
  g.addColorStop(0, '#1d0a33');
  g.addColorStop(0.55, shade(pc, -0.4));
  g.addColorStop(1, shade(pc, -0.05));
  membrane(ctx);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  membrane(ctx);
  ctx.clip();
  let s = 7;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s % 1000) / 1000;
  };
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + rnd() * 0.7) + ')';
    const sz = rnd() < 0.15 ? 2.2 : 1.2;
    ctx.fillRect(rnd() * 170, -110 + rnd() * 150, sz, sz);
  }
  const neb = ctx.createRadialGradient(110, -40, 4, 110, -40, 60);
  neb.addColorStop(0, hexA(pc, 0.45));
  neb.addColorStop(1, hexA(pc, 0));
  ctx.fillStyle = neb;
  ctx.fillRect(40, -110, 140, 150);
  ctx.restore();
  membrane(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.save();
  ctx.shadowColor = pc;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = hexA(pc, 0.8);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(150, -104);
  ctx.quadraticCurveTo(150, -60, 172, -44);
  ctx.quadraticCurveTo(140, -30, 150, 4);
  ctx.quadraticCurveTo(116, -4, 112, 34);
  ctx.quadraticCurveTo(74, 12, 40, 40);
  ctx.stroke();
  ctx.restore();
  // bones
  for (const [x, y] of [
    [172, -44],
    [150, 4],
    [112, 34],
  ]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(8, -4);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.strokeStyle = '#8a78b8';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // glowing leading edge
  ctx.save();
  ctx.shadowColor = pc;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = shade(pc, 0.3);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(150, -104);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4, -3);
  ctx.lineTo(148, -102);
  ctx.stroke();
}

// Broodmother egg clusters [x, y, r] and eyes [x, y, r].
const EGGS = [
  [-46, -52, 9],
  [-32, -62, 7],
  [-56, -36, 6.5],
  [44, -54, 9],
  [30, -64, 7],
  [56, -38, 6.5],
  [-12, -40, 8],
  [10, -44, 7.5],
  [-4, -26, 6],
  [-40, -12, 7],
  [40, -14, 7],
  [0, -64, 6.5],
];
const BROOD_EYES = [
  [-15, 32, 6.5],
  [15, 32, 6.5],
  [-6, 26, 4.5],
  [6, 26, 4.5],
  [-26, 40, 4],
  [26, 40, 4],
  [-8, 42, 3.2],
  [8, 42, 3.2],
];

const VOID_COLORS = ['#b27dff', '#ff5ec8', '#ff4f5e', '#ffb13d'];
const WING_SCALE = 0.74;

// Jellytron: rim light count + reusable tentacle sample buffer (no per-frame
// allocations).
const JELLY_LIGHTS = 11;
const TENTACLES = 10;
const TENT_SEG = 9;
const TENT_PTS = new Float32Array(TENTACLES * TENT_SEG * 2);

// -------------------------------------------------------------- cache
// Only the bosses currently on screen are kept (big canvases), keyed by
// art + phase; a new boss clears the previous one's sprites.
let cacheArt = '';
const baseCache = new Map();
const partCache = new Map();

// Separately cached animated part (e.g. wings), cleared with the boss.
function bossPart(key, w, h, draw) {
  let s = partCache.get(key);
  if (!s) {
    const c = makeCanvas(w * BOSS_SPR, h * BOSS_SPR);
    const x = c.getContext('2d');
    x.scale(BOSS_SPR, BOSS_SPR);
    x.lineJoin = 'round';
    x.lineCap = 'round';
    draw(x);
    s = { canvas: c, w, h };
    partCache.set(key, s);
  }
  return s;
}

export function bossBase(artKey, phase) {
  if (artKey !== cacheArt) {
    baseCache.clear();
    partCache.clear();
    cacheArt = artKey;
  }
  const art = BOSS_ART[artKey];
  const key = art.phased ? phase : 0;
  let s = baseCache.get(key);
  if (!s) {
    s = renderBase(art, key);
    baseCache.set(key, s);
  }
  return s;
}

export function bossBaseWhite(artKey, phase) {
  const art = BOSS_ART[artKey];
  const key = 'w' + (art.phased ? phase : 0);
  bossBase(artKey, phase);
  let s = baseCache.get(key);
  if (!s) {
    s = whiteVersion(bossBase(artKey, phase));
    baseCache.set(key, s);
  }
  return s;
}

function renderBase(art, phase) {
  const [w, h] = art.box;
  const c = makeCanvas(w * BOSS_SPR, h * BOSS_SPR);
  const ctx = c.getContext('2d');
  ctx.scale(BOSS_SPR, BOSS_SPR);
  ctx.translate(w / 2, h / 2 - (art.oy || 0));
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  art.base(ctx, phase);
  // bake a soft neon halo around the whole silhouette
  const out = makeCanvas(c.width, c.height);
  const o = out.getContext('2d');
  o.shadowColor = hexA(art.halo, 0.7);
  o.shadowBlur = 16 * BOSS_SPR;
  o.drawImage(c, 0, 0);
  o.shadowBlur = 0;
  o.shadowColor = 'transparent';
  o.drawImage(c, 0, 0);
  return { canvas: out, w, h, oy: art.oy || 0 };
}

import { enemySprite, enemyWhite } from '../art/EnemyArt.js';
import { glowSprite } from '../art/Sprites.js';

// A single pooled enemy. Movement modes:
//   enter  follow an entry bezier to its formation slot
//   hold   sit in formation (with group sway), may start a dive
//   dive   swoop down at the player, then re-enter from the top
//   pass   follow a parametric path across the screen and leave
//   fall   drift downward with a sine sway (boss minions)

export function makeEnemy() {
  return {
    alive: false,
    type: null,
    typeId: '',
    hp: 1,
    maxHp: 1,
    r: 10,
    x: 0,
    y: 0,
    prevX: 0,
    vx: 0,
    mode: 'enter',
    t: 0,
    dur: 1,
    p0x: 0,
    p0y: 0,
    p1x: 0,
    p1y: 0,
    p2x: 0,
    p2y: 0,
    p3x: 0,
    p3y: 0,
    slotX: 0,
    slotY: 0,
    path: null,
    pathParams: { dir: 1, x: 200, y: 200, amp: 40 },
    baseX: 0,
    vy: 0,
    swayAmp: 0,
    flash: 0,
    age: 0,
    fireTimer: 0,
    charging: 0,
    chargeTime: 0,
    fireKind: 0, // 0 none, 1 type attack, 2 ambient drop
    waveId: -1,
    minion: false,
    phase: 0, // animation offset
    scoreMul: 1,
    dying: false,
  };
}

const ANIMATED = { zipfly: 16, swirlie: 5, spitter: 4, rockshell: 3, spikeling: 6 };

export function renderEnemy(ctx, e) {
  const type = e.type;
  const art = type.art;
  const rate = ANIMATED[art];
  let frame = 0;
  if (rate) frame = Math.floor(e.age * rate + e.phase) % 2;
  else if ((e.age + e.phase) % 3.1 < 0.14) frame = 1; // blink
  const s = e.flash > 0 ? enemyWhite(art, type.radius, frame) : enemySprite(art, type.radius, frame);

  const spawnK = e.age < 0.25 ? e.age / 0.25 : 1;
  const wob = Math.sin(e.age * 6 + e.phase * 3) * 0.05;
  const sx = spawnK * (1 + wob);
  const sy = spawnK * (1 - wob);
  const tilt = Math.max(-0.35, Math.min(0.35, e.vx * 0.0025));

  ctx.save();
  ctx.translate(e.x, e.y);
  if (tilt) ctx.rotate(tilt);
  ctx.drawImage(s.canvas, (-s.w * sx) / 2, (-s.h * sy) / 2, s.w * sx, s.h * sy);
  ctx.restore();

  // attack telegraph: pulsing glow where the shot will come from
  if (e.charging > 0) {
    const k = 1 - e.charging / e.chargeTime;
    const g = glowSprite('#ff4f5e', 16);
    const size = 10 + k * 22 + Math.sin(e.age * 40) * 3;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + k * 0.5;
    ctx.drawImage(g.canvas, e.x - size / 2, e.y + type.radius * 0.8 - size / 2, size, size);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // tanky enemies show a small health bar once damaged
  if (e.maxHp >= 50 && e.hp < e.maxHp) {
    const w = type.radius * 1.8;
    const y = e.y - type.radius - 8;
    ctx.fillStyle = 'rgba(20,10,40,0.8)';
    ctx.fillRect(e.x - w / 2 - 1, y - 1, w + 2, 5);
    ctx.fillStyle = '#ff5e7a';
    ctx.fillRect(e.x - w / 2, y, w * (e.hp / e.maxHp), 3);
  }
}

import { DEG, TAU, rand, clamp, lerp } from '../core/math.js';

// Boss attack implementations. Each runner has:
//   start(b, s, st, g)          called when the telegraph begins (choose targets)
//   telegraph(b, s, st, g, dt)  optional, runs every frame during the warning
//   update(b, s, st, g, dt)     runs after the telegraph; return true when done
//   render(b, s, st, g, ctx, k) optional warning / beam visuals (k = telegraph 0..1, or -1 when active)
// `st` is a per-boss scratch object reset before every attack.

function emitter(b, s, st) {
  const f = s.from || [0, 50];
  let dx = f[0];
  if (dx !== 0) {
    st.side = st.side ? -st.side : 1;
    dx *= st.side;
  }
  st.ex = b.x + dx;
  st.ey = b.y + f[1];
}

function aimAt(g, x, y) {
  return Math.atan2(g.player.y - y, g.player.x - x);
}

export const PATTERNS = {
  fan: {
    start(b, s, st) {
      st.shots = s.repeat || 1;
      st.timer = 0;
    },
    update(b, s, st, g, dt) {
      st.timer -= dt;
      if (st.shots > 0 && st.timer <= 0) {
        emitter(b, s, st);
        const base = s.aim ? aimAt(g, st.ex, st.ey) : Math.PI / 2;
        const n = s.count;
        const spread = s.spread * DEG;
        for (let i = 0; i < n; i++) {
          const a = n === 1 ? base : base - spread / 2 + (spread * i) / (n - 1);
          g.bullets.fireEnemy(st.ex, st.ey, a, s.speed, s.damage, s.bullet);
        }
        g.audio.play('enemyShoot');
        st.shots--;
        st.timer = s.interval || 0.5;
      }
      return st.shots <= 0 && st.timer <= 0;
    },
  },

  aimed: {
    start(b, s, st) {
      st.shots = s.count;
      st.timer = 0;
    },
    update(b, s, st, g, dt) {
      st.timer -= dt;
      if (st.shots > 0 && st.timer <= 0) {
        emitter(b, s, st);
        g.bullets.fireEnemy(st.ex, st.ey, aimAt(g, st.ex, st.ey), s.speed, s.damage, s.bullet);
        g.audio.play('enemyShoot');
        st.shots--;
        st.timer = s.interval;
      }
      return st.shots <= 0 && st.timer <= 0;
    },
  },

  ring: {
    start(b, s, st) {
      st.shots = s.repeat || 1;
      st.timer = 0;
      st.rot = rand(0, TAU);
    },
    update(b, s, st, g, dt) {
      st.timer -= dt;
      if (st.shots > 0 && st.timer <= 0) {
        emitter(b, s, st);
        const n = s.count;
        for (let i = 0; i < n; i++) g.bullets.fireEnemy(st.ex, st.ey, st.rot + (i / n) * TAU, s.speed, s.damage, s.bullet);
        st.rot += (s.rotate || 0) * DEG;
        g.audio.play('bossAttack');
        st.shots--;
        st.timer = s.interval || 0.6;
      }
      return st.shots <= 0 && st.timer <= 0;
    },
  },

  spiral: {
    start(b, s, st, g) {
      st.time = s.duration;
      st.acc = 0;
      st.ang = aimAt(g, b.x, b.y);
    },
    update(b, s, st, g, dt) {
      st.time -= dt;
      st.acc += dt;
      const step = 1 / s.rate;
      while (st.acc >= step) {
        st.acc -= step;
        emitter(b, s, st);
        for (let k = 0; k < s.arms; k++) g.bullets.fireEnemy(st.ex, st.ey, st.ang + (k / s.arms) * TAU, s.speed, s.damage, s.bullet);
        st.ang += s.turn * DEG;
        g.audio.play('enemyShoot');
      }
      return st.time <= 0;
    },
  },

  rain: {
    start(b, s, st) {
      st.time = s.duration;
      st.acc = 0;
    },
    update(b, s, st, g, dt) {
      st.time -= dt;
      st.acc += dt;
      const step = 1 / s.rate;
      const half = b.def.size[0] * 0.45;
      while (st.acc >= step) {
        st.acc -= step;
        g.bullets.fireEnemy(b.x + rand(-half, half), b.y + rand(10, 40), Math.PI / 2 + rand(-0.25, 0.25), s.speed * rand(0.8, 1.2), s.damage, s.bullet);
      }
      return st.time <= 0;
    },
  },

  wall: {
    start(b, s, st, g) {
      st.rows = s.rows;
      st.timer = 0;
      st.gap = clamp(g.player.x, 70, g.W - 70);
    },
    update(b, s, st, g, dt) {
      st.timer -= dt;
      if (st.rows > 0 && st.timer <= 0) {
        // next gap is always reachable from the previous one
        st.gap = clamp(st.gap + rand(-130, 130), 70, g.W - 70);
        const half = s.gap / 2;
        const y = b.y + 50;
        for (let x = 12; x <= g.W - 12; x += 26) {
          if (Math.abs(x - st.gap) < half) continue;
          g.bullets.fireEnemy(x, y, Math.PI / 2, s.speed, s.damage, s.bullet);
        }
        g.audio.play('bossAttack');
        st.rows--;
        st.timer = s.interval;
      }
      return st.rows <= 0 && st.timer <= 0;
    },
  },

  laser: {
    start(b, s, st, g) {
      st.n = s.count;
      st.xs = st.xs || [0, 0, 0, 0, 0];
      this.place(s, st, g);
      st.time = s.duration;
      st.hitTimer = 0;
      g.audio.play('laserCharge');
    },
    place(s, st, g) {
      const px = g.player.x;
      const gap = 105;
      for (let i = 0; i < st.n; i++) {
        const off = i === 0 ? 0 : Math.ceil(i / 2) * gap * (i % 2 ? -1 : 1);
        st.xs[i] = clamp(px + off, 20, g.W - 20);
      }
    },
    telegraph(b, s, st, g, dt, k) {
      // beams follow the player for the first 60% of the warning, then lock
      if (s.track && k < 0.6) {
        const px = g.player.x;
        const gap = 105;
        for (let i = 0; i < st.n; i++) {
          const off = i === 0 ? 0 : Math.ceil(i / 2) * gap * (i % 2 ? -1 : 1);
          st.xs[i] = lerp(st.xs[i], clamp(px + off, 20, g.W - 20), Math.min(1, dt * 6));
        }
      }
    },
    update(b, s, st, g, dt) {
      if (st.time === s.duration) {
        g.audio.play('laser');
        g.shake.add(0.25);
      }
      st.time -= dt;
      st.hitTimer -= dt;
      const p = g.player;
      const hw = s.width / 2 - 3;
      for (let i = 0; i < st.n; i++) {
        if (Math.abs(p.x - st.xs[i]) < hw && p.y > b.y && st.hitTimer <= 0) {
          g.damagePlayer(s.damage, st.xs[i], p.y);
          st.hitTimer = 0.4;
        }
        if (Math.random() < 0.5) g.particles.spawn('spark', st.xs[i] + rand(-8, 8), rand(b.y + 40, g.H), rand(-60, 60), rand(-200, -60), 0.25, 5, '#ff9ad5', { drag: 3 });
      }
      return st.time <= 0;
    },
    render(b, s, st, g, ctx, k) {
      const top = b.y + 40;
      for (let i = 0; i < st.n; i++) {
        const x = st.xs[i];
        if (k >= 0) {
          // telegraph: blinking thin line + width guides
          const blink = Math.floor(k * 14) % 2 === 0 ? 0.9 : 0.35;
          ctx.globalAlpha = blink * (0.4 + k * 0.6);
          ctx.fillStyle = 'rgba(255,60,120,0.18)';
          ctx.fillRect(x - s.width / 2, top, s.width, g.H - top);
          ctx.strokeStyle = '#ff3d6e';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(x, top);
          ctx.lineTo(x, g.H);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#ff3d6e';
          ctx.font = '900 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', x, g.H - 70);
        } else {
          const w = s.width * (0.85 + Math.random() * 0.3);
          const grd = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
          grd.addColorStop(0, 'rgba(255,60,160,0)');
          grd.addColorStop(0.3, 'rgba(255,90,200,0.85)');
          grd.addColorStop(0.5, 'rgba(255,255,255,1)');
          grd.addColorStop(0.7, 'rgba(255,90,200,0.85)');
          grd.addColorStop(1, 'rgba(255,60,160,0)');
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = grd;
          ctx.fillRect(x - w / 2, top, w, g.H - top);
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    },
  },

  charge: {
    start(b, s, st, g) {
      st.phase = 0;
      st.targetX = clamp(g.player.x, 70, g.W - 70);
      st.pause = 0;
      b.moveOverride = true;
    },
    telegraph(b, s, st, g, dt, k) {
      if (k < 0.5) st.targetX = clamp(g.player.x, 70, g.W - 70);
      b.x += (st.targetX - b.x) * Math.min(1, dt * 5);
      b.y += (b.def.holdY - 20 - b.y) * Math.min(1, dt * 4);
    },
    update(b, s, st, g, dt) {
      const bottom = g.H - 150;
      if (st.phase === 0) {
        b.y += s.speed * dt;
        if (b.y >= bottom) {
          b.y = bottom;
          st.phase = 1;
          st.pause = 0.35;
          g.shake.add(0.5);
          g.audio.play('bomb');
          g.effects.shockwave(b.x, b.y + 50, '#ffd23f', 110, 0.5);
          for (let i = 0; i < 10; i++) g.bullets.fireEnemy(b.x, b.y + 30, Math.PI + (i / 9) * Math.PI, 150, 11, 'needle');
        }
      } else if (st.phase === 1) {
        st.pause -= dt;
        if (st.pause <= 0) st.phase = 2;
      } else {
        b.y -= s.speed * 0.45 * dt;
        if (b.y <= b.def.holdY) {
          b.y = b.def.holdY;
          b.moveOverride = false;
          return true;
        }
      }
      return false;
    },
    render(b, s, st, g, ctx, k) {
      if (k < 0) return;
      const w = 130;
      const blink = Math.floor(k * 12) % 2 === 0 ? 1 : 0.5;
      ctx.globalAlpha = (0.25 + k * 0.35) * blink;
      ctx.fillStyle = '#ff3d6e';
      ctx.fillRect(b.x - w / 2, b.y + 60, w, g.H - b.y - 60);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = '900 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▼ DODGE ▼', b.x, g.H - 90);
    },
  },

  summon: {
    start(b, s, st) {
      st.left = s.count;
      st.timer = 0.2;
    },
    update(b, s, st, g, dt) {
      st.timer -= dt;
      if (st.left > 0 && st.timer <= 0) {
        if (g.enemies.countMinions() < s.max) {
          const o = st.opts || (st.opts = {});
          o.mode = 'fall';
          o.fromX = b.x + rand(-40, 40);
          o.fromY = b.y + 30;
          o.waveId = -1;
          o.minion = true;
          g.enemies.spawn(s.enemy, o);
          g.effects.pickupBurst(o.fromX, o.fromY, b.def.color);
        }
        st.left--;
        st.timer = 0.18;
      }
      return st.left <= 0;
    },
  },

  nova: {
    start(b, s, st) {
      st.rings = s.rings;
      st.timer = 0;
      st.rot = rand(0, TAU);
    },
    update(b, s, st, g, dt) {
      st.timer -= dt;
      if (st.rings > 0 && st.timer <= 0) {
        emitter(b, s, st);
        const n = s.count;
        const sp = s.speed * (1 + (s.rings - st.rings) * 0.12);
        for (let i = 0; i < n; i++) g.bullets.fireEnemy(st.ex, st.ey, st.rot + (i / n) * TAU, sp, s.damage, s.bullet);
        st.rot += Math.PI / n; // offset so each ring's gaps shift by half a step
        g.effects.shockwave(st.ex, st.ey, b.def.color, 140, 0.4);
        g.audio.play('bomb');
        g.shake.add(0.3);
        st.rings--;
        st.timer = s.interval;
      }
      return st.rings <= 0 && st.timer <= 0;
    },
    render(b, s, st, g, ctx, k) {
      if (k < 0) return;
      ctx.globalAlpha = 0.3 + k * 0.5;
      ctx.strokeStyle = '#ff3d6e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 40 + (1 - k) * 200, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  },
};

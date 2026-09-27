import { STATE } from '../game/GameState.js';
import { CONFIG } from '../data/config.js';
import { TAU } from '../core/math.js';
import { LEVELS } from '../data/levels.js';

// Debug mode (OFF by default). Enable from Settings or with ?debug=1.
// Shows FPS / entity counts, draws collision circles and exposes cheat
// buttons: skip wave, spawn boss, win level, add coins, refill HP, god mode.

export class Debug {
  constructor(game) {
    this.game = game;
    const url = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
    this.enabled = !!game.save.data.settings.debug || (url && url.get('debug') === '1');
    this.god = false;
    this.showHitboxes = true;
    this.panel = document.getElementById('debug-panel');
    this.bind();
    this.setEnabled(this.enabled);
  }

  bind() {
    if (!this.panel) return;
    this.panel.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-dbg]');
      if (!btn) return;
      this.action(btn.dataset.dbg);
      this.refreshLabels();
    });
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.panel) this.panel.classList.toggle('hidden', !on);
    if (!on) this.god = false;
    this.refreshLabels();
  }

  refreshLabels() {
    if (!this.panel) return;
    const god = this.panel.querySelector('[data-dbg="god"]');
    if (god) god.textContent = 'GOD: ' + (this.god ? 'ON' : 'OFF');
    const hb = this.panel.querySelector('[data-dbg="hitbox"]');
    if (hb) hb.textContent = 'BOXES: ' + (this.showHitboxes ? 'ON' : 'OFF');
  }

  action(name) {
    const g = this.game;
    const playing = g.state === STATE.PLAYING;
    switch (name) {
      case 'wave':
        if (playing) g.waves.skipWave();
        break;
      case 'boss':
        if (playing) g.waves.skipToBoss();
        break;
      case 'win':
        if (playing) {
          const b = g.bossManager.active;
          if (b && b.vulnerable) b.damage(b.hp + 1);
          else {
            g.waves.skipToBoss();
            g.waves.timer = 0.01;
          }
        }
        break;
      case 'coins':
        g.save.addCoins(1000);
        g.save.save();
        g.ui.refreshCoins();
        break;
      case 'hp':
        g.player.hp = g.player.maxHp;
        g.player.shield = g.player.maxShield;
        g.player.skillCooldown = 0;
        break;
      case 'power':
        g.player.power = CONFIG.PLAYER.maxPower;
        break;
      case 'god':
        this.god = !this.god;
        break;
      case 'hitbox':
        this.showHitboxes = !this.showHitboxes;
        break;
      case 'unlock':
        g.save.data.unlockedLevel = LEVELS.length;
        g.save.save();
        break;
      default:
        break;
    }
  }

  render(ctx) {
    if (!this.enabled) return;
    const g = this.game;
    if (this.showHitboxes && g.state !== STATE.MENU) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(0,255,120,0.8)';
      for (const e of g.enemies.active) circle(ctx, e.x, e.y, e.r);
      ctx.strokeStyle = 'rgba(255,255,0,0.8)';
      for (const b of g.bullets.enemy.active) circle(ctx, b.x, b.y, b.r);
      ctx.strokeStyle = 'rgba(0,200,255,0.8)';
      const p = g.player;
      circle(ctx, p.x, p.y, CONFIG.PLAYER.hitRadius);
      circle(ctx, p.x, p.y, CONFIG.PLAYER.bodyRadius * 0.6);
      const boss = g.bossManager.active;
      if (boss) {
        ctx.strokeStyle = 'rgba(255,0,255,0.9)';
        for (const c of boss.def.hit) circle(ctx, boss.x + c[0], boss.y + c[1], c[2]);
      }
    }
    const lines = [
      'FPS ' + g.loop.fps.toFixed(0) + '  frame ' + g.loop.frameMs.toFixed(1) + 'ms',
      'E ' + g.enemies.count + '  PB ' + g.bullets.player.count + '  EB ' + g.bullets.enemy.count,
      'P ' + g.particles.count + '  Q ' + g.particles.quality + '  dpr ' + g.viewport.dpr.toFixed(2),
      'wave ' + g.waves.phase + ' ' + (g.waves.waveIndex + 1) + (this.god ? '  GOD' : ''),
    ];
    ctx.font = '700 10px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(4, g.H - 150, 190, lines.length * 12 + 6);
    ctx.fillStyle = '#7dff9b';
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 8, g.H - 147 + i * 12);
    ctx.textBaseline = 'middle';
  }
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
}

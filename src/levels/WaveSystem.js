import { formationSlots } from './Formations.js';
import { CONFIG } from '../data/config.js';

// Drives a level: intro -> waves (spawn queue built from data) -> boss warning
// -> boss. Tracks per-wave perfect / no-damage bonuses.

export const WAVE_PHASE = Object.freeze({
  INTRO: 'intro',
  WAVE: 'wave',
  BETWEEN: 'between',
  WARNING: 'warning',
  BOSS: 'boss',
  DONE: 'done',
});

export class WaveSystem {
  constructor(game) {
    this.game = game;
    this.level = null;
    this.phase = WAVE_PHASE.DONE;
    this.queue = [];
    this.waveIndex = 0;
    this.waveTime = 0;
    this.timer = 0;
    this.waveId = 0;
    this.spawned = 0;
    this.killed = 0;
    this.escaped = 0;
    this.damaged = false;
    this.waveCleared = 0;
    this._opts = {};
  }

  get totalWaves() {
    return this.level ? this.level.waves.length : 0;
  }

  start(level) {
    this.level = level;
    this.phase = WAVE_PHASE.INTRO;
    this.timer = level.tutorial ? 3.2 : 2.4;
    this.waveIndex = -1;
    this.queue.length = 0;
    this.waveCleared = 0;
  }

  startWave(index) {
    const g = this.game;
    this.waveIndex = index;
    this.waveId++;
    this.phase = WAVE_PHASE.WAVE;
    this.waveTime = 0;
    this.spawned = 0;
    this.killed = 0;
    this.escaped = 0;
    this.damaged = false;
    this.queue.length = 0;

    const wave = this.level.waves[index];
    for (const grp of wave.groups) {
      const n = grp.count;
      const slots = grp.behavior === 'pass' ? null : formationSlots(grp.formation || 'row', n, { W: g.W, x: grp.x, y: grp.y, spacing: grp.spacing, rows: grp.rows });
      const interval = grp.interval != null ? grp.interval : 0.15;
      for (let i = 0; i < n; i++) {
        this.queue.push({ time: (grp.delay || 0) + i * interval, grp, index: i, slot: slots ? slots[i] : null });
      }
    }
    this.queue.sort((a, b) => a.time - b.time);
    g.hud.banner('WAVE ' + (index + 1), index === this.level.waves.length - 1 ? 'FINAL WAVE' : '', '#ffffff', 1.4);
    g.audio.play('wave');
  }

  update(dt) {
    const g = this.game;
    switch (this.phase) {
      case WAVE_PHASE.INTRO:
        this.timer -= dt;
        if (this.timer <= 0) this.startWave(0);
        break;
      case WAVE_PHASE.WAVE: {
        this.waveTime += dt;
        const o = this._opts;
        while (this.queue.length && this.queue[0].time <= this.waveTime) {
          const q = this.queue.shift();
          const grp = q.grp;
          o.mode = grp.behavior === 'pass' ? 'pass' : 'enter';
          o.entry = grp.entry;
          o.index = q.index;
          o.path = grp.path;
          o.dir = grp.dir;
          o.x = grp.x;
          o.y = grp.y;
          o.amp = grp.amp;
          o.duration = grp.duration;
          o.slotX = q.slot ? q.slot.x : 0;
          o.slotY = q.slot ? q.slot.y : 0;
          o.waveId = this.waveId;
          o.minion = false;
          if (g.enemies.spawn(grp.enemy, o)) this.spawned++;
        }
        if (!this.queue.length && g.enemies.countWave(this.waveId) === 0) this.completeWave();
        break;
      }
      case WAVE_PHASE.BETWEEN:
        this.timer -= dt;
        if (this.timer <= 0) {
          if (this.waveIndex + 1 < this.level.waves.length) this.startWave(this.waveIndex + 1);
          else this.startBossWarning();
        }
        break;
      case WAVE_PHASE.WARNING:
        this.timer -= dt;
        if (this.timer <= 0) {
          this.phase = WAVE_PHASE.BOSS;
          g.bossManager.spawn(this.level.boss);
        }
        break;
      default:
        break;
    }
  }

  completeWave() {
    const g = this.game;
    const lvl = this.level.id;
    this.waveCleared++;
    let delay = 1.6;
    if (this.spawned > 0 && this.escaped === 0 && this.killed === this.spawned) {
      const pts = g.score.addBonus(CONFIG.SCORE.perfectWave * lvl);
      g.run.perfectWaves++;
      g.hud.banner('PERFECT WAVE!', '+' + pts.toLocaleString('en-US'), '#ffd23f', 1.6, 0.62);
      delay = 2;
    }
    if (!this.damaged) {
      const pts = g.score.addBonus(CONFIG.SCORE.noDamageWave * lvl);
      g.run.noDamageWaves++;
      g.texts.spawn('NO DAMAGE +' + pts, g.W / 2, g.H * 0.5, '#5dff7a', 16, 1.4, -30);
    }
    this.phase = WAVE_PHASE.BETWEEN;
    this.timer = delay;
  }

  startBossWarning() {
    const g = this.game;
    this.phase = WAVE_PHASE.WARNING;
    this.timer = 3;
    g.hud.warning(3);
    g.audio.play('bossWarning');
    g.audio.playMusic('boss');
    g.bg.targetSpeedMul = 3;
  }

  // Debug helpers --------------------------------------------------------
  skipWave() {
    if (this.phase === WAVE_PHASE.BOSS || this.phase === WAVE_PHASE.WARNING) return;
    const g = this.game;
    this.queue.length = 0;
    for (const e of g.enemies.active) if (e.waveId === this.waveId) e.alive = false;
    g.enemies.pool.sweep();
    if (this.phase === WAVE_PHASE.INTRO) this.startWave(0);
    else {
      this.phase = WAVE_PHASE.BETWEEN;
      this.timer = 0.01;
    }
  }

  skipToBoss() {
    if (this.phase === WAVE_PHASE.BOSS || this.phase === WAVE_PHASE.WARNING) return;
    const g = this.game;
    this.queue.length = 0;
    g.enemies.clear();
    this.waveIndex = this.level.waves.length - 1;
    this.startBossWarning();
  }

  // Called when an enemy dies (killed = true) or leaves the screen.
  onEnemyGone(e, killed) {
    if (e.waveId !== this.waveId) return;
    if (killed) this.killed++;
    else this.escaped++;
  }

  onPlayerDamaged() {
    this.damaged = true;
  }
}

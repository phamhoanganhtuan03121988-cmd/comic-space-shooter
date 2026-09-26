import { BOSSES } from '../data/bosses.js';
import { Boss, BOSS_STATE } from './Boss.js';

// Spawns and owns the (single) active boss.

export class BossManager {
  constructor(game) {
    this.game = game;
    this.boss = new Boss(game);
  }

  get active() {
    return this.boss.alive ? this.boss : null;
  }

  spawn(id) {
    const def = BOSSES[id];
    if (!def) throw new Error('Unknown boss: ' + id);
    this.boss.init(def);
    const g = this.game;
    g.hud.bossIntro(def.name, def.title);
    return this.boss;
  }

  update(dt) {
    if (this.boss.alive) this.boss.update(dt);
  }

  render(ctx) {
    if (this.boss.alive) this.boss.render(ctx);
  }

  isFighting() {
    return this.boss.alive && this.boss.state === BOSS_STATE.FIGHT;
  }

  clear() {
    this.boss.alive = false;
  }
}

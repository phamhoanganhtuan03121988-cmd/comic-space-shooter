import { CONFIG } from '../data/config.js';

// Kill streak multiplier. Kills within COMBO.window seconds keep the chain
// alive; getting hit or waiting too long resets it.

export class ComboSystem {
  constructor(config = CONFIG.COMBO) {
    this.tiers = config.tiers;
    this.window = config.window;
    this.onTierUp = null;
    this.onBreak = null;
    this.reset();
  }

  reset() {
    this.count = 0;
    this.timer = 0;
    this.mult = 1;
    this.tier = 0;
    this.max = 0;
    this.pop = 0; // UI pop animation timer
  }

  tierFor(count) {
    let t = 0;
    for (let i = 0; i < this.tiers.length; i++) if (count >= this.tiers[i].kills) t = i;
    return t;
  }

  addKill() {
    this.count++;
    this.timer = this.window;
    if (this.count > this.max) this.max = this.count;
    const t = this.tierFor(this.count);
    if (t > this.tier) {
      this.tier = t;
      this.mult = this.tiers[t].mult;
      this.pop = 1;
      if (this.onTierUp) this.onTierUp(this.mult, this.count);
    } else {
      this.pop = Math.max(this.pop, 0.35);
    }
    return this.mult;
  }

  // Player got hit / timer expired.
  break() {
    const had = this.count;
    this.count = 0;
    this.timer = 0;
    this.tier = 0;
    this.mult = 1;
    if (had >= 5 && this.onBreak) this.onBreak(had);
  }

  update(dt) {
    if (this.pop > 0) this.pop = Math.max(0, this.pop - dt * 2.5);
    if (this.count > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.break();
    }
  }

  get timerFrac() {
    return this.count > 0 ? this.timer / this.window : 0;
  }
}

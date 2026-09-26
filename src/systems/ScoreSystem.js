// Score bookkeeping. All score gains go through here so the combo multiplier
// and bonus tracking stay consistent.

export class ScoreSystem {
  constructor(run, combo) {
    this.run = run;
    this.combo = combo;
    this.displayScore = 0; // smoothly counts up in the HUD
  }

  reset(startScore) {
    this.displayScore = startScore;
  }

  // Base score scaled by combo. Returns the points actually awarded.
  addKill(base) {
    const pts = Math.round(base * this.combo.mult);
    this.run.score += pts;
    return pts;
  }

  addRaw(pts) {
    this.run.score += Math.round(pts);
    return Math.round(pts);
  }

  addBonus(pts) {
    const p = Math.round(pts);
    this.run.score += p;
    this.run.bonus += p;
    return p;
  }

  update(dt) {
    const target = this.run.score;
    if (this.displayScore < target) {
      const diff = target - this.displayScore;
      this.displayScore += Math.max(1, diff * Math.min(1, dt * 10));
      if (this.displayScore > target) this.displayScore = target;
    } else if (this.displayScore > target) {
      this.displayScore = target;
    }
  }
}

// High level screens/states and the per-run statistics container.

export const STATE = Object.freeze({
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  VICTORY: 'victory',
  GAMEOVER: 'gameover',
});

// Stats for one attempt at one level. `score` carries across NEXT LEVEL.
export class RunState {
  constructor() {
    this.reset(0, 0);
  }

  reset(levelIndex, startScore) {
    this.levelIndex = levelIndex;
    this.levelStartScore = startScore;
    this.score = startScore;
    this.kills = 0;
    this.coins = 0; // collected coins this attempt (banked on victory / game over)
    this.itemsCollected = 0;
    this.bonus = 0; // bonus score earned (perfect wave, no damage, clear ...)
    this.maxCombo = 0;
    this.crits = 0;
    this.damageTaken = 0;
    this.time = 0;
    this.perfectWaves = 0;
    this.noDamageWaves = 0;
    this.bossDefeated = false;
    this.banked = false;
  }
}

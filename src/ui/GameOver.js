import { statRows } from './VictoryScreen.js';

// Game over summary with RETRY / UPGRADE / MAIN MENU.

export class GameOverScreen {
  constructor(ui) {
    this.ui = ui;
    this.sub = document.getElementById('gameover-sub');
    this.stats = document.getElementById('gameover-stats');
  }

  set(s) {
    this.sub.textContent = s.newBest ? 'New best score! Coins you collected were kept.' : 'Coins you collected were kept — upgrade and try again!';
    statRows(this.stats, [
      { label: 'Score', value: s.score, count: true, big: true },
      { label: 'Best Score', value: s.best, count: true },
      { label: 'Enemies Destroyed', value: s.kills, count: true },
      { label: 'Coins Earned', value: s.coins, count: true },
      { label: 'Level', value: 'Sector ' + s.level.id + (s.reachedBoss ? ' · Boss' : ' · Wave ' + Math.max(1, s.wave)), count: false },
    ]);
  }
}

// Main menu: PLAY / UPGRADE / HOW TO PLAY / SETTINGS + coin and best-score chips.
// Buttons are routed by UIManager (data-action attributes in index.html).

export class MainMenu {
  constructor(ui) {
    this.ui = ui;
  }

  onShow() {
    const g = this.ui.game;
    g.bg.setTheme('meadow');
    this.ui.refreshCoins();
  }
}

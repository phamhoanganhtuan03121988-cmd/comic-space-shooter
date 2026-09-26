// Pause menu: RESUME / RESTART / quick sound+music toggles / EXIT TO MENU.

export class PauseMenu {
  constructor(ui) {
    this.ui = ui;
  }

  onShow() {
    this.ui.refreshToggles();
  }
}

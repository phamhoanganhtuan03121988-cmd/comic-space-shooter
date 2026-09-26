// Settings: sound / music / shake / vibration / debug toggles and progress reset.
// Toggle clicks are handled centrally by UIManager (data-setting).

export class SettingsScreen {
  constructor(ui) {
    this.ui = ui;
    this.note = document.getElementById('save-note');
  }

  onShow() {
    this.ui.refreshToggles();
    const g = this.ui.game;
    this.note.textContent = g.save.available ? 'Progress is saved automatically on this device.' : 'Storage is unavailable (private mode?) — progress lasts for this session only.';
  }
}

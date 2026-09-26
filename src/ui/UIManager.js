import { STATE } from '../game/GameState.js';
import { LEVELS } from '../data/levels.js';
import { MainMenu } from './MainMenu.js';
import { LevelSelect } from './LevelSelect.js';
import { UpgradeScreen } from './UpgradeScreen.js';
import { SettingsScreen } from './SettingsScreen.js';
import { HowToPlay } from './HowToPlay.js';
import { PauseMenu } from './PauseMenu.js';
import { VictoryScreen } from './VictoryScreen.js';
import { GameOverScreen } from './GameOver.js';

// DOM screen router. Every visible button is wired here through a single
// delegated click handler (data-action / data-setting attributes).

export class UIManager {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('screens');
    this.controls = document.getElementById('controls');
    this.skillBtn = document.getElementById('btn-skill');
    this.skillCdEl = this.skillBtn.querySelector('.skill-cd');
    this.pauseBtn = document.getElementById('btn-pause');
    this.toastEl = document.getElementById('toast');
    this.current = null;
    this.upgradeReturn = 'menu';
    this.lastCd = -1;
    this.lastReady = null;

    this.screens = {
      menu: new MainMenu(this),
      levels: new LevelSelect(this),
      upgrade: new UpgradeScreen(this),
      settings: new SettingsScreen(this),
      howto: new HowToPlay(this),
      pause: new PauseMenu(this),
      victory: new VictoryScreen(this),
      gameover: new GameOverScreen(this),
      confirm: null,
    };

    this._onClick = (e) => this.onClick(e);
    this.root.addEventListener('click', this._onClick);
    this._onPause = (e) => {
      e.preventDefault();
      this.game.audio.play('click');
      this.game.pause();
    };
    this._onSkill = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.game.useSkill();
    };
    this.pauseBtn.addEventListener('click', this._onPause);
    // pointerdown gives the fastest response for the skill in the heat of battle
    this.skillBtn.addEventListener('pointerdown', this._onSkill);
  }

  el(id) {
    return document.getElementById('screen-' + id);
  }

  showScreen(id) {
    for (const s of this.root.querySelectorAll('.screen.active')) s.classList.remove('active');
    this.controls.classList.add('hidden');
    const el = this.el(id);
    if (el) el.classList.add('active');
    this.current = id;
    const scr = this.screens[id];
    if (scr && scr.onShow) scr.onShow();
    this.refreshCoins();
  }

  showGameplay() {
    for (const s of this.root.querySelectorAll('.screen.active')) s.classList.remove('active');
    this.controls.classList.remove('hidden');
    this.current = null;
    this.lastCd = -1;
    this.lastReady = null;
  }

  showVictory(summary) {
    this.screens.victory.set(summary);
    this.showScreen('victory');
  }

  showGameOver(summary) {
    this.screens.gameover.set(summary);
    this.showScreen('gameover');
  }

  refreshCoins() {
    const d = this.game.save.data;
    for (const el of this.root.querySelectorAll('[data-bind="coins"]')) el.textContent = d.coins.toLocaleString('en-US');
    for (const el of this.root.querySelectorAll('[data-bind="best"]')) el.textContent = d.bestScore.toLocaleString('en-US');
  }

  refreshToggles() {
    const s = this.game.save.data.settings;
    for (const t of this.root.querySelectorAll('[data-setting]')) {
      const key = t.dataset.setting;
      const on = !!s[key];
      t.classList.toggle('on', on);
      const prefix = t.closest('#screen-pause') ? key.toUpperCase() + ' ' : '';
      t.textContent = prefix + (on ? 'ON' : 'OFF');
    }
  }

  toast(msg, ms = 1400) {
    const el = this.toastEl;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), ms);
  }

  // Cooldown ring: only touch the DOM when the visible value changes.
  updateSkill(frac) {
    const f = Math.round(frac * 100) / 100;
    const ready = frac <= 0;
    if (f !== this.lastCd) {
      this.lastCd = f;
      this.skillBtn.style.setProperty('--cd', f);
      const secs = Math.ceil(this.game.player.skillCooldown);
      this.skillCdEl.textContent = ready ? '' : secs + 's';
    }
    if (ready !== this.lastReady) {
      this.lastReady = ready;
      this.skillBtn.classList.toggle('ready', ready);
      this.skillBtn.classList.toggle('cooling', !ready);
    }
  }

  onClick(e) {
    const g = this.game;
    const setting = e.target.closest('[data-setting]');
    if (setting) {
      const key = setting.dataset.setting;
      g.setSetting(key, !g.save.data.settings[key]);
      g.audio.play('click');
      this.refreshToggles();
      return;
    }
    const btn = e.target.closest('[data-action]');
    if (!btn || btn.disabled) return;
    g.audio.unlock();
    g.audio.play('click');
    this.handle(btn.dataset.action, btn);
  }

  handle(action, btn) {
    const g = this.game;
    switch (action) {
      case 'play':
        this.showScreen('levels');
        break;
      case 'level': {
        const idx = Number(btn.dataset.level);
        if (idx + 1 <= g.save.data.unlockedLevel) g.startLevel(idx, 0);
        break;
      }
      case 'upgrade':
        this.upgradeReturn = this.current || 'menu';
        this.showScreen('upgrade');
        break;
      case 'buy':
        this.screens.upgrade.buy(btn.dataset.id);
        break;
      case 'howto':
        this.showScreen('howto');
        break;
      case 'settings':
        this.showScreen('settings');
        break;
      case 'back':
        if (this.current === 'upgrade') this.showScreen(this.upgradeReturn);
        else if (this.current === 'confirm') this.showScreen('settings');
        else this.showScreen('menu');
        break;
      case 'reset':
        this.showScreen('confirm');
        break;
      case 'confirm-reset':
        g.resetProgress();
        this.refreshToggles();
        this.showScreen('settings');
        this.toast('Progress reset');
        break;
      case 'resume':
        g.resume();
        break;
      case 'restart':
        g.restartLevel();
        break;
      case 'menu':
        g.exitToMenu();
        break;
      case 'next':
        if (g.run.levelIndex + 1 < LEVELS.length) g.nextLevel();
        else g.startLevel(g.run.levelIndex, 0);
        break;
      case 'retry':
        if (g.state === STATE.GAMEOVER) g.restartLevel();
        break;
      default:
        break;
    }
  }

  destroy() {
    this.root.removeEventListener('click', this._onClick);
    this.pauseBtn.removeEventListener('click', this._onPause);
    this.skillBtn.removeEventListener('pointerdown', this._onSkill);
  }
}

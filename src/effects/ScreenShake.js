import { CONFIG } from '../data/config.js';

// Trauma based screen shake: offset = max * trauma^2, trauma decays quickly,
// so small hits barely move the camera and big explosions feel punchy without
// being nauseating. Can be disabled from Settings.

export class ScreenShake {
  constructor() {
    this.trauma = 0;
    this.x = 0;
    this.y = 0;
    this.enabled = true;
    this.t = 0;
  }

  add(amount) {
    if (!this.enabled) return;
    this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt) {
    this.t += dt;
    if (this.trauma <= 0) {
      this.x = this.y = 0;
      return;
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const s = CONFIG.SHAKE_MAX * this.trauma * this.trauma;
    // cheap pseudo-noise
    this.x = s * Math.sin(this.t * 71.3) * Math.cos(this.t * 23.1);
    this.y = s * Math.sin(this.t * 59.7 + 1.7) * Math.cos(this.t * 31.9);
  }

  reset() {
    this.trauma = 0;
    this.x = this.y = 0;
  }
}

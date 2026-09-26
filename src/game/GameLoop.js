// requestAnimationFrame loop with clamped delta time and a smoothed FPS meter.

export class GameLoop {
  constructor(update, render) {
    this.update = update;
    this.render = render;
    this.running = false;
    this.last = 0;
    this.fps = 60;
    this.frameMs = 16.7;
    this.rafId = 0;
    this._tick = (t) => this.tick(t);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  tick(now) {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this._tick);
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0) {
      const inst = 1 / dt;
      this.fps += (inst - this.fps) * 0.05;
    }
    // Clamp huge gaps (tab switches, GC pauses) so physics never explodes.
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    const t0 = performance.now();
    this.update(dt);
    this.render();
    this.frameMs += (performance.now() - t0 - this.frameMs) * 0.05;
  }
}

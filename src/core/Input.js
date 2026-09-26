// Touch-first input. Dragging anywhere on the playfield moves the ship by the
// same (relative) distance, so the finger never has to cover the ship.
// Keyboard (WASD / arrows / Space / P / Esc) is supported for desktop testing.

export class Input {
  constructor(target, viewport) {
    this.target = target;
    this.viewport = viewport;
    this.pointerId = null;
    this.lastX = 0;
    this.lastY = 0;
    this.dragDX = 0; // accumulated logical delta since last consume
    this.dragDY = 0;
    this.touching = false;
    this.keys = new Set();
    this.onSkill = null;
    this.onPause = null;
    this.onFirstGesture = null;
    this._gestured = false;

    this._down = (e) => this.pointerDown(e);
    this._move = (e) => this.pointerMove(e);
    this._up = (e) => this.pointerUp(e);
    this._keyDown = (e) => this.keyDown(e);
    this._keyUp = (e) => this.keys.delete(e.code);
    this._blur = () => {
      this.keys.clear();
      this.release();
    };
    this._noMenu = (e) => e.preventDefault();
    this._gesture = () => this.firstGesture();

    target.addEventListener('pointerdown', this._down);
    target.addEventListener('pointermove', this._move);
    target.addEventListener('pointerup', this._up);
    target.addEventListener('pointercancel', this._up);
    target.addEventListener('lostpointercapture', this._up);
    target.addEventListener('contextmenu', this._noMenu);
    window.addEventListener('keydown', this._keyDown);
    window.addEventListener('keyup', this._keyUp);
    window.addEventListener('blur', this._blur);
    window.addEventListener('pointerdown', this._gesture, true);
    window.addEventListener('keydown', this._gesture, true);
    window.addEventListener('touchend', this._gesture, true);
  }

  firstGesture() {
    if (this.onFirstGesture) this.onFirstGesture();
  }

  pointerDown(e) {
    if (this.pointerId !== null) return; // first finger drives the ship
    e.preventDefault();
    this.pointerId = e.pointerId;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.touching = true;
    try {
      this.target.setPointerCapture(e.pointerId);
    } catch (_) {
      /* capture not supported: movement still works while over the canvas */
    }
  }

  pointerMove(e) {
    if (e.pointerId !== this.pointerId) return;
    e.preventDefault();
    const vp = this.viewport;
    this.dragDX += vp.toLogical(e.clientX - this.lastX);
    this.dragDY += vp.toLogical(e.clientY - this.lastY);
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  }

  pointerUp(e) {
    if (e.pointerId !== this.pointerId) return;
    this.release();
  }

  release() {
    if (this.pointerId !== null) {
      try {
        this.target.releasePointerCapture(this.pointerId);
      } catch (_) {
        /* already released */
      }
    }
    this.pointerId = null;
    this.touching = false;
  }

  consumeDrag(out) {
    out.x = this.dragDX;
    out.y = this.dragDY;
    this.dragDX = 0;
    this.dragDY = 0;
    return out;
  }

  keyDown(e) {
    const code = e.code;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
      // Keep the page from scrolling on desktop, but never block typing in inputs.
      if (!(e.target instanceof HTMLInputElement)) e.preventDefault();
    }
    if (e.repeat) return;
    this.keys.add(code);
    if ((code === 'Space' || code === 'KeyX' || code === 'KeyK') && this.onSkill) this.onSkill();
    if ((code === 'Escape' || code === 'KeyP') && this.onPause) this.onPause();
  }

  axisX() {
    const k = this.keys;
    return (k.has('ArrowRight') || k.has('KeyD') ? 1 : 0) - (k.has('ArrowLeft') || k.has('KeyA') ? 1 : 0);
  }

  axisY() {
    const k = this.keys;
    return (k.has('ArrowDown') || k.has('KeyS') ? 1 : 0) - (k.has('ArrowUp') || k.has('KeyW') ? 1 : 0);
  }

  resetDrag() {
    this.dragDX = 0;
    this.dragDY = 0;
  }

  destroy() {
    const t = this.target;
    t.removeEventListener('pointerdown', this._down);
    t.removeEventListener('pointermove', this._move);
    t.removeEventListener('pointerup', this._up);
    t.removeEventListener('pointercancel', this._up);
    t.removeEventListener('lostpointercapture', this._up);
    t.removeEventListener('contextmenu', this._noMenu);
    window.removeEventListener('keydown', this._keyDown);
    window.removeEventListener('keyup', this._keyUp);
    window.removeEventListener('blur', this._blur);
    window.removeEventListener('pointerdown', this._gesture, true);
    window.removeEventListener('keydown', this._gesture, true);
    window.removeEventListener('touchend', this._gesture, true);
  }
}

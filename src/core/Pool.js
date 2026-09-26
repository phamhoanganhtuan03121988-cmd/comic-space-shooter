// Fixed-size object pool. Objects are pre-allocated once; `obtain` hands out a
// free object (or null when the cap is reached) and `sweep` returns objects
// whose `alive` flag was cleared back to the free list. The `active` array can
// be iterated directly by systems.

export class Pool {
  constructor(factory, size) {
    this.size = size;
    this.free = [];
    this.active = [];
    for (let i = 0; i < size; i++) {
      const o = factory();
      o.alive = false;
      this.free.push(o);
    }
  }

  obtain() {
    const o = this.free.pop();
    if (!o) return null;
    o.alive = true;
    this.active.push(o);
    return o;
  }

  sweep() {
    const a = this.active;
    let j = 0;
    for (let i = 0; i < a.length; i++) {
      const o = a[i];
      if (o.alive) a[j++] = o;
      else this.free.push(o);
    }
    a.length = j;
  }

  clear() {
    for (const o of this.active) {
      o.alive = false;
      this.free.push(o);
    }
    this.active.length = 0;
  }

  get count() {
    return this.active.length;
  }
}

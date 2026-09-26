import { CONFIG } from '../data/config.js';

// Circle-vs-circle collision between all relevant groups. Entity counts are
// capped by the pools, so brute force stays well under a millisecond.

export class CollisionSystem {
  constructor(game) {
    this.game = game;
  }

  update() {
    const g = this.game;
    const pb = g.bullets.player.active;
    const enemies = g.enemies.active;
    const boss = g.bossManager.active;

    // player bullets -> enemies / boss
    for (let i = 0; i < pb.length; i++) {
      const b = pb[i];
      if (!b.alive) continue;
      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (!e.alive || e.y < -10) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        const rr = b.r + e.r;
        if (dx * dx + dy * dy < rr * rr) {
          b.alive = false;
          g.hitEnemy(e, b.damage, b.x, b.y);
          break;
        }
      }
      if (b.alive && boss && boss.hits(b.x, b.y, b.r)) {
        b.alive = false;
        g.hitBoss(boss, b.damage, b.x, b.y);
      }
    }

    const p = g.player;
    if (!p.alive || p.entering > 0) return;
    const PC = CONFIG.PLAYER;

    // enemy bullets -> player (small core hitbox)
    const eb = g.bullets.enemy.active;
    for (let i = 0; i < eb.length; i++) {
      const b = eb[i];
      if (!b.alive) continue;
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const rr = b.r + PC.hitRadius;
      if (dx * dx + dy * dy < rr * rr) {
        b.alive = false;
        g.damagePlayer(b.damage, b.x, b.y);
        if (!p.alive) return;
      }
    }

    // enemy bodies -> player
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (!e.alive) continue;
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const rr = e.r * 0.8 + PC.bodyRadius * 0.6;
      if (dx * dx + dy * dy < rr * rr) {
        g.damagePlayer(e.type.contactDamage, e.x, e.y);
        // ramming hurts the critter a lot too
        g.hitEnemy(e, 60, e.x, e.y, true);
        if (!p.alive) return;
      }
    }

    // boss body -> player
    if (boss && boss.vulnerable && boss.hits(p.x, p.y, PC.bodyRadius * 0.6)) {
      g.damagePlayer(boss.def.contactDamage, p.x, p.y - 20);
    }
  }
}

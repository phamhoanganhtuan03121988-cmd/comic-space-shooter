import { LEVELS } from '../data/levels.js';
import { ACTS } from '../data/expansion/sectors.js';
import { BOSSES } from '../data/bosses.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { enemyIconDataURL } from '../art/EnemyArt.js';

// Sector list built from level data, grouped into acts; locked sectors are
// shown but disabled.

export class LevelSelect {
  constructor(ui) {
    this.ui = ui;
    this.list = document.getElementById('level-list');
  }

  onShow() {
    const d = this.ui.game.save.data;
    const frag = document.createDocumentFragment();
    LEVELS.forEach((lvl, i) => {
      const act = ACTS.find((a) => a.from === lvl.id);
      if (act) {
        const h = document.createElement('div');
        h.className = 'act-head' + (act.from <= d.unlockedLevel ? '' : ' locked');
        h.innerHTML = `<b>${act.name}</b><span>${act.title}</span><i>SECTORS ${act.from}–${act.to}</i>`;
        frag.appendChild(h);
      }
      const unlocked = lvl.id <= d.unlockedLevel;
      const cleared = d.clearedLevels.includes(lvl.id);
      const btn = document.createElement('button');
      btn.className = 'level-card' + (unlocked ? '' : ' locked');
      btn.dataset.action = 'level';
      btn.dataset.level = String(i);
      btn.disabled = !unlocked;
      const boss = BOSSES[lvl.boss];
      // show the toughest critter that appears in the sector as its emblem
      const types = new Set();
      lvl.waves.forEach((w) => w.groups.forEach((gr) => types.add(gr.enemy)));
      const emblem = [...types].sort((a, b) => ENEMY_TYPES[b].hp - ENEMY_TYPES[a].hp)[0];
      const img = unlocked ? `<img alt="" src="${enemyIconDataURL(ENEMY_TYPES[emblem].art, ENEMY_TYPES[emblem].radius)}">` : '';
      btn.innerHTML = `
        <div class="num">${unlocked ? lvl.id : '🔒'}</div>
        <div class="info">
          <div class="name">${lvl.name}</div>
          <div class="meta">${unlocked ? lvl.waves.length + ' waves · Boss: ' + boss.name : 'Clear sector ' + (lvl.id - 1) + ' to unlock'}</div>
        </div>
        ${cleared ? '<span class="badge">CLEARED</span>' : img}`;
      frag.appendChild(btn);
    });
    this.list.replaceChildren(frag);
  }
}

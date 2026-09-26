import { UPGRADES, upgradeCost } from '../data/upgrades.js';
import { ITEM_TYPES } from '../data/items.js';
import { computeStats, describeStat } from '../player/PlayerStats.js';
import { itemIconDataURL } from '../art/Sprites.js';

// Permanent stat upgrades bought with coins (saved to localStorage).

export class UpgradeScreen {
  constructor(ui) {
    this.ui = ui;
    this.list = document.getElementById('upgrade-list');
    this.icons = {};
  }

  icon(id) {
    if (!this.icons[id]) this.icons[id] = itemIconDataURL(id, ITEM_TYPES[id].color);
    return this.icons[id];
  }

  onShow() {
    this.render();
  }

  render(flashId = null) {
    const g = this.ui.game;
    const d = g.save.data;
    const stats = computeStats(d.upgrades);
    const frag = document.createDocumentFragment();
    for (const u of UPGRADES) {
      const lv = d.upgrades[u.id] | 0;
      const maxed = lv >= u.maxLevel;
      const cost = upgradeCost(u, lv);
      const next = maxed ? null : computeStats({ ...d.upgrades, [u.id]: lv + 1 });
      const row = document.createElement('div');
      row.className = 'upgrade' + (flashId === u.id ? ' bought' : '');
      let pips = '';
      for (let i = 0; i < u.maxLevel; i++) pips += `<i class="${i < lv ? 'on' : ''}"></i>`;
      row.innerHTML = `
        <img alt="" src="${this.icon(u.icon)}">
        <div>
          <div class="uname">${u.name} <span class="udesc">Lv.${lv}</span></div>
          <div class="udesc">${u.desc}</div>
          <div class="uval">${describeStat(u.id, stats)}${next ? ' → ' + describeStat(u.id, next) : ''}</div>
          <div class="pips">${pips}</div>
        </div>
        <button class="btn btn-small buy ${maxed ? '' : 'btn-primary'}" data-action="buy" data-id="${u.id}" ${maxed || d.coins < cost ? 'disabled' : ''}>
          ${maxed ? 'MAX' : `BUY<small><i class="coin-ico"></i>${cost}</small>`}
        </button>`;
      frag.appendChild(row);
    }
    this.list.replaceChildren(frag);
    this.ui.refreshCoins();
  }

  buy(id) {
    const g = this.ui.game;
    const ok = g.buyUpgrade(id);
    if (ok) {
      const def = UPGRADES.find((u) => u.id === id);
      this.ui.toast(def.name + ' upgraded to Lv.' + g.save.data.upgrades[id] + '!');
    } else {
      this.ui.toast('Not enough coins');
    }
    this.render(ok ? id : null);
  }
}

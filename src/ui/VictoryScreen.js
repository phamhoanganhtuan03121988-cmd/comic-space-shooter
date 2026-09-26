// Victory summary: animated stat rows, coin reward breakdown, unlock notice
// and NEXT LEVEL / UPGRADE / MENU buttons.

import { itemIconDataURL } from '../art/Sprites.js';
import { ITEM_TYPES } from '../data/items.js';

const fmt = (n) => Math.floor(n).toLocaleString('en-US');

export function countUp(el, to, ms = 700) {
  const start = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - start) / ms);
    el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function statRows(container, rows) {
  container.innerHTML = rows
    .map((r, i) => `<div class="stat ${r.big ? 'big' : ''}" style="animation-delay:${i * 90}ms"><span>${r.label}</span><span data-count="${r.count ? r.value : ''}">${r.count ? '0' : r.value}</span></div>`)
    .join('');
  for (const el of container.querySelectorAll('[data-count]')) {
    if (el.dataset.count !== '') countUp(el, Number(el.dataset.count));
  }
}

export class VictoryScreen {
  constructor(ui) {
    this.ui = ui;
    this.title = document.getElementById('victory-title');
    this.sub = document.getElementById('victory-sub');
    this.stats = document.getElementById('victory-stats');
    this.reward = document.getElementById('victory-reward');
    this.next = document.getElementById('btn-next');
  }

  set(s) {
    this.title.textContent = s.isLast ? 'GALAXY SAVED!' : 'VICTORY!';
    this.sub.textContent = 'Sector ' + s.level.id + ' · ' + s.level.name + ' cleared';
    statRows(this.stats, [
      { label: 'Score', value: s.score, count: true, big: true },
      { label: 'Enemies Destroyed', value: s.kills, count: true },
      { label: 'Coins Earned', value: s.coins, count: true },
      { label: 'Items Collected', value: s.items, count: true },
      { label: 'Bonus', value: s.bonus, count: true },
      { label: 'Max Combo', value: s.maxCombo, count: true },
    ]);
    if (!this.itemIcon) this.itemIcon = itemIconDataURL('crit', ITEM_TYPES.crit.color);
    let html = `<div class="reward-tiles">
        <div class="tile"><span class="coin-stack"><i class="coin-ico"></i><i class="coin-ico"></i><i class="coin-ico"></i></span><b>+${fmt(s.coins)}</b><small>COINS</small></div>
        <div class="tile"><img alt="" src="${this.itemIcon}"><b>+${fmt(s.bonus)}</b><small>BONUS SCORE</small></div>
      </div>
      <div class="detail">Collected ${s.collected} · Clear reward ${s.clearCoins} · Combo bonus ${s.comboCoins}</div>`;
    if (s.perfectWaves || s.noDamageWaves) html += `<div class="detail">Perfect waves ${s.perfectWaves} · No-damage waves ${s.noDamageWaves}</div>`;
    if (s.unlocked) html += `<div class="unlock">★ SECTOR ${s.unlocked.id} UNLOCKED: ${s.unlocked.name} ★</div>`;
    if (s.isLast) html += `<div class="unlock">★ All sectors cleared — the farm is safe! ★</div>`;
    if (s.newBest) html += `<div class="new-best">NEW BEST SCORE!</div>`;
    this.reward.innerHTML = html;
    this.next.textContent = s.isLast ? 'PLAY AGAIN' : 'NEXT LEVEL';
  }
}

import { ITEM_TYPES } from '../data/items.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { itemIconDataURL } from '../art/Sprites.js';
import { enemyIconDataURL } from '../art/EnemyArt.js';

const ITEM_HELP = {
  power: 'Weapon level +1 (max 5)',
  rapid: 'Much faster fire',
  shield: 'Bubble blocks all hits',
  health: 'Repairs 30% HP',
  multi: 'Extra side streams',
  bomb: 'Blast around your ship',
  magnet: 'Pulls in coins & items',
  slow: 'Enemies move at half speed',
  crit: '+35% critical chance',
};

const ENEMY_HELP = {
  blobling: 'Weak and wobbly',
  zipfly: 'Fast, fragile swarms',
  rockshell: 'Armored and slow',
  spitter: 'Shoots aimed goo',
  swirlie: 'Loops around, bursts',
  spikeling: 'Loves to dive at you',
};

// Builds the icon glossary once (icons are rendered from the game sprites).
export class HowToPlay {
  constructor(ui) {
    this.ui = ui;
    this.built = false;
  }

  onShow() {
    if (this.built) return;
    this.built = true;
    const items = document.getElementById('howto-items');
    items.innerHTML = Object.entries(ITEM_TYPES)
      .map(([id, d]) => `<div><img alt="" src="${itemIconDataURL(id, d.color)}"><span><b style="color:${d.color}">${d.label}</b>${ITEM_HELP[id] || ''}</span></div>`)
      .join('');
    const enemies = document.getElementById('howto-enemies');
    enemies.innerHTML = Object.entries(ENEMY_TYPES)
      .map(([id, d]) => `<div><img alt="" src="${enemyIconDataURL(d.art, d.radius)}"><span><b>${d.name}</b>${ENEMY_HELP[id] || ''}</span></div>`)
      .join('');
  }
}

// Power-up definitions. `weight` is the relative drop probability,
// `duration` > 0 means it is a timed buff (seconds). `effect` is resolved by
// ItemManager.applyItem, so new items need data here + one case there.

export const ITEM_TYPES = {
  power: { label: 'POWER UP', color: '#ff4f5e', weight: 24, duration: 0, effect: 'power' },
  rapid: { label: 'RAPID FIRE', color: '#ffd23f', weight: 13, duration: 8, effect: 'buff' },
  shield: { label: 'SHIELD', color: '#43e6ff', weight: 10, duration: 7, effect: 'buff' },
  health: { label: 'REPAIR', color: '#5dff7a', weight: 12, duration: 0, effect: 'health', amount: 0.3 },
  multi: { label: 'MULTI SHOT', color: '#c77dff', weight: 12, duration: 10, effect: 'buff' },
  bomb: { label: 'BOMB', color: '#ff8c42', weight: 8, duration: 0, effect: 'bomb', radius: 210, damage: 120, bossDamage: 160 },
  magnet: { label: 'MAGNET', color: '#ff5ec8', weight: 9, duration: 12, effect: 'buff' },
  slow: { label: 'SLOW TIME', color: '#7ab0ff', weight: 7, duration: 6, effect: 'buff', factor: 0.5 },
  crit: { label: 'CRITICAL', color: '#fff275', weight: 8, duration: 10, effect: 'buff', bonus: 0.35 },
};

export const ITEM_IDS = Object.keys(ITEM_TYPES);

// Timed buffs shown in the HUD (order = display order).
export const BUFF_IDS = ITEM_IDS.filter((id) => ITEM_TYPES[id].duration > 0);

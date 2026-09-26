import { FONT_STACK } from '../effects/FloatingText.js';
import { itemSprite, coinSprite, roundRect, glowSprite } from '../art/Sprites.js';
import { ITEM_TYPES, BUFF_IDS } from '../data/items.js';
import { CONFIG } from '../data/config.js';
import { formatNumber, TAU, easeOutBack } from '../core/math.js';

// In-game HUD drawn on the canvas (cheap, crisp, never reflows the DOM):
// level/wave, score, coins, HP + shield, weapon power, combo, boss bar,
// active buffs, banners, boss warning, tutorial hints and damage vignette.
// Interactive controls (pause, NOVA) are DOM buttons, see UIManager.

const COMBO_COLORS = ['#ffffff', '#ffffff', '#5ef3ff', '#ffd23f', '#ff9b3d', '#ff4fd8'];
const F = (w, s) => w + ' ' + s + 'px ' + FONT_STACK;

export class HUD {
  constructor(game) {
    this.game = game;
    this.banners = [];
    this.warn = 0;
    this.warnDur = 3;
    this.scoreStr = '0';
    this.lastScore = -1;
    this.buffPop = {};
    this.hints = [];
    this.hint = null;
    this.fonts = {
      tiny: F(800, 10),
      small: F(800, 12),
      med: F(900, 15),
      score: F(900, 22),
      combo: F(900, 30),
      bannerSub: F(800, 16),
    };
    this.bannerFonts = new Map();
  }

  reset() {
    this.banners.length = 0;
    this.warn = 0;
    this.lastScore = -1;
    this.hints.length = 0;
    this.hint = null;
    this.buffPop = {};
  }

  banner(title, sub = '', color = '#fff', dur = 1.6, yFrac = 0.4) {
    this.banners.push({ title, sub, color, dur, t: 0, yFrac });
    if (this.banners.length > 4) this.banners.shift();
  }

  warning(dur) {
    this.warn = dur;
    this.warnDur = dur;
  }

  bossIntro(name, title) {
    this.banner(name, title, '#ff5e7a', 2.6, 0.45);
  }

  flashBuff(id) {
    this.buffPop[id] = 1;
  }

  // Tutorial hints: { text, sub, until(): bool, max }
  addHint(text, sub, until, max = 6, target = null) {
    this.hints.push({ text, sub, until, max, t: 0, target });
  }

  update(dt) {
    const b = this.banners[0];
    if (b) {
      b.t += dt;
      if (b.t >= b.dur) this.banners.shift();
    }
    if (this.warn > 0) this.warn -= dt;
    for (const k in this.buffPop) if (this.buffPop[k] > 0) this.buffPop[k] -= dt * 2;
    if (!this.hint && this.hints.length) this.hint = this.hints.shift();
    if (this.hint) {
      this.hint.t += dt;
      if (this.hint.t > this.hint.max || (this.hint.t > 1 && this.hint.until && this.hint.until())) this.hint = null;
    }
  }

  render(ctx) {
    const g = this.game;
    const W = g.W;
    const H = g.H;
    const p = g.player;

    // low HP vignette
    if (p.alive && p.hpFrac < 0.3) {
      const k = (0.3 - p.hpFrac) / 0.3;
      const pulse = 0.5 + 0.5 * Math.sin(g.time * 6);
      const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
      grd.addColorStop(0, 'rgba(255,0,40,0)');
      grd.addColorStop(1, 'rgba(255,0,40,' + (0.25 + 0.25 * pulse) * k + ')');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    // top panel
    const top = ctx.createLinearGradient(0, 0, 0, 74);
    top.addColorStop(0, 'rgba(8,4,24,0.85)');
    top.addColorStop(1, 'rgba(8,4,24,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 74);

    ctx.textBaseline = 'middle';
    // level + wave
    const lvl = g.level;
    ctx.textAlign = 'left';
    ctx.font = this.fonts.tiny;
    ctx.fillStyle = '#9fb3ff';
    ctx.fillText('SECTOR ' + (lvl ? lvl.id : 1), 12, 13);
    ctx.font = this.fonts.med;
    const w = g.waves;
    if (g.bossManager.active || w.phase === 'warning' || w.phase === 'boss') {
      ctx.fillStyle = '#ff5e7a';
      ctx.fillText('BOSS', 12, 29);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('WAVE ' + Math.max(1, w.waveIndex + 1) + '/' + w.totalWaves, 12, 29);
    }

    // score
    const sc = Math.floor(g.score.displayScore);
    if (sc !== this.lastScore) {
      this.lastScore = sc;
      this.scoreStr = formatNumber(sc);
    }
    ctx.textAlign = 'center';
    ctx.font = this.fonts.score;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1b1033';
    ctx.strokeText(this.scoreStr, W / 2, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(this.scoreStr, W / 2, 20);

    // coins (left of the pause button)
    const coinS = coinSprite(0);
    const cx = W - 70;
    ctx.drawImage(coinS.canvas, cx - 50, 11, 16, 16);
    ctx.textAlign = 'left';
    ctx.font = this.fonts.small;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(String(g.run.coins), cx - 31, 20);

    // HP + shield bars
    this.bar(ctx, 12, 40, 150, 10, p.hp / p.maxHp, '#ff4f6d', '#ff9aa8', 'HP ' + Math.ceil(p.hp));
    if (p.maxShield > 0) this.bar(ctx, 12, 53, 150, 6, p.shield / p.maxShield, '#43e6ff', '#b8f6ff', null);

    // weapon power pips
    ctx.font = this.fonts.tiny;
    ctx.fillStyle = '#ffb3c0';
    ctx.textAlign = 'right';
    const px = W - 70;
    ctx.fillText('PWR', px - 52, 46);
    for (let i = 0; i < CONFIG.PLAYER.maxPower; i++) {
      ctx.fillStyle = i < p.power ? '#ff4f5e' : 'rgba(255,255,255,0.18)';
      roundRect(ctx, px - 48 + i * 10, 41, 7, 10, 2);
      ctx.fill();
    }

    const boss = g.bossManager.active;
    let comboY = 92;
    if (boss) {
      this.bossBar(ctx, boss, W);
      comboY = 124;
    }
    this.combo(ctx, W, comboY);
    this.buffs(ctx, H);
    this.renderBanners(ctx, W, H);
    this.renderWarning(ctx, W, H);
    this.renderHint(ctx, W, H);

    // full-screen flash (nova, boss death, player hit)
    if (g.flashAlpha > 0) {
      ctx.globalAlpha = Math.min(1, g.flashAlpha);
      ctx.fillStyle = g.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  bar(ctx, x, y, w, h, frac, c1, c2, label) {
    frac = Math.max(0, Math.min(1, frac));
    ctx.fillStyle = 'rgba(10,6,30,0.8)';
    roundRect(ctx, x - 1.5, y - 1.5, w + 3, h + 3, (h + 3) / 2);
    ctx.fill();
    if (frac > 0) {
      const grd = ctx.createLinearGradient(0, y, 0, y + h);
      grd.addColorStop(0, c2);
      grd.addColorStop(1, c1);
      ctx.fillStyle = grd;
      roundRect(ctx, x, y, Math.max(h, w * frac), h, h / 2);
      ctx.fill();
    }
    if (label) {
      ctx.font = this.fonts.tiny;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
    }
  }

  bossBar(ctx, boss, W) {
    const x = 16;
    const y = 80;
    const w = W - 32;
    const h = 12;
    const def = boss.def;
    ctx.textAlign = 'left';
    ctx.font = this.fonts.small;
    ctx.fillStyle = '#fff';
    ctx.fillText(def.name, x, y - 9);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffb3c0';
    ctx.fillText(boss.phase.label + '  ' + (boss.phaseIndex + 1) + '/' + def.phases.length, x + w, y - 9);
    ctx.fillStyle = 'rgba(10,6,30,0.85)';
    roundRect(ctx, x - 2, y - 2, w + 4, h + 4, 6);
    ctx.fill();
    const frac = boss.displayHp / boss.maxHp;
    const trail = boss.trailHp / boss.maxHp;
    if (trail > frac && boss.state !== 'enter') {
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, x, y, w * trail, h, 5);
      ctx.fill();
    }
    if (frac > 0) {
      const grd = ctx.createLinearGradient(0, y, 0, y + h);
      grd.addColorStop(0, '#ffb3c0');
      grd.addColorStop(0.5, boss.rage > 0.6 ? '#ff2e55' : '#ff4f6d');
      grd.addColorStop(1, '#a3002b');
      ctx.fillStyle = grd;
      roundRect(ctx, x, y, Math.max(6, w * frac), h, 5);
      ctx.fill();
    }
    // phase thresholds
    ctx.fillStyle = '#1b1033';
    for (let i = 1; i < def.phases.length; i++) ctx.fillRect(x + w * def.phases[i].at - 1, y - 2, 2, h + 4);
    if (boss.state === 'transition' || boss.state === 'enter') {
      ctx.font = this.fonts.tiny;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(boss.state === 'enter' ? 'INCOMING' : 'IMMUNE', W / 2, y + h / 2 + 0.5);
    }
  }

  combo(ctx, W, y) {
    const c = this.game.combo;
    if (c.count < 2) return;
    const x = W - 14;
    const scale = 1 + c.pop * 0.6;
    const col = COMBO_COLORS[Math.min(5, c.mult)];
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.textAlign = 'right';
    ctx.font = this.fonts.combo;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#1b1033';
    const txt = 'x' + c.mult;
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = col;
    ctx.fillText(txt, 0, 0);
    ctx.restore();
    ctx.textAlign = 'right';
    ctx.font = this.fonts.small;
    ctx.fillStyle = '#fff';
    ctx.fillText(c.count + ' COMBO', x, y + 22);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x - 64, y + 31, 64, 3);
    ctx.fillStyle = col;
    ctx.fillRect(x - 64 * c.timerFrac, y + 31, 64 * c.timerFrac, 3);
  }

  buffs(ctx, H) {
    const p = this.game.player;
    let x = 22;
    const y = H - 26;
    for (let i = 0; i < BUFF_IDS.length; i++) {
      const id = BUFF_IDS[i];
      const left = p.buffs[id];
      if (left <= 0) continue;
      const def = ITEM_TYPES[id];
      const frac = left / def.duration;
      const pop = Math.max(0, this.buffPop[id] || 0);
      const size = 26 * (1 + pop * 0.4);
      const blink = left < 2 && Math.floor(left * 8) % 2 === 0;
      ctx.globalAlpha = blink ? 0.4 : 1;
      ctx.fillStyle = 'rgba(10,6,30,0.75)';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
      ctx.stroke();
      const s = itemSprite(id, def.color);
      ctx.drawImage(s.canvas, x - size / 2, y - size / 2, size, size);
      ctx.globalAlpha = 1;
      x += 38;
    }
  }

  bannerFont(size) {
    let f = this.bannerFonts.get(size);
    if (!f) {
      f = F(900, size);
      this.bannerFonts.set(size, f);
    }
    return f;
  }

  renderBanners(ctx, W, H) {
    const b = this.banners[0];
    if (!b) return;
    const inK = Math.min(1, b.t / 0.3);
    const outK = Math.min(1, (b.dur - b.t) / 0.3);
    const s = easeOutBack(inK);
    const y = H * b.yFrac;
    ctx.globalAlpha = Math.max(0, outK);
    // backing band
    ctx.fillStyle = 'rgba(8,4,24,0.55)';
    ctx.fillRect(0, y - 30, W, b.sub ? 70 : 56);
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.scale(s, s);
    ctx.textAlign = 'center';
    const size = b.title.length > 14 ? 26 : 34;
    ctx.font = this.bannerFont(size);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1b1033';
    ctx.strokeText(b.title, 0, 0);
    ctx.fillStyle = b.color;
    ctx.fillText(b.title, 0, 0);
    if (b.sub) {
      ctx.font = this.fonts.bannerSub;
      ctx.lineWidth = 4;
      ctx.strokeText(b.sub, 0, 28);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(b.sub, 0, 28);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  renderWarning(ctx, W, H) {
    if (this.warn <= 0) return;
    const t = this.warnDur - this.warn;
    const blink = 0.5 + 0.5 * Math.sin(t * 12);
    ctx.fillStyle = 'rgba(255,0,50,' + 0.12 * blink + ')';
    ctx.fillRect(0, 0, W, H);
    const y = H * 0.36;
    ctx.fillStyle = 'rgba(255,30,70,0.85)';
    ctx.fillRect(0, y - 34, W, 6);
    ctx.fillRect(0, y + 30, W, 6);
    // hazard stripes
    ctx.fillStyle = 'rgba(20,0,10,0.75)';
    ctx.fillRect(0, y - 28, W, 58);
    ctx.textAlign = 'center';
    ctx.font = this.bannerFont(36);
    ctx.globalAlpha = 0.6 + blink * 0.4;
    ctx.fillStyle = '#ff3d6e';
    ctx.fillText('⚠ WARNING ⚠', W / 2, y - 2);
    ctx.font = this.fonts.small;
    ctx.fillStyle = '#ffd0da';
    ctx.fillText('HUGE ENEMY APPROACHING', W / 2, y + 20);
    ctx.globalAlpha = 1;
  }

  renderHint(ctx, W, H) {
    const h = this.hint;
    if (!h) return;
    const a = Math.min(1, h.t * 3, (h.max - h.t) * 2);
    ctx.globalAlpha = Math.max(0, a);
    const y = H * 0.66;
    ctx.fillStyle = 'rgba(8,4,24,0.6)';
    roundRect(ctx, W / 2 - 150, y - 26, 300, h.sub ? 58 : 44, 14);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = this.fonts.med;
    ctx.fillStyle = '#fff';
    ctx.fillText(h.text, W / 2, y - 4);
    if (h.sub) {
      ctx.font = this.fonts.small;
      ctx.fillStyle = '#9fb3ff';
      ctx.fillText(h.sub, W / 2, y + 16);
    }
    if (h.target === 'drag') {
      // animated finger
      const fx = W / 2 + Math.sin(h.t * 3) * 70;
      const fy = y + 70;
      const gl = glowSprite('#ffffff', 16);
      ctx.drawImage(gl.canvas, fx - 16, fy - 16, 32, 32);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(fx, fy, 8, 0, TAU);
      ctx.fill();
    } else if (h.target === 'skill') {
      const bob = Math.sin(h.t * 8) * 6;
      ctx.fillStyle = '#ffd23f';
      ctx.font = this.bannerFont(28);
      ctx.fillText('↘', W - 90 + bob, H - 110 + bob);
    }
    ctx.globalAlpha = 1;
  }
}

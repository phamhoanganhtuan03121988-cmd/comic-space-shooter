import { FONT_STACK } from '../effects/FloatingText.js';
import { itemSprite, coinSprite, roundRect, glowSprite, makeCanvas, drawGlyph } from '../art/Sprites.js';
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
    this.grads = new Map();
    this._chrome = null;
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

    // top panel chrome (pre-rendered once per screen size)
    const ch = this.chrome(W);
    ctx.drawImage(ch.canvas, 0, 0, W, ch.h);

    ctx.textBaseline = 'middle';
    // level + wave
    const lvl = g.level;
    ctx.textAlign = 'left';
    ctx.font = this.fonts.tiny;
    ctx.fillStyle = '#8fd8ff';
    ctx.fillText('SECTOR ' + (lvl ? lvl.id : 1), 14, 12);
    ctx.font = this.fonts.med;
    const w = g.waves;
    const bossPhase = g.bossManager.active || w.phase === 'warning' || w.phase === 'boss';
    const label = bossPhase ? 'BOSS' : 'WAVE ' + Math.max(1, w.waveIndex + 1) + '/' + w.totalWaves;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#150f2c';
    ctx.strokeText(label, 14, 27);
    ctx.fillStyle = bossPhase ? '#ff5e7a' : '#ffffff';
    ctx.fillText(label, 14, 27);

    // score with neon outline
    const sc = Math.floor(g.score.displayScore);
    if (sc !== this.lastScore) {
      this.lastScore = sc;
      this.scoreStr = formatNumber(sc);
    }
    ctx.textAlign = 'center';
    ctx.font = this.fonts.score;
    ctx.lineWidth = 8;
    ctx.strokeStyle = 'rgba(94,243,255,0.28)';
    ctx.strokeText(this.scoreStr, W / 2, 21);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#150f2c';
    ctx.strokeText(this.scoreStr, W / 2, 21);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.scoreStr, W / 2, 21);

    // coins pill (left of the pause button)
    const coinS = coinSprite(0);
    const cx = W - 70;
    ctx.drawImage(coinS.canvas, cx - 53, 9, 20, 20);
    ctx.textAlign = 'left';
    ctx.font = this.fonts.small;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(String(g.run.coins), cx - 31, 20);

    // HP + shield bars (frames + icons are in the chrome)
    this.fillBar(ctx, 'hp', 30, 39, 136, 10, p.hp / p.maxHp, 'HP ' + Math.ceil(p.hp));
    if (p.maxShield > 0) this.fillBar(ctx, 'sh', 30, 53, 136, 6, p.shield / p.maxShield, null);

    // weapon power segments
    ctx.font = this.fonts.tiny;
    ctx.fillStyle = '#ffb3c0';
    ctx.textAlign = 'right';
    const px = W - 70;
    ctx.fillText('PWR', px - 54, 46);
    const pg = this.grad('pwr', ctx, 0, 40, 0, 52, '#ffd0d6', '#ff2e55');
    for (let i = 0; i < CONFIG.PLAYER.maxPower; i++) {
      ctx.fillStyle = i < p.power ? pg : 'rgba(255,255,255,0.14)';
      roundRect(ctx, px - 50 + i * 10, 40, 8, 11, 2);
      ctx.fill();
    }
    if (p.power > 0) {
      const gl = glowSprite('#ff4f6d', 16);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35;
      ctx.drawImage(gl.canvas, px - 54, 34, p.power * 10 + 8, 24);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
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

  // Cached gradient per key (gradients use absolute coords, which are fixed).
  grad(key, ctx, x0, y0, x1, y1, c0, c1, c2) {
    let gr = this.grads.get(key);
    if (!gr) {
      gr = ctx.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, c0);
      if (c2) {
        gr.addColorStop(0.5, c1);
        gr.addColorStop(1, c2);
      } else gr.addColorStop(1, c1);
      this.grads.set(key, gr);
    }
    return gr;
  }

  // Static HUD chrome: glass top panel, neon edge, bar frames + icons.
  chrome(W) {
    // cached at the exact device scale so the per-frame blit is 1:1
    const R = this.game.viewport.scale;
    if (this._chrome && this._chrome.W === W && this._chrome.R === R) return this._chrome;
    const h = 68;
    const c = makeCanvas(W * R, h * R);
    const x = c.getContext('2d');
    x.scale(R, R);
    const bg = x.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'rgba(14,8,42,0.94)');
    bg.addColorStop(0.75, 'rgba(14,8,42,0.72)');
    bg.addColorStop(1, 'rgba(14,8,42,0)');
    x.fillStyle = bg;
    x.fillRect(0, 0, W, h);
    // neon edge under the panel
    const edge = x.createLinearGradient(0, 0, W, 0);
    edge.addColorStop(0, 'rgba(94,243,255,0)');
    edge.addColorStop(0.2, 'rgba(94,243,255,0.8)');
    edge.addColorStop(0.5, 'rgba(160,110,255,0.9)');
    edge.addColorStop(0.8, 'rgba(255,94,200,0.8)');
    edge.addColorStop(1, 'rgba(255,94,200,0)');
    x.shadowColor = '#7a8cff';
    x.shadowBlur = 8;
    x.fillStyle = edge;
    x.fillRect(0, 62, W, 1.5);
    x.shadowBlur = 0;
    // score plate
    x.fillStyle = 'rgba(40,26,100,0.55)';
    x.strokeStyle = 'rgba(140,200,255,0.35)';
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(W / 2 - 70, 4);
    x.lineTo(W / 2 + 70, 4);
    x.lineTo(W / 2 + 58, 36);
    x.lineTo(W / 2 - 58, 36);
    x.closePath();
    x.fill();
    x.stroke();
    // coin pill
    roundRect(x, W - 127, 9, 56, 22, 11);
    x.fillStyle = 'rgba(10,6,30,0.75)';
    x.fill();
    x.strokeStyle = 'rgba(255,210,63,0.45)';
    x.stroke();
    // bar frames
    const frame = (fx, fy, fw, fh) => {
      roundRect(x, fx - 2, fy - 2, fw + 4, fh + 4, (fh + 4) / 2);
      x.fillStyle = 'rgba(6,3,20,0.9)';
      x.fill();
      x.strokeStyle = 'rgba(160,170,255,0.45)';
      x.lineWidth = 1;
      x.stroke();
    };
    frame(30, 39, 136, 10);
    frame(30, 53, 136, 6);
    // heart icon
    x.save();
    x.translate(18, 44);
    x.shadowColor = '#ff4f6d';
    x.shadowBlur = 6;
    x.fillStyle = '#ff4f6d';
    x.beginPath();
    x.moveTo(0, 6);
    x.bezierCurveTo(-9, -1, -5, -8, 0, -3.5);
    x.bezierCurveTo(5, -8, 9, -1, 0, 6);
    x.fill();
    x.shadowBlur = 0;
    x.fillStyle = 'rgba(255,255,255,0.7)';
    x.beginPath();
    x.arc(-3, -2.5, 1.4, 0, TAU);
    x.fill();
    x.restore();
    // shield icon
    x.save();
    x.translate(18, 56);
    x.scale(0.55, 0.55);
    x.shadowColor = '#43e6ff';
    x.shadowBlur = 6;
    x.fillStyle = '#43e6ff';
    drawGlyph(x, 'shield');
    x.restore();
    this._chrome = { canvas: c, W, h, R };
    this.grads.clear();
    return this._chrome;
  }

  fillBar(ctx, key, x, y, w, h, frac, label) {
    frac = Math.max(0, Math.min(1, frac));
    if (frac > 0) {
      const hp = key === 'hp';
      const low = hp && frac < 0.3;
      ctx.fillStyle = low
        ? this.grad('hpLow', ctx, 0, y, 0, y + h, '#ffe0a0', '#ff8a1f', '#c24400')
        : hp
          ? this.grad('hp', ctx, 0, y, 0, y + h, '#ffb3c0', '#ff4f6d', '#b3123a')
          : this.grad('sh', ctx, 0, y, 0, y + h, '#d8fbff', '#43e6ff', '#1a7fd1');
      roundRect(ctx, x, y, Math.max(h, w * frac), h, h / 2);
      ctx.fill();
      // gloss line
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(x + h / 2, y + 1.5, Math.max(0, w * frac - h), Math.max(1, h * 0.18));
    }
    if (label) {
      ctx.font = this.fonts.tiny;
      ctx.textAlign = 'center';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(20,6,30,0.8)';
      ctx.strokeText(label, x + w / 2, y + h / 2 + 0.5);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
    }
  }

  bossBar(ctx, boss, W) {
    const x = 18;
    const y = 84;
    const w = W - 36;
    const h = 13;
    const def = boss.def;
    // nameplate
    ctx.fillStyle = 'rgba(40,6,30,0.8)';
    roundRect(ctx, x - 4, y - 22, w + 8, h + 28, 9);
    ctx.fill();
    ctx.strokeStyle = boss.rage > 0.6 ? 'rgba(255,60,100,0.9)' : 'rgba(255,94,140,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // horned boss emblem
    ctx.fillStyle = '#ff4f6d';
    ctx.beginPath();
    ctx.arc(x + 6, y - 11, 5, 0, TAU);
    ctx.moveTo(x + 1.5, y - 13);
    ctx.lineTo(x - 0.5, y - 19);
    ctx.lineTo(x + 4, y - 15.5);
    ctx.moveTo(x + 10.5, y - 13);
    ctx.lineTo(x + 12.5, y - 19);
    ctx.lineTo(x + 8, y - 15.5);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.font = this.fonts.small;
    ctx.fillStyle = '#fff';
    ctx.fillText(def.name, x + 16, y - 10);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffb3c0';
    ctx.font = this.fonts.tiny;
    ctx.fillText(boss.phase.label + '  ' + (boss.phaseIndex + 1) + '/' + def.phases.length, x + w, y - 10);
    ctx.fillStyle = 'rgba(6,2,16,0.95)';
    roundRect(ctx, x - 1.5, y - 1.5, w + 3, h + 3, 6);
    ctx.fill();
    const frac = boss.displayHp / boss.maxHp;
    const trail = boss.trailHp / boss.maxHp;
    if (trail > frac && boss.state !== 'enter') {
      ctx.fillStyle = '#fff4c2';
      roundRect(ctx, x, y, w * trail, h, 5);
      ctx.fill();
    }
    if (frac > 0) {
      ctx.fillStyle =
        boss.rage > 0.6
          ? this.grad('bossR', ctx, 0, y, 0, y + h, '#ffd0d8', '#ff2e55', '#8a0022')
          : this.grad('boss', ctx, 0, y, 0, y + h, '#ffc2e6', '#ff4f9a', '#9a1060');
      roundRect(ctx, x, y, Math.max(6, w * frac), h, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(x + 4, y + 2, Math.max(0, w * frac - 8), 2);
      // glowing leading edge
      const gl = glowSprite('#ff9ad5', 16);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(gl.canvas, x + w * frac - 10, y - 6, 20, h + 12);
      ctx.globalCompositeOperation = 'source-over';
    }
    // phase thresholds as diamonds
    for (let i = 1; i < def.phases.length; i++) {
      const tx = x + w * def.phases[i].at;
      ctx.fillStyle = boss.phaseIndex >= i ? '#ff4f6d' : '#ffd23f';
      ctx.strokeStyle = '#150f2c';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(tx, y - 4);
      ctx.lineTo(tx + 4, y + h / 2);
      ctx.lineTo(tx, y + h + 4);
      ctx.lineTo(tx - 4, y + h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
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
    if (c.mult >= 2) {
      const gl = glowSprite(col, 16);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + c.pop * 0.5;
      ctx.drawImage(gl.canvas, x - 62, y - 26, 70, 52);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
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
    // backing band with neon edges
    const bh = b.sub ? 70 : 56;
    ctx.fillStyle = 'rgba(10,5,32,0.66)';
    ctx.fillRect(0, y - 30, W, bh);
    ctx.fillStyle = b.color;
    ctx.globalAlpha = Math.max(0, outK) * 0.8;
    ctx.fillRect(W * 0.5 * (1 - s), y - 31, W * s, 1.5);
    ctx.fillRect(W * 0.5 * (1 - s), y - 31 + bh, W * s, 1.5);
    ctx.globalAlpha = Math.max(0, outK);
    ctx.save();
    ctx.translate(W / 2, y);
    ctx.scale(s, s);
    ctx.textAlign = 'center';
    const size = b.title.length > 14 ? 26 : 34;
    ctx.font = this.bannerFont(size);
    ctx.lineWidth = 12;
    ctx.strokeStyle = b.color;
    ctx.globalAlpha *= 0.25;
    ctx.strokeText(b.title, 0, 0);
    ctx.globalAlpha = Math.max(0, outK);
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

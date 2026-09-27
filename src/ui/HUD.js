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
const INK_UI = '#0c0820';
const BAR_X = 29;
const BAR_W = 140;
// Sector accent colours (match the sector backgrounds).
const SECTOR_ACCENT = {
  meadow: '#4fd8ff',
  amber: '#9dff5a',
  crystal: '#c49bff',
  toxic: '#ff7a3d',
  void: '#ff5ec8',
  solar: '#ffc23d',
  frost: '#cfefff',
  storm: '#3dffb0',
  prism: '#8ff0ff',
  scrap: '#ff9b3d',
  ocean: '#12e0c8',
  rift: '#ff5ee0',
  darkstar: '#ff4a3a',
  abyss: '#9fb3ff',
  singularity: '#ffd23f',
};

// Dark glass panel with a crisp accent border and a thin inner highlight.
function panel(x, pts, accent) {
  const path = () => {
    x.beginPath();
    pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])));
    x.closePath();
  };
  path();
  x.fillStyle = 'rgba(10,6,30,0.8)';
  x.fill();
  x.save();
  path();
  x.clip();
  x.translate(0, 1.5);
  path();
  x.strokeStyle = 'rgba(255,255,255,0.1)';
  x.lineWidth = 1;
  x.stroke();
  x.restore();
  path();
  x.strokeStyle = accent;
  x.globalAlpha = 0.5;
  x.lineWidth = 1.2;
  x.stroke();
  x.globalAlpha = 1;
}

export class HUD {
  constructor(game) {
    this.game = game;
    this.banners = [];
    this.warn = 0;
    this.warnDur = 3;
    this.scoreStr = '0';
    this.lastScore = -1;
    this.buffPop = {};
    this.callout = null;
    this.hints = [];
    this.hint = null;
    this.fonts = {
      tiny: F(800, 10),
      small: F(800, 12),
      med: F(900, 15),
      score: F(900, 22),
      combo: 'italic ' + F(900, 23),
      badge: F(900, 11),
      coin: F(900, 13),
      bossName: F(900, 12),
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
    this.callout = null;
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

  // Short ribbon under the combo badge (tier up / combo lost).
  comboCallout(text, color) {
    this.callout = { text, color, t: 1.1 };
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
    if (this.callout && (this.callout.t -= dt) <= 0) this.callout = null;
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

    // static chrome: panels, frames, icons (pre-rendered once per screen size)
    // right panel hugs the DOM pause button (44px minimum on small phones)
    const pr = W - 14 - Math.max(44, 44 / (g.viewport.cssW / W));
    const ch = this.chrome(W, pr);
    ctx.drawImage(ch.canvas, 0, 0, W, ch.h);

    ctx.textBaseline = 'middle';
    // sector badge + wave
    const lvl = g.level;
    const w = g.waves;
    const bossPhase = g.bossManager.active || w.phase === 'warning' || w.phase === 'boss';
    const accent = SECTOR_ACCENT[lvl ? lvl.theme : 'meadow'] || '#5ef3ff';
    this.hexBadge(ctx, 21, 19, 10.5, accent);
    ctx.textAlign = 'center';
    ctx.font = this.fonts.badge;
    ctx.fillStyle = INK_UI;
    ctx.fillText(String(lvl ? lvl.id : 1), 21, 19.5);
    ctx.textAlign = 'left';
    ctx.font = this.fonts.tiny;
    ctx.fillStyle = accent;
    ctx.fillText('SECTOR ' + (lvl ? lvl.id : 1), 37, 12);
    ctx.font = this.fonts.med;
    const label = bossPhase ? 'BOSS' : 'WAVE ' + Math.max(1, w.waveIndex + 1) + '/' + w.totalWaves;
    ctx.fillStyle = bossPhase ? '#ff5e7a' : '#ffffff';
    ctx.fillText(label, 37, 25.5);

    // score
    const sc = Math.floor(g.score.displayScore);
    if (sc !== this.lastScore) {
      this.lastScore = sc;
      this.scoreStr = formatNumber(sc);
    }
    ctx.textAlign = 'center';
    ctx.font = this.fonts.score;
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK_UI;
    ctx.strokeText(this.scoreStr, W / 2, 20.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(this.scoreStr, W / 2, 20.5);

    // coins
    const coinS = coinSprite(0);
    const rx = pr - 72;
    ctx.drawImage(coinS.canvas, rx + 3, 8, 18, 18);
    ctx.textAlign = 'left';
    ctx.font = this.fonts.coin;
    ctx.fillStyle = '#ffd23f';
    ctx.fillText(String(g.run.coins), rx + 25, 17.5);

    // HP + shield bars (frames + icons are in the chrome)
    this.fillBar(ctx, 'hp', BAR_X, 37, BAR_W, 10, p.hp / p.maxHp, 'HP ' + Math.ceil(p.hp));
    if (p.maxShield > 0) this.fillBar(ctx, 'sh', BAR_X, 51, BAR_W, 5, p.shield / p.maxShield, null);

    // weapon power: slanted segments
    const maxP = CONFIG.PLAYER.maxPower;
    const full = p.power >= maxP;
    const pg = full ? this.grad('pwrMax', ctx, 0, 37, 0, 49, '#fff6c2', '#ffc21a') : this.grad('pwr', ctx, 0, 37, 0, 49, '#ffd0d6', '#ff2e55');
    for (let i = 0; i < maxP; i++) {
      const sx = rx + 25 + i * 8.8;
      ctx.fillStyle = i < p.power ? pg : 'rgba(255,255,255,0.12)';
      ctx.beginPath();
      ctx.moveTo(sx + 3, 37);
      ctx.lineTo(sx + 10, 37);
      ctx.lineTo(sx + 7, 49);
      ctx.lineTo(sx, 49);
      ctx.closePath();
      ctx.fill();
    }
    ctx.font = this.fonts.tiny;
    ctx.fillStyle = full ? '#ffd23f' : '#ffb3c0';
    ctx.fillText(full ? 'MAX' : 'PWR', rx + 3, 43.5);

    const boss = g.bossManager.active;
    let comboY = 70;
    if (boss) {
      this.bossBar(ctx, boss, W);
      comboY = 116;
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

  hexBadge(ctx, x, y, r, color) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (i) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = INK_UI;
    ctx.stroke();
  }

  // Static HUD chrome: soft top shade, dark glass panels with crisp borders,
  // bar frames and icons. Pre-rendered at device scale, blitted 1:1.
  chrome(W, pr) {
    const R = this.game.viewport.scale;
    if (this._chrome && this._chrome.W === W && this._chrome.R === R && this._chrome.pr === pr) return this._chrome;
    const h = 64;
    const c = makeCanvas(W * R, h * R);
    const x = c.getContext('2d');
    x.scale(R, R);
    x.lineJoin = 'round';
    const shade = x.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, 'rgba(4,2,16,0.55)');
    shade.addColorStop(1, 'rgba(4,2,16,0)');
    x.fillStyle = shade;
    x.fillRect(0, 0, W, h);
    // left: sector / wave / HP / shield
    panel(x, [[5, 4], [178, 4], [178, 52], [170, 60], [5, 60]], '#5ef3ff');
    // centre: score plate
    panel(x, [[W / 2 - 58, 3], [W / 2 + 58, 3], [W / 2 + 49, 37], [W / 2 - 49, 37]], '#8f7dff');
    x.fillStyle = '#5ef3ff';
    x.fillRect(W / 2 - 22, 3, 44, 2);
    // right: coins + power
    panel(x, [[pr - 76, 4], [pr, 4], [pr, 52], [pr - 8, 56], [pr - 76, 56]], '#ffd23f');
    x.fillStyle = 'rgba(255,255,255,0.08)';
    x.fillRect(pr - 70, 30, 64, 1);
    // bar frames
    const frame = (fx, fy, fw, fh) => {
      x.fillStyle = 'rgba(3,1,12,0.95)';
      x.fillRect(fx - 1.5, fy - 1.5, fw + 3, fh + 3);
      x.strokeStyle = 'rgba(170,190,255,0.35)';
      x.lineWidth = 1;
      x.strokeRect(fx - 1.5, fy - 1.5, fw + 3, fh + 3);
    };
    frame(BAR_X, 37, BAR_W, 10);
    frame(BAR_X, 51, BAR_W, 5);
    // heart icon
    x.save();
    x.translate(17, 42);
    x.fillStyle = '#ff4f6d';
    x.strokeStyle = INK_UI;
    x.lineWidth = 1.5;
    x.beginPath();
    x.moveTo(0, 5.5);
    x.bezierCurveTo(-8.5, -1, -4.8, -7.5, 0, -3.2);
    x.bezierCurveTo(4.8, -7.5, 8.5, -1, 0, 5.5);
    x.fill();
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.75)';
    x.beginPath();
    x.arc(-2.8, -2.4, 1.3, 0, TAU);
    x.fill();
    x.restore();
    // shield icon
    x.save();
    x.translate(17, 53.5);
    x.scale(0.46, 0.46);
    x.fillStyle = '#43e6ff';
    drawGlyph(x, 'shield');
    x.restore();
    this._chrome = { canvas: c, W, h, R, pr };
    this.grads.clear();
    return this._chrome;
  }

  fillBar(ctx, key, x, y, w, h, frac, label) {
    frac = Math.max(0, Math.min(1, frac));
    const fw = w * frac;
    if (frac > 0) {
      const hp = key === 'hp';
      const low = hp && frac < 0.3;
      ctx.fillStyle = low
        ? this.grad('hpLow', ctx, 0, y, 0, y + h, '#ffe0a0', '#ff8a1f', '#c24400')
        : hp
          ? this.grad('hp', ctx, 0, y, 0, y + h, '#ffb3c0', '#ff3d63', '#a30f36')
          : this.grad('sh', ctx, 0, y, 0, y + h, '#e0fcff', '#43e6ff', '#1a78d1');
      ctx.fillRect(x, y, fw, h);
      // top gloss + bright leading edge
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(x, y + 1, fw, Math.max(1, h * 0.2));
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(x + fw - 1.5, y, 1.5, h);
    }
    if (h >= 8) {
      // segment ticks every 10%
      ctx.fillStyle = 'rgba(4,2,16,0.55)';
      for (let i = 1; i < 10; i++) ctx.fillRect(x + (w * i) / 10 - 0.5, y + h * 0.45, 1, h * 0.55);
    }
    if (label) {
      ctx.font = this.fonts.tiny;
      ctx.textAlign = 'center';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(8,2,20,0.85)';
      ctx.strokeText(label, x + w / 2, y + h / 2 + 0.5);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + w / 2, y + h / 2 + 0.5);
    }
  }

  // Boss HUD: emblem, name, phase pips + label, HP bar with phase notches
  // and a damage trail, and a status line (incoming / immune / charging).
  bossBar(ctx, boss, W) {
    const def = boss.def;
    const g = this.game;
    const x0 = 6;
    const y0 = 64;
    const pw = W - 12;
    const ph = 44;
    const charging = boss.attackMode === 'telegraph' && boss.state === 'fight';
    const blink = 0.5 + 0.5 * Math.sin(g.time * 14);
    // panel
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + pw, y0);
    ctx.lineTo(x0 + pw, y0 + ph - 7);
    ctx.lineTo(x0 + pw - 7, y0 + ph);
    ctx.lineTo(x0 + 7, y0 + ph);
    ctx.lineTo(x0, y0 + ph - 7);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14,4,22,0.8)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = charging ? 'rgba(255,190,60,' + (0.5 + blink * 0.5) + ')' : boss.rage > 0.6 ? 'rgba(255,60,100,0.9)' : 'rgba(255,94,140,0.55)';
    ctx.stroke();
    ctx.fillStyle = '#ff4f6d';
    ctx.fillRect(x0 + 8, y0, 40, 2);
    // emblem: hex badge with a horned skull
    const ex = x0 + 18;
    const ey = y0 + 22;
    this.hexBadge(ctx, ex, ey, 13, boss.rage > 0.6 ? '#ff2e55' : '#c21e4a');
    ctx.fillStyle = '#ffe0e8';
    ctx.beginPath();
    ctx.arc(ex, ey + 0.5, 5, 0, TAU);
    ctx.moveTo(ex - 4.5, ey - 2);
    ctx.lineTo(ex - 7, ey - 8);
    ctx.lineTo(ex - 1.5, ey - 4.2);
    ctx.moveTo(ex + 4.5, ey - 2);
    ctx.lineTo(ex + 7, ey - 8);
    ctx.lineTo(ex + 1.5, ey - 4.2);
    ctx.fill();
    ctx.fillStyle = '#3a0616';
    ctx.fillRect(ex - 3, ey - 0.5, 2, 2);
    ctx.fillRect(ex + 1, ey - 0.5, 2, 2);
    // name + phase
    const bx = x0 + 38;
    const bw = pw - 38 - 10;
    ctx.textAlign = 'left';
    ctx.font = this.fonts.bossName;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(def.name, bx, y0 + 10);
    const n = def.phases.length;
    ctx.textAlign = 'right';
    let px = bx + bw;
    for (let i = n - 1; i >= 0; i--) {
      ctx.fillStyle = i < boss.phaseIndex ? '#ff4f6d' : i === boss.phaseIndex ? '#ffd23f' : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(px - 3.5, y0 + 6);
      ctx.lineTo(px, y0 + 10);
      ctx.lineTo(px - 3.5, y0 + 14);
      ctx.lineTo(px - 7, y0 + 10);
      ctx.closePath();
      ctx.fill();
      px -= 9;
    }
    ctx.font = this.fonts.tiny;
    ctx.fillStyle = '#ffb3c0';
    ctx.fillText(boss.phase.label, px - 3, y0 + 10.5);
    // HP bar
    const y = y0 + 18;
    const h = 11;
    ctx.fillStyle = 'rgba(3,1,10,0.95)';
    ctx.fillRect(bx - 1.5, y - 1.5, bw + 3, h + 3);
    const frac = boss.displayHp / boss.maxHp;
    const trail = boss.trailHp / boss.maxHp;
    if (trail > frac && boss.state !== 'enter') {
      ctx.fillStyle = '#fff4c2';
      ctx.fillRect(bx, y, bw * trail, h);
    }
    if (frac > 0) {
      ctx.fillStyle =
        boss.rage > 0.6
          ? this.grad('bossR', ctx, 0, y, 0, y + h, '#ffd0d8', '#ff2e55', '#8a0022')
          : this.grad('boss', ctx, 0, y, 0, y + h, '#ffc2e6', '#ff4f9a', '#9a1060');
      ctx.fillRect(bx, y, bw * frac, h);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(bx, y + 1.5, bw * frac, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx + bw * frac - 1.5, y, 1.5, h);
    }
    // phase thresholds: dark notches with a marker above
    for (let i = 1; i < n; i++) {
      const tx = bx + bw * def.phases[i].at;
      ctx.fillStyle = 'rgba(8,2,16,0.9)';
      ctx.fillRect(tx - 1, y, 2, h);
      ctx.fillStyle = boss.phaseIndex >= i ? '#ff4f6d' : '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(tx - 3, y - 4);
      ctx.lineTo(tx + 3, y - 4);
      ctx.lineTo(tx, y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,160,200,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 1.5, y - 1.5, bw + 3, h + 3);
    // status line
    const sy = y0 + 37;
    ctx.textAlign = 'left';
    ctx.font = this.fonts.tiny;
    let status = null;
    let scol = '#ffffff';
    if (boss.state === 'enter') {
      status = 'INCOMING';
      scol = '#9fb3ff';
    } else if (boss.state === 'transition') {
      status = 'PHASE SHIFT · IMMUNE';
      scol = '#9fb3ff';
    } else if (charging) {
      status = '⚠ CHARGING ATTACK';
      scol = blink > 0.5 ? '#ffd23f' : '#ff9b3d';
    } else if (boss.rage > 0.6) {
      status = 'ENRAGED';
      scol = '#ff5e7a';
    }
    if (status) {
      ctx.fillStyle = scol;
      ctx.fillText(status, bx, sy);
      if (charging) {
        const cw = 46;
        const cx = bx + ctx.measureText(status).width + 8;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(cx, sy - 2, cw, 4);
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(cx, sy - 2, cw * boss.charge, 4);
      }
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd0dc';
    ctx.fillText(Math.ceil(frac * 100) + '%', bx + bw, sy);
  }

  // Compact combo badge on the right: slanted plate, big multiplier, count
  // and the combo timer as the plate's underline.
  combo(ctx, W, y) {
    const c = this.game.combo;
    const co = this.callout;
    if (co) {
      const k = Math.min(1, co.t * 4);
      const cy = c.count < 2 ? y + 10 : y + 50;
      ctx.globalAlpha = k;
      ctx.font = this.fonts.small;
      ctx.textAlign = 'right';
      const tw = ctx.measureText(co.text).width;
      ctx.fillStyle = 'rgba(10,5,28,0.78)';
      ctx.fillRect(W - 16 - tw - 8 + (1 - k) * 20, cy - 8, tw + 16, 16);
      ctx.fillStyle = co.color;
      ctx.fillRect(W - 16 - tw - 8 + (1 - k) * 20, cy - 8, 2, 16);
      ctx.fillText(co.text, W - 16 + (1 - k) * 20, cy + 0.5);
      ctx.globalAlpha = 1;
    }
    if (c.count < 2) return;
    const col = COMBO_COLORS[Math.min(5, c.mult)];
    const right = W - 8;
    const pw = 94;
    const ph = 34;
    const s = 1 + c.pop * 0.25;
    ctx.save();
    ctx.translate(right, y + ph / 2);
    ctx.scale(s, s);
    ctx.translate(-right, -(y + ph / 2));
    ctx.beginPath();
    ctx.moveTo(right - pw + 8, y);
    ctx.lineTo(right, y);
    ctx.lineTo(right - 8, y + ph);
    ctx.lineTo(right - pw, y + ph);
    ctx.closePath();
    ctx.fillStyle = 'rgba(10,5,28,0.55)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = c.mult >= 2 ? col : 'rgba(170,190,255,0.4)';
    ctx.globalAlpha = 0.5 + c.pop * 0.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    // multiplier
    ctx.textAlign = 'left';
    ctx.font = this.fonts.combo;
    ctx.lineWidth = 4;
    ctx.strokeStyle = INK_UI;
    const txt = 'x' + c.mult;
    ctx.strokeText(txt, right - pw + 10, y + ph / 2 - 1);
    ctx.fillStyle = col;
    ctx.fillText(txt, right - pw + 10, y + ph / 2 - 1);
    // count
    ctx.textAlign = 'right';
    ctx.font = this.fonts.med;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(c.count), right - 12, y + 11);
    ctx.font = this.fonts.tiny;
    ctx.fillStyle = 'rgba(220,225,255,0.7)';
    ctx.fillText('COMBO', right - 14, y + 25);
    // timer underline
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(right - pw, y + ph + 2, pw - 8, 2.5);
    ctx.fillStyle = col;
    ctx.fillRect(right - pw, y + ph + 2, (pw - 8) * c.timerFrac, 2.5);
    ctx.restore();
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

import { CONFIG } from '../data/config.js';
import { LEVELS } from '../data/levels.js';
import { UPGRADES, upgradeCost } from '../data/upgrades.js';
import { STATE, RunState } from './GameState.js';
import { GameLoop } from './GameLoop.js';
import { Viewport } from '../core/Viewport.js';
import { Input } from '../core/Input.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { ComboSystem } from '../systems/ComboSystem.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { CollisionSystem } from '../systems/CollisionSystem.js';
import { Debug } from '../systems/Debug.js';
import { AudioManager } from '../audio/AudioManager.js';
import { Background } from '../effects/Background.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { FloatingText } from '../effects/FloatingText.js';
import { ScreenShake } from '../effects/ScreenShake.js';
import { Effects } from '../effects/Explosion.js';
import { BulletSystem } from '../weapons/Bullet.js';
import { WeaponSystem } from '../weapons/WeaponSystem.js';
import { Player } from '../player/Player.js';
import { EnemyManager } from '../enemy/EnemyManager.js';
import { BossManager } from '../boss/BossManager.js';
import { ItemManager } from '../items/ItemManager.js';
import { WaveSystem } from '../levels/WaveSystem.js';
import { HUD } from '../ui/HUD.js';
import { UIManager } from '../ui/UIManager.js';
import { shipSprite, flameSprite } from '../art/ShipArt.js';
import { dist2 } from '../core/math.js';

// Central coordinator. Systems are plain objects that receive `game` and talk
// to each other through the small set of event methods below
// (hitEnemy, killEnemy, damagePlayer, onBossDefeated ...).

export class Game {
  constructor({ app, stage, canvas }) {
    this.app = app;
    this.stage = stage;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.state = STATE.MENU;
    this.time = 0;
    this.timeScale = 1;
    this.slowMo = 0;
    this.flashAlpha = 0;
    this.flashColor = '#fff';
    this.level = null;
    this.pendingEnd = null;
    this.movedDist = 0;
    this.lowFpsTime = 0;
    this.goodFpsTime = 0;
    this.lastBossText = 0;
  }

  get W() {
    return this.viewport.W;
  }

  get H() {
    return this.viewport.H;
  }

  init() {
    this.save = new SaveSystem();
    const settings = this.save.data.settings;
    this.viewport = new Viewport(this.app, this.stage, this.canvas);
    this.input = new Input(this.canvas, this.viewport);
    this.audio = new AudioManager(settings);
    this.run = new RunState();
    this.combo = new ComboSystem();
    this.score = new ScoreSystem(this.run, this.combo);
    this.bg = new Background(this.W, this.H);
    this.particles = new ParticleSystem(CONFIG.POOL.particles);
    this.effects = new Effects(this.particles);
    this.texts = new FloatingText(CONFIG.POOL.texts);
    this.shake = new ScreenShake();
    this.shake.enabled = settings.shake;
    this.bullets = new BulletSystem();
    this.bullets.resize(this.W, this.H);
    this.player = new Player(this);
    this.player.applyUpgrades(this.save.data.upgrades);
    this.player.reset(this.W, this.H);
    this.weapons = new WeaponSystem(this);
    this.enemies = new EnemyManager(this);
    this.bossManager = new BossManager(this);
    this.items = new ItemManager(this);
    this.waves = new WaveSystem(this);
    this.collision = new CollisionSystem(this);
    this.hud = new HUD(this);
    this.debug = new Debug(this);
    this.ui = new UIManager(this);

    this.combo.onTierUp = (mult) => {
      this.texts.spawn('COMBO x' + mult + '!', this.W - 70, 150, '#ffd23f', 20, 1, -30);
      this.audio.play('combo', mult);
      if (mult >= 4) this.shake.add(0.12);
    };
    this.combo.onBreak = (n) => {
      if (this.state === STATE.PLAYING) this.texts.spawn('COMBO LOST (' + n + ')', this.W - 80, 150, '#9fb3ff', 12, 0.9, -20);
    };

    this.viewport.onResize(() => {
      this.bg.resize(this.W, this.H);
      this.bullets.resize(this.W, this.H);
      if (this.state === STATE.MENU) this.player.reset(this.W, this.H);
    });

    this.input.onSkill = () => this.useSkill();
    this.input.onPause = () => {
      if (this.state === STATE.PLAYING) this.pause();
      else if (this.state === STATE.PAUSED) this.resume();
    };
    this.input.onFirstGesture = () => this.audio.unlock();

    this._onVisibility = () => {
      if (document.hidden) {
        if (this.state === STATE.PLAYING) this.pause();
        this.audio.setMuted(true);
      } else {
        this.audio.setMuted(false);
      }
    };
    document.addEventListener('visibilitychange', this._onVisibility);

    this.loop = new GameLoop(
      (dt) => this.update(dt),
      () => this.render()
    );
    this.ui.showScreen('menu');
    this.audio.playMusic('menu');
    this.loop.start();
  }

  // ------------------------------------------------------------ flow

  startLevel(index, carryScore = 0) {
    const level = LEVELS[index];
    if (!level) return;
    this.level = level;
    this.run.reset(index, carryScore);
    this.player.applyUpgrades(this.save.data.upgrades);
    this.player.reset(this.W, this.H);
    this.weapons.reset();
    this.enemies.clear();
    this.enemies.setLevel(level);
    this.bossManager.clear();
    this.bullets.clear();
    this.items.reset();
    this.particles.clear();
    this.texts.clear();
    this.combo.reset();
    this.score.reset(carryScore);
    this.hud.reset();
    this.shake.reset();
    this.bg.setTheme(level.theme);
    this.bg.targetSpeedMul = 1;
    this.waves.start(level);
    this.timeScale = 1;
    this.slowMo = 0;
    this.flashAlpha = 0;
    this.pendingEnd = null;
    this.movedDist = 0;
    this.input.resetDrag();
    this.state = STATE.PLAYING;
    this.save.data.lastLevel = level.id;
    this.save.data.stats.gamesPlayed++;
    this.save.save();
    this.ui.showGameplay();
    this.audio.playMusic('battle');
    this.hud.banner('SECTOR ' + level.id, level.name, '#5ef3ff', 2.2, 0.36);
    if (level.tutorial) {
      this.hud.addHint('DRAG ANYWHERE TO MOVE', 'Your ship copies your finger', () => this.movedDist > 160, 8, 'drag');
      this.hud.addHint('AUTO-FIRE IS ON!', 'Dodge bullets, grab glowing capsules', null, 3.5);
      this.hud.addHint('TAP NOVA FOR A SUPER BLAST', 'Clears bullets & hits everything', () => this.player.skillCooldown > 0, 6, 'skill');
    }
  }

  restartLevel() {
    this.bankRun();
    this.startLevel(this.run.levelIndex, this.run.levelStartScore);
  }

  nextLevel() {
    const next = this.run.levelIndex + 1;
    if (next < LEVELS.length) this.startLevel(next, this.run.score);
  }

  pause() {
    if (this.state !== STATE.PLAYING) return;
    this.state = STATE.PAUSED;
    this.input.release();
    this.audio.duckMusic(true);
    this.ui.showScreen('pause');
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    this.state = STATE.PLAYING;
    this.input.resetDrag();
    this.audio.duckMusic(false);
    this.ui.showGameplay();
  }

  exitToMenu() {
    if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) this.bankRun();
    this.state = STATE.MENU;
    this.clearWorld();
    this.player.reset(this.W, this.H);
    this.bg.setTheme('meadow');
    this.bg.targetSpeedMul = 1;
    this.audio.duckMusic(false);
    this.audio.playMusic('menu');
    this.ui.showScreen('menu');
  }

  clearWorld() {
    this.enemies.clear();
    this.bossManager.clear();
    this.bullets.clear();
    this.items.clear();
    this.particles.clear();
    this.texts.clear();
    this.hud.reset();
    this.pendingEnd = null;
    this.timeScale = 1;
    this.slowMo = 0;
    this.flashAlpha = 0;
  }

  // Coins collected in a run are kept even when the run fails (keeps the
  // upgrade loop motivating on mobile).
  bankRun() {
    const run = this.run;
    if (run.banked) return;
    run.banked = true;
    const d = this.save.data;
    this.save.addCoins(run.coins);
    run.newBest = run.score > d.bestScore;
    if (run.newBest) d.bestScore = run.score;
    this.save.save();
  }

  completeLevel() {
    const run = this.run;
    const level = this.level;
    const R = CONFIG.REWARD;
    const clearBonus = this.score.addBonus(CONFIG.SCORE.levelClear * level.id);
    const clearCoins = R.levelClearCoins + R.perLevelCoins * level.id;
    const comboCoins = Math.floor(run.maxCombo / 5) * R.comboCoinsPer5;
    const collected = run.coins;
    run.coins += clearCoins + comboCoins;
    const d = this.save.data;
    const wasUnlocked = d.unlockedLevel;
    d.unlockedLevel = Math.min(LEVELS.length, Math.max(d.unlockedLevel, level.id + 1));
    if (!d.clearedLevels.includes(level.id)) d.clearedLevels.push(level.id);
    this.bankRun();
    this.bullets.clear();
    this.state = STATE.VICTORY;
    this.audio.play('levelClear');
    this.audio.playMusic('menu');
    this.ui.showVictory({
      level,
      score: run.score,
      kills: run.kills,
      collected,
      clearCoins,
      comboCoins,
      coins: run.coins,
      items: run.itemsCollected,
      bonus: run.bonus,
      clearBonus,
      maxCombo: run.maxCombo,
      perfectWaves: run.perfectWaves,
      noDamageWaves: run.noDamageWaves,
      newBest: run.newBest,
      unlocked: d.unlockedLevel > wasUnlocked ? LEVELS[d.unlockedLevel - 1] : null,
      isLast: run.levelIndex >= LEVELS.length - 1,
    });
  }

  gameOver() {
    const run = this.run;
    this.bankRun();
    this.bullets.player.clear();
    this.state = STATE.GAMEOVER;
    this.audio.play('gameOver');
    this.audio.playMusic('menu');
    this.ui.showGameOver({
      level: this.level,
      score: run.score,
      best: this.save.data.bestScore,
      newBest: run.newBest,
      kills: run.kills,
      coins: run.coins,
      wave: this.waves.waveIndex + 1,
      reachedBoss: this.waves.phase === 'boss',
    });
  }

  buyUpgrade(id) {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return false;
    const d = this.save.data;
    const lv = d.upgrades[id] | 0;
    const cost = upgradeCost(def, lv);
    if (lv >= def.maxLevel || !this.save.spendCoins(cost)) {
      this.audio.play('denied');
      return false;
    }
    d.upgrades[id] = lv + 1;
    this.save.save();
    this.player.applyUpgrades(d.upgrades);
    this.audio.play('upgrade');
    return true;
  }

  setSetting(key, value) {
    const s = this.save.data.settings;
    s[key] = value;
    this.save.save();
    if (key === 'sound') this.audio.setSound(value);
    if (key === 'music') {
      this.audio.setMusic(value);
      if (value) this.audio.playMusic(this.state === STATE.PLAYING || this.state === STATE.PAUSED ? (this.bossManager.active ? 'boss' : 'battle') : 'menu');
    }
    if (key === 'shake') this.shake.enabled = value;
    if (key === 'debug') this.debug.setEnabled(value);
  }

  resetProgress() {
    this.save.reset();
    this.player.applyUpgrades(this.save.data.upgrades);
  }

  // ------------------------------------------------------------ combat events

  critChance() {
    const p = this.player;
    return p.stats.critChance + (p.buffs.crit > 0 ? 0.35 : 0);
  }

  hitEnemy(e, damage, x, y, noCrit = false) {
    if (!e.alive) return;
    const crit = !noCrit && Math.random() < this.critChance();
    const dmg = crit ? damage * this.player.stats.critDamage : damage;
    e.hp -= dmg;
    e.flash = 0.07;
    this.effects.hitSpark(x, y, e.type.color, crit);
    if (crit) {
      this.run.crits++;
      this.score.addRaw(CONFIG.SCORE.critBonus * this.combo.mult);
      this.texts.spawn('CRIT ' + Math.round(dmg), x, y - 10, '#fff275', 17, 0.75, -70);
      this.audio.play('crit');
    } else {
      this.texts.spawn(String(Math.round(dmg)), x + (Math.random() * 10 - 5), y - 6, '#ffffff', 11, 0.5, -60);
      this.audio.play('hit');
    }
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    if (!e.alive) return;
    e.alive = false;
    const t = e.type;
    const big = e.maxHp >= 50;
    this.effects.enemyExplosion(e.x, e.y, t.color, big ? 1.4 : 1);
    this.audio.play('enemyDie');
    this.shake.add(big ? 0.22 : 0.09);
    this.combo.addKill();
    if (this.combo.count > this.run.maxCombo) this.run.maxCombo = this.combo.count;
    const pts = this.score.addKill(t.score);
    const m = this.combo.mult;
    this.texts.spawn('+' + pts, e.x, e.y + 8, m >= 3 ? '#ffd23f' : '#b8f6ff', m >= 3 ? 15 : 13, 0.8, -40);
    const coins = t.coins + (m >= 3 ? 1 : 0) + (m >= 5 ? 1 : 0);
    this.items.spawnCoins(e.x, e.y, coins);
    this.items.rollDrop(e.x, e.y, t.dropChance * (this.level ? this.level.mods.drop : 1));
    this.run.kills++;
    this.save.data.stats.totalKills++;
    this.waves.onEnemyGone(e, true);
  }

  hitBoss(boss, damage, x, y) {
    if (!boss.vulnerable) {
      this.effects.bulletPop(x, y, '#9fb3ff');
      return;
    }
    const crit = Math.random() < this.critChance();
    const dmg = crit ? damage * this.player.stats.critDamage : damage;
    boss.damage(dmg);
    this.effects.hitSpark(x, y, boss.def.color, crit);
    this.score.addRaw(crit ? CONFIG.SCORE.critBonus * 2 : 2);
    if (crit) {
      this.run.crits++;
      this.texts.spawn('CRIT ' + Math.round(dmg), x, y - 10, '#fff275', 18, 0.75, -70);
      this.audio.play('crit');
    } else {
      // throttle boss numbers so a 5-stream weapon stays readable
      if (this.time - this.lastBossText > 0.09) {
        this.lastBossText = this.time;
        this.texts.spawn(String(Math.round(dmg)), x + (Math.random() * 40 - 20), y + Math.random() * 10, '#ffffff', 12, 0.5, -60);
      }
      this.audio.play('hit');
    }
  }

  damagePlayer(amount, sx, sy) {
    const p = this.player;
    if (!p.alive || p.invuln > 0 || p.entering > 0 || this.debug.god || this.pendingEnd) return;
    if (p.buffs.shield > 0) {
      this.audio.play('shieldHit');
      this.effects.bulletPop(sx, sy, '#43e6ff');
      p.lastHitShield = 0.3;
      return;
    }
    const absorbed = Math.min(p.shield, amount);
    p.shield -= absorbed;
    p.shieldDelay = CONFIG.PLAYER.shieldRegenDelay;
    const rest = amount - absorbed;
    if (absorbed > 0) {
      p.lastHitShield = 0.35;
      this.audio.play('shieldHit');
    }
    if (rest <= 0) {
      p.invuln = 0.5;
      this.shake.add(0.12);
      return;
    }
    p.hp = Math.max(0, p.hp - rest);
    p.hitFlash = 0.12;
    p.invuln = CONFIG.PLAYER.invulnTime;
    this.run.damageTaken += rest;
    this.audio.play('playerHit');
    this.shake.add(0.35);
    this.flash('#ff2e55', 0.25);
    this.vibrate(40);
    this.combo.break();
    this.waves.onPlayerDamaged();
    this.texts.spawn('-' + Math.round(rest), p.x, p.y - 30, '#ff5e7a', 16, 0.8, -40);
    this.particles.burst('spark', p.x, p.y, 10, 120, 300, 0.3, 5, '#ff5e7a', { drag: 4 });
    if (p.hp <= 0) this.playerDie();
  }

  playerDie() {
    const p = this.player;
    p.alive = false;
    this.effects.bigExplosion(p.x, p.y, '#ff9b3d', 1.2);
    this.effects.bigExplosion(p.x, p.y, '#5ef3ff', 0.8);
    this.audio.play('playerDie');
    this.shake.add(1);
    this.flash('#ffffff', 0.7);
    this.slowMo = 0.8;
    this.vibrate(200);
    this.combo.break();
    this.pendingEnd = { type: 'gameover', timer: 2.2 };
  }

  collectCoin(c) {
    this.run.coins += c.value;
    this.audio.play('coin');
    this.effects.coinSparkle(this.player.x, this.player.y - 12);
  }

  bombBlast(x, y, def) {
    this.effects.shockwave(x, y, '#ff8c42', def.radius, 0.55);
    this.effects.bigExplosion(x, y, '#ff8c42', 0.8);
    this.audio.play('bomb');
    this.shake.add(0.5);
    this.flash('#ffb36b', 0.3);
    const r2 = def.radius * def.radius;
    const list = this.enemies.active;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.alive && dist2(e.x, e.y, x, y) < r2) this.hitEnemy(e, def.damage, e.x, e.y, true);
    }
    const boss = this.bossManager.active;
    if (boss && boss.vulnerable && dist2(boss.x, boss.y, x, y) < (def.radius + 80) ** 2) {
      boss.damage(def.bossDamage);
      this.texts.spawn(String(def.bossDamage), boss.x, boss.y + 40, '#ff8c42', 22, 0.9, -50);
    }
    this.clearEnemyBullets(x, y, def.radius);
  }

  clearEnemyBullets(x = 0, y = 0, radius = Infinity) {
    const r2 = radius === Infinity ? Infinity : radius * radius;
    let n = 0;
    const a = this.bullets.enemy.active;
    for (let i = 0; i < a.length; i++) {
      const b = a[i];
      if (r2 !== Infinity && dist2(b.x, b.y, x, y) > r2) continue;
      b.alive = false;
      n++;
      if (n % 2 === 0) this.effects.bulletPop(b.x, b.y, '#ffd23f');
    }
    this.bullets.enemy.sweep();
    if (n > 0) this.score.addRaw(n * CONFIG.SCORE.bulletCleared);
    return n;
  }

  useSkill() {
    const p = this.player;
    if (this.state !== STATE.PLAYING || !p.alive || p.entering > 0) return false;
    if (p.skillCooldown > 0) {
      this.audio.play('denied');
      return false;
    }
    const S = CONFIG.SKILL;
    p.skillCooldown = S.cooldown;
    p.invuln = Math.max(p.invuln, S.invuln);
    this.flash('#ffffff', 0.65);
    this.effects.shockwave(p.x, p.y, '#5ef3ff', this.H * 0.9, 0.8);
    this.effects.bigExplosion(p.x, p.y - 20, '#5ef3ff', 1);
    this.audio.play('nova');
    this.shake.add(0.6);
    this.vibrate(80);
    const n = this.clearEnemyBullets();
    const dmg = S.damage + p.stats.attack * 4;
    const list = this.enemies.active;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.alive && e.y > -10 && e.y < this.H) this.hitEnemy(e, dmg, e.x, e.y, true);
    }
    const boss = this.bossManager.active;
    if (boss && boss.vulnerable) {
      boss.damage(S.bossDamage);
      this.effects.bigExplosion(boss.x, boss.y + 30, '#5ef3ff', 0.7);
      this.texts.spawn(String(S.bossDamage), boss.x, boss.y + 30, '#5ef3ff', 24, 1, -50);
    }
    this.texts.spawn('NOVA!', p.x, p.y - 60, '#5ef3ff', 30, 1, -40);
    if (n > 0) this.texts.spawn('+' + n * CONFIG.SCORE.bulletCleared, p.x, p.y - 90, '#ffd23f', 14, 1, -30);
    return true;
  }

  onBossPhase(boss, index) {
    this.hud.banner('PHASE ' + (index + 1), boss.phase.label, '#ff5e7a', 1.8, 0.42);
    this.audio.play('bossPhase');
    this.shake.add(0.5);
    this.flash('#ff2e55', 0.35);
    this.effects.shockwave(boss.x, boss.y, boss.def.color, 260, 0.7);
    this.clearEnemyBullets();
    this.vibrate(60);
  }

  onBossDying(boss) {
    this.slowMo = 1.3;
    this.audio.play('bossDeath');
    this.clearEnemyBullets();
    this.flash('#ffffff', 0.4);
    this.shake.add(0.5);
    // minions flee in panic (explode, no rewards)
    const list = this.enemies.active;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.alive) {
        this.effects.enemyExplosion(e.x, e.y, e.type.color, 0.8);
        e.alive = false;
      }
    }
  }

  onBossDefeated(boss) {
    const def = boss.def;
    this.effects.bigExplosion(boss.x, boss.y, def.color, 2);
    this.effects.bigExplosion(boss.x - 50, boss.y + 20, '#ffd23f', 1.2);
    this.effects.bigExplosion(boss.x + 50, boss.y - 10, '#ffffff', 1.2);
    this.audio.play('bigExplosion');
    this.shake.add(1);
    this.flash('#ffffff', 0.9);
    this.vibrate(250);
    const pts = this.score.addBonus(def.score);
    this.texts.spawn('+' + pts.toLocaleString('en-US'), boss.x, boss.y, '#ffd23f', 30, 2, -30);
    this.items.spawnCoins(boss.x, boss.y, def.coins, true);
    this.run.bossDefeated = true;
    this.save.data.stats.bossesDefeated++;
    this.hud.banner('BOSS DEFEATED!', def.name, '#ffd23f', 2.6, 0.4);
    if (!this.pendingEnd) this.pendingEnd = { type: 'victory', timer: 3.2 };
  }

  flash(color, alpha) {
    this.flashColor = color;
    this.flashAlpha = Math.max(this.flashAlpha, alpha);
  }

  vibrate(ms) {
    if (!this.save.data.settings.vibration) return;
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {
      /* unsupported */
    }
  }

  // ------------------------------------------------------------ loop

  update(dt) {
    this.time += dt;
    if (this.state === STATE.PLAYING) this.updatePlaying(dt);
    else if (this.state !== STATE.PAUSED) {
      this.bg.update(dt);
      this.particles.update(dt);
      this.texts.update(dt);
      this.player.t += dt;
    }
    this.shake.update(dt);
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.2);
  }

  updatePlaying(dt) {
    if (this.slowMo > 0) {
      this.slowMo -= dt;
      this.timeScale = 0.3;
    } else if (this.timeScale < 1) {
      this.timeScale = Math.min(1, this.timeScale + dt * 2);
    }
    const wdt = dt * this.timeScale;
    const edt = wdt * (this.player.buffs.slow > 0 ? 0.5 : 1);
    this.run.time += wdt;

    const px = this.player.x;
    this.player.update(wdt, this.input, this.W, this.H);
    this.movedDist += Math.abs(this.player.x - px);
    this.weapons.update(wdt);
    this.waves.update(wdt);
    this.enemies.update(edt);
    this.bossManager.update(edt);
    this.bullets.update(wdt, edt);
    this.items.update(wdt);
    this.collision.update();
    this.combo.update(wdt);
    this.score.update(dt);
    this.particles.update(wdt);
    this.texts.update(wdt);
    this.bg.update(wdt);
    this.hud.update(dt);
    this.ui.updateSkill(this.player.skillCooldown / CONFIG.SKILL.cooldown);
    this.adaptQuality(dt);

    if (this.pendingEnd) {
      this.pendingEnd.timer -= dt;
      if (this.pendingEnd.timer <= 0) {
        const type = this.pendingEnd.type;
        this.pendingEnd = null;
        if (type === 'victory') this.completeLevel();
        else this.gameOver();
      }
    }
  }

  // Keep gameplay responsive on weak phones: fewer particles + lower
  // resolution when FPS stays low, restore particles when it recovers.
  adaptQuality(dt) {
    const fps = this.loop.fps;
    if (fps < 45) {
      this.lowFpsTime += dt;
      this.goodFpsTime = 0;
    } else if (fps > 57) {
      this.goodFpsTime += dt;
      this.lowFpsTime = 0;
    }
    if (this.lowFpsTime > 2) {
      this.lowFpsTime = 0;
      if (this.particles.quality > 0.5) this.particles.quality = 0.5;
      else {
        this.particles.quality = 0.35;
        this.viewport.setLowQuality(true);
      }
    }
    if (this.goodFpsTime > 6 && this.particles.quality < 1) {
      this.goodFpsTime = 0;
      this.particles.quality = Math.min(1, this.particles.quality + 0.25);
    }
  }

  simulate(seconds, step = 1 / 60) {
    const n = Math.round(seconds / step);
    for (let i = 0; i < n; i++) this.update(step);
  }

  render() {
    const ctx = this.ctx;
    const s = this.viewport.scale;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.save();
    ctx.translate(this.shake.x, this.shake.y);
    this.bg.render(ctx);
    const inGame = this.state !== STATE.MENU;
    if (inGame) {
      this.items.render(ctx);
      this.enemies.render(ctx);
      this.bossManager.render(ctx);
      this.bullets.renderPlayer(ctx);
      this.player.render(ctx, this.state === STATE.PLAYING ? this.effects : null);
      this.bullets.renderEnemy(ctx);
    } else {
      this.renderMenuShip(ctx);
    }
    this.particles.render(ctx);
    this.texts.render(ctx);
    ctx.restore();
    if (this.state === STATE.PLAYING || this.state === STATE.PAUSED) this.hud.render(ctx);
    else if (this.flashAlpha > 0) {
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.globalAlpha = 1;
    }
    this.debug.render(ctx);
  }

  renderMenuShip(ctx) {
    const t = this.time;
    const x = this.W / 2 + Math.sin(t * 0.8) * 30;
    const y = this.H - 80 + Math.sin(t * 1.7) * 8;
    const fl = flameSprite();
    ctx.globalCompositeOperation = 'lighter';
    const f = 0.85 + Math.random() * 0.3;
    ctx.drawImage(fl.canvas, x - 16, y + 24, 14, 28 * f);
    ctx.drawImage(fl.canvas, x + 2, y + 24, 14, 28 * f);
    ctx.globalCompositeOperation = 'source-over';
    const sp = shipSprite(3);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.cos(t * 0.8) * 0.08);
    ctx.drawImage(sp.canvas, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
    ctx.restore();
    if (Math.random() < 0.5) this.effects.engineTrail(x + (Math.random() < 0.5 ? -9 : 9), y + 36);
  }

  destroy() {
    this.loop.stop();
    this.input.destroy();
    this.viewport.destroy();
    this.ui.destroy();
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.audio.stopMusic();
  }
}

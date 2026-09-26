// Procedural audio via WebAudio: every sound effect is synthesised at runtime
// (no asset files, no network). A tiny step sequencer plays chiptune-style
// music loops. To use recorded assets later, load AudioBuffers and play them
// from `play()` using the same names.

// Minimum seconds between two plays of the same (very frequent) sound.
const MIN_GAP = { shoot: 0.075, hit: 0.045, crit: 0.07, coin: 0.04, enemyDie: 0.04, enemyShoot: 0.09, shieldHit: 0.1 };

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Chords as MIDI roots + minor/major triads, 16 steps per bar.
const TRACKS = {
  menu: {
    bpm: 96,
    bars: [
      [57, 'm'],
      [53, 'M'],
      [48, 'M'],
      [55, 'M'],
    ],
    drums: 'k...h...s...h...',
    arp: [0, 1, 2, 1, 0, 1, 2, 3],
    leadVol: 0.05,
  },
  battle: {
    bpm: 132,
    bars: [
      [57, 'm'],
      [53, 'M'],
      [48, 'M'],
      [55, 'M'],
      [57, 'm'],
      [53, 'M'],
      [55, 'M'],
      [52, 'M'],
    ],
    drums: 'k.h.s.h.k.hks.h.',
    arp: [0, 1, 2, 3, 2, 1, 0, 2],
    leadVol: 0.055,
  },
  boss: {
    bpm: 150,
    bars: [
      [50, 'm'],
      [50, 'm'],
      [46, 'M'],
      [52, 'M'],
      [50, 'm'],
      [48, 'M'],
      [46, 'M'],
      [45, 'M'],
    ],
    drums: 'k.hkskh.k.hkskhs',
    arp: [0, 2, 1, 3, 0, 2, 3, 1],
    leadVol: 0.06,
  },
};

export class AudioManager {
  constructor(settings) {
    this.ctx = null;
    this.soundOn = settings.sound;
    this.musicOn = settings.music;
    this.lastPlayed = Object.create(null);
    this.track = null;
    this.wantTrack = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
    this.muted = false; // e.g. tab hidden
  }

  // Must be called from a user gesture (mobile autoplay policies).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (_) {
        return;
      }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(c.destination);
      this.sfx = c.createGain();
      this.sfx.gain.value = this.soundOn ? 0.55 : 0;
      this.sfx.connect(this.master);
      this.music = c.createGain();
      this.music.gain.value = this.musicOn ? 0.32 : 0;
      this.music.connect(this.master);
      // shared white noise buffer
      const len = c.sampleRate;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (this.wantTrack && !this.track) this.playMusic(this.wantTrack);
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  setSound(on) {
    this.soundOn = on;
    if (this.sfx) this.sfx.gain.value = on ? 0.55 : 0;
  }

  setMusic(on) {
    this.musicOn = on;
    if (this.music) this.music.gain.value = on ? 0.32 : 0;
    if (on && this.wantTrack && !this.track) this.playMusic(this.wantTrack);
    if (!on) this.stopSequencer();
  }

  setMuted(m) {
    this.muted = m;
    if (!this.ctx) return;
    if (m) this.ctx.suspend().catch(() => {});
    else this.ctx.resume().catch(() => {});
  }

  duckMusic(on) {
    if (!this.music || !this.musicOn) return;
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setTargetAtTime(on ? 0.1 : 0.32, t, 0.1);
  }

  // ------------------------------------------------------------ primitives

  tone(freq, dur, type = 'square', vol = 0.2, freqEnd = null, delay = 0, dest = this.sfx) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.2, filter = 'lowpass', freq = 2000, freqEnd = null, delay = 0, dest = this.sfx, q = 1) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = filter;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------ sfx

  // minGap throttles very frequent sounds (auto-fire, hits) to protect CPU
  // and ears.
  play(name, arg) {
    if (!this.ctx || !this.soundOn || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const gap = MIN_GAP[name] || 0.02;
    if (now - (this.lastPlayed[name] || 0) < gap) return;
    this.lastPlayed[name] = now;
    const fn = SFX[name];
    if (fn) {
      try {
        fn(this, arg);
      } catch (_) {
        /* never let audio break gameplay */
      }
    }
  }

  // ------------------------------------------------------------ music

  playMusic(name) {
    this.wantTrack = name;
    if (!this.ctx || !this.musicOn) return;
    if (this.track === TRACKS[name] && this.timer) return;
    this.stopSequencer();
    this.track = TRACKS[name];
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 30);
  }

  stopMusic() {
    this.wantTrack = null;
    this.stopSequencer();
  }

  stopSequencer() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  schedule() {
    if (!this.ctx || !this.track) return;
    if (this.ctx.state !== 'running') {
      this.nextTime = this.ctx.currentTime + 0.1;
      return;
    }
    const tr = this.track;
    const stepDur = 60 / tr.bpm / 4;
    // Never try to catch up after a long stall.
    if (this.nextTime < this.ctx.currentTime - 0.2) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.playStep(tr, this.step, this.nextTime - this.ctx.currentTime, stepDur);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  playStep(tr, step, delay, stepDur) {
    const s = step % 16;
    const bar = Math.floor(step / 16) % tr.bars.length;
    const [root, q] = tr.bars[bar];
    const third = q === 'm' ? 3 : 4;
    const chord = [root, root + third, root + 7, root + 12];
    const m = this.music;
    const d = Math.max(0, delay);
    // bass on 8ths
    if (s % 2 === 0) this.tone(midi(root - 12), stepDur * 1.6, 'triangle', 0.22, null, d, m);
    // arpeggio on 16ths
    const note = chord[tr.arp[s % tr.arp.length]] + 12;
    this.tone(midi(note), stepDur * 0.9, 'square', tr.leadVol, null, d, m);
    // drums
    const k = tr.drums[s];
    if (k === 'k') this.tone(150, 0.16, 'sine', 0.45, 40, d, m);
    else if (k === 's') this.noise(0.12, 0.18, 'bandpass', 1800, null, d, m, 0.8);
    else if (k === 'h') this.noise(0.04, 0.08, 'highpass', 7000, null, d, m);
  }
}

const SFX = {
  shoot: (a) => a.tone(900, 0.05, 'square', 0.035, 500),
  hit: (a) => a.noise(0.04, 0.09, 'highpass', 3000),
  crit: (a) => {
    a.tone(1500, 0.08, 'square', 0.07, 2400);
    a.noise(0.06, 0.12, 'highpass', 4000);
  },
  enemyDie: (a) => {
    a.noise(0.25, 0.28, 'lowpass', 2400, 200);
    a.tone(320, 0.18, 'square', 0.08, 70);
  },
  bigExplosion: (a) => {
    a.noise(0.7, 0.45, 'lowpass', 1600, 60);
    a.tone(120, 0.6, 'sawtooth', 0.15, 30);
  },
  coin: (a) => {
    a.tone(988, 0.06, 'square', 0.06);
    a.tone(1319, 0.12, 'square', 0.06, null, 0.05);
  },
  pickup: (a) => {
    a.tone(523, 0.08, 'square', 0.09);
    a.tone(784, 0.08, 'square', 0.09, null, 0.06);
    a.tone(1047, 0.16, 'square', 0.09, null, 0.12);
  },
  powerUp: (a) => {
    a.tone(300, 0.35, 'sawtooth', 0.1, 1400);
    a.tone(600, 0.35, 'square', 0.06, 2000, 0.05);
  },
  heal: (a) => {
    a.tone(660, 0.12, 'sine', 0.14);
    a.tone(880, 0.2, 'sine', 0.14, null, 0.1);
  },
  shieldUp: (a) => a.tone(400, 0.4, 'sine', 0.15, 1200),
  shieldHit: (a) => a.tone(1200, 0.12, 'triangle', 0.12, 500),
  playerHit: (a) => {
    a.noise(0.25, 0.35, 'lowpass', 900, 100);
    a.tone(180, 0.25, 'square', 0.14, 60);
  },
  playerDie: (a) => {
    a.noise(1.2, 0.5, 'lowpass', 1800, 40);
    a.tone(400, 1.1, 'sawtooth', 0.14, 30);
  },
  nova: (a) => {
    a.noise(0.9, 0.5, 'lowpass', 4000, 80);
    a.tone(90, 0.8, 'sine', 0.5, 30);
    a.tone(700, 0.5, 'sawtooth', 0.08, 90);
  },
  bomb: (a) => {
    a.noise(0.6, 0.45, 'lowpass', 2500, 70);
    a.tone(110, 0.5, 'sine', 0.4, 35);
  },
  bossWarning: (a) => {
    for (let i = 0; i < 3; i++) {
      a.tone(440, 0.28, 'sawtooth', 0.1, 660, i * 0.6);
      a.tone(660, 0.28, 'sawtooth', 0.1, 440, i * 0.6 + 0.3);
    }
  },
  bossAttack: (a) => a.tone(160, 0.35, 'sawtooth', 0.09, 520),
  laserCharge: (a) => a.tone(200, 0.9, 'sawtooth', 0.07, 1400),
  laser: (a) => {
    a.noise(0.9, 0.2, 'bandpass', 1200, 600, 0, a.sfx, 3);
    a.tone(110, 0.9, 'square', 0.08, 90);
  },
  bossPhase: (a) => {
    a.tone(220, 0.5, 'sawtooth', 0.14, 110);
    a.tone(330, 0.5, 'sawtooth', 0.1, 165, 0.05);
    a.noise(0.5, 0.25, 'lowpass', 2000, 100);
  },
  bossDeath: (a) => {
    a.noise(2.2, 0.55, 'lowpass', 3000, 40);
    a.tone(300, 2, 'sawtooth', 0.16, 25);
    a.tone(150, 2, 'square', 0.1, 20, 0.2);
  },
  levelClear: (a) => {
    const notes = [60, 64, 67, 72, 67, 72, 76];
    notes.forEach((n, i) => a.tone(midi(n + 12), i === notes.length - 1 ? 0.6 : 0.14, 'square', 0.09, null, i * 0.12));
  },
  gameOver: (a) => {
    const notes = [67, 63, 60, 55];
    notes.forEach((n, i) => a.tone(midi(n), 0.35, 'triangle', 0.18, null, i * 0.28));
  },
  click: (a) => a.tone(1200, 0.04, 'square', 0.06, 900),
  combo: (a, tier) => {
    const base = 60 + (tier || 1) * 3;
    a.tone(midi(base + 12), 0.09, 'square', 0.08);
    a.tone(midi(base + 19), 0.14, 'square', 0.08, null, 0.07);
  },
  wave: (a) => {
    a.tone(midi(72), 0.1, 'square', 0.07);
    a.tone(midi(79), 0.18, 'square', 0.07, null, 0.1);
  },
  denied: (a) => a.tone(200, 0.15, 'square', 0.08, 120),
  upgrade: (a) => {
    a.tone(midi(72), 0.08, 'square', 0.08);
    a.tone(midi(76), 0.08, 'square', 0.08, null, 0.07);
    a.tone(midi(79), 0.08, 'square', 0.08, null, 0.14);
    a.tone(midi(84), 0.2, 'square', 0.08, null, 0.21);
  },
  enemyShoot: (a) => a.tone(520, 0.08, 'triangle', 0.05, 260),
};

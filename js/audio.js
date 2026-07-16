// ============================================================================
// SHARDSTORM — audio.js
// Zero-asset audio. SFX synthesized with WebAudio (random pitch variation so
// nothing sounds machine-gun repetitive). Music is a real generative loop:
// four-chord progression, kick, hi-hat, bass line and a filtered arp.
// ============================================================================

SS.Audio = {
  ctx: null,
  master: null,
  sfxGain: null,
  musicGain: null,
  musicTimer: null,
  step: 0,

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.8;
      this.musicGain.connect(this.master);
    } catch (e) { /* no audio available */ }
  },

  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  // Rising kill "pop" — pitch climbs with the combo counter (Peggle-style).
  // Mowing a crowd produces a satisfying ascending melody.
  killPop(combo = 0) {
    if (!this.ctx || !this.soundOn) return;
    const f = 380 * Math.pow(2, Math.min(combo, 24) / 12);
    this.tone(f, 0.09, 'square', 0.12, f * 1.4);
    this.tone(f * 2, 0.06, 'sine', 0.06, null, 0.02);
  },

  get soundOn() { return SS.Save.data.settings.sound; },
  get musicOn() { return SS.Save.data.settings.music; },

  // --- SFX primitives --------------------------------------------------------
  // vary=true adds ±6% random detune — keeps repeated sounds organic
  tone(freq, dur, type = 'sine', vol = 0.3, slideTo = null, when = 0, vary = false) {
    if (!this.ctx || !this.soundOn) return;
    if (vary) { const v = 0.94 + Math.random() * 0.12; freq *= v; if (slideTo) slideTo *= v; }
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  },

  noise(dur, vol = 0.3, freq = 1000, type = 'lowpass') {
    if (!this.ctx || !this.soundOn) return;
    const t = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t);
  },

  // Punchy synthesized kick (also reused for heavy impacts)
  kick(vol = 0.5, when = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(this.musicGain);
    o.start(t); o.stop(t + 0.25);
  },

  // --- Named game sounds -------------------------------------------------------
  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'shoot':   this.tone(760, 0.07, 'square', 0.07, 320, 0, true); break;
      case 'hit':     this.noise(0.05, 0.13, 2200); this.tone(340, 0.05, 'triangle', 0.10, 180, 0, true); break;
      case 'crit':    this.tone(210, 0.16, 'sawtooth', 0.2, 55, 0, true); this.noise(0.12, 0.18, 3200); break;
      case 'hurt':    this.tone(170, 0.28, 'sawtooth', 0.28, 45); this.noise(0.15, 0.2, 500); break;
      case 'coin':    this.tone(1150, 0.06, 'square', 0.09, null, 0, true); this.tone(1720, 0.11, 'square', 0.07, null, 0.055, true); break;
      case 'xp':      this.tone(920, 0.06, 'sine', 0.06, 1350, 0, true); break;
      case 'frag':    this.tone(520, 0.1, 'triangle', 0.14, 940, 0, true); this.tone(780, 0.13, 'triangle', 0.11, 1250, 0.07, true); break;
      case 'merge':   [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.16, null, i * 0.07)); this.noise(0.25, 0.06, 4000, 'highpass'); break;
      case 'legend':  [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.32, 'triangle', 0.18, null, i * 0.09)); break;
      case 'levelup': [440, 554, 659, 880].forEach((f, i) => this.tone(f, 0.26, 'square', 0.09, null, i * 0.08)); this.tone(1760, 0.5, 'sine', 0.06, null, 0.32); break;
      case 'dash':    this.noise(0.16, 0.14, 1600, 'bandpass'); this.tone(280, 0.16, 'sine', 0.1, 950); break;
      case 'explode': this.noise(0.4, 0.3, 650); this.kick(0.5); break;
      case 'boss':    [130, 98, 130, 98].forEach((f, i) => this.tone(f, 0.42, 'sawtooth', 0.22, null, i * 0.25)); this.noise(0.8, 0.08, 300); break;
      case 'bosskill':this.noise(0.9, 0.35, 480); this.kick(0.9); this.kick(0.7, 0.15);
                      [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.45, 'triangle', 0.16, null, 0.32 + i * 0.1)); break;
      case 'ui':      this.tone(640, 0.045, 'sine', 0.09, null, 0, true); break;
      case 'buy':     this.tone(820, 0.07, 'square', 0.09); this.tone(1230, 0.14, 'square', 0.09, null, 0.075); break;
      case 'error':   this.tone(190, 0.14, 'square', 0.11, 140); break;
      case 'magnet':  this.tone(380, 0.45, 'sine', 0.14, 1700); break;
      case 'ach':     [660, 880, 1320].forEach((f, i) => this.tone(f, 0.32, 'sine', 0.14, null, i * 0.12)); break;
      case 'shield':  this.tone(900, 0.2, 'sine', 0.16, 300); this.noise(0.1, 0.1, 5000, 'highpass'); break;
      case 'gameover':[330, 262, 196, 131].forEach((f, i) => this.tone(f, 0.55, 'triangle', 0.2, null, i * 0.3)); break;
    }
  },

  // --- MUSIC ENGINE ------------------------------------------------------------
  // 128 BPM, 8th-note sequencer. Am → F → C → G progression.
  // Layers: kick (4-floor), hi-hat, bass octave bounce, filtered saw arp, pad.
  startMusic() {
    this.init();
    if (!this.ctx || this.musicTimer) return;
    const A = 110, F = 87.31, C = 130.81, Gn = 98;
    // chords as [root, minor/major third, fifth] frequency ratios
    const CHORDS = [
      [A,  A * 1.189, A * 1.498],   // Am
      [F,  F * 1.26,  F * 1.498],   // F
      [C,  C * 1.26,  C * 1.498],   // C
      [Gn, Gn * 1.26, Gn * 1.498]   // G
    ];
    const stepMs = (60 / 128) * 1000 / 2;  // 8th notes @128bpm ≈ 234ms
    this.step = 0;

    const note = (freq, dur, type, vol, when = 0, filterFreq = null) => {
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.value = freq;
      let out = g;
      if (filterFreq) {
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = filterFreq; f.Q.value = 6;
        o.connect(f); f.connect(g);
      } else o.connect(g);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      g.connect(this.musicGain);
      o.start(t); o.stop(t + dur + 0.05);
    };

    this.musicTimer = setInterval(() => {
      if (!this.musicOn || document.hidden || this.ctx.state !== 'running') return;
      const s = this.step++;
      const bar = Math.floor(s / 8) % 4;         // one chord per bar
      const beat8 = s % 8;                        // position within the bar
      const chord = CHORDS[bar];

      // KICK: four-on-the-floor
      if (beat8 % 2 === 0) this.kick(0.5);
      // HI-HAT: offbeats, occasional double
      if (beat8 % 2 === 1 || Math.random() < 0.12) {
        const t = this.ctx.currentTime;
        const len = Math.floor(this.ctx.sampleRate * 0.04);
        const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource(); src.buffer = buf;
        const f = this.ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        src.connect(f); f.connect(g); g.connect(this.musicGain);
        src.start(t);
      }
      // BASS: root with octave bounce
      note(chord[0] / 2 * (beat8 % 4 === 2 ? 2 : 1), 0.22, 'triangle', 0.6);
      // ARP: filtered saw over chord tones, 2 octaves up, semi-random pattern
      const arpNote = chord[(s * 3 + bar) % 3] * (beat8 % 3 === 0 ? 4 : 2);
      note(arpNote, 0.18, 'sawtooth', 0.15, 0, 1200 + Math.sin(s * 0.4) * 700);
      // PAD: soft sustained chord at the start of each bar
      if (beat8 === 0) chord.forEach(f => note(f * 2, 1.6, 'sine', 0.08));
    }, stepMs);
  },

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }
};

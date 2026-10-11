/* ============================================================
   TapperBoet — audio.js
   WebAudio synth: SFX + a tiny step-sequencer for chiptunes.
   Autoplay-safe: init on first keypress.
   ============================================================ */
"use strict";

const Sfx = (() => {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let noiseBuf = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 1.0;
    sfxGain.connect(master);
    // noise buffer (1s)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const NOTE = (() => {
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const map = {};
    for (let oct = 1; oct <= 7; oct++) names.forEach((nm, i) => { map[nm + oct] = (oct + 1) * 12 + i; });
    return map;
  })();

  function tone(type, freq, t0, dur, vol, dest, glideTo) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(t0, dur, vol, filterFreq, dest, type) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type || 'lowpass';
    f.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest || sfxGain);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  const now = () => (ctx ? ctx.currentTime : 0);

  /* ------------------------- SFX bank ------------------------- */
  const bank = {
    click() { tone('square', 660, now(), 0.06, 0.25); },
    pour() { noise(now(), 0.55, 0.30, 900); },
    slide() { noise(now(), 0.12, 0.12, 2400, null, 'highpass'); },
    clink() {
      tone('sine', 1250, now(), 0.08, 0.30);
      tone('sine', 1870, now() + 0.05, 0.10, 0.22);
    },
    gulp() {
      for (let i = 0; i < 3; i++) tone('square', 340 - i * 70, now() + i * 0.09, 0.07, 0.22);
    },
    shatter() {
      noise(now(), 0.35, 0.5, 5200, null, 'highpass');
      tone('triangle', 180, now(), 0.25, 0.4, null, 60);
    },
    angry() { tone('square', 220, now(), 0.16, 0.3, null, 140); tone('square', 165, now() + 0.12, 0.16, 0.3, null, 110); },
    vuvuzela() {
      const t = now();
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 1100;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.08);
      g.gain.setValueAtTime(0.35, t + 2.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      f.connect(g); g.connect(sfxGain);
      [233.1, 236.5, 466.2, 471.0].forEach(fr => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = fr;
        o.connect(f); o.start(t); o.stop(t + 2.7);
      });
    },
    biltong() { tone('triangle', 300, now(), 0.28, 0.35, null, 900); },
    gen() { tone('sine', 90, now(), 0.18, 0.6, null, 40); noise(now() + 0.05, 0.15, 0.3, 4000, null, 'highpass'); },
    blackout() { tone('sawtooth', 420, now(), 0.7, 0.4, null, 50); noise(now(), 0.5, 0.2, 500); },
    powerup() {
      tone('square', 80, now(), 0.4, 0.35, null, 480);
      tone('sine', 440, now() + 0.3, 0.2, 0.3);
    },
    tip() {
      [880, 1175, 1568].forEach((f, i) => tone('square', f, now() + i * 0.06, 0.09, 0.22));
    },
    lifeLost() {
      [392, 311, 233].forEach((f, i) => tone('sawtooth', f, now() + i * 0.14, 0.16, 0.3));
    },
    fanfare() {
      const seq = [523, 659, 784, 1047, 784, 1047];
      seq.forEach((f, i) => tone('square', f, now() + i * 0.11, 0.14, 0.25));
    },
    sizzle() { noise(now(), 0.4, 0.25, 3000, null, 'highpass'); },
    perfect() { [784, 988, 1319, 1568].forEach((f, i) => tone('square', f, now() + i * 0.07, 0.12, 0.25)); },
    fail() { tone('sawtooth', 200, now(), 0.3, 0.3, null, 80); },
    gameover() {
      [330, 311, 294, 262, 196].forEach((f, i) => tone('sawtooth', f, now() + i * 0.22, 0.3, 0.28));
    },
    eish() { tone('square', 500, now(), 0.1, 0.3, null, 900); tone('square', 900, now() + 0.1, 0.15, 0.3, null, 500); },
  };

  /* ------------------------- Music ------------------------- */
  /* Pattern = { bpm, steps: total 16th steps, notes: [[note|0, step, lenSteps, chan], ...] }
     chan: 0 = lead (square), 1 = bass (triangle), 2 = hat (noise) */
  const SONG_MENU = {
    bpm: 108, steps: 64,
    notes: [
      // Shosholoza-inspired call (lead)
      ['G3', 0, 2, 0], ['C4', 2, 2, 0], ['E4', 4, 4, 0], ['C4', 8, 4, 0],
      ['E4', 12, 4, 0], ['G4', 16, 6, 0], ['E4', 22, 2, 0], ['C4', 24, 6, 0],
      ['G3', 32, 2, 0], ['C4', 34, 2, 0], ['E4', 36, 4, 0], ['C4', 40, 4, 0],
      ['D4', 44, 4, 0], ['E4', 48, 8, 0], ['C4', 56, 8, 0],
      // bass
      ['C2', 0, 3, 1], ['C2', 4, 3, 1], ['G2', 8, 3, 1], ['C2', 12, 3, 1],
      ['A1', 16, 3, 1], ['A1', 20, 3, 1], ['E2', 24, 3, 1], ['A1', 28, 3, 1],
      ['F1', 32, 3, 1], ['F1', 36, 3, 1], ['C2', 40, 3, 1], ['F1', 44, 3, 1],
      ['G1', 48, 3, 1], ['G1', 52, 3, 1], ['C2', 56, 3, 1], ['G1', 60, 3, 1],
      // hats
      ...Array.from({ length: 16 }, (_, i) => ['h', i * 4 + 2, 1, 2]),
    ],
  };

  const SONG_GAME = {
    bpm: 128, steps: 64,
    notes: [
      // bouncy lead
      ['A4', 0, 2, 0], ['C5', 2, 2, 0], ['E5', 4, 3, 0], ['C5', 8, 2, 0], ['A4', 10, 2, 0],
      ['G4', 12, 4, 0], ['A4', 16, 2, 0], ['C5', 18, 2, 0], ['D5', 20, 4, 0], ['E5', 24, 6, 0],
      ['D5', 30, 2, 0], ['C5', 32, 2, 0], ['A4', 34, 2, 0], ['G4', 36, 4, 0], ['A4', 40, 2, 0],
      ['C5', 42, 2, 0], ['E5', 44, 4, 0], ['D5', 48, 2, 0], ['C5', 50, 2, 0], ['A4', 52, 4, 0],
      ['G4', 56, 2, 0], ['A4', 58, 2, 0], ['C5', 60, 4, 0],
      // bass groove
      ['A1', 0, 2, 1], ['A1', 4, 2, 1], ['A1', 6, 2, 1], ['G1', 8, 2, 1], ['A1', 12, 2, 1],
      ['F1', 16, 2, 1], ['F1', 20, 2, 1], ['C2', 24, 2, 1], ['F1', 28, 2, 1],
      ['A1', 32, 2, 1], ['A1', 36, 2, 1], ['G1', 40, 2, 1], ['A1', 44, 2, 1],
      ['E1', 48, 2, 1], ['E1', 52, 2, 1], ['G1', 56, 2, 1], ['E1', 60, 2, 1],
      // hats
      ...Array.from({ length: 32 }, (_, i) => ['h', i * 2, 1, 2]),
    ],
  };

  const SONG_BRAAI = {
    bpm: 100, steps: 32,
    notes: [
      ['C4', 0, 3, 0], ['E4', 4, 3, 0], ['G4', 8, 3, 0], ['E4', 12, 3, 0],
      ['F4', 16, 3, 0], ['A4', 20, 3, 0], ['G4', 24, 6, 0],
      ['C2', 0, 3, 1], ['C2', 4, 3, 1], ['G1', 8, 3, 1], ['C2', 12, 3, 1],
      ['F1', 16, 3, 1], ['F1', 20, 3, 1], ['C2', 24, 3, 1], ['G1', 28, 3, 1],
      ...Array.from({ length: 8 }, (_, i) => ['h', i * 4 + 2, 1, 2]),
    ],
  };

  const SONGS = { menu: SONG_MENU, game: SONG_GAME, braai: SONG_BRAAI };

  let cur = null;          // 'menu' | 'game' | 'braai' | null
  let step = 0;
  let nextTime = 0;
  let timer = null;
  let musicOn = true;

  function scheduleNote(n, t, spb) {
    const [, stepAt, len, chan] = n;
    if (stepAt !== step) return;
    const dur = len * spb;
    if (n[0] === 'h') {
      noise(t, 0.03, 0.06, 6000, musicGain, 'highpass');
    } else if (chan === 0) {
      tone('square', midi(NOTE[n[0]]), t, dur * 0.9, 0.12, musicGain);
    } else if (chan === 1) {
      tone('triangle', midi(NOTE[n[0]]), t, dur * 0.95, 0.30, musicGain);
    }
  }

  function schedulerTick() {
    if (!ctx || !cur || !musicOn || muted) return;
    const song = SONGS[cur];
    const spb = 60 / song.bpm / 4; // seconds per 16th
    // resync if we fell behind (tab hidden, or unmuted after a gap)
    if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + 0.15) {
      for (const n of song.notes) scheduleNote(n, nextTime, spb);
      nextTime += spb;
      step = (step + 1) % song.steps;
    }
  }

  function playMusic(name) {
    resume();
    if (cur === name) return;
    cur = name; step = 0;
    if (ctx) nextTime = ctx.currentTime + 0.05;
    if (!timer) timer = setInterval(schedulerTick, 50);
  }

  function stopMusic() { cur = null; }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.55;
  }
  function toggleMute() { setMuted(!muted); return muted; }

  function sfx(name) {
    if (!ctx || muted) return;
    if (bank[name]) bank[name]();
  }

  return { init, resume, sfx, playMusic, stopMusic, setMuted, toggleMute, get muted() { return muted; } };
})();

/* ============================================================
   TapperBoet — soundtrack.js
   Renders the demo soundtrack as a WAV from cues.json written
   by record.js. Uses the same song data as the game.
   Run: node dev/soundtrack.js
   ============================================================ */
'use strict';
const fs = require('fs');

const OUT_DIR = '/tmp/opencode/tapperboet-demo';
const cues = JSON.parse(fs.readFileSync(OUT_DIR + '/cues.json', 'utf8'));
const SR = 44100;
const dur = Math.ceil(cues.total + 1);

/* ---------------- song data (same as audio.js) ---------------- */
const NOTE = (() => {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const map = {};
  for (let oct = 1; oct <= 7; oct++) names.forEach((nm, i) => { map[nm + oct] = (oct + 1) * 12 + i; });
  return map;
})();
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

const SONG_MENU = {
  bpm: 108, steps: 64,
  notes: [
    ['G3', 0, 2, 0], ['C4', 2, 2, 0], ['E4', 4, 4, 0], ['C4', 8, 4, 0],
    ['E4', 12, 4, 0], ['G4', 16, 6, 0], ['E4', 22, 2, 0], ['C4', 24, 6, 0],
    ['G3', 32, 2, 0], ['C4', 34, 2, 0], ['E4', 36, 4, 0], ['C4', 40, 4, 0],
    ['D4', 44, 4, 0], ['E4', 48, 8, 0], ['C4', 56, 8, 0],
    ['C2', 0, 3, 1], ['C2', 4, 3, 1], ['G2', 8, 3, 1], ['C2', 12, 3, 1],
    ['A1', 16, 3, 1], ['A1', 20, 3, 1], ['E2', 24, 3, 1], ['A1', 28, 3, 1],
    ['F1', 32, 3, 1], ['F1', 36, 3, 1], ['C2', 40, 3, 1], ['F1', 44, 3, 1],
    ['G1', 48, 3, 1], ['G1', 52, 3, 1], ['C2', 56, 3, 1], ['G1', 60, 3, 1],
    ...Array.from({ length: 16 }, (_, i) => ['h', i * 4 + 2, 1, 2]),
  ],
};
const SONG_GAME = {
  bpm: 128, steps: 64,
  notes: [
    ['A4', 0, 2, 0], ['C5', 2, 2, 0], ['E5', 4, 3, 0], ['C5', 8, 2, 0], ['A4', 10, 2, 0],
    ['G4', 12, 4, 0], ['A4', 16, 2, 0], ['C5', 18, 2, 0], ['D5', 20, 4, 0], ['E5', 24, 6, 0],
    ['D5', 30, 2, 0], ['C5', 32, 2, 0], ['A4', 34, 2, 0], ['G4', 36, 4, 0], ['A4', 40, 2, 0],
    ['C5', 42, 2, 0], ['E5', 44, 4, 0], ['D5', 48, 2, 0], ['C5', 50, 2, 0], ['A4', 52, 4, 0],
    ['G4', 56, 2, 0], ['A4', 58, 2, 0], ['C5', 60, 4, 0],
    ['A1', 0, 2, 1], ['A1', 4, 2, 1], ['A1', 6, 2, 1], ['G1', 8, 2, 1], ['A1', 12, 2, 1],
    ['F1', 16, 2, 1], ['F1', 20, 2, 1], ['C2', 24, 2, 1], ['F1', 28, 2, 1],
    ['A1', 32, 2, 1], ['A1', 36, 2, 1], ['G1', 40, 2, 1], ['A1', 44, 2, 1],
    ['E1', 48, 2, 1], ['E1', 52, 2, 1], ['G1', 56, 2, 1], ['E1', 60, 2, 1],
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

/* ---------------- synth ---------------- */
const N = dur * SR;
const buf = new Float32Array(N);

function addTone(t0, durT, freq, vol, chan) {
  const s0 = Math.max(0, Math.floor(t0 * SR));
  const s1 = Math.min(N, Math.floor((t0 + durT) * SR));
  const attack = Math.floor(0.006 * SR);
  for (let s = s0; s < s1; s++) {
    const tt = (s - s0) / SR;
    let env = 1;
    if (s - s0 < attack) env = (s - s0) / attack;
    else env = Math.pow(1 - (tt / durT), 1.4); // decay to end
    let v;
    const ph = 2 * Math.PI * freq * tt;
    if (chan === 0) { // square lead
      v = Math.sign(Math.sin(ph)) * 0.55 + 0.45 * Math.sign(Math.sin(2 * ph)) * 0.2;
      env *= 0.16;
    } else { // triangle bass
      v = 2 / Math.PI * Math.asin(Math.sin(ph));
      env *= 0.30;
    }
    buf[s] += v * env * vol;
  }
}

function addHat(t0, vol) {
  const s0 = Math.max(0, Math.floor(t0 * SR));
  const s1 = Math.min(N, s0 + Math.floor(0.03 * SR));
  let prev = 0;
  for (let s = s0; s < s1; s++) {
    const w = Math.random() * 2 - 1;
    const hp = w - prev; prev = w; // cheap highpass
    buf[s] += hp * 0.05 * vol * (1 - (s - s0) / (s1 - s0));
  }
}

function addVuvuzela(t0, durT) {
  const s0 = Math.max(0, Math.floor(t0 * SR));
  const s1 = Math.min(N, Math.floor((t0 + durT) * SR));
  const attack = Math.floor(0.08 * SR);
  const release = Math.floor(0.4 * SR);
  for (let s = s0; s < s1; s++) {
    const i = s - s0;
    const tt = i / SR;
    let env = 1;
    if (i < attack) env = i / attack;
    else if (s1 - s < release) env = (s1 - s) / release;
    let v = 0;
    [233.1, 236.5, 466.2, 471.0].forEach((f, k) => {
      v += Math.sin(2 * Math.PI * f * tt) * (k < 2 ? 1 : 0.4);
    });
    buf[s] += (v / 2.8) * env * 0.22;
  }
}

/* schedule a song over a window [start,end) */
function scheduleSong(song, start, end, vol) {
  if (start == null || end == null || end <= start) return;
  const spb = 60 / song.bpm / 4;
  const loopLen = song.steps * spb;
  const loops = Math.ceil((end - start) / loopLen);
  for (let L = 0; L < loops; L++) {
    for (const note of song.notes) {
      const t = start + L * loopLen + note[1] * spb;
      if (t >= end) continue;
      if (note[0] === 'h') addHat(t, vol);
      else addTone(t, note[2] * spb * 0.9, midi(NOTE[note[0]]), vol, note[3]);
    }
  }
}

/* ---------------- timeline from cues ---------------- */
/* segments: [{ type: 'menu'|'game'|'braai', start }] — each runs until the
   next one starts; the last runs to the end of the dub. */
const segs = cues.segments || [];
for (let i = 0; i < segs.length; i++) {
  const start = segs[i].start;
  const end = (i + 1 < segs.length) ? segs[i + 1].start : dur;
  const song = segs[i].type === 'braai' ? SONG_BRAAI
    : segs[i].type === 'menu' ? SONG_MENU : SONG_GAME;
  scheduleSong(song, start, end, 1);
}
if (cues.vuvuAt != null) addVuvuzela(cues.vuvuAt, 2.6);

/* normalize + soft clip */
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
const gain = 0.85 / (peak || 1);
for (let i = 0; i < N; i++) {
  buf[i] = Math.tanh(buf[i] * gain * 1.1) * 0.92;
}

/* ---------------- write WAV ---------------- */
const pcm = Buffer.alloc(44 + N * 2);
pcm.write('RIFF', 0);
pcm.writeUInt32LE(36 + N * 2, 4);
pcm.write('WAVEfmt ', 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);       // PCM
pcm.writeUInt16LE(1, 22);       // mono
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write('data', 36);
pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) {
  pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf[i] * 32767))), 44 + i * 2);
}
fs.writeFileSync(OUT_DIR + '/soundtrack.wav', pcm);
console.log('wrote', OUT_DIR + '/soundtrack.wav', (N / SR).toFixed(1) + 's');

/* Headless smoke test for TapperBoet.
   Stubs the DOM, loads the game scripts in browser-like shared scope,
   then simulates gameplay: first a chaos monkey (crash-hunting),
   then a competent auto-player bot (proves the game is winnable). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---------- DOM stubs ---------- */
function absorbingCtx() {
  const fn = () => proxy;
  const proxy = new Proxy(function () {}, {
    get: (t, p) => {
      if (p === Symbol.toPrimitive) return () => 0;
      return fn;
    },
    set: () => true,
    apply: () => proxy,
  });
  return proxy;
}
function fakeCanvas() {
  return {
    width: 0, height: 0, style: {},
    getContext: () => absorbingCtx(),
  };
}
const keyHandlers = {};
globalThis.window = {
  addEventListener: (ev, fn) => { if (!keyHandlers[ev]) keyHandlers[ev] = []; keyHandlers[ev].push(fn); },
  AudioContext: undefined,
  webkitAudioContext: undefined,
  innerWidth: 1280, innerHeight: 800,
};
globalThis.document = {
  createElement: () => fakeCanvas(),
  getElementById: () => fakeCanvas(),
};
globalThis.localStorage = {
  _d: {},
  getItem(k) { return this._d[k] !== undefined ? this._d[k] : null; },
  setItem(k, v) { this._d[k] = String(v); },
};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

let rafCb = null;
globalThis.requestAnimationFrame = cb => { rafCb = cb; };

/* ---------- load game scripts in shared scope ---------- */
const files = ['sprites.js', 'audio.js', 'input.js', 'levels.js', 'entities.js', 'ui.js', 'main.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  vm.runInThisContext(code, { filename: f });
}

/* ---------- helpers ---------- */
// top-level let/class live in the shared script scope, not on globalThis
const getG = () => vm.runInThisContext('G');
const getMug = () => vm.runInThisContext('Mug');
const press = code => keyHandlers.keydown.forEach(fn => fn({ code, preventDefault() {} }));
const release = code => keyHandlers.keyup.forEach(fn => fn({ code, preventDefault() {} }));

let t = 0;
function frames(n, actions) {
  for (let i = 0; i < n; i++) {
    if (actions) actions(i);
    t += 16.67;
    const cb = rafCb; rafCb = null;
    cb(t);
    if (!rafCb) throw new Error('rAF chain broken');
  }
}

function sanity(tag) {
  const g = getG();
  const bad = [];
  if (!isFinite(g.bar.x) || !isFinite(g.bar.y)) bad.push('bar pos NaN');
  if (!isFinite(g.score)) bad.push('score NaN');
  for (const c of g.customers) if (!isFinite(c.x) || !isFinite(c.patience)) bad.push('customer NaN');
  for (const m of g.mugs) if (!isFinite(m.x)) bad.push('mug NaN');
  if (bad.length) throw new Error(tag + ': ' + bad.join(', '));
}

let lastState = null;
const stateLog = [];
function trackState() {
  const g = getG();
  if (g.state !== lastState) { lastState = g.state; stateLog.push(g.state); }
  if (!['title', 'play', 'clear', 'braai', 'gameover', 'victory'].includes(g.state))
    throw new Error('bad state: ' + g.state);
}

function ensurePlay() {
  let guard = 0;
  while (getG().state !== 'play') {
    press('Enter'); frames(1); release('Enter'); frames(2, trackState);
    if (++guard > 20) throw new Error('cannot reach play state, stuck at ' + getG().state);
  }
}

/* ---------- chaos monkey (crash hunting) ---------- */
function chaosPhase() {
  frames(30, trackState);
  press('Enter'); frames(1); release('Enter'); frames(5, trackState);
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
    'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyV', 'KeyB', 'KeyE'];
  frames(60 * 40, i => {
    if (i % 7 === 0) {
      const k = keys[Math.floor(Math.random() * keys.length)];
      press(k); release(k);
    }
    trackState();
    if (i % 300 === 0) sanity('chaos@' + i);
  });
  console.log('chaos phase survived, final state:', getG().state,
    'score=R' + getG().score, 'lives=' + getG().lives);
  ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].forEach(release);
}

/* ---------- auto-player bot (must be able to win) ---------- */
let held = new Set();
function hold(...codes) {
  for (const c of codes) if (!held.has(c)) { press(c); held.add(c); }
}
function unhold(...codes) {
  for (const c of codes) if (held.has(c)) { release(c); held.delete(c); }
}
function unholdAll() { unhold(...held); }

function botFrame() {
  const g = getG();
  if (g.state !== 'play') { unholdAll(); return; }
  const bar = g.bar;
  const v = g.venue();

  // panic buttons: vuvuzela for two+ marchers (or none left to catch one),
  // biltong saved for a marcher that is genuinely close to the bar
  const marchers = g.customers.filter(c => !c.dead && c.state === 'march');
  const closeMarcher = marchers.some(m => m.x > 280);
  if (marchers.length >= 2 && g.vuvuReady) { press('KeyV'); release('KeyV'); }
  else if (marchers.length === 1 && g.biltong === 0 && g.vuvuReady) { press('KeyV'); release('KeyV'); }
  else if (closeMarcher && g.biltong > 0) { press('KeyB'); release('KeyB'); }

  // single priority queue: marchers (closest first), then waiters (least patient first)
  let targetLane = bar.lane, urgency = 0;
  for (const m of g.mugs) {
    if (m.state === 'slide' && m.returning) {
      const u = 300 + m.cx;
      if (u > urgency) { urgency = u; targetLane = m.lane; }
    }
  }
  if (urgency === 0) {
    const serv = g.customers.filter(c => !c.dead && (c.state === 'march' || c.state === 'wait' || c.state === 'enter'));
    serv.sort((a, b) => {
      const am = a.state === 'march' ? 0 : 1, bm = b.state === 'march' ? 0 : 1;
      if (am !== bm) return am - bm;              // marchers first...
      if (am === 0) return b.x - a.x;             // ...closest to the bar first
      return a.patience - b.patience;             // then least patient first
    });
    if (serv.length) targetLane = serv[0].lane;
  }
  if (g.blackout) targetLane = 3;

  // walk to the right end first (lane changes only work there)
  if (bar.x < 442) {
    unhold('ArrowLeft', 'ArrowUp', 'ArrowDown');
    hold('ArrowRight');
    return;
  }
  unhold('ArrowRight');

  // change lanes (one press per frame)
  if (bar.lane < targetLane) { hold('ArrowDown'); unhold('ArrowUp'); return; }
  if (bar.lane > targetLane) { hold('ArrowUp'); unhold('ArrowDown'); return; }
  unhold('ArrowUp', 'ArrowDown');

  // generator duty
  if (g.blackout && bar.lane === 3 && bar.x >= 440) {
    press('KeyE'); release('KeyE');
  }

  // an empty about to arrive? hold position, don't start a pour
  const inbound = g.mugs.some(m =>
    m.state === 'slide' && m.returning && m.lane === bar.lane &&
    (GEO.BAR_RIGHT - m.cx) / GEO.MUG_EMPTY_SPEED < 1.3);
  if (inbound) return;

  // a full mug already sliding in this lane? wait — it will dock someone;
  // pouring again just sends a second mug past them (and off the end)
  const fullInFlight = g.mugs.some(m =>
    m.state === 'slide' && !m.returning && m.lane === bar.lane);
  if (fullInFlight) return;

  // serve the NEAREST customer in this lane (a sliding mug docks with the
  // first matching order it meets — so serve closest first)
  const servable = g.customers.filter(c =>
    !c.dead && c.lane === bar.lane && (c.state === 'wait' || c.state === 'enter' || c.state === 'march'));
  if (servable.length && !bar.pouring && bar.x >= 432) {
    servable.sort((a, b) => b.x - a.x);
    const cust = servable[0];
    const idx = v.drinks.indexOf(cust.drink);
    if (idx >= 0) {
      if (bar.selected !== idx) {
        const code = 'Digit' + (idx + 1);
        press(code); release(code);
        return; // let the selection land before pouring
      }
      press('Space'); release('Space');
    }
  }
}

function botPhase(label, framesToRun) {
  const startScore = getG().score;
  frames(framesToRun, i => {
    botFrame();
    trackState();
    if (i % 300 === 0) sanity(label + '@' + i);
  });
  const g = getG();
  const earned = g.score - startScore;
  console.log(`${label}: state=${g.state} score=R${g.score} (+R${earned}) lives=${g.lives} ` +
    `loop=${g.loop} level=${g.levelIdx} customers=${g.customers.length} biltong=${g.biltong}`);
  if (g._deaths) console.log('  deaths:', JSON.stringify(g._deaths));
  return g;
}

/* ---------- scenario ---------- */
// 1. title idle
frames(30, trackState);
if (getG().state !== 'title') throw new Error('expected title, got ' + getG().state);

// instrument deaths + march starts (timeline debugging)
vm.runInThisContext(`
  const _ll = G.lifeLost.bind(G);
  G.lifeLost = function (reason) {
    (G._deaths = G._deaths || {})[reason] = (G._deaths[reason] || 0) + 1;
    console.log('  [death @' + G.levelClock.toFixed(1) + 's lane ' + G.bar.lane + '] ' + reason);
    _ll(reason);
  };
  const _march = Customer.prototype.startMarch;
  Customer.prototype.startMarch = function (Gr) {
    console.log('  [march @' + Gr.levelClock.toFixed(1) + 's] ' + this.typeId + ' lane ' + this.lane + ' x=' + this.x.toFixed(0));
    _march.call(this, Gr);
  };
`);
function resetDeaths() { vm.runInThisContext('G._deaths = {};'); }

// 2. BOT plays level 1 from a fresh start — the game must be winnable
press('Enter'); frames(1); release('Enter'); frames(5, trackState);
resetDeaths();
let g = botPhase('BOT level 1 (90s)', 60 * 90);
if (g.state === 'clear') {
  press('Enter'); frames(1); release('Enter'); frames(3, trackState);
  if (g.state !== 'braai') throw new Error('expected braai, got ' + g.state);
  console.log('braai started');
  // flip all the wors
  for (let k = 0; k < 6; k++) { frames(15 + k * 5); press('Space'); frames(2); release('Space'); trackState(); }
  frames(130, trackState);
  sanity('after braai');
  console.log('after braai: state=' + g.state, 'level=' + g.levelIdx, 'score=R' + g.score);
  if (g.state === 'play') console.log('level 2 started OK');
  // let the bot loose on level 2 (has load shedding!)
  resetDeaths();
  g = botPhase('BOT level 2 (120s)', 60 * 120);
  if (g._deaths && Object.keys(g._deaths).length) console.log('  deaths:', JSON.stringify(g._deaths));
}

// 3. force-run the remaining levels to test the victory screen + loop restart
ensurePlay();
{
  let guard = 0;
  while (getG().state !== 'victory' && guard++ < 10) {
    const gg = getG();
    if (gg.state !== 'play') { ensurePlay(); continue; }
    gg.spawnIdx = gg.wave.length;
    gg.customers.length = 0;
    gg.mugs.length = 0;
    frames(2, trackState);                                   // -> clear
    press('Enter'); frames(1); release('Enter'); frames(3, trackState); // -> braai
    if (getG().state !== 'braai') throw new Error('expected braai, got ' + getG().state);
    for (let k = 0; k < 6; k++) { frames(10); press('Space'); frames(2); release('Space'); }
    frames(130, trackState);                                 // doneT -> next
    console.log('  force level ' + getG().levelIdx + ' -> state=' + getG().state);
  }
  const gg = getG();
  if (gg.state !== 'victory') throw new Error('expected victory, got ' + gg.state);
  console.log('VICTORY reached ✓  score=R' + gg.score);
  gg.lives = 3;
  press('Enter'); frames(1); release('Enter'); frames(5, trackState);
  if (gg.state !== 'play' || gg.loop !== 1) throw new Error('loop restart failed: loop=' + gg.loop);
  console.log('loop 2 started: venue=' + gg.venue().name + ' cuts=' + gg.cuts.length + ' (loop extras applied)');
  sanity('loop2');
}

// 4. chaos monkey (crash hunting) on whatever state remains
chaosPhase();

// 4. game over path (deterministic)
ensurePlay();
g = getG();
g.lives = 1;
g.graceT = 0;
const MugCls = getMug();
g.mugs.push(new MugCls(0, 20, -1, 'castle', { fill: 1 }));
frames(120, trackState);
if (g.state !== 'gameover') throw new Error('expected gameover, got ' + g.state);
console.log('game over reached, reason:', g.deathReason);

// 5. back to title, restart
press('Enter'); frames(1); release('Enter'); frames(3, trackState);
if (g.state !== 'title') throw new Error('expected title, got ' + g.state);
press('Enter'); frames(1); release('Enter'); frames(5, trackState);
if (g.state !== 'play') throw new Error('expected play again, got ' + g.state);
console.log('restart OK');

// 6. pause toggle
press('KeyP'); frames(1); release('KeyP'); frames(2);
if (!g.paused) throw new Error('expected paused');
press('KeyP'); frames(1); release('KeyP'); frames(2);
if (g.paused) throw new Error('expected unpaused');
console.log('pause OK');

console.log('\nSTATE FLOW:', stateLog.join(' -> '));
console.log('SMOKE TEST PASS ✓');

/* ============================================================
   TapperBoet — record.js
   Drives the game in headless Chromium with an in-page autopilot
   and records the hype demo: webm video + cues.json for the
   soundtrack dub. Full pipeline:
     node dev/record.js        → demo.webm + cues.json
     node dev/soundtrack.js    → soundtrack.wav (timed to cues)
     ffmpeg -y -i demo.webm -i soundtrack.wav -c:v libx264 \
       -pix_fmt yuv420p -crf 20 -c:a aac -b:a 160k \
       -movflags +faststart -shortest media/demo.mp4
   ============================================================ */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const OUT = '/tmp/opencode/tapperboet-demo';
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- in-page autopilot ---------------- */
const BOT_JS = `
(() => {
  const held = new Set();
  const key = (code, down) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code }));
  const press = c => { key(c, true); key(c, false); };
  const hold = c => { if (!held.has(c)) { key(c, true); held.add(c); } };
  const unhold = c => { if (held.has(c)) { key(c, false); held.delete(c); } };
  const unholdAll = () => { for (const c of [...held]) unhold(c); };

  window.__botTick = () => {
    const g = G;
    if (g.state === 'braai') {
      unholdAll();
      if (g.braai.left > 0 && !g.braai.doneT && Math.abs(g.braai.marker - 0.5) < 0.12) press('Space');
      return;
    }
    if (g.state !== 'play') { unholdAll(); return; }
    const bar = g.bar;
    const v = g.venue();

    // panic buttons
    const marchers = g.customers.filter(c => !c.dead && c.state === 'march');
    if (marchers.length >= 2 && g.vuvuReady) { press('KeyV'); }
    else if (marchers.some(m => m.x > 280) && g.biltong > 0) { press('KeyB'); }

    // priority: returning mugs > marchers (closest to bar) > least patient
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
        if (am !== bm) return am - bm;
        if (am === 0) return b.x - a.x;
        return a.patience - b.patience;
      });
      if (serv.length) targetLane = serv[0].lane;
    }
    if (g.blackout) targetLane = 3;

    if (bar.x < 442) { unhold('ArrowLeft', 'ArrowUp', 'ArrowDown'); hold('ArrowRight'); return; }
    unhold('ArrowRight');
    if (bar.lane < targetLane) { hold('ArrowDown'); unhold('ArrowUp'); return; }
    if (bar.lane > targetLane) { hold('ArrowUp'); unhold('ArrowDown'); return; }
    unhold('ArrowUp', 'ArrowDown');

    if (g.blackout && bar.lane === 3 && bar.x >= 440) { press('KeyE'); }

    const inbound = g.mugs.some(m => m.state === 'slide' && m.returning && m.lane === bar.lane &&
      (GEO.BAR_RIGHT - m.cx) / GEO.MUG_EMPTY_SPEED < 1.3);
    if (inbound) return;
    const fullInFlight = g.mugs.some(m => m.state === 'slide' && !m.returning && m.lane === bar.lane);
    if (fullInFlight) return;

    const servable = g.customers.filter(c => !c.dead && c.lane === bar.lane && (c.state === 'wait' || c.state === 'enter' || c.state === 'march'));
    if (servable.length && !bar.pouring && bar.x >= 432) {
      servable.sort((a, b) => b.x - a.x);
      const idx = v.drinks.indexOf(servable[0].drink);
      if (idx >= 0) {
        if (bar.selected !== idx) { press('Digit' + (idx + 1)); return; }
        press('Space');
      }
    }
  };
  setInterval(() => { try { window.__botTick(); } catch (e) {} }, 60);
})();
`;

/* ---------------- helpers ---------------- */
/* pack the spawn wave tight so the bar looks busy on camera */
async function densify(page, gap) {
  await page.evaluate(g => {
    G.wave = G.wave.slice(0, 12).map((w, i) => ({ ...w, t: 0.4 + i * g }));
    G.spawnIdx = 0;
  }, gap);
}

/* rewrite the first wave entries with a deliberate cast so the new
   characters are guaranteed on camera (stars first) */
async function cast(page, types, gap) {
  await page.evaluate(({ types, gap }) => {
    G.wave = types.map((type, i) => ({
      type, t: 0.4 + i * gap, lane: Math.floor(Math.random() * 4),
    }));
    G.spawnIdx = 0;
  }, { types, gap });
}

/* cut to a venue: full lives, fresh level, busy bar */
async function gotoVenue(page, idx, gap, types) {
  await page.evaluate(i => { G.levelIdx = i; G.lives = 3; G.startLevel(); }, idx);
  if (types) await cast(page, types, gap); else await densify(page, gap);
}

/* end the round now (customers/mugs gone, wave done) */
async function forceClear(page) {
  await page.evaluate(() => {
    if (G.state !== 'play') return;
    G.customers.length = 0; G.mugs.length = 0; G.projectiles.length = 0;
    G.spawnIdx = G.wave.length;
  });
}

/* ---------------- main ---------------- */
(async () => {
  const cues = { menuStart: 0, segments: [], vuvuAt: null, total: 0 };
  const T0 = Date.now();
  const at = () => (Date.now() - T0) / 1000;
  const seg = type => cues.segments.push({ type, start: at() });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1000, height: 780 },
    recordVideo: { size: { width: 1000, height: 780 } },
  });
  const page = await ctx.newPage();
  await page.addInitScript(BOT_JS);
  await page.goto('file://' + path.join(ROOT, 'index.html'));
  await page.waitForFunction('typeof G !== "undefined" && G.state === "title"');

  /* ---- 1. title shot (menu music) ---- */
  seg('menu');
  await sleep(4000);
  await page.keyboard.press('Enter');
  await page.waitForFunction('G.state === "play"', { timeout: 10000 });

  /* ---- 2. venue 1: die shebeen, jozi (game music; the Lions crew + Gogo walk in) ---- */
  seg('game');
  await cast(page, ['lions', 'gogo', 'lions', 'bok', 'gogo', 'lions', 'oupa', 'lions'], 2.8);
  await sleep(18000);
  await forceClear(page);

  /* ---- 3. rondte klaar panel ---- */
  await page.waitForFunction('G.state === "clear"', { timeout: 10000 });
  await sleep(2400);
  await page.keyboard.press('Enter');
  await page.waitForFunction('G.state === "braai"', { timeout: 10000 });

  /* ---- 4. braai bonus #1 (braai music; bot flips at the green zone) ---- */
  seg('braai');
  await page.waitForFunction('G.state === "play"', { timeout: 45000 });

  /* ---- 5. venues 2-4 montage (game music) ---- */
  seg('game');

  /* venue 2: bok stadium, pretoria — Bulls chug, Binnet zooms;
     load shedding → generator → biltong → vuvu */
  await gotoVenue(page, 1, 2.4, ['bulls', 'binnet', 'bulls', 'gogo', 'binnet', 'bulls', 'taxi', 'bok']);
  await sleep(1500);
  await page.evaluate(() => {
    if (!G.blackout) { G.blackout = true; G.cutStage = 2; G.cutEnd = G.levelClock + 10; }
  });
  await sleep(3500); // bot runs down and whacks the generator (KRAG! +R25)
  await page.evaluate(() => { G.blackout = false; });
  // biltong toss: calm a marcher from across the bar
  await page.evaluate(() => {
    const c = G.customers.find(c => c.state === 'wait') || G.customers[0];
    if (c) { c.state = 'march'; c.x = 290; }
    G.biltong = 3;
  });
  await sleep(150);
  await page.keyboard.press('KeyB');
  await sleep(2200);
  // vuvuzela: stun the whole bar
  await page.evaluate(() => {
    const waiters = G.customers.filter(c => c.state === 'wait').slice(0, 2);
    waiters.forEach((c, i) => { c.state = 'march'; c.x = 250 + i * 60; });
    G.vuvuCd = 0;
  });
  await page.keyboard.press('KeyV');
  cues.vuvuAt = at();
  await sleep(6500);

  /* venue 3: durbs beach bar — Aunty (tips like a boss) + Sharks */
  await gotoVenue(page, 2, 1.8, ['aunty', 'sharks', 'aunty', 'sharks', 'tourist', 'aunty', 'gogo', 'binnet']);
  await sleep(8000);

  /* venue 4: klopse kroeg, kaapstad — Stormers sip slow, Klopse dance */
  await gotoVenue(page, 3, 1.5, ['stormers', 'minstrel', 'stormers', 'minstrel', 'aunty', 'stormers', 'binnet', 'gogo']);
  await sleep(9000);

  /* ---- 6. victory: clear → panel → braai #2 → legend screen (menu music) ---- */
  await forceClear(page);
  await page.waitForFunction('G.state === "clear"', { timeout: 10000 });
  await sleep(2200);
  await page.keyboard.press('Enter');
  await page.waitForFunction('G.state === "braai"', { timeout: 10000 });
  seg('braai');
  await page.waitForFunction('G.state === "victory"', { timeout: 45000 });
  seg('menu');
  await sleep(5500);

  cues.total = at();
  fs.writeFileSync(path.join(OUT, 'cues.json'), JSON.stringify(cues, null, 2));
  const vp = await page.video().path();
  await page.close();
  fs.renameSync(vp, path.join(OUT, 'demo.webm'));
  await ctx.close();
  await browser.close();
  console.log('video: ' + path.join(OUT, 'demo.webm'));
  console.log('cues: ' + JSON.stringify(cues));
})().catch(e => { console.error(e); process.exit(1); });

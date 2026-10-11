/* ============================================================
   TapperBoet — main.js
   Game state machine, collision rules, SA mechanics, boot.
   ============================================================ */
"use strict";

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let G = null; // the game singleton (entities/ui reference this)

const HI_KEY = 'tapperboet_hi';
function loadHi() { try { return parseInt(localStorage.getItem(HI_KEY)) || 0; } catch (e) { return 0; } }
function saveHi(v) { try { localStorage.setItem(HI_KEY, String(v)); } catch (e) {} }

class Game {
  constructor() {
    this.state = 'title';
    this.time = 0;
    this.paused = false;
    this.hiScore = loadHi();
    this.score = 0;
    this.lives = 3;
    this.loop = 0;
    this.levelIdx = 0;
    this.deathReason = '';
    this.newHigh = false;

    this.bar = new Bartender();
    this.customers = [];
    this.mugs = [];
    this.projectiles = [];
    this.particles = new Particles();
    this.floats = new FloatText();

    this.wave = [];
    this.spawnIdx = 0;
    this.levelClock = 0;
    this.levelTips = 0;
    this.cuts = [];
    this.cutIdx = 0;
    this.nextCut = null;
    this.blackout = false;
    this.cutStage = 0;
    this.cutEnd = 0;
    this.graceT = 0;
    this.shake = 0;
    this.vuvuCd = 0;
    this.biltong = 3;
    this.nextLife = 500;

    this.braai = null;
    this.bartenderMoving = false;
  }

  venue() { return VENUES[this.levelIdx]; }

  get vuvuReady() { return this.vuvuCd <= 0; }
  get vuvuFill() { return Math.max(0, 1 - this.vuvuCd / 18); }

  /* ---------------- state transitions ---------------- */
  startGame() {
    this.score = 0;
    this.lives = 3;
    this.loop = 0;
    this.levelIdx = 0;
    this.newHigh = false;
    this.startLevel();
  }

  startLevel() {
    const v = this.venue();
    this.wave = buildWave(v, this.loop);
    this.spawnIdx = 0;
    this.levelClock = 0;
    this.levelTips = 0;
    this.cuts = buildCuts(v, this.loop);
    this.cutIdx = 0;
    this.nextCut = this.cuts[0] || null;
    this.blackout = false;
    this.graceT = 0;
    this.customers = [];
    this.mugs = [];
    this.projectiles = [];
    this.biltong = 3;
    this.vuvuCd = 0;
    this.nextLife = Math.max(this.nextLife, 500);
    this.bar = new Bartender();
    this.bar.pourDrink = v.drinks[0];
    this.state = 'play';
    this.paused = false;
    Sfx.playMusic('game');
  }

  gameOver(reason) {
    this.deathReason = reason;
    this.state = 'gameover';
    Sfx.stopMusic();
    Sfx.sfx('gameover');
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      this.newHigh = true;
      saveHi(this.hiScore);
    }
  }

  levelCleared() {
    this.state = 'clear';
    Sfx.sfx('fanfare');
  }

  startBraai() {
    this.braai = { left: 6, marker: 0.5, dir: 1, speed: 1.4, lastResult: null, msg: null, msgT: 0, tossT: 0, earned: 0, doneT: 0, result: null };
    this.state = 'braai';
    Sfx.playMusic('braai');
  }

  /* ---------------- helpers used by entities ---------------- */
  patienceMult() {
    const v = this.venue();
    return v.patienceBonus * Math.max(0.65, 1 - 0.06 * this.loop);
  }
  patienceRate() { return this.blackout ? 1.35 : 1; }

  freeSeat(lane) {
    for (const sx of SEAT_X) {
      const taken = this.customers.some(c => c.lane === lane && !c.dead && c.seatX === sx && c.state !== 'leave');
      if (!taken) return sx;
    }
    return 196;
  }

  spawnMug(lane, drink) {
    this.mugs.push(new Mug(lane, GEO.TAP_X - 12, -1, drink, { fill: 1 }));
    Sfx.sfx('slide');
  }

  onMugFall(mug) {
    this.lifeLost(mug.returning ? 'N LEE MUG HET GEVAL! AI!' : 'N VOL MUG HET GEVAL! EISH!');
  }

  customerReached(c) {
    this.lifeLost('N RUSIGE KLIENT HET JOU GEPAK!');
  }

  lifeLost(reason) {
    if (this.graceT > 0) return;
    this.lives--;
    this.graceT = 1.3;
    this.shake = 6;
    Sfx.sfx('lifeLost');
    Sfx.sfx('eish');
    this.floats.add(GEO.W / 2, GEO.H / 2 - 40, 'EISH!', '#ff5040', 1.2);
    if (this.lives <= 0) {
      this.gameOver(reason);
    } else {
      // mercy: clear sliding mugs so you don't insta-chain deaths
      this.mugs = this.mugs.filter(m => m.state !== 'slide');
    }
  }

  /* ---------------- drink serving ---------------- */
  resolveServe(mug) {
    // find a customer to catch this mug: only matching orders dock.
    // A wrong pint sails past (so you can serve a further customer).
    let best = null, bd = 1e9;
    for (const c of this.customers) {
      if (c.dead || c.lane !== mug.lane) continue;
      if (c.state !== 'enter' && c.state !== 'wait' && c.state !== 'march') continue;
      if (mug.fill >= 1 && c.drink !== mug.drink) continue; // passes by
      const d = Math.abs(c.cx - mug.cx);
      if (d < 10 && d < bd) { bd = d; best = c; }
    }
    if (!best) return;
    this.mugs.splice(this.mugs.indexOf(mug), 1);
    const correct = best.drink === mug.drink && mug.fill >= 1;
    if (correct) {
      best.state = 'drink';
      best.timer = best.def.drinkTime;
      best.served = true;
      Sfx.sfx('gulp');
    } else {
      // safety net (partial fill): hand it straight back
      best.state = 'reject';
      best.timer = 0.7;
      best.rejected = true;
      best.patience = Math.max(0.02, best.patience - 0.35);
      Sfx.sfx('angry');
      this.floats.add(best.cx, GEO.floorY(best.lane) - 30, 'TE MIN!', '#ff5040', 0.9);
    }
  }

  drinkFinished(c) {
    // slide the empty back and pay out
    this.mugs.push(new Mug(c.lane, c.x + 2, 1, c.drink, { returning: true }));
    const patienceTip = Math.round(c.patience * 20);
    const tip = 10 + patienceTip + (c.def.tip || 0) / 2 + c.tipBonus;
    const t = Math.round(tip);
    this.score += t;
    this.levelTips += t;
    Sfx.sfx('tip');
    this.floats.add(c.cx, GEO.floorY(c.lane) - 26, '+R' + t, '#ffcf3f', 1.1);
    c.state = 'leave';
    c.served = false;
  }

  rejectFinished(c) {
    // mug goes straight back, mostly empty
    this.mugs.push(new Mug(c.lane, c.x + 2, 1, c.drink, { returning: true }));
    c.state = 'wait';
    c.rejected = false;
  }

  /* ---------------- SA mechanics ---------------- */
  useVuvuzela() {
    if (this.vuvuCd > 0) return;
    this.vuvuCd = 18;
    Sfx.sfx('vuvuzela');
    this.shake = 3;
    for (const c of this.customers) c.stun(2.5);
    this.floats.add(GEO.W / 2, 80, 'VVVVVVVVV!', '#ffcf3f', 1.2);
  }

  useBiltong() {
    if (this.biltong <= 0) return;
    // target: marching customer closest to the bar, else the angriest waiter
    let target = null, best = -1;
    for (const c of this.customers) {
      if (c.dead || c.state === 'leave' || c.state === 'drink' || c.state === 'reject' || c.state === 'stun') continue;
      const score = c.state === 'march' ? 1000 + c.x : (1 - c.patience) * 500 + c.x;
      if (score > best) { best = score; target = c; }
    }
    if (!target) return;
    this.biltong--;
    this.projectiles.push({
      x: this.bar.cx, y: this.bar.y - 18,
      sx: this.bar.cx, sy: this.bar.y - 18,
      tx: target.cx, ty: GEO.floorY(target.lane) - 12,
      t: 0, dur: 0.5, target,
    });
    Sfx.sfx('biltong');
  }

  whackGenerator() {
    if (!this.blackout) return;
    if (this.bar.lane !== GEO.LANES - 1 || this.bar.x < GEO.POUR_MIN - 6) return;
    this.blackout = false;
    this.score += 25;
    Sfx.sfx('gen');
    Sfx.sfx('powerup');
    this.particles.spawn(452, GEO.floorY(GEO.LANES - 1) - 10, '#ffcf3f', 14, { spread: 120, vy0: -120 });
    this.floats.add(452, GEO.floorY(GEO.LANES - 1) - 24, 'KRAG! +R25', '#3ecf8e', 1.2);
  }

  /* ---------------- update: play ---------------- */
  updatePlay(dt) {
    this.levelClock += dt;
    this.time += dt;
    if (this.graceT > 0) this.graceT -= dt;
    if (this.vuvuCd > 0) this.vuvuCd -= dt;

    /* --- input --- */
    const bar = this.bar;
    this.bartenderMoving = false;
    if (!bar.pouring) {
      let dx = 0;
      if (Input.isDown('ArrowLeft', 'KeyA')) dx -= 1;
      if (Input.isDown('ArrowRight', 'KeyD')) dx += 1;
      if (dx !== 0) {
        bar.x = Math.max(40, Math.min(464, bar.x + dx * 150 * dt));
        bar.facing = dx;
        this.bartenderMoving = true;
      }
      // lane change only near the taps (right end)
      if (bar.x >= 424) {
        if (Input.justPressed('ArrowUp', 'KeyW') && bar.lane > 0) bar.lane--;
        if (Input.justPressed('ArrowDown', 'KeyS') && bar.lane < GEO.LANES - 1) bar.lane++;
      }
      // drink select
      const v = this.venue();
      for (let i = 0; i < v.drinks.length; i++) {
        if (Input.justPressed('Digit' + (i + 1))) { bar.selected = i; Sfx.sfx('click'); }
      }
      // pour
      if (Input.justPressed('Space') && bar.x >= GEO.POUR_MIN && bar.state === 'idle') {
        bar.state = 'pour';
        bar.pourT = 0;
        bar.pourDrink = v.drinks[bar.selected];
        Sfx.sfx('pour');
      }
    }
    // power-ups & generator
    if (Input.justPressed('KeyV')) this.useVuvuzela();
    if (Input.justPressed('KeyB')) this.useBiltong();
    if (Input.justPressed('KeyE')) this.whackGenerator();

    bar.update(dt, this);

    /* --- load shedding --- */
    if (this.nextCut && this.levelClock >= this.nextCut.t && !this.blackout) {
      this.blackout = true;
      this.cutStage = this.nextCut.stage;
      this.cutEnd = this.levelClock + this.nextCut.dur;
      Sfx.sfx('blackout');
      this.floats.add(GEO.W / 2, 90, 'STAGE ' + this.cutStage + ' LOADSHEDDING!', '#ff5040', 1.6);
    }
    if (this.blackout && this.levelClock >= this.cutEnd) {
      this.blackout = false;
      Sfx.sfx('powerup');
    }
    if (this.nextCut && this.levelClock >= this.nextCut.t) {
      this.cutIdx++;
      this.nextCut = this.cuts[this.cutIdx] || null;
    }

    /* --- spawning --- */
    if (this.graceT <= 0) {
      while (this.spawnIdx < this.wave.length && this.levelClock >= this.wave[this.spawnIdx].t) {
        const w = this.wave[this.spawnIdx++];
        // pick the requested lane, or the emptiest if it's overloaded
        let lane = w.lane;
        const count = l => this.customers.filter(c => c.lane === l && !c.dead && c.state !== 'leave').length;
        if (count(lane) >= 4) {
          lane = 0;
          for (let l = 1; l < 4; l++) if (count(l) < count(lane)) lane = l;
        }
        const v = this.venue();
        const drink = v.drinks[Math.floor(Math.random() * v.drinks.length)];
        this.customers.push(new Customer(lane, w.type, drink, this));
      }
    }

    /* --- mugs --- */
    for (const m of this.mugs) {
      // returning empties: catch BEFORE the wall can swallow them
      if (m.state === 'slide' && m.returning && m.lane === bar.lane && Math.abs(m.cx - bar.cx) < 13) {
        this.mugs.splice(this.mugs.indexOf(m), 1);
        this.score += 5;
        this.levelTips += 5;
        Sfx.sfx('clink');
        this.floats.add(bar.cx, bar.y - 24, '+R5', '#c9cdd6', 0.7);
        continue;
      }
      m.update(dt, this);
    }
    for (const m of [...this.mugs]) {
      if (m.dead || (m.state === 'fall' && m.y > 60)) { this.mugs.splice(this.mugs.indexOf(m), 1); continue; }
      if (m.state === 'slide' && !m.returning) this.resolveServe(m);
    }

    /* --- extra life every R500 --- */
    while (this.score >= this.nextLife) {
      this.nextLife += 500;
      if (this.lives < 4) {
        this.lives++;
        Sfx.sfx('fanfare');
        this.floats.add(GEO.W / 2, GEO.H / 2 - 60, 'EKSTRA LEWE!', '#3ecf8e', 1.4);
      }
    }

    /* --- customers --- */
    for (const c of this.customers) c.update(dt, this);
    this.customers = this.customers.filter(c => !c.dead);

    /* --- projectiles (biltong) --- */
    for (const p of this.projectiles) {
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      p.x = p.sx + (p.tx - p.sx) * k;
      p.y = p.sy + (p.ty - p.sy) * k - Math.sin(k * Math.PI) * 46;
      if (k >= 1 && p.target) {
        p.target.calm();
        this.particles.spawn(p.tx, p.ty, '#8c1f1a', 8, { spread: 60, vy0: -60 });
        this.floats.add(p.tx, p.ty - 10, 'VOERTSEK... EK BEDOEL LEKKER!', '#3ecf8e', 1.2);
        p.target = null;
      }
    }
    this.projectiles = this.projectiles.filter(p => p.t < p.dur + 0.05);

    this.particles.update(dt);
    this.floats.update(dt);

    /* --- win check --- */
    if (this.spawnIdx >= this.wave.length && this.customers.length === 0 &&
        this.mugs.length === 0 && this.projectiles.length === 0) {
      this.levelCleared();
    }
  }

  /* ---------------- update: braai ---------------- */
  updateBraai(dt) {
    this.time += dt;
    const B = this.braai;
    if (B.doneT > 0) {
      B.doneT -= dt;
      if (B.doneT <= 0) {
        this.score += B.earned;
        if (this.levelIdx >= VENUES.length - 1) {
          this.state = 'victory';
          Sfx.sfx('fanfare');
        } else {
          this.levelIdx++;
          this.startLevel();
        }
      }
      return;
    }
    B.marker += B.dir * B.speed * dt;
    if (B.marker > 1) { B.marker = 1; B.dir = -1; }
    if (B.marker < 0) { B.marker = 0; B.dir = 1; }
    if (B.msgT > 0) B.msgT -= dt;
    if (B.tossT > 0) B.tossT -= dt;

    if (Input.justPressed('Space')) {
      const d = Math.abs(B.marker - 0.5);
      B.tossT = 0.25;
      B.left--;
      if (d < 0.045) {
        B.earned += 50; B.lastResult = 'perfect'; B.result = 'perfect';
        B.msg = { text: 'PERFEK! +R50', color: '#ffcf3f' };
        Sfx.sfx('perfect');
        this.particles.spawn(240, 230, '#ffcf3f', 16, { spread: 140, vy0: -100 });
      } else if (d < 0.12) {
        B.earned += 25; B.lastResult = 'good'; B.result = 'good';
        B.msg = { text: 'LEKKER! +R25', color: '#3ecf8e' };
        Sfx.sfx('sizzle'); Sfx.sfx('tip');
      } else {
        B.lastResult = B.marker < 0.5 ? 'raw' : 'burnt';
        B.result = 'fail';
        B.msg = { text: B.marker < 0.5 ? 'ROOI BINNE! MOER!' : 'VERBRAND! EISH!', color: '#ff5040' };
        Sfx.sfx('fail');
        this.particles.spawn(240, 230, '#4a4f5c', 10, { spread: 100, vy0: -80 });
      }
      B.msgT = 1.0;
      B.speed = Math.min(3.2, B.speed + 0.18);
      if (B.left <= 0) B.doneT = 1.4;
    }
    this.particles.update(dt);
  }

  /* ---------------- master update ---------------- */
  update(dt) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 14);
    if (Input.justPressed('KeyM')) {
      const m = Sfx.toggleMute();
      this.floats.add(GEO.W / 2, 60, m ? 'STIL' : 'MOOI!', '#c9cdd6', 0.8);
    }
    switch (this.state) {
      case 'title':
        this.time += dt;
        Sfx.playMusic('menu');
        if (Input.justPressed('Enter', 'Space')) { Sfx.sfx('click'); this.startGame(); }
        break;
      case 'play':
        if (Input.justPressed('KeyP', 'Escape')) this.paused = !this.paused;
        if (!this.paused) this.updatePlay(dt);
        break;
      case 'clear':
        this.time += dt;
        if (Input.justPressed('Enter', 'Space')) this.startBraai();
        break;
      case 'braai':
        if (Input.justPressed('KeyP', 'Escape')) this.paused = !this.paused;
        if (!this.paused) this.updateBraai(dt);
        break;
      case 'victory':
        this.time += dt;
        Sfx.playMusic('menu');
        if (Input.justPressed('Enter', 'Space')) {
          this.loop++;
          this.levelIdx = 0;
          this.lives = Math.min(4, this.lives + 1);
          this.startLevel();
        }
        break;
      case 'gameover':
        this.time += dt;
        if (Input.justPressed('Enter', 'Space')) { Sfx.sfx('click'); this.state = 'title'; }
        break;
    }
  }

  /* ---------------- render ---------------- */
  drawPlayScene() {
    drawVenueBG(ctx, this.venue(), this.time);
    for (const m of this.mugs) m.draw(ctx);
    for (const c of this.customers) c.draw(ctx, this);
    // biltong projectiles
    for (const p of this.projectiles) {
      drawSprite(ctx, ICON_BILTONG, p.x - 5, p.y - 3);
    }
    // pour visual: filling mug under the tap + stream
    const bar = this.bar;
    if (bar.pouring) {
      const cY = GEO.counterY(bar.lane);
      const need = bar.pourTime * (this.blackout ? 1.8 : 1);
      const fill = Math.min(1, bar.pourT / need);
      drawSprite(ctx, MUG_GLASS, 438, cY - 9);
      if (fill > 0) {
        ctx.fillStyle = DRINKS.find(d => d.id === bar.pourDrink).color;
        ctx.fillRect(441, cY - 3 - Math.round(5 * fill), 5, Math.round(5 * fill) + 1);
      }
      if (fill >= 1) {
        ctx.fillStyle = '#fdf6e3';
        ctx.fillRect(441, cY - 8, 5, 2);
      }
      const sput = Math.sin(this.time * 30) > 0 ? 1 : 2;
      ctx.fillStyle = '#f7a11d';
      ctx.fillRect(451, cY - 7, sput, 5);
      if (this.blackout) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(451, cY - 7, sput, 5);
      }
    }
    bar.draw(ctx);
    this.particles.draw(ctx);
    this.floats.draw(ctx);
  }

  draw() {
    ctx.save();
    ctx.fillStyle = '#17141f';
    ctx.fillRect(0, 0, GEO.W, GEO.H);
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    switch (this.state) {
      case 'title':
        drawTitle(ctx, this);
        break;
      case 'play':
        this.drawPlayScene();
        if (this.blackout) drawBlackoutOverlay(ctx, this);
        drawHUD(ctx, this);
        if (this.paused) drawPause(ctx);
        break;
      case 'clear':
        this.drawPlayScene();
        drawHUD(ctx, this);
        drawRoundClear(ctx, this);
        break;
      case 'braai':
        drawBraai(ctx, this.braai, this);
        drawHUD(ctx, this);
        if (this.paused) drawPause(ctx);
        break;
      case 'victory':
        this.drawPlayScene();
        drawHUD(ctx, this);
        drawVictory(ctx, this);
        break;
      case 'gameover':
        this.drawPlayScene();
        drawGameOver(ctx, this);
        break;
    }
    ctx.restore();
  }
}

/* ------------------------- boot ------------------------- */
function fitCanvas() {
  const pad = 60;
  const s = Math.max(1, Math.floor(Math.min(
    (window.innerWidth - 20) / GEO.W,
    (window.innerHeight - pad) / GEO.H
  )));
  canvas.style.width = (GEO.W * s) + 'px';
  canvas.style.height = (GEO.H * s) + 'px';
}
window.addEventListener('resize', fitCanvas);

G = new Game();
fitCanvas();

let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.05) dt = 0.05; // clamp big hitches
  G.update(dt);
  G.draw();
  Input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

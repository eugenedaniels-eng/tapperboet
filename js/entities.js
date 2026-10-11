/* ============================================================
   TapperBoet — entities.js
   Shared geometry constants + Mug, Customer, Bartender,
   particles and floating text.
   ============================================================ */
"use strict";

/* ------------------------- Geometry ------------------------- */
const GEO = {
  W: 480, H: 360,
  HUD_H: 28,
  LANES: 4,
  LANE_H: 83,
  BAR_LEFT: 8,          // left wall — mugs fall off here
  BAR_RIGHT: 472,       // right wall
  TAP_X: 446,           // tap cluster left edge
  POUR_MIN: 432,        // bartender must be here to pour
  MARCH_REACH: 434,     // customer reaching this = life lost
  MUG_FULL_SPEED: 110,  // px/s sliding toward customers
  MUG_EMPTY_SPEED: 135, // px/s empties returning
  MUG_W: 12, MUG_H: 9,
  laneTop: i => GEO.HUD_H + i * GEO.LANE_H,
  counterY: i => GEO.HUD_H + i * GEO.LANE_H + 38,
  floorY: i => GEO.HUD_H + i * GEO.LANE_H + 79,
};

/* ------------------------- Mug ------------------------- */
class Mug {
  constructor(lane, x, dir, drink, opts) {
    this.lane = lane;
    this.x = x;                 // left edge
    this.dir = dir;             // -1 toward customers, +1 returning
    this.drink = drink;         // drink id (colour of liquid)
    this.fill = opts && opts.fill !== undefined ? opts.fill : 1; // 0..1
    this.returning = !!(opts && opts.returning);
    this.dead = false;
    this.state = 'slide';       // slide | fall
    this.vy = 0;
    this.rot = 0;
    this.wobble = 0;
  }
  get speed() { return this.returning ? GEO.MUG_EMPTY_SPEED : GEO.MUG_FULL_SPEED; }
  get cx() { return this.x + GEO.MUG_W / 2; }
  update(dt, G) {
    if (this.state === 'slide') {
      this.x += this.dir * this.speed * dt;
      this.wobble += dt * 14;
      // full mugs shatter off the customers' (left) end; returning mugs may
      // spawn past the wall and must only worry about the right end
      const offLeft = !this.returning && this.x < GEO.BAR_LEFT - 4;
      const offRight = this.x > GEO.BAR_RIGHT - 4;
      if (offLeft || offRight) {
        this.state = 'fall';
        this.y = 0;
        this.baseY = GEO.counterY(this.lane) - GEO.MUG_H;
        this.vy = -40;
        Sfx.sfx('shatter');
        G.onMugFall(this);
      }
    } else if (this.state === 'fall') {
      this.vy += 380 * dt;
      this.y += this.vy * dt;
      this.rot += dt * 9;
    }
  }
  draw(g) {
    const y = this.state === 'fall'
      ? (this.baseY || (this.baseY = GEO.counterY(this.lane) - GEO.MUG_H)) + this.y
      : GEO.counterY(this.lane) - GEO.MUG_H;
    const img = this.returning || this.fill <= 0 ? MUG_EMPTY : MUG_FULL;
    if (this.state === 'fall') {
      g.save();
      g.translate(Math.round(this.x + GEO.MUG_W / 2), Math.round(y + GEO.MUG_H / 2));
      g.rotate(this.rot);
      drawSprite(g, img, -GEO.MUG_W / 2, -GEO.MUG_H / 2);
      g.restore();
    } else {
      drawSprite(g, img, this.x, y);
      // partial fill overlay (only while pouring-sent, not returning)
      if (!this.returning && this.fill > 0 && this.fill < 1) {
        const fh = Math.round(6 * this.fill);
        g.fillStyle = DRINKS.find(d => d.id === this.drink).color;
        g.fillRect(Math.round(this.x) + 3, y + 7 - fh, 5, fh);
      }
    }
  }
}

/* ------------------------- Customer ------------------------- */
/* resolve sprite refs (top-level consts aren't window properties) */
const CUST_SPRITES = {
  bok: [CUST_BOK, CUST_BOK_WALK],
  taxi: [CUST_TAXI, CUST_TAXI_WALK],
  tourist: [CUST_TOURIST, CUST_TOURIST_WALK],
  minstrel: [CUST_MINSTREL, CUST_MINSTREL_WALK],
  oupa: [CUST_OUPA, CUST_OUPA_WALK],
};

class Customer {
  constructor(lane, typeId, drinkId, G) {
    const def = CUSTOMER_TYPES[typeId];
    this.lane = lane;
    this.typeId = typeId;
    this.def = def;
    this.drink = drinkId;
    this.x = -16;
    this.seatX = G.freeSeat(lane);           // next open seat from the left
    this.state = 'enter';                    // enter|wait|drink|reject|march|leave|stun
    this.patienceMax = def.patience * G.patienceMult();
    this.patience = 1.0;
    this.timer = 0;
    this.walkT = 0;
    this.frame = 0;
    this.tipBonus = 0;
    this.stunT = 0;
    this.prevState = 'wait';
    this.dead = false;
    this.served = false;
    this.rejected = false;
    this.bobT = 0;
  }
  get cx() { return this.x + 6; }
  update(dt, G) {
    this.walkT += dt;
    this.bobT += dt;
    if (this.walkT > 0.16) { this.walkT = 0; this.frame ^= 1; }
    switch (this.state) {
      case 'enter':
        this.x += this.def.speed * dt;
        if (this.x >= this.seatX) { this.x = this.seatX; this.state = 'wait'; }
        this.patience -= (dt / this.patienceMax) * 0.5;
        if (this.patience <= 0) this.startMarch(G);
        break;
      case 'wait':
        this.patience -= (dt / this.patienceMax) * G.patienceRate();
        if (this.patience <= 0) this.startMarch(G);
        break;
      case 'march':
        this.x += this.def.speed * 2.6 * dt;
        if (this.x >= GEO.MARCH_REACH) { this.dead = true; G.customerReached(this); }
        break;
      case 'drink':
        this.timer -= dt;
        if (this.timer <= 0) G.drinkFinished(this);
        break;
      case 'reject':
        this.timer -= dt;
        if (this.timer <= 0) G.rejectFinished(this);
        break;
      case 'leave':
        this.x -= 34 * dt;
        if (this.x < -18) this.dead = true;
        break;
      case 'stun':
        this.stunT -= dt;
        if (this.stunT <= 0) this.state = this.prevState;
        break;
    }
  }
  startMarch(G) {
    if (this.state === 'march' || this.state === 'stun') return;
    // step forward toward the bar end, keep queue gap
    this.state = 'march';
    Sfx.sfx('angry');
  }
  stun(t) {
    if (this.state === 'stun' || this.dead) return;
    this.prevState = this.state; // resume exactly where they were (incl. 'enter')
    this.state = 'stun';
    this.stunT = t;
  }
  calm() {
    if (this.state === 'march') {
      this.state = 'enter';
      this.patience = 0.75;
      this.tipBonus += 10;
    }
  }
  draw(g, G) {
    const feetY = GEO.floorY(this.lane);
    const walking = (this.state === 'enter' || this.state === 'leave' || this.state === 'march');
    const img = CUST_SPRITES[this.typeId][walking ? this.frame : 0];
    const bob = (this.state === 'drink') ? Math.round(Math.sin(this.bobT * 10) * 1) : 0;
    const x = Math.round(this.x);
    const flip = (this.state === 'leave');
    drawSprite(g, img, x, feetY - img.height + bob, flip);
    // anger / marching markers
    if (this.state === 'march') {
      drawText(g, '!', x + 4, feetY - img.height - 9, 1, '#ff5040');
    } else if (this.state === 'wait' && this.patience < 0.35) {
      const puff = Math.sin(this.bobT * 8) > 0 ? 0 : 1;
      g.fillStyle = '#e23b34';
      g.fillRect(x + 2, feetY - img.height - 7 + puff, 2, 2);
      g.fillRect(x + 7, feetY - img.height - 7 - puff, 2, 2);
    }
    // stun stars
    if (this.state === 'stun') {
      const t = performance.now() / 120;
      for (let i = 0; i < 3; i++) {
        const a = t + i * 2.1;
        g.fillStyle = '#ffcf3f';
        g.fillRect(Math.round(x + 4 + Math.cos(a) * 6), Math.round(feetY - img.height - 6 + Math.sin(a) * 2), 2, 2);
      }
    }
    // order bubble
    if (this.state === 'wait' || this.state === 'stun' && this.prevState === 'wait') {
      const bx = x + 2, by = feetY - img.height - 20;
      g.fillStyle = '#ffffff';
      g.fillRect(bx - 2, by - 2, 13, 16);
      g.fillStyle = '#17141f';
      g.fillRect(bx - 2, by + 14, 13, 1);
      g.fillRect(bx - 1, by + 15, 11, 1);
      g.fillRect(bx + 4, by + 14, 3, 3);
      const icon = DRINK_ICONS[this.drink];
      if (icon) g.drawImage(icon, bx, by);
    }
    // tip bonus sparkle
    if (this.tipBonus > 0 && this.state !== 'leave') {
      drawText(g, '+', x + 3, feetY - img.height - 15, 1, '#ffcf3f');
    }
  }
}

/* ------------------------- Bartender ------------------------- */
class Bartender {
  constructor() {
    this.lane = 0;
    this.x = 448;
    this.y = GEO.counterY(0);
    this.state = 'idle';       // idle | pour
    this.pourT = 0;
    this.pourTime = 0.6;
    this.pourDrink = 'castle';
    this.selected = 0;         // index into current venue drink list
    this.frame = 0;
    this.walkT = 0;
    this.facing = -1;
  }
  get cx() { return this.x + 6; }
  get pouring() { return this.state === 'pour'; }
  update(dt, G) {
    if (this.state === 'pour') {
      this.pourT += dt;
      const need = this.pourTime * (G.blackout ? 1.8 : 1);
      if (this.pourT >= need) {
        G.spawnMug(this.lane, this.pourDrink);
        this.state = 'idle';
      }
    }
    const moving = G.bartenderMoving;
    if (moving) {
      this.walkT += dt;
      if (this.walkT > 0.12) { this.walkT = 0; this.frame ^= 1; }
    } else this.frame = 0;
    // smooth y toward lane
    const targetY = GEO.counterY(this.lane);
    const dy = targetY - this.y;
    if (Math.abs(dy) > 1) this.y += Math.sign(dy) * Math.min(Math.abs(dy), 340 * dt);
    else this.y = targetY;
  }
  draw(g) {
    const img = (this.state === 'idle' && G && G.bartenderMoving) ? (this.frame ? BARTENDER_WALK : BARTENDER) : BARTENDER;
    drawSprite(g, img, this.x, Math.round(this.y) - img.height);
    // selected drink marker above head
    const venue = G.venue();
    const icon = DRINK_ICONS[venue.drinks[this.selected]];
    if (icon && this.state === 'idle') g.drawImage(icon, Math.round(this.x) + 1, Math.round(this.y) - img.height - 12);
  }
}

/* ------------------------- Particles & floats ------------------------- */
class Particles {
  constructor() { this.list = []; }
  spawn(x, y, color, n, opts) {
    opts = opts || {};
    for (let i = 0; i < n; i++) {
      this.list.push({
        x, y,
        vx: (opts.vx0 || -40) + Math.random() * (opts.spread || 80),
        vy: (opts.vy0 || -80) + Math.random() * (opts.vspread || 60),
        life: (opts.life || 0.6) * (0.6 + Math.random() * 0.7),
        color, size: opts.size || 2, grav: opts.grav !== undefined ? opts.grav : 300,
      });
    }
  }
  update(dt) {
    this.list = this.list.filter(p => {
      p.life -= dt;
      p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      return p.life > 0;
    });
  }
  draw(g) {
    for (const p of this.list) {
      g.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    g.globalAlpha = 1;
  }
}

class FloatText {
  constructor() { this.list = []; }
  add(x, y, text, color, life) {
    this.list.push({ x, y, text, color: color || '#ffffff', life: life || 1.1, t: 0 });
  }
  update(dt) {
    this.list = this.list.filter(f => { f.t += dt; f.y -= 18 * dt; return f.t < f.life; });
  }
  draw(g) {
    for (const f of this.list) {
      g.globalAlpha = f.life - f.t < 0.3 ? (f.life - f.t) / 0.3 : 1;
      drawTextShadow(g, f.text, f.x, f.y, 1, f.color, 'center');
    }
    g.globalAlpha = 1;
  }
}

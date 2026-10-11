/* ============================================================
   TapperBoet — ui.js
   Venue rendering, HUD, title / game over / interstitial screens,
   braai bonus visuals.
   ============================================================ */
"use strict";

/* ------------------------- helpers ------------------------- */
function panel(g, x, y, w, h, border) {
  g.fillStyle = '#17141f';
  g.fillRect(x, y, w, h);
  g.fillStyle = border || '#ffcf3f';
  g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1);
  g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h);
}

/* simplified SA flag, drawn with rects + one diagonal path */
function drawFlag(g, x, y, w, h) {
  const red = '#de3831', blue = '#002395', green = '#007749', black = '#17141f', gold = '#ffb612', white = '#ffffff';
  g.fillStyle = red;    g.fillRect(x, y, w, Math.floor(h / 2));
  g.fillStyle = blue;   g.fillRect(x, y + Math.floor(h / 2), w, Math.ceil(h / 2));
  // white Y arms
  g.fillStyle = white;
  g.beginPath();
  g.moveTo(x, y); g.lineTo(x + w * 0.45, y + h / 2); g.lineTo(x, y + h);
  g.lineTo(x + w * 0.62, y + h); g.lineTo(x + w * 0.62, y + h * 0.62); g.lineTo(x + w, y + h * 0.62);
  g.lineTo(x + w, y + h * 0.38); g.lineTo(x + w * 0.62, y + h * 0.38); g.lineTo(x + w * 0.62, y);
  g.closePath(); g.fill();
  // green Y
  g.fillStyle = green;
  g.beginPath();
  g.moveTo(x, y + h * 0.14); g.lineTo(x + w * 0.42, y + h / 2); g.lineTo(x, y + h * 0.86);
  g.lineTo(x + w * 0.50, y + h * 0.86); g.lineTo(x + w * 0.50, y + h * 0.55); g.lineTo(x + w * 0.92, y + h * 0.55);
  g.lineTo(x + w * 0.92, y + h * 0.45); g.lineTo(x + w * 0.50, y + h * 0.45); g.lineTo(x + w * 0.50, y + h * 0.14);
  g.closePath(); g.fill();
  // gold band + black triangle
  g.fillStyle = gold;
  g.beginPath();
  g.moveTo(x, y + h * 0.22); g.lineTo(x + w * 0.30, y + h / 2); g.lineTo(x, y + h * 0.78);
  g.closePath(); g.fill();
  g.fillStyle = black;
  g.beginPath();
  g.moveTo(x, y + h * 0.30); g.lineTo(x + w * 0.22, y + h / 2); g.lineTo(x, y + h * 0.70);
  g.closePath(); g.fill();
}

/* ------------------------- venue background ------------------------- */
function drawVenueBG(g, venue, time) {
  for (let i = 0; i < GEO.LANES; i++) {
    const top = GEO.laneTop(i);
    const cY = GEO.counterY(i);
    // back wall
    g.fillStyle = venue.wall;
    g.fillRect(0, top, GEO.W, cY - top);
    // wall pattern per venue
    if (venue.id === 'shebeen') {
      g.fillStyle = venue.wallDark;
      for (let by = top + 4; by < cY - 4; by += 8)
        for (let bx = ((by / 8) % 2) * 12; bx < GEO.W; bx += 24)
          g.fillRect(bx, by, 20, 1);
      // posters
      g.fillStyle = '#e23b34'; g.fillRect(60 + (i * 90) % 240, top + 8, 18, 12);
      g.fillStyle = '#ffcf3f'; g.fillRect(64 + (i * 90) % 240, top + 10, 10, 8);
      g.fillStyle = '#007a4d'; g.fillRect(300 - (i * 60) % 180, top + 8, 16, 12);
    } else if (venue.id === 'stadium') {
      g.fillStyle = venue.wallDark;
      g.fillRect(0, top + 12, GEO.W, 2);
      g.fillRect(0, top + 24, GEO.W, 2);
      for (let fx = 8; fx < GEO.W; fx += 32) { // little flags
        g.fillStyle = (fx / 32) % 2 ? '#ffcf3f' : '#007a4d';
        g.fillRect(fx, top + 5, 6, 4);
        g.fillStyle = '#c9cdd6'; g.fillRect(fx + 2, top + 9, 1, 4);
      }
    } else if (venue.id === 'beach') {
      g.fillStyle = venue.wallDark;
      for (let wy = top + 6; wy < cY - 6; wy += 10) {
        for (let wx = 0; wx < GEO.W; wx += 16)
          g.fillRect(wx + ((wy / 10) % 2) * 8 + 2, wy + Math.sin(wx + time * 2 + wy) * 1, 8, 2);
      }
      g.fillStyle = '#ffcf3f';
      g.beginPath(); g.arc(400, top + 14, 6, 0, Math.PI * 2); g.fill();
    } else { // klopse: bright bo-kaap stripes
      const cols = ['#ff7bac', '#ffcf3f', '#6ec6ef', '#007a4d'];
      for (let wx = 0; wx < GEO.W; wx += 40) {
        g.fillStyle = cols[(wx / 40 + i) % cols.length];
        g.fillRect(wx, top, 34, cY - top);
        g.fillStyle = venue.wallDark;
        g.fillRect(wx + 34, top, 6, cY - top);
      }
      g.fillStyle = 'rgba(23,20,31,0.25)';
      g.fillRect(0, top, GEO.W, 6);
    }
    // floor
    g.fillStyle = venue.floor;
    g.fillRect(0, cY + 13, GEO.W, GEO.laneTop(i) + GEO.LANE_H - (cY + 13));
    // counter top
    g.fillStyle = venue.counter;
    g.fillRect(0, cY, GEO.W, 3);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(0, cY, GEO.W, 1);
    // counter front
    g.fillStyle = venue.counterFront;
    g.fillRect(0, cY + 3, GEO.W, 10);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let wx = 10; wx < GEO.W; wx += 48) g.fillRect(wx, cY + 5, 1, 6);
    // left & right walls
    g.fillStyle = '#17141f';
    g.fillRect(0, top, GEO.BAR_LEFT, cY + 13 - top);
    g.fillRect(GEO.BAR_RIGHT, top, GEO.W - GEO.BAR_RIGHT, cY + 13 - top);
    // tap
    drawSprite(g, TAP_SPRITE, GEO.TAP_X + 2, cY - 9);
    // generator (bottom lane, right side)
    if (i === GEO.LANES - 1) {
      const gx = 444, gy = GEO.floorY(i) - 13;
      drawSprite(g, GENERATOR, gx, gy);
      if (G && G.blackout) {
        const blink = Math.sin(time * 12) > 0;
        if (blink) {
          g.fillStyle = '#ffcf3f';
          drawText(g, 'E!', gx + 3, gy - 8, 1, '#ffcf3f');
        }
      }
    }
  }
  // venue sign on lane 0 wall
  const signY = GEO.laneTop(0) + 6;
  panel(g, 150, signY, 180, 13, venue.accent);
  drawText(g, venue.name, 240, signY + 4, 1, venue.accent, 'center');
}

/* ------------------------- HUD ------------------------- */
function drawHUD(g, G) {
  g.fillStyle = '#17141f';
  g.fillRect(0, 0, GEO.W, GEO.HUD_H);
  g.fillStyle = '#2a2317';
  g.fillRect(0, GEO.HUD_H - 2, GEO.W, 2);
  const venue = G.venue();
  // score / hi
  drawText(g, 'R' + String(G.score).padStart(6, '0'), 6, 4, 1, '#ffcf3f');
  drawText(g, 'HI R' + String(G.hiScore).padStart(6, '0'), 6, 13, 1, '#7a8090');
  // venue + round
  drawText(g, venue.name + ' ' + (G.loop + 1) + '-' + (G.levelIdx + 1), GEO.W / 2, 4, 1, venue.accent, 'center');
  // load shedding status (center-right)
  const lsX = GEO.W - 110;
  if (G.blackout) {
    if (Math.sin(G.time * 10) > 0) drawText(g, 'KRAG UIT!', lsX, 4, 1, '#ff5040');
    drawText(g, 'STAGE ' + G.cutStage, lsX, 13, 1, '#ff5040');
  } else if (G.nextCut) {
    drawText(g, 'LOADSHED', lsX, 4, 1, '#c9cdd6');
    drawText(g, 'IN ' + Math.max(0, Math.ceil(G.nextCut.t - G.levelClock)) + 'S', lsX, 13, 1, '#c9cdd6');
  } else {
    drawText(g, 'KRAG: OK', lsX, 4, 1, '#3ecf8e');
  }
  // lives (mugs) top-right
  for (let i = 0; i < G.lives; i++) drawSprite(g, MUG_FULL, GEO.W - 14 - i * 15, 8);
  // bottom row: drink selector + power-ups
  const venueDrinks = venue.drinks;
  for (let i = 0; i < venueDrinks.length; i++) {
    const dx = 8 + i * 15, dy = 14;
    if (i === G.bar.selected) {
      g.fillStyle = (Math.sin(G.time * 8) > 0) ? '#ffcf3f' : '#ffffff';
      g.fillRect(dx - 2, dy - 2, 13, 16);
    }
    g.drawImage(DRINK_ICONS[venueDrinks[i]], dx, dy);
  }
  // vuvuzela + cooldown
  const vx = 8 + 4 * 15 + 6;
  g.globalAlpha = G.vuvuReady ? 1 : 0.35;
  drawSprite(g, ICON_VUVU, vx, 16);
  g.globalAlpha = 1;
  g.fillStyle = '#4a4f5c'; g.fillRect(vx, 24, 14, 2);
  g.fillStyle = '#ffcf3f'; g.fillRect(vx, 24, Math.round(14 * G.vuvuFill), 2);
  // biltong count
  const bx = vx + 22;
  g.globalAlpha = G.biltong > 0 ? 1 : 0.35;
  drawSprite(g, ICON_BILTONG, bx, 16);
  g.globalAlpha = 1;
  drawText(g, 'X' + G.biltong, bx + 12, 16, 1, G.biltong > 0 ? '#ffffff' : '#7a8090');
}

/* ------------------------- screens ------------------------- */
function drawTitle(g, G) {
  // night backdrop
  g.fillStyle = '#120f1d';
  g.fillRect(0, 0, GEO.W, GEO.H);
  // skyline dots
  g.fillStyle = '#1c1730';
  for (let x = 0; x < GEO.W; x += 34) g.fillRect(x, 40 + (x * 7) % 50, 26, GEO.H);
  // stars
  g.fillStyle = '#c9cdd6';
  for (let i = 0; i < 24; i++) {
    const sx = (i * 97) % GEO.W, sy = (i * 53) % 60;
    if (Math.sin(G.time * 3 + i) > -0.6) g.fillRect(sx, sy, 1, 1);
  }
  drawFlag(g, GEO.W / 2 - 16, 18, 32, 21);
  // logo
  const bob = Math.sin(G.time * 2) * 2;
  drawText(g, 'TAPPERBOET', GEO.W / 2 + 3, 53 + bob + 3, 5, '#17141f', 'center');
  drawText(g, 'TAPPERBOET', GEO.W / 2, 53 + bob, 5, '#ffcf3f', 'center');
  drawText(g, 'TAPPERBOET', GEO.W / 2 - 1, 52 + bob, 5, '#007a4d', 'center');
  drawText(g, 'GOOI DOPPE, BOET!', GEO.W / 2, 95, 2, '#de3831', 'center');

  // mini bar scene
  const barY = 240;
  g.fillStyle = '#a9713a'; g.fillRect(60, barY, 360, 4);
  g.fillStyle = '#6b3f1d'; g.fillRect(60, barY + 4, 360, 14);
  drawSprite(g, TAP_SPRITE, 380, barY - 9);
  // pouring animation
  const phase = (G.time % 4);
  if (phase < 1.4) {
    g.fillStyle = '#f7a11d';
    g.fillRect(384, barY, 2, 10 + Math.sin(G.time * 20) * 2);
    drawSprite(g, MUG_FULL, 380, barY - 9);
  } else {
    const mx = 380 - ((G.time % 4) - 1.4) * 260;
    if (mx > 60) drawSprite(g, MUG_FULL, mx, barY - 9);
  }
  drawSprite(g, BARTENDER, 392, barY - 22);
  drawSprite(g, CUST_BOK, 110, barY + 18);
  drawSprite(g, CUST_BINNET, 145, barY + 18);
  drawSprite(g, CUST_OUPA, 180, barY + 18);
  drawSprite(g, CUST_AUNTY, 250, barY + 18);
  drawSprite(g, CUST_GOGO, 315, barY + 18);

  if (Math.sin(G.time * 4) > -0.3)
    drawText(g, 'DRUK ENTER OM TE BEGIN', GEO.W / 2, 300, 2, '#ffffff', 'center');
  drawText(g, 'PYLE: BEWEEG   SPASIE: GOOI   1-4: DRANKIE', GEO.W / 2, 322, 1, '#c9cdd6', 'center');
  drawText(g, 'V: VUVUZELA   B: BILTONG   E: KRAGSAK   P: PAUSE   M: STIL', GEO.W / 2, 332, 1, '#7a8090', 'center');
  drawText(g, 'BESTE: R' + G.hiScore, GEO.W / 2, 344, 1, '#ffcf3f', 'center');
}

function drawRoundClear(g, G) {
  panel(g, 110, 120, 260, 110, '#ffcf3f');
  drawText(g, 'RONDTE KLAAR!', 240, 132, 2, '#ffcf3f', 'center');
  drawText(g, G.venue().name, 240, 152, 1, '#c9cdd6', 'center');
  drawText(g, 'LEKKA TIPS HIERDIE RONDTE: R' + G.levelTips, 240, 168, 1, '#ffffff', 'center');
  drawText(g, 'TOTAAL: R' + G.score, 240, 182, 1, '#3ecf8e', 'center');
  if (Math.sin(G.time * 4) > -0.3)
    drawText(g, 'DRUK ENTER VIR DIE BRAAI!', 240, 205, 1, '#de3831', 'center');
}

function drawVictory(g, G) {
  panel(g, 90, 110, 300, 130, '#ffcf3f');
  drawText(g, 'JY IS N LEGENDE!', 240, 124, 2, '#ffcf3f', 'center');
  drawText(g, 'ALLE KROE WEER TOE GESLUIP', 240, 150, 1, '#c9cdd6', 'center');
  drawText(g, 'PUNTE: R' + G.score, 240, 168, 1, '#ffffff', 'center');
  if (Math.sin(G.time * 4) > -0.3)
    drawText(g, 'DRUK ENTER - MOER HULLE WEER!', 240, 200, 1, '#de3831', 'center');
}

function drawGameOver(g, G) {
  g.fillStyle = 'rgba(23,20,31,0.85)';
  g.fillRect(0, 0, GEO.W, GEO.H);
  drawText(g, 'EISH, BOET!', GEO.W / 2 + 3, 103, 4, '#17141f', 'center');
  drawText(g, 'EISH, BOET!', GEO.W / 2, 100, 4, '#de3831', 'center');
  drawText(g, G.deathReason, GEO.W / 2, 145, 1, '#c9cdd6', 'center');
  drawText(g, 'PUNTE: R' + G.score, GEO.W / 2, 165, 2, '#ffffff', 'center');
  if (G.newHigh) drawText(g, 'NUWE REKORD!', GEO.W / 2, 190, 1, '#ffcf3f', 'center');
  else drawText(g, 'REKORD: R' + G.hiScore, GEO.W / 2, 190, 1, '#7a8090', 'center');
  if (Math.sin(G.time * 4) > -0.3)
    drawText(g, 'DRUK ENTER', GEO.W / 2, 220, 2, '#ffcf3f', 'center');
}

function drawPause(g) {
  g.fillStyle = 'rgba(23,20,31,0.7)';
  g.fillRect(0, 0, GEO.W, GEO.H);
  drawText(g, 'PAUSE', GEO.W / 2, 160, 3, '#ffcf3f', 'center');
  drawText(g, 'DRUK P OM VERDER TE GAAN', GEO.W / 2, 195, 1, '#c9cdd6', 'center');
}

function drawBlackoutOverlay(g, G) {
  g.fillStyle = 'rgba(5,5,20,0.5)';
  g.fillRect(0, GEO.HUD_H, GEO.W, GEO.H - GEO.HUD_H);
  // flashlight cone around bartender
  const g1 = g.createRadialGradient(G.bar.cx, G.bar.y - 10, 8, G.bar.cx, G.bar.y - 10, 90);
  g1.addColorStop(0, 'rgba(255,233,168,0.14)');
  g1.addColorStop(1, 'rgba(255,233,168,0)');
  g.fillStyle = g1;
  g.fillRect(0, GEO.HUD_H, GEO.W, GEO.H - GEO.HUD_H);
}

/* ------------------------- braai bonus ------------------------- */
function drawBraai(g, B, G) {
  // dusk sky
  g.fillStyle = '#1a1330';
  g.fillRect(0, 0, GEO.W, GEO.H);
  g.fillStyle = '#2a1d45';
  g.fillRect(0, 200, GEO.W, 160);
  g.fillStyle = '#3a2a55';
  g.fillRect(0, 200, GEO.W, 6);
  // stars
  for (let i = 0; i < 30; i++) {
    const sx = (i * 83) % GEO.W, sy = (i * 41) % 120;
    g.fillStyle = '#c9cdd6';
    if (Math.sin(G.time * 2 + i) > -0.5) g.fillRect(sx, sy, 1, 1);
  }
  // ground
  g.fillStyle = '#241c14';
  g.fillRect(0, 300, GEO.W, 60);
  // grass tufts
  g.fillStyle = '#1d3a22';
  for (let x = 6; x < GEO.W; x += 24) { g.fillRect(x, 298, 2, 4); g.fillRect(x + 4, 299, 2, 3); }

  // braai drum
  const cx = 240, cy = 262;
  g.fillStyle = '#4a4f5c'; g.fillRect(cx - 4, 236, 4, 26); g.fillRect(cx + 12, 236, 4, 26); // legs
  g.fillStyle = '#17141f'; g.fillRect(cx - 26, 232, 64, 6);  // grid ledge
  // drum barrel
  g.fillStyle = '#343945'; g.fillRect(cx - 22, 238, 56, 22);
  g.fillStyle = '#4a4f5c'; g.fillRect(cx - 22, 242, 56, 3);
  // coals glow
  for (let i = 0; i < 8; i++) {
    const glow = 0.6 + 0.4 * Math.sin(G.time * 6 + i * 1.7);
    g.fillStyle = i % 2 ? `rgba(226,59,52,${glow})` : `rgba(247,161,29,${glow})`;
    g.fillRect(cx - 18 + i * 7, 233, 5, 3);
  }
  // grill grid
  g.fillStyle = '#4a4f5c';
  for (let i = 0; i < 9; i++) g.fillRect(cx - 24 + i * 7, 230, 2, 5);

  // current wors on grid
  const worsImg = B.lastResult === 'burnt' ? WORS_BURNT : (B.lastResult ? WORS_COOKED : WORS_RAW);
  drawSprite(g, worsImg, cx - 25, 224);

  // wors waiting on the side plate
  for (let i = 0; i < B.left; i++) drawSprite(g, WORS_RAW, 60 + i * 18, 292);
  drawText(g, 'WORS OOR: ' + B.left, 70, 316, 1, '#c9cdd6');

  // bartender tossing pose
  drawSprite(g, B.tossT > 0 ? BARTENDER_WALK : BARTENDER, cx + 60, 232);

  // timing meter
  const mw = 200, mx = GEO.W / 2 - mw / 2, my = 330;
  g.fillStyle = '#17141f'; g.fillRect(mx - 3, my - 3, mw + 6, 12);
  g.fillStyle = '#8c1f1a'; g.fillRect(mx, my, mw, 6);
  g.fillStyle = '#007a4d'; g.fillRect(mx + mw * 0.38, my, mw * 0.24, 6);
  g.fillStyle = '#ffcf3f'; g.fillRect(mx + mw * 0.46, my, mw * 0.08, 6);
  const mkx = mx + mw * B.marker;
  g.fillStyle = '#ffffff'; g.fillRect(Math.round(mkx) - 1, my - 3, 3, 12);
  drawText(g, 'SPASIE OM TE FLIP!', GEO.W / 2, 312, 1, Math.sin(G.time * 5) > 0 ? '#ffcf3f' : '#ffffff', 'center');

  // result popups
  if (B.msg && B.msgT > 0) {
    drawTextShadow(g, B.msg.text, GEO.W / 2, 120 - (1 - B.msgT) * 10, 2, B.msg.color, 'center');
  }
  drawText(g, 'BRAAI BONUS  R' + B.earned, GEO.W / 2, 20, 2, '#ffcf3f', 'center');
  drawText(g, 'PERFEK: R50  LEKKER: R25', GEO.W / 2, 42, 1, '#c9cdd6', 'center');
}

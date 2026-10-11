/* ============================================================
   TapperBoet — levels.js
   Drinks, customer types, venues, wave generation,
   load-shedding schedules.
   ============================================================ */
"use strict";

/* ------------------------- Drinks ------------------------- */
const DRINKS = [
  { id: 'castle',     name: 'CASTLE',      color: '#f7a11d' },
  { id: 'klipdrift',  name: 'KLIPDRIFT',   color: '#c96f10' },
  { id: 'savanna',    name: 'SAVANNA',     color: '#ffe9a8' },
  { id: 'blacklabel', name: 'BLACK LABEL', color: '#343945' },
];

/* ------------------------- Customer types ------------------------- */
const CUSTOMER_TYPES = {
  bok:     { name: 'BOKKE',      speed: 26, patience: 22, tip: 10, drinkTime: 2.2 },
  taxi:    { name: 'TAXI MAN',   speed: 46, patience: 14, tip: 12, drinkTime: 1.2 },
  tourist: { name: 'TOERIS',     speed: 18, patience: 26, tip: 22, drinkTime: 3.0 },
  minstrel:{ name: 'KLOPSE',     speed: 24, patience: 17, tip: 15, drinkTime: 2.4 },
  oupa:    { name: 'OUPA',       speed: 15, patience: 30, tip: 14, drinkTime: 3.6 },
};

/* ------------------------- Venues ------------------------- */
const VENUES = [
  {
    id: 'shebeen',
    name: 'DIE SHEBEEN',
    place: 'JOZI',
    drinks: ['castle', 'klipdrift'],
    types: ['bok', 'oupa'],
    wall: '#5a3b22', wallDark: '#432b16', counter: '#a9713a', counterFront: '#6b3f1d', floor: '#2a2317',
    customers: 7, spawnStart: 2.0, spawnGap: 7.5,
    patienceBonus: 1.25,
    cuts: [],
    accent: '#ffcf3f',
  },
  {
    id: 'stadium',
    name: 'BOK STADIUM BAR',
    place: 'PRETORIA',
    drinks: ['castle', 'klipdrift', 'savanna'],
    types: ['bok', 'oupa', 'taxi'],
    wall: '#1e5c38', wallDark: '#134026', counter: '#c9cdd6', counterFront: '#7a8090', floor: '#1d4a2e',
    customers: 11, spawnStart: 1.2, spawnGap: 5.6,
    patienceBonus: 1.1,
    cuts: [{ t: 30, dur: 10, stage: 2 }],
    accent: '#007a4d',
  },
  {
    id: 'beach',
    name: 'DURBS BEACH BAR',
    place: 'DURBAN',
    drinks: ['castle', 'savanna', 'klipdrift'],
    types: ['bok', 'taxi', 'tourist'],
    wall: '#2e8fb8', wallDark: '#1e6a8c', counter: '#e8d9a8', counterFront: '#b89f68', floor: '#e0c98f',
    customers: 14, spawnStart: 1.0, spawnGap: 4.6,
    patienceBonus: 1.0,
    cuts: [{ t: 35, dur: 8, stage: 2 }, { t: 60, dur: 10, stage: 3 }],
    accent: '#ffcf3f',
  },
  {
    id: 'klopse',
    name: 'KLOPSE KROEG',
    place: 'KAAPSTAD',
    drinks: ['castle', 'klipdrift', 'savanna', 'blacklabel'],
    types: ['bok', 'taxi', 'tourist', 'minstrel', 'oupa'],
    wall: '#b8434e', wallDark: '#8c2b3a', counter: '#ffcf3f', counterFront: '#c96f10', floor: '#5a2a3a',
    customers: 17, spawnStart: 0.9, spawnGap: 3.9,
    patienceBonus: 0.9,
    cuts: [{ t: 18, dur: 9, stage: 3 }, { t: 42, dur: 10, stage: 4 }, { t: 66, dur: 12, stage: 5 }],
    accent: '#ff7bac',
  },
];

/* ------------------------- Wave generation ------------------------- */
/* Build a spawn list for a venue + loop count.
   Each entry: { t, type, lane (-1 = random), drink (chosen at spawn from venue pool) } */
function buildWave(venue, loop) {
  const wave = [];
  const n = venue.customers + loop * 4;
  const gap = Math.max(2.0, venue.spawnGap * Math.pow(0.92, loop));
  let t = venue.spawnStart;
  let lane = 0;
  for (let i = 0; i < n; i++) {
    // distribute across lanes with variety
    lane = Math.floor(Math.random() * 4);
    const type = venue.types[Math.floor(Math.random() * venue.types.length)];
    wave.push({ t, type, lane });
    // gap shrinks slightly through the level; occasional double-spawn pressure later
    t += gap * (0.7 + Math.random() * 0.6) * (i > n * 0.7 ? 0.8 : 1);
  }
  return wave;
}

/* Load-shedding events for a level (base venue cuts + extras per loop). */
function buildCuts(venue, loop) {
  const cuts = venue.cuts.map(c => ({ ...c }));
  for (let i = 0; i < loop; i++) {
    const maxT = 45 + i * 5;
    cuts.push({ t: 20 + Math.random() * maxT, dur: 8 + Math.random() * 5, stage: 2 + i });
  }
  return cuts.sort((a, b) => a.t - b.t);
}

/* Seat x positions per lane (customers stop here) */
const SEAT_X = [48, 100, 152];

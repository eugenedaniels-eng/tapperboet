/* ============================================================
   TapperBoet — sprites.js
   All pixel art defined as code: palette + string grids.
   'makeSprite' bakes each grid onto an offscreen canvas
   (with a 1px dark outline) for fast, crisp drawing.
   Also: a 5x5 pixel font + drawText.
   ============================================================ */
"use strict";

const PALETTE = {
  '.': null,
  '0': '#17141f', // near-black outline
  'w': '#ffffff', // white
  'e': '#c9cdd6', // light grey
  'm': '#7a8090', // metal
  'M': '#4a4f5c', // dark metal
  'x': '#343945', // charcoal (hair, caps, pants)
  's': '#f0c095', // light skin
  'n': '#c98a5a', // medium skin
  'S': '#a4693b', // dark skin
  'd': '#7c4a1e', // dark brown
  'o': '#a9713a', // mid brown / wood
  'a': '#f7a11d', // amber (beer)
  'A': '#c96f10', // dark amber
  'f': '#fdf6e3', // foam cream
  'y': '#ffcf3f', // gold
  'g': '#007a4d', // springbok green
  'G': '#00543a', // dark green
  'r': '#e23b34', // red
  'R': '#8c1f1a', // dark red
  'b': '#0b2f8a', // blue
  'B': '#2f5fd0', // royal blue (bulle)
  'c': '#6ec6ef', // light blue (glass)
  'p': '#ff7bac', // pink (minstrel)
  'u': '#7b4ea3', // purple
  'h': '#cbb27a', // khaki
  'H': '#9a8557', // khaki dark
  'k': '#2a2317', // bar wood dark
  'l': '#ffe9a8', // pale yellow (cider)
  'v': '#d8e021', // hi-vis
};

/* Bake a sprite grid (array of equal-length strings) into a canvas.
   Adds a 1px black outline around non-transparent pixels. */
function makeSprite(rows, opts) {
  opts = opts || {};
  const w = Math.max(...rows.map(r => r.length));
  const h = rows.length;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const colorOf = ch => (PALETTE[ch] !== undefined ? PALETTE[ch] : null);
  // outline pass
  if (opts.outline !== false) {
    g.fillStyle = '#17141f';
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        if (colorOf(row[x])) {
          g.fillRect(x - 1, y, 1, 1); g.fillRect(x + 1, y, 1, 1);
          g.fillRect(x, y - 1, 1, 1); g.fillRect(x, y + 1, 1, 1);
        }
      }
    }
  }
  // color pass
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const col = colorOf(row[x]);
      if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
    }
  }
  return c;
}

/* Draw a baked sprite. flip mirrors horizontally around its own width. */
function drawSprite(g, img, x, y, flip) {
  x = Math.round(x); y = Math.round(y);
  if (flip) {
    g.save();
    g.translate(x + img.width, y);
    g.scale(-1, 1);
    g.drawImage(img, 0, 0);
    g.restore();
  } else {
    g.drawImage(img, x, y);
  }
}

/* ============================ SPRITES ============================ */

const BARTENDER = makeSprite([ // 12 x 22, khaki shirt + green apron
  '...0hhhh0...',
  '..0hhhhhh0..',
  '..0hhhhhh0..',
  '..0ssssss0..',
  '..0s0ss0s0..',
  '..0ssssss0..',
  '...0ssss0...',
  '..0hhhhhh0..',
  '.0hh0GG0hh0.',
  '.0s0GGGG0s0.',
  '.0s0GGGG0s0.',
  '..00GGGG00..',
  '...0GGGG0...',
  '...0GGGG0...',
  '...0xxxx0...',
  '...0x00x0...',
  '...0x00x0...',
  '...0x00x0...',
  '...0x00x0...',
  '...0x00x0...',
  '..0dd00dd0..',
  '..0dd00dd0..',
]);

const BARTENDER_WALK = makeSprite([ // legs together
  '...0hhhh0...',
  '..0hhhhhh0..',
  '..0hhhhhh0..',
  '..0ssssss0..',
  '..0s0ss0s0..',
  '..0ssssss0..',
  '...0ssss0...',
  '..0hhhhhh0..',
  '.0hh0GG0hh0.',
  '.0s0GGGG0s0.',
  '.0s0GGGG0s0.',
  '..00GGGG00..',
  '...0GGGG0...',
  '...0GGGG0...',
  '...0xxxx0...',
  '...0xx0x0...',
  '...0xx0x0...',
  '...0x00x0...',
  '...0x00x0...',
  '...0x00x0...',
  '..0ddd0dd0..',
  '..0ddd0dd0..',
]);

const CUST_BOK = makeSprite([ // Bok supporter: green jersey, white shorts, boep
  '....xxxx....',
  '...xxxxxx...',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...gggggg...',
  '..yggggggy..',
  '..gggggggg..',
  '..sggggggs..',
  '..sggggggs..',
  '...gggggg...',
  '...wwwwww...',
  '...wwwwww...',
  '...ww..ww...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ww..ww...',
  '..0ww00ww0..',
]);

const CUST_BOK_WALK = makeSprite([
  '....xxxx....',
  '...xxxxxx...',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...gggggg...',
  '..yggggggy..',
  '..gggggggg..',
  '..sggggggs..',
  '..sggggggs..',
  '...gggggg...',
  '...wwwwww...',
  '...wwwwww...',
  '...ww..ww...',
  '...ss..ss...',
  '..0ss..ss...',
  '..0ss...ss..',
  '.0ss....ss0.',
  '.0s......s0.',
  '.0w......w0.',
  '0ww0....0ww0',
]);

const CUST_TAXI = makeSprite([ // taxi driver: hi-vis vest, cap, dark skin
  '...xxxxxx...',
  '...xxxxxx...',
  '...SSSSSS...',
  '...S0SS0S...',
  '...SSSSSS...',
  '....SSSS....',
  '..xvvvvvvx..',
  '..xvevevevx.',
  '..xvvvvvvx..',
  '..SvvvvvvS..',
  '..SveveevS..',
  '...vvvvvv...',
  '...xxxxxx...',
  '...xxxxxx...',
  '...xx..xx...',
  '...SS..SS...',
  '...SS..SS...',
  '...SS..SS...',
  '...SS..SS...',
  '...SS..SS...',
  '...xx..xx...',
  '..0xx00xx0..',
]);

const CUST_TAXI_WALK = makeSprite([
  '...xxxxxx...',
  '...xxxxxx...',
  '...SSSSSS...',
  '...S0SS0S...',
  '...SSSSSS...',
  '....SSSS....',
  '..xvvvvvvx..',
  '..xvevevevx.',
  '..xvvvvvvx..',
  '..SvvvvvvS..',
  '..SveveevS..',
  '...vvvvvv...',
  '...xxxxxx...',
  '...xxxxxx...',
  '...xx..xx...',
  '...SS..SS...',
  '..0SS..SS...',
  '..0SS...SS..',
  '.0SS....SS0.',
  '.0S......S0.',
  '.0x......x0.',
  '0xx0....0xx0',
]);

const CUST_TOURIST = makeSprite([ // tourist: safari hat, camera, khaki
  '..0hhhhhh0..',
  '.0hhhhhhhh0.',
  '0dddddddddd0',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..shhxxhhs..',
  '..shxcxchs..',
  '...hhhhhh...',
  '...hhhhhh...',
  '...hhhhhh...',
  '...hh..hh...',
  '...ss..ss...',
  '...ww..ww...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...dd..dd...',
  '..0dd00dd0..',
]);

const CUST_TOURIST_WALK = makeSprite([
  '..0hhhhhh0..',
  '.0hhhhhhhh0.',
  '0dddddddddd0',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...hhhhhh...',
  '..hhhhhhhh..',
  '..shhxxhhs..',
  '..shxcxchs..',
  '...hhhhhh...',
  '...hhhhhh...',
  '...hhhhhh...',
  '...hh..hh...',
  '...ss..ss...',
  '...ww..ww...',
  '..0ss..ss...',
  '..0ss...ss..',
  '.0ss....ss0.',
  '.0d......d0.',
  '0dd0....0dd0',
]);

const CUST_MINSTREL = makeSprite([ // Kaapse Klopse: pink suit, gold trim, parade hat
  '...0w0w0w0..',
  '...0wwwww0..',
  '...0yyyyy0..',
  '...SSSSSS...',
  '...S0SS0S...',
  '...SSSSSS...',
  '....SSSS....',
  '...pppppp...',
  '..ypypyypy..',
  '..SppppppS..',
  '..SppppppS..',
  '...pppppp...',
  '...wwwwww...',
  '...wwwwww...',
  '...ww..ww...',
  '...SS..SS...',
  '...SS..SS...',
  '...SS..SS...',
  '...SS..SS...',
  '...SS..SS...',
  '...ww..ww...',
  '..0ww00ww0..',
]);

const CUST_MINSTREL_WALK = makeSprite([
  '...0w0w0w0..',
  '...0wwwww0..',
  '...0yyyyy0..',
  '...SSSSSS...',
  '...S0SS0S...',
  '...SSSSSS...',
  '....SSSS....',
  '...pppppp...',
  '..ypypyypy..',
  '..SppppppS..',
  '..SppppppS..',
  '...pppppp...',
  '...wwwwww...',
  '...wwwwww...',
  '...ww..ww...',
  '...SS..SS...',
  '..0SS..SS...',
  '..0SS...SS..',
  '.0SS....SS0.',
  '.0S......S0.',
  '.0w......w0.',
  '0ww0....0ww0',
]);

const CUST_OUPA = makeSprite([ // oupa: flat cap, beard, jacket, walking stick
  '..0xxxxxx0.d',
  '..0xxxxxx0.d',
  '...ssssss0.d',
  '...s0ss0s0.d',
  '...swwwws0.d',
  '...wwwwww0.d',
  '..0oooooo0.d',
  '..odddddd0.d',
  '..odddddd0.d',
  '..soddddos.d',
  '..soddddos.d',
  '...oddddod.d',
  '...eeeeee0.d',
  '...eeeeee0.d',
  '...ee..ee0.d',
  '...ee..ee0.d',
  '...ee..ee0.d',
  '...ee..ee0.d',
  '...ee..ee0.d',
  '...ee..ee0.d',
  '..0xx00xx00d',
  '..0xx00xx00d',
]);

const CUST_OUPA_WALK = makeSprite([
  '..0xxxxxx0.d',
  '..0xxxxxx0.d',
  '...ssssss0.d',
  '...s0ss0s0.d',
  '...swwwws0.d',
  '...wwwwww0.d',
  '..0oooooo0.d',
  '..odddddd0.d',
  '..odddddd0.d',
  '..soddddos.d',
  '..soddddos.d',
  '...oddddod.d',
  '...eeeeee0.d',
  '...eeeeee0.d',
  '...ee..ee0.d',
  '..0ee..ee0.d',
  '..0ee...ee.d',
  '.0ee....ee0d',
  '.0e......e0d',
  '.0e......e0d',
  '.0x......x0d',
  '0xx0....0xx0',
]);

const CUST_AUNTY = makeSprite([ // Durbs Indian aunty: purple sari, gold trim, bindi, bangles
  '....xxxx....',
  '...xxxxxxp..',
  '...nnrnnn...',
  '...n0nn0n...',
  '...nnnnnn...',
  '....nnnn....',
  '...uuuuuu...',
  '..yuuuuuuy..',
  '..nuuuuuun..',
  '..nyuuuuyn..',
  '..nuuuuuun..',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...yuuuuy...',
  '...nn..nn...',
  '..0SS00SS0..',
]);

const CUST_AUNTY_WALK = makeSprite([
  '....xxxx....',
  '...xxxxxxp..',
  '...nnrnnn...',
  '...n0nn0n...',
  '...nnnnnn...',
  '....nnnn....',
  '...uuuuuu...',
  '..yuuuuuuy..',
  '..nuuuuuun..',
  '..nyuuuuyn..',
  '..nuuuuuun..',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...uuuuuu...',
  '...yuuuuy...',
  '..0nn..nn...',
  '.0SS0..0SS0.',
]);

const CUST_BINNET = makeSprite([ // coloured binnet: polka doek, pink floral dress, gold chain
  '...rrrrrr...',
  '..rrrrrrrr..',
  '...nnnnnn...',
  '...n0nn0n...',
  '...nnnnnn...',
  '....nnnn....',
  '...pyyyyp...',
  '..pppppppp..',
  '..nppppppn..',
  '..nppwpppn..',
  '..nppppppn..',
  '...pppppp...',
  '...pwpppp...',
  '...ppppwp...',
  '...pppppp...',
  '...pppppp...',
  '...wppppp...',
  '...pppppp...',
  '...pppppp...',
  '...pppppp...',
  '...nn..nn...',
  '..0xx00xx0..',
]);

const CUST_BINNET_WALK = makeSprite([
  '...rrrrrr...',
  '..rrrrrrrr..',
  '...nnnnnn...',
  '...n0nn0n...',
  '...nnnnnn...',
  '....nnnn....',
  '...pyyyyp...',
  '..pppppppp..',
  '..nppppppn..',
  '..nppwpppn..',
  '..nppppppn..',
  '...pppppp...',
  '...pwpppp...',
  '...ppppwp...',
  '...pppppp...',
  '...pppppp...',
  '...wppppp...',
  '...pppppp...',
  '...pppppp...',
  '...pppppp...',
  '..0nn..nn...',
  '.0xx0..0xx0.',
]);

const CUST_GOGO = makeSprite([ // African gogo: white doek, blue shweshwe dress, gold beads
  '...wwwwww...',
  '..wwwwwwww..',
  '...SSSSSS...',
  '...S0SS0S...',
  '...SSSSSS...',
  '....SSSS....',
  '...byyyyb...',
  '..bbbbbbbb..',
  '..SbbbbbbS..',
  '..SbwbwbbS..',
  '..SbbbbbbS..',
  '...bbbbbb...',
  '...bwbbbb...',
  '...bbbbwb...',
  '...bbbbbb...',
  '...bbbbbb...',
  '...wbbbbb...',
  '...bbbbbb...',
  '...bbbbbb...',
  '...bbbbbb...',
  '...SS..SS...',
  '..0dd00dd0..',
]);

const CUST_GOGO_WALK = makeSprite([
  '...wwwwww...',
  '..wwwwwwww..',
  '...SSSSSS...',
  '...S0SS0S...',
  '...SSSSSS...',
  '....SSSS....',
  '...byyyyb...',
  '..bbbbbbbb..',
  '..SbbbbbbS..',
  '..SbwbwbbS..',
  '..SbbbbbbS..',
  '...bbbbbb...',
  '...bwbbbb...',
  '...bbbbwb...',
  '...bbbbbb...',
  '...bbbbbb...',
  '...wbbbbb...',
  '...bbbbbb...',
  '...bbbbbb...',
  '...bbbbbb...',
  '..0SS..SS...',
  '.0dd0..0dd0.',
]);

const CUST_SHARKS = makeSprite([ // Sharks supporter: black jersey, white trim, white shorts
  '....xxxx....',
  '...xxxxxx...',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...xxxxxx...',
  '..wxxxxxxw..',
  '..xxxxxxxx..',
  '..sxxxxxxs..',
  '..sxxxxxxs..',
  '...xxxxxx...',
  '...wwwwww...',
  '...wwwwww...',
  '...ww..ww...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ww..ww...',
  '..0ww00ww0..',
]);

const CUST_SHARKS_WALK = makeSprite([
  '....xxxx....',
  '...xxxxxx...',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...xxxxxx...',
  '..wxxxxxxw..',
  '..xxxxxxxx..',
  '..sxxxxxxs..',
  '..sxxxxxxs..',
  '...xxxxxx...',
  '...wwwwww...',
  '...wwwwww...',
  '...ww..ww...',
  '...ss..ss...',
  '..0ss..ss...',
  '..0ss...ss..',
  '.0ss....ss0.',
  '.0s......s0.',
  '.0w......w0.',
  '0ww0....0ww0',
]);

const CUST_LIONS = makeSprite([ // Lions supporter: red jersey, white trim and shorts
  '....xxxx....',
  '...xxxxxx...',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...rrrrrr...',
  '..wrrrrrrw..',
  '..rrrrrrrr..',
  '..srrrrrrs..',
  '..srrrrrrs..',
  '...rrrrrr...',
  '...wwwwww...',
  '...wwwwww...',
  '...ww..ww...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...rr..rr...',
  '..0ww00ww0..',
]);

const CUST_LIONS_WALK = makeSprite([
  '....xxxx....',
  '...xxxxxx...',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...rrrrrr...',
  '..wrrrrrrw..',
  '..rrrrrrrr..',
  '..srrrrrrs..',
  '..srrrrrrs..',
  '...rrrrrr...',
  '...wwwwww...',
  '...wwwwww...',
  '...ww..ww...',
  '...ss..ss...',
  '..0ss..ss...',
  '..0ss...ss..',
  '.0ss....ss0.',
  '.0s......s0.',
  '.0r......r0.',
  '0ww0....0ww0',
]);

const CUST_BULLS = makeSprite([ // Bulls supporter: royal blue jersey, blue cap, white shorts
  '....BBBB....',
  '...BBBBBB...',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...BBBBBB...',
  '..wBBBBBBw..',
  '..BBBBBBBB..',
  '..sBBBBBBs..',
  '..sBBBBBBs..',
  '...BBBBBB...',
  '...wwwwww...',
  '...wwwwww...',
  '...ww..ww...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ww..ww...',
  '..0ww00ww0..',
]);

const CUST_BULLS_WALK = makeSprite([
  '....BBBB....',
  '...BBBBBB...',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...BBBBBB...',
  '..wBBBBBBw..',
  '..BBBBBBBB..',
  '..sBBBBBBs..',
  '..sBBBBBBs..',
  '...BBBBBB...',
  '...wwwwww...',
  '...wwwwww...',
  '...ww..ww...',
  '...ss..ss...',
  '..0ss..ss...',
  '..0ss...ss..',
  '.0ss....ss0.',
  '.0s......s0.',
  '.0w......w0.',
  '0ww0....0ww0',
]);

const CUST_STORMERS = makeSprite([ // Stormers supporter: navy jersey, red sash, navy shorts
  '....xxxx....',
  '...xxxxxx...',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...bbbbbb...',
  '..wbbbbbbw..',
  '..bbbbbbbb..',
  '..srrrrrrs..',
  '..sbbbbbbs..',
  '...bbbbbb...',
  '...bbbbbb...',
  '...bbbbbb...',
  '...bb..bb...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ss..ss...',
  '...ww..ww...',
  '..0ww00ww0..',
]);

const CUST_STORMERS_WALK = makeSprite([
  '....xxxx....',
  '...xxxxxx...',
  '...ssssss...',
  '...s0ss0s...',
  '...ssssss...',
  '....ssss....',
  '...bbbbbb...',
  '..wbbbbbbw..',
  '..bbbbbbbb..',
  '..srrrrrrs..',
  '..sbbbbbbs..',
  '...bbbbbb...',
  '...bbbbbb...',
  '...bbbbbb...',
  '...bb..bb...',
  '...ss..ss...',
  '..0ss..ss...',
  '..0ss...ss..',
  '.0ss....ss0.',
  '.0s......s0.',
  '.0w......w0.',
  '0ww0....0ww0',
]);

/* --- mugs (12 x 9). Interior overlay lets us show partial fills --- */
const MUG_GLASS = makeSprite([
  '..0000000...',
  '..0wwwww0...',
  '..0wwwww000.',
  '..0wwwww0.0.',
  '..0wwwww0.0.',
  '..0wwwww000.',
  '..0wwwww0...',
  '..0wwwww0...',
  '..0000000...',
]);

const MUG_EMPTY = makeSprite([
  '..0000000...',
  '..0eeeee0...',
  '..0eeeee000.',
  '..0eeeee0.0.',
  '..0eeeee0.0.',
  '..0eeeee000.',
  '..0eeeee0...',
  '..0eeeee0...',
  '..0000000...',
]);

const MUG_FULL = makeSprite([
  '..0000000...',
  '..0fffff0...',
  '..0aaaea000.',
  '..0aaaea0.0.',
  '..0aaaea0.0.',
  '..0aaaea000.',
  '..0aaaea0...',
  '..0aaaea0...',
  '..0000000...',
]);

/* --- tap (16 x 9): pipe + spout + red handle --- */
const TAP_SPRITE = makeSprite([
  '......rr........',
  '......rr........',
  '....MMMMMMMM....',
  '....M....mmm....',
  '....M....mmmm...',
  '....M....mMMm...',
  '..MMM....mMMm...',
  '..m......mMMm...',
  '...mmmmmmmMMm...',
], { outline: false });

/* --- generator (18 x 13) --- */
const GENERATOR = makeSprite([
  '......rr..........',
  '....000000........',
  '....0MMMM0........',
  '..000000000000....',
  '..0MMMMMMMMMM0....',
  '..0MMMMyyMMMM0....',
  '..0MMMMMyyMMM0....',
  '..0MMMMMyyMMM0....',
  '..0MMMMyyyyMM0....',
  '..0MMMMMyyMMM0....',
  '..0MMMMyyMMMM0....',
  '..000000000000....',
  '...MM......MM.....',
]);

/* --- icons --- */
const ICON_VUVU = makeSprite([ // vuvuzela 14 x 5
  '.........yy...',
  '.yyyyyyyyyy...',
  'yyyyyyyyyyyyy.',
  '.yyyyyyyyyy...',
  '.........yy...',
]);

const ICON_BILTONG = makeSprite([ // 10 x 6: two strips of dark dried meat
  '.dd...dd...',
  'dRRd.dRRd..',
  'dRwd.dRwd..',
  'dRRd.dRRd..',
  '.dd.dRRd...',
  '...dd..dd..',
]);

const STOOL = makeSprite([ // 10 x 8
  '..rrrrrr..',
  '.rrrrrrrr.',
  '..000000..',
  '....mm....',
  '....mm....',
  '....mm....',
  '...mmm....',
  '..mmmmmm..',
]);

/* --- drink icons (9 x 12) for order bubbles + HUD selector --- */
const DRINK_ICONS = {
  castle: makeSprite([ // pint with foam + green band
    '..fffff...',
    '.ffffff...',
    '.0ccccc0..',
    '.0aaaaa0..',
    '.0aaaaa0..',
    '.0ggggg0..',
    '.0aaaaa0..',
    '.0aaaaa0..',
    '.0ccccc0..',
    '..ccccc...',
    '..ccccc...',
    '..00000...',
  ]),
  blacklabel: makeSprite([ // dark bottle, black label
    '..rrr.....',
    '..0x0.....',
    '..0x0.....',
    '.0xxx0....',
    '.0xxx0....',
    '.0xxx0....',
    '.00000....',
    '.0www0....',
    '.00000....',
    '.0xxx0....',
    '.0xxx0....',
    '.00000....',
  ]),
  savanna: makeSprite([ // tall clear bottle, pale cider
    '..www.....',
    '..0c0.....',
    '..0c0.....',
    '..0l0.....',
    '..0l0.....',
    '..0l0.....',
    '..0l0.....',
    '..0w0.....',
    '..0l0.....',
    '..0l0.....',
    '..0l0.....',
    '..000.....',
  ]),
  klipdrift: makeSprite([ // square amber bottle, white label
    '..rrr.....',
    '..0A0.....',
    '.0AAA0....',
    '.0AAA0....',
    '.0AAA0....',
    '.0AAA0....',
    '.0www0....',
    '.0AAA0....',
    '.0AAA0....',
    '.0AAA0....',
    '.0AAA0....',
    '.00000....',
  ]),
};

/* braai wors (bonus round) 14 x 4 */
const WORS_RAW = makeSprite([
  '..ddd...ddd...',
  '.dSSSd.dSSSd..',
  '.dSSSd.dSSSd..',
  '..ddd...ddd...',
]);
const WORS_COOKED = makeSprite([
  '..AAA...AAA...',
  '.AdDAd.AdDAd..',
  '.AdDAd.AdDAd..',
  '..AAA...AAA...',
]);
const WORS_BURNT = makeSprite([
  '..xxx...xxx...',
  '.x0x0x.x0x0x..',
  '.x0x0x.x0x0x..',
  '..xxx...xxx...',
]);

/* ============================ 5x5 FONT ============================ */
/* Each glyph: 5 strings of 5 chars ('#' = pixel). */
const FONT = {
  'A': [' ### ', '#   #', '#####', '#   #', '#   #'],
  'B': ['#### ', '#   #', '#### ', '#   #', '#### '],
  'C': [' ### ', '#   #', '#   #', '#   #', ' ### '],
  'D': ['#### ', '#   #', '#   #', '#   #', '#### '],
  'E': ['#####', '#    ', '#### ', '#    ', '#####'],
  'F': ['#####', '#    ', '#### ', '#    ', '#    '],
  'G': [' ### ', '#   #', '#  ##', '#   #', ' ### '],
  'H': ['#   #', '#   #', '#####', '#   #', '#   #'],
  'I': ['#####', '  #  ', '  #  ', '  #  ', '#####'],
  'J': ['  ###', '   # ', '   # ', '#  # ', ' ##  '],
  'K': ['#   #', '#  # ', '###  ', '#  # ', '#   #'],
  'L': ['#    ', '#    ', '#    ', '#    ', '#####'],
  'M': ['#   #', '## ##', '# # #', '#   #', '#   #'],
  'N': ['#   #', '##  #', '# # #', '#  ##', '#   #'],
  'O': [' ### ', '#   #', '#   #', '#   #', ' ### '],
  'P': ['#### ', '#   #', '#### ', '#    ', '#    '],
  'Q': [' ### ', '#   #', '# # #', '#  # ', ' ## #'],
  'R': ['#### ', '#   #', '#### ', '#  # ', '#   #'],
  'S': [' ####', '#    ', ' ### ', '    #', '#### '],
  'T': ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
  'U': ['#   #', '#   #', '#   #', '#   #', ' ### '],
  'V': ['#   #', '#   #', '#   #', ' # # ', '  #  '],
  'W': ['#   #', '#   #', '# # #', '## ##', '#   #'],
  'X': ['#   #', ' # # ', '  #  ', ' # # ', '#   #'],
  'Y': ['#   #', ' # # ', '  #  ', '  #  ', '  #  '],
  'Z': ['#####', '   # ', '  #  ', ' #   ', '#####'],
  '0': [' ### ', '#  ##', '# # #', '##  #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', ' ### '],
  '2': [' ### ', '#   #', '  ## ', ' #   ', '#####'],
  '3': ['#### ', '    #', ' ### ', '    #', '#### '],
  '4': ['#   #', '#   #', '#####', '   # ', '   # '],
  '5': ['#####', '#    ', '#### ', '    #', '#### '],
  '6': [' ### ', '#    ', '#### ', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', '  #  '],
  '8': [' ### ', '#   #', ' ### ', '#   #', ' ### '],
  '9': [' ### ', '#   #', ' ####', '    #', ' ### '],
  ' ': ['     ', '     ', '     ', '     ', '     '],
  '.': ['     ', '     ', '     ', ' ##  ', ' ##  '],
  ',': ['     ', '     ', ' ##  ', ' ##  ', '  #  '],
  ':': ['     ', ' ##  ', ' ##  ', '     ', ' ##  '],
  '!': [' ##  ', ' ##  ', ' ##  ', '     ', ' ##  '],
  '?': [' ### ', '#   #', '  ## ', '     ', '  #  '],
  "'": ['  #  ', '  #  ', '     ', '     ', '     '],
  '-': ['     ', '     ', ' ### ', '     ', '     '],
  '+': ['     ', '  #  ', ' ### ', '  #  ', '     '],
  '/': ['    #', '   # ', '  #  ', ' #   ', '#    '],
  '(': ['  #  ', ' #   ', ' #   ', ' #   ', '  #  '],
  ')': ['  #  ', '   # ', '   # ', '   # ', '  #  '],
  '#': [' # # ', '#####', ' # # ', '#####', ' # # '],
  '<': ['#    ', ' #   ', '  #  ', ' #   ', '#    '],
  '>': ['    #', '   # ', '  #  ', '   # ', '    #'],
  '%': ['#   #', '   # ', '  #  ', ' #   ', '#   #'],
  '=': ['     ', '#####', '     ', '#####', '     '],
};

const CHAR_W = 5, CHAR_H = 5, CHAR_SP = 1; // spacing

/* Draw text in the pixel font. color = any canvas color.
   align: 'left' | 'center' | 'right'. */
function drawText(g, text, x, y, scale, color, align) {
  scale = scale || 1;
  color = color || '#ffffff';
  align = align || 'left';
  const len = text.length;
  const total = len * (CHAR_W + CHAR_SP) * scale - CHAR_SP * scale;
  let px = x;
  if (align === 'center') px = Math.round(x - total / 2);
  else if (align === 'right') px = Math.round(x - total);
  px = Math.round(px); y = Math.round(y);
  g.fillStyle = color;
  for (let i = 0; i < len; i++) {
    const glyph = FONT[text[i].toUpperCase()] || FONT['?'];
    for (let r = 0; r < CHAR_H; r++) {
      const row = glyph[r];
      let c = 0;
      while (c < CHAR_W) {
        if (row[c] === '#') {
          let run = 1;
          while (c + run < CHAR_W && row[c + run] === '#') run++;
          g.fillRect(px + (i * (CHAR_W + CHAR_SP) + c) * scale, y + r * scale, run * scale, scale);
          c += run;
        } else c++;
      }
    }
  }
}

/* Text with a hard 1px black drop shadow for readability. */
function drawTextShadow(g, text, x, y, scale, color, align) {
  drawText(g, text, x + scale, y + scale, scale, '#17141f', align);
  drawText(g, text, x, y, scale, color, align);
}

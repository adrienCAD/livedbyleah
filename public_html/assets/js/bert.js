// L-Bert: Leah's hopping game. Mumu (an original winged critter) hops on a pyramid of stones and paints every top.
// 4 levels (Water, Earth, Air, Fire), 3 rounds each. Canvas 320x240 shown at 2x, pixel art drawn in code, no libraries.
(function () {
  'use strict';
  var cv = document.getElementById('gameCanvas');
  if (!cv) { return; }
  var g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;

  var W = 320, H = 240, ROWS = 7, TOP = 44;            // cube top centre of row 0 is at (160, TOP)
  var HOP = 0.24, GLIDE_HOP = 0.42, MAX_LIVES = 5;
  var LIFE_AT = [5000, 15000, 30000];                  // extra lives at these scores
  var TIERS = [2000, 5000, 10000, 20000, 35000];       // fan point tiers (1, 3, 6, 10, 15 points)

  // ------------------------------------------------------------------ small helpers
  function fmtN(n) { return Math.round(n).toLocaleString('en-US'); }
  function fmt(ms) { var t = Math.max(0, Math.round(ms / 1000)), m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function mk(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.imageSmoothingEnabled = false; fn(x); return c; }
  function flip(img) { return mk(img.width, img.height, function (x) { x.translate(img.width, 0); x.scale(-1, 1); x.drawImage(img, 0, 0); }); }
  function R(x, col, a, b, w, h) { x.fillStyle = col; x.fillRect(a, b, w, h); }
  function ell(x, col, cx, cy, rx, ry) { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); }
  function poly(x, col, pts) { x.fillStyle = col; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) { x.lineTo(pts[i][0], pts[i][1]); } x.closePath(); x.fill(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // ------------------------------------------------------------------ Mumu (original character: golden fur, blue ears, ring tail, glide wings)
  var O = '#2a1a0c', F = '#f2b632', FD = '#c98a1e', FL = '#ffe6a0', EIN = '#99D6EA', EYE = '#3fcf6a', WING = '#c79a3a', WINGD = '#8a6018';
  function mumuFront(x, wide) {
    // tail (behind), ringed, curling up on the right
    [[18, 21], [19, 19], [20, 17], [21, 15], [21, 13], [20, 11]].forEach(function (p, i) { R(x, O, p[0] - 1, p[1] - 1, 4, 4); R(x, i % 2 ? '#ffffff' : F, p[0], p[1], 2, 2); });
    R(x, '#ffffff', 19, 9, 3, 3);
    // wings (membranes from wrists to feet)
    var s = wide ? 6 : 0;
    poly(x, WINGD, [[7, 13], [1 - s, 16], [3 - s * 0.5, 21], [8, 21]]); poly(x, WING, [[7, 14], [2 - s, 16], [4 - s * 0.5, 20], [8, 20]]);
    poly(x, WINGD, [[17, 13], [23 + s, 16], [21 + s * 0.5, 21], [16, 21]]); poly(x, WING, [[17, 14], [22 + s, 16], [20 + s * 0.5, 20], [16, 20]]);
    // ears
    ell(x, O, 4, 6, 4.6, 6); ell(x, F, 4, 6, 3.6, 5); ell(x, EIN, 4.4, 6.6, 2, 3.4);
    ell(x, O, 20, 6, 4.6, 6); ell(x, F, 20, 6, 3.6, 5); ell(x, EIN, 19.6, 6.6, 2, 3.4);
    // body and head
    ell(x, O, 12, 17.5, 5.6, 5.4); ell(x, F, 12, 17.5, 4.6, 4.4); ell(x, FL, 12, 18.4, 3, 3);
    ell(x, O, 12, 10.5, 6.6, 5.8); ell(x, F, 12, 10.5, 5.6, 4.9); R(x, FD, 8, 14, 8, 1);
    // big green eyes
    [9, 15].forEach(function (ex) { ell(x, O, ex, 10, 2.5, 2.7); ell(x, EYE, ex, 10, 1.9, 2.1); R(x, O, ex - 0.5, 10, 1.4, 1.6); R(x, '#ffffff', ex - 1.4, 8.6, 1, 1); });
    R(x, O, 11, 12.6, 2, 1); R(x, O, 10, 14, 1, 1); R(x, O, 13, 14, 1, 1); R(x, O, 11, 14.6, 2, 1);
    // feet
    R(x, O, 7, 21, 4, 3); R(x, FD, 8, 21, 2, 2); R(x, O, 13, 21, 4, 3); R(x, FD, 14, 21, 2, 2);
  }
  function mumuBack(x) {
    poly(x, WINGD, [[7, 13], [1, 16], [3, 21], [8, 21]]); poly(x, WING, [[7, 14], [2, 16], [4, 20], [8, 20]]);
    poly(x, WINGD, [[17, 13], [23, 16], [21, 21], [16, 21]]); poly(x, WING, [[17, 14], [22, 16], [20, 20], [16, 20]]);
    ell(x, O, 4, 6, 4.6, 6); ell(x, FD, 4, 6, 3.6, 5); ell(x, O, 20, 6, 4.6, 6); ell(x, FD, 20, 6, 3.6, 5);
    ell(x, O, 12, 17.5, 5.6, 5.4); ell(x, F, 12, 17.5, 4.6, 4.4);
    ell(x, O, 12, 10.5, 6.6, 5.8); ell(x, F, 12, 10.5, 5.6, 4.9); R(x, FD, 10, 6, 4, 2); R(x, FD, 11, 5, 2, 1);
    R(x, O, 7, 21, 4, 3); R(x, FD, 8, 21, 2, 2); R(x, O, 13, 21, 4, 3); R(x, FD, 14, 21, 2, 2);
    // tail in front when seen from behind
    [[12, 22], [14, 20], [16, 18], [17, 16], [17, 14], [16, 12]].forEach(function (p, i) { R(x, O, p[0] - 1, p[1] - 1, 4, 4); R(x, i % 2 ? '#ffffff' : F, p[0], p[1], 2, 2); });
    R(x, '#ffffff', 15, 10, 3, 3);
  }
  var MUMU = { front: mk(24, 25, function (x) { mumuFront(x, false); }), back: mk(24, 25, mumuBack), glide: mk(36, 25, function (x) { x.translate(6, 0); mumuFront(x, true); }) };
  MUMU.frontL = flip(MUMU.front); MUMU.backL = flip(MUMU.back); MUMU.glideL = flip(MUMU.glide);

  // ------------------------------------------------------------------ monsters (all original, from Leah's world)
  var SPR = {};
  SPR.bag = mk(18, 18, function (x) {   // rolling trash bag
    ell(x, '#0e0e12', 9, 11, 8, 6.6); ell(x, '#24242c', 9, 11, 7, 5.8); ell(x, '#4a4a58', 6, 9, 2.4, 1.8);
    poly(x, '#0e0e12', [[7, 5], [9, 1], [11, 5]]); R(x, '#FDC921', 7, 4, 4, 1);
    R(x, '#ffffff', 5, 10, 3, 3); R(x, '#ffffff', 10, 10, 3, 3); R(x, '#e8392f', 6, 11, 2, 2); R(x, '#e8392f', 11, 11, 2, 2); R(x, '#ffffff', 5, 9, 3, 1); R(x, '#ffffff', 10, 9, 3, 1);
    R(x, '#0e0e12', 4, 8, 4, 1); R(x, '#0e0e12', 10, 8, 4, 1); R(x, '#9a9aa8', 7, 15, 4, 1);
  });
  SPR.crab = mk(22, 16, function (x) {
    for (var l = 0; l < 3; l++) { R(x, '#a01e18', 3 + l * 2, 11 + l, 3, 1); R(x, '#a01e18', 16 - l * 2, 11 + l, 3, 1); }
    ell(x, '#7a140e', 11, 10, 7.6, 4.8); ell(x, '#e8392f', 11, 10, 6.8, 4); ell(x, '#ff7a5a', 9, 8.6, 3, 1.4);
    ell(x, '#7a140e', 3, 5, 3.4, 3); ell(x, '#e8392f', 3, 5, 2.6, 2.2); R(x, '#7a140e', 2, 2, 2, 3);
    ell(x, '#7a140e', 19, 5, 3.4, 3); ell(x, '#e8392f', 19, 5, 2.6, 2.2); R(x, '#7a140e', 18, 2, 2, 3);
    R(x, '#7a140e', 8, 3, 1, 4); R(x, '#7a140e', 13, 3, 1, 4); R(x, '#ffffff', 7, 1, 3, 3); R(x, '#ffffff', 12, 1, 3, 3); R(x, '#111', 8, 2, 1, 1); R(x, '#111', 13, 2, 1, 1);
    R(x, '#3a0a08', 9, 11, 4, 1);
  });
  SPR.jackalope = mk(20, 20, function (x) {
    R(x, '#6a4a28', 12, 0, 1, 6); R(x, '#6a4a28', 10, 1, 2, 1); R(x, '#6a4a28', 16, 0, 1, 6); R(x, '#6a4a28', 17, 1, 2, 1);
    ell(x, '#7a5a38', 9, 6, 1.8, 4.2); ell(x, '#c9a77a', 9, 6, 1.2, 3.6); ell(x, '#e8a6a0', 9, 6.4, 0.6, 2.6);
    ell(x, '#7a5a38', 9, 14, 7, 5); ell(x, '#c9a77a', 9, 14, 6.2, 4.3); ell(x, '#e6d2b0', 10, 16, 3.6, 2); ell(x, '#ffffff', 2.5, 13, 2, 2);
    ell(x, '#7a5a38', 14, 9, 4.4, 3.8); ell(x, '#c9a77a', 14, 9, 3.6, 3.1); R(x, '#111', 15, 8, 1, 2); R(x, '#e88aa0', 17, 10, 1, 1);
    R(x, '#7a5a38', 5, 18, 4, 2); R(x, '#7a5a38', 11, 18, 4, 2);
  });
  SPR.bigfoot = mk(18, 22, function (x) {   // mini Bigfoot: un-paints the stones (harmless, catch him!)
    ell(x, '#2e1c0e', 9, 13, 7, 8); ell(x, '#5a3a22', 9, 13, 6.2, 7.2);
    for (var k = 0; k < 6; k++) { R(x, k % 2 ? '#7a5232' : '#3a2414', 4 + k * 2, 9 + (k * 5) % 9, 1, 3); }
    ell(x, '#2e1c0e', 9, 5, 5, 4.6); ell(x, '#5a3a22', 9, 5, 4.3, 4); ell(x, '#8a6a4a', 9.6, 6, 3, 2.6);
    R(x, '#111', 8, 5, 1, 1); R(x, '#111', 11, 5, 1, 1); R(x, '#3a2414', 9, 7, 2, 1);
    R(x, '#2e1c0e', 3, 19, 5, 3); R(x, '#2e1c0e', 10, 19, 5, 3);
  });
  SPR.ghost = mk(18, 20, function (x) {
    ell(x, '#9aa6c8', 9, 8, 7.2, 7.4); R(x, '#9aa6c8', 1.8, 8, 14.4, 8); ell(x, '#f4f6ff', 9, 8, 6.4, 6.6); R(x, '#f4f6ff', 2.6, 8, 12.8, 8);
    for (var i = 0; i < 4; i++) { poly(x, '#f4f6ff', [[2.6 + i * 3.2, 15], [4.2 + i * 3.2, 19], [5.8 + i * 3.2, 15]]); }
    ell(x, '#14141c', 6.6, 8, 1.6, 2.2); ell(x, '#14141c', 11.4, 8, 1.6, 2.2); ell(x, '#14141c', 9, 12.4, 1.4, 1.6);
  });
  SPR.bird = mk(20, 16, function (x) {
    poly(x, '#3a3a8a', [[2, 5], [9, 8], [6, 12]]); poly(x, '#3a3a8a', [[18, 5], [11, 8], [14, 12]]);
    ell(x, '#2a2a6a', 10, 9, 5.6, 5); ell(x, '#6a5ad8', 10, 9, 4.8, 4.2); ell(x, '#c8c0ff', 10, 11, 2.6, 2);
    R(x, '#ffffff', 7, 6, 2, 2); R(x, '#ffffff', 11, 6, 2, 2); R(x, '#111', 8, 7, 1, 1); R(x, '#111', 12, 7, 1, 1);
    poly(x, '#ff8a1f', [[9, 9], [11, 9], [10, 12]]); R(x, '#ff8a1f', 7, 14, 2, 2); R(x, '#ff8a1f', 11, 14, 2, 2);
  });
  SPR.lava = mk(18, 16, function (x) {
    ell(x, '#7a1e0a', 9, 10, 8, 6); ell(x, '#ff5a1e', 9, 10, 7.2, 5.2); ell(x, '#FDC921', 8, 9, 3.6, 2.4); ell(x, '#fff3b0', 7, 8, 1.4, 0.9);
    poly(x, '#ff5a1e', [[5, 6], [6, 1], [8, 5]]); poly(x, '#ff5a1e', [[10, 5], [12, 2], [13, 6]]);
    R(x, '#3a0a04', 5, 10, 2, 2); R(x, '#3a0a04', 11, 10, 2, 2); R(x, '#3a0a04', 7, 13, 4, 1);
  });
  SPR.smoke = mk(20, 18, function (x) {
    ell(x, '#6a6a74', 6, 11, 5, 4.6); ell(x, '#6a6a74', 13, 10, 5.6, 5.2); ell(x, '#6a6a74', 10, 5, 4.4, 4);
    ell(x, '#9a9aa6', 6, 11, 4.2, 3.8); ell(x, '#9a9aa6', 13, 10, 4.8, 4.4); ell(x, '#b8b8c4', 10, 5, 3.6, 3.2);
    R(x, '#ff4a2a', 8, 9, 2, 2); R(x, '#ff4a2a', 12, 9, 2, 2); R(x, '#3a3a44', 9, 13, 4, 1);
  });
  SPR.shark = mk(36, 28, function (x) {   // the Fire Shark (boss of the last round)
    poly(x, '#ff8a1f', [[12, 9], [15, 1], [17, 6], [19, 0], [21, 9]]); poly(x, '#FDC921', [[14, 9], [16, 4], [18, 7], [19, 4], [20, 9]]);
    poly(x, '#4a5260', [[16, 9], [20, 2], [24, 10]]);
    ell(x, '#2a303a', 18, 16, 15.4, 8.4); ell(x, '#6a7484', 18, 15, 14.6, 7.6); ell(x, '#e8ecf0', 21, 19, 10, 4);
    poly(x, '#6a7484', [[3, 15], [0, 8], [6, 13]]); poly(x, '#6a7484', [[3, 15], [0, 22], [6, 17]]);
    R(x, '#ffffff', 25, 11, 4, 4); R(x, '#e8392f', 26, 12, 2, 2);
    poly(x, '#2a0a0a', [[22, 18], [33, 17], [30, 22], [24, 22]]);
    for (var t = 0; t < 4; t++) { poly(x, '#ffffff', [[24 + t * 2.4, 18], [25.2 + t * 2.4, 20.4], [26.4 + t * 2.4, 18]]); }
  });
  SPR.heart = mk(11, 10, function (x) {
    R(x, '#7a0a14', 1, 1, 4, 3); R(x, '#7a0a14', 6, 1, 4, 3); R(x, '#7a0a14', 0, 2, 11, 3); R(x, '#7a0a14', 1, 5, 9, 2); R(x, '#7a0a14', 3, 7, 5, 2); R(x, '#7a0a14', 5, 9, 1, 1);
    R(x, '#ff3a5a', 2, 2, 2, 2); R(x, '#ff3a5a', 7, 2, 2, 2); R(x, '#ff3a5a', 1, 3, 9, 2); R(x, '#ff3a5a', 2, 5, 7, 1); R(x, '#ff3a5a', 4, 6, 3, 2); R(x, '#ffb0c0', 2, 2, 1, 1);
  });
  SPR.cloud = mk(28, 16, function (x) {   // escape cloud: hop on it to fly back to the top
    ell(x, '#9ab0d8', 14, 10, 13, 5.6); ell(x, '#9ab0d8', 9, 7, 6, 5); ell(x, '#9ab0d8', 18, 6, 7, 5.4);
    ell(x, '#ffffff', 14, 10, 12, 4.8); ell(x, '#ffffff', 9, 7, 5.2, 4.2); ell(x, '#ffffff', 18, 6, 6.2, 4.6);
    R(x, '#FDC921', 4, 3, 1, 3); R(x, '#FDC921', 3, 4, 3, 1); R(x, '#99D6EA', 24, 2, 1, 3); R(x, '#99D6EA', 23, 3, 3, 1);
  });
  SPR.bagL = flip(SPR.bag); SPR.crabL = flip(SPR.crab); SPR.jackalopeL = flip(SPR.jackalope); SPR.bigfootL = flip(SPR.bigfoot);
  SPR.ghostL = flip(SPR.ghost); SPR.birdL = flip(SPR.bird); SPR.lavaL = flip(SPR.lava); SPR.smokeL = flip(SPR.smoke); SPR.sharkL = flip(SPR.shark);

  // kind: bounce = hops down and falls off the bottom; chase = follows Mumu; undo = un-paints stones (catch it); ghost = wanders, only hurts when visible
  var MON = {
    bag: { kind: 'bounce', name: 'trash bag', per: 0.95 }, crab: { kind: 'chase', name: 'crab', per: 1.1 },
    jackalope: { kind: 'chase', name: 'jackalope', per: 0.9 }, bigfoot: { kind: 'undo', name: 'mini Bigfoot', per: 1.0 },
    ghost: { kind: 'ghost', name: 'ghost', per: 0.95 }, bird: { kind: 'chase', name: 'bird', per: 0.7, rest: 4 },
    lava: { kind: 'bounce', name: 'lava blob', per: 0.75 }, smoke: { kind: 'chase', name: 'smoke wisp', per: 1.0 },
    shark: { kind: 'chase', name: 'Fire Shark', per: 0.85, boss: true }
  };

  // ------------------------------------------------------------------ levels: Water, Earth, Air, Fire. tops = start, middle, finished colour.
  var LEVELS = [
    { name: 'WATER', sub: 'Paint the sea stones', tops: ['#1f4f8a', '#3f8ad0', '#99D6EA'], sideL: '#16365e', sideR: '#0e2440', mons: ['bag', 'bag', 'crab'], bg: 'water' },
    { name: 'EARTH', sub: 'Grow the canyon garden', tops: ['#7a5230', '#c8a050', '#5fc048'], sideL: '#5a3a20', sideR: '#3e2814', mons: ['jackalope', 'bigfoot', 'jackalope'], bg: 'earth' },
    { name: 'AIR', sub: 'Light up the sky stones', tops: ['#7a8cb0', '#c8d8f0', '#FDD85D'], sideL: '#5a6a90', sideR: '#3e4c70', mons: ['ghost', 'ghost', 'bird'], bg: 'air' },
    { name: 'FIRE', sub: 'Cool the volcano... with gold', tops: ['#7a2a1e', '#e8641e', '#FDC921'], sideL: '#3a1010', sideR: '#260808', mons: ['lava', 'lava', 'smoke'], bg: 'fire' }
  ];
  var ROUND_RULE = ['Hop once on every stone.', 'Two hops per stone this time.', 'Careful: hopping a finished stone undoes it!'];

  // backgrounds, drawn once per level
  function makeBg(kind) {
    return mk(W, H, function (x) {
      var i, gr;
      if (kind === 'water') {
        gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#0e3a6a'); gr.addColorStop(1, '#06203e'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        for (i = 0; i < 40; i++) { R(x, 'rgba(153,214,234,.35)', (i * 73) % W, (i * 41) % H, 2, 2); }
        for (i = 0; i < 6; i++) { ell(x, 'rgba(10,30,60,.6)', 30 + i * 52, 200 + (i % 2) * 14, 9, 4); poly(x, 'rgba(10,30,60,.6)', [[39 + i * 52, 200 + (i % 2) * 14], [46 + i * 52, 195 + (i % 2) * 14], [46 + i * 52, 205 + (i % 2) * 14]]); }
        for (i = 0; i < 12; i++) { R(x, '#2a6a8a', i * 28, 226 + (i % 2) * 3, 16, 2); }
      } else if (kind === 'earth') {
        gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f0a868'); gr.addColorStop(0.6, '#f6d08a'); gr.addColorStop(1, '#c8783a'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        ell(x, '#fff0b0', 270, 40, 18, 18);
        poly(x, '#b85a2a', [[0, 200], [0, 120], [40, 120], [40, 150], [90, 150], [90, 200]]); poly(x, '#9a4a20', [[230, 200], [230, 110], [290, 110], [290, 140], [320, 140], [320, 200]]);
        R(x, '#7a8a3a', 0, 200, W, 40); for (i = 0; i < 30; i++) { R(x, '#5a6a2a', (i * 37) % W, 204 + (i * 7) % 30, 3, 2); }
      } else if (kind === 'air') {
        gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6aa8e8'); gr.addColorStop(1, '#d8eeff'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        [[30, 40], [250, 30], [280, 150], [20, 170], [140, 220], [300, 220]].forEach(function (p) { ell(x, 'rgba(255,255,255,.85)', p[0], p[1], 22, 7); ell(x, 'rgba(255,255,255,.85)', p[0] + 10, p[1] - 5, 12, 6); });
        for (i = 0; i < 5; i++) { R(x, '#3a4a6a', 60 + i * 50, 20 + (i % 3) * 12, 3, 1); R(x, '#3a4a6a', 63 + i * 50, 19 + (i % 3) * 12, 3, 1); }
      } else {
        gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a0606'); gr.addColorStop(0.7, '#4a0e08'); gr.addColorStop(1, '#a8320e'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        poly(x, '#2a0a06', [[0, 240], [0, 170], [50, 130], [80, 150], [110, 240]]); poly(x, '#2a0a06', [[200, 240], [250, 140], [290, 120], [320, 160], [320, 240]]);
        poly(x, '#ff5a1e', [[282, 124], [290, 120], [298, 126], [292, 140]]);
        for (i = 0; i < 10; i++) { R(x, '#ff8a1f', (i * 61) % W, 228 + (i % 3) * 3, 18, 3); }
      }
    });
  }

  // ------------------------------------------------------------------ geometry
  function pos(r, c) { return { x: 160 + (c - r / 2) * 32, y: TOP + r * 24 }; }
  function onPyr(r, c) { return r >= 0 && r < ROWS && c >= 0 && c <= r; }
  var DIRS = { ul: [-1, -1], ur: [-1, 0], dl: [1, 0], dr: [1, 1] };

  // ------------------------------------------------------------------ state
  var el = { start: document.getElementById('gameStart'), over: document.getElementById('gameOver'), win: document.getElementById('gameWin'),
    score: document.getElementById('hudScore'), lives: document.getElementById('hudLives'), level: document.getElementById('hudLevel'), glide: document.getElementById('hudGlide') };
  var mode = 'idle', level = 1, round = 1, L = LEVELS[0], bg = null, tiles = [], steps = 1, toggle = false;
  var score = 0, lives = 3, glides = 2, armed = false, lifeIdx = 0, mons = [], clouds = [], heart = null, spawnT = 0, heartT = 0;
  var mumu = null, toast = '', toastT = 0, cardT = 0, deadT = 0, clearT = 0, tick = 0, clockMs = 0, god = false, bubble = 0;
  var runNonce = '', me = { name: '', fan: false }, finalScore = 0, finalLevel = 1, finalWon = false, finalMs = 0, ST = null, keysHeld = {}, queued = null;

  function resetStats() { ST = { hops: 0, painted: 0, glides: 0, clouds: 0, lured: 0, bigfoots: 0, hearts: 0, falls: 0, bonks: 0, crabs: 0, ghosts: 0, undone: 0 }; }
  resetStats();

  function newMumu() { return { r: 0, c: 0, fr: 0, fc: 0, t: 1, dur: HOP, face: 'front', left: false, gliding: false, cloud: null, fall: null }; }

  function loadRound() {
    L = LEVELS[level - 1];
    steps = round === 2 ? 2 : 1; toggle = round === 3;
    tiles = []; for (var r = 0; r < ROWS; r++) { tiles.push(new Array(r + 1).fill(0)); }
    mons = []; heart = null; heartT = 8 + Math.random() * 10; spawnT = 2.5;
    // two escape clouds, one each side, on random rows
    var rl = 2 + Math.floor(Math.random() * 4), rr = 2 + Math.floor(Math.random() * 4);
    clouds = [{ r: rl, c: -1, used: false }, { r: rr, c: rr + 1, used: false }];
    mumu = newMumu();
    if (level === 4 && round === 3) { spawnMon('shark'); }
    mode = 'card'; cardT = 2.4; armed = false; hud();
  }
  function startLevel(n) { level = n; round = 1; glides = 2; bg = makeBg(LEVELS[n - 1].bg); loadRound(); }

  // ------------------------------------------------------------------ monsters
  function spawnMon(type) {
    var m = MON[type], c = Math.random() < 0.5 ? 0 : 1;
    var o = { type: type, kind: m.kind, r: 1, c: c, fr: 1, fc: c, t: 1, dur: 0.3, wait: 0.6, drop: 0.5, left: Math.random() < 0.5, hops: 0, vis: 0, dead: false, fall: null, rest: 0 };
    if (m.boss) { o.r = 4; o.c = 2; o.fr = 4; o.fc = 2; o.drop = 1.0; o.wait = 1.6; }
    if (type === 'crab') { ST.crabs++; }
    if (type === 'ghost') { ST.ghosts++; }
    mons.push(o);
    return o;
  }
  function monPeriod(o) { return MON[o.type].per * (1 - 0.06 * (level - 1) - 0.05 * (round - 1)); }
  function hopMon(o, r2, c2) { o.fr = o.r; o.fc = o.c; o.r = r2; o.c = c2; o.t = 0; o.dur = Math.min(0.3, monPeriod(o) * 0.5); o.hops++; if (c2 - r2 / 2 !== o.fc - o.fr / 2) { o.left = (c2 - r2 / 2) < (o.fc - o.fr / 2); } }
  function chaseTarget() {
    if (mumu.cloud) { return { r: mumu.cloud.r, c: mumu.cloud.c, lure: true }; }   // the chaser follows Mumu onto the cloud... and falls
    return { r: mumu.r, c: mumu.c };
  }
  function monThink(o) {
    var opts = [], k, d;
    if (o.kind === 'bounce' || o.kind === 'undo') {
      if (o.r + 1 >= ROWS) { o.fall = { t: 0, x: 0 }; return; }
      hopMon(o, o.r + 1, o.c + (Math.random() < 0.5 ? 0 : 1));
    } else if (o.kind === 'ghost') {
      if (o.hops > 14) { o.dead = true; return; }
      for (k in DIRS) { d = DIRS[k]; if (onPyr(o.r + d[0], o.c + d[1])) { opts.push([o.r + d[0], o.c + d[1]]); } }
      var p = pick(opts); hopMon(o, p[0], p[1]);
    } else {   // chase
      var tg = chaseTarget(), best = null, bd = 1e9, tp = pos(tg.r, tg.c);
      for (k in DIRS) {
        d = DIRS[k]; var r2 = o.r + d[0], c2 = o.c + d[1];
        var ok = onPyr(r2, c2) || (tg.lure && r2 === tg.r && c2 === tg.c);
        if (!ok) { continue; }
        var pp = pos(r2, c2), dist = Math.hypot(pp.x - tp.x, pp.y - tp.y) + Math.random() * 3;
        if (dist < bd) { bd = dist; best = [r2, c2]; }
      }
      if (best) { hopMon(o, best[0], best[1]); }
    }
  }
  function updateMons(dt) {
    mons.forEach(function (o) {
      if (o.fall) { o.fall.t += dt; if (o.fall.t > 1.2) { o.dead = true; } return; }
      if (o.drop > 0) { o.drop -= dt; return; }
      if (o.kind === 'ghost') { o.vis += dt; }
      if (o.t < 1) {
        o.t = Math.min(1, o.t + dt / o.dur);
        if (o.t >= 1) { landMon(o); }
        return;
      }
      o.wait -= dt;
      if (o.wait <= 0) {
        var m = MON[o.type];
        o.wait = monPeriod(o);
        if (m.rest && o.hops > 0 && o.hops % m.rest === 0 && o.rest <= 0) { o.rest = 1; o.wait = 1.0; return; }
        o.rest = 0;
        monThink(o);
      }
    });
    mons = mons.filter(function (o) { return !o.dead; });
  }
  function landMon(o) {
    if (!onPyr(o.r, o.c)) {   // lured off the pyramid
      o.fall = { t: 0 };
      if (MON[o.type].kind === 'chase') {
        var pts = MON[o.type].boss ? 3000 : 500; addScore(pts); ST.lured++;
        say((MON[o.type].boss ? 'FIRE SHARK' : MON[o.type].name.toUpperCase()) + ' TOOK THE PLUNGE! +' + pts); SFX.lure();
      }
      return;
    }
    if (o.kind === 'undo' && tiles[o.r][o.c] > 0) { tiles[o.r][o.c]--; ST.undone++; SFX.undo(); }
  }
  function spawnLogic(dt) {
    spawnT -= dt;
    if (spawnT > 0) { return; }
    spawnT = Math.max(1.6, 4.6 - 0.45 * level - 0.4 * round) + Math.random() * 1.2;
    var maxN = 2 + (round >= 2 ? 1 : 0) + (level >= 3 ? 1 : 0);
    if (mons.length >= maxN) { return; }
    var type = pick(L.mons);
    var chasers = mons.filter(function (o) { return o.kind === 'chase'; }).length, undos = mons.filter(function (o) { return o.kind === 'undo'; }).length;
    if (MON[type].kind === 'chase' && chasers >= (level === 4 && round === 3 ? 2 : 1)) { type = L.mons[0]; if (MON[type].kind === 'chase') { return; } }
    if (MON[type].kind === 'undo' && undos >= 1) { type = 'jackalope'; if (chasers >= 1) { return; } }
    spawnMon(type);
  }

  // ------------------------------------------------------------------ Mumu moves
  function hopTo(dir) {
    if (mode !== 'play' || !mumu || mumu.t < 1 || mumu.cloud || mumu.fall) { return; }
    var d = DIRS[dir], n = armed ? 2 : 1, r2 = mumu.r + d[0] * n, c2 = mumu.c + d[1] * n;
    mumu.fr = mumu.r; mumu.fc = mumu.c; mumu.r = r2; mumu.c = c2; mumu.t = 0;
    mumu.face = d[0] > 0 ? 'front' : 'back'; mumu.left = d[0] > 0 ? d[1] === 0 : d[1] !== 0;
    mumu.gliding = armed; mumu.dur = armed ? GLIDE_HOP : HOP;
    if (armed) { armed = false; glides--; ST.glides++; SFX.glide(); hud(); } else { SFX.hop(); }
    ST.hops++;
  }
  function landMumu() {
    var r = mumu.r, c = mumu.c;
    mumu.gliding = false;
    var cl = clouds.filter(function (q) { return !q.used && q.r === r && q.c === c; })[0];
    if (cl) { cl.used = true; mumu.cloud = { r: r, c: c, t: 0, sx: pos(r, c).x, sy: pos(r, c).y }; ST.clouds++; SFX.cloud(); say('WHEEE! BACK TO THE TOP'); return; }
    if (!onPyr(r, c)) { mumu.fall = { t: 0 }; ST.falls++; SFX.fall(); return; }
    paint(r, c);
    if (heart && heart.r === r && heart.c === c) { heart = null; ST.hearts++; lives = Math.min(MAX_LIVES, lives + 1); addScore(100); say('EXTRA LIFE!'); SFX.heart(); hud(); }
    checkClear();
  }
  function paint(r, c) {
    var v = tiles[r][c];
    if (toggle) {
      if (v === 0) { tiles[r][c] = 1; addScore(25); ST.painted++; SFX.paint(); } else { tiles[r][c] = 0; SFX.undo(); }
    } else if (v < steps) {
      tiles[r][c] = v + 1; addScore(v + 1 === steps ? 25 : 15); if (v + 1 === steps) { ST.painted++; } SFX.paint();
    }
  }
  function target() { return toggle ? 1 : steps; }
  function checkClear() {
    for (var r = 0; r < ROWS; r++) { for (var c = 0; c <= r; c++) { if (tiles[r][c] !== target()) { return; } } }
    var bonus = 1000 * level + 100 * clouds.filter(function (q) { return !q.used; }).length;
    addScore(bonus); mode = 'clear'; clearT = 2.2; mons = []; heart = null; SFX.clear();
    say('ROUND CLEAR! +' + fmtN(bonus));
  }
  function nextRound() {
    if (round < 3) { round++; loadRound(); return; }
    if (level < 4) { startLevel(level + 1); SFX.level(); return; }
    gameWon();
  }
  function addScore(n) {
    score += n;
    while (lifeIdx < LIFE_AT.length && score >= LIFE_AT[lifeIdx]) { lifeIdx++; if (lives < MAX_LIVES) { lives++; say('EXTRA LIFE AT ' + fmtN(LIFE_AT[lifeIdx - 1]) + '!'); SFX.heart(); } }
    hud();
  }
  function say(t) { toast = t; toastT = 1.8; }
  function hurt(byMon) {
    if (god || mode !== 'play') { return; }
    mode = 'dead'; deadT = 1.4; bubble = 1.4; ST.bonks++; SFX.bonk();
    say(byMon ? 'OUCH! A ' + MON[byMon.type].name.toUpperCase() + '!' : 'OOPS!');
  }
  function afterDeath() {
    lives--; hud();
    if (lives <= 0) { gameOver(); return; }
    mons = mons.filter(function (o) { return MON[o.type].boss; });
    mons.forEach(function (o) { o.r = 4; o.c = 2; o.fr = 4; o.fc = 2; o.t = 1; o.fall = null; o.drop = 1.2; o.wait = 1.8; });
    mumu = newMumu(); mode = 'play'; spawnT = 2.5;
  }
  function tileOf(o) { return o.t < 0.5 ? { r: o.fr, c: o.fc } : { r: o.r, c: o.c }; }
  function collide() {
    if (mode !== 'play' || mumu.cloud || mumu.fall || mumu.gliding) { return; }
    var mt = tileOf(mumu);
    for (var i = 0; i < mons.length; i++) {
      var o = mons[i];
      if (o.drop > 0 || o.fall) { continue; }
      var ot = tileOf(o);
      if (ot.r !== mt.r || ot.c !== mt.c) { continue; }
      if (o.kind === 'undo') { o.dead = true; addScore(300); ST.bigfoots++; say('CAUGHT MINI BIGFOOT! +300'); SFX.catch(); continue; }
      if (o.kind === 'ghost' && !ghostVisible(o)) { continue; }
      hurt(o); return;
    }
  }
  function ghostVisible(o) { return (o.vis % 3.4) < 2.0; }

  // ------------------------------------------------------------------ main update
  function update(dt) {
    tick += dt;
    if (toastT > 0) { toastT -= dt; }
    if (bubble > 0) { bubble -= dt; }
    if (mode === 'card') { cardT -= dt; if (cardT <= 0) { mode = 'play'; } return; }
    if (mode === 'clear') { clearT -= dt; if (clearT <= 0) { nextRound(); } return; }
    if (mode === 'dead') { deadT -= dt; if (deadT <= 0) { afterDeath(); } return; }
    if (mode !== 'play') { return; }
    clockMs += dt * 1000;
    // Mumu
    if (mumu.fall) { mumu.fall.t += dt; if (mumu.fall.t > 1.0) { mumu.fall = null; mode = 'dead'; deadT = 0.3; bubble = 0; } }
    else if (mumu.cloud) {
      var q = mumu.cloud; q.t += dt / 1.6;
      if (q.t >= 1) { mumu.cloud = null; mumu.r = 0; mumu.c = 0; mumu.fr = 0; mumu.fc = 0; mumu.t = 1; mumu.face = 'front'; paint(0, 0); checkClear(); }
    } else if (mumu.t < 1) {
      mumu.t = Math.min(1, mumu.t + dt / mumu.dur);
      if (mumu.t >= 1) { landMumu(); }
    } else {
      var held = queued || ['ul', 'ur', 'dl', 'dr'].filter(function (k) { return keysHeld[k]; })[0];
      queued = null;
      if (held) { hopTo(held); }
    }
    if (mode !== 'play') { return; }
    spawnLogic(dt);
    updateMons(dt);
    // heart power-up
    heartT -= dt;
    if (heart) { heart.t -= dt; if (heart.t <= 0) { heart = null; } }
    else if (heartT <= 0) {
      heartT = 18 + Math.random() * 14;
      var hr = 2 + Math.floor(Math.random() * 5), hc = Math.floor(Math.random() * (hr + 1));
      if (!(hr === mumu.r && hc === mumu.c)) { heart = { r: hr, c: hc, t: 8 }; SFX.pop(); }
    }
    collide();
  }

  // ------------------------------------------------------------------ drawing
  function drawCube(r, c, top) {
    var p = pos(r, c), x = p.x, y = p.y;
    poly(g, L.sideL, [[x - 16, y], [x, y + 8], [x, y + 24], [x - 16, y + 16]]);
    poly(g, L.sideR, [[x + 16, y], [x, y + 8], [x, y + 24], [x + 16, y + 16]]);
    poly(g, top, [[x, y - 8], [x + 16, y], [x, y + 8], [x - 16, y]]);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 1, y - 7, 2, 1);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 16, y, 1, 16); g.fillRect(x + 15, y, 1, 16);
  }
  function topColor(v) {
    if (toggle) { return v ? L.tops[2] : L.tops[0]; }
    if (steps === 1) { return v ? L.tops[2] : L.tops[0]; }
    return L.tops[v];
  }
  function entXY(o) {
    var a = pos(o.fr, o.fc), b = pos(o.r, o.c), t = o.t;
    var hgt = (o.gliding ? 26 : 12) * Math.sin(Math.PI * t);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - hgt };
  }
  function draw() {
    g.drawImage(bg || (bg = makeBg('water')), 0, 0);
    if (mode === 'fire' || L.bg === 'fire') { for (var e = 0; e < 8; e++) { var ey = (H - ((tick * 30 + e * 37) % H)); g.fillStyle = 'rgba(255,170,60,.8)'; g.fillRect((e * 47 + Math.sin(tick + e) * 6) % W, ey, 1, 2); } }
    var flash = mode === 'clear' && Math.floor(tick * 8) % 2;
    var r, c;
    for (r = 0; r < ROWS; r++) { for (c = 0; c <= r; c++) { drawCube(r, c, flash ? '#ffffff' : topColor(tiles[r] ? tiles[r][c] : 0)); } }
    // clouds
    clouds.forEach(function (q) { if (q.used) { return; } var p = pos(q.r, q.c); g.drawImage(SPR.cloud, Math.round(p.x - 14), Math.round(p.y - 8 + Math.sin(tick * 3 + q.r) * 2)); });
    // heart
    if (heart) { var hp = pos(heart.r, heart.c); if (heart.t > 2 || Math.floor(tick * 8) % 2) { g.drawImage(SPR.heart, Math.round(hp.x - 5), Math.round(hp.y - 16 + Math.sin(tick * 5) * 2)); } }
    // entities sorted by row so the ones lower down are drawn in front
    var list = mons.slice(); if (mumu && mode !== 'idle') { list.push({ mumu: true, r: mumu.r }); }
    list.sort(function (a, b) { return a.r - b.r; });
    list.forEach(function (o) { if (o.mumu) { drawMumu(); } else { drawMon(o); } });
    // target colour reminder
    g.fillStyle = 'rgba(16,32,46,.7)'; g.fillRect(W - 70, 4, 66, 22);
    g.font = 'bold 7px monospace'; g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.fillText('PAINT TO:', W - 66, 17);
    poly(g, L.tops[2], [[W - 16, 9], [W - 8, 13], [W - 16, 17], [W - 24, 13]]);
    // card / toast
    g.textAlign = 'center';
    if (mode === 'card') {
      g.fillStyle = 'rgba(16,32,46,.82)'; g.fillRect(0, 76, W, 82);
      g.fillStyle = '#FDC921'; g.font = 'bold 11px monospace'; g.fillText('LEVEL ' + level + ' OF 4  -  ROUND ' + round + ' OF 3', W / 2, 94);
      g.fillStyle = '#ffffff'; g.font = 'bold 22px monospace'; g.fillText(L.name, W / 2, 120);
      g.fillStyle = '#99D6EA'; g.font = 'bold 9px monospace'; g.fillText(L.sub + ' - ' + ROUND_RULE[round - 1], W / 2, 138, W - 16);
      if (level === 4 && round === 3) { g.fillStyle = '#ff8a1f'; g.fillText('BOSS: the Fire Shark! Lure it onto a cloud.', W / 2, 151, W - 16); }
    }
    if (toastT > 0) { g.fillStyle = 'rgba(16,32,46,.75)'; g.fillRect(20, 218, W - 40, 16); g.fillStyle = '#ffffff'; g.font = 'bold 9px monospace'; g.fillText(toast, W / 2, 229, W - 46); }
    if (armed && mode === 'play') { g.fillStyle = '#FDC921'; g.font = 'bold 9px monospace'; g.fillText('GLIDE READY: pick a direction (2 stones)', W / 2, 212, W - 40); }
  }
  function drawMumu() {
    var p, img;
    if (mumu.cloud) {
      var q = mumu.cloud, top = pos(0, 0), t = q.t, e = t * t * (3 - 2 * t);
      p = { x: q.sx + (top.x - q.sx) * e, y: q.sy + (top.y - 30 - q.sy) * e - Math.sin(Math.PI * t) * 20 };
      g.drawImage(SPR.cloud, Math.round(p.x - 14), Math.round(p.y - 6));
      g.drawImage(MUMU.front, Math.round(p.x - 12), Math.round(p.y - 26));
      return;
    }
    p = entXY(mumu);
    if (mumu.fall) { p.y += mumu.fall.t * mumu.fall.t * 260; }
    if (mumu.gliding) { img = mumu.left ? MUMU.glideL : MUMU.glide; g.drawImage(img, Math.round(p.x - 18), Math.round(p.y - 22)); }
    else {
      img = mumu.face === 'front' ? (mumu.left ? MUMU.frontL : MUMU.front) : (mumu.left ? MUMU.backL : MUMU.back);
      if (mode === 'dead' && Math.floor(tick * 10) % 2) { return; }
      g.drawImage(img, Math.round(p.x - 12), Math.round(p.y - 22));
    }
    if (armed && mumu.t >= 1) { g.fillStyle = 'rgba(253,201,33,.5)'; g.fillRect(Math.round(p.x - 14), Math.round(p.y + 2), 28, 2); }
    if (bubble > 0) {   // Mumu's cartoon grumble
      g.fillStyle = '#ffffff'; g.fillRect(Math.round(p.x + 6), Math.round(p.y - 36), 36, 13); poly(g, '#ffffff', [[p.x + 8, p.y - 23], [p.x + 14, p.y - 23], [p.x + 6, p.y - 17]]);
      g.fillStyle = '#e8392f'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('@!#?!', Math.round(p.x + 24), Math.round(p.y - 26));
    }
  }
  function drawMon(o) {
    var p = entXY(o), img = SPR[o.type + (o.left ? 'L' : '')];
    if (o.drop > 0) { p.y -= o.drop * 120; }
    if (o.fall) { p.y += o.fall.t * o.fall.t * 260; }
    var a = 1;
    if (o.kind === 'ghost') { a = ghostVisible(o) ? 0.95 : 0.25; }
    if (o.type === 'smoke') { a = 0.85; }
    g.globalAlpha = a;
    g.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height + 4));
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ sound (8-bit beeps)
  var ac = null, master = null, muted = false;
  function audio() {
    if (ac) { if (ac.state === 'suspended') { ac.resume(); } return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { return; }
    ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
  }
  function beep(f1, f2, dur, type, vol, delay) {
    if (!ac || muted) { return; }
    var o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime + (delay || 0);
    o.type = type || 'square'; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t + dur);
    v.gain.setValueAtTime(vol || 0.1, t); v.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(v); v.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  var SFX = {
    hop: function () { beep(330, 520, 0.07, 'square', 0.05); }, paint: function () { beep(660, 880, 0.05, 'triangle', 0.06, 0.02); },
    glide: function () { beep(300, 1200, 0.35, 'triangle', 0.09); }, cloud: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { beep(f, f, 0.1, 'square', 0.07, i * 0.08); }); },
    fall: function () { beep(800, 80, 0.9, 'square', 0.1); }, bonk: function () { for (var i = 0; i < 6; i++) { beep(200 + Math.random() * 600, 100 + Math.random() * 400, 0.06, 'square', 0.08, i * 0.06); } },
    catch: function () { beep(500, 1000, 0.15, 'square', 0.09); }, heart: function () { [784, 988, 1175].forEach(function (f, i) { beep(f, f, 0.1, 'triangle', 0.1, i * 0.09); }); },
    undo: function () { beep(400, 200, 0.08, 'triangle', 0.06); }, lure: function () { beep(900, 120, 0.8, 'triangle', 0.12); },
    clear: function () { [523, 659, 784, 659, 784, 1047].forEach(function (f, i) { beep(f, f, 0.11, 'square', 0.09, i * 0.1); }); },
    level: function () { [392, 523, 659, 784].forEach(function (f, i) { beep(f, f, 0.14, 'square', 0.09, 0.3 + i * 0.12); }); },
    over: function () { beep(400, 60, 1.0, 'triangle', 0.18); }, pop: function () { beep(900, 1400, 0.08, 'triangle', 0.05); }
  };
  document.getElementById('muteBtn').addEventListener('click', function () {
    muted = !muted; this.setAttribute('aria-pressed', muted ? 'true' : 'false'); this.textContent = muted ? 'Sound off' : 'Sound on';
    if (master) { master.gain.value = muted ? 0 : 0.5; }
  });

  // ------------------------------------------------------------------ hall of fame (game = "bert", ranked by score)
  var ELEM = ['Water', 'Earth', 'Air', 'Fire'];
  function api(body) {
    body.game = 'bert';
    return fetch('/api/scores.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function renderHof(list) {
    var ol = document.getElementById('hof');
    if (!ol) { return; }
    ol.textContent = '';
    if (!list || !list.length) { var li0 = document.createElement('li'); li0.className = 'hint'; li0.textContent = 'No scores yet. Be the first!'; ol.appendChild(li0); return; }
    list.forEach(function (r) {
      var li = document.createElement('li');
      if (r.mine) { li.className = 'me'; }
      var tt = document.createElement('span'); tt.className = 't'; tt.textContent = fmtN(r.score) + ' pts';
      var lv = document.createElement('span'); lv.className = 'lv'; lv.textContent = r.won ? 'Cleared all 4' : 'reached ' + ELEM[clamp(r.level, 1, 4) - 1];
      li.appendChild(document.createTextNode(r.name + ' ')); li.appendChild(lv); li.appendChild(tt);
      if (r.seen) { var sn = document.createElement('span'); sn.className = 'seen'; sn.textContent = 'last seen ' + r.seen; li.appendChild(sn); }
      ol.appendChild(li);
    });
  }
  function setMe(m) { if (!m) { return; } me = m; var j = document.getElementById('hofJoin'); if (j) { j.hidden = !!m.fan; } }
  function loadHof() {
    fetch('/api/scores.php?game=bert', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
      .then(function (d) { setMe(d.me); renderHof(d.top); }).catch(function () { renderHof([]); });
  }
  function saveRun(noteEl) {
    noteEl.textContent = '';
    api({ action: 'submit', nonce: runNonce, score: finalScore, level: finalLevel, won: finalWon }).then(function (d) {
      if (d.error) { noteEl.textContent = d.error; return; }
      setMe(d.me); renderHof(d.top);
      if (!d.saved) { noteEl.textContent = 'Score 100 or more to get on the hall of fame.'; return; }
      noteEl.textContent = d.improved ? 'Saved to the hall of fame as ' + me.name + '.' : 'Your best is still ' + fmtN(d.best.score) + ' points.';
      if (!me.fan) {
        noteEl.appendChild(document.createTextNode(' '));
        var a = document.createElement('a'); a.href = '/fans.php?v=join'; a.textContent = 'Join the fan club to play under your own username.'; noteEl.appendChild(a);
      }
    }).catch(function () { noteEl.textContent = 'Could not reach the server.'; });
  }

  // ------------------------------------------------------------------ run control
  var MSG = ['Mumu needs a nap. And a banana.', 'The pyramid wins this time.', 'So many stones, so little Mumu.', 'Leah says: use the clouds!',
    'Pro tip: chasers follow you onto clouds. Clouds do not hold them.', 'Mumu grumbled "@!#?!" and went home.', 'Glide over trouble next time!', 'The crab says: pinch you later.'];
  var msgIdx = 0;
  function hud() {
    if (!el.score) { return; }
    el.score.textContent = 'Score ' + fmtN(score);
    el.lives.textContent = 'Lives ' + Math.max(0, lives);
    el.level.textContent = ELEM[level - 1] + ' ' + round + '/3';
    el.glide.textContent = 'Glides ' + glides;
  }
  function beginRun() {
    audio();
    score = 0; lives = 3; lifeIdx = 0; clockMs = 0; resetStats(); runNonce = ''; queued = null; keysHeld = {};
    el.start.hidden = true; el.over.hidden = true; el.win.hidden = true;
    api({ action: 'start' }).then(function (d) { runNonce = d.nonce || ''; setMe(d.me); }).catch(function () { runNonce = ''; });
    startLevel(1);
  }
  function gameOver() {
    if (mode === 'over' || mode === 'win') { return; }
    mode = 'over'; SFX.over();
    finalScore = score; finalLevel = level; finalWon = false; finalMs = clockMs;
    document.getElementById('overMsg').textContent = MSG[msgIdx++ % MSG.length];
    document.getElementById('overInfo').textContent = 'Score ' + fmtN(finalScore) + ', reached ' + ELEM[level - 1] + ' (round ' + round + ').';
    el.over.hidden = false;
    saveRun(document.getElementById('overNote'));
  }
  function gameWon() {
    if (mode === 'win') { return; }
    mode = 'win'; SFX.level();
    finalScore = score; finalLevel = 4; finalWon = true; finalMs = clockMs;
    document.getElementById('winScore').textContent = 'Score ' + fmtN(finalScore) + ' in ' + fmt(finalMs);
    document.getElementById('winWho').textContent = me.name ? 'Well hopped, ' + me.name + '!' : '';
    el.win.hidden = false;
    saveRun(document.getElementById('winNote'));
  }
  document.getElementById('startBtn').addEventListener('click', beginRun);
  document.getElementById('retryBtn').addEventListener('click', beginRun);
  document.getElementById('againBtn').addEventListener('click', beginRun);

  // ------------------------------------------------------------------ input: arrows are turned 45 degrees like the arcade (left = up-left, up = up-right, right = down-right, down = down-left)
  var KEYMAP = { ArrowLeft: 'ul', ArrowUp: 'ur', ArrowRight: 'dr', ArrowDown: 'dl', q: 'ul', Q: 'ul', e: 'ur', E: 'ur', z: 'dl', Z: 'dl', c: 'dr', C: 'dr',
    '7': 'ul', '9': 'ur', '1': 'dl', '3': 'dr', ' ': 'glide', g: 'glide', G: 'glide', Shift: 'glide' };
  function act(k) {
    if (mode === 'card' && k !== 'glide') { cardT = Math.min(cardT, 0.15); return; }
    if (mode !== 'play') { return; }
    if (k === 'glide') {
      if (armed) { armed = false; } else if (glides > 0) { armed = true; SFX.pop(); } else { say('NO GLIDES LEFT THIS LEVEL'); }
      return;
    }
    if (mumu.t < 1 || mumu.cloud) { queued = k; return; }
    hopTo(k);
  }
  window.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key];
    if (!k) { return; }
    if (mode === 'play' || mode === 'card') { e.preventDefault(); }
    if (k !== 'glide') { keysHeld[k] = true; }
    if (e.repeat) { return; }
    act(k);
  });
  window.addEventListener('keyup', function (e) { var k = KEYMAP[e.key]; if (k && k !== 'glide') { keysHeld[k] = false; } });
  window.addEventListener('blur', function () { keysHeld = {}; });
  document.querySelectorAll('#touch button').forEach(function (b) {
    var k = b.getAttribute('data-key');
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); if (k !== 'glide') { keysHeld[k] = true; } act(k); });
    var off = function (e) { e.preventDefault(); keysHeld[k] = false; };
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });
  // tap or swipe on the canvas: hop toward the tapped side of Mumu
  cv.addEventListener('pointerdown', function (e) {
    if (mode !== 'play' && mode !== 'card') { return; }
    var rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) * W / rc.width, y = (e.clientY - rc.top) * H / rc.height;
    var p = mumu ? pos(mumu.r, mumu.c) : { x: 160, y: TOP };
    act((y < p.y - 4 ? 'u' : 'd') + (x < p.x ? 'l' : 'r'));
  });

  // ------------------------------------------------------------------ certificate (full clear only, drawn in the browser)
  function goofyPool() {
    var rr = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
    return [
      ['Bananas eaten by Mumu', String(rr(7, 31))], ['Times Mumu said "@!#?!"', String(ST.bonks)], ['Stones that asked for a second coat', String(ST.undone)],
      ['Crabs who wanted a hug', ST.crabs ? String(ST.crabs) : '0 (shy crabs)'], ['Ghost high-fives', '0 (hands go right through)'],
      ['Clouds that felt fluffy', ST.clouds + ' of ' + ST.clouds], ['Ear wiggles per minute', String(rr(40, 120))],
      ['Jackalopes that agreed to a race', '0 (they always win)'], ['Fire Shark sunburns', '1 (it never wears sunscreen)'],
      ['Times Mumu almost hopped off for fun', String(rr(3, 19))], ['Tail rings counted', '7 (plus a white tip)'], ['Naps postponed', String(rr(2, 9))]
    ];
  }
  document.getElementById('certBtn').addEventListener('click', function () {
    var load = document.fonts && document.fonts.load ? document.fonts.load('20px "Myfont"') : Promise.resolve();
    load.catch(function () {}).then(function () { makeCertificate(me.name || 'Pyramid Hopper', finalScore, finalMs); });
  });
  function makeCertificate(name, sc, ms) {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 1180;
    var x = c.getContext('2d'), CW = c.width, i;
    x.fillStyle = '#FFFDF7'; x.fillRect(0, 0, CW, c.height);
    x.fillStyle = '#FDC921'; x.fillRect(0, 0, CW, 36); x.fillRect(0, c.height - 36, CW, 36);
    x.fillStyle = '#99D6EA'; x.fillRect(0, 36, CW, 14); x.fillRect(0, c.height - 50, CW, 14);
    x.strokeStyle = '#1E3248'; x.lineWidth = 6; x.strokeRect(50, 70, CW - 100, c.height - 140);
    x.textAlign = 'center'; x.fillStyle = '#1E3248';
    var pix = '"Myfont", "DM Sans", sans-serif';
    x.font = '56px ' + pix; x.fillText('CERTIFICATE', CW / 2, 170);
    x.font = '32px ' + pix; x.fillText('OF ELEMENTAL HOPPING', CW / 2, 220);
    x.font = '20px sans-serif'; x.fillText('This certifies that', CW / 2, 285);
    var size = 80; x.font = size + 'px ' + pix;
    while (x.measureText(name).width > CW - 260 && size > 20) { size -= 2; x.font = size + 'px ' + pix; }
    x.fillStyle = '#6798C0'; x.fillText(name, CW / 2, 365);
    x.fillStyle = '#1E3248'; x.font = '20px sans-serif';
    x.fillText('hopped with Mumu across all four elements, Water, Earth, Air and Fire,', CW / 2, 420);
    x.fillText('and painted every stone of L-Bert. Score: ' + fmtN(sc) + ' in ' + fmt(ms) + '.', CW / 2, 448);
    function stat(col, row, label, val) {
      var bx = col ? 640 : 110, by = 530 + row * 32;
      x.textAlign = 'left'; x.font = '19px sans-serif'; x.fillStyle = '#1E3248'; x.fillText(label, bx, by, 320);
      x.textAlign = 'right'; x.font = 'bold 19px sans-serif'; x.fillStyle = '#6798C0'; x.fillText(val, bx + 450, by, 200);
    }
    x.textAlign = 'left'; x.font = '24px ' + pix; x.fillStyle = '#1E3248'; x.fillText('HOP STATS', 110, 496); x.fillText('CRITTER REPORT', 640, 496);
    [['Score', fmtN(sc)], ['Total time', fmt(ms)], ['Hops', fmtN(ST.hops)], ['Stones painted', fmtN(ST.painted)], ['Glides used', String(ST.glides)], ['Cloud rides', String(ST.clouds)], ['Hearts caught', String(ST.hearts)]]
      .forEach(function (r, k) { stat(0, k, r[0], r[1]); });
    [['Chasers lured off a cloud', String(ST.lured)], ['Mini Bigfoots caught', String(ST.bigfoots)], ['Times chased by a crab', String(ST.crabs)], ['Ghosts met', String(ST.ghosts)],
      ['Falls off the pyramid', String(ST.falls)], ['Bonks', ST.bonks ? String(ST.bonks) : '0 (flawless!)'], ['Stones un-painted by Bigfoot', String(ST.undone)]]
      .forEach(function (r, k) { stat(1, k, r[0], r[1]); });
    var pool = goofyPool(), chosen = [];
    while (chosen.length < 4 && pool.length) { chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); }
    x.fillStyle = '#FFF1B8'; x.fillRect(100, 790, CW - 200, 190); x.strokeStyle = '#FDC921'; x.lineWidth = 3; x.strokeRect(100, 790, CW - 200, 190);
    x.textAlign = 'center'; x.font = '24px ' + pix; x.fillStyle = '#1E3248'; x.fillText('ALSO VERY IMPORTANT', CW / 2, 825);
    for (i = 0; i < chosen.length; i++) { x.font = '19px sans-serif'; x.fillText(chosen[i][0] + ': ' + chosen[i][1], CW / 2, 862 + i * 30, CW - 240); }
    x.imageSmoothingEnabled = false;
    x.drawImage(MUMU.glide, 120, 972, 36 * 5, 25 * 5);
    // a mini pyramid in the four element colours
    LEVELS.forEach(function (lv, k) { var px = CW - 330 + k * 56, py = 1060; x.fillStyle = lv.sideL; x.fillRect(px, py, 24, 30); x.fillStyle = lv.sideR; x.fillRect(px + 24, py, 24, 30); x.fillStyle = lv.tops[2]; x.beginPath(); x.moveTo(px + 24, py - 12); x.lineTo(px + 48, py); x.lineTo(px + 24, py + 12); x.lineTo(px, py); x.closePath(); x.fill(); });
    x.textAlign = 'center'; x.fillStyle = '#1E3248'; x.font = '24px ' + pix;
    x.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), CW / 2, 1050);
    x.fillText('livedbyleah.com', CW / 2, 1086);
    c.toBlob(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'lbert-certificate.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  }

  // ------------------------------------------------------------------ loop
  var last = 0;
  function loop(now) {
    if (!last) { last = now; }
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // Test hook: only when the page is opened with ?debug=1
  if (/[?&]debug=1/.test(location.search)) {
    window.__bert = {
      info: function () {
        return { mode: mode, level: level, round: round, score: score, lives: lives, glides: glides, armed: armed, ms: clockMs, stats: ST,
          mumu: mumu && { r: mumu.r, c: mumu.c, t: mumu.t, cloud: !!mumu.cloud, fall: !!mumu.fall }, mons: mons.map(function (o) { return o.type + '@' + o.r + ',' + o.c; }),
          clouds: clouds.map(function (q) { return q.r + ',' + q.c + (q.used ? 'u' : ''); }), heart: heart && heart.r + ',' + heart.c,
          left: tiles.reduce(function (s, row) { return s + row.filter(function (v) { return v !== target(); }).length; }, 0) };
      },
      start: beginRun, level: function (n, rd) { el.start.hidden = true; level = n; round = rd || 1; glides = 2; bg = makeBg(LEVELS[n - 1].bg); loadRound(); },
      skipCard: function () { cardT = 0; mode = 'play'; }, god: function (v) { god = v !== false; }, hop: act,
      paintAll: function (leave) { var k = 0; for (var r = 0; r < ROWS; r++) { for (var c = 0; c <= r; c++) { if (k++ >= (leave || 0)) { tiles[r][c] = target(); } } } },
      clear: function () { for (var r = 0; r < ROWS; r++) { for (var c = 0; c <= r; c++) { tiles[r][c] = target(); } } checkClear(); }, lives: function (n) { lives = n; hud(); },
      place: function (t, r, c) { var o = spawnMon(t); o.r = o.fr = r; o.c = o.fc = c; o.drop = 0; o.wait = 0.2; },
      spawn: spawnMon, heart: function (r, c) { heart = { r: r, c: c, t: 8 }; }, over: gameOver, won: function () { gameWon(); }, stats: function () { return ST; }
    };
  }

  hud();
  loadHof();
  requestAnimationFrame(loop);
})();

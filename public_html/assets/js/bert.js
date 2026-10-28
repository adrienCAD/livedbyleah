// Fossil Smash (was L-Bert): Leah's hopping game. Bagel, a little brachiosaurus, stomps a pyramid of fossil stones until every one is smashed.
// 4 levels (Triassic, Jurassic, Cretaceous, Meteor Day), 3 rounds each. Canvas 320x240 shown at 2x, pixel art drawn in code, no libraries.
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

  // ------------------------------------------------------------------ pixel sprite helpers (code-drawn critters get a crisp 1 px outline, like Leah's art)
  function crisp(c) { var x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), a = d.data; for (var i = 3; i < a.length; i += 4) { a[i] = a[i] > 110 ? 255 : 0; } x.putImageData(d, 0, 0); return c; }
  function spr(w, h, fn, col) {
    var c = crisp(mk(w + 2, h + 2, function (x) { x.translate(1, 1); fn(x); })), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), a = d.data, cw = c.width, ch = c.height, out = [], i, j;
    var rgb = [parseInt(col.substr(1, 2), 16), parseInt(col.substr(3, 2), 16), parseInt(col.substr(5, 2), 16)];
    for (j = 0; j < ch; j++) { for (i = 0; i < cw; i++) {
      if (a[(j * cw + i) * 4 + 3]) { continue; }
      if ((i > 0 && a[(j * cw + i - 1) * 4 + 3]) || (i < cw - 1 && a[(j * cw + i + 1) * 4 + 3]) || (j > 0 && a[((j - 1) * cw + i) * 4 + 3]) || (j < ch - 1 && a[((j + 1) * cw + i) * 4 + 3])) { out.push((j * cw + i) * 4); }
    } }
    out.forEach(function (k) { a[k] = rgb[0]; a[k + 1] = rgb[1]; a[k + 2] = rgb[2]; a[k + 3] = 255; });
    x.putImageData(d, 0, 0); return c;
  }

  // ------------------------------------------------------------------ Leah's art: Bagel (a brachiosaurus), the meteor and the two fireball frames
  var ART = {}, ASSETS = { bagel: 'bagel.png', bagelBack: 'bagel_back.png', meteor: 'meteor.png', fire1: 'fire1.png', fire2: 'fire2.png' };
  function plain(im) { return mk(im.width, im.height, function (x) { x.drawImage(im, 0, 0); }); }
  function derive(k, im) {
    if (k === 'bagel') { ART.bagelF = plain(im); ART.bagelFL = flip(ART.bagelF); }
    else if (k === 'bagelBack') { ART.bagelB = plain(im); ART.bagelBL = flip(ART.bagelB); }
    else if (k === 'meteor') {
      var s = 20, base = mk(s, s, function (x) { x.drawImage(im, 0, 0); });
      ART.meteor = [0, 1, 2, 3].map(function (q) { return mk(s, s, function (x) { x.translate(s / 2, s / 2); x.rotate(q * Math.PI / 2); x.drawImage(base, -s / 2, -s / 2); }); });
    } else { ART[k] = plain(im); ART[k + 'L'] = flip(ART[k]); }
  }
  Object.keys(ASSETS).forEach(function (k) { var im = new Image(); im.onload = function () { derive(k, im); }; im.src = '/assets/img/fossil/' + ASSETS[k] + '?v=1'; });

  // ------------------------------------------------------------------ critters (original, code-drawn until Leah draws them)
  var SPR = {};
  SPR.trilo = spr(16, 10, function (x) {   // trilobite: un-smashes stones, catch it!
    ell(x, '#9a7ab0', 9, 5.5, 7, 4); ell(x, '#b896d0', 4, 5.5, 3.6, 3.6);
    for (var k = 0; k < 4; k++) { R(x, '#6a4a80', 8 + k * 2, 2, 1, 7); R(x, '#6a4a80', 6 + k * 2, 9, 1, 1); }
    R(x, '#d8c0ec', 3, 3, 3, 1); R(x, '#ffffff', 2, 4, 2, 2); R(x, '#111111', 3, 5, 1, 1); R(x, '#6a4a80', 0, 3, 1, 1); R(x, '#6a4a80', 1, 2, 1, 1);
  }, '#3a2a4a');
  function pteroDraw(x, up) {
    poly(x, '#d8905a', up ? [[14, 8], [7, 1], [9, 9]] : [[14, 9], [7, 15], [9, 9]]);
    ell(x, '#e8794a', 13, 9, 5, 3); poly(x, '#e8794a', [[9, 9], [2, 12], [9, 11]]); ell(x, '#f8d8a0', 13, 10.5, 3.4, 1.5); ell(x, '#e8794a', 19, 7, 3, 2.6);
    poly(x, '#FDC921', [[21, 6], [26, 8], [21, 9]]); poly(x, '#c8501e', [[16, 5], [19, 1], [20, 5]]);
    R(x, '#ffffff', 19, 6, 2, 2); R(x, '#111111', 20, 7, 1, 1);
    poly(x, '#f6b878', up ? [[12, 8], [3, 0], [2, 6], [9, 10]] : [[12, 9], [3, 15], [2, 10], [9, 10]]);
    R(x, '#c8501e', 5, up ? 3 : 11, 1, 1);
  }
  SPR.ptero1 = spr(26, 16, function (x) { pteroDraw(x, true); }, '#5a2a18');
  SPR.ptero2 = spr(26, 16, function (x) { pteroDraw(x, false); }, '#5a2a18');
  SPR.raptor = spr(22, 22, function (x) {   // egg-thief raptor: fast chaser, carries a stolen egg
    poly(x, '#4f8a38', [[15, 12], [22, 10], [22, 12], [16, 16]]);
    R(x, '#4f8a38', 8, 16, 2, 5); R(x, '#4f8a38', 13, 16, 2, 5); R(x, '#3a6a28', 6, 20, 4, 2); R(x, '#3a6a28', 12, 20, 4, 2);
    ell(x, '#6aa84a', 12, 13, 6.5, 4.6); ell(x, '#d8e8a0', 11, 15, 4, 2.4);
    poly(x, '#6aa84a', [[5, 11], [3, 5], [8, 5], [10, 11]]); ell(x, '#6aa84a', 5, 4.5, 4.2, 3); poly(x, '#6aa84a', [[2, 4], [0, 6], [2, 7]]);
    R(x, '#ffffff', 5, 3, 2, 2); R(x, '#111111', 5, 4, 1, 1); R(x, '#ffffff', 1, 7, 1, 1);
    for (var k = 0; k < 3; k++) { R(x, '#e8641e', 11 + k * 3, 10, 1, 3); }
    R(x, '#3a6a28', 4, 11, 3, 1); ell(x, '#fff3d0', 3, 12, 2.2, 2.8); R(x, '#d8a860', 2, 11, 1, 1); R(x, '#d8a860', 3, 13, 1, 1);
  }, '#2a4a1e');
  SPR.trex = spr(40, 32, function (x) {   // the T. rex (boss of the last round)
    poly(x, '#4a8a5a', [[32, 13], [40, 9], [40, 14], [33, 24]]);
    R(x, '#3a6a48', 17, 24, 6, 7); R(x, '#3a6a48', 26, 24, 6, 7); R(x, '#2e5238', 14, 30, 9, 2); R(x, '#2e5238', 25, 30, 9, 2);
    poly(x, '#e8641e', [[20, 9], [22, 4], [25, 9]]); poly(x, '#e8641e', [[26, 9], [29, 5], [31, 10]]); poly(x, '#e8641e', [[31, 11], [34, 8], [35, 13]]);
    ell(x, '#5aa06a', 24, 18, 12.5, 9); ell(x, '#e8e0a8', 22, 22, 8, 4.6);
    for (var k = 0; k < 4; k++) { R(x, '#e8641e', 21 + k * 3, 12, 1, 4); }
    poly(x, '#5aa06a', [[10, 9], [18, 9], [22, 19], [13, 17]]);
    ell(x, '#5aa06a', 9, 9, 8, 6); poly(x, '#3a0a0a', [[1, 10], [12, 12], [12, 15], [3, 14]]);
    for (k = 0; k < 4; k++) { R(x, '#ffffff', 3 + k * 2, 11 + (k > 1 ? 1 : 0), 1, 2); }
    R(x, '#ffffff', 9, 5, 3, 3); R(x, '#e8392f', 10, 6, 1, 2); R(x, '#2e5238', 8, 4, 5, 1);
    R(x, '#3a6a48', 12, 18, 4, 2); R(x, '#ffffff', 11, 19, 1, 1);
  }, '#1e3a2a');
  SPR.heart = mk(11, 10, function (x) {
    R(x, '#7a0a14', 1, 1, 4, 3); R(x, '#7a0a14', 6, 1, 4, 3); R(x, '#7a0a14', 0, 2, 11, 3); R(x, '#7a0a14', 1, 5, 9, 2); R(x, '#7a0a14', 3, 7, 5, 2); R(x, '#7a0a14', 5, 9, 1, 1);
    R(x, '#ff3a5a', 2, 2, 2, 2); R(x, '#ff3a5a', 7, 2, 2, 2); R(x, '#ff3a5a', 1, 3, 9, 2); R(x, '#ff3a5a', 2, 5, 7, 1); R(x, '#ff3a5a', 4, 6, 3, 2); R(x, '#ffb0c0', 2, 2, 1, 1);
  });
  SPR.cloud = mk(28, 16, function (x) {   // escape cloud: hop on it to fly back to the top
    ell(x, '#9ab0d8', 14, 10, 13, 5.6); ell(x, '#9ab0d8', 9, 7, 6, 5); ell(x, '#9ab0d8', 18, 6, 7, 5.4);
    ell(x, '#ffffff', 14, 10, 12, 4.8); ell(x, '#ffffff', 9, 7, 5.2, 4.2); ell(x, '#ffffff', 18, 6, 6.2, 4.6);
    R(x, '#FDC921', 4, 3, 1, 3); R(x, '#FDC921', 3, 4, 3, 1); R(x, '#99D6EA', 24, 2, 1, 3); R(x, '#99D6EA', 23, 3, 3, 1);
  });
  SPR.ptero1L = flip(SPR.ptero1); SPR.ptero2L = flip(SPR.ptero2); SPR.triloL = flip(SPR.trilo); SPR.raptorL = flip(SPR.raptor); SPR.trexL = flip(SPR.trex);

  // kind: bounce = hops down and falls off the bottom; chase = follows Bagel; undo = un-smashes stones (catch it); fly = wanders, only hurts when swooping low
  var MON = {
    meteor: { kind: 'bounce', name: 'meteor', per: 0.95 }, fireball: { kind: 'chase', name: 'fireball', per: 1.05 },
    raptor: { kind: 'chase', name: 'egg-thief raptor', per: 0.8 }, trilo: { kind: 'undo', name: 'trilobite', per: 1.0 },
    ptero: { kind: 'fly', name: 'pterodactyl', per: 0.95 }, trex: { kind: 'chase', name: 'T. rex', per: 0.85, boss: true }
  };

  // ------------------------------------------------------------------ levels: Triassic, Jurassic, Cretaceous, Meteor Day. tops = start, middle, finished stone colour (sand, bone, amber).
  var LEVELS = [
    { name: 'TRIASSIC', sub: 'Smash the sandy stones', tops: ['#c8a46a', '#eadfc2', '#e8941e'], sideL: '#8a6a3a', sideR: '#5e4524', mons: ['meteor', 'meteor', 'fireball'], bg: 'tri' },
    { name: 'JURASSIC', sub: 'Stomp through the jungle', tops: ['#7a8a52', '#dcd6b4', '#eaa426'], sideL: '#4e5a32', sideR: '#363f22', mons: ['raptor', 'trilo', 'meteor'], bg: 'jur' },
    { name: 'CRETACEOUS', sub: 'Hop over the lava rocks', tops: ['#a8603a', '#e6cfa6', '#f4b436'], sideL: '#6e3a22', sideR: '#4a2414', mons: ['ptero', 'ptero', 'fireball'], bg: 'cre' },
    { name: 'METEOR DAY', sub: 'Smash them before the sky does', tops: ['#4e4e62', '#b8b0a8', '#ffd04a'], sideL: '#2c2c3c', sideR: '#1c1c28', mons: ['meteor', 'meteor', 'meteor', 'fireball'], bg: 'met' }
  ];
  var ROUND_RULE = ['Stomp every stone once.', 'Two stomps per stone this time.', 'Careful: stomping a finished stone un-smashes it!'];

  // backgrounds, drawn once per level
  function makeBg(kind) {
    return mk(W, H, function (x) {
      var i, gr;
      function fern(px, py, s, col) { R(x, col, px, py - 14 * s, 2, 14 * s); for (var k = 0; k < 5; k++) { poly(x, col, [[px + 1, py - 14 * s + k * 2 * s], [px - 10 * s, py - 10 * s + k * 2 * s], [px - 6 * s, py - 14 * s + k * 2 * s]]); poly(x, col, [[px + 1, py - 14 * s + k * 2 * s], [px + 12 * s, py - 10 * s + k * 2 * s], [px + 8 * s, py - 14 * s + k * 2 * s]]); } }
      function brachio(px, py, s, col) { ell(x, col, px, py, 14 * s, 6 * s); R(x, col, px + 9 * s, py - 22 * s, 3 * s, 20 * s); ell(x, col, px + 12 * s, py - 23 * s, 4 * s, 2.4 * s); R(x, col, px - 12 * s, py + 2, 3 * s, 10 * s); R(x, col, px + 6 * s, py + 2, 3 * s, 10 * s); poly(x, col, [[px - 14 * s, py - 2], [px - 30 * s, py + 6], [px - 14 * s, py + 3]]); }
      if (kind === 'tri') {
        gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#e89a5a'); gr.addColorStop(0.55, '#f8dca0'); gr.addColorStop(1, '#c8955a'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        ell(x, '#fff0b0', 268, 46, 20, 20); ell(x, '#fffbe0', 268, 46, 14, 14);
        poly(x, '#d8a468', [[0, 210], [0, 150], [60, 130], [120, 160], [170, 210]]); poly(x, '#c8925a', [[170, 210], [230, 140], [290, 128], [320, 150], [320, 210]]);
        R(x, '#c8955a', 0, 205, W, 35); for (i = 0; i < 30; i++) { R(x, '#a87840', (i * 41) % W, 210 + (i * 7) % 26, 4, 1); }
        fern(26, 205, 1.3, '#4a6a2a'); fern(300, 206, 1.1, '#3e5a22'); fern(78, 212, 0.8, '#5a7a32');
      } else if (kind === 'jur') {
        gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#78c0e0'); gr.addColorStop(0.6, '#d8f0d0'); gr.addColorStop(1, '#8ac07a'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        [[40, 40], [240, 30], [150, 60]].forEach(function (p) { ell(x, 'rgba(255,255,255,.85)', p[0], p[1], 20, 6); ell(x, 'rgba(255,255,255,.85)', p[0] + 9, p[1] - 5, 11, 5); });
        poly(x, '#6a9a8a', [[0, 200], [30, 150], [60, 200]]); poly(x, '#5a8a7a', [[240, 200], [290, 130], [320, 160], [320, 200]]);
        brachio(120, 176, 0.8, '#5a8a6a'); brachio(235, 170, 0.6, '#4a7a5a');
        R(x, '#3a7a3a', 0, 200, W, 40); for (i = 0; i < 30; i++) { R(x, '#2a5a2a', (i * 37) % W, 204 + (i * 7) % 30, 3, 2); }
        fern(20, 206, 1.4, '#2a6a2a'); fern(296, 208, 1.2, '#2e7a2e'); fern(60, 214, 0.9, '#3a8a3a');
      } else if (kind === 'cre') {
        gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#c8482a'); gr.addColorStop(0.6, '#f8a85a'); gr.addColorStop(1, '#8a3a1e'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        poly(x, '#4a1e12', [[190, 210], [250, 90], [270, 90], [330, 210]]); poly(x, '#ff5a1e', [[250, 90], [260, 70], [270, 90]]);
        ell(x, 'rgba(255,200,80,.5)', 260, 62, 22, 12); ell(x, 'rgba(70,30,20,.6)', 250, 40, 26, 10); ell(x, 'rgba(70,30,20,.6)', 275, 28, 22, 9);
        poly(x, '#6a2a18', [[0, 210], [0, 150], [50, 140], [110, 210]]);
        R(x, '#5a2a1a', 0, 205, W, 35); for (i = 0; i < 14; i++) { R(x, '#ff7a2a', (i * 53) % W, 226 + (i % 3) * 3, 14, 2); }
      } else {
        gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#080820'); gr.addColorStop(0.65, '#3a1030'); gr.addColorStop(1, '#a8381a'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
        for (i = 0; i < 50; i++) { R(x, 'rgba(255,255,255,.8)', (i * 67) % W, (i * 29) % 150, 1, 1); }
        ell(x, '#6a1a1a', 60, 54, 28, 28); ell(x, '#b8322a', 56, 50, 22, 22); ell(x, '#e86a3a', 50, 44, 8, 8);
        poly(x, '#1c0c1c', [[0, 240], [0, 190], [60, 172], [120, 190], [150, 240]]); poly(x, '#1c0c1c', [[190, 240], [240, 176], [320, 168], [320, 240]]);
        for (i = 0; i < 8; i++) { R(x, '#ff8a1f', (i * 71) % W, 228 + (i % 3) * 3, 18, 3); }
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
  var fx = [], bagel = null, toast = '', toastT = 0, cardT = 0, deadT = 0, clearT = 0, tick = 0, clockMs = 0, god = false, bubble = 0;
  var runNonce = '', me = { name: '', fan: false }, finalScore = 0, finalLevel = 1, finalWon = false, finalMs = 0, ST = null, keysHeld = {}, queued = null;

  function resetStats() { ST = { hops: 0, painted: 0, glides: 0, clouds: 0, lured: 0, trilos: 0, hearts: 0, falls: 0, bonks: 0, fires: 0, pteros: 0, raptors: 0, undone: 0 }; }
  resetStats();

  function dust(x, y) { for (var i = 0; i < 5; i++) { fx.push({ x: x - 6 + i * 3, y: y + 2, vx: (i - 2) * 9, vy: -14 - Math.random() * 10, t: 0.35 }); } }
  function newBagel() { return { sq: 0, r: 0, c: 0, fr: 0, fc: 0, t: 1, dur: HOP, face: 'front', left: false, gliding: false, cloud: null, fall: null }; }

  function loadRound() {
    L = LEVELS[level - 1];
    steps = round === 2 ? 2 : 1; toggle = round === 3;
    tiles = []; for (var r = 0; r < ROWS; r++) { tiles.push(new Array(r + 1).fill(0)); }
    mons = []; heart = null; heartT = 8 + Math.random() * 10; spawnT = 2.5;
    // two escape clouds, one each side, on random rows
    var rl = 2 + Math.floor(Math.random() * 4), rr = 2 + Math.floor(Math.random() * 4);
    clouds = [{ r: rl, c: -1, used: false }, { r: rr, c: rr + 1, used: false }];
    bagel = newBagel();
    if (level === 4 && round === 3) { spawnMon('trex'); }
    mode = 'card'; cardT = 2.4; armed = false; hud();
  }
  function startLevel(n) { level = n; round = 1; glides = 2; bg = makeBg(LEVELS[n - 1].bg); loadRound(); }

  // ------------------------------------------------------------------ monsters
  function spawnMon(type) {
    var m = MON[type], c = Math.random() < 0.5 ? 0 : 1;
    var o = { type: type, kind: m.kind, r: 1, c: c, fr: 1, fc: c, t: 1, dur: 0.3, wait: 0.6, drop: 0.5, left: Math.random() < 0.5, hops: 0, vis: 0, dead: false, fall: null, rest: 0 };
    if (m.boss) { o.r = 4; o.c = 2; o.fr = 4; o.fc = 2; o.drop = 1.0; o.wait = 1.6; }
    if (type === 'fireball') { ST.fires++; }
    if (type === 'ptero') { ST.pteros++; }
    if (type === 'raptor') { ST.raptors++; }
    mons.push(o);
    return o;
  }
  function monPeriod(o) { return MON[o.type].per * (1 - 0.06 * (level - 1) - 0.05 * (round - 1)); }
  function hopMon(o, r2, c2) { o.fr = o.r; o.fc = o.c; o.r = r2; o.c = c2; o.t = 0; o.dur = Math.min(0.3, monPeriod(o) * 0.5); o.hops++; if (c2 - r2 / 2 !== o.fc - o.fr / 2) { o.left = (c2 - r2 / 2) < (o.fc - o.fr / 2); } }
  function chaseTarget() {
    if (bagel.cloud) { return { r: bagel.cloud.r, c: bagel.cloud.c, lure: true }; }   // the chaser follows Bagel onto the cloud... and falls
    return { r: bagel.r, c: bagel.c };
  }
  function monThink(o) {
    var opts = [], k, d;
    if (o.kind === 'bounce' || o.kind === 'undo') {
      if (o.r + 1 >= ROWS) { o.fall = { t: 0, x: 0 }; return; }
      hopMon(o, o.r + 1, o.c + (Math.random() < 0.5 ? 0 : 1));
    } else if (o.kind === 'fly') {
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
      if (o.kind === 'fly') { o.vis += dt; }
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
        say((MON[o.type].boss ? 'T. REX' : MON[o.type].name.toUpperCase()) + ' TOOK THE PLUNGE! +' + pts); SFX.lure();
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
    if (MON[type].kind === 'undo' && undos >= 1) { type = 'meteor'; }
    spawnMon(type);
  }

  // ------------------------------------------------------------------ Bagel moves
  function hopTo(dir) {
    if (mode !== 'play' || !bagel || bagel.t < 1 || bagel.cloud || bagel.fall) { return; }
    var d = DIRS[dir], n = armed ? 2 : 1, r2 = bagel.r + d[0] * n, c2 = bagel.c + d[1] * n;
    bagel.fr = bagel.r; bagel.fc = bagel.c; bagel.r = r2; bagel.c = c2; bagel.t = 0;
    bagel.face = d[0] > 0 ? 'front' : 'back'; bagel.left = d[0] > 0 ? d[1] === 0 : d[1] !== 0;
    bagel.gliding = armed; bagel.dur = armed ? GLIDE_HOP : HOP;
    if (armed) { armed = false; glides--; ST.glides++; SFX.glide(); hud(); } else { SFX.hop(); }
    ST.hops++;
  }
  function landBagel() {
    var r = bagel.r, c = bagel.c;
    bagel.sq = 0.14; if (onPyr(r, c)) { var dp = pos(r, c); dust(dp.x, dp.y); }
    bagel.gliding = false;
    var cl = clouds.filter(function (q) { return !q.used && q.r === r && q.c === c; })[0];
    if (cl) { cl.used = true; bagel.cloud = { r: r, c: c, t: 0, sx: pos(r, c).x, sy: pos(r, c).y }; ST.clouds++; SFX.cloud(); say('WHEEE! BACK TO THE TOP'); return; }
    if (!onPyr(r, c)) { bagel.fall = { t: 0 }; ST.falls++; SFX.fall(); return; }
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
    bagel = newBagel(); mode = 'play'; spawnT = 2.5;
  }
  function tileOf(o) { return o.t < 0.5 ? { r: o.fr, c: o.fc } : { r: o.r, c: o.c }; }
  function collide() {
    if (mode !== 'play' || bagel.cloud || bagel.fall || bagel.gliding) { return; }
    var mt = tileOf(bagel);
    for (var i = 0; i < mons.length; i++) {
      var o = mons[i];
      if (o.drop > 0 || o.fall) { continue; }
      var ot = tileOf(o);
      if (ot.r !== mt.r || ot.c !== mt.c) { continue; }
      if (o.kind === 'undo') { o.dead = true; addScore(300); ST.trilos++; say('CAUGHT A TRILOBITE! +300'); SFX.catch(); continue; }
      if (o.kind === 'fly' && !pteroLow(o)) { continue; }
      hurt(o); return;
    }
  }
  function pteroLow(o) { return (o.vis % 3.4) < 2.0; }

  // ------------------------------------------------------------------ main update
  function update(dt) {
    tick += dt;
    if (bagel && bagel.sq > 0) { bagel.sq -= dt; }
    fx.forEach(function (f) { f.t -= dt; f.x += f.vx * dt; f.y += f.vy * dt; }); fx = fx.filter(function (f) { return f.t > 0; });
    if (toastT > 0) { toastT -= dt; }
    if (bubble > 0) { bubble -= dt; }
    if (mode === 'card') { cardT -= dt; if (cardT <= 0) { mode = 'play'; } return; }
    if (mode === 'clear') { clearT -= dt; if (clearT <= 0) { nextRound(); } return; }
    if (mode === 'dead') { deadT -= dt; if (deadT <= 0) { afterDeath(); } return; }
    if (mode !== 'play') { return; }
    clockMs += dt * 1000;
    // Bagel
    if (bagel.fall) { bagel.fall.t += dt; if (bagel.fall.t > 1.0) { bagel.fall = null; mode = 'dead'; deadT = 0.3; bubble = 0; } }
    else if (bagel.cloud) {
      var q = bagel.cloud; q.t += dt / 1.6;
      if (q.t >= 1) { bagel.cloud = null; bagel.r = 0; bagel.c = 0; bagel.fr = 0; bagel.fc = 0; bagel.t = 1; bagel.face = 'front'; paint(0, 0); checkClear(); }
    } else if (bagel.t < 1) {
      bagel.t = Math.min(1, bagel.t + dt / bagel.dur);
      if (bagel.t >= 1) { landBagel(); }
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
      if (!(hr === bagel.r && hc === bagel.c)) { heart = { r: hr, c: hc, t: 8 }; SFX.pop(); }
    }
    collide();
  }

  // ------------------------------------------------------------------ drawing
  function fossilPrint(x, y, k) {   // a little fossil on every finished stone: bone, ammonite or fern
    g.fillStyle = 'rgba(110,60,10,.75)';
    var pts;
    if (k === 0) { pts = [[-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [-5, -1], [-5, 1], [-4, -1], [-4, 1], [4, -1], [4, 1], [5, -1], [5, 1]]; }
    else if (k === 1) { pts = [[-2, -2], [-1, -2], [0, -2], [1, -2], [2, -1], [3, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-3, 0], [-2, -1], [-1, -1], [0, -1], [1, 0], [0, 1], [-1, 1], [-1, 0]]; }
    else { pts = [[-5, 0], [-4, 0], [-3, 0], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [-3, -1], [-2, -2], [-1, -1], [0, -2], [1, -1], [2, -2], [3, -1], [-3, 1], [-2, 2], [-1, 1], [0, 2], [1, 1], [2, 2], [3, 1]]; }
    pts.forEach(function (q) { g.fillRect(x + q[0], y + q[1], 1, 1); });
  }
  function drawCube(r, c, top, done) {
    var p = pos(r, c), x = p.x, y = p.y;
    poly(g, L.sideL, [[x - 16, y], [x, y + 8], [x, y + 24], [x - 16, y + 16]]);
    poly(g, L.sideR, [[x + 16, y], [x, y + 8], [x, y + 24], [x + 16, y + 16]]);
    poly(g, top, [[x, y - 8], [x + 16, y], [x, y + 8], [x - 16, y]]);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 1, y - 7, 2, 1);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 16, y, 1, 16); g.fillRect(x + 15, y, 1, 16);
    if (done) { fossilPrint(x, y, (r * 2 + c) % 3); }
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
    if (L.bg === 'cre') { for (var e = 0; e < 8; e++) { var ey = (H - ((tick * 30 + e * 37) % H)); g.fillStyle = 'rgba(255,170,60,.8)'; g.fillRect((e * 47 + Math.sin(tick + e) * 6) % W, ey, 1, 2); } }
    if (L.bg === 'met') { g.strokeStyle = 'rgba(255,176,74,.85)'; g.lineWidth = 1; for (var m = 0; m < 6; m++) { var mx = ((m * 61 + tick * 70) % (W + 60)) - 30, my = ((tick * 60 + m * 53) % (H + 40)) - 20; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx - 9, my - 5); g.stroke(); } }
    var flash = mode === 'clear' && Math.floor(tick * 8) % 2;
    var r, c;
    for (r = 0; r < ROWS; r++) { for (c = 0; c <= r; c++) { drawCube(r, c, flash ? '#ffffff' : topColor(tiles[r] ? tiles[r][c] : 0), !flash && tiles[r] && tiles[r][c] === target()); } }
    // clouds
    clouds.forEach(function (q) { if (q.used) { return; } var p = pos(q.r, q.c); g.drawImage(SPR.cloud, Math.round(p.x - 14), Math.round(p.y - 8 + Math.sin(tick * 3 + q.r) * 2)); });
    // heart
    if (heart) { var hp = pos(heart.r, heart.c); if (heart.t > 2 || Math.floor(tick * 8) % 2) { g.drawImage(SPR.heart, Math.round(hp.x - 5), Math.round(hp.y - 16 + Math.sin(tick * 5) * 2)); } }
    // entities sorted by row so the ones lower down are drawn in front
    var list = mons.slice(); if (bagel && mode !== 'idle') { list.push({ bagel: true, r: bagel.r }); }
    list.sort(function (a, b) { return a.r - b.r; });
    list.forEach(function (o) { if (o.bagel) { drawBagel(); } else { drawMon(o); } });
    drawFx();
    // target colour reminder
    g.fillStyle = 'rgba(16,32,46,.7)'; g.fillRect(W - 70, 4, 66, 22);
    g.font = 'bold 7px monospace'; g.fillStyle = '#ffffff'; g.textAlign = 'left'; g.fillText('SMASH TO:', W - 66, 17);
    poly(g, L.tops[2], [[W - 16, 9], [W - 8, 13], [W - 16, 17], [W - 24, 13]]);
    // card / toast
    g.textAlign = 'center';
    if (mode === 'card') {
      g.fillStyle = 'rgba(16,32,46,.82)'; g.fillRect(0, 76, W, 82);
      g.fillStyle = '#FDC921'; g.font = 'bold 11px monospace'; g.fillText('LEVEL ' + level + ' OF 4  -  ROUND ' + round + ' OF 3', W / 2, 94);
      g.fillStyle = '#ffffff'; g.font = 'bold 22px monospace'; g.fillText(L.name, W / 2, 120);
      g.fillStyle = '#99D6EA'; g.font = 'bold 9px monospace'; g.fillText(L.sub + ' - ' + ROUND_RULE[round - 1], W / 2, 138, W - 16);
      if (level === 4 && round === 3) { g.fillStyle = '#ff8a1f'; g.fillText('BOSS: the T. rex! Lure it onto a cloud.', W / 2, 151, W - 16); }
    }
    if (toastT > 0) { g.fillStyle = 'rgba(16,32,46,.75)'; g.fillRect(20, 218, W - 40, 16); g.fillStyle = '#ffffff'; g.font = 'bold 9px monospace'; g.fillText(toast, W / 2, 229, W - 46); }
    if (armed && mode === 'play') { g.fillStyle = '#FDC921'; g.font = 'bold 9px monospace'; g.fillText('GLIDE READY: pick a direction (2 stones)', W / 2, 212, W - 40); }
  }
  function drawBagel() {
    var p, img, w = 16, h = 27;
    if (!ART.bagelF) { return; }
    if (bagel.cloud) {
      var q = bagel.cloud, top = pos(0, 0), t = q.t, e = t * t * (3 - 2 * t);
      p = { x: q.sx + (top.x - q.sx) * e, y: q.sy + (top.y - 30 - q.sy) * e - Math.sin(Math.PI * t) * 20 };
      g.drawImage(SPR.cloud, Math.round(p.x - 14), Math.round(p.y - 6));
      g.drawImage(ART.bagelF, Math.round(p.x - 8), Math.round(p.y - 26));
      return;
    }
    p = entXY(bagel);
    if (bagel.fall) { p.y += bagel.fall.t * bagel.fall.t * 260; }
    img = bagel.face === 'front' ? (bagel.left ? ART.bagelFL : ART.bagelF) : (bagel.left ? ART.bagelBL : ART.bagelB);
    if (!img) { return; }
    if (bagel.t < 1) { h = Math.round(27 * (1 + 0.1 * Math.sin(Math.PI * bagel.t))); w = Math.round(16 * (1 - 0.06 * Math.sin(Math.PI * bagel.t))); }   // stretch while hopping
    else if (bagel.sq > 0) { var k = bagel.sq / 0.14; h = Math.round(27 * (1 - 0.14 * k)); w = Math.round(16 * (1 + 0.1 * k)); }                               // squash on landing
    if (!(mode === 'dead' && Math.floor(tick * 10) % 2)) { g.drawImage(img, Math.round(p.x - w / 2), Math.round(p.y + 3 - h), w, h); }
    if (bagel.gliding) {   // a big fern leaf to glide on
      var lx = Math.round(p.x), ly = Math.round(p.y - 33);
      poly(g, '#1f6a2a', [[lx - 18, ly + 8], [lx - 9, ly - 2], [lx, ly - 5], [lx + 9, ly - 2], [lx + 18, ly + 8], [lx, ly + 4]]);
      poly(g, '#3aa23e', [[lx - 15, ly + 6], [lx - 8, ly - 1], [lx, ly - 3], [lx + 8, ly - 1], [lx + 15, ly + 6], [lx, ly + 3]]);
      g.fillStyle = '#1f6a2a'; g.fillRect(lx, ly - 3, 1, 8); g.fillRect(lx - 1, ly + 4, 2, 5);
    }
    if (armed && bagel.t >= 1) { g.fillStyle = 'rgba(253,201,33,.5)'; g.fillRect(Math.round(p.x - 14), Math.round(p.y + 2), 28, 2); }
    if (bubble > 0) {   // Bagel's cartoon grumble
      g.fillStyle = '#ffffff'; g.fillRect(Math.round(p.x + 6), Math.round(p.y - 40), 36, 13); poly(g, '#ffffff', [[p.x + 8, p.y - 27], [p.x + 14, p.y - 27], [p.x + 6, p.y - 21]]);
      g.fillStyle = '#e8392f'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('RAWR!', Math.round(p.x + 24), Math.round(p.y - 30));
    }
  }
  function monImg(o) {
    var lf = o.left ? 'L' : '';
    if (o.type === 'meteor') { return ART.meteor ? ART.meteor[(Math.floor(tick * 6) + o.r) % 4] : null; }
    if (o.type === 'fireball') { return ART['fire' + (Math.floor(tick * 7) % 2 + 1) + lf]; }
    if (o.type === 'ptero') { return SPR['ptero' + (Math.floor(tick * 8) % 2 + 1) + lf]; }
    return SPR[o.type + lf];
  }
  function drawMon(o) {
    var p = entXY(o), img = monImg(o);
    if (!img) { return; }
    if (o.drop > 0) { p.y -= o.drop * 120; }
    if (o.fall) { p.y += o.fall.t * o.fall.t * 260; }
    if (o.kind === 'fly' && !pteroLow(o)) { p.y -= 16; }   // flying high: safe to hop under
    g.drawImage(img, Math.round(p.x - img.width / 2), Math.round(p.y - img.height + 4));
  }
  function drawFx() {
    fx.forEach(function (f) { g.fillStyle = 'rgba(225,205,160,' + Math.max(0, f.t * 3).toFixed(2) + ')'; g.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); });
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
  var ELEM = ['Triassic', 'Jurassic', 'Cretaceous', 'Meteor Day'];
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
  var MSG = ['Bagel needs a nap. And a big leaf salad.', 'The pyramid wins this time. So do the meteors.', 'So many stones, so little Bagel.', 'Leah says: use the clouds!',
    'Pro tip: chasers follow you onto clouds. Clouds do not hold them.', 'Bagel grumbled "RAWR!" and went home.', 'Glide over trouble next time!', 'The fireball says: toasty!'];
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
    document.getElementById('winWho').textContent = me.name ? 'Well stomped, ' + me.name + '!' : '';
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
    if (bagel.t < 1 || bagel.cloud) { queued = k; return; }
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
  // tap or swipe on the canvas: hop toward the tapped side of Bagel
  cv.addEventListener('pointerdown', function (e) {
    if (mode !== 'play' && mode !== 'card') { return; }
    var rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) * W / rc.width, y = (e.clientY - rc.top) * H / rc.height;
    var p = bagel ? pos(bagel.r, bagel.c) : { x: 160, y: TOP };
    act((y < p.y - 4 ? 'u' : 'd') + (x < p.x ? 'l' : 'r'));
  });

  // ------------------------------------------------------------------ certificate (full clear only, drawn in the browser)
  function goofyPool() {
    var rr = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
    return [
      ['Leaves eaten by Bagel', String(rr(70, 310))], ['Times Bagel said "RAWR!"', String(ST.bonks)], ['Stones that asked for a second stomp', String(ST.undone)],
      ['Fireballs who wanted a hug', '0 (too hot to hug)'], ['Pterodactyl high-fives', '0 (they flew off)'],
      ['Clouds that felt fluffy', ST.clouds + ' of ' + ST.clouds], ['Neck stretches per minute', String(rr(40, 120))],
      ['Raptor eggs returned', '0 (the raptor says they are his)'], ['T. rex arm push-ups', '0 (the arms are too short)'],
      ['Times Bagel almost hopped off for fun', String(rr(3, 19))], ['Spots counted on Bagel', '12 (give or take)'], ['Naps postponed', String(rr(2, 9))]
    ];
  }
  document.getElementById('certBtn').addEventListener('click', function () {
    var load = document.fonts && document.fonts.load ? document.fonts.load('20px "Myfont"') : Promise.resolve();
    load.catch(function () {}).then(function () { makeCertificate(me.name || 'Fossil Smasher', finalScore, finalMs); });
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
    x.font = '32px ' + pix; x.fillText('OF FOSSIL SMASHING', CW / 2, 220);
    x.font = '20px sans-serif'; x.fillText('This certifies that', CW / 2, 285);
    var size = 80; x.font = size + 'px ' + pix;
    while (x.measureText(name).width > CW - 260 && size > 20) { size -= 2; x.font = size + 'px ' + pix; }
    x.fillStyle = '#6798C0'; x.fillText(name, CW / 2, 365);
    x.fillStyle = '#1E3248'; x.font = '20px sans-serif';
    x.fillText('stomped with Bagel across all four ages, Triassic, Jurassic, Cretaceous and Meteor Day,', CW / 2, 420);
    x.fillText('and smashed every stone of Fossil Smash. Score: ' + fmtN(sc) + ' in ' + fmt(ms) + '.', CW / 2, 448);
    function stat(col, row, label, val) {
      var bx = col ? 640 : 110, by = 530 + row * 32;
      x.textAlign = 'left'; x.font = '19px sans-serif'; x.fillStyle = '#1E3248'; x.fillText(label, bx, by, 320);
      x.textAlign = 'right'; x.font = 'bold 19px sans-serif'; x.fillStyle = '#6798C0'; x.fillText(val, bx + 450, by, 200);
    }
    x.textAlign = 'left'; x.font = '24px ' + pix; x.fillStyle = '#1E3248'; x.fillText('HOP STATS', 110, 496); x.fillText('CRITTER REPORT', 640, 496);
    [['Score', fmtN(sc)], ['Total time', fmt(ms)], ['Hops', fmtN(ST.hops)], ['Stones smashed', fmtN(ST.painted)], ['Glides used', String(ST.glides)], ['Cloud rides', String(ST.clouds)], ['Hearts caught', String(ST.hearts)]]
      .forEach(function (r, k) { stat(0, k, r[0], r[1]); });
    [['Chasers lured off a cloud', String(ST.lured)], ['Trilobites caught', String(ST.trilos)], ['Times chased by a fireball', String(ST.fires)], ['Pterodactyls met', String(ST.pteros)],
      ['Falls off the pyramid', String(ST.falls)], ['Bonks', ST.bonks ? String(ST.bonks) : '0 (flawless!)'], ['Stones un-smashed by trilobites', String(ST.undone)]]
      .forEach(function (r, k) { stat(1, k, r[0], r[1]); });
    var pool = goofyPool(), chosen = [];
    while (chosen.length < 4 && pool.length) { chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); }
    x.fillStyle = '#FFF1B8'; x.fillRect(100, 790, CW - 200, 190); x.strokeStyle = '#FDC921'; x.lineWidth = 3; x.strokeRect(100, 790, CW - 200, 190);
    x.textAlign = 'center'; x.font = '24px ' + pix; x.fillStyle = '#1E3248'; x.fillText('ALSO VERY IMPORTANT', CW / 2, 825);
    for (i = 0; i < chosen.length; i++) { x.font = '19px sans-serif'; x.fillText(chosen[i][0] + ': ' + chosen[i][1], CW / 2, 862 + i * 30, CW - 240); }
    x.imageSmoothingEnabled = false;
    if (ART.bagelF) { x.drawImage(ART.bagelF, 130, 984, 64, 108); }
    // a mini pyramid in the four element colours
    LEVELS.forEach(function (lv, k) { var px = CW - 330 + k * 56, py = 1060; x.fillStyle = lv.sideL; x.fillRect(px, py, 24, 30); x.fillStyle = lv.sideR; x.fillRect(px + 24, py, 24, 30); x.fillStyle = lv.tops[2]; x.beginPath(); x.moveTo(px + 24, py - 12); x.lineTo(px + 48, py); x.lineTo(px + 24, py + 12); x.lineTo(px, py); x.closePath(); x.fill(); });
    x.textAlign = 'center'; x.fillStyle = '#1E3248'; x.font = '24px ' + pix;
    x.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), CW / 2, 1050);
    x.fillText('livedbyleah.com', CW / 2, 1086);
    c.toBlob(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fossil-smash-certificate.png';
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
          bagel: bagel && { r: bagel.r, c: bagel.c, t: bagel.t, cloud: !!bagel.cloud, fall: !!bagel.fall }, mons: mons.map(function (o) { return o.type + '@' + o.r + ',' + o.c; }),
          clouds: clouds.map(function (q) { return q.r + ',' + q.c + (q.used ? 'u' : ''); }), heart: heart && heart.r + ',' + heart.c,
          left: tiles.reduce(function (s, row) { return s + row.filter(function (v) { return v !== target(); }).length; }, 0) };
      },
      start: beginRun, level: function (n, rd) { el.start.hidden = true; level = n; round = rd || 1; glides = 2; bg = makeBg(LEVELS[n - 1].bg); loadRound(); },
      skipCard: function () { cardT = 0; mode = 'play'; }, god: function (v) { god = v !== false; }, hop: act,
      paintAll: function (leave) { var k = 0; for (var r = 0; r < ROWS; r++) { for (var c = 0; c <= r; c++) { if (k++ >= (leave || 0)) { tiles[r][c] = target(); } } } },
      clear: function () { for (var r = 0; r < ROWS; r++) { for (var c = 0; c <= r; c++) { tiles[r][c] = target(); } } checkClear(); }, lives: function (n) { lives = n; hud(); },
      place: function (t, r, c) { var o = spawnMon(t); o.r = o.fr = r; o.c = o.fc = c; o.drop = 0; o.wait = 0.2; },
      sprites: function () { return { SPR: SPR, ART: ART }; }, spawn: spawnMon, heart: function (r, c) { heart = { r: r, c: c, t: 8 }; }, over: gameOver, won: function () { gameWon(); }, stats: function () { return ST; }
    };
  }

  hud();
  loadHof();
  requestAnimationFrame(loop);
})();

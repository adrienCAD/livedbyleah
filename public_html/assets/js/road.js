// Leah's Road Trip: an 8-bit pseudo-3D driving game. Leah's neon-green electric Jeep, 5 levels
// (Houston area, Mexico, Costa Rica, Colorado, France). Canvas 320x180 shown at 2x, no libraries.
// The timer IS the battery: it runs down, checkpoints and green batteries add to it, arrows on the road give a boost.
(function () {
  'use strict';
  var cv = document.getElementById('gameCanvas');
  if (!cv) { return; }
  var g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;

  var W = 320, H = 180, HZ = 76;                       // canvas size and horizon line
  var ROAD_W = 2000, SEG = 200, CAM_H = 1000, DRAW = 140, RUMBLE = 3;
  var CAM_D = 1 / Math.tan(50 * Math.PI / 180);        // field of view 100
  var MAXS = SEG * 60;                                 // top speed (units per second) = 60 segments per second
  var PLAYER_Z = CAM_H * CAM_D;
  var ACCEL = MAXS / 4.5, BRAKE = -MAXS * 0.9, DECEL = -MAXS / 6, OFFDECEL = -MAXS / 2.2, OFFLIMIT = MAXS / 4, CENTRI = 0.3;
  var PW = 0.3;                                        // player width, in road half-widths
  var TOTAL = 5;

  // ------------------------------------------------------------------ small helpers
  function fmt(ms) {
    var t = Math.max(0, Math.round(ms / 100) / 10), m = Math.floor(t / 60), s = (t - m * 60).toFixed(1);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mk(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.imageSmoothingEnabled = false; fn(x); return c; }
  function R(x, col, a, b, w, h) { x.fillStyle = col; x.fillRect(a, b, w, h); }
  function tri(x, col, cx, top, w, h) { x.fillStyle = col; x.beginPath(); x.moveTo(cx, top); x.lineTo(cx + w / 2, top + h); x.lineTo(cx - w / 2, top + h); x.closePath(); x.fill(); }
  function disc(x, col, cx, cy, r) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
  function ease(a, b, p) { return a + (b - a) * (1 - Math.cos(p * Math.PI)) / 2; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // ------------------------------------------------------------------ sprites (drawn once, in code, in a chunky pixel style)
  var SP = {};
  SP.palm = mk(32, 56, function (x) {
    R(x, '#8a5a2b', 15, 22, 3, 34); R(x, '#a8743a', 15, 24, 1, 30); R(x, '#8a5a2b', 14, 40, 3, 16);
    R(x, '#1f7a2a', 4, 20, 10, 3); R(x, '#1f7a2a', 18, 20, 10, 3); R(x, '#2fa83a', 8, 15, 16, 3); R(x, '#1f7a2a', 2, 24, 8, 2);
    R(x, '#1f7a2a', 22, 24, 8, 2); R(x, '#46c850', 12, 10, 8, 4); R(x, '#2fa83a', 6, 18, 6, 2); R(x, '#2fa83a', 20, 18, 6, 2);
    R(x, '#5a3a18', 13, 21, 3, 3); R(x, '#5a3a18', 17, 21, 3, 3);
  });
  SP.tower = mk(40, 84, function (x) {
    R(x, '#3d5a8c', 6, 10, 28, 74); R(x, '#6f93c8', 6, 10, 5, 74); R(x, '#2c4470', 30, 10, 4, 74); R(x, '#24365a', 12, 4, 16, 6); R(x, '#aab', 19, 0, 2, 4);
    for (var yy = 16; yy < 80; yy += 8) { for (var xx = 13; xx < 30; xx += 6) { R(x, ((xx + yy) % 5 === 0) ? '#ffe27a' : '#26405f', xx, yy, 3, 4); } }
  });
  SP.bill = mk(48, 44, function (x) {
    R(x, '#5a4a3a', 10, 20, 3, 24); R(x, '#5a4a3a', 35, 20, 3, 24); R(x, '#222', 2, 2, 44, 20); R(x, '#FDC921', 4, 4, 40, 16);
    R(x, '#1E3248', 6, 6, 36, 12); x.fillStyle = '#FDC921'; x.font = 'bold 10px monospace'; x.textAlign = 'center'; x.fillText('LEAH', 24, 16);
  });
  SP.cactus = mk(24, 44, function (x) {
    R(x, '#2d8a3a', 9, 4, 6, 40); R(x, '#46b050', 9, 4, 2, 40); R(x, '#2d8a3a', 2, 16, 4, 14); R(x, '#2d8a3a', 2, 26, 8, 4); R(x, '#2d8a3a', 18, 10, 4, 12);
    R(x, '#2d8a3a', 14, 20, 8, 4); R(x, '#46b050', 2, 16, 1, 14); R(x, '#f5d0e0', 11, 1, 3, 3);
  });
  SP.adobe = mk(56, 40, function (x) {
    R(x, '#d9854a', 4, 8, 48, 32); R(x, '#f0a566', 4, 8, 6, 32); R(x, '#b8662f', 46, 8, 6, 32); R(x, '#8a4a22', 2, 4, 52, 6);
    R(x, '#3a2414', 24, 20, 10, 20); R(x, '#3a2414', 26, 17, 6, 4); R(x, '#5ab0e0', 10, 16, 8, 8); R(x, '#5ab0e0', 40, 16, 8, 8);
    R(x, '#e84a8a', 4, 30, 48, 3); R(x, '#f5c43a', 4, 33, 48, 2);
  });
  SP.rock = mk(36, 24, function (x) {
    disc(x, '#7d7a72', 12, 14, 10); disc(x, '#9b988f', 22, 12, 11); R(x, '#7d7a72', 4, 16, 28, 8); R(x, '#b9b6ad', 16, 5, 6, 3); R(x, '#5f5c55', 4, 21, 28, 3);
  });
  SP.jungle = mk(48, 64, function (x) {
    R(x, '#6a4020', 21, 30, 6, 34); R(x, '#8a5a30', 21, 30, 2, 34); disc(x, '#14602a', 24, 24, 20); disc(x, '#1f8a3a', 18, 20, 12); disc(x, '#2fb04a', 30, 16, 9);
    R(x, '#e83a3a', 12, 28, 3, 3); R(x, '#e83a3a', 32, 22, 3, 3); R(x, '#f5d03a', 26, 30, 3, 3); R(x, '#e83a3a', 20, 10, 3, 3);
  });
  SP.bush = mk(32, 20, function (x) {
    disc(x, '#1f7a30', 10, 12, 9); disc(x, '#2fa040', 22, 11, 9); R(x, '#1f7a30', 4, 14, 24, 6);
    R(x, '#ff5a9a', 8, 7, 3, 3); R(x, '#f5d03a', 18, 5, 3, 3); R(x, '#ff5a3a', 25, 9, 3, 3); R(x, '#ff5a9a', 14, 11, 3, 3);
  });
  SP.pine = mk(32, 60, function (x) {
    R(x, '#5a3a1a', 14, 48, 4, 12); tri(x, '#14502a', 16, 2, 22, 20); tri(x, '#1a6a34', 16, 14, 28, 22); tri(x, '#14502a', 16, 28, 32, 24);
    R(x, '#f0f6fa', 12, 6, 8, 3); R(x, '#f0f6fa', 8, 20, 6, 3); R(x, '#f0f6fa', 18, 22, 6, 3); R(x, '#f0f6fa', 4, 36, 8, 3);
  });
  SP.cabin = mk(56, 38, function (x) {
    R(x, '#8a5a30', 6, 14, 44, 24); for (var yy = 16; yy < 38; yy += 5) { R(x, '#6a4020', 6, yy, 44, 1); }
    tri(x, '#b83a2a', 28, 0, 58, 16); R(x, '#f0f6fa', 14, 3, 28, 2); R(x, '#5a3a18', 38, 2, 6, 8); R(x, '#3a2414', 24, 24, 9, 14); R(x, '#8ad0f0', 10, 20, 8, 7); R(x, '#8ad0f0', 38, 20, 8, 7);
  });
  SP.poplar = mk(18, 64, function (x) {
    R(x, '#6a4a2a', 8, 50, 3, 14); x.fillStyle = '#3f9a30'; x.beginPath(); x.ellipse(9, 28, 8, 28, 0, 0, 7); x.fill();
    x.fillStyle = '#5fc048'; x.beginPath(); x.ellipse(6, 26, 3, 20, 0, 0, 7); x.fill();
  });
  SP.lavender = mk(40, 20, function (x) {
    R(x, '#3f7a30', 0, 14, 40, 6);
    for (var i = 0; i < 12; i++) { R(x, i % 2 ? '#9a6ad8' : '#b890f0', 2 + i * 3, 4 + (i % 3) * 2, 2, 12 - (i % 3) * 2); }
  });
  SP.frhouse = mk(56, 44, function (x) {
    R(x, '#f0e4c4', 6, 16, 44, 28); R(x, '#d8c8a0', 44, 16, 6, 28); tri(x, '#4a5a7a', 28, 0, 58, 18); R(x, '#3a4a68', 6, 14, 44, 3);
    R(x, '#8ab0d8', 12, 24, 7, 10); R(x, '#8ab0d8', 37, 24, 7, 10); R(x, '#3a6a9a', 10, 24, 2, 10); R(x, '#3a6a9a', 19, 24, 2, 10); R(x, '#3a6a9a', 35, 24, 2, 10); R(x, '#3a6a9a', 44, 24, 2, 10);
    R(x, '#7a4a2a', 24, 30, 8, 14);
  });
  var CAR_COL = ['#e8392f', '#2f7be8', '#f5c42a', '#eeeeee', '#8a3ad8', '#ff8a1f', '#27272e'];
  function sedan(col) {
    return mk(28, 16, function (x) {
      R(x, '#111', 2, 11, 5, 5); R(x, '#111', 21, 11, 5, 5); R(x, col, 3, 4, 22, 9); R(x, 'rgba(255,255,255,.35)', 3, 4, 22, 2);
      R(x, col, 7, 0, 14, 5); R(x, '#17202c', 8, 1, 12, 3); R(x, '#ff3030', 4, 8, 4, 3); R(x, '#ff3030', 20, 8, 4, 3); R(x, '#222', 3, 13, 22, 2); R(x, '#f0f0f0', 11, 10, 6, 3);
    });
  }
  function truck(col) {
    return mk(32, 24, function (x) {
      R(x, '#111', 2, 18, 6, 6); R(x, '#111', 24, 18, 6, 6); R(x, col, 3, 6, 26, 14); R(x, 'rgba(255,255,255,.3)', 3, 6, 26, 2); R(x, '#3a3a44', 5, 8, 22, 5);
      R(x, col, 7, 0, 18, 7); R(x, '#17202c', 9, 1, 14, 5); R(x, '#ff3030', 4, 14, 4, 3); R(x, '#ff3030', 24, 14, 4, 3); R(x, '#222', 3, 20, 26, 2);
    });
  }
  var CARS = [];
  CAR_COL.forEach(function (c, i) { CARS.push(i % 3 === 2 ? truck(c) : sedan(c)); });
  SP.bat0 = mk(20, 26, function (x) {
    R(x, '#0a3a10', 3, 4, 14, 22); R(x, '#3cff4a', 4, 5, 12, 20); R(x, '#a8ffb0', 4, 5, 3, 20); R(x, '#0a3a10', 7, 0, 6, 5); R(x, '#d8ffd8', 8, 1, 4, 3);
    R(x, '#ffffff', 10, 8, 3, 5); R(x, '#ffffff', 8, 12, 5, 3); R(x, '#ffffff', 8, 14, 3, 6);
  });
  SP.bat1 = mk(20, 26, function (x) {
    R(x, '#0a3a10', 3, 4, 14, 22); R(x, '#7dff6a', 4, 5, 12, 20); R(x, '#d8ffd0', 4, 5, 3, 20); R(x, '#0a3a10', 7, 0, 6, 5); R(x, '#d8ffd8', 8, 1, 4, 3);
    R(x, '#ffffff', 10, 8, 3, 5); R(x, '#ffffff', 8, 12, 5, 3); R(x, '#ffffff', 8, 14, 3, 6);
  });
  var SPEC = {   // world width of each sprite (units), collision width (road half-widths), solid or not
    palm: [1000, 0.3, 1], tower: [2200, 0.9, 1], bill: [1500, 0.5, 1], cactus: [700, 0.2, 1], adobe: [2000, 0.8, 1], rock: [1100, 0.4, 1],
    jungle: [1900, 0.5, 1], bush: [900, 0.3, 0], pine: [1000, 0.3, 1], cabin: [2000, 0.8, 1], poplar: [600, 0.2, 1], lavender: [1500, 0.5, 0], frhouse: [2000, 0.8, 1]
  };

  // ------------------------------------------------------------------ Leah's Jeep (neon green, electric), seen from behind
  function jeepSprite(steer) {
    return mk(64, 40, function (x) {
      var s = steer || 0;
      R(x, 'rgba(0,0,0,.35)', 5, 36, 54, 3);
      R(x, '#0c0c0c', 2 + s, 27, 12, 11); R(x, '#0c0c0c', 50 + s, 27, 12, 11); R(x, '#8a8f98', 6 + s, 31, 4, 4); R(x, '#8a8f98', 54 + s, 31, 4, 4);
      R(x, '#1c1c24', 6, 6, 52, 10);                                               // cabin interior
      R(x, '#2b2b36', 18, 8, 10, 8); R(x, '#2b2b36', 36, 8, 10, 8);                  // seat backs
      R(x, '#2a1608', 27, 1, 10, 12); R(x, '#4a2a10', 28, 2, 3, 9); R(x, '#f5f5f5', 27, 12, 10, 4);   // Leah: long dark hair and a white top
      R(x, '#1f9a08', 13, 0, 3, 16); R(x, '#1f9a08', 48, 0, 3, 16); R(x, '#1f9a08', 13, 0, 38, 3);   // roll bar
      R(x, '#3cff1e', 3, 15, 58, 13); R(x, '#a8ff66', 5, 16, 54, 2); R(x, '#1f9a08', 3, 26, 58, 2);  // tailgate and rear body
      R(x, '#3cff1e', 1, 19, 8, 11); R(x, '#3cff1e', 55, 19, 8, 11); R(x, '#a8ff66', 2, 20, 2, 8); R(x, '#a8ff66', 56, 20, 2, 8);   // fenders
      R(x, '#ff2a2a', 4, 18, 5, 6); R(x, '#ff9a9a', 5, 19, 2, 2); R(x, '#ff2a2a', 55, 18, 5, 6); R(x, '#ff9a9a', 56, 19, 2, 2);        // tail lights
      disc(x, '#101010', 32, 22, 8); disc(x, '#2a2a2a', 32, 22, 5); disc(x, '#3cff1e', 32, 22, 2);                                  // spare tire
      R(x, '#3a3f48', 4, 29, 56, 5);                                               // bumper
      R(x, '#1a4fd0', 26, 30, 12, 4); R(x, '#ffffff', 28, 31, 8, 1); R(x, '#ffffff', 28, 33, 8, 1);   // plate
    });
  }
  var JEEP = [jeepSprite(-2), jeepSprite(0), jeepSprite(2)];   // code-drawn fallback, replaced by Leah's art once it loads
  (function () {
    var back = new Image(), turn = new Image();
    back.onload = function () { JEEP[1] = back; };
    turn.onload = function () {   // Leah's back-left 3/4 view; mirrored for the other direction
      JEEP[2] = turn;
      JEEP[0] = mk(turn.width, turn.height, function (x) { x.translate(turn.width, 0); x.scale(-1, 1); x.drawImage(turn, 0, 0); });
    };
    back.src = '/assets/img/jeep-back.png?v=1'; turn.src = '/assets/img/jeep-turn.png?v=1';
  })();

  // ------------------------------------------------------------------ levels
  function bgHouston(x) {
    var r = rng(11);
    disc(x, '#ffb347', 470, 74, 36); disc(x, '#ffd27a', 470, 74, 26);
    for (var i = 0; i < 640; i += 8 + Math.floor(r() * 10)) {
      var w = 8 + Math.floor(r() * 14), h = 10 + Math.floor(r() * 36);
      R(x, '#4a3a7a', i, HZ - h, w, h); R(x, '#5a4a8a', i, HZ - h, 2, h);
      for (var yy = HZ - h + 3; yy < HZ - 2; yy += 5) { if (r() > 0.5) { R(x, '#ffe27a', i + 3 + Math.floor(r() * (w - 6)), yy, 2, 2); } }
    }
    R(x, '#4a3a7a', 120, HZ - 62, 10, 62); R(x, '#4a3a7a', 122, HZ - 70, 6, 8); R(x, '#4a3a7a', 380, HZ - 56, 12, 56); tri(x, '#4a3a7a', 386, HZ - 68, 12, 12);
  }
  function bgMexico(x) {
    var r = rng(22);
    disc(x, '#fff0a0', 150, 70, 30);
    for (var i = -20; i < 660; i += 50) { tri(x, '#b4552a', i + 25, HZ - 22 - Math.floor(r() * 26), 70, 60); }
    for (var i2 = -20; i2 < 660; i2 += 60) { tri(x, '#8a3a1c', i2 + 20, HZ - 14 - Math.floor(r() * 10), 60, 40); }
    for (var k = 0; k < 6; k++) { R(x, k % 2 ? '#d9a066' : '#c58a4e', 440 + k * 6, HZ - 12 - (5 - k) * 6 - 6, 80 - k * 12, 7); }   // stepped pyramid
    R(x, '#d9a066', 470, HZ - 8, 20, 8);
  }
  function bgCosta(x) {
    var r = rng(33);
    disc(x, '#fff4b0', 540, 28, 16);
    for (var c = 0; c < 6; c++) { var cx = 40 + c * 110, cy = 20 + (c % 3) * 12; R(x, '#fff', cx, cy, 36, 6); R(x, '#fff', cx + 6, cy - 4, 22, 6); }
    tri(x, '#5a6a5a', 250, HZ - 60, 190, 60); tri(x, '#3d4a3d', 250, HZ - 60, 40, 14); R(x, '#aab4aa', 240, HZ - 76, 18, 8); disc(x, '#d0d8d0', 262, HZ - 82, 8); disc(x, '#e4eae4', 276, HZ - 90, 6);
    for (var i = -20; i < 660; i += 40) { disc(x, '#1f7a30', i + 20, HZ - 2, 22 + Math.floor(r() * 10)); }
    for (var j = 0; j < 640; j += 30) { disc(x, '#2f9a40', j, HZ + 2, 14); }
  }
  function bgColorado(x) {
    var r = rng(44);
    for (var i = -30; i < 680; i += 90) {
      var h = 44 + Math.floor(r() * 30);
      tri(x, '#7d8fb0', i + 45, HZ - h, 130, h); tri(x, '#f4f8ff', i + 45, HZ - h, 42, Math.round(h * 0.34));
    }
    for (var k = -20; k < 680; k += 55) { tri(x, '#5a6a8a', k + 30, HZ - 30 - Math.floor(r() * 12), 80, 42); }
    for (var p = 0; p < 640; p += 12) { tri(x, '#1a4a2a', p + 6, HZ - 12, 12, 14); }
  }
  function bgFrance(x) {
    var r = rng(55);
    for (var i = -40; i < 680; i += 110) { disc(x, i % 220 ? '#6aae5a' : '#7bc068', i + 55, HZ + 20, 44 + Math.floor(r() * 12)); }
    var ex = 320, base = HZ - 2;   // the tower in the distance
    x.fillStyle = '#5a4a58';
    x.beginPath(); x.moveTo(ex - 28, base); x.lineTo(ex - 8, base - 40); x.lineTo(ex - 4, base - 62); x.lineTo(ex, base - 82); x.lineTo(ex + 4, base - 62); x.lineTo(ex + 8, base - 40); x.lineTo(ex + 28, base); x.lineTo(ex + 20, base); x.lineTo(ex, base - 26); x.lineTo(ex - 20, base); x.closePath(); x.fill();
    R(x, '#5a4a58', ex - 12, base - 42, 24, 3); R(x, '#5a4a58', ex - 7, base - 64, 14, 3); R(x, '#5a4a58', ex - 1, base - 92, 2, 12);
    for (var k = 0; k < 10; k++) { R(x, '#6a5a68', 60 + k * 64, base - 3, 3, 3); }
  }
  var LEVELS = [
    { name: 'Houston area', len: 2200, start: 30, cp: 12, traffic: 26, curve: 3, hill: 14, seed: 101, bg: bgHouston, sprites: ['palm', 'tower', 'bill'],
      sky: ['#3a2a7a', '#6a3a8a', '#b04a8a', '#e86a6a', '#ff9a5a', '#ffc86a'], grass: ['#2fa040', '#28903a'], road: ['#5a5a66', '#52525e'], rumble: ['#e83a3a', '#f2f2f2'], lane: '#f2f2f2' },
    { name: 'Mexico', len: 2300, start: 32, cp: 12, traffic: 36, curve: 4, hill: 24, seed: 202, bg: bgMexico, sprites: ['cactus', 'adobe', 'rock'],
      sky: ['#d8501a', '#ee7a22', '#f5a030', '#fac14a', '#fedf70', '#fff0a0'], grass: ['#d9a35a', '#cd9650'], road: ['#6a5a54', '#62524c'], rumble: ['#2a8a4a', '#f2f2f2'], lane: '#f5e8c0' },
    { name: 'Costa Rica', len: 2400, start: 34, cp: 11, traffic: 46, curve: 4, hill: 34, seed: 303, bg: bgCosta, sprites: ['jungle', 'palm', 'bush'],
      sky: ['#3aa0e8', '#5ab8f0', '#7acaf5', '#9adaf8', '#bae8fa', '#d8f4fc'], grass: ['#1f9a3a', '#188a32'], road: ['#4e5258', '#464a50'], rumble: ['#f5c42a', '#2a2a30'], lane: '#f2f2f2' },
    { name: 'Colorado', len: 2500, start: 36, cp: 11, traffic: 58, curve: 5, hill: 46, seed: 404, bg: bgColorado, sprites: ['pine', 'rock', 'cabin'],
      sky: ['#2a6ad0', '#4a8ae0', '#6aa4ea', '#8abcf0', '#aad0f5', '#cae2f9'], grass: ['#5a8a5a', '#4e7e50'], road: ['#5a5e68', '#525660'], rumble: ['#e8e8f0', '#c03030'], lane: '#f2f2f2' },
    { name: 'France', len: 2600, start: 38, cp: 10, traffic: 70, curve: 6, hill: 56, seed: 505, bg: bgFrance, sprites: ['poplar', 'lavender', 'frhouse'],
      sky: ['#7a8ae0', '#9a9ae8', '#c4a4e8', '#eeb0e0', '#fcc4d0', '#ffdcc4'], grass: ['#8ac860', '#7cb856'], road: ['#6a6a72', '#62626a'], rumble: ['#2a4ad0', '#f2f2f2'], lane: '#f2f2f2' }
  ];

  // ------------------------------------------------------------------ state
  var el = {
    time: document.getElementById('hudTime'), level: document.getElementById('hudLevel'), speed: document.getElementById('hudSpeed'),
    start: document.getElementById('gameStart'), over: document.getElementById('gameOver'), win: document.getElementById('gameWin')
  };
  var keys = { left: false, right: false, gas: false, brake: false };
  var mode = 'idle';             // idle | card | drive | finish | dying | over | win
  var level = 1, L = LEVELS[0];
  var segs = [], total = 0, cars = [], bgCanvas = null, bgX = 0;
  var pos = 0, speed = 0, playerX = 0, boostT = 0, crashT = 0, timeLeft = 0, lvlMs = 0, clockMs = 0, cardT = 0, finT = 0, toast = '', toastT = 0, flash = 0;
  var cpDone = [], finishSeg = 0, runNonce = '', finalMs = 0, god = false, tick = 0;
  var me = { name: 'Driver', fan: false };

  // ------------------------------------------------------------------ road building
  function lastY() { return segs.length ? segs[segs.length - 1].y2 : 0; }
  function addSeg(curve, y) {
    var n = segs.length, y1 = lastY();
    segs.push({ i: n, z1: n * SEG, z2: (n + 1) * SEG, y1: y1, y2: y, curve: curve, sprites: [], cars: [], light: Math.floor(n / RUMBLE) % 2, boost: 0, gate: '', item: null });
  }
  function addRoad(enter, hold, leave, curve, y) {
    var y0 = lastY(), dy = y0 + y * SEG, n, t = enter + hold + leave;
    for (n = 0; n < enter; n++) { addSeg(ease(0, curve, n / enter), ease(y0, dy, n / t)); }
    for (n = 0; n < hold; n++) { addSeg(curve, ease(y0, dy, (enter + n) / t)); }
    for (n = 0; n < leave; n++) { addSeg(ease(curve, 0, n / leave), ease(y0, dy, (enter + hold + n) / t)); }
  }
  function buildLevel(n) {
    L = LEVELS[n - 1];
    var r = rng(L.seed);
    segs = []; cars = [];
    addRoad(0, 0, 0, 0, 0);
    for (var k = 0; k < 40; k++) { addSeg(0, 0); }                              // straight start
    while (segs.length < L.len) {
      var p = r(), len = 20 + Math.floor(r() * 30), sgn = r() < 0.5 ? -1 : 1, c = L.curve * (0.4 + 0.6 * r());
      var hill = L.hill / 100 * (r() - 0.45) * 90;
      if (p < 0.2) { addRoad(10, len, 10, 0, 0); }
      else if (p < 0.55) { addRoad(15, len, 15, sgn * c, 0); }
      else if (p < 0.75) { addRoad(15, len, 15, 0, hill * 0.6); }
      else if (p < 0.9) { addRoad(12, len, 12, sgn * c, hill * 0.5); }
      else { addRoad(10, 18, 10, sgn * c, 0); addRoad(10, 18, 10, -sgn * c, 0); }   // S-bend
    }
    addRoad(15, 30, 15, 0, -lastY() / SEG);                                     // flatten out
    finishSeg = segs.length - 10;
    for (var e = 0; e < 300; e++) { addSeg(0, 0); }                              // run-off after the finish line
    total = segs.length;
    // checkpoints at 1/3 and 2/3
    cpDone = [false, false];
    segs[Math.floor(finishSeg / 3)].gate = 'CHECKPOINT'; segs[Math.floor(finishSeg * 2 / 3)].gate = 'CHECKPOINT'; segs[finishSeg].gate = 'FINISH';
    // scenery on both sides
    for (var s = 10; s < total - 20; s += 3 + Math.floor(r() * 6)) {
      var t = L.sprites[Math.floor(r() * L.sprites.length)], side = r() < 0.5 ? -1 : 1;
      segs[s].sprites.push({ t: t, off: side * (1.35 + r() * 2.8), sp: SPEC[t] });
      if (r() < 0.5) { var t2 = L.sprites[Math.floor(r() * L.sprites.length)]; segs[s].sprites.push({ t: t2, off: -side * (1.35 + r() * 2.8), sp: SPEC[t2] }); }
    }
    // boost arrows (3 segments each) and batteries
    for (var b = 90; b < finishSeg - 40; b += 110 + Math.floor(r() * 90)) {
      var lane = [-0.5, 0, 0.5][Math.floor(r() * 3)];
      for (var q = 0; q < 3; q++) { segs[b + q].boost = 1; segs[b + q].boostOff = lane; }
    }
    for (var bt = 60; bt < finishSeg - 20; bt += 170 + Math.floor(r() * 120)) {
      var o = [-0.65, -0.2, 0.2, 0.65][Math.floor(r() * 4)];
      for (var m = 0; m < 3; m++) { if (!segs[bt + m * 4].boost) { segs[bt + m * 4].item = { off: o + (m - 1) * 0.0, got: false }; } }
    }
    // traffic
    for (var cI = 0; cI < L.traffic; cI++) {
      var z = (120 + r() * (finishSeg - 150)) * SEG;
      cars.push({ z: z, off: [-0.7, -0.35, 0, 0.35, 0.7][Math.floor(r() * 5)], speed: MAXS * (0.22 + 0.3 * r()) * (0.85 + 0.05 * n), spr: CARS[Math.floor(r() * CARS.length)], w: 0.28 });
    }
    // distant background layer
    bgCanvas = mk(640, HZ + 30, function (x) { L.bg(x); });
  }
  function segAt(z) { return segs[Math.floor(z / SEG) % total]; }

  function loadLevel(n) {
    level = n; buildLevel(n);
    pos = 0; speed = 0; playerX = 0; boostT = 0; crashT = 0; lvlMs = 0; toast = ''; flash = 0;
    timeLeft = L.start + (loadLevel.carry || 0); loadLevel.carry = 0;
    mode = 'card'; cardT = 2.2;
    hud();
  }

  // ------------------------------------------------------------------ audio (WebAudio, original beeps)
  var ac = null, master = null, eng = null, engGain = null, muted = false;
  function audio() {
    if (ac) { if (ac.state === 'suspended') { ac.resume(); } return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { return; }
    ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
    eng = ac.createOscillator(); eng.type = 'sawtooth'; engGain = ac.createGain(); engGain.gain.value = 0;
    eng.connect(engGain); engGain.connect(master); eng.start();
  }
  function beep(f1, f2, dur, type, vol) {
    if (!ac || muted) { return; }
    var o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime;
    o.type = type || 'square'; o.frequency.setValueAtTime(f1, t); o.frequency.linearRampToValueAtTime(f2, t + dur);
    v.gain.setValueAtTime(vol || 0.15, t); v.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(v); v.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  var SFX = {
    batt: function () { beep(660, 1320, 0.14); },
    boost: function () { beep(200, 900, 0.35, 'sawtooth', 0.12); },
    crash: function () { beep(160, 40, 0.3, 'sawtooth', 0.2); },
    cp: function () { beep(523, 523, 0.1); setTimeout(function () { beep(784, 784, 0.18); }, 110); },
    lose: function () { beep(400, 80, 0.8, 'triangle', 0.2); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { beep(f, f, 0.2); }, i * 150); }); }
  };
  document.getElementById('muteBtn').addEventListener('click', function () {
    muted = !muted; this.setAttribute('aria-pressed', muted ? 'true' : 'false'); this.textContent = muted ? 'Sound off' : 'Sound on';
    if (master) { master.gain.value = muted ? 0 : 0.5; }
  });

  // ------------------------------------------------------------------ update
  function overlap(x1, w1, x2, w2) { return Math.abs(x1 - x2) < (w1 + w2) / 2; }
  function update(dt) {
    tick += dt;
    if (toastT > 0) { toastT -= dt; }
    if (flash > 0) { flash -= dt; }
    if (mode === 'card') { cardT -= dt; if (cardT <= 0) { mode = 'drive'; } }
    var driving = mode === 'drive';
    var finishing = mode === 'finish' || mode === 'dying';
    var seg = segAt(pos + PLAYER_Z), pct = speed / MAXS;

    if (driving || finishing) {
      var gas = driving && keys.gas, brake = keys.brake || mode === 'dying';
      var cap = boostT > 0 ? MAXS * 1.4 : MAXS;
      if (mode === 'finish') { gas = false; brake = true; }
      if (gas) { speed += (boostT > 0 ? ACCEL * 2 : ACCEL) * dt; } else if (brake) { speed += BRAKE * dt; } else { speed += DECEL * dt; }
      if (mode === 'dying' && !gas) { speed += DECEL * 1.5 * dt; }
      if (driving) {
        var dx = 2 * dt * Math.min(1, pct + 0.15);
        if (keys.left) { playerX -= dx; } else if (keys.right) { playerX += dx; }
        playerX -= dx * pct * seg.curve * CENTRI;
      }
      if ((playerX < -1 || playerX > 1) && speed > OFFLIMIT) { speed += OFFDECEL * dt; }
      playerX = clamp(playerX, -2.2, 2.2);
      if (boostT > 0) { boostT -= dt; }
      speed = clamp(speed, 0, boostT > 0 ? cap : Math.max(MAXS, speed - ACCEL * dt));
      if (speed > MAXS && boostT <= 0) { speed = Math.max(MAXS, speed - ACCEL * 1.5 * dt); }
      pos += speed * dt;
      bgX += seg.curve * pct * dt * 60 * 0.9;
      pct = speed / MAXS;

      // roadside things and traffic
      var ps = segAt(pos + PLAYER_Z);
      for (var s = 0; s < ps.sprites.length; s++) {
        var sp = ps.sprites[s];
        if (sp.sp[2] && speed > MAXS / 8 && overlap(playerX, PW, sp.off, sp.sp[1])) { crash(); pos = ps.z1 - PLAYER_Z; break; }
      }
      for (var c = 0; c < cars.length; c++) {
        var car = cars[c];
        if (car.z > pos + PLAYER_Z - SEG * 0.5 && car.z < pos + PLAYER_Z + SEG * 1.2 && speed > car.speed && overlap(playerX, PW, car.off, car.w)) {
          speed = car.speed * 0.5; pos = car.z - PLAYER_Z - SEG * 0.6; crash(); break;
        }
      }
      if (driving) {
        // boost arrows, batteries, checkpoints
        if (ps.boost && Math.abs(playerX - ps.boostOff) < 0.4 && boostT <= 0.2) { boostT = 1.4; SFX.boost(); toast = 'BOOST!'; toastT = 0.8; }
        for (var q = 0; q < 2; q++) {
          var it = segs[Math.floor((pos + PLAYER_Z) / SEG) - q];
          if (it && it.item && !it.item.got && Math.abs(playerX - it.item.off) < 0.3) { it.item.got = true; timeLeft += 2; SFX.batt(); toast = '+2s battery'; toastT = 0.9; flash = 0.12; }
        }
        var idx = Math.floor((pos + PLAYER_Z) / SEG);
        [Math.floor(finishSeg / 3), Math.floor(finishSeg * 2 / 3)].forEach(function (cs, i) {
          if (!cpDone[i] && idx >= cs) { cpDone[i] = true; timeLeft += L.cp; SFX.cp(); toast = 'CHECKPOINT +' + L.cp + 's'; toastT = 1.8; }
        });
        if (idx >= finishSeg) { levelDone(); }
        if (!god) { timeLeft -= dt; }
        lvlMs += dt * 1000; clockMs += dt * 1000;
        if (timeLeft <= 0 && mode === 'drive') { timeLeft = 0; mode = 'dying'; finT = 0; SFX.lose(); }
      }
      if (crashT > 0) { crashT -= dt; }
    }
    if (mode === 'finish') { finT += dt; if (finT > 2.8) { next(); } }
    if (mode === 'dying') { finT += dt; if (finT > 1.6 || speed < 1) { if (finT > 1.0) { gameOver(); } } }

    // traffic moves forward, a little slower than the player's top speed
    cars.forEach(function (c2) { c2.z += c2.speed * dt; });
    for (var i = 0; i < segs.length; i++) { if (segs[i].cars.length) { segs[i].cars.length = 0; } }
    cars.forEach(function (c3) { var sg = segAt(c3.z); if (sg) { sg.cars.push(c3); } });
    if (eng && engGain) { eng.frequency.value = 50 + (speed / MAXS) * 160; engGain.gain.value = muted || mode === 'idle' || mode === 'over' || mode === 'win' ? 0 : 0.035 + (speed / MAXS) * 0.02; }
    hud();
  }
  function crash() { if (crashT <= 0) { SFX.crash(); } crashT = 0.5; if (speed > MAXS / 5) { speed = MAXS / 5; } }

  function levelDone() {
    if (mode !== 'drive') { return; }
    if (level >= TOTAL) { gameWon(); return; }
    mode = 'finish'; finT = 0; SFX.cp();
    var bonus = Math.round(Math.max(0, timeLeft) * 0.25);
    loadLevel.carry = bonus; toast = 'LEVEL COMPLETE  +' + bonus + 's saved'; toastT = 2.6;
  }
  function next() { loadLevel(level + 1); }

  // ------------------------------------------------------------------ hall of fame (same system as the surf game, game = "road")
  function api(body) {
    body.game = 'road';
    return fetch('/api/scores.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function renderHof(list) {
    var ol = document.getElementById('hof');
    if (!ol) { return; }
    ol.textContent = '';
    if (!list || !list.length) { var li0 = document.createElement('li'); li0.className = 'hint'; li0.textContent = 'No times yet. Be the first!'; ol.appendChild(li0); return; }
    list.forEach(function (r) {
      var li = document.createElement('li');
      if (r.mine) { li.className = 'me'; }
      var tt = document.createElement('span'); tt.className = 't'; tt.textContent = fmt(r.ms);
      var lv = document.createElement('span'); lv.className = 'lv'; lv.textContent = r.won ? 'Cleared all 5' : 'Level ' + r.level;
      li.appendChild(document.createTextNode(r.name + ' ')); li.appendChild(lv); li.appendChild(tt);
      if (r.seen) { var sn = document.createElement('span'); sn.className = 'seen'; sn.textContent = 'last seen ' + r.seen; li.appendChild(sn); }
      ol.appendChild(li);
    });
  }
  function setMe(m) { if (!m) { return; } me = m; var j = document.getElementById('hofJoin'); if (j) { j.hidden = !!m.fan; } }
  function loadHof() {
    fetch('/api/scores.php?game=road', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
      .then(function (d) { setMe(d.me); renderHof(d.top); }).catch(function () { renderHof([]); });
  }
  function saveRun(won, noteEl) {
    noteEl.textContent = '';
    api({ action: 'submit', nonce: runNonce, ms: Math.round(clockMs), level: level, won: won }).then(function (d) {
      if (d.error) { noteEl.textContent = d.error; return; }
      setMe(d.me); renderHof(d.top);
      if (!d.saved) { return; }
      noteEl.textContent = d.improved ? 'Saved to the hall of fame as ' + me.name + '.'
        : 'Your best is still ' + (d.best.won ? 'all 5 levels' : 'level ' + d.best.level) + ' in ' + fmt(d.best.ms) + '.';
      if (!me.fan) {
        noteEl.appendChild(document.createTextNode(' '));
        var a = document.createElement('a'); a.href = '/fans.php?v=join'; a.textContent = 'Join the fan club to play under your own username.'; noteEl.appendChild(a);
      }
    }).catch(function () { noteEl.textContent = 'Could not reach the server.'; });
  }

  var SNARK = ['Even an electric Jeep needs a charger, Leah says.', 'Zero percent. The Jeep is now a very green lawn ornament.', 'Leah is calling a tow truck. Try again!',
    'Tip: batteries are the green ones. Just saying.', 'The Jeep is out of juice, but the road trip is not over.', 'Plug in and go again, driver!'];
  var snarkIdx = 0;
  function hud() {
    el.time.textContent = 'Battery ' + Math.ceil(timeLeft) + 's';
    el.level.textContent = 'Level ' + level + '/' + TOTAL;
    el.speed.textContent = Math.round(speed / MAXS * 120) + ' mph';
  }
  function beginRun() {
    audio();
    level = 1; clockMs = 0; runNonce = ''; loadLevel.carry = 0;
    keys.left = keys.right = keys.gas = keys.brake = false;
    el.start.hidden = true; el.over.hidden = true; el.win.hidden = true;
    api({ action: 'start' }).then(function (d) { runNonce = d.nonce || ''; setMe(d.me); }).catch(function () { runNonce = ''; });
    loadLevel(1);
  }
  function gameOver() {
    mode = 'over'; speed = 0;
    document.getElementById('overMsg').textContent = SNARK[snarkIdx++ % SNARK.length];
    document.getElementById('overInfo').textContent = 'You made it to level ' + level + ' (' + L.name + ') in ' + fmt(clockMs) + '.';
    el.over.hidden = false;
    saveRun(false, document.getElementById('overNote'));
  }
  function gameWon() {
    mode = 'win'; finalMs = Math.round(clockMs); level = TOTAL; SFX.win();
    document.getElementById('winTime').textContent = 'Your time: ' + fmt(finalMs);
    document.getElementById('winWho').textContent = 'Playing as ' + me.name + '.';
    document.getElementById('winNote').textContent = '';
    el.win.hidden = false;
    saveRun(true, document.getElementById('winNote'));
  }
  ['startBtn', 'retryBtn', 'againBtn'].forEach(function (id) { document.getElementById(id).addEventListener('click', beginRun); });

  // ------------------------------------------------------------------ drawing
  function project(p, camX, camY, camZ) {
    var sc = CAM_D / (p.z - camZ);
    p.sc = sc; p.sx = Math.round(W / 2 + sc * (p.x - camX) * W / 2); p.sy = Math.round(HZ - sc * (p.y - camY) * H / 2); p.sw = Math.round(sc * ROAD_W * W / 2);
  }
  function quad(x1, y1, w1, x2, y2, w2, col) {
    g.fillStyle = col; g.beginPath(); g.moveTo(x1 - w1, y1); g.lineTo(x2 - w2, y2); g.lineTo(x2 + w2, y2); g.lineTo(x1 + w1, y1); g.closePath(); g.fill();
  }
  function drawSprite(img, ww, sc, cx, base, clip, shiftX) {
    var dw = ww * sc * W / 2, dh = dw * img.height / img.width;
    if (dw < 1) { return; }
    var dx = cx - dw / 2 + (shiftX || 0), dy = base - dh, ch = clip != null && clip < base ? Math.max(0, base - clip) : 0;
    if (ch >= dh) { return; }
    g.drawImage(img, 0, 0, img.width, img.height - ch * img.height / dh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh - ch));
  }
  function draw() {
    var i, s, sg, ci = Math.floor(pos / SEG), base = segs[ci % total], bp = (pos % SEG) / SEG;
    var camY = CAM_H + (base.y1 + (base.y2 - base.y1) * bp);
    // sky
    var bands = L.sky, bh = Math.ceil((HZ + 1) / bands.length);
    for (i = 0; i < bands.length; i++) { g.fillStyle = bands[i]; g.fillRect(0, i * bh, W, bh + 1); }
    var off = ((bgX % 640) + 640) % 640;
    g.drawImage(bgCanvas, -off, 0); g.drawImage(bgCanvas, 640 - off, 0);
    g.fillStyle = L.grass[0]; g.fillRect(0, HZ, W, H - HZ);

    // road, front to back accumulating curves
    var x = 0, dx = -(base.curve * bp), maxY = H, n, p1 = {}, p2 = {};
    var camX = playerX * ROAD_W;
    for (n = 0; n < DRAW; n++) {
      sg = segs[(ci + n) % total];
      var wrap = (ci + n) >= total ? total * SEG : 0;
      p1 = { x: 0, y: sg.y1, z: sg.z1 + wrap }; p2 = { x: 0, y: sg.y2, z: sg.z2 + wrap };
      p1.x = -x; p2.x = -x - dx;
      project(p1, camX, camY, pos); project(p2, camX, camY, pos);
      x += dx; dx += sg.curve;
      sg.p1 = p1; sg.p2 = p2; sg.clip = maxY;
      if (p1.z <= CAM_D || p2.sy >= p1.sy || p2.sy >= maxY) { continue; }
      var gi = sg.light ? 0 : 1;
      g.fillStyle = L.grass[gi]; g.fillRect(0, p2.sy, W, p1.sy - p2.sy + 1);
      quad(p1.sx, p1.sy, p1.sw * 1.12, p2.sx, p2.sy, p2.sw * 1.12, L.rumble[gi]);
      quad(p1.sx, p1.sy, p1.sw, p2.sx, p2.sy, p2.sw, L.road[gi]);
      if (!sg.light) {
        [-1 / 3, 1 / 3].forEach(function (lx) { quad(p1.sx + p1.sw * lx, p1.sy, p1.sw / 40, p2.sx + p2.sw * lx, p2.sy, p2.sw / 40, L.lane); });
      }
      if (sg.boost) {   // painted arrow (chevron) that gives a boost
        var cx1 = p1.sx + p1.sw * sg.boostOff, cx2 = p2.sx + p2.sw * sg.boostOff, hw1 = p1.sw * 0.28, hw2 = p2.sw * 0.28;
        g.fillStyle = '#FFE14A'; g.beginPath();
        g.moveTo(cx1 - hw1, p1.sy); g.lineTo(cx2, p2.sy); g.lineTo(cx1 + hw1, p1.sy); g.lineTo(cx1 + hw1 * 0.6, p1.sy); g.lineTo(cx2, p2.sy + (p1.sy - p2.sy) * 0.45); g.lineTo(cx1 - hw1 * 0.6, p1.sy); g.closePath(); g.fill();
      }
      if (sg.item === null && false) { continue; }
      maxY = p2.sy;
    }
    // sprites back to front
    for (n = DRAW - 1; n > 0; n--) {
      sg = segs[(ci + n) % total];
      if (!sg.p1 || sg.p1.z <= CAM_D) { continue; }
      var pa = sg.p1, c;
      for (s = 0; s < sg.sprites.length; s++) {
        var sp = sg.sprites[s];
        drawSprite(SP[sp.t], sp.sp[0], pa.sc, pa.sx + pa.sc * sp.off * ROAD_W * W / 2, pa.sy, sg.clip);
      }
      if (sg.gate) {
        var gw = pa.sw * 1.15, gy = pa.sy, gh = pa.sc * 900 * H / 2;
        g.fillStyle = '#2a2a30'; g.fillRect(Math.round(pa.sx - gw - 1), Math.round(gy - gh), 3, Math.round(gh)); g.fillRect(Math.round(pa.sx + gw - 1), Math.round(gy - gh), 3, Math.round(gh));
        var bw = Math.round(gw * 2 + 3), bhh = Math.max(3, Math.round(gh * 0.22));
        g.fillStyle = sg.gate === 'FINISH' ? '#f2f2f2' : '#FDC921'; g.fillRect(Math.round(pa.sx - gw - 1), Math.round(gy - gh), bw, bhh);
        if (sg.gate === 'FINISH') { g.fillStyle = '#111'; for (var f = 0; f < 14; f++) { if (f % 2) { g.fillRect(Math.round(pa.sx - gw - 1 + f * bw / 14), Math.round(gy - gh), Math.ceil(bw / 14), Math.ceil(bhh / 2)); } else { g.fillRect(Math.round(pa.sx - gw - 1 + f * bw / 14), Math.round(gy - gh + bhh / 2), Math.ceil(bw / 14), Math.ceil(bhh / 2)); } } }
        else if (bhh > 5) { g.fillStyle = '#1E3248'; g.font = 'bold ' + Math.max(5, bhh - 1) + 'px monospace'; g.textAlign = 'center'; g.fillText('CHECKPOINT', pa.sx, gy - gh + bhh - 1); }
      }
      if (sg.item && !sg.item.got) { drawSprite(Math.floor(tick * 6) % 2 ? SP.bat0 : SP.bat1, 420, pa.sc, pa.sx + pa.sc * sg.item.off * ROAD_W * W / 2, pa.sy, sg.clip); }
      for (c = 0; c < sg.cars.length; c++) {
        var car = sg.cars[c], t = (car.z - sg.z1) / SEG;
        var sc = pa.sc + (sg.p2.sc - pa.sc) * t, cxx = pa.sx + (sg.p2.sx - pa.sx) * t + sc * car.off * ROAD_W * W / 2, cyy = pa.sy + (sg.p2.sy - pa.sy) * t;
        drawSprite(car.spr, 520, sc, cxx, cyy, sg.clip);
      }
    }
    // Leah's jeep
    var steer = keys.left ? 0 : keys.right ? 2 : 1;
    if (keys.left && !keys.right) { steer = 0; } else if (keys.right && !keys.left) { steer = 2; } else { steer = 1; }
    var jf = JEEP[steer], bob = speed > 1 ? (Math.floor(tick * 14) % 2) : 0, jx = Math.round(W / 2 - jf.width / 2), jy = H - jf.height - 2 + bob;
    if (crashT > 0) { jx += Math.round(Math.sin(tick * 60) * 3); }
    if (mode !== 'over' && mode !== 'win') { g.drawImage(jf, jx, jy); }
    if (boostT > 0) { g.fillStyle = 'rgba(255,255,255,.55)'; for (i = 0; i < 6; i++) { g.fillRect(Math.round((i * 53 + tick * 600) % W), 100 + (i * 17) % 70, 2, 12); } }
    if (flash > 0) { g.fillStyle = 'rgba(120,255,120,.18)'; g.fillRect(0, 0, W, H); }

    // HUD: battery and level progress
    var bx = 206, bw2 = 106, frac = clamp(timeLeft / (L.start + L.cp), 0, 1);
    g.fillStyle = '#10202e'; g.fillRect(bx - 2, 3, bw2 + 4, 12); g.fillStyle = '#1E3248'; g.fillRect(bx, 5, bw2, 8);
    g.fillStyle = frac > 0.35 ? '#3cff4a' : frac > 0.15 ? '#ffd23a' : '#ff4a3a'; g.fillRect(bx, 5, Math.round(bw2 * frac), 8);
    g.fillStyle = '#f2f2f2'; g.fillRect(bx + bw2 + 2, 7, 3, 4);
    var pr = clamp(pos / (finishSeg * SEG), 0, 1);
    g.fillStyle = '#10202e'; g.fillRect(bx - 2, 18, bw2 + 4, 6); g.fillStyle = '#6798C0'; g.fillRect(bx, 20, bw2, 2);
    g.fillStyle = '#FDC921'; g.fillRect(bx + Math.round((bw2 - 4) * pr), 18, 5, 6);
    [1 / 3, 2 / 3].forEach(function (f) { g.fillStyle = '#f2f2f2'; g.fillRect(bx + Math.round(bw2 * f), 19, 1, 4); });

    // title card, toast
    g.textAlign = 'center';
    if (mode === 'card') {
      g.fillStyle = 'rgba(16,32,46,.78)'; g.fillRect(0, 60, W, 56);
      g.fillStyle = '#FDC921'; g.font = 'bold 12px monospace'; g.fillText('LEVEL ' + level + ' OF ' + TOTAL, W / 2, 80);
      g.fillStyle = '#ffffff'; g.font = 'bold 20px monospace'; g.fillText(L.name.toUpperCase(), W / 2, 104);
    }
    if (toastT > 0) { g.fillStyle = 'rgba(16,32,46,.7)'; g.fillRect(40, 32, W - 80, 16); g.fillStyle = '#ffffff'; g.font = 'bold 10px monospace'; g.fillText(toast, W / 2, 44); }
    if (mode === 'drive' && timeLeft < 8 && Math.floor(tick * 4) % 2) { g.fillStyle = '#ff4a3a'; g.font = 'bold 10px monospace'; g.fillText('LOW BATTERY!', W / 2, 60); }
  }
  // idle background (title screen): level 1 parked at the start
  function idleScene() { loadLevel(1); mode = 'idle'; cardT = 0; timeLeft = L.start; hud(); }

  var last = 0;
  function loop(now) {
    if (!last) { last = now; }
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (mode !== 'idle' && mode !== 'over' && mode !== 'win') { update(dt); } else { tick += dt; if (mode === 'idle') { bgX += dt * 6; } }
    draw();
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------ input
  var KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'gas', w: 'gas', W: 'gas', ArrowDown: 'brake', s: 'brake', S: 'brake' };
  window.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key];
    if (!k) { return; }
    if (mode !== 'idle' && mode !== 'win') { e.preventDefault(); }
    keys[k] = true;
  });
  window.addEventListener('keyup', function (e) { var k = KEYMAP[e.key]; if (k) { keys[k] = false; } });
  window.addEventListener('blur', function () { keys.left = keys.right = keys.gas = keys.brake = false; });
  document.querySelectorAll('#touch button').forEach(function (b) {
    var k = b.getAttribute('data-key');
    function on(e) { e.preventDefault(); keys[k] = true; }
    function off(e) { e.preventDefault(); keys[k] = false; }
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });

  // ------------------------------------------------------------------ certificate (drawn in the browser, nothing stored)
  document.getElementById('certBtn').addEventListener('click', function () {
    var load = document.fonts && document.fonts.load ? document.fonts.load('20px "Myfont"') : Promise.resolve();
    load.catch(function () {}).then(function () { makeCertificate(me.name || 'Road Tripper', finalMs); });
  });
  function makeCertificate(name, ms) {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 850;
    var x = c.getContext('2d');
    x.fillStyle = '#FFFDF7'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#FDC921'; x.fillRect(0, 0, c.width, 36); x.fillRect(0, c.height - 36, c.width, 36);
    x.fillStyle = '#99D6EA'; x.fillRect(0, 36, c.width, 14); x.fillRect(0, c.height - 50, c.width, 14);
    x.strokeStyle = '#1E3248'; x.lineWidth = 6; x.strokeRect(50, 70, c.width - 100, c.height - 140);
    x.textAlign = 'center'; x.fillStyle = '#1E3248';
    var pix = '"Myfont", "DM Sans", sans-serif';
    x.font = '56px ' + pix; x.fillText('CERTIFICATE', c.width / 2, 190);
    x.font = '34px ' + pix; x.fillText('OF ROAD TRIP', c.width / 2, 245);
    x.font = '20px sans-serif'; x.fillText('This certifies that', c.width / 2, 330);
    var size = 84; x.font = size + 'px ' + pix;
    while (x.measureText(name).width > c.width - 260 && size > 20) { size -= 2; x.font = size + 'px ' + pix; }
    x.fillStyle = '#6798C0'; x.fillText(name, c.width / 2, 420);
    x.fillStyle = '#1E3248'; x.font = '20px sans-serif';
    x.fillText('drove Leah\'s electric Jeep from Houston to Mexico, Costa Rica, Colorado and France', c.width / 2, 490);
    x.fillText('without running out of battery, in all 5 levels of Leah\'s Road Trip game.', c.width / 2, 522);
    x.font = '40px ' + pix; x.fillStyle = '#6798C0'; x.fillText('Total time: ' + fmt(ms), c.width / 2, 582);
    x.imageSmoothingEnabled = false; var jw = JEEP[1].width * 3, jh = JEEP[1].height * 3; x.drawImage(JEEP[1], Math.round(c.width / 2 - jw / 2), 600 + Math.round((120 - jh) / 2), jw, jh);
    x.fillStyle = '#1E3248'; x.font = '24px ' + pix;
    x.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), c.width / 2, 744);
    x.fillText('livedbyleah.com', c.width / 2, 776);
    c.toBlob(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'road-trip-certificate.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  }

  // Test hook: only when the page is opened with ?debug=1
  if (/[?&]debug=1/.test(location.search)) {
    window.__road = {
      keys: keys, level: function (n) { clockMs = clockMs || 0; el.start.hidden = true; loadLevel(n); },
      info: function () { var s = segAt(pos + PLAYER_Z); return { mode: mode, level: level, pos: pos, idx: Math.floor((pos + PLAYER_Z) / SEG), finish: finishSeg, speed: speed, pct: speed / MAXS, x: playerX, curve: s.curve, time: timeLeft, ms: clockMs, lvlMs: lvlMs, boost: boostT, cars: cars.length, ahead: cars.filter(function (c) { return c.z > pos + PLAYER_Z && c.z < pos + PLAYER_Z + SEG * 22; }).map(function (c) { return { dz: (c.z - pos - PLAYER_Z) / SEG, off: c.off }; }), items: segs.slice(Math.floor((pos + PLAYER_Z) / SEG), Math.floor((pos + PLAYER_Z) / SEG) + 14).filter(function (q) { return q.item && !q.item.got; }).map(function (q) { return q.item.off; }) }; },
      god: function (v) { god = v !== false; }, over: function (ms) { if (ms) { clockMs = ms; } gameOver(); }, won: function (ms) { clockMs = ms || 130000; gameWon(); }, skipCard: function () { cardT = 0; },
      start: beginRun, setNonce: function (n) { runNonce = n; }
    };
  }

  idleScene();
  loadHof();
  requestAnimationFrame(loop);
})();

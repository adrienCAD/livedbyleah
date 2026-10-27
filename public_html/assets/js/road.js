// Leah's Outrun: an 8-bit pseudo-3D driving game. Leah's neon-green electric Jeep drives from Costa Rica
// through Mexico, the USA and Canada, crosses the ocean on a cargo ship, and finishes in Paris.
// Canvas 320x180 shown at 2x, no libraries. The timer IS the battery. Ranked by kilometers driven.
(function () {
  'use strict';
  var cv = document.getElementById('gameCanvas');
  if (!cv) { return; }
  var g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;

  var W = 320, H = 180, HZ = 76;                       // canvas size and horizon line (HZ changes for a moment while landmarks are drawn)
  var ROAD_W = 2000, SEG = 200, CAM_H = 1000, DRAW = 160, RUMBLE = 3;
  var CAM_D = 1 / Math.tan(50 * Math.PI / 180);        // field of view 100
  var MAXS = SEG * 60;                                 // top speed (units per second) = 60 segments per second
  var PLAYER_Z = CAM_H * CAM_D;
  var ACCEL = MAXS / 4.5, BRAKE = -MAXS * 0.9, DECEL = -MAXS / 6, OFFDECEL = -MAXS / 2.2, OFFLIMIT = MAXS / 4, CENTRI = 0.3;
  var PW = 0.3;                                        // player width, in road half-widths
  var TOTAL = 5;
  var KM = [600, 2000, 2700, 1500, 900], CUM = [0, 600, 2600, 5300, 6800, 7700];   // the real trip, roughly
  var LEVEL_BONUS = 500, WIN_BONUS = 2000;             // hall of fame bonus (the server adds the same)
  var COUNTRY = ['Costa Rica', 'Mexico', 'the USA', 'Canada', 'France'];

  // ------------------------------------------------------------------ small helpers
  function fmt(ms) {
    var t = Math.max(0, Math.round(ms / 100) / 10), m = Math.floor(t / 60), s = (t - m * 60).toFixed(1);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtN(n) { return Math.round(n).toLocaleString('en-US'); }
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mk(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.imageSmoothingEnabled = false; fn(x); return c; }
  function R(x, col, a, b, w, h) { x.fillStyle = col; x.fillRect(a, b, w, h); }
  function tri(x, col, cx, top, w, h) { x.fillStyle = col; x.beginPath(); x.moveTo(cx, top); x.lineTo(cx + w / 2, top + h); x.lineTo(cx - w / 2, top + h); x.closePath(); x.fill(); }
  function disc(x, col, cx, cy, r) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
  function ell(x, col, cx, cy, rx, ry) { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, 7); x.fill(); }
  function ease(a, b, p) { return a + (b - a) * (1 - Math.cos(p * Math.PI)) / 2; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function sm(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function hx(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function lc(a, b, t) {
    if (t <= 0 || a === b) { return a; }
    if (t >= 1) { return b; }
    var A = hx(a), B = hx(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function flip(img) { return mk(img.width, img.height, function (x) { x.translate(img.width, 0); x.scale(-1, 1); x.drawImage(img, 0, 0); }); }
  function pick(arr, r) { return arr[Math.floor((r ? r() : Math.random()) * arr.length)]; }

  // ------------------------------------------------------------------ roadside sprites (drawn once, in code, in a chunky pixel style)
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
  SP.tower2 = mk(40, 110, function (x) {   // New York art-deco skyscraper
    R(x, '#8a8e9a', 6, 30, 28, 80); R(x, '#b4b8c2', 6, 30, 4, 80); R(x, '#6a6e7a', 30, 30, 4, 80);
    R(x, '#8a8e9a', 10, 18, 20, 14); R(x, '#8a8e9a', 14, 8, 12, 12); R(x, '#b4b8c2', 18, 0, 4, 10); R(x, '#dfe3ea', 19, 0, 2, 6);
    for (var yy = 34; yy < 106; yy += 6) { for (var xx = 10; xx < 30; xx += 5) { R(x, ((xx * 3 + yy) % 7 < 3) ? '#ffe27a' : '#3a3e4a', xx, yy, 2, 3); } }
  });
  SP.bill = mk(48, 44, function (x) {
    R(x, '#5a4a3a', 10, 20, 3, 24); R(x, '#5a4a3a', 35, 20, 3, 24); R(x, '#222', 2, 2, 44, 20); R(x, '#FDC921', 4, 4, 40, 16);
    R(x, '#1E3248', 6, 6, 36, 12); x.fillStyle = '#FDC921'; x.font = 'bold 10px monospace'; x.textAlign = 'center'; x.fillText('LEAH', 24, 16);
  });
  SP.cactus = mk(24, 44, function (x) {
    R(x, '#2d8a3a', 9, 4, 6, 40); R(x, '#46b050', 9, 4, 2, 40); R(x, '#2d8a3a', 2, 16, 4, 14); R(x, '#2d8a3a', 2, 26, 8, 4); R(x, '#2d8a3a', 18, 10, 4, 12);
    R(x, '#2d8a3a', 14, 20, 8, 4); R(x, '#46b050', 2, 16, 1, 14); R(x, '#f5d0e0', 11, 1, 3, 3);
  });
  SP.saguaro = mk(28, 56, function (x) {
    R(x, '#3a7a3a', 11, 4, 7, 52); R(x, '#5aa050', 11, 4, 2, 52); R(x, '#3a7a3a', 2, 20, 5, 18); R(x, '#3a7a3a', 2, 34, 11, 5);
    R(x, '#3a7a3a', 21, 12, 5, 20); R(x, '#3a7a3a', 16, 28, 10, 5); R(x, '#5aa050', 2, 20, 1, 18); R(x, '#5aa050', 21, 12, 1, 20);
  });
  SP.agave = mk(32, 22, function (x) {
    x.fillStyle = '#5a9a8a';
    [[16, 2], [8, 6], [24, 6], [3, 13], [29, 13], [12, 4], [20, 4]].forEach(function (p) { x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(16 + (p[0] - 16) * 0.25 + 3, 22); x.lineTo(16 + (p[0] - 16) * 0.25 - 3, 22); x.closePath(); x.fill(); });
    R(x, '#7ab8a6', 15, 4, 2, 16);
  });
  SP.adobe = mk(56, 40, function (x) {
    R(x, '#d9854a', 4, 8, 48, 32); R(x, '#f0a566', 4, 8, 6, 32); R(x, '#b8662f', 46, 8, 6, 32); R(x, '#8a4a22', 2, 4, 52, 6);
    R(x, '#3a2414', 24, 20, 10, 20); R(x, '#3a2414', 26, 17, 6, 4); R(x, '#5ab0e0', 10, 16, 8, 8); R(x, '#5ab0e0', 40, 16, 8, 8);
    R(x, '#e84a8a', 4, 30, 48, 3); R(x, '#f5c43a', 4, 33, 48, 2);
  });
  SP.temple = mk(60, 44, function (x) {   // small stepped pyramid
    for (var k = 0; k < 5; k++) { R(x, k % 2 ? '#c89a62' : '#b8884f', 4 + k * 6, 40 - (k + 1) * 8, 52 - k * 12, 8); R(x, '#8a6038', 4 + k * 6, 40 - (k + 1) * 8, 52 - k * 12, 1); }
    R(x, '#9a6a40', 26, 8, 8, 32); for (var s = 10; s < 40; s += 3) { R(x, '#e0bc88', 26, s, 8, 1); }
    R(x, '#8a5a30', 24, 0, 12, 4); R(x, '#4a2a18', 28, 1, 4, 3); R(x, '#a8a090', 0, 40, 60, 4);
  });
  SP.mesa = mk(64, 34, function (x) {
    x.fillStyle = '#b8582e'; x.beginPath(); x.moveTo(0, 34); x.lineTo(10, 6); x.lineTo(52, 4); x.lineTo(64, 34); x.closePath(); x.fill();
    R(x, '#d4743e', 10, 4, 42, 4); R(x, '#94421e', 0, 20, 64, 2); R(x, '#94421e', 0, 28, 64, 2); R(x, '#e08a50', 14, 10, 4, 22);
  });
  SP.rock = mk(36, 24, function (x) {
    disc(x, '#7d7a72', 12, 14, 10); disc(x, '#9b988f', 22, 12, 11); R(x, '#7d7a72', 4, 16, 28, 8); R(x, '#b9b6ad', 16, 5, 6, 3); R(x, '#5f5c55', 4, 21, 28, 3);
  });
  SP.jungle = mk(48, 64, function (x) {
    R(x, '#6a4020', 21, 30, 6, 34); R(x, '#8a5a30', 21, 30, 2, 34); disc(x, '#14602a', 24, 24, 20); disc(x, '#1f8a3a', 18, 20, 12); disc(x, '#2fb04a', 30, 16, 9);
    R(x, '#e83a3a', 12, 28, 3, 3); R(x, '#e83a3a', 32, 22, 3, 3); R(x, '#f5d03a', 26, 30, 3, 3); R(x, '#e83a3a', 20, 10, 3, 3);
  });
  SP.banana = mk(40, 44, function (x) {
    R(x, '#7a8a3a', 18, 18, 4, 26);
    x.fillStyle = '#3aa040'; [[-1, 0], [1, 0], [-1, 1], [1, 1]].forEach(function (d) { x.beginPath(); x.moveTo(20, 18); x.quadraticCurveTo(20 + d[0] * 14, 2 + d[1] * 10, 20 + d[0] * 20, 10 + d[1] * 14); x.quadraticCurveTo(20 + d[0] * 10, 14 + d[1] * 6, 20, 20); x.fill(); });
    R(x, '#f5d03a', 16, 20, 3, 6); R(x, '#f5d03a', 20, 21, 3, 6);
  });
  SP.bush = mk(32, 20, function (x) {
    disc(x, '#1f7a30', 10, 12, 9); disc(x, '#2fa040', 22, 11, 9); R(x, '#1f7a30', 4, 14, 24, 6);
    R(x, '#ff5a9a', 8, 7, 3, 3); R(x, '#f5d03a', 18, 5, 3, 3); R(x, '#ff5a3a', 25, 9, 3, 3); R(x, '#ff5a9a', 14, 11, 3, 3);
  });
  SP.umbrella = mk(36, 40, function (x) {
    R(x, '#e8e0d0', 17, 12, 2, 28); x.fillStyle = '#ff5a5a'; x.beginPath(); x.moveTo(2, 14); x.quadraticCurveTo(18, -4, 34, 14); x.closePath(); x.fill();
    R(x, '#ffffff', 8, 6, 4, 8); R(x, '#ffffff', 20, 3, 4, 11); R(x, '#ffffff', 30, 9, 3, 5);
    R(x, '#3aa0e8', 4, 34, 28, 5); R(x, '#ffffff', 4, 36, 28, 1);
  });
  SP.pine = mk(32, 60, function (x) {
    R(x, '#5a3a1a', 14, 48, 4, 12); tri(x, '#14502a', 16, 2, 22, 20); tri(x, '#1a6a34', 16, 14, 28, 22); tri(x, '#14502a', 16, 28, 32, 24);
    R(x, '#2a7a40', 12, 18, 3, 2); R(x, '#2a7a40', 8, 36, 4, 2);
  });
  SP.snowpine = mk(32, 60, function (x) {
    R(x, '#5a3a1a', 14, 48, 4, 12); tri(x, '#14502a', 16, 2, 22, 20); tri(x, '#1a6a34', 16, 14, 28, 22); tri(x, '#14502a', 16, 28, 32, 24);
    R(x, '#f0f6fa', 12, 6, 8, 4); R(x, '#f0f6fa', 6, 20, 8, 3); R(x, '#f0f6fa', 18, 22, 8, 3); R(x, '#f0f6fa', 2, 36, 10, 3); R(x, '#f0f6fa', 20, 40, 10, 3); R(x, '#f0f6fa', 14, 30, 6, 3);
  });
  SP.snowman = mk(24, 34, function (x) {
    disc(x, '#f4f8fc', 12, 25, 9); disc(x, '#ffffff', 12, 12, 7); R(x, '#222', 9, 10, 2, 2); R(x, '#222', 13, 10, 2, 2); R(x, '#ff8a1f', 11, 13, 4, 2);
    R(x, '#c03030', 6, 17, 12, 3); R(x, '#222', 7, 2, 10, 4); R(x, '#222', 5, 5, 14, 2); R(x, '#222', 11, 22, 2, 2); R(x, '#222', 11, 27, 2, 2);
  });
  SP.oak = mk(44, 52, function (x) {
    R(x, '#6a4a2a', 19, 28, 6, 24); disc(x, '#2f7a2a', 22, 20, 18); disc(x, '#3f9a36', 14, 16, 10); disc(x, '#3f9a36', 30, 14, 9); disc(x, '#56b048', 20, 10, 6);
  });
  SP.maple = mk(42, 50, function (x) {
    R(x, '#6a4020', 19, 28, 5, 22); disc(x, '#c8361e', 21, 20, 17); disc(x, '#e85a28', 13, 15, 9); disc(x, '#f08a2a', 29, 13, 8); disc(x, '#d84422', 22, 8, 7);
  });
  SP.birch = mk(20, 60, function (x) {
    R(x, '#f2f2ea', 8, 18, 4, 42); R(x, '#222', 8, 26, 3, 1); R(x, '#222', 9, 36, 3, 1); R(x, '#222', 8, 46, 2, 1);
    ell(x, '#a8c84a', 10, 16, 9, 15); ell(x, '#c8e060', 7, 12, 4, 8);
  });
  SP.cabin = mk(56, 38, function (x) {
    R(x, '#8a5a30', 6, 14, 44, 24); for (var yy = 16; yy < 38; yy += 5) { R(x, '#6a4020', 6, yy, 44, 1); }
    tri(x, '#b83a2a', 28, 0, 58, 16); R(x, '#5a3a18', 38, 2, 6, 8); R(x, '#3a2414', 24, 24, 9, 14); R(x, '#8ad0f0', 10, 20, 8, 7); R(x, '#8ad0f0', 38, 20, 8, 7);
  });
  SP.moose = mk(44, 36, function (x) {
    R(x, '#5a3a20', 8, 12, 24, 12); R(x, '#5a3a20', 8, 24, 3, 12); R(x, '#5a3a20', 14, 24, 3, 12); R(x, '#5a3a20', 24, 24, 3, 12); R(x, '#5a3a20', 29, 24, 3, 12);
    R(x, '#4a2e18', 30, 8, 6, 8); R(x, '#4a2e18', 34, 12, 8, 6); R(x, '#c8a878', 28, 2, 12, 3); R(x, '#c8a878', 28, 0, 2, 4); R(x, '#c8a878', 38, 0, 2, 4); R(x, '#c8a878', 33, 0, 2, 3);
    R(x, '#111', 38, 13, 2, 2);
  });
  SP.cow = mk(36, 24, function (x) {
    R(x, '#f4f4f0', 6, 6, 22, 11); R(x, '#222', 10, 8, 6, 5); R(x, '#222', 20, 7, 4, 4); R(x, '#f4f4f0', 26, 3, 8, 8); R(x, '#f0a0a8', 30, 8, 4, 3);
    R(x, '#333', 7, 17, 3, 7); R(x, '#333', 12, 17, 3, 7); R(x, '#333', 20, 17, 3, 7); R(x, '#333', 24, 17, 3, 7); R(x, '#c8b890', 27, 1, 2, 3);
  });
  SP.poplar = mk(18, 64, function (x) {
    R(x, '#6a4a2a', 8, 50, 3, 14); ell(x, '#3f9a30', 9, 28, 8, 28); ell(x, '#5fc048', 6, 26, 3, 20);
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
  SP.haussmann = mk(56, 80, function (x) {   // Paris apartment building
    R(x, '#ece2c8', 2, 16, 52, 64); R(x, '#d8ccae', 46, 16, 8, 64); R(x, '#5a6474', 0, 4, 56, 14); R(x, '#4a5464', 0, 16, 56, 2);
    for (var k = 0; k < 4; k++) { R(x, '#3a4454', 8 + k * 12, 6, 6, 8); R(x, '#a8c0d8', 9 + k * 12, 8, 4, 5); }
    for (var yy = 22; yy < 70; yy += 12) {
      for (var xx = 6; xx < 52; xx += 12) { R(x, '#6a8aa8', xx, yy, 6, 8); R(x, '#2a2a30', xx - 1, yy + 8, 8, 1); }
      R(x, '#2a2a30', 4, yy + 9, 48, 1);
    }
    R(x, '#4a2a2a', 22, 70, 12, 10); R(x, '#a01e2a', 2, 68, 18, 3);
  });
  SP.cafe = mk(56, 40, function (x) {
    R(x, '#ece2c8', 4, 6, 48, 34); R(x, '#a01e2a', 2, 12, 52, 6); for (var s = 2; s < 54; s += 6) { R(x, '#ffffff', s, 12, 3, 6); }
    R(x, '#ffe8a0', 8, 20, 40, 10); R(x, '#2a2a30', 4, 6, 48, 4); x.fillStyle = '#FDD85D'; x.font = 'bold 5px monospace'; x.textAlign = 'center'; x.fillText('CAFE', 28, 10);
    R(x, '#3a3a40', 8, 34, 8, 2); R(x, '#3a3a40', 11, 34, 2, 6); R(x, '#3a3a40', 38, 34, 8, 2); R(x, '#3a3a40', 41, 34, 2, 6);
  });
  SP.lamp = mk(14, 56, function (x) {
    R(x, '#1e3a2a', 6, 12, 2, 44); R(x, '#1e3a2a', 3, 52, 8, 4); R(x, '#1e3a2a', 3, 6, 8, 2); R(x, '#ffe8a0', 4, 8, 6, 5); R(x, '#1e3a2a', 5, 2, 4, 4);
  });
  SP.liberty = mk(26, 70, function (x) {   // roadside souvenir statue, New York
    R(x, '#7a7468', 4, 52, 18, 18); R(x, '#5f9e8a', 9, 18, 8, 34); R(x, '#5f9e8a', 7, 30, 12, 22); R(x, '#5f9e8a', 15, 6, 3, 14);
    R(x, '#ffd23a', 14, 1, 5, 5); disc(x, '#5f9e8a', 12, 15, 4); R(x, '#7ab8a4', 9, 10, 7, 2); R(x, '#4a8a76', 9, 30, 4, 14);
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
    palm: [1000, 0.3, 1], tower: [2200, 0.9, 1], tower2: [2300, 0.9, 1], bill: [1500, 0.5, 1], cactus: [700, 0.2, 1], saguaro: [900, 0.2, 1], agave: [800, 0.3, 0],
    adobe: [2000, 0.8, 1], temple: [2400, 0.9, 1], mesa: [2600, 1, 1], rock: [1100, 0.4, 1], jungle: [1900, 0.5, 1], banana: [1300, 0.3, 1], bush: [900, 0.3, 0],
    umbrella: [1000, 0.3, 1], pine: [1000, 0.3, 1], snowpine: [1000, 0.3, 1], snowman: [700, 0.25, 1], oak: [1500, 0.4, 1], maple: [1400, 0.4, 1], birch: [650, 0.2, 1],
    cabin: [2000, 0.8, 1], moose: [1300, 0.4, 1], cow: [1000, 0.35, 1], poplar: [600, 0.2, 1], lavender: [1500, 0.5, 0], frhouse: [2000, 0.8, 1],
    haussmann: [2400, 0.9, 1], cafe: [2000, 0.8, 1], lamp: [450, 0.12, 1], liberty: [900, 0.3, 1]
  };

  // ------------------------------------------------------------------ cryptids (two walking frames, facing right; mirrored when walking left)
  var CRY = {
    sloth: { name: 'giant sloth', plural: 'Giant sloths', ww: 900, speed: 0.55, draw: function (x, f) {
      ell(x, '#8a6a48', 15, 22, 10, 12); ell(x, '#a8865e', 15, 10, 7, 7); R(x, '#d8c8a8', 11, 7, 9, 6); R(x, '#3a2414', 12, 8, 3, 2); R(x, '#3a2414', 17, 8, 3, 2); R(x, '#222', 15, 11, 2, 1);
      R(x, '#7a5a38', 2, 14 + f * 2, 6, 3); R(x, '#7a5a38', 22, 16 - f * 2, 6, 3); R(x, '#e8e0c8', 0, 15 + f * 2, 3, 2); R(x, '#e8e0c8', 27, 17 - f * 2, 3, 2);
      R(x, '#7a5a38', 9 + f, 32, 4, 4); R(x, '#7a5a38', 18 - f, 32, 4, 4);
    } },
    chupa: { name: 'chupacabra', plural: 'Chupacabras', ww: 750, speed: 1.15, draw: function (x, f) {
      R(x, '#6a7a5a', 6, 12, 16, 10); R(x, '#5a6a4a', 18, 6, 9, 9); R(x, '#ff2a2a', 23, 8, 2, 2); R(x, '#e8e8d0', 25, 13, 2, 2);
      for (var s = 0; s < 5; s++) { tri(x, '#3a4a2a', 8 + s * 3, 6 + (s % 2), 3, 7); }
      R(x, '#5a6a4a', 6 + f * 2, 22, 3, 8); R(x, '#5a6a4a', 16 - f * 2, 22, 3, 8); R(x, '#5a6a4a', 0, 14, 7, 2); R(x, '#5a6a4a', 20, 16, 5, 2);
    } },
    bigfoot: { name: 'Bigfoot', plural: 'Bigfoots', ww: 1000, speed: 1.0, draw: function (x, f) {
      ell(x, '#5a3a22', 15, 20, 10, 13); disc(x, '#5a3a22', 15, 7, 6); R(x, '#8a6a4a', 12, 5, 7, 5); R(x, '#111', 13, 6, 2, 1); R(x, '#111', 17, 6, 2, 1);
      R(x, '#4a2e18', 4, 14 + f * 3, 4, 14); R(x, '#4a2e18', 22, 17 - f * 3, 4, 14); R(x, '#4a2e18', 9 + f * 2, 31, 5, 13); R(x, '#4a2e18', 17 - f * 2, 31, 5, 13);
      R(x, '#3a2414', 8 + f * 2, 42, 8, 2); R(x, '#3a2414', 16 - f * 2, 42, 8, 2);
    } },
    wendigo: { name: 'wendigo', plural: 'Wendigos', ww: 1000, speed: 1.05, draw: function (x, f) {
      R(x, '#cfd2c8', 12, 14, 7, 18); R(x, '#e8e8e0', 11, 5, 9, 9); R(x, '#111', 12, 8, 3, 3); R(x, '#111', 17, 8, 3, 3); R(x, '#111', 14, 12, 4, 1);
      R(x, '#8a7a5a', 7, 0, 2, 7); R(x, '#8a7a5a', 4, 2, 5, 2); R(x, '#8a7a5a', 22, 0, 2, 7); R(x, '#8a7a5a', 22, 2, 5, 2);
      R(x, '#bfc2b8', 6, 15 + f * 3, 2, 16); R(x, '#bfc2b8', 22, 18 - f * 3, 2, 16); R(x, '#bfc2b8', 12 + f, 32, 2, 16); R(x, '#bfc2b8', 17 - f, 32, 2, 16);
      R(x, '#9a9e94', 14, 18, 3, 1); R(x, '#9a9e94', 14, 21, 3, 1); R(x, '#9a9e94', 14, 24, 3, 1);
    } },
    werewolf: { name: 'werewolf', plural: 'Werewolves', ww: 950, speed: 1.2, draw: function (x, f) {
      ell(x, '#6a6a72', 14, 20, 9, 12); R(x, '#6a6a72', 14, 2, 10, 9); R(x, '#5a5a62', 22, 6, 6, 4); R(x, '#5a5a62', 15, 0, 3, 4); R(x, '#5a5a62', 20, 0, 3, 4);
      R(x, '#ffd23a', 20, 4, 2, 2); R(x, '#f0f0f0', 25, 9, 2, 2); R(x, '#8a8a94', 11, 14, 6, 10);
      R(x, '#5a5a62', 3, 14 + f * 3, 4, 13); R(x, '#5a5a62', 21, 17 - f * 3, 4, 13); R(x, '#5a5a62', 8 + f * 2, 30, 5, 12); R(x, '#5a5a62', 16 - f * 2, 30, 5, 12);
      R(x, '#2a3a8a', 9, 26, 12, 5);
    } }
  };
  Object.keys(CRY).forEach(function (k) {
    var c = CRY[k];
    c.fr = [mk(30, 48, function (x) { c.draw(x, 0); }), mk(30, 48, function (x) { c.draw(x, 1); })];
    c.frL = [flip(c.fr[0]), flip(c.fr[1])];
  });

  // ------------------------------------------------------------------ road signs (fun signs and cryptid warnings)
  function makeSign(l1, l2, style) {
    var bg = { green: '#1e7a3a', blue: '#1f4fa8', brown: '#7a4a22', white: '#f4f4ee', red: '#c0262a' }[style] || '#1e7a3a';
    var fg = style === 'white' ? '#1E3248' : '#ffffff';
    return mk(80, 46, function (x) {
      R(x, '#5a5a62', 16, 26, 3, 20); R(x, '#5a5a62', 61, 26, 3, 20);
      R(x, '#222', 0, 0, 80, 30); R(x, bg, 1, 1, 78, 28); R(x, fg, 3, 3, 74, 1); R(x, fg, 3, 26, 74, 1);
      x.fillStyle = fg; x.font = 'bold 9px monospace'; x.textAlign = 'center';
      x.fillText(l1, 40, l2 ? 14 : 18, 72); if (l2) { x.fillText(l2, 40, 24, 72); }
    });
  }
  function makeWarn(type, plate) {
    return mk(56, 72, function (x) {
      R(x, '#5a5a62', 26, 40, 4, 32);
      x.fillStyle = '#222'; x.beginPath(); x.moveTo(28, 0); x.lineTo(56, 24); x.lineTo(28, 48); x.lineTo(0, 24); x.closePath(); x.fill();
      x.fillStyle = '#ffd21e'; x.beginPath(); x.moveTo(28, 3); x.lineTo(53, 24); x.lineTo(28, 45); x.lineTo(3, 24); x.closePath(); x.fill();
      var sil = mk(30, 48, function (y) { CRY[type].draw(y, 0); y.globalCompositeOperation = 'source-in'; R(y, '#111', 0, 0, 30, 48); });
      x.drawImage(sil, 0, 0, 30, 48, 17, 9, 22, 34);
      R(x, '#222', 2, 50, 52, 14); R(x, '#ffffff', 3, 51, 50, 12); x.fillStyle = '#111'; x.font = 'bold 8px monospace'; x.textAlign = 'center'; x.fillText(plate, 28, 60, 48);
    });
  }

  // ------------------------------------------------------------------ Leah's Jeep: 5 frames (hard left, left, straight, right, hard right)
  function jeepSprite(steer) {
    return mk(64, 40, function (x) {
      var s = steer || 0;
      R(x, 'rgba(0,0,0,.35)', 5, 36, 54, 3);
      R(x, '#0c0c0c', 2 + s, 27, 12, 11); R(x, '#0c0c0c', 50 + s, 27, 12, 11);
      R(x, '#1c1c24', 6, 6, 52, 10); R(x, '#2a1608', 27, 1, 10, 12); R(x, '#f5f5f5', 27, 12, 10, 4);
      R(x, '#1f9a08', 13, 0, 3, 16); R(x, '#1f9a08', 48, 0, 3, 16); R(x, '#1f9a08', 13, 0, 38, 3);
      R(x, '#3cff1e', 3, 15, 58, 13); R(x, '#1f9a08', 3, 26, 58, 2); R(x, '#3cff1e', 1, 19, 8, 11); R(x, '#3cff1e', 55, 19, 8, 11);
      R(x, '#ff2a2a', 4, 18, 5, 6); R(x, '#ff2a2a', 55, 18, 5, 6); disc(x, '#101010', 32, 22, 8); disc(x, '#2a2a2a', 32, 22, 5); R(x, '#3a3f48', 4, 29, 56, 5);
    });
  }
  function skewed(img, dir) {   // a gentle turn: the back view leaned into the turn and a little narrower
    var k = 0.09 * dir, w = img.width + 6;
    return mk(w, img.height, function (x) { x.setTransform(0.95, 0, -k, 1, 3 + (k > 0 ? k * img.height : 0), 0); x.drawImage(img, 0, 0); });
  }
  var JEEP = [jeepSprite(-3), jeepSprite(-1), jeepSprite(0), jeepSprite(1), jeepSprite(3)];   // code-drawn fallback, replaced by Leah's art once it loads
  (function () {
    var back = new Image(), turn = new Image();
    back.onload = function () { JEEP[2] = back; JEEP[1] = skewed(back, -1); JEEP[3] = skewed(back, 1); };
    turn.onload = function () { JEEP[4] = turn; JEEP[0] = flip(turn); };   // Leah's 3/4 view; mirrored for the other direction
    back.src = '/assets/img/jeep-back.png?v=1'; turn.src = '/assets/img/jeep-turn.png?v=1';
  })();

  // ------------------------------------------------------------------ distant backgrounds (640 wide, tiled; horizon at HZ)
  function bgClouds(x, seed, n, col) {
    var r = rng(seed);
    for (var c = 0; c < n; c++) { var cx = Math.floor(r() * 620), cy = 8 + Math.floor(r() * 30); R(x, col || '#ffffff', cx, cy, 30 + Math.floor(r() * 16), 5); R(x, col || '#ffffff', cx + 6, cy - 4, 18, 5); }
  }
  function bgMountains(x, seed, col, snow, hMin, hMax, step, wid, lift) {
    var r = rng(seed);
    for (var i = -wid; i < 640 + wid; i += step) {
      var h = hMin + Math.floor(r() * (hMax - hMin)), cx = i + Math.floor(r() * step * 0.5);
      tri(x, col, cx, HZ - (lift || 0) - h, wid, h + (lift || 0) + 2);
      if (snow) { tri(x, snow, cx, HZ - (lift || 0) - h, Math.round(wid * h * 0.3 / (h + (lift || 0))), Math.round(h * 0.3)); }
    }
  }
  function bgHills(x, seed, col, rMin, rMax, step, dy) {
    var r = rng(seed);
    for (var i = -40; i < 680; i += step) { ell(x, col, i + Math.floor(r() * 10), HZ + (dy || 0), rMin + Math.floor(r() * (rMax - rMin)), (rMin + Math.floor(r() * (rMax - rMin))) * 0.55); }
  }
  function bgWater(x, col, hi, top) {
    R(x, col, 0, HZ - (top || 6), 640, (top || 6) + 30);
    var r = rng(9);
    for (var i = 0; i < 70; i++) { R(x, hi, Math.floor(r() * 636), HZ - (top || 6) + 1 + Math.floor(r() * ((top || 6) - 1)), 3 + Math.floor(r() * 5), 1); }
  }
  function bgPines(x, col, step, h, seed) {
    var r = rng(seed || 3);
    for (var p = -10; p < 650; p += step) { var hh = h + Math.floor(r() * h * 0.6); tri(x, col, p + 6, HZ - hh, Math.round(hh * 0.8), hh + 1); }
  }
  function bgCity(x, seed, col, side, win, hMin, hMax, wMin, wMax) {
    var r = rng(seed);
    for (var i = 0; i < 640; i += wMin + Math.floor(r() * 6)) {
      var w = wMin + Math.floor(r() * (wMax - wMin)), h = hMin + Math.floor(r() * (hMax - hMin));
      R(x, col, i, HZ - h, w, h); R(x, side, i, HZ - h, 2, h);
      for (var yy = HZ - h + 3; yy < HZ - 2; yy += 4) { for (var xx = i + 3; xx < i + w - 2; xx += 4) { if (r() > 0.6) { R(x, win, xx, yy, 1, 2); } } }
    }
  }
  function bgCanopy(x, seed, cols) {
    var r = rng(seed);
    cols.forEach(function (c, k) { for (var i = -20; i < 660; i += 18 + k * 4) { disc(x, c, i + Math.floor(r() * 10), HZ - 14 + k * 8 - Math.floor(r() * 10), 12 + Math.floor(r() * 9)); } });
  }
  function bgVolcano(x, cx, h, col, smoke) {
    tri(x, col, cx, HZ - h, h * 3.2, h + 2); R(x, col, cx - 8, HZ - h, 16, 3);
    if (smoke) { disc(x, '#e8eeea', cx + 4, HZ - h - 8, 6); disc(x, '#f2f6f4', cx + 12, HZ - h - 16, 8); disc(x, '#f8fbfa', cx + 24, HZ - h - 22, 7); }
  }
  function bgPyramid(x, cx, w, h, c1, c2) {
    var steps = 6;
    for (var k = 0; k < steps; k++) {
      var ww = w - k * (w - w * 0.22) / steps, yy = HZ - (k + 1) * h / steps;
      R(x, k % 2 ? c1 : c2, Math.round(cx - ww / 2), Math.round(yy), Math.round(ww), Math.ceil(h / steps) + 1);
    }
    R(x, c2, Math.round(cx - w * 0.06), HZ - h - 6, Math.round(w * 0.12), 7); R(x, '#6a4a2a', Math.round(cx - 3), Math.round(HZ - h / 1.6), 6, Math.round(h / 1.6));
  }
  function bgLiberty(x, cx) {   // Lady Liberty on her island
    var c = '#4f8f7c', d = '#3f7a68';
    R(x, '#4a6a5a', cx - 26, HZ - 4, 52, 6); R(x, '#8a8478', cx - 9, HZ - 24, 18, 20); R(x, '#9a9488', cx - 7, HZ - 30, 14, 6);
    R(x, c, cx - 5, HZ - 54, 10, 24); R(x, d, cx - 5, HZ - 54, 3, 24); R(x, c, cx - 7, HZ - 40, 14, 10);
    disc(x, c, cx, HZ - 58, 4); for (var k = -2; k <= 2; k++) { R(x, c, cx + k * 2, HZ - 66, 1, 4); }
    R(x, c, cx + 4, HZ - 74, 2, 20); R(x, '#ffd23a', cx + 3, HZ - 79, 4, 5); R(x, '#ffefa0', cx + 4, HZ - 78, 2, 2); R(x, d, cx - 8, HZ - 48, 4, 6);
  }
  function bgEiffel(x, ex, base, s) {   // a proper lattice tower
    var dark = '#4a3a3a', mid = '#6e5446', lite = '#9a765e';
    function legPath(side) {
      x.beginPath(); x.moveTo(ex + side * 34 * s, base); x.quadraticCurveTo(ex + side * 22 * s, base - 14 * s, ex + side * 15 * s, base - 30 * s);
      x.lineTo(ex + side * 7 * s, base - 30 * s); x.quadraticCurveTo(ex + side * 14 * s, base - 14 * s, ex + side * 20 * s, base); x.closePath();
    }
    [-1, 1].forEach(function (sd) { legPath(sd); x.fillStyle = mid; x.fill(); });
    x.strokeStyle = dark; x.lineWidth = 1;
    for (var yy = 2; yy < 30; yy += 3) { x.beginPath(); x.moveTo(ex - (34 - yy * 0.62) * s, base - yy * s); x.lineTo(ex - (20 - yy * 0.42) * s, base - (yy + 3) * s); x.stroke(); x.beginPath(); x.moveTo(ex + (34 - yy * 0.62) * s, base - yy * s); x.lineTo(ex + (20 - yy * 0.42) * s, base - (yy + 3) * s); x.stroke(); }
    x.fillStyle = mid; x.beginPath(); x.moveTo(ex - 20 * s, base); x.quadraticCurveTo(ex, base - 22 * s, ex + 20 * s, base); x.lineTo(ex + 15 * s, base - 30 * s); x.lineTo(ex - 15 * s, base - 30 * s); x.closePath(); x.fill();
    R(x, dark, Math.round(ex - 18 * s), Math.round(base - 32 * s), Math.round(36 * s), Math.max(2, Math.round(3 * s)));                 // 1st platform
    x.fillStyle = mid; x.beginPath(); x.moveTo(ex - 14 * s, base - 32 * s); x.lineTo(ex - 7 * s, base - 62 * s); x.lineTo(ex + 7 * s, base - 62 * s); x.lineTo(ex + 14 * s, base - 32 * s); x.lineTo(ex + 6 * s, base - 32 * s); x.lineTo(ex, base - 44 * s); x.lineTo(ex - 6 * s, base - 32 * s); x.closePath(); x.fill();
    for (var y2 = 34; y2 < 62; y2 += 3) { var hw = (14 - (y2 - 32) * 0.23) * s; x.beginPath(); x.moveTo(ex - hw, base - y2 * s); x.lineTo(ex + hw, base - (y2 + 2) * s); x.stroke(); }
    R(x, dark, Math.round(ex - 9 * s), Math.round(base - 64 * s), Math.round(18 * s), Math.max(2, Math.round(2 * s)));                  // 2nd platform
    x.fillStyle = mid; x.beginPath(); x.moveTo(ex - 6 * s, base - 64 * s); x.lineTo(ex - 1.5 * s, base - 104 * s); x.lineTo(ex + 1.5 * s, base - 104 * s); x.lineTo(ex + 6 * s, base - 64 * s); x.closePath(); x.fill();
    for (var y3 = 66; y3 < 102; y3 += 3) { var hw3 = (6 - (y3 - 64) * 0.11) * s; x.beginPath(); x.moveTo(ex - hw3, base - y3 * s); x.lineTo(ex + hw3, base - (y3 + 2) * s); x.stroke(); }
    R(x, dark, Math.round(ex - 3 * s), Math.round(base - 106 * s), Math.round(6 * s), Math.max(2, Math.round(3 * s)));                  // top
    R(x, lite, Math.round(ex - 0.5 * s), Math.round(base - 118 * s), Math.max(1, Math.round(s)), Math.round(12 * s));                   // antenna
    R(x, lite, Math.round(ex - 1 * s), Math.round(base - 60 * s), Math.max(1, Math.round(s)), Math.round(26 * s));
    R(x, '#ffd86a', Math.round(ex - 1), Math.round(base - 107 * s), 2, 2);                                                              // beacon
  }
  var BG = {
    crBeach: function (x) { bgClouds(x, 1, 7); bgVolcano(x, 250, 34, '#7a9ab0', true); bgWater(x, '#2ab0c8', '#a8f0f8', 9); for (var i = 20; i < 640; i += 70) { R(x, '#2a5a3a', i, HZ - 18, 2, 10); R(x, '#2a5a3a', i - 5, HZ - 19, 12, 2); } },
    crMount: function (x) { bgClouds(x, 2, 5); bgVolcano(x, 300, 52, '#5a7a6a', true); bgMountains(x, 21, '#3f8a5a', null, 18, 40, 70, 150); bgMountains(x, 22, '#2f6a46', null, 10, 22, 50, 110); },
    crJungle: function (x) { bgCanopy(x, 31, ['#1a5a2a', '#237a34', '#2f9a40']); },
    mxJungle: function (x) { bgMountains(x, 41, '#4a7a5a', null, 16, 34, 80, 160); bgCanopy(x, 42, ['#245a28', '#2e7a30', '#3a9a3a']); },
    mxBeach: function (x) { bgClouds(x, 5, 6); bgWater(x, '#1ec8d0', '#c8fcff', 10); bgPyramid(x, 520, 46, 14, '#c8a878', '#b89868'); },
    mxMount: function (x) { bgMountains(x, 51, '#9a7a5a', null, 30, 56, 80, 170); bgMountains(x, 52, '#7a8a4a', null, 14, 30, 60, 130); },
    mxPyr: function (x) { bgMountains(x, 61, '#a89070', null, 14, 26, 90, 180); bgPyramid(x, 220, 150, 52, '#c89a62', '#b8884f'); bgPyramid(x, 470, 100, 34, '#c89a62', '#b8884f'); },
    mxDesert: function (x) { disc(x, '#fff0a0', 150, 30, 18); for (var i = 0; i < 640; i += 130) { x.fillStyle = '#c0683a'; x.beginPath(); x.moveTo(i, HZ); x.lineTo(i + 14, HZ - 30); x.lineTo(i + 70, HZ - 32); x.lineTo(i + 86, HZ); x.fill(); R(x, '#d8844a', i + 14, HZ - 32, 56, 3); } bgMountains(x, 71, '#b4552a', null, 8, 16, 50, 90); },
    usHouston: function (x) { var r = rng(11); disc(x, '#ffb347', 470, 50, 30); disc(x, '#ffd27a', 470, 50, 22); bgCity(x, 12, '#4a3a7a', '#5a4a8a', '#ffe27a', 10, 46, 8, 22); R(x, '#4a3a7a', 120, HZ - 62, 10, 62); R(x, '#4a3a7a', 380, HZ - 56, 12, 56); tri(x, '#4a3a7a', 386, HZ - 68, 12, 12); r(); },
    usDesert: function (x) { bgClouds(x, 13, 3); for (var i = 30; i < 640; i += 160) { x.fillStyle = '#b4502a'; x.beginPath(); x.moveTo(i, HZ); x.lineTo(i + 10, HZ - 44); x.lineTo(i + 36, HZ - 46); x.lineTo(i + 44, HZ); x.fill(); R(x, '#d06a3a', i + 10, HZ - 46, 26, 3); } bgMountains(x, 14, '#c8703e', null, 10, 20, 60, 120); },
    usColorado: function (x) { bgClouds(x, 15, 4); bgMountains(x, 16, '#7d8fb0', '#f4f8ff', 40, 70, 90, 140); bgMountains(x, 17, '#5a6a8a', null, 22, 34, 55, 90); bgPines(x, '#1a4a2a', 12, 10, 18); },
    usForest: function (x) { bgMountains(x, 19, '#5a7a6a', null, 14, 28, 80, 160); bgPines(x, '#1f5a30', 9, 16, 20); bgPines(x, '#164a26', 13, 10, 21); },
    usNY: function (x) { bgWater(x, '#3a5a7a', '#8ab0d0', 8); bgCity(x, 23, '#3a3e5a', '#4a4e6a', '#ffe27a', 14, 52, 8, 18); R(x, '#3a3e5a', 300, HZ - 80, 14, 80); R(x, '#3a3e5a', 304, HZ - 92, 6, 12); R(x, '#cfd4e0', 306, HZ - 104, 2, 12); },
    caRiver: function (x) { bgMountains(x, 31, '#6a7a9a', '#eef2f8', 34, 60, 90, 150); bgPines(x, '#1f4a30', 10, 12, 32); R(x, '#4a8ad0', 0, HZ - 3, 640, 4); for (var i = 0; i < 640; i += 37) { R(x, '#b8dcf8', i, HZ - 2, 6, 1); } },
    caHills: function (x) { bgClouds(x, 33, 6); bgHills(x, 34, '#5a9a4a', 40, 70, 80, 14); bgHills(x, 35, '#6aac52', 30, 50, 60, 18); for (var i = 10; i < 640; i += 47) { disc(x, i % 3 ? '#d8502a' : '#f08a2a', i, HZ - 4, 5); } },
    caLakes: function (x) { bgMountains(x, 36, '#5a6a8a', '#e8eef6', 26, 46, 100, 170); bgWater(x, '#3a7ac0', '#a8d0f0', 12); bgPines(x, '#1a4a2a', 14, 9, 37); },
    caSnow: function (x) { bgMountains(x, 38, '#9aa8c0', '#ffffff', 46, 74, 80, 140); bgMountains(x, 39, '#c8d4e4', '#ffffff', 20, 36, 60, 110); bgPines(x, '#2a4a3a', 16, 8, 40); },
    frBeach: function (x) { bgClouds(x, 41, 5); bgWater(x, '#3a9ad0', '#c8eaff', 10); R(x, '#f4f0e4', 380, HZ - 30, 140, 22); R(x, '#d8d0c0', 380, HZ - 30, 140, 3); R(x, '#7aaa5a', 380, HZ - 34, 140, 5); R(x, '#3a9ad0', 430, HZ - 18, 18, 10); },
    frHills: function (x) { bgClouds(x, 43, 5); bgHills(x, 44, '#6aae5a', 44, 70, 110, 18); bgHills(x, 45, '#7bc068', 34, 56, 80, 22); R(x, '#8a7a6a', 260, HZ - 20, 10, 12); tri(x, '#5a4a4a', 265, HZ - 30, 12, 10); },
    frLav: function (x) { bgClouds(x, 46, 4); bgHills(x, 47, '#7bc068', 40, 64, 100, 20); for (var i = 0; i < 640; i += 6) { R(x, '#9a72d0', i, HZ - 4, 4, 4); } },
    frForest: function (x) { bgHills(x, 48, '#4a8a3a', 40, 60, 90, 16); for (var i = -10; i < 650; i += 14) { disc(x, i % 28 ? '#2f6a2a' : '#3f7a32', i, HZ - 8, 10); } },
    frParis: function (x) {
      var r = rng(49);
      for (var i = 0; i < 640; i += 16 + Math.floor(r() * 8)) { var h = 12 + Math.floor(r() * 14); R(x, '#7a6a88', i, HZ - h, 18, h); R(x, '#5a5a78', i, HZ - h - 3, 18, 4); for (var w = i + 3; w < i + 16; w += 5) { R(x, '#ffd88a', w, HZ - h + 4, 2, 2); } }
    }
  };

  // Landmarks get their own layer so they are always in view in their zone (they slide slowly with the curves).
  var MARK = {
    eiffel: mk(90, 112, function (x) { var hz = HZ; HZ = 110; bgEiffel(x, 45, 110, 0.9); HZ = hz; }),
    liberty: mk(60, 90, function (x) { var hz = HZ; HZ = 86; bgLiberty(x, 30); HZ = hz; })
  };

  // ------------------------------------------------------------------ zones and levels
  var ROAD = ['#5a5a66', '#52525e'], RUMB = ['#e83a3a', '#f2f2f2'];
  var Z = {
    crBeach: { label: 'Playa', bg: 'crBeach', sprites: ['palm', 'umbrella', 'palm', 'bush'], grass: ['#ecd28c', '#e0c47c'], rumble: ['#f5c42a', '#2a2a30'] },
    crMount: { label: 'Volcano road', bg: 'crMount', sprites: ['jungle', 'rock', 'bush', 'banana'], grass: ['#2a9a3a', '#238a32'], rumble: ['#f5c42a', '#2a2a30'] },
    crJungle: { label: 'Rainforest', bg: 'crJungle', sprites: ['jungle', 'banana', 'bush', 'palm'], grass: ['#1f8a34', '#187a2c'], rumble: ['#f5c42a', '#2a2a30'] },
    mxJungle: { label: 'Selva', bg: 'mxJungle', sprites: ['jungle', 'banana', 'bush'], grass: ['#2a8a30', '#237a2a'], rumble: ['#2a8a4a', '#f2f2f2'] },
    mxBeach: { label: 'Caribbean coast', bg: 'mxBeach', sprites: ['palm', 'umbrella', 'agave'], grass: ['#f0e2b0', '#e6d6a0'], rumble: ['#2a8a4a', '#f2f2f2'] },
    mxMount: { label: 'Sierra', bg: 'mxMount', sprites: ['agave', 'rock', 'cactus', 'pine'], grass: ['#a8a050', '#9a9246'], rumble: ['#2a8a4a', '#f2f2f2'] },
    mxPyr: { label: 'Pyramid valley', bg: 'mxPyr', sprites: ['temple', 'agave', 'rock', 'cactus'], grass: ['#c8a868', '#bc9c5c'], rumble: ['#2a8a4a', '#f2f2f2'] },
    mxDesert: { label: 'Desierto', bg: 'mxDesert', sprites: ['cactus', 'adobe', 'rock', 'agave'], grass: ['#d9a35a', '#cd9650'], rumble: ['#2a8a4a', '#f2f2f2'] },
    usHouston: { label: 'Houston', flat: 1, bg: 'usHouston', sprites: ['tower', 'bill', 'palm', 'tower'], grass: ['#2fa040', '#28903a'], sky: ['#3a2a7a', '#6a3a8a', '#b04a8a', '#e86a6a', '#ff9a5a', '#ffc86a'] },
    usDesert: { label: 'Desert highway', bg: 'usDesert', sprites: ['saguaro', 'mesa', 'rock', 'saguaro'], grass: ['#d88a50', '#cc7e46'] },
    usColorado: { label: 'Colorado Rockies', bg: 'usColorado', sprites: ['pine', 'rock', 'cabin', 'pine'], grass: ['#5a8a5a', '#4e7e50'] },
    usForest: { label: 'Big forest', bg: 'usForest', sprites: ['pine', 'oak', 'pine', 'maple'], grass: ['#3a7a3a', '#326e32'] },
    usNY: { label: 'New York', flat: 1, bg: 'usNY', mark: 'liberty', sprites: ['tower2', 'lamp', 'tower', 'liberty', 'tower2'], grass: ['#8c8c94', '#808088'], road: ['#4a4a54', '#44444e'], rumble: ['#f5c42a', '#2a2a30'], sky: ['#1e2a5a', '#2e3a7a', '#5a4a8a', '#a05a8a', '#e07a7a', '#f8a87a'] },
    caRiver: { label: 'River valley', bg: 'caRiver', sprites: ['pine', 'rock', 'birch', 'pine'], grass: ['#4a8a4a', '#3f7e40'], rumble: ['#c03030', '#f2f2f2'] },
    caHills: { label: 'Maple hills', bg: 'caHills', sprites: ['maple', 'birch', 'cabin', 'moose', 'maple'], grass: ['#6aa848', '#5e9a3e'], rumble: ['#c03030', '#f2f2f2'] },
    caLakes: { label: 'Lake country', bg: 'caLakes', sprites: ['pine', 'birch', 'cabin', 'moose'], grass: ['#4a9050', '#3f8446'], rumble: ['#c03030', '#f2f2f2'] },
    caSnow: { label: 'Snowy peaks', bg: 'caSnow', sprites: ['snowpine', 'snowman', 'snowpine', 'rock'], grass: ['#eef3f8', '#e0e8f0'], road: ['#6a6e78', '#62666f'], rumble: ['#c03030', '#f2f2f2'], sky: ['#6a8ac0', '#7e9ccc', '#94afd6', '#aac2e0', '#c2d4ea', '#dce6f2'] },
    frBeach: { label: 'Normandy coast', bg: 'frBeach', sprites: ['umbrella', 'frhouse', 'bush'], grass: ['#e8dcb0', '#dcd0a2'], rumble: ['#2a4ad0', '#f2f2f2'] },
    frHills: { label: 'Countryside', bg: 'frHills', sprites: ['poplar', 'cow', 'frhouse', 'poplar'], grass: ['#8ac860', '#7cb856'], rumble: ['#2a4ad0', '#f2f2f2'] },
    frLav: { label: 'Lavender fields', bg: 'frLav', sprites: ['lavender', 'lavender', 'frhouse', 'poplar'], grass: ['#9a72d0', '#86b05a'], rumble: ['#2a4ad0', '#f2f2f2'] },
    frForest: { label: 'Old forest', bg: 'frForest', sprites: ['oak', 'poplar', 'oak'], grass: ['#4a8a3a', '#3f7e32'], rumble: ['#2a4ad0', '#f2f2f2'] },
    frParis: { label: 'Paris', flat: 1, bg: 'frParis', mark: 'eiffel', sprites: ['haussmann', 'lamp', 'cafe', 'lamp'], grass: ['#a8a49a', '#9c988e'], road: ['#5a5a62', '#54545c'], rumble: ['#2a4ad0', '#f2f2f2'], sky: ['#2a3a7a', '#4a4a90', '#7a5aa0', '#c07aa0', '#f0a0a0', '#ffc8a8'] }
  };
  var LEVELS = [
    { name: 'Costa Rica', sub: 'Pura vida!', len: 2650, start: 36, cp: 14, traffic: 24, curve: 3, hill: 1400, seed: 101, cr: 'sloth', warn: 'PEREZOSOS', gate: 'BIENVENIDOS A MÉXICO',
      sky: ['#2f8fe0', '#4aa6ea', '#6abcf2', '#8fd0f6', '#b6e2f8', '#dff3fb'], zones: ['crBeach', 'crMount', 'crJungle', 'crBeach', 'crJungle'],
      signs: [['PURA VIDA!', 'SLOW DOWN'], ['OBEY THE SIGNS', "(OR DON'T)"], ['SPEED LIMIT:', 'AS FAST AS LEAH'], ['NEXT CHARGER:', 'TRUST ME'], ['MONOS: PLEASE', 'DO NOT FEED'], ['VOLCANO 20 KM', 'NO LAVA. PROMISE'], ['SLOTH JAM', 'NEXT 3 HOURS'], ['MEXICO', 'THAT WAY ->']] },
    { name: 'Mexico', sub: '¡Vámonos!', len: 2750, start: 38, cp: 14, traffic: 34, curve: 4, hill: 2200, seed: 202, cr: 'chupa', warn: '¡CUIDADO!', gate: 'WELCOME TO THE USA',
      sky: ['#3a7ad0', '#5a96dc', '#82b2e6', '#f0c88a', '#f8d89a', '#fff0c0'], zones: ['mxJungle', 'mxBeach', 'mxMount', 'mxPyr', 'mxDesert'],
      signs: [['TOPES!', '(BIG BUMPS)'], ['TACOS 2 KM', 'KEEP DRIVING'], ['¡CUIDADO!', 'CHUPACABRA'], ['NO CLIMBING', 'THE PYRAMIDS'], ['¿YA LLEGAMOS?', 'NO.'], ['SIESTA ZONE', 'DRIVE QUIETLY'], ['GOATS: SAFE', 'FOR NOW'], ['USA', 'NEXT EXIT']] },
    { name: 'USA', sub: 'Houston to New York', len: 2900, start: 41, cp: 13, traffic: 46, curve: 4, hill: 2800, seed: 303, cr: 'bigfoot', warn: 'BIGFOOT XING', gate: 'BIENVENUE AU CANADA',
      sky: ['#2a6ad0', '#4a8ae0', '#6aa4ea', '#8abcf0', '#aad0f5', '#cae2f9'], zones: ['usHouston', 'usDesert', 'usColorado', 'usForest', 'usNY'],
      signs: [['HOUSTON:', 'WE HAVE A ROAD'], ["EVERYTHING'S", 'BIGGER HERE'], ['DO NOT FEED', 'THE BIGFOOT'], ['ROUTE 66?', 'WRONG GAME'], ['ARE WE THERE', 'YET? NO.'], ['BATTERY LOW?', 'DRIVE FASTER'], ['BIGFOOT PHOTOS', 'ALL BLURRY'], ['NEW YORK', 'BIG APPLE AHEAD']] },
    { name: 'Canada', sub: 'Sorry, eh!', len: 3000, start: 43, cp: 13, traffic: 56, curve: 5, hill: 3200, seed: 404, cr: 'wendigo', warn: 'WENDIGO XING', gate: 'HALIFAX PORT',
      sky: ['#3a7ad8', '#5a92e0', '#7aaae8', '#9ac0ee', '#bad4f4', '#dae8fa'], zones: ['caRiver', 'caHills', 'caLakes', 'caSnow'],
      signs: [['SORRY!', 'ROAD WORK, EH'], ['MOOSE HAVE', 'RIGHT OF WAY'], ['BIENVENUE', 'WELCOME, EH'], ['MAPLE SYRUP', 'NEXT 400 KM'], ['WENDIGO?', 'NOPE. KEEP GOING'], ['HOCKEY ONLY', 'IN WINTER'], ['POUTINE', 'IS A FOOD GROUP'], ['SHIP TO FRANCE', 'LAST STOP']] },
    { name: 'France', sub: 'Bonjour, Paris!', len: 3100, start: 46, cp: 12, traffic: 66, curve: 6, hill: 3000, seed: 505, cr: 'werewolf', warn: 'LOUPS-GAROUS', gate: 'PARIS — ARRIVÉE',
      sky: ['#7a8ae0', '#9a9ae8', '#c4a4e8', '#eeb0e0', '#fcc4d0', '#ffdcc4'], zones: ['frBeach', 'frHills', 'frLav', 'frForest', 'frParis'],
      signs: [['BAGUETTE', '1 KM'], ['RALENTIR', '(SLOW, PLEASE)'], ['ATTENTION', 'LOUPS-GAROUS'], ['ON A FAIM', "(WE'RE HUNGRY)"], ['LEAH WAS', 'HERE'], ['BONJOUR!', 'HONK? NON.'], ['CROISSANTS', 'BEFORE SPEED'], ['PARIS', 'ALMOST THERE']] }
  ];
  var SIGN_STYLES = ['green', 'blue', 'white', 'brown', 'red'];

  // ------------------------------------------------------------------ state
  var el = {
    time: document.getElementById('hudTime'), level: document.getElementById('hudLevel'), speed: document.getElementById('hudSpeed'),
    start: document.getElementById('gameStart'), over: document.getElementById('gameOver'), win: document.getElementById('gameWin')
  };
  var keys = { left: false, right: false, gas: false, brake: false };
  var mode = 'idle';             // idle | card | drive | finish | dying | ship | over | win
  var level = 1, L = LEVELS[0];
  var segs = [], total = 0, cars = [], bgs = [], bgX = 0, zoneLen = 1, events = [], lastZone = 0;
  var pos = 0, speed = 0, playerX = 0, steerV = 0, lift = 0, boostT = 0, crashT = 0, timeLeft = 0, lvlMs = 0, clockMs = 0, cardT = 0, finT = 0, shipT = 0;
  var toast = '', toastT = 0, flash = 0;
  var cpDone = [], cpSegs = [], finishSeg = 0, runNonce = '', finalMs = 0, finalKm = 0, god = false, tick = 0;
  var me = { name: 'Driver', fan: false };
  var ST = null;
  function resetStats() {
    ST = { sight: { sloth: 0, chupa: 0, bigfoot: 0, wendigo: 0, werewolf: 0 }, bumpedBy: { sloth: 0, chupa: 0, bigfoot: 0, wendigo: 0, werewolf: 0 },
      dodged: 0, bumped: 0, batt: 0, boosts: 0, crashes: 0, top: 0, passed: 0, slothsPassed: 0 };
  }
  resetStats();

  // ------------------------------------------------------------------ road building
  function addSeg(curve) {
    var n = segs.length;
    segs.push({ i: n, z1: n * SEG, z2: (n + 1) * SEG, y1: 0, y2: 0, curve: curve, sprites: [], cars: [], light: Math.floor(n / RUMBLE) % 2, boost: 0, gate: '', item: null, c: null });
  }
  function addRoad(enter, hold, leave, curve) {
    var n;
    for (n = 0; n < enter; n++) { addSeg(ease(0, curve, n / enter)); }
    for (n = 0; n < hold; n++) { addSeg(curve); }
    for (n = 0; n < leave; n++) { addSeg(ease(curve, 0, n / leave)); }
  }
  // Which zone a segment is in, with a smooth blend across the border between two zones.
  function zoneAt(i) {
    var nz = L.zones.length, k = clamp(Math.floor(i / zoneLen), 0, nz - 1), BAND = 60, endK = (k + 1) * zoneLen, startK = k * zoneLen;
    if (k < nz - 1 && i > endK - BAND) { return { a: k, b: k + 1, t: sm((i - (endK - BAND)) / (2 * BAND)) }; }
    if (k > 0 && i < startK + BAND) { return { a: k - 1, b: k, t: sm((i - (startK - BAND)) / (2 * BAND)) }; }
    return { a: k, b: k, t: 0 };
  }
  function zoneObj(k) { return Z[L.zones[k]]; }
  function buildLevel(n) {
    L = LEVELS[n - 1];
    var r = rng(L.seed), i, k;
    segs = []; cars = []; events = [];
    for (k = 0; k < 40; k++) { addSeg(0); }                                      // straight start
    while (segs.length < L.len) {
      var p = r(), len = 25 + Math.floor(r() * 35), sgn = r() < 0.5 ? -1 : 1, c = L.curve * (0.4 + 0.6 * r());
      if (p < 0.25) { addRoad(10, len, 10, 0); }
      else if (p < 0.8) { addRoad(18, len, 18, sgn * c); }
      else { addRoad(12, 20, 12, sgn * c); addRoad(12, 20, 12, -sgn * c); }    // S-bend
    }
    addRoad(15, 40, 15, 0);
    finishSeg = segs.length - 10;
    for (var e = 0; e < 320; e++) { addSeg(0); }                                 // run-off after the finish line
    total = segs.length;
    zoneLen = finishSeg / L.zones.length;
    // rolling hills: two slow waves added together, faded in at the start and out before the finish
    var A = L.hill, P1 = 180 + r() * 60, P2 = 100 + r() * 30, f1 = r() * 6.283, f2 = r() * 6.283;
    var hgt = function (j) { var zj = zoneAt(Math.min(j, finishSeg)), fl = (1 - zj.t) * (zoneObj(zj.a).flat ? 0.3 : 1) + zj.t * (zoneObj(zj.b).flat ? 0.3 : 1); var env = sm(j / 100) * sm((finishSeg + 30 - j) / 120) * fl; return A * env * (0.62 * Math.sin(6.283 * j / P1 + f1) + 0.38 * Math.sin(6.283 * j / P2 + f2)); };
    for (i = 0; i < total; i++) { segs[i].y1 = hgt(i); segs[i].y2 = hgt(i + 1); }
    // colours per segment, blended between zones
    for (i = 0; i < total; i++) {
      var zi = zoneAt(Math.min(i, finishSeg)), za = zoneObj(zi.a), zb = zoneObj(zi.b), t = zi.t;
      var ra = za.road || ROAD, rb = zb.road || ROAD, ua = za.rumble || RUMB, ub = zb.rumble || RUMB;
      segs[i].c = { g: [lc(za.grass[0], zb.grass[0], t), lc(za.grass[1], zb.grass[1], t)], r: [lc(ra[0], rb[0], t), lc(ra[1], rb[1], t)], u: [lc(ua[0], ub[0], t), lc(ua[1], ub[1], t)] };
    }
    // checkpoints at 1/3 and 2/3, border gate at the finish
    cpDone = [false, false]; cpSegs = [Math.floor(finishSeg / 3), Math.floor(finishSeg * 2 / 3)];
    segs[cpSegs[0]].gate = 'CHECKPOINT'; segs[cpSegs[1]].gate = 'CHECKPOINT'; segs[finishSeg].gate = 'FINISH';
    // scenery on both sides, picked from the zone (or the next zone near a border)
    for (var s = 10; s < total - 20; s += 3 + Math.floor(r() * 6)) {
      var zz = zoneAt(Math.min(s, finishSeg + 5)), zo = zoneObj(r() < zz.t ? zz.b : zz.a), side = r() < 0.5 ? -1 : 1;
      var t1 = pick(zo.sprites, r);
      segs[s].sprites.push({ t: t1, off: side * (1.35 + r() * 2.8), sp: SPEC[t1] });
      if (r() < 0.5) { var t2 = pick(zo.sprites, r); segs[s].sprites.push({ t: t2, off: -side * (1.35 + r() * 2.8), sp: SPEC[t2] }); }
    }
    // fun signs
    var ns = L.signs.length;
    for (k = 0; k < ns; k++) {
      var at = Math.floor(finishSeg * (k + 0.6) / (ns + 0.4)), key = 'sg' + n + '_' + k;
      if (!SP[key]) { SP[key] = makeSign(L.signs[k][0], L.signs[k][1], SIGN_STYLES[(k + n) % SIGN_STYLES.length]); SPEC[key] = [1500, 0.35, 1]; }
      segs[at].sprites = segs[at].sprites.filter(function (q) { return Math.abs(q.off) > 2.2; });
      segs[at].sprites.push({ t: key, off: (k % 2 ? 1 : -1) * 1.45, sp: SPEC[key] });
    }
    // cryptid crossings (2 or 3 per level), each with a warning sign before it
    var wkey = 'warn' + n;
    if (!SP[wkey]) { SP[wkey] = makeWarn(L.cr, L.warn); SPEC[wkey] = [1300, 0.3, 1]; }
    [0.24, 0.52, 0.8].forEach(function (f, q) {
      if (q === 1 && r() < 0.35) { return; }
      var es = Math.floor(finishSeg * (f + (r() - 0.5) * 0.06)), sd = r() < 0.5 ? -1 : 1;
      events.push({ seg: es, side: sd, state: 'wait', off: sd * 1.8, f: 0, bumped: false, passed: false });
      var ws = es - 45;
      segs[ws].sprites = segs[ws].sprites.filter(function (q2) { return Math.abs(q2.off) > 2.2; });
      segs[ws].sprites.push({ t: wkey, off: sd * 1.45, sp: SPEC[wkey] });
    });
    // boost arrows (3 segments each) and batteries
    for (var b = 90; b < finishSeg - 40; b += 110 + Math.floor(r() * 90)) {
      var lane = [-0.5, 0, 0.5][Math.floor(r() * 3)];
      for (var q = 0; q < 3; q++) { segs[b + q].boost = 1; segs[b + q].boostOff = lane; }
    }
    for (var bt = 60; bt < finishSeg - 20; bt += 170 + Math.floor(r() * 120)) {
      var o = [-0.65, -0.2, 0.2, 0.65][Math.floor(r() * 4)];
      for (var m = 0; m < 3; m++) { if (!segs[bt + m * 4].boost) { segs[bt + m * 4].item = { off: o, got: false }; } }
    }
    // traffic
    for (var cI = 0; cI < L.traffic; cI++) {
      var z = (120 + r() * (finishSeg - 150)) * SEG;
      cars.push({ z: z, off: [-0.7, -0.35, 0, 0.35, 0.7][Math.floor(r() * 5)], speed: MAXS * (0.22 + 0.3 * r()) * (0.85 + 0.05 * n), spr: CARS[Math.floor(r() * CARS.length)], w: 0.28, ahead: true });
    }
    // distant background layers, one per zone
    bgs = L.zones.map(function (zn) { return mk(640, HZ + 30, function (x) { BG[Z[zn].bg](x); }); });
  }
  function segAt(z) { return segs[Math.floor(z / SEG) % total]; }
  function kmNow() {
    var f = finishSeg ? clamp(pos / (finishSeg * SEG), 0, 1) : 0;
    return CUM[level - 1] + f * KM[level - 1];
  }

  function loadLevel(n) {
    level = n; buildLevel(n);
    pos = 0; speed = 0; playerX = 0; steerV = 0; boostT = 0; crashT = 0; lvlMs = 0; toast = ''; flash = 0; lastZone = 0;
    timeLeft = L.start + (loadLevel.carry || 0); loadLevel.carry = 0;
    mode = 'card'; cardT = 2.4;
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
    cry: function () { beep(300, 520, 0.25, 'triangle', 0.15); setTimeout(function () { beep(520, 280, 0.25, 'triangle', 0.15); }, 220); },
    horn: function () { beep(420, 420, 0.5, 'square', 0.12); },
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
    if (mode === 'ship') { shipT += dt; if (shipT > 6.5) { endShip(); } return; }
    if (mode === 'card') { cardT -= dt; if (cardT <= 0) { mode = 'drive'; } }
    var driving = mode === 'drive';
    var finishing = mode === 'finish' || mode === 'dying';
    var seg = segAt(pos + PLAYER_Z), pct = speed / MAXS;

    // steering: the longer you hold, the harder the turn (picks the Jeep frame)
    if (keys.left && !keys.right) { steerV = Math.max(-1, steerV - dt * 3.2); }
    else if (keys.right && !keys.left) { steerV = Math.min(1, steerV + dt * 3.2); }
    else { steerV = steerV > 0 ? Math.max(0, steerV - dt * 5) : Math.min(0, steerV + dt * 5); }

    if (driving || finishing) {
      var gas = driving && keys.gas, brake = keys.brake || mode === 'dying';
      var cap = boostT > 0 ? MAXS * 1.4 : MAXS;
      if (mode === 'finish') { gas = false; brake = true; }
      if (gas) { speed += (boostT > 0 ? ACCEL * 2 : ACCEL) * dt; } else if (brake) { speed += BRAKE * dt; } else { speed += DECEL * dt; }
      if (mode === 'dying' && !gas) { speed += DECEL * 1.5 * dt; }
      speed -= (seg.y2 - seg.y1) / SEG * MAXS * 0.22 * dt;                     // uphill slows you a little, downhill helps
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
      var before = pos + PLAYER_Z;
      pos += speed * dt;
      bgX += seg.curve * pct * dt * 60 * 0.9;
      pct = speed / MAXS;
      ST.top = Math.max(ST.top, Math.round(pct * 120));

      // the Jeep floats a little over crests and squats in dips
      var ii = Math.floor((pos + PLAYER_Z) / SEG), sa = segs[Math.max(0, ii - 2)], sb = segs[Math.min(total - 1, ii + 2)];
      var bend = ((sb.y2 - sb.y1) - (sa.y2 - sa.y1)) / SEG;
      lift += (clamp(-bend * pct * 60, -3, 6) - lift) * Math.min(1, dt * 8);

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
        if (car.ahead && car.z < before && car.z < pos + PLAYER_Z) { car.ahead = false; ST.passed++; if (level === 1) { ST.slothsPassed++; } }
      }
      if (driving) {
        var idx = Math.floor((pos + PLAYER_Z) / SEG);
        // boost arrows, batteries, checkpoints
        if (ps.boost && Math.abs(playerX - ps.boostOff) < 0.4 && boostT <= 0.2) { boostT = 1.4; ST.boosts++; SFX.boost(); toast = 'BOOST!'; toastT = 0.8; }
        for (var q = 0; q < 2; q++) {
          var it = segs[idx - q];
          if (it && it.item && !it.item.got && Math.abs(playerX - it.item.off) < 0.3) { it.item.got = true; ST.batt++; timeLeft += 2; SFX.batt(); toast = '+2s battery'; toastT = 0.9; flash = 0.12; }
        }
        cpSegs.forEach(function (cs, i) {
          if (!cpDone[i] && idx >= cs) { cpDone[i] = true; timeLeft += L.cp; SFX.cp(); toast = 'CHECKPOINT +' + L.cp + 's'; toastT = 1.8; }
        });
        // a new area: say its name
        var zk = zoneAt(idx).b;
        if (zk !== lastZone && zoneAt(idx).t > 0.5) { lastZone = zk; if (toastT <= 0.3) { toast = zoneObj(zk).label.toUpperCase(); toastT = 1.6; } }
        cryptids(dt, idx);
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
    if (eng && engGain) { eng.frequency.value = 50 + (speed / MAXS) * 160; engGain.gain.value = muted || mode === 'idle' || mode === 'over' || mode === 'win' || mode === 'ship' ? 0 : 0.035 + (speed / MAXS) * 0.02; }
    hud();
  }
  function cryptids(dt, idx) {
    var cr = CRY[L.cr];
    events.forEach(function (ev) {
      if (ev.state === 'wait') {
        var tReach = (ev.seg - idx) * SEG / Math.max(speed, MAXS * 0.35);
        if (ev.seg > idx && tReach <= 1.75 / cr.speed) {
          ev.state = 'cross'; ev.off = ev.side * 1.8; ST.sight[L.cr]++; SFX.cry();
          toast = (cr.name === 'Bigfoot' ? 'BIGFOOT' : cr.name.toUpperCase()) + ' CROSSING!'; toastT = 1.4;
        }
      } else if (ev.state === 'cross') {
        ev.off -= ev.side * cr.speed * dt; ev.f += dt;
        if (Math.abs(ev.off) > 2 && ev.off * ev.side < 0) { ev.state = 'gone'; }
      }
      if (ev.state === 'cross' && !ev.bumped && idx >= ev.seg - 1 && idx <= ev.seg && overlap(playerX, PW, ev.off, 0.32)) {
        ev.bumped = true; ST.bumped++; ST.bumpedBy[L.cr]++; crash(); if (!god) { timeLeft = Math.max(0.5, timeLeft - 3); }
        toast = 'BONK! SORRY, ' + (cr.name === 'Bigfoot' ? 'BIGFOOT' : cr.name.toUpperCase()) + '  -3s'; toastT = 1.6; flash = 0.15;
      }
      if (!ev.passed && idx > ev.seg + 1) {
        ev.passed = true;
        if (ev.state !== 'wait' && !ev.bumped) { ST.dodged++; if (toastT <= 0.4) { toast = 'PHEW! DODGED IT'; toastT = 1; } }
      }
    });
  }
  function crash() { if (crashT <= 0) { SFX.crash(); ST.crashes++; } crashT = 0.5; if (speed > MAXS / 5) { speed = MAXS / 5; } }

  function levelDone() {
    if (mode !== 'drive') { return; }
    if (level >= TOTAL) { gameWon(); return; }
    mode = 'finish'; finT = 0; SFX.cp();
    var bonus = Math.round(Math.max(0, timeLeft) * 0.25);
    loadLevel.carry = bonus; toast = 'LEVEL COMPLETE  +' + bonus + 's saved'; toastT = 2.6;
  }
  function next() { if (level === 4) { startShip(); } else { loadLevel(level + 1); } }
  function startShip() { mode = 'ship'; shipT = 0; speed = 0; SFX.horn(); hud(); }
  function endShip() { if (mode === 'ship') { loadLevel(5); } }

  // ------------------------------------------------------------------ hall of fame (game = "road", ranked by kilometers)
  function api(body) {
    body.game = 'road';
    return fetch('/api/scores.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function reached(lv, won) { return won ? 'Cleared all 5' : 'reached ' + COUNTRY[clamp(lv, 1, 5) - 1]; }
  function renderHof(list) {
    var ol = document.getElementById('hof');
    if (!ol) { return; }
    ol.textContent = '';
    if (!list || !list.length) { var li0 = document.createElement('li'); li0.className = 'hint'; li0.textContent = 'No trips yet. Be the first!'; ol.appendChild(li0); return; }
    list.forEach(function (r) {
      var li = document.createElement('li');
      if (r.mine) { li.className = 'me'; }
      var tt = document.createElement('span'); tt.className = 't'; tt.textContent = fmtN(r.km) + ' km';
      var lv = document.createElement('span'); lv.className = 'lv'; lv.textContent = reached(r.level, r.won) + ' · ' + fmt(r.ms);
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
  function hofKm(km, lv, won) { return Math.floor(km) + (lv - 1) * LEVEL_BONUS + (won ? WIN_BONUS : 0); }
  function saveRun(won, noteEl) {
    noteEl.textContent = '';
    api({ action: 'submit', nonce: runNonce, ms: Math.round(clockMs), level: level, won: won, km: Math.floor(finalKm) }).then(function (d) {
      if (d.error) { noteEl.textContent = d.error; return; }
      setMe(d.me); renderHof(d.top);
      if (!d.saved) { return; }
      noteEl.textContent = d.improved ? 'Saved to the hall of fame as ' + me.name + ' (' + fmtN(d.best.km) + ' km with bonuses).'
        : 'Your best is still ' + fmtN(d.best.km) + ' km.';
      if (!me.fan) {
        noteEl.appendChild(document.createTextNode(' '));
        var a = document.createElement('a'); a.href = '/fans.php?v=join'; a.textContent = 'Join the fan club to play under your own username.'; noteEl.appendChild(a);
      }
    }).catch(function () { noteEl.textContent = 'Could not reach the server.'; });
  }

  var SNARK = ['Even an electric Jeep needs a charger, Leah says.', 'Zero percent. The Jeep is now a very green lawn ornament.', 'Leah is calling a tow truck. Try again!',
    'Tip: batteries are the green ones. Just saying.', 'The chupacabra did not eat your battery. Probably.', 'Bigfoot saw everything. He is not telling anyone.',
    'The sloths finished before you. Think about that.', 'Out of juice. The wendigo says "sorry" (it is Canadian).', 'Plug in and go again, driver!'];
  var snarkIdx = 0;
  function hud() {
    el.time.textContent = 'Battery ' + Math.ceil(timeLeft) + 's';
    el.level.textContent = 'Level ' + level + '/' + TOTAL;
    el.speed.textContent = Math.round(speed / MAXS * 120) + ' mph';
  }
  function beginRun() {
    audio();
    level = 1; clockMs = 0; runNonce = ''; loadLevel.carry = 0; resetStats();
    keys.left = keys.right = keys.gas = keys.brake = false;
    el.start.hidden = true; el.over.hidden = true; el.win.hidden = true;
    api({ action: 'start' }).then(function (d) { runNonce = d.nonce || ''; setMe(d.me); }).catch(function () { runNonce = ''; });
    loadLevel(1);
  }
  function gameOver() {
    mode = 'over'; speed = 0; finalKm = kmNow();
    document.getElementById('overMsg').textContent = SNARK[snarkIdx++ % SNARK.length];
    document.getElementById('overInfo').textContent = 'You drove ' + fmtN(finalKm) + ' km and reached ' + COUNTRY[level - 1] + ' in ' + fmt(clockMs) + '.';
    el.over.hidden = false;
    saveRun(false, document.getElementById('overNote'));
  }
  function gameWon() {
    mode = 'win'; finalMs = Math.round(clockMs); level = TOTAL; finalKm = CUM[5]; SFX.win();
    document.getElementById('winTime').textContent = 'Your trip: ' + fmtN(finalKm) + ' km in ' + fmt(finalMs);
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
  function drawShip() {
    var t = shipT, i;
    var sky = ['#2a3a7a', '#4a4a90', '#7a5aa0', '#c07aa0', '#f0a0a0', '#ffc8a8'];
    for (i = 0; i < 6; i++) { g.fillStyle = sky[i]; g.fillRect(0, i * 20, W, 21); }
    disc(g, '#ffe0a0', 250, 104, 18);
    g.fillStyle = '#1e3a6a'; g.fillRect(0, 112, W, 68);
    for (i = 0; i < 40; i++) { var wx = (i * 47 + t * (20 + (i % 3) * 10)) % (W + 20) - 10, wy = 116 + (i * 13) % 60; g.fillStyle = i % 2 ? '#3a6aa8' : '#8ab0e0'; g.fillRect(Math.round(wx), wy, 6, 1); }
    var sx = Math.round(40 + t * 34), sy = Math.round(118 + Math.sin(t * 2.4) * 2);
    g.fillStyle = '#7a1e1e'; g.beginPath(); g.moveTo(sx - 70, sy); g.lineTo(sx + 78, sy); g.lineTo(sx + 66, sy + 18); g.lineTo(sx - 62, sy + 18); g.closePath(); g.fill();
    g.fillStyle = '#1a1a22'; g.fillRect(sx - 62, sy + 14, 128, 4); g.fillStyle = '#f2f2f2'; g.fillRect(sx - 66, sy + 2, 140, 1);
    var cols = ['#2f7be8', '#e8392f', '#f5c42a', '#2a8a4a', '#ff8a1f', '#8a3ad8'];
    for (i = 0; i < 6; i++) { g.fillStyle = cols[i]; g.fillRect(sx - 40 + i * 14, sy - 9, 13, 9); g.fillStyle = cols[(i + 3) % 6]; if (i < 4) { g.fillRect(sx - 40 + i * 14, sy - 18, 13, 9); } }
    g.fillStyle = '#f2f2f2'; g.fillRect(sx - 66, sy - 22, 22, 22); g.fillStyle = '#2a3a5a'; g.fillRect(sx - 63, sy - 18, 16, 3);
    g.fillStyle = '#c8381e'; g.fillRect(sx - 58, sy - 32, 7, 10);
    for (i = 0; i < 3; i++) { disc(g, 'rgba(220,220,230,' + (0.6 - i * 0.18) + ')', sx - 56 - i * 6 - (t * 8) % 6, sy - 36 - i * 6, 3 + i); }
    var jf = JEEP[4], jw = Math.round(jf.width * 0.42), jh = Math.round(jf.height * 0.42);
    g.drawImage(jf, sx + 16, sy - 9 - jh + 1, jw, jh);
    g.fillStyle = '#ffffff'; for (i = 0; i < 3; i++) { var gx = (i * 90 + t * 25) % W, gy = 30 + i * 12; g.fillRect(Math.round(gx), gy, 3, 1); g.fillRect(Math.round(gx) + 3, gy - 1, 3, 1); }
    g.textAlign = 'center';
    g.fillStyle = 'rgba(16,32,46,.75)'; g.fillRect(40, 42, W - 80, 34);
    g.fillStyle = '#FDC921'; g.font = 'bold 12px monospace'; g.fillText('CROSSING THE ATLANTIC', W / 2, 56);
    g.fillStyle = '#ffffff'; g.font = 'bold 9px monospace'; g.fillText('Halifax  ->  Le Havre (by cargo ship)', W / 2, 69);
    if (Math.floor(t * 2) % 2) { g.fillStyle = '#ffffff'; g.font = 'bold 8px monospace'; g.fillText('press any key or tap to skip', W / 2, 172); }
  }
  function draw() {
    if (mode === 'ship') { drawShip(); return; }
    var i, s, sg, ci = Math.floor(pos / SEG), base = segs[ci % total], bp = (pos % SEG) / SEG;
    var camY = CAM_H + (base.y1 + (base.y2 - base.y1) * bp);
    var pidx = Math.min(Math.floor((pos + PLAYER_Z) / SEG), finishSeg), zi = zoneAt(pidx), za = zoneObj(zi.a), zb = zoneObj(zi.b);
    // sky, blended between zones
    var ska = za.sky || L.sky, skb = zb.sky || L.sky, bh = Math.ceil((HZ + 1) / ska.length);
    for (i = 0; i < ska.length; i++) { g.fillStyle = lc(ska[i], skb[i], zi.t); g.fillRect(0, i * bh, W, bh + 1); }
    var off = ((bgX % 640) + 640) % 640;
    g.drawImage(bgs[zi.a], -off, 0); g.drawImage(bgs[zi.a], 640 - off, 0);
    if (zi.t > 0 && zi.b !== zi.a) { g.globalAlpha = zi.t; g.drawImage(bgs[zi.b], -off, 0); g.drawImage(bgs[zi.b], 640 - off, 0); g.globalAlpha = 1; }
    [[za, 1 - zi.t], [zb, zi.b !== zi.a ? zi.t : 0]].forEach(function (m) {
      if (!m[0].mark || m[1] <= 0) { return; }
      var img = MARK[m[0].mark], mx = ((((200 - bgX * 0.5) % 420) + 420) % 420) - 50;
      g.globalAlpha = m[1]; g.drawImage(img, Math.round(mx - img.width / 2), HZ + 2 - img.height); g.globalAlpha = 1;
    });
    g.fillStyle = base.c.g[0]; g.fillRect(0, HZ, W, H - HZ);

    // road, front to back accumulating curves. Each strip fills exactly its own rows, so no grass shows through.
    var x = 0, dx = -(base.curve * bp), maxY = H, n, p1, p2;
    var camX = playerX * ROAD_W;
    for (n = 0; n < DRAW; n++) {
      sg = segs[(ci + n) % total];
      var wrap = (ci + n) >= total ? total * SEG : 0;
      p1 = { x: -x, y: sg.y1, z: sg.z1 + wrap }; p2 = { x: -x - dx, y: sg.y2, z: sg.z2 + wrap };
      project(p1, camX, camY, pos); project(p2, camX, camY, pos);
      x += dx; dx += sg.curve;
      sg.p1 = p1; sg.p2 = p2; sg.clip = maxY;
      if (p1.z <= CAM_D || p2.sy >= p1.sy || p2.sy >= maxY) { continue; }
      var gi = sg.light ? 0 : 1, y1 = Math.min(p1.sy, maxY), c = sg.c;
      g.fillStyle = c.g[gi]; g.fillRect(0, p2.sy, W, y1 - p2.sy);
      quad(p1.sx, y1, p1.sw * 1.12, p2.sx, p2.sy, p2.sw * 1.12, c.u[gi]);
      quad(p1.sx, y1, p1.sw, p2.sx, p2.sy, p2.sw, c.r[gi]);
      if (!sg.light) {
        [-1 / 3, 1 / 3].forEach(function (lx) { quad(p1.sx + p1.sw * lx, y1, p1.sw / 40, p2.sx + p2.sw * lx, p2.sy, p2.sw / 40, '#f2f2f2'); });
      }
      if (sg.boost) {   // painted arrow (chevron) that gives a boost
        var cx1 = p1.sx + p1.sw * sg.boostOff, cx2 = p2.sx + p2.sw * sg.boostOff, hw1 = p1.sw * 0.28;
        g.fillStyle = '#FFE14A'; g.beginPath();
        g.moveTo(cx1 - hw1, y1); g.lineTo(cx2, p2.sy); g.lineTo(cx1 + hw1, y1); g.lineTo(cx1 + hw1 * 0.6, y1); g.lineTo(cx2, p2.sy + (y1 - p2.sy) * 0.45); g.lineTo(cx1 - hw1 * 0.6, y1); g.closePath(); g.fill();
      }
      maxY = p2.sy;
    }
    // sprites back to front
    var cr = CRY[L.cr];
    for (n = DRAW - 1; n > 0; n--) {
      sg = segs[(ci + n) % total];
      if (!sg.p1 || sg.p1.z <= CAM_D) { continue; }
      var pa = sg.p1;
      for (s = 0; s < sg.sprites.length; s++) {
        var sp = sg.sprites[s];
        drawSprite(SP[sp.t], sp.sp[0], pa.sc, pa.sx + pa.sc * sp.off * ROAD_W * W / 2, pa.sy, sg.clip);
      }
      if (sg.gate) { drawGate(sg, pa); }
      if (sg.item && !sg.item.got) { drawSprite(Math.floor(tick * 6) % 2 ? SP.bat0 : SP.bat1, 420, pa.sc, pa.sx + pa.sc * sg.item.off * ROAD_W * W / 2, pa.sy, sg.clip); }
      for (var e = 0; e < events.length; e++) {
        var ev = events[e];
        if (ev.seg === sg.i && ev.state === 'cross') {
          var fr = (ev.side > 0 ? cr.frL : cr.fr)[Math.floor(ev.f * 5) % 2];
          drawSprite(fr, cr.ww, pa.sc, pa.sx + pa.sc * ev.off * ROAD_W * W / 2, pa.sy, sg.clip);
        }
      }
      for (var cc = 0; cc < sg.cars.length; cc++) {
        var car = sg.cars[cc], t = (car.z - sg.z1) / SEG;
        var sc = pa.sc + (sg.p2.sc - pa.sc) * t, cxx = pa.sx + (sg.p2.sx - pa.sx) * t + sc * car.off * ROAD_W * W / 2, cyy = pa.sy + (sg.p2.sy - pa.sy) * t;
        drawSprite(car.spr, 520, sc, cxx, cyy, sg.clip);
      }
    }
    // Leah's jeep: 5 frames by how hard she steers
    var fi = steerV < -0.6 ? 0 : steerV < -0.15 ? 1 : steerV > 0.6 ? 4 : steerV > 0.15 ? 3 : 2;
    var jf = JEEP[fi], bob = speed > 1 ? (Math.floor(tick * 14) % 2) : 0, jx = Math.round(W / 2 - jf.width / 2), jy = Math.round(H - jf.height - 2 + bob - lift);
    if (crashT > 0) { jx += Math.round(Math.sin(tick * 60) * 3); }
    if (mode !== 'over' && mode !== 'win') {
      if (lift > 2) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(jx + 6, H - 4, jf.width - 12, 3); }
      g.drawImage(jf, jx, jy);
    }
    if (boostT > 0) { g.fillStyle = 'rgba(255,255,255,.55)'; for (i = 0; i < 6; i++) { g.fillRect(Math.round((i * 53 + tick * 600) % W), 100 + (i * 17) % 70, 2, 12); } }
    if (flash > 0) { g.fillStyle = 'rgba(120,255,120,.18)'; g.fillRect(0, 0, W, H); }

    // HUD: battery, level progress, kilometers
    var bx = 206, bw2 = 106, frac = clamp(timeLeft / (L.start + L.cp), 0, 1);
    g.fillStyle = '#10202e'; g.fillRect(bx - 2, 3, bw2 + 4, 12); g.fillStyle = '#1E3248'; g.fillRect(bx, 5, bw2, 8);
    g.fillStyle = frac > 0.35 ? '#3cff4a' : frac > 0.15 ? '#ffd23a' : '#ff4a3a'; g.fillRect(bx, 5, Math.round(bw2 * frac), 8);
    g.fillStyle = '#f2f2f2'; g.fillRect(bx + bw2 + 2, 7, 3, 4);
    var pr = clamp(pos / (finishSeg * SEG), 0, 1);
    g.fillStyle = '#10202e'; g.fillRect(bx - 2, 18, bw2 + 4, 6); g.fillStyle = '#6798C0'; g.fillRect(bx, 20, bw2, 2);
    g.fillStyle = '#FDC921'; g.fillRect(bx + Math.round((bw2 - 4) * pr), 18, 5, 6);
    [1 / 3, 2 / 3].forEach(function (f) { g.fillStyle = '#f2f2f2'; g.fillRect(bx + Math.round(bw2 * f), 19, 1, 4); });
    g.textAlign = 'right'; g.font = 'bold 9px monospace'; g.fillStyle = '#10202e'; g.fillText(fmtN(kmNow()) + ' km', 313, 35); g.fillStyle = '#ffffff'; g.fillText(fmtN(kmNow()) + ' km', 312, 34);

    // title card, toast
    g.textAlign = 'center';
    if (mode === 'card') {
      g.fillStyle = 'rgba(16,32,46,.78)'; g.fillRect(0, 56, W, 66);
      g.fillStyle = '#FDC921'; g.font = 'bold 12px monospace'; g.fillText('LEVEL ' + level + ' OF ' + TOTAL, W / 2, 75);
      g.fillStyle = '#ffffff'; g.font = 'bold 20px monospace'; g.fillText(L.name.toUpperCase(), W / 2, 98);
      g.fillStyle = '#99D6EA'; g.font = 'bold 10px monospace'; g.fillText(L.sub, W / 2, 113);
    }
    if (toastT > 0) { g.fillStyle = 'rgba(16,32,46,.7)'; g.fillRect(30, 100, W - 60, 16); g.fillStyle = '#ffffff'; g.font = 'bold 10px monospace'; g.fillText(toast, W / 2, 112, W - 66); }
    if (mode === 'drive' && timeLeft < 8 && Math.floor(tick * 4) % 2) { g.fillStyle = '#ff4a3a'; g.font = 'bold 10px monospace'; g.fillText('LOW BATTERY!', W / 2, 94); }
  }
  function drawGate(sg, pa) {
    var gw = pa.sw * 1.15, gy = pa.sy, gh = pa.sc * 900 * H / 2;
    if (gh < 2) { return; }
    var top = Math.round(gy - gh), lx = Math.round(pa.sx - gw - 1), bw = Math.round(gw * 2 + 3), bhh = Math.max(3, Math.round(gh * 0.24));
    if (sg.clip != null && top > sg.clip) { return; }
    g.fillStyle = '#2a2a30'; g.fillRect(lx, top, 3, Math.round(gh)); g.fillRect(Math.round(pa.sx + gw - 1), top, 3, Math.round(gh));
    var fin = sg.gate === 'FINISH';
    g.fillStyle = fin ? '#1E3248' : '#FDC921'; g.fillRect(lx, top, bw, bhh);
    if (fin) {   // border gate: a chequered strip and the next country's welcome
      var cs = Math.max(1, Math.ceil(bhh / 4));
      for (var f = 0; f * cs < bw; f++) { g.fillStyle = f % 2 ? '#111' : '#f2f2f2'; g.fillRect(lx + f * cs, top + bhh - cs, cs, cs); }
    }
    if (bhh > 6) {
      g.fillStyle = fin ? '#FDC921' : '#1E3248'; g.font = 'bold ' + Math.max(5, Math.round(bhh * (fin ? 0.55 : 0.8))) + 'px monospace'; g.textAlign = 'center';
      g.fillText(fin ? L.gate : 'CHECKPOINT', pa.sx, top + Math.round(bhh * (fin ? 0.62 : 0.8)), bw - 4);
    }
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
    if (mode === 'ship' && !e.repeat) { endShip(); }
    var k = KEYMAP[e.key];
    if (!k) { return; }
    if (mode !== 'idle' && mode !== 'win' && mode !== 'over') { e.preventDefault(); }
    keys[k] = true;
  });
  window.addEventListener('keyup', function (e) { var k = KEYMAP[e.key]; if (k) { keys[k] = false; } });
  window.addEventListener('blur', function () { keys.left = keys.right = keys.gas = keys.brake = false; });
  cv.addEventListener('pointerdown', function () { if (mode === 'ship') { endShip(); } });
  document.querySelectorAll('#touch button').forEach(function (b) {
    var k = b.getAttribute('data-key');
    function on(e) { e.preventDefault(); if (mode === 'ship') { endShip(); } keys[k] = true; }
    function off(e) { e.preventDefault(); keys[k] = false; }
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });

  // ------------------------------------------------------------------ certificate (drawn in the browser, nothing stored)
  function goofyPool() {
    var sec = finalMs / 1000, rr = Math.random;
    var ri = function (a, b) { return a + Math.floor(rr() * (b - a + 1)); };
    var snack = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
    return [
      ['Bugs on the windshield', fmtN(finalKm * 0.44 + ri(0, 60))],
      ['"Are we there yet?" asked', fmtN(Math.max(1, Math.floor(sec / 30))) + ' times'],
      ['Snacks eaten', [snack(ri(1, 3), 'casado', 'casados'), snack(ri(2, 5), 'taco', 'tacos'), snack(ri(1, 3), 'hot dog', 'hot dogs'), snack(ri(1, 3), 'poutine', 'poutines'), snack(ri(1, 4), 'croissant', 'croissants')].join(', ')],
      ['Selfies with Bigfoot', '0 (' + pick(['he is camera-shy', 'he blinked', 'bad fur day', 'he only signs autographs']) + ')'],
      ['Minutes seasick on the cargo ship', '6'],
      ['Sloths overtaken', ST.slothsPassed + ' (OK, they were slow cars)'],
      ['Werewolves who asked for a ride', ST.bumpedBy.werewolf ? String(ST.bumpedBy.werewolf) : '0 (they took the metro)'],
      ['Battery jokes heard', '0 (they were all too negative)'],
      ['Times Leah sang off-key', String(ri(12, 48))],
      ['Moose who said "sorry"', String(ri(2, 7))],
      ['Honks', '0 (electric Jeeps say "beep")'],
      ['Croissant crumbs in the seats', fmtN(ri(800, 3200))],
      ['Wrong turns', '0 (the road only goes one way)'],
      ['Speed cameras that saw a green blur', String(ST.boosts)],
      ['Pyramids climbed', '0 (the Jeep is not a mountain goat)'],
      ['Sticky maple syrup spots', String(ri(3, 17))],
      ['Tacos that went missing', ri(2, 9) + ' (main suspect: the chupacabra)'],
      ['Wendigo hugs accepted', '0 (hard pass)'],
      ['Times the GPS said "recalculating"', String(ri(5, 30))],
      ['Selfies with the Eiffel Tower', ri(40, 120) + ' (only 2 in focus)']
    ];
  }
  document.getElementById('certBtn').addEventListener('click', function () {
    var load = document.fonts && document.fonts.load ? document.fonts.load('20px "Myfont"') : Promise.resolve();
    load.catch(function () {}).then(function () { makeCertificate(me.name || 'Road Tripper', finalMs); });
  });
  function makeCertificate(name, ms) {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 1180;
    var x = c.getContext('2d'), CW = c.width, i;
    x.fillStyle = '#FFFDF7'; x.fillRect(0, 0, CW, c.height);
    x.fillStyle = '#FDC921'; x.fillRect(0, 0, CW, 36); x.fillRect(0, c.height - 36, CW, 36);
    x.fillStyle = '#99D6EA'; x.fillRect(0, 36, CW, 14); x.fillRect(0, c.height - 50, CW, 14);
    x.strokeStyle = '#1E3248'; x.lineWidth = 6; x.strokeRect(50, 70, CW - 100, c.height - 140);
    x.textAlign = 'center'; x.fillStyle = '#1E3248';
    var pix = '"Myfont", "DM Sans", sans-serif';
    x.font = '56px ' + pix; x.fillText('CERTIFICATE', CW / 2, 170);
    x.font = '32px ' + pix; x.fillText('OF EPIC ROAD TRIP', CW / 2, 220);
    x.font = '20px sans-serif'; x.fillText('This certifies that', CW / 2, 285);
    var size = 80; x.font = size + 'px ' + pix;
    while (x.measureText(name).width > CW - 260 && size > 20) { size -= 2; x.font = size + 'px ' + pix; }
    x.fillStyle = '#6798C0'; x.fillText(name, CW / 2, 365);
    x.fillStyle = '#1E3248'; x.font = '20px sans-serif';
    x.fillText('drove Leah\'s electric Jeep ' + fmtN(CUM[5]) + ' km from Costa Rica to Paris, through Mexico, the USA and Canada,', CW / 2, 420);
    x.fillText('without running out of battery, in all 5 levels of Leah\'s Outrun.', CW / 2, 448);
    function stat(col, row, label, val) {
      var bx = col ? 640 : 110, by = 520 + row * 34;
      x.textAlign = 'left'; x.font = '19px sans-serif'; x.fillStyle = '#1E3248'; x.fillText(label, bx, by);
      x.textAlign = 'right'; x.font = 'bold 19px sans-serif'; x.fillStyle = '#6798C0'; x.fillText(val, bx + 450, by);
    }
    x.textAlign = 'left'; x.font = '24px ' + pix; x.fillStyle = '#1E3248'; x.fillText('TRIP STATS', 110, 488); x.fillText('CRYPTID REPORT', 640, 488);
    var left = [['Kilometers driven', fmtN(CUM[5]) + ' km'], ['Total time', fmt(ms)], ['Top speed', ST.top + ' mph'], ['Batteries collected', String(ST.batt)],
      ['Boosts used', String(ST.boosts)], ['Crashes', String(ST.crashes)], ['Countries visited', '5 of 5']];
    left.forEach(function (r, k) { stat(0, k, r[0], r[1]); });
    var right = [];
    Object.keys(CRY).forEach(function (k) { right.push([CRY[k].plural + ' spotted', String(ST.sight[k])]); });
    right.push(['Cryptids dodged', String(ST.dodged)]); right.push(['Cryptids bumped', ST.bumped ? String(ST.bumped) + ' (oops)' : '0 (well done)']);
    right.forEach(function (r, k) { stat(1, k, r[0], r[1]); });
    // goofy stats: 4 at random
    var pool = goofyPool(), chosen = [];
    while (chosen.length < 4 && pool.length) { chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); }
    x.fillStyle = '#FFF1B8'; x.fillRect(100, 780, CW - 200, 190); x.strokeStyle = '#FDC921'; x.lineWidth = 3; x.strokeRect(100, 780, CW - 200, 190);
    x.textAlign = 'center'; x.font = '24px ' + pix; x.fillStyle = '#1E3248'; x.fillText('ALSO VERY IMPORTANT', CW / 2, 815);
    for (i = 0; i < chosen.length; i++) {
      x.font = '19px sans-serif'; x.fillStyle = '#1E3248'; x.fillText(chosen[i][0] + ': ' + chosen[i][1], CW / 2, 852 + i * 30, CW - 240);
    }
    x.imageSmoothingEnabled = false; var jw = JEEP[2].width * 2, jh = JEEP[2].height * 2; x.drawImage(JEEP[2], 140, 1000, jw, jh);
    var w2 = CRY.bigfoot.fr[0]; x.drawImage(w2, CW - 210, 990, w2.width * 2.4, w2.height * 2.4);
    x.textAlign = 'center'; x.fillStyle = '#1E3248'; x.font = '24px ' + pix;
    x.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), CW / 2, 1040);
    x.fillText('livedbyleah.com', CW / 2, 1076);
    c.toBlob(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'outrun-certificate.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  }

  // Test hook: only when the page is opened with ?debug=1
  if (/[?&]debug=1/.test(location.search)) {
    window.__road = {
      keys: keys, level: function (n) { clockMs = clockMs || 0; el.start.hidden = true; loadLevel(n); },
      info: function () {
        var s = segAt(pos + PLAYER_Z), idx = Math.floor((pos + PLAYER_Z) / SEG);
        return { mode: mode, level: level, pos: pos, idx: idx, finish: finishSeg, speed: speed, pct: speed / MAXS, x: playerX, curve: s.curve, time: timeLeft, ms: clockMs, lvlMs: lvlMs, boost: boostT,
          km: kmNow(), steer: steerV, lift: lift, zone: L.zones[zoneAt(Math.min(idx, finishSeg)).a], stats: ST,
          ahead: cars.filter(function (c) { return c.z > pos + PLAYER_Z && c.z < pos + PLAYER_Z + SEG * 22; }).map(function (c) { return { dz: (c.z - pos - PLAYER_Z) / SEG, off: c.off }; }),
          events: events.map(function (ev) { return ev.seg + ':' + ev.state; }), cry: events.filter(function (ev) { return ev.state === 'cross' && ev.seg >= idx - 1; }).map(function (ev) { return { dz: ev.seg - idx, off: ev.off }; }),
          items: segs.slice(idx, idx + 14).filter(function (q) { return q.item && !q.item.got; }).map(function (q) { return q.item.off; }) };
      },
      jump: function (frac) { pos = Math.floor(finishSeg * frac) * SEG; },
      god: function (v) { god = v !== false; }, over: function (ms) { if (ms) { clockMs = ms; } gameOver(); }, won: function (ms) { clockMs = ms || 130000; gameWon(); }, skipCard: function () { cardT = 0; },
      ship: startShip, cert: function () { makeCertificate(me.name || 'Road Tripper', finalMs || 300000); },
      start: beginRun, setNonce: function (n) { runNonce = n; }
    };
  }

  idleScene();
  loadHof();
  requestAnimationFrame(loop);
})();

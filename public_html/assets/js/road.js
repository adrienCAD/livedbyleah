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
  function flip(img) { var c = mk(img.width, img.height, function (x) { x.translate(img.width, 0); x.scale(-1, 1); x.drawImage(img, 0, 0); }); c.hi = img.hi; return c; }
  function pick(arr, r) { return arr[Math.floor((r ? r() : Math.random()) * arr.length)]; }

  // finer drawing (v1.2.9): sprites drawn at 3x detail with smooth shapes, so they look closer to Leah's art when they are near
  var OL = '#17110c';
  function mkHi(w, h, S, fn) {
    var c = document.createElement('canvas'); c.width = Math.round(w * S); c.height = Math.round(h * S);
    var x = c.getContext('2d'); x.scale(S, S); x.lineJoin = 'round'; x.lineCap = 'round'; fn(x); c.hi = true; return c;
  }
  function PG(x, col, pts, ol, lw) {
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) { x.lineTo(pts[i][0], pts[i][1]); } x.closePath();
    x.fillStyle = col; x.fill(); if (ol) { x.lineWidth = lw || 0.55; x.strokeStyle = ol; x.stroke(); }
  }
  function EL(x, col, cx, cy, rx, ry, rot, ol) {
    x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, 6.3); x.fillStyle = col; x.fill(); if (ol) { x.lineWidth = 0.55; x.strokeStyle = ol; x.stroke(); }
  }
  function LN(x, col, x1, y1, x2, y2, w) { x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.strokeStyle = col; x.lineWidth = w; x.stroke(); }
  function RR(x, col, a, b, w, h, r, ol) {
    x.beginPath(); x.moveTo(a + r, b); x.lineTo(a + w - r, b); x.quadraticCurveTo(a + w, b, a + w, b + r); x.lineTo(a + w, b + h - r); x.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
    x.lineTo(a + r, b + h); x.quadraticCurveTo(a, b + h, a, b + h - r); x.lineTo(a, b + r); x.quadraticCurveTo(a, b, a + r, b); x.closePath();
    x.fillStyle = col; x.fill(); if (ol) { x.lineWidth = 0.55; x.strokeStyle = ol; x.stroke(); }
  }
  function GR(x, y0, y1, c0, c1) { var gr = x.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }

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
  function carCommon(x, col, top, bot) {   // shadow, tires, bumper, plate (shared by all rear views)
    EL(x, 'rgba(0,0,0,.32)', 14, bot - 0.2, 13.5, 1.3);
    RR(x, '#0d0d10', 2.2, bot - 5.2, 4.6, 5.2, 1.2, OL); RR(x, '#0d0d10', 21.2, bot - 5.2, 4.6, 5.2, 1.2, OL);
    RR(x, '#2a2a30', 2.6, bot - 3.4, 22.8, 2, 0.9, OL); RR(x, '#8a8a94', 3.4, bot - 3.1, 21.2, 0.5, 0.2);
    RR(x, '#f4f4ea', 10.6, bot - 6.6, 6.8, 2.7, 0.4, OL); LN(x, '#5a6a8a', 11.6, bot - 5.6, 16.4, bot - 5.6, 0.5); LN(x, '#c0392b', 11.6, bot - 4.6, 14, bot - 4.6, 0.4);
  }
  function tails(x, y) {
    [3.3, 19.9].forEach(function (a) { RR(x, '#d81e18', a, y, 4.8, 2.5, 0.9, OL); RR(x, '#ff6a5a', a + 0.5, y + 0.4, 3.8, 0.9, 0.4); });
  }
  function sedan(col) {
    return mkHi(28, 16, 3.4, function (x) {
      carCommon(x, col, 0, 16);
      PG(x, GR(x, 1, 8, lc(col, '#ffffff', 0.25), col), [[6.4, 8], [8.2, 1.4], [19.8, 1.4], [21.6, 8]], OL);
      PG(x, GR(x, 2, 7, '#2c4258', '#0f1822'), [[7.9, 7.2], [9.1, 2.5], [18.9, 2.5], [20.1, 7.2]], OL, 0.4);
      PG(x, 'rgba(255,255,255,.22)', [[9.4, 7], [11, 2.7], [13.2, 2.7], [11.6, 7]]);
      RR(x, GR(x, 7, 13.5, lc(col, '#ffffff', 0.2), lc(col, '#000000', 0.3)), 2.4, 7.2, 23.2, 6.2, 1.8, OL);
      LN(x, lc(col, '#000000', 0.35), 3.2, 9.9, 24.8, 9.9, 0.35); LN(x, lc(col, '#ffffff', 0.55), 4, 7.9, 24, 7.9, 0.35);
      tails(x, 8.1);
    });
  }
  function hatch(col) {
    return mkHi(28, 16, 3.4, function (x) {
      carCommon(x, col, 0, 16);
      PG(x, GR(x, 0.6, 8, lc(col, '#ffffff', 0.25), col), [[5.6, 8], [6.4, 2.4], [9, 0.8], [19, 0.8], [21.6, 2.4], [22.4, 8]], OL);
      PG(x, GR(x, 1.6, 7, '#2c4258', '#0f1822'), [[7, 7.2], [7.6, 3], [9.6, 1.9], [18.4, 1.9], [20.4, 3], [21, 7.2]], OL, 0.4);
      LN(x, '#1a1a20', 14, 2, 14, 7.2, 0.35); RR(x, '#14141a', 8.4, 0.2, 11.2, 0.9, 0.4);
      PG(x, 'rgba(255,255,255,.2)', [[8.6, 7], [9.8, 3], [11.6, 2.4], [10.4, 7]]);
      RR(x, GR(x, 7, 13.5, lc(col, '#ffffff', 0.2), lc(col, '#000000', 0.3)), 2.4, 7.2, 23.2, 6.2, 1.8, OL);
      LN(x, lc(col, '#000000', 0.35), 3.2, 10.2, 24.8, 10.2, 0.35);
      tails(x, 8.1);
    });
  }
  function truck(col) {   // pickup seen from behind: cab roof, tailgate, bed rails
    return mkHi(28, 20, 3.4, function (x) {
      EL(x, 'rgba(0,0,0,.32)', 14, 19.6, 13.5, 1.3);
      RR(x, '#0d0d10', 2.2, 13.6, 4.8, 6, 1.2, OL); RR(x, '#0d0d10', 21, 13.6, 4.8, 6, 1.2, OL);
      PG(x, GR(x, 0.5, 8, lc(col, '#ffffff', 0.25), col), [[6.2, 9], [7, 1.8], [8.4, 0.6], [19.6, 0.6], [21, 1.8], [21.8, 9]], OL);
      PG(x, GR(x, 1.4, 7, '#2c4258', '#0f1822'), [[7.8, 7.2], [8.4, 2.6], [19.6, 2.6], [20.2, 7.2]], OL, 0.4);
      PG(x, 'rgba(255,255,255,.2)', [[9, 7], [10, 3], [12, 3], [11, 7]]);
      RR(x, GR(x, 8, 17, lc(col, '#ffffff', 0.2), lc(col, '#000000', 0.32)), 2.2, 8.6, 23.6, 8.8, 1.2, OL);
      RR(x, '#14141a', 2.6, 8.2, 22.8, 1.3, 0.5, OL); RR(x, lc(col, '#000000', 0.2), 3.6, 10.4, 20.8, 5.2, 0.8); LN(x, lc(col, '#ffffff', 0.4), 4.4, 10.8, 23.6, 10.8, 0.3);
      RR(x, '#8a8a94', 11.8, 11.4, 4.4, 1.2, 0.4, OL);
      [2.6, 20.6].forEach(function (a) { RR(x, '#d81e18', a, 9.2, 4.8, 2.4, 0.9, OL); RR(x, '#ff6a5a', a + 0.5, 9.6, 3.8, 0.8, 0.4); });
      RR(x, '#2a2a30', 2.4, 15.6, 23.2, 2, 0.9, OL); RR(x, '#f4f4ea', 10.6, 12.8, 6.8, 2.5, 0.4, OL); LN(x, '#5a6a8a', 11.6, 13.9, 16.4, 13.9, 0.5);
    });
  }
  function van(col) {
    return mkHi(28, 20, 3.4, function (x) {
      EL(x, 'rgba(0,0,0,.32)', 14, 19.6, 13.5, 1.3);
      RR(x, '#0d0d10', 2.4, 14.4, 4.6, 5.2, 1.2, OL); RR(x, '#0d0d10', 21, 14.4, 4.6, 5.2, 1.2, OL);
      RR(x, GR(x, 0, 16, lc(col, '#ffffff', 0.25), lc(col, '#000000', 0.25)), 3, 0.6, 22, 15.6, 2.4, OL);
      RR(x, '#14141a', 5, 1.8, 8.4, 6.2, 1, OL); RR(x, '#14141a', 14.6, 1.8, 8.4, 6.2, 1, OL);
      PG(x, 'rgba(255,255,255,.18)', [[6, 7.4], [8, 2.4], [10, 2.4], [8, 7.4]]); PG(x, 'rgba(255,255,255,.18)', [[15.6, 7.4], [17.6, 2.4], [19.6, 2.4], [17.6, 7.4]]);
      LN(x, lc(col, '#000000', 0.4), 14, 1, 14, 15.4, 0.4); RR(x, '#c9c9d2', 12.2, 9.6, 1.2, 2.4, 0.4, OL); RR(x, '#c9c9d2', 14.6, 9.6, 1.2, 2.4, 0.4, OL);
      [3.6, 19.6].forEach(function (a) { RR(x, '#d81e18', a, 9.6, 4.8, 3, 0.9, OL); RR(x, '#ff6a5a', a + 0.5, 10, 3.8, 0.9, 0.4); });
      RR(x, '#2a2a30', 3, 15.6, 22, 2, 0.9, OL); RR(x, '#f4f4ea', 10.6, 13.2, 6.8, 2.4, 0.4, OL); LN(x, '#5a6a8a', 11.6, 14.4, 16.4, 14.4, 0.5);
    });
  }
  var CARS = [];
  CAR_COL.forEach(function (c, i) { CARS.push([sedan, hatch, truck, sedan, van, hatch, truck][i](c)); });
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

  // ------------------------------------------------------------------ cryptids: two per country, drawn facing right (mirrored when they walk left)
  // w,h = drawing size in units; speed = how fast they cross (slow, so you can see them); hop/lift/alpha are for the hoppers, the floaters and the ghost
  var CRY = {
    sloth: { name: 'giant sloth', nm: 'SLOTH', plural: 'Giant sloths', warn: 'PEREZOSOS', w: 30, h: 48, ww: 950, speed: 0.4, draw: function (x, f) {
      LN(x, '#6a4a2c', 11 + f * 1.2, 37, 11 + f, 44, 4.6); LN(x, '#6a4a2c', 19 - f * 1.2, 37, 19 - f, 44, 4.6);
      [[9.6 + f, 45], [18 - f, 45]].forEach(function (p) { EL(x, '#5a3a20', p[0] + 1.4, p[1], 3.2, 1.5, 0, OL); LN(x, '#efe6cf', p[0] + 3.4, p[1] - 0.3, p[0] + 4.6, p[1] + 0.8, 0.7); });
      EL(x, '#8a6a48', 15, 26, 10.5, 13.5, 0, OL); EL(x, '#a8865e', 15.6, 28, 6.6, 9.5);
      for (var k = 0; k < 9; k++) { LN(x, '#6a4a2c', 6 + k * 2.2, 22 + (k % 3) * 5, 7.4 + k * 2.2, 25 + (k % 3) * 5, 0.7); }
      LN(x, '#7a5a38', 9, 19, 5.6 + f * 1.6, 33, 3.6); LN(x, '#7a5a38', 21, 19, 24.4 - f * 1.6, 34, 3.6);
      [[5.6 + f * 1.6, 33.5], [24.4 - f * 1.6, 34.5]].forEach(function (p) { for (var c = -1; c <= 1; c++) { LN(x, '#efe6cf', p[0] + c * 1.3, p[1], p[0] + c * 1.6, p[1] + 3.4, 0.8); } });
      EL(x, '#a8865e', 16, 11, 7.6, 7.2, 0, OL); EL(x, '#d8c8a8', 18.2, 12.2, 5, 4.6);
      EL(x, '#4a3020', 16.6, 11.2, 2.2, 1.5, -0.35); EL(x, '#4a3020', 21, 11.6, 2.2, 1.5, 0.35);
      EL(x, '#fff', 16.8, 11, 0.8, 0.8); EL(x, '#fff', 21.2, 11.4, 0.8, 0.8); EL(x, '#111', 17, 11, 0.45, 0.45); EL(x, '#111', 21.4, 11.4, 0.45, 0.45);
      EL(x, '#2a1a10', 22.6, 13.8, 1.3, 0.9); x.beginPath(); x.arc(19.6, 14, 2, 0.2, 2.6); x.strokeStyle = '#3a2414'; x.lineWidth = 0.45; x.stroke();
    } },
    frog: { name: 'Big Blue Jeans Frog', nm: 'BLUE JEANS FROG', plural: 'Big Blue Jeans Frogs', warn: 'RANAS GIGANTES', w: 38, h: 32, ww: 1100, speed: 0.62, hop: 700, hopRate: 6, draw: function (x, f) {
      var up = f === 1, B = '#2f6fd0', Bd = '#1f4ea0';
      // hind leg (blue jeans) folded or stretched
      if (up) { LN(x, Bd, 11, 17, 3, 21, 5.4); LN(x, B, 11, 17, 3, 21, 4.2); EL(x, '#e8321e', 1.6, 22.4, 2.6, 1.2, 0.5, OL); }
      else { EL(x, B, 9, 22, 6.4, 5, -0.5, OL); LN(x, Bd, 6, 21, 12, 26, 0.5); EL(x, '#e8321e', 12.6, 28, 4, 1.5, 0, OL); }
      EL(x, '#e8321e', 19, 19, 13, 9, up ? -0.18 : 0, OL); EL(x, '#ff7a5a', 19, 15.6, 9, 3.6, 0, 0); EL(x, '#f6a08a', 21, 24, 8, 3);
      [[13, 16, 1.2], [18, 14, 1.4], [23, 15, 1.1], [16, 20, 1], [21, 20.6, 1.2], [26, 19, 0.9]].forEach(function (d) { EL(x, '#1a0a08', d[0], d[1], d[2], d[2] * 0.85); });
      // front legs in jeans
      LN(x, Bd, 26, 24, up ? 33 : 28, up ? 24 : 29, 4.6); LN(x, B, 26, 24, up ? 33 : 28, up ? 24 : 29, 3.4); EL(x, '#e8321e', up ? 34 : 29.4, up ? 24 : 30, 2.2, 1.2, 0, OL);
      LN(x, '#f2d66a', 26.6, 25.4, up ? 31 : 27.6, up ? 25.4 : 28.4, 0.3);
      // head with big eyes
      EL(x, '#e8321e', 29, 15.6, 7.2, 6, 0, OL); EL(x, '#f6a08a', 31, 18, 4.6, 2.2); LN(x, '#3a1008', 26, 18.2, 36, 18, 0.5);
      EL(x, '#fff', 29.4, 9.8, 3.4, 3.2, 0, OL); EL(x, '#e8321e', 29.4, 11.4, 3.6, 1.2); EL(x, '#111', 30.4, 9.9, 1.6, 1.6); EL(x, '#fff', 30.8, 9.2, 0.55, 0.55);
      EL(x, '#fff', 34.2, 11, 2.4, 2.4, 0, OL); EL(x, '#111', 34.8, 11.1, 1.1, 1.1);
      EL(x, '#2a1008', 36.4, 15.4, 0.6, 0.5);
    } },
    dama: { name: 'Dama Blanca', nm: 'DAMA BLANCA', plural: 'Damas Blancas', warn: 'DAMA BLANCA', w: 30, h: 52, ww: 900, speed: 0.5, alpha: 0.82, lift: 140, draw: function (x, f) {
      var g0 = x.createRadialGradient(15, 24, 2, 15, 24, 24); g0.addColorStop(0, 'rgba(210,225,255,.55)'); g0.addColorStop(1, 'rgba(210,225,255,0)'); x.fillStyle = g0; x.fillRect(0, 0, 30, 52);
      PG(x, '#14141c', [[9, 7], [15, 3], [21, 7], [23, 30], [20, 36], [10, 36], [7, 30]], null);
      var sw = f ? 2 : -2;
      PG(x, GR(x, 14, 50, '#ffffff', '#c9d2ee'), [[11, 17], [19, 17], [24 + sw * 0.5, 34], [27 + sw, 50], [21, 46], [18 + sw * 0.4, 50.4], [14, 46], [9, 50.4 - sw * 0.2], [5 - sw, 49], [6, 34]], '#9aa6c8', 0.4);
      LN(x, '#b8c2e0', 12, 22, 9 + sw * 0.3, 46, 0.5); LN(x, '#b8c2e0', 18, 22, 21 + sw * 0.3, 46, 0.5); LN(x, '#b8c2e0', 15, 24, 15, 47, 0.5);
      LN(x, '#eef2ff', 12, 20, 6, 25 + f, 2.4); LN(x, '#eef2ff', 18, 20, 25, 24 - f, 2.4); EL(x, '#e8ecf4', 5.2, 25.6 + f, 1.4, 1.6); EL(x, '#e8ecf4', 25.6, 24.4 - f, 1.4, 1.6);
      EL(x, '#e8ecf4', 15, 11, 5.4, 6.4, 0, '#9aa6c8'); PG(x, '#14141c', [[9.6, 8], [15, 4.6], [20.4, 8], [18, 7], [15, 6.4], [12, 7]], null);
      EL(x, '#0b0b12', 12.8, 11, 1.4, 2.2); EL(x, '#0b0b12', 17.2, 11, 1.4, 2.2); EL(x, '#0b0b12', 15, 15.2, 0.9, 1.5);
      LN(x, '#14141c', 8.4, 10, 7.6, 34, 1.8); LN(x, '#14141c', 21.6, 10, 22.4, 34, 1.8);
    } },
    chupa: { name: 'chupacabra', nm: 'CHUPACABRA', plural: 'Chupacabras', warn: '¡CUIDADO!', w: 40, h: 30, ww: 850, speed: 0.72, draw: function (x, f) {
      var ph = f ? 3 : -3;
      LN(x, '#4a5e3a', 12, 20, 12 + ph, 28, 3.2); LN(x, '#4a5e3a', 19, 21, 19 - ph, 28, 3.2); LN(x, '#5a7048', 15, 20, 15 - ph, 28, 3); LN(x, '#5a7048', 23, 20, 23 + ph, 28, 3);
      [[12 + ph, 28.4], [19 - ph, 28.4], [15 - ph, 28.4], [23 + ph, 28.4]].forEach(function (p) { EL(x, '#2e3a24', p[0] + 1, p[1], 2.4, 1, 0, OL); });
      LN(x, '#4a5e3a', 6, 16, 0.6, 13 - f, 2.2); LN(x, '#4a5e3a', 6, 16, 2, 20, 1.2);
      EL(x, '#6f8a5a', 16, 16, 12, 6.8, -0.08, OL); EL(x, '#97b27e', 17, 19, 8, 3.4);
      for (var s = 0; s < 7; s++) { PG(x, '#2a3a22', [[6 + s * 2.8, 10.6 - (s % 2) * 0.6], [7.4 + s * 2.8, 5.2 - (s % 2) * 1.2], [9.2 + s * 2.8, 10.6 - (s % 2) * 0.6]], OL, 0.35); }
      PG(x, '#5f7a4c', [[24, 9], [31, 9], [38, 14.6], [37, 17.4], [30, 18.6], [24, 17]], OL); PG(x, '#4a5e3a', [[26, 9], [28, 3.4], [30, 9]], OL, 0.4); PG(x, '#4a5e3a', [[30, 9], [33, 4], [33, 10]], OL, 0.4);
      EL(x, 'rgba(255,60,60,.4)', 31.4, 11.6, 3, 3); EL(x, '#ff2a2a', 31.4, 11.6, 1.5, 1.5); EL(x, '#fff', 31.8, 11.2, 0.5, 0.5);
      PG(x, '#f4f0dc', [[32, 17.6], [33.4, 17.6], [32.8, 20.8]], OL, 0.3); PG(x, '#f4f0dc', [[35, 17.2], [36.2, 17], [35.8, 19.8]], OL, 0.3); EL(x, '#241a14', 37.4, 14.6, 0.9, 0.8);
    } },
    bigfoot: { name: 'Bigfoot', nm: 'BIGFOOT', plural: 'Bigfoots', warn: 'BIGFOOT XING', w: 30, h: 48, ww: 1000, speed: 0.58, draw: function (x, f) {
      LN(x, '#4a2e18', 11, 33, 9 + f * 2, 43, 5.6); LN(x, '#4a2e18', 19, 33, 20 - f * 2, 43, 5.6);
      EL(x, '#2e1c0e', 9.4 + f * 2, 44.4, 4.2, 1.8, 0, OL); EL(x, '#2e1c0e', 21.4 - f * 2, 44.4, 4.2, 1.8, 0, OL);
      LN(x, '#4a2e18', 7, 17, 4 + f * 3, 30, 4.4); LN(x, '#4a2e18', 23, 17, 26 - f * 3, 30, 4.4); EL(x, '#3a2414', 4 + f * 3, 31, 2.2, 2.4, 0, OL); EL(x, '#3a2414', 26 - f * 3, 31, 2.2, 2.4, 0, OL);
      EL(x, '#5a3a22', 15, 24, 10.4, 14, 0, OL);
      for (var k = 0; k < 10; k++) { LN(x, k % 2 ? '#7a5232' : '#3a2414', 6 + k * 2, 14 + (k * 7) % 18, 7.2 + k * 2, 17.4 + (k * 7) % 18, 0.8); }
      PG(x, '#5a3a22', [[8.6, 9], [11, 2.6], [15, 1.4], [19, 2.6], [21.6, 9]], OL, 0.45); EL(x, '#5a3a22', 15, 8.6, 6.6, 6.6, 0, OL);
      EL(x, '#8a6a4a', 15.6, 10.4, 4.2, 4, 0, '#3a2414'); LN(x, '#2a1a0c', 11.4, 7.6, 19.4, 7.6, 1.4);
      EL(x, '#111', 13.6, 9, 0.7, 0.7); EL(x, '#111', 17.6, 9, 0.7, 0.7); EL(x, '#2a1a0c', 15.6, 11, 1, 0.7); LN(x, '#3a2414', 13.8, 12.8, 17.6, 12.8, 0.45);
    } },
    jackalope: { name: 'jackalope', nm: 'JACKALOPE', plural: 'Jackalopes', warn: 'JACKALOPE XING', w: 36, h: 32, ww: 950, speed: 0.78, hop: 650, hopRate: 6.5, draw: function (x, f) {
      var up = f === 1;
      if (up) { LN(x, '#b8956a', 10, 22, 3, 25, 4.4); EL(x, '#a8845a', 2, 25.6, 2.6, 1.2, 0, OL); LN(x, '#b8956a', 23, 21, 29, 25, 2.4); }
      else { EL(x, '#b8956a', 10, 23, 6.6, 5.4, 0, OL); EL(x, '#a8845a', 13.4, 28.4, 4.4, 1.5, 0, OL); LN(x, '#b8956a', 24, 23, 26, 28, 2.4); }
      EL(x, '#c9a77a', 17, 20, 11, 6.4, up ? -0.2 : 0, OL); EL(x, '#e6d2b0', 19, 22.4, 7, 2.8); EL(x, '#fff', 5.2, 18.2, 2.8, 2.8, 0, OL);
      EL(x, '#c9a77a', 26, 14.4, 5.6, 5, 0, OL); EL(x, '#e6d2b0', 29, 16.4, 3, 2.4); EL(x, '#e88aa0', 31.8, 15.4, 1, 0.8);
      EL(x, '#111', 27, 12.6, 1, 1); EL(x, '#fff', 27.3, 12.3, 0.35, 0.35);
      EL(x, '#c9a77a', 19, 5, 1.8, 6, -0.3, OL); EL(x, '#e8a6a0', 19, 5.4, 0.8, 4.4, -0.3);
      [[24.6, 10.4, 21, 3, 17.4, 0.6, 22.2, 4.2, 20, 2.6], [27.6, 10.6, 30.6, 3.6, 33.4, 0.8, 30, 5.4, 33, 3.6]].forEach(function (a) {
        x.strokeStyle = '#6a4a28'; x.lineCap = 'round'; x.lineWidth = 1; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(a[2], a[3]); x.lineTo(a[4], a[5]); x.moveTo(a[2], a[3]); x.lineTo(a[6] - 1, a[7] - 2); x.stroke();
        x.lineWidth = 0.8; x.beginPath(); x.moveTo(a[2], a[3]); x.lineTo(a[8], a[9] - 2.4); x.stroke();
      });
    } },
    ogopogo: { name: 'Ogopogo', nm: 'OGOPOGO', plural: 'Ogopogos', warn: 'OGOPOGO XING', w: 64, h: 30, ww: 1800, speed: 0.5, draw: function (x, f) {
      var wv = f ? 2.4 : -2.4;
      x.save(); x.beginPath(); x.rect(0, 0, 64, 25); x.clip();
      [[10, 12 + wv * 0.5], [24, 9 - wv * 0.5], [38, 12 + wv * 0.5]].forEach(function (h) { EL(x, '#3f8a6a', h[0], 27, 7.6, 27 - h[1], 0, OL); EL(x, '#7ac4a0', h[0] - 1.6, 27, 4, 27 - h[1] - 2); });
      x.restore();
      [[10, 12 + wv * 0.5], [24, 9 - wv * 0.5], [38, 12 + wv * 0.5]].forEach(function (h) { PG(x, '#2a6a52', [[h[0] - 1.6, h[1] + 0.4], [h[0], h[1] - 3.2], [h[0] + 1.6, h[1] + 0.4]], OL, 0.35); });
      PG(x, '#3f8a6a', [[0, 25], [6, 22], [6, 25]], OL, 0.4);
      x.beginPath(); x.moveTo(44, 24); x.quadraticCurveTo(52, 22, 53, 12 + wv * 0.4); x.lineTo(57, 13 + wv * 0.4); x.quadraticCurveTo(57, 24, 48, 25); x.closePath(); x.fillStyle = '#3f8a6a'; x.fill(); x.lineWidth = 0.55; x.strokeStyle = OL; x.stroke();
      EL(x, '#7ac4a0', 55.6, 10.2 + wv * 0.4, 5.4, 3.8, -0.15, OL); EL(x, '#9ad8b6', 58, 11.4 + wv * 0.4, 3.4, 1.8); PG(x, '#2a6a52', [[52, 7 + wv * 0.4], [53, 3.8 + wv * 0.4], [55, 7 + wv * 0.4]], OL, 0.35);
      EL(x, '#fff', 55.8, 8.8 + wv * 0.4, 1.4, 1.4); EL(x, '#111', 56.1, 8.9 + wv * 0.4, 0.75, 0.75); LN(x, '#1a3a2a', 56, 12.4 + wv * 0.4, 61, 11.8 + wv * 0.4, 0.4);
      for (var d = 0; d < 6; d++) { EL(x, 'rgba(190,230,255,.85)', 4 + d * 11 + (f ? 3 : 0), 24 + (d % 2) * 2.2, 1, 1); }
    } },
    wendigo: { name: 'wendigo', nm: 'WENDIGO', plural: 'Wendigos', warn: 'WENDIGO XING', w: 30, h: 52, ww: 1000, speed: 0.55, draw: function (x, f) {
      LN(x, '#aeb2a6', 13, 35, 12 + f * 1.4, 49, 2.2); LN(x, '#aeb2a6', 18, 35, 19 - f * 1.4, 49, 2.2); LN(x, '#6a6e64', 10.4 + f * 1.4, 49.6, 14, 49.6, 0.9); LN(x, '#6a6e64', 17.6 - f * 1.4, 49.6, 21.4 - f * 1.4, 49.6, 0.9);
      LN(x, '#bfc2b8', 11, 19, 6, 32 + f * 2, 2); LN(x, '#bfc2b8', 20, 19, 25, 34 - f * 2, 2);
      [[6, 32 + f * 2], [25, 34 - f * 2]].forEach(function (p) { for (var c = -1; c <= 1; c++) { LN(x, '#3a3a34', p[0] + c, p[1], p[0] + c * 1.6, p[1] + 3.6, 0.5); } });
      EL(x, '#cfd2c8', 15.4, 26, 5.4, 11, 0, OL); for (var r = 0; r < 5; r++) { LN(x, '#8a8e82', 11.6, 20 + r * 2.8, 19.2, 20.6 + r * 2.8, 0.5); } LN(x, '#8a8e82', 15.4, 17, 15.4, 36, 0.4);
      x.strokeStyle = '#7a6a48'; x.lineCap = 'round'; x.lineWidth = 1.1;
      x.beginPath(); x.moveTo(12, 7); x.lineTo(8, 2); x.lineTo(5, 0.6); x.moveTo(8, 2); x.lineTo(7, -0.6 + 1.6); x.moveTo(11, 5); x.lineTo(10, 1.4);
      x.moveTo(19, 7); x.lineTo(23, 2); x.lineTo(26, 0.6); x.moveTo(23, 2); x.lineTo(24, 1); x.moveTo(20, 5); x.lineTo(21, 1.4); x.stroke();
      EL(x, '#e6e8df', 15.4, 11.4, 5.4, 6.6, 0, OL); EL(x, '#0b0b0b', 12.8, 10.4, 1.6, 2.2); EL(x, '#0b0b0b', 18, 10.4, 1.6, 2.2); EL(x, '#ff4a2a', 12.8, 10.6, 0.5, 0.5); EL(x, '#ff4a2a', 18, 10.6, 0.5, 0.5);
      EL(x, '#0b0b0b', 15.4, 13.4, 0.7, 1.1); x.beginPath(); x.moveTo(12.4, 15.4); for (var t = 0; t < 6; t++) { x.lineTo(12.4 + t * 1.2 + 0.6, 16.4 + (t % 2) * 0.9); } x.strokeStyle = '#2a2a24'; x.lineWidth = 0.4; x.stroke();
    } },
    loup: { name: 'loup-garou', nm: 'LOUP-GAROU', plural: 'Loups-garous', warn: 'LOUPS-GAROUS', w: 36, h: 48, ww: 1000, speed: 0.68, draw: function (x, f) {
      LN(x, '#4a4a54', 12, 34, 9 + f * 2, 43, 4); LN(x, '#4a4a54', 20, 34, 21 - f * 2, 43, 4); EL(x, '#2e2e36', 8.4 + f * 2, 44.6, 3.4, 1.4, 0, OL); EL(x, '#2e2e36', 22.4 - f * 2, 44.6, 3.4, 1.4, 0, OL);
      LN(x, '#4a4a54', 9, 30, 2 - f, 35, 1.6);
      PG(x, '#2a3a8a', [[8, 30], [24, 30], [26, 40], [19, 37], [16, 41], [13, 37], [6, 40]], OL, 0.45);
      LN(x, '#5a5a64', 8, 19, 3 + f * 3, 31, 3.6); LN(x, '#5a5a64', 24, 19, 29 - f * 3, 29, 3.6);
      [[3 + f * 3, 31.6], [29 - f * 3, 29.6]].forEach(function (p) { for (var c = -1; c <= 1; c++) { LN(x, '#f0f0e8', p[0] + c, p[1], p[0] + c * 1.4, p[1] + 3, 0.6); } });
      EL(x, '#6a6a74', 16, 23, 9.6, 11.6, 0, OL); EL(x, '#8a8a94', 17, 24.6, 6, 8);
      PG(x, '#8a6a4a', [[10, 22], [14, 20], [13, 27], [9, 26]], OL, 0.3);
      PG(x, '#5a5a64', [[11, 7], [12, -0.6], [16.4, 4.4]], OL, 0.4); PG(x, '#5a5a64', [[17, 4.4], [21, -0.6], [22, 7.4]], OL, 0.4);
      EL(x, '#6a6a74', 17.4, 9.8, 6.6, 6, 0, OL); PG(x, '#6a6a74', [[19, 6.8], [30, 10.4], [31, 13.2], [20, 14]], OL, 0.45); EL(x, '#241a14', 30.6, 10.8, 1.2, 1);
      PG(x, '#2a1414', [[22, 13.2], [30.4, 13.4], [27, 16.6], [22, 15.4]], OL, 0.3); PG(x, '#f4f0dc', [[23.4, 13.4], [24.6, 13.4], [24, 15.2]], null); PG(x, '#f4f0dc', [[26.6, 13.4], [27.8, 13.4], [27.4, 15.4]], null);
      EL(x, 'rgba(255,214,60,.45)', 20.6, 8.2, 2.6, 2.6); EL(x, '#ffd23a', 20.6, 8.2, 1.4, 1.1); EL(x, '#111', 20.9, 8.2, 0.45, 0.8);
    } },
    witch: { name: 'witch', nm: 'WITCH', plural: 'Witches', warn: 'SORCIÈRES', w: 44, h: 34, ww: 1100, speed: 0.62, lift: 260, bob: 60, draw: function (x, f) {
      var fl = f ? 1.4 : -1;
      LN(x, '#7a5230', 2, 25.4 + f * 0.4, 38, 22.4 - f * 0.3, 1.8); LN(x, '#9a6a3c', 2, 25.2 + f * 0.4, 38, 22.2 - f * 0.3, 0.5);
      PG(x, '#d8b04a', [[1, 25.8], [-1.4, 21.6 + fl], [-1, 26.4], [-1.8, 29.8 - fl], [2, 27.4]], OL, 0.35); LN(x, '#a8842a', 0, 25, 3, 25.6, 0.4);
      PG(x, '#2a1e3a', [[17, 14], [8, 18 + fl], [2.4, 14 + fl * 2], [8, 22], [14, 24]], OL, 0.45);   // cape flutter
      PG(x, GR(x, 12, 26, '#3a2a52', '#1e1430'), [[17, 12], [26, 13], [27, 22], [14, 24]], OL, 0.5);
      LN(x, '#2a1e3a', 20, 22, 20, 28 - f, 2.2); LN(x, '#2a1e3a', 25, 21, 28, 27 + f, 2.2); EL(x, '#1a1210', 20.4, 28.6 - f, 2.1, 1.1, 0, OL); EL(x, '#1a1210', 29, 27.6 + f, 2.1, 1.1, 0, OL);
      LN(x, '#3a2a52', 22, 14, 29, 20.6, 2.4); EL(x, '#8fc96a', 29.6, 21, 1.3, 1.3);
      EL(x, '#16121c', 32, 20.4, 3, 2.6, 0, OL); PG(x, '#16121c', [[30.4, 18.4], [30.8, 15.6], [32.4, 18]], OL, 0.3); PG(x, '#16121c', [[33, 18], [34.4, 15.8], [34.6, 19]], OL, 0.3); EL(x, '#ffd23a', 33.4, 20, 0.6, 0.8);
      LN(x, '#d8d8e0', 17, 10.4, 13, 14 + fl, 1.1); LN(x, '#d8d8e0', 17.6, 11.6, 14.4, 17 + fl, 1);
      EL(x, '#8fc96a', 21, 9.6, 4.2, 4.4, 0, OL); PG(x, '#7ab458', [[24, 9.8], [28.6, 12], [24.4, 12.6]], OL, 0.35); EL(x, '#111', 22.8, 8.8, 0.7, 0.8);
      x.beginPath(); x.arc(22.6, 11.4, 1.8, 0.2, 2.9); x.strokeStyle = '#3a1a1a'; x.lineWidth = 0.45; x.stroke(); EL(x, '#f08aa0', 19.4, 10.8, 0.9, 0.7);
      EL(x, '#3a2a52', 20, 6.4, 7.8, 1.8, -0.05, OL); PG(x, '#4a3470', [[14.8, 6], [22, -0.2], [26.8, 0.2 - fl * 0.4], [24.6, 6.2]], OL, 0.5);
      RR(x, '#ffd23a', 17.6, 4, 5, 1.7, 0.4, OL);
    } }
  };
  Object.keys(CRY).forEach(function (k) {
    var c = CRY[k];
    c.fr = [mkHi(c.w, c.h, 3, function (x) { c.draw(x, 0); }), mkHi(c.w, c.h, 3, function (x) { c.draw(x, 1); })];
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
    return mkHi(56, 72, 2, function (x) {
      R(x, '#5a5a62', 26, 40, 4, 32);
      x.fillStyle = '#222'; x.beginPath(); x.moveTo(28, 0); x.lineTo(56, 24); x.lineTo(28, 48); x.lineTo(0, 24); x.closePath(); x.fill();
      x.fillStyle = '#ffd21e'; x.beginPath(); x.moveTo(28, 3); x.lineTo(53, 24); x.lineTo(28, 45); x.lineTo(3, 24); x.closePath(); x.fill();
      var cs = CRY[type], fr0 = cs.fr[0], sc0 = Math.min(22 / cs.w, 34 / cs.h);
      var sil = mk(fr0.width, fr0.height, function (y) { y.drawImage(fr0, 0, 0); y.globalCompositeOperation = 'source-in'; R(y, '#111', 0, 0, fr0.width, fr0.height); });
      x.imageSmoothingEnabled = true; x.drawImage(sil, 28 - cs.w * sc0 / 2, 26 - cs.h * sc0 / 2, cs.w * sc0, cs.h * sc0);
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
  var JEEP = [jeepSprite(-3), jeepSprite(-1), jeepSprite(0), jeepSprite(1), jeepSprite(3)];   // code-drawn fallback, replaced by Leah's art once it loads
  var JEEPSIDE = null, JEEPCERT = null;   // cargo ship profile and certificate view (loaded images)
  (function () {
    function load(src, fn) { var im = new Image(); im.onload = function () { fn(im); }; im.src = src; }
    load('/assets/img/jeep-rear.png?v=3', function (im) { JEEP[2] = im; });                                  // straight: view from behind
    load('/assets/img/jeep-q1.png?v=3', function (im) { JEEP[3] = im; JEEP[1] = flip(im); });                 // short press: 1/4 view (mirrored for left)
    load('/assets/img/jeep-q3.png?v=3', function (im) { JEEP[4] = im; JEEP[0] = flip(im); });                 // long press: 3/4 view (mirrored for left)
    load('/assets/img/jeep-side.png?v=3', function (im) { JEEPSIDE = im; });
    load('/assets/img/jeep-cert.png?v=3', function (im) { JEEPCERT = im; });
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
    { name: 'Costa Rica', sub: 'Pura vida!', len: 2650, start: 36, cp: 14, traffic: 24, curve: 3, hill: 1400, seed: 101, cr: ['sloth', 'frog'], gate: 'BIENVENIDOS A MÉXICO',
      sky: ['#2f8fe0', '#4aa6ea', '#6abcf2', '#8fd0f6', '#b6e2f8', '#dff3fb'], zones: ['crBeach', 'crMount', 'crJungle', 'crBeach', 'crJungle'],
      signs: [['PURA VIDA!', 'SLOW DOWN'], ['OBEY THE SIGNS', "(OR DON'T)"], ['SPEED LIMIT:', 'AS FAST AS LEAH'], ['NEXT CHARGER:', 'TRUST ME'], ['MONOS: PLEASE', 'DO NOT FEED'], ['VOLCANO 20 KM', 'NO LAVA. PROMISE'], ['SLOTH JAM', 'NEXT 3 HOURS'], ['MEXICO', 'THAT WAY ->']] },
    { name: 'Mexico', sub: '¡Vámonos!', len: 2750, start: 38, cp: 14, traffic: 34, curve: 4, hill: 2200, seed: 202, cr: ['dama', 'chupa'], gate: 'WELCOME TO THE USA',
      sky: ['#3a7ad0', '#5a96dc', '#82b2e6', '#f0c88a', '#f8d89a', '#fff0c0'], zones: ['mxJungle', 'mxBeach', 'mxMount', 'mxPyr', 'mxDesert'],
      signs: [['TOPES!', '(BIG BUMPS)'], ['TACOS 2 KM', 'KEEP DRIVING'], ['¡CUIDADO!', 'CHUPACABRA'], ['NO CLIMBING', 'THE PYRAMIDS'], ['¿YA LLEGAMOS?', 'NO.'], ['SIESTA ZONE', 'DRIVE QUIETLY'], ['GOATS: SAFE', 'FOR NOW'], ['USA', 'NEXT EXIT']] },
    { name: 'USA', sub: 'Houston to New York', len: 2900, start: 41, cp: 13, traffic: 46, curve: 4, hill: 2800, seed: 303, cr: ['bigfoot', 'jackalope'], gate: 'BIENVENUE AU CANADA',
      sky: ['#2a6ad0', '#4a8ae0', '#6aa4ea', '#8abcf0', '#aad0f5', '#cae2f9'], zones: ['usHouston', 'usDesert', 'usColorado', 'usForest', 'usNY'],
      signs: [['HOUSTON:', 'WE HAVE A ROAD'], ["EVERYTHING'S", 'BIGGER HERE'], ['DO NOT FEED', 'THE BIGFOOT'], ['ROUTE 66?', 'WRONG GAME'], ['ARE WE THERE', 'YET? NO.'], ['BATTERY LOW?', 'DRIVE FASTER'], ['BIGFOOT PHOTOS', 'ALL BLURRY'], ['NEW YORK', 'BIG APPLE AHEAD']] },
    { name: 'Canada', sub: 'Sorry, eh!', len: 3000, start: 43, cp: 13, traffic: 56, curve: 5, hill: 3200, seed: 404, cr: ['ogopogo', 'wendigo'], gate: 'HALIFAX PORT',
      sky: ['#3a7ad8', '#5a92e0', '#7aaae8', '#9ac0ee', '#bad4f4', '#dae8fa'], zones: ['caRiver', 'caHills', 'caLakes', 'caSnow'],
      signs: [['SORRY!', 'ROAD WORK, EH'], ['MOOSE HAVE', 'RIGHT OF WAY'], ['BIENVENUE', 'WELCOME, EH'], ['MAPLE SYRUP', 'NEXT 400 KM'], ['WENDIGO?', 'NOPE. KEEP GOING'], ['HOCKEY ONLY', 'IN WINTER'], ['POUTINE', 'IS A FOOD GROUP'], ['SHIP TO FRANCE', 'LAST STOP']] },
    { name: 'France', sub: 'Bonjour, Paris!', len: 3100, start: 46, cp: 12, traffic: 66, curve: 6, hill: 3000, seed: 505, cr: ['loup', 'witch'], gate: 'PARIS — ARRIVÉE',
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
  var pos = 0, speed = 0, playerX = 0, steerV = 0, turnDir = 0, turnT = 0, turnLvl = 0, dropT = 0, lift = 0, boostT = 0, crashT = 0, timeLeft = 0, lvlMs = 0, clockMs = 0, cardT = 0, finT = 0, shipT = 0;
  var toast = '', toastT = 0, flash = 0;
  var cpDone = [], cpSegs = [], finishSeg = 0, runNonce = '', finalMs = 0, finalKm = 0, god = false, tick = 0;
  var me = { name: 'Driver', fan: false };
  var ST = null;
  function resetStats() {
    ST = { sight: {}, bumpedBy: {},
      dodged: 0, bumped: 0, batt: 0, boosts: 0, crashes: 0, top: 0, passed: 0, slothsPassed: 0 };
    Object.keys(CRY).forEach(function (k) { ST.sight[k] = 0; ST.bumpedBy[k] = 0; });
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
    // cryptid crossings: 2 per level, each one picked at random from the country's two cryptids, with a warning sign before it
    [0.34, 0.68].forEach(function (f) {
      var es = Math.floor(finishSeg * (f + (r() - 0.5) * 0.08)), sd = r() < 0.5 ? -1 : 1, ty = L.cr[Math.floor(Math.random() * L.cr.length)];
      events.push({ seg: es, side: sd, type: ty, state: 'wait', off: sd * 2, f: 0, bumped: false, passed: false });
      var wkey = 'warn_' + ty;
      if (!SP[wkey]) { SP[wkey] = makeWarn(ty, CRY[ty].warn); SPEC[wkey] = [1300, 0.3, 1]; }
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
    pos = 0; speed = 0; playerX = 0; steerV = 0; turnDir = 0; turnT = 0; turnLvl = 0; dropT = 0; boostT = 0; crashT = 0; lvlMs = 0; toast = ''; flash = 0; lastZone = 0;
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
    // Jeep view: quick press = 1/4 view, held more than 1/2 s = 3/4 view, released = view from behind
    var tdir = keys.left && !keys.right ? -1 : keys.right && !keys.left ? 1 : 0;
    if (tdir !== 0) { if (tdir !== turnDir) { turnDir = tdir; turnT = 0; } turnT += dt; turnLvl = turnT >= 0.5 ? 2 : 1; dropT = 0.1; }
    else { dropT -= dt; if (dropT <= 0) { turnLvl = 0; turnDir = 0; turnT = 0; } else { turnLvl = Math.min(turnLvl, 1); } }

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
    events.forEach(function (ev) {
      var cr = CRY[ev.type];
      if (ev.state === 'wait') {
        var tReach = (ev.seg - idx) * SEG / Math.max(speed, MAXS * 0.35);
        if (ev.seg > idx && tReach <= 2.0 / cr.speed) {
          ev.state = 'cross'; ev.off = ev.side * 2; ST.sight[ev.type]++; SFX.cry();
          toast = cr.nm + ' CROSSING!'; toastT = 1.4;
        }
      } else if (ev.state === 'cross') {
        ev.off -= ev.side * cr.speed * dt; ev.f += dt;
        if (Math.abs(ev.off) > 2.1 && ev.off * ev.side < 0) { ev.state = 'gone'; }
      }
      if (ev.state === 'cross' && !ev.bumped && idx >= ev.seg - 1 && idx <= ev.seg && overlap(playerX, PW, ev.off, 0.32)) {
        ev.bumped = true; ST.bumped++; ST.bumpedBy[ev.type]++; crash(); if (!god) { timeLeft = Math.max(0.5, timeLeft - 3); }
        toast = 'BONK! SORRY, ' + cr.nm + '  -3s'; toastT = 1.6; flash = 0.15;
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
  function drawSprite(img, ww, sc, cx, base, clip, shiftX, alpha, lift) {
    var dw = ww * sc * W / 2, dh = dw * img.height / img.width;
    if (dw < 1) { return; }
    if (lift) { base -= lift * sc * W / 2; }
    var dx = cx - dw / 2 + (shiftX || 0), dy = base - dh, ch = clip != null && clip < base ? Math.max(0, base - clip) : 0;
    if (ch >= dh) { return; }
    if (img.hi) { g.imageSmoothingEnabled = true; }
    if (alpha) { g.globalAlpha = alpha; }
    g.drawImage(img, 0, 0, img.width, img.height - ch * img.height / dh, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh - ch));
    if (alpha) { g.globalAlpha = 1; }
    g.imageSmoothingEnabled = false;
  }
  var SHIP = null;
  function makeShip() {   // container ship, drawn big and smooth, heading right. Deck line is y=40, waterline y=58.
    return mkHi(188, 64, 3, function (x) {
      // hull
      PG(x, GR(x, 38, 62, '#a82c26', '#561212'), [[4, 40], [150, 40], [172, 32], [184, 24], [176, 46], [164, 61], [14, 61], [6, 52]], OL, 0.7);
      PG(x, '#16161e', [[10, 54], [168, 54], [164, 61], [14, 61]], null); LN(x, '#f2f2f2', 6, 43.4, 156, 43.4, 0.9); LN(x, '#c8381e', 8, 50, 168, 50, 0.6);
      for (var rv = 0; rv < 30; rv++) { EL(x, 'rgba(0,0,0,.25)', 12 + rv * 5.3, 46.6, 0.5, 0.5); }
      x.font = 'bold 5px sans-serif'; x.fillStyle = '#f6f6f6'; x.fillText('LEAH LINES', 56, 52.6);
      // stern tower
      RR(x, GR(x, 10, 40, '#ffffff', '#c4c8d4'), 8, 16, 28, 24, 1, OL); RR(x, '#e8ecf6', 6, 11, 32, 7, 1, OL); RR(x, '#c9cedb', 10, 7, 24, 5, 0.8, OL);
      for (var w = 0; w < 6; w++) { RR(x, GR(x, 12, 17, '#7ab8e0', '#2a4a78'), 8 + w * 5, 12.4, 3.6, 3.4, 0.5); }
      for (var d = 0; d < 3; d++) { for (var e = 0; e < 4; e++) { RR(x, '#3a5a88', 11 + e * 6, 20 + d * 6, 3.6, 3.2, 0.5, OL); } }
      LN(x, '#6a6a76', 22, 0.6, 22, 7.4, 0.8); LN(x, '#6a6a76', 18, 3, 26, 3, 0.5);
      RR(x, '#c8381e', 24, 1, 9, 12, 1.2, OL); RR(x, '#16161e', 24, 1, 9, 3, 1); RR(x, '#ffd23a', 24.6, 6, 7.8, 2.2, 0.4);
      // containers: 3 high on the left, 1 high near the bow where the Jeep rides
      var cols = ['#2f7be8', '#e8392f', '#f5c42a', '#2a8a4a', '#ff8a1f', '#8a3ad8', '#e8e8f0', '#1f9aa8'];
      function box(a, b, c) {
        RR(x, GR(x, b, b + 8, lc(c, '#ffffff', 0.2), lc(c, '#000000', 0.2)), a, b, 13.6, 8, 0.5, OL);
        for (var k = 0; k < 8; k++) { LN(x, 'rgba(0,0,0,.22)', a + 1.4 + k * 1.6, b + 1, a + 1.4 + k * 1.6, b + 7, 0.35); }
        RR(x, 'rgba(255,255,255,.35)', a + 0.5, b + 0.4, 12.6, 0.6, 0.3);
      }
      for (var cx0 = 0; cx0 < 5; cx0++) { for (var cy0 = 0; cy0 < 3; cy0++) { box(40 + cx0 * 14, 32 - cy0 * 8.2, cols[(cx0 * 3 + cy0 * 5) % cols.length]); } }
      box(112, 32, cols[3]); box(126, 32, cols[0]); box(140, 32, cols[6]);
      LN(x, '#b8b8c4', 114, 33, 150, 29.6, 0.3); LN(x, '#b8b8c4', 114, 37, 150, 33, 0.3);
      // crane and bow
      LN(x, '#8a8a96', 106, 4, 106, 32, 1.1); LN(x, '#8a8a96', 112, 4, 112, 32, 1.1); LN(x, '#8a8a96', 106, 4, 112, 4, 1); LN(x, '#6a6a76', 108, 4, 140, 12, 0.8); LN(x, '#6a6a76', 140, 12, 140, 18, 0.4);
      LN(x, '#5a5a66', 178, 24, 178, 12, 0.7); PG(x, '#ffd23a', [[178, 12], [186, 14.4], [178, 16.8]], OL, 0.3);
      LN(x, '#d8d8e0', 8, 40, 152, 40, 0.4); for (var pst = 0; pst < 29; pst++) { LN(x, '#d8d8e0', 8 + pst * 5, 40, 8 + pst * 5, 38, 0.3); }
    });
  }
  function drawShip() {
    var t = shipT, i;
    var sky = ['#2a3a7a', '#4a4a90', '#7a5aa0', '#c07aa0', '#f0a0a0', '#ffc8a8'];
    for (i = 0; i < 6; i++) { g.fillStyle = sky[i]; g.fillRect(0, i * 20, W, 21); }
    disc(g, '#ffe0a0', 250, 104, 18);
    g.fillStyle = '#1e3a6a'; g.fillRect(0, 112, W, 68);
    for (i = 0; i < 40; i++) { var wx = (i * 47 + t * (20 + (i % 3) * 10)) % (W + 20) - 10, wy = 116 + (i * 13) % 60; g.fillStyle = i % 2 ? '#3a6aa8' : '#8ab0e0'; g.fillRect(Math.round(wx), wy, 6, 1); }
    var sx = Math.round(40 + t * 34), sy = Math.round(118 + Math.sin(t * 2.4) * 2);
    if (!SHIP) { SHIP = makeShip(); }
    var shx = sx - 92, shy = sy - 40;
    g.imageSmoothingEnabled = true; g.drawImage(SHIP, shx, shy, 188, 64); g.imageSmoothingEnabled = false;
    for (i = 0; i < 3; i++) { disc(g, 'rgba(220,220,230,' + (0.6 - i * 0.18) + ')', shx + 26 - i * 6 - (t * 8) % 6, shy + 2 - i * 6, 3 + i); }
    var jf = JEEPSIDE || JEEP[2], jw = JEEPSIDE ? 46 : jf.width, jh = Math.round(jw * jf.height / jf.width);
    g.imageSmoothingEnabled = true; g.drawImage(jf, shx + 122, shy + 36 - jh + Math.round(Math.sin(t * 5) * 0.5), jw, jh); g.imageSmoothingEnabled = false;
    g.fillStyle = 'rgba(30,58,106,.9)'; g.fillRect(shx - 6, sy + 15, 200, 2);   // water in front of the hull
    for (i = 0; i < 14; i++) { g.fillStyle = 'rgba(210,235,255,.8)'; g.fillRect(Math.round(shx + 4 + i * 14 + (t * 14) % 14), sy + 15 + (i % 2), 5, 1); }
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
          var cr = CRY[ev.type], air = cr.hop ? Math.abs(Math.sin(ev.f * cr.hopRate)) : 0;
          var fi2 = cr.hop ? (air > 0.45 ? 1 : 0) : Math.floor(ev.f * 4) % 2;
          var fr = (ev.side > 0 ? cr.frL : cr.fr)[fi2], lf = (cr.hop || 0) * air + (cr.lift || 0) + (cr.bob ? cr.bob * Math.sin(ev.f * 4) : 0) + (cr.alpha ? 40 * Math.sin(ev.f * 3) : 0);
          drawSprite(fr, cr.ww, pa.sc, pa.sx + pa.sc * ev.off * ROAD_W * W / 2, pa.sy, sg.clip, 0, cr.alpha, lf);
        }
      }
      for (var cc = 0; cc < sg.cars.length; cc++) {
        var car = sg.cars[cc], t = (car.z - sg.z1) / SEG;
        var sc = pa.sc + (sg.p2.sc - pa.sc) * t, cxx = pa.sx + (sg.p2.sx - pa.sx) * t + sc * car.off * ROAD_W * W / 2, cyy = pa.sy + (sg.p2.sy - pa.sy) * t;
        drawSprite(car.spr, 520, sc, cxx, cyy, sg.clip);
      }
    }
    // Leah's jeep: 5 frames by how hard she steers
    var fi = turnLvl === 0 ? 2 : turnDir < 0 ? (turnLvl === 2 ? 0 : 1) : (turnLvl === 2 ? 4 : 3);
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
      ['Loups-garous who asked for a ride', ST.bumpedBy.loup ? String(ST.bumpedBy.loup) : '0 (they took the metro)'],
      ['Jeans borrowed by frogs', '0 (they only own one pair)'],
      ['Witches who needed a lift', '0 (they have a broom, thanks)'],
      ['Ghosts that asked for directions', '1 (to the nearest haunted hotel)'],
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
    var c = document.createElement('canvas'); c.width = 1200; c.height = 1340;
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
      var bx = col ? 640 : 110, by = 520 + row * 29;
      x.textAlign = 'left'; x.font = '18px sans-serif'; x.fillStyle = '#1E3248'; x.fillText(label, bx, by, 300);
      x.textAlign = 'right'; x.font = 'bold 18px sans-serif'; x.fillStyle = '#6798C0'; x.fillText(val, bx + 450, by, 220);
    }
    x.textAlign = 'left'; x.font = '24px ' + pix; x.fillStyle = '#1E3248'; x.fillText('TRIP STATS', 110, 488); x.fillText('CRYPTID REPORT', 640, 488);
    var left = [['Kilometers driven', fmtN(CUM[5]) + ' km'], ['Total time', fmt(ms)], ['Top speed', ST.top + ' mph'], ['Batteries collected', String(ST.batt)],
      ['Boosts used', String(ST.boosts)], ['Crashes', String(ST.crashes)], ['Countries visited', '5 of 5']];
    left.forEach(function (r, k) { stat(0, k, r[0], r[1]); });
    var right = [];
    Object.keys(CRY).forEach(function (k) { if (ST.sight[k] > 0) { right.push([CRY[k].plural + ' spotted', String(ST.sight[k])]); } });
    right.push(['Cryptids dodged', String(ST.dodged)]); right.push(['Cryptids bumped', ST.bumped ? String(ST.bumped) + ' (oops)' : '0 (well done)']);
    right.forEach(function (r, k) { stat(1, k, r[0], r[1]); });
    // goofy stats: 4 at random
    var pool = goofyPool(), chosen = [];
    while (chosen.length < 4 && pool.length) { chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]); }
    x.fillStyle = '#FFF1B8'; x.fillRect(100, 870, CW - 200, 190); x.strokeStyle = '#FDC921'; x.lineWidth = 3; x.strokeRect(100, 870, CW - 200, 190);
    x.textAlign = 'center'; x.font = '24px ' + pix; x.fillStyle = '#1E3248'; x.fillText('ALSO VERY IMPORTANT', CW / 2, 905);
    for (i = 0; i < chosen.length; i++) {
      x.font = '19px sans-serif'; x.fillStyle = '#1E3248'; x.fillText(chosen[i][0] + ': ' + chosen[i][1], CW / 2, 942 + i * 30, CW - 240);
    }
    // Leah in the Jeep (front-left view, leaning out with a thumbs up) and a cryptid who came to say hi
    x.imageSmoothingEnabled = JEEPCERT ? false : true;
    var cj = JEEPCERT || JEEP[2], cw = JEEPCERT ? 370 : cj.width * 2, chh = Math.round(cw * cj.height / cj.width);
    x.drawImage(cj, 90, 1262 - chh, cw, chh);
    x.imageSmoothingEnabled = true;
    var w2 = CRY.bigfoot.fr[0]; x.drawImage(w2, CW - 240, 1090, w2.width * 1.5, w2.height * 1.5);
    x.textAlign = 'center'; x.fillStyle = '#1E3248'; x.font = '24px ' + pix;
    x.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), CW / 2 + 40, 1160);
    x.fillText('livedbyleah.com', CW / 2 + 40, 1196);
    c.toBlob(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'outrun-certificate.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  }

  // Test hook: only when the page is opened with ?debug=1
  if (/[?&]debug=1/.test(location.search)) {
    window.__road = {
      stage: function (t, dz, off, f) { var ev = events[0]; ev.type = t; ev.state = 'cross'; ev.side = off < 0 ? -1 : 1; ev.off = off; ev.f = f || 0; ev.bumped = true; pos = (ev.seg - dz) * SEG - PLAYER_Z; speed = 0; playerX = 0; },
      sight: function (k, v) { ST.sight[k] = v; }, CRY: CRY, CARS: CARS, makeShip: makeShip, JEEP: function () { return JEEP; }, setCry: function (t) { events.forEach(function (ev) { ev.type = t; }); },
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

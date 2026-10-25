// Surf Cleanup: 5 levels.
// Level 1: clean the beach, then build a DIY water gun at the watchtower (drag + rotate puzzle).
// Levels 2-5: surf a scrolling wave, keep the board level, jump or shoot every shark, dodge the UFO.
// One total timer runs from the first step to the last shark; the best times go in the hall of fame.
(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  if (!canvas) { return; }
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var W = canvas.width, H = canvas.height;     // 640 x 360 view
  var BASE_Y = 262;                            // average water line
  var SC = 2;                                  // surfer art scale
  var SCREEN_X = 170;                          // where the surfer stands on screen in surf levels
  var TOTAL_LEVELS = 5;

  var COLORS = {
    G: '#4E9A5B', D: '#2F6B3A', C: '#B8C2CC', K: '#7A8691', W: '#FFFDF7', R: '#E8556D', Y: '#FDC921',
    S: '#5B6B7A', s: '#A9BAC9', E: '#1E3248', B: '#99D6EA'
  };

  var BOTTLE = ['..G..', '..G..', '.GGG.', '.GDG.', '.GGG.', '.GDG.', '.GGG.'];
  var CAN = ['.CCCC.', 'CWWWWC', 'CCCCCC', 'CKKKKC', 'CCCCCC', '.CCCC.'];
  var HEART = ['.RR.RR.', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'];
  // shark swims toward the left, so the head is on the left
  var SHARK = [
    '.........SS...........',
    '........SSS...........',
    '.......SSSS.........SS',
    '......SSSSSS.......SSS',
    '.SSSSSSSSSSSSSSSSSSSS.',
    'SSSESSSSSSSSSSSSSSSS..',
    'SWSWSsssssssSSSSS.....',
    '.SSSsssssssSSS........',
    '..SS..................'
  ];

  var SURFER = new Image();
  SURFER.src = '/assets/img/surfer.png';

  var el = {
    start: document.getElementById('gameStart'),
    over: document.getElementById('gameOver'),
    win: document.getElementById('gameWin'),
    time: document.getElementById('hudTime'),
    level: document.getElementById('hudLevel'),
    goal: document.getElementById('hudGoal'),
    name: document.getElementById('playerName'),
    mute: document.getElementById('muteBtn'),
    fire: document.getElementById('fireBtn'),
    touch: document.getElementById('touch')
  };

  var keys = { left: false, right: false, jump: false, fire: false };
  var jumpPressed = false;         // edge-triggered (a second press in the air = double jump)
  var mode = 'start';              // start | beach | puzzle | surf | over | win
  var t = 0;                       // frame counter (animation)
  var clockMs = 0, clockRunning = false;
  var lives = 3, level = 1;
  var runNonce = '';
  var lastTime = 0;

  function sprite(map, x, y, scale, flip) {
    var wd = 0, r, c;
    for (r = 0; r < map.length; r++) { wd = Math.max(wd, map[r].length); }
    for (r = 0; r < map.length; r++) {
      for (c = 0; c < map[r].length; c++) {
        var ch = map[r].charAt(c);
        if (ch === '.') { continue; }
        ctx.fillStyle = COLORS[ch];
        var cx = flip ? (wd - 1 - c) : c;
        ctx.fillRect(Math.round(x + cx * scale), Math.round(y + r * scale), scale, scale);
      }
    }
  }

  function fmt(ms) {
    var s = ms / 1000, m = Math.floor(s / 60);
    var rest = s - m * 60;
    return m + ':' + (rest < 10 ? '0' : '') + rest.toFixed(1);
  }

  // ------------------------------------------------------------------ sound (8-bit, made with the Web Audio API)
  var AC = null, master = null, muted = false, musicMode = 'none', musicTimer = null, step16 = 0, nextNote = 0;
  try { muted = window.localStorage.getItem('lbl_muted') === '1'; } catch (e) { /* storage may be blocked */ }

  function audio() {
    if (!AC) {
      try {
        var Ctor = window.AudioContext || window.webkitAudioContext;
        AC = new Ctor();
        master = AC.createGain();
        master.gain.value = muted ? 0 : 0.22;
        master.connect(AC.destination);
      } catch (e) { AC = null; }
    }
    if (AC && AC.state === 'suspended') { AC.resume(); }
    return AC;
  }
  function tone(freq, dur, type, vol, slideTo, when) {
    if (!audio()) { return; }
    var t0 = when || AC.currentTime;
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) { o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur); }
    g.gain.setValueAtTime(vol || 0.3, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(dur, vol) {
    if (!audio()) { return; }
    var n = Math.floor(AC.sampleRate * dur), buf = AC.createBuffer(1, n, AC.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) { d[i] = (Math.random() * 2 - 1) * (1 - i / n); }
    var s = AC.createBufferSource(), g = AC.createGain();
    s.buffer = buf; g.gain.value = vol || 0.3;
    s.connect(g); g.connect(master); s.start();
  }
  var sfx = {
    collect: function () { tone(660, 0.07, 'square', 0.25); tone(990, 0.1, 'square', 0.25, null, AC && AC.currentTime + 0.07); },
    jump: function () { tone(280, 0.18, 'square', 0.25, 620); },
    trick: function () { tone(520, 0.3, 'triangle', 0.3, 1200); },
    shoot: function () { noise(0.09, 0.22); tone(900, 0.08, 'square', 0.1, 400); },
    hit: function () { tone(300, 0.2, 'sawtooth', 0.3, 80); noise(0.12, 0.25); },
    bite: function () { tone(220, 0.35, 'sawtooth', 0.35, 60); noise(0.2, 0.3); },
    ufo: function () { tone(180, 0.5, 'sawtooth', 0.12, 90); },
    snap: function () { tone(800, 0.06, 'square', 0.25); tone(1200, 0.08, 'square', 0.25, null, AC && AC.currentTime + 0.05); },
    up: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.14, 'square', 0.25, null, AC && AC.currentTime + i * 0.1); }); },
    win: function () { [523, 659, 784, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.18, 'square', 0.25, null, AC && AC.currentTime + i * 0.13); }); },
    lose: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.25, 'triangle', 0.35, null, AC && AC.currentTime + i * 0.2); }); }
  };
  function play(name) { if (!muted && sfx[name]) { try { sfx[name](); } catch (e) { /* ignore audio errors */ } } }

  // little looping tunes (notes are semitones above A3; null = rest)
  var TUNES = {
    beach: { bpm: 104, lead: [12, null, 16, null, 19, null, 16, null, 14, null, 17, null, 21, null, 17, null], bass: [0, null, null, null, 0, null, null, null, 5, null, null, null, 7, null, null, null] },
    surf: { bpm: 150, lead: [12, 15, 19, 15, 12, 15, 20, 15, 10, 14, 17, 14, 10, 14, 19, 17], bass: [0, null, 0, null, 0, null, 0, null, -2, null, -2, null, 3, null, 3, null] }
  };
  function hz(semi) { return 220 * Math.pow(2, semi / 12); }
  function scheduler() {
    if (muted || !AC || musicMode === 'none') { return; }
    var tune = TUNES[musicMode], spb = 60 / tune.bpm / 2;
    if (nextNote < AC.currentTime) { nextNote = AC.currentTime + 0.05; }
    while (nextNote < AC.currentTime + 0.3) {
      var i = step16 % 16;
      if (tune.lead[i] !== null) { tone(hz(tune.lead[i]), spb * 0.9, 'square', 0.05, null, nextNote); }
      if (tune.bass[i] !== null) { tone(hz(tune.bass[i]) / 2, spb * 1.6, 'triangle', 0.12, null, nextNote); }
      step16++;
      nextNote += spb;
    }
  }
  function setMusic(m) {
    musicMode = m;
    step16 = 0; nextNote = 0;
    if (!musicTimer) { musicTimer = setInterval(scheduler, 100); }
  }
  function applyMute() {
    el.mute.textContent = muted ? 'Sound off' : 'Sound on';
    el.mute.setAttribute('aria-pressed', muted ? 'true' : 'false');
    if (master) { master.gain.value = muted ? 0 : 0.22; }
  }
  el.mute.addEventListener('click', function () {
    muted = !muted;
    try { window.localStorage.setItem('lbl_muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    audio();
    applyMute();
  });
  applyMute();

  // ------------------------------------------------------------------ shared drawing
  function drawSky() {
    var bands = ['#9BDBF0', '#A9E0F3', '#B8E6F6', '#C8ECF8', '#D8F2FA'];
    ctx.fillStyle = '#D8F2FA';
    ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < bands.length; i++) { ctx.fillStyle = bands[i]; ctx.fillRect(0, i * 48, W, 48); }
    ctx.fillStyle = '#FDC921'; ctx.fillRect(500, 36, 48, 48);
    ctx.fillStyle = '#FDD85D';
    ctx.fillRect(508, 28, 32, 8); ctx.fillRect(508, 84, 32, 8); ctx.fillRect(492, 44, 8, 32); ctx.fillRect(548, 44, 8, 32);
    ctx.fillStyle = '#FFFDF7';
    for (var c = 0; c < 6; c++) {
      var cxp = ((c * 340 - cam * 0.25) % (W + 200) + (W + 200)) % (W + 200) - 100;
      var cyp = 40 + (c % 3) * 34;
      ctx.fillRect(cxp, cyp, 60, 12); ctx.fillRect(cxp + 12, cyp - 10, 36, 10);
    }
    ctx.fillStyle = '#6798C0'; ctx.fillRect(0, 205, W, 8);
  }

  function drawWaterWith(fn) {
    for (var sx = 0; sx < W; sx += 4) {
      var top = Math.round(fn(sx + cam));
      ctx.fillStyle = '#99D6EA'; ctx.fillRect(sx, top - 4, 4, 4);
      ctx.fillStyle = '#6EB3D6'; ctx.fillRect(sx, top, 4, 22);
      ctx.fillStyle = '#6798C0'; ctx.fillRect(sx, top + 22, 4, H - top - 22);
    }
  }

  function drawHearts() {
    for (var i = 0; i < 3; i++) {
      ctx.globalAlpha = i < lives ? 1 : 0.25;
      sprite(HEART, W - 30 - i * 26, 10, 3);
    }
    ctx.globalAlpha = 1;
  }

  function bigText(msg, y, size, color) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '800 ' + size + 'px "Shantell Sans", "Comic Sans MS", cursive';
    ctx.lineWidth = 6; ctx.strokeStyle = '#1E3248'; ctx.lineJoin = 'round';
    ctx.strokeText(msg, W / 2, y);
    ctx.fillStyle = color || '#FFFDF7'; ctx.fillText(msg, W / 2, y);
    ctx.restore();
  }

  // ------------------------------------------------------------------ LEVEL 1: the beach
  var cam = 0;                       // camera x (beach) / world x offset (surf)
  var WORLD = 3000, TOWER_X = 2860;
  var player, items, trashGot, trashTotal, towerHint = 0;

  function beachSurface(x) {
    return BASE_Y + Math.sin(x * 0.018 + t * 0.045) * 9 + Math.sin(x * 0.007 - t * 0.02) * 12;
  }

  function beachReset() {
    player = { x: 120, y: BASE_Y - 40, vx: 0, vy: 0, grounded: true, face: 1, land: 0 };
    cam = 0; trashGot = 0; items = []; towerHint = 0;
    var heights = [22, 48, 74], n = 8;
    for (var i = 0; i < n; i++) {
      items.push({ kind: i % 2 === 0 ? 'bottle' : 'can', x: 380 + i * ((TOWER_X - 700) / (n - 1)), h: heights[(i * 7 + 1) % 3], got: false });
    }
    trashTotal = n;
  }

  function beachStep(k) {
    var accel = 0.5, maxV = 4.4;
    if (keys.left) { player.vx -= accel * k; }
    if (keys.right) { player.vx += accel * k; }
    if (!keys.left && !keys.right) { player.vx *= Math.pow(0.9, k); }
    player.vx = Math.max(-maxV, Math.min(maxV, player.vx));
    player.x = Math.max(20, Math.min(WORLD - 40, player.x + player.vx * k));
    if (player.vx > 0.4) { player.face = 1; } else if (player.vx < -0.4) { player.face = -1; }
    if (player.land > 0) { player.land -= k; }

    var surf = beachSurface(player.x) - 6;
    if ((keys.jump || jumpPressed) && player.grounded) {
      player.vy = -8.2; player.grounded = false; play('jump');
    }
    jumpPressed = false;
    if (!player.grounded) {
      player.vy += 0.42 * k; player.y += player.vy * k;
      if (player.y >= surf && player.vy > 0) { player.y = surf; player.vy = 0; player.grounded = true; player.land = 8; }
    } else { player.y = surf; }

    cam = Math.max(0, Math.min(WORLD - W, player.x - 220));

    var cx = player.x + 19, cy = player.y - 40;
    items.forEach(function (it) {
      if (it.got) { return; }
      var dx = cx - (it.x + 10), dy = cy - (BASE_Y - it.h);
      if (dx * dx + dy * dy < 36 * 36) { it.got = true; trashGot++; play('collect'); updateHud(); }
    });

    if (trashGot === trashTotal) {
      if (player.x > TOWER_X - 40) { startPuzzle(); }
    } else if (player.x > TOWER_X - 180) {
      towerHint = 90;      // "collect all the trash first"
      player.vx = Math.min(player.vx, 0); player.x = Math.min(player.x, TOWER_X - 180);
    }
    if (towerHint > 0) { towerHint -= k; }
  }

  function drawTower() {
    var x = TOWER_X - cam, base = BASE_Y - 8;
    if (x < -120 || x > W + 120) { return; }
    ctx.fillStyle = '#B07A45';
    ctx.fillRect(x - 28, base - 70, 6, 78); ctx.fillRect(x + 22, base - 70, 6, 78);      // legs
    ctx.fillRect(x - 30, base - 26, 60, 5);                                              // cross beam
    ctx.fillStyle = '#FFFDF7'; ctx.fillRect(x - 38, base - 104, 76, 34);                  // cabin
    ctx.fillStyle = '#E8556D'; ctx.fillRect(x - 38, base - 104, 76, 8);
    ctx.fillStyle = '#99D6EA'; ctx.fillRect(x - 28, base - 92, 56, 14);                   // window
    ctx.fillStyle = '#E8556D'; ctx.fillRect(x - 44, base - 112, 88, 8);                   // roof
    ctx.fillStyle = '#FDC921'; ctx.fillRect(x + 10, base - 130, 4, 20); ctx.fillRect(x + 14, base - 130, 16, 10);
    ctx.fillStyle = '#B07A45'; ctx.fillRect(x - 6, base - 20, 12, 28);                    // ladder stub
  }

  function drawPlayerBeach() {
    var sx = player.x - cam;
    drawSurfer(sx + 19, player.y + 12 + (player.grounded ? Math.sin(t * 0.18) * 1.5 : 0),
      player.grounded ? player.vx * 0.012 : player.vy * 0.012 * player.face, player.face,
      player.grounded ? 1 : 1 + Math.min(0.12, Math.abs(player.vy) * 0.015), player.land > 0 ? 1 - 0.1 * (player.land / 8) : 1);
  }

  // surfer art, drawn from the board's bottom centre; mirrored when facing left
  function drawSurfer(x, y, rot, face, stretch, squash, spin) {
    if (!(SURFER.complete && SURFER.naturalWidth)) { return; }
    var w = SURFER.naturalWidth * SC, h = SURFER.naturalHeight * SC;
    var sy = stretch * squash, sxs = Math.min(1.05, 2 - sy);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(rot + (spin || 0));
    ctx.scale(face * sxs, sy);
    ctx.drawImage(SURFER, -w / 2, -h, w, h);
    ctx.restore();
  }

  function beachDraw() {
    drawSky();
    drawWaterWith(beachSurface);
    drawTower();
    items.forEach(function (it) {
      if (it.got) { return; }
      var sx = it.x - cam;
      if (sx < -30 || sx > W + 30) { return; }
      var bob = Math.round(Math.sin(t * 0.08 + it.x) * 3), y = BASE_Y - it.h + bob;
      if (it.kind === 'bottle') { sprite(BOTTLE, sx, y - 12, 3); } else { sprite(CAN, sx, y - 9, 3); }
    });
    drawPlayerBeach();
    if (trashGot === trashTotal) {
      bigText('Go to the watchtower!', 60, 24, '#FDC921');
    } else if (towerHint > 0) {
      bigText('Pick up all the trash first!', 60, 22, '#FDC921');
    }
  }

  // ------------------------------------------------------------------ puzzle: build the DIY water gun
  // Each piece is drawn around its own centre; rot is in quarter turns. A piece locks when it is close to its
  // slot and rotated the right way. Pieces are drawn from trash-looking parts.
  var GUN = { x: 190, y: 120 };
  var PIECES_DEF = [
    { id: 'barrel', w: 150, h: 22, sx: 75, sy: 11, color: '#FDC921' },
    { id: 'nozzle', w: 34, h: 22, sx: 167, sy: 11, color: '#E8556D' },
    { id: 'tank', w: 92, h: 52, sx: 52, sy: -28, color: '#4E9A5B' },
    { id: 'grip', w: 34, h: 62, sx: 32, sy: 52, color: '#7A8691' },
    { id: 'pump', w: 40, h: 46, sx: 112, sy: 45, color: '#B8C2CC' }
  ];
  var pieces = [], grabbed = null, grabDx = 0, grabDy = 0, grabMoved = 0, lastTouched = null, puzzleDone = 0;

  function startPuzzle() {
    mode = 'puzzle'; puzzleDone = 0; grabbed = null; lastTouched = null;
    setMusic('beach');
    var spots = [[90, 300], [250, 310], [420, 300], [560, 230], [540, 120]];
    pieces = PIECES_DEF.map(function (d, i) {
      return {
        d: d, x: spots[i][0], y: spots[i][1], rot: 1 + Math.floor(Math.random() * 3), locked: false,
        tx: GUN.x + d.sx, ty: GUN.y + d.sy
      };
    });
    updateHud();
  }

  // draw one piece (local coordinates around its centre)
  function drawPiece(p, ghost) {
    var d = p.d, w = d.w, h = d.h;
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate(p.rot * Math.PI / 2);
    var main = ghost ? 'rgba(30,50,72,.10)' : d.color, edge = ghost ? 'rgba(30,50,72,.35)' : '#1E3248';
    function box(x, y, bw, bh, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), bw, bh); }
    function rim(x, y, bw, bh) { ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.strokeRect(Math.round(x) + 1, Math.round(y) + 1, bw - 2, bh - 2); }
    if (d.id === 'barrel') {
      box(-w / 2, -h / 2, w, h, main);
      if (!ghost) { box(w / 2 - 22, -h / 2 - 3, 10, h + 6, '#FDD85D'); box(-w / 2 + 14, -h / 2, 6, h, '#E0A800'); }
      rim(-w / 2, -h / 2, w, h);
    } else if (d.id === 'nozzle') {
      ctx.fillStyle = main; ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, -5); ctx.lineTo(w / 2, 5); ctx.lineTo(-w / 2, h / 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = 2; ctx.stroke();
    } else if (d.id === 'tank') {
      box(-w / 2, -h / 2 + 8, w, h - 8, main);
      if (!ghost) { box(-w / 2 + 6, -h / 2 + 14, w - 12, 6, '#2F6B3A'); box(-w / 2 + 6, -h / 2 + 28, w - 12, 4, '#2F6B3A'); }
      box(-w / 2 + 8, -h / 2, 18, 8, ghost ? main : '#FFFDF7');       // cap on the top-left
      rim(-w / 2, -h / 2 + 8, w, h - 8); rim(-w / 2 + 8, -h / 2, 18, 8);
    } else if (d.id === 'grip') {
      box(-w / 2, -h / 2, w, h - 18, main);
      box(-w / 2, h / 2 - 18, w + 14, 18, main);                       // foot of the handle sticks out to the right
      if (!ghost) { box(-w / 2 + 6, -h / 2 + 6, 8, 20, '#5B6B7A'); }
      rim(-w / 2, -h / 2, w, h - 18); rim(-w / 2, h / 2 - 18, w + 14, 18);
    } else if (d.id === 'pump') {
      box(-w / 2, -h / 2, w, h - 10, main);
      if (!ghost) { box(-w / 2 + 6, -h / 2 + 8, w - 12, 5, '#7A8691'); }
      box(-w / 2 - 6, h / 2 - 10, w + 12, 10, ghost ? main : '#E8556D');  // wide handle at the bottom
      rim(-w / 2, -h / 2, w, h - 10); rim(-w / 2 - 6, h / 2 - 10, w + 12, 10);
    }
    ctx.restore();
  }

  function pieceAt(px, py) {
    for (var i = pieces.length - 1; i >= 0; i--) {
      var p = pieces[i];
      if (p.locked) { continue; }
      var a = -p.rot * Math.PI / 2, dx = px - p.x, dy = py - p.y;
      var lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(lx) <= p.d.w / 2 + 10 && Math.abs(ly) <= p.d.h / 2 + 10) { return i; }
    }
    return -1;
  }

  function canvasXY(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }

  function trySnap(p) {
    var ok = (p.rot % 4 === 0);
    var near = Math.abs(p.x - p.tx) < 20 && Math.abs(p.y - p.ty) < 20;
    if (ok && near) {
      p.x = p.tx; p.y = p.ty; p.rot = 0; p.locked = true; puzzleDone++; play('snap');
      updateHud();
      if (puzzleDone === pieces.length) { puzzleWin = 90; play('up'); }
    }
  }
  var puzzleWin = 0;

  canvas.addEventListener('pointerdown', function (e) {
    if (mode !== 'puzzle' || puzzleWin > 0) { return; }
    audio();
    var pt = canvasXY(e), i = pieceAt(pt.x, pt.y);
    if (i < 0) { return; }
    var p = pieces.splice(i, 1)[0];
    pieces.push(p);                     // bring to front
    grabbed = p; lastTouched = p; grabMoved = 0;
    grabDx = p.x - pt.x; grabDy = p.y - pt.y;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!grabbed) { return; }
    var pt = canvasXY(e), nx = pt.x + grabDx, ny = pt.y + grabDy;
    grabMoved += Math.abs(nx - grabbed.x) + Math.abs(ny - grabbed.y);
    grabbed.x = Math.max(10, Math.min(W - 10, nx)); grabbed.y = Math.max(40, Math.min(H - 10, ny));
  });
  function release() {
    if (!grabbed) { return; }
    var p = grabbed; grabbed = null;
    if (grabMoved < 6) { p.rot = (p.rot + 1) % 4; play('collect'); }     // a click or tap turns the piece
    trySnap(p);
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', function (e) {
    if (mode !== 'puzzle') { return; }
    e.preventDefault();
    var pt = canvasXY(e), i = pieceAt(pt.x, pt.y);
    if (i >= 0) { pieces[i].rot = (pieces[i].rot + 1) % 4; trySnap(pieces[i]); }
  });

  function puzzleStep(k) {
    if (puzzleWin > 0) {
      puzzleWin -= k;
      if (puzzleWin <= 0) { startLevel(2); }
    }
  }

  function puzzleDraw() {
    ctx.fillStyle = '#E9D2A4'; ctx.fillRect(0, 0, W, H);                       // wooden floor
    ctx.fillStyle = '#D9BC84';
    for (var y = 40; y < H; y += 32) { ctx.fillRect(0, y, W, 3); }
    ctx.fillStyle = '#1E3248'; ctx.fillRect(0, 0, W, 40);
    ctx.fillStyle = '#FDC921'; ctx.textAlign = 'right';
    ctx.font = '700 16px "Shantell Sans", "Comic Sans MS", cursive';
    ctx.fillText('Watchtower workshop: build the water gun', W - 12, 26);
    ctx.textAlign = 'left';
    // blueprint area
    ctx.fillStyle = 'rgba(255,253,247,.65)'; ctx.fillRect(GUN.x - 40, GUN.y - 70, 290, 230);
    ctx.strokeStyle = '#6798C0'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeRect(GUN.x - 40, GUN.y - 70, 290, 230); ctx.setLineDash([]);
    pieces.forEach(function (p) {
      if (!p.locked) { drawPiece({ d: p.d, x: p.tx, y: p.ty, rot: 0 }, true); }   // outline of where it goes
    });
    pieces.forEach(function (p) { if (p.locked) { drawPiece(p, false); } });
    pieces.forEach(function (p) {
      if (!p.locked) {
        if (p === grabbed) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4; }
        drawPiece(p, false);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      }
    });
    ctx.fillStyle = '#1E3248'; ctx.font = '600 14px "Shantell Sans", "Comic Sans MS", cursive';
    ctx.fillText('Drag a piece onto its outline. Click or tap it (or press R) to turn it.', 12, H - 10);
    if (puzzleWin > 0) {
      for (var i = 0; i < 14; i++) {      // squirt of water from the nozzle
        var f = (90 - puzzleWin) * 5 - i * 16;
        if (f > 0) { ctx.fillStyle = '#99D6EA'; ctx.fillRect(GUN.x + 185 + f, GUN.y + 8 + f * f * 0.002, 6, 6); }
      }
      bigText('Water gun ready!', 230, 30, '#FDC921');
    }
  }

  // ------------------------------------------------------------------ LEVELS 2-5: surf
  var LEVELS = {
    2: { name: 'Easy waves', sharks: 6, speed: 2.2, swim: 0.5, gap: 3.1, amp: 9, waveGain: 5, gust: 0.7, instab: 0.5, ufo: false },
    3: { name: 'Choppy', sharks: 7, speed: 2.6, swim: 0.9, gap: 2.7, amp: 13, waveGain: 8, gust: 1.5, instab: 1.0, ufo: true },
    4: { name: 'Rough water', sharks: 8, speed: 3.0, swim: 1.2, gap: 2.3, amp: 17, waveGain: 11, gust: 2.3, instab: 1.5, ufo: true },
    5: { name: 'Monster surf', sharks: 10, speed: 3.4, swim: 1.6, gap: 1.9, amp: 21, waveGain: 14, gust: 3.0, instab: 2.1, ufo: true }
  };
  var S = null;                      // surf-level state
  var surfCfg = null;

  function waveY(wx) {
    var a = surfCfg ? surfCfg.amp : 10;
    return BASE_Y + a * (0.6 * Math.sin(wx * 0.016) + 0.4 * Math.sin(wx * 0.0067 + 1.3));
  }
  function waveSlope(wx) { return (waveY(wx + 4) - waveY(wx - 4)) / 8; }

  function startLevel(n) {
    level = n; mode = 'surf'; surfCfg = LEVELS[n]; jumpPressed = false;
    setMusic('surf');
    cam = 0;
    S = {
      wx: 0, time: 0, intro: 2.0, spawnAt: 2.7,
      h: 0, vh: 0, jumps: 0, trick: 0, gunCd: 0,
      ang: 0, angV: 0, bad: 0,
      sharks: [], bullets: [], splash: [], spawned: 0, resolved: 0,
      ufo: null, ufoDone: !surfCfg.ufo, ufoAt: 2 + Math.floor(Math.random() * Math.max(1, surfCfg.sharks - 4)),
      abduct: 0, msg: '', msgT: 0, clear: 0, phase: Math.random() * 6
    };
    updateHud();
  }

  function loseLife(why) {
    if (window.__lbl && window.__lbl.god) { S.ang = 0; S.angV = 0; S.abduct = 0; return; }
    lives--; play(why === 'ufo' ? 'ufo' : 'bite');
    if (lives <= 0) { gameOver(); return; }
    startLevel(level);
    S.msg = why === 'bite' ? 'Chomp! ' + lives + (lives === 1 ? ' life left' : ' lives left')
      : why === 'ufo' ? 'Abducted! ' + lives + (lives === 1 ? ' life left' : ' lives left')
      : 'Wipeout! ' + lives + (lives === 1 ? ' life left' : ' lives left');
    S.msgT = 2.2; S.intro = 0.6;
  }

  function surfStep(k, dt) {
    var C = surfCfg;
    S.time += dt; S.wx += C.speed * k; cam = S.wx - SCREEN_X;
    if (S.intro > 0) { S.intro -= dt; }
    if (S.msgT > 0) { S.msgT -= dt; }
    if (S.gunCd > 0) { S.gunCd -= dt; }
    if (S.trick > 0) { S.trick -= dt; }

    // ---- balance: the wave pushes the board, left/right push back
    var push = C.waveGain * waveSlope(S.wx)
      + C.gust * Math.sin(S.time * 0.9 + S.phase) * Math.sin(S.time * 2.1 + S.phase * 2)
      + C.instab * S.ang;
    var input = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    var accel = push + input * 12 - 2.4 * S.angV;
    S.angV += accel * dt; S.ang += S.angV * dt;
    var bad = Math.abs(S.ang) > 0.8;
    S.bad = bad ? S.bad + dt : Math.max(0, S.bad - dt * 2);
    if (Math.abs(S.ang) > 1.15 || S.bad > 0.6) { loseLife('wipeout'); return; }

    // ---- jumping (press up again in the air for the double jump + aerial trick)
    if (jumpPressed) {
      jumpPressed = false;
      if (S.h <= 0.5 && S.jumps === 0) { S.vh = 8.8; S.jumps = 1; play('jump'); }
      else if (S.jumps === 1) { S.vh = 9.4; S.jumps = 2; S.trick = 0.85; play('trick'); }
    }
    if (S.h > 0 || S.vh > 0) {
      S.vh -= 0.42 * k; S.h += S.vh * k;
      if (S.h <= 0) { S.h = 0; S.vh = 0; S.jumps = 0; S.trick = 0; }
    }
    var inTrick = S.trick > 0;

    // ---- water gun with a short cooldown, auto-aimed within a narrow cone
    if (keys.fire && S.gunCd <= 0 && S.intro <= 0.4) {
      S.gunCd = 0.32; play('shoot');
      var my = waveY(S.wx) - S.h - 62, mx = SCREEN_X + 52, best = null, ang = 0.08;
      S.sharks.forEach(function (sh) { if (sh.alive && sh.x > mx + 40 && (!best || sh.x < best.x)) { best = { x: sh.x, y: waveY(S.wx + sh.x - SCREEN_X) - 8 }; } });
      if (S.ufo && S.ufo.alive && S.ufo.x > mx) { if (!best || Math.abs(S.ufo.y - my) < Math.abs(best.y - my)) { best = { x: S.ufo.x, y: S.ufo.y }; } }
      if (best) { ang = Math.max(-0.12, Math.min(0.12, Math.atan2(best.y - my, best.x - mx))); }
      S.bullets.push({ x: mx, y: my, vx: Math.cos(ang) * 10, vy: Math.sin(ang) * 10, life: 80 });
    }
    S.bullets.forEach(function (b) { b.x += b.vx * k; b.y += b.vy * k; b.life -= k; });
    S.bullets = S.bullets.filter(function (b) { return b.life > 0 && b.x < W + 20; });

    // ---- sharks
    var gapT = C.gap;
    while (S.spawned < C.sharks && S.time > S.spawnAt + S.spawned * gapT + (S.spawned % 3) * 0.25) {
      S.sharks.push({ x: W + 40, alive: true, passed: false, dying: 0, bob: Math.random() * 6 });
      S.spawned++;
    }
    var playerLow = S.h < 30 && !inTrick, dead = false;
    S.sharks.forEach(function (sh) {
      if (dead) { return; }
      if (sh.dying > 0) { sh.dying -= dt; return; }
      if (!sh.alive) { return; }
      sh.x -= (C.speed + C.swim) * k;
      var dx = Math.abs(sh.x - SCREEN_X);
      // shot?
      for (var i = 0; i < S.bullets.length; i++) {
        var b = S.bullets[i], sy = waveY(S.wx + sh.x - SCREEN_X);
        if (Math.abs(b.x - sh.x) < 36 && b.y > sy - 52 && b.y < sy + 22) {
          sh.alive = false; sh.dying = 0.5; S.bullets.splice(i, 1); S.resolved++; play('hit'); S.splash.push({ x: sh.x, y: sy, t: 0.5 });
          updateHud(); return;
        }
      }
      if (dx < 40 && playerLow && !sh.biting) { sh.biting = true; dead = true; loseLife('bite'); return; }
      if (sh.x < SCREEN_X - 64 && !sh.passed) { sh.passed = true; S.resolved++; updateHud(); }
    });
    if (dead) { return; }
    S.sharks = S.sharks.filter(function (sh) { return sh.x > -80 && (sh.alive || sh.dying > 0); });
    S.splash.forEach(function (sp) { sp.t -= dt; });
    S.splash = S.splash.filter(function (sp) { return sp.t > 0; });

    // ---- UFO (levels 3-5): it sneaks up, locks on and beams. A trick makes you slippery; three water hits bring it down.
    if (!S.ufoDone && !S.ufo && S.spawned > S.ufoAt) {
      S.ufo = { x: W + 60, y: 56, alive: true, hp: 3, state: 'arrive', st: 0, cycles: 0, flash: 0 };
      play('ufo');
    }
    var u = S.ufo;
    if (u) {
      u.st += dt; if (u.flash > 0) { u.flash -= dt; }
      if (u.alive) {
        if (u.state === 'arrive') { u.x += (430 - u.x) * 0.04 * k; if (u.st > 1.6) { u.state = 'chase'; u.st = 0; } }
        else if (u.state === 'chase') { u.x += (SCREEN_X - u.x) * 0.06 * k; if (u.st > 1.4) { u.state = 'charge'; u.st = 0; } }
        else if (u.state === 'charge') { u.x += (SCREEN_X - u.x) * 0.1 * k; if (u.st > 1.0) { u.state = 'beam'; u.st = 0; play('ufo'); } }
        else if (u.state === 'beam') {
          u.x += (SCREEN_X - u.x) * 0.1 * k;
          if (Math.abs(u.x - SCREEN_X) < 40 && !inTrick) { S.abduct += dt; } else { S.abduct = Math.max(0, S.abduct - dt * 1.5); }
          if (S.abduct > 1.1) { loseLife('ufo'); return; }
          if (u.st > 1.8) { u.state = 'retreat'; u.st = 0; u.cycles++; S.abduct = 0; }
        } else if (u.state === 'retreat') {
          u.x += (460 - u.x) * 0.05 * k;
          if (u.st > 1.6) { if (u.cycles >= 3) { u.state = 'leave'; u.st = 0; } else { u.state = 'chase'; u.st = 0; } }
        } else if (u.state === 'leave') { u.x += 4 * k; u.y -= 1.2 * k; if (u.x > W + 80) { S.ufoDone = true; S.ufo = null; u = null; } }
        if (u) {
          for (var j = 0; j < S.bullets.length; j++) {
            var bb = S.bullets[j];
            if (Math.abs(bb.x - u.x) < 34 && Math.abs(bb.y - u.y) < 26) {
              S.bullets.splice(j, 1); u.hp--; u.flash = 0.2; play('hit');
              if (u.hp <= 0) { u.alive = false; u.st = 0; S.splash.push({ x: u.x, y: u.y, t: 0.6 }); }
              break;
            }
          }
        }
      } else if (u.st > 0.8) { S.ufoDone = true; S.ufo = null; }
    }

    // ---- level clear
    if (S.spawned >= C.sharks && S.resolved >= C.sharks && S.sharks.length === 0 && S.ufoDone && S.clear === 0) {
      S.clear = 1.8; play('up');
    }
    if (S.clear > 0) {
      S.clear -= dt;
      if (S.clear <= 0) {
        if (level >= TOTAL_LEVELS) { gameWon(); } else { startLevel(level + 1); }
      }
    }
  }

  function surfDraw() {
    drawSky();
    drawWaterWith(waveY);
    var sy = waveY(S.wx);
    // sharks
    S.sharks.forEach(function (sh) {
      var y = waveY(S.wx + sh.x - SCREEN_X) - 12 + Math.sin(t * 0.1 + sh.bob) * 2;
      if (sh.dying > 0) { ctx.globalAlpha = Math.max(0, sh.dying * 2); y += (0.5 - sh.dying) * 30; }
      sprite(SHARK, sh.x - 33, y, 3);
      ctx.globalAlpha = 1;
    });
    S.splash.forEach(function (sp) {
      for (var i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#FFFDF7' : '#99D6EA'; ctx.fillRect(sp.x - 18 + i * 7, sp.y - 8 - (0.6 - sp.t) * 60 * (1 + (i % 3) * 0.3), 5, 5); }
    });
    // UFO and its beam
    var u = S.ufo;
    if (u) { drawUFO(u); }
    // surfer
    var y = sy - S.h + 6;
    var trickProg = S.trick > 0 ? 1 - S.trick / 0.85 : 0;
    drawSurfer(SCREEN_X + 19, y, S.ang, 1, S.h > 0 ? 1 + Math.min(0.1, Math.abs(S.vh) * 0.012) : 1, 1, trickProg * Math.PI * 2);
    // bullets
    S.bullets.forEach(function (b) { ctx.fillStyle = '#99D6EA'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 6, 5); ctx.fillStyle = '#FFFDF7'; ctx.fillRect(Math.round(b.x), Math.round(b.y), 3, 2); });
    // HUD: lives, tilt gauge
    drawHearts();
    var gx = W - 134, gy = 40;
    ctx.fillStyle = 'rgba(255,253,247,.9)'; ctx.fillRect(gx, gy, 120, 14);
    ctx.fillStyle = Math.abs(S.ang) > 0.8 ? '#E8556D' : (Math.abs(S.ang) > 0.5 ? '#FDC921' : '#4E9A5B');
    ctx.fillRect(gx + 59, gy + 2, Math.max(-56, Math.min(56, S.ang * 70)), 10);
    ctx.fillStyle = '#1E3248'; ctx.fillRect(gx + 59, gy - 2, 2, 18);
    ctx.strokeStyle = '#1E3248'; ctx.lineWidth = 2; ctx.strokeRect(gx, gy, 120, 14);
    if (S.abduct > 0.05) {
      ctx.fillStyle = 'rgba(255,253,247,.9)'; ctx.fillRect(SCREEN_X - 30, 100, 60, 8);
      ctx.fillStyle = '#E8556D'; ctx.fillRect(SCREEN_X - 30, 100, 60 * Math.min(1, S.abduct / 1.1), 8);
    }
    if (S.msgT > 0) { bigText(S.msg, 130, 26, '#FDC921'); }
    else if (S.intro > 0) { bigText('Level ' + level + ': ' + surfCfg.name, 130, 28); }
    if (S.clear > 0) { bigText(level >= TOTAL_LEVELS ? 'All sharks beaten!' : 'Level clear!', 140, 34, '#FDC921'); }
  }

  function drawUFO(u) {
    var x = Math.round(u.x), y = Math.round(u.y + Math.sin(t * 0.12) * 3);
    if (u.state === 'charge' || u.state === 'beam') {
      var beaming = u.state === 'beam';
      var top = y + 14, bottom = waveY(S.wx) + 10;
      ctx.fillStyle = beaming ? 'rgba(253,201,33,.55)' : 'rgba(153,214,234,' + (0.25 + 0.2 * Math.sin(t * 0.5)) + ')';
      ctx.beginPath(); ctx.moveTo(x - 14, top); ctx.lineTo(x + 14, top); ctx.lineTo(x + 44, bottom); ctx.lineTo(x - 44, bottom); ctx.closePath(); ctx.fill();
    }
    var fl = u.flash > 0 || !u.alive;
    ctx.fillStyle = fl ? '#FFFDF7' : '#99D6EA'; ctx.fillRect(x - 14, y - 16, 28, 14); ctx.fillRect(x - 10, y - 20, 20, 6);   // dome
    ctx.fillStyle = fl ? '#E8556D' : '#7A8691'; ctx.fillRect(x - 36, y - 4, 72, 12); ctx.fillRect(x - 28, y + 8, 56, 6); ctx.fillRect(x - 44, y, 88, 6);
    for (var i = 0; i < 5; i++) { ctx.fillStyle = ((t >> 3) + i) % 2 ? '#FDC921' : '#FFFDF7'; ctx.fillRect(x - 30 + i * 15, y + 2, 6, 5); }
    // hit points
    for (var h = 0; h < 3; h++) { ctx.fillStyle = h < u.hp ? '#E8556D' : 'rgba(30,50,72,.3)'; ctx.fillRect(x - 15 + h * 11, y - 28, 8, 5); }
  }

  // ------------------------------------------------------------------ flow: start, game over, win, HUD
  var SNARK = [
    'Not bad, bro. Try harder next time.',
    'The sharks send their regards.',
    'You surf like a shopping cart. Wait, that is a real vlog.',
    'Fishy business. Better luck next time!',
    'Did you even try? (Kidding. Mostly.)',
    'That wave had your name on it.',
    'Sharks 1, you 0. Rematch?',
    'Plot twist: the ocean won.'
  ];
  var snarkIdx = Math.floor(Math.random() * SNARK.length);

  function updateHud() {
    if (mode === 'beach') {
      el.level.textContent = 'Level 1/' + TOTAL_LEVELS;
      el.goal.textContent = 'Trash ' + trashGot + '/' + trashTotal;
    } else if (mode === 'puzzle') {
      el.level.textContent = 'Level 1/' + TOTAL_LEVELS;
      el.goal.textContent = 'Pieces ' + puzzleDone + '/' + pieces.length;
    } else if (mode === 'surf' && surfCfg) {
      el.level.textContent = 'Level ' + level + '/' + TOTAL_LEVELS;
      el.goal.textContent = 'Sharks ' + Math.min(S.resolved, surfCfg.sharks) + '/' + surfCfg.sharks;
    }
    el.fire.hidden = mode !== 'surf';
  }

  function api(body) {
    return fetch('/api/scores.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function renderHof(list, mine) {
    var ol = document.getElementById('hof');
    if (!ol) { return; }
    ol.textContent = '';
    if (!list || !list.length) { var li0 = document.createElement('li'); li0.className = 'hint'; li0.textContent = 'No times yet. Be the first!'; ol.appendChild(li0); return; }
    list.forEach(function (r) {
      var li = document.createElement('li');
      if (mine && r.name === mine.name && r.ms === mine.ms) { li.className = 'me'; }
      var tt = document.createElement('span'); tt.className = 't'; tt.textContent = fmt(r.ms);
      li.appendChild(document.createTextNode(r.name + ' '));
      li.appendChild(tt);
      ol.appendChild(li);
    });
  }
  function loadHof() {
    fetch('/api/scores.php', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
      .then(function (d) { renderHof(d.top); }).catch(function () { renderHof([]); });
  }

  function beginRun() {
    audio();
    lives = 3; level = 1; clockMs = 0; clockRunning = true; runNonce = '';
    keys.left = keys.right = keys.jump = keys.fire = false; jumpPressed = false;
    el.start.hidden = true; el.over.hidden = true; el.win.hidden = true;
    api({ action: 'start' }).then(function (d) { runNonce = d.nonce || ''; }).catch(function () { runNonce = ''; });
    mode = 'beach'; beachReset(); setMusic('beach'); updateHud();
  }

  function gameOver() {
    mode = 'over'; clockRunning = false; setMusic('none'); play('lose');
    document.getElementById('overMsg').textContent = SNARK[snarkIdx % SNARK.length];
    snarkIdx++;
    document.getElementById('overInfo').textContent = 'You reached level ' + level + ' in ' + fmt(clockMs) + '.';
    el.over.hidden = false;
  }

  var finalMs = 0, submitted = false;
  function gameWon() {
    mode = 'win'; clockRunning = false; finalMs = Math.round(clockMs); submitted = false;
    setMusic('none'); play('win');
    document.getElementById('winTime').textContent = 'Your time: ' + fmt(finalMs);
    document.getElementById('winNote').textContent = '';
    document.getElementById('submitBtn').disabled = false;
    el.win.hidden = false;
  }

  document.getElementById('startBtn').addEventListener('click', beginRun);
  document.getElementById('retryBtn').addEventListener('click', beginRun);
  document.getElementById('againBtn').addEventListener('click', beginRun);
  document.getElementById('submitBtn').addEventListener('click', function () {
    if (submitted) { return; }
    var btn = this, note = document.getElementById('winNote');
    btn.disabled = true;
    api({ action: 'submit', nonce: runNonce, name: el.name.value, ms: finalMs }).then(function (d) {
      if (d.error) { note.textContent = d.error; btn.disabled = false; return; }
      submitted = true;
      note.textContent = 'You are in the hall of fame as ' + d.name + '.';
      renderHof(d.top, { name: d.name, ms: finalMs });
    }).catch(function () { note.textContent = 'Could not reach the server. Try again.'; btn.disabled = false; });
  });

  // ------------------------------------------------------------------ loop and input
  function loop(now) {
    if (!lastTime) { lastTime = now; }
    var dtMs = Math.min(50, now - lastTime), k = dtMs / 16.667;
    lastTime = now; t += k;
    if (clockRunning) { clockMs += dtMs; }
    el.time.textContent = fmt(clockMs);
    if (mode === 'beach') { beachStep(k); if (mode === 'beach') { beachDraw(); } }
    if (mode === 'puzzle') { puzzleStep(k); puzzleDraw(); }
    else if (mode === 'surf') {
      surfStep(k, dtMs / 1000);
      if (mode === 'surf' && S) { surfDraw(); }
    } else if (mode === 'start' || mode === 'over' || mode === 'win') {
      if (!player) { beachReset(); }
      cam = 0; drawSky(); drawWaterWith(beachSurface); drawPlayerBeach();
    }
    if (mode === 'beach' || mode === 'puzzle') { updateHud(); }
    requestAnimationFrame(loop);
  }

  var keyMap = {
    ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'fire'
  };
  window.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) { return; }
    if (mode === 'puzzle') {
      if ((e.key === 'r' || e.key === 'R') && lastTouched && !lastTouched.locked) { lastTouched.rot = (lastTouched.rot + 1) % 4; trySnap(lastTouched); e.preventDefault(); }
      return;
    }
    if (mode !== 'beach' && mode !== 'surf') { return; }
    var m = keyMap[e.key];
    if (!m) { return; }
    if (m === 'fire' && mode === 'beach') { m = 'jump'; }
    if (m === 'jump') { if (!e.repeat) { jumpPressed = true; } }
    keys[m] = true;
    e.preventDefault();
  });
  window.addEventListener('keyup', function (e) {
    var m = keyMap[e.key];
    if (!m) { return; }
    if (m === 'fire') { keys.fire = false; keys.jump = false; } else { keys[m] = false; }
  });
  document.querySelectorAll('#touch button').forEach(function (b) {
    var key = b.getAttribute('data-key');
    function on(e) { keys[key] = true; if (key === 'jump') { jumpPressed = true; } e.preventDefault(); }
    function off(e) { keys[key] = false; e.preventDefault(); }
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
  });

  // ------------------------------------------------------------------ certificate (drawn in the browser, nothing is stored)
  document.getElementById('certBtn').addEventListener('click', function () {
    var name = (el.name.value || '').trim() || 'Beach Hero';
    var load = document.fonts && document.fonts.load ? document.fonts.load('20px "Myfont"') : Promise.resolve();
    load.catch(function () {}).then(function () { makeCertificate(name, finalMs); });
  });

  function makeCertificate(name, ms) {
    var c = document.createElement('canvas');
    c.width = 1200; c.height = 850;
    var g = c.getContext('2d');
    g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#FDC921'; g.fillRect(0, 0, c.width, 36); g.fillRect(0, c.height - 36, c.width, 36);
    g.fillStyle = '#99D6EA'; g.fillRect(0, 36, c.width, 14); g.fillRect(0, c.height - 50, c.width, 14);
    g.strokeStyle = '#1E3248'; g.lineWidth = 6; g.strokeRect(50, 70, c.width - 100, c.height - 140);
    g.textAlign = 'center'; g.fillStyle = '#1E3248';
    var pix = '"Myfont", "DM Sans", sans-serif';       // the certificate keeps its own handwriting font
    g.font = '56px ' + pix; g.fillText('CERTIFICATE', c.width / 2, 190);
    g.font = '34px ' + pix; g.fillText('OF BEACH CLEANUP', c.width / 2, 245);
    g.font = '20px sans-serif'; g.fillText('This certifies that', c.width / 2, 330);
    var size = 84;
    g.font = size + 'px ' + pix;
    while (g.measureText(name).width > c.width - 260 && size > 20) { size -= 2; g.font = size + 'px ' + pix; }
    g.fillStyle = '#6798C0'; g.fillText(name, c.width / 2, 420);
    g.fillStyle = '#1E3248'; g.font = '20px sans-serif';
    g.fillText('cleaned the beach, built a water gun and beat every shark', c.width / 2, 490);
    g.fillText('in all 5 levels of Leah\'s Surf Cleanup game.', c.width / 2, 522);
    g.font = '40px ' + pix; g.fillStyle = '#6798C0';
    g.fillText('Total time: ' + fmt(ms), c.width / 2, 582);
    if (SURFER.complete && SURFER.naturalWidth) {
      g.imageSmoothingEnabled = false;
      var sw = Math.round(SURFER.naturalWidth * 1.5), sh = Math.round(SURFER.naturalHeight * 1.5);
      g.drawImage(SURFER, Math.round(c.width / 2 - sw / 2), 600, sw, sh);
    }
    g.fillStyle = '#1E3248'; g.font = '24px ' + pix;
    g.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), c.width / 2, 712);
    g.fillText('livedbyleah.com', c.width / 2, 748);
    c.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'surf-cleanup-certificate.png';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  }

  // Test hook: only active when the page is opened with ?debug=1
  if (/[?&]debug=1/.test(location.search)) {
    window.__lbl = {
      pieces: function () { return pieces.map(function (p) { return { id: p.d.id, x: p.x, y: p.y, rot: p.rot, tx: p.tx, ty: p.ty, locked: p.locked }; }); },
      puzzle: function () { clockRunning = true; startPuzzle(); },
      level: function (n, ufo) { clockRunning = true; lives = 3; startLevel(n); if (ufo) { S.ufoAt = 0; S.ufoDone = false; } },
      info: function () { return { mode: mode, level: level, lives: lives, S: S && { resolved: S.resolved, spawned: S.spawned, ang: S.ang, h: S.h, ufo: S.ufo && S.ufo.state }, ms: clockMs }; },
      won: function () { clockMs = 61000 + Math.random() * 1000; gameWon(); }
    };
  }

  beachReset();
  loadHof();
  requestAnimationFrame(loop);
})();

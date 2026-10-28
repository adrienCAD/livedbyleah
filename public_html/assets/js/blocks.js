// Bake Off (internal id "blocks"): falling kitchen pieces, drawn by Leah. 10x20 board, 7 pieces in a shuffled bag, hold,
// next preview, ghost. Native canvas 156x206 (8 px per cell) shown scaled with crisp pixels. Pieces are Leah's pictures; every
// board cell keeps its own 8x8 slice, so cleared rows cut pieces apart like Tetris. Ranked by score (see inc/fans.php).
(function () {
  'use strict';
  var cv = document.getElementById('gameCanvas');
  if (!cv) { return; }
  var g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;

  var W = 156, H = 206, CS = 8, COLS = 10, ROWS = 20, BX = 8, BY = 25;
  var CERT_SCORE = 12000;
  var TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  var FILES = { I: 'spatula', O: 'sack', T: 'mushroom', S: 'sifter', Z: 'chocolate', J: 'jartin', L: 'triangle' };
  // Cells are [x, y] in the picture as Leah drew it (rotation 0). pv = turning point (centre of a cell, or a corner).
  var BASE = {
    I: { w: 1, h: 4, cells: [[0, 0], [0, 1], [0, 2], [0, 3]], pv: [0.5, 1.5] },
    O: { w: 2, h: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]], pv: [1, 1] },
    T: { w: 3, h: 2, cells: [[0, 0], [1, 0], [2, 0], [1, 1]], pv: [1.5, 0.5] },
    S: { w: 3, h: 2, cells: [[1, 0], [2, 0], [0, 1], [1, 1]], pv: [1.5, 1.5] },
    Z: { w: 3, h: 2, cells: [[0, 0], [1, 0], [1, 1], [2, 1]], pv: [1.5, 1.5] },
    J: { w: 2, h: 3, cells: [[1, 0], [1, 1], [0, 2], [1, 2]], pv: [1.5, 1.5] },
    L: { w: 2, h: 3, cells: [[0, 0], [0, 1], [0, 2], [1, 2]], pv: [0.5, 1.5] }
  };
  var ROT = {};   // ROT[type][r] = { w, h, cells, pv } for the 4 turns
  TYPES.forEach(function (t) {
    var a = [BASE[t]];
    for (var r = 1; r < 4; r++) {
      var p = a[r - 1];
      a.push({ w: p.h, h: p.w, pv: [p.h - p.pv[1], p.pv[0]], cells: p.cells.map(function (c) { return [p.h - 1 - c[1], c[0]]; }) });
    }
    ROT[t] = a;
  });

  // ------------------------------------------------------------------ Leah's art (pictures turned in 90 degree steps)
  var IMG = {}, SPR = {}, loaded = 0, ready = false;
  TYPES.forEach(function (t) {
    var im = new Image();
    im.onload = function () {
      var list = [], c0 = document.createElement('canvas'); c0.width = im.width; c0.height = im.height; c0.getContext('2d').drawImage(im, 0, 0); list.push(c0);
      for (var r = 1; r < 4; r++) {
        var p = list[r - 1], c = document.createElement('canvas'); c.width = p.height; c.height = p.width;
        var x = c.getContext('2d'); x.translate(c.width, 0); x.rotate(Math.PI / 2); x.drawImage(p, 0, 0); list.push(c);
      }
      SPR[t] = list; if (++loaded === TYPES.length) { ready = true; }
    };
    im.src = '/assets/img/bakeoff/' + FILES[t] + '.png?v=1';
    IMG[t] = im;
  });
  function slice(t, r, cx, cy, px, py, alpha) {
    if (!SPR[t]) { return; }
    g.globalAlpha = alpha == null ? 1 : alpha;
    g.drawImage(SPR[t][r], cx * CS, cy * CS, CS, CS, Math.round(px), Math.round(py), CS, CS);
    g.globalAlpha = 1;
  }
  function drawPiece(t, r, ox, oy, alpha) {
    ROT[t][r].cells.forEach(function (c) { slice(t, r, c[0], c[1], ox + c[0] * CS, oy + c[1] * CS, alpha); });
  }

  // ------------------------------------------------------------------ bold pixel font (5x7 letters, drawn in code)
  var F = {
    A: '01110,10001,10001,11111,10001,10001,10001', B: '11110,10001,10001,11110,10001,10001,11110', C: '01110,10001,10000,10000,10000,10001,01110',
    D: '11110,10001,10001,10001,10001,10001,11110', E: '11111,10000,10000,11110,10000,10000,11111', F: '11111,10000,10000,11110,10000,10000,10000',
    G: '01110,10001,10000,10111,10001,10001,01111', H: '10001,10001,10001,11111,10001,10001,10001', I: '01110,00100,00100,00100,00100,00100,01110',
    J: '00111,00010,00010,00010,00010,10010,01100', K: '10001,10010,10100,11000,10100,10010,10001', L: '10000,10000,10000,10000,10000,10000,11111',
    M: '10001,11011,10101,10101,10001,10001,10001', N: '10001,11001,10101,10011,10001,10001,10001', O: '01110,10001,10001,10001,10001,10001,01110',
    P: '11110,10001,10001,11110,10000,10000,10000', Q: '01110,10001,10001,10001,10101,10010,01101', R: '11110,10001,10001,11110,10100,10010,10001',
    S: '01111,10000,10000,01110,00001,00001,11110', T: '11111,00100,00100,00100,00100,00100,00100', U: '10001,10001,10001,10001,10001,10001,01110',
    V: '10001,10001,10001,10001,10001,01010,00100', W: '10001,10001,10001,10101,10101,11011,10001', X: '10001,10001,01010,00100,01010,10001,10001',
    Y: '10001,10001,01010,00100,00100,00100,00100', Z: '11111,00001,00010,00100,01000,10000,11111',
    0: '01110,10001,10011,10101,11001,10001,01110', 1: '00100,01100,00100,00100,00100,00100,01110', 2: '01110,10001,00001,00010,00100,01000,11111',
    3: '11110,00001,00001,01110,00001,00001,11110', 4: '00010,00110,01010,10010,11111,00010,00010', 5: '11111,10000,11110,00001,00001,10001,01110',
    6: '00110,01000,10000,11110,10001,10001,01110', 7: '11111,00001,00010,00100,01000,01000,01000', 8: '01110,10001,10001,01110,10001,10001,01110',
    9: '01110,10001,10001,01111,00001,00010,01100',
    ',': '00000,00000,00000,00000,01100,00100,01000', '.': '00000,00000,00000,00000,00000,01100,01100', '-': '00000,00000,00000,11111,00000,00000,00000',
    ' ': '00000,00000,00000,00000,00000,00000,00000'
  };
  var GL = {};
  Object.keys(F).forEach(function (k) { GL[k] = F[k].split(','); });
  // Bold = every lit pixel is drawn twice as wide, so each letter is 6 wide. Advance 7 (or 6 when the text must squeeze in).
  function textW(s, sc, adv) { return Math.max(0, s.length * adv - 1) * sc; }
  function text(s, x, y, color, sc, align, maxW, outline) {
    s = String(s).toUpperCase(); sc = sc || 1;
    var adv = 7;
    if (maxW && textW(s, sc, adv) > maxW) { adv = 6; }
    var w = textW(s, sc, adv);
    var x0 = align === 'center' ? Math.round(x - w / 2) : align === 'right' ? Math.round(x - w) : x;
    for (var pass = outline ? 0 : 1; pass < 2; pass++) {
      g.fillStyle = pass === 0 ? outline : (typeof color === 'function' ? '' : color);
      for (var i = 0; i < s.length; i++) {
        var gl = GL[s[i]]; if (!gl) { continue; }
        if (pass === 1 && typeof color === 'function') { g.fillStyle = color(i); }
        for (var r = 0; r < 7; r++) { for (var c = 0; c < 5; c++) {
          if (gl[r][c] !== '1') { continue; }
          var px = x0 + (i * adv + c) * sc, py = y + r * sc;
          if (pass === 0) { g.fillRect(px - 1, py - 1, 2 * sc + 2, sc + 2); } else { g.fillRect(px, py, 2 * sc, sc); }
        } }
      }
    }
  }
  function fmtN(n) { return Math.round(n).toLocaleString('en-US'); }

  // ------------------------------------------------------------------ backgrounds (made once)
  function mkCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  var bgGingham = (function () {
    var c = mkCanvas(W, H), x = c.getContext('2d'), i, j;
    x.fillStyle = '#F8E6E1'; x.fillRect(0, 0, W, H);
    for (i = 0; i < W; i += 16) { x.fillStyle = 'rgba(226,160,150,.38)'; x.fillRect(i, 0, 8, H); }
    for (j = 0; j < H; j += 16) { x.fillStyle = 'rgba(226,160,150,.38)'; x.fillRect(0, j, W, 8); }
    return c;
  })();
  var bgBoard = (function () {
    var c = mkCanvas(COLS * CS, ROWS * CS), x = c.getContext('2d');
    for (var r = 0; r < ROWS; r++) { for (var q = 0; q < COLS; q++) { x.fillStyle = (r + q) % 2 ? '#DCEAF0' : '#E8F2F6'; x.fillRect(q * CS, r * CS, CS, CS); } }
    return c;
  })();

  // ------------------------------------------------------------------ state
  var el = { score: document.getElementById('hudScore'), level: document.getElementById('hudLevel'), dishes: document.getElementById('hudDishes'),
    start: document.getElementById('gameStart'), over: document.getElementById('gameOver') };
  var grid, cur, hold, canHold, queue, bag, score, lines, level, mode = 'idle', gravT, lockT, lockResets, clearRows, clearT, runNonce = '', tick = 0;
  var keys = { left: false, right: false, soft: false }, pend = { left: false, right: false }, dasT = 0, arrT = 0, lastDir = 0;
  var me = { name: 'Player', fan: false }, finalScore = 0, finalLines = 0;

  function newGrid() { var a = []; for (var y = 0; y < ROWS; y++) { a.push(new Array(COLS).fill(null)); } return a; }
  function refill() {
    var b = TYPES.slice();
    for (var i = b.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)), t = b[i]; b[i] = b[k]; b[k] = t; }
    bag = bag.concat(b);
  }
  function draw1() { if (bag.length < 7) { refill(); } return bag.shift(); }
  function mkPiece(type) { var d = ROT[type][0]; return { t: type, r: 0, x: Math.floor((COLS - d.w) / 2), y: 0 }; }
  function dOf(p) { return ROT[p.t][p.r]; }
  function collides(cells, px, py) {
    for (var i = 0; i < cells.length; i++) {
      var gx = px + cells[i][0], gy = py + cells[i][1];
      if (gx < 0 || gx >= COLS || gy >= ROWS) { return true; }
      if (gy >= 0 && grid[gy][gx]) { return true; }
    }
    return false;
  }
  function spawn(type) {
    cur = mkPiece(type || queue.shift());
    while (queue.length < 4) { queue.push(draw1()); }
    gravT = 0; lockT = 0; lockResets = 0; canHold = type ? canHold : true;
    if (collides(dOf(cur).cells, cur.x, cur.y)) { gameOver(); }
  }
  function interval() { return Math.max(0.05, Math.pow(0.8 - (level - 1) * 0.007, level - 1)); }
  function onGround() { return collides(dOf(cur).cells, cur.x, cur.y + 1); }
  function ghostY() { var y = cur.y, c = dOf(cur).cells; while (!collides(c, cur.x, y + 1)) { y++; } return y; }

  function move(dx) {
    if (!collides(dOf(cur).cells, cur.x + dx, cur.y)) { cur.x += dx; touched(); SFX.move(); return true; }
    return false;
  }
  function touched() { if (onGround() && lockResets < 15) { lockT = 0; lockResets++; } }
  function rotate() {
    if (cur.t === 'O') { return; }
    var d0 = dOf(cur), nr = (cur.r + 1) % 4, d1 = ROT[cur.t][nr];
    var bx = cur.x + d0.pv[0] - d1.pv[0], by = cur.y + d0.pv[1] - d1.pv[1];
    var kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1], [0, -2]];
    for (var i = 0; i < kicks.length; i++) {
      if (!collides(d1.cells, bx + kicks[i][0], by + kicks[i][1])) { cur.r = nr; cur.x = bx + kicks[i][0]; cur.y = by + kicks[i][1]; touched(); SFX.rot(); return; }
    }
  }
  function hardDrop() {
    var y = ghostY(), d = y - cur.y;
    cur.y = y; score += d * 2; SFX.drop(); lockPiece();
  }
  function holdPiece() {
    if (!canHold || mode !== 'play') { return; }
    var t = cur.t;
    if (hold) { var h = hold; hold = t; spawn(h); canHold = false; } else { hold = t; spawn(); canHold = false; }
    SFX.hold();
  }
  function lockPiece() {
    var d = dOf(cur);
    d.cells.forEach(function (c) {
      var gy = cur.y + c[1];
      if (gy >= 0) { grid[gy][cur.x + c[0]] = { t: cur.t, r: cur.r, cx: c[0], cy: c[1] }; }
    });
    var full = [];
    for (var r = 0; r < ROWS; r++) { if (grid[r].every(function (c) { return c; })) { full.push(r); } }
    if (full.length) { clearRows = full; clearT = 0.3; mode = 'clear'; SFX.clear(full.length); }
    else { spawn(); }
    hud();
  }
  function finishClear() {
    var n = clearRows.length;
    clearRows.forEach(function (r) { grid.splice(r, 1); grid.unshift(new Array(COLS).fill(null)); });
    score += [0, 100, 300, 500, 800][n] * level;
    var before = level; lines += n; level = 1 + Math.floor(lines / 10);
    if (level > before) { SFX.level(); }
    clearRows = null; mode = 'play'; spawn(); hud();
  }

  // ------------------------------------------------------------------ audio (small WebAudio beeps)
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
    move: function () { beep(300, 300, 0.03, 'square', 0.04); }, rot: function () { beep(420, 520, 0.05, 'square', 0.06); },
    drop: function () { beep(160, 70, 0.1, 'triangle', 0.12); }, hold: function () { beep(500, 350, 0.08, 'triangle', 0.08); },
    clear: function (n) { for (var i = 0; i < 2 + n; i++) { beep(440 + i * 110, 440 + i * 110, 0.09, 'square', 0.1, i * 0.07); } },
    level: function () { [523, 659, 784, 1047].forEach(function (f, i) { beep(f, f, 0.12, 'square', 0.1, 0.3 + i * 0.1); }); },
    over: function () { beep(400, 60, 0.9, 'triangle', 0.18); }
  };
  document.getElementById('muteBtn').addEventListener('click', function () {
    muted = !muted; this.setAttribute('aria-pressed', muted ? 'true' : 'false'); this.textContent = muted ? 'Sound off' : 'Sound on';
    if (master) { master.gain.value = muted ? 0 : 0.5; }
  });

  // ------------------------------------------------------------------ hall of fame (the API still calls dishes "lines")
  function api(body) {
    body.game = 'blocks';
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
      var lv = document.createElement('span'); lv.className = 'lv'; lv.textContent = r.lines + (Number(r.lines) === 1 ? ' dish' : ' dishes');
      li.appendChild(document.createTextNode(r.name + ' ')); li.appendChild(lv); li.appendChild(tt);
      if (r.seen) { var sn = document.createElement('span'); sn.className = 'seen'; sn.textContent = 'last seen ' + r.seen; li.appendChild(sn); }
      ol.appendChild(li);
    });
  }
  function setMe(m) { if (!m) { return; } me = m; var j = document.getElementById('hofJoin'); if (j) { j.hidden = !!m.fan; } }
  function loadHof() {
    fetch('/api/scores.php?game=blocks', { credentials: 'same-origin' }).then(function (r) { return r.json(); })
      .then(function (d) { setMe(d.me); renderHof(d.top); }).catch(function () { renderHof([]); });
  }
  function saveRun(noteEl) {
    noteEl.textContent = '';
    api({ action: 'submit', nonce: runNonce, score: finalScore, lines: finalLines }).then(function (d) {
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
  var MSG = ['The kitchen is a mess. Clean up and go again!', 'Too many dishes on the counter!', 'The oven timer rang. Try again!', 'So close! The pantry is full.', 'Leah says: keep the stack flat.', 'Every dish counts. Bake again!'];
  var msgIdx = 0;
  function hud() {
    el.score.textContent = 'Score ' + fmtN(score); el.level.textContent = 'Level ' + level; el.dishes.textContent = 'Dishes ' + lines;
  }
  function beginRun() {
    audio();
    grid = newGrid(); bag = []; queue = []; hold = null; canHold = true; score = 0; lines = 0; level = 1;
    keys.left = keys.right = keys.soft = false; runNonce = '';
    for (var i = 0; i < 4; i++) { queue.push(draw1()); }
    el.start.hidden = true; el.over.hidden = true;
    api({ action: 'start' }).then(function (d) { runNonce = d.nonce || ''; setMe(d.me); }).catch(function () { runNonce = ''; });
    mode = 'play'; spawn(); hud();
  }
  function gameOver() {
    if (mode === 'over') { return; }
    mode = 'over'; SFX.over();
    finalScore = Math.round(score); finalLines = lines;
    document.getElementById('overMsg').textContent = MSG[msgIdx++ % MSG.length];
    document.getElementById('overInfo').textContent = 'Score ' + fmtN(finalScore) + ' with ' + finalLines + (finalLines === 1 ? ' dish' : ' dishes') + ' (level ' + level + ').';
    document.getElementById('certBtn').hidden = finalScore < CERT_SCORE;
    el.over.hidden = false;
    saveRun(document.getElementById('overNote'));
  }
  document.getElementById('startBtn').addEventListener('click', beginRun);
  document.getElementById('retryBtn').addEventListener('click', beginRun);

  // ------------------------------------------------------------------ update
  function update(dt) {
    tick += dt;
    if (mode === 'clear') { clearT -= dt; if (clearT <= 0) { finishClear(); } return; }
    if (mode !== 'play') { return; }
    // a tap shorter than one frame still moves the piece once
    if (pend.left && !keys.left) { move(-1); } if (pend.right && !keys.right) { move(1); }
    pend.left = pend.right = false;
    var dir = keys.left && !keys.right ? -1 : keys.right && !keys.left ? 1 : 0;
    if (dir !== lastDir) { lastDir = dir; dasT = 0; arrT = 0; if (dir) { move(dir); } }
    else if (dir) { dasT += dt; if (dasT > 0.17) { arrT += dt; while (arrT > 0.05) { arrT -= 0.05; move(dir); } } }
    var iv = keys.soft ? Math.min(interval(), 0.04) : interval();
    if (onGround()) {
      lockT += dt;
      if (lockT >= 0.5) { lockPiece(); }
    } else {
      gravT += dt;
      while (gravT >= iv && !onGround()) { gravT -= iv; cur.y++; if (keys.soft) { score += 1; } }
      lockT = 0;
    }
    hud();
  }

  // ------------------------------------------------------------------ drawing (native 156x206 pixels)
  var INK = '#5B4636', TAN = '#B79F7E', CREAM = '#FCF7E8', BLUE = '#6798C0';
  function panel(x, y, w, h) {
    g.fillStyle = TAN; g.fillRect(x, y, w, h); g.fillStyle = CREAM; g.fillRect(x + 2, y + 2, w - 4, h - 4);
  }
  function preview(t, px, py, pw, ph, alpha) {
    var r = t === 'I' ? 1 : 0, d = ROT[t][r];   // the spatula lies down so it fits the box
    drawPiece(t, r, px + Math.floor((pw - d.w * CS) / 2), py + Math.floor((ph - d.h * CS) / 2), alpha);
  }
  function draw() {
    var x, y;
    g.drawImage(bgGingham, 0, 0);
    // title
    var TC = ['#6EA0D0', '#F0A867', '#E58AA0', '#8CC59A', '#000', '#6EA0D0', '#F0A867', '#E58AA0'];
    text('BAKE OFF', W / 2, 4, function (i) { return TC[i]; }, 2, 'center', 0, INK);
    // frame and board
    g.fillStyle = TAN; g.fillRect(BX - 3, BY - 3, COLS * CS + 6, ROWS * CS + 6);
    g.fillStyle = INK; g.fillRect(BX - 2, BY - 2, COLS * CS + 4, ROWS * CS + 4);
    g.drawImage(bgBoard, BX, BY);
    if (grid) {
      for (y = 0; y < ROWS; y++) { for (x = 0; x < COLS; x++) { var c = grid[y][x]; if (c) { slice(c.t, c.r, c.cx, c.cy, BX + x * CS, BY + y * CS); } } }
      if (cur && (mode === 'play' || mode === 'over')) {
        if (mode === 'play') { drawPiece(cur.t, cur.r, BX + cur.x * CS, BY + ghostY() * CS, 0.28); }
        g.save(); g.beginPath(); g.rect(BX, BY, COLS * CS, ROWS * CS); g.clip();
        drawPiece(cur.t, cur.r, BX + cur.x * CS, BY + cur.y * CS, 1); g.restore();
      }
      if (mode === 'clear' && clearRows) {
        clearRows.forEach(function (r) { g.fillStyle = 'rgba(255,255,255,' + (0.55 + 0.4 * Math.sin(tick * 40)) + ')'; g.fillRect(BX, BY + r * CS, COLS * CS, CS); });
      }
    }
    // right column
    var RX = 96, RW = 52;
    panel(RX, 22, RW, 42); text('NEXT', RX + RW / 2, 25, INK, 1, 'center');
    if (queue && queue[0]) { preview(queue[0], RX + 2, 33, RW - 4, 29, 1); }
    panel(RX, 68, RW, 42); text('HOLD', RX + RW / 2, 71, INK, 1, 'center');
    if (hold) { preview(hold, RX + 2, 79, RW - 4, 29, canHold ? 1 : 0.35); }
    var rows = [['SCORE', fmtN(score || 0)], ['DISHES', String(lines || 0)], ['LEVEL', String(level || 1)]];
    rows.forEach(function (r, i) {
      var py = 114 + i * 26;
      panel(RX, py, RW, 22); text(r[0], RX + 4, py + 3, INK, 1, 'left'); text(r[1], RX + 4, py + 12, BLUE, 1, 'left', RW - 8);
    });
    text('ART BY LEAH', 48, 194, INK, 1, 'center');
  }

  var last = 0;
  function loop(now) {
    if (!last) { last = now; }
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------ input
  function act(k) {
    if (mode !== 'play') { return; }
    if (k === 'rotate') { rotate(); } else if (k === 'drop') { hardDrop(); } else if (k === 'hold') { holdPiece(); }
  }
  var KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'rotate', w: 'rotate', W: 'rotate', ArrowDown: 'drop', s: 'drop', S: 'drop', c: 'hold', C: 'hold', Shift: 'hold', ' ': 'soft' };
  window.addEventListener('keydown', function (e) {
    var k = KEYMAP[e.key];
    if (!k) { return; }
    if (mode === 'play' || mode === 'clear') { e.preventDefault(); }
    if (k === 'left' || k === 'right' || k === 'soft') { if (!keys[k] && k !== 'soft') { pend[k] = true; } keys[k] = true; return; }
    if (e.repeat) { return; }
    act(k);
  });
  window.addEventListener('keyup', function (e) { var k = KEYMAP[e.key]; if (k === 'left' || k === 'right' || k === 'soft') { keys[k] = false; } });
  window.addEventListener('blur', function () { keys.left = keys.right = keys.soft = false; });
  document.querySelectorAll('#touch button').forEach(function (b) {
    var k = b.getAttribute('data-key');
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); if (k === 'left' || k === 'right') { keys[k] = true; } else { act(k); } });
    var off = function (e) { e.preventDefault(); if (k === 'left' || k === 'right') { keys[k] = false; } };
    b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });

  // ------------------------------------------------------------------ certificate (drawn in the browser, all text in Leah's Myfont)
  document.getElementById('certBtn').addEventListener('click', function () {
    var load = document.fonts && document.fonts.load ? document.fonts.load('20px "Myfont"') : Promise.resolve();
    load.catch(function () {}).then(function () { makeCertificate(me.name || 'Master Baker', finalScore, finalLines); });
  });
  function makeCertificate(name, sc, ln) {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 850;
    var x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    var pix = '"Myfont", sans-serif', i;
    x.fillStyle = '#FFFDF7'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#FDC921'; x.fillRect(0, 0, c.width, 36); x.fillRect(0, c.height - 36, c.width, 36);
    x.fillStyle = '#99D6EA'; x.fillRect(0, 36, c.width, 14); x.fillRect(0, c.height - 50, c.width, 14);
    x.strokeStyle = '#1E3248'; x.lineWidth = 6; x.strokeRect(50, 70, c.width - 100, c.height - 140);
    x.textAlign = 'center'; x.fillStyle = '#1E3248';
    x.font = '76px ' + pix; x.fillText('CERTIFICATE', c.width / 2, 190);
    x.font = '52px ' + pix; x.fillText('OF BAKING', c.width / 2, 252);
    x.font = '40px ' + pix; x.fillText('This certifies that', c.width / 2, 325);
    var size = 100; x.font = size + 'px ' + pix;
    while (x.measureText(name).width > c.width - 260 && size > 20) { size -= 2; x.font = size + 'px ' + pix; }
    x.fillStyle = '#6798C0'; x.fillText(name, c.width / 2, 425);
    x.fillStyle = '#1E3248'; x.font = '42px ' + pix;
    x.fillText('stacked up a whole kitchen in Bake Off', c.width / 2, 490);
    x.fillText('and served ' + ln + (ln === 1 ? ' dish' : ' dishes') + ' on the way', c.width / 2, 540);
    x.font = '62px ' + pix; x.fillStyle = '#6798C0'; x.fillText('Score ' + fmtN(sc), c.width / 2, 600);
    // Leah's seven pieces along the bottom (drawn from the pictures, bottoms aligned)
    var sc3 = 3, gap = 30, tot = -gap, widths = [];
    TYPES.forEach(function (t) { var w = (SPR[t] ? SPR[t][0].width : 16) * sc3; widths.push(w); tot += w + gap; });
    var px = Math.round(600 - tot / 2);
    TYPES.forEach(function (t, k) {
      if (SPR[t]) { var im = SPR[t][0]; x.drawImage(im, px, 688 - im.height * sc3 + 12, im.width * sc3, im.height * sc3); }
      px += widths[k] + gap;
    });
    x.fillStyle = '#1E3248'; x.font = '36px ' + pix;
    x.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), c.width / 2, 736);
    x.fillText('livedbyleah.com', c.width / 2, 768);
    c.toBlob(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bake-off-certificate.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  }

  // Test hook: only when the page is opened with ?debug=1
  if (/[?&]debug=1/.test(location.search)) {
    window.__blocks = {
      info: function () { return { mode: mode, score: score, lines: lines, level: level, ready: ready, cur: cur && { t: cur.t, r: cur.r, x: cur.x, y: cur.y }, hold: hold, queue: queue && queue.slice(), grid: grid && grid.map(function (r) { return r.map(function (c) { return c ? 1 : 0; }).join(''); }) }; },
      start: beginRun, end: function (sc, ln) { score = sc; lines = ln; level = 1 + Math.floor(ln / 10); gameOver(); },
      setGrid: function (rows) { rows.forEach(function (str, i) { var y = ROWS - rows.length + i; for (var x = 0; x < COLS; x++) { grid[y][x] = str[x] === '1' ? { t: 'O', r: 0, cx: x & 1, cy: y & 1 } : null; } }); },
      setPiece: function (t) { cur = mkPiece(t); },
      cert: function (n, s, l) { makeCertificate(n || 'Test Baker', s || 12345, l || 42); }
    };
  }

  grid = newGrid(); bag = []; queue = []; score = 0; lines = 0; level = 1; hud();
  loadHof();
  requestAnimationFrame(loop);
})();

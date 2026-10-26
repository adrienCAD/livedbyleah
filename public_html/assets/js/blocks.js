// Leah's Blocks: falling blocks with a hand-drawn look. 10x20 board, 7 shapes in a shuffled bag, hold piece,
// next-piece preview, ghost piece. Canvas 480x600, no libraries. Ranked by score; fan points by score tiers (see inc/fans.php).
(function () {
  'use strict';
  var cv = document.getElementById('gameCanvas');
  if (!cv) { return; }
  var g = cv.getContext('2d');

  var COLS = 10, ROWS = 20, CELL = 26, BX = 20, BY = 62, PX = 304;
  var CERT_SCORE = 12000;
  var TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  var SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
  };
  var COLORS = ['#28d4e8', '#f9d423', '#a24bd8', '#3ccf3a', '#e8392f', '#2f7be8', '#ff8a1f'];
  var DARK = ['#0f6f80', '#9a7d00', '#5f2690', '#17801a', '#8e1810', '#173f96', '#a8520a'];

  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function mix(hex, to, p) {
    var a = parseInt(hex.slice(1), 16), b = to === 'w' ? 0xffffff : 0x000000;
    function ch(s) { var x = (a >> s) & 255, y = (b >> s) & 255; return Math.round(x + (y - x) * p); }
    return 'rgb(' + ch(16) + ',' + ch(8) + ',' + ch(0) + ')';
  }
  function fmtN(n) { return Math.round(n).toLocaleString('en-US'); }

  // ------------------------------------------------------------------ hand-drawn cells (drawn once per colour and variant)
  var cellCache = {};
  function cellSprite(ci, v) {
    var key = ci * 8 + v;
    if (cellCache[key]) { return cellCache[key]; }
    var S = CELL + 6, c = document.createElement('canvas'); c.width = S; c.height = S;
    var x = c.getContext('2d'), r = rng(ci * 131 + v * 17 + 7), j = function (m) { return (r() - 0.5) * m; };
    var o = 3, a = CELL;
    function poly(inset, wob) {
      x.beginPath();
      x.moveTo(o + inset + j(wob), o + inset + j(wob)); x.lineTo(o + a - inset + j(wob), o + inset + j(wob));
      x.lineTo(o + a - inset + j(wob), o + a - inset + j(wob)); x.lineTo(o + inset + j(wob), o + a - inset + j(wob)); x.closePath();
    }
    poly(1, 2.6); x.fillStyle = COLORS[ci]; x.fill();                                    // crayon fill
    x.save(); poly(3, 2.4); x.fillStyle = mix(COLORS[ci], 'w', 0.28); x.fill(); x.restore();      // lighter patch, a bit off-centre
    for (var i = 0; i < 7; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.18 + r() * 0.2) + ')'; x.fillRect(o + 3 + r() * (a - 8), o + 3 + r() * (a - 8), 1 + r() * 2, 1 + r() * 2); }
    x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(o + 4 + j(2), o + 4 + j(2), 7 + r() * 3, 2);   // shine stroke
    x.lineJoin = 'round'; x.lineCap = 'round';
    poly(1, 2.2); x.strokeStyle = DARK[ci]; x.lineWidth = 2.2; x.stroke();                      // pencil outline, drawn twice
    poly(0.5, 3); x.strokeStyle = 'rgba(20,20,30,.55)'; x.lineWidth = 1.1; x.stroke();
    cellCache[key] = c;
    return c;
  }
  function drawCell(px, py, ci, v, alpha, scale) {
    var s = cellSprite(ci, v & 7);
    g.globalAlpha = alpha == null ? 1 : alpha;
    var sz = s.width * (scale || 1);
    g.drawImage(s, Math.round(px - 3 * (scale || 1)), Math.round(py - 3 * (scale || 1)), sz, sz);
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ state
  var el = { score: document.getElementById('hudScore'), level: document.getElementById('hudLevel'), lines: document.getElementById('hudLines'),
    start: document.getElementById('gameStart'), over: document.getElementById('gameOver') };
  var grid, cur, hold, canHold, queue, bag, score, lines, level, mode = 'idle', gravT, lockT, lockResets, clearRows, clearT, runNonce = '', tick = 0, softOn = false;
  var keys = { left: false, right: false, soft: false }, dasT = 0, arrT = 0, lastDir = 0;
  var me = { name: 'Player', fan: false }, finalScore = 0, finalLines = 0, vseed = 0;

  function newGrid() { var a = []; for (var y = 0; y < ROWS; y++) { a.push(new Array(COLS).fill(null)); } return a; }
  function refill() {
    var b = TYPES.slice();
    for (var i = b.length - 1; i > 0; i--) { var k = Math.floor(Math.random() * (i + 1)), t = b[i]; b[i] = b[k]; b[k] = t; }
    bag = bag.concat(b);
  }
  function draw1() { if (bag.length < 7) { refill(); } return bag.shift(); }
  function mkPiece(type) {
    var m = SHAPES[type].map(function (r) { return r.slice(); });
    return { t: type, ci: TYPES.indexOf(type), m: m, x: Math.floor((COLS - m.length) / 2), y: type === 'I' ? -1 : 0, v: Math.floor(Math.random() * 8) };
  }
  function rotCW(m) { var n = m.length, r = []; for (var y = 0; y < n; y++) { r.push([]); for (var x = 0; x < n; x++) { r[y].push(m[n - 1 - x][y]); } } return r; }
  function collides(m, px, py) {
    for (var y = 0; y < m.length; y++) { for (var x = 0; x < m[y].length; x++) {
      if (!m[y][x]) { continue; }
      var gx = px + x, gy = py + y;
      if (gx < 0 || gx >= COLS || gy >= ROWS) { return true; }
      if (gy >= 0 && grid[gy][gx]) { return true; }
    } }
    return false;
  }
  function spawn(type) {
    cur = mkPiece(type || queue.shift());
    while (queue.length < 4) { queue.push(draw1()); }
    gravT = 0; lockT = 0; lockResets = 0; canHold = type ? canHold : true;
    if (collides(cur.m, cur.x, cur.y)) { gameOver(); }
  }
  function interval() { return Math.max(0.05, Math.pow(0.8 - (level - 1) * 0.007, level - 1)); }
  function onGround() { return collides(cur.m, cur.x, cur.y + 1); }
  function ghostY() { var y = cur.y; while (!collides(cur.m, cur.x, y + 1)) { y++; } return y; }

  function move(dx) {
    if (!collides(cur.m, cur.x + dx, cur.y)) { cur.x += dx; touched(); SFX.move(); return true; }
    return false;
  }
  function touched() { if (onGround() && lockResets < 15) { lockT = 0; lockResets++; } }
  function rotate() {
    var r = rotCW(cur.m), kicks = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1], [-1, -1], [1, -1]];
    if (cur.t === 'O') { return; }
    for (var i = 0; i < kicks.length; i++) {
      if (!collides(r, cur.x + kicks[i][0], cur.y + kicks[i][1])) { cur.m = r; cur.x += kicks[i][0]; cur.y += kicks[i][1]; touched(); SFX.rot(); return; }
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
    for (var y = 0; y < cur.m.length; y++) { for (var x = 0; x < cur.m[y].length; x++) {
      if (cur.m[y][x] && cur.y + y >= 0) { grid[cur.y + y][cur.x + x] = { c: cur.ci, v: (cur.v + x + y * 3) & 7 }; }
    } }
    var full = [];
    for (var r = 0; r < ROWS; r++) { if (grid[r].every(function (c) { return c; })) { full.push(r); } }
    if (full.length) { clearRows = full; clearT = 0.28; mode = 'clear'; SFX.clear(full.length); }
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

  // ------------------------------------------------------------------ hall of fame
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
      var lv = document.createElement('span'); lv.className = 'lv'; lv.textContent = r.lines + ' lines';
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
  var MSG = ['The tower had other plans.', 'Blocks happen. Stack again!', 'So close! The ceiling won.', 'Leah says: try a tall, flat stack.', 'Every line is a win. Go again!', 'The blocks are getting too crafty.'];
  var msgIdx = 0;
  function hud() {
    el.score.textContent = 'Score ' + fmtN(score); el.level.textContent = 'Level ' + level; el.lines.textContent = 'Lines ' + lines;
  }
  function beginRun() {
    audio();
    grid = newGrid(); bag = []; queue = []; hold = null; canHold = true; score = 0; lines = 0; level = 1; softOn = false;
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
    document.getElementById('overInfo').textContent = 'Score ' + fmtN(finalScore) + ' with ' + finalLines + ' lines (level ' + level + ').';
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
    // sideways: first move, then repeat after a short delay
    var dir = keys.left && !keys.right ? -1 : keys.right && !keys.left ? 1 : 0;
    if (dir !== lastDir) { lastDir = dir; dasT = 0; arrT = 0; if (dir) { move(dir); } }
    else if (dir) { dasT += dt; if (dasT > 0.17) { arrT += dt; while (arrT > 0.05) { arrT -= 0.05; move(dir); } } }
    // gravity (space = faster)
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

  // ------------------------------------------------------------------ drawing
  function drawPiece(m, ci, v, ox, oy, cell, alpha) {
    for (var y = 0; y < m.length; y++) { for (var x = 0; x < m[y].length; x++) { if (m[y][x]) { drawCell(ox + x * cell, oy + y * cell, ci, v + x + y * 3, alpha, cell / CELL); } } }
  }
  function previewPiece(type, cx, cy, cell, alpha) {
    var m = SHAPES[type], rows = [], cols = [];
    for (var y = 0; y < m.length; y++) { for (var x = 0; x < m[y].length; x++) { if (m[y][x]) { rows.push(y); cols.push(x); } } }
    var w = (Math.max.apply(null, cols) - Math.min.apply(null, cols) + 1) * cell, h = (Math.max.apply(null, rows) - Math.min.apply(null, rows) + 1) * cell;
    drawPiece(m, TYPES.indexOf(type), 3, cx - w / 2 - Math.min.apply(null, cols) * cell, cy - h / 2 - Math.min.apply(null, rows) * cell, cell, alpha);
  }
  function panel(x, y, w, h, title) {
    g.fillStyle = '#10142a'; g.fillRect(x, y, w, h); g.strokeStyle = '#6798C0'; g.lineWidth = 3; g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    g.fillStyle = '#FDD85D'; g.font = '700 15px "Shantell Sans", sans-serif'; g.textAlign = 'center'; g.fillText(title, x + w / 2, y + 22);
  }
  function draw() {
    var x, y;
    g.fillStyle = '#161a30'; g.fillRect(0, 0, cv.width, cv.height);
    // faint brick wall behind everything
    g.fillStyle = 'rgba(255,255,255,.035)';
    for (y = 0; y < cv.height; y += 18) { for (x = (y / 18) % 2 ? -20 : 0; x < cv.width; x += 40) { g.fillRect(x + 1, y + 1, 38, 16); } }
    // board
    g.fillStyle = '#0b0e1e'; g.fillRect(BX - 4, BY - 4, COLS * CELL + 8, ROWS * CELL + 8);
    g.strokeStyle = '#FDC921'; g.lineWidth = 3; g.strokeRect(BX - 3.5, BY - 3.5, COLS * CELL + 7, ROWS * CELL + 7);
    g.strokeStyle = 'rgba(153,214,234,.12)'; g.lineWidth = 1; g.beginPath();
    for (x = 1; x < COLS; x++) { g.moveTo(BX + x * CELL + 0.5, BY); g.lineTo(BX + x * CELL + 0.5, BY + ROWS * CELL); }
    for (y = 1; y < ROWS; y++) { g.moveTo(BX, BY + y * CELL + 0.5); g.lineTo(BX + COLS * CELL, BY + y * CELL + 0.5); }
    g.stroke();
    if (!grid) { return; }
    for (y = 0; y < ROWS; y++) { for (x = 0; x < COLS; x++) { var c = grid[y][x]; if (c) { drawCell(BX + x * CELL, BY + y * CELL, c.c, c.v, 1, 1); } } }
    if (cur && (mode === 'play' || mode === 'over')) {
      var gy = ghostY();
      if (mode === 'play') { drawPiece(cur.m, cur.ci, cur.v, BX + cur.x * CELL, BY + gy * CELL, CELL, 0.22); }
      var clipTop = BY; g.save(); g.beginPath(); g.rect(BX, clipTop, COLS * CELL, ROWS * CELL); g.clip();
      drawPiece(cur.m, cur.ci, cur.v, BX + cur.x * CELL, BY + cur.y * CELL, CELL, 1); g.restore();
    }
    if (mode === 'clear' && clearRows) {
      clearRows.forEach(function (r) { g.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(tick * 40)) + ')'; g.fillRect(BX, BY + r * CELL, COLS * CELL, CELL); });
    }
    // side panel
    panel(PX, BY - 4, 156, 96, 'HOLD');
    if (hold) { previewPiece(hold, PX + 78, BY + 50, 20, canHold ? 1 : 0.35); }
    panel(PX, BY + 108, 156, 232, 'NEXT');
    for (var i = 0; i < 3; i++) { previewPiece(queue[i] || 'I', PX + 78, BY + 160 + i * 62, i === 0 ? 20 : 16, 1); }
    g.textAlign = 'left'; g.fillStyle = '#f2f2f2'; g.font = '700 17px "Shantell Sans", sans-serif';
    g.fillStyle = '#99D6EA'; g.fillText('SCORE', PX, BY + 372); g.fillStyle = '#fff'; g.font = '700 24px "Shantell Sans", sans-serif'; g.fillText(fmtN(score), PX, BY + 400);
    g.fillStyle = '#99D6EA'; g.font = '700 17px "Shantell Sans", sans-serif'; g.fillText('LEVEL', PX, BY + 436); g.fillStyle = '#fff'; g.font = '700 22px "Shantell Sans", sans-serif'; g.fillText(String(level), PX, BY + 462);
    g.fillStyle = '#99D6EA'; g.font = '700 17px "Shantell Sans", sans-serif'; g.fillText('LINES', PX + 80, BY + 436); g.fillStyle = '#fff'; g.font = '700 22px "Shantell Sans", sans-serif'; g.fillText(String(lines), PX + 80, BY + 462);
    var next = [1000, 2500, 5000, 8000, 12000].filter(function (t) { return score < t; })[0];
    g.fillStyle = '#FDD85D'; g.font = '700 13px "Shantell Sans", sans-serif';
    g.fillText(next ? 'Next fan point: ' + fmtN(next) : 'All 15 fan points!', PX, BY + 494);
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
    if (k === 'left' || k === 'right' || k === 'soft') { keys[k] = true; return; }
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

  // ------------------------------------------------------------------ certificate (drawn in the browser, nothing stored)
  document.getElementById('certBtn').addEventListener('click', function () {
    var load = document.fonts && document.fonts.load ? document.fonts.load('20px "Myfont"') : Promise.resolve();
    load.catch(function () {}).then(function () { makeCertificate(me.name || 'Block Builder', finalScore, finalLines); });
  });
  function makeCertificate(name, sc, ln) {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 850;
    var x = c.getContext('2d');
    x.fillStyle = '#FFFDF7'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#FDC921'; x.fillRect(0, 0, c.width, 36); x.fillRect(0, c.height - 36, c.width, 36);
    x.fillStyle = '#99D6EA'; x.fillRect(0, 36, c.width, 14); x.fillRect(0, c.height - 50, c.width, 14);
    x.strokeStyle = '#1E3248'; x.lineWidth = 6; x.strokeRect(50, 70, c.width - 100, c.height - 140);
    x.textAlign = 'center'; x.fillStyle = '#1E3248';
    var pix = '"Myfont", "DM Sans", sans-serif';
    x.font = '56px ' + pix; x.fillText('CERTIFICATE', c.width / 2, 190);
    x.font = '34px ' + pix; x.fillText('OF BLOCK BUILDING', c.width / 2, 245);
    x.font = '20px sans-serif'; x.fillText('This certifies that', c.width / 2, 330);
    var size = 84; x.font = size + 'px ' + pix;
    while (x.measureText(name).width > c.width - 260 && size > 20) { size -= 2; x.font = size + 'px ' + pix; }
    x.fillStyle = '#6798C0'; x.fillText(name, c.width / 2, 420);
    x.fillStyle = '#1E3248'; x.font = '20px sans-serif';
    x.fillText('stacked, turned and cleared the blocks like a champion in Leah\'s Blocks,', c.width / 2, 490);
    x.fillText('clearing ' + ln + ' lines on the way.', c.width / 2, 522);
    x.font = '44px ' + pix; x.fillStyle = '#6798C0'; x.fillText('Score: ' + fmtN(sc), c.width / 2, 590);
    for (var i = 0; i < 7; i++) { var s = cellSprite(i, 3); x.drawImage(s, 600 - 7 * 38 / 2 + i * 38, 620, 32, 32); }
    x.fillStyle = '#1E3248'; x.font = '24px ' + pix;
    x.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), c.width / 2, 712);
    x.fillText('livedbyleah.com', c.width / 2, 748);
    c.toBlob(function (blob) {
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'blocks-certificate.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  }

  // Test hook: only when the page is opened with ?debug=1
  if (/[?&]debug=1/.test(location.search)) {
    window.__blocks = {
      info: function () { return { mode: mode, score: score, lines: lines, level: level, cur: cur && { t: cur.t, x: cur.x, y: cur.y }, hold: hold, queue: queue && queue.slice(), grid: grid && grid.map(function (r) { return r.map(function (c) { return c ? 1 : 0; }).join(''); }) }; },
      start: beginRun, end: function (sc, ln) { score = sc; lines = ln; level = 1 + Math.floor(ln / 10); gameOver(); },
      setGrid: function (rows) { rows.forEach(function (str, i) { var y = ROWS - rows.length + i; for (var x = 0; x < COLS; x++) { grid[y][x] = str[x] === '1' ? { c: 0, v: x & 7 } : null; } }); },
      setPiece: function (t) { cur = mkPiece(t); }
    };
  }

  grid = newGrid(); bag = []; queue = []; score = 0; lines = 0; level = 1; hud();
  loadHof();
  requestAnimationFrame(loop);
})();

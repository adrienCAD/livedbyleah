// Surf Cleanup: a small 8-bit side-scrolling game. Leah's surfer art is assets/img/surfer.png; items are placeholder pixel maps.
(function () {
  'use strict';

  var canvas = document.getElementById('gameCanvas');
  if (!canvas) { return; }
  var ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  var W = canvas.width, H = canvas.height;     // 640 x 360 view
  var WORLD = 3800;                            // level length in pixels
  var BASE_Y = 262;                            // average water line
  var SC = 2;                                  // surfer art scale
  var PX = 3;                                  // pixel scale for sprites

  var COLORS = {
    H: '#4A2C1A', S: '#E0A47A', E: '#1E3248', Y: '#FDC921',
    P: '#F4A3B5', W: '#FFFDF7', G: '#4E9A5B', D: '#2F6B3A', C: '#B8C2CC', K: '#7A8691'
  };

  var LEAH = [
    '..HHHH..',
    '.HHHHHH.',
    '.HSSSSH.',
    '.HSESEH.',
    '..SSSS..',
    '..YYYY..',
    '.SYYYYS.',
    '..YYYY..',
    '..S..S..',
    '..S..S..'
  ];
  var SHELL = [
    '..PPP..',
    '.PWPWP.',
    'PWPWPWP',
    'PPPPPPP',
    '.PPPPP.'
  ];
  var BOTTLE = [
    '..G..',
    '..G..',
    '.GGG.',
    '.GDG.',
    '.GGG.',
    '.GDG.',
    '.GGG.'
  ];
  var CAN = [
    '.CCCC.',
    'CWWWWC',
    'CCCCCC',
    'CKKKKC',
    'CCCCCC',
    '.CCCC.'
  ];

  var SURFER = new Image();
  SURFER.src = '/assets/img/surfer.png';

  var keys = { left: false, right: false, jump: false };
  var state = 'start';
  var t = 0;
  var player, items, camX, collected, lastTime;

  var el = {
    start: document.getElementById('gameStart'),
    win: document.getElementById('gameWin'),
    shells: document.getElementById('hudShells'),
    trash: document.getElementById('hudTrash'),
    name: document.getElementById('playerName')
  };

  function surface(x) {
    return BASE_Y + Math.sin(x * 0.018 + t * 0.045) * 9 + Math.sin(x * 0.007 - t * 0.02) * 12;
  }

  function sprite(map, x, y, scale) {
    for (var r = 0; r < map.length; r++) {
      for (var c = 0; c < map[r].length; c++) {
        var ch = map[r].charAt(c);
        if (ch === '.') { continue; }
        ctx.fillStyle = COLORS[ch];
        ctx.fillRect(Math.round(x + c * scale), Math.round(y + r * scale), scale, scale);
      }
    }
  }

  function reset() {
    player = { x: 120, y: BASE_Y - 40, vx: 0, vy: 0, grounded: true, face: 1, land: 0 };
    camX = 0;
    t = 0;
    collected = { shell: 0, trash: 0 };
    items = [];
    var heights = [22, 48, 74];
    var n = 10;
    for (var i = 0; i < n * 2; i++) {
      var kind = i % 2 === 0 ? 'shell' : (i % 4 === 1 ? 'bottle' : 'can');
      items.push({
        kind: kind,
        x: 380 + i * ((WORLD - 560) / (n * 2 - 1)),
        h: heights[(i * 7 + 1) % 3],
        got: false
      });
    }
    updateHud();
  }

  function totals() {
    var s = 0, tr = 0;
    items.forEach(function (it) { if (it.kind === 'shell') { s++; } else { tr++; } });
    return { shell: s, trash: tr };
  }

  function updateHud() {
    var tt = totals();
    el.shells.textContent = 'Shells ' + collected.shell + '/' + tt.shell;
    el.trash.textContent = 'Trash ' + collected.trash + '/' + tt.trash;
  }

  function step(k) {
    var accel = 0.5, maxV = 4.2;
    if (keys.left) { player.vx -= accel * k; }
    if (keys.right) { player.vx += accel * k; }
    if (!keys.left && !keys.right) { player.vx *= Math.pow(0.9, k); }
    player.vx = Math.max(-maxV, Math.min(maxV, player.vx));
    player.x = Math.max(20, Math.min(WORLD - 40, player.x + player.vx * k));
    if (player.vx > 0.4) { player.face = 1; } else if (player.vx < -0.4) { player.face = -1; }
    if (player.land > 0) { player.land -= k; }

    var surf = surface(player.x) - 6;           // board sits slightly above the water line
    if (keys.jump && player.grounded) {
      player.vy = -8.2;
      player.grounded = false;
    }
    if (!player.grounded) {
      player.vy += 0.42 * k;
      player.y += player.vy * k;
      if (player.y >= surf && player.vy > 0) {
        player.y = surf;
        player.vy = 0;
        player.grounded = true;
        player.land = 8;
      }
    } else {
      player.y = surf;
    }

    camX = Math.max(0, Math.min(WORLD - W, player.x - 220));

    var cx = player.x + 19, cy = player.y - 40;
    items.forEach(function (it) {
      if (it.got) { return; }
      var ix = it.x + 10, iy = BASE_Y - it.h;
      var dx = cx - ix, dy = cy - iy;
      if (dx * dx + dy * dy < 36 * 36) {
        it.got = true;
        collected[it.kind === 'shell' ? 'shell' : 'trash']++;
        updateHud();
      }
    });

    var tt = totals();
    if (collected.shell === tt.shell && collected.trash === tt.trash) {
      state = 'win';
      el.win.hidden = false;
    }
  }

  function drawSky() {
    var bands = ['#9BDBF0', '#A9E0F3', '#B8E6F6', '#C8ECF8', '#D8F2FA'];
    ctx.fillStyle = '#D8F2FA';
    ctx.fillRect(0, 0, W, H);   // clear the whole frame so nothing smears behind the waves
    for (var i = 0; i < bands.length; i++) {
      ctx.fillStyle = bands[i];
      ctx.fillRect(0, i * 48, W, 48);
    }
    // sun
    ctx.fillStyle = '#FDC921';
    ctx.fillRect(500, 36, 48, 48);
    ctx.fillStyle = '#FDD85D';
    ctx.fillRect(508, 28, 32, 8);
    ctx.fillRect(508, 84, 32, 8);
    ctx.fillRect(492, 44, 8, 32);
    ctx.fillRect(548, 44, 8, 32);
    // clouds (slow parallax)
    ctx.fillStyle = '#FFFDF7';
    for (var c = 0; c < 6; c++) {
      var cxp = ((c * 340 - camX * 0.25) % (W + 200) + (W + 200)) % (W + 200) - 100;
      var cyp = 40 + (c % 3) * 34;
      ctx.fillRect(cxp, cyp, 60, 12);
      ctx.fillRect(cxp + 12, cyp - 10, 36, 10);
    }
    // far horizon
    ctx.fillStyle = '#6798C0';
    ctx.fillRect(0, 205, W, 8);
  }

  function drawWater() {
    for (var sx = 0; sx < W; sx += 4) {
      var wx = sx + camX;
      var top = Math.round(surface(wx));
      ctx.fillStyle = '#99D6EA';
      ctx.fillRect(sx, top - 4, 4, 4);
      ctx.fillStyle = '#6EB3D6';
      ctx.fillRect(sx, top, 4, 22);
      ctx.fillStyle = '#6798C0';
      ctx.fillRect(sx, top + 22, 4, H - top - 22);
    }
  }

  function drawItems() {
    items.forEach(function (it) {
      if (it.got) { return; }
      var sx = it.x - camX;
      if (sx < -30 || sx > W + 30) { return; }
      var bob = Math.round(Math.sin(t * 0.08 + it.x) * 3);
      var y = BASE_Y - it.h + bob;
      if (it.kind === 'shell') { sprite(SHELL, sx, y - 8, 3); }
      else if (it.kind === 'bottle') { sprite(BOTTLE, sx, y - 12, 3); }
      else { sprite(CAN, sx, y - 9, 3); }
    });
  }

  function drawPlayer() {
    var sx = player.x - camX;
    var tilt = player.grounded ? Math.round(player.vx) : 0;
    // Leah's pixel art at 2x. Mirrors when she heads left; squash/stretch + lean give it life.
    if (SURFER.complete && SURFER.naturalWidth) {
      var w = SURFER.naturalWidth * SC, h = SURFER.naturalHeight * SC;
      var air = !player.grounded;
      var stretch = air ? 1 + Math.min(0.12, Math.abs(player.vy) * 0.015) : 1;
      var squash = player.land > 0 ? 1 - 0.1 * (player.land / 8) : 1;
      var sy = stretch * squash, sxs = (2 - sy) > 1.05 ? 1.05 : (2 - sy);
      var bob = player.grounded ? Math.sin(t * 0.18) * 1.5 : 0;
      var lean = player.grounded ? player.vx * 0.012 : player.vy * 0.012 * player.face;
      ctx.save();
      ctx.translate(Math.round(sx + 19), Math.round(player.y + 12 + bob));   // board bottom-centre
      ctx.rotate(lean);
      ctx.scale(player.face * sxs, sy);
      ctx.drawImage(SURFER, -w / 2, -h, w, h);
      ctx.restore();
    }
  }

  function draw() {
    drawSky();
    drawWater();
    drawItems();
    drawPlayer();
  }

  function loop(now) {
    if (!lastTime) { lastTime = now; }
    var k = Math.min(3, (now - lastTime) / 16.667);
    lastTime = now;
    t += k;
    if (state === 'play') { step(k); }
    draw();
    requestAnimationFrame(loop);
  }

  // ---- Input ----
  var keyMap = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump'
  };
  window.addEventListener('keydown', function (e) {
    var m = keyMap[e.key];
    if (!m || state !== 'play') { return; }
    keys[m] = true;
    e.preventDefault();
  });
  window.addEventListener('keyup', function (e) {
    var m = keyMap[e.key];
    if (m) { keys[m] = false; }
  });
  document.querySelectorAll('#touch button').forEach(function (b) {
    var k = b.getAttribute('data-key');
    function on(e) { keys[k] = true; e.preventDefault(); }
    function off(e) { keys[k] = false; e.preventDefault(); }
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
  });

  function begin() {
    reset();
    keys.left = keys.right = keys.jump = false;
    el.start.hidden = true;
    el.win.hidden = true;
    state = 'play';
  }
  document.getElementById('startBtn').addEventListener('click', begin);
  document.getElementById('againBtn').addEventListener('click', begin);

  // ---- Certificate (drawn in the browser, nothing is sent or stored) ----
  document.getElementById('certBtn').addEventListener('click', function () {
    var name = (el.name.value || '').trim() || 'Beach Hero';
    var load = document.fonts && document.fonts.load ? document.fonts.load('20px "Myfont"') : Promise.resolve();
    load.catch(function () {}).then(function () { makeCertificate(name); });
  });

  function makeCertificate(name) {
    var c = document.createElement('canvas');
    c.width = 1200; c.height = 850;
    var g = c.getContext('2d');
    g.fillStyle = '#FFFDF7'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#FDC921'; g.fillRect(0, 0, c.width, 36); g.fillRect(0, c.height - 36, c.width, 36);
    g.fillStyle = '#99D6EA'; g.fillRect(0, 36, c.width, 14); g.fillRect(0, c.height - 50, c.width, 14);
    g.strokeStyle = '#1E3248'; g.lineWidth = 6; g.strokeRect(50, 70, c.width - 100, c.height - 140);
    g.textAlign = 'center'; g.fillStyle = '#1E3248';
    var pix = '"Myfont", "DM Sans", sans-serif';
    g.font = '56px ' + pix; g.fillText('CERTIFICATE', c.width / 2, 190);
    g.font = '34px ' + pix; g.fillText('OF BEACH CLEANUP', c.width / 2, 245);
    g.font = '20px sans-serif'; g.fillText('This certifies that', c.width / 2, 340);
    var size = 84;
    g.font = size + 'px ' + pix;
    while (g.measureText(name).width > c.width - 260 && size > 20) { size -= 2; g.font = size + 'px ' + pix; }
    g.fillStyle = '#6798C0'; g.fillText(name, c.width / 2, 430);
    g.fillStyle = '#1E3248'; g.font = '20px sans-serif';
    g.fillText('collected every seashell and picked up every piece of trash', c.width / 2, 510);
    g.fillText('in Leah\'s Surf Cleanup game.', c.width / 2, 545);
    // Leah's surfer pixel art
    if (SURFER.complete && SURFER.naturalWidth) {
      g.imageSmoothingEnabled = false;
      g.drawImage(SURFER, c.width / 2 - SURFER.naturalWidth, 565, SURFER.naturalWidth * 2, SURFER.naturalHeight * 2);
    }
    g.fillStyle = '#1E3248'; g.font = '24px ' + pix;
    g.fillText(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), c.width / 2, 712);
    g.fillText('livedbyleah.com', c.width / 2, 748);
    c.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'surf-cleanup-certificate.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }, 'image/png');
  }

  reset();
  requestAnimationFrame(loop);
})();

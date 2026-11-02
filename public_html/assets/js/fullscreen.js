// Full screen for every game. Real fullscreen where the browser allows it (laptops, Android, iPad);
// on iPhone it fills the whole screen instead (the site menu is hidden). Esc or the X button leaves.
(function () {
  var game = document.getElementById('game');
  var cv = document.getElementById('gameCanvas');
  if (!game || !cv) { return; }
  var ratio = cv.width / cv.height;
  var on = false, native = false;

  var bar = document.createElement('div');
  bar.className = 'fs-bar';
  var open = document.createElement('button');
  open.type = 'button'; open.className = 'btn ghost fs-open'; open.textContent = 'Full screen';
  open.setAttribute('aria-label', 'Play full screen');
  bar.appendChild(open);
  game.parentNode.insertBefore(bar, game);

  var close = document.createElement('button');
  close.type = 'button'; close.className = 'fs-close'; close.textContent = '✕';
  close.setAttribute('aria-label', 'Leave full screen');
  game.appendChild(close);

  function fit() {
    if (!on) { cv.style.width = ''; cv.style.height = ''; return; }
    var touch = game.querySelector('.touch');
    var th = touch && touch.offsetParent !== null ? touch.offsetHeight : 0;
    var aw = window.innerWidth, ah = window.innerHeight - th;
    var w = Math.min(aw, ah * ratio), h = w / ratio;
    cv.style.width = Math.floor(w) + 'px'; cv.style.height = Math.floor(h) + 'px';
  }
  function set(v) {
    on = v;
    game.classList.toggle('fs', v);
    document.documentElement.classList.toggle('fs-lock', v);
    open.textContent = v ? 'Exit full screen' : 'Full screen';
    fit();
    window.scrollTo(0, 0);
  }
  function enter() {
    var rf = game.requestFullscreen || game.webkitRequestFullscreen;
    set(true);
    if (rf) {
      try {
        var p = rf.call(game);
        native = true;
        if (p && p.catch) { p.catch(function () { native = false; }); }
      } catch (e) { native = false; }
    }
    try { if (screen.orientation && screen.orientation.lock) { screen.orientation.lock('landscape').catch(function () {}); } } catch (e) {}
  }
  function leave() {
    var fe = document.fullscreenElement || document.webkitFullscreenElement;
    if (fe) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
    native = false;
    set(false);
    try { if (screen.orientation && screen.orientation.unlock) { screen.orientation.unlock(); } } catch (e) {}
  }
  open.addEventListener('click', function () { if (on) { leave(); } else { enter(); } });
  close.addEventListener('click', leave);
  function sync() {   // user pressed Esc in real fullscreen
    var fe = document.fullscreenElement || document.webkitFullscreenElement;
    if (native && !fe && on) { native = false; set(false); }
  }
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 150); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && on && !native) { leave(); } });
})();

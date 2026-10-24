// Mobile menu and click-to-play YouTube embeds.
(function () {
  var btn = document.getElementById('menuBtn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = document.body.classList.toggle('menu-open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Close' : 'Menu';
    });
  }

  // Load the player only when someone taps the thumbnail (faster page, fewer trackers).
  document.querySelectorAll('.vlog-thumb[data-yt]').forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      var id = thumb.getAttribute('data-yt');
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) { return; }
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
      frame.title = thumb.getAttribute('aria-label') || 'Vlog';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      thumb.replaceWith(frame);
    });
  });
})();

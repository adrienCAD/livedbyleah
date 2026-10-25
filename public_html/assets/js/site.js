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

  // Drawer under a vlog: Leah's blurb + top comments. Opens as a full-width row under the card's row.
  var openDrawer = null, openBtn = null;
  function closeDrawer() {
    if (openDrawer) { openDrawer.remove(); }
    if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); }
    openDrawer = openBtn = null;
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined) { n.textContent = text; }
    return n;
  }
  function commentList(title, list, empty) {
    var box = el('div', 'cgroup');
    box.appendChild(el('h3', '', title));
    if (!list.length) { box.appendChild(el('p', 'hint', empty)); return box; }
    list.forEach(function (c) {
      var q = el('blockquote', 'comment');
      q.appendChild(el('p', '', c.body));
      var by = c.author + (c.likes > 0 ? ' \u00b7 ' + c.likes + (c.likes === 1 ? ' like' : ' likes') : '');
      q.appendChild(el('footer', '', by));
      box.appendChild(q);
    });
    return box;
  }
  document.querySelectorAll('.drawer-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wasOpen = openBtn === btn;
      closeDrawer();
      if (wasOpen) { return; }
      var card = btn.closest('.vlog');
      var tpl = document.getElementById('drawerTpl').content.firstElementChild.cloneNode(true);
      // place after the last card that sits on the same row as this one
      var anchor = card, top = card.offsetTop, n = card.nextElementSibling;
      while (n && n.classList.contains('vlog') && n.offsetTop === top) { anchor = n; n = n.nextElementSibling; }
      anchor.after(tpl);
      openDrawer = tpl; openBtn = btn;
      btn.setAttribute('aria-expanded', 'true');
      tpl.querySelector('.drawer-close').addEventListener('click', closeDrawer);
      tpl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      var body = tpl.querySelector('.drawer-body');
      fetch('/api/comments.php?id=' + encodeURIComponent(btn.getAttribute('data-vlog')))
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (openDrawer !== tpl) { return; }
          body.textContent = '';
          body.appendChild(el('h3', '', 'My thought process'));
          body.appendChild(el('p', 'why', d.why || 'Leah has not added a note for this vlog yet.'));
          var cols = el('div', 'cols');
          cols.appendChild(commentList('YouTube', d.youtube, 'No comments yet.'));
          cols.appendChild(commentList('TikTok', d.tiktok, 'Leah has not picked any yet.'));
          cols.appendChild(commentList('Instagram', d.instagram, 'Leah has not picked any yet.'));
          body.appendChild(cols);
        })
        .catch(function () { body.textContent = 'Could not load this right now. Try again in a moment.'; });
    });
  });
})();

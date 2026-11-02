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

  // "Show top 10" buttons (Hall of Fame).
  document.querySelectorAll('[data-more]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = document.getElementById(b.getAttribute('data-more'));
      if (!box) { return; }
      var open = box.classList.toggle('open');
      b.textContent = b.getAttribute(open ? 'data-close' : 'data-open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

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
  // One feed, YouTube/Instagram style: round avatar, bold name, small source link, time, text, likes.
  var SRC = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', fan: 'Fan Club' };
  function hue(name) { var h = 0; for (var i = 0; i < name.length; i++) { h = (h * 31 + name.charCodeAt(i)) % 360; } return h; }
  function commentItem(c, links) {
    var row = el('div', 'yc');
    var av = el('span', 'yc-av', (c.author || '?').charAt(0).toUpperCase());
    av.style.background = 'hsl(' + hue(c.author || '') + ', 55%, 42%)';
    row.appendChild(av);
    var main = el('div', 'yc-main');
    var head = el('div', 'yc-head');
    head.appendChild(el('strong', '', c.author));
    var url = links[c.source];
    if (c.source === 'fan') { head.appendChild(el('span', 'yc-src fan', 'Fan'));
    } else if (url) {
      var a = el('a', 'yc-src', SRC[c.source]); a.href = url; a.target = '_blank'; a.rel = 'noopener'; head.appendChild(a);
    } else { head.appendChild(el('span', 'yc-src', SRC[c.source] || c.source)); }
    head.appendChild(el('span', 'yc-ago', c.ago));
    main.appendChild(head);
    main.appendChild(el('p', 'yc-text', c.body));
    if (c.likes > 0) { main.appendChild(el('span', 'yc-likes', '\u2665 ' + c.likes)); }
    row.appendChild(main);
    return row;
  }
  function wireForm(form, vlogId, onPosted) {
    form.querySelector('[name=vlog]').value = vlogId;
    var msg = form.querySelector('.cform-msg'), btn = form.querySelector('button');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      btn.disabled = true; msg.textContent = '';
      fetch(form.action, { method: 'POST', body: new FormData(form) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          msg.textContent = d.msg || '';
          msg.className = 'hint cform-msg ' + (d.ok ? 'ok' : 'bad');
          if (d.ok) { form.querySelector('textarea').value = ''; if (onPosted) { onPosted(); } }
        })
        .catch(function () { msg.textContent = 'Could not send that right now. Try again.'; msg.className = 'hint cform-msg bad'; })
        .then(function () { btn.disabled = false; });
    });
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
          body.appendChild(el('h3', '', 'Comments'));
          var fTpl = document.getElementById('cformTpl');
          if (fTpl) {
            var fc = fTpl.content.cloneNode(true), f = fc.querySelector('form');
            if (f) { wireForm(f, btn.getAttribute('data-vlog')); }
            body.appendChild(fc);
          }
          var feed = el('div', 'yc-feed');
          if (!d.comments.length) { feed.appendChild(el('p', 'hint', 'No comments yet. Be the first!')); }
          d.comments.forEach(function (c) { feed.appendChild(commentItem(c, d.links)); });
          body.appendChild(feed);
        })
        .catch(function () { body.textContent = 'Could not load this right now. Try again in a moment.'; });
    });
  });
})();

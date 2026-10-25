// Fans tab: live fan counter, screenshot form helpers (vlog list per platform, shrink big images).
(function () {
  var cnt = document.getElementById('fanCount'), lab = document.getElementById('fanLabel');
  function poll() {
    fetch('/api/fans-count.php', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (typeof d.count === 'number') { cnt.textContent = d.count; if (lab) { lab.textContent = d.count === 1 ? 'fan' : 'fans'; } }
      }).catch(function () {});
  }
  if (cnt) { setInterval(function () { if (!document.hidden) { poll(); } }, 20000); }

  var form = document.getElementById('proofForm');
  if (!form) { return; }
  var plat = document.getElementById('pf'), kind = document.getElementById('pk'), vlog = document.getElementById('pv'),
      vlabel = document.getElementById('pvLabel'), file = document.getElementById('ps');

  // Only offer vlogs that exist on the chosen platform; hide the vlog picker for follows.
  function sync() {
    var isFollow = kind.value === 'follow';
    vlog.hidden = vlabel.hidden = isFollow;
    vlog.disabled = isFollow;
    var first = null;
    Array.prototype.forEach.call(vlog.options, function (o) {
      var ok = o.getAttribute('data-' + plat.value) === '1';
      o.hidden = o.disabled = !ok;
      if (ok && !first) { first = o; }
    });
    if (vlog.selectedOptions[0] && vlog.selectedOptions[0].disabled && first) { vlog.value = first.value; }
  }
  plat.addEventListener('change', sync);
  kind.addEventListener('change', sync);
  sync();

  // Phones: two clear buttons (photo library / camera). Both fill the normal file field.
  var btns = document.getElementById('shotBtns'), cam = document.getElementById('pcam'), nm = document.getElementById('shotName');
  if (btns && cam && window.DataTransfer) {
    btns.hidden = false; file.style.display = 'none';
    document.getElementById('pickPhoto').addEventListener('click', function () { file.click(); });
    document.getElementById('takePhoto').addEventListener('click', function () { cam.click(); });
    cam.addEventListener('change', function () {
      if (!cam.files || !cam.files[0]) { return; }
      var dt = new DataTransfer(); dt.items.add(cam.files[0]); file.files = dt.files;
      file.dispatchEvent(new Event('change'));
    });
    file.addEventListener('change', function () { if (nm) { nm.textContent = file.files[0] ? 'Selected: ' + file.files[0].name : ''; } });
  }

  // Phone screenshots can be several MB and many hosts cap uploads at 2 MB, so shrink them first.
  file.addEventListener('change', function () {
    var f = file.files && file.files[0];
    if (!f || f.size <= 900 * 1024 || !window.DataTransfer || !f.type.match(/^image\//)) { return; }
    var img = new Image(), url = URL.createObjectURL(f);
    img.onload = function () {
      var max = 1600, sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      var c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(function (blob) {
        URL.revokeObjectURL(url);
        if (!blob) { return; }
        var dt = new DataTransfer();
        dt.items.add(new File([blob], 'screenshot.jpg', { type: 'image/jpeg' }));
        file.files = dt.files;
      }, 'image/jpeg', 0.82);
    };
    img.onerror = function () { URL.revokeObjectURL(url); };
    img.src = url;
  });
})();

<?php
// Admin: site settings. For now just the YouTube API key used to load comments.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $key = trim((string)($_POST['youtube_api_key'] ?? ''));
    if ($key !== '' && !preg_match('/^[A-Za-z0-9_-]{20,80}$/', $key)) {
        flash('That does not look like an API key. Copy it again from Google.');
    } elseif (($_POST['action'] ?? '') === 'clear') {
        set_setting('youtube_api_key', '');
        flash('YouTube key removed.');
    } elseif ($key !== '') {
        set_setting('youtube_api_key', $key);
        db()->exec('UPDATE vlogs SET yt_fetched = 0');   // fetch comments again on next visit
        flash('YouTube key saved. Comments will load the next time someone opens a vlog drawer.');
    }
    redirect('/admin/settings.php');
}

$has = setting('youtube_api_key') !== '';
admin_header('Settings');
?>
<h1>Settings</h1>
<h2>YouTube comments</h2>
<p>Status: <strong><?= $has ? 'key saved' : 'no key yet' ?></strong>. The key is stored privately on the server and never shown on the site.</p>
<form method="post" class="form">
  <?= csrf_field() ?>
  <label for="youtube_api_key">YouTube Data API key</label>
  <input id="youtube_api_key" name="youtube_api_key" autocomplete="off" placeholder="<?= $has ? 'Saved. Paste a new key to replace it.' : 'Paste the key here' ?>">
  <div class="row"><button class="btn" type="submit">Save key</button></div>
</form>
<?php if ($has): ?>
<form method="post" class="form"><?= csrf_field() ?><input type="hidden" name="action" value="clear">
  <button class="link-danger" type="submit">Remove saved key</button></form>
<?php endif; ?>
<?php admin_footer(); ?>

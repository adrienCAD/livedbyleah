<?php
// Admin: site settings. For now just the YouTube API key used to load comments.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require __DIR__ . '/../inc/fans.php';
require __DIR__ . '/../inc/google.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    if (($_POST['action'] ?? '') === 'demo_add') {
        $n = demo_add();
        flash($n ? 'Added ' . $n . ' demo fans with scores.' : 'Demo fans are already there.');
        redirect('/admin/settings.php');
    }
    if (($_POST['action'] ?? '') === 'demo_remove') {
        flash('Removed ' . demo_remove() . ' demo fans and their scores.');
        redirect('/admin/settings.php');
    }
    if (($_POST['action'] ?? '') === 'google') {
        $cid = trim((string)($_POST['google_client_id'] ?? ''));
        $sec = trim((string)($_POST['google_client_secret'] ?? ''));
        if ($sec === '') { $sec = setting('google_client_secret'); }   // keep the saved secret when only the ID changes
        if (!empty($_POST['off'])) {
            set_setting('google_client_id', ''); set_setting('google_client_secret', '');
            flash('Google sign-in is off.');
        } elseif (!preg_match('/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/', $cid) || !preg_match('/^[A-Za-z0-9_-]{20,80}$/', $sec)) {
            flash('That does not look right. Copy the Client ID (ends in .apps.googleusercontent.com) and the Client secret again from Google.');
        } else {
            set_setting('google_client_id', $cid); set_setting('google_client_secret', $sec);
            flash('Google sign-in is on. Fans now see "Continue with Google".');
        }
        redirect('/admin/settings.php');
    }
    if (($_POST['action'] ?? '') === 'games') {
        set_setting('game_blocks_public', !empty($_POST['blocks_public']) ? '1' : '0');
        flash(!empty($_POST['blocks_public']) ? 'Bake Off is now open to everyone.' : 'Bake Off is hidden. Only Leah and the admins can see it.');
        redirect('/admin/settings.php');
    }
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
<h2>Google sign-in for fans</h2>
<p>Status: <strong><?= google_enabled() ? 'on' : 'off' ?></strong>. Fans can join and log in with their Google account. Admins always log in with a password.</p>
<details><summary>How to get the Client ID and secret (10 minutes)</summary>
<ol>
  <li>Go to <strong>console.cloud.google.com</strong> (Google's official site) and sign in. Create a project called "Lived by Leah".</li>
  <li>APIs &amp; Services &gt; OAuth consent screen: choose External, app name "Lived by Leah", your email, then add the scopes email, profile and openid. Publish the app.</li>
  <li>APIs &amp; Services &gt; Credentials &gt; Create credentials &gt; OAuth client ID &gt; Web application.</li>
  <li>Under "Authorized redirect URIs", add exactly: <code><?= e(google_redirect_uri()) ?></code></li>
  <li>Copy the Client ID and Client secret into the form below.</li>
</ol></details>
<form method="post" class="form"><?= csrf_field() ?><input type="hidden" name="action" value="google">
  <label for="gcid">Client ID</label>
  <input id="gcid" name="google_client_id" autocomplete="off" value="<?= e(setting('google_client_id')) ?>" placeholder="1234-abc.apps.googleusercontent.com">
  <label for="gsec">Client secret</label>
  <input id="gsec" name="google_client_secret" autocomplete="off" placeholder="<?= google_enabled() ? 'Saved. Paste it again to change it.' : 'Paste the secret here' ?>">
  <div class="row"><button class="btn" type="submit">Save</button><?php if (google_enabled()): ?> <button class="link-danger" type="submit" name="off" value="1">Turn Google sign-in off</button><?php endif; ?></div>
</form>
<h2>Games</h2>
<form method="post" class="form"><?= csrf_field() ?><input type="hidden" name="action" value="games">
  <label><input type="checkbox" name="blocks_public" value="1" style="width:auto"<?= game_public('blocks') ? ' checked' : '' ?>> Show Bake Off to everyone</label>
  <p class="hint">When unticked, Bake Off is hidden from visitors and fans (card, game page and hall of fame). Leah and the admins can still play it. Scores already saved are kept.</p>
  <div class="row"><button class="btn" type="submit">Save</button></div>
</form>
<h2>Demo fans (for the launch)</h2>
<p>Fake fans with fake scores so the site does not look empty on day one. They cannot log in. Status: <strong><?= demo_count() ?> demo fans</strong>. Remove them whenever real fans have joined.</p>
<form method="post" class="form"><?= csrf_field() ?><input type="hidden" name="action" value="demo_add">
  <button class="btn" type="submit"<?= demo_count() ? ' disabled' : '' ?>>Add demo fans</button></form>
<?php if (demo_count()): ?>
<form method="post" class="form" onsubmit="return confirm('Remove all demo fans and their scores? Real fans are not touched.');"><?= csrf_field() ?><input type="hidden" name="action" value="demo_remove">
  <button class="link-danger" type="submit">Remove all demo fans</button></form>
<?php endif; ?>
<?php admin_footer(); ?>

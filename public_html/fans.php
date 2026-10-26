<?php
// Tab 3: Fans. Join, log in, confirm email, reset password, choose a username.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/fans.php';

$errors = [];
$view = (string)($_GET['v'] ?? '');          // '' (login/profile) | join | forgot
$resetToken = (string)($_GET['reset'] ?? '');
$confirmToken = (string)($_GET['confirm'] ?? '');
$old = [];

// ---- Email confirmation link
if ($confirmToken !== '' && preg_match('/^[a-f0-9]{40}$/', $confirmToken)) {
    $st = db()->prepare('SELECT id FROM fans WHERE confirm_hash = ?');
    $st->execute([hash('sha256', $confirmToken)]);
    if ($id = $st->fetchColumn()) {
        db()->prepare('UPDATE fans SET confirmed = 1, confirm_hash = NULL WHERE id = ?')->execute([$id]);
        flash('Email confirmed. You can log in now.');
    } else {
        flash('That confirmation link is not valid any more. Log in to get a new one.');
    }
    redirect('/fans.php');
}

// ---- Form actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = (string)($_POST['action'] ?? '');
    $email = strtolower(trim((string)($_POST['email'] ?? '')));

    if ($action === 'join') {
        $view = 'join';
        $first = trim((string)preg_replace('/\s+/u', ' ', (string)($_POST['first_name'] ?? '')));
        $last = trim((string)preg_replace('/\s+/u', ' ', (string)($_POST['last_name'] ?? '')));
        $initial = mb_strtoupper(mb_substr($last, 0, 1));
        $pass = (string)($_POST['password'] ?? '');
        $old = ['first_name' => $first, 'last_name' => $last, 'email' => $email];
        if (empty($_POST['age13'])) {
            $errors[] = 'You need to be 13 or older to join the fan club.';
        }
        if (!preg_match('/^[\p{L}][\p{L} .\'-]{0,19}$/u', $first)) {
            $errors[] = 'Enter your first name (letters only, up to 20).';
        }
        if (!preg_match('/^[\p{L}][\p{L} .\'-]{0,29}$/u', $last)) {
            $errors[] = 'Enter your last name (letters only, up to 30).';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 120) {
            $errors[] = 'Enter a valid email address.';
        }
        if ($e = password_error($pass)) {
            $errors[] = $e;
        }
        if (!$errors) {
            $st = db()->prepare('SELECT 1 FROM fans WHERE email = ?');
            $st->execute([$email]);
            if ($st->fetchColumn()) {
                $errors[] = 'That email is already registered. Log in, or use "I lost my password".';
            }
        }
        if (!$errors) {
            db()->prepare('INSERT INTO fans (email, password_hash, first_name, last_name, last_initial, username) VALUES (?, ?, ?, ?, ?, ?)')
                ->execute([$email, password_hash($pass, PASSWORD_DEFAULT), $first, $last, $initial, default_username($first, $initial)]);
            $id = (int)db()->lastInsertId();
            if (send_confirm_email($id, $email, $first)) {
                flash('Almost there! We sent a link to ' . $email . '. Click it to confirm your email, then log in. Check your spam folder too.');
            } else {
                flash('Your account is created, but the confirmation email could not be sent. Tell Leah so she can confirm it for you.');
            }
            redirect('/fans.php');
        }
    } elseif ($action === 'login') {
        $pass = (string)($_POST['password'] ?? '');
        $st = db()->prepare('SELECT * FROM fans WHERE email = ?');
        $st->execute([$email]);
        $f = $st->fetch();
        if ($f && $f['locked_until'] > time()) {
            $errors[] = 'Too many tries. Wait a few minutes and try again.';
        } elseif ($f && password_verify($pass, $f['password_hash'])) {
            if (!$f['confirmed']) {
                $errors[] = 'Please confirm your email first (check your inbox and spam folder).';
                $old['unconfirmed'] = $email;
            } else {
                session_regenerate_id(true);
                $_SESSION['fan_id'] = (int)$f['id'];
                db()->prepare('UPDATE fans SET fails = 0, prev_login = last_login, last_login = datetime("now") WHERE id = ?')->execute([$f['id']]);
                redirect('/fans.php');
            }
        } else {
            if ($f) {
                $fails = (int)$f['fails'] + 1;
                db()->prepare('UPDATE fans SET fails = ?, locked_until = ? WHERE id = ?')
                    ->execute([$fails >= 8 ? 0 : $fails, $fails >= 8 ? time() + 300 : 0, $f['id']]);
            }
            $errors[] = 'Wrong email or password.';
        }
        $old['email'] = $email;
    } elseif ($action === 'resend') {
        $st = db()->prepare('SELECT id, first_name FROM fans WHERE email = ? AND confirmed = 0');
        $st->execute([$email]);
        if ($f = $st->fetch()) {
            send_confirm_email((int)$f['id'], $email, $f['first_name']);
        }
        flash('If that email is waiting for confirmation, we sent a new link.');
        redirect('/fans.php');
    } elseif ($action === 'forgot') {
        $view = 'forgot';
        $st = db()->prepare('SELECT id FROM fans WHERE email = ?');
        $st->execute([$email]);
        if (($id = $st->fetchColumn()) && (($_SESSION['reset_asked'] ?? 0) < time() - 60)) {
            send_reset_email((int)$id, $email);
            $_SESSION['reset_asked'] = time();
        }
        flash('If that email has an account, we sent a link to choose a new password. Check your spam folder too.');
        redirect('/fans.php');
    } elseif ($action === 'reset') {
        $resetToken = (string)($_POST['token'] ?? '');
        $pass = (string)($_POST['password'] ?? '');
        $st = db()->prepare('SELECT id FROM fans WHERE reset_hash = ? AND reset_expires > ?');
        $st->execute([hash('sha256', $resetToken), time()]);
        $id = $st->fetchColumn();
        if (!$id) {
            flash('That reset link has expired. Ask for a new one.');
            redirect('/fans.php?v=forgot');
        }
        if ($e = password_error($pass)) {
            $errors[] = $e;
        } else {
            // Using the emailed link proves the email is theirs, so it also confirms the account.
            db()->prepare('UPDATE fans SET password_hash = ?, reset_hash = NULL, reset_expires = 0, confirmed = 1, fails = 0, locked_until = 0 WHERE id = ?')
                ->execute([password_hash($pass, PASSWORD_DEFAULT), $id]);
            flash('Password updated. Log in with your new password.');
            redirect('/fans.php');
        }
    } elseif ($action === 'logout') {
        unset($_SESSION['fan_id']);
        flash('You are logged out.');
        redirect('/fans.php');
    } elseif ($action === 'username' && current_fan()) {
        $view = 'settings';
        $me = current_fan();
        [$name, $err] = clean_username((string)($_POST['username'] ?? ''));
        if ($me['username_locked']) {
            $err = 'Your username is locked. Ask support below if you need a change.';
        }
        if ($err === '' && username_taken($name, (int)$me['id'])) {
            $err = 'Someone already has that username. Try another one.';
        }
        if ($err !== '') {
            $errors[] = $err;
        } else {
            // First time they choose a name: it is now locked.
            db()->prepare('UPDATE fans SET username = ?, username_locked = 1 WHERE id = ?')->execute([$name, $me['id']]);
            flash('Your username is now ' . $name . '. It is locked, so choose well!');
            redirect('/fans.php?v=settings');
        }
    } elseif ($action === 'support' && current_fan()) {
        $view = 'settings';
        $me = current_fan();
        [$name, $err] = clean_username((string)($_POST['wanted'] ?? ''));
        $why = mb_substr(trim((string)($_POST['reason'] ?? '')), 0, 300);
        $st = db()->prepare("SELECT 1 FROM support_requests WHERE fan_id = ? AND status = 'pending'");
        $st->execute([$me['id']]);
        if (!$me['username_locked']) {
            $err = 'Your username is not locked, you can change it yourself.';
        } elseif ($st->fetchColumn()) {
            $err = 'You already have a request waiting. Support will get to it soon.';
        } elseif ($err === '' && $why === '') {
            $err = 'Tell support why you need the change.';
        } elseif ($err === '' && username_taken($name, (int)$me['id'])) {
            $err = 'Someone already has that username. Try another one.';
        }
        if ($err !== '') {
            $errors[] = $err;
        } else {
            db()->prepare('INSERT INTO support_requests (fan_id, wanted, reason) VALUES (?, ?, ?)')->execute([$me['id'], $name, $why]);
            flash('Request sent. Support will look at it soon.');
            redirect('/fans.php?v=settings');
        }
    } elseif ($action === 'password' && current_fan()) {
        $view = 'settings';
        $me = current_fan();
        $pass = (string)($_POST['new_password'] ?? '');
        if (!password_verify((string)($_POST['current_password'] ?? ''), $me['password_hash'])) {
            $errors[] = 'Your current password is not right.';
        } elseif ($e = password_error($pass)) {
            $errors[] = $e;
        } else {
            db()->prepare('UPDATE fans SET password_hash = ? WHERE id = ?')->execute([password_hash($pass, PASSWORD_DEFAULT), $me['id']]);
            flash('Password updated.');
            redirect('/fans.php?v=settings');
        }
    } elseif ($action === 'proof' && current_fan()) {
        $me = current_fan();
        $plat = (string)($_POST['platform'] ?? '');
        $kind = (string)($_POST['kind'] ?? '');
        $vlogId = $kind === 'follow' ? 0 : (int)($_POST['vlog_id'] ?? 0);
        $file = $_FILES['shot'] ?? null;
        $err = '';
        if (!isset(PROOF_PLATFORMS[$plat]) || !isset(PROOF_POINTS[$kind])) {
            $err = 'Pick a platform and what you did.';
        } elseif ($kind !== 'follow') {
            $col = ['youtube' => 'youtube_id', 'instagram' => 'instagram_url', 'tiktok' => 'tiktok_url'][$plat];
            $st = db()->prepare("SELECT 1 FROM vlogs WHERE id = ? AND COALESCE($col, '') != ''");
            $st->execute([$vlogId]);
            if (!$st->fetchColumn()) {
                $err = 'Pick the vlog you liked or commented on (it must be on that platform).';
            }
        }
        if ($err === '') {
            $st = db()->prepare("SELECT 1 FROM proofs WHERE fan_id = ? AND platform = ? AND action = ? AND COALESCE(vlog_id, 0) = CAST(? AS INTEGER) AND status != 'rejected'");
            $st->execute([$me['id'], $plat, $kind, $vlogId]);
            if ($st->fetchColumn()) {
                $err = 'You already sent that one. You can only earn each action once (once per vlog for likes and comments).';
            }
        }
        if ($err === '') {
            $st = db()->prepare("SELECT COUNT(*) FROM proofs WHERE fan_id = ? AND status = 'pending'");
            $st->execute([$me['id']]);
            if ((int)$st->fetchColumn() >= 10) {
                $err = 'You have 10 screenshots waiting for review. Please wait until some are checked.';
            }
        }
        $ext = '';
        if ($err === '') {
            if (!$file || $file['error'] === UPLOAD_ERR_NO_FILE) {
                $err = 'Choose a screenshot to upload.';
            } elseif ($file['error'] === UPLOAD_ERR_INI_SIZE || $file['error'] === UPLOAD_ERR_FORM_SIZE || $file['size'] > 5 * 1024 * 1024) {
                $err = 'That image is too big. Try a smaller screenshot.';
            } elseif ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
                $err = 'The upload did not work. Please try again.';
            } else {
                $info = @getimagesize($file['tmp_name']);
                $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'];
                if (!$info || !isset($types[$info[2]])) {
                    $err = 'Please upload a JPG, PNG or WebP image.';
                } else {
                    $ext = $types[$info[2]];
                }
            }
        }
        if ($err === '') {
            $dir = __DIR__ . '/data/proofs';
            if (!is_dir($dir)) {
                @mkdir($dir, 0755, true);
            }
            $name = bin2hex(random_bytes(12)) . '.' . $ext;
            if (!@move_uploaded_file($file['tmp_name'], $dir . '/' . $name)) {
                $err = 'Could not save the image. Please tell Leah.';
            } else {
                $fanNote = mb_substr(trim((string)preg_replace('/\s+/u', ' ', (string)($_POST['fan_note'] ?? ''))), 0, 200);
                db()->prepare('INSERT INTO proofs (fan_id, platform, action, vlog_id, file, points, fan_note) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    ->execute([$me['id'], $plat, $kind, $vlogId ?: null, $name, PROOF_POINTS[$kind], $fanNote !== '' ? $fanNote : null]);
                flash('Thanks! Leah will check your screenshot soon. You get the points once it is approved.');
                redirect('/fans.php');
            }
        }
        $errors[] = $err;
    } elseif ($action === 'delete_account' && current_fan()) {
        $view = 'settings';
        $me = current_fan();
        if (!password_verify((string)($_POST['current_password'] ?? ''), $me['password_hash'])) {
            $errors[] = 'Your password is not right, so the account was not deleted.';
        } else {
            $st = db()->prepare('SELECT file FROM proofs WHERE fan_id = ? AND file IS NOT NULL');
            $st->execute([$me['id']]);
            foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $fn) {
                @unlink(__DIR__ . '/data/proofs/' . basename((string)$fn));
            }
            db()->prepare('DELETE FROM fans WHERE id = ?')->execute([$me['id']]);   // their hall of fame entry and proofs go too
            unset($_SESSION['fan_id']);
            flash('Your account and hall of fame entry were deleted. Thanks for being a fan!');
            redirect('/fans.php');
        }
    }
}

$fan = current_fan();
$msg = flash();

// Valid reset link? (checked on GET so we only show the form for a live token)
$resetOk = false;
if ($resetToken !== '' && preg_match('/^[a-f0-9]{40}$/', $resetToken)) {
    $st = db()->prepare('SELECT 1 FROM fans WHERE reset_hash = ? AND reset_expires > ?');
    $st->execute([hash('sha256', $resetToken), time()]);
    $resetOk = (bool)$st->fetchColumn();
}

$tip = 'Tip: join 3 or 4 random words with hyphens, add a number and a capital letter, like <strong>Purple-Wave-Tacos-42</strong>. Long beats complicated. Do not reuse a password from another site.';

$onAccount = $fan && !$resetOk && $view === 'settings';
page_header($onAccount ? 'My account' : 'Fans', $onAccount ? 'account' : 'fans');
?>
<h1><?= $onAccount ? 'My account' : 'Fans' ?></h1>
<?php $nFans = fan_count(); ?>
<?php if (!$onAccount): ?><p class="fan-count"><strong id="fanCount"><?= $nFans ?></strong> <span id="fanLabel"><?= $nFans === 1 ? 'fan' : 'fans' ?></span> in the club</p><?php endif; ?>
<?php if ($msg): ?><p class="notice"><?= e($msg) ?></p><?php endif; ?>
<?php foreach ($errors as $er): ?><p class="error"><?= e($er) ?></p><?php endforeach; ?>

<?php if ($fan && !$resetOk && $view === 'settings'): /* ---------------- settings (gear) ---------------- */ ?>
<p class="hint">Everything about your fan account is here. More is coming.</p>
<div class="soon">
  <p><strong>Username:</strong> <?= e($fan['username']) ?></p>
  <p><strong>Fan since:</strong> <?= time_tag($fan['created_at']) ?></p>
  <p><strong>This visit started:</strong> <?= time_tag($fan['last_login']) ?></p>
  <p><strong>Your login before that:</strong> <?= $fan['prev_login'] ? time_tag($fan['prev_login']) : 'this is your first visit' ?></p>
</div>

<h2>Your username</h2>
<?php if ($fan['username_locked']):
    $rq = db()->prepare('SELECT wanted, status, note FROM support_requests WHERE fan_id = ? ORDER BY id DESC LIMIT 1');
    $rq->execute([$fan['id']]);
    $req = $rq->fetch(); ?>
<p>Your username is <strong><?= e($fan['username']) ?></strong>. It is locked, because you already chose it.</p>
<?php if ($req && $req['status'] === 'pending'): ?>
<p class="notice">Your request for <strong><?= e($req['wanted']) ?></strong> is waiting for support.</p>
<?php else: ?>
<?php if ($req && $req['status'] === 'declined'): ?><p class="hint">Your last request for <?= e($req['wanted']) ?> was declined<?= $req['note'] ? ': ' . e($req['note']) : '' ?>.</p>
<?php elseif ($req && $req['status'] === 'approved'): ?><p class="hint">Your last request was approved.</p><?php endif; ?>
<h3>Need a change? Ask support</h3>
<form method="post" action="/fans.php?v=settings" class="form">
  <?= csrf_field() ?><input type="hidden" name="action" value="support">
  <label for="wanted">The username you would like</label>
  <input id="wanted" name="wanted" minlength="3" maxlength="20" required>
  <label for="why">Why do you need the change?</label>
  <textarea id="why" name="reason" maxlength="300" rows="3" required></textarea>
  <button class="btn" type="submit">Send to support</button>
</form>
<?php endif; ?>
<?php else: ?>
<form method="post" action="/fans.php?v=settings" class="form" onsubmit="return confirm('You can only choose your username once. After that, only support can change it. Save it?');">
  <?= csrf_field() ?><input type="hidden" name="action" value="username">
  <label for="username">Name shown in the hall of fame and on the fans page</label>
  <input id="username" name="username" value="<?= e($fan['username']) ?>" minlength="3" maxlength="20" required>
  <p class="hint"><strong>You can choose only once.</strong> After you save, it is locked and only support can change it. 3 to 20 characters: letters, numbers, spaces, dots, dashes. Pick a nickname if you prefer not to show your name.</p>
  <button class="btn" type="submit">Save username</button>
</form>
<?php endif; ?>

<h2>Change password</h2>
<form method="post" action="/fans.php?v=settings" class="form">
  <?= csrf_field() ?><input type="hidden" name="action" value="password">
  <label for="cur">Current password</label>
  <input id="cur" name="current_password" type="password" required autocomplete="current-password">
  <label for="new">New password</label>
  <input id="new" name="new_password" type="password" required minlength="10" maxlength="64" autocomplete="new-password">
  <p class="hint"><?= $tip ?></p>
  <button class="btn" type="submit">Change password</button>
</form>

<h2>Log out</h2>
<form method="post" class="form">
  <?= csrf_field() ?><input type="hidden" name="action" value="logout">
  <button class="btn ghost" type="submit">Log out</button>
</form>

<h2>Delete my account</h2>
<form method="post" action="/fans.php?v=settings" class="form" onsubmit="return confirm('Delete your account and your hall of fame entry? This cannot be undone.');">
  <?= csrf_field() ?><input type="hidden" name="action" value="delete_account">
  <p class="hint">This removes your account, your email and your hall of fame entry for good.</p>
  <label for="delpw">Your password</label>
  <input id="delpw" name="current_password" type="password" required autocomplete="current-password">
  <button class="btn ghost" type="submit">Delete my account</button>
</form>

<?php elseif ($fan && !$resetOk): /* ---------------- logged in: the fans ---------------- */
    $best = db()->prepare('SELECT level, won, ms FROM scores WHERE fan_id = ?');
    $best->execute([$fan['id']]);
    $b = $best->fetch();
    $ranking = fan_ranking();
    $mine = null;
    foreach ($ranking as $r) {
        if ($r['id'] === (int)$fan['id']) { $mine = $r; }
    }
    $vl = db()->query('SELECT id, title, youtube_id, instagram_url, tiktok_url FROM vlogs ORDER BY sort_order, id')->fetchAll();
    $sub = db()->prepare('SELECT p.platform, p.action, p.status, p.points, p.note, p.created_at, v.title FROM proofs p LEFT JOIN vlogs v ON v.id = p.vlog_id WHERE p.fan_id = ? ORDER BY p.id DESC LIMIT 20');
    $sub->execute([$fan['id']]);
    $subs = $sub->fetchAll();
    ?>
<p class="lede">Hey <strong><?= e($fan['username']) ?></strong>, you are part of the fan club. Everything you do on the site shows up under this name.</p>
<?php if ($mine): ?>
<div class="soon rankcard">
  <p><strong>You are fan #<?= (int)$mine['rank'] ?> with <?= (int)$mine['pts'] ?> points.</strong></p>
  <p class="hint"><?= SIGNUP_POINTS ?> for joining + <?= (int)$mine['lvl_pts'] ?> for game levels + <?= (int)$mine['soc_pts'] ?> for approved screenshots.
  <?php if ($b): $s = intdiv((int)$b['ms'], 1000); ?>
    Best surf run: <?= $b['won'] ? 'cleared all 5 levels' : 'reached level ' . (int)$b['level'] ?> in <?= sprintf('%d:%02d', intdiv($s, 60), $s % 60) ?>.
  <?php else: ?>
    You have not played yet. <a href="/games.php">Go surf!</a>
  <?php endif; ?></p>
</div>
<?php endif; ?>

<h2>How to climb the ranking</h2>
<div class="soon">
  <p>Everyone starts in sign-up order (first to join is #1). After that, points decide. If points are equal, the earlier sign-up stays ahead.</p>
  <ul>
    <li><strong>Join the club:</strong> <?= SIGNUP_POINTS ?> points</li>
    <li><strong>Pass levels in the surf game and in Leah's Outrun:</strong> level 1 = 1 point, level 2 = 2 points, up to level 5 = 5 points (15 in total per game, each counted once). <a href="/games.php">Play now</a></li>
    <li><strong>Score in Leah's Blocks:</strong> 1,000 = 1 point, 2,500 = 3, 5,000 = 6, 8,000 = 10, 12,000 = 15 (in total).</li>
    <li><strong>Like a vlog</strong> on YouTube, Instagram or TikTok: <?= PROOF_POINTS['like'] ?> points each</li>
    <li><strong>Follow or subscribe</strong> on each platform: <?= PROOF_POINTS['follow'] ?> points each</li>
    <li><strong>Comment on a vlog:</strong> <?= PROOF_POINTS['comment'] ?> points each</li>
  </ul>
  <p class="hint">For likes, follows and comments, send a screenshot. Leah checks it and, if it is real, the points are added. The image is deleted after it is checked.</p>
</div>

<details class="proofbox"<?= ($action ?? '') === 'proof' ? ' open' : '' ?>>
  <summary>Send a screenshot to earn points</summary>
  <form method="post" action="/fans.php" enctype="multipart/form-data" class="form" id="proofForm">
    <?= csrf_field() ?><input type="hidden" name="action" value="proof">
    <label for="pf">Where?</label>
    <select id="pf" name="platform" required>
      <?php foreach (PROOF_PLATFORMS as $k => $lab): ?><option value="<?= e($k) ?>"><?= e($lab) ?></option><?php endforeach; ?>
    </select>
    <label for="pk">What did you do?</label>
    <select id="pk" name="kind" required>
      <option value="like">Liked a vlog (<?= PROOF_POINTS['like'] ?> points)</option>
      <option value="comment">Commented on a vlog (<?= PROOF_POINTS['comment'] ?> points)</option>
      <option value="follow">Followed / subscribed (<?= PROOF_POINTS['follow'] ?> points)</option>
    </select>
    <label for="pv" id="pvLabel">Which vlog?</label>
    <select id="pv" name="vlog_id">
      <?php foreach ($vl as $v): ?>
        <option value="<?= (int)$v['id'] ?>" data-youtube="<?= $v['youtube_id'] !== '' ? 1 : 0 ?>" data-instagram="<?= $v['instagram_url'] ? 1 : 0 ?>" data-tiktok="<?= $v['tiktok_url'] ? 1 : 0 ?>"><?= e($v['title']) ?></option>
      <?php endforeach; ?>
    </select>
    <label for="ps">Screenshot</label>
    <input id="ps" name="shot" type="file" accept="image/png,image/jpeg,image/webp" required>
    <div class="row shotbtns" id="shotBtns" hidden>
      <button class="btn ghost" type="button" id="pickPhoto">Choose from photos</button>
      <button class="btn ghost" type="button" id="takePhoto">Take a photo</button>
    </div>
    <input id="pcam" type="file" accept="image/*" capture="environment" hidden>
    <p class="hint" id="shotName"></p>
    <p class="hint">Show your like, comment or follow, with your account name visible. JPG, PNG or WebP.</p>
    <label for="pn">A quick message for Leah (optional)</label>
    <textarea id="pn" name="fan_note" maxlength="200" rows="2" placeholder="Say hi, or tell her what you liked!"></textarea>
    <button class="btn" type="submit">Send for review</button>
  </form>
</details>

<?php if ($subs): ?>
<h2>My screenshots</h2>
<ul class="fanlist subs">
<?php foreach ($subs as $x): ?>
  <li><span class="nm"><?= e(PROOF_PLATFORMS[$x['platform']] ?? $x['platform']) ?>: <?= e(proof_action_label($x['platform'], $x['action'])) ?><?= $x['title'] ? ' - ' . e($x['title']) : '' ?></span>
    <span class="seen st-<?= e($x['status']) ?>"><?= $x['status'] === 'approved' ? '+' . (int)$x['points'] . ' points' : ($x['status'] === 'pending' ? 'waiting for review' : 'not approved' . ($x['note'] ? ': ' . e($x['note']) : '')) ?></span></li>
<?php endforeach; ?>
</ul>
<?php endif; ?>

<h2>The fan ranking</h2>
<ol class="fanlist ranking">
<?php foreach ($ranking as $f): $me = $f['id'] === (int)$fan['id']; ?>
  <li<?= $me ? ' class="me"' : '' ?>><span class="nm">#<?= (int)$f['rank'] ?> <?= e($f['username']) ?><?= $me ? ' (you)' : '' ?></span>
    <span class="seen"><?= (int)$f['pts'] ?> points &middot; last seen <?= e(ago($f['seen'])) ?></span></li>
<?php endforeach; ?>
</ol>

<?php elseif ($resetOk): /* ---------------- choose new password ---------------- */ ?>
<h2>Choose a new password</h2>
<form method="post" class="form">
  <?= csrf_field() ?><input type="hidden" name="action" value="reset"><input type="hidden" name="token" value="<?= e($resetToken) ?>">
  <label for="np">New password</label>
  <input id="np" name="password" type="password" required minlength="10" maxlength="64" autocomplete="new-password">
  <p class="hint"><?= $tip ?></p>
  <button class="btn" type="submit">Save new password</button>
</form>

<?php elseif ($view === 'join'): /* ---------------- join ---------------- */ ?>
<h2>Join the fan club</h2>
<form method="post" class="form">
  <?= csrf_field() ?><input type="hidden" name="action" value="join">
  <label for="fn">First name</label>
  <input id="fn" name="first_name" value="<?= e($old['first_name'] ?? '') ?>" maxlength="20" required autocomplete="given-name">
  <label for="ln">Last name</label>
  <input id="ln" name="last_name" value="<?= e($old['last_name'] ?? '') ?>" maxlength="30" required autocomplete="family-name">
  <p class="hint">Only Leah and the admins can see your full name. Everyone else sees your first name and the first letter of your last name, like "Mia K." You can pick a nickname once, later.</p>
  <label for="em">Email</label>
  <input id="em" name="email" type="email" value="<?= e($old['email'] ?? '') ?>" maxlength="120" required autocomplete="email">
  <p class="hint">Only used to confirm your account and reset your password. It is never shown to anyone.</p>
  <label for="pw">Password</label>
  <input id="pw" name="password" type="password" required minlength="10" maxlength="64" autocomplete="new-password">
  <p class="hint"><?= $tip ?></p>
  <label><input type="checkbox" name="age13" value="1" required style="width:auto"> I am 13 years old or older.</label>
  <button class="btn" type="submit">Join</button>
  <p class="hint">Already a fan? <a href="/fans.php">Log in</a></p>
</form>

<?php elseif ($view === 'forgot'): /* ---------------- forgot ---------------- */ ?>
<h2>I lost my password</h2>
<form method="post" class="form">
  <?= csrf_field() ?><input type="hidden" name="action" value="forgot">
  <label for="fe">Your email</label>
  <input id="fe" name="email" type="email" required autocomplete="email">
  <button class="btn" type="submit">Send me a reset link</button>
  <p class="hint"><a href="/fans.php">Back to log in</a></p>
</form>

<?php else: /* ---------------- visitor: welcome + login ---------------- */ ?>
<div class="soon fan-join">
  <p><strong>Hey, you are not a fan yet!</strong> Join up and share the incredible fun of living with Leah.</p>
  <p><a class="btn" href="/fans.php?v=join">Join the fan club</a></p>
</div>
<h2>Already a fan? Log in</h2>
<form method="post" class="form">
  <?= csrf_field() ?><input type="hidden" name="action" value="login">
  <label for="le">Email</label>
  <input id="le" name="email" type="email" value="<?= e($old['email'] ?? '') ?>" required autocomplete="email">
  <label for="lp">Password</label>
  <input id="lp" name="password" type="password" required autocomplete="current-password">
  <button class="btn" type="submit">Log in</button>
  <p class="hint"><a href="/fans.php?v=forgot">I lost my password</a></p>
</form>
<?php if (!empty($old['unconfirmed'])): ?>
<form method="post" class="form">
  <?= csrf_field() ?><input type="hidden" name="action" value="resend"><input type="hidden" name="email" value="<?= e($old['unconfirmed']) ?>">
  <button class="btn ghost" type="submit">Send the confirmation email again</button>
</form>
<?php endif; ?>
<?php endif; ?>
<?php page_footer('<script src="/assets/js/fans.js?v=2"></script><script>document.querySelectorAll("time.localtime").forEach(function(t){var d=new Date(t.getAttribute("datetime"));if(!isNaN(d)){t.textContent=d.toLocaleString([],{dateStyle:"medium",timeStyle:"short"});}});</script>'); ?>

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
        $initial = mb_strtoupper(mb_substr(trim((string)($_POST['last_initial'] ?? '')), 0, 1));
        $pass = (string)($_POST['password'] ?? '');
        $old = ['first_name' => $first, 'last_initial' => $initial, 'email' => $email];
        if (empty($_POST['age13'])) {
            $errors[] = 'You need to be 13 or older to join the fan club.';
        }
        if (!preg_match('/^[\p{L}][\p{L} .\'-]{0,19}$/u', $first)) {
            $errors[] = 'Enter your first name (letters only, up to 20).';
        }
        if (!preg_match('/^\p{L}$/u', $initial)) {
            $errors[] = 'Enter just the first letter of your last name.';
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
            db()->prepare('INSERT INTO fans (email, password_hash, first_name, last_initial, username) VALUES (?, ?, ?, ?, ?)')
                ->execute([$email, password_hash($pass, PASSWORD_DEFAULT), $first, $initial, default_username($first, $initial)]);
            $id = (int)db()->lastInsertId();
            if (send_confirm_email($id, $email, $first)) {
                flash('Almost there! We sent a link to ' . $email . '. Click it to confirm your email, then log in. Check your spam folder too.');
            } else {
                flash('Your account is created, but the confirmation email could not be sent. Tell Leah or Adrien so they can confirm it for you.');
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
        if ($err === '' && username_taken($name, (int)$me['id'])) {
            $err = 'Someone already has that username. Try another one.';
        }
        if ($err !== '') {
            $errors[] = $err;
        } else {
            db()->prepare('UPDATE fans SET username = ? WHERE id = ?')->execute([$name, $me['id']]);
            flash('Your username is now ' . $name . '.');
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
    } elseif ($action === 'delete_account' && current_fan()) {
        $view = 'settings';
        $me = current_fan();
        if (!password_verify((string)($_POST['current_password'] ?? ''), $me['password_hash'])) {
            $errors[] = 'Your password is not right, so the account was not deleted.';
        } else {
            db()->prepare('DELETE FROM fans WHERE id = ?')->execute([$me['id']]);   // their hall of fame entry goes too
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

page_header('Fans', 'fans');
?>
<h1>Fans<?php if ($fan && !$resetOk && $view !== 'settings'): ?> <a class="gear" href="/fans.php?v=settings" aria-label="Settings" title="Settings">&#9881;</a><?php endif; ?></h1>
<?php if ($msg): ?><p class="notice"><?= e($msg) ?></p><?php endif; ?>
<?php foreach ($errors as $er): ?><p class="error"><?= e($er) ?></p><?php endforeach; ?>

<?php if ($fan && !$resetOk && $view === 'settings'): /* ---------------- settings (gear) ---------------- */ ?>
<h2>Settings</h2>
<p><a href="/fans.php">&larr; Back to the fans</a></p>
<div class="soon">
  <p><strong>Username:</strong> <?= e($fan['username']) ?></p>
  <p><strong>Fan since:</strong> <?= time_tag($fan['created_at']) ?></p>
  <p><strong>This visit started:</strong> <?= time_tag($fan['last_login']) ?></p>
  <p><strong>Your login before that:</strong> <?= $fan['prev_login'] ? time_tag($fan['prev_login']) : 'this is your first visit' ?></p>
</div>

<h2>Your username</h2>
<form method="post" action="/fans.php?v=settings" class="form">
  <?= csrf_field() ?><input type="hidden" name="action" value="username">
  <label for="username">Name shown in the hall of fame and on the fans page</label>
  <input id="username" name="username" value="<?= e($fan['username']) ?>" minlength="3" maxlength="20" required>
  <p class="hint">3 to 20 characters: letters, numbers, spaces, dots, dashes. Pick a nickname if you prefer not to show your name.</p>
  <button class="btn" type="submit">Save username</button>
</form>

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
    $fans = db()->query('SELECT id, username, COALESCE(last_login, created_at) AS seen FROM fans WHERE confirmed = 1 ORDER BY seen DESC, id DESC LIMIT 200')->fetchAll();
    ?>
<p class="lede">Hey <strong><?= e($fan['username']) ?></strong>, you are part of the fan club. Everything you do on the site shows up under this name.</p>
<div class="soon">
  <?php if ($b): $s = intdiv((int)$b['ms'], 1000); ?>
    <p><strong>Your best surf run:</strong> <?= $b['won'] ? 'cleared all 5 levels' : 'reached level ' . (int)$b['level'] ?> in <?= sprintf('%d:%02d', intdiv($s, 60), $s % 60) ?>.</p>
  <?php else: ?>
    <p>You have not played yet. <a href="/games.php">Go surf!</a></p>
  <?php endif; ?>
</div>

<h2>The fans (<?= count($fans) ?>)</h2>
<ul class="fanlist">
<?php foreach ($fans as $f): ?>
  <li<?= (int)$f['id'] === (int)$fan['id'] ? ' class="me"' : '' ?>><span class="nm"><?= e($f['username']) ?><?= (int)$f['id'] === (int)$fan['id'] ? ' (you)' : '' ?></span>
    <span class="seen">last seen <?= e(ago($f['seen'])) ?></span></li>
<?php endforeach; ?>
</ul>

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
  <label for="li">First letter of your last name</label>
  <input id="li" name="last_initial" value="<?= e($old['last_initial'] ?? '') ?>" maxlength="1" required style="max-width:5em">
  <p class="hint">Your public name will be your first name and that letter, like "Mia K." You can change it to a nickname later.</p>
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
<?php page_footer('<script>document.querySelectorAll("time.localtime").forEach(function(t){var d=new Date(t.getAttribute("datetime"));if(!isNaN(d)){t.textContent=d.toLocaleString([],{dateStyle:"medium",timeStyle:"short"});}});</script>'); ?>

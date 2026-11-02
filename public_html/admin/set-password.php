<?php
// One-time link from Admin > Admins: a new admin (or one who forgot) chooses a password here.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';

$token = (string)($_POST['token'] ?? $_GET['token'] ?? '');
$user = null;
if (preg_match('/^[a-f0-9]{40}$/', $token)) {
    $st = db()->prepare('SELECT id, username FROM users WHERE invite_hash = ? AND invite_expires > ?');
    $st->execute([hash('sha256', $token), time()]);
    $user = $st->fetch() ?: null;
}
$error = '';
if ($user && $_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $p = (string)($_POST['password'] ?? '');
    if (strlen($p) < 12 || strlen($p) > 72) {
        $error = 'Use 12 to 72 characters.';
    } elseif ($p !== (string)($_POST['password2'] ?? '')) {
        $error = 'The two passwords are not the same.';
    } else {
        db()->prepare('UPDATE users SET password_hash = ?, invite_hash = NULL, invite_expires = 0 WHERE id = ?')->execute([password_hash($p, PASSWORD_DEFAULT), $user['id']]);
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$user['id'];
        flash('Welcome, ' . $user['username'] . '! Your password is saved. Next time, log in at /admin/login.php.');
        redirect('/admin/index.php');
    }
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Choose your password | Lived by Leah</title>
<link rel="stylesheet" href="/assets/css/style.css?v=14">
</head>
<body class="admin">
<div class="admin-wrap"><main class="admin-main narrow">
<?php if (!$user): ?>
<h1>Link not valid</h1>
<p>This link was already used or has expired (links work for 72 hours). Ask another admin for a new one in Admin &gt; Admins.</p>
<?php else: ?>
<h1>Hi <?= e($user['username']) ?></h1>
<p>Choose your admin password. You will use it with the username <strong><?= e($user['username']) ?></strong>.</p>
<?php if ($error): ?><p class="error"><?= e($error) ?></p><?php endif; ?>
<form method="post" class="form">
  <?= csrf_field() ?><input type="hidden" name="token" value="<?= e($token) ?>">
  <input type="text" name="username" value="<?= e($user['username']) ?>" autocomplete="username" hidden>
  <label for="pw">New password (12 characters or more)</label>
  <input id="pw" name="password" type="password" required minlength="12" maxlength="72" autocomplete="new-password">
  <label for="pw2">Same password again</label>
  <input id="pw2" name="password2" type="password" required minlength="12" maxlength="72" autocomplete="new-password">
  <button class="btn" type="submit">Save and log in</button>
</form>
<?php endif; ?>
</main></div>
</body>
</html>

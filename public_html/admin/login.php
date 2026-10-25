<?php
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';

if (is_admin()) {
    redirect('/admin/index.php');
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    // Simple throttle: after 5 failures, wait 5 minutes (per browser session).
    $fails = $_SESSION['fails'] ?? 0;
    $until = $_SESSION['locked_until'] ?? 0;
    if ($until > time()) {
        $error = 'Too many tries. Wait a few minutes and try again.';
    } else {
        $stmt = db()->prepare('SELECT id, password_hash FROM users WHERE username = ?');
        $stmt->execute([trim((string)($_POST['username'] ?? ''))]);
        $u = $stmt->fetch();
        if ($u && password_verify((string)($_POST['password'] ?? ''), $u['password_hash'])) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int)$u['id'];
            $_SESSION['fails'] = 0;
            redirect('/admin/index.php');
        }
        $_SESSION['fails'] = ++$fails;
        if ($fails >= 5) {
            $_SESSION['locked_until'] = time() + 300;
            $_SESSION['fails'] = 0;
        }
        $error = 'Wrong username or password.';
    }
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Log in | Lived by Leah</title>
<link rel="stylesheet" href="/assets/css/style.css?v=3">
</head>
<body class="admin">
<div class="admin-wrap"><main class="admin-main narrow">
<h1>Log in</h1>
<?php if ($error): ?><p class="error"><?= e($error) ?></p><?php endif; ?>
<form method="post" class="form">
  <?= csrf_field() ?>
  <label for="username">Username</label>
  <input id="username" name="username" required autocomplete="username">
  <label for="password">Password</label>
  <input id="password" name="password" type="password" required autocomplete="current-password">
  <button class="btn" type="submit">Log in</button>
</form>
</main></div>
</body>
</html>

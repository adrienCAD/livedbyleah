<?php
// One-time setup: creates Leah's admin account and loads the first 14 vlogs.
// It locks itself once any user exists. Delete this file from the server afterwards.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';

$seed = [
    ['pGCwokoVb_0', "Shopping cart accidents aren't aura 😔"],
    ['abqlA7-poII', 'DO NOT record during rides, always ask for permission'],
    ['449c6bkjmhU', 'France vlog day 1!'],
    ['PEexZLWaLZA', 'France vlog day 2! The wedding was truly beautiful!'],
    ['XP_kddEoM_E', 'Visiting the British Museum!'],
    ['QlLodasudqU', 'No animals were harmed in the making of this video 🐱🐶'],
    ['r3SIxBH7fWo', 'Day one in London 😛'],
    ['Snq4ploDZkc', 'Follow for more adventures 🥹 (filmed March 13th, 2026)'],
    ['LZpbEPJpq8U', 'Trip to the boulevard: Veracruz vlog part 4!'],
    ['yY-G90-_oyg', 'Day 3 in Veracruz! Going to the aquarium 😛'],
    ['Xc3uJR4Yh3Q', 'Letting my friend do my voiceover 🤫🤯'],
    ['P-jAl9fL0yI', 'Exploring the malecón: Veracruz vlog day 2'],
    ['W3bvOMb92_0', 'The arrival: Veracruz vlog part 1'],
    ['H3Ued9RA0rY', "Been doing this since day one, but it's officially time to share the journey 😛"],
];

$error = '';
$done = false;
$locked = user_count() > 0;

if (!$locked && $_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $user = trim((string)($_POST['username'] ?? ''));
    $pass = (string)($_POST['password'] ?? '');
    if (!preg_match('/^[A-Za-z0-9_.-]{3,30}$/', $user)) {
        $error = 'Username: 3 to 30 letters, numbers, dots, dashes or underscores.';
    } elseif (strlen($pass) < 10) {
        $error = 'Password must be at least 10 characters.';
    } else {
        $pdo = db();
        $pdo->beginTransaction();
        $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, "admin")')
            ->execute([$user, password_hash($pass, PASSWORD_DEFAULT)]);
        $ins = $pdo->prepare('INSERT INTO vlogs (title, youtube_id, sort_order) VALUES (?, ?, ?)');
        foreach ($seed as $i => [$yt, $title]) {
            $ins->execute([$title, $yt, $i]);
        }
        $pdo->commit();
        $done = true;
    }
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Setup | Lived by Leah</title>
<link rel="stylesheet" href="/assets/css/style.css">
</head>
<body class="admin">
<div class="admin-wrap"><main class="admin-main narrow">
<h1>Site setup</h1>
<?php if ($done): ?>
  <p class="notice">Done. The admin account and 14 vlogs are created.</p>
  <p><strong>Now delete <code>setup.php</code> from the server</strong>, then <a href="/admin/login.php">log in</a>.</p>
<?php elseif ($locked): ?>
  <p>Setup is already finished. Delete <code>setup.php</code> from the server.</p>
<?php else: ?>
  <p>Create the first admin account (Leah's login).</p>
  <?php if ($error): ?><p class="error"><?= e($error) ?></p><?php endif; ?>
  <form method="post" class="form">
    <?= csrf_field() ?>
    <label for="username">Username</label>
    <input id="username" name="username" required autocomplete="username">
    <label for="password">Password (10+ characters)</label>
    <input id="password" name="password" type="password" required minlength="10" autocomplete="new-password">
    <button class="btn" type="submit">Create account</button>
  </form>
<?php endif; ?>
</main></div>
</body>
</html>

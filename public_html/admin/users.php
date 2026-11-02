<?php
// Admin: the admin accounts (Leah, Adrien...). Invite a new admin: they get a one-time link (72 h) to choose their password.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require __DIR__ . '/../inc/fans.php';
require_admin();

$pdo = db();
$me = (int)$_SESSION['user_id'];
$link = '';

function invite_link(PDO $pdo, int $uid): string {
    [$t, $h] = new_token();
    $pdo->prepare('UPDATE users SET invite_hash = ?, invite_expires = ? WHERE id = ?')->execute([$h, time() + 72 * 3600, $uid]);
    return site_url() . '/admin/set-password.php?token=' . $t;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $a = (string)($_POST['action'] ?? '');
    $id = (int)($_POST['id'] ?? 0);
    if ($a === 'invite') {
        $name = trim((string)($_POST['username'] ?? ''));
        $st = $pdo->prepare('SELECT 1 FROM users WHERE username = ? COLLATE NOCASE');
        $st->execute([$name]);
        if (!preg_match('/^[A-Za-z0-9._-]{3,30}$/', $name)) {
            flash('Usernames are 3 to 30 characters: letters, numbers, dots, dashes, underscores.');
        } elseif ($st->fetchColumn()) {
            flash('That username already exists.');
        } else {
            // Random password nobody knows: the account only works once the invite link has been used.
            $pdo->prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, "admin")')->execute([$name, password_hash(bin2hex(random_bytes(24)), PASSWORD_DEFAULT)]);
            $_SESSION['invite_link'] = [$name, invite_link($pdo, (int)$pdo->lastInsertId())];
        }
    } elseif ($a === 'relink' && $id > 0) {
        $st = $pdo->prepare('SELECT username FROM users WHERE id = ?');
        $st->execute([$id]);
        if ($n = $st->fetchColumn()) {
            $_SESSION['invite_link'] = [(string)$n, invite_link($pdo, $id)];
        }
    } elseif ($a === 'remove' && $id > 0 && $id !== $me) {
        $active = (int)$pdo->query('SELECT COUNT(*) FROM users WHERE invite_hash IS NULL')->fetchColumn();
        $st = $pdo->prepare('SELECT invite_hash FROM users WHERE id = ?');
        $st->execute([$id]);
        $row = $st->fetch();
        if ($row && $row['invite_hash'] === null && $active <= 1) {
            flash('You cannot remove the last admin.');
        } else {
            $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
            flash('Admin removed.');
        }
    }
    redirect('/admin/users.php');
}

$shown = $_SESSION['invite_link'] ?? null;   // shown once, never stored in clear
unset($_SESSION['invite_link']);
$users = $pdo->query('SELECT id, username, created_at, invite_hash, invite_expires FROM users ORDER BY id')->fetchAll();

admin_header('Admins');
?>
<h1>Admins</h1>
<?php if ($shown): ?>
<div class="notice">
  <p><strong>Send this link to <?= e($shown[0]) ?>.</strong> It works once, for 72 hours. They open it, choose a password, and they are in. This page shows it only once.</p>
  <p><input readonly value="<?= e($shown[1]) ?>" onclick="this.select()" style="width:100%"></p>
</div>
<?php endif; ?>
<div class="table-wrap"><table>
  <thead><tr><th>Username</th><th>Since</th><th>Status</th><th></th></tr></thead>
  <tbody>
  <?php foreach ($users as $u): $pending = $u['invite_hash'] !== null; ?>
    <tr>
      <td><?= e($u['username']) ?><?= (int)$u['id'] === $me ? ' (you)' : '' ?></td>
      <td><?= e(substr($u['created_at'], 0, 10)) ?></td>
      <td><?= $pending ? ((int)$u['invite_expires'] > time() ? 'invite sent, waiting' : 'invite expired') : 'active' ?></td>
      <td class="actions">
        <form method="post"><?= csrf_field() ?><input type="hidden" name="action" value="relink"><input type="hidden" name="id" value="<?= (int)$u['id'] ?>">
          <button class="link-danger" type="submit" style="color:inherit"><?= $pending ? 'New invite link' : 'Password reset link' ?></button></form>
        <?php if ((int)$u['id'] !== $me): ?>
        <form method="post" onsubmit="return confirm('Remove this admin?');"><?= csrf_field() ?><input type="hidden" name="action" value="remove"><input type="hidden" name="id" value="<?= (int)$u['id'] ?>">
          <button class="link-danger" type="submit">Remove</button></form>
        <?php endif; ?>
      </td>
    </tr>
  <?php endforeach; ?>
  </tbody>
</table></div>

<h2>Invite a new admin</h2>
<form method="post" class="form"><?= csrf_field() ?><input type="hidden" name="action" value="invite">
  <label for="un">Username</label>
  <input id="un" name="username" required maxlength="30" pattern="[A-Za-z0-9._\-]{3,30}" autocomplete="off">
  <p class="hint">Admins can see fans' names and emails and change everything on the site. Only invite people you trust.</p>
  <button class="btn" type="submit">Create the invite link</button>
</form>
<?php admin_footer(); ?>

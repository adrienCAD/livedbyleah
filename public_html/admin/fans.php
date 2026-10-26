<?php
// Admin: list of fans (username + email), confirm by hand, reset a username, remove a fan.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require __DIR__ . '/../inc/fans.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $id = (int)($_POST['id'] ?? 0);
    $act = (string)($_POST['action'] ?? '');
    $st = db()->prepare('SELECT * FROM fans WHERE id = ?');
    $st->execute([$id]);
    if ($f = $st->fetch()) {
        if ($act === 'confirm') {
            db()->prepare('UPDATE fans SET confirmed = 1, confirm_hash = NULL WHERE id = ?')->execute([$id]);
            flash('Confirmed ' . $f['email'] . '.');
        } elseif ($act === 'resetname') {
            $n = default_username($f['first_name'], $f['last_initial'], $id);
            db()->prepare('UPDATE fans SET username = ?, username_locked = 0 WHERE id = ?')->execute([$n, $id]);
            flash('Username reset to ' . $n . ' (the fan can choose again).');
        } elseif ($act === 'unlock') {
            db()->prepare('UPDATE fans SET username_locked = 0 WHERE id = ?')->execute([$id]);
            flash($f['username'] . ' can change their username once more.');
        } elseif ($act === 'delete') {
            $pf = db()->prepare('SELECT file FROM proofs WHERE fan_id = ? AND file IS NOT NULL');
            $pf->execute([$id]);
            foreach ($pf->fetchAll(PDO::FETCH_COLUMN) as $fn) {
                @unlink(__DIR__ . '/../data/proofs/' . basename((string)$fn));
            }
            db()->prepare('DELETE FROM fans WHERE id = ?')->execute([$id]);   // their scores and proofs go too (cascade)
            flash('Fan removed.');
        }
    }
    redirect('/admin/fans.php');
}

$rank = [];
foreach (fan_ranking() as $x) { $rank[$x['id']] = $x; }
$rows = db()->query('SELECT f.*, (SELECT COUNT(*) FROM scores s WHERE s.fan_id = f.id) AS plays FROM fans f ORDER BY f.id DESC')->fetchAll();
admin_header('Fans');
?>
<h1>Fans</h1>
<?php if (!$rows): ?><p class="empty">No fans yet.</p><?php endif; ?>
<div class="table-wrap"><table>
<thead><tr><th>Rank</th><th>Username</th><th>Points</th><th>Email</th><th>Name</th><th>Email confirmed</th><th>Joined</th><th></th></tr></thead>
<tbody>
<?php foreach ($rows as $r): ?>
  <tr><td><?= isset($rank[(int)$r['id']]) ? '#' . (int)$rank[(int)$r['id']]['rank'] : '-' ?></td><td><?= e($r['username']) ?><?= !empty($r['demo']) ? ' <em>(demo)</em>' : '' ?><?= $r['username_locked'] ? ' <span title="Username locked">&#128274;</span>' : '' ?></td><td><?= isset($rank[(int)$r['id']]) ? (int)$rank[(int)$r['id']]['pts'] : '-' ?></td><td><?= e($r['email']) ?></td>
    <td><?= e(fan_full_name($r)) ?></td>
    <td><?= $r['confirmed'] ? 'Yes' : 'No' ?></td><td><?= e(substr($r['created_at'], 0, 10)) ?></td>
    <td class="actions">
      <?php if (!$r['confirmed']): ?>
        <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="confirm"><button type="submit">Confirm</button></form>
      <?php endif; ?>
      <?php if ($r['username_locked']): ?>
        <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="unlock"><button type="submit">Unlock username</button></form>
      <?php endif; ?>
      <form method="post" onsubmit="return confirm('Reset this username to the default?');"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="resetname"><button type="submit">Reset username</button></form>
      <form method="post" onsubmit="return confirm('Remove this fan, their hall of fame entry and their screenshots?');"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="delete"><button class="link-danger" type="submit">Remove</button></form>
    </td></tr>
<?php endforeach; ?>
</tbody></table></div>
<p class="hint">If the confirmation email never arrives for someone, use Confirm to let them in.</p>
<?php admin_footer(); ?>

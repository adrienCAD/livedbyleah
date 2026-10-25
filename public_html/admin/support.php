<?php
// Admin: fans asking to change a locked username. Approve sets the new name; decline gives a reason.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require __DIR__ . '/../inc/fans.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $id = (int)($_POST['id'] ?? 0);
    $act = (string)($_POST['action'] ?? '');
    $st = db()->prepare("SELECT * FROM support_requests WHERE id = ? AND status = 'pending'");
    $st->execute([$id]);
    if (($r = $st->fetch()) && in_array($act, ['approve', 'decline'], true)) {
        if ($act === 'approve') {
            if (username_taken($r['wanted'], (int)$r['fan_id'])) {
                flash('Someone already has "' . $r['wanted'] . '" now. Decline with a note so the fan can ask for another name.');
                redirect('/admin/support.php');
            }
            db()->prepare('UPDATE fans SET username = ?, username_locked = 1 WHERE id = ?')->execute([$r['wanted'], $r['fan_id']]);
            db()->prepare("UPDATE support_requests SET status = 'approved', resolved_at = datetime('now') WHERE id = ?")->execute([$id]);
            flash('Done. The username is now ' . $r['wanted'] . '.');
        } else {
            $note = mb_substr(trim((string)($_POST['note'] ?? '')), 0, 120);
            db()->prepare("UPDATE support_requests SET status = 'declined', note = ?, resolved_at = datetime('now') WHERE id = ?")->execute([$note ?: null, $id]);
            flash('Declined.');
        }
    }
    redirect('/admin/support.php');
}

$pending = db()->query("SELECT r.*, f.username, f.email FROM support_requests r JOIN fans f ON f.id = r.fan_id WHERE r.status = 'pending' ORDER BY r.id")->fetchAll();
$done = db()->query("SELECT r.*, f.username FROM support_requests r JOIN fans f ON f.id = r.fan_id WHERE r.status != 'pending' ORDER BY r.resolved_at DESC, r.id DESC LIMIT 50")->fetchAll();
admin_header('Support');
?>
<h1>Support requests</h1>
<?php if (!$pending): ?><p class="empty">Nothing waiting. All caught up.</p><?php endif; ?>
<?php foreach ($pending as $r): ?>
<div class="proof">
  <p><strong><?= e($r['username']) ?></strong> (<?= e($r['email']) ?>) wants the username <strong><?= e($r['wanted']) ?></strong> <span class="hint">(<?= e(ago($r['created_at'])) ?>)</span></p>
  <p>Reason: <?= e($r['reason']) ?></p>
  <?php if (username_taken($r['wanted'], (int)$r['fan_id'])): ?><p class="error">Someone already has that name.</p><?php endif; ?>
  <div class="row">
    <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="approve"><button class="btn" type="submit">Approve</button></form>
    <form method="post" class="inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><input type="hidden" name="action" value="decline">
      <input name="note" maxlength="120" placeholder="Reason (optional, the fan sees it)"><button class="btn ghost" type="submit">Decline</button></form>
  </div>
</div>
<?php endforeach; ?>

<?php if ($done): ?>
<h2>Already handled</h2>
<div class="table-wrap"><table>
<thead><tr><th>Fan</th><th>Wanted</th><th>Result</th><th>When</th></tr></thead><tbody>
<?php foreach ($done as $r): ?>
  <tr><td><?= e($r['username']) ?></td><td><?= e($r['wanted']) ?></td>
    <td><?= $r['status'] === 'approved' ? 'Approved' : 'Declined' . ($r['note'] ? ': ' . e($r['note']) : '') ?></td>
    <td><?= e(substr((string)$r['resolved_at'], 0, 10)) ?></td></tr>
<?php endforeach; ?>
</tbody></table></div>
<?php endif; ?>
<p class="hint">You can also fix a name straight from the Fans page: Unlock username, or Reset username.</p>
<?php admin_footer(); ?>

<?php
// Admin: view and remove entries in the game's hall of fame.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $id = (int)($_POST['id'] ?? 0);
    if ($id > 0) {
        db()->prepare('DELETE FROM scores WHERE id = ?')->execute([$id]);
        flash('Entry removed.');
    }
    redirect('/admin/scores.php');
}
$rows = db()->query('SELECT * FROM scores ORDER BY ms ASC, id ASC LIMIT 100')->fetchAll();
admin_header('Hall of fame');
?>
<h1>Hall of fame</h1>
<?php if (!$rows): ?><p class="empty">No scores yet.</p><?php endif; ?>
<div class="table-wrap"><table>
<thead><tr><th>#</th><th>Name</th><th>Time</th><th>Date</th><th></th></tr></thead>
<tbody>
<?php foreach ($rows as $i => $r): $s = intdiv((int)$r['ms'], 1000); ?>
  <tr><td><?= $i + 1 ?></td><td><?= e($r['name']) ?></td>
    <td><?= sprintf('%d:%02d', intdiv($s, 60), $s % 60) ?></td><td><?= e(substr($r['created_at'], 0, 10)) ?></td>
    <td class="actions"><form method="post" onsubmit="return confirm('Remove this entry?');"><?= csrf_field() ?>
      <input type="hidden" name="id" value="<?= (int)$r['id'] ?>"><button class="link-danger" type="submit">Remove</button></form></td></tr>
<?php endforeach; ?>
</tbody></table></div>
<?php admin_footer(); ?>

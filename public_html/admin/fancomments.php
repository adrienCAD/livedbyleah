<?php
// Admin: approve, hide or delete fan comments on vlogs and Behind the Scenes posts. Nothing shows publicly until approved.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require __DIR__ . '/../inc/fans.php';
require_admin();

$pdo = db();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $id = (int)($_POST['id'] ?? 0);
    $do = (string)($_POST['do'] ?? '');
    if ($id > 0 && in_array($do, ['approved', 'hidden', 'pending'], true)) {
        $pdo->prepare('UPDATE fan_comments SET status = ? WHERE id = ?')->execute([$do, $id]);
        flash($do === 'approved' ? 'Approved. It is live now.' : ($do === 'hidden' ? 'Hidden.' : 'Moved back to waiting.'));
    } elseif ($id > 0 && $do === 'delete') {
        $pdo->prepare('DELETE FROM fan_comments WHERE id = ?')->execute([$id]);
        flash('Comment deleted.');
    } elseif ($do === 'approve_all') {
        $n = $pdo->exec("UPDATE fan_comments SET status = 'approved' WHERE status = 'pending'");
        flash($n . ' comments approved.');
    }
    redirect('/admin/fancomments.php?tab=' . urlencode((string)($_POST['tab'] ?? 'pending')));
}

$tab = (string)($_GET['tab'] ?? 'pending');
$tab = in_array($tab, ['pending', 'approved', 'hidden'], true) ? $tab : 'pending';
$rows = $pdo->prepare("SELECT c.*, f.username, f.first_name, f.last_name, f.last_initial, v.title AS vlog_title, p.title AS post_title
    FROM fan_comments c JOIN fans f ON f.id = c.fan_id LEFT JOIN vlogs v ON v.id = c.vlog_id LEFT JOIN posts p ON p.id = c.post_id
    WHERE c.status = ? ORDER BY c.id DESC LIMIT 200");
$rows->execute([$tab]);
$rows = $rows->fetchAll();
$counts = $pdo->query('SELECT status, COUNT(*) n FROM fan_comments GROUP BY status')->fetchAll(PDO::FETCH_KEY_PAIR);

admin_header('Fan comments');
?>
<h1>Fan comments</h1>
<p class="hint">Fans comment on vlogs and Behind the Scenes posts. Nothing shows to anyone else until you approve it. A comment written on a post that is linked to a vlog shows under both.</p>
<p class="gametabs">
  <a href="?tab=pending"<?= $tab === 'pending' ? ' class="on"' : '' ?>>Waiting (<?= (int)($counts['pending'] ?? 0) ?>)</a>
  <a href="?tab=approved"<?= $tab === 'approved' ? ' class="on"' : '' ?>>Live (<?= (int)($counts['approved'] ?? 0) ?>)</a>
  <a href="?tab=hidden"<?= $tab === 'hidden' ? ' class="on"' : '' ?>>Hidden (<?= (int)($counts['hidden'] ?? 0) ?>)</a>
</p>
<?php if ($tab === 'pending' && $rows): ?>
<form method="post" onsubmit="return confirm('Approve all waiting comments without reading them?');"><?= csrf_field() ?><input type="hidden" name="do" value="approve_all"><input type="hidden" name="tab" value="pending"><button class="btn ghost" type="submit">Approve all</button></form>
<?php endif; ?>
<?php if (!$rows): ?><p class="empty">Nothing here.</p><?php endif; ?>
<?php foreach ($rows as $c): ?>
<div class="proof">
  <p><?= nl2br(e($c['body'])) ?></p>
  <p class="hint">by <a href="/admin/fan.php?id=<?= (int)$c['fan_id'] ?>"><?= e($c['username']) ?></a> (<?= e(fan_full_name($c)) ?>) &middot; <?= e(substr($c['created_at'], 0, 16)) ?> UTC &middot;
    on <?= $c['post_title'] ? 'post "' . e($c['post_title']) . '"' : '' ?><?= $c['post_title'] && $c['vlog_title'] ? ' and ' : '' ?><?= $c['vlog_title'] ? 'vlog "' . e($c['vlog_title']) . '"' : '' ?></p>
  <form method="post" class="row"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$c['id'] ?>"><input type="hidden" name="tab" value="<?= e($tab) ?>">
    <?php if ($tab !== 'approved'): ?><button class="btn" name="do" value="approved">Approve</button><?php endif; ?>
    <?php if ($tab !== 'hidden'): ?><button class="btn ghost" name="do" value="hidden">Hide</button><?php endif; ?>
    <button class="link-danger" name="do" value="delete" onclick="return confirm('Delete this comment?');">Delete</button>
  </form>
</div>
<?php endforeach; ?>
<?php admin_footer(); ?>

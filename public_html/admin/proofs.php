<?php
// Admin: review fan screenshots (likes, follows, comments). Approving adds the points; the image is then deleted.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require __DIR__ . '/../inc/fans.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $id = (int)($_POST['id'] ?? 0);
    $act = (string)($_POST['action'] ?? '');
    $st = db()->prepare("SELECT * FROM proofs WHERE id = ? AND status = 'pending'");
    $st->execute([$id]);
    if (($p = $st->fetch()) && in_array($act, ['approve', 'reject'], true)) {
        $note = $act === 'reject' ? mb_substr(trim((string)($_POST['note'] ?? '')), 0, 120) : null;
        db()->prepare("UPDATE proofs SET status = ?, note = ?, file = NULL, reviewed_at = datetime('now') WHERE id = ?")
            ->execute([$act === 'approve' ? 'approved' : 'rejected', $note ?: null, $id]);
        if ($p['file']) {
            @unlink(__DIR__ . '/../data/proofs/' . basename((string)$p['file']));
        }
        flash($act === 'approve' ? 'Approved. Points added.' : 'Rejected.');
    }
    redirect('/admin/proofs.php');
}

$pending = db()->query("SELECT p.*, f.username, v.title FROM proofs p JOIN fans f ON f.id = p.fan_id LEFT JOIN vlogs v ON v.id = p.vlog_id WHERE p.status = 'pending' ORDER BY p.id")->fetchAll();
$done = db()->query("SELECT p.*, f.username, v.title FROM proofs p JOIN fans f ON f.id = p.fan_id LEFT JOIN vlogs v ON v.id = p.vlog_id WHERE p.status != 'pending' ORDER BY p.reviewed_at DESC, p.id DESC LIMIT 50")->fetchAll();
admin_header('Screenshots');
?>
<h1>Screenshots to review</h1>
<?php if (!$pending): ?><p class="empty">Nothing waiting. All caught up.</p><?php endif; ?>
<?php foreach ($pending as $p): ?>
<div class="proof">
  <p><strong><?= e($p['username']) ?></strong> says: <?= e(PROOF_PLATFORMS[$p['platform']] ?? $p['platform']) ?> &middot; <?= e(proof_action_label($p['platform'], $p['action'])) ?>
    <?= $p['title'] ? ' &middot; vlog: ' . e($p['title']) : '' ?> &middot; <strong><?= (int)$p['points'] ?> points</strong> <span class="hint">(<?= e(ago($p['created_at'])) ?>)</span></p>
  <?php if ($p['fan_note']): ?><p>Message: <em><?= e($p['fan_note']) ?></em></p><?php endif; ?>
  <?php if ($p['file']): ?><a href="/admin/proof-image.php?id=<?= (int)$p['id'] ?>" target="_blank" rel="noopener"><img src="/admin/proof-image.php?id=<?= (int)$p['id'] ?>" alt="Screenshot from <?= e($p['username']) ?>" loading="lazy"></a><?php endif; ?>
  <div class="row">
    <form method="post"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><input type="hidden" name="action" value="approve"><button class="btn" type="submit">Approve</button></form>
    <form method="post" class="inline"><?= csrf_field() ?><input type="hidden" name="id" value="<?= (int)$p['id'] ?>"><input type="hidden" name="action" value="reject">
      <input name="note" maxlength="120" placeholder="Reason (optional, the fan sees it)"><button class="btn ghost" type="submit">Reject</button></form>
  </div>
</div>
<?php endforeach; ?>

<?php if ($done): ?>
<h2>Already reviewed</h2>
<div class="table-wrap"><table>
<thead><tr><th>Fan</th><th>What</th><th>Message</th><th>Result</th><th>When</th></tr></thead><tbody>
<?php foreach ($done as $p): ?>
  <tr><td><?= e($p['username']) ?></td>
    <td><?= e(PROOF_PLATFORMS[$p['platform']] ?? $p['platform']) ?> &middot; <?= e(proof_action_label($p['platform'], $p['action'])) ?><?= $p['title'] ? ' &middot; ' . e($p['title']) : '' ?></td>
    <td><?= e((string)$p['fan_note']) ?></td>
    <td><?= $p['status'] === 'approved' ? '+' . (int)$p['points'] : 'Rejected' . ($p['note'] ? ': ' . e($p['note']) : '') ?></td>
    <td><?= e(substr((string)$p['reviewed_at'], 0, 10)) ?></td></tr>
<?php endforeach; ?>
</tbody></table></div>
<?php endif; ?>
<?php admin_footer(); ?>

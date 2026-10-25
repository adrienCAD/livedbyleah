<?php
// Admin: pick favorite TikTok / Instagram comments for each vlog, and hide YouTube ones if needed.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require __DIR__ . '/../inc/comments.php';
require_admin();

$pdo = db();
$vlogId = (int)($_REQUEST['vlog'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = (string)($_POST['action'] ?? '');
    $cid = (int)($_POST['cid'] ?? 0);
    if ($action === 'add' && $vlogId > 0) {
        $source = (string)($_POST['source'] ?? '');
        $author = display_name((string)($_POST['author'] ?? ''));
        $body = mb_substr(trim((string)($_POST['body'] ?? '')), 0, 600);
        if (!in_array($source, ['tiktok', 'instagram'], true) || $body === '') {
            flash('Pick TikTok or Instagram and paste the comment.');
        } else {
            $pdo->prepare('INSERT INTO comments (vlog_id, source, author, body) VALUES (?, ?, ?, ?)')
                ->execute([$vlogId, $source, $author, $body]);
            flash('Comment added.');
        }
    } elseif ($action === 'delete' && $cid > 0) {
        $pdo->prepare('DELETE FROM comments WHERE id = ?')->execute([$cid]);
        flash('Comment removed.');
    } elseif ($action === 'toggle' && $cid > 0) {
        $pdo->prepare('UPDATE comments SET hidden = 1 - hidden WHERE id = ?')->execute([$cid]);
    } elseif ($action === 'refresh' && $vlogId > 0) {
        $v = $pdo->prepare('SELECT * FROM vlogs WHERE id = ?');
        $v->execute([$vlogId]);
        if ($row = $v->fetch()) {
            $err = yt_refresh($row);
            set_setting('youtube_last_error', $err ?? '');
            flash($err ?? 'YouTube comments refreshed.');
        }
    }
    redirect('/admin/comments.php?vlog=' . $vlogId);
}

$vlogs = $pdo->query('SELECT id, title FROM vlogs ORDER BY sort_order ASC, id DESC')->fetchAll();
$current = null;
foreach ($vlogs as $v) { if ((int)$v['id'] === $vlogId) { $current = $v; } }
$comments = [];
if ($current) {
    $s = $pdo->prepare('SELECT * FROM comments WHERE vlog_id = ? ORDER BY source, likes DESC, id DESC');
    $s->execute([$vlogId]);
    $comments = $s->fetchAll();
}

admin_header('Comments');
?>
<h1>Comments</h1>
<form method="get" class="form">
  <label for="vlog">Choose a vlog</label>
  <select id="vlog" name="vlog" onchange="this.form.submit()">
    <option value="">Select...</option>
    <?php foreach ($vlogs as $v): ?>
      <option value="<?= (int)$v['id'] ?>"<?= (int)$v['id'] === $vlogId ? ' selected' : '' ?>><?= e($v['title']) ?></option>
    <?php endforeach; ?>
  </select>
  <noscript><button class="btn" type="submit">Open</button></noscript>
</form>

<?php if ($current): ?>
<h2>Add a favorite TikTok or Instagram comment</h2>
<form method="post" class="form">
  <?= csrf_field() ?>
  <input type="hidden" name="action" value="add">
  <input type="hidden" name="vlog" value="<?= $vlogId ?>">
  <label for="source">Where is it from?</label>
  <select id="source" name="source"><option value="tiktok">TikTok</option><option value="instagram">Instagram</option></select>
  <label for="author">Their name (shown as first name + last initial, like "Mia K.")</label>
  <input id="author" name="author" maxlength="60">
  <label for="body">Comment</label>
  <textarea id="body" name="body" rows="3" maxlength="600" required></textarea>
  <div class="row"><button class="btn" type="submit">Add comment</button></div>
</form>

<h2>Comments on this vlog</h2>
<form method="post" class="form">
  <?= csrf_field() ?>
  <input type="hidden" name="action" value="refresh">
  <input type="hidden" name="vlog" value="<?= $vlogId ?>">
  <button class="btn ghost" type="submit">Check YouTube for new comments now</button>
</form>
<?php if (setting('youtube_last_error') !== ''): ?><p class="notice"><?= e(setting('youtube_last_error')) ?></p><?php endif; ?>
<?php if (!$comments): ?><p class="empty">Nothing yet.</p><?php endif; ?>
<div class="table-wrap">
<table>
  <thead><tr><th>From</th><th>Comment</th><th></th></tr></thead>
  <tbody>
  <?php foreach ($comments as $c): ?>
    <tr<?= $c['hidden'] ? ' style="opacity:.5"' : '' ?>>
      <td><?= e(ucfirst($c['source'])) ?><br><small><?= e($c['author']) ?></small></td>
      <td><?= e($c['body']) ?><?= $c['hidden'] ? ' <em>(hidden)</em>' : '' ?></td>
      <td class="actions">
        <form method="post"><?= csrf_field() ?>
          <input type="hidden" name="vlog" value="<?= $vlogId ?>"><input type="hidden" name="cid" value="<?= (int)$c['id'] ?>">
          <?php if ($c['source'] === 'youtube'): ?>
            <input type="hidden" name="action" value="toggle"><button type="submit" class="link-danger"><?= $c['hidden'] ? 'Show' : 'Hide' ?></button>
          <?php else: ?>
            <input type="hidden" name="action" value="delete"><button type="submit" class="link-danger" onclick="return confirm('Remove this comment?');">Remove</button>
          <?php endif; ?>
        </form>
      </td>
    </tr>
  <?php endforeach; ?>
  </tbody>
</table>
</div>
<?php endif; ?>
<?php admin_footer(); ?>

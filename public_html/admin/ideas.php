<?php
// Admin: Ideas for Leah. Approve (show on the board), choose (+points), mark as done, decline, delete. Hide fan comments.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require __DIR__ . '/../inc/fans.php';
require __DIR__ . '/../inc/ideas.php';
require_admin();

$pdo = db();
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $a = (string)($_POST['action'] ?? '');
    $id = (int)($_POST['id'] ?? 0);
    $note = clean_text((string)($_POST['leah_note'] ?? ''), 300);
    $note = $note !== '' ? $note : null;
    if ($a === 'status' && $id > 0) {
        $to = (string)($_POST['to'] ?? '');
        if (isset(IDEA_STATUS[$to])) {
            $pts = 0;
            if ($to === 'chosen' || $to === 'done') {
                $pts = max(0, min(200, (int)($_POST['points'] ?? IDEA_POINTS)));
            }
            $pdo->prepare('UPDATE ideas SET status = ?, points = ?, leah_note = ?, decided_at = datetime("now") WHERE id = ?')->execute([$to, $pts, $note, $id]);
            flash('Idea updated: ' . IDEA_STATUS[$to] . ($pts ? ' (+' . $pts . ' points for the fan)' : '') . '.');
        }
    } elseif ($a === 'delete' && $id > 0) {
        $pdo->prepare('DELETE FROM ideas WHERE id = ?')->execute([$id]);
        flash('Idea deleted.');
    } elseif ($a === 'comment') {
        $cid = (int)($_POST['cid'] ?? 0);
        if (($_POST['do'] ?? '') === 'delete') {
            $pdo->prepare('DELETE FROM idea_comments WHERE id = ?')->execute([$cid]);
            flash('Comment deleted.');
        } else {
            $pdo->prepare('UPDATE idea_comments SET hidden = 1 - hidden WHERE id = ?')->execute([$cid]);
            flash('Comment updated.');
        }
    }
    redirect('/admin/ideas.php' . (isset($_POST['tab']) ? '?tab=' . urlencode((string)$_POST['tab']) : ''));
}

$tab = (string)($_GET['tab'] ?? 'pending');
$tab = in_array($tab, ['pending', 'board', 'declined'], true) ? $tab : 'pending';
$where = ['pending' => "i.status = 'pending'", 'board' => "i.status IN ('open', 'chosen', 'done')", 'declined' => "i.status = 'declined'"][$tab];
$ideas = $pdo->query("SELECT i.*, f.username, f.first_name, f.last_name, f.last_initial,
    (SELECT COUNT(*) FROM idea_likes l WHERE l.idea_id = i.id) AS likes FROM ideas i JOIN fans f ON f.id = i.fan_id WHERE $where ORDER BY i.id DESC")->fetchAll();
$counts = $pdo->query("SELECT status, COUNT(*) n FROM ideas GROUP BY status")->fetchAll(PDO::FETCH_KEY_PAIR);
$cm = [];
foreach ($pdo->query('SELECT c.*, f.username FROM idea_comments c JOIN fans f ON f.id = c.fan_id ORDER BY c.id')->fetchAll() as $c) {
    $cm[(int)$c['idea_id']][] = $c;
}

admin_header('Ideas');
?>
<h1>Ideas for Leah</h1>
<p class="hint">New ideas wait here until you approve them. <strong>Approve</strong> = shows on the public board. <strong>Choose</strong> = Leah will do it, the fan gets <?= IDEA_POINTS ?> points (you can change the number). <strong>Done</strong> = it is live (points kept). <strong>Decline</strong> = only the fan sees it, with your note.</p>
<p class="gametabs">
  <a href="?tab=pending"<?= $tab === 'pending' ? ' class="on"' : '' ?>>Waiting (<?= (int)($counts['pending'] ?? 0) ?>)</a>
  <a href="?tab=board"<?= $tab === 'board' ? ' class="on"' : '' ?>>On the board (<?= (int)($counts['open'] ?? 0) + (int)($counts['chosen'] ?? 0) + (int)($counts['done'] ?? 0) ?>)</a>
  <a href="?tab=declined"<?= $tab === 'declined' ? ' class="on"' : '' ?>>Declined (<?= (int)($counts['declined'] ?? 0) ?>)</a>
</p>
<?php if (!$ideas): ?><p class="empty">Nothing here.</p><?php endif; ?>
<?php foreach ($ideas as $i): $id = (int)$i['id']; ?>
<div class="proof">
  <p><strong><?= e($i['title']) ?></strong> <span class="badge"><?= e(IDEA_STATUS[$i['status']]) ?></span><?= (int)$i['points'] ? ' +' . (int)$i['points'] . ' pts' : '' ?></p>
  <p><?= nl2br(e($i['body'])) ?></p>
  <p class="hint">by <?= e($i['username']) ?> (<?= e(fan_full_name($i)) ?>) &middot; <?= e(substr($i['created_at'], 0, 16)) ?> UTC &middot; &#9829; <?= (int)$i['likes'] ?></p>
  <form method="post" class="form">
    <?= csrf_field() ?><input type="hidden" name="action" value="status"><input type="hidden" name="id" value="<?= $id ?>"><input type="hidden" name="tab" value="<?= e($tab) ?>">
    <label for="n<?= $id ?>">Leah's note (optional, shown with the idea)</label>
    <input id="n<?= $id ?>" name="leah_note" maxlength="300" value="<?= e($i['leah_note'] ?? '') ?>">
    <label for="p<?= $id ?>">Points if chosen</label>
    <input id="p<?= $id ?>" name="points" type="number" min="0" max="200" value="<?= (int)$i['points'] ?: IDEA_POINTS ?>" style="max-width:120px">
    <div class="row">
      <?php if ($i['status'] !== 'open'): ?><button class="btn ghost" name="to" value="open">Approve (show it)</button><?php endif; ?>
      <?php if ($i['status'] !== 'chosen'): ?><button class="btn" name="to" value="chosen">Choose it</button><?php endif; ?>
      <?php if ($i['status'] !== 'done'): ?><button class="btn ghost" name="to" value="done">Done</button><?php endif; ?>
      <?php if ($i['status'] !== 'declined'): ?><button class="btn ghost" name="to" value="declined">Decline</button><?php endif; ?>
      <?php if ($i['status'] !== 'pending'): ?><button class="btn ghost" name="to" value="<?= e($i['status']) ?>">Save note</button><?php endif; ?>
    </div>
  </form>
  <form method="post" onsubmit="return confirm('Delete this idea and its comments?');"><?= csrf_field() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="<?= $id ?>"><input type="hidden" name="tab" value="<?= e($tab) ?>"><button class="link-danger" type="submit">Delete idea</button></form>
  <?php if (!empty($cm[$id])): ?>
  <details><summary><?= count($cm[$id]) ?> comments</summary>
  <?php foreach ($cm[$id] as $c): ?>
    <div class="comment"<?= (int)$c['hidden'] ? ' style="opacity:.5"' : '' ?>><p><?= nl2br(e($c['body'])) ?></p>
      <footer><?= e($c['username']) ?><?= (int)$c['hidden'] ? ' (hidden)' : '' ?> &middot;
        <form method="post" style="display:inline"><?= csrf_field() ?><input type="hidden" name="action" value="comment"><input type="hidden" name="cid" value="<?= (int)$c['id'] ?>"><input type="hidden" name="tab" value="<?= e($tab) ?>">
          <button class="link-danger" type="submit"><?= (int)$c['hidden'] ? 'unhide' : 'hide' ?></button>
          <button class="link-danger" type="submit" name="do" value="delete" onclick="return confirm('Delete this comment?');">delete</button></form></footer></div>
  <?php endforeach; ?>
  </details>
  <?php endif; ?>
</div>
<?php endforeach; ?>
<?php admin_footer(); ?>

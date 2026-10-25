<?php
// Admin: add, edit, delete and reorder vlogs.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require_admin();

$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = (string)($_POST['action'] ?? '');
    $id = (int)($_POST['id'] ?? 0);

    if ($action === 'delete' && $id > 0) {
        $pdo->prepare('DELETE FROM vlogs WHERE id = ?')->execute([$id]);
        flash('Vlog deleted.');
        redirect('/admin/vlogs.php');
    }

    if ($action === 'save') {
        $title = trim((string)($_POST['title'] ?? ''));
        $yt = youtube_id((string)($_POST['youtube'] ?? ''));
        $tt = clean_url((string)($_POST['tiktok_url'] ?? ''));
        $ig = clean_url((string)($_POST['instagram_url'] ?? ''));
        $why = mb_substr(trim((string)($_POST['why'] ?? '')), 0, 1200);
        if ($title === '' || mb_strlen($title) > 200) {
            flash('Add a title (up to 200 characters).');
        } elseif ($yt === null) {
            flash('That does not look like a YouTube link. Paste the full link.');
        } elseif ($id > 0) {
            $pdo->prepare('UPDATE vlogs SET title=?, youtube_id=?, tiktok_url=?, instagram_url=?, why=? WHERE id=?')
                ->execute([$title, $yt, $tt, $ig, $why, $id]);
            flash('Vlog saved.');
        } else {
            // New vlogs go to the top of the list.
            $pdo->exec('UPDATE vlogs SET sort_order = sort_order + 1');
            $pdo->prepare('INSERT INTO vlogs (title, youtube_id, tiktok_url, instagram_url, why, sort_order) VALUES (?, ?, ?, ?, ?, 0)')
                ->execute([$title, $yt, $tt, $ig, $why]);
            flash('Vlog added.');
        }
        redirect('/admin/vlogs.php');
    }
}

$vlogs = $pdo->query('SELECT * FROM vlogs ORDER BY sort_order ASC, id DESC')->fetchAll();
$editing = null;
if (isset($_GET['edit'])) {
    $s = $pdo->prepare('SELECT * FROM vlogs WHERE id = ?');
    $s->execute([(int)$_GET['edit']]);
    $editing = $s->fetch() ?: null;
}

admin_header('Vlogs');
?>
<h1>Vlogs</h1>

<h2><?= $editing ? 'Edit vlog' : 'Add a vlog' ?></h2>
<form method="post" class="form">
  <?= csrf_field() ?>
  <input type="hidden" name="action" value="save">
  <input type="hidden" name="id" value="<?= $editing ? (int)$editing['id'] : 0 ?>">
  <label for="title">Title</label>
  <input id="title" name="title" required maxlength="200" value="<?= e($editing['title'] ?? '') ?>">
  <label for="youtube">YouTube link</label>
  <input id="youtube" name="youtube" required placeholder="https://www.youtube.com/shorts/..." value="<?= $editing ? e('https://www.youtube.com/shorts/' . $editing['youtube_id']) : '' ?>">
  <label for="tiktok_url">TikTok link (optional)</label>
  <input id="tiktok_url" name="tiktok_url" value="<?= e($editing['tiktok_url'] ?? '') ?>">
  <label for="instagram_url">Instagram link (optional)</label>
  <input id="instagram_url" name="instagram_url" value="<?= e($editing['instagram_url'] ?? '') ?>">
  <label for="why">My thought process (why I made this video)</label>
  <textarea id="why" name="why" rows="4" maxlength="1200"><?= e($editing['why'] ?? '') ?></textarea>
  <div class="row">
    <button class="btn" type="submit"><?= $editing ? 'Save changes' : 'Add vlog' ?></button>
    <?php if ($editing): ?><a class="btn ghost" href="/admin/vlogs.php">Cancel</a><?php endif; ?>
  </div>
</form>

<h2>All vlogs (<?= count($vlogs) ?>)</h2>
<div class="table-wrap">
<table>
  <thead><tr><th>Title</th><th></th></tr></thead>
  <tbody>
  <?php foreach ($vlogs as $v): ?>
    <tr>
      <td><?= e($v['title']) ?></td>
      <td class="actions">
        <a href="/admin/vlogs.php?edit=<?= (int)$v['id'] ?>">Edit</a>
        <a href="/admin/comments.php?vlog=<?= (int)$v['id'] ?>">Comments</a>
        <form method="post" onsubmit="return confirm('Delete this vlog?');">
          <?= csrf_field() ?>
          <input type="hidden" name="action" value="delete">
          <input type="hidden" name="id" value="<?= (int)$v['id'] ?>">
          <button type="submit" class="link-danger">Delete</button>
        </form>
      </td>
    </tr>
  <?php endforeach; ?>
  </tbody>
</table>
</div>
<?php admin_footer(); ?>

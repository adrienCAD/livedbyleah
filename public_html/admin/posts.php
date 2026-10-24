<?php
// Admin: write, edit and delete Writing Process posts.
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
        $pdo->prepare('DELETE FROM posts WHERE id = ?')->execute([$id]);
        flash('Post deleted.');
        redirect('/admin/posts.php');
    }

    if ($action === 'save') {
        $title = trim((string)($_POST['title'] ?? ''));
        $body = trim((string)($_POST['body'] ?? ''));
        $vlogId = (int)($_POST['vlog_id'] ?? 0) ?: null;
        if ($title === '' || $body === '') {
            flash('Add a title and some text.');
        } elseif (mb_strlen($title) > 200 || mb_strlen($body) > 5000) {
            flash('Too long. Title up to 200 characters, text up to 5000.');
        } elseif ($id > 0) {
            $pdo->prepare('UPDATE posts SET title=?, body=?, vlog_id=? WHERE id=?')->execute([$title, $body, $vlogId, $id]);
            flash('Post saved.');
        } else {
            $pdo->prepare('INSERT INTO posts (title, body, vlog_id) VALUES (?, ?, ?)')->execute([$title, $body, $vlogId]);
            flash('Post published.');
        }
        redirect('/admin/posts.php');
    }
}

$posts = $pdo->query('SELECT * FROM posts ORDER BY created_at DESC, id DESC')->fetchAll();
$vlogs = $pdo->query('SELECT id, title FROM vlogs ORDER BY sort_order ASC, id DESC')->fetchAll();
$editing = null;
if (isset($_GET['edit'])) {
    $s = $pdo->prepare('SELECT * FROM posts WHERE id = ?');
    $s->execute([(int)$_GET['edit']]);
    $editing = $s->fetch() ?: null;
}

admin_header('Writing posts');
?>
<h1>Writing posts</h1>

<h2><?= $editing ? 'Edit post' : 'New post' ?></h2>
<form method="post" class="form">
  <?= csrf_field() ?>
  <input type="hidden" name="action" value="save">
  <input type="hidden" name="id" value="<?= $editing ? (int)$editing['id'] : 0 ?>">
  <label for="title">Title</label>
  <input id="title" name="title" required maxlength="200" value="<?= e($editing['title'] ?? '') ?>">
  <label for="body">What is this vlog about? How did you make it?</label>
  <textarea id="body" name="body" rows="8" required maxlength="5000"><?= e($editing['body'] ?? '') ?></textarea>
  <label for="vlog_id">Linked vlog (optional)</label>
  <select id="vlog_id" name="vlog_id">
    <option value="0">None</option>
    <?php foreach ($vlogs as $v): ?>
      <option value="<?= (int)$v['id'] ?>"<?= $editing && (int)$editing['vlog_id'] === (int)$v['id'] ? ' selected' : '' ?>><?= e($v['title']) ?></option>
    <?php endforeach; ?>
  </select>
  <div class="row">
    <button class="btn" type="submit"><?= $editing ? 'Save changes' : 'Publish' ?></button>
    <?php if ($editing): ?><a class="btn ghost" href="/admin/posts.php">Cancel</a><?php endif; ?>
  </div>
</form>

<h2>All posts (<?= count($posts) ?>)</h2>
<div class="table-wrap">
<table>
  <thead><tr><th>Title</th><th>Date</th><th></th></tr></thead>
  <tbody>
  <?php foreach ($posts as $p): ?>
    <tr>
      <td><?= e($p['title']) ?></td>
      <td><?= e(substr($p['created_at'], 0, 10)) ?></td>
      <td class="actions">
        <a href="/admin/posts.php?edit=<?= (int)$p['id'] ?>">Edit</a>
        <form method="post" onsubmit="return confirm('Delete this post?');">
          <?= csrf_field() ?>
          <input type="hidden" name="action" value="delete">
          <input type="hidden" name="id" value="<?= (int)$p['id'] ?>">
          <button type="submit" class="link-danger">Delete</button>
        </form>
      </td>
    </tr>
  <?php endforeach; ?>
  </tbody>
</table>
</div>
<?php admin_footer(); ?>

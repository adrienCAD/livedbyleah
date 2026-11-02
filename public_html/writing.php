<?php
// Behind the Scenes (was Writing Process): public and read-only. Leah and the admins write the posts in Admin > Behind the Scenes.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/fans.php';
require __DIR__ . '/inc/fancomments.php';

$fan = current_fan();
$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $pid = (int)($_POST['post_id'] ?? 0);
    if (!$fan) {
        flash('Join the fan club to comment.');
        redirect('/fans.php?v=join');
    }
    if (($_POST['action'] ?? '') === 'delete_comment') {
        db()->prepare('DELETE FROM fan_comments WHERE id = ? AND fan_id = ?')->execute([(int)($_POST['comment_id'] ?? 0), $fan['id']]);
        redirect('/writing.php#p-' . $pid);
    }
    [$ok, $msg] = fc_submit($fan, 0, $pid, (string)($_POST['body'] ?? ''));
    if ($ok) {
        flash($msg);
        redirect('/writing.php#p-' . $pid);
    }
    $err = $msg;
    $errPost = $pid;
    $oldBody = (string)($_POST['body'] ?? '');
}
$flashMsg = flash();

$posts = db()->query(
    'SELECT p.id, p.title, p.body, p.created_at, p.published, v.title AS vlog_title, v.id AS vlog_id
     FROM posts p LEFT JOIN vlogs v ON v.id = p.vlog_id
     ' . (is_admin() ? '' : 'WHERE p.published = 1') . '
     ORDER BY p.created_at DESC, p.id DESC'
)->fetchAll();

page_header('Behind the Scenes', 'writing');
?>
<h1>Behind the Scenes</h1>
<p class="lede">How my vlogs come together, from the first idea to the final cut.</p>
<?php if (is_admin()): ?><p class="hint">You are an admin: write and edit posts in <a href="/admin/posts.php">Admin &gt; Behind the Scenes</a>. Hidden posts show here only for you.</p><?php endif; ?>

<?php if ($flashMsg): ?><p class="notice"><?= e($flashMsg) ?></p><?php endif; ?>
<?php if (!$posts): ?>
  <p class="empty">Nothing here yet. Come back soon!</p>
<?php endif; ?>

<?php foreach ($posts as $p): ?>
  <article class="post" id="p-<?= (int)$p['id'] ?>">
    <time datetime="<?= e(substr($p['created_at'], 0, 10)) ?>"><?= e(date('F j, Y', strtotime($p['created_at']))) ?></time>
    <h2><?= e($p['title']) ?><?php if (!(int)$p['published']): ?> <small class="badge">hidden</small><?php endif; ?></h2>
    <div class="post-body"><?= nl2br(e($p['body'])) ?></div>
    <?php if ($p['vlog_id']): ?>
      <a class="post-vlog" href="/vlogs.php#v-<?= (int)$p['vlog_id'] ?>">Watch: <?= e($p['vlog_title']) ?></a>
    <?php endif; ?>
    <?php
      $thread = $p['vlog_id'] ? fc_for_vlog((int)$p['vlog_id']) : fc_for_post((int)$p['id']);
      $mine = [];
      if ($fan) {   // the fan also sees their own comments that are still waiting for Leah
          $q = db()->prepare("SELECT id, body, created_at FROM fan_comments WHERE fan_id = ? AND status = 'pending' AND (post_id = ? OR (vlog_id IS NOT NULL AND vlog_id = ?)) ORDER BY id DESC");
          $q->execute([$fan['id'], $p['id'], (int)$p['vlog_id']]);
          $mine = $q->fetchAll();
      }
    ?>
    <section class="post-comments" aria-label="Comments on <?= e($p['title']) ?>">
      <h3>Comments</h3>
      <?php if ($fan): ?>
      <form class="cform" method="post" action="/writing.php#p-<?= (int)$p['id'] ?>">
        <?= csrf_field() ?><input type="hidden" name="post_id" value="<?= (int)$p['id'] ?>">
        <?php if ($err && ($errPost ?? 0) === (int)$p['id']): ?><p class="error"><?= e($err) ?></p><?php endif; ?>
        <label class="sr" for="pc-<?= (int)$p['id'] ?>">Add a comment</label>
        <textarea id="pc-<?= (int)$p['id'] ?>" name="body" rows="2" maxlength="<?= FC_MAX ?>" required placeholder="Add a comment as <?= e($fan['username']) ?>..."><?= $err && ($errPost ?? 0) === (int)$p['id'] ? e($oldBody) : '' ?></textarea>
        <div class="cform-row"><button class="btn ghost" type="submit">Comment</button></div>
        <p class="hint">Leah reads every comment before it goes live. No links please.<?= $p['vlog_id'] ? ' Your comment will also show under the vlog.' : '' ?></p>
      </form>
      <?php else: ?><?= fc_guest_prompt() ?><?php endif; ?>
      <div class="yc-feed">
      <?php foreach ($mine as $c): ?>
        <div class="yc waiting"><span class="yc-av" style="background:#6b7a8c"><?= e(mb_strtoupper(mb_substr($fan['username'], 0, 1))) ?></span>
          <div class="yc-main"><div class="yc-head"><strong><?= e($fan['username']) ?></strong><span class="yc-src">Waiting for Leah</span><span class="yc-ago"><?= e(ago($c['created_at'])) ?></span></div>
            <p class="yc-text"><?= e($c['body']) ?></p>
            <form method="post" action="/writing.php" class="inline" onsubmit="return confirm('Delete your comment?');"><?= csrf_field() ?><input type="hidden" name="action" value="delete_comment"><input type="hidden" name="post_id" value="<?= (int)$p['id'] ?>"><input type="hidden" name="comment_id" value="<?= (int)$c['id'] ?>"><button class="link-danger" type="submit">delete</button></form></div></div>
      <?php endforeach; ?>
      <?php foreach ($thread as $c): ?>
        <div class="yc"><span class="yc-av" style="background:hsl(<?= (array_sum(array_map('ord', str_split($c['username']))) * 31) % 360 ?>,55%,42%)"><?= e(mb_strtoupper(mb_substr($c['username'], 0, 1))) ?></span>
          <div class="yc-main"><div class="yc-head"><strong><?= e($c['username']) ?></strong><span class="yc-src fan">Fan</span><span class="yc-ago"><?= e(ago($c['created_at'])) ?></span></div>
            <p class="yc-text"><?= e($c['body']) ?></p></div></div>
      <?php endforeach; ?>
      <?php if (!$thread && !$mine): ?><p class="hint">No comments yet. Be the first!</p><?php endif; ?>
      </div>
    </section>
  </article>
<?php endforeach; ?>

<?php page_footer(); ?>

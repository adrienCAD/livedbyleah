<?php
// Writing Process: private to Leah and admins. Short posts about each vlog and the thinking behind it.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require_admin();

$posts = db()->query(
    'SELECT p.id, p.title, p.body, p.created_at, v.title AS vlog_title, v.youtube_id
     FROM posts p LEFT JOIN vlogs v ON v.id = p.vlog_id
     ORDER BY p.created_at DESC, p.id DESC'
)->fetchAll();

page_header('Writing Process', 'writing');
?>
<h1>Writing process</h1>
<p class="hint">Private: only Leah and admins can see this tab.</p>
<p class="lede">What each vlog is about and how it came together.</p>

<?php if (!$posts): ?>
  <p class="empty">No posts yet. Add one from the admin area.</p>
<?php endif; ?>

<?php foreach ($posts as $p): ?>
  <article class="post">
    <time datetime="<?= e(substr($p['created_at'], 0, 10)) ?>"><?= e(date('F j, Y', strtotime($p['created_at']))) ?></time>
    <h2><?= e($p['title']) ?></h2>
    <div class="post-body"><?= nl2br(e($p['body'])) ?></div>
    <?php if ($p['youtube_id']): ?>
      <a class="post-vlog" href="/vlogs.php#v-<?= e($p['youtube_id']) ?>">Watch: <?= e($p['vlog_title']) ?></a>
    <?php endif; ?>
  </article>
<?php endforeach; ?>

<?php page_footer(); ?>

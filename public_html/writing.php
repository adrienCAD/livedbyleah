<?php
// Behind the Scenes (was Writing Process): public and read-only. Leah and the admins write the posts in Admin > Behind the Scenes.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';

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
  </article>
<?php endforeach; ?>

<?php page_footer(); ?>

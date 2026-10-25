<?php
// Tab 2: Watch Vlogs. YouTube Shorts are shown as thumbnails and load the player on click.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';

$vlogs = db()->query('SELECT * FROM vlogs ORDER BY sort_order ASC, id DESC')->fetchAll();

page_header('Watch Vlogs', 'vlogs');
?>
<h1>Watch vlogs</h1>
<p class="lede">Tap a vlog to play it here. Find more on
  <a href="https://www.youtube.com/@Livedbyleah" target="_blank" rel="noopener">YouTube</a>,
  <a href="https://www.tiktok.com/@livedbyleah" target="_blank" rel="noopener">TikTok</a> and
  <a href="https://www.instagram.com/lived.by.leah/" target="_blank" rel="noopener">Instagram</a>.</p>

<?php if (!$vlogs): ?>
  <p class="empty">No vlogs yet.</p>
<?php endif; ?>

<div class="vlog-grid">
<?php foreach ($vlogs as $v): $id = $v['youtube_id']; $out = $v['instagram_url'] ?: $v['tiktok_url']; ?>
  <article class="vlog" id="v-<?= (int)$v['id'] ?>">
    <?php if ($id !== ''): ?>
    <button class="vlog-thumb" type="button" data-yt="<?= e($id) ?>" aria-label="Play <?= e($v['title']) ?>">
      <img src="https://i.ytimg.com/vi/<?= e($id) ?>/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
      <span class="play" aria-hidden="true"></span>
    </button>
    <?php else: ?>
    <a class="vlog-thumb link-out" href="<?= e((string)$out) ?>" target="_blank" rel="noopener" aria-label="Watch <?= e($v['title']) ?> on <?= $v['instagram_url'] ? 'Instagram' : 'TikTok' ?>">
      <span class="play" aria-hidden="true"></span>
      <span class="lo-text">Watch on <?= $v['instagram_url'] ? 'Instagram' : 'TikTok' ?></span>
    </a>
    <?php endif; ?>
    <h2><?= e($v['title']) ?></h2>
    <p class="vlog-links">
      <?php if ($id !== ''): ?><a href="https://www.youtube.com/shorts/<?= e($id) ?>" target="_blank" rel="noopener">YouTube</a><?php endif; ?>
      <?php if ($v['tiktok_url']): ?><a href="<?= e($v['tiktok_url']) ?>" target="_blank" rel="noopener">TikTok</a><?php endif; ?>
      <?php if ($v['instagram_url']): ?><a href="<?= e($v['instagram_url']) ?>" target="_blank" rel="noopener">Instagram</a><?php endif; ?>
      <?php if (is_admin()): ?><a class="gear" href="/admin/vlogs.php?edit=<?= (int)$v['id'] ?>" title="Edit links (admin only)" aria-label="Edit links for <?= e($v['title']) ?>">&#9881;</a><?php endif; ?>
    </p>
    <button type="button" class="drawer-btn" aria-expanded="false" data-vlog="<?= (int)$v['id'] ?>">Why I made this + comments</button>
  </article>
<?php endforeach; ?>
</div>

<template id="drawerTpl">
  <section class="drawer" aria-live="polite">
    <button type="button" class="drawer-close" aria-label="Close">&times;</button>
    <div class="drawer-body"><p class="hint">Loading...</p></div>
  </section>
</template>

<?php page_footer(); ?>

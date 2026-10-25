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
  <a href="https://www.youtube.com/@Livedbyleah" target="_blank" rel="noopener">YouTube</a>, TikTok and Instagram.</p>

<?php if (!$vlogs): ?>
  <p class="empty">No vlogs yet.</p>
<?php endif; ?>

<div class="vlog-grid">
<?php foreach ($vlogs as $v): $id = $v['youtube_id']; ?>
  <article class="vlog" id="v-<?= e($id) ?>">
    <button class="vlog-thumb" type="button" data-yt="<?= e($id) ?>" aria-label="Play <?= e($v['title']) ?>">
      <img src="https://i.ytimg.com/vi/<?= e($id) ?>/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
      <span class="play" aria-hidden="true"></span>
    </button>
    <h2><?= e($v['title']) ?></h2>
    <p class="vlog-links">
      <a href="https://www.youtube.com/shorts/<?= e($id) ?>" target="_blank" rel="noopener">YouTube</a>
      <?php if ($v['tiktok_url']): ?><a href="<?= e($v['tiktok_url']) ?>" target="_blank" rel="noopener">TikTok</a><?php endif; ?>
      <?php if ($v['instagram_url']): ?><a href="<?= e($v['instagram_url']) ?>" target="_blank" rel="noopener">Instagram</a><?php endif; ?>
    </p>
    <button type="button" class="drawer-btn" aria-expanded="false" data-vlog="<?= e($id) ?>">Why I made this + comments</button>
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

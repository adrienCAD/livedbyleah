<?php
// Hall of Fame: its own section (v1.6.0, was inside Fan Fest). Top 5 per game, the overall champion, the fan ranking.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/fans.php';

$fan = current_fan();
$ranking = ($fan || is_admin()) ? fan_ranking() : [];
page_header('Hall of Fame', 'hof');
?>
<h1>Hall of Fame</h1>
<p class="lede">The best runs in every game. Beat one and your name goes up here.</p>
<?php hof_render(hof_summary()); ?>

<?php if ($fan || is_admin()): /* the fan ranking stays for signed-in fans, like on Fan Fest */ ?>
<h2>Top fans</h2>
<?php if (!$ranking): ?>
<p class="empty">No fans yet. <a href="/fans.php?v=join">Be the first!</a></p>
<?php else: ?>
<p class="hint">Fan points come from joining, game levels, screenshots and chosen ideas. <a href="/fans.php">How to earn points</a></p>
<ol class="fanlist ranking">
<?php foreach (array_slice($ranking, 0, 10) as $f): $me = $fan && $f['id'] === (int)$fan['id']; ?>
  <li<?= $me ? ' class="me"' : '' ?>><span class="nm">#<?= (int)$f['rank'] ?> <?= e($f['username']) ?><?= $me ? ' (you)' : '' ?></span>
    <span class="seen"><?= (int)$f['pts'] ?> points</span></li>
<?php endforeach; ?>
</ol>
<?php endif; ?>
<?php endif; ?>
<?php if (!$fan && !is_admin()): ?>
<div class="soon fan-join"><p><strong>Want your name up here?</strong> Join the fan club and your scores are saved under your own name.</p>
<p><a class="btn" href="/fans.php?v=join">Join the fan club</a></p></div>
<?php endif; ?>
<?php page_footer(); ?>

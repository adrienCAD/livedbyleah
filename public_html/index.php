<?php
// Home (v1.6.0): what Lived by Leah is, and a quick tour of every section. Was a redirect to /vlogs.php.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/fans.php';

$latest = db()->query("SELECT id, title, youtube_id FROM vlogs WHERE youtube_id != '' ORDER BY sort_order ASC, id DESC LIMIT 3")->fetchAll();
$nFans = fan_count();
$nVlogs = (int)db()->query('SELECT COUNT(*) FROM vlogs')->fetchColumn();
$nGames = count(array_filter(['surf', 'road', 'blocks', 'bert'], 'game_public'));
$fan = current_fan();

$sections = [
    ['/vlogs.php', 'Watch Vlogs', 'v', 'All my vlogs in one place. Tap one to watch it right here, and open Comments to see what everyone says.'],
    ['/games.php', 'Play Games', 'g', 'Little pixel games I drew the art for. Surf, drive, stomp. Each one has its own leaderboard.'],
    ['/halloffame.php', 'Hall of Fame', 'h', 'The best scores in every game and the overall champion. Can you beat my record?'],
    ['/fans.php', 'Fan Fest', 'f', 'The fan club. Join for free, pick a username and earn points by playing, liking, commenting and following.'],
    ['/ideas.php', 'Ideas for Leah', 'i', 'Tell me what you want to see next. Like and comment on other ideas. If I pick yours, you get ' . IDEA_POINTS . ' points.'],
    ['/writing.php', 'Behind the Scenes', 'b', 'How my vlogs come together, from the first idea to the final cut.'],
];

page_header('Home', 'home');
?>
<section class="hero">
  <img class="hero-logo" src="/assets/img/leah-logo.png" width="400" height="190" alt="Leah">
  <div>
    <p class="hero-kicker">Hi, I'm Leah.</p>
    <h1>Welcome to Lived by Leah</h1>
    <p class="lede">This is my corner of the internet. I make vlogs about my life and the places I go, and this site is where it all lives: the videos, the stories behind them, some games I made the art for, and a fan club where you can hang out and help me decide what comes next.</p>
    <p class="row">
      <a class="btn" href="/vlogs.php">Watch the vlogs</a>
      <a class="btn" href="/games.php">Play games</a>
      <?php if (!$fan): ?><a class="btn ghost" href="/fans.php?v=join">Join the fan club</a><?php else: ?><a class="btn ghost" href="/fans.php">Go to the fan club</a><?php endif; ?>
    </p>
  </div>
</section>

<ul class="stats">
  <li><strong><?= $nVlogs ?></strong> vlogs</li>
  <li><strong><?= $nGames ?></strong> games</li>
  <li><strong id="fanCount"><?= $nFans ?></strong> <span id="fanLabel"><?= $nFans === 1 ? 'fan' : 'fans' ?></span> in the club</li>
</ul>

<?php if ($latest): ?>
<h2>Latest vlogs</h2>
<div class="vlog-grid home-vlogs">
<?php foreach ($latest as $v): ?>
  <a class="vlog home-vlog" href="/vlogs.php#v-<?= (int)$v['id'] ?>">
    <span class="vlog-thumb"><img src="https://i.ytimg.com/vi/<?= e($v['youtube_id']) ?>/hqdefault.jpg" alt="" loading="lazy" width="480" height="360"><span class="play" aria-hidden="true"></span></span>
    <span class="hv-title"><?= e($v['title']) ?></span>
  </a>
<?php endforeach; ?>
</div>
<?php endif; ?>

<h2>What's on the site</h2>
<div class="tour">
<?php foreach ($sections as [$href, $label, $k, $text]): ?>
  <a class="tour-card tc-<?= e($k) ?>" href="<?= e($href) ?>">
    <span class="tc-title"><?= e($label) ?></span>
    <span class="tc-text"><?= e($text) ?></span>
  </a>
<?php endforeach; ?>
</div>

<h2>How the fan club works</h2>
<ol class="steps">
  <li><strong>Join.</strong> It is free. You need to be 13 or older.</li>
  <li><strong>Earn points.</strong> Pass game levels, send screenshots of your likes, follows and comments, and send me ideas.</li>
  <li><strong>Climb the ranking.</strong> The more points you have, the higher you go. Top fans get bragging rights (for now).</li>
</ol>

<?php if (!$fan && !is_admin()):
  $nudges = [
    ['Not a fan yet? Awkward.', 'Fix that in about 30 seconds. Free, no dues, no secret handshake (yet).'],
    ['Still just looking around?', 'Join the fan club. I saved you a spot and it is a really good one.'],
    ['Plot twist: you are not in the fan club.', 'Time to change the ending. Join, pick a username, climb the ranking.'],
    ['Be honest, you were going to join anyway.', 'Skip the suspense. Fan club, free, snacks not included.'],
  ];
  $n = $nudges[array_rand($nudges)]; ?>
<div class="soon fan-join join-nudge"><p><strong><?= e($n[0]) ?></strong> <?= e($n[1]) ?></p>
<p><a class="btn" href="/fans.php?v=join">Join the fan club</a> <a class="btn ghost" href="/fans.php">I'm already in</a></p></div>
<?php endif; ?>

<p class="hint">Find me on
  <a href="https://www.youtube.com/@Livedbyleah" target="_blank" rel="noopener">YouTube</a>,
  <a href="https://www.tiktok.com/@livedbyleah" target="_blank" rel="noopener">TikTok</a> and
  <a href="https://www.instagram.com/lived.by.leah/" target="_blank" rel="noopener">Instagram</a>.</p>
<?php page_footer('<script src="/assets/js/fans.js?v=2"></script>'); ?>

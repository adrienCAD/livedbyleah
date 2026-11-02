<?php
// Tab 4: Games. The 8-bit surf game.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/fans.php';

$g = (string)($_GET['g'] ?? '');
$g = in_array($g, ['surf', 'road', 'blocks', 'bert'], true) ? $g : '';
$hiddenMsg = '';
if ($g !== '' && !game_visible($g)) {   // Bake Off is resting for now (admins and Leah can still play it)
    $hiddenMsg = 'Bake Off is back in the oven for a bit. It will be back soon!';
    $g = '';
}
$ROAD_NAME = "Leah's Outrun";   // test name; the trademark-safe name is "Leah's Road Trip"

page_header('Play Games', 'games');
if ($g === ''):   /* ---------------- the game cards ---------------- */ ?>
<h1>Play Games</h1>
<?php if ($hiddenMsg): ?><p class="notice"><?= e($hiddenMsg) ?></p><?php endif; ?>
<p class="lede">I drew the art for all of these, so be nice. Pass levels or rack up points and you get fan points too. Your best runs go in the <a href="/halloffame.php">Hall of Fame</a>.</p>
<div class="gamecards">
  <a class="gamecard" href="/games.php?g=surf">
    <img src="/assets/img/games/surf.jpg" width="640" height="360" alt="Surf Cleanup: Leah surfing a wave" loading="lazy">
    <span class="gc-title">Surf Cleanup</span>
    <span class="gc-text">Pick up the trash on the beach, build a water gun, then go surf. There are sharks. And UFOs. Don't ask.</span>
  </a>
  <a class="gamecard" href="/games.php?g=road">
    <img src="/assets/img/games/road-hand.jpg" width="640" height="349" alt="<?= e($ROAD_NAME) ?>: a hand-drawn picture of Leah's green Jeep on Route 1" loading="lazy">
    <span class="gc-title"><?= e($ROAD_NAME) ?></span>
    <span class="gc-text">Take my green Jeep from Costa Rica all the way to Paris. Keep an eye on the battery, and on Bigfoot.</span>
  </a>
  <?php if (game_visible('blocks')): ?>
  <a class="gamecard" href="/games.php?g=blocks">
    <img src="/assets/img/games/bakeoff.png?v=2" width="640" height="360" alt="Bake Off: Leah's kitchen pieces falling onto a checkered board" loading="lazy">
    <span class="gc-title">Bake Off<?php if (!game_public('blocks')): ?> <small class="badge">hidden from fans</small><?php endif; ?></span>
    <span class="gc-text">My kitchen stuff is falling from the sky. Stack it, clear the dishes, don't let it pile up.</span>
  </a>
  <?php endif; ?>
  <a class="gamecard" href="/games.php?g=bert">
    <img src="/assets/img/games/bert.png?v=2" width="640" height="360" alt="Fossil Smash: Bagel the brachiosaurus stomping a pyramid of fossil stones" loading="lazy">
    <span class="gc-title">Fossil Smash</span>
    <span class="gc-text">This is Bagel. Help him stomp every stone on the pyramid without getting squashed by a meteor. Or a T. rex.</span>
  </a>
</div>
<p><a class="btn ghost" href="/halloffame.php">See the Hall of Fame</a></p>
<?php page_footer(); return; endif; ?>
<nav class="gametabs" aria-label="Choose a game">
  <a href="/games.php">&larr; All games</a>
  <a href="/games.php?g=surf"<?= $g === 'surf' ? ' class="on" aria-current="page"' : '' ?>>Surf Cleanup</a>
  <a href="/games.php?g=road"<?= $g === 'road' ? ' class="on" aria-current="page"' : '' ?>><?= e($ROAD_NAME) ?></a>
  <?php if (game_visible('blocks')): ?><a href="/games.php?g=blocks"<?= $g === 'blocks' ? ' class="on" aria-current="page"' : '' ?>>Bake Off</a><?php endif; ?>
  <a href="/games.php?g=bert"<?= $g === 'bert' ? ' class="on" aria-current="page"' : '' ?>>Fossil Smash</a>
</nav>
<?php if ($g === 'road'): ?>
<h1><?= e($ROAD_NAME) ?></h1>
<p class="lede">Road trip in my neon-green Jeep: Costa Rica, Mexico, the USA, Canada, then a boat ride to France and all the way to Paris. The timer is your battery, so hit the checkpoints and grab the green batteries. Arrows on the road give you a boost. Cryptids cross the road sometimes. Yes, really. The further you drive, the higher you rank.</p>

<div class="game" id="game">
  <div class="game-hud game-hud-road">
    <span id="hudTime">Battery 0s</span>
    <span id="hudLevel">Level 1/5</span>
    <span id="hudSpeed">0 mph</span>
    <button type="button" id="muteBtn" class="hud-btn" aria-pressed="false" aria-label="Mute sound">Sound on</button>
  </div>
  <canvas id="gameCanvas" width="320" height="180" aria-label="Leah's Outrun game"></canvas>
  <div class="game-overlay road-start" id="gameStart">
    <img class="road-logo" src="/assets/img/leah-logo.png" width="400" height="190" alt="LEAH">
    <p class="pixel">OUTRUN</p>
    <button type="button" id="startBtn" class="btn">Start</button>
    <p class="hint">Left/right steer, up = gas, down = brake. Catch green batteries and cross the checkpoints before the battery runs out. Painted arrows give a quick boost. Obey the cryptid warning signs (or don't).</p>
  </div>
  <div class="game-overlay" id="gameOver" hidden>
    <p class="pixel">BATTERY EMPTY</p>
    <p id="overMsg"></p>
    <p class="hint" id="overInfo"></p>
    <p class="hint" id="overNote"></p>
    <button type="button" id="retryBtn" class="btn">Try again</button>
  </div>
  <div class="game-overlay" id="gameWin" hidden>
    <p class="pixel">PARIS REACHED!</p>
    <p id="winTime">Your time: 0:00.0</p>
    <p class="hint" id="winWho"></p>
    <div class="row">
      <button type="button" id="certBtn" class="btn">Download certificate</button>
      <button type="button" id="againBtn" class="btn ghost">Play again</button>
    </div>
    <p class="hint" id="winNote"></p>
  </div>
  <div class="touch road-touch" id="touch">
    <button type="button" data-key="left" aria-label="Steer left">&#9664;</button>
    <button type="button" data-key="right" aria-label="Steer right">&#9654;</button>
    <button type="button" data-key="brake" aria-label="Brake">Brake</button>
    <button type="button" data-key="gas" aria-label="Gas">Gas</button>
  </div>
</div>
<p class="hint">Jeep and scenery drawn in the style of Leah's pixel art. Version <?= e(SITE_VERSION) ?>.</p>

<section class="hof">
  <h2>Hall of fame</h2>
  <p class="hint">Ranked by kilometers driven (+500 km for each new country, +2,000 km for reaching Paris), then driving time. <span id="hofJoin"><a href="/fans.php?v=join">Join the fan club</a> to play under your own username.</span></p>
  <ol id="hof"><li class="hint">Loading...</li></ol>
</section>

<?php page_footer('<script src="/assets/js/road.js?v=8"></script><script src="/assets/js/fullscreen.js?v=1"></script>'); return; ?>
<?php endif; ?>
<?php if ($g === 'bert'): ?>
<h1>Fossil Smash</h1>
<p class="lede">Bagel is my little brachiosaurus and he loves stomping. Hop him around the pyramid and smash every stone to finish the round. You go through the Triassic, the Jurassic, the Cretaceous and then Meteor Day (good luck). Meteors, fireballs, raptors and pterodactyls are all out to get him. Grab the trilobites, ride a cloud back to the top, and use the big leaf to glide when it gets messy.</p>

<div class="game bert-game" id="game">
  <div class="game-hud game-hud-road">
    <span id="hudScore">Score 0</span>
    <span id="hudLevel">Triassic 1/3</span>
    <span id="hudGlide">Glides 2</span>
    <button type="button" id="muteBtn" class="hud-btn" aria-pressed="false" aria-label="Mute sound">Sound on</button>
  </div>
  <canvas id="gameCanvas" width="320" height="240" aria-label="Fossil Smash game"></canvas>
  <div class="game-overlay road-start" id="gameStart">
    <img class="road-logo" src="/assets/img/games/bert.png?v=2" width="640" height="360" alt="Fossil Smash">
    <button type="button" id="startBtn" class="btn">Start</button>
    <p class="hint">Arrow keys hop diagonally, like the arcade: &larr; up-left, &uarr; up-right, &rarr; down-right, &darr; down-left (or Q, E, Z, C). Space = glide (2 stones, twice per level). On a phone, tap beside Bagel or use the buttons.</p>
  </div>
  <div class="game-overlay" id="gameOver" hidden>
    <p class="pixel">GAME OVER</p>
    <p id="overMsg"></p>
    <p class="hint" id="overInfo"></p>
    <p class="hint" id="overNote"></p>
    <button type="button" id="retryBtn" class="btn">Try again</button>
  </div>
  <div class="game-overlay" id="gameWin" hidden>
    <p class="pixel">ALL 4 AGES SMASHED!</p>
    <p id="winScore">Score 0</p>
    <p class="hint" id="winWho"></p>
    <div class="row">
      <button type="button" id="certBtn" class="btn">Download certificate</button>
      <button type="button" id="againBtn" class="btn ghost">Play again</button>
    </div>
    <p class="hint" id="winNote"></p>
  </div>
  <div class="touch bert-touch" id="touch">
    <button type="button" data-key="ul" aria-label="Hop up-left">&#8598;</button>
    <button type="button" data-key="ur" aria-label="Hop up-right">&#8599;</button>
    <button type="button" data-key="glide" aria-label="Glide">Glide</button>
    <button type="button" data-key="dl" aria-label="Hop down-left">&#8601;</button>
    <button type="button" data-key="dr" aria-label="Hop down-right">&#8600;</button>
  </div>
</div>
<p class="hint">Bagel, the meteor and the fireballs are Leah's art; the other critters are drawn in code for now, in her pixel style. Version <?= e(SITE_VERSION) ?>.</p>

<section class="hof">
  <h2>Hall of fame</h2>
  <p class="hint">Ranked by score. Fan points: 2,000 = 1, 5,000 = 3 in total, up to 15 points at 35,000. Clear all 4 elements for the certificate. <span id="hofJoin"><a href="/fans.php?v=join">Join the fan club</a> to play under your own username.</span></p>
  <ol id="hof"><li class="hint">Loading...</li></ol>
</section>

<?php page_footer('<script src="/assets/js/bert.js?v=3"></script><script src="/assets/js/fullscreen.js?v=1"></script>'); return; ?>
<?php endif; ?>
<?php if ($g === 'blocks'): ?>
<h1>Bake Off</h1>
<p class="lede">My kitchen stuff keeps falling, so stack it neatly and clear full rows of dishes. Up turns a piece, down drops it, and C or Shift saves one for later.</p>

<div class="game blocks-game" id="game">
  <div class="game-hud game-hud-road">
    <span id="hudScore">Score 0</span>
    <span id="hudLevel">Level 1</span>
    <span id="hudDishes">Dishes 0</span>
    <button type="button" id="muteBtn" class="hud-btn" aria-pressed="false" aria-label="Mute sound">Sound on</button>
  </div>
  <canvas id="gameCanvas" width="156" height="206" aria-label="Bake Off game"></canvas>
  <div class="game-overlay" id="gameStart">
    <img class="road-logo" src="/assets/img/games/bakeoff.png?v=2" width="640" height="360" alt="Bake Off">
    <button type="button" id="startBtn" class="btn">Start</button>
    <p class="hint">Left/right move, up rotates, down drops the piece, C or Shift holds a piece, space speeds it up. Phones get buttons.</p>
  </div>
  <div class="game-overlay" id="gameOver" hidden>
    <p class="pixel">GAME OVER</p>
    <p id="overMsg"></p>
    <p class="hint" id="overInfo"></p>
    <p class="hint" id="overNote"></p>
    <div class="row">
      <button type="button" id="certBtn" class="btn" hidden>Download certificate</button>
      <button type="button" id="retryBtn" class="btn">Play again</button>
    </div>
  </div>
  <div class="touch blocks-touch" id="touch">
    <button type="button" data-key="left" aria-label="Move left">&#9664;</button>
    <button type="button" data-key="right" aria-label="Move right">&#9654;</button>
    <button type="button" data-key="rotate" aria-label="Rotate">Turn</button>
    <button type="button" data-key="drop" aria-label="Drop">Drop</button>
    <button type="button" data-key="hold" aria-label="Hold piece">Hold</button>
  </div>
</div>
<p class="hint">All the art in Bake Off is by Leah. Version <?= e(SITE_VERSION) ?>.</p>

<section class="hof">
  <h2>Hall of fame</h2>
  <p class="hint">Ranked by score. Fan points: 1,000 = 1, 2,500 = 3 in total, up to 15 points at 12,000. <span id="hofJoin"><a href="/fans.php?v=join">Join the fan club</a> to play under your own username.</span></p>
  <ol id="hof"><li class="hint">Loading...</li></ol>
</section>

<?php page_footer('<script src="/assets/js/blocks.js?v=7"></script><script src="/assets/js/fullscreen.js?v=1"></script>'); return; ?>
<?php endif; ?>
<h1>Surf cleanup</h1>
<p class="lede">First clean up the beach and find the shells, then build your water gun and paddle out. Five waves, a lot of sharks, and a UFO that really wants to take you home. The higher the level you reach, the better your rank. Faster is better too.</p>

<div class="game" id="game">
  <div class="game-hud">
    <span id="hudTime">0:00.0</span>
    <span id="hudLevel">Level 1/5</span>
    <span id="hudGoal">Beach finds 0/8</span>
    <button type="button" id="muteBtn" class="hud-btn" aria-pressed="false" aria-label="Mute sound">Sound on</button>
  </div>
  <canvas id="gameCanvas" width="640" height="360" aria-label="Surf cleanup game"></canvas>
  <div class="game-overlay" id="gameStart">
    <p class="pixel">SURF CLEANUP</p>
    <button type="button" id="startBtn" class="btn">Start</button>
    <p class="hint">Beach: arrows or A/D to move, up or W to jump.<br>Surf: left/right keep the board level (nose down = faster, nose up = slower), up jumps (up again = double jump + trick), space fires the water gun along the board.</p>
  </div>
  <div class="game-overlay" id="gameOver" hidden>
    <p class="pixel">GAME OVER</p>
    <p id="overMsg"></p>
    <p class="hint" id="overInfo"></p>
    <p class="hint" id="overNote"></p>
    <button type="button" id="retryBtn" class="btn">Try again</button>
  </div>
  <div class="game-overlay" id="gameWin" hidden>
    <p class="pixel">YOU DID IT!</p>
    <p id="winTime">Your time: 0:00.0</p>
    <p class="hint" id="winWho"></p>
    <div class="row">
      <button type="button" id="certBtn" class="btn">Download certificate</button>
      <button type="button" id="againBtn" class="btn ghost">Play again</button>
    </div>
    <p class="hint" id="winNote"></p>
  </div>
  <div class="touch" id="touch">
    <button type="button" data-key="left" aria-label="Move left">&#9664;</button>
    <button type="button" data-key="right" aria-label="Move right">&#9654;</button>
    <button type="button" data-key="jump" aria-label="Jump">Jump</button>
    <button type="button" data-key="fire" aria-label="Fire water gun" id="fireBtn">Fire</button>
  </div>
</div>
<p class="hint">Surfer art by Leah.</p>

<section class="hof">
  <h2>Hall of fame</h2>
  <p class="hint">Ranked by level reached, then best time. <span id="hofJoin"><a href="/fans.php?v=join">Join the fan club</a> to play under your own username.</span></p>
  <ol id="hof"><li class="hint">Loading...</li></ol>
</section>

<?php page_footer('<script src="/assets/js/game.js?v=5"></script><script src="/assets/js/fullscreen.js?v=1"></script>'); ?>

<?php
// Tab 4: Games. The 8-bit surf game.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';

$g = (string)($_GET['g'] ?? '');
$g = in_array($g, ['surf', 'road', 'blocks'], true) ? $g : '';
$ROAD_NAME = "Leah's Outrun";   // test name; the trademark-safe name is "Leah's Road Trip"

page_header('Play Games', 'games');
if ($g === ''):   /* ---------------- the three games ---------------- */ ?>
<h1>Play Games</h1>
<p class="lede">Pick a game. Every game has its own hall of fame, and the levels you pass earn fan points.</p>
<div class="gamecards">
  <a class="gamecard" href="/games.php?g=surf">
    <img src="/assets/img/games/surf.jpg" width="640" height="360" alt="Surf Cleanup: Leah surfing a wave" loading="lazy">
    <span class="gc-title">Surf Cleanup</span>
    <span class="gc-text">Clean the beach, build a water gun and surf five waves past sharks and UFOs.</span>
  </a>
  <a class="gamecard" href="/games.php?g=road">
    <img src="/assets/img/games/road.jpg" width="640" height="349" alt="<?= e($ROAD_NAME) ?>: Leah's green Jeep on Route 1" loading="lazy">
    <span class="gc-title"><?= e($ROAD_NAME) ?></span>
    <span class="gc-text">Drive Leah's electric Jeep from Houston to France. Beat the battery timer!</span>
  </a>
  <a class="gamecard" href="/games.php?g=blocks">
    <img src="/assets/img/games/blocks.jpg" width="640" height="349" alt="Leah's Blocks" loading="lazy">
    <span class="gc-title">Leah's Blocks</span>
    <span class="gc-text">Stack hand-drawn blocks, clear lines and chase the top score.</span>
  </a>
</div>
<?php page_footer(); return; endif; ?>
<nav class="gametabs" aria-label="Choose a game">
  <a href="/games.php">&larr; All games</a>
  <a href="/games.php?g=surf"<?= $g === 'surf' ? ' class="on" aria-current="page"' : '' ?>>Surf Cleanup</a>
  <a href="/games.php?g=road"<?= $g === 'road' ? ' class="on" aria-current="page"' : '' ?>><?= e($ROAD_NAME) ?></a>
  <a href="/games.php?g=blocks"<?= $g === 'blocks' ? ' class="on" aria-current="page"' : '' ?>>Leah's Blocks</a>
</nav>
<?php if ($g === 'road'): ?>
<h1><?= e($ROAD_NAME) ?></h1>
<p class="lede">Drive Leah's neon-green electric Jeep from Houston to Mexico, Costa Rica, Colorado and France. Your timer is your battery: reach each checkpoint, grab green batteries and hit the arrows for a boost. You are ranked by the highest level you reach, then by your driving time.</p>

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
    <p class="hint">Left/right steer, up = gas, down = brake. Catch green batteries and cross the checkpoints before the battery runs out. Painted arrows give a quick boost.</p>
  </div>
  <div class="game-overlay" id="gameOver" hidden>
    <p class="pixel">BATTERY EMPTY</p>
    <p id="overMsg"></p>
    <p class="hint" id="overInfo"></p>
    <p class="hint" id="overNote"></p>
    <button type="button" id="retryBtn" class="btn">Try again</button>
  </div>
  <div class="game-overlay" id="gameWin" hidden>
    <p class="pixel">FRANCE REACHED!</p>
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
  <p class="hint">Ranked by level reached, then driving time. <span id="hofJoin"><a href="/fans.php?v=join">Join the fan club</a> to play under your own username.</span></p>
  <ol id="hof"><li class="hint">Loading...</li></ol>
</section>

<?php page_footer('<script src="/assets/js/road.js?v=3"></script>'); return; ?>
<?php endif; ?>
<?php if ($g === 'blocks'): ?>
<h1>Leah's Blocks</h1>
<p class="lede">Stack the falling blocks, clear lines and climb the hall of fame. Rotate with the up arrow, drop with the down arrow, and save a piece with C or Shift.</p>

<div class="game blocks-game" id="game">
  <div class="game-hud game-hud-road">
    <span id="hudScore">Score 0</span>
    <span id="hudLevel">Level 1</span>
    <span id="hudLines">Lines 0</span>
    <button type="button" id="muteBtn" class="hud-btn" aria-pressed="false" aria-label="Mute sound">Sound on</button>
  </div>
  <canvas id="gameCanvas" width="480" height="560" aria-label="Leah's Blocks game"></canvas>
  <div class="game-overlay" id="gameStart">
    <img class="road-logo" src="/assets/img/games/blocks.jpg" width="640" height="349" alt="Leah's Blocks">
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
<p class="hint">Blocks are drawn by hand (for now, in code). Version <?= e(SITE_VERSION) ?>.</p>

<section class="hof">
  <h2>Hall of fame</h2>
  <p class="hint">Ranked by score. Fan points: 1,000 = 1, 2,500 = 3 in total, up to 15 points at 12,000. <span id="hofJoin"><a href="/fans.php?v=join">Join the fan club</a> to play under your own username.</span></p>
  <ol id="hof"><li class="hint">Loading...</li></ol>
</section>

<?php page_footer('<script src="/assets/js/blocks.js?v=1"></script>'); return; ?>
<?php endif; ?>
<h1>Surf cleanup</h1>
<p class="lede">Clean the beach, collect the shells, build a water gun, then surf five waves and beat the sharks. You are ranked by the highest level you reach, then by your time. Fans play under their own username.</p>

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

<?php page_footer('<script src="/assets/js/game.js?v=5"></script>'); ?>

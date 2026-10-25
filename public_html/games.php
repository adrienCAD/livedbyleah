<?php
// Tab 4: Games. The 8-bit surf game.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';

$g = (string)($_GET['g'] ?? 'surf');
$g = in_array($g, ['surf', 'road'], true) ? $g : 'surf';

page_header('Games', 'games');
?>
<nav class="gametabs" aria-label="Choose a game">
  <a href="/games.php?g=surf"<?= $g === 'surf' ? ' class="on" aria-current="page"' : '' ?>>Surf Cleanup</a>
  <a href="/games.php?g=road"<?= $g === 'road' ? ' class="on" aria-current="page"' : '' ?>>Leah's Road Trip</a>
  <span class="soon-tab" title="Coming soon">Leah's Blocks (soon)</span>
</nav>
<?php if ($g === 'road'): ?>
<h1>Leah's Road Trip</h1>
<p class="lede">Drive Leah's neon-green electric Jeep from Houston to Mexico, Costa Rica, Colorado and France. Your timer is your battery: reach each checkpoint, grab green batteries and hit the arrows for a boost. You are ranked by the highest level you reach, then by your driving time.</p>

<div class="game" id="game">
  <div class="game-hud game-hud-road">
    <span id="hudTime">Battery 0s</span>
    <span id="hudLevel">Level 1/5</span>
    <span id="hudSpeed">0 mph</span>
    <button type="button" id="muteBtn" class="hud-btn" aria-pressed="false" aria-label="Mute sound">Sound on</button>
  </div>
  <canvas id="gameCanvas" width="320" height="180" aria-label="Leah's Road Trip game"></canvas>
  <div class="game-overlay road-start" id="gameStart">
    <img class="road-logo" src="/assets/img/leah-logo.png" width="400" height="190" alt="LEAH">
    <p class="pixel">ROAD TRIP</p>
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

<?php page_footer('<script src="/assets/js/road.js?v=1"></script>'); return; ?>
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

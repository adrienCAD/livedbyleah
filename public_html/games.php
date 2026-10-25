<?php
// Tab 4: Games. The 8-bit surf game.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';

page_header('Games', 'games');
?>
<h1>Surf cleanup</h1>
<p class="lede">Clean the beach, collect the shells, build a water gun, then surf five waves and beat the sharks. Your total time goes in the hall of fame.</p>

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
    <button type="button" id="retryBtn" class="btn">Try again</button>
  </div>
  <div class="game-overlay" id="gameWin" hidden>
    <p class="pixel">YOU DID IT!</p>
    <p id="winTime">Your time: 0:00.0</p>
    <label for="playerName">Your name for the hall of fame and certificate</label>
    <input id="playerName" type="text" maxlength="30" autocomplete="off">
    <div class="row">
      <button type="button" id="submitBtn" class="btn">Add me to the hall of fame</button>
      <button type="button" id="certBtn" class="btn ghost">Download certificate</button>
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
  <ol id="hof"><li class="hint">Loading...</li></ol>
</section>

<?php page_footer('<script src="/assets/js/game.js?v=3"></script>'); ?>

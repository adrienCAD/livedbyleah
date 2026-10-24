<?php
// Tab 4: Creative. The 8-bit surf game.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';

page_header('Creative', 'creative');
?>
<h1>Surf cleanup</h1>
<p class="lede">Surf the waves, grab the seashells and pick up the trash. Collect everything to win a certificate.</p>

<div class="game" id="game">
  <div class="game-hud">
    <span id="hudShells">Shells 0/0</span>
    <span id="hudTrash">Trash 0/0</span>
  </div>
  <canvas id="gameCanvas" width="640" height="360" aria-label="Surf cleanup game"></canvas>
  <div class="game-overlay" id="gameStart">
    <p class="pixel">SURF CLEANUP</p>
    <button type="button" id="startBtn" class="btn">Start</button>
    <p class="hint">Arrow keys or A/D to move. Space or W to jump.</p>
  </div>
  <div class="game-overlay" id="gameWin" hidden>
    <p class="pixel">YOU DID IT!</p>
    <p>Congratulations, you beat the game.</p>
    <label for="playerName">Your name for the certificate (not saved)</label>
    <input id="playerName" type="text" maxlength="30" autocomplete="off">
    <div class="row">
      <button type="button" id="certBtn" class="btn">Download certificate</button>
      <button type="button" id="againBtn" class="btn ghost">Play again</button>
    </div>
  </div>
  <div class="touch" id="touch">
    <button type="button" data-key="left" aria-label="Move left">&#9664;</button>
    <button type="button" data-key="right" aria-label="Move right">&#9654;</button>
    <button type="button" data-key="jump" aria-label="Jump">Jump</button>
  </div>
</div>
<p class="hint">Pixel art is a placeholder. Leah's own art comes next.</p>

<?php page_footer('<script src="/assets/js/game.js"></script>'); ?>

<?php
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require_admin();

$nVlogs = (int)db()->query('SELECT COUNT(*) FROM vlogs')->fetchColumn();
$nPosts = (int)db()->query('SELECT COUNT(*) FROM posts')->fetchColumn();
$nFans = (int)db()->query('SELECT COUNT(*) FROM fans')->fetchColumn();
$nPend = (int)db()->query("SELECT COUNT(*) FROM proofs WHERE status = 'pending'")->fetchColumn();

admin_header('Dashboard');
?>
<h1>Dashboard</h1>
<div class="cards">
  <a class="card" href="/admin/vlogs.php"><strong><?= $nVlogs ?></strong><span>Vlogs</span></a>
  <a class="card" href="/admin/posts.php"><strong><?= $nPosts ?></strong><span>Writing posts</span></a>
  <a class="card" href="/admin/fans.php"><strong><?= $nFans ?></strong><span>Fans</span></a>
  <a class="card" href="/admin/proofs.php"><strong><?= $nPend ?></strong><span>Screenshots to review</span></a>
</div>
<p><a href="/writing.php">Open the Writing Process page</a> (only visible when logged in).</p>
<p>Add a vlog by pasting its YouTube link. Add a writing post to explain the thinking behind it.</p>
<?php admin_footer(); ?>

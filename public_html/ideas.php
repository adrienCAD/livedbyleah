<?php
// Ideas for Leah: fans suggest things for the site (or vlogs), like and comment on each other's ideas.
// New ideas wait for Leah's OK before anyone else sees them. A chosen idea earns IDEA_POINTS fan points.
declare(strict_types=1);
require __DIR__ . '/inc/bootstrap.php';
require __DIR__ . '/inc/layout.php';
require __DIR__ . '/inc/fans.php';
require __DIR__ . '/inc/ideas.php';

$fan = current_fan();
$errors = [];
$old = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = (string)($_POST['action'] ?? '');
    $ideaId = (int)($_POST['idea_id'] ?? 0);
    if (!$fan) {
        flash('Log in to the fan club first.');
        redirect('/fans.php');
    }
    // the idea must be visible to fans (open, chosen or done)
    $live = function (int $id): bool {
        $st = db()->prepare("SELECT 1 FROM ideas WHERE id = ? AND status IN ('open', 'chosen', 'done')");
        $st->execute([$id]);
        return (bool)$st->fetchColumn();
    };
    if ($action === 'idea') {
        $title = clean_text((string)($_POST['title'] ?? ''), 80);
        $body = clean_text((string)($_POST['body'] ?? ''), 600);
        $old = ['title' => $title, 'body' => $body];
        $st = db()->prepare("SELECT COUNT(*) FROM ideas WHERE fan_id = ? AND status = 'pending'");
        $st->execute([$fan['id']]);
        if (mb_strlen($title) < 4) {
            $errors[] = 'Give your idea a short title (at least 4 characters).';
        } elseif (mb_strlen($body) < 10) {
            $errors[] = 'Tell Leah a bit more about your idea (at least 10 characters).';
        } elseif (has_link($title . ' ' . $body)) {
            $errors[] = 'Please leave out links. Just describe your idea.';
        } elseif ((int)$st->fetchColumn() >= 3) {
            $errors[] = 'You already have 3 ideas waiting for Leah. Give her a little time!';
        } elseif (($_SESSION['idea_t'] ?? 0) > time() - 60) {
            $errors[] = 'Wait a minute before sending another idea.';
        } else {
            db()->prepare('INSERT INTO ideas (fan_id, title, body) VALUES (?, ?, ?)')->execute([$fan['id'], $title, $body]);
            $_SESSION['idea_t'] = time();
            flash('Thanks! Leah will read your idea soon. It shows up here once she has had a look.');
            redirect('/ideas.php#mine');
        }
    } elseif ($action === 'like' && $live($ideaId)) {
        $st = db()->prepare('SELECT 1 FROM idea_likes WHERE idea_id = ? AND fan_id = ?');
        $st->execute([$ideaId, $fan['id']]);
        if ($st->fetchColumn()) {
            db()->prepare('DELETE FROM idea_likes WHERE idea_id = ? AND fan_id = ?')->execute([$ideaId, $fan['id']]);
        } else {
            db()->prepare('INSERT INTO idea_likes (idea_id, fan_id) VALUES (?, ?)')->execute([$ideaId, $fan['id']]);
        }
        redirect('/ideas.php#i-' . $ideaId);
    } elseif ($action === 'comment' && $live($ideaId)) {
        $body = clean_text((string)($_POST['body'] ?? ''), 280);
        if (mb_strlen($body) < 2) {
            $errors[] = 'Your comment is empty.';
        } elseif (has_link($body)) {
            $errors[] = 'Please leave out links in comments.';
        } elseif (($_SESSION['cmt_t'] ?? 0) > time() - 20) {
            $errors[] = 'Wait a few seconds before commenting again.';
        } else {
            db()->prepare('INSERT INTO idea_comments (idea_id, fan_id, body) VALUES (?, ?, ?)')->execute([$ideaId, $fan['id'], $body]);
            $_SESSION['cmt_t'] = time();
            redirect('/ideas.php?open=' . $ideaId . '#i-' . $ideaId);
        }
        $old['c' . $ideaId] = $body;
    } elseif ($action === 'delete_idea') {
        // Fans can take back an idea unless Leah already chose it (points were given for it).
        $st = db()->prepare("DELETE FROM ideas WHERE id = ? AND fan_id = ? AND status IN ('pending', 'open', 'declined')");
        $st->execute([$ideaId, $fan['id']]);
        flash($st->rowCount() ? 'Your idea was deleted.' : 'That idea cannot be deleted (Leah already chose it).');
        redirect('/ideas.php#mine');
    } elseif ($action === 'uncomment') {
        db()->prepare('DELETE FROM idea_comments WHERE id = ? AND fan_id = ?')->execute([(int)($_POST['comment_id'] ?? 0), $fan['id']]);
        redirect('/ideas.php?open=' . $ideaId . '#i-' . $ideaId);
    }
}

$msg = flash();
$myId = $fan ? (int)$fan['id'] : 0;
$ideas = db()->query("SELECT i.*, f.username,
        (SELECT COUNT(*) FROM idea_likes l WHERE l.idea_id = i.id) AS likes,
        (SELECT COUNT(*) FROM idea_comments c WHERE c.idea_id = i.id AND c.hidden = 0) AS ncom,
        (SELECT COUNT(*) FROM idea_likes l WHERE l.idea_id = i.id AND l.fan_id = $myId) AS liked
    FROM ideas i JOIN fans f ON f.id = i.fan_id
    WHERE i.status IN ('open', 'chosen', 'done')
    ORDER BY CASE i.status WHEN 'chosen' THEN 0 WHEN 'done' THEN 1 ELSE 2 END, likes DESC, i.id DESC")->fetchAll();
$comments = [];
if ($ideas) {
    foreach (db()->query('SELECT c.id, c.idea_id, c.fan_id, c.body, c.created_at, f.username FROM idea_comments c JOIN fans f ON f.id = c.fan_id WHERE c.hidden = 0 ORDER BY c.id')->fetchAll() as $c) {
        $comments[(int)$c['idea_id']][] = $c;
    }
}
$mine = [];
if ($fan) {
    $st = db()->prepare("SELECT id, title, status, points, leah_note, created_at FROM ideas WHERE fan_id = ? ORDER BY id DESC LIMIT 20");
    $st->execute([$fan['id']]);
    $mine = $st->fetchAll();
}
$openId = (int)($_GET['open'] ?? 0);

page_header('Ideas for Leah', 'ideas');
?>
<h1>Ideas for Leah</h1>
<p class="lede">Got an idea for the site? A new game, a vlog you want to see, something that bugs you? Tell me! If I use your idea, you get <strong><?= IDEA_POINTS ?> fan points</strong>.</p>
<?php if ($msg): ?><p class="notice"><?= e($msg) ?></p><?php endif; ?>
<?php foreach ($errors as $er): ?><p class="error"><?= e($er) ?></p><?php endforeach; ?>

<?php if ($fan): ?>
<details class="proofbox"<?= isset($old['title']) ? ' open' : '' ?>>
  <summary>Send Leah an idea</summary>
  <form method="post" action="/ideas.php" class="form">
    <?= csrf_field() ?><input type="hidden" name="action" value="idea">
    <label for="it">Your idea in a few words</label>
    <input id="it" name="title" maxlength="80" required value="<?= e($old['title'] ?? '') ?>" placeholder="Example: a vlog about your favorite snacks">
    <label for="ib">Tell her more</label>
    <textarea id="ib" name="body" rows="4" maxlength="600" required placeholder="What would it look like? Why would it be fun?"><?= e($old['body'] ?? '') ?></textarea>
    <p class="hint">Leah reads every idea before it shows up here. No links please. Everyone sees your username.</p>
    <button class="btn" type="submit">Send my idea</button>
  </form>
</details>
<?php else: ?>
<div class="soon fan-join"><p><strong>Fans can send ideas, like them and comment.</strong> Join the fan club (it is free) or log in.</p>
<p><a class="btn" href="/fans.php?v=join">Join the fan club</a> <a class="btn ghost" href="/fans.php">Log in</a></p></div>
<?php endif; ?>

<h2>The ideas</h2>
<?php if (!$ideas): ?><p class="empty">No ideas on the board yet. Yours could be the first!</p><?php endif; ?>
<div class="ideas">
<?php foreach ($ideas as $i): $id = (int)$i['id']; $cs = $comments[$id] ?? []; ?>
  <article class="idea st-<?= e($i['status']) ?>" id="i-<?= $id ?>">
    <header>
      <h3><?= e($i['title']) ?></h3>
      <?php if ($i['status'] !== 'open'): ?><span class="badge"><?= e(IDEA_STATUS[$i['status']]) ?></span><?php endif; ?>
    </header>
    <p class="idea-body"><?= nl2br(e($i['body'])) ?></p>
    <?php if ($i['leah_note']): ?><p class="leah-note"><strong>Leah:</strong> <?= e($i['leah_note']) ?></p><?php endif; ?>
    <footer>
      <span class="seen">by <?= e($i['username']) ?> &middot; <?= e(ago($i['created_at'])) ?></span>
      <?php if ($fan): ?>
      <form method="post" action="/ideas.php" class="inline"><?= csrf_field() ?><input type="hidden" name="action" value="like"><input type="hidden" name="idea_id" value="<?= $id ?>">
        <button class="like<?= (int)$i['liked'] ? ' on' : '' ?>" type="submit" aria-pressed="<?= (int)$i['liked'] ? 'true' : 'false' ?>">&#9829; <?= (int)$i['likes'] ?></button></form>
      <?php else: ?>
      <span class="like" title="Fans can like ideas">&#9829; <?= (int)$i['likes'] ?></span>
      <?php endif; ?>
      <?php if ($fan && (int)$i['fan_id'] === $myId && $i['status'] === 'open'): ?>
      <form method="post" action="/ideas.php" class="inline" onsubmit="return confirm('Delete your idea? Likes and comments on it go too.');"><?= csrf_field() ?><input type="hidden" name="action" value="delete_idea"><input type="hidden" name="idea_id" value="<?= $id ?>"><button class="link-danger" type="submit">delete my idea</button></form>
      <?php endif; ?>
    </footer>
    <details class="idea-comments"<?= $openId === $id ? ' open' : '' ?>>
      <summary><?= count($cs) ?> <?= count($cs) === 1 ? 'comment' : 'comments' ?></summary>
      <?php foreach ($cs as $c): ?>
        <div class="comment"><p><?= nl2br(e($c['body'])) ?></p>
          <footer><?= e($c['username']) ?> &middot; <?= e(ago($c['created_at'])) ?>
          <?php if ((int)$c['fan_id'] === $myId): ?>
            <form method="post" action="/ideas.php" class="inline" onsubmit="return confirm('Delete your comment?');"><?= csrf_field() ?><input type="hidden" name="action" value="uncomment"><input type="hidden" name="idea_id" value="<?= $id ?>"><input type="hidden" name="comment_id" value="<?= (int)$c['id'] ?>"><button class="link-danger" type="submit">delete</button></form>
          <?php endif; ?></footer></div>
      <?php endforeach; ?>
      <?php if ($fan): ?>
      <form method="post" action="/ideas.php" class="form comment-form"><?= csrf_field() ?><input type="hidden" name="action" value="comment"><input type="hidden" name="idea_id" value="<?= $id ?>">
        <label for="c<?= $id ?>">Add a comment</label>
        <textarea id="c<?= $id ?>" name="body" rows="2" maxlength="280" required><?= e($old['c' . $id] ?? '') ?></textarea>
        <button class="btn ghost" type="submit">Comment</button>
      </form>
      <?php else: ?><p class="hint"><a href="/fans.php">Log in</a> to comment.</p><?php endif; ?>
    </details>
  </article>
<?php endforeach; ?>
</div>

<?php if ($mine): ?>
<h2 id="mine">My ideas</h2>
<ul class="fanlist subs">
<?php foreach ($mine as $m): ?>
  <li><span class="nm"><?= e($m['title']) ?><?= $m['leah_note'] && in_array($m['status'], ['pending', 'declined'], true) ? '<br><span class="seen">Leah: ' . e($m['leah_note']) . '</span>' : '' ?></span>
    <span class="seen st-<?= in_array($m['status'], ['chosen', 'done'], true) ? 'approved' : ($m['status'] === 'declined' ? 'rejected' : 'pending') ?>"><?= e(IDEA_STATUS[$m['status']]) ?><?= (int)$m['points'] ? ' &middot; +' . (int)$m['points'] . ' points' : '' ?>
    <?php if (in_array($m['status'], ['pending', 'open', 'declined'], true)): ?><form method="post" action="/ideas.php" class="inline" onsubmit="return confirm('Delete this idea?');"><?= csrf_field() ?><input type="hidden" name="action" value="delete_idea"><input type="hidden" name="idea_id" value="<?= (int)$m['id'] ?>"><button class="link-danger" type="submit">delete</button></form><?php endif; ?></span></li>
<?php endforeach; ?>
</ul>
<?php endif; ?>
<?php page_footer(); ?>

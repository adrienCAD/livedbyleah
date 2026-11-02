<?php
// Admin: one fan. Points (with a bonus +/- and a note the fan can see), suspend, everything they posted, and delete (typed confirmation).
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/layout.php';
require __DIR__ . '/../inc/fans.php';
require __DIR__ . '/../inc/ideas.php';
require_admin();

$pdo = db();
$id = (int)($_REQUEST['id'] ?? 0);
$st = $pdo->prepare('SELECT * FROM fans WHERE id = ?');
$st->execute([$id]);
$f = $st->fetch();
if (!$f) {
    flash('That fan was not found.');
    redirect('/admin/fans.php');
}
$self = '/admin/fan.php?id=' . $id;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $a = (string)($_POST['action'] ?? '');
    if ($a === 'bonus') {
        $pts = max(-1000, min(1000, (int)($_POST['bonus_points'] ?? 0)));
        $note = clean_text((string)($_POST['bonus_note'] ?? ''), 200);
        $pdo->prepare('UPDATE fans SET bonus_points = ?, bonus_note = ? WHERE id = ?')->execute([$pts, $note !== '' ? $note : null, $id]);
        flash('Bonus points saved.');
    } elseif ($a === 'suspend' || $a === 'unsuspend') {
        $pdo->prepare('UPDATE fans SET suspended = ? WHERE id = ?')->execute([$a === 'suspend' ? 1 : 0, $id]);
        flash($f['username'] . ($a === 'suspend' ? ' is suspended: signed out, hidden from the site, cannot log in.' : ' is back.'));
    } elseif ($a === 'rm') {
        $kind = (string)($_POST['kind'] ?? '');
        $rid = (int)($_POST['rid'] ?? 0);
        $tbl = ['idea' => 'ideas', 'idea_comment' => 'idea_comments', 'fan_comment' => 'fan_comments'][$kind] ?? null;
        if ($tbl) {
            $pdo->prepare("DELETE FROM $tbl WHERE id = ? AND fan_id = ?")->execute([$rid, $id]);
            flash('Deleted.');
        }
    } elseif ($a === 'delete') {
        if (strcasecmp(trim((string)($_POST['confirm_name'] ?? '')), $f['username']) !== 0) {
            flash('Not deleted: the typed name did not match "' . $f['username'] . '".');
        } else {
            $pf = $pdo->prepare('SELECT file FROM proofs WHERE fan_id = ? AND file IS NOT NULL');
            $pf->execute([$id]);
            foreach ($pf->fetchAll(PDO::FETCH_COLUMN) as $fn) {
                @unlink(__DIR__ . '/../data/proofs/' . basename((string)$fn));
            }
            $pdo->prepare('DELETE FROM fans WHERE id = ?')->execute([$id]);   // scores, proofs, ideas and comments go too (cascade)
            flash('Fan "' . $f['username'] . '" and everything they posted was deleted.');
            redirect('/admin/fans.php');
        }
    }
    redirect($self);
}

$rk = null;
foreach (fan_ranking(true) as $r) { if ($r['id'] === $id) { $rk = $r; } }
$q = function (string $sql) use ($pdo, $id): array { $s = $pdo->prepare($sql); $s->execute([$id]); return $s->fetchAll(); };
$ideas = $q("SELECT * FROM ideas WHERE fan_id = ? ORDER BY id DESC");
$icom = $q("SELECT c.*, i.title FROM idea_comments c JOIN ideas i ON i.id = c.idea_id WHERE c.fan_id = ? ORDER BY c.id DESC");
$fcom = $q("SELECT c.*, v.title AS vlog_title, p.title AS post_title FROM fan_comments c LEFT JOIN vlogs v ON v.id = c.vlog_id LEFT JOIN posts p ON p.id = c.post_id WHERE c.fan_id = ? ORDER BY c.id DESC");
$proofs = $q("SELECT * FROM proofs WHERE fan_id = ? ORDER BY id DESC");
$scores = $q("SELECT game, ms, level, won, km, created_at FROM scores WHERE fan_id = ? ORDER BY game");
$nlikes = (int)$q("SELECT COUNT(*) FROM idea_likes WHERE fan_id = ?")[0]['COUNT(*)'];

function rm_form(string $kind, int $rid): string {
    return '<form method="post" class="inline" onsubmit="return confirm(\'Delete this?\');">' . csrf_field() . '<input type="hidden" name="action" value="rm"><input type="hidden" name="kind" value="' . e($kind) . '"><input type="hidden" name="rid" value="' . $rid . '"><input type="hidden" name="id" value="' . (int)$_REQUEST['id'] . '"><button class="link-danger" type="submit">delete</button></form>';
}

admin_header('Fan: ' . $f['username']);
?>
<p><a href="/admin/fans.php">&larr; All fans</a></p>
<h1><?= e($f['username']) ?><?= (int)$f['suspended'] ? ' <span class="badge">suspended</span>' : '' ?></h1>
<p class="hint"><?= e(fan_full_name($f)) ?> &middot; <?= e($f['email']) ?> &middot; joined <?= e(substr($f['created_at'], 0, 10)) ?> &middot; last seen <?= e(ago($f['last_login'] ?? null)) ?> &middot; <?= $f['google_sub'] ? 'Google sign-in' : 'email and password' ?></p>

<h2>Points</h2>
<?php if ($rk): ?>
<p><strong><?= (int)$rk['pts'] ?> points</strong><?= (int)$f['suspended'] ? ' (not shown in rankings while suspended)' : ' (fan #' . (int)$rk['rank'] . ')' ?>:
  <?= SIGNUP_POINTS ?> joining + <?= (int)$rk['lvl_pts'] ?> game levels + <?= (int)$rk['soc_pts'] ?> screenshots + <?= (int)$rk['idea_pts'] ?> chosen ideas + <?= (int)$f['bonus_points'] ?> bonus.</p>
<?php else: ?><p class="hint">This fan has not confirmed their email yet, so there are no points.</p><?php endif; ?>
<form method="post" class="form">
  <?= csrf_field() ?><input type="hidden" name="action" value="bonus"><input type="hidden" name="id" value="<?= $id ?>">
  <label for="bp">Bonus points from Leah (can be negative, between -1000 and 1000)</label>
  <input id="bp" name="bonus_points" type="number" min="-1000" max="1000" value="<?= (int)$f['bonus_points'] ?>" style="max-width:140px">
  <label for="bn">Note (only this fan sees it, on their Fan Fest page)</label>
  <input id="bn" name="bonus_note" maxlength="200" value="<?= e($f['bonus_note'] ?? '') ?>" placeholder="Example: thanks for the great bug report!">
  <button class="btn" type="submit">Save bonus</button>
</form>

<h2>Everything they sent</h2>
<h3>Ideas (<?= count($ideas) ?>)</h3>
<?php if (!$ideas): ?><p class="hint">None.</p><?php endif; ?>
<ul class="fanlist subs">
<?php foreach ($ideas as $i): ?>
  <li><span class="nm"><?= e($i['title']) ?><br><span class="seen"><?= e($i['body']) ?></span></span><span class="seen"><?= e(IDEA_STATUS[$i['status']]) ?><?= (int)$i['points'] ? ' &middot; +' . (int)$i['points'] : '' ?> &middot; <?= e(substr($i['created_at'], 0, 10)) ?> <?= rm_form('idea', (int)$i['id']) ?></span></li>
<?php endforeach; ?>
</ul>
<h3>Comments on vlogs and posts (<?= count($fcom) ?>)</h3>
<?php if (!$fcom): ?><p class="hint">None.</p><?php endif; ?>
<ul class="fanlist subs">
<?php foreach ($fcom as $c): ?>
  <li><span class="nm"><?= e($c['body']) ?><br><span class="seen">on <?= $c['post_title'] ? 'post "' . e($c['post_title']) . '"' : '' ?><?= $c['post_title'] && $c['vlog_title'] ? ' / ' : '' ?><?= $c['vlog_title'] ? 'vlog "' . e($c['vlog_title']) . '"' : '' ?></span></span>
    <span class="seen"><?= e($c['status']) ?> &middot; <?= e(substr($c['created_at'], 0, 10)) ?> <?= rm_form('fan_comment', (int)$c['id']) ?></span></li>
<?php endforeach; ?>
</ul>
<h3>Comments on ideas (<?= count($icom) ?>)</h3>
<?php if (!$icom): ?><p class="hint">None.</p><?php endif; ?>
<ul class="fanlist subs">
<?php foreach ($icom as $c): ?>
  <li><span class="nm"><?= e($c['body']) ?><br><span class="seen">on idea "<?= e($c['title']) ?>"</span></span><span class="seen"><?= (int)$c['hidden'] ? 'hidden' : 'live' ?> &middot; <?= e(substr($c['created_at'], 0, 10)) ?> <?= rm_form('idea_comment', (int)$c['id']) ?></span></li>
<?php endforeach; ?>
</ul>
<h3>Screenshots (<?= count($proofs) ?>)</h3>
<?php if (!$proofs): ?><p class="hint">None. <a href="/admin/proofs.php">Review screenshots</a>.</p><?php endif; ?>
<ul class="fanlist subs">
<?php foreach ($proofs as $p): ?>
  <li><span class="nm"><?= e(PROOF_PLATFORMS[$p['platform']] ?? $p['platform']) ?>: <?= e(proof_action_label((string)$p['platform'], (string)$p['action'])) ?></span><span class="seen"><?= e($p['status']) ?> &middot; <?= (int)$p['points'] ?> pts &middot; <?= e(substr($p['created_at'], 0, 10)) ?></span></li>
<?php endforeach; ?>
</ul>
<h3>Game scores and likes</h3>
<p class="hint"><?= $scores ? implode(' &middot; ', array_map(fn($s) => e(HOF_GAMES[$s['game']] ?? $s['game']) . ': ' . e(hof_result($s['game'], $s)), $scores)) : 'No games played.' ?> &middot; <?= $nlikes ?> idea likes given. (Manage scores in <a href="/admin/scores.php">Hall of fame</a>.)</p>

<h2>Account</h2>
<form method="post" class="form">
  <?= csrf_field() ?><input type="hidden" name="id" value="<?= $id ?>">
  <?php if ((int)$f['suspended']): ?>
    <p class="hint">Suspended: they are signed out, cannot log in, and their name, scores and comments are hidden from the site. Nothing is deleted.</p>
    <button class="btn" name="action" value="unsuspend" type="submit">Bring them back</button>
  <?php else: ?>
    <p class="hint">Suspend = a pause. They are signed out, cannot log in, and their name, scores and comments are hidden. You can undo it any time.</p>
    <button class="btn ghost" name="action" value="suspend" type="submit" onclick="return confirm('Suspend <?= e($f['username']) ?>?');">Suspend this fan</button>
  <?php endif; ?>
</form>
<form method="post" class="form" style="margin-top:22px">
  <?= csrf_field() ?><input type="hidden" name="id" value="<?= $id ?>"><input type="hidden" name="action" value="delete">
  <h3>Delete completely</h3>
  <p class="hint">This cannot be undone. It removes the account, their scores, screenshots, ideas and comments. Type their username (<strong><?= e($f['username']) ?></strong>) to confirm.</p>
  <label for="cn">Username</label>
  <input id="cn" name="confirm_name" autocomplete="off" style="max-width:260px">
  <button class="btn link-danger" type="submit">Delete this fan and everything they posted</button>
</form>
<?php admin_footer(); ?>

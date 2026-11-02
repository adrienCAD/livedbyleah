<?php
// Public JSON for the vlog drawer: one mixed feed (Leah's picks from YouTube / TikTok / Instagram + approved fan comments).
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/comments.php';
require __DIR__ . '/../inc/fans.php';
require __DIR__ . '/../inc/fancomments.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$s = db()->prepare('SELECT * FROM vlogs WHERE id = ?');
$s->execute([(int)($_GET['id'] ?? 0)]);
$vlog = $s->fetch();
if (!$vlog) {
    http_response_code(404);
    echo '{"error":"not found"}';
    exit;
}

if ($vlog['youtube_id'] !== '' && time() - (int)$vlog['yt_fetched'] > YT_REFRESH_SECONDS) {
    $err = yt_refresh($vlog);
    set_setting('youtube_last_error', $err ?? '');
}

$vid = (int)$vlog['id'];
$feed = [];
$plat = db()->prepare('SELECT source, author, body, likes, created_at FROM comments WHERE vlog_id = ? AND hidden = 0 ORDER BY likes DESC, id DESC');
$plat->execute([$vid]);
$taken = [];
foreach ($plat->fetchAll() as $c) {
    if (($taken[$c['source']] = ($taken[$c['source']] ?? 0) + 1) > 5) { continue; }   // top 5 per platform, like before
    $feed[] = ['source' => $c['source'], 'author' => $c['author'], 'body' => $c['body'], 'likes' => (int)$c['likes'], 'ago' => ago($c['created_at']), 't' => strtotime($c['created_at'] . ' UTC')];
}
foreach (fc_for_vlog($vid) as $c) {
    $feed[] = ['source' => 'fan', 'author' => $c['username'], 'body' => $c['body'], 'likes' => 0, 'ago' => ago($c['created_at']), 't' => strtotime($c['created_at'] . ' UTC')];
}
usort($feed, fn($a, $b) => $b['t'] <=> $a['t']);

echo json_encode([
    'links' => [
        'youtube' => $vlog['youtube_id'] !== '' ? 'https://www.youtube.com/shorts/' . $vlog['youtube_id'] : '',
        'tiktok' => (string)$vlog['tiktok_url'],
        'instagram' => (string)$vlog['instagram_url'],
    ],
    'comments' => $feed,
], JSON_UNESCAPED_UNICODE);

<?php
// Public JSON for the vlog drawer: Leah's blurb + top comments per platform.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/comments.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60');

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

echo json_encode([
    'why' => (string)($vlog['why'] ?? ''),
    'youtube' => vlog_comments((int)$vlog['id'], 'youtube'),
    'tiktok' => vlog_comments((int)$vlog['id'], 'tiktok'),
    'instagram' => vlog_comments((int)$vlog['id'], 'instagram'),
], JSON_UNESCAPED_UNICODE);

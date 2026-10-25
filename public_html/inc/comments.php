<?php
// Comments for the vlog drawer: YouTube comments are fetched automatically (and cached),
// TikTok / Instagram comments are pasted in by Leah in the admin area.
declare(strict_types=1);

const YT_REFRESH_SECONDS = 6 * 3600;   // look for new YouTube comments at most every 6 hours per vlog

// Same rule as the Fans tab: first name + first letter of the last name ("Mia K.").
function display_name(string $raw): string {
    $raw = trim(preg_replace('/\s+/u', ' ', ltrim(trim($raw), '@')));
    if ($raw === '') {
        return 'A viewer';
    }
    $parts = explode(' ', $raw);
    $first = mb_strtoupper(mb_substr($parts[0], 0, 1)) . mb_substr($parts[0], 1, 19);
    if (count($parts) > 1 && $parts[1] !== '') {
        return $first . ' ' . mb_strtoupper(mb_substr($parts[1], 0, 1)) . '.';
    }
    return $first;
}

function yt_refresh(array $vlog): ?string {
    $key = setting('youtube_api_key');
    if ($key === '') {
        return 'No YouTube API key saved yet.';
    }
    $url = 'https://www.googleapis.com/youtube/v3/commentThreads?' . http_build_query([
        'part' => 'snippet', 'videoId' => $vlog['youtube_id'], 'order' => 'relevance',
        'maxResults' => 20, 'textFormat' => 'plainText', 'key' => $key,
    ]);
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6, CURLOPT_CONNECTTIMEOUT => 4]);
    $res = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $data = is_string($res) ? json_decode($res, true) : null;
    if ($code !== 200 || !is_array($data)) {
        $msg = $data['error']['message'] ?? ('HTTP ' . $code);
        // Comments turned off on a video is normal, not an error worth blocking on.
        if (isset($data['error']['errors'][0]['reason']) && $data['error']['errors'][0]['reason'] === 'commentsDisabled') {
            db()->prepare('UPDATE vlogs SET yt_fetched = ? WHERE id = ?')->execute([time(), $vlog['id']]);
            return null;
        }
        return 'YouTube said: ' . $msg;
    }
    $ins = db()->prepare(
        'INSERT INTO comments (vlog_id, source, author, body, likes, ext_id, created_at)
         VALUES (?, "youtube", ?, ?, ?, ?, ?)
         ON CONFLICT(source, ext_id) DO UPDATE SET likes = excluded.likes'
    );
    foreach (($data['items'] ?? []) as $it) {
        $c = $it['snippet']['topLevelComment']['snippet'] ?? null;
        $body = trim((string)($c['textOriginal'] ?? $c['textDisplay'] ?? ''));
        if ($c === null || $body === '' || preg_match('~https?://|www\.~i', $body)) {
            continue;   // skip empty comments and anything with a link
        }
        $when = substr((string)($c['publishedAt'] ?? ''), 0, 19);
        $ins->execute([
            $vlog['id'], display_name((string)($c['authorDisplayName'] ?? '')), mb_substr($body, 0, 600),
            (int)($c['likeCount'] ?? 0), (string)$it['id'], $when !== '' ? str_replace('T', ' ', $when) : date('Y-m-d H:i:s'),
        ]);
    }
    db()->prepare('UPDATE vlogs SET yt_fetched = ? WHERE id = ?')->execute([time(), $vlog['id']]);
    return null;
}

function vlog_comments(int $vlogId, string $source, int $limit = 5): array {
    $s = db()->prepare(
        'SELECT author, body, likes FROM comments
         WHERE vlog_id = ? AND source = ? AND hidden = 0
         ORDER BY likes DESC, id DESC LIMIT ' . (int)$limit
    );
    $s->execute([$vlogId, $source]);
    return $s->fetchAll();
}

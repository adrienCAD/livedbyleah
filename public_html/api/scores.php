<?php
// Hall of fame for the surf game. GET = top 10. POST action=start / submit.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/comments.php';   // display_name()

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function top_scores(): array {
    $rows = db()->query('SELECT name, ms, created_at FROM scores ORDER BY ms ASC, id ASC LIMIT 10')->fetchAll();
    foreach ($rows as &$r) {
        $r['ms'] = (int)$r['ms'];
        $r['date'] = substr((string)$r['created_at'], 0, 10);
        unset($r['created_at']);
    }
    return $rows;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['top' => top_scores()], JSON_UNESCAPED_UNICODE);
    exit;
}

$in = json_decode((string)file_get_contents('php://input'), true);
$in = is_array($in) ? $in : [];
$action = (string)($in['action'] ?? '');

if ($action === 'start') {
    $_SESSION['run'] = ['nonce' => bin2hex(random_bytes(16)), 'start' => time()];
    echo json_encode(['nonce' => $_SESSION['run']['nonce']]);
    exit;
}

if ($action === 'submit') {
    $run = $_SESSION['run'] ?? null;
    $ms = (int)($in['ms'] ?? 0);
    if (!$run || !hash_equals($run['nonce'], (string)($in['nonce'] ?? ''))) {
        http_response_code(400);
        echo json_encode(['error' => 'No active run. Play a full game first.']);
        exit;
    }
    unset($_SESSION['run']);   // one submission per run
    $elapsed = (time() - (int)$run['start']) * 1000;
    // A real run cannot be longer than the time since it started, and cannot be absurdly short.
    if ($ms < 45000 || $ms > $elapsed + 3000 || $ms > 4 * 3600 * 1000) {
        http_response_code(400);
        echo json_encode(['error' => 'That time was not accepted.']);
        exit;
    }
    $name = display_name(mb_substr(preg_replace('/[^\p{L}\p{N} .\'_-]/u', '', (string)($in['name'] ?? '')), 0, 30));
    if ($name === 'A viewer') {
        $name = 'Anonymous';
    }
    db()->prepare('INSERT INTO scores (name, ms) VALUES (?, ?)')->execute([$name, $ms]);
    echo json_encode(['top' => top_scores(), 'name' => $name], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo '{"error":"bad request"}';

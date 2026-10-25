<?php
// Hall of fame for the surf game. GET = top 10 + who I am. POST action=start / submit.
// One best result per player (fan account, or a guest session). Rank: cleared all 5 first,
// then the highest level reached, then the fastest time.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/fans.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// Per game: how short a real win / non-win run can be (the server rejects faster times), and whether level 1 is saved.
const GAMES = [
    'surf'  => ['minWin' => 45000, 'perLevel' => 9000,  'minLevelSaved' => 2],
    'road'  => ['minWin' => 120000, 'perLevel' => 20000, 'minLevelSaved' => 1],
];
const SCORE_ORDER = 's.won DESC, s.level DESC, s.ms ASC, s.id ASC';

function top_scores(string $myKey, string $game): array {
    $rows = db()->query('SELECT COALESCE(f.username, s.name) AS name, s.ms, s.level, s.won, s.pkey, s.created_at, f.last_login AS seen
        FROM scores s LEFT JOIN fans f ON f.id = s.fan_id WHERE s.game = ' . db()->quote($game) . ' ORDER BY ' . SCORE_ORDER . ' LIMIT 10')->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            'name' => $r['name'], 'ms' => (int)$r['ms'], 'level' => (int)$r['level'], 'won' => (int)$r['won'] === 1,
            'date' => substr((string)$r['created_at'], 0, 10), 'seen' => $r['seen'] ? ago($r['seen']) : null, 'mine' => $r['pkey'] !== null && $r['pkey'] === $myKey,
        ];
    }
    return $out;
}

$me = player();
$game = (string)($_GET['game'] ?? '');
$in0 = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $in0 = json_decode((string)file_get_contents('php://input'), true);
    $in0 = is_array($in0) ? $in0 : [];
    $game = (string)($in0['game'] ?? '');
}
$game = isset(GAMES[$game]) ? $game : 'surf';
$cfg = GAMES[$game];
$myKey = $game === 'surf' ? $me['pkey'] : $me['pkey'] . ':' . $game;   // one best result per player per game
$runKey = $game === 'surf' ? 'run' : 'run_' . $game;
$meOut = ['name' => $me['name'], 'fan' => $me['fan']];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['top' => top_scores($myKey, $game), 'me' => $meOut], JSON_UNESCAPED_UNICODE);
    exit;
}

$in = $in0;
$action = (string)($in['action'] ?? '');

if ($action === 'start') {
    $_SESSION[$runKey] = ['nonce' => bin2hex(random_bytes(16)), 'start' => time()];
    echo json_encode(['nonce' => $_SESSION[$runKey]['nonce'], 'me' => $meOut], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'submit') {
    $run = $_SESSION[$runKey] ?? null;
    $ms = (int)($in['ms'] ?? 0);
    $level = (int)($in['level'] ?? 0);
    $won = !empty($in['won']);
    if (!$run || !hash_equals($run['nonce'], (string)($in['nonce'] ?? ''))) {
        http_response_code(400);
        echo json_encode(['error' => 'No active run. Play a full game first.']);
        exit;
    }
    unset($_SESSION[$runKey]);   // one submission per run
    $elapsed = (time() - (int)$run['start']) * 1000;
    if ($level < 1 || $level > 5 || ($won && $level !== 5)) {
        http_response_code(400);
        echo json_encode(['error' => 'That result was not accepted.']);
        exit;
    }
    // A real run cannot be longer than the time since it started, and cannot be absurdly short.
    $minMs = $won ? $cfg['minWin'] : max(3000, $cfg['perLevel'] * ($level - 1));
    if ($ms < $minMs || $ms > $elapsed + 3000 || $ms > 4 * 3600 * 1000) {
        http_response_code(400);
        echo json_encode(['error' => 'That time was not accepted.']);
        exit;
    }
    // Level 1 is just the beach: nothing to rank yet.
    if ($level < $cfg['minLevelSaved']) {
        echo json_encode(['saved' => false, 'top' => top_scores($myKey, $game), 'me' => $meOut], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $st = db()->prepare('SELECT id, won, level, ms FROM scores WHERE pkey = ?');
    $st->execute([$myKey]);
    $cur = $st->fetch();
    $improved = false;
    if (!$cur) {
        db()->prepare('INSERT INTO scores (name, ms, pkey, fan_id, level, won, game) VALUES (?, ?, ?, ?, ?, ?, ?)')
            ->execute([$me['name'], $ms, $myKey, $me['fan_id'], $level, $won ? 1 : 0, $game]);
        $improved = true;
        $best = ['level' => $level, 'won' => $won, 'ms' => $ms];
    } else {
        $newBetter = [(int)$won, $level, -$ms] > [(int)$cur['won'], (int)$cur['level'], -(int)$cur['ms']];
        if ($newBetter) {
            db()->prepare('UPDATE scores SET name = ?, ms = ?, level = ?, won = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?')
                ->execute([$me['name'], $ms, $level, $won ? 1 : 0, $cur['id']]);
            $improved = true;
            $best = ['level' => $level, 'won' => $won, 'ms' => $ms];
        } else {
            $best = ['level' => (int)$cur['level'], 'won' => (int)$cur['won'] === 1, 'ms' => (int)$cur['ms']];
        }
    }
    echo json_encode(['saved' => true, 'improved' => $improved, 'best' => $best, 'top' => top_scores($myKey, $game), 'me' => $meOut], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo '{"error":"bad request"}';

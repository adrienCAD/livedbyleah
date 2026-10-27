<?php
// Fan accounts: sign-up, login, email confirmation, password reset, usernames.
// Fans are separate from admins (`users`). Session key: fan_id.
declare(strict_types=1);

function is_local_host(): bool {
    return (bool)preg_match('/^(127\.0\.0\.1|localhost)(:\d+)?$/', (string)($_SERVER['HTTP_HOST'] ?? ''));
}

function site_url(): string {
    return is_local_host() ? 'http://' . $_SERVER['HTTP_HOST'] : 'https://livedbyleah.com';
}

// Sends a plain-text email. On a local test server it writes to data/outbox.log instead.
function send_mail(string $to, string $subject, string $body): bool {
    if (is_local_host()) {
        return (bool)file_put_contents(__DIR__ . '/../data/outbox.log', "TO: $to\nSUBJECT: $subject\n$body\n-----\n", FILE_APPEND);
    }
    $headers = "From: Lived by Leah <noreply@livedbyleah.com>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8";
    return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
}

function new_token(): array {
    $t = bin2hex(random_bytes(20));
    return [$t, hash('sha256', $t)];
}

function current_fan(): ?array {
    static $cache = false;
    if ($cache !== false) {
        return $cache;
    }
    $cache = null;
    if (!empty($_SESSION['fan_id'])) {
        $st = db()->prepare('SELECT * FROM fans WHERE id = ? AND confirmed = 1');
        $st->execute([(int)$_SESSION['fan_id']]);
        $row = $st->fetch();
        if ($row) {
            $cache = $row;
        } else {
            unset($_SESSION['fan_id']);
        }
    }
    return $cache;
}

function username_taken(string $name, int $exceptId = 0): bool {
    $st = db()->prepare('SELECT 1 FROM fans WHERE username = ? AND id != ?');
    $st->execute([$name, $exceptId]);
    return (bool)$st->fetchColumn();
}

// Default public name: first name + last initial, e.g. "Mia K.". Adds a number if already taken.
function default_username(string $first, string $initial, int $exceptId = 0): string {
    $base = mb_strtoupper(mb_substr($first, 0, 1)) . mb_substr($first, 1) . ' ' . mb_strtoupper($initial) . '.';
    $name = $base;
    for ($n = 2; username_taken($name, $exceptId); $n++) {
        $name = $base . ' ' . $n;
    }
    return $name;
}

// Returns [cleanName, error]. 3-20 characters: letters, numbers, spaces, . _ -
function clean_username(string $raw): array {
    $n = trim((string)preg_replace('/\s+/u', ' ', $raw));
    if (mb_strlen($n) < 3 || mb_strlen($n) > 20) {
        return ['', 'Your username needs 3 to 20 characters.'];
    }
    if (!preg_match('/^[\p{L}\p{N} ._-]+$/u', $n)) {
        return ['', 'Use only letters, numbers, spaces, dots, dashes and underscores in your username.'];
    }
    return [$n, ''];
}

function password_error(string $p): ?string {
    if (strlen($p) < 10) {
        return 'Your password needs at least 10 characters.';
    }
    if (strlen($p) > 64) {
        return 'Your password can be at most 64 characters.';
    }
    return null;
}

function send_confirm_email(int $fanId, string $email, string $first): bool {
    [$t, $h] = new_token();
    db()->prepare('UPDATE fans SET confirm_hash = ? WHERE id = ?')->execute([$h, $fanId]);
    return send_mail($email, 'Confirm your email for Lived by Leah',
        "Hi $first,\n\nWelcome to the Lived by Leah fan club!\nConfirm your email here:\n" . site_url() . "/fans.php?confirm=$t\n\nIf you did not sign up, ignore this email.\n");
}

function send_reset_email(int $fanId, string $email): bool {
    [$t, $h] = new_token();
    db()->prepare('UPDATE fans SET reset_hash = ?, reset_expires = ? WHERE id = ?')->execute([$h, time() + 3600, $fanId]);
    return send_mail($email, 'Reset your Lived by Leah password',
        "Someone asked to reset the password for this email.\nChoose a new password here (the link works for 1 hour):\n" . site_url() . "/fans.php?reset=$t\n\nIf it was not you, ignore this email.\n");
}

// Funny placeholder names for visitors who are not signed in.
function guest_player(): array {
    if (empty($_SESSION['guest'])) {
        $a = ['Gnarly', 'Wavy', 'Sandy', 'Salty', 'Sunny', 'Radical', 'Breezy', 'Coral', 'Tubular', 'Mellow'];
        $b = ['SurferDude', 'SurferDudette', 'ShellCollector', 'BeachBum', 'KelpRider', 'WaveHopper', 'SandcastleKing', 'SeagullPal', 'BoardBuddy', 'TideChaser'];
        $_SESSION['guest'] = [
            'key' => 'g' . bin2hex(random_bytes(8)),
            'name' => $a[random_int(0, count($a) - 1)] . $b[random_int(0, count($b) - 1)],   // e.g. TubularBeachBum
        ];
    }
    return $_SESSION['guest'];
}

// Who is playing: a signed-in fan, or a guest with a funny name.
function player(): array {
    $f = current_fan();
    if ($f) {
        return ['pkey' => 'f' . $f['id'], 'fan_id' => (int)$f['id'], 'name' => $f['username'], 'fan' => true];
    }
    if (is_admin()) {   // Leah (or Adrien) playing while signed in as admin: scores go under the admin name
        $u = db()->prepare('SELECT username FROM users WHERE id = ?');
        $u->execute([(int)$_SESSION['user_id']]);
        $nm = (string)$u->fetchColumn();
        if ($nm !== '') {
            return ['pkey' => 'u' . (int)$_SESSION['user_id'], 'fan_id' => null, 'name' => $nm, 'fan' => true];
        }
    }
    $g = guest_player();
    return ['pkey' => $g['key'], 'fan_id' => null, 'name' => $g['name'], 'fan' => false];
}

// "5 min ago", "3 h ago", "2 days ago", or "on Oct 3" for a UTC datetime string from the database.
function ago(?string $utc): string {
    if (!$utc) {
        return 'never';
    }
    $t = strtotime($utc . ' UTC');
    $d = time() - $t;
    if ($d < 90) {
        return 'just now';
    }
    if ($d < 3600) {
        return intdiv($d, 60) . ' min ago';
    }
    if ($d < 86400) {
        return intdiv($d, 3600) . ' h ago';
    }
    if ($d < 86400 * 14) {
        $n = intdiv($d, 86400);
        return $n . ($n === 1 ? ' day ago' : ' days ago');
    }
    return 'on ' . gmdate('M j', $t);
}

// A date and time that the browser shows in the visitor's own time zone (UTC text if JavaScript is off).
function time_tag(?string $utc): string {
    if (!$utc) {
        return 'never';
    }
    $t = strtotime($utc . ' UTC');
    return '<time class="localtime" datetime="' . gmdate('c', $t) . '">' . e(gmdate('M j, Y H:i', $t)) . ' UTC</time>';
}

// ---------------------------------------------------------------- points and ranking
const SIGNUP_POINTS = 10;
const PROOF_POINTS = ['like' => 5, 'follow' => 10, 'comment' => 10];
const PROOF_PLATFORMS = ['youtube' => 'YouTube', 'instagram' => 'Instagram', 'tiktok' => 'TikTok'];

function proof_action_label(string $platform, string $action): string {
    if ($action === 'follow') {
        return $platform === 'youtube' ? 'Subscribe' : 'Follow';
    }
    return $action === 'like' ? 'Like' : 'Comment';
}

function fan_count(): int {
    return (int)db()->query('SELECT COUNT(*) FROM fans WHERE confirmed = 1')->fetchColumn();
}

// Every confirmed fan, ranked. Points = sign-up (10) + game levels passed (1+2+3+4+5, so 15 for a full clear)
// + approved screenshots. Ties go to whoever signed up first.
function fan_ranking(): array {
    $rows = db()->query('SELECT f.id, f.username, COALESCE(f.last_login, f.created_at) AS seen,
        COALESCE((SELECT SUM(CASE WHEN s.won = 1 THEN 15 ELSE (s.level - 1) * s.level / 2 END) FROM scores s WHERE s.fan_id = f.id AND s.game IN (\'surf\', \'road\')), 0)
        + COALESCE((SELECT CASE WHEN s.ms >= 12000 THEN 15 WHEN s.ms >= 8000 THEN 10 WHEN s.ms >= 5000 THEN 6 WHEN s.ms >= 2500 THEN 3 WHEN s.ms >= 1000 THEN 1 ELSE 0 END FROM scores s WHERE s.fan_id = f.id AND s.game = \'blocks\'), 0)
        + COALESCE((SELECT CASE WHEN s.ms >= 35000 THEN 15 WHEN s.ms >= 20000 THEN 10 WHEN s.ms >= 10000 THEN 6 WHEN s.ms >= 5000 THEN 3 WHEN s.ms >= 2000 THEN 1 ELSE 0 END FROM scores s WHERE s.fan_id = f.id AND s.game = \'bert\'), 0) AS lvl_pts,
        COALESCE((SELECT SUM(p.points) FROM proofs p WHERE p.fan_id = f.id AND p.status = \'approved\'), 0) AS soc_pts
        FROM fans f WHERE f.confirmed = 1')->fetchAll();
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['pts'] = SIGNUP_POINTS + (int)$r['lvl_pts'] + (int)$r['soc_pts'];
    }
    unset($r);
    usort($rows, fn($a, $b) => [$b['pts'], $a['id']] <=> [$a['pts'], $b['id']]);
    foreach ($rows as $i => &$r) {
        $r['rank'] = $i + 1;
    }
    return $rows;
}

function pending_proofs(): int {
    return (int)db()->query('SELECT COUNT(*) FROM proofs WHERE status = \'pending\'')->fetchColumn();
}

// Full name for admins: older fans only have the initial.
function fan_full_name(array $f): string {
    $last = trim((string)($f['last_name'] ?? ''));
    return $f['first_name'] . ' ' . ($last !== '' ? $last : $f['last_initial'] . '.');
}

function pending_support(): int {
    return (int)db()->query("SELECT COUNT(*) FROM support_requests WHERE status = 'pending'")->fetchColumn();
}


// ---------------------------------------------------------------- hall of fame summary (top 5 per game)
const SCORE_ORDER = 's.won DESC, s.level DESC, s.ms ASC, s.id ASC';
const ROAD_CUM = [0, 600, 2600, 5300, 6800, 7700];   // Leah's Outrun: km at the end of each level
const ROAD_COUNTRY = ['Costa Rica', 'Mexico', 'the USA', 'Canada', 'France'];

// Hall of fame order per game: Blocks by score, Outrun by km (bonuses included), Surf by clear/level/time.
function score_order(string $game): string {
    if ($game === 'blocks' || $game === 'bert') { return 's.ms DESC, s.id ASC'; }
    if ($game === 'road') { return 's.km DESC, s.ms ASC, s.id ASC'; }
    return SCORE_ORDER;
}
const HOF_GAMES = ['surf' => 'Surf Cleanup', 'road' => "Leah's Outrun", 'blocks' => "Leah's Blocks", 'bert' => 'L-Bert'];
const BERT_ELEMENTS = ['Water', 'Earth', 'Air', 'Fire'];

function hof_result(string $game, array $r): string {
    if ($game === 'blocks') {
        return number_format((int)$r['ms']) . ' pts &middot; ' . (int)$r['level'] . ' lines';
    }
    if ($game === 'bert') {
        return number_format((int)$r['ms']) . ' pts &middot; ' . ((int)$r['won'] === 1 ? 'Cleared all 4' : 'reached ' . BERT_ELEMENTS[max(1, min(4, (int)$r['level'])) - 1]);
    }
    if ($game === 'road') {
        return number_format((int)$r['km']) . ' km &middot; ' . ((int)$r['won'] === 1 ? 'Cleared all 5' : 'reached ' . ROAD_COUNTRY[max(1, min(5, (int)$r['level'])) - 1]);
    }
    $sec = intdiv((int)$r['ms'], 1000);
    return ((int)$r['won'] === 1 ? 'Cleared all 5' : 'Level ' . (int)$r['level']) . ' &middot; ' . sprintf('%d:%02d', intdiv($sec, 60), $sec % 60);
}

// Everything the summary needs: top 5 per game, Leah's record, the viewer's rank, and the overall champion.
function hof_summary(): array {
    $leah = setting('leah_name') ?: 'LeahPunkStar';
    $me = current_fan() ? 'f' . current_fan()['id'] : (is_admin() ? 'u' . (int)$_SESSION['user_id'] : '');
    $out = ['games' => [], 'champ' => null];
    $pts = [];
    foreach (HOF_GAMES as $g => $label) {
        $order = score_order($g);
        $rows = db()->query('SELECT COALESCE(f.username, s.name) AS name, s.ms, s.level, s.won, s.km, s.pkey, f.last_login AS seen
            FROM scores s LEFT JOIN fans f ON f.id = s.fan_id WHERE s.game = ' . db()->quote($g) . ' ORDER BY ' . $order)->fetchAll();
        $rec = null; $mine = null;
        foreach ($rows as $i => $r) {
            $key = (string)$r['pkey'];
            $pk = explode(':', $key)[0];   // same player across games
            $pts[$pk]['name'] = $r['name'];
            $pts[$pk]['pts'] = ($pts[$pk]['pts'] ?? 0) + max(0, 5 - $i);   // 5 points for 1st ... 1 for 5th
            if ($rec === null && $key !== '' && $key[0] === 'u' && $r['name'] === $leah) { $rec = $r + ['rank' => $i + 1]; }
            if ($me !== '' && $key === ($g === 'surf' ? $me : $me . ':' . $g) ) { $mine = $i + 1; }
        }
        $out['games'][$g] = ['label' => $label, 'top' => array_slice($rows, 0, 5), 'leah' => $rec, 'mine' => $mine, 'total' => count($rows), 'me' => $me !== ''];
    }
    uasort($pts, fn($a, $b) => $b['pts'] <=> $a['pts']);
    foreach ($pts as $p) { $out['champ'] = $p; break; }
    return $out;
}

function hof_render(array $h): void {
    $leah = setting('leah_name') ?: 'LeahPunkStar';
    $medal = ['&#129351;', '&#129352;', '&#129353;'];
    echo '<div class="hofsum">';
    if ($h['champ'] && $h['champ']['pts'] > 0) {
        echo '<p class="champ">&#127942; <strong>Overall champion: ' . e($h['champ']['name']) . '</strong> <span class="seen">' . (int)$h['champ']['pts'] . ' hall of fame points (5 for 1st, down to 1 for 5th, in each game)</span></p>';
    }
    echo '<div class="hofgrid">';
    foreach ($h['games'] as $g => $d) {
        echo '<section class="hofbox"><h3>' . e($d['label']) . '</h3>';
        if (!$d['top']) {
            echo '<p class="hint">No scores yet. Be the first!</p>';
        } else {
            echo '<ol class="fanlist hofl">';
            foreach ($d['top'] as $i => $r) {
                $isLeah = (string)$r['pkey'] !== '' && ((string)$r['pkey'])[0] === 'u' && $r['name'] === $leah;
                echo '<li><span class="nm">' . ($medal[$i] ?? '#' . ($i + 1)) . ' ' . e($r['name']) . ($isLeah ? ' &#11088;' : '') . '</span><span class="seen">' . hof_result($g, $r) . '</span></li>';
            }
            echo '</ol>';
        }
        if ($d['leah'] && $d['leah']['rank'] > 5) {
            echo '<p class="hint">&#11088; Leah\'s record: ' . hof_result($g, $d['leah']) . ' (#' . (int)$d['leah']['rank'] . ')</p>';
        } elseif (!$d['leah']) {
            echo '<p class="hint">&#11088; Leah\'s record to beat: coming soon</p>';
        }
        if ($d['me']) {
            echo '<p class="hint">' . ($d['mine'] ? 'You are #' . (int)$d['mine'] . ' of ' . (int)$d['total'] . ' players.' : 'You have not played yet.') . '</p>';
        }
        echo '<p><a class="btn ghost" href="/games.php?g=' . e($g) . '">Play ' . e($d['label']) . '</a></p></section>';
    }
    echo '</div></div>';
}


// ---------------------------------------------------------------- demo data (day-one filler, removable)
function demo_count(): int {
    return (int)db()->query('SELECT COUNT(*) FROM fans WHERE demo = 1')->fetchColumn();
}

// Adds fake fans with scores in the four games. They cannot log in (random password, fake email) and are flagged demo = 1.
function demo_add(): int {
    if (demo_count() > 0) { return 0; }
    // first, last, username, days since joining, days since last seen, surf (level, won, sec), road (level, won, sec), blocks (score, lines), L-Bert (score, level, won)
    $people = [
        ['Mia', 'Kowalski', 'SunnyMia', 12, 0, [5, 1, 612], [3, 0, 190], [9400, 41], [36500, 4, 1]],
        ['Noah', 'Brooks', 'NoahWaves', 11, 0, [5, 1, 705], [5, 1, 640], [4200, 22], [8200, 2, 0]],
        ['Sofia', 'Reyes', 'SofiaStar', 11, 1, [4, 0, 480], [2, 0, 120], [13100, 58], [14200, 3, 0]],
        ['Lucas', 'Meyer', 'LucasLegend', 10, 0, [3, 0, 330], [4, 0, 410], [2600, 15], [3100, 1, 0]],
        ['Emma', 'Dubois', 'EmmaPixel', 9, 2, [2, 0, 150], [1, 0, 60], [6100, 30], [22400, 4, 0]],
        ['Liam', 'Santos', 'TacoLiam', 9, 3, [5, 0, 560], [3, 0, 230], [1800, 11], [0, 0, 0]],
        ['Ava', 'Nguyen', 'AvaOnFire', 8, 1, [4, 0, 520], [5, 0, 470], [8300, 37], [11800, 3, 0]],
        ['Ethan', 'Park', 'EthanTheBest', 7, 4, [2, 0, 170], [2, 0, 130], [1100, 8], [1500, 1, 0]],
        ['Zoe', 'Fischer', 'ZoeZoom', 6, 0, [3, 0, 290], [4, 0, 360], [3500, 19], [6400, 2, 0]],
        ['Mateo', 'Lopez', 'MateoMagic', 5, 2, [2, 0, 140], [1, 0, 70], [700, 6], [2600, 1, 0]],
        ['Lily', 'Anderson', 'LilyBug', 4, 5, [0, 0, 0], [3, 0, 200], [0, 0], [9900, 2, 0]],
        ['Oscar', 'Rossi', 'OscarOcean', 3, 1, [3, 0, 310], [0, 0, 0], [2100, 13], [0, 0, 0]],
    ];
    $pdo = db();
    $pdo->beginTransaction();
    $n = 0;
    foreach ($people as $i => [$first, $last, $user, $joined, $seen, $surf, $road, $blocks, $bert]) {
        $created = gmdate('Y-m-d H:i:s', time() - $joined * 86400 - 3600 * ($i + 1));
        $login = gmdate('Y-m-d H:i:s', time() - $seen * 86400 - 600 * ($i + 1));
        $pdo->prepare('INSERT INTO fans (email, password_hash, first_name, last_initial, last_name, username, username_locked, confirmed, created_at, last_login, prev_login, demo)
            VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, 1)')
            ->execute(['demo' . ($i + 1) . '@demo.invalid', password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT), $first, substr($last, 0, 1), $last, $user, $created, $login, $created]);
        $fid = (int)$pdo->lastInsertId();
        $ins = $pdo->prepare('INSERT INTO scores (name, ms, level, won, pkey, fan_id, game, created_at, km) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        if ($surf[0] > 0) { $ins->execute([$user, $surf[2] * 1000, $surf[0], $surf[1], 'f' . $fid, $fid, 'surf', $login, 0]); }
        if ($road[0] > 0) {
            $lv = $road[0];
            $km = $road[1] ? 7700 + 4 * 500 + 2000 : (int)round(ROAD_CUM[$lv - 1] + (0.3 + 0.05 * ($i % 9)) * (ROAD_CUM[$lv] - ROAD_CUM[$lv - 1])) + ($lv - 1) * 500;
            $ins->execute([$user, $road[2] * 1000, $lv, $road[1], 'f' . $fid . ':road', $fid, 'road', $login, $km]);
        }
        if ($blocks[0] > 0) { $ins->execute([$user, $blocks[0], $blocks[1], 0, 'f' . $fid . ':blocks', $fid, 'blocks', $login, 0]); }
        if ($bert[0] > 0) { $ins->execute([$user, $bert[0], $bert[1], $bert[2], 'f' . $fid . ':bert', $fid, 'bert', $login, 0]); }
        $n++;
    }
    $pdo->commit();
    return $n;
}

function demo_remove(): int {
    $n = demo_count();
    db()->exec('DELETE FROM scores WHERE fan_id IN (SELECT id FROM fans WHERE demo = 1)');
    db()->exec('DELETE FROM proofs WHERE fan_id IN (SELECT id FROM fans WHERE demo = 1)');
    db()->exec('DELETE FROM support_requests WHERE fan_id IN (SELECT id FROM fans WHERE demo = 1)');
    db()->exec('DELETE FROM fans WHERE demo = 1');
    return $n;
}

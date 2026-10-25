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
        COALESCE((SELECT CASE WHEN s.won = 1 THEN 15 ELSE (s.level - 1) * s.level / 2 END FROM scores s WHERE s.fan_id = f.id), 0) AS lvl_pts,
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

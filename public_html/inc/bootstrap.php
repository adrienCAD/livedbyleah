<?php
// Shared setup: session, database (SQLite file), helpers, CSRF, auth.
declare(strict_types=1);

const SITE_NAME = 'Lived by Leah';
const SITE_VERSION = '1.3.0';   // see CLAUDE.md for the version list
const DB_PATH = __DIR__ . '/../data/site.sqlite';

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']),
    ]);
    session_start();
}

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO('sqlite:' . DB_PATH);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT "admin",
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS vlogs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            youtube_id TEXT NOT NULL,
            tiktok_url TEXT,
            instagram_url TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            vlog_id INTEGER REFERENCES vlogs(id) ON DELETE SET NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vlog_id INTEGER NOT NULL REFERENCES vlogs(id) ON DELETE CASCADE,
            source TEXT NOT NULL,
            author TEXT NOT NULL,
            body TEXT NOT NULL,
            likes INTEGER NOT NULL DEFAULT 0,
            ext_id TEXT,
            hidden INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (source, ext_id)
        )');
        $pdo->exec('CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT NOT NULL)');
        // Upgrade older databases: Leah's "why I made this" blurb per vlog.
        $cols = array_column($pdo->query('PRAGMA table_info(vlogs)')->fetchAll(), 'name');
        if (!in_array('why', $cols, true)) {
            $pdo->exec('ALTER TABLE vlogs ADD COLUMN why TEXT');
        }
        if (!in_array('yt_fetched', $cols, true)) {
            $pdo->exec('ALTER TABLE vlogs ADD COLUMN yt_fetched INTEGER NOT NULL DEFAULT 0');
        }
        // One-time: Instagram reel links supplied for the first 11 vlogs (matched by title). Only fills empty fields.
        if (setting_raw($pdo, 'seed_instagram_1') === null && (int)$pdo->query('SELECT COUNT(*) FROM vlogs')->fetchColumn() > 0) {
            $ig = 'https://www.instagram.com/lived.by.leah/reel/';
            $map = [
                'abqlA7-poII' => 'DecksXyJW4U', '449c6bkjmhU' => 'DeaCwU1Jj92', 'PEexZLWaLZA' => 'DeaeLZ2JaKc',
                'XP_kddEoM_E' => 'DdSCNHQJEn2', 'r3SIxBH7fWo' => 'Da9JQVUBFNA', 'LZpbEPJpq8U' => 'DajOZN9paNP',
                'yY-G90-_oyg' => 'DaeQ26yJQyn', 'Xc3uJR4Yh3Q' => 'DabYrfLMxzU', 'P-jAl9fL0yI' => 'DaQjtr1htAk',
                'W3bvOMb92_0' => 'DZ2uCm3OuJj', 'H3Ued9RA0rY' => 'DZshoxKBbbJ',
            ];
            $up = $pdo->prepare('UPDATE vlogs SET instagram_url = ? WHERE youtube_id = ? AND (instagram_url IS NULL OR instagram_url = "")');
            foreach ($map as $yt => $code) {
                $up->execute([$ig . $code . '/', $yt]);
            }
            $pdo->prepare('INSERT INTO settings (k, v) VALUES ("seed_instagram_1", "1")')->execute();
        }
        // One-time: three reels that only exist on Instagram (no YouTube video), placed in series order.
        if (setting_raw($pdo, 'seed_extra_1') === null && (int)$pdo->query('SELECT COUNT(*) FROM vlogs')->fetchColumn() > 0) {
            $ig = 'https://www.instagram.com/lived.by.leah/reel/';
            $add = function (string $title, string $code, ?string $beforeYt) use ($pdo, $ig): void {
                $pos = null;
                if ($beforeYt !== null) {
                    $q = $pdo->prepare('SELECT sort_order FROM vlogs WHERE youtube_id = ?');
                    $q->execute([$beforeYt]);
                    $pos = $q->fetchColumn();
                }
                if ($pos === false || $pos === null) {
                    $pos = (int)$pdo->query('SELECT COALESCE(MIN(sort_order), 0) FROM vlogs')->fetchColumn() - ($beforeYt === null ? 1 : 0);
                } else {
                    $pdo->prepare('UPDATE vlogs SET sort_order = sort_order + 1 WHERE sort_order >= ?')->execute([$pos]);
                }
                $pdo->prepare('INSERT INTO vlogs (title, youtube_id, instagram_url, sort_order) VALUES (?, "", ?, ?)')
                    ->execute([$title, $ig . $code . '/', $pos]);
            };
            $add('Concert cover - September 19th, 2026', 'DemqL8rpy06', null);
            $add('Visiting the Tower of London: London vlog part 2', 'DcoKi4SJoSE', 'r3SIxBH7fWo');
            $add('Last day in Veracruz', 'DavwHFVOMcA', 'LZpbEPJpq8U');
            $pdo->prepare('INSERT INTO settings (k, v) VALUES ("seed_extra_1", "1")')->execute();
        }
        // Fans (public sign-ups). Separate from `users`, which holds only Leah and the admins.
        $pdo->exec('CREATE TABLE IF NOT EXISTS fans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_initial TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE COLLATE NOCASE,
            confirmed INTEGER NOT NULL DEFAULT 0,
            confirm_hash TEXT,
            reset_hash TEXT,
            reset_expires INTEGER NOT NULL DEFAULT 0,
            fails INTEGER NOT NULL DEFAULT 0,
            locked_until INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )');
        $fcols = array_column($pdo->query('PRAGMA table_info(fans)')->fetchAll(), 'name');
        if (!in_array('last_login', $fcols, true)) {
            $pdo->exec('ALTER TABLE fans ADD COLUMN last_login TEXT');
        }
        if (!in_array('prev_login', $fcols, true)) {
            $pdo->exec('ALTER TABLE fans ADD COLUMN prev_login TEXT');
        }
        // Full last name (admins only; the public name stays first name + initial). Older fans have only the initial.
        if (!in_array('last_name', $fcols, true)) {
            $pdo->exec('ALTER TABLE fans ADD COLUMN last_name TEXT');
        }
        // 1 once the fan has chosen their own username. After that only a support request can change it.
        if (!in_array('username_locked', $fcols, true)) {
            $pdo->exec('ALTER TABLE fans ADD COLUMN username_locked INTEGER NOT NULL DEFAULT 0');
        }
        // 1 for demo fans (day-one filler that Leah can remove in admin Settings).
        if (!in_array('demo', $fcols, true)) {
            $pdo->exec('ALTER TABLE fans ADD COLUMN demo INTEGER NOT NULL DEFAULT 0');
        }
        $pdo->exec('CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            ms INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )');
        // Upgrade scores: one best result per player (pkey), tagged to a fan when logged in.
        // Older rows are full clears, so they default to level 5, won.
        $scols = array_column($pdo->query('PRAGMA table_info(scores)')->fetchAll(), 'name');
        if (!in_array('pkey', $scols, true)) {
            $pdo->exec('ALTER TABLE scores ADD COLUMN pkey TEXT');
        }
        if (!in_array('fan_id', $scols, true)) {
            $pdo->exec('ALTER TABLE scores ADD COLUMN fan_id INTEGER REFERENCES fans(id) ON DELETE CASCADE');
        }
        if (!in_array('level', $scols, true)) {
            $pdo->exec('ALTER TABLE scores ADD COLUMN level INTEGER NOT NULL DEFAULT 5');
        }
        if (!in_array('won', $scols, true)) {
            $pdo->exec('ALTER TABLE scores ADD COLUMN won INTEGER NOT NULL DEFAULT 1');
        }
        $pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS scores_pkey ON scores(pkey)');
        // Which game the result is from: surf, road (Leah's Road Trip), later blocks. pkey is "<player>" for surf, "<player>:road" etc.
        if (!in_array('game', $scols, true)) {
            $pdo->exec('ALTER TABLE scores ADD COLUMN game TEXT NOT NULL DEFAULT "surf"');
        }
        // Leah's Outrun (v1.2.8) is ranked by kilometers driven (with level bonuses).
        if (!in_array('km', $scols, true)) {
            $pdo->exec('ALTER TABLE scores ADD COLUMN km INTEGER NOT NULL DEFAULT 0');
        }
        // One time: the old Outrun results used other levels and rules, so they are cleared. Demo fans get a km value instead.
        if (setting_raw($pdo, 'road_reset_128') === null) {
            $pdo->exec('DELETE FROM scores WHERE game = "road" AND (fan_id IS NULL OR fan_id NOT IN (SELECT id FROM fans WHERE demo = 1))');
            $cum = [0, 600, 2600, 5300, 6800, 7700];
            foreach ($pdo->query('SELECT id, level, won FROM scores WHERE game = "road"')->fetchAll() as $r) {
                $lv = max(1, min(5, (int)$r['level']));
                $km = (int)$r['won'] === 1 ? 7700 + 4 * 500 + 2000 : (int)round($cum[$lv - 1] + 0.55 * ($cum[$lv] - $cum[$lv - 1])) + ($lv - 1) * 500;
                $pdo->prepare('UPDATE scores SET km = ? WHERE id = ?')->execute([$km, $r['id']]);
            }
            $pdo->prepare('INSERT INTO settings (k, v) VALUES ("road_reset_128", "1")')->execute();
        }
        // Screenshot proofs of likes / follows / comments. The image is deleted once reviewed.
        $pdo->exec('CREATE TABLE IF NOT EXISTS proofs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fan_id INTEGER NOT NULL REFERENCES fans(id) ON DELETE CASCADE,
            platform TEXT NOT NULL,
            action TEXT NOT NULL,
            vlog_id INTEGER REFERENCES vlogs(id) ON DELETE SET NULL,
            file TEXT,
            status TEXT NOT NULL DEFAULT "pending",
            points INTEGER NOT NULL,
            note TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TEXT
        )');
        $pdo->exec('CREATE INDEX IF NOT EXISTS proofs_fan ON proofs(fan_id, status)');
        // Optional short message from the fan to Leah, sent with the screenshot.
        $pcols = array_column($pdo->query('PRAGMA table_info(proofs)')->fetchAll(), 'name');
        if (!in_array('fan_note', $pcols, true)) {
            $pdo->exec('ALTER TABLE proofs ADD COLUMN fan_note TEXT');
        }
        // Fan asks support to change a locked username. Shows as a pending task in the admin.
        $pdo->exec('CREATE TABLE IF NOT EXISTS support_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fan_id INTEGER NOT NULL REFERENCES fans(id) ON DELETE CASCADE,
            wanted TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT "pending",
            note TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            resolved_at TEXT
        )');
        $pdo->exec('CREATE INDEX IF NOT EXISTS support_fan ON support_requests(fan_id, status)');
    }
    return $pdo;
}

function setting_raw(PDO $pdo, string $k): ?string {
    $s = $pdo->prepare('SELECT v FROM settings WHERE k = ?');
    $s->execute([$k]);
    $v = $s->fetchColumn();
    return $v === false ? null : (string)$v;
}

function setting(string $k, string $default = ''): string {
    $s = db()->prepare('SELECT v FROM settings WHERE k = ?');
    $s->execute([$k]);
    $v = $s->fetchColumn();
    return $v === false ? $default : (string)$v;
}

function set_setting(string $k, string $v): void {
    db()->prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')->execute([$k, $v]);
}

function e(?string $s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function csrf_token(): string {
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string {
    return '<input type="hidden" name="csrf" value="' . e(csrf_token()) . '">';
}

function csrf_check(): void {
    $sent = $_POST['csrf'] ?? '';
    if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
        http_response_code(400);
        exit('Invalid request. Go back, reload the page and try again.');
    }
}

function is_admin(): bool {
    return !empty($_SESSION['user_id']);
}

function require_admin(): void {
    if (!is_admin()) {
        header('Location: /admin/login.php');
        exit;
    }
}

function redirect(string $url): void {
    header('Location: ' . $url);
    exit;
}

function flash(?string $msg = null): ?string {
    if ($msg !== null) {
        $_SESSION['flash'] = $msg;
        return null;
    }
    $m = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return $m;
}

// Accepts a YouTube link (watch, shorts, youtu.be, embed) or a bare 11-character ID.
function youtube_id(string $input): ?string {
    $input = trim($input);
    if (preg_match('/^[A-Za-z0-9_-]{11}$/', $input)) {
        return $input;
    }
    if (preg_match('~(?:youtube\.com/(?:shorts/|watch\?(?:[^#]*&)?v=|embed/|live/)|youtu\.be/)([A-Za-z0-9_-]{11})~', $input, $m)) {
        return $m[1];
    }
    return null;
}

// Only allow http(s) links for TikTok / Instagram fields.
function clean_url(string $url): ?string {
    $url = trim($url);
    if ($url === '') {
        return null;
    }
    return preg_match('~^https?://~i', $url) ? $url : null;
}

function user_count(): int {
    return (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
}

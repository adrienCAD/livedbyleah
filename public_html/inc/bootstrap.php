<?php
// Shared setup: session, database (SQLite file), helpers, CSRF, auth.
declare(strict_types=1);

const SITE_NAME = 'Lived by Leah';
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

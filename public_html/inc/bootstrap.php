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
    }
    return $pdo;
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

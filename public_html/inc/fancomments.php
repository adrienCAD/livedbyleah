<?php
// Fan comments (v1.7.0): signed-in fans comment on a vlog or a Behind the Scenes post. Leah approves each one before anyone else sees it.
// A post linked to a vlog and that vlog share one thread, so a comment written on either shows on both once approved.
declare(strict_types=1);
require_once __DIR__ . '/ideas.php';   // has_link(), clean_text()

const FC_MAX = 400;
const FC_MAX_PENDING = 5;

// Where a comment belongs. Returns [vlog_id|null, post_id|null] or null when the target does not exist.
function fc_target(int $vlogId, int $postId): ?array {
    if ($postId > 0) {
        $st = db()->prepare('SELECT id, vlog_id FROM posts WHERE id = ? AND published = 1');
        $st->execute([$postId]);
        $p = $st->fetch();
        return $p ? [$p['vlog_id'] ? (int)$p['vlog_id'] : null, (int)$p['id']] : null;
    }
    if ($vlogId > 0) {
        $st = db()->prepare('SELECT id FROM vlogs WHERE id = ?');
        $st->execute([$vlogId]);
        return $st->fetchColumn() ? [$vlogId, null] : null;
    }
    return null;
}

// Saves a new comment as "pending". Returns [ok, message for the fan].
function fc_submit(array $fan, int $vlogId, int $postId, string $raw): array {
    $body = clean_text($raw, FC_MAX);
    $t = fc_target($vlogId, $postId);
    if (!$t) {
        return [false, 'That vlog or post could not be found.'];
    }
    if (mb_strlen($body) < 2) {
        return [false, 'Your comment is empty.'];
    }
    if (has_link($body)) {
        return [false, 'Please leave out links in comments.'];
    }
    if (($_SESSION['fc_t'] ?? 0) > time() - 20) {
        return [false, 'Wait a few seconds before commenting again.'];
    }
    $st = db()->prepare("SELECT COUNT(*) FROM fan_comments WHERE fan_id = ? AND status = 'pending'");
    $st->execute([$fan['id']]);
    if ((int)$st->fetchColumn() >= FC_MAX_PENDING) {
        return [false, 'You already have ' . FC_MAX_PENDING . ' comments waiting for Leah. Give her a little time!'];
    }
    db()->prepare('INSERT INTO fan_comments (fan_id, vlog_id, post_id, body) VALUES (?, ?, ?, ?)')->execute([$fan['id'], $t[0], $t[1], $body]);
    $_SESSION['fc_t'] = time();
    return [true, 'Thanks! Leah will read your comment before it goes live.'];
}

// Approved comments for a vlog thread (oldest-first is not needed: newest first).
function fc_for_vlog(int $vlogId): array {
    $st = db()->prepare("SELECT c.id, c.body, c.created_at, f.username FROM fan_comments c JOIN fans f ON f.id = c.fan_id
        WHERE c.vlog_id = ? AND c.status = 'approved' AND f.suspended = 0 ORDER BY c.id DESC LIMIT 40");
    $st->execute([$vlogId]);
    return $st->fetchAll();
}

// Approved comments on a post that is not linked to a vlog.
function fc_for_post(int $postId): array {
    $st = db()->prepare("SELECT c.id, c.body, c.created_at, f.username FROM fan_comments c JOIN fans f ON f.id = c.fan_id
        WHERE c.post_id = ? AND c.vlog_id IS NULL AND c.status = 'approved' AND f.suspended = 0 ORDER BY c.id DESC LIMIT 40");
    $st->execute([$postId]);
    return $st->fetchAll();
}

function pending_fan_comments(): int {
    return (int)db()->query("SELECT COUNT(*) FROM fan_comments WHERE status = 'pending'")->fetchColumn();
}

// Friendly note for guests and fans above a comment box. Used by the vlog drawer and Behind the Scenes.
function fc_guest_prompt(): string {
    return '<p class="hint cform-guest">Only fan club members can comment. <a href="/fans.php?v=join">Join the fan club</a> (it is free) or <a href="/fans.php">log in</a>.</p>';
}

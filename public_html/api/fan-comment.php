<?php
// JSON endpoint for the comment box in the vlog drawer. POST: csrf, vlog, body.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/fans.php';
require __DIR__ . '/../inc/fancomments.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('{"ok":false,"msg":"POST only"}');
}
$sent = $_POST['csrf'] ?? '';
if (!is_string($sent) || !hash_equals(csrf_token(), $sent)) {
    http_response_code(400);
    exit('{"ok":false,"msg":"Please reload the page and try again."}');
}
$fan = current_fan();
if (!$fan) {
    echo json_encode(['ok' => false, 'msg' => 'Log in to the fan club to comment.']);
    exit;
}
[$ok, $msg] = fc_submit($fan, (int)($_POST['vlog'] ?? 0), 0, (string)($_POST['body'] ?? ''));
echo json_encode(['ok' => $ok, 'msg' => $msg]);

<?php
// Admin only: shows one pending screenshot from data/proofs (that folder is blocked from the web).
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require_admin();

$st = db()->prepare("SELECT file FROM proofs WHERE id = ? AND status = 'pending'");
$st->execute([(int)($_GET['id'] ?? 0)]);
$fn = (string)$st->fetchColumn();
$path = __DIR__ . '/../data/proofs/' . basename($fn);
if ($fn === '' || !is_file($path)) {
    http_response_code(404);
    exit('Not found');
}
$mime = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][strtolower(pathinfo($path, PATHINFO_EXTENSION))] ?? 'application/octet-stream';
header('Content-Type: ' . $mime);
header('Content-Length: ' . filesize($path));
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
readfile($path);

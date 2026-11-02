<?php
// Step 2 of "Continue with Google": Google sends the fan back here with a one-time code.
// Known Google account -> log in. Known email -> link Google to that fan and log in.
// New person -> one short step on /fans.php?v=google (name check + "I am 13 or older"), then the account is created.
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/fans.php';
require __DIR__ . '/../inc/google.php';

$state = (string)($_GET['state'] ?? '');
$want = (string)($_SESSION['g_state'] ?? '');
unset($_SESSION['g_state']);
if (!google_enabled() || $want === '' || !hash_equals($want, $state)) {
    flash('Google sign-in did not work. Please try again.');
    redirect('/fans.php');
}
if (isset($_GET['error'])) {
    flash('Google sign-in was cancelled.');
    redirect('/fans.php');
}
$me = google_profile((string)($_GET['code'] ?? ''));
if (!$me) {
    flash('Google sign-in did not work. Please try again, or use your email.');
    redirect('/fans.php');
}
if (empty($me['email_verified'])) {
    flash('Your Google email is not verified, so we cannot use it. Please sign up with your email.');
    redirect('/fans.php?v=join');
}
$sub = (string)$me['sub'];
$email = strtolower((string)$me['email']);

$st = db()->prepare('SELECT id FROM fans WHERE google_sub = ?');
$st->execute([$sub]);
$id = (int)$st->fetchColumn();
if (!$id) {
    $st = db()->prepare('SELECT id FROM fans WHERE email = ?');
    $st->execute([$email]);
    $id = (int)$st->fetchColumn();
    if ($id) {   // same email: Google has verified it, so link the accounts (and confirm the email)
        db()->prepare('UPDATE fans SET google_sub = ?, confirmed = 1, confirm_hash = NULL WHERE id = ?')->execute([$sub, $id]);
    }
}
if ($id) {
    $sp = db()->prepare('SELECT suspended FROM fans WHERE id = ?');
    $sp->execute([$id]);
    if ((int)$sp->fetchColumn()) {
        flash('This fan account is paused. Please contact Leah if you think that is a mistake.');
        redirect('/fans.php');
    }
    fan_sign_in($id);
    redirect('/fans.php');
}
$_SESSION['g_pending'] = [
    'sub' => $sub, 'email' => $email, 't' => time(),
    'first' => mb_substr(trim((string)($me['given_name'] ?? '')), 0, 20),
    'last' => mb_substr(trim((string)($me['family_name'] ?? '')), 0, 30),
];
redirect('/fans.php?v=google');

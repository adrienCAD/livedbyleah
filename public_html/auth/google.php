<?php
// Step 1 of "Continue with Google": send the fan to Google with a random state (checked on the way back).
declare(strict_types=1);
require __DIR__ . '/../inc/bootstrap.php';
require __DIR__ . '/../inc/fans.php';
require __DIR__ . '/../inc/google.php';

if (!google_enabled()) {
    flash('Google sign-in is not switched on yet. Use your email for now.');
    redirect('/fans.php');
}
$_SESSION['g_state'] = bin2hex(random_bytes(16));
redirect(google_auth_url($_SESSION['g_state']));

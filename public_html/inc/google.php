<?php
// "Continue with Google" for fans (OAuth 2.0 / OpenID Connect, authorization code flow, no library).
// Admin > Settings holds the Client ID and secret from Google Cloud Console. Admins do not use Google sign-in.
declare(strict_types=1);

function google_enabled(): bool {
    return setting('google_client_id') !== '' && setting('google_client_secret') !== '';
}

function google_redirect_uri(): string {
    return site_url() . '/auth/google-callback.php';
}

function google_auth_url(string $state): string {
    return 'https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query([
        'client_id' => setting('google_client_id'),
        'redirect_uri' => google_redirect_uri(),
        'response_type' => 'code',
        'scope' => 'openid email profile',
        'state' => $state,
        'prompt' => 'select_account',
    ]);
}

// Small curl helper. Returns the decoded JSON, or null.
function google_http(string $url, ?array $post = null, ?string $bearer = null): ?array {
    $ch = curl_init($url);
    $headers = ['Accept: application/json'];
    if ($bearer !== null) {
        $headers[] = 'Authorization: Bearer ' . $bearer;
    }
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_HTTPHEADER => $headers]);
    if ($post !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post));
    }
    $body = curl_exec($ch);
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if (!is_string($body) || $code !== 200) {
        return null;
    }
    $j = json_decode($body, true);
    return is_array($j) ? $j : null;
}

// Trades the one-time code for the fan's Google profile: sub, email, email_verified, given_name, family_name.
function google_profile(string $code): ?array {
    $tok = google_http('https://oauth2.googleapis.com/token', [
        'code' => $code,
        'client_id' => setting('google_client_id'),
        'client_secret' => setting('google_client_secret'),
        'redirect_uri' => google_redirect_uri(),
        'grant_type' => 'authorization_code',
    ]);
    if (!$tok || empty($tok['access_token'])) {
        return null;
    }
    $me = google_http('https://openidconnect.googleapis.com/v1/userinfo', null, (string)$tok['access_token']);
    if (!$me || empty($me['sub']) || empty($me['email'])) {
        return null;
    }
    return $me;
}

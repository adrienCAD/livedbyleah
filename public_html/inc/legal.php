<?php
// Shared bits for the Privacy Policy and Terms pages.
declare(strict_types=1);

const LEGAL_UPDATED = 'November 2, 2026';

// How to reach the site owners: the e-mail saved in Admin > Settings, or the support form for signed-in fans.
function legal_contact(): string {
    $m = setting('contact_email');
    if ($m !== '' && filter_var($m, FILTER_VALIDATE_EMAIL)) {
        return '<a href="mailto:' . e($m) . '">' . e($m) . '</a>';
    }
    return 'the support form on your <a href="/fans.php?v=settings">My account</a> page (fan club members), or by leaving a note through <a href="/ideas.php">Ideas for Leah</a>';
}

function legal_footer_links(): string {
    return '<p class="hint legal-links"><a href="/privacy-policy">Privacy Policy</a> &middot; <a href="/terms">Terms</a></p>';
}

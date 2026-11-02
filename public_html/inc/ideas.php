<?php
// Ideas for Leah: helpers shared by /ideas.php and /admin/ideas.php.
declare(strict_types=1);

const IDEA_STATUS = ['pending' => 'Waiting for Leah', 'open' => 'Open', 'chosen' => 'Leah picked it!', 'done' => 'Done, it is live!', 'declined' => 'Not this time'];

// Fans' text must not carry links (spam, and safer for a site with young fans).
function has_link(string $t): bool {
    return (bool)preg_match('~(https?:|www\.|\b[a-z0-9-]+\.(com|net|org|io|ly|gg|me|co|tv|xyz|app)\b)~i', $t);
}

function clean_text(string $raw, int $max): string {
    $t = trim((string)preg_replace('/[ \t]+/u', ' ', str_replace("\r", '', $raw)));
    $t = (string)preg_replace("/\n{3,}/", "\n\n", $t);
    return mb_substr($t, 0, $max);
}

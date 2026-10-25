# HANDOVER.md: rolling session log (newest at the bottom)

Read CLAUDE.md first for permanent architecture. This file records what happened and what is open.

## Status (as of 2026-10-25)
- Live and deployed on livedbyleah.com through update 5 (Update C). `main` on GitHub matches.
- Fonts confirmed working after a hard refresh.
- Leah played a real run, reached Level 5, and then lost. She did not finish (see Feedback).

## Log

### Setup and early fixes
- Deployed to Namecheap. Fixed `.htaccess` (HTTPS redirect commented out until SSL), DB and `inc/` deny rules. A stale `error_log` was from before `inc/` finished uploading, and was not a bug.
- Merged the `leah-surfer-art` branch into `main` (Leah's pixel surfer as the game sprite, certificate font with digits).
- Renamed the "Creative" tab to "Games". Made Writing Process private (admin only).
- Added the vlog drawer (Leah's "why" blurb plus top comments), the YouTube comment fetcher and the Settings page for the API key.

### Update A (`livedbyleah-update3.zip`, merged)
- Instagram links seeded for 11 vlogs (matched by title). Admin-only ⚙ gear to fix and add links. Surfer drawn at 2x, mirrored and animated.

### Update B (`livedbyleah-update4.zip`, merged)
- Site font Shantell Sans (self-hosted). The certificate keeps Myfont.
- Instagram-only and TikTok-only vlogs allowed. 3 Instagram-only vlogs seeded (concert cover, Tower of London, last day in Veracruz).
- Full 5-level game, one timer, public Top 10 hall of fame, certificate with time, 8-bit sound, touch controls.

### Update C (`livedbyleah-update5.zip`, merged and DEPLOYED, 2026-10-24)
- Wave speed physics: nose down speeds up and drifts right, nose up slows and drifts left.
- Waves taller and steeper per level (amp 9/16/24/32, freq .016-.023, gain rebalanced).
- UFO rework: slow follow, 3 s underneath = abduction, leaves after 10 s, 2 hits kill, heart drops (+1 life, max 5).
- Gun in Leah's hand, spurts follow the board direction, bigger spurts with a thick black outline.
- Leah's new trash art and 4-piece gun puzzle (matches her assembled gun). Shells back (4, placeholders).
- Scripted bot test (130 ms reaction) held the board on all levels. UFO, heart and abduction timing were verified by script only.

## Open items
- Paste the TikTok links per vlog via ⚙.
- Un-comment the 3 HTTPS lines in `.htaccess` once SSL is active.
- Replace my placeholder shells with Leah's own art. (The shark and UFO are also code-drawn.)
- Fans tab: sign-up, ranking, under-13 rules, points.
- Campaigns.
- Editor role for Alessandro.
- Confirm `setup.php` is deleted from the server (not confirmed this session).
- Set up the YouTube API key if comments still show nothing (Adrien said he has the key and was told to paste it into admin/settings.php; result not confirmed).

## Feedback to act on
- Leah reached Level 5 for real, then lost. If it feels too hard or too easy, tune `LEVELS[5]` in `assets/js/game.js` (waveGain, gust, instab, gap, ufoFollow). Ask her what killed her (sharks, UFO, wave).

## What failed or dead ends
- WebFetch cannot read TikTok (robots), so TikTok links cannot be auto-matched.
- `git push` was refused until the Claude GitHub App was installed and the repo added with `add_repo`.
- Instagram seed did not run on a fresh DB because the flag was set before vlogs existed. Fixed: seed only when vlogs exist.
- Debug `__lbl.won()` fakes the clock, so score submission fails with "That time was not accepted". It is expected. Test with a real run of 45 s or more.
- Do not use `pkill -f "php -S"` (it kills the shell). Kill by port.
- Zip uploads: if a page looks unchanged, it is browser cache. Hard-refresh.
- The sim is not a human. Real difficulty needs real play.

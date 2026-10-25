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

## Handoff prompt (copy into a fresh session)
Keep this block current. Update it whenever the status above changes.

```
You are continuing work on livedbyleah.com, a vlog hub I (Adrien, architect and admin, new to hosting) am building for my 16-year-old daughter Leah (owner and creator). Read CLAUDE.md and HANDOVER.md in the repo root first. They are the source of truth for architecture, rules and history. Keep replies crisp and simple. I deploy by uploading zips by hand.

1. MAIN GOAL
Keep building the site: a vlog hub (Watch Vlogs, Fans, Games, plus a private Writing Process tab for Leah and admins) and a fan game, "Surf Cleanup". Repo: https://github.com/adrienCAD/livedbyleah (code in public_html/). Hosting: Namecheap shared (PHP 8 + SQLite, no MySQL).

2. DECISIONS AND WHY
- PHP 8 + SQLite, no frameworks: matches the shared host and keeps it simple. Auto-migrations live inside db() in inc/bootstrap.php, so uploading a zip upgrades the database with no manual steps.
- Deploy = zip of public_html excluding data/*, setup.php and .DS_Store, uploaded via cPanel File Manager with Replace. Never touch data/site.sqlite.
- Site font Shantell Sans, self-hosted. The certificate keeps its own font (Myfont-Digits.ttf). Palette: Pollen #FDC921, Mustard #FDD85D, Frosted Blue #99D6EA, Blue Grey #6798C0, Porcelain #FFFDF7, ink #1E3248.
- Writing Process tab is private (admin only). Alessandro (future editor) is excluded for now. Public home is Watch Vlogs.
- Comments: YouTube automatic via the Data API (key stored in Settings, cached 6 h, link comments skipped). TikTok and Instagram comments are pasted by Leah (they cannot be fetched). Names show as first name + last initial.
- A vlog needs at least one link, so Instagram-only and TikTok-only vlogs are allowed. An admin-only gear icon edits links.
- Game: 5 levels, one total timer, public Top 10 hall of fame (server rejects impossible times), 3 lives in total (max 5 with the UFO heart). Level 1 is the beach (4 trash + 4 shells, then a 4-piece gun puzzle). Levels 2-5 are surfing: left/right keep the board level (nose down = faster and right, nose up = slower and left), up = jump, up again = double jump + trick, Space = water gun along the board direction. UFO in levels 3-5: follows slowly, 3 s underneath = abduction, leaves after 10 s, 2 hits kill it and drop a +1 life heart. Touch controls and 8-bit sound.
- Fan rules (under-13 handling, ranking, points) are for a later phase.

3. CURRENT STATE
Done and deployed (through livedbyleah-update5.zip = "Update C", merged to main): vlog drawer and comments, Instagram links, Shantell Sans, the full game with Leah's art, wave physics, UFO and heart, gun in hand, and shells. Fonts confirmed working after a hard refresh. Leah played for real, reached Level 5 and lost.
In progress: none.
Open:
- Paste the TikTok links per vlog via the gear icon.
- Un-comment the 3 HTTPS lines in .htaccess once SSL is active.
- Replace my placeholder shells (and the code-drawn shark and UFO) with Leah's art.
- Fans tab: sign-up, ranking, under-13 rules, points.
- Campaigns.
- Editor role for Alessandro.
- Confirm setup.php is deleted from the server and that the YouTube API key is set in admin/settings.php.
- Get Leah's feedback on what killed her in Level 5 and tune LEVELS[5] if needed.

4. FILES AND LINKS
- Repo https://github.com/adrienCAD/livedbyleah (Claude GitHub App installed, pushes work). CLAUDE.md and HANDOVER.md at the repo root.
- inc/bootstrap.php (DB, migrations, seeds), inc/layout.php (tabs, admin bar), inc/comments.php, api/comments.php, api/scores.php, admin/*, vlogs.php, games.php.
- assets/js/game.js (whole game, LEVELS config, debug hook at /games.php?debug=1 exposing window.__lbl), assets/js/site.js, assets/css/style.css.
- Art: assets/img/surfer.png, assets/img/art/*.png (Leah's trash and gun parts; the shells are mine).
- Secrets (YouTube API key, passwords) are never in the repo or this prompt.

5. WHAT FAILED, DEAD ENDS
- WebFetch cannot read TikTok pages, so do not try to auto-match TikTok links.
- Never run pkill -f "php -S" (kills the shell). Kill by port.
- Debug __lbl.won() fakes the clock, so score submission is rejected. That is expected. Test with a real 45 s+ run.
- If a change does not show up after upload, it is browser cache. Hard-refresh. Bump ?v=N on JS and CSS.
- Pushes were refused until the Claude GitHub App was installed. The site was only tested by scripted bots, so real playtests matter.

6. NEXT STEPS
1. Read CLAUDE.md and HANDOVER.md. Ask me what is next, or pick the first open item I name.
2. Ask me (and Leah) how the Level 5 run went. Then tune difficulty in LEVELS if needed.
3. Build the next update on a new branch (update-d), test locally with php -S and Playwright, delete data/site.sqlite, merge to main, push, build livedbyleah-update6.zip, and add a dated entry to HANDOVER.md.
4. Before the Fans phase, ask me the sign-up, under-13, ranking and points rules in one batch of questions.
```

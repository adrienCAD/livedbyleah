# HANDOVER.md: rolling session log (newest at the bottom)

Read CLAUDE.md first for permanent architecture. This file records what happened and what is open.

## Status (as of 2026-10-25)
- Live and deployed through update 8 (Update F), confirmed working by Adrien. `main` on GitHub matches.
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

### HTTPS redirect (2026-10-25)
- SSL active. Adrien un-commented the 3 redirect lines in `.htaccess` directly on the server (cPanel File Manager). http now redirects to https automatically. The repo `.htaccess` now matches, so future zips keep it on.

### Update D (`livedbyleah-update6.zip`, 2026-10-25, branch `update-d`)
- Fan club: join, email confirmation, login, lost-password reset, username choice, 13+ checkbox. Admin Fans page (username, email, confirm, reset name, remove).
- Hall of fame now ranks by level reached then time, one best result per player, saved on game over and win. Guests get a funny surfer name. Certificate only for a full clear.
- Needs checking on the live host: that PHP `mail()` delivers (sign up with a real email). If not, use Confirm in admin/fans.php and tell me.
- Tested locally (scripted): sign-up, confirm, login, reset, username rules, scores, ranking, admin, migration of old scores.

### Update E (`livedbyleah-update7.zip`, 2026-10-25, branch `update-e`)
- Update D deployed by Adrien and confirmed working (sign-up works), merged to main.
- Fans page, when logged in, now lists the fans with "last seen". The gear opens settings: fan since, this visit, previous login, change username, change password, log out, delete my account.
- Hall of fame rows for fans show "last seen ...". New columns `fans.last_login`, `fans.prev_login` migrate by themselves.
- Tested locally (scripted): migration from the Update D database, login times, list visibility (logged-in only), settings actions, delete, hall of fame.

### Update F (`livedbyleah-update8.zip`, 2026-10-25, branch `update-f`)
- Update E confirmed working by Adrien, merged to main.
- Live fan counter at the top of the Fans tab. Ranking by points (join 10, levels 1+2+3+4+5, screenshots like 5 / follow 10 / comment 10); ties by sign-up order. "How to climb the ranking" box, upload form, "My screenshots" list.
- Admin: Screenshots review page (approve/reject, image deleted after), badge in the menu, points and rank in the Fans list.
- Adrien's answers: like 5, follow 10, comment 10; follow once per platform, like/comment once per vlog; admin badge only (no email).
- Needs checking on the live host: that uploads work (host limit is usually 2 MB; the page shrinks big images), and that `data/proofs/` is created and not reachable from the web.
- Tested locally (scripted): counter, ranking order, level points, upload rules (duplicates, wrong platform, non-image), admin review, image deletion, delete account.
- Added (still Update F, zip rebuilt): sign-up asks for the full last name (admins only see it; public name stays "Mia K."). Username can be chosen once; then locked. Locked fans send a support request (new username + reason); admin approves or declines in Admin > Support (menu badge + dashboard card). Admin can Unlock or Reset a username. Existing fans keep their initial only and get one free change. Default name does not count as a choice.
- Tested locally (scripted, 20 checks): join validation, lock, one pending request, approve/decline, unlock, legacy fallback, delete cascade.
- PRD Draft v4 applied (see the PRD artifact).

### v1.2.1: Leah's Road Trip (branch `update-g`, `livedbyleah-v1.2.1.zip`)
- Version numbering started: 1.2.1 = Road Trip, 1.2.2 = Leah's Blocks (Tetris-style, hand-drawn blocks, hold piece, Top 10 by score, fan points by score tiers, separate certificate). Blocks is NOT built yet; the Games menu shows it as "soon".
- Also in this branch: screenshot form fixes (new thank-you text, Leah-only wording, photo/camera buttons, optional message to Leah, `proofs.fan_note`).
- Road Trip: pseudo-3D driver, neon-green electric Jeep, 5 levels (Houston area, Mexico, Costa Rica, Colorado, France). Timer = battery; checkpoints and green batteries add time; yellow arrows boost. Own hall of fame (`scores.game = 'road'`) and certificate. Art is code-drawn placeholder pixel art, to be replaced with Leah's. No music yet.
- Adrien's reference art (Leah's pixel scene and LEAH logo) is in the chat only; only the LEAH logo is in the repo (`assets/img/leah-logo.png`). The reference scene used the name "Leah's Outrun"; the game is called "Leah's Road Trip" to avoid the Sega trademark.

## Open items
- Paste the TikTok links per vlog via ⚙.
- Replace my placeholder shells with Leah's own art. (The shark and UFO are also code-drawn.)
- Fans: privacy policy and terms page; weekly backup of data/site.sqlite. Confirm screenshot uploads work on the live host after Update F.
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
- Fans, points and screenshot proofs: see CLAUDE.md (Fans section). Built through Update F.

3. CURRENT STATE
Done and deployed (through livedbyleah-update5.zip = "Update C", merged to main; HTTPS redirect on since 2026-10-25): vlog drawer and comments, Instagram links, Shantell Sans, the full game with Leah's art, wave physics, UFO and heart, gun in hand, and shells. Fonts confirmed working after a hard refresh. Leah played for real, reached Level 5 and lost.
Update D (fan club + level-based hall of fame, livedbyleah-update6.zip) is deployed and confirmed working; merged to main. Update E (fans list with last seen, settings gear, delete account, livedbyleah-update7.zip) is deployed and confirmed working; merged to main. In progress: Update F (fan counter, points ranking, screenshot proofs, full last name, one-time username with support requests) is deployed (livedbyleah-update8.zip), confirmed working, and merged to main.
Open:
- Paste the TikTok links per vlog via the gear icon.
- Replace my placeholder shells (and the code-drawn shark and UFO) with Leah's art.
- Fans: privacy policy and terms page; weekly backup of data/site.sqlite. Confirm screenshot uploads work on the live host after Update F.
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
4. Before any new phase (privacy pages, new campaign types), ask me the rules in one batch of questions.
```


v1.2.2 (2026-10-25): Leah's Blocks added (see CLAUDE.md, Game 3), Games hub page with 3 art cards, Leah's Jeep art in Outrun, game name Leah's Outrun for testing, per-game hall of fame (scores.game), blocks fan point tiers. Zip: livedbyleah-v1.2.2.zip. Branch update-g.

v1.2.3 (2026-10-25): gear moved to a 'My account' tab in the left menu for signed-in fans. Zip: livedbyleah-v1.2.3.zip.

v1.2.4 (2026-10-25): menu order Watch Vlogs, Play Games, Fan Fest; My account at the bottom. Zip: livedbyleah-v1.2.4.zip.

v1.2.5 (2026-10-25): fan ranking list moved to the top of Fan Fest for signed-in fans. Zip: livedbyleah-v1.2.5.zip.

v1.2.6 (2026-10-25): hall of fame summary (top 5 per game, medals, champion) on Fan Fest and Play Games; admins can save scores (Leah as LeahPunkStar). Zip: livedbyleah-v1.2.6.zip.

v1.2.7 (2026-10-25): demo fans (add/remove buttons in admin Settings). Zip: livedbyleah-v1.2.7.zip.

v1.2.8 (2026-10-27): Leah's Outrun rebuilt (Costa Rica > Mexico > USA > Canada > ship > France, scenery zones and transitions, cryptids and fun signs, better hills, no green lines on the road, 5 Jeep frames, km hall of fame, stats certificate). Blocks bottom row fixed. Zip: livedbyleah-v1.2.8.zip.
v1.2.9 (2026-10-27): Outrun art pass: Leah's new Jeep views (rear, 1/4, 3/4 by how long the key is held; profile on the cargo ship; front-left view with a thumbs-up on the certificate), finer cars/ship/cryptids, two cryptids per country picked at random and slower (Big Blue Jeans Frog, Dama Blanca, Jackalope, Ogopogo, Loup-Garou, Witch added). Zip: livedbyleah-v1.2.9.zip.
v1.2.10 (2026-10-27): Leah's final Jeep pictures: rear, 1/4 and 3/4 views for steering, profile on the cargo ship, front-left view with a thumbs up on the certificate. Zip: livedbyleah-v1.2.10.zip.
v1.3.0 (2026-10-27): L-Bert, the 4th game: Mumu hops a pyramid across Water, Earth, Air and Fire (3 rounds each), original critters, escape clouds, glide x2 per level, heart power-up, extra lives, score tiers for fan points, certificate for a full clear. Zip: livedbyleah-v1.3.0.zip.
v1.4.0 (2026-10-27): L-Bert becomes Fossil Smash: dinosaur theme with Leah's art (Bagel the brachiosaurus, meteor, 2 fireball frames), levels Triassic, Jurassic, Cretaceous and Meteor Day, fossil stones, new critters (pterodactyl, trilobite, egg-thief raptor) and a T. rex boss, new hub card and certificate. Same hall of fame (old scores kept). Zip: livedbyleah-v1.4.0.zip.

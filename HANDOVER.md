# HANDOVER.md: rolling session log and current state

Read CLAUDE.md first for permanent architecture and rules. This file records the current status, open items, known issues and history. Keep the restart prompt at the bottom current.

## Status (as of 2026-10-28, site version 1.5.0)
- `main` on GitHub = v1.5.0 (last commit 7187d93). Working tree clean. Local `data/site.sqlite` deleted.
- **Confirmed live by Adrien (2026-10-28): all updates through v1.5.0 work** (fan club, emails, screenshot uploads, Surf Cleanup, Outrun with the 30/45 Jeep, Bake Off, Fossil Smash, hall of fame). Nothing is waiting to be deployed.
- The PRD artifact (https://claude.ai/artifact/MbrxkAeARiMFxm95G6LK3D) is at **Draft v7** (site 1.3.0). It does NOT yet cover v1.4.0, v1.4.1 or Bake Off. Adrien was offered "Draft v8" and has not answered. Show the text first, he approves with "go".

## Recent progress (this session, all merged to main)
- **v1.3.0** L-Bert, the 4th game (hopping pyramid, original characters).
- **v1.4.0** renamed **Fossil Smash**: dinosaur theme. Hero Bagel (blue brachiosaurus, Leah's art), Leah's meteor and 2 fireball frames, levels Triassic / Jurassic / Cretaceous / Meteor Day, fossil stones (sand, bone, amber with prints), critters pterodactyl, trilobite, egg-thief raptor, T. rex boss, new hub card and certificate.
- **v1.4.1** Outrun Jeep uses Leah's five pictures: short press = 30 view, hold over 1 s = 45 view (hard turn: steering x1.25, speed capped at 92% of top, grey tire smoke, squeal every 0.42 s).
- **v1.5.0** Leah's Blocks renamed **Bake Off**: Leah's 7 kitchen pieces (I spatula, O flour sack, T mushroom, S sifter, Z chocolate, J jar with tin, L triangle), her mockup layout (gingham, brown frame, checkered board, NEXT / HOLD / SCORE / DISHES / LEVEL, ART BY LEAH), each board cell keeps its own 8x8 slice so cleared rows cut pieces apart, bold pixel font drawn in code, "Dishes" replaces "Lines", certificate OF BAKING with all text in Myfont, new hub card, tap-shorter-than-a-frame fix. Piece PNGs are Leah's own cut files (`assets/bake-off/pieces/`), copied to `public_html/assets/img/bakeoff/`.
- Synced Leah's draft art pushes into the repo (`art/`, `assets/bake-off/`; not deployed).
- Git note: Leah/Adrien push art straight to `main`. If `git push` is rejected, `git fetch`, `git merge origin/main`, push again.

## Open items (priority order)
1. Real playtests by Leah and fans for difficulty: Surf Cleanup Level 5 (what killed her?), Outrun (cryptids, battery), Fossil Smash (4 levels, boss), Bake Off. All balance so far is from scripted tests only.
2. PRD Draft v8 (see Status).
3. Replace placeholder art with Leah's: Surf shells (4), shark, UFO; Outrun scenery, roadside sprites, cryptids, signs, cars, cargo ship; Fossil Smash critters (pterodactyl, trilobite, raptor, T. rex) and hub card (`bert.png` is a screenshot); Bake Off has no placeholders.
4. Privacy policy and terms page.
5. Weekly backup of `data/site.sqlite` (manual download today).
6. Paste TikTok links per vlog via the gear icon.
7. Editor role for Alessandro. Campaigns.
8. Confirm `setup.php` is deleted on the server and the YouTube API key is set in Admin > Settings.
9. Music for the games (none yet).
10. Demo fans: Admin > Settings > Remove demo fans, then Add demo fans, if Fossil Smash / Bake Off demo scores are wanted.

## Known issues and limitations
- Bake Off: a few stray pixels outside a cell's 8x8 (sifter spout, triangle tip) are not drawn on the board. The cream mushroom is low contrast on the pale board (Leah's colours). NEXT shows 1 piece (the old game showed 3). The "next fan point" hint and the HTML score bar are not shown for this game (score, dishes, level are in the canvas panels; only the Sound button remains, bottom right).
- Bake Off naming: internal id stays `blocks`; the API still calls dishes `lines` (stored in `scores.level`). `public_html/assets/img/games/blocks.jpg` is unused (old logo).
- Debug hooks (`?debug=1`) fake results; the server rejects fake scores ("not accepted", HTTP 400 in the console). Expected.
- Fossil Smash and Outrun use code-drawn placeholder art for most critters, scenery and signs.
- No automatic backup, no email alerts for new screenshots or support requests (admin badges only).
- Real difficulty is unknown until people play; do not retune from bot tests alone.
- If a change does not show after upload, it is browser cache: hard-refresh, and bump `?v=N` on JS, CSS and images (current: `blocks.js?v=7`, `bert.js?v=2`, `road.js?v=7`, `style.css?v=13`, `bakeoff.png?v=2`, pieces `?v=2`).

## Working agreements with Adrien
- Replies crisp, simple, short steps (he is new to hosting). Fan-facing text names only Leah, never Adrien.
- When he writes "STOP": ask all remaining questions in one batch and wait for "go". Show text (PRD, big plans) before applying; he approves with "go".
- Subagents: Sonnet 5.5, or Haiku 5.5 for simple tasks. Never Opus or Fable without asking.
- Branch per update (next: `update-t`), test locally (`php -S 127.0.0.1:8099`, Playwright via `NODE_PATH=$(npm root -g)`), delete `data/site.sqlite` and `data/outbox.log`, merge `--no-ff` to `main`, push, zip as `livedbyleah-v<version>.zip`, send the zip, add a dated entry here and update CLAUDE.md and the version list.
- Kill the local server by port only. Never `pkill -f`.

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
- Version numbering started: 1.2.1 = Road Trip, 1.2.2 = Leah's Blocks (Tetris-style, hand-drawn blocks, hold piece, Top 10 by score, fan points by score tiers, separate certificate). Blocks was built right after (v1.2.2).
- Also in this branch: screenshot form fixes (new thank-you text, Leah-only wording, photo/camera buttons, optional message to Leah, `proofs.fan_note`).
- Road Trip: pseudo-3D driver, neon-green electric Jeep, 5 levels (Houston area, Mexico, Costa Rica, Colorado, France). Timer = battery; checkpoints and green batteries add time; yellow arrows boost. Own hall of fame (`scores.game = 'road'`) and certificate. Art is code-drawn placeholder pixel art, to be replaced with Leah's. No music yet.
- Adrien's reference art (Leah's pixel scene and LEAH logo) is in the chat only; only the LEAH logo is in the repo (`assets/img/leah-logo.png`). The reference scene used the name "Leah's Outrun"; the game was first called "Leah's Road Trip", and is now "Leah's Outrun" (v1.2.2).

## What failed or dead ends
- WebFetch cannot read TikTok (robots), so TikTok links cannot be auto-matched.
- `git push` was refused until the Claude GitHub App was installed and the repo added with `add_repo`.
- Instagram seed did not run on a fresh DB because the flag was set before vlogs existed. Fixed: seed only when vlogs exist.
- Surf debug `__lbl.won()` fakes the clock, so score submission fails with "That time was not accepted". Expected. Pass a time under the real elapsed time to test saving.
- Pixel-art cut-outs: BOX downsampling blurs; use NEAREST at the art's native pixel unit. Near-white fills can turn transparent in colour-key cut-outs (Bake Off mushroom, flour sack): prefer Leah's own cut files.
- Do not use `pkill -f "php -S"` (it kills the shell). Kill by port.

## Restart prompt (copy into a fresh session)
Keep this block current.

```
You are continuing work on livedbyleah.com, a vlog hub and fan site I (Adrien, architect and admin, new to hosting) am building for my 16-year-old daughter Leah (owner and creator). Repo: https://github.com/adrienCAD/livedbyleah (`main` is the truth, site code in public_html/). Before anything else, read CLAUDE.md (permanent architecture and rules), HANDOVER.md (status, open items, known issues, working agreements) and README.md in the repo root. Keep replies crisp, simple, short steps. I deploy by uploading zips to Namecheap cPanel by hand.

State: site v1.5.0 on main. Four games, each with its own hall of fame: Surf Cleanup, Leah's Outrun, Bake Off (internal id "blocks"), Fossil Smash (internal id "bert"). Fan club, points, screenshots, support requests are live. All updates through v1.5.0 are deployed and confirmed working on the host (2026-10-28). The PRD artifact (https://claude.ai/artifact/MbrxkAeARiMFxm95G6LK3D) is at Draft v7 and needs Draft v8 (Fossil Smash, Jeep 1.4.1, Bake Off, all confirmed live): show me the text first, I approve with "go".

Rules: PHP 8 + SQLite, no frameworks; PDO prepared statements, CSRF on every POST, e() on output; migrations inside db() in inc/bootstrap.php; never touch data/site.sqlite; cache-bust JS/CSS/images with ?v=N; fan-facing text names only Leah. Use only Sonnet 5.5 (or Haiku 5.5) for subagents, never Opus or Fable without asking. When I write "STOP", ask all your questions in one batch and wait for "go". Branch per update (next: update-t), test locally with php -S 127.0.0.1:8099 and Playwright, delete data/site.sqlite and outbox.log, merge to main, push (if rejected: git fetch, git merge origin/main, push), build livedbyleah-v<version>.zip excluding data/*, setup.php and .DS_Store, send it, then add a dated entry to HANDOVER.md and update CLAUDE.md. Kill servers by port, never pkill -f.

Open items, in order: (1) real playtest feedback and difficulty tuning (Surf Level 5, Outrun, Fossil Smash, Bake Off); (2) PRD Draft v8; (3) replace placeholder art with Leah's (Surf shells, shark, UFO; Outrun scenery, cryptids, signs, cars, ship; Fossil Smash critters and hub card); (4) privacy policy and terms page; (5) weekly backup of data/site.sqlite; (6) TikTok links via the gear icon; (7) editor role for Alessandro, campaigns; (8) confirm setup.php deleted and YouTube API key set; (9) game music.

Start by reading the three docs, then tell me in 3 lines what you understand and ask which open item to take first.
```

## Version log (one line per release)
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
v1.4.1 (2026-10-27): Leah's Outrun: new Jeep pictures for steering (30 left/right for a short press, 45 left/right after holding more than 1 s), hard turn steers faster and costs a little speed, with tire smoke and a squeal. Zip: livedbyleah-v1.4.1.zip.
v1.5.0 (2026-10-27): Leah's Blocks becomes Bake Off: Leah's 7 kitchen pieces (spatula, flour sack, mushroom, sifter, chocolate, jar with tin, triangle), her mockup layout with HOLD, pieces are cut apart by cleared rows, bold pixel font, Dishes instead of Lines, certificate OF BAKING in Myfont. Internal id stays blocks, so scores survive. Zip: livedbyleah-v1.5.0.zip.

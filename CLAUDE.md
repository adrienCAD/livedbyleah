# CLAUDE.md: Lived by Leah (permanent architecture and rules)

Site: livedbyleah.com. A vlog hub for Leah (16, owner and creator), built by her father Adrien (architect and admin).
Adrien is new to hosting. Explain things simply, in short steps. Keep replies crisp.

## People and roles
- Leah: owner. Sees everything, including the private Writing Process tab.
- Adrien: admin and architect.
- Alessandro: future editor. Excluded from private areas for now.
- Visitors: public. Fans: signed-up and logged-in visitors (see Fans section).

## Stack
- Namecheap shared hosting ("Stellar", trial), cPanel. PHP 8 + SQLite via PDO. No MySQL. No build step.
- Repo: https://github.com/adrienCAD/livedbyleah. `main` is the truth. Site code lives in `public_html/`.
- Plain PHP pages, one CSS file, vanilla JS. No frameworks and no npm on the server.
- Fonts are self-hosted in `assets/fonts/`:
  - Shantell Sans (variable woff2, SIL OFL): site-wide.
  - `Myfont-Digits.ttf`: the certificate only. Do not use it elsewhere.
- Palette: Golden Pollen #FDC921, Mustard #FDD85D, Frosted Blue #99D6EA, Blue Grey #6798C0, Porcelain #FFFDF7, ink #1E3248.

## Site map
- Tabs: Watch Vlogs (public home, `/vlogs.php`), Fans (`/fans.php`, sign-up and login), Games (`/games.php`: hub page with 3 art cards (images in `assets/img/games/`): Surf Cleanup `?g=surf`, Leah's Outrun `?g=road` (test name, constant `$ROAD_NAME` in games.php; may become Leah's Road Trip), Leah's Blocks `?g=blocks`).
- Site version is `SITE_VERSION` in `inc/bootstrap.php` (shown under the sidebar menu). 1.2.1 = Road Trip/Outrun, 1.2.2 = Leah's Blocks, 1.2.3 = My account tab. Zips are named `livedbyleah-v<version>.zip` from now on.
- Writing Process (`/writing.php`) is a private tab, shown only when `is_admin()` (Leah or admin).
- `/index.php` redirects to `/vlogs.php`. `/creative.php` is a 301 to `/games.php`.
- Admin (`/admin/`): Dashboard, Vlogs, Writing posts, Comments, Fans, Screenshots, Support, Hall of fame, Settings.
- `setup.php` is for first setup only. It must NOT exist on the server.

## Code rules
- Shared bootstrap in `inc/bootstrap.php`: DB, session, CSRF, helpers. Layout in `inc/layout.php`.
- Always use PDO prepared statements, CSRF tokens on every POST, and `e()` on all output.
- Admin pages call `require_admin()`.
- Never commit secrets. The YouTube API key lives in `settings.youtube_api_key` (set in admin/settings.php). Passwords are never in the repo.
- `data/` (the SQLite file) and `inc/` are denied by `.htaccess`. `data/site.sqlite` is never committed and never overwritten by deploys.
- Cache-bust JS and CSS with `?v=N` in the includes when you change them (browsers cache hard).

## Database and migrations (SQLite, `data/site.sqlite`)
- Tables: users (admins only), fans (public sign-ups), proofs, support_requests, vlogs (title, youtube_id, tiktok_url, instagram_url, why, yt_fetched, sort_order), posts, comments (UNIQUE source+ext_id, hidden flag), settings (key/value), scores (id, name, ms, created_at, pkey, fan_id, level, won, game: surf|road|blocks; pkey is `<player>` for surf and `<player>:<game>` for others, one best row per player per game).
- Migrations live inside `db()` in `inc/bootstrap.php`, with no migration tool:
  - `CREATE TABLE IF NOT EXISTS`.
  - `PRAGMA table_info` then `ALTER TABLE ... ADD COLUMN`.
  - One-time data seeds guarded by `settings` flags (`seed_instagram_1`, `seed_extra_1`), run only when vlogs already exist.
- To add a column or table, add it to `db()` so it auto-migrates on the first page load after upload.
- A vlog needs at least ONE link (YouTube, TikTok or Instagram). `youtube_id` may be empty.
  - YouTube vlogs get a click-to-play embed.
  - Others get a link-out card.

## Comments
- YouTube: automatic via the Data API v3 `commentThreads.list` (curl). Cached in `comments`, refreshed at most every 6 h per vlog. Comments containing links are skipped.
- TikTok and Instagram: Leah pastes her favourites in admin (their APIs and pages cannot be fetched).
- `api/comments.php?id=<vlog id>` returns JSON `{why, youtube[], tiktok[], instagram[]}`.
- `display_name()`: first name + last initial, "@" stripped, "A viewer" fallback.

## Vlog page
- Cards `v-<id>`. Links: YouTube (if present), TikTok, Instagram. Admin-only ⚙ links to `/admin/vlogs.php?edit=<id>`.
- Drawer ("Why I made this + comments"): Leah's blurb plus top comments, opened under the card's row (`assets/js/site.js`).

## Game (`games.php` + `assets/js/game.js`): "Surf Cleanup"
Canvas 640x360, pixel art, no libraries. 5 levels, one total timer, 3 lives across levels 2-5 (max 5 with the heart).
- Level 1: beach. Collect 8 items (4 trash + 4 shells), then go to the watchtower and build the water gun (drag + rotate 4 pieces: tank, barrel, handle, nut).
- Levels 2-5: surf a scrolling wave. Sharks 6/7/8/10 (each must be shot or jumped over).
- Controls: left/right keep the board level (nose down = faster and drifts right, nose up = slower and drifts left; held at the left edge ~1.4 s = wipeout). Up = jump, up again in the air = double jump + trick. Space = water gun (fires along the board direction, no auto-aim). Touch buttons on phones. Sound with mute.
- Level config is in `LEVELS` (amp, freq, waveGain, gust, instab, speed, swim, gap, ufoFollow). Waves grow taller and steeper with the level. Tune difficulty there.
- UFO (levels 3-5): follows slowly. Staying underneath it 3 s abducts Leah (lose a life, timer resets if she leaves). It leaves after 10 s. Two hits kill it, and it drops a heart that circles the screen for ~8 s (catch = +1 life).
- Losing a life restarts the current level (timer keeps running). 0 lives gives one of 8 rotating snarky messages.
- Hall of fame: `api/scores.php`. POST `start` returns a nonce (in session). POST `submit` {nonce, ms, level, won} is rejected if ms is below 45000 (win) or 9000 x (level-1) (not won), or ms > elapsed + 3000, or > 4 h. Level 1 is not saved. Public Top 10. `admin/scores.php` deletes entries.
- Certificate (full clears only) is drawn client-side on a canvas with Myfont, with the player's name and time.
- Art in `assets/img/art/`: Leah's trash (bottle, rings, water, bag) and gun parts (gun, tank, barrel, nut, handle) are hers. The 4 shells (scallop, spiral, clam, conch) are PLACEHOLDERS to replace with Leah's art. Surfer is `assets/img/surfer.png` (59x52, hers). Shark and UFO are code-drawn placeholders.
- Test hook: open `/games.php?debug=1` to get `window.__lbl` (level(n, ufo), puzzle(), S(), info(), won(ms), over(ms), god mode via `__lbl.god = true`). `won()` with no argument fakes the clock, so the server rejects its score. Pass a time under the real elapsed time (for example `won(47500)` after waiting 48 s) to test saving.

## Game 2 (v1.2.1): "Leah's Road Trip" (`games.php?g=road` + `assets/js/road.js`)
Pseudo-3D arcade driver (Outrun style, original art), canvas 320x180 shown at 2x, no libraries. Leah drives a neon-green electric Jeep through 5 levels: Houston area, Mexico, Costa Rica, Colorado, France.
- The timer is the battery: it counts down, 0 = game over (no lives). Each level has its own start time and two checkpoints (+cp seconds). Green batteries on the road give +2 s. Painted yellow arrows give a ~1.4 s boost. Leftover time gives a small carry bonus (25%) to the next level. Crashes (traffic, roadside objects) cost speed.
- Controls: left/right steer, up = gas, down = brake (WASD works). Touch buttons on phones. Sound with mute (WebAudio beeps, no music yet).
- Level config is in `LEVELS` in road.js (len, start, cp, traffic, curve, hill, seed, palette, sprites, background). Roads are generated from a seed, so every run of a level is the same road.
- The Jeep is Leah's art (`assets/img/jeep-back.png`, `jeep-turn.png`, cut out of her sheet). Other art is code-drawn pixel sprites (`SP`, `JEEP`, `CARS`, `bg*` functions), to be replaced with Leah's art. Title logo `assets/img/leah-logo.png` is Leah's LEAH logo.
- Hall of fame: `api/scores.php` with `game=road`. Same rules as surf: rank = cleared all 5, then level reached, then total driving time. Server rejects wins under 120 s and non-wins under 20 s x (level-1). Level 1 is saved too. Fan points: same formula as surf (1 to 5 per level passed, 15 for a full clear), counted per game. Separate certificate for a full clear.
- Test hook: `/games.php?g=road&debug=1` gives `window.__road` (keys, level(n), skipCard(), info(), god(), over(ms), won(ms), start()).

## Game 3 (v1.2.2): "Leah's Blocks" (`games.php?g=blocks` + `assets/js/blocks.js`)
Falling-blocks game with a hand-drawn crayon look (wobbly cells drawn once per colour, no libraries). Canvas 480x600, 10x20 board, 7 shapes from a shuffled bag, hold, 3 next pieces, ghost piece, wall kicks, level up every 10 lines, lock delay 0.5 s.
- Controls: Left/Right arrows (or A/D), Up = rotate, Down = hard drop, C or Shift = hold, Space = soft drop. WASD works. Phones get 5 buttons (`#touch` data-key left/right/rotate/drop/hold).
- Score: 100/300/500/800 x level for 1-4 lines, +1 per soft-drop row, +2 per hard-drop row.
- Hall of fame: `api/scores.php` with `game=blocks`. Score is stored in `scores.ms`, lines in `scores.level`, won=0. Ranked by score, then earlier entry. POST `start` gives a nonce, POST `submit` {game, nonce, score, lines}; rejected if score > 600 x elapsed seconds + 500, lines > 2 x seconds + 4, or over 4 h. Scores under 100 are not saved. Best score per player is kept.
- Fan points (cumulative tiers): 1,000 = 1, 2,500 = 3, 5,000 = 6, 8,000 = 10, 12,000 = 15 (`fan_ranking()` in `inc/fans.php`). Certificate ("OF BLOCK BUILDING", client-side canvas, Myfont) at 12,000.
- In-game title is spelled LEAH'S BLOCKS. The logo image `assets/img/games/blocks.jpg` (Leah's art) has a doubled L; it is only used on the hub card and start screen.
- Test hook: `/games.php?g=blocks&debug=1` gives `window.__blocks` (info(), start(), end(score, lines), setGrid(rows), setPiece(type)).

## Fans (built in Updates D, E and F)
- Code: `fans.php` (all views), `inc/fans.php` (helpers), `admin/fans.php`. Fans live in the `fans` table, separate from admins. Session key `fan_id`.
- Visitors see "you are not a fan yet" with Join and Log in. Join: first name, full last name (stored in `fans.last_name`, visible to admins only; older fans have only `last_initial`), email, password (min 10, max 64; the page shows a tip like Purple-Wave-Tacos-42), and a required "I am 13 or older" checkbox. No birth date is stored.
- Email must be confirmed (link by email) before login. "I lost my password" sends a 1 hour reset link; using it also confirms the email. Login locks an account for 5 minutes after 8 wrong tries.
- Email is sent with PHP `mail()` from noreply@livedbyleah.com. On localhost it is written to `data/outbox.log` instead. If mail does not arrive on the host, an admin can press Confirm in `/admin/fans.php`.
- Default username = first name + last initial ("Mia K.", numbered if taken). Fans can pick a nickname in Settings (3-20 chars, letters/numbers/space/. _ -) ONCE: the first save sets `fans.username_locked = 1` (the auto default does not count). After that a fan can only send a support request (`support_requests`: wanted name + reason, one pending at a time). Admin sees it in `admin/support.php` (Support badge in the menu and a dashboard card) and approves (sets the name) or declines with a note; the fan sees the status in Settings. Admin can also Unlock username or Reset username (back to default, unlocked) on the Fans page. Admin sees username and email, can reset a username to the default, confirm by hand, or remove a fan (their hall of fame entry goes too).
- Games: signed-in fans are saved under their username. Visitors who are not signed in get a funny placeholder name ("GnarlySurferDude", no spaces or numbers) for the session and a prompt to join.
- Hall of fame: one best result per player. Saved on game over (level 2 or higher) and on a win. Rank = cleared all 5 first, then highest level reached, then fastest time. Shows "Level N" or "Cleared all 5". Only a full clear shows the certificate (it uses the player's name). Older scores were migrated as level 5, cleared.
- Fans page for a logged-in fan (Update E): the list of fans (public username + "last seen", most recent first; visible to logged-in fans only, never emails) and a "My account" tab in the left menu (signed-in fans only, `/fans.php?v=settings`; replaces the old gear). My account: account info (fan since, this visit, previous login), change username, change password, log out, and "Delete my account" (needs the password; removes the fan and their hall of fame entry).
- Login time: `fans.last_login` and `fans.prev_login` (UTC), set at each successful login. Dates in settings are shown in the visitor's own time zone by a small script. The public hall of fame shows "last seen ..." (relative, no exact time) for fans.
- Points and ranking (Update F): the Fans tab starts with a live counter of confirmed fans (everyone sees it; `api/fans-count.php`, refreshed every 20 s by `assets/js/fans.js`). Rank = points, ties go to the earlier sign-up, so at the start the order is sign-up order. Points = 10 for joining + game levels passed (level N = N points, each once, 15 for a full clear; worked out from the fan's best score, `fan_ranking()` in `inc/fans.php`) + approved screenshots (like 5, follow/subscribe 10, comment 10).
- Screenshots: a logged-in fan picks platform, action and vlog (not for follows) and uploads a JPG/PNG/WebP (the browser shrinks big ones; server limit 5 MB, host default 2 MB). Stored in `data/proofs/` under random names (web-blocked), shown only to admins via `admin/proof-image.php`. Rules: follows once per platform; likes and comments once per vlog per platform; max 10 waiting per fan. The fan can add an optional message to Leah (200 chars, `proofs.fan_note`), shown in `admin/proofs.php` and kept after review. On phones two buttons fill the file field: Choose from photos / Take a photo (`assets/js/fans.js`). Fan-facing texts name only Leah, never Adrien. Admin approves or rejects (optional reason) in `admin/proofs.php`; the image is deleted after review and the points come from the `proofs` table. Admin sees a "Screenshots (N)" badge in the admin menu and a dashboard card; no email alerts.
- Still to do: privacy policy and terms page; weekly backup of `data/site.sqlite`.

## Deploy routine (Adrien does this by hand)
1. Build a zip of `public_html` EXCLUDING `data/*`, `setup.php` and `.DS_Store`:
   `cd public_html && zip -qr /tmp/livedbyleah-updateN.zip . -x 'data/*' setup.php '*.DS_Store'`
2. Adrien uploads the zip into `public_html` via cPanel File Manager, extracts it, and chooses Replace.
3. The DB migrates itself on the first page load. Then hard-refresh (Cmd+Shift+R).
Never overwrite or delete `data/site.sqlite` (it holds Leah's content, comments and scores).

## Git workflow
- Branch per update, then merge to `main` and push (the Claude GitHub App is installed on the repo).
- Commit messages end with the attribution lines the session gives. Do not push secrets.
- When working locally: run `php -S 127.0.0.1:<port>` from `public_html/`. Kill by port (`lsof -ti tcp:<port> | xargs kill`), never `pkill -f php`.
- Delete the local `data/site.sqlite` before committing or zipping.

## Known constraints
- TikTok blocks fetching, so TikTok links cannot be matched automatically. They are pasted via the ⚙ icon.
- `.htaccess` has the HTTPS redirect ON (SSL active, confirmed 2026-10-25). Do not comment it out.

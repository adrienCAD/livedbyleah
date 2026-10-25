# CLAUDE.md: Lived by Leah (permanent architecture and rules)

Site: livedbyleah.com. A vlog hub for Leah (16, owner and creator), built by her father Adrien (architect and admin).
Adrien is new to hosting. Explain things simply, in short steps. Keep replies crisp.

## People and roles
- Leah: owner. Sees everything, including the private Writing Process tab.
- Adrien: admin and architect.
- Alessandro: future editor. Excluded from private areas for now.
- Visitors: public. Fans (sign-up) are a later phase.

## Stack
- Namecheap shared hosting ("Stellar", trial), cPanel. PHP 8 + SQLite via PDO. No MySQL. No build step.
- Repo: https://github.com/adrienCAD/livedbyleah. `main` is the truth. Site code lives in `public_html/`.
- Plain PHP pages, one CSS file, vanilla JS. No frameworks and no npm on the server.
- Fonts are self-hosted in `assets/fonts/`:
  - Shantell Sans (variable woff2, SIL OFL): site-wide.
  - `Myfont-Digits.ttf`: the certificate only. Do not use it elsewhere.
- Palette: Golden Pollen #FDC921, Mustard #FDD85D, Frosted Blue #99D6EA, Blue Grey #6798C0, Porcelain #FFFDF7, ink #1E3248.

## Site map
- Tabs: Watch Vlogs (public home, `/vlogs.php`), Fans (`/fans.php`, sign-up and login), Games (`/games.php`).
- Writing Process (`/writing.php`) is a private tab, shown only when `is_admin()` (Leah or admin).
- `/index.php` redirects to `/vlogs.php`. `/creative.php` is a 301 to `/games.php`.
- Admin (`/admin/`): Dashboard, Vlogs, Writing posts, Comments, Fans, Hall of fame, Settings.
- `setup.php` is for first setup only. It must NOT exist on the server.

## Code rules
- Shared bootstrap in `inc/bootstrap.php`: DB, session, CSRF, helpers. Layout in `inc/layout.php`.
- Always use PDO prepared statements, CSRF tokens on every POST, and `e()` on all output.
- Admin pages call `require_admin()`.
- Never commit secrets. The YouTube API key lives in `settings.youtube_api_key` (set in admin/settings.php). Passwords are never in the repo.
- `data/` (the SQLite file) and `inc/` are denied by `.htaccess`. `data/site.sqlite` is never committed and never overwritten by deploys.
- Cache-bust JS and CSS with `?v=N` in the includes when you change them (browsers cache hard).

## Database and migrations (SQLite, `data/site.sqlite`)
- Tables: users (admins only), fans (public sign-ups), vlogs (title, youtube_id, tiktok_url, instagram_url, why, yt_fetched, sort_order), posts, comments (UNIQUE source+ext_id, hidden flag), settings (key/value), scores (id, name, ms, created_at, pkey, fan_id, level, won).
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

## Fans (built in Update D)
- Code: `fans.php` (all views), `inc/fans.php` (helpers), `admin/fans.php`. Fans live in the `fans` table, separate from admins. Session key `fan_id`.
- Visitors see "you are not a fan yet" with Join and Log in. Join: first name, first letter of last name, email, password (min 10, max 64; the page shows a tip like Purple-Wave-Tacos-42), and a required "I am 13 or older" checkbox. No birth date is stored.
- Email must be confirmed (link by email) before login. "I lost my password" sends a 1 hour reset link; using it also confirms the email. Login locks an account for 5 minutes after 8 wrong tries.
- Email is sent with PHP `mail()` from noreply@livedbyleah.com. On localhost it is written to `data/outbox.log` instead. If mail does not arrive on the host, an admin can press Confirm in `/admin/fans.php`.
- Default username = first name + last initial ("Mia K.", numbered if taken). Fans can pick a nickname on the Fans page (3-20 chars, letters/numbers/space/. _ -). Admin sees username and email, can reset a username to the default, confirm by hand, or remove a fan (their hall of fame entry goes too).
- Games: signed-in fans are saved under their username. Visitors who are not signed in get a funny placeholder name ("Gnarly Surfer Dude 42") for the session and a prompt to join.
- Hall of fame: one best result per player. Saved on game over (level 2 or higher) and on a win. Rank = cleared all 5 first, then highest level reached, then fastest time. Shows "Level N" or "Cleared all 5". Only a full clear shows the certificate (it uses the player's name). Older scores were migrated as level 5, cleared.
- Still to do: points and campaigns.

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

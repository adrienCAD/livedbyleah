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
- Left menu, in order: Watch Vlogs (public home, `/vlogs.php`), Play Games (`/games.php`), Fan Fest (`/fans.php`, sign-up and login), then Writing Process (admins). "My account" sits at the bottom of the menu for signed-in fans only. Games page (`/games.php`: hub page with 4 art cards (images in `assets/img/games/`): Surf Cleanup `?g=surf`, Leah's Outrun `?g=road` (constant `$ROAD_NAME` in games.php), Leah's Blocks `?g=blocks`, Fossil Smash `?g=bert`).
- Site version is `SITE_VERSION` in `inc/bootstrap.php` (shown under the sidebar menu). 1.2.1 = Road Trip/Outrun, 1.2.2 = Leah's Blocks, 1.2.3 = My account tab, 1.2.4 = menu order and names (Play Games, Fan Fest), 1.2.5 = fan ranking moved to the top of Fan Fest (right under the fan's own rank card), 1.2.6 = hall of fame summary, 1.2.7 = demo fans, 1.2.8 = Outrun rebuild (countries, zones, cryptids, km ranking) + Blocks bottom row fix, 1.2.9 = Outrun art pass (Leah's new Jeep views, finer cars/ship/cryptids, 2 random cryptids per country), 1.2.10 = Leah's final Jeep pictures (rear, 1/4, 3/4, profile, certificate), 1.3.0 = L-Bert (4th game), 1.4.0 = L-Bert renamed Fossil Smash (dinosaur theme, Bagel, Leah's meteor and fireball art), 1.4.1 = Outrun Jeep: Leah's new 30/45 steering pictures, hard turn after 1 s with smoke and squeal. Zips are named `livedbyleah-v<version>.zip` from now on.
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
- Tables: users (admins only), fans (public sign-ups), proofs, support_requests, vlogs (title, youtube_id, tiktok_url, instagram_url, why, yt_fetched, sort_order), posts, comments (UNIQUE source+ext_id, hidden flag), settings (key/value), scores (id, name, ms, created_at, pkey, fan_id, level, won, km, game: surf|road|blocks|bert; pkey is `<player>` for surf and `<player>:<game>` for others, one best row per player per game).
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

## Game 2 (v1.2.1, rebuilt in v1.2.8): "Leah's Outrun" (`games.php?g=road` + `assets/js/road.js`)
Pseudo-3D arcade driver (Outrun style, original art), canvas 320x180 shown at 2x, no libraries. Leah drives her neon-green electric Jeep through 5 levels: Costa Rica, Mexico, USA (Houston to New York), Canada, France (finish in Paris). Between Canada and France a ~6 s cargo ship scene plays (battery paused, any key or tap skips).
- Each level has scenery zones (`Z` and `LEVELS[].zones` in road.js) that blend into each other (sky, grass, road colours, background layer, roadside sprites). Costa Rica: beach, volcano road, rainforest. Mexico: jungle, beach, sierra, pyramids, desert. USA: Houston, desert, Colorado, forest, New York (Lady Liberty). Canada: river valley, maple hills, lakes, snowy peaks. France: Normandy coast, countryside, lavender, forest, Paris (Eiffel Tower). Landmarks (`MARK`) are their own layer so they stay in view. The finish line is a border gate with the next country's welcome.
- Hills: two slow sine waves per level (`hill` amplitude), flatter in city zones (`flat: 1`). The Jeep lifts a little over crests. Road strips fill exactly their own rows (fixes the green lines on the road).
- Jeep (v1.4.1): 5 frames, all Leah's art, chosen by how long left/right is held: straight = view from behind (`jeep-rear.png`); a press shorter than 1 s shows her 30 view (`jeep-l30.png` / `jeep-r30.png`); holding more than 1 s (`HARD_T`) shows her 45 view (`jeep-l45.png` / `jeep-r45.png`), a hard turn; release returns to the rear view (0.1 s grace). Hard turn: steering is 25% faster, speed is capped at 92% of top speed (a boost overrides it), grey tire smoke puffs come off the rear wheels (`puffs`) and a short tire squeal plays every 0.42 s (`SFX.skid`). The same pixel scale is used for all five, so the 45 views are wider (about 92 px vs 63 px). The frames were cut out of her white-background JPGs (white outside and in the open windows made transparent). Left and right are separate pictures (not mirrors), and her 30 left and 30 right are not equally turned. Other Jeep art: `jeep-side.png` (profile on the cargo ship, flipped to face right), `jeep-cert.png` (front-left view with Leah giving a thumbs up, on the certificate, bottom left, with Bigfoot on the right), scaled to about 56 px high.
- Cryptids (v1.2.9): two per country, `LEVELS[].cr` is the pair; each of the 2 crossings per level picks one at random with `Math.random()` (so the same cryptid can come twice). Costa Rica: giant sloth, Big Blue Jeans Frog (hops). Mexico: Dama Blanca (translucent ghost), chupacabra. USA: Bigfoot, jackalope (hops). Canada: Ogopogo (lake serpent), wendigo. France: loup-garou (never 'werewolf'), witch (flies on a broom). They cross slowly (`CRY[k].speed` 0.4 to 0.78) so they can be seen and are harder to avoid. Each crossing has its own yellow warning sign 45 segments before (`CRY[k].warn`). Hitting one = crash + 3 s battery. Fun signs per country in `LEVELS[].signs`. All art is code-drawn placeholder at 3x detail (`mkHi()`, `PG/EL/LN/RR` helpers); cars (sedan, hatch, pickup, van) and the cargo ship (`makeShip()`) use the same finer style.
- The timer is the battery: 0 = game over. Start time and two checkpoints (+cp s) per level; green batteries +2 s; yellow arrows boost; 25% of leftover time carries over. Levels are ~20% longer than v1.2.1.
- Hall of fame: ranked by km (`scores.km`): real-ish trip distance (Costa Rica 600, Mexico 2,000, USA 2,700, Canada 1,500, France 900 = 7,700 km), +500 km per new level reached, +2,000 km for reaching Paris; ties by time. The client sends the base km; `api/scores.php` checks it fits the level and adds the bonuses. Old road results were cleared once (`road_reset_128`). Fan points unchanged (level-based).
- Certificate (full clear): trip stats, cryptid report (only the cryptids actually seen), 4 random goofy stats from `goofyPool()`, and the front-left Jeep with Leah giving a thumbs up.
- Test hook: `/games.php?g=road&debug=1` gives `window.__road` (keys, level(n), jump(frac), skipCard(), info() incl. zone/km/stats/events/cry, god(), ship(), cert(), over(ms), won(ms), start(), setCry(type), sight(type, n), CRY, CARS, JEEP()).

## Game 3 (v1.2.2): "Leah's Blocks" (`games.php?g=blocks` + `assets/js/blocks.js`)
Falling-blocks game with a hand-drawn crayon look (wobbly cells drawn once per colour, no libraries). Canvas 480x600 (was 560 in the page before v1.2.8, which hid the bottom row), 10x20 board, 7 shapes from a shuffled bag, hold, 3 next pieces, ghost piece, wall kicks, level up every 10 lines, lock delay 0.5 s.
- Controls: Left/Right arrows (or A/D), Up = rotate, Down = hard drop, C or Shift = hold, Space = soft drop. WASD works. Phones get 5 buttons (`#touch` data-key left/right/rotate/drop/hold).
- Score: 100/300/500/800 x level for 1-4 lines, +1 per soft-drop row, +2 per hard-drop row.
- Hall of fame: `api/scores.php` with `game=blocks`. Score is stored in `scores.ms`, lines in `scores.level`, won=0. Ranked by score, then earlier entry. POST `start` gives a nonce, POST `submit` {game, nonce, score, lines}; rejected if score > 600 x elapsed seconds + 500, lines > 2 x seconds + 4, or over 4 h. Scores under 100 are not saved. Best score per player is kept.
- Fan points (cumulative tiers): 1,000 = 1, 2,500 = 3, 5,000 = 6, 8,000 = 10, 12,000 = 15 (`fan_ranking()` in `inc/fans.php`). Certificate ("OF BLOCK BUILDING", client-side canvas, Myfont) at 12,000.
- In-game title is spelled LEAH'S BLOCKS. The logo image `assets/img/games/blocks.jpg` (Leah's art) has a doubled L; it is only used on the hub card and start screen.
- Test hook: `/games.php?g=blocks&debug=1` gives `window.__blocks` (info(), start(), end(score, lines), setGrid(rows), setPiece(type)).

## Game 4 (v1.3.0 as L-Bert, renamed v1.4.0): "Fossil Smash" (`games.php?g=bert` + `assets/js/bert.js`)
Leah's take on the hopping-pyramid arcade game (she loves it), dinosaur themed, with original characters only. The internal id stays `bert` (URL, `scores.game`, `window.__bert`) so old scores survive the rename. Canvas 320x240 shown at 2x, no libraries.
- Hero: **Bagel**, a little blue brachiosaurus drawn by Leah (`assets/img/fossil/bagel.png`, front view, 16x27 px). `bagel_back.png` is the back view made from it (eyes removed, extra spots); left views are mirrors. Hop = small stretch, landing = squash plus dust. Glide = Bagel holds a big fern leaf (drawn in code). Never draw Momo or any arcade character.
- Leah's other art: `meteor.png` (rotated in 90 degree steps to tumble), `fire1.png` and `fire2.png` (fireball frames, alternated). Cut from her pixel-art sheet (10.24 px blocks, nearest-neighbour sampled at 200x200). Code-drawn critters (placeholders, 1 px outline via `spr()`): pterodactyl (2 wing frames), trilobite, egg-thief raptor, T. rex boss.
- Pyramid of 7 rows (28 stones) of fossil stones. Bagel hops diagonally; each landing stomps (smashes) the stone: sand, then bone, then amber, with a fossil print (bone, ammonite or fern) on finished stones. Round 1: one hop per stone; round 2: two hops; round 3: hopping a finished stone undoes it. All stones finished = round clear (+1,000 x level, +100 per unused cloud).
- 4 levels, 3 rounds each (about 2 min per level): Triassic (meteors, fireball), Jurassic (raptor, trilobite, meteor), Cretaceous (pterodactyls, fireball), Meteor Day (meteors, fireball). Last round of Meteor Day has the boss T. rex. Colours per level in `LEVELS[].tops` (start, middle, finished).
- Critter kinds (`MON`): bounce (meteor: hops down, falls off the bottom), chase (fireball like Coily, raptor, T. rex), undo (trilobite un-smashes stones; touching it catches it, +300), fly (pterodactyl: wanders, only hurts when swooping low, drawn higher when safe). Only 1 chaser at a time (2 in the boss round).
- Escape clouds: 2 per round at the sides. Hop on one to fly back to the top; a chaser that follows jumps off (+500, the T. rex +3,000).
- Lives: 3, max 5. Extra life at 5,000, 15,000 and 30,000 points, and from the heart power-up (appears now and then for 8 s, +1 life, +100). Hopping off the pyramid or touching a critter costs a life.
- Glide: Space (or G/Shift, or the Glide button) arms a glide; the next hop goes 2 stones and is safe from critters. 2 glides per level, shared by its 3 rounds.
- Controls: arrows turned 45 degrees like the arcade (left = up-left, up = up-right, right = down-right, down = down-left), or Q/E/Z/C, numpad 7/9/1/3. Phones: tap beside Bagel, or 4 diagonal buttons + Glide.
- Score: 15 or 25 per stomp step, round bonus, catches, lures. Hall of fame `game=bert`: score in `scores.ms`, age level reached (1-4) in `scores.level` (names in `BERT_ELEMENTS`), `won` = cleared all 4; ranked by score. Server check: score <= 400 x seconds + 5,000, level 1-4, a win needs 100 s or more. Scores under 100 are not saved.
- Fan points (score tiers, like Blocks): 2,000 = 1, 5,000 = 3, 10,000 = 6, 20,000 = 10, 35,000 = 15 (`fan_ranking()`). Certificate ("OF FOSSIL SMASHING") only for a full clear: hop stats, critter report, 4 random goofy stats (`goofyPool()`) and Bagel's picture.
- Hub card image `assets/img/games/bert.png` is a game screenshot with the title (placeholder until Leah's art).
- Test hook: `/games.php?g=bert&debug=1` gives `window.__bert` (info(), start(), level(n, round), skipCard(), god(), hop(dir), paintAll(leave), clear(), lives(n), spawn(type: meteor|fireball|raptor|trilo|ptero|trex), place(type, r, c), heart(r, c), over(), won(), stats(), sprites()).

## Hall of fame summary (v1.2.6)
- `hof_summary()` and `hof_render()` in `inc/fans.php`; shown to everyone on Fan Fest (`fans.php`, visitors and fans) and on the Play Games hub. Top 5 per game (all 4 games) with medals for #1 to #3, result, the viewer's own rank per game, a Play button, and an overall champion (5 points for 1st down to 1 for 5th in each game, summed per player).
- Admins can play: `player()` in `inc/fans.php` saves an admin's scores under the admin username (pkey `u<user id>`). Leah plays as admin "LeahPunkStar"; her entries get a star, and "Leah's record" shows under a game when she is outside its top 5 (name from setting `leah_name`, default LeahPunkStar).

## Demo fans (v1.2.7)
- Day-one filler. Admin > Settings > "Demo fans" has Add demo fans (12 fake fans with scores in the games, including Fossil Smash, `fans.demo = 1`, fake `@demo.invalid` emails, random passwords, so they cannot log in) and Remove all demo fans (deletes them plus their scores; real fans untouched). Code: `demo_add()` / `demo_remove()` in `inc/fans.php`. Demo fans count in the fan counter and ranking and show "(demo)" in admin/fans.php. Nothing is added automatically.

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

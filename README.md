# Lived by Leah (livedbyleah.com)

Vlog hub and fan club for Leah (16, owner and creator), built by her father Adrien (architect and admin). Site version: **1.5.0** (`SITE_VERSION` in `public_html/inc/bootstrap.php`).

**What is on the site**
- **Watch Vlogs** (home): Leah's vlogs with a drawer for her "why I made this" note and top comments (YouTube automatic, TikTok and Instagram pasted by Leah).
- **Play Games**: four games with Leah's art and one hall of fame per game: Surf Cleanup, Leah's Outrun, Bake Off, Fossil Smash.
- **Fan Fest**: fan sign-up and login (email confirmation), live fan counter, points and ranking, screenshot proofs, username requests, hall of fame summary.
- **Writing Process**: private tab for Leah and admins.
- **Admin** (`/admin/`): vlogs, writing posts, comments, fans, screenshots, support requests, hall of fame, settings (YouTube key, demo fans).

**Stack:** PHP 8 + SQLite (one file, no setup), plain PHP pages, one CSS file, vanilla JS, no frameworks, no build step. Namecheap shared hosting (cPanel). Everything the site serves is in `public_html/`.

**Docs:** `CLAUDE.md` = permanent architecture and rules (read first). `HANDOVER.md` = current status, open items, known issues, history and a restart prompt.

**Repo layout:** `public_html/` (the site) · `art/` and `assets/bake-off/` (Leah's drafts and cut pieces, NOT deployed) · `CLAUDE.md`, `HANDOVER.md`, `README.md`.

## Deploy (Adrien does this by hand)
1. Build the zip: `cd public_html && zip -qr /tmp/livedbyleah-v<version>.zip . -x 'data/*' setup.php '*.DS_Store'`
2. cPanel > File Manager > `public_html`: upload the zip, Extract, choose Replace.
3. The database migrates itself on the first page load. Hard-refresh (Cmd+Shift+R).
Never overwrite or delete `data/site.sqlite` (Leah's content, comments, fans and scores). `setup.php` must NOT exist on the server.

## First-time setup
Upload the contents of `public_html/` (including the hidden `.htaccess` files), open `/setup.php` once to create Leah's admin login, then delete `setup.php` from the server. HTTPS redirect is already ON in `.htaccess`.

## YouTube comments
Admin > Settings: paste a YouTube Data API v3 key. Comments are cached 6 hours per vlog, links are skipped, names show as first name + last initial, any comment can be hidden in Admin > Comments.

## Run locally
    cd public_html && php -S 127.0.0.1:8099
Open http://127.0.0.1:8099/. Stop it with `lsof -ti tcp:8099 | xargs kill` (never `pkill -f php`). Delete `public_html/data/site.sqlite` and `data/outbox.log` before committing or zipping. Test hooks: add `&debug=1` to a game URL (see CLAUDE.md).

## Backups
Download `data/site.sqlite` from File Manager weekly (no automatic backup yet).

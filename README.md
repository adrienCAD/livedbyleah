# Lived by Leah (livedbyleah.com)

Vlog hub for Leah: Watch Vlogs (home), Fans (coming soon), Games (surf cleanup), and a private Writing Process tab for Leah/admins. Each vlog has a drawer with Leah's note and top comments (YouTube automatic, TikTok/Instagram picked by Leah).
PHP 8 + SQLite (a single file, no database setup). Everything the site serves lives in `public_html/`.

## Deploy to Namecheap (first time)
1. In cPanel open **File Manager** and go to the `public_html` folder of livedbyleah.com.
2. Upload the *contents* of this repo's `public_html/` folder, including the hidden `.htaccess` files (turn on "Show hidden files" in File Manager). `data/` and `inc/` must keep their `.htaccess`.
3. Visit https://livedbyleah.com/setup.php. Create Leah's admin login. The 14 vlogs are loaded automatically.
4. **Delete `setup.php` from the server.**
5. Log in at https://livedbyleah.com/admin/login.php.
6. After the free SSL is installed, edit `.htaccess` and remove the `#` on the 3 HTTPS redirect lines.

## YouTube comments
Admin > Settings: paste a YouTube Data API v3 key. Comments are cached for 6 hours per vlog; links are skipped; names show as first name + last initial; any comment can be hidden in Admin > Comments.

## Updating later
Re-upload only the changed files. Never overwrite `data/site.sqlite` (it holds the posts and vlogs added through the admin).
Back up `data/site.sqlite` weekly (download it from File Manager).

## Run locally (Mac)
    cd public_html && php -S 127.0.0.1:8000
then open http://127.0.0.1:8000/setup.php

## Next phases
Fans sign-up and ranking, campaigns, editor role, Leah's own pixel art.

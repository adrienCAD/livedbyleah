# Handoff prompt: paste this into a fresh session

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
- Repo https://github.com/adrienCAD/livedbyleah (Claude GitHub App installed, pushes work). CLAUDE.md, HANDOVER.md, HANDOFF.md at the repo root.
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

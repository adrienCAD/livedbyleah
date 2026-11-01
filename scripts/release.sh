#!/usr/bin/env bash
# Build the deploy zip for cPanel. The zip is made from the pushed commit (not your
# working folder), so what you upload is exactly what is on GitHub main.
# Usage:  ./scripts/release.sh [output-folder]      (default: ~/Downloads)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

OUT="${1:-$HOME/Downloads}"; mkdir -p "$OUT"; OUT="$(cd "$OUT" && pwd)"

git fetch -q origin main || { echo "STOP: cannot reach GitHub, so I cannot verify the push."; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || { echo "STOP: you are not on the main branch."; exit 1; }
[ -z "$(git status --porcelain -- public_html)" ] || { echo "STOP: uncommitted changes in public_html. Commit and push first."; exit 1; }
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "STOP: local main and GitHub main differ. Push (or pull) first."; exit 1; }

VERSION="$(sed -n "s/^const SITE_VERSION = '\([^']*\)'.*/\1/p" public_html/inc/bootstrap.php)"
[ -n "$VERSION" ] || { echo "STOP: could not read SITE_VERSION."; exit 1; }
SHORT="$(git rev-parse --short HEAD)"
ZIP="$OUT/livedbyleah-v$VERSION-$SHORT.zip"

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
git archive HEAD:public_html | tar -x -C "$TMP"        # tracked files of that commit only
rm -rf "$TMP/data" "$TMP/setup.php"                     # never ship live data or setup.php
find "$TMP" -name .DS_Store -delete
printf 'version: %s\ncommit: %s\nbuilt: %s\n' "$VERSION" "$(git rev-parse HEAD)" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$TMP/BUILD.txt"

rm -f "$ZIP"; (cd "$TMP" && zip -qr "$ZIP" .)
echo "OK  $ZIP"
echo "    version $VERSION, commit $SHORT. After extracting on cPanel, BUILD.txt in public_html shows this."

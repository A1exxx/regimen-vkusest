#!/usr/bin/env bash
# Ships the site to the Contabo box. Run from the repo root in Git Bash:
#
#   bash tools/deploy-vps.sh
#
# Packs index.html + assets, replaces /var/www/regimen atomically-ish, and
# checks the result over HTTP before declaring success. nginx is not reloaded:
# static files are read per request, so there is nothing to reload.

set -euo pipefail

HOST="${REGIMEN_HOST:-root@84.247.148.135}"
KEY="${REGIMEN_KEY:-$HOME/.ssh/id_ed25519}"
IP="${HOST##*@}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"
[ -f index.html ] || { echo "index.html not found in $ROOT" >&2; exit 1; }

echo "Packing..."
tar czf /tmp/regimen-site.tgz index.html assets
echo "  $(du -h /tmp/regimen-site.tgz | cut -f1)"

echo "Uploading to $HOST..."
ssh -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=no "$HOST" '
  set -e
  NEW=/var/www/.regimen-incoming
  rm -rf "$NEW"; mkdir -p "$NEW"
  tar xzf - -C "$NEW"
  chown -R www-data:www-data "$NEW"
  # swap in place: old dir moved aside, new one takes the name, old removed
  rm -rf /var/www/.regimen-old
  [ -d /var/www/regimen ] && mv /var/www/regimen /var/www/.regimen-old
  mv "$NEW" /var/www/regimen
  rm -rf /var/www/.regimen-old
  echo "  $(find /var/www/regimen -type f | wc -l) files, $(du -sh /var/www/regimen | cut -f1)"
' < /tmp/regimen-site.tgz

echo "Verifying..."
code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H "Host: regimen.cc" "http://$IP/")
title=$(curl -s --max-time 15 -H "Host: regimen.cc" "http://$IP/" | grep -o '<title>[^<]*</title>' || true)

if [ "$code" = "200" ]; then
  echo "  HTTP 200"
  echo "  $title"
  echo "Done."
else
  echo "  HTTP $code -- something is wrong, check: ssh $HOST 'tail /var/log/nginx/error.log'" >&2
  exit 1
fi

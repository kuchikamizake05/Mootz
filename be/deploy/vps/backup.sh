#!/bin/sh
set -eu
umask 077
cd "$(dirname "$0")"
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
destination="backups/mootz-$stamp-$$.dump"
trap 'rm -f "$destination.partial"' EXIT HUP INT TERM
docker compose --env-file .env -f compose.yaml exec -T db pg_dump -U mootz -d mootz -Fc > "$destination.partial"
test -s "$destination.partial"
docker compose --env-file .env -f compose.yaml exec -T db pg_restore --list < "$destination.partial" > /dev/null
mv "$destination.partial" "$destination"
printf 'Backup created: %s\n' "$destination"

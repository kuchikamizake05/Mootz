#!/bin/sh
set -eu
umask 077
cd "$(dirname "$0")"
test "$#" -eq 2 || { echo 'Usage: sh restore-test.sh backups/file.dump mootz_DATE_restore_tests' >&2; exit 1; }
archive=$1
target=$2
case "$target" in mootz_*_restore_tests) ;; *) echo 'Target must be a NEW mootz_*_restore_tests database' >&2; exit 1;; esac
case "$target" in *[!a-z0-9_]*) echo 'Invalid target name' >&2; exit 1;; esac
test -f "$archive"
# createdb fails if the target exists. Never overwrite or drop an existing DB.
docker compose --env-file .env -f compose.yaml exec -T db createdb -U mootz "$target"
docker compose --env-file .env -f compose.yaml exec -T db pg_restore -U mootz -d "$target" --no-owner --no-acl --exit-on-error --single-transaction < "$archive"
docker compose --env-file .env -f compose.yaml exec -T db psql -U mootz -d "$target" -v ON_ERROR_STOP=1 -c 'SELECT count(*) AS applied_migrations FROM schema_migrations; SELECT PostGIS_Version();'
printf 'Restored into %s only; verify data privately. Target is retained for inspection.\n' "$target"

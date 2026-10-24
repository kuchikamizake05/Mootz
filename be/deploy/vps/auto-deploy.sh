#!/bin/bash
set -euo pipefail
umask 077
main() {
  cd "$(dirname "$0")/../../.."
  local root state target previous
  root=$(pwd)
  state="${XDG_STATE_HOME:-$HOME/.local/state}/mootz-deploy"
  mkdir -p "$state"
  exec 9>"$state/lock"
  flock -n 9 || exit 0
  test -f be/deploy/vps/.env || { echo 'Configure be/deploy/vps/.env first'; exit 1; }
  git diff --quiet && git diff --cached --quiet || { echo 'Refusing to overwrite local tracked changes'; exit 1; }
  git fetch --quiet origin main
  target=$(git rev-parse origin/main)
  previous=$(cat "$state/deployed-sha" 2>/dev/null || true)
  test "$target" != "$previous" || exit 0
  if python3 be/deploy/vps/check_ci.py "$target"; then
    :
  else
    local code=$?
    test "$code" -eq 3 && exit 0
    exit "$code"
  fi
  git merge-base --is-ancestor HEAD "$target" || { echo 'Checkout diverged; manual review required'; exit 1; }
  if test -n "$previous" && test -n "$(git diff --name-only "$previous" "$target" -- be/migrations be/deploy/vps/compose.yaml be/deploy/vps/Caddyfile)"; then
    echo 'Database or Compose changes require reviewed manual deployment; automatic deploy stopped'
    exit 1
  fi
  git merge --ff-only "$target"
  cd "$root/be/deploy/vps"
  export MOOTZ_IMAGE_TAG="$target"
  docker compose --env-file .env -f compose.yaml config --quiet
  docker compose --env-file .env -f compose.yaml build api
  docker compose --env-file .env -f compose.yaml up -d --wait --wait-timeout 120 db
  if test -z "$previous"; then
    docker compose --env-file .env -f compose.yaml --profile tools run --rm migrate
  else
    sh backup.sh
  fi
  if ! docker compose --env-file .env -f compose.yaml up -d --no-deps --wait --wait-timeout 180 api caddy ||
     ! docker compose --env-file .env -f compose.yaml exec -T api node -e "Promise.all(['/health','/ready','/ready/storage'].map(async p=>{const r=await fetch('http://127.0.0.1:3001'+p);if(!r.ok)throw Error(p)})).catch(()=>process.exit(1))"; then
    if test -n "$previous"; then
      MOOTZ_IMAGE_TAG="$previous" docker compose --env-file .env -f compose.yaml up -d --no-deps --wait --wait-timeout 180 api
      echo 'Restored previous API image; new deployment failed'
    fi
    exit 1
  fi
  printf '%s\n' "$target" > "$state/deployed-sha"
  printf 'Backend deployed successfully: %s\n' "$target"
}
main "$@"

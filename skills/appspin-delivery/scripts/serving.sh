#!/usr/bin/env bash
# Is staging serving this commit? Waits until staging's /health reports it, so a check never describes
# another build; with --now, asks once, to confirm after a check that staging did not move during it.
# Waiting in GitHub Actions, it also gives the check jobs served, staging's origin, and the task
# runner's prefix as step outputs.
# Usage: serving.sh <sha> [--now]
# Exit: 0 served, or a later merge superseded it before staging served it (it says so, and outputs
# served=superseded, so the checks are skipped, not failed); 1 --now, and staging serves another
# commit or did not answer; 2 the deploy never arrived, or bad usage; 3 no staging origin.
set -u
MANIFEST=.config/appspin/delivery.json
if [ $# -lt 1 ] || [ $# -gt 2 ] || { [ $# -eq 2 ] && [ "$2" != --now ]; }; then
  echo "usage: serving.sh <sha> [--now]" >&2
  exit 2
fi
sha=$1 now=${2:-}
cd "$(git rev-parse --show-toplevel)" || exit 3
origin=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).environments?.staging?.origin ?? ""' "$MANIFEST" 2> /dev/null)
[ -n "$origin" ] || {
  echo "serving: $MANIFEST names no staging origin, so there is no staging to check" >&2
  exit 3
}
origin=${origin%/}
# /health reports the full id, so a short one is resolved first.
resolve() { git rev-parse -q --verify "$1^{commit}"; }
sha=$(resolve "$sha" || { git fetch -q origin && resolve "$sha"; }) || {
  echo "serving: $1 names no commit" >&2
  exit 2
}
short() { printf '%s' "${1:0:7}"; }
served() { curl -sf --max-time 5 --retry 2 --retry-connrefused "$origin/health" | node -p 'JSON.parse(require("fs").readFileSync(0)).commit ?? ""' 2> /dev/null; }
output() { [ -z "${GITHUB_OUTPUT:-}" ] || printf '%s\n' "served=$1" "origin=$origin" "runner=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).roles?.runner ?? "make"' "$MANIFEST")" >> "$GITHUB_OUTPUT"; }

if [ -n "$now" ]; then
  at=$(served)
  [ "$at" = "$sha" ] && exit 0
  echo "serving: the check gives no result: staging serves $(short "${at:-nothing}"), not $(short "$sha"), so the build it ran against is unconfirmed" >&2
  exit 1
fi

known() { git cat-file -e "$1^{commit}" 2> /dev/null; }
fetched='' # the unknown commit last fetched for
while :; do
  at=$(served)
  [ "$at" = "$sha" ] && {
    output yes
    echo "serving: staging serves $(short "$sha")"
    exit 0
  }
  # A later merge may postdate this clone: fetch once per unknown commit before judging it.
  if [ -n "$at" ] && [ "$at" != "$fetched" ] && ! known "$at"; then
    git fetch -q origin 2> /dev/null
    fetched=$at
  fi
  if [ -n "$at" ] && known "$at" && git merge-base --is-ancestor "$sha" "$at"; then
    msg="serving: $(short "$sha") was superseded by $(short "$at") before staging served it, so its checks give no result"
    echo "$msg" >&2
    [ -z "${GITHUB_STEP_SUMMARY:-}" ] || echo "$msg" >> "$GITHUB_STEP_SUMMARY"
    output superseded
    exit 0
  fi
  if [ "$SECONDS" -ge 1500 ]; then
    echo "serving: the deploy of $(short "$sha") never arrived within 1500 seconds; $origin/health last answered: $(curl -s --max-time 5 -w ' (HTTP %{http_code})' "$origin/health" | head -c 200)" >&2
    [ -n "$at" ] && ! known "$at" && echo "  it reports $(short "$at"), a commit this clone lacks: fetch the full history" >&2
    exit 2
  fi
  sleep 5
done

#!/usr/bin/env bash
# Runs the repository's .config/appspin/verify.steps: each step in order, by
# name, stopping at the first failure with its exit code; with names, only those
# steps. Steps call the package's scripts at .agents/skills/appspin-delivery.
# Usage: verify.sh [step...]
set -u
CONF=.config/appspin
root=$(git rev-parse --show-toplevel) || exit 2
cd "$root" || exit 2
# make, unlike npm, runs this without the project's tools on PATH; add them.
for d in .venv/bin node_modules/.bin; do [ -d "$d" ] && PATH="$root/$d:$PATH"; done
steps=$CONF/verify.steps
[ -f "$steps" ] || {
  echo "verify: no $steps in $root; run adopt to write one"
  exit 3
}
for s in "$@"; do
  awk -v s="$s" '$1 == s { f = 1 } END { exit !f }' "$steps" || {
    echo "verify: no step named $s"
    exit 2
  }
done
n=0
while read -r name cmd || [ -n "$name" ]; do
  case "$name" in '' | '#'*) continue ;; esac
  if [ $# -gt 0 ]; then
    case " $* " in *" $name "*) ;; *) continue ;; esac
  fi
  printf '\n== %s\n' "$name"
  [ -n "$cmd" ] || {
    printf '\nverify: %s has no command\n' "$name"
    exit 2
  }
  bash -c "$cmd" < /dev/null
  code=$?
  [ "$code" -eq 0 ] || {
    printf '\nverify: %s failed (exit %s)\n' "$name" "$code"
    exit "$code"
  }
  n=$((n + 1))
done < "$steps"
printf '\nverify: %s steps passed\n' "$n"

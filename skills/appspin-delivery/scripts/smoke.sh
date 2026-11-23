#!/usr/bin/env bash
# A project's smoke: runs each probe in .config/appspin/smoke.steps with its
# control, against the target given: an address for an app, which it waits for,
# or a commit for a package. A probe passes when its check passes and its control
# fails; a control that passes too means the probe cannot see, so the result is
# inconclusive, never a pass, as is a check that exits 2, could not check. Read-only: probes never write.
# Usage: smoke.sh <target>        (the task runner passes $ORIGIN last)
# Exit: 0 pass, 1 a check failed, 2 inconclusive or could not check, 3 no smoke steps or no probes.
set -u
CONF=.config/appspin
[ $# -ge 1 ] || {
  echo "usage: smoke.sh <target>"
  exit 2
}
for ORIGIN; do :; done
ORIGIN=${ORIGIN%/}
export ORIGIN
root=$(git rev-parse --show-toplevel) || exit 2
cd "$root" || exit 2
steps=$CONF/smoke.steps
[ -f "$steps" ] || {
  echo "smoke: no $steps in $root"
  exit 3
}

case "$ORIGIN" in
  http://* | https://*)
    waited=0
    until curl -s -o /dev/null --max-time 5 "$ORIGIN/"; do
      [ "$waited" -ge 60 ] && {
        echo "smoke: $ORIGIN did not answer within 60 seconds"
        exit 2
      }
      sleep 5
      waited=$((waited + 5))
    done
    ;;
esac

failed='' unsure='' ran=''
while read -r name rest || [ -n "$name" ]; do
  case "$name" in '' | '#'*) continue ;; esac
  case "$rest" in
    *' :: '*' :: '*)
      echo "smoke: $name has more than one ::"
      exit 2
      ;;
    *' :: '*) ;;
    *)
      echo "smoke: $name has no control (name  check  ::  control)"
      exit 2
      ;;
  esac
  check=${rest%% :: *} control=${rest#* :: } ran=1
  out=$(bash -c "$check" < /dev/null 2>&1)
  status=$?
  if [ "$status" -eq 2 ]; then
    echo "  inconclusive  $name: it could not check"
    unsure=1
    printf '%s\n' "$out" | sed 's/^/                /'
  elif [ "$status" -ne 0 ]; then
    echo "  fail          $name"
    failed=1
    printf '%s\n' "$out" | sed 's/^/                /'
  elif bash -c "$control" < /dev/null > /dev/null 2>&1; then
    echo "  inconclusive  $name: its control passed too"
    unsure=1
  else
    echo "  pass          $name"
  fi
done < "$steps"
[ -n "$ran" ] || {
  echo "smoke: $steps has no probes"
  exit 3
}
if [ -n "$failed" ]; then
  echo "smoke: fail"
  exit 1
fi
if [ -n "$unsure" ]; then
  echo "smoke: inconclusive"
  exit 2
fi
echo "smoke: pass"

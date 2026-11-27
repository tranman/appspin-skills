#!/usr/bin/env bash
# The exact half of adopt: writes the package's pieces from this skill, puts the
# AGENTS.md block in place, and turns the hooks on. Everything that needs judgment
# is the skill's steps, which follow.
# --check prints what adopt would write, and writes nothing.
# Exit: 0 done, 1 an error or a refusal, 2 bad usage.
set -u
here=$(cd "$(dirname "$0")/.." && pwd)
check=''
[ "${1:-}" = --check ] && {
  check=1
  shift
}
[ $# -le 1 ] || {
  echo "usage: adopt.sh [--check] [repo]"
  exit 2
}
repo=${1:-.}
git -C "$repo" rev-parse --git-dir > /dev/null 2>&1 || {
  echo "adopt: $repo is not a git repository"
  exit 2
}
repo=$(cd "$(git -C "$repo" rev-parse --show-toplevel)" && pwd -P)
git -C "$repo" rev-parse -q --verify HEAD > /dev/null || {
  echo "adopt: the branch has no commit yet; make a first commit, then run adopt again"
  exit 1
}

BEGIN='<!-- appspin-delivery: begin -->'
END='<!-- appspin-delivery: end -->'
# The standard's own files, in one folder at the repository root.
CONF=.config/appspin
MANIFEST=$CONF/delivery.json

url=$(git -C "$repo" remote get-url origin 2> /dev/null) || {
  echo "adopt: the repository has no origin; add it, then run adopt again"
  exit 1
}
case "$url" in *github.com[:/]*) ;; *)
  echo "adopt: origin, $url, is not on GitHub, the one host the package supports"
  exit 1
  ;;
esac

# The installer writes these just before adopt runs; the branch carries them.
dirty=
[ -z "$check" ] && dirty=$(git -C "$repo" status --porcelain --untracked-files=all | cut -c4- \
  | grep -Ev '^"?(\.agents/|\.claude/skills/|\.claude/settings\.json|skills-lock\.json)')
if [ -n "$dirty" ]; then
  echo "adopt: the working tree has changes; commit or stash them, then run adopt again:"
  printf '%s\n' "$dirty" | sed 's/^/  /'
  exit 1
fi
if [ "$(git -C "$repo" branch --show-current)" = main ]; then
  # The installer runs the check, so git asks for no HTTPS login in it.
  [ -z "$check" ] || export GIT_TERMINAL_PROMPT=0
  git -C "$repo" fetch -q origin || {
    echo "adopt: could not fetch origin"
    exit 1
  }
  git -C "$repo" rev-parse -q --verify refs/remotes/origin/main > /dev/null || {
    echo "adopt: origin has no main yet; push it with git push -u origin main, then run adopt again"
    exit 1
  }
  if [ -n "$check" ]; then
    # Adopt writes onto origin/main, so the check reads its files, not a local main behind it.
    tree=$(mktemp -d) || exit 1
    trap 'rm -rf "$tree" "$tree.index"' EXIT
    if ! GIT_INDEX_FILE=$tree.index git -C "$repo" read-tree origin/main \
      || ! GIT_INDEX_FILE=$tree.index git -C "$repo" checkout-index -a --prefix="$tree/"; then
      echo "adopt: could not read origin/main"
      exit 1
    fi
    repo=$tree
  else
    # The last adopt's branch, once merged, would block this one.
    ! git -C "$repo" merge-base --is-ancestor refs/heads/adopt origin/main 2> /dev/null || git -C "$repo" branch -qD adopt
    git -C "$repo" switch -q --no-track -c adopt origin/main || {
      echo "adopt: could not create the adopt branch: one not merged into origin/main, or checked out elsewhere, is in the way; merge or delete it, then run adopt again"
      exit 1
    }
    undo() {
      [ $? = 0 ] && return
      local f
      for f in $wrote; do git -C "$repo" checkout -q HEAD -- "$f" 2> /dev/null || rm -f "$repo/$f"; done
      git -C "$repo" switch -q main && git -C "$repo" branch -qD adopt && echo "adopt: back on main; the adopt branch is deleted"
    }
    trap undo EXIT
    echo "adopt: on adopt"
  fi
fi

wrote=

# put <path> < content: writes the file when it differs, never through a symlink.
put() {
  local p='' part rest=$1 tmp
  while [ -n "$rest" ]; do
    part=${rest%%/*}
    if [ "$part" = "$rest" ]; then rest=; else rest=${rest#*/}; fi
    p="$p/$part"
    [ -L "$repo$p" ] && {
      echo "adopt: $1 would be written through a symlink; resolve it by hand"
      exit 1
    }
  done
  tmp=$(mktemp) && cat > "$tmp" || exit 1
  if ! cmp -s "$tmp" "$repo/$1"; then
    [ -n "$check" ] || { mkdir -p "$(dirname "$repo/$1")" && cat "$tmp" > "$repo/$1"; } || {
      echo "adopt: could not write $1"
      exit 1
    }
    case " $wrote " in *" $1 "*) ;; *) wrote="$wrote $1" ;; esac
  fi
  rm -f "$tmp"
}

grep -qxsF accounts.json "$repo/$CONF/.gitignore" \
  || put "$CONF/.gitignore" < <(
    awk 1 "$repo/$CONF/.gitignore" 2> /dev/null
    echo accounts.json
  )

# The package's pieces: the push hook everywhere, which a project's own hooks run first, and GitHub's template.
put .githooks/pre-push < "$here/assets/checks/pre-push"
put .github/pull_request_template.md < "$here/assets/templates/pull-request.md"
# An App's staging gate, whose check names promote requires.
node -e 'process.exit(JSON.parse(require("fs").readFileSync(process.argv[1])).environments?.staging ? 0 : 1)' "$repo/$MANIFEST" 2> /dev/null \
  && put .github/workflows/staging.yml < "$here/assets/checks/staging.yml"
# A Cloudflare App's deploy and promote.
if node -e 'process.exit(JSON.parse(require("fs").readFileSync(process.argv[1])).roles?.deploy === "cloudflare" ? 0 : 1)' "$repo/$MANIFEST" 2> /dev/null; then
  put .github/workflows/deploy.yml < "$here/assets/checks/deploy.yml"
  put .github/workflows/promote.yml < "$here/assets/checks/promote.yml"
fi

agents="$repo/AGENTS.md" asset="$here/assets/agents/AGENTS.md"
if grep -qxsF "$BEGIN" "$agents" && ! grep -qxsF "$END" "$agents"; then
  echo "adopt: AGENTS.md has the begin marker and no end marker"
  exit 1
elif grep -qxsF "$BEGIN" "$agents"; then
  put AGENTS.md < <(awk -v b="$BEGIN" -v e="$END" -v asset="$asset" '
    $0 == b { while ((getline l < asset) > 0) print l; inb = 1; next }
    inb { if ($0 == e) inb = 0; next }
    { print }' "$agents")
else
  put AGENTS.md < <(
    if [ -s "$agents" ]; then
      cat "$agents"
      echo
    fi
    cat "$asset"
  )
fi
[ -e "$repo/CLAUDE.md" ] || put CLAUDE.md < "$here/assets/agents/CLAUDE.md"
if [ -n "$check" ]; then
  # The skill's steps write the manifest; without it, the adoption never finished.
  [ -e "$repo/$MANIFEST" ] || wrote="$wrote $MANIFEST"
  [ -z "$wrote" ] || echo "${wrote# }"
  exit 0
fi

case " $wrote " in *" .githooks/pre-push "*) chmod +x "$repo/.githooks/pre-push" ;; esac
# A project on husky runs the package's hook from its own pre-push, as the skill's steps set up.
if [ -d "$repo/.husky" ]; then
  echo "adopt: hooks run from .husky; core.hooksPath left alone"
else
  git -C "$repo" config core.hooksPath .githooks || {
    echo "adopt: could not turn the hooks on"
    exit 1
  }
fi
echo "adopt: wrote:${wrote:- nothing}"

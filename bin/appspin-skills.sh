#!/usr/bin/env bash
# Installs or updates appspin-skills here through the skills CLI, then removes a
# skill the release no longer ships.
#   npx github:tranman/appspin-skills                      the latest release, the highest vX.Y.Z tag
#   npx github:tranman/appspin-skills vX.Y.Z               a pinned release
#   npx github:tranman/appspin-skills acme/demo#<ref>      a branch or full commit of another repository, as smoke does
set -eu
# Where adopt's prerequisites are missing, list each and install nothing.
root=$(git rev-parse --show-toplevel 2> /dev/null) || root=
need=
[ -n "$root" ] || need="$need
  - a git repository: git init -b main"
[ -n "$root" ] && git -C "$root" rev-parse -q --verify HEAD > /dev/null || need="$need
  - a first commit of the files to keep, a README.md where the folder is empty: git add <files> && git commit -m 'First commit'"
if [ -z "$root" ] || ! git -C "$root" remote get-url origin > /dev/null 2>&1; then
  gh auth status > /dev/null 2>&1 || need="$need
  - gh signed in, yours to do in a browser: gh auth login"
  need="$need
  - a private GitHub repository as origin: gh repo create <name> --private --source . --push"
fi
[ -z "$need" ] || {
  echo "appspin-skills: not installed yet; the first step is to set up this folder with:$need"
  echo "Next: present this as the first setup step, not as a failure. The person does the steps marked theirs; then show them the rest, with the repository name they choose where a repository is listed and the files a first commit adds where a first commit is, run them after their one \"yes\", and run the installer again."
  exit 1
}
cd "$root"
[ -L .agents/skills ] && [ "$(cd .agents/skills && pwd -P)" = "$root/skills" ] \
  && {
    echo "appspin-skills: .agents/skills links to this repository's own skills/; refusing to install over them"
    exit 1
  }
# The CLI replaces a lock it cannot read, and other packages' entries with it.
[ ! -s skills-lock.json ] || node -e 'const l = JSON.parse(require("fs").readFileSync(process.argv[1])); process.exit(l.version === 1 && l.skills?.constructor === Object ? 0 : 1)' skills-lock.json 2> /dev/null \
  || {
    echo "appspin-skills: skills-lock.json is not a version 1 lock; fix it by hand, keeping other packages' entries; nothing was installed"
    exit 1
  }
repo=tranman/appspin-skills src=https://github.com/tranman/appspin-skills
case "${1:-}" in
  '')
    ref=$(git ls-remote --tags --refs "$src" 'v*' | sed -nE 's|.*refs/tags/v([0-9]+\.[0-9]+\.[0-9]+)$|\1|p' \
      | sort -t. -k1,1n -k2,2n -k3,3n | tail -n 1)
    [ -n "$ref" ] || {
      echo "appspin-skills: no release found at $src"
      exit 1
    }
    ref=v$ref
    ;;
  v[0-9]*.[0-9]*.[0-9]*) ref=$1 ;;
  */*#?*) repo=${1%%#*} ref=${1#*#} src=https://github.com/${1%%#*} ;;
  *)
    echo "usage: appspin-skills [vX.Y.Z | <owner>/<repo>#<branch or commit>]"
    exit 2
    ;;
esac
cli=skills@1.7.0
skills() { DO_NOT_TRACK=1 npx -y "$cli" "$@"; }

echo "appspin-skills $ref into $root"
out=$(skills add "$repo#$ref" --skill '*' --agent claude-code codex -y 2>&1) \
  || {
    printf '%s\n' "$out"
    echo "appspin-skills: the skills CLI could not install $ref, for the reason above"
    exit 1
  }
# The skills $ref ships, which this installer's own copy may not match.
tmp=$(mktemp -d) && trap 'rm -rf "$tmp"' EXIT
if ! git -C "$tmp" init -q || ! git -C "$tmp" fetch -q --depth 1 "$src" "$ref" || ! git -C "$tmp" checkout -q FETCH_HEAD; then
  echo "appspin-skills: could not read $ref's skills"
  exit 1
fi
echo "  installed: $(cd "$tmp/skills" && echo *)"
for dir in .agents/skills/appspin-*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")
  [ -d "$tmp/skills/$name" ] && continue
  out=$(skills remove "$name" -y 2>&1) || {
    printf '%s\n' "$out"
    echo "appspin-skills: could not remove $name"
    exit 1
  }
  echo "  removed:   $name (no longer shipped)"
done

# Adopt decides what it would write; the installer only reports it.
if ! stale=$(bash .agents/skills/appspin-delivery/scripts/adopt.sh --check "$root"); then
  echo "Next: fix this, then run the installer again: ${stale:-the adopt check failed and gave no reason}"
else
  echo "Next: adopt the project${stale:+; it would update: $stale}."
fi

#!/usr/bin/env bash
# Writes the test accounts from ACCOUNTS_JSON, a CI secret, to the store delivery.json's accounts.store
# names, .config/appspin/accounts.json when absent, for a check's sign-in to read; nothing without it.
# It refuses a store git does not ignore.
# Exit: 0 written, or nothing to write; 2 refused, or could not write.
set -u
[ -n "${ACCOUNTS_JSON:-}" ] || exit 0
cd "$(git rev-parse --show-toplevel)" || exit 2
store=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).accounts?.store ?? ""' .config/appspin/delivery.json 2> /dev/null)
store=${store:-.config/appspin/accounts.json}
git check-ignore -q -- "$store" || {
  echo "accounts: $store is not gitignored, so the accounts could be committed" >&2
  exit 2
}
if ! mkdir -p "$(dirname "$store")" || ! printf '%s' "$ACCOUNTS_JSON" > "$store"; then
  echo "accounts: could not write $store" >&2
  exit 2
fi

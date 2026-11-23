#!/usr/bin/env bash
# An App's deploy, which deploy.yml and promote.yml run with the account token in CLOUDFLARE_API_TOKEN.
#   deploy.sh env                    prints the job's GitHub variables and secrets, VARS and SECRETS, for GITHUB_ENV
#   deploy.sh account                prints the token's one account id
#   deploy.sh subdomain              prints delivery.json's subdomain, else the account's, registering one if none
#   deploy.sh staging|production <sha>
#                                    builds the commit with the task runner's build command, where it has one; for
#                                    staging, applies the migrations and deploys; for production, deploys once where
#                                    the worker does not exist yet, then uploads the commit's candidate
# Exit: 0 done, 1 a step failed, 2 bad usage or no token.
set -euo pipefail
manifest() { node -p "JSON.parse(require('fs').readFileSync('.config/appspin/delivery.json')).$1 ?? ''"; }
case "${1:-}" in
  env)
    # Names a shell can export; GitHub's own lower-case github_token is left out.
    jq -nr --argjson v "${VARS:-null}" --argjson s "${SECRETS:-null}" \
      --arg end "END_$RANDOM$RANDOM" \
      '($v // {}) + ($s // {}) | to_entries[] | select(.key | test("^[A-Z][A-Z0-9_]*$")) | "\(.key)<<\($end)\n\(.value)\n\($end)"'
    exit 0
    ;;
  subdomain)
    s=$(manifest subdomain)
    [ -z "$s" ] || {
      echo "subdomain: $s"
      exit 0
    }
    ;;
  account) ;;
  staging | production)
    [ -n "${2:-}" ] || {
      echo "usage: deploy.sh $1 <sha>" >&2
      exit 2
    }
    ;;
  *)
    echo "usage: deploy.sh env|account|subdomain|staging <sha>|production <sha>" >&2
    exit 2
    ;;
esac
[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || {
  echo "deploy: CLOUDFLARE_API_TOKEN is empty; set the repository's secret with gh secret set CLOUDFLARE_API_TOKEN" >&2
  exit 2
}
API=https://api.cloudflare.com/client/v4
api() { curl -sS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H 'Content-Type: application/json' "$@"; }
a=$(api "$API/accounts")
[ "$(jq '.result | length' <<< "$a")" = 1 ] || {
  echo "deploy: the token reaches $(jq '.result | length' <<< "$a") accounts, not one: $(jq -c .errors <<< "$a")" >&2
  exit 1
}
# Wrangler, given the account, never asks the token for the memberships it cannot read.
export CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_ACCOUNT_ID=$(jq -r '.result[0].id' <<< "$a")

case "$1" in
  account) echo "$CLOUDFLARE_ACCOUNT_ID" ;;
  subdomain)
    at=$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/subdomain
    got=$(api "$at")
    s=$(jq -r '.result.subdomain // empty' <<< "$got")
    if [ -z "$s" ]; then
      # 10007 is Cloudflare's "no subdomain"; any other failed read must not rename the account's.
      jq -e 'any(.errors[]?; .code == 10007)' <<< "$got" > /dev/null || {
        echo "deploy: could not read the account's subdomain: $(jq -c .errors <<< "$got")" >&2
        exit 1
      }
      want=$(tr '[:upper:]' '[:lower:]' <<< "$GITHUB_REPOSITORY_OWNER")
      put=$(api -X PUT "$at" -d "{\"subdomain\":\"$want\"}")
      s=$(jq -r '.result.subdomain // empty' <<< "$put")
      [ -n "$s" ] || {
        echo "deploy: could not register the subdomain $want ($(jq -c .errors <<< "$put")); register one on the dashboard's Workers overview, then push again" >&2
        exit 1
      }
      s="$s, registered now"
    fi
    echo "subdomain: $s"
    ;;
  staging | production)
    sha=$2 worker=$(manifest "environments?.$1?.worker") dir=$(manifest "environments?.production?.dir")
    runner=$(manifest "roles?.runner") runner=${runner:-make}
    [ -n "$worker" ] || {
      echo "deploy: .config/appspin/delivery.json names no $1 environment; nothing to deploy"
      exit 0
    }
    # Wrangler and the project's own commands read the environment from CLOUDFLARE_ENV; production is the config's top level.
    export CLOUDFLARE_ENV=
    [ "$1" = production ] || CLOUDFLARE_ENV=$1
    if [ "$runner" = make ]; then
      ! make -n build > /dev/null 2>&1 || make build
    else $runner --if-present build; fi
    code=$(api -o /dev/null -w '%{http_code}' "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/$worker/settings")
    case "$code" in 200 | 404) ;; *)
      echo "deploy: could not tell whether $worker exists (HTTP $code); run the job again" >&2
      exit 1
      ;;
    esac
    wrangler() { (cd "${dir:-.}" && npx --yes wrangler@4 "$@"); }
    # Each D1 database the environment's config binds, created where missing, so migrations meet it; read with
    # wrangler's own config reader, where the App installs wrangler.
    for d in $(cd "${dir:-.}" && node -e '
      const { unstable_readConfig } = require(require.resolve("wrangler", { paths: [process.cwd()] }));
      const c = unstable_readConfig({ env: process.env.CLOUDFLARE_ENV || undefined }, { hideWarnings: true });
      console.log(c.d1_databases.map((d) => d.database_name).join(" "));' 2> /dev/null); do
      wrangler d1 info "$d" > /dev/null 2>&1 || wrangler d1 create "$d"
    done
    [ "$(manifest migrate)" != true ] || [ "$1" != staging ] || $runner migrate
    if [ "$1" = staging ] || [ "$code" = 404 ]; then
      # Production deploys only where its worker does not exist yet; any answer but "not found" stopped above.
      # A new worker can be unknown to Cloudflare for a moment after its upload (error 10007), so its first deploy is retried once.
      wrangler deploy --name "$worker" --env="$CLOUDFLARE_ENV" --var "COMMIT:$sha" || {
        [ "$code" = 404 ] || exit 1
        sleep 15
        wrangler deploy --name "$worker" --env="$CLOUDFLARE_ENV" --var "COMMIT:$sha"
      }
    fi
    [ "$1" = staging ] || wrangler versions upload --name "$worker" --env= --tag "$sha" --message main --var "COMMIT:$sha"
    ;;
esac

# The deploy role on Cloudflare Workers

This page describes the reference implementation of an App's deploy role on
Cloudflare Workers, the default adopt offers, where `roles.deploy` is
`cloudflare`. Two of the package's GitHub Actions workflows deploy and promote
the App with one account API token, kept as a repository secret. Their logic is
`scripts/deploy.sh`. Last checked against wrangler 4.162, 2026-11.

## What adopt builds

- **Two workers, one config, `wrangler.jsonc`.** Production is the config's top
  level, `<app>`, its top-level `name` key; staging is `env.staging`,
  `<app>-staging`. Each sets an `ENV` variable. A D1 database is bound by
  `database_name`, the worker's name, with no `database_id`: wrangler finds it
  by name, and each merge creates it where it is missing.
- **`GET /health`** returns
  `{ "env": "<staging|production>", "db": "ok", "commit": "<sha>" }`, `db`
  where the App has a database. The commit is the Worker's `COMMIT` variable,
  which each deploy and upload sets. Adopt writes a minimal worker serving it
  and `/` in a repository with no code of its own, after a trial's scaffolder
  where there is one, named in the pull request as the project's
  own, and proposes the endpoint in a project with an App.
- **`.gitignore` lists `.wrangler/`,** since an untracked file there sends every
  promote to a worktree.
- **The workflows,** package pieces adopt writes once `roles.deploy` is
  `cloudflare`: `deploy.yml` and `promote.yml`, beside the staging gate,
  `staging.yml`, which it writes once `environments.staging` is set.
- **`delivery.json`:** `roles.deploy` `cloudflare`; the account's `subdomain`;
  `environments.production` and `environments.staging`, each with `worker` and
  `origin` (`https://<worker>.<subdomain>.workers.dev`), and `dir` where the
  worker is not at the root; and `ci.required` `["deploy (production)"]`, so
  promote refuses a commit whose upload never ran. No account id.
- **The runner:** `build`, where the App has a build step; `migrate`, where it
  has migrations, which migrates the environment `CLOUDFLARE_ENV` names,
  staging, or production when it is empty, as wrangler reads it; `smoke`, whose `ORIGIN` defaults to staging's address; and
  `e2e`, with no default.
- **`smoke.steps`:** `answers`, `environment`, and, where the App has a
  database, `connected`, against `/health`, and one probe per key page, each
  with a control that must fail. It expects staging where the origin's host has
  `-staging`, and production otherwise, a candidate's preview URL included.

## The token

Give the operator this link, its `name` set to the App's name. It opens
Cloudflare's **API Tokens** page with Workers Scripts edit, D1 edit, and Account
Settings read filled in:

```
https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=%5B%7B%22key%22%3A%22workers_scripts%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22d1%22%2C%22type%22%3A%22edit%22%7D%2C%7B%22key%22%3A%22account_settings%22%2C%22type%22%3A%22read%22%7D%5D&name=<app>
```

For a new App the operator keeps **Entire Account**, since the workers do not
exist yet; for an App whose workers exist, they pick those workers. They create
the token and paste it into `gh secret set CLOUDFLARE_API_TOKEN` in a terminal
of their own, not the agent's: a command the agent runs, Claude Code's `!`
included, gives gh no input and stores an empty secret. Never ask for its
value: it reaches no chat, file, or repository. The
paste is their "yes" for the subdomain lookup below, and their "merge" of adopt's
pull request is the "yes" for what the merge creates.

## The addresses

Write `roles.deploy` in `delivery.json` and commit it on adopt's branch, since adopt's script refuses uncommitted changes. Run the script again, which writes the workflows, then push the branch. The `deploy` workflow's
`subdomain` job prints `subdomain: <name>`, and registers one from the
repository owner's name where the account has none, adding `, registered now`. Read it with `gh run view --log`. Then, before the pull
request opens, write `subdomain` and both environments in `delivery.json`,
commit them, and run adopt's script again, so the branch has the staging gate.

## Each merge

The `deploy` workflow runs one job per environment, `deploy (staging)` and
`deploy (production)`, each with its GitHub environment's variables and secrets
in the environment, such as a build's public keys or a database's address;
keep them as environment secrets, not repository secrets, which every job
reads. Each builds with the runner's `build`, where there is one, and creates
any D1 database its config binds that is missing. Staging then applies its
migrations with the runner's `migrate` and deploys. Production deploys once
where its worker does not exist yet, so it serves that commit until the first
promote, then uploads the candidate with
`wrangler versions upload --tag <commit>`. Staging goes first, and a failure
there cancels production's upload.

## Promote

After the operator's "yes", start the `promote` workflow with
`gh workflow run promote.yml -f sha=<sha>`, noting first the newest run's
`databaseId` in `gh run list --workflow promote.yml --json databaseId,displayTitle`.
Its run is the one titled `promote <sha>` with a higher `databaseId`; if none
appears within a minute, say so and stop. Watch it with
`gh run watch <id> --exit-status`, and report each of promote's lines from its
log, or the step that refused. It runs with production's GitHub variables and
secrets, so `migrate` reaches production's database. The repository adapter
leaves that workflow's runs out of the commit's checks.

## The settings promote applies

A version carries the worker's code and bindings, not its non-versioned
settings: logpush, observability, and tail consumers. `wrangler versions deploy`
syncs those from the config in the directory it runs in. Promote therefore runs
it on the candidate's commit: in place when the checkout is that commit with a
clean tree, untracked files included, otherwise in a temporary detached worktree
of it, removed afterwards. Going back to an older commit restores that commit's
settings too, since a candidate is the build and its settings.

## The human steps

They are in the how-to guides' [Set up
Cloudflare](../how-to.md#set-up-cloudflare).

# Delivery standard reference

This page holds the tables and terms of the
[appspin delivery standard](standard.md), for looking one thing up.

- [Commands](#commands)
- [Environments](#environments)
- [Roles](#roles)
- [The manifest](#the-manifest)
- [Files](#files)
- [Steps of the lifecycle](#steps-of-the-lifecycle)
- [Terms](#terms)

## Commands

The commands the standard names, what each does, and when it runs. Where the
project is missing one, adopt writes it as the delivery skill's
[steps](SKILL.md) say.

| command   | what it does                                                                                                                                                                                  | when it runs                                                                                                                                                                                                                          |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify`  | runs the steps in the `verify.steps` file, one named step per line; the `verify` command adopt writes calls the package's `verify.sh` script                                                  | the push hook, every push; `verify.yml`, every pull request and `main`; you, by hand                                                                                                                                                  |
| `smoke`   | runs the probes in the `smoke.steps` file: that a running copy of an App is up and working, or that a Software Package installs from a commit or its release tag                              | `staging.yml`, on staging after a merge; promote, on the candidate and then production; you, by hand                                                                                                                                  |
| `e2e`     | runs an App's end-to-end tests, each a scripted sequence of steps, against a running copy                                                                                                     | the agent, locally before the push for review; `staging.yml`, on staging after each merge                                                                                                                                             |
| `explore` | explores a running copy for what no check covers, and reports                                                                                                                                 | when you or a schedule you set runs it, never as a gate                                                                                                                                                                               |
| `promote` | moves production to a commit's candidate, newer or older, and tags the release: `v<version>` for a Software Package, a deploy tag for an App                                                  | by you, or the agent on your word, once per release                                                                                                                                                                                   |
| `migrate` | applies an App's database migrations to the environment `CLOUDFLARE_ENV` names, production when it is empty, with the project's own migration tool; the project writes it, and adopt does not | each merge's staging deploy, before it deploys, and promote, from the commit it releases, before the candidate's `smoke`, when the manifest's `migrate` key is `true`, unless the commit is older than a release or than production's |
| `build`   | builds an App, where it has a build step, with the environment's variables                                                                                                                    | each merge's deploy, once per environment                                                                                                                                                                                             |
| `setup`   | turns the push hook on                                                                                                                                                                        | once per clone                                                                                                                                                                                                                        |

`smoke` reads its target from the `$ORIGIN` variable: an App's address, or the
commit or release tag a [Software Package](#terms) installs from. The task runner's default for
it must give way to one already set, as make's `ORIGIN ?=` does. An App's [probes](#terms)
answer four questions: the address answers, it is the right environment, it
reaches its database and services where it has them, and each key page answers.
A probe's request may carry a header, such as a stored session cookie. A check
that needs a second request is `e2e`, not `smoke`.

The `smoke` command adopt writes calls the package's script,
`.agents/skills/appspin-delivery/scripts/smoke.sh`, which runs the probes in the
[`smoke.steps`](#process-pieces) file. Promote and `staging.yml` run the `smoke`
command through the task runner, with the target in `$ORIGIN`.

`e2e` runs against the address in `$ORIGIN`. The tests are in the project's own
tool, or in Playwright Test where adopt wrote them, and adopt's Playwright
settings refuse to run when `$ORIGIN` is unset. It also runs on any copy, as a
tool. As a gate, the `staging.yml` workflow runs it on staging, and the
continuous integration (CI) workflow runs it on a pull request where that
workflow has the job.

Each of these but `explore`, which is the `appspin-explore` skill, is a command
of that name in the project's task runner. The command is a script in
`package.json`, or a target in a `Makefile`. The `roles.runner`
key names the runner's prefix: `make` or `npm run`. Each
passes a command's arguments its own way, such as `make promote ARGS=<sha>` or
`npm run promote -- <sha>`.

The package's push hook runs the `verify` command through the task runner, as
the `roles.runner` key names it, or make when it names none, and refuses the
push when `verify` fails. The hook refuses any push to `main`, a `v*` release
tag on a commit that is not on `main`, and the deletion of a release tag.

The package's commands exit with one of four codes:

- 0: a pass
- 1: a problem found, or a refusal
- 2: it could not check, or it was run wrongly, such as a `smoke` probe that is inconclusive
- 3: it is not set up

## Environments

Where an App runs, and which tests may run there. A
[Software Package](#terms) has none.

|                      | what it is                                | data           | tests that may run                     |
| -------------------- | ----------------------------------------- | -------------- | -------------------------------------- |
| local                | the working tree on a development server  | non-production | `verify` · `smoke` · `e2e` · `explore` |
| staging              | `main`, built and deployed on every merge | non-production | `smoke` · `e2e` · `explore`            |
| production candidate | `main`, built for production, no traffic  | production     | `smoke` · `e2e` · `explore`            |
| production           | the candidate `promote` moved traffic to  | production     | `smoke` · `e2e` · `explore`            |

## Roles

The jobs a tool must do, the tool adopt offers for each, and the contract a
tool must meet to fill the role. The [`delivery.json` file](#the-manifest)
records each role's choice under its key, such as `"backlog": "github-issues"`.
A tool that cannot meet the contract leaves the role
unfilled.

| role                   | key              | default                                                                                           | value                                 | contract                                                                                                                                                                                                           |
| ---------------------- | ---------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| repository             | `repo`           | GitHub                                                                                            | `github`                              | refuses direct pushes to `main`, by branch protection, or by the push hook where the host's plan has none; merges by pull request, with a merge commit                                                             |
| backlog                | `backlog`        | GitHub Issues                                                                                     | `github-issues`                       | items in one shape; a stable identifier for branches and pull requests; agents use it through its own tool; closed with a reason                                                                                   |
| continuous integration | `ci`             | GitHub Actions                                                                                    | `github-actions`, or free text        | runs `verify` on every pull request and on `main`, and reports each check to the repository's host on the commit, under a name the same every way the job runs; a check `ci.required` lists is never path-filtered |
| deploy                 | `deploy`         | Cloudflare Workers, with its D1 database, for an App only. A Software Package has none            | `cloudflare`                          | a candidate per commit, served on production settings before any traffic; promote moves only after its checks, to a newer candidate or an older one                                                                |
| agent harness          | `harness`        | Claude Code                                                                                       | `claude-code`, or free text           | asks before a dangerous action runs; reads the project's instructions                                                                                                                                              |
| coding                 | `coding`         | superpowers                                                                                       | free text                             | plans, codes, and verifies, the project's instructions first                                                                                                                                                       |
| review                 | `review`         | the `appspin-review` skill                                                                        | free text                             | keeps the standard's rule 6                                                                                                                                                                                        |
| task runner            | `runner`         | make, or `npm run`                                                                                | the prefix, `make` or `npm run`       | runs the named commands: `verify`, `smoke`, `promote`, and `setup`; `e2e` for an App, `build` for an App with a build step, and `migrate` for an App with database migrations                                      |
| knowledge base         | `knowledge-base` | none: adopt asks. An agent asks where to write unless the value names a repository with a README. | `github:<owner>/<repo>`, or free text | keeps research and planning notes outside the code                                                                                                                                                                 |

An adapter is a JavaScript module in the delivery skill's `scripts/adapters/`,
which the role's value names: `github` for the repository role, and
`cloudflare` for an App's deploy role. A Software Package has no deploy role:
promote releases it by tag itself. Promote calls the adapter's functions, which
[`scripts/adapter.mjs`](scripts/adapter.mjs) describes, and refuses on any
error.

The backlog has no adapter. Agents file, read, edit, and close items with the
backlog's own tool, as `roles.backlog` names it, such as `gh` for
`github-issues`. An item is a title line, then the sections of the delivery
skill's [`templates/item.md`](assets/templates/item.md) as Markdown headings,
and its id appears in a branch name and a pull request's `Closes` line. An item
is closed as done when its pull request merges, which a `Closes` line does where
the merge lands on the default branch, `main`. It is closed as won't do, such as
"not planned" or "duplicate" on GitHub, when it is superseded, a duplicate,
retired, or obsolete, only on a person's word, with the reason added first.

## The manifest

The manifest is `delivery.json`, the project's settings file, in the `.config/appspin/` folder at
the repository root, beside the project's `verify.steps` and `smoke.steps`. It
tells adopt, the installer, the delivery skill's scripts and adapters, and the
`appspin-explore` skill what the project is and where it runs. Everything else comes from git, or from the
hosts through the adapters. None of them reads any other key.

| key                          | needed by                              | read by                                | what                                                                                                                                                                                                     |
| ---------------------------- | -------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `standard`                   | every project                          | none; it records the format            | the manifest's version, `2`                                                                                                                                                                              |
| `roles`                      | every project                          | agents, the installer, and the scripts | how the project fills each role it uses; [Roles](#roles) has each role's contract                                                                                                                        |
| `migrate`                    | an App with database migrations        | `promote.mjs`                          | `true` when the task runner has a `migrate` command, which promote runs as [Commands](#commands) says                                                                                                    |
| `ci.required`                | a project with checks besides `verify` | `promote.mjs`                          | checks besides `verify` that promote needs passed on the commit, such as a deploy build's; an App with staging needs the staging gate's `staging-smoke` and `staging-e2e` too, which promote adds itself |
| `subdomain`                  | Cloudflare Apps                        | `cloudflare`                           | the account's `workers.dev` subdomain, for version URLs                                                                                                                                                  |
| `environments.<name>`        | Cloudflare Apps                        | `promote.mjs`, `cloudflare`            | one entry per environment: `production`, which the adapter moves, and `staging`, which turns the staging gate on; a project may add others                                                               |
| `environments.<name>.worker` | Cloudflare Apps                        | `cloudflare`                           | the environment's worker name                                                                                                                                                                            |
| `environments.<name>.origin` | Cloudflare Apps                        | `cloudflare`, `serving.sh`             | where users reach it                                                                                                                                                                                     |
| `environments.<name>.dir`    | Cloudflare Apps, optional              | `cloudflare`                           | the worker's directory, when not the root                                                                                                                                                                |
| `explore.ceiling`            | optional                               | `appspin-explore`                      | the most observations a run may make; 40 when absent                                                                                                                                                     |
| `accounts.signIn`            | signed-in testing                      | `appspin-explore`                      | the project's command that signs a test account in and saves its session                                                                                                                                 |
| `accounts.store`             | signed-in testing, optional            | `appspin-explore`, `accounts.sh`       | the test accounts' links, a gitignored file; `.config/appspin/accounts.json` when absent                                                                                                                 |

`ci.required` lists each further check, such as the deploy's `deploy (production)`, by the
one name CI reports for it on a merge, run by hand, or skipped, so no name is
built from an expression. A check that never ran has not passed, so promote
refuses a required check that is missing or skipped, as well as one that failed.
Promote reads `ci.required` from the clone. A commit that a deploy tag records
passed its checks when it went live, so promote takes that record instead, and going back is never blocked by a check added or renamed since.

The `accounts.signIn` command drives the real sign-in form. It confirms that it
reached a page only a signed-in user sees, or exits non-zero. It saves the
session to a gitignored file, and never takes or prints credentials. A run signs
in again at its start, against the origin it is about to test. When sign-in
fails, the signed-in tests report that they did not run. Where the store's entry
is a private link, the link is the credential: it never appears in the
repository or in any output.

In the staging gate, the `DELIVERY_ACCOUNTS` secret holds the store's content.
The package's `accounts.sh` script, given it as the `ACCOUNTS_JSON` variable,
writes it to the store's path for the run, and only where git ignores that path, on a CI runner that
is discarded after.

The manifest of a Software Package:

```json
{
  "standard": 2,
  "roles": { "repo": "github", "backlog": "github-issues" }
}
```

## Files

Every file the package, or an agent following the standard, puts in a project,
and the files inside the package itself.

### In your project

The files fall into four groups by what writes them. Each group says who owns
its files, and the owner decides later changes.

The "in" column says which projects have each file.

#### The installer's files

The installer updates these on every install, through the skills command line
tool, `npx skills`. It changes only its own skills and
entries, and the rest is yours. If it cannot read the lock file, it installs
nothing. It removes each skill the package no longer ships, printing a
`removed:` line.

| file               | what it is                                      | in            |
| ------------------ | ----------------------------------------------- | ------------- |
| `.agents/skills/`  | the package's skills, for any agent             | every project |
| `.claude/skills/`  | the skills linked for Claude Code               | every project |
| `skills-lock.json` | each installed appspin skill's version and hash | every project |

#### Package pieces

Adopt's script rewrites these on every run, so an edit to one is
lost. Where a piece has a place for your own changes, its row names it.

| file                               | what it is                                                                                                                                                                                                     | in                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `.githooks/pre-push`               | the push hook. Add your own checks as steps of `verify`                                                                                                                                                        | every project       |
| `.github/pull_request_template.md` | the sections every pull request fills. It has no place for a project's own sections: add them in each pull request's body                                                                                      | every project       |
| `.github/workflows/staging.yml`    | an App's staging gate, whose `staging-smoke` and `staging-e2e` checks promote requires. It has no place for changes, because promote looks for those check names                                               | an App with staging |
| `.github/workflows/deploy.yml`     | an App's [deploy](references/cloudflare.md#each-merge): it deploys staging and uploads production's candidate on each merge, and promote requires its `deploy (production)` check. It has no place for changes | a Cloudflare App    |
| `.github/workflows/promote.yml`    | runs the `promote` command with the repository's Cloudflare token, started by the agent on your "yes". It has no place for changes                                                                             | a Cloudflare App    |
| `AGENTS.md`                        | the section between its markers that tells every agent how changes ship. Your own lines go outside the markers                                                                                                 | every project       |

Where a project keeps its hooks in husky's `.husky/` directory, adopt makes
`sh .githooks/pre-push "$@" || exit 1` the first command of the project's
pre-push hook, so the package's hook runs first.

#### Process pieces

Adopt writes each of these when it is missing, and afterwards only proposes
changes. The project owns them. The standard's files sit in the
`.config/appspin/` folder at the repository root. A release that changes their
form or place says in its **Upgrade** line how to move them.

| file                            | what it is                                                                                                         | in                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `.config/appspin/delivery.json` | the project's settings file: which tool fills each role, and the settings that commands read                       | every project                              |
| `.config/appspin/verify.steps`  | the project's checks, one per line: a step's name, then its command                                                | every project                              |
| `Makefile` or `package.json`    | the task runner's `verify`, `smoke`, `e2e`, `promote`, and the rest. Adopt adds only the commands that are missing | every project                              |
| `CLAUDE.md`                     | a pointer that sends Claude Code to `AGENTS.md`                                                                    | every project                              |
| `.github/workflows/*.yml`       | the CI workflow; the deploy, promote, and staging workflows are pieces                                             | with GitHub Actions                        |
| `.config/appspin/smoke.steps`   | the project's probes, one per line: `name  check  ::  control`                                                     | every project                              |
| `.config/appspin/.gitignore`    | keeps the test-account store, `accounts.json`, out of git                                                          | every project                              |
| `e2e/`                          | an App's end-to-end tests and their settings, which `e2e` runs                                                     | an App with web pages or an HTTP interface |
| `.gitleaksignore`               | fixture secrets in the history, so `verify`'s `secrets` step passes                                                | when needed                                |
| `.npmrc`                        | `engine-strict=true`, so `npm ci` refuses a Node other than `package.json`'s `engines`                             | a Node project                             |

#### Written as the work goes

These files come from the work itself. How you develop a change, and the
working files it takes, is yours.

| file              | what it is                                             | in          |
| ----------------- | ------------------------------------------------------ | ----------- |
| `docs/decisions/` | Architectural Decision Records (ADRs)                  | when needed |
| `.explore/`       | an `explore` run's records and report, kept out of git | when needed |

The project owns `docs/decisions/`.

### In the delivery skill

What the delivery skill holds besides its instructions.

- [`references/cloudflare.md`](references/cloudflare.md): the Cloudflare
  Workers with D1 reference an agent follows; your steps are in
  [Set up Cloudflare](how-to.md#set-up-cloudflare).
- `scripts/`: one script per job, listed in [`SKILL.md`](SKILL.md).
- `assets/`: what adopt writes or the agent fills in, in three groups:
  `templates/`, for describing a change, such as
  [`templates/decision.md`](assets/templates/decision.md), the ADR template;
  `agents/`, the agents' instructions; and `checks/`, the starters for `verify`,
  `smoke`, and `e2e`, and the hook and workflows that run them. Who owns each
  file once written is in [In your project](#in-your-project).

## Steps of the lifecycle

Each step in the standard's diagram, what runs there, and the diagram's label
for what lets the change go on, in quotation marks, or what does where the
diagram has none. The standard's phase
sections say the rest.

| phase   | step                 | what runs there                                                                                       | goes on when                                                       |
| ------- | -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Plan    | backlog              | the backlog, with the item template                                                                   | "ready"                                                            |
| Code    | implementation       | the coding role's tool, superpowers by default, with `verify`, and `e2e` on a local copy for an App   | "push": the branch is pushed                                       |
| Code    | feature branch       | cut from `origin/main` and named from the item; the push hook runs `verify`                           | "ready"                                                            |
| Code    | review               | the review role's tool, `appspin-review` by default                                                   | "approved"; "findings" go back to implementation                   |
| Build   | pull request         | the pull request template; CI runs `verify`, and on your word the agent merges it with a merge commit | "merge"                                                            |
| Build   | main branch          | CI runs `verify` again, and the merge builds, away from any developer's machine                       | "build"                                                            |
| Test    | staging              | `smoke` and `e2e`, run by CI; a Software Package's `smoke` installs from the merge instead            | "ok": the checks pass on the merge commit, and you can run promote |
| Release | production candidate | the build's upload, for an App; for a Software Package, the merge commit                              | promote smokes it, then moves production to it                     |
| Deploy  | promote              | an App's migrations, `smoke` on the candidate, the move, `smoke` on production, and the tag           | "promote": promote moves production                                |
| Operate | production           | the build promote moved it to                                                                         | "run": you, or a schedule you set                                  |
| Monitor | explore              | an `explore` run                                                                                      | "findings": what it hands back, for the backlog                    |

## Terms

The words and names the standard and this page use in their own sense.

| term                | meaning                                                                                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| acceptance criteria | the sentences in an item that show its outcome was reached, each with how to check it                                                                                                                                                           |
| adapter             | a JavaScript module in the package that reaches one tool for a role: its functions return an answer or throw                                                                                                                                    |
| adopt               | how a project takes the standard and each update: a script, then an agent's steps                                                                                                                                                               |
| App                 | software that runs; its production is one or more running services                                                                                                                                                                              |
| "approved"          | your word that review is done; it names the commit at the top of the branch                                                                                                                                                                     |
| batch               | several backlog items on one `batch-<slug>` branch that go out in one pull request and, for a Software Package, one version                                                                                                                     |
| `ci.required`       | the checks besides `verify` that promote needs passed; [The manifest](#the-manifest) has the detail                                                                                                                                             |
| control             | a check that must fail on a page that loads, such as looking for the probe's string on a page without it, paired with each `smoke` probe; if the control passes too, the probe is inconclusive, never a pass                                    |
| deploy platform     | the tool that fills the deploy role; it holds each App's candidate                                                                                                                                                                              |
| deploy tag          | `deploy/production/<time>`, with the time in Coordinated Universal Time (UTC): a release that went live and passed smoke on production, and when. An example is `deploy/production/2026-10-23T14-05-09Z`                                        |
| gate                | a check a machine runs the same way every time, which a change or an agent's action must pass to go on                                                                                                                                          |
| harness             | the tool an agent runs in, such as Claude Code                                                                                                                                                                                                  |
| item                | one change in the backlog: its outcome and acceptance criteria                                                                                                                                                                                  |
| judgment            | a decision a person, or an agent, makes by weighing what it reads                                                                                                                                                                               |
| operator            | you: the person who approves the agents' work                                                                                                                                                                                                   |
| package             | the appspin delivery package: the skills and scripts that carry the standard into a project                                                                                                                                                     |
| probe               | one check in `smoke`, paired with a control: for an App, one read-only request to one address, judged by its status and a string; for a Software Package, one check that a commit installs                                                      |
| "ready"             | an item whose outcome and criteria are written, or a branch pushed with `verify` passing                                                                                                                                                        |
| role                | a job a tool must do, such as holding the backlog                                                                                                                                                                                               |
| round judge         | a fresh agent that decides, after each round of review fixes and after each of your revisions, whether another round runs. When the rounds are not converging, or it would say "continue" a third time in a row, it leaves that decision to you |
| **Seen** section    | the section of a pull request that records how the change was shown to work                                                                                                                                                                     |
| Software Package    | software other projects install; its production is its highest release tag, `v<version>`                                                                                                                                                        |
| task runner         | the tool that runs a project's commands, such as make                                                                                                                                                                                           |
| **Upgrade** line    | the line in a pull request that says what a project must do to take the change, or `none`                                                                                                                                                       |

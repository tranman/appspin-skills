---
name: appspin-delivery
description: "Sets up and releases a repository under the appspin delivery standard. Use whenever someone wants the standard adopted in an existing repository, a project adopted after the installer installs or updates the package, Cloudflare Workers with D1 set up as the deploy role, a backlog item drafted from a description, a commit promoted to production or released as a package's tag, a release rolled back, or a failing verify or release step fixed the standard's way, even when \"appspin\" is not named. Not for a one-off workflow, hook, or ticket outside the standard."
license: MIT
compatibility: Requires git, make, bash, node, and npx, on macOS (bash 3.2, BSD userland) or Linux; the GitHub adapters need gh signed in to GitHub. Uses the appspin-review, appspin-explore, and appspin-write skills.
---

# appspin-delivery

The standard is [standard.md](standard.md); this file says how to run each
piece. Do not improvise the standard from memory. Read the reference's
[Roles](reference.md#roles) before calling or writing an adapter, and its
[manifest](reference.md#the-manifest) before reading or writing
`delivery.json`. A project keeps `delivery.json`, `verify.steps`, and
`smoke.steps` in `.config/appspin/`, and every path in
this file to one of them is in that folder.

It uses the package's other three skills: `appspin-review` to review a branch,
`appspin-explore` to explore a running copy, and `appspin-write` for each
document a person reads.

The package is installed and updated by the installer
([the how-to](how-to.md#install-or-update-the-package)). It runs this package's
code from GitHub, so an agent harness that gates remote code will stop it; a
person runs it then. Adopt does not scaffold a web app beyond a trial's
hello-world Worker and the health endpoint the deploy role needs; say so and
stop.

## The scripts

Each lives in `<this skill's directory>/scripts/` and exits as the
[reference](reference.md#commands) says. Report their output as it is, and fix nothing unasked.

| Script                                                           | Does                                                                                                                                                                                                                                  | Exit codes beyond 0                                                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adopt.sh [--check] [repo]`                                      | writes the package's pieces, the `AGENTS.md` block, and `.config/appspin/.gitignore`, and turns the hooks on; on `main`, cuts the `adopt` branch from `origin/main` first; `--check` writes nothing and prints what adopt would write | 1 a problem found, or a refusal, such as a dirty tree, 2 bad usage                                                                                                                 |
| `verify.sh [step...]`                                            | runs the project's `verify.steps` in order, by name, or only the steps named; `verify` calls it                                                                                                                                       | the first failing step's code; 2 no such step; 3 no `verify.steps`                                                                                                                 |
| `smoke.sh <target>`                                              | the project's smoke: runs `smoke.steps`, each probe with its control, against an address, which it waits for, or a commit                                                                                                             | 1 a check failed, 2 inconclusive or no answer, 3 no `smoke.steps` or no probes                                                                                                     |
| `serving.sh <sha> [--now]`                                       | an App's staging gate: waits until staging serves the commit, or with `--now` checks once that it still does; in GitHub Actions it gives the check jobs staging's origin and the task runner                                          | 1 `--now`, and staging serves another commit or did not answer, 2 the deploy never arrived or bad usage, 3 no staging origin; a commit a later merge superseded exits 0, saying so |
| `accounts.sh`                                                    | writes the test accounts from the `ACCOUNTS_JSON` secret to the gitignored store, for a staging check's sign-in                                                                                                                       | 2 a store git does not ignore, or a failed write                                                                                                                                   |
| `deploy.sh env\|account\|subdomain\|staging\|production [<sha>]` | an App's deploy, which its workflows run with the account token: the job's GitHub variables, the account, the `workers.dev` subdomain, or an environment's build and deploy                                                           | 1 a step failed, 2 bad usage or no token                                                                                                                                           |
| `promote.mjs [<sha>] [--patch]`                                  | releases a commit of `main`: a Software Package as its next tag, an App by moving production to its candidate                                                                                                                         | 1 refused before the release, or stopped after it, 2 bad usage or origin unreachable, 3 not set up                                                                                 |

## Adopt

Run it after every install, as the installer's last line says, and whenever
asked. The installer has run already, in the release the operator chose: never
run it again here. Each piece's file, and who owns it, is in the reference's
[Files](reference.md#files). The steps:

1. **Run the script.** `bash .agents/skills/appspin-delivery/scripts/adopt.sh`.
   It rewrites the package's pieces without asking, so move anything worth
   keeping from them into a file of the project's. When the operator is
   changing a role's tool, commit the new tool in `delivery.json` on adopt's
   branch and run the script again; then propose removing what the old tool
   left behind, found by reading the project.
2. **Understand the project:** its stack, tooling, and how they are wired, and
   where they fall short of current practice; propose improvements, never
   impose them. In a repository with no code of its own, first ask, as a
   question of its own, whether they want the [trial](#guide-a-trial) or to
   start their own project; for their own, ask what is being built.
3. **Fill every role.** Keep what the project has, and offer the reference's
   [default](reference.md#roles) for a role it lacks. A Software Package has no
   deploy role. For an App's deploy role, offer the default, Cloudflare Workers
   with D1, which follows [references/cloudflare.md](references/cloudflare.md).
   Ask for the knowledge base's repository on a first adoption. For a tool the
   package has no adapter for, name the [contract](reference.md#roles) clause it
   cannot meet and leave the role unfilled, proposing an adapter for the package
   as a backlog item.
4. **Build the process's pieces the project lacks,** minimal and for its own
   stack, each written only when missing and proposed after that:
   - the CI workflow, `.github/workflows/verify.yml`, from `assets/checks/verify.yml`;
   - the task runner's commands, from `assets/checks/Makefile`;
   - for a Node project, `engines` in `package.json` naming the same Node as
     `.nvmrc`, and `engine-strict=true` in `.npmrc`, so `npm ci` refuses
     another Node;
   - `verify.steps`, from `assets/checks/verify.steps`; a project's own secrets scan
     may stand as `secrets` when it scans history and fails on a planted key;
   - `smoke.steps`, from `assets/checks/smoke.steps`: a probe that installs a
     Software Package from the target, or a probe and a control for each of the
     reference's [four questions](reference.md#commands) for an App;
   - `delivery.json`, as the reference's [manifest](reference.md#the-manifest) says;
   - for an App, `e2e`: ask for its critical flows, write the one the operator
     names with `assets/checks/playwright.config.ts` in Playwright Test, or the project's own tool, and
     propose the rest as items with "Add an e2e test". Playwright Test goes in
     as development dependencies with the lockfile updated, and `setup`
     installs its browser after the hooks line; renaming the App's own
     command for its flows to `e2e` is proposed with its CI job;
   - for an App with staging, a `/health` that reports `commit`; the staging
     gate arrives as step 7 says;
   - an open `explore log` item, empty, where the backlog has none;
   - where the project keeps its hooks in husky's `.husky/`,
     `sh .githooks/pre-push "$@" || exit 1` as its pre-push's first command,
     after any shebang, and `# shellcheck shell=sh` first where it has none;
   - when `secrets` is new in a project with history, a `.gitleaksignore` of
     the fixture secrets it finds, one fingerprint each.

   Formatters and staged-file hooks must skip `.agents/` and the package's
   pieces.

5. **Run the process once,** and record in the pull request's **Seen** what ran
   and what could not yet: `verify`; the hook refusing `main`, with
   `echo "refs/heads/x $(git rev-parse HEAD) refs/heads/main 0000000000000000000000000000000000000000" | sh .githooks/pre-push origin x`,
   and the same into the project's own pre-push where it keeps one; `smoke`
   against staging, or production read-only where there is none; and `e2e`, or
   the App's own command for its flows, against staging or a local copy,
   within its rules for writes. Never skip one quietly. Where the host cannot
   refuse a push to `main` itself, as on a private GitHub repository without a
   paid plan, say so: the push hook stands in, and `git push --no-verify`
   skips it.
6. **Ship it as any change.** Name the host's settings in the pull request
   body, with `Closes: none — package update`: merge commits only, the pull
   request's title and description as the merge commit's message, and each
   merged branch deleted. On the operator's `approved`, apply them without
   asking again, then open the pull request:

   ```sh
   gh api -X PATCH 'repos/{owner}/{repo}' -F allow_merge_commit=true -F allow_squash_merge=false -F allow_rebase_merge=false -F delete_branch_on_merge=true -f merge_commit_title=PR_TITLE -f merge_commit_message=PR_BODY
   ```

7. **Finish on `main`** after the merge, without being asked: run each check
   step 5 could not, and report each result; adoption is done only when they
   all pass, the staging gate's jobs on the merge commit included. A failure is
   fixed on a new branch. An App's `environments.staging` in `delivery.json`
   turns its staging gate on: adopt then writes the gate's workflow, and
   promote requires its `staging-smoke` and `staging-e2e` checks. Adopt's
   branch has it, since the first merge deploys staging. For an App with no
   staging, say once: "with no staging, migrations and the merged build are
   first tested on production". Promote stays the operator's.

**Adopt's boundary** is the [standard's](standard.md#adopt). Beyond the pieces
above, adopt writes `CLAUDE.md` only as a missing pointer to `AGENTS.md`. On an
update, it reads the release the project had from `main`'s lock,
`git show origin/main:skills-lock.json`, and each **Upgrade** line
since, with `git log --first-parent <had>..<installed>` in a clone of
the package. It applies each that still holds, other than `none`, and its **Seen** names each
applied and each that did not hold, or, when that lock names a branch, such as
`main`, that it could not read them. It fixes a process
piece that calls something the package removed, and leaves the rest of a process
piece the project has as it is. Everything else is a proposal in the pull
request.

## Guide a trial

A trial takes a newcomer from an empty folder once round the delivery loop,
through to production, using all four skills. Offer it when adopt runs in a
repository with no code of its own. The newcomer does only what a person must:
sign in, create one token, approve, merge, and say "yes" to each promote.

When they accept, and in every reply after that starts a stage, show the
checklist once, its `◼` on the stage the reply ends in, in this form, in a code block,
the nine stages one per line, each with what they do there, `✔` done, `◼` the current stage, `◻` to come:

```
 Trial (4/9)
 ✔ 1. Install
 ✔ 2. Adopt: starter App, Cloudflare, checks
 ✔ 3. First item: researched, drafted, and filed
 ✔ 4. Build and review
 ◼ 5. Merge: staging deploys, checks run
 ◻ 6. Promote: you say "yes"
 ◻ 7. Explore production
 ◻ 8. Second item
 ◻ 9. The end: keep or delete
```

Then say in two or three sentences what is about to happen and why it matters
in the real loop, and do it. End each stage by saying what they are waiting on
and the exact words they say next, such as "merge". While a review runs, say
what it checks and that it needs nothing from them yet.

A small App needs little checking, so each review in the trial runs one round:
unless round 1's judge says `clean`, give them its verdict and reason and ask
them to say "stop", or "another round". On "stop", write the judge's line as
`- judge at <sha>: stop needs confirmation, confirmed by the operator; <its verdict and reason>; one round for a trial`;
on "another round", go on as `appspin-review` says. An explore run's budget is
10 observations, given in its prompt.

1. **Install,** with the installer's list and the newcomer's one "yes", as
   [the how-to](how-to.md#install-or-update-the-package) says.
2. **Adopt, with the starter.** Ask whether they have an idea of their own;
   otherwise the App is a poll. Create it with Cloudflare's scaffolder in a
   new folder named after the App, in lowercase letters, digits, and dashes:
   `npm create cloudflare@latest -- <app> --type=hello-world --lang=ts --no-deploy --no-git --no-agents`.
   Move its files to the repository's root, and remove the folder, its sample
   test with the `test` script and vitest that run it, and its `deploy`
   script, since a deploy goes only through the workflows; then commit them on
   adopt's branch. Add the `/health` that
   [references/cloudflare.md](references/cloudflare.md) describes. Ask once
   whether they will open the App on this machine or from another, then start
   it and give them its address: `localhost`, or, from another, this machine's
   name, with the App bound by `--ip ::`, which any machine on their network
   can then reach. Keep it running, its local database migrated, until stage
   9, restarting it if it stops, and stop it by process id, never by a pattern,
   which can match the command that runs it, then check that its port is free. Generate its types with
   `wrangler types --strict-vars=false`, so `COMMIT`'s type is a string, not
   the config's placeholder, and set the task runner's `types` command to
   `wrangler types --strict-vars=false --check && node_modules/.bin/tsc --noEmit`.
   Set up Cloudflare as that page says: the token's link, then the addresses.
   Review adopt's branch.
   Adopt's pull request is the agent's report to them before they merge. A
   trial has no knowledge base, so its one research note goes in
   `docs/research/`. The trial's first `e2e` loads the home page. A
   newcomer who asks for a Software Package gets one: no deploy role, no
   token, and no Cloudflare, and they define the first item.
3. **The first item.** Suggest a research topic from what the project must
   do, such as, for the poll, how wording sways answers; they confirm or
   change it. Write the findings for them with `appspin-write`, with one review
   round, and give them its report. Draft the item with them
   as [Draft a backlog item](#draft-a-backlog-item) says: the item is their
   instruction to the agent that builds it, so they approve its wording. The
   poll's is: "A poll with one question and three options, drawing on
   `docs/research/<topic>.md`. A visitor votes and sees the results. The App's README says what it is and how to run it." Its
   criteria bring a D1 table and its migration, an `e2e` test that votes and
   sees the count rise, and the README.
4. **Build and review:** commit the note on the item's branch, and code it with
   no design or plan of the coding role's, since the item is the description
   they approved. Write the README,
   for a reader who was not there, with `appspin-write`. Give them the same address to try the change, then review with `appspin-review`, the note
   listed under its draft body's **Settled** as the trial's, and not reviewed again: its write line is `- write docs/research/<topic>.md at <sha>: reviewed in stage 3`. They say
   "approved", the agent opens the pull request, and when its checks pass they
   say "merge".
5. **Merge:** the deploy workflow deploys staging and uploads the candidate,
   and the staging gate runs; explain each check as it reports.
6. **Promote,** on their "yes": migrate, smoke the candidate, move, smoke
   production, and tag; report each step's result.
7. **Explore** production with `appspin-explore`, as one `claude -p` run that
   loads the Playwright server its **The tools** section names through
   `--mcp-config`, as its **On a schedule** script does, since a session cannot
   add a server. Explain its report to them; only then draft the second item,
   with no research of its own: recommend one vote per browser, which needs a voters table, so its promote runs a migration. They may pick a finding or
   their own; if it needs no migration, say at its promote that `migrate` had
   nothing to run.
8. **The second item,** through stages 4 to 6, with no note.
9. **The end,** once the second promote's steps are reported. List what the trial made: the repository, the two workers and
   their databases, and the token, and the `workers.dev` subdomain where the
   deploy workflow's `subdomain` job said it registered one. If it was only a
   trial, they delete them by hand: `gh auth refresh -h github.com -s
delete_repo`, then `gh repo delete <owner>/<name>`; the workers and databases
   on the Cloudflare dashboard; and the token on its **API Tokens** page. Stop
   the local App, and delete nothing else yourself. If they keep the project,
   give them the token's page, `https://dash.cloudflare.com/profile/api-tokens`,
   and recommend limiting it to the App's two workers, where the page offers
   that, such as with a Workers role on specified workers; its D1 permission
   covers the whole account.

For a Software Package, stage 5 is `verify` on `main`, stage 6 tags the first
`v` release, stage 7 explores the installed release, and stage 9 lists only the
repository.

**Picking up.** When a session opens in a trial whose stage 9 has not run, work
out the stage from the repository, with no prompt and no progress file, and say
where the newcomer is and what comes next, with the checklist shown again.
Releases are tags on origin, read with `git ls-remote --tags origin`:
`deploy/production/*` for an App, `v*` for a Software Package.

An item counts when a merge closed it; an item being built is one open with a
branch or pull request. Leave out the `explore log`. Within stage 8, the
checklist's `◼` stays on 8.

- no `delivery.json` on any branch: stage 1 or 2;
- adopt's branch not merged: stage 2;
- adopt merged, and no item merged: stage 4 if one is being built, else
  stage 3;
- one item merged, and no release since its merge: stage 5 while its merge's
  checks run, then stage 6;
- one item merged and released: stage 8 if an item is being built, else
  stage 7;
- two items merged, and no release since the second's merge: stage 8;
- two items merged, and a release since the second's merge: stage 9;
- a third item merged or being built: the trial is done; work as in any
  project.

## Draft a backlog item

When the operator describes a change and asks for an item:

1. Ask about anything you would otherwise guess, such as who it is for, what
   triggers it, or what counts as done. Draft only after the answers.
2. Draft by the sections, hints, and required fields of the
   [item template](assets/templates/item.md), and of any item form or template the
   project keeps of its own.
   Stay within the operator's words, and mark each assumption as one. Lay the
   file out as the template does, leaving out its comments, the title on the
   first line, because filing takes that line as the title, and leave out an
   optional section you do not know.
3. Start a reviewer in a fresh context, another model where one is to hand,
   with the draft, the operator's words and the forms it follows. Ask it for
   what breaks their rules, vague words, padding, and anything the operator
   never said. Fix, or drop with a reason, each finding.
4. Show the operator the draft and what the review changed. Send any change
   they ask for, beyond a word, back to the reviewer.
5. When the operator says to file it, file it with the backlog's own tool, as
   `roles.backlog` names it, such as `gh issue create` for `github-issues`, and
   give them its id.

## Promote

It checks CI, runs an App's database migrations where the manifest's `migrate`
is `true`, smokes the candidate, releases it, smokes production, and tags the
release in one run; run it only when the operator says so. Run it from the
installed skill, anywhere in the repository:

```sh
node .agents/skills/appspin-delivery/scripts/promote.mjs [<sha>] [--patch]
```

An App promotes in its `promote.yml` workflow instead, which reads the token
from the repository's secrets;
the agent starts it, as below.

A failure before the move changes nothing but what a migration added; after
it, promote prints the go-back command, or, when only the deploy tag failed,
the command that writes it. For an App with staging, the CI it checks always includes the staging
gate's `staging-smoke` and `staging-e2e`. To go
back, see [the how-to](how-to.md#go-back-to-an-earlier-release).

- **A Cloudflare worker's** candidate is the version the merge's deploy
  workflow uploaded for that commit, tagged with it; promote smokes the
  candidate's URL, moves traffic, and smokes the origin. The agent's session
  holds no token: after the operator's "yes", it starts the promote workflow,
  as [references/cloudflare.md](references/cloudflare.md#promote) says.
- **A Software Package,** a project with no deploy role, is released by
  promote itself: it tags the commit with the next `v<version>`, its minor
  number raised, or its patch number with `--patch`, and pushes the tag. It
  refuses a commit before the current release: a package goes back by a revert
  on `main`, released as the next version.

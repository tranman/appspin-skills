# How-to guides

This page gives the steps for each task that is yours, the operator's, in a
project that uses the [appspin delivery standard](standard.md). Your agent does
the rest. The [reference](reference.md#terms) defines the terms the steps use.

- [Install or update the package](#install-or-update-the-package)
- [Adopt a project](#adopt-a-project)
- [Set up Cloudflare](#set-up-cloudflare)
- [Migrate a database](#migrate-a-database)
- [Fix a migration](#fix-a-migration)
- [Set up a clone](#set-up-a-clone)
- [Write a backlog item](#write-a-backlog-item)
- [Review a branch](#review-a-branch)
- [Ship several items in one pull request](#ship-several-items-in-one-pull-request)
- [Make a release](#make-a-release)
- [Go back to an earlier release](#go-back-to-an-earlier-release)

## Install or update the package

The installer puts the package's skills in a folder or repository, and the
same command updates them. Do not edit the skills it installs: the next
install replaces them.

1. If this is an update, read each **Upgrade** line since the release you had,
   before you install: a line can ask for a change before the update. In any
   clone of the package, run:

   ```sh
   git log --first-parent <the tag you had>..<the newest tag>
   ```

   Expected: you know each **Upgrade** line, unless it says `none`. You have
   made each change a line says must come before the update. Adopt applies the
   other lines after the install. If you are not ready for a release, pin the
   one before it in the next step.

2. In the folder or repository, run the installer from an agent session, such as with
   `!` in Claude Code:

   ```sh
   npx github:tranman/appspin-skills            # the latest release
   npx github:tranman/appspin-skills vX.Y.Z     # a pinned release
   ```

   Expected: the version installed, the skills it installed, and a last line;
   or `not installed yet`, with what the folder needs first.
   If adopt's check passed, the line starts `Next: adopt the project` and lists
   any files adopt would write: a missing `CLAUDE.md` or `delivery.json` file,
   and each package piece, a file the package owns, that is missing or differs.
   If the check stopped, the line starts `Next: fix this` and gives the reason,
   such as an `AGENTS.md` file whose package section has a begin marker and no
   end marker.

3. If the installer says `not installed yet`, it lists what the folder needs,
   each with its command. Two steps can be yours: installing GitHub's
   command-line tool `gh`, and signing in with `gh auth login` in a browser.
   Run each step the installer marks as yours, if any, then tell the agent.
   Expected: the agent shows you the rest, with the files the first commit adds.
4. If the commands are what you want, say "yes". Expected: the agent runs them
   and runs the installer again, which installs.
5. If the last line starts `Next: fix this`, fix what it names, then run the
   installer again. If it says
   `skills-lock.json is not a version 1 lock`, it installed nothing: fix that
   file by hand, keeping other packages' entries. Then run the installer again.
   If it says `the skills CLI could not install`, read the reason above it, such
   as no access to the repository on GitHub. Expected: a last line that does
   not start `Next: fix this`.
6. Leave what the installer wrote uncommitted. Expected: the agent starts
   adopt, as [Adopt a project](#adopt-a-project) describes. Adopt's branch
   carries what the installer wrote. On an update, adopt also applies each
   **Upgrade** line since the release you had that still applies. The **Seen**
   section of adopt's pull request names each line it applied and each it
   skipped, or says it could not read them.

## Adopt a project

Adopt sets up the standard's files, and its checks, in a project. An agent runs
it from the delivery skill, `appspin-delivery`. In these cases, start it
yourself:

- If you ran the installer outside an agent session and its last line starts
  `Next: adopt the project`, ask an agent for adopt.
- If you changed a role's tool or a setting in the `delivery.json` file, ask an
  agent for adopt and name the new tool. This needs no install. The agent
  records the new tool on adopt's branch, and the pull request proposes
  removing what the old tool left behind.

Once adopt has started, it works on its own branch, `adopt`.

1. On Cloudflare, do [Set up Cloudflare](#set-up-cloudflare) when the agent
   gives you the token's link. Expected: the agent adds the App's addresses to
   adopt's branch, then stops for your review.
2. Review adopt's branch as in [Review a branch](#review-a-branch), up to the
   point where you say "approved". Expected: the draft pull request body names:
   - each role's tool, and the pieces built
   - what ran, and what could not run yet
   - what adopt proposes for the files it never writes, such as your code and
     docs
   - the settings the agent will apply on the host: merge commits only, the
     pull request's title and description as the merge commit's message, and
     each merged branch deleted
3. Say "approved". It also authorizes those settings. Expected: the agent
   applies them, then opens the pull request.

4. If your tests sign in, set the `DELIVERY_ACCOUNTS` repository secret to the
   content of your test-account store, `.config/appspin/accounts.json` unless
   the `accounts.store` key names another file, before the staging workflow
   first runs. Expected: the secret is listed in the repository's Actions
   secrets.
5. When the checks pass, say "merge". Expected: the agent merges it, then
   runs each check that could not run
   before the merge and reports it, the staging gate's `staging-smoke` and
   `staging-e2e` included. If one fails, the agent opens a branch to fix it,
   and adoption is not done until every check passes.

Without an agent, `bash .agents/skills/appspin-delivery/scripts/adopt.sh` writes
the package's pieces and a missing `CLAUDE.md` file, turns the push hook on,
and cuts adopt's branch. The delivery skill's other steps need an agent.

## Set up Cloudflare

An App on Cloudflare Workers deploys through two of the package's GitHub
Actions workflows, with one Cloudflare token kept as a secret of the
repository. A new App's first merge creates its two workers, `<app>` and
`<app>-staging`, and any database they bind. You take these steps once per App,
and the agent does the rest.

1. If you have no Cloudflare account, create one. Expected: you can sign in to
   the Cloudflare dashboard.
2. Open the link the agent gives you. It opens the **API Tokens** page with the
   token's name filled in. It also fills in three permissions: Workers Scripts
   and D1, each to edit, and Account Settings to read. Expected: the form shows
   them.
3. For a new App, keep **Entire Account**, since its workers do not exist yet;
   for an App already on Workers, pick its workers. Create the token. Expected:
   Cloudflare shows the token once.
4. In a terminal of your own, not the agent's, at the repository's folder, run
   `gh secret set CLOUDFLARE_API_TOKEN` and paste the token at its prompt. When
   the agent runs it, Claude Code's `!` included, gh gets no input and stores
   an empty secret.
   Never paste it into the agent's chat: it can deploy the App's workers, or for a
   new App every worker in the account, and reach every database in the
   account. Expected: `gh secret list` names
   `CLOUDFLARE_API_TOKEN`, and the agent goes on with adopt.
5. If the App's build or its migrations read variables or secrets, such as a
   public key or a database's address, set each in the repository's
   `staging` and `production` environments, under **Settings**,
   **Environments**, never as a repository secret, which both environments'
   jobs read. Expected: each environment lists them.

## Migrate a database

Steps 1 to 3 set this up once for an App with a database on D1, or on Supabase
with the App on Cloudflare Workers. Step 4 runs on each branch. Each
migration only adds, as the [standard](standard.md#database-migrations) says.
Each merge's deploy runs `migrate` on staging before staging deploys, and
promote runs it on production before the candidate's smoke.

1. Add a `migrate` command that applies the migrations to the environment
   `CLOUDFLARE_ENV` names, staging or, when it is empty, production. With D1,
   where `DB` is the database's binding name in the wrangler config, wrangler
   reads it itself:

   ```make
   migrate:
   	@npx wrangler d1 migrations apply DB --remote
   ```

   The workflows run it with no terminal, so if you change the command, the
   command must fail, not prompt, when a secret is missing. A prompt with no
   input can exit 0, which reads as a pass. Expected: `make -n migrate` prints
   the command.

2. Add `"migrate": true` to the `delivery.json` file. Expected: the next
   merge's `deploy (staging)` log shows the migrations applied before the
   deploy, and your next promote prints a `migrate` line.
3. With Supabase:
   - For staging's and production's database addresses, use Supabase's session
     pooler, on port 5432. The direct address works only over IPv6, which many
     hosts lack.
   - Add the `supabase` package, its command-line tool, to the `package.json`
     file's `devDependencies`, so `npx` runs the version you pinned. The
     `migrate` command is
     `@npx supabase db push --yes --db-url "$${DATABASE_URL:?}"`, where `$$` is
     make's `$`. In an npm script, it is
     `"migrate": "supabase db push --yes --db-url \"${DATABASE_URL:?}\""`. The
     `:?` makes the command fail when the variable is empty or unset.
   - Set `DATABASE_URL` as a secret in each of the repository's `staging` and
     `production` environments, to that environment's address, as in step 5
     of [Set up Cloudflare](#set-up-cloudflare).

   Expected: the next merge's `deploy (staging)` log shows the migrations
   applied, and promote's next `migrate` line passes.

4. If the branch has migrations, the agent applies them to the local copy's
   own database before each push, then runs `e2e`. With D1, the command is
   `npx wrangler d1 migrations apply DB --local`. With Supabase,
   `npx supabase start` starts the local stack, then `npx supabase migration up`
   applies them. Expected: the pull request's **Seen** names the migrations applied
   locally.

## Fix a migration

1. If staging's migration failed, fix the file on a branch, since a failed file
   isn't recorded as run. Expected: the next merge's deploy applies it.
2. If promote refused with `the migration failed.`, the file usually meets data
   that staging lacks. Fix that data by hand, or change the file so that it runs
   and makes the same tables and columns. Expected: the next promote's `migrate`
   line passes.
3. If a migration ran but is wrong, add a new one that adds the right column.
   Expected: the next merge's deploy applies it.
4. If a migration damaged production's data, go back to the release before it,
   as in [Go back to an earlier release](#go-back-to-an-earlier-release), then
   restore the database to a time before the migration ran:
   `npx wrangler d1 time-travel restore DB --timestamp=<time>`, or Supabase's
   dashboard. A restore loses every later write, and the database no longer
   records the file as run, so change the file so that it does no harm before
   you promote again. Expected: the damaged rows hold their earlier values.

## Set up a clone

The push hook, the file `.githooks/pre-push`, runs only in a clone where it is
turned on, and a clone holds no secrets. The clone adopt ran in already has the
hook on.

1. After cloning an adopted repository, run `setup` once with the task runner,
   the tool that runs the project's commands, such as make.
   Expected: the push hook is on, and a push runs `verify`, the project's
   checks.
2. Keep each secret in your password manager, and inject it when a command
   runs, such as with 1Password's `op run --env-file=.env.tpl -- make dev`,
   where `.env.tpl` holds references, not values. A secret in no file is out of
   every agent's reach. Expected: the clone's
   env files hold references, such as `op://…`, and no values.

## Write a backlog item

An item tells the agent what to build and how to show it is done. You describe
the change and an agent drafts the item. A second agent, one that has not seen
your conversation, checks the draft, and you review it before it is filed.

1. Write the change in a sentence or two: what should be true, and why. For a
   bug, add what you did, what you expected, and what happened. Expected: a
   description that makes sense without the conversation around it.
2. Send it to the agent and ask for a backlog item. Expected: the agent asks
   about anything it would otherwise guess.
3. Answer any questions. Expected: a draft with an **Outcome** and three to
   seven **Acceptance criteria**, and a note of what the review changed.
4. Reread your description. Expected: you can say what you asked for, without
   the draft in front of you.
5. Check the draft. A criterion starts with "When" for what should happen, or
   "If" for what goes wrong. It says how to check it: a page or command, a
   concrete input, and what passes. Check the draft for these faults, in this
   order:
   1. a vague word, such as "fast" where a number belongs, or a criterion with
      no concrete input or result
   2. a line you would not miss, scope beyond what you described, or an item
      longer than one screen
   3. no "If" for what can go wrong, or no reason where the reason is not
      obvious
   4. anything you never said, including an unmarked assumption
   5. a "Keep a test" where a wrong answer would be noticed anyway
   6. an "Add an e2e test", an end-to-end test, for a flow a user need not
      always be able to do, or for a fixed bug that is not about how the parts
      fit together

   Expected: a list of changes to ask for, or none.

6. If you have changes, ask for each. Expected: the agent revises the draft, and
   the reviewer checks any change larger than a word. Repeat steps 5 and 6 until
   you have no changes.
7. Say "file it". Expected: the agent files the item and gives you its id, and
   the item's status is "ready".

If you would rather write the item yourself, send it to the agent as your
description in step 2. The agent then drafts from it, has the draft reviewed,
and shows you the result.

## Review a branch

The agent reviews first, in rounds. After each round, the round judge, a fresh
agent, decides whether another runs, or leaves that decision to you. When the
rounds end, the agent stops and gives you the compare link and the draft
pull request body. The body's **Review** section has a line for each review,
with the commit it read and what became of each finding.

1. If the agent asks whether another round runs, read the judge's reason, then
   answer. It asks when the rounds are not converging, or when the judge would
   otherwise say "continue" a third time in a row.
   Expected: the agent runs another round on only what the judge's reason
   names, or records your confirmed stop.
2. Read the draft body's **Design** section, which says what changes and why,
   then how. Its **Settled** list, if there is one, holds each finding the agent
   dropped twice, with the reason, and later reviews do not raise those again.
   Expected: you know whether the approach is right. If it is wrong, stop the
   branch and send the item back to the backlog or to planning, because revising
   the code cannot fix it.
3. Read the **Review** section. Overturn what became of any finding you disagree
   with. Expected: each finding's outcome is one you agree with.
4. Read the diff for its wording, the screens of a user interface change, and
   the **Upgrade** line. Expected: a list of things to ask, or none.
5. Ask. The agent revises and pushes. Repeat until nothing is left to ask.
   Expected: after each revision, the agent reports the round judge's verdict
   or, as in step 1, asks you whether another round runs.
6. Say "approved". The word names the commit at the top of the branch. Expected:
   the agent records it as the first line of the **Review** section, with the
   change's size, and opens the pull request. If you say it before you have the
   compare link and the **Review** section, the agent does not record it, gives
   you both, and asks for "approved" again. After "approved", a push to the
   branch reopens review.
7. When the checks on the pull request pass, and a second person has approved
   where your team has one, say "merge". Expected: the agent merges it, and
   the repository host deletes the
   branch, by the settings adopt applied.

## Ship several items in one pull request

A batch builds several small items on one branch and ships them in one pull
request and, for a Software Package, one version. No small change then needs a
release of its own.

1. Give the agent the items as one batch, such as "Build #12, #14, and #15 as
   one batch." Expected: one branch, `batch-<slug>`, with each item's commits on
   it. The agent gives each item one round of review as it builds it, and stops
   for you only after reviewing the whole branch.
2. Review the whole branch as in [Review a branch](#review-a-branch).
   Expected: the pull request has a **Closes** line for each item.

To turn each item's review off, add a line to your `AGENTS.md` file, outside
the package's section. An example is "Review a batch only as a whole."

## Make a release

A release moves production to the newest commit on `main`, once that commit
passes its checks. Continuous integration (CI) checks the commit. Then `smoke`,
the check that a running copy is up and working, checks the candidate: the build
or commit that production can move to. For a Software Package, production is its
highest release tag, and promote tags the next one: the minor number raised by
one, or the patch number with `make promote ARGS=--patch`.

You decide when to release. For an App, say "yes" to the agent: it starts the
promote workflow, which reads the token from the repository's secrets, and
reports each line. For a Software
Package, run the task runner's `promote` command, with make `make promote`, or
ask the agent to run it. Either way it runs only when you say so. Where the
steps below run promote, they mean that.

1. Run `promote`. Expected: one line per check and its result. For an App, the
   `migrate` command's output under its line when promote runs it, then the
   deploy tag promote wrote, then `production now serves <id>`. For a Software
   Package, `released v<version>`.

2. If promote prints `stopped after the move:`, or for a Software Package
   `stopped after the release:`, read the output under it for the
   cause. Expected: for an App, production stays where the move left it; for a
   Software Package, the tag stays on origin.
3. If the cause is in the product, or you cannot name it, run the go-back
   command promote printed. For a Software Package, that is a revert on `main`,
   released as the next version. If promote printed that there is no release to go
   back to, fix forward instead, as in step 5. Expected: production serves the
   release that command names.
4. If the cause is outside the check and the product, such as the host's error
   page, record it as a comment on the commit. Then run `promote <sha>` with the
   commit promote moved to. Expected: `smoke` on production, then the tag. A
   Software Package skips this step: its release stands, so revert as in step 3
   or fix forward as in step 5.
5. If the cause is in the product or the check, fix it on a branch. Expected: a
   pull request that carries the fix.

## Go back to an earlier release

Go back when a release breaks production. For an App, going back promotes an
older commit, which you name by its hash, `<sha>`, through the agent as in
[Make a release](#make-a-release). A Software Package's release tag never
moves, so it goes back by a revert on `main`, released as the next version.
While the revert is in review, anyone who needs the earlier release pins its
tag, as in [Install or update the package](#install-or-update-the-package).

For an App:

1. Find the commit to go back to. If promote printed a go-back command, use its
   `<sha>`. Otherwise, list the deploy tags, newest last:

   ```sh
   git fetch origin 'refs/tags/deploy/production/*:refs/tags/deploy/production/*'
   git tag -l -n5 'deploy/production/*'
   ```

   Expected: each tag's name, then its `version` line. Each records a release
   that passed smoke. Choose the newest tag from before the broken release. Its
   name works in place of `<sha>`.

2. Tell the agent "yes" to promote `<sha>`. Expected: the same lines as a release, ending with
   `production now serves <id>`.

Going back leaves the database as it is: the older build runs on it, since
each migration only adds. To ship a fix, merge it in a new pull request. Then
make a release.

---
name: appspin-explore
description: "Explores a running product, a page, endpoint, command, job, or skill, to find what could be broken, and returns one report. Use when asked to explore, run exploratory testing, try to break a feature, test a fix by using the product, or find what could be broken in a flow, on staging or production, when a project's routine asks for an explore run, or when asked to schedule explore runs. Not for writing automated tests, explaining code, audits such as Lighthouse, or debugging a known bug; it never fixes, files, comments, or commits."
license: MIT
compatibility: The default shape needs Playwright MCP through npx, and a Chromium or Chrome; Claude in Chrome needs the extension in the operator's open Chrome and a paid plan. A backlog's own tool reads its memory where one is named; delivery.json, only when the project has one, supplies addresses, the ceiling, the test accounts, and the backlog.
allowed-tools: Bash Read Write Edit Glob Grep AskUserQuestion
---

# appspin-explore

A run walks a product one observation at a time within a budget and returns
one report. It never gates, never fixes, and writes only as a test may; its
one other write is its block in its memory's log. The explorer's
instructions are [references/brief.md](references/brief.md).

## The tools

A run drives a browser in one of two shapes. The default is Playwright MCP,
which runs headless and unattended, and can act on a page between
observations, such as clicking through a flow. Its server is the
project's, named `playwright`, pinned to a version, with these options:

```json
{"mcpServers": {"playwright": {"command": "npx", "args": [
  "-y", "@playwright/mcp@0.0.83", "--headless", "--isolated",
  "--executable-path", "<the machine's Chromium or Chrome>",
  "--storage-state", "<the session the project's sign-in saved>",
  "--blocked-origins", "<the analytics and ad origins, separated by semicolons>",
  "--console-level", "error", "--image-responses", "omit", "--output-dir", ".explore"]}}}
```

Leave out `--executable-path` where Google Chrome is installed, its default,
and `--storage-state` for a run that never signs in. An App whose session is a
key in the page address, such as a private link, has no session
`--storage-state` can carry, and every snapshot would show the key. Unless the
App trades the link for a cookie, the run walks only what needs no key, and
Context names what it could not reach. Block only analytics and
ads: a list of allowed origins also blocks what the page needs, such as its
sign-in service and fonts, and its findings are then false. A run that checks
a narrow width emulates a phone through a second server with `--device`, such
as `"iPhone 15"`.

Choose Claude in Chrome only with a person present: it drives their own
signed-in Chrome, so a wall the saved session cannot pass, such as two-factor
sign-in, is theirs to pass, and their sessions on other sites are in reach, so
they sign in as the project's test account first.

No option keeps the agent from a session's tokens, which the page can read; a
private sign-in link stays out of reach because only the project's sign-in
script opens it.

## On a schedule

A scheduled run starts on the operator's machine, from a systemd or launchd
timer, through `claude -p`; a cloud routine has proved less reliable. Setting
one up is not a run, and writes outside `.explore/`. Asked to, write the timer
and a script it starts. The timer names in its `PATH` the directories that hold
claude, node, and npx, since a timer reads no shell setup; bounds a run's time,
such as with `TimeoutStartSec` on a systemd `Type=oneshot` service; sends the
script's output where the operator looks; and, on macOS, has no `KeepAlive` or
`RunAtLoad`, and is loaded with `launchctl bootstrap`, never `launchctl
submit`, which keeps the job alive and reruns it. The script:

- writes `.explore/.gitignore` when there is none, then, for signed-in pages,
  runs the project's sign-in, since a saved session expires, and stops on its
  failure;
- runs `claude -p` with `--permission-prompts none`, so a prompt is denied
  rather than waited on, `--disallowedTools AskUserQuestion`, since no one
  answers, `--no-session-persistence`, the browser's servers from a config file
  of the project's own, passed with `--mcp-config` and `--strict-mcp-config`,
  never `.mcp.json`, which loads them into every session, and `--allowedTools`
  with `mcp__<server>` for each server the config names, `Skill(appspin-explore)`,
  `Write(.explore/**)`, and `Edit(.explore/**)`. Allowed tools add to the
  settings' and are no sandbox: read-only shell commands such as `curl` run
  unasked, so the run's credentials are its limit;
- fails visibly, since a failed run still reports success: on a non-zero exit,
  no `init` or result line in the run's `--output-format stream-json --verbose`
  output, a server not `connected` in the `init` line's `mcp_servers`, a result
  whose subtype is not `success` or with `is_error`, any
  `permission_denials`, or no new `.explore/report.md`, or one whose first line
  says `Blocked:`, as text, emphasis, or a heading.

## A run

1. **Take what it is given.** Where to run: a copy of the product, by an address
   in `delivery.json`, when the project has one, or one given; never guessed,
   since a guess can land on production. Optionally, where to start: a named
   part, the parts a change touches, or the flows the project's `e2e` tests
   cover; a start is where the run begins, not a list it sweeps each run.
   Optionally, the shape that drives the browser, when not the default.
   Optionally, context: what is already known. That is earlier reports (the last
   is in `.explore/report.md`; a routine in a fresh checkout has none, so it
   passes the last report in or relies on its memory, which only a backlog keeps
   across checkouts), the change in hand, what the operator says, and the run's
   memory. The memory is in one place: the backlog the caller names, else
   `delivery.json`'s `roles.backlog`, read with the backlog's own tool;
   otherwise `.explore/memory.md`, which git ignores. The memory is
   three records: the non-problems, each with a `Key:` line and a `Re-check:`
   line at the top of its body; the open findings, each with
   `Found by: explore, <date>, <copy>` as the first line below its title; and
   the log, which holds the last runs' blocks. In a backlog they are the items
   closed as won't do, the open items, and the open `explore log` item; in
   `memory.md`, its `# Non-problems`, `# Open findings`, and `# Log` sections.
   Say what context there was; a first run has none. Where a named backlog cannot be reached, Context
   says the run had no memory, Re-checked is empty, and step 4 writes no log.
2. **Choose the budget:** a number of observations, explained in a line, no
   more than the ceiling (`delivery.json`'s `explore.ceiling`, else the
   caller's, else 40). Past it, ask when someone is present; otherwise suggest a
   new ceiling in the report.
3. **Walk,** following the brief: one observation at a time, each choosing the
   next. First write a `.explore/.gitignore` holding `*` when there is none,
   since the browser saves what it sees there. Where the harness can, start a
   fresh-context agent with the brief and what step 1 took, so the walk
   carries none of the caller's assumptions; otherwise follow the brief
   yourself. Sign in only as the project's test
   accounts, through its sign-in command, `delivery.json`'s `accounts.signIn`
   or one given; their store is `delivery.json`'s `accounts.store`, else
   `.config/appspin/accounts.json` where `delivery.json` exists, else
   `.explore/accounts.json`. A sign-in that saves sessions in `.auth/` needs
   `.auth/` in the root `.gitignore`.
4. **Report.** Write `report.md` into the `.explore/` the run works from, and
   return it in the session, in the brief's shape; when the agent that
   walked cannot write files (a Claude Code subagent cannot), the caller writes
   the report from what it returned. A project that runs a formatter lists
   `.explore/` in its root `.gitignore` too, since formatters read only that
   one. Then the caller, never the explorer, rewrites the log where step 1 found
   the memory: the `explore log` item with the backlog's own tool, or
   `memory.md`'s `# Log`, creating the file when there is none. Read it again,
   so a run that ended meanwhile keeps its block; put this run's block first, in
   the shape below; keep at most 30 blocks, dropping the oldest while the host
   refuses the body as too long, and stop and report on any other refusal. A run
   whose backlog has no such item writes none.
   File, comment and commit nothing else: the operator, or an agent they set up,
   decides what becomes of a finding, and a wanted one becomes an open finding
   where the memory is, whose body starts with
   `Found by: explore, <date>, <copy>`, where `<copy>` is the environment and
   the version id the run tested, so the next run reads it as an open finding.

   ```
   ## <date> <copy> <commit it served, when known>
   Walked: <each page or part, with its width and account where they matter>
   Re-checked: <each open finding, still happens or gone; each non-problem due>
   ```

Apply the brief's leak rule to the report and the log block before either
leaves the run.

# The reviewer's brief

You are reviewing a feature branch you did not write. You have three things:
what the change was meant to do, the diff, and the project's `AGENTS.md`. You
may read the rest of the codebase.

Read the intent first — the spec, or the pull request body when that holds the
design, and the author's own account. A branch that carries several items has an
intent per item; check each, and how the items interact. Do not raise a finding
the Design lists under **Settled**. Then work through this checklist, every line
of the diff in view, and report on every item, "nothing found" included, so
nothing is left to a later round:

1. **The description.** The issue, Design and Seen are each present, and an
   `Upgrade:` line where the project's template or `AGENTS.md` asks for one.
2. **The acceptance criteria.** Re-run each check yourself where that is cheap
   and safe — a dry run, a page, an endpoint, on a local or staging copy —
   and record what you saw. A result that differs from the author's Seen is a
   finding. A check you cannot run safely, such as one that writes to
   production, name with why.
3. **Design and correctness.** Does it do the right thing, the way this
   codebase does things? Defects. What generated code gets wrong: imports and
   the lockfile, APIs that look right, constraints ignored.
4. **Every addition** — a file, function, abstraction, option, dependency,
   check, test or document: cut it when the item did not ask for it, it
   handles a case that cannot happen, it is an abstraction used once, it
   duplicates something that exists, or it serves a need nobody has yet;
   simplify it when fewer parts or lines do the same job; keep only what the
   acceptance criteria need. Then every added line, code or prose: shorten it
   when fewer words say the same, cut it when a line, table or file nearby
   already says it. Each cut or simplification is a finding with the simpler
   version.
5. **Every comment in the hunks the branch touches**, old or new (read
   `git diff -U6 <base>...HEAD`, unchanged lines included): one line, giving
   a reason a reader would otherwise miss. Cut it when it repeats what the
   code or the commit message says, narrates history, cites a spec, or
   describes or justifies the diff (code removed, why it changed). Rewrite a
   keeper that runs past one line. A cut or rewrite is a finding with the new
   text.
6. **Every kept test** matches an acceptance criterion that says "keep a
   test"; any other is a finding. A design or plan the branch wrote and still
   carries is a finding too. Neither is a finding where the project's
   `AGENTS.md` keeps them.
7. **Every change to enforcement code** (promote, gates):
   the rule it touches is named, and it still refuses what it did.
8. **Private details** across the whole diff — code, comments, docs, commit
   messages: nothing reveals the private details of another project, a
   customer, or a person, and examples use invented names.
9. **Every changed skill** meets the Agent Skills specification,
   `docs/specification.mdx` at `agentskills/agentskills@217be54`: a departure
   is a finding with the rule it breaks.
10. **Security.** Secrets, injection, auth and data paths.
11. **The product, observed,** when the change shows in it: rendered or run,
    not judged from the code.
12. **The project's own instructions** in `AGENTS.md`, read whole: the diff
    follows them. Text the change made untrue, here or elsewhere, is a
    finding.
13. **Every document the branch adds or edits that a person reads**, one of
    the kinds `appspin-write`'s `references/rules.md` lists, read against
    that file with the kind, reader, and job the author stated in the draft
    pull request body's Design, or the kind's default reader when none is
    stated, and the project's `## Writing conventions`; where `appspin-write`
    is not installed, the project's conventions alone. A departure is a
    finding with the rule it breaks.

Return the checklist with each item's result, then the findings as a short
ranked list: each with file:line and the one-sentence reason; nothing you
cannot point at. Mark a matter of taste as one.

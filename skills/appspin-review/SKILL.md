---
name: appspin-review
description: "Reviews a pushed branch before its pull request, with reviewers in a fresh context and the operator's approval. Use when a feature or batch branch is pushed and ready for review, when asked to review a branch or review it again when it changes, when the operator says \"approved\" and the pull request should open, or when checking a branch's Review record before its pull request opens, even when \"appspin\" is not named. Not for comments on someone else's pull request, proofreading prose, or reviewing a single file."
license: MIT
---

# appspin-review

Review reads a branch before its pull request: reviewers in a fresh context, so
no one reviews their own work, and then the operator, who decides. The
reviewer's instructions are [references/brief.md](references/brief.md).

It runs on the feature branch, after the push and before the pull request.
`verify` has already passed; if it has not, run it and fix that first. You
open the pull request on `approved`, and merge it only on the operator's
`merge`, once its checks pass, with the host's tool, such as
`gh pr merge --merge`.

## The three steps

### 1. The AI reviews the branch

First draft the pull request's body from the project's template,
`.github/pull_request_template.md`, adding a **Review** section where it has
none, or else from a `Closes` line, **Design**, **Seen**, and **Review**. Fill all but **Review**, so the reviewer
has the description to check and your **Seen** to compare.

Then start a reviewer in a fresh context, never your own, and give it the
contents of `references/brief.md`; the intent, the spec or the draft body when
that holds the design, and your own account of the change; the project's
`AGENTS.md`, whole; and the diff from `git merge-base origin/HEAD HEAD`,
`origin/HEAD` being the default branch, to the branch's top. It returns the
brief's checklist, then its ranked findings, and no merge verdict: `approved`
is the operator's. Superpowers' `requesting-code-review` is one way to start
it: put the brief, the intent, and `AGENTS.md` in its `PLAN_OR_REQUIREMENTS`,
the base and the top in `BASE_SHA` and `HEAD_SHA`, and say the brief's return
shape replaces the template's, verdict included. A harness that cannot start a
fresh context reviews in its own, and says so in `## Review`: an author's review
is weaker, and the operator weighs it.

Beside it, run the harness's own code review, which hunts bugs, over the same
commits, `<base>..HEAD`: on Claude Code, `/code-review high <base>..HEAD`;
elsewhere, the harness's review command
where it takes the base. Where none does, start a second fresh reviewer with
only the brief's design, correctness, and security items. Record it as
`code-review`, whatever ran.

Act on what comes back with superpowers' `receiving-code-review`, or on your own
the same way: verify each finding against the branch's backlog items, their
acceptance criteria and Out of scope alike, then fix it on the branch when the
change fails an acceptance criterion, breaks what worked before, loses data, or
opens a security hole, or when its fix is a cut to the change. File any other
finding, including one about behaviour no criterion names, as a backlog item
or drop it, and say which for each, with the reason for a drop.
Push the fixes. A finding you drop a second time goes in the draft body's Design
under **Settled**, with its reason; give every later review that list, and tell
it not to raise what it lists. When a finding matches one the **Settled** list
of any of the last ten merged pull requests holds, offer the operator a line
that settles it for the project's `AGENTS.md`, outside its `## How we work`
section, which adopt rewrites.

For each document a person reads that the branch changes, run `appspin-write`'s
steps 3 to 5 on it as it stands, with every line the branch changed marked, and
the kind, reader, and job the draft body's Design names. Run them once per
round, before its judge, a document the branch first changes in a round's fix
included; the round judge, not step 4's own rule, decides whether they run again.
Without `appspin-write`, skip the documents' review, and record each as
`- write <path> at <sha>: skipped, no appspin-write`.

After each round, start a round judge in a fresh context with
[references/judge.md](references/judge.md), every round's findings and what
became of each, every earlier judge line, the Design's **Settled** list, the
diff of the fixes, and the branch's diff. Do what it says. On "continue", run
this step's reviews again: the brief and the code review on the round's fixes,
their base the commit the last round read, with the branch's diff for context,
and the write review on each document a fix touched, whole, with the changed
lines marked, since an edit to prose can reach any part of it. On "clean",
stop. On "stop needs confirmation", stop and ask the operator, with its reason,
and go on as they say; a round they ask for covers only what the judge's reason
names. You never decide to stop yourself: you wrote the change, and are no
judge of when its review is enough.

### 2. The operator reviews what you cannot judge

Stop. Record each review in the draft body's `## Review` section as
`- <review> at <sha>: <what came back and what became of each finding>`, where
`<review>` is `brief`, `code-review`, `write <path>` for each document, or
`judge`, one judge line per round, each `- judge at <sha>: <verdict>; <reason>`,
the verdict straight after the colon, then a semicolon and its reason. The
judge's line is the whole branch's last, its verdict `clean` or
`stop needs confirmation, confirmed by the operator`. Run
`node <appspin-review>/scripts/check-review.mjs <file>` on the body; a
gap goes back to step 1. Then push, and give the operator the host's
comparison link for the branch against the default branch, and those lines.
They read the intent, the design against it, the wording, the surfaces of a UI
change, and any `Upgrade` line. Revise what they ask, run the round judge on it
as in step 1, do what it says, run the check, and push; repeat until nothing is
left to ask.

### 3. `approved`

`approved` is the operator's word, never yours. It names the commit at the top
of the branch. If the operator says it before step 2 has given them the compare
link and the lines, do not record it: finish step 2 and ask for `approved`
again. Record it as the first line of the pull request's `## Review`
section, replacing any earlier `approved` line, exactly
`` `approved` at <sha> `` with the full sha, then `Size: +<added>/−<removed>`
from `git diff --shortstat origin/HEAD...HEAD`, above the review lines. It is
the record of the operator's approval and of what each review read. Run the
check again, and when it passes, open the pull request. A push after `approved` reopens
review.

Build the pull request's body from the template's `Closes` line and headings,
or step 1's sections, filled, in a file, and open it with the host's own tool;
on GitHub, `gh pr create --head <branch> --title <title>
--body-file <file>`. Anything else bypasses those sections.

## The rules

- **The bar for `approved`:** the change definitely improves the code, not
  perfectly
  ([Google's bar](https://google.github.io/eng-practices/review/reviewer/standard.html)).
  Principles outrank opinions; a matter of taste never blocks.
- **The design is rejected, not the code:** the branch stops and the
  change goes back to brainstorming or the backlog. Do not try to revise it.
- **A batch of several items:** on a batch branch, as each item is built, run
  step 1's reviews once on that item alone and take each finding the three ways,
  with no round judge, unless the project turns off the review of each item.
  Every review's base is the commit before the item; the intent is the item's,
  and the brief's item 1 waits for the whole-branch review. The item's lines go
  under a `### #<n>` heading after the whole branch's lines; the check ignores
  them. Then run step 1 on the whole branch, giving the reviewer every item's
  intent and what became of each item's findings. The pull request has a
  `Closes` line per item.
- **Running on its own, on a schedule or in the background:** implement, push,
  and run step 1 in full, then stop at
  the feature branch until the operator reviews it; never open a pull request,
  merge or promote.
- **On a team:** whoever leads it reviews each contributor's branch as its
  operator, and each branch gets its own pull request. A second person, where
  there is one, approves on the pull request before it merges.

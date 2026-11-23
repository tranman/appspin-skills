---
name: appspin-write
description: "Use when a task writes or edits a document that a person reads: a README, a tutorial, a how-to, a reference page, or an explanation, including research notes and decision records. Use for a one-paragraph change as much as a new page, and whenever asked to write up, document, or explain something in a file. Not for a spec, a skill, an AGENTS.md, a pull request body, or a commit message."
license: MIT
---

# appspin-write

A document written for a person is written to that person: named before the
first word, and checked by a reader who was not in the room. The rules are
[references/rules.md](references/rules.md). Write only the document the task
asked for.

## The five steps

Run them in order, for a new document and for a one-sentence change alike. A
change to one paragraph goes through all five because the paragraph sits in a
section the reader reads whole.

**1. Name the document.** Three lines, before any drafting: the kind, from
the table in `references/rules.md`; the reader, the table's default unless
the task says otherwise; the job, one sentence. When the task gives none of
the three and you cannot tell, ask, and write nothing until you have them.
Without a named reader the draft is written for its author, which is the
failure this skill exists to stop.

**2. Draft against the rules.** Read `references/rules.md`, and the
`## Writing conventions` section of the project's `AGENTS.md` if it has one.
Draft with both in view.

**3. Check your own work.** Run the script on every file you changed:

```
node .agents/skills/appspin-write/scripts/check-prose.mjs <file.md>...
```

The script is in this skill's `scripts/` directory; the path above is where
the package installs it. Expected: `ok`, with or without a `signals:` section.
Fix each rule break and run it again until you see `ok`. Take each signal as
`references/rules.md` says. Then read every paragraph you wrote or edited
against the rules, one rule at a time. When the person who asked wants one
paragraph changed, read the whole section it sits in the same way, and name
that section in the report.

**4. A reviewer in a fresh context reads it.** Start a reviewer that has not
seen your session. Give it only the whole document, marking the lines changed
since the last review, your three lines from step 1, `references/rules.md`, and
the project's conventions. When the change mostly removes text, give it the
earlier version too. Ask for five things: the rule breaks it finds; the
signals; what elsewhere in the document the changed lines disagree with or
repeat, or, given the earlier version, what the reader lost; where the reading
jumps or stumbles and where words are spent for nothing, ranked by how much
each hurts, since clarity comes before a specific size; and two answers as the
named reader, whether it can say what the document is for after reading it,
and which claim it would not trust or could not follow without more. Take each finding one of three ways: fixed, recorded
where the project tracks work, or dropped with the reason. When the harness
cannot start a fresh context, review in your own and say so in the report; the
person who asked weighs an author's review as the weaker one.

A fix larger than a word, a fact, or wording taken as written from the step 4
reviewer or the person who asked makes text no reviewer has read: run steps 3
and 4 again, until a round's fixes are all that small. Before a fourth round,
as review's judge does, ask the person who asked whether it runs; if they say
no, or no one can answer, stop, and say in the report that the last fixes had
no fresh review. A finding that needs a fact you do not have starts no round.

**5. Report.** In this order: the three lines from step 1; the script's output
after your fixes; the sections you reread and why; each review round, its
findings, and what became of each. Name no check you did not run. When the
document is part of a change with a written description, such as a pull
request, the three lines go in that description too, so a later reviewer reads
against the same reader.

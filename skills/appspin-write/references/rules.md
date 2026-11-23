# The rules

Each rule says what to do and gives an example.

## Rules

These are the rules every document meets. A reviewer reads against them, and
`scripts/check-prose.mjs`, the script, checks the ones a pattern can catch.

- **One kind of content per section, and the heading reads as that kind: a
  verb phrase for steps, a noun phrase for a concept or a table.** Example:
  "### Make a release" holds steps and nothing about why releases work as
  they do; "### Commands" holds the table.
- **Define a term on first use, in context.** Example: "the task runner, the
  tool that runs the project's commands, runs the `verify` command".
- **The reader is "you".** Example: "You approve the spec before any code."
- **Present tense for how things behave.** Example: "Promote tags the
  release."
- **The actor is the subject, unless keeping the paragraph's known subject in
  front needs the passive.** Example: "The push hook refuses a push to
  the `main` branch." In a paragraph about `main`: "`main` is reached only
  by merge."
- **One action per step, with its expected output, and the condition before
  the instruction.** Example: "If the tree is clean, run `make promote`.
  Expected: the candidate commit and the checks it passed."
- **One instruction per sentence, unless the actions are simultaneous, and no
  words dropped to shorten.** Example: "Run the installer. Then run adopt."
  not "Run installer then adopt."
- **A list of three or more takes a comma before its last item.** Example:
  "`verify`, `smoke`, and `e2e`".
- **A kind of thing is formatted the way the document already formats it.**
  Example: where the document puts the **Seen** section in bold, the next
  mention is bold too, never in quotation marks.
- **A warning opens with the command or condition and names the risk.**
  Example: "Do not run this on a shared branch: it rewrites history."
- **One idea per sentence, one topic per paragraph.** Example: a paragraph
  about what `verify` checks does not also say how to add a step.
- **The reader meets each thing before it is used, and each paragraph opens
  with what ties it to the one before.** Sections and paragraphs go in the
  order the reader needs them, not the order they were written. Example: the
  section that explains roles comes before the first section that relies on
  them, and a paragraph on an exception opens "One kind of code has no tests"
  rather than starting a new subject.
- **The reader learns what a section is for before its detail, once per
  section.** Example: "This phase asks little on purpose, so that any
  platform fits." then the detail.
- **State difficulty plainly, without `just`, `easy`, or `simply`.** Example:
  "Run the installer." not "`Just` run the installer."
- **Keep important information in the sentence, not in parentheses.**
  Example: "The hook refuses a push to `main`. It allows a push to any other
  branch." not "The hook refuses a push to `main` (other branches are
  allowed)."
- **One term per concept.** Example: "pull request" throughout, never `PR` in
  one place and "merge request" in another.
- **Code font only for text a reader types or a system name, such as a
  command, a file, a configuration key, or a flag. A product, project, or tool
  name stays in plain type, and the label of a field or a form's section goes
  in bold.** Example: "Run `make verify`." and "Git reads the `.gitignore`
  file." and "the **Name** field", not "`Git` reads it".
- **A name in code font, other than text the reader types, gets a noun for its
  kind on its first mention in each section.** Example: "the `package.json`
  file lists the project's scripts", not "`package.json` lists the project's
  scripts".
- **Sentence-case headings.** Example: "### Make a release", not "### Make a
  Release".

## Signals

A reviewer raises these, and the writer fixes each or overrules it with a
reason. The script reports the first three.

- A sentence over 25 words.
- A paragraph over 6 sentences.
- An abbreviation not written out on first mention. Example: `CI` before
  `continuous integration (CI)`. Whether the named reader needs it written
  out decides whether to fix it or overrule it.
- A passive.
- A missing example where a rule or a concept is stated.
- A section whose purpose is not stated before its detail.

## Kinds and their readers

Step 1 of the `SKILL.md` file starts from these defaults. A document's kind
is how it is written, not where it lives: research, a decision, or an insight
is an explanation, in a repository or anywhere else.

| kind        | default reader                                           |
| :---------- | :------------------------------------------------------- |
| README      | someone deciding whether to use the project              |
| tutorial    | someone learning by doing, new to the subject            |
| how-to      | someone doing one task                                   |
| reference   | someone looking one thing up                             |
| explanation | someone deciding or understanding later, not in the room |

## A project's conventions

A project's own choices, which have no source but the people who run it, sit
under `## Writing conventions` in its `AGENTS.md` file, outside any block a
package manages, one per line. Example: "A command is never a
link." A convention adds to the rules and never overrides one.

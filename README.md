# appspin-skills

<!-- abbreviations: CLI, AI, LLM, DORA, OWASP -->

Ship production software with a coding agent and stay accountable for what it
ships. The agent writes the code on its own branch, and machines check it the
same way every time. A second agent reviews it, and you approve each change and
each release. To try it, see [Get started](#get-started).

appspin-skills is a package of four [Agent
Skills](https://agentskills.io/specification). Together they carry out the
[appspin delivery standard](skills/appspin-delivery/standard.md), the rules for
how a change reaches production. They work in any agent that reads `SKILL.md`,
such as Claude Code, Codex, Cursor, Copilot, and Gemini CLI. Before version
1.0, a release can need steps from you, and its **Upgrade** lines say
which.

- [Who it is for](#who-it-is-for)
- [Why it exists](#why-it-exists)
- [What it adds to your repository](#what-it-adds-to-your-repository)
- [How a change ships](#how-a-change-ships)
- [What it leaves out](#what-it-leaves-out)
- [Get started](#get-started)
- [Where to go next](#where-to-go-next)
- [The skills](#the-skills)

## Who it is for

It is for engineers and teams who let a coding agent write most of their code,
and who need that code to hold up in production. It fits two kinds of project,
in any programming language or stack. An App is software that runs: its
production is one or more running services. A Software Package is software other
projects install: its production is its latest release tag.

The package ships ready-made support for GitHub, Claude Code, and, for an App,
Cloudflare Workers. Another deploy platform needs an adapter, a small module
with the few functions promote calls.

## Why it exists

Coding agents made writing code cheap, but not shipping it safely. Simon
Willison defines vibe coding as
["building software with an LLM without reviewing the code it writes"](https://simonwillison.net/2025/Mar/19/vibe-coding/).
That can suit a prototype, but Thoughtworks' Technology Radar
[strongly cautioned against it for production code](https://www.thoughtworks.com/radar/techniques/complacency-with-ai-generated-code).
The evidence agrees:

- **AI amplifies what a team already does.** Google's
  [2025 DORA report](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report)
  finds that 90% of developers use AI at work. Delivery throughput rises with
  it, but stability falls. The report finds the fall where a team lacks strong
  automated testing, version control, and fast feedback.
- **Developers do not trust the output.** In
  [Stack Overflow's 2025 survey](https://survey.stackoverflow.co/2025/ai), 46%
  distrust the accuracy of AI tools. Their top frustration is code that is
  "almost right, but not quite".
- **Generated code often fails security tests.** Veracode tested code from more
  than 100 models in 2025. In
  [its tests](https://www.veracode.com/resources/genai-code-security-report/),
  45% of the samples introduced a flaw from the OWASP Top 10.

The practices these sources point to are older than AI. They are small changes,
checks that run every time, review by someone who did not write the code, and a
person accountable for what ships. Andrej Karpathy, who named vibe coding, has
since called this way of working
[agentic engineering](https://addyosmani.com/blog/agentic-engineering/).
appspin-skills makes it the agent's default:

- Each change starts as a backlog item with acceptance criteria, and goes out on
  its own branch, or a batch's, in one pull request.
- Machines run the gates, the checks no change passes by asking: `verify` in the
  push hook and in continuous integration, `smoke`'s probes, and promote's
  refusals. Each probe has a control, a check that must fail. None of the
  gates uses a language model, so each gives the same answer every time.
- A reviewer agent that did not write the branch reviews it before you do.
- You keep production's credential out of the agent's session, as
  the [how-to](skills/appspin-delivery/how-to.md#set-up-cloudflare)
  shows.
- You approve every change and every release.

A check that catches half a problem makes a reviewer stop looking for the other
half. So a machine gets only the checks it does better than a person.

## What it adds to your repository

The installer copies the skills in with `npx skills`.
Then adopt, the package's setup step, writes the rest for you to review:

```text
.agents/skills/                          the four skills, for any agent
.claude/                                 the skills linked for Claude Code
skills-lock.json                         each skill's version and hash
AGENTS.md                                a section that tells every agent how changes ship here
CLAUDE.md                                points Claude Code at AGENTS.md
.githooks/pre-push                       the push hook: refuses a push to main, and checks every other push
.config/appspin/                         the standard's own files:
  delivery.json                            which tool does which job, and the release settings
  verify.steps                             your project's checks, one per line
  smoke.steps                              your project's probes, one per line
.github/pull_request_template.md         the sections every pull request fills
.github/workflows/                       continuous integration that runs your checks
Makefile or package.json                 the task runner's verify, smoke, e2e, promote, and the rest
```

The installer's files update with each install. Adopt rewrites the package's
[pieces](skills/appspin-delivery/reference.md#package-pieces), such as the push
hook, the pull request template, and its section of `AGENTS.md`, on every
run. It builds the project's own files once for your stack, and afterwards
only proposes changes to them. On your "approved", it also sets the
repository's merge settings, such as merge commits only.

## How a change ships

Every change goes through the DevOps lifecycle:

```text
Plan → Code → Build → Test → Release → Deploy → Operate → Monitor
  ↑                                                           │
  └───────────────────────────────────────────────────────────┘
```

Along the way:

1. You describe what you want, and an agent drafts an item and files it in the
   backlog once you have checked it.
2. The agent writes the code on its own branch, and the push hook checks every
   push.
3. A reviewer agent that did not write the branch reviews it, and then you do.
4. When you say "approved", the agent opens the pull request. When the checks
   pass, you say "merge" and the agent merges it.
5. You release with the `promote` command, when you decide to. It tests the new
   version, moves production to it, and tests it again. You say "yes", and the
   agent runs it.
6. An `explore` run, which you or a schedule start, looks for what no check
   covers. You decide which of its findings become new items.

The [standard](skills/appspin-delivery/standard.md) draws this path as a diagram
and states the rules each phase keeps.

## What it leaves out

- It does not write your product's code.
- It does not grow a test suite with every change: the agent tests as it works,
  and keeps a test only when the item or project asks.
- It has no rollback command, because going back is a promote of an older
  commit.
- It does not run your agent, and an agent with no one watching stops at its
  branch.

## Get started

If you are new to the package, run the installer in an empty folder first. In
an agent session there, send:

```text
npx github:tranman/appspin-skills
```

The agent takes you once round the loop with a small App, from a first item to
a release in production. Once you have seen it, run the same command in your
project's folder, and the agent sets the project up on its own branch for your
review. In the trial, at each step it says what happens and the word you say next.
You sign in to GitHub and, for an App, to Cloudflare, where you create one token;
you approve, merge, and release each change.

To install one skill without the standard, see [The skills](#the-skills).

The package works best with
[superpowers](https://github.com/obra/superpowers) as the agent's way of
planning and building. It is not part of the package: install it by its own
instructions, or keep a process of your own.

## Where to go next

- **To understand the process,** read the
  [standard](skills/appspin-delivery/standard.md): its rules, each phase of
  the lifecycle, and why each rule holds.
- **To do one of your tasks,** such as installing an update, reviewing a
  branch, or making a release, use the
  [how-to guides](skills/appspin-delivery/how-to.md).
- **To look something up,** such as a command, a role, or a term, use the
  [reference](skills/appspin-delivery/reference.md).

## The skills

| skill                                                  | what it does                                                                        |
| :----------------------------------------------------- | :---------------------------------------------------------------------------------- |
| [`appspin-delivery`](skills/appspin-delivery/SKILL.md) | installs and updates the standard, sets up the checks, and makes each release       |
| [`appspin-review`](skills/appspin-review/SKILL.md)     | reviews a branch in a fresh context before its pull request opens                   |
| [`appspin-explore`](skills/appspin-explore/SKILL.md)   | explores a running copy of the product within a budget, for what no check covers    |
| [`appspin-write`](skills/appspin-write/SKILL.md)       | writes a document a person reads, checks its prose, and has another agent review it |

The delivery skill uses the other three, but they
need nothing of it. To install `appspin-review`, `appspin-explore`, or
`appspin-write` on its own, run `npx skills` with a release's tag from the
[tags page](https://github.com/tranman/appspin-skills/tags) and the
skill's name:

```sh
npx skills add tranman/appspin-skills#<tag> --skill appspin-write
```

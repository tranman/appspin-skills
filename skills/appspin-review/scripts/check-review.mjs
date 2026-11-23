#!/usr/bin/env node
// check-review.mjs <body-file>: every review the branch needs has a line, each judge line gives its reason, the round judge's is last and at the branch's top, and an approved line names the top.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

if (!process.argv[2]) {
  console.log("usage: check-review.mjs <body-file>");
  process.exit(2);
}
const file = resolve(process.argv[2]);
const git = (...a) => execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8" }).trim();
try {
  process.chdir(git("rev-parse", "--show-toplevel"));
} catch {
  console.log("check-review: run it inside the repository");
  process.exit(2);
}
const head = git("rev-parse", "HEAD");
const body = readFileSync(file, "utf8");
// The Review section up to the next ## heading; a batch's per-item lines sit under ### #<n> headings after the whole branch's.
const [, after] = body.replace(/[`*]/g, "").split(/^## Review[ \t]*$/m);
if (after === undefined) {
  console.log('check-review: no "## Review" heading');
  process.exit(1);
}
const section = after.split(/^## /m)[0];
const record = section.split(/^### #/m)[0];
const lines = [...record.matchAll(/^- (brief|code-review|write .+?|judge) at ([0-9a-f]{7,40})\b(.*)$/gm)].map((m) => ({
  review: m[1],
  sha: m[2],
  rest: m[3],
}));
const has = (review) => lines.some((l) => l.review === review);

let base;
try {
  base = git("merge-base", "origin/HEAD", "HEAD");
} catch {
  console.log("check-review: origin/HEAD does not name the default branch; run git remote set-head origin --auto");
  process.exit(1);
}
// A document a person reads: Markdown that is not an agent's instructions, a package piece, or a working file.
const documents = git("diff", "--name-only", "--diff-filter=AMR", base, "HEAD")
  .split("\n")
  .filter(
    (f) =>
      /\.md$/.test(f) &&
      !/(^|\/)(SKILL|AGENTS|CLAUDE)\.md$|^\.agents\/|^\.claude\/|^\.github\/|^specs\/|^docs\/superpowers\/|^skills\/[^/]+\/(references|assets)\//.test(
        f,
      ),
  );

const gaps = [];
for (const r of ["brief", "code-review"]) if (!has(r)) gaps.push(`${r}: no line`);
for (const f of documents) if (!has(`write ${f}`)) gaps.push(`write ${f}: no line`);
// A judge line is `<verdict>; <reason>`: the reason is what the operator reads.
const verdict = (rest) =>
  /^:\s*(continue|clean|stop needs confirmation(?:, confirmed by the operator)?);.*[\p{L}\p{N}]/iu
    .exec(rest)?.[1]
    .toLowerCase();
for (const j of lines.filter((l) => l.review === "judge"))
  if (!verdict(j.rest)) gaps.push(`judge at ${j.sha}: not "<verdict>; <reason>"`);
// The judge's verdict covers every fix after the other reviews, so it alone must read the top.
const judge = lines.at(-1);
if (
  judge?.review !== "judge" ||
  !head.startsWith(judge.sha) ||
  !["clean", "stop needs confirmation, confirmed by the operator"].includes(verdict(judge.rest))
)
  gaps.push("judge: the last line is not a clean or confirmed verdict at the branch's top");

const approved = /^\W*approved\W* at ([0-9a-f]+)/im.exec(record);
if (approved && approved[1] !== head) gaps.push("approved: the line does not name the branch's top commit in full");

if (gaps.length) {
  console.log(`check-review: the Review record is missing or stale for:\n${gaps.map((g) => `  ${g}`).join("\n")}`);
  process.exit(1);
}
console.log("check-review: the Review record is complete and at the top");

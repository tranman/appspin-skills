#!/usr/bin/env node
// promote: release a commit of main. A Software Package, a project with no deploy role, releases as the
// next v<version> tag; an App moves production to the commit's candidate through the deploy adapter
// roles.deploy names, and records it with a deploy tag. Either way it checks CI and smokes before and after.
//   promote.mjs [<sha>] [--patch]   --patch: a package's next release raises its patch number, not its minor
// Exit: 0 done; 1 refused, or stopped after the release; 2 bad usage, or origin could not be fetched;
// 3 not set up yet, with what to set up.

import { readFileSync } from "node:fs";
import { adapter, MANIFEST, run, treeAt } from "./adapter.mjs";

const quit = (code, head, ...hints) => {
  console.error(`\n${head}\n${hints.map((h) => `  ${h}\n`).join("")}`);
  process.exit(code);
};
const refuse = (msg, ...hints) => quit(1, `refused: ${msg}`, ...hints);
const line = (label, text) => console.log(`  ${label.padEnd(9)} ${text}`);
const id7 = (sha) => sha.slice(0, 7);
const git = (...args) => {
  const r = run("git", args);
  return { ...r, out: r.stdout?.trim() ?? "" };
};

const args = process.argv.slice(2);
const patch = args.includes("--patch");
const [target, extra] = args.filter((a) => a !== "--patch");
if (extra !== undefined || target?.startsWith("-")) quit(2, "usage: promote.mjs [<sha>] [--patch]");

const top = git("rev-parse", "--show-toplevel");
if (top.status !== 0) quit(3, "not set up yet: not inside a git repository.");
process.chdir(top.out);
let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch (e) {
  quit(3, `not set up yet: ${MANIFEST} could not be read (${e.message}); run adopt.`);
}
// The task runner's prefix, which runs each check: make when roles.runner is absent.
const runner = manifest.roles?.runner ?? "make";

// One adapter call; a failure says why, and whether production may already have moved.
const call = async (role, fn, fnArgs, after) => {
  try {
    return await (await adapter(role))[fn](...fnArgs);
  } catch (e) {
    if (e.code === 3) quit(3, `not set up yet: ${e.message}`);
    return refuse(
      e.message,
      ...(e.code === 2 ? ["Not knowing is not the same as passing."] : []),
      ...(after ?? ["Nothing moved."]),
    );
  }
};
// A task runner command: whether it passed.
const task = (name, what, env, cwd, show) => {
  process.stdout.write(`  ${name.padEnd(9)} ${what} `);
  const r = run("sh", ["-c", `${runner} ${name} 2>&1`], undefined, { env: { ...process.env, ...env }, cwd });
  console.log(r.status === 0 ? "pass" : `fail (exit ${r.status})`);
  if (r.status !== 0 || show) process.stdout.write(r.stdout ?? "");
  return r.status === 0;
};
const smoke = (what, target, cwd) => task("smoke", what, { ORIGIN: target }, cwd);
// An annotated tag on origin; a local tag whose push failed is deleted, or it would claim a release nobody else can see.
const pushTag = (name, message) => {
  if (git("tag", "-a", name, sha, "-m", message).status !== 0) return false;
  if (run("git", ["push", "origin", `refs/tags/${name}`], undefined, { stdio: ["ignore", 2, 2] }).status === 0)
    return true;
  git("tag", "-d", name);
  return false;
};
// Every required check passed on the commit; an App with staging always answers to the staging gate's.
const checkCi = async (sha) => {
  const required = new Set([
    "verify",
    ...(manifest.ci?.required ?? []),
    ...(manifest.environments?.staging ? ["staging-smoke", "staging-e2e"] : []),
  ]);
  const checks = await call("repo", "getStatus", [sha]);
  const bad = checks.filter((c) => c.state !== "success" && c.state !== "skipped").map((c) => `${c.name} ${c.state}`);
  const missing = [...required].filter((n) => !checks.some((c) => c.name === n && c.state === "success"));
  if (bad.length || missing.length)
    refuse(
      `CI has not passed on ${id7(sha)}: ${[...bad, ...missing.map((n) => `${n} has no passing result`)].join(", ")}.`,
      "Only what CI has vouched for is promotable.",
    );
  line("ci", "passed");
};

console.log("\npromote production\n");

if (git("fetch", "--quiet", "origin", "main").status !== 0)
  quit(2, "promote: could not fetch from origin, so what is on main is unknown.", "Nothing moved.");
const resolved = git("rev-parse", "--verify", "--quiet", `${target ?? "origin/main"}^{commit}`);
if (resolved.status !== 0) quit(2, `promote: ${target ?? "origin/main"} is not a commit in this repository`);
const sha = resolved.out;
line("commit", git("log", "-1", "--pretty=%h %s", sha).out);
if (git("merge-base", "--is-ancestor", sha, "origin/main").status !== 0)
  refuse(`${id7(sha)} is not on origin/main.`, "Only what has landed on main is promotable.");

if (manifest.roles?.deploy) await releaseApp();
else await releasePackage();

// A Software Package: its release is a v<version> tag on main, and the highest tag on origin is production.
async function releasePackage() {
  const SEMVER = /^v(\d+)\.(\d+)\.(\d+)$/;
  const parts = (tag) => tag.match(SEMVER).slice(1).map(Number);
  // --prune drops a local tag origin lacks, as a stopped promote leaves.
  if (git("fetch", "--quiet", "--prune", "origin", "+refs/tags/v*:refs/tags/v*").status !== 0)
    quit(2, "promote: could not fetch the release tags from origin, so what is released is unknown.", "Nothing moved.");
  const last = git("tag", "-l", "v*")
    .out.split("\n")
    .filter((t) => SEMVER.test(t))
    .sort((a, b) => parts(a).reduce((d, n, i) => d || n - parts(b)[i], 0))
    .at(-1);
  const at = last && git("rev-parse", `${last}^{commit}`).out;
  if (at === sha) {
    console.log(`\n${last} already releases ${id7(sha)}. Nothing to do.\n`);
    process.exit(0);
  }
  if (at && git("merge-base", "--is-ancestor", sha, at).status === 0)
    refuse(
      `${id7(sha)} is before ${last}, the current release.`,
      "To go back, revert the change on main, then release the revert.",
    );
  await checkCi(sha);
  const [major, minor, fix] = last ? parts(last) : [0, 0, 0];
  const tag = patch ? `v${major}.${minor}.${fix + 1}` : `v${major}.${minor + 1}.0`;
  line("candidate", `${tag}  ${sha}`);
  if (!smoke("candidate", sha)) refuse("the candidate failed smoke.", "Nothing moved.");
  if (!pushTag(tag, `release ${tag}`)) refuse(`could not create or push ${tag}.`, "Nothing moved.");
  line("tagged", tag);
  if (!smoke("production", tag))
    quit(
      1,
      `stopped after the release: ${tag} failed smoke.`,
      "To go back, revert the change on main, then release the revert.",
    );
  console.log(`\nreleased ${tag}\n`);
}

// An App: production moves to the commit's candidate, and a deploy tag records each release that passed smoke.
async function releaseApp() {
  // What production serves, read first, so a stale or unknown deploy role is reported before anything else.
  const before = await call("deploy", "report", []);
  const TAGS = "refs/tags/deploy/production";
  if (git("fetch", "--quiet", "--prune", "origin", `${TAGS}/*:${TAGS}/*`).status !== 0)
    quit(2, "promote: could not fetch the deploy tags from origin, so the last release is unknown.", "Nothing moved.");
  // A commit that went live and passed smoke passed its checks then, so going back never waits on a check added since.
  const released = git("tag", "-l", "--points-at", sha, "deploy/production/*").out.split("\n")[0];
  if (released) line("ci", `passed when it went live, by ${released}`);
  else await checkCi(sha);

  const serving = before.commit === sha;
  if (serving && released) {
    console.log(`\nproduction already serves ${before.id}, recorded by ${released}. Nothing to do.\n`);
    process.exit(0);
  }
  // The commit's own probes, since a probe added after it would fail it.
  const tree = treeAt(sha) ?? refuse(`could not check out ${id7(sha)}.`, "Nothing moved.");
  const candidate = serving ? before : await call("deploy", "find", [sha]);
  line("candidate", `${candidate.id}  ${candidate.url}${serving ? ", already serving" : ""}`);
  const goBack = serving
    ? "To go back: promote the commit of the deploy tag before this release."
    : before.commit
      ? `To go back: promote ${id7(before.commit)}`
      : "There is no earlier release to go back to.";
  const halt = (what, ...hints) => quit(1, `stopped after the move: ${what}`, ...hints, goBack);

  if (!serving) {
    // The candidate shares production's database, so the commit's own migrations run before its smoke.
    const stays = "Traffic did not move; what the migration added stays, since a migration only adds.";
    // An older commit's migrations have all run, and its tree lacks newer files, which a tool such as Supabase's refuses.
    const older =
      manifest.migrate &&
      (git("tag", "--no-merged", sha, "-l", "deploy/production/*").out !== "" ||
        (before.commit && git("merge-base", "--is-ancestor", sha, before.commit).status === 0));
    if (older) line("migrate", `skipped: ${id7(sha)} is older than a release or production`);
    const migrated = manifest.migrate && !older;
    if (migrated) {
      if (!task("migrate", "production", {}, tree, true))
        refuse(
          "the migration failed.",
          "Traffic did not move; the output above says what failed, and any file applied before it stays.",
        );
    }
    if (!smoke("candidate", candidate.url, tree))
      refuse("the candidate failed smoke.", migrated ? stays : "Nothing moved.");
    await call(
      "deploy",
      "promote",
      [candidate.id, sha],
      ["Production may have moved; check it before promoting again.", goBack],
    );
    line("moved", `production to ${candidate.id}`);
  }

  // The host can take a moment to serve what it was told to, and a read can fail on the way.
  let live = before;
  for (let reads = 1; !serving; reads++) {
    let why;
    try {
      live = await (await adapter("deploy")).report();
    } catch (e) {
      why = e.message;
    }
    if (!why && live.id === candidate.id && live.commit === sha) break;
    if (reads === 20) halt(`production did not report ${candidate.id}; ${why ?? `it reports ${live.id}`}.`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000);
  }
  line("serving", candidate.id);

  if (!smoke("production", live.url, tree)) halt("production failed smoke.");
  const name = `deploy/production/${new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/:/g, "-")}`;
  if (!pushTag(name, `version: ${candidate.id}`))
    halt(
      `could not write the deploy tag that records ${candidate.id}.`,
      `promote ${id7(sha)} writes it: production already serves it, so it smokes and tags without moving.`,
    );
  line("tagged", name);
  console.log(`\nproduction now serves ${candidate.id}\n`);
}

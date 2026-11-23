// The adapter a role names in delivery.json: a module of this folder's adapters/, imported and
// called directly. A failure throws an Error whose code is 1 refused, 2 could not check, 3 not set up.
// A repo adapter exports getStatus(sha): every CI result on that exact commit, as [{ name, state }],
// state pending, success, failure, or skipped; [] for none.
// A deploy adapter, an App's, exports find(sha): the candidate for exactly that commit, never the
// newest, as { id, url }, url serving it on production settings with no traffic, and the address smoke
// is given, refusing when there is none; promote(id, sha): moves production to that candidate without rebuilding; and report():
// what production serves, as { id, commit, url }, id and commit null when nothing is served yet.
// git has no adapter: every host speaks git, so promote calls it directly.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// The standard's settings file, from the repository root.
export const MANIFEST = ".config/appspin/delivery.json";
const MODULES = { repo: ["github"], deploy: ["cloudflare"] };

export const fail = (code, why) => {
  throw Object.assign(new Error(why), { code });
};
// Node's default 1 MB buffer reads a long list as a failure.
export const run = (cmd, args, input, opts) =>
  spawnSync(cmd, args, { encoding: "utf8", input, maxBuffer: 1 << 30, ...opts });
export const json = (r) => {
  try {
    return r.status === 0 ? JSON.parse(r.stdout) : null;
  } catch {
    return null;
  }
};
// The commit's tree: "." when the checkout is it and clean, else a temporary worktree sharing node_modules; null if it cannot be checked out.
const trees = new Map();
let hooked = false;
export function treeAt(commit) {
  const git = (...a) => run("git", a).stdout?.trim();
  if (git("rev-parse", "HEAD") === commit && git("status", "--porcelain") === "") return ".";
  if (trees.has(commit)) return trees.get(commit);
  const tree = mkdtempSync(join(tmpdir(), "promote-"));
  if (!hooked) {
    hooked = true;
    for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => process.exit(130));
    process.on("exit", () => {
      for (const t of trees.values()) {
        run("git", ["worktree", "remove", "--force", t]);
        rmSync(t, { recursive: true, force: true });
      }
    });
  }
  if (run("git", ["worktree", "add", "--detach", "--quiet", tree, commit]).status !== 0) {
    rmSync(tree, { recursive: true, force: true });
    return null;
  }
  trees.set(commit, tree);
  if (existsSync("node_modules") && !existsSync(join(tree, "node_modules")))
    symlinkSync(resolve("node_modules"), join(tree, "node_modules"));
  return tree;
}
export const firstLine = (r) => (r.stderr || r.error?.message || "no output").trim().split("\n")[0];

/** The module roles.<role> names, run from the repository root. */
export async function adapter(role) {
  const name = JSON.parse(readFileSync(MANIFEST, "utf8")).roles?.[role];
  if (!MODULES[role].includes(name))
    fail(3, `${MANIFEST}'s roles.${role} is ${name ?? "missing"}; the package's are: ${MODULES[role].join(", ")}`);
  return import(`./adapters/${name}.mjs`);
}

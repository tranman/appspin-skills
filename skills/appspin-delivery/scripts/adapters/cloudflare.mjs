// The deploy adapter for Cloudflare, on Workers: a candidate is a version the deploy workflow uploaded, tagged with its commit.
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { MANIFEST, fail, run, json, firstLine, treeAt } from "../adapter.mjs";

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const env =
  manifest.environments?.production ??
  fail(
    3,
    ".config/appspin/delivery.json has no environments.production; add it with worker and origin, and dir when the worker is not at the root",
  );
if (!env.worker)
  fail(
    3,
    ".config/appspin/delivery.json is missing environments.production.worker, the production worker's name on Cloudflare",
  );
const cwd = join(process.cwd(), env.dir ?? ".");
try {
  if (!statSync(cwd).isDirectory()) throw new Error();
} catch {
  fail(
    3,
    `environments.production.dir is ${env.dir}, and there is no such directory; point it at the worker's directory, relative to the repository root`,
  );
}
// Named on every wrangler command, so it acts on the manifest's worker whatever the config in dir names.
// --env= names the top-level environment, so wrangler neither warns nor picks another.
const target = ["--name", env.worker, "--env="];
// loud: wrangler's own output goes to stderr, beside promote's own lines.
const wrangler = (args, loud) => {
  const r = run("npx", ["--yes", "wrangler@4", ...args], undefined, {
    cwd,
    stdio: ["ignore", loud ? 2 : "pipe", loud ? 2 : "pipe"],
  });
  if (r.error) fail(3, "npx is not on PATH, so wrangler cannot run; install Node (it brings npx)");
  return r;
};
const signedIn = () =>
  (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) ||
  fail(
    3,
    "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are unset; promote runs in the promote workflow, which sets them",
  );
const commitOf = (version) => version?.annotations?.["workers/tag"] ?? null;

// Every version, newest first: wrangler lists only the ten newest, so the API is paged.
const versions = async () => {
  signedIn();
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const all = [];
  for (let page = 1; ; page++) {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${env.worker}/versions?page=${page}&per_page=100`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const body = await res.json().catch(() => null);
    const items =
      body?.result?.items ??
      fail(2, `could not read the versions of ${env.worker}: ${body?.errors?.[0]?.message ?? `HTTP ${res.status}`}`);
    all.push(...items);
    if (items.length < 100) return all;
  }
};

export async function find(sha) {
  if (!manifest.subdomain)
    fail(
      3,
      ".config/appspin/delivery.json is missing subdomain, the account's workers.dev subdomain; the dashboard's Workers overview shows it",
    );
  const version = (await versions()).find((v) => commitOf(v) === sha);
  if (!version)
    fail(
      1,
      `no candidate uploaded for ${sha.slice(0, 7)} on ${env.worker}; the deploy workflow's upload may still be running, or may not have run for this commit`,
    );
  return { id: version.id, url: `https://${version.id.split("-")[0]}-${env.worker}.${manifest.subdomain}.workers.dev` };
}

// commit is the build's, which find matched by the version's tag.
export function promote(id, commit) {
  signedIn();
  // versions deploy syncs the non-versioned settings from the config where it runs, so it runs in the commit's tree.
  const at = [];
  const tree = treeAt(commit);
  if (!tree)
    fail(1, `could not check out ${commit.slice(0, 7)} to apply its settings; fetch it, then run promote again`);
  if (tree !== ".") {
    const dir = join(tree, env.dir ?? ".");
    if (!existsSync(dir))
      fail(1, `${commit.slice(0, 7)} has no ${env.dir}, the worker's directory now, so its settings cannot be read`);
    // --cwd keeps npx in this checkout, so its installed wrangler runs against the commit's config.
    at.push("--cwd", dir);
  }
  if (
    wrangler(["versions", "deploy", `${id}@100`, ...target, "--yes", "--message", `promote ${id}`, ...at], true)
      .status !== 0
  )
    fail(1, "wrangler versions deploy failed");
}

export function report() {
  signedIn();
  const r = wrangler(["deployments", "status", ...target, "--json"]);
  const url =
    env.origin ??
    fail(3, ".config/appspin/delivery.json is missing environments.production.origin, the address users reach");
  const top =
    json(r)
      ?.versions?.slice()
      .sort((a, b) => b.percentage - a.percentage)[0] ??
    fail(2, `could not read the deployment of ${env.worker}: ${firstLine(r)}`);
  const view =
    json(wrangler(["versions", "view", top.version_id, ...target, "--json"])) ??
    fail(2, `could not read version ${top.version_id}`);
  return { id: top.version_id, commit: commitOf(view), url };
}

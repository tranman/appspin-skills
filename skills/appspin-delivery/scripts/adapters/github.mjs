// The repo adapter for GitHub, through gh: what CI reported on a commit.
import { fail, run, json, firstLine } from "../adapter.mjs";

const gh = (args) => run("gh", args);
const CONCLUSION = { success: "success", neutral: "skipped", skipped: "skipped" };

/** Each check on the commit, as { name, state }, state one of pending, success, failure, skipped. */
export function getStatus(sha) {
  const r = gh(["repo", "view", "--json", "nameWithOwner"]);
  const repo =
    json(r)?.nameWithOwner ??
    fail(
      3,
      `gh cannot reach this repository on GitHub (${firstLine(r)}); install the GitHub CLI and run \`gh auth login\``,
    );
  const api = (path, jq) => {
    const a = gh(["api", `repos/${repo}/${path}`, "--jq", jq]);
    if (/HTTP 422/.test(a.stderr)) return null;
    return json(a) ?? fail(2, `could not read ${path}: ${firstLine(a)}`);
  };
  const runs = api(
    `commits/${sha}/check-runs?per_page=100`,
    "[.check_runs[] | {name, status, conclusion, suite: .check_suite.id}]",
  );
  if (runs === null) return [];
  const statuses = api(`commits/${sha}/status?per_page=100`, "[.statuses[] | {context, state}]");
  // Dependabot's update jobs, and the package's promote workflow, run on main's head but say nothing about the commit.
  const managed = api(
    `actions/runs?head_sha=${sha}&per_page=100`,
    "[.workflow_runs[] | {path, event, suite: .check_suite_id}]",
  );
  const ignored = (m) =>
    m.path.startsWith("dynamic/dependabot/") ||
    (m.event === "workflow_dispatch" && m.path === ".github/workflows/promote.yml");
  return [
    ...runs
      .filter((c) => !managed.some((m) => m.suite === c.suite && ignored(m)))
      .map((c) => ({
        name: c.name,
        state: c.status !== "completed" ? "pending" : (CONCLUSION[c.conclusion] ?? "failure"),
      })),
    ...statuses.map((s) => ({ name: s.context, state: s.state === "error" ? "failure" : s.state })),
  ];
}

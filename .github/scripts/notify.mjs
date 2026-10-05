import { execSync } from "node:child_process";

const { GCHAT_WEBHOOK_URL, SITE_URL, GH_TOKEN, REPO, DEPLOY_ID, DEPLOY_SHA, ENV_URL } = process.env;
const site = (SITE_URL || ENV_URL || "").replace(/\/$/, "");
const sh = (c) => execSync(c, { encoding: "utf8" }).trim();
const gh = async (path) =>
  (await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json" },
  })).json();

// Base = commit of the previous successful Production deployment
let base = null;
const deps = await gh("deployments?environment=Production&per_page=30");
for (const d of deps) {
  if (d.id >= Number(DEPLOY_ID)) continue;
  const statuses = await gh(`deployments/${d.id}/statuses?per_page=10`);
  if (statuses.some((s) => s.state === "success")) { base = d.sha; break; }
}
base ||= `${DEPLOY_SHA}^1`;
if (base === DEPLOY_SHA) process.exit(0);

const files = sh(`git diff --name-status -M ${base} ${DEPLOY_SHA}`)
  .split("\n").filter(Boolean)
  .map((l) => {
    const [s, ...p] = l.split("\t");
    return { status: s[0], path: p[p.length - 1] };
  });

const IGNORE = /^(\.github|\.vscode|\.claude|\.agents|\.wireframes|\.pixel-hub|docs|tests|README|AGENTS|CLAUDE|AUDIT|package|pnpm-lock|yarn.lock|package-lock)/;
const relevant = files.filter((f) => !IGNORE.test(f.path));
if (!relevant.length) process.exit(0);

const pageRoute = (p) => {
  const m = p.match(/^(?:app\/)?pages\/(.+)\.vue$/);
  if (!m) return null;
  return "/" + m[1].replace(/\/index$/, "").replace(/^index$/, "");
};
const componentGroup = (p) => {
  const m = p.match(/^(?:app\/)?components\/([^/]+)\//);
  return m ? `/${m[1].toLowerCase()}` : null;
};

const groups = {};
for (const f of relevant) {
  const key = pageRoute(f.path) ?? componentGroup(f.path) ?? "Shared (not page-specific)";
  (groups[key] ||= []).push(f);
}

const icon = { A: "+ new     ", M: "~ modified", D: "- deleted ", R: "~ renamed " };
const body = Object.entries(groups)
  .map(([key, fs]) => {
    const title = key.startsWith("/") ? `*${key}*  <${site}${key}|open>` : `*${key}*`;
    return `${title}\n${fs.map((f) => `   ${icon[f.status] ?? "~ changed "}  ${f.path}`).join("\n")}`;
  })
  .join("\n\n");

const commits = sh(`git log --format=%an%x09%s ${base}..${DEPLOY_SHA}`).split("\n").filter(Boolean);
const authors = [...new Set(commits.map((c) => c.split("\t")[0]))].join(", ");
const date = new Date().toLocaleDateString("en-US", {
  weekday: "short", month: "short", day: "numeric", year: "numeric",
});

let text =
  `*Performance prototype deployed* · ${date}\n` +
  `Live at: ${site}\n----------\n${body}\n\n` +
  `${commits.length} commit(s) by ${authors} · <https://github.com/${REPO}/compare/${base}...${DEPLOY_SHA}|View diff>`;
if (text.length > 4000) text = text.slice(0, 3950) + "\n…(truncated)";

const res = await fetch(GCHAT_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=UTF-8" },
  body: JSON.stringify({ text }),
});
if (!res.ok) throw new Error(`Chat webhook failed: ${res.status} ${await res.text()}`);

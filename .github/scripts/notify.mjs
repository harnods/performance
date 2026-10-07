import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

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
// Pages touched by this deploy (shared + demo files are intentionally not listed)
const routes = [...new Set(relevant.map((f) => pageRoute(f.path)).filter((r) => r !== null))];

// --- What changed: new items in the "What's new (internal)" changelog since the last deploy
const CHANGELOG_FILE = "composables/useWhatsNew.ts";
const readChangelog = (ref) => {
  try {
    const src = ref ? sh(`git show ${ref}:${CHANGELOG_FILE}`) : "";
    const m = src.match(/export const CHANGELOG[^=]*=\s*(\[[\s\S]*?\n\])\n/);
    return m ? new Function(`return ${m[1]}`)() : [];
  } catch {
    return [];
  }
};
const seen = new Set(
  readChangelog(base).flatMap((e) => e.items.map((i) => `${e.module}|${i.detail}`)),
);
const newItems = readChangelog(DEPLOY_SHA).flatMap((e) =>
  e.items
    .filter((i) => !seen.has(`${e.module}|${i.detail}`))
    .map((i) => ({ module: e.module, ...i })),
);
// Prototype-only scaffolding (dev coachmarks / dev tools) isn't a product change
const DEV_ONLY = /coachmark|dev ?tools/i;
const added = newItems.filter((i) => !DEV_ONLY.test(i.area));

const short = (t, max = 90) => {
  // Lead clause only: stop at the first sentence end, "(", ";" or ":"
  const lead = t.split(/(?<=[.!?])\s+|\s\(|;|:\s/)[0].trim();
  if (lead.length <= max) return lead;
  return lead.slice(0, max).replace(/\s+\S*$/, "") + "…";
};

const commits = sh(`git log --format=%an%x09%s ${base}..${DEPLOY_SHA}`).split("\n").filter(Boolean);
const authors = [...new Set(commits.map((c) => c.split("\t")[0]))].join(", ");

let changes;
if (newItems.length) {
  const byModule = {};
  for (const i of added) (byModule[i.module] ||= []).push(i);
  changes = Object.entries(byModule)
    .map(([module, items]) =>
      `*${module}*\n${items.map((i) => `  • [${i.category}] ${i.area}: ${short(i.detail)}`).join("\n")}`,
    )
    .join("\n\n");
} else {
  // No changelog entry: fall back to commit subjects (skip merge commits)
  const subjects = commits
    .map((c) => c.split("\t")[1])
    .filter((s) => s && !/^Merge /.test(s))
    .map((s) => s.replace(/^\w+(\([^)]*\))?!?:\s*/, ""));
  changes = subjects.map((s) => `  • ${s}`).join("\n");
}

// --- Initiative + PRD (maintained in .github/initiative.json, asked per PR via CLAUDE.md)
let initiative = {};
try {
  initiative = JSON.parse(readFileSync(".github/initiative.json", "utf8"));
} catch {}
const initiativeLines =
  (initiative.name ? `*Initiative:* ${initiative.name}\n` : "") +
  (initiative.prd ? `*PRD:* <${initiative.prd}|Open PRD>\n` : "");

const date = new Date().toLocaleDateString("en-US", {
  weekday: "short", month: "short", day: "numeric", year: "numeric",
});

const pagesLine = routes.length
  ? `\n\n*Pages:* ${routes.map((r) => `<${site}${r}|${r || "/"}>`).join("  ·  ")}`
  : "";

let text =
  `*Performance prototype deployed* · ${date}\n` +
  initiativeLines +
  `Live at: ${site}\n----------\n${changes || "  • Prototype tooling updates only"}${pagesLine}\n\n` +
  `${commits.length} commit(s) by ${authors} · <https://github.com/${REPO}/compare/${base}...${DEPLOY_SHA}|View diff>`;
if (text.length > 4000) text = text.slice(0, 3950) + "\n…(truncated)";

const res = await fetch(GCHAT_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=UTF-8" },
  body: JSON.stringify({ text }),
});
if (!res.ok) throw new Error(`Chat webhook failed: ${res.status} ${await res.text()}`);

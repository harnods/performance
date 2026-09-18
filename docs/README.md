# Design System Docs — Talenta Performance

**This folder is the source of truth for how UI is built in this repo.** Before you
build, replicate, or change ANY page, feature, or component, you read the relevant
pattern doc here first. These docs exist because the same mistakes kept recurring
(tables especially). They encode the *actual* conventions used across this codebase,
grounded in real files, so replication from production or building something new is
exact and repeatable.

---

## 🔴 The rule (read this)

**Every UI task starts by checking the pattern doc that matches what you're touching.**

Sequence for any UI work:

1. **Identify the patterns involved** (a list page? → table + filter-bar + pagination +
   page-title + header-bar. A create screen? → page-form + form + buttons.)
2. **Read the matching `docs/patterns/*.md`** BEFORE writing code. Do not guess from memory.
3. **Cross-check the live design system**:
   - Pixel components & tokens → `ai.mekari.design/mcp` (MCP server `mekari-pixel-web`:
     `get-component`, `get-docs`, `get-icon-name`, `get-block`, `get-template`).
   - Skills installed in this repo: **`pixel`**, **`implement-to-pixel`**, **`mekari-taste`**
     (invoke via the Skill tool when implementing).
4. **Match the existing pattern exactly.** Do NOT invent new components, behaviours, or
   CSS patterns unless explicitly asked. Mirror what's already there (`file:line`
   references are in each doc).
5. If the pattern doc and the live code disagree, the **code wins** — then update the doc.

> These repo docs and the live Pixel MCP/skills are complementary, not either/or.
> The MCP/skills tell you *what a Pixel component is and how it's configured*; these
> docs tell you *how this project composes those components into pages* — the recurring
> layout, spacing, and behaviour decisions that aren't captured upstream.

---

## Pattern docs

| Doc | Use it when you're building / touching… |
|-----|------------------------------------------|
| [`patterns/table.md`](patterns/table.md) | **Any table.** The #1 source of past mistakes — padding, alignment, sort, hover, borders, form-in-table, name links. Read it every time. |
| [`patterns/page-title.md`](patterns/page-title.md) | The page title + breadcrumb in the fixed 72px page header. |
| [`patterns/header-bar.md`](patterns/header-bar.md) | The page header bar (title + action buttons teleport) and the global top AppHeader. |
| [`patterns/sidebar-menu.md`](patterns/sidebar-menu.md) | The left nav — items, level-2 submenu, active state, collapse. |
| [`patterns/tabs.md`](patterns/tabs.md) | Section/status tabs (pageTabs) vs in-page detail tabs (MpTabs). |
| [`patterns/filter-bar.md`](patterns/filter-bar.md) | The filter row above a table (search + export always on the right). |
| [`patterns/pagination.md`](patterns/pagination.md) | Pagination under a table — the paged 52px footer, **and** progressive "Load more" (lists, and dashboard tables in a height-capped scroll region). |
| [`patterns/checkbox.md`](patterns/checkbox.md) | Checkboxes — label gap (the 24px bug), checkbox-in-table (first cell), and the bulk-action bar. |
| [`patterns/ai-prompt-builder.md`](patterns/ai-prompt-builder.md) | A "Describe" (write a prompt) vs "Build" (explicit fields) segmented control — the prompt→fields→save handoff, and the grey→green coverage badges that show what a prompt still misses. |
| [`patterns/accordion.md`](patterns/accordion.md) | `MpAccordion` — collapsible, removable form sections. Its prop names are **not** the obvious ones, the remove button must sit outside the header, and `MpInputLeftAddon` needs resizing to hold an operator select. |
| [`patterns/form.md`](patterns/form.md) | Any form — fields, selects, grid, section headers. |
| [`patterns/page-form.md`](patterns/page-form.md) | Full-page create/edit vs drawer; when to use which. |
| [`patterns/buttons.md`](patterns/buttons.md) | Button variants, sizes, Save vs Save changes, no-disabled rule. |
| [`patterns/date-format.md`](patterns/date-format.md) | Date & timestamp formatting (table vs non-table golden rule). |
| [`patterns/badges.md`](patterns/badges.md) | Status badges/pills. |
| [`patterns/dashboard-section.md`](patterns/dashboard-section.md) | **Any dashboard.** How sections compose — the section card shell (and why the table inside stays borderless), the compact no-illustration empty state, the "Last updated + Refresh" freshness row, and apply-on-demand filters. |
| [`patterns/stat-card.md`](patterns/stat-card.md) | Tinted headline-figure cards (On track / Off track / Not started) — tone table, the delta's "is-this-good" colour rule, and why dashboard triage tables order most-stale-first. |
| [`patterns/donut-chart.md`](patterns/donut-chart.md) | Single-proportion donut cards — `MpChart type="doughnut"`, legend/tooltip off, centre-label overlay, and the Chart.js hex exception. |
| [`patterns/avatar.md`](patterns/avatar.md) | Avatar sizing — `lg` beside a full employee identity block. |
| [`patterns/empty-state.md`](patterns/empty-state.md) | Empty states (illustration + secondary button). |
| [`patterns/upload.md`](patterns/upload.md) | Single-file dropzone upload (drag/drop + browse, file-selected summary row, inline validation). |
| [`patterns/banner.md`](patterns/banner.md) | Any `MpBanner` — page-level info/success/warning/danger message above a table's filter bar. `MpBannerLink` is broken (use `MpTextlink`), and it has no progress affordance. **Also** the neutral "Showing …" summary strip, which is deliberately *not* an `MpBanner`. |
| [`patterns/modal.md`](patterns/modal.md) | Any `MpModal` — top-center alignment at 80px, and gate/confirmation modals (validate on the triggering action, share logic via a composable). |
| [`patterns/toggle.md`](patterns/toggle.md) | Any `MpToggle` — label-before-switch layout, and wrapping the whole control in a state-aware tooltip instead of a separate info icon. |
| [`patterns/icons.md`](patterns/icons.md) | PxIcon vs MpIcon, icon naming. |
| [`patterns/dev-scenario-control.md`](patterns/dev-scenario-control.md) | The floating dev-only scenario FAB — **never** for product actions. Panel shape, module-scope state, and the rules for faking data safely. |
| [`patterns/feature-flags.md`](patterns/feature-flags.md) | `utils/featureFlags.ts` — hiding a finished surface until it's meant to ship. The one sanctioned exception to CLAUDE.md's "no feature flags" rule, and which surfaces are currently off. |
| [`patterns/tokens.md`](patterns/tokens.md) | DT 2.4 token hygiene — no raw hex, no inline style. |
| [`patterns/archive-cycle.md`](patterns/archive-cycle.md) | The "All goals from 2020-2025" archive cycle — what's allowed on its goals vs. the cycle itself, and hiding Import/New goals + dev tools on all 5 of its tabs. |

Foundational stack rules (tokens, css(), Nuxt, dev server) live in [`../CLAUDE.md`](../CLAUDE.md)
and [`../AGENTS.md`](../AGENTS.md). The pattern docs above go deeper per surface.

## Domain docs (Goals)

| Doc | Use it when you're building / touching… |
|-----|------------------------------------------|
| [`goals-revamp.md`](goals-revamp.md) | Goals module end-to-end — architecture, IA, every user flow, prod↔revamp gaps. |
| [`goal-progress-calculation.md`](goal-progress-calculation.md) | **How goal progress is computed** — KR-average roll-up, per-KR `krPct`, leaf `value/max`, seed derivation, direction, status→color. |

---

## Keeping these docs true

- When you discover the code diverges from a doc, **fix the doc in the same change** (or
  fix the code if the doc is the intended standard). Stale docs are worse than none.
- Every rule in a pattern doc should point to a real `file:line` example. If you add a
  new canonical pattern, add its reference.

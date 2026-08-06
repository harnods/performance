# Goals Revamp — Design & Gap Report

> **Purpose.** End-to-end reference for the new Goals experience in this repo
> (`talenta-performance-d`), compared against the production Goals UI
> (`~/talenta-performance`, the Vue2 "talenta-review" app). Covers the IA, every
> user flow step-by-step, a feature-by-feature gap list, copy changes, what's
> stubbed (built in UI but not functional), and what production has that this
> revamp doesn't yet.

- **New UI:** `~/talenta-performance-d` — Nuxt3 + Pixel3, data persisted to
  `localStorage` "mini-DBs" (no backend). Stores: `talenta-goals-db`,
  `talenta-goal-cycles-db`, `talenta-goal-approvals-db`, `talenta-goal-categories-db`,
  `talenta-current-user`.
- **Prod (reference):** `~/talenta-performance` — Vue2.7 + Pixel v1, real API.
  Store `src/store/modules/goals.js` (thin), most logic in the view components.
- **Method:** static audit of both codebases. Stub call-sites carry `file:line`.

---

## 1. TL;DR

- **Biggest change = information architecture.** Prod is **goal-type–scoped**
  (`/goals/index/{individual|team|organization|company}/…`) with the cycle/period
  chosen *inside* each goal form. The revamp is **goal-cycle–centric**: a cycle is a
  first-class object (`/goals/goal-cycles/:id`) that owns its goals; scope
  (All/My/Company/Org/Team/Individual) is a filter/tab within a cycle.
- **The revamp is more complete than prod in some areas** — in-app approval
  workflow (submit → review diff → approve/reject/resubmit), bulk multi-owner "New
  goals" with per-owner weight budgeting, goal comments, and the goal-cycle CRUD are
  all fully built here and either external or absent in prod.
- **Major gaps vs prod:** Goal hierarchy/cascade tree (placeholder), all Import/Export
  and bulk Edit/Update/Close (stub page), and the rich Progress-update experience
  (attachments, effective date, notes, history timeline, KR-level & per-event
  accumulation, requested-vs-current stacked bar) — the revamp only has a
  status + achievement-value update.
- **Copy shifts:** KPI direction "Increase/Decrease KPI" → "Goal direction: Higher/Lower
  is better"; progress mechanism "By summary achievement / per event" → "Manual entry /
  Log-based"; "No baseline" toggle → inverted "Use baseline" checkbox; goal create is a
  right **drawer** ("Add goal") not a full page ("Create new goal").

---

## 2. Architecture & IA comparison

| | **Production (old)** | **Revamp (new)** |
|---|---|---|
| Root | `/goals` → type list `index/individual/ongoing` | `/goals` (no page) → `/goals/goal-cycles` |
| Organizing object | Goal **type** (individual/team/org/company) | Goal **cycle** (period container, CRUD) |
| Cycle/period | Chosen inside the goal form (segmented control: Custom/Monthly/Quarterly/Half/Yearly) | A managed entity: name, period, progress-update method, weight rule |
| Goal list | `general/Index.vue` per type+status (ongoing/closed/requested) | `goal-cycles/:id` tabs + scope dropdown; sibling scoped pages for Company/Org/Team/Individual |
| Create goal | Full page `form/Index.vue` (`/goals/form`), preceded by a goal-type modal | Right **drawer** `AddGoalDrawer` from a cycle; bulk multi-owner via `/…/new` |
| Goal detail | `general/Detail.vue` | `goal-cycles/:id/goals/:goalId` |
| Hierarchy | `Hierarchy.vue` — panzoom cascade tree (SA/consultant) | **Placeholder** (empty tab) |
| Categories | `categories/Index` + `Detail` | `goal-categories/index` + `detail/:uuid` (parity) |
| Settings | `Setting.vue` — persisted flags via API | `goal-settings.vue` — **local-only**, mostly no persistence |
| Backend | Real API (`/goals/*`, `/goal-categories/*`, `/goal-settings/*`) | `localStorage` mini-DBs, seeded (88 H1 goals + H2 clones) |

**Cycle-detail tabs (new, in-page state, not routes):** All goals · Goal hierarchy
(placeholder) · My requests (`hasManager`) · Awaiting approval (`isSuperAdmin`) · Goal
cycle info. Scope dropdown: My goals / My direct reports / All / Company / Organization
/ Team / Individual.

---

## 3. End-to-end user flows (new UI, step by step)

### A. Create / edit a goal cycle *(new — no prod equivalent as a standalone object)*
1. `/goals/goal-cycles` → **New goal cycle** (header primary) → right drawer.
2. Fields: **Goal cycle name** (req, /60) · **Goal period** (`PxAdvancedDatePicker`) ·
   **Progress update method** (Manual entry / Log-based) · **Goal weight** → "Make goal
   weight mandatory" (default on).
3. **Save** → `addCycle()`, toast "Goal cycle created", route to `/goals/goal-cycles/:id`.
4. Edit via row Actions → Edit (preloaded, **"Save changes"**) or cycle detail → **Goal
   cycle info** tab → inline edit (`GoalCycleInfoPanel`).
5. Delete: blocked (error toast) if the cycle has any goal incl. drafts; else confirm →
   `deleteGoalsByCycle` + `deleteCycle`.

### B. Add goals — single & bulk multi-owner
1. Cycle detail → **New goals** → `SelectEmployeesDrawer` (owners already at 100% weight
   excluded when `weightMandatory`).
2. Continue → `/goals/goal-cycles/:id/new?employees=…`. Owner summary banner (1 vs many;
   "Each selected owner will receive their own copy…").
3. **Add goal** → `AddGoalDrawer` (one shared definition; see C–F).
4. Rows: single-owner = 1 row/goal; multi-owner = 1 row per (goal,owner) with
   rowspan-merged definition; per-owner kebab Edit (detaches owner into an independent
   copy) / Remove.
5. Weight footer: single = "Total goal weight — X% of 100%"; multi = per-owner breakdown.
6. **Save** / **Save as draft** / **Cancel** (see G). Unsaved-changes guard + native
   beforeunload.

### C. Goal measurement
`AddGoalDrawer` → units **Percentage / Number / Amount / Deadline**. Percentage defaults
0→100; Amount adds a **Currency** picker + thousands-formatted inputs; **Use baseline**
toggles the Start value; **Goal direction** (Higher/Lower is better; hidden for Deadline).
Deadline = `MpDatePicker` (clamped to cycle period) + optional graduated **deadline rules**
(Days exceeded → Achievement %, max `MAX_DEADLINE_RULES`). Schedule: Start disabled
(inherits cycle), End bounded to `[cycleStart+1, cycleEnd]`, **Repeat this goal** + preview.
**Edit lock (prod parity):** once a goal already has achievement, its **measurement unit** and
**direction** are locked on edit with a "Can't be changed — this goal already has progress" note.
Prod keys this off an API flag (`goal.disable_measure_type` / `disable_measure_progress`, *not* the
numeric value); our mock proxy is `hasProgress = (goal.pill ?? 0) > 0`, carried on `DraftGoal`.

### D. Key results — `AddKeyResultDrawer` sub-drawer
From "Key results (Optional) + Add key result". Fields: **name** (/255) · Description ·
**Measurement unit** (4 units + inline per-unit fields incl. deadline rules) · **Goal
direction** · **Progress update method** (Manual/Log-based, only when direction=higher).
Emits a `DraftKeyResult` (baseline/target/direction + summary string). Sub-drawer has its own
unsaved-changes guard. On the goal detail page each KR draws its own progress bar and
**drives the goal's overall %** — see §I and [`goal-progress-calculation.md`](goal-progress-calculation.md).
**Edit lock (prod parity):** editing a KR that already has progress locks its **measurement unit**
and **direction** (proxy for prod's per-KR `disable_measure_type`; here: `currentValue` moved off
baseline). **Delete KR:** confirm modal only for KRs already saved on the goal (prod parity — new
KRs delete immediately); the warning states it affects the goal's progress. KRs stay Optional (a
goal can have zero); no min/max count.

### E. Align a goal to a parent — `GoalAlignDrawer`
Row Actions → **Align goal** (hidden for company-level). Level rules `ALLOWED_PARENT_LEVELS`:
individual → team+org; team → org; org → org+company; company → none. **Member-gated**
(parent `viewerIds` must include the owner; company open to all; no self/loop). Grouped
Company/Org/Team, searchable, radio select → sets `alignedToId`, toast "Goal aligned".
⚠️ This write bypasses approval even for direct reports.
**Align to a key result:** if a candidate parent goal has key results, each KR is listed as
an indented, separately-selectable sub-row under it — selecting one aligns to that specific KR
(`alignedToKrId`) instead of the whole goal. On the goal detail Alignment card this renders a
**Key result** block first (KR name · Measurement type · Key result progress bar), a divider, then
the parent-goal block (type badge · name · period · measurement type · category · sub-category ·
goal progress). Removing the alignment clears both `alignedToId` and `alignedToKrId`.

### F. Members & contributors *(in AddGoalDrawer)*
**Goal members** only for Team/Org (`viewerIds`) + Org "Limit who can view this goal".
**Goal contributor**: pool = members (Team/Org) or all employees (Company/Individual);
modes All / Selected; one contributor card per owner in multi-owner mode.

### G. Save vs Save as draft *(`new.vue`)*
- **Save:** if `weightMandatory`, each owner must total exactly 100% (blocked otherwise);
  owners with a manager → `createSubmission` (approval), others → `addGoals` (immediate);
  toast varies (saved / submitted / mixed).
- **Save as draft:** `isDraft=true`, never approval, immediate, needs ≥1 goal.

### H. Approval — My requests / Awaiting approval
Direct-report create/edit/delete → `createSubmission`. Approval centralized to Super Admin
(Rizal) + a manager reviews their own reports. **Awaiting approval** (`GoalApprovalQueue`)
→ review (`GoalSubmissionReview`): category-merged diff (before→after strikethrough),
100%-weight footer, accept-all/per-row gating for create bundles → **Approve** commits all
items (add/update/delete) → toast; **Reject / Request revision** with reason → inbox
notification; owner sees reason → **Resubmit for approval**.

### I. Update goal progress
Goal detail → Actions → **Update progress** modal. Progress precedence (production parity):
**key results → aligned children → manual leaf**.
- **KR-driven** (goal has KRs): edit each KR's current value → goal % = **average of its KRs**;
  goal `value` back-projected onto `min→max`; **status set manually** via the Status dropdown
  (colour ≠ %). Also captures notes / effective date / attachments (display-only) + a submit-confirm step.
- **Aligned children**: modal is **read-only** (Close only) — progress rolls up from children.
- **Manual leaf**: **Status** (On/Off track) + **Achievement value** → `pill = value/max`.
- Deadline goals = status only.

**Full formulas — [`goal-progress-calculation.md`](goal-progress-calculation.md)** (per-KR
`krPct`, the average roll-up, the leaf `value/max` simplification, seed derivation,
direction auto-derivation, and status→color mapping).

**Layout — rebuilt to production 1:1** (`ModalUpdateProgress.vue` / `UpdateProgressItem.vue`), now a
**right-side `MpDrawer size="lg"`** (not a modal) with **overlay-click disabled**
(`is-close-on-overlay-click="false"` — don't lose a half-filled form). It's a **shared component**
`components/UpdateProgressDrawer.vue` (`:goal` + `:is-open`, emits `close`/`saved`), opened in place by
the **row "Update goal progress" action** on every goal list (goal-cycle index + Company/Org/Team/
Individual pages) and by the goal detail page — no navigation to detail required.
- **Goal summary header block** (rounded neutral-subtle panel, **all text at `text.default`** for
  readability): code + title `(weight%)`; a **manual status dropdown** (`PxSelectPopover`, 180px:
  `On track / Off track / Not updated`; deadline goals = `Complete / Not started`) — read-only
  roll-up mode shows a plain `MpBadge` instead; a meta row (`{Type} goal · {cycle period} ·
  Higher/Lower is better · {Manual entry|Log-based}`); plain-text description (rich text stripped);
  `{category} · {sub-category}`; and **the goal's own progress bar**.
- **Status is decided manually** — the dropdown, not the entered value, drives every progress-bar
  colour in the modal (on track = teal, off track = rose, not updated = gray). Bars fill to the
  computed %, but the colour never changes on typing (`statusFillClass`).
- **KR-driven** → **`Key results (N)` (H2)** then one **UpdateProgressItem** per KR: left = live
  progress bar (current value + `%` achievement pill, baseline→target range) that recomputes as you
  type; right (33%) = value input (`Rp` left-addon for amount, `%` right-addon for percentage). KR
  meta = `Higher/Lower is better · Manual entry|Log-based`.
- **Aligned children** → `MpBanner variant="info"` with the exact prod copy *"Progress cannot be
  updated manually if they have goal aligned and the progress will be taken from the child goal."*
  + a read-only roll-up bar; footer shows **Close** only.
- **Manual leaf** → single UpdateProgressItem + **Status** select (deadline goals = status only:
  `Complete / Not started`).
- Shared footer fields (all non-children modes): **Notes** (`MpTextarea`, "Optional", full width),
  **Effective date (optional)** and **Add attachment** both constrained to **3-col / 264px** (same
  width as a form select) — `MpDatePicker` (`DD MMM YYYY`, future disabled) and `MpUpload` (multiple,
  max 5/10 MB, with a pending-file list + Remove).
- Footer **Submit** opens a confirmation modal *"Update progress confirmation" / "Are you sure
  want to update this progress?"* → Submit persists via `saveUpdate`.

### I.2 Activity log (goal history)
Prod calls this the **activity journey / history** (`ModalHistory.vue` + `HistoryList`/`HistoryItem`,
`GET /goals/progress-history/{uuid}`) — a **modal** in prod, rebuilt here as a **right drawer**
`components/GoalActivityLogDrawer.vue`. Opened by the row **"Activity log"** action (menu order: View
details · Update goal progress · Align goal · **Activity log** · Edit · Delete), by the goal detail
Actions menu, and by the detail page's **"Last updated by … on …"** link. Layout: goal-summary header
(code · name+weight · description · owner avatar) + a **vertical timeline** (dot + connecting line)
of entries, newest first. Three entry kinds mirror prod: **progress** (actor + status pill
On track/Off track · wording · effective date · attachment rows — `doc` icon, name + size, with
**Reupload** and **Delete** actions per file, prod parity), **approval** (`Approved by {name}`),
and **goal created** (`Goal created by {name}`) as the oldest. Includes an **empty state** (prod had
none). Entries come from `composables/useGoalActivityStore.ts`:
- **Baseline** (deterministic per goal): created + optional approval + 1–3 progress updates ramping to
  the goal's `pill`, plus the goal's **comments** (from `useGoalCommentsStore`, newest first).
- **Recorded events** (real, persisted to `talenta-goal-activity-db`): every user action calls
  `logActivity(goalId, …)` — **update progress**, **add/edit/delete key result**, **edit goal**,
  **align / remove alignment** — which prepends a timeline entry *and* bumps the goal's
  `updatedAt`/`updatedBy` so the detail footer "Last updated by … on …" reflects it. A **comment**
  the user posts also shows in the log (via the comments store), without bumping "last updated".

### I.3 Close goal
Row **"Close goal"** action (menu order: View details · Update goal progress · Align goal · Activity
log · Edit · **Close goal** · Delete) on the goal-cycle index + all scoped pages, and in the goal
detail Actions menu. Prod parity (`ModalDelete type="close"`): **no approval, no progress threshold** —
immediate on confirm. Confirmation modal is **non-destructive** (primary/blue, not red): title
*"Close goal?"*, body *"Once a goal has closed, {name} can no longer submit progress or be edited."*,
confirm **"Yes, close goal"**. Sets `Goal.isClosed = true` (prod `goal_status === 2`), logs an activity
event ("closed the goal") and stamps `updatedAt`. A closed goal is **read-only**: Update progress /
Align / Edit / Close and the KR Add/Edit/Delete controls are hidden; View details, Activity log and
Delete remain. Shown with a **"Closed" badge** next to the goal name. No reopen (terminal, as in prod).
Handled by shared `composables/useGoalCloser.ts`.

### J. Goal categories
`/goals/goal-categories` → **Add goal category** (`GoalCategoryFormDrawer`: name /60 unique,
description /255, dynamic sub-categories /60 unique; in-use sub-cat can't be removed;
edit-with-linked-goals cascade confirm). Row Actions: View details / Edit / Archive|Activate
/ Delete (guarded when linked). Detail page shows linked goals (real, per-cycle).

### K. My goals / direct reports / bulk
Scope dropdown: **My goals** (single owner — no accordion, no All-filters) / **My direct
reports**. Bulk select (`useGoalBulkSelect`) on scoped pages → `GoalBulkActionBar` replaces
the header row → Update / Edit / Close / **Delete** selected (only Delete is real — §6).

---

## 4. Feature-by-feature comparison & gaps

Legend: ✅ built & functional · 🟡 partial/UI-only · ❌ absent · ➕ new capability not in prod.

| Area | Production | Revamp | Gap / note |
|---|---|---|---|
| Goal cycle as managed object | ❌ (period picked in form) | ✅ CRUD, status, weight rule | ➕ new IA |
| Goal CRUD | ✅ | ✅ (drawer) | parity |
| Goal types/levels | ✅ 4 types (type-modal first) | ✅ (field in drawer) | parity; no pre-select "goal type" modal |
| Measurement units | ✅ %, Number, Currency, Deadline | ✅ %, Number, Amount, Deadline | parity ("Currency"→"Amount") |
| Baseline/target + direction | ✅ (No-baseline toggle) | ✅ (Use-baseline; Higher/Lower) | parity, copy/logic inverted |
| Deadline + graduated rules | ✅ (≤10) | ✅ (≤`MAX_DEADLINE_RULES`) | parity |
| "Show actual %" (no rounding) | ✅ `is_not_rounding` | ❌ | **gap** |
| Key results CRUD | ✅ (form-staged + live API) | ✅ (drawer + persists) | parity |
| KR measurement / mechanism | ✅ per-KR | ✅ per-KR (Manual/Log-based) | parity (wording differs) |
| Align to parent **goal** | ✅ | ✅ (`GoalAlignDrawer`) | parity |
| Align to a specific **key result** | ✅ (expand KR in dropdown) | ❌ | **gap** — new aligns to goals only |
| Remove alignment | ✅ (`ParentDetail`) | ❌ (can set, can't unset) | **gap** |
| Cascade / hierarchy tree | ✅ panzoom chart + search | 🟡 **placeholder** | **gap** |
| Progress: status + value | ✅ | ✅ | parity |
| Progress: notes/comment | ✅ | ❌ | **gap** |
| Progress: effective date | ✅ (optional/mandatory setting) | ❌ | **gap** |
| Progress: attachments (≤5) | ✅ + reupload/delete | ❌ | **gap** |
| Progress: history/activity timeline | ✅ (`ModalHistory`) | ❌ | **gap** |
| Progress: per-event vs summary accumulation | ✅ (mechanism drives calc) | 🟡 field exists, calc not applied | **gap** |
| Progress: requested-vs-current stacked bar | ✅ | ❌ | **gap** |
| Progress: read-only / aligned-goal lockout | ✅ | ❌ | **gap** |
| Bulk select | ✅ | ✅ | parity |
| Bulk **delete** | ✅ (async email) | ✅ (real; queues for reports) | parity |
| Bulk **edit / update / close** | ✅ | 🟡 **stub page** | **gap** |
| Import (mass create / bulk edit / bulk update XLSX) | ✅ | 🟡 **stub** | **gap** |
| Export | (n/a explicit) | 🟡 **no-op button** | remove or build |
| Approval workflow | 🟡 external `url_approve` link | ✅ in-app submit/review/approve/reject/resubmit | ➕ more complete in new |
| Goal comments / @mention | ✅ | ✅ (persists) | parity; composer attach stub |
| Categories & sub-categories | ✅ | ✅ | parity |
| Category filter on list (hierarchical) | ✅ | 🟡 All-filters drawer exists; category-filter machine not ported | **gap** |
| Members / contributors / restricted visibility | ✅ | ✅ | parity |
| Settings (approval, creator, categories, grouped notif, attachment/date mandatory) | ✅ persisted | 🟡 **local-only**, 2 no-op buttons | **gap** |
| Firstrun onboarding | ✅ | ❌ | minor gap |
| "Submit and create new goal" (create-again) | ✅ | ❌ | minor gap |
| Repeat goal | ✅ recurrence | ✅ + preview | parity |

---

## 5. Copy changes (prod → revamp)

| Context | Production wording | Revamp wording |
|---|---|---|
| Create goal screen | "Create new goal" / "Edit goals" (full page) | "Add goal" / "Edit goal" (drawer) |
| KPI direction | "Increase KPI" / "Decrease KPI" (`kpi_type`) | "Goal direction — Higher is better / Lower is better" |
| Progress mechanism | "By summary achievement" / "By achievement value per event" | "Manual entry" / "Log-based" (shared with the cycle's Progress update method) |
| Baseline toggle | "No baseline" (value from final target) | "Use baseline" (inverted checkbox) |
| Measurement unit | "Currency" | "Amount" (still a currency picker) |
| Members | "Goal member" | "Goal members" |
| Contributors | "Goal contributors" · "All members / Selected member" | "Goal contributor" · "All members / Selected members" |
| Alignment | "Align parent goal" / dropdown grouped team/organizational/company | "Align goal" → drawer "Align to parent goal" |
| Cycle/period | "Goal cycle" segmented control + "Goal period" in the form | Standalone "Goal cycle" object (name + period + method + weight rule) |
| Approve action | external "Approve/Reject" link | in-app "Approve" / "Reject / Request revision" / "Resubmit for approval" |
| Progress modal | "Update progress" (goal-summary header, per-KR items, notes, effective date, attachments, confirmation) | **Matched 1:1** — `size="xl"`, goal-summary header + status pill, per-KR UpdateProgressItem (live bar), Notes + Effective date + Add attachment, Submit → confirmation modal |
| KR error | (field-level) | toast "Please check the form's error" |

*(Both keep: On Track/Off Track/Not Updated, Increase/Decrease KPI in read-only sidebar,
"View aligned goals (n)", category weight tooltip, delete/archive confirmation intent.)*

---

## 6. Built in the UI but NOT functional (stubs) — action backlog

| # | What | Where (`file:line`) | State |
|---|---|---|---|
| 1 | **Bulk goal-action page** (edit/update/close target) | `pages/goals/goal-cycles/[id]/import.vue:3,57` | Renders "This flow isn't built in this prototype yet." No persistence. |
| 2 | **Bulk Edit / Update / Close selected** | `company-goals.vue:184` · `individual-goals.vue:205` · `team-goals.vue:219` (+ organization) via `goToImport()` | All route to the stub (#1); do not act. Only **Delete selected** is real. |
| 3 | **Import goals** button | `[id]/index.vue:536`, `company-goals.vue:384`, `individual-goals.vue:447`, `team-goals.vue:486` (+ org) | → stub (#1). No CSV/upload flow exists. |
| 4 | **Export** icon button | `[id]/index.vue:642`, `company-goals.vue:481`, `individual-goals.vue:576`, `team-goals.vue:612` (+ org) | No `@click` — decorative. |
| 5 | **Goal hierarchy** tab | `[id]/index.vue:590` (+ redirect page `goal-hierarchy.vue`) | Empty placeholder. |
| 6 | **Goal settings** toggles | `goal-settings.vue` | Local `ref`s only — no persistence (except the "new interface" cookie). |
| 7 | **"Open approval settings"** button | `goal-settings.vue:135` | No handler (no-op). |
| 8 | **"Learn what's new"** link | `goal-settings.vue:112` | No handler (no-op). |
| 9 | **Comment composer "Attach file"** | `goals/[goalId].vue:645` | No handler. |
| 10 | Legacy standalone type pages | `company/organization/team/individual-goals.vue`, `goal-hierarchy.vue` | 302 redirect stubs. |
| 11 | Row action duplication | `[id]/index.vue:770-771` | "View details" and "Update goal progress" both just navigate to detail. |
| 12 | Approval type "Goal progress update" | `GoalApprovalQueue.vue:47-50` | Filter option with no producing flow (progress never routes through approval). |
| 13 | Align write bypasses approval | `[id]/index.vue:214-218` (`onAligned`) | Direct `updateGoal`, inconsistent with create/edit/delete gating. |

---

## 7. In production but MISSING in the revamp

Prioritised (rough) by user impact:

1. **Goal hierarchy / cascade tree** — prod `Hierarchy.vue` panzoom chart, period picker,
   search-with-navigation, zoom controls. New = empty placeholder.
2. **Import / Export & bulk Edit/Update/Close** — prod XLSX mass-create / bulk-edit /
   bulk-update + eligibility checks + async email. New = stub for all except bulk delete.
3. **Rich progress update** — prod adds notes, effective date, attachments (≤5, reupload/
   delete), progress **history timeline**, per-event vs summary accumulation, requested-vs-
   current stacked bar, read-only/aligned lockout. New = status + value only.
4. **KR-level alignment** and **Remove alignment** — prod aligns to a goal *or* a specific
   key result and can detach; new aligns to a goal only and can't unset.
5. **Persisted settings** — prod: approval config, goal-creator restriction, grouped
   notifications, mandatory attachments per type, mandatory effective date per type,
   category enablement. New = local-only, several no-op.
6. **Hierarchical category filter** on the goal list (select-all/partial/implicit-all →
   `category_ids`/`partial_category_ids`/`sub_category_ids`).
7. **"Show actual percentage"** (no-rounding) option.
8. **Firstrun onboarding** and **"Submit and create new goal"** (create-again).
9. Minor: goal-type pre-select modal before the form; guidebook/help popover deep content.

*(Conversely, capabilities the revamp has that prod lacks in-app: managed goal cycles,
bulk multi-owner "New goals" with per-owner 100%-weight budgeting + detach-edit, the full
in-app approval/review/resubmit workflow, and goal comments.)*

---

## 8. Suggested next steps

1. **Wire the bulk-action + import flow** (retire `import.vue` stub): real Edit/Update/
   Close-selected against the goals store; decide Import scope (or hide the button).
2. **Build the Goal hierarchy tab** (even a simple aligned-tree from `alignedToId`).
3. **Enrich Update progress**: notes + effective date + history timeline first; attachments
   and per-event accumulation next.
4. **Add "Remove alignment"** and consider KR-level alignment.
5. **Persist goal settings** (or clearly mark the page as demo-only) and wire/remove the two
   no-op buttons; fix the Export no-op and the align-bypasses-approval inconsistency.
6. Reconcile copy where the revamp intentionally diverges (KPI→direction, mechanism→method)
   — confirm these are the intended new terms.

---

*Generated from a static audit of both repos. Stub line numbers reflect the code at audit
time; re-verify before implementing.*

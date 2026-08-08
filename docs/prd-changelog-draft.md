# PRD addendum — DRAFT (not published to Confluence)

Proposed new section for **[PRD] Flexible Competency Assignment 2026-Q3** (Confluence page 51225625336). English. Documents what the working prototype (`talenta-performance-d`, "**-d**") implements versus the **production** app (`talenta-performance`, "PROD"), plus every copy change. Not yet written to the PRD — pending review.

Legend: **PROD** = Vue2 / Pixel v1 production. **-d** = Nuxt3 / Pixel3 DT2.4 prototype.

---

## 11. Prototype implementation notes (-d) — 2026-08-08

### 11.1 Changelog

- **Competency Assignment (S1, S9, S10):** list / detail / create / edit now read and write **real, persisted records** (localStorage mini-DB). ~17 seeded scenarios grounded in shared data (one scoped assignment per real job position — job level / grade / class — plus 2 unscoped baselines / D6). Detail renders the real matrix; edit locks scope (S10) and prefills the real record.
- **Succession Plan (S3):** 3-step create wizard; Step 2 adapts to the position's scope attribute and lists only covered values; assessment-type Talenta/Manual; plan **detail page with 2 tabs** (Successor talents + Succession plan info) and row actions Promote / Update readiness / Update assessment (manual pools only) / Remove / View details.
- **Shared resolver (Engineering Notes):** succession and competency now share **one dataset** — Step 2 / detail targets equal the competency assignment's targets value-for-value.
- **Tables:** default order is **newest-first** across the app; manual column sort overrides.
- **Not built yet / out of scope so far:** S2 gap chart, S4 review form, S5 review result, S7 PDF, S8 reports, S11 activity log, S12 analytics; **S13 import is UI-only** (no resolver/fallback); **D3** per-value uniqueness and one-scope-type-per-position are **not enforced**; old_pool has no UI; no real Promote/Edit API (prototype has no backend).

---

### 11.2 Succession Plan — PROD vs -d

#### Changed (same feature, different UI / behaviour / copy)
- **Index view switch:** PROD = segmented control (two icon buttons, right of filter row) → **-d = page-level tabs** ("Key positions" / "Successor talents").
- **Org filter:** PROD = multi-select checkbox dropdown **+ "Apply filter" button** → -d = single-select searchable/clearable popover, **instant/reactive** (no apply button).
- **Sort:** PROD = header-click toggle → -d = per-column hover **`PxColumnSortMenu`** (typed text/number/date).
- **Pagination:** PROD = shared server-paginated component → -d = client rows-per-page (10/25/50/100) + "Showing X–Y of N · Page a of b".
- **Key-position row button:** PROD = "Edit detail" (old pools) / "View detail" → **-d = always "View details"** (no old-pool branch).
- **"View details" destination:** PROD = succession employee-profile route → **-d = talent-directory profile** (`/talents/talent-directory/{id}`).
- **Readiness cell:** PROD = raw text → -d = label + **green "Ready now" dot**.
- **Create wizard steps renamed:** "Employment criteria / Standard competencies / Successor talent" → **"Position & criteria / Competency assessment / Successor talent"**; stepper style = Pixel numbered variant (number circle, label below).
- **Step 3 semantics:** PROD requires ≥1 talent → **-d makes Step 3 optional** ("create the pool now, add talent later") and **filters candidates by Step-1 criteria** (service length + employment status).
- **Add-talent UI:** PROD modal (`AddSuccessorTalent` / `ModalBulkAddEmployee`) → **-d `SelectEmployeesDrawer`** (two-column add/selected, search + Select all + Clear).
- **Modal layout:** all four action modals standardised — employee shown flat (no box) as `Employee ID | Job position | Org`, then 24px · divider · 24px · form; all size md.
- Copy renames (full list in 11.4).

#### New in -d (not in PROD at all)
- **Detail page has TWO tabs** — "Successor talents" + "Succession plan info". PROD `Detail.vue` has **no tabs**; the "Succession plan info" tab (key-value summary + read-only competency-standard target table + Edit) has **no PROD equivalent**.
- **Avatar hover coachmark** (floating card teleported to body: name + `code | title | department`). PROD has only a plain name tooltip.
- **Real, resolved competency standard** in Step 2 & detail — targets resolve per chosen scope value from shared data; changing the scope value changes the target column.
- **localStorage persistence** (`useSuccessionStore`) — a created plan and its add/remove/readiness edits persist and reflect everywhere.
- **Newest-first default ordering**, **ready-now green dot**, per-column sort menus, rows-per-page footer.

#### Removed / not carried over from PROD
- **Bulk assessment** (`ModalAssessmentBulk`: XLS template, S3 upload) + the detail checkbox column and "Bulk action / Bulk update assessment" toolbar.
- **Old-pool** "Edit detail" button + orange progress icon; the >5 assessment relaxation for old pools.
- **Real Promote / Edit APIs** — Promote is a notify-HR toast only; the detail "Edit" is a no-op ghost button (no edit-plan flow).
- Apply-filter button, multi-select org filter, server sort/pagination; Mixpanel; feedback banner.

---

### 11.3 Competency Assignment — PROD vs -d

#### Changed
- **Scope model (fundamental):** PROD has **no scope-type picker** — matrix columns ARE job levels ("Add job level"). **-d adds a "Scoping attribute" type picker (Job level / Grade / Class)**; columns are values of the chosen attribute; scope type is **locked in edit mode** (S10) with an explanatory helper.
- **List columns:** PROD `Assignment name · Job position · Job level` → **-d `Assignment name · Job position · Scope attribute (tag) · Groups (count)`**.
- **Assignment name cell:** PROD plain text → -d clickable link → detail.
- **Job-position picker:** PROD "Add job position" **modal** (branch/org filters, eligible list) → **-d inline `MpInputTag`** type-ahead.
- **Rating options:** PROD numeric `1..max` (from rating scale) → **-d `Not applicable` + `1 — Needs development … 5 — Expert`**.
- **Success feedback:** PROD toast → -d dismissible **banner** on the list.
- **Submit verb:** PROD "Submit" (always) → **-d "Save" (create) / "Save changes" (edit)**.
- **Validation:** PROD inline per-field → -d top danger banner + per-field.
- **Delete:** PROD `ModalDeleteAssignment` component → -d inline confirm modal ("Delete **{name}**? This can't be undone.").

#### New in -d
- **Detail page** — PROD has **no single-assignment detail view** (list → edit only). -d adds a read-only detail (positions, scope tag, matrix with sortable columns) reading a **real record**.
- **~17 seeded scenarios** grounded in shared data (15 real positions + 2 unscoped baselines), so competency targets match Succession value-for-value.
- **localStorage persistence** (`useCompetencyStore`) — created/edited/deleted assignments appear in the list and survive reload (PROD prototype previously did neither).
- **List filter (scope attribute) + search + client pagination + newest-first**; per-column sort menus.

#### Removed / not carried over
- `ModalAddJobPosition`; rating-scale-driven max rating; duplicate-name (422) handling; add-level pulse animation; feedback banner; and the wider competency surroundings (import resolver/history, rating-scale/group/item setup, gap chart, PDF, activity log, mixpanel) — the -d assignment pages don't wire to them (only stub pages exist).

---

### 11.4 Copy diff (PROD → -d)

**Succession**

| Surface | PROD | -d |
|---|---|---|
| Index title | Succession plan | Succession plans |
| "New" badge | New | *(removed)* |
| Tab: key position | Key Position | Key positions |
| Tab: employee | Employee | Successor talents |
| Search placeholder | Search key position / Search employee | Search key position… / Search employee… |
| Filter apply | Apply filter (button) | *(removed — reactive)* |
| KeyPos column | Successor Talent | Successor talents |
| Row button (old pool) | Edit detail | *(removed)* |
| Row button (new) | View detail | View details |
| Employee column 1 | Employee to nominate | Employee |
| Action trigger | Action | Actions |
| Action item | Update Assessment | Update assessment |
| Action item | Change readiness | Update readiness |
| Action item | View detail | View details |
| Detail column 1 | Talent nominees | Employee |
| Detail column 4 | Latest assessment date | Assessment date |
| Empty state | No data to display. | No succession plan yet / No successor talent yet |
| Wizard step 1 | Employment criteria | Position & criteria |
| Wizard step 2 | Standard competencies | Competency assessment |
| Step 1 field | Service Length | Minimum service length |
| Step 1 field | Employee status | Employment status |
| Step 1 error | This field is required | You must select key position / …organization |
| Step 2 radio label | Assessment type | Where do candidate scores come from? |
| Step 2 radio option | Talenta performance | From Talenta Performance |
| Step 2 error | Job level field is required | You must select {job level/grade/class} |
| Step 3 add button | Add Talent | Add successor talent |
| Step 3 error | Talent field is required | You must select readiness for each successor talent |
| Create toast | `{position} pool created` | `Succession plan created…` |
| Step 2 block | You can not go to the next step… no assigned competency yet. | *(removed — inline notice)* |
| Promote body | You are about to promote the following employee: | *(removed — card only)* |
| Promote field | Key position | Promote to key position * |
| Promote toast | Employee successfully promoted | Promotion request sent to HR admin |
| Readiness title | Change readiness | Update readiness |
| Readiness footer confirm | Change | Save changes |
| Readiness toast | Rediness successfully updated *(typo)* | Readiness updated |
| Remove footer confirm | Delete | Remove |
| Remove toast | *(server message)* | Removed from pool |
| Assessment body label | Input assessment result | Assessment scores |
| Assessment toast | Assessment successfully updated | Assessment updated |

**Competency**

| Surface | PROD | -d |
|---|---|---|
| List title | Assignment | Assignments |
| List column | Job level | Scope attribute |
| List column | *(none)* | Groups |
| Action item | Edit assignment | Edit |
| Action item | Delete assignment | Delete |
| Action item | *(none)* | View details |
| Empty state | No data yet / Your data will display here | No assignments found. |
| Feedback | Assignment Created / Edited (toast) | Assignment created / updated (banner) |
| Form title | Create Assignment / Edit Assignment | Create assignment / Edit assignment |
| Name error | Name already exist / This field is required | Assignment name is required. |
| Job position help | You can select more than 1 job position | You can add multiple job positions |
| Scope control | *(none — columns are job levels)* | Scoping attribute (Job level / Job grade / Job class) |
| Matrix section | Set group / Create a group consisting of competency items… | Competency groups / Add competency groups and set a target rating per grade… |
| Submit | Submit | Save / Save changes |
| Validation | This field is required / Duplicate field | Couldn't save assignment / Please complete the highlighted fields… |
| Delete confirm | *(ModalDeleteAssignment)* | Delete **{name}**? This can't be undone. |

---

### 11.5 Note on prototype fidelity
The prototype has **no backend** — persistence is localStorage and Promote/Edit are non-destructive stand-ins. Copy and UI here reflect intended production behaviour where they diverge from the current prod build (e.g. the "Rediness" typo is fixed; Promote toast is reframed as a request, matching the modal's "we will notify HR admin" body).

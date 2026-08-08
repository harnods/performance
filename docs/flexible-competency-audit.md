# Flexible Competency Assignment (2026-Q3) — end-to-end audit

Audit of the flexible-competency initiative in `talenta-performance-d` (demo),
covering **Competencies → Succession plans**, compared against the PRD and the
production repo (`~/talenta-performance`, Vue2).

- **PRD:** Confluence page `51225625336` — *"[PRD] Flexible Competency Assignment — Assign by Job Position + Level / Grade / Class (2026-Q3)"* (space PR, Stage 02 / DRAFT). Story/rule refs below (S1–S13, §4.x, D1–D7) are from that page.
- **Prod reference:** `~/talenta-performance/src/views/talent-management/{succession-pool,…}`.
- Scope note: the PRD's core is the **Competency Assignment** scoping feature; the **Succession** module is largely a prod mirror, of which only **Step 2 (S3)** is a PRD story. The two modules currently use **two disconnected mock datasets** (see Gaps).

_Last updated as part of the succession-plan work session._

---

## 1. Scope map

### Competencies (`pages/talents/competencies/`)
| Screen | What it does |
|---|---|
| `index.vue` | Assignment list — filter (scope attribute + name search), sortable table, row actions (View / Edit / Delete), delete-confirm, pagination. Seed of 14. |
| `create.vue` | Create/Edit assignment — name, job positions (multi), single scope-type select, and a **matrix builder** (rows = groups, cols = scope values) with per-cell rating + "Not applicable", drag-reorder, add/remove. Edit locks scope. |
| `[id].vue` | Assignment detail (read-only matrix). **Static mock — ignores the id.** |
| `import-results.vue` | Generate-template tab (scope-attribute checkboxes reveal value selects); **Upload / History tabs are empty**. |
| `groups.vue` / `items.vue` / `rating-scale.vue` | "coming soon" stubs (PRD non-goals). |

### Succession plans (`pages/talents/succession-plans/`)
| Screen | What it does |
|---|---|
| `index.vue` | Two page-tabs — **Key positions** (position · org · successor avatars · View details) and **Successor talents** (employee · position · org · readiness · Actions). Org filter, search, sort, pagination, avatar hover coachmark. |
| `create.vue` | 3-step wizard — **Position & criteria** → **Competency assessment** (talenta/manual + scope-value + resolved targets, or no-assignment notice) → **Successor talent** (optional; add via drawer, per-row readiness). |
| `[id].vue` | Plan detail — tabs **Successor talents** (table + row actions + add) and **Succession plan info** (summary + competency standard + Edit). Title = pool key position (layout fallback). |

Shared components: `SuccessionPromoteModal`, `SuccessionReadinessModal`, `SuccessionAssessmentModal` (manual pools only), `SuccessionRemoveModal`, `SelectEmployeesDrawer`, `PxNoAssignmentNotice`.

---

## 2. PRD coverage

| Story / rule | Status | Where / note |
|---|---|---|
| **S1** Create assignment (bulk matrix) | Partial | Type select + group×value matrix; uniqueness / one-type-per-position **not enforced**. |
| **S2** Gap chart matching | Not covered | No gap-chart page; only `PxNoAssignmentNotice`. |
| **S3** Succession Step 2 adapts to attribute | **Covered** | `create.vue` resolves scope + covered values from `POSITION_INFO`; one dimension per position (§4.7). |
| **S4/S5** Review form / result | Not covered | — |
| **S6** Talent-profile competencies tab | Partial | `getAssessmentResult` resolver exists; profile page is the talent-directory `[id]`. |
| **S7/S8** PDF / review reports | Not covered | — |
| **S9** Assignment list scope display | Covered | Scope tag / "—" for unscoped. |
| **S10/D2** Edit locks scope after save | Covered | `isEdit` renders scope read-only. ⚠ detail→edit hardcodes scope (Gap 2). |
| **S11/S12** Activity log / analytics | Not covered | No-op. |
| **S13/D7** Scoped import + fallback, never block | Partial | Metadata UI only; no resolver/template/fallback. |
| **D1** 3 attrs, no combining per assignment | Covered | Single scope-type select. |
| **D3** Bulk multi-value; uniqueness; 1 type/position | Partial | Multi-value ✅; **no uniqueness / single-type validation**. |
| **D4** Job position required | Covered | Inline validation. |
| **D5** No match → notice, no fallback | Covered (component) | `PxNoAssignmentNotice`; `attribute` prop not passed (generic copy). |
| **D6** Existing = unscoped, no migration | Covered (concept) | `scope: null` → "—"; edit maps to synthetic "All". |

---

## 3. Production vs `-d` differences

| Feature | Prod | `-d` | Intentional? |
|---|---|---|---|
| Step 2 competency source | Per-**job-level matrix** from Competency Assignment API | Per-**scope-value targets** from `POSITION_INFO`/`targetsForScopeValue`; single target column per chosen value | Yes — demo mock, matches §4.7 single-dimension |
| Assessment type (talenta/manual) | `manual` reveals Update Assessment | Same gating (`assessmentType==='manual'`) | Faithful |
| Promote | Calls API, **actually promotes** | Notify-HR request only — toast "Promotion request sent to HR admin", no state change | Intentional (demo). Missing "already in position" gating — documented |
| Update readiness | "Change readiness" / btn "Change" / toast typo "Rediness…" | "Update readiness" / btn "Save changes" / toast "Readiness updated" | Copy deviation (clearer; typo fixed) |
| Update assessment (manual) | Relaxes `>5` validation for **old pools** | Always validates 0–5 | Deviation — old-pool leniency dropped |
| Remove from pool | Red "Delete", dispatches removal | Confirmation modal + local removal (detail **and** index, reactive) | Faithful (index bug fixed this session) |
| View details (employee) | Succession-specific employee profile route | Talent-directory profile `/talents/talent-directory/{id}` | Deviation — reuses the real talent profile |
| `old_pool` / `isOldPool` | Progress icon + "Edit detail" routing + relaxed validation | Data carries `isOldPool`; **no UI honors it** (always "View details") | Not implemented — documented gap |
| Key position list source | Competency Assignment API | Derived from `EMPLOYEES` distinct titles | Yes — demo mock |
| Step 3 | **Required** successors | **Optional** (create empty pool); candidates filtered by service length + employment status | Intentional (demo convenience) |

---

## 4. Cases / edge cases (test checklist)

**Succession create**
- Key position with **no** `POSITION_INFO` → Step 2 shows no-assignment notice; cannot advance.
- Change key position → chosen scope value resets.
- Scope value change → target column recomputes (higher value → higher targets; −0.5/step floored at 1, half-step grid). *(unit-tested)*
- Step 3 empty → still creatable; talent added without readiness → inline error.
- Candidate filter: min service length (0–5+) × employment status (any/permanent/contract/probation); test a filter that yields 0 candidates. *(unit-tested)*
- Org & key position independent (prod parity).

**Succession index / detail**
- Readiness **"Ready now" (=99)** sorts as **most ready** (first ascending) — fixed this session.
- Pool with 0 successors → empty state; >5 successors → "+N" overflow avatar.
- Manual pool (sp-2, sp-3) shows "Update assessment"; talenta pool (sp-1) hides it.
- Remove from pool (index **and** detail) → row removed + toast.
- Unknown pool id → redirect to list.
- Assessment modal: score per group 0–5; empty/NaN/out-of-range → per-row error.
- Coachmark on last row opens upward (not clipped).

**Competencies** (documented, not this session's fixes)
- Unscoped assignment (no value columns); switching scope type wipes ratings; edit mode locks scope.
- D3 uniqueness / single-type-per-position — currently unenforced.
- Detail→Edit hardcodes `scope: 'job-level'` (Gap 2).

---

## 5. Copy audit

### Applied this session (succession module + shared drawer)
| File | Before | After |
|---|---|---|
| `[id].vue` | `3 successor talent added` | pluralized `…talent(s) added` |
| `create.vue` | `Only classs …` (triple-s bug) | `Only {scope} values …` |
| `create.vue` | `…each successor talent you added` | `…each successor talent` |
| `create.vue` | placeholder `Select range` | `Select readiness` |
| `create.vue` | toast `{job} pool created` | `Succession plan created …` |
| `create.vue` | `Add talent` (buttons + drawer) | `Add successor talent` |
| `index.vue` | column `Successor talent` | `Successor talents` |
| `index.vue` / `[id].vue` | button `Action` | `Actions` |
| `index.vue` | empty `No data to display.` | `No succession plan yet` / `No successor talent yet` |
| `[id].vue` | empty `No successor talent to display.` | `No successor talent yet` |
| `SuccessionReadinessModal` | toast `Readiness successfully updated` | `Readiness updated` |
| `SuccessionAssessmentModal` | toast `Assessment successfully updated`; `Input assessment result` | `Assessment updated`; `Assessment scores` |
| `SuccessionPromoteModal` | toast `Employee successfully promoted` | `Promotion request sent to HR admin` (accurate — request, not completed) |
| `SelectEmployeesDrawer` | `Select at least one employee to continue.` / `No employees found.` | `You must select at least one employee` / `No employees found` (UXW, no period) |
| all action modals | employee shown in a **bordered box** | flat row; meta `Employee ID | Job position | Org` |

### Recommended (competency module — not yet applied; needs sign-off)
| File | Issue | Suggested |
|---|---|---|
| `competencies/create.vue` | helper hardcodes "target rating per **grade**" regardless of scope | "per value" |
| `competencies/create.vue` / `[id].vue` | "Scoping attribute" vs "Scope attribute" drift | pick one ("Scope attribute") |
| both modules | "Grade/Class" vs "Job grade/Job class" | standardize the three scope labels |
| `competencies/*`, `import-results.vue` | inline errors `X is required.` / `Select a X.` (with period) | UXW `You must …` (no period) |
| `competencies/index.vue` | modal title `Delete assignment` (? in body) | `Delete assignment?` |
| `PxNoAssignmentNotice` | `attribute` prop never passed → D5 "…and {grade/class}" copy never shows | pass `attribute` from callers |
| feature-wide | `HR admin` vs `HR Admin` casing | standardize |

---

## 6. Known gaps / risks

**Intentional (demo scope):** notify-HR promote (no state change), key-position list from `EMPLOYEES`, Step 2 per-scope-value targets vs prod matrix, Step 3 optional, View details → talent directory.

**Resolved (competency module now real, persisted, coherent):**
1. ✅ **Competency persistence** — `composables/useCompetencyStore.ts` (localStorage). Create/edit/delete persist; created assignments appear in the list.
2. ✅ **Detail reads the real record** by id (no longer a static mock); Edit no longer hardcodes scope.
3. ✅ **Edit prefill loads the real record** (name, positions, scope, matrix, per-cell targets).
5. ✅ **Single coherent dataset** — `utils/competencyAssignments.ts` seeds ~17 scenarios grounded in `POSITION_INFO`/`DEPARTMENT_GROUPS`/`targetsForScopeValue`, so targets equal Succession's value-for-value; create/edit options use real positions + real competency groups.
- ✅ **Succession persistence** — `useSuccessionStore` (localStorage); add/remove/readiness persist.

**Still open (out of scope so far):**
4. **D3 integrity rules unenforced** (per-value uniqueness, one-scope-type-per-position) on create/edit.
6. **S13 import** — resolver/fallback/template are no-ops; Upload/History tabs empty.
7. **old_pool** — data present, no UI honors it.
8. **Gap chart / Review form / Review result / PDF / reports / activity log / analytics** (S2, S4, S5, S7, S8, S11, S12) — not built.

---

## 7. Regression tests added

`utils/competency.test.ts`, `utils/employees.test.ts`, `utils/succession.test.ts` (24 tests; full suite 45/45). They guard:
- `targetsForScopeValue` — top covered value = base targets; each step down −0.5 floored at 1; in `[1,5]` on a half-step grid; `[]` for unknown position/value.
- `getAssessmentResult` — deterministic, in-range, `[]` for no assignment.
- `POSITION_INFO` integrity — every position → valid department + covered scope values.
- `candidateIds` — service-length + employment-status filters; no criteria = all.
- Employee `tenure`/`employmentStatus` — stable, in valid range/enum.
- `assessmentDate` — deterministic, bounded.
- **DB coherence** — every seeded pool references real employees; its key position has a competency assignment; its `scopeValue` is covered. `employeeRows` flattens 1 row per successor.

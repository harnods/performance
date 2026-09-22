# QA Audit — Goals / Goal-cycles module

Unit-test suite added for the Goals module of `talenta-performance-d`
(Vitest 4, `npm test`). **9 new `*.test.ts` files, 114 new tests.** No source
file was modified. Test infrastructure added: `tests/setup.ts` (+ one
`setupFiles` line in `vitest.config.ts`) to stub the Nuxt auto-imports
(`ref`/`computed`/`reactive`/`watch`/`useCurrentUser`) that the store
composables create at module scope.

---

## (a) Coverage map — per source file

| Source file | Tested | Not tested / why |
| --- | --- | --- |
| `utils/periodPicker.ts` | `toISO`, `formatRangeCompact`, `yearValue`, `semesterValue`, `quarterValue`, `monthValue`, `weekValue` (Mon–Sun incl. Sunday edge), `customRangeValue`, `reconstructPeriod` (H1/H2 detect + custom fallback + round-trip) | `formatDateShort`, `startOfWeekMonday` are internal — covered indirectly. |
| `utils/goalDraft.ts` | `nextGoalCode` (start value, increment, uniqueness/monotonicity) | Interfaces only otherwise. |
| `utils/goalMapping.ts` | `goalFromDraft` / `draftFromGoal` round-trip, all 4 label maps (proved exact inverses), deadline handling, baseline on/off math, per-owner contributors & `ownerCanUpdateProgress`, `hasProgress` proxy, deep-copy isolation | — |
| `utils/goalRows.ts` | `matchesSearch`, `sortByCategory` (owner grouping on/off), `sortGoalRows` (empty key, in-group sort, group-level sort, stability), `withRowSpans` (+ owner-boundary rule, groupByOwner false), `countWhile`, `ownerOf` (+ throw), `alignedGoalsOf`, `expandAlignedRows` (collapsed + expanded rowspan extension) | `sumWeightWhile` internal — covered via `withRowSpans`. |
| `utils/goalFilters.ts` | `goalMatchesAllFilters` (all scopes, status-label mapping, AND across scopes, OR within scope, missing/unknown owner), `allFiltersCount` | — |
| `composables/useGoalCyclesStore.ts` | `goalCycleStatus` (Active/Inactive via fake clock), `addCycle` (id gen, `createdInNewUi`, author, status derivation, list round-trip + sort), `updateCycle`, `deleteCycle`, seed sort order | Exact start/end **boundary-day** equality NOT asserted — timezone-sensitive (see gap #2). `persist`/`loadFromStorage` are client-only no-ops in Node. |
| `composables/useGoalsStore.ts` | Pure: `isSuperAdmin`, `hasManager`, `needsApproval`, `fullyWeightedOwnerIds` (drafts excluded, ≥100), `EMPLOYEE_MANAGER`. Store: `addGoals`/`updateGoal`/`deleteGoal`/`deleteGoalsByCycle`. Seed invariants exercising the private KR math (`krAchievementPct`/`withKrProgress` banding + value scaling) and `resolveCompanyRollup` (avg-of-children + banding), and `categoryWeight` derivation. | `krAchievementPct`, `withKrProgress`, `resolveCompanyRollup`, `g`, `seed*`, `rescaleKRsEarly` are **not exported** → tested only indirectly through the public `goals` list. `resetToSeed` intentionally left alone (see gap #3). |
| `composables/useGoalApprovalsStore.ts` | `isCreateLikeItem` (create + published-draft edit), `submissionTypeLabel` (creation / progress-update / edit, incl. "every edit must be a progress move" and missing before/after), `isAwaitingApproval` | `actionLabelFor` is **not exported** (private) — could not test directly. Store body (`approve`/`reject`/persist) out of pure-function scope. |
| `composables/useGoalsDashboard.ts` | `parseUpdatedAt` (valid, single-digit day, null cases), `relativeAge` (all bands + singular/plural + future→today), `approvalEmployeeRows` (per-owner grouping, goalCount summed across batches, submissionIds array, newest-first sort, dedup), `approvalGoalRows` (per-item, title fallback, owner fallback) | The `useGoalsDashboard()` composable body (bucket/delta % math) requires the full reactive store graph; the pure exported helpers were prioritized per brief. Bucket/delta math left as a gap (#4). |

---

## (b) Bugs / gaps exposed

1. **BUG — per-owner weight budget exceeds 100% for 3 owners.**
   `composables/useGoalsStore.ts` (contract stated in header comment lines
   25–35 and 111–117: *"every owner's goals sum to exactly 100%"*). The 26 H1
   seed data violates this: summing `weight` over each owner's goals in cycle
   `seed-26-h1` gives **evelyn = 117, ali = 116, cinta = 121** (all others are
   correct at 100). Consequence: those owners' `categoryWeight` totals also
   re-sum to 117/116/121, not 100, so the "category share of a 100% budget"
   figure the tables render is overstated for them.
   - Expected: 100 for every owner. Actual: 117 / 116 / 121.
   - Recorded as `it.fails('DOCUMENTED INVARIANT: every owner's goals sum to
     exactly 100% …')` in `composables/useGoalsStore.test.ts`, with a companion
     passing test that pins the current real sums so a future fix will surface.

2. **GAP / latent bug — `goalCycleStatus` boundary day is timezone-sensitive.**
   `composables/useGoalCyclesStore.ts:8-14`. "Today" is built from local
   Y/M/D midnight, but `cycle.startDate`/`endDate` (`'yyyy-mm-dd'`) are parsed
   by `new Date(str)` as **UTC** midnight. In any timezone east of UTC (e.g.
   the likely dev TZ, UTC+7) a cycle is reported **Inactive on its own first
   day** because local-midnight-today (00:00+07) is 7h before the parsed start
   (07:00+07). Tests deliberately assert only dates ≥1 full day inside/outside
   the range to stay deterministic across timezones, so this is documented, not
   asserted.

3. **GAP — `resetToSeed()` is not equivalent to the initial store contents.**
   `composables/useGoalsStore.ts:1326-1329` sets `goals.value = seed()`, i.e.
   only the 26 H1 list with **no company roll-up applied and without the H2 /
   archive goals**, whereas the store initializes from `buildSeededGoals()`
   (`resolveCompanyRollup([...seed(), ...seed26H2(), ...seedArchive()])`,
   line 1288-1291). So "reset" silently drops the archive + H2 cycles and leaves
   company goals with un-rolled-up progress. Not asserted (would entangle the
   shared singleton across tests); flagged for review.

4. **GAP — dashboard bucket / delta-% math untested.**
   The summary-card bucket counts, `deltaPct` vs. previous cycle, employee
   coverage % and alignment % live inside `useGoalsDashboard()` and depend on
   the full reactive store graph (goals + cycles + submissions). Per the brief's
   "prefer pure exported functions" guidance these were left for a follow-up
   that mounts the composable with controlled `scopeCycleIds` / `now` refs.

No bugs were found in `periodPicker`, `goalMapping`, `goalRows`, `goalFilters`,
`goalDraft`, or the approvals/dashboard pure classifiers — all behaved exactly
as their comments describe.

---

## (c) Final `npm test` summary

```
 RUN  v4.1.10

 Test Files  14 passed (14)
      Tests  158 passed | 1 expected fail (159)
```

- 14 test files (5 pre-existing + 9 new), all green.
- 159 tests: 158 pass + 1 `it.fails` (the documented weight-budget invariant in
  bug #1, expected-fail so the suite is green while the discrepancy is on record).
- Pre-existing 45 tests remain passing.

# Regression Test Cases — Goals ↔ Inbox

**Scope:** the Goals module and the Inbox module, and the way they interconnect.
**Branch verified:** `feat/multiple-review-methods-evaluation-cycle` (identical Goals/Inbox code to `main`).
**Last run:** 2026-07-28 — see status column. Legend: ✅ verified this run · ⬜ documented, not yet re-run.

---

## 0. How to run

```bash
npm run test          # unit suite (utils only) — must stay green
npm run dev           # manual/browser cases below, http://localhost:3002
```

Persona switching: top-right avatar → **View as** → Rizal (Super Admin) / Rio (Manager) /
Daud (Employee) / Santi (Employee, Rio's report). Persona persists in `localStorage`
key `talenta-current-user`. Default = **Rio**.

**Reset between runs:** the "Reset demo data" menu item only re-seeds Goals + Goal cycles.
It does **NOT** reset approvals or inbox notifications (see Finding F1). For a true clean
slate, clear these keys and reload:
`talenta-goals-db`, `talenta-goal-cycles-db`, `talenta-goal-approvals-db`, `talenta-inbox-notifications-db`.

---

## 1. Architecture (why these two modules are coupled)

Two loosely-coupled systems:

1. **Approval pipeline** — `useGoalApprovalsStore` (`talenta-goal-approvals-db`). Holds
   `Submission` batches (create / edit / delete of goals). This is the source of truth for
   every "Awaiting approval" list. Approving commits into `useGoalsStore`.
2. **Inbox notifications** — `useInboxNotificationsStore` (`talenta-inbox-notifications-db`).
   Free-text notification cards, mostly static seed.

**The only runtime write that crosses both stores is the reject / "Request revision" action**
(`GoalSubmissionReview.vue`): it calls `rejectSubmission()` **and** `addNotification()` scoped
to the submitter. Approve does **not** create/clear any notification. Submit does **not**
create a notification. The two stores never share an id — they are linked only by
`Submission.ownerId` / `recipientId`.

Cross-store call: `approveSubmission()` instantiates `useGoalsStore()` and commits each item.

Who-sees-what is driven by `useCurrentUser().currentUserId` + `EMPLOYEE_MANAGER` org chart
(`isSuperAdmin`, `needsApproval`, reviewer filter, notification `recipientId` filter).

---

## 2. Automated tests

| ID | What | Status |
|----|------|--------|
| AUT-1 | `npm run test` — 2 files, 21 tests (goalSchedule, goalDeadline) | ✅ 21 passed |

> No automated tests exist for the stores or the Goals↔Inbox integration (env is `node`,
> composables need Nuxt auto-imports). Covered manually below. Adding `@nuxt/test-utils`
> would be a new pattern — do not introduce without approval.

---

## 3. Smoke — routes compile & render

All returned HTTP 200, no runtime errors beyond pre-existing warnings (see F4). ✅

`/inbox/notifications` · `/inbox/awaiting-approval/goals` · `/inbox/awaiting-approval/reviews`
`/goals/goal-cycles` · `/goals/goal-cycles/seed-26-h1` · `.../individual-goals` · `.../team-goals`
`.../company-goals` · `.../organization-goals`

---

## 4. Test cases — Submit (Goals → approval routing)

Gate: `needsApproval(ownerId)` = owner has a manager. Owners without a manager (rizal, and
super-admin path) mutate goals immediately; owners with a manager are queued as a Submission.

| ID | Steps | Expected | Status |
|----|-------|----------|--------|
| SUB-1 | As an employee create goals via New goals → **Save** (owner has a manager) | Submission created (`status: pending`); toast "Goals submitted for approval". No goal appears in cycle yet. **No inbox notification.** | ⬜ |
| SUB-2 | Same, but **Save as draft** | No submission created (draft never submits) | ⬜ |
| SUB-3 | Create goals whose owner has no manager (super-admin path) | Goals added immediately (`addGoals`), status `gray`; no submission | ⬜ |
| SUB-4 | Edit a goal (owner has manager) → save; weights must total 100% | Weight-100% guard blocks if ≠100; else edit Submission (`type: edit`, `before`/`after` snapshot) created | ⬜ |
| SUB-5 | Delete a goal / bulk delete (owner has manager) | One delete Submission per owner (`type: delete`, `before` snapshot) | ⬜ |
| SUB-6 | Submit the same edit twice | **Two** pending submissions created — no duplicate guard (see F3) | ⬜ |

---

## 5. Test cases — Approve / Reject (approver perspective)

Reviewer gate: `isSuperAdmin(currentUserId)` OR `EMPLOYEE_MANAGER[ownerId] === currentUserId`.

| ID | Steps | Expected | Status |
|----|-------|----------|--------|
| APR-1 | As **Rio**, open Inbox → Awaiting approval → Goals | Shows **only Rio's direct reports' pending** submissions (seed: Alfian *Goal update*, Santi *Goal creation*) — NOT the 22 Rizal-owned ones. First row auto-selected. | ✅ PASS |
| APR-2 | As **Rizal**, same page | Shows **all** pending submissions across owners | ⬜ |
| APR-3 | Select Alfian → **Accept all goals** → **Approve** | Submission committed to `useGoalsStore` (edit applied); submission drops off the list (`status !== 'approved'` filter); selection auto-re-points to next row (Santi) | ✅ PASS |
| APR-4 | Try **Approve** before accepting all rows | Blocked with toast "Accept every goal before approving"; nothing committed | ⬜ |
| APR-5 | Select Santi → **Request revision** with a **reason** → **Send revision request** | Submission `status: rejected` + `rejectReason`; detail shows red **Revision requested** badge + "reason: …"; row stays in reviewer list (rejected ≠ approved) | ✅ PASS |
| APR-6 | **Request revision** with empty reason | Send button disabled; cannot submit | ⬜ (button observed disabled until text entered) |
| APR-7 | As **Daud** (employee, no reports) open the Goals awaiting page | Empty state "Nothing waiting on your approval right now." | ⬜ |

---

## 6. Test cases — Cross-store: reject → notification (the coupling)

| ID | Steps | Expected | Status |
|----|-------|----------|--------|
| XST-1 | After APR-5 (Rio rejects Santi), switch **View as → Santi**, open Inbox → Notifications | New **"Goal revision requested"** at top (Today, unread), body "Rio Priyono has requested changes to your goal submission for 26 H1", **Goals needing revision** = the not-accepted item titles, **Reason** = exactly what the approver typed, action **View submission** | ✅ PASS |
| XST-2 | As a **different** persona (e.g. Daud) check Notifications | The generated "Goal revision requested" is **not** visible (scoped via `recipientId: santi`) | ⬜ |
| XST-3 | Approve a submission (APR-3) then check the owner's Notifications | **No** notification generated (approve is not wired to inbox) — expected per design | ⬜ |
| XST-4 | As **Santi**, open the rejected submission (owner view) | "Resubmit" available (`isOwnerViewing && status === rejected`) → `resubmitSubmission` sets `pending`, `wasEdited: true`, keeps reason | ⬜ |

---

## 7. Test cases — Personas & tab gating

| ID | Steps | Expected | Status |
|----|-------|----------|--------|
| PER-1 | In-cycle goal page: "Awaiting approval" tab | Visible **only** to Super Admin (`v-if isSuperAdmin`). Managers review via Inbox page, not this tab. | ⬜ |
| PER-2 | In-cycle "My requests" tab | Visible only when `hasManager(currentUserId)`; lists own submissions all statuses | ⬜ |
| PER-3 | Switch persona while on `awaiting`/`requests` tab and no longer eligible | `activeTab` silently falls back to `all` (watch guard) — no crash | ⬜ |
| PER-4 | Awaiting-approval tab badge | Shows `pendingItemsCount` for the cycle — **all** pending, unfiltered by reviewer | ⬜ |

---

## 8. Test cases — Edge / empty states

| ID | Steps | Expected | Status |
|----|-------|----------|--------|
| EDG-1 | Empty awaiting list | "Nothing waiting on your approval right now." + "Select a request" blank slate | ⬜ |
| EDG-2 | Empty My requests | "You haven't submitted any requests for this cycle yet." | ⬜ |
| EDG-3 | Notifications empty / empty search | "No notifications" blank slate / "No notifications found." | ⬜ |
| EDG-4 | Open a non-existent submission id | "This submission no longer exists." | ⬜ |
| EDG-5 | View an already-approved submission directly | "This submission has already been approved." | ⬜ |
| EDG-6 | Notification read state | Selecting a row marks it read (dot clears); bulk select / read / unread / delete work | ⬜ |

---

## 9. Findings & risks (from this run + code review)

- **F1 — "Reset demo data" is incomplete.** It re-seeds only Goals + Goal cycles.
  `useGoalApprovalsStore` and `useInboxNotificationsStore` have **no `resetToSeed`** and are
  not wired into `resetDemoData()`. Approvals/notifications mutated during testing persist
  until their localStorage keys are cleared manually. *Recommend wiring both into Reset.*
- **F2 — `approveSubmission` has no re-approve guard.** Calling it on an already-approved
  submission would re-run `addGoals` and **duplicate created goals**. Currently prevented only
  by the UI filtering approved rows off the list. *Add an idempotency guard.*
- **F3 — No duplicate-submission prevention.** Submitting the same edit/delete twice creates
  two pending rows.
- **F4 — Cosmetic warning (pre-existing, not a regression):** `MpProgress` expects `value` as
  String but receives Number on Goals progress bars → `[Vue warn] Invalid prop type`. Renders
  fine. Also pre-existing: `ProtoReviewOverlay` failed-to-resolve warning; duplicate-import
  warnings for `toISO` / `GoalCategory`.
- **F5 — `/inbox/awaiting-approval/reviews` is a stub** (renders empty `<div/>`). Reviews-side
  awaiting-approval has no logic yet.

---

## 10. Result summary (2026-07-28)

- Automated: **21/21 pass**.
- Manual verified this run: **APR-1, APR-3, APR-5, XST-1** (+ all route smoke) — the full
  Goals→approval→commit and reject→cross-store-notification loops **PASS**.
- No regression found in Goals or Inbox from the review-methods revert on `main`
  (revert touched only the 3 review-cycle files; zero Goals/Inbox files).

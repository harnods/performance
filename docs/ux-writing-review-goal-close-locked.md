# UX writing review: closing a goal and locked progress

**Scope:** 6 copy items drafted for closing a goal that has aligned (child) goals, and for the locked-progress state on those child goals.
**Language reviewed:** English only. Bahasa Indonesia not reviewed yet.
**Source:** Mekari copy library v2.1 (UXW Mekari).
**Source of the drafts:** gate §7 and PRD §4.8.

---

## Decisions

| # | Decision | Status | Outcome |
|---|---|---|---|
| 1 | Which term do we use: "achievement" or "progress"? | Decided | Use **"progress"** everywhere. It matches the "Update progress" action. |
| 2 | Can a closed goal be reopened? | Decided | **No.** Both close modals say "This can't be undone." |
| 3 | Does bulk close also lock the closed goals (no edit, no progress update)? | Open | Single close says it does. The bulk wording doesn't. Recommend making both modals say the same thing. |
| 4 | Should the Index badge say "Locked" or "Progress locked"? | Open | Bare "Locked" doesn't say what is locked. Recommend "Progress locked" (2 words, fits the badge limit). |

---

## Copy audit

| # | Component | Original | Improved | Reason |
|---|---|---|---|---|
| 1 | Modal: close goal (has aligned goals) | "This goal has {N} aligned goal(s). Once you close this goal, you can no longer update its progress or edit it. The aligned goal(s) can no longer update their achievement." | **Title:** Close goal?<br>**Description:** "{N} aligned goals can no longer update their progress once this goal is closed. You also can't update progress or edit this goal. This can't be undone."<br>**Buttons:** Close / Cancel | Missing title. Lead with the main impact. Replace "goal(s)" with real plurals. Use "progress" instead of "achievement". Add the irreversibility warning. |
| 2 | Modal: bulk close | "{M} of the goals you selected have aligned goals. Once you close them, the aligned goals can no longer update their achievement." | **Title:** Close {X} goals?<br>**Description:** "{M} of the selected goals have aligned goals. Once closed, those aligned goals can no longer update their progress. This can't be undone."<br>**Buttons:** Close / Cancel | Missing title. Pronouns "them" and "their" are ambiguous. Use singular and plural forms as needed. Add the irreversibility warning. Decision 3 may add a line that the selected goals are also locked. |
| 3 | Notice on the child goal's Detail page | "Achievement locked. The parent goal, {Parent goal name}, is closed. You can no longer update progress for this goal." | **Title:** Progress locked<br>**Body:** "Parent goal {Parent goal name} is closed, so you can no longer update progress for this goal." | Uses both "achievement" and "progress". The draft states the same thing twice, so one cause-and-effect sentence is enough. Make the parent name a link and truncate long names. |
| 4 | Tooltip on the disabled "Update progress" action | "Achievement locked because the parent goal is closed." | "Progress locked because the parent goal is closed" | Use the same term as the button label. Tooltips are one short sentence with no period. |
| 5 | Status tag on the parent-reference card | "Closed" | "Closed" (no change) | Passes the badge rules (1 word, sentence case, no period). Reuse the Index "Closed" badge wording. |
| 6 | Index-row badge and tooltip | Badge: "Locked"<br>Tooltip: not drafted | **Badge:** Progress locked<br>**Tooltip:** "Progress locked because the parent goal is closed" | Bare "Locked" doesn't say what is locked. "Progress locked" is 2 words, so it fits the badge limit and reads differently from "Closed". Same tooltip as item 4 keeps the wording consistent. |

---

## Final copy as built

Two lines changed after review (PM/design, 2026-10-22); everything else is as in the audit above. The Index badge uses decision 4's recommendation ("Progress locked"), and the bulk modal still omits the "selected goals are locked too" line (decision 3 is open).

| # | Component | Built copy |
|---|---|---|
| 1 | Modal: close goal (has aligned goals) | **Title:** Close goal?<br>**Description:** "{N} aligned goals can no longer update their progress. This goal will be locked and can't be reopened." (N = 1: "1 aligned goal can no longer update its progress.")<br>**Buttons:** Close / Cancel |
| 3 | Notice on the child goal's Detail page | **Title:** Progress locked<br>**Description:** "Updating progress for this goal is locked because parent goal {Parent goal name} is closed." (parent name = link, truncated) |

Components: `components/GoalCloseConfirmText.vue`, `components/GoalBulkCloseConfirmText.vue`; shared tooltip constant `PROGRESS_LOCKED_TOOLTIP` in `utils/goalLock.ts`.

### Bulk close modal (#2), as built — bullet points

**Title:** Close {X} goals?
**Description** (bullets, each with a period):
- Aligned goals of {M} selected goal(s) can no longer update their progress.
- Closed goals can't be reopened.
- Goals owned by direct reports are sent for approval first.

**Buttons:** Close / Cancel

### Primary button label (as built)

Both close modals, with or without aligned goals: **Close goal** (single) and **Close goals** (bulk), with **Cancel** as the ghost button. This supersedes "Close" in the audit table above (and the earlier "Yes, close goal(s)").

### Detail notice (#3), final

**Title:** Update progress locked
**Description:** "Parent goal {Parent goal name} is closed. You can no longer update progress for this goal." (parent name = link, truncated). Chosen from five options (option E, title changed from "Progress locked"). The index badge and the tooltips keep "Progress locked".

### Key results of a locked goal (as built)

Add key result, and each key result's Edit and Delete, are disabled on a locked goal's Detail page. **Tooltip:** "Key results locked because the parent goal is closed" (no period; same pattern as the progress tooltip). Not covered by the original review — needs a UXW check.

### Detail notice (#3), revised

**Title:** Update progress locked
**Description:** "You can no longer update progress for this goal because the parent goal is closed." + link **View parent goal** (verb "View" = opening a standalone object; link label has no period). Replaces the earlier wording that named the parent goal inline.

### Index badge removed

Item #6 (index-row "Progress locked" badge) was **removed** — locked rows show no badge. The tooltip copy ("Progress locked because the parent goal is closed") stays on the disabled Update progress action, placed `top`.

### Key results of a closed goal (as built)

Add key result and Edit (key result) are disabled on a **closed** goal; Delete stays enabled. **Tooltip:** "Key results locked because this goal is closed" (no period; "this goal" because it is the page's own goal; sibling of the parent-closed tooltip). Reviewed with the UXW skill; alternative: "You can't change key results because this goal is closed".

### Edge-case copy chosen (as built)

**Close goal? — goal has {N} aligned goals and the close needs manager approval**
> Closing this goal needs the manager's approval. Once approved:
> • {N} aligned goals can no longer update their progress.
> • This goal can't be reopened.

(Without approval the one-sentence variant stays: "{N} aligned goals can no longer update their progress. This goal will be locked and can't be reopened.")

**Delete goal? — goal has {N} aligned goals** (option "a", as bullets)
> • {Goal title} will be permanently deleted and cannot be recovered.
> • {N} aligned goals will lose this alignment.

Not applied: option "b" (a closed parent's children "can update their progress again") — add as a third bullet if wanted.

### Approval intro, reworded

"This close goes to the manager for approval first." sounded off ("close" as a noun). Chosen from five options: **"Closing this goal needs the manager's approval. Once approved:"**. Sibling strings ("This close/delete will be sent to the manager for approval before it takes effect.", the toasts) are unchanged.

### Close goal? — aligned goals as bullets (as built)

> • This goal will be locked and can't be reopened.
> • {N} aligned goals can no longer update their progress.

When the close needs approval, one intro line sits above the bullets: "Closing this goal needs the manager's approval. Once approved:". With no aligned goals the original sentence stays. Supersedes the one-sentence immediate variant above.

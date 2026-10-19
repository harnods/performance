# Toggle (MpToggle)

## Label position — MpToggle always renders switch, then slot content

`MpToggle`'s default slot renders **after** the switch — there's no prop to put the
label first. If the layout needs "Label [switch]" (label before the control, e.g.
right-aligned in a row), don't fight the component: leave its default slot empty
(a bare self-closing `<MpToggle />` is valid — see `ReviewerModals.vue`,
`reviews/review-cycles/[id]/index.vue`) and place the label as a sibling before it,
both wrapped in one `MpFlex`:

```vue
<MpFlex as="span" align="center" gap="2">
  <span>Allow self-update</span>
  <MpToggle :id="..." :is-checked="..." @update:is-checked="..." />
</MpFlex>
```

## Explaining what a toggle does — wrap the whole control in a tooltip, not a separate (i) icon

Prefer wrapping the label+switch group in `MpTooltip` over bolting on a separate
`MpIcon name="info"` next to the label — one hover target, less visual noise.
Set `:show-delay="0"` so it doesn't feel laggy on a control people are about to
interact with:

```vue
<MpTooltip :label="isChecked ? onHint : offHint" :show-delay="0" use-portal>
  <MpFlex as="span" align="center" gap="2">
    <span>Allow self-update</span>
    <MpToggle :is-checked="isChecked" @update:is-checked="..." />
  </MpFlex>
</MpTooltip>
```

If the toggle's effect reads differently depending on its current state, the
tooltip copy should too — one string describing "what's true right now" (state
is on) and a different one describing "what turning it on would do" (state is
off), rather than one static sentence that only makes sense in one state.

Reference: `components/AddGoalDrawer.vue` (`owner-can-update-progress` toggle —
`ownerCanUpdateProgressHint` / `ownerCanUpdateProgressActivateHint`).

## "Same scope as … module setting" (role form)

On Add / Edit role, the Review results / 9-box matrix / Dashboard "Same scope as review cycle module setting" toggle (each with its own state) (and the Version 2 tree's equivalents) is **on by default**. While on, a `#description` caption says what is included: Version 1 lists the current inherited scope ("Performance, Evaluation (Contract, Probation)"); Version 2 lists the parts of the referenced module that have something granted ("Includes performance review and evaluation review"). **With nothing selected yet there is no caption at all** — it appears once a purpose / module is picked. Turning it off removes the caption and reveals the custom purpose pickers. The permission table's cells are `nowrap`, so the toggle block sets `whiteSpace: 'normal'` and its container `minWidth: 0` — otherwise the caption runs under the action columns. Caption copy: sentence case, no period (period only after the first of two sentences).

Version 2: when the acting user can't grant anything under a toggle's module (e.g. a delegated user and Dashboard), the "Same scope" toggle is disabled with the same lock tooltip as its checkboxes (`RolesLock`, see [`checkbox.md`](checkbox.md)) and its caption is hidden.

## Settings toggle row with an Edit button and summary lines (Settings › Reminders)

`pages/settings/reminders.vue` (migrated from talenta-review `settings/reminders/Form.vue`; numbers below were **measured on review.talenta.co/settings/reminder**, not eyeballed). Two flat sections (H2 + `size="label"` caption), one `MpToggle` per reminder with the title in the default slot and the caption in `#description`.

- **Width.** The form column is a fixed **684px** (`maxWidth: '684px'`), not the 12-col `span 6` — it does not grow or shrink with the viewport.
- **Section header.** H2 (20/600/32) + caption, **16px** to the first row (`marginBottom: '4'`). Next section: **44px** from the last row's caption to the next H2 (`marginTop: '44px'` — 32px section margin + the old toggle's 12px of internal spacing).
- **Rows** are split by a 1px `MpDivider` with its own margin zeroed (`margin: '0 !important'` — Pixel's default 8px margin wins over a plain class) inside a padding wrapper: **24px** above it under a plain row's caption (`paddingTop: '6'`), **12px** above it under a summary block (`paddingTop: '3'`), **14px** below (`paddingBottom: '14px'`; `'3.5'` is not a spacing token and renders 3.5px). The gap follows the row's current state: a row that is turned off has no summary block, so its divider uses the 24px (plain) gap (`dividerClass()`).
- **Two kinds of row.** *Immediate*: "Added as a reviewer", "Cycle ready to publish" — flipping saves straight away (toast "Reminder successfully updated"). *Configurable*: "Reminder to complete review", "Pick co-worker", "End review period", "Update goal progress" — turning **on** opens the edit drawer, turning **off** saves immediately.
- **Edit button.** While a configurable row is on: `variant="secondary" size="sm"` (**30px** tall — production's small outline button; an explicit exception to the "never `sm`" rule, to keep parity), pinned right (`justify-content: space-between`) and **8px** below the row top (`marginTop: '2'`).
- **Summary lines.** **20px** under the toggle caption (`marginTop: '5'`), indented **40px** (`paddingLeft: '10'`), each line a **24px**-tall row (`minHeight: '24px'`) with `MpIcon size="sm"` + 8px gap + `text.secondary` sentence, value in `semiBold` / `text.default`; **8px** between lines. Icons: `refresh` "Repeat reminder **everyday**" / "**every N day(s)**", `calendar` "Remind **N day(s)** before review period end", `employee` the targets ("Goal owner, superior").
- **Drawer** (`MpDrawer size="md"` = 448px, same as production; opened by the toggle/Edit handler, never by the toggle itself — see [`page-form.md`](page-form.md)). Body padding 16px, fields **20px** apart, label → field 4px, help text 12px. Numeric fields are `MpInputGroup` + `MpInput type="number"` (1–999, digits only) + `MpInputRightAddon` holding a **bold** `MpText` "Day(s)" (`paddingX: '2'`); target list = `MpCheckbox` + `#description`, **8px** apart; then "Notify via" **20px** below the fields (semiBold title, 8px, two icon rows 8px apart). Footer: ghost Cancel + primary Submit.
- **Cancel restores.** Opening takes a copy of the row; Cancel / close puts it back, so a toggle that was turned on and then cancelled ends **off**; Edit → Cancel stays on with the old values. Submit validates: empty "Repeat every" / "Before review period end" / no target ticked → `:is-invalid` + `MpFormErrorMessage` "This field is required", drawer stays open.
### Goal reminder section: Goal creation + Update goal progress

The **Goal reminder** section (`id="goal-reminder"`, so `/settings/reminders#goal-reminder` scrolls to it) has two rows built with the same toggle / Edit / summary pattern: **Goal creation** and **Update goal progress** (the production "update-goal-achievement" row, relabelled; slug and toggle id unchanged). Both **repeat over the whole goal period** — no lead time. Rows, copy, targets and helpers live in `utils/goalReminders.ts` (`GOAL_REMINDERS`); values in `composables/useGoalRemindersStore.ts` (localStorage `talenta-goal-reminders-db`, written only by Save changes or a toggle-off, never by an edit that is cancelled).

- **Summary lines (three):** `calendar` "During the goal period" (both rows; stop hint "Reminder will stop when the goal period ends"), `employee` the targets ("Goal owner, superior"), `refresh` "Repeat reminder **every 2 day(s)**" (`everyday` for 1) — the same **"day(s)"** format as the review reminder rows, in the summaries and the drawer's "Day(s)" unit. Goal cycle info keeps the plain plural ("every 2 days").
- **No lead time.** Only the review row End review period has a "Before …" field; the goal rows' drawers have "Repeat every" only (`time_before_end` stays `null`).
- **Drawer:** "Repeat every" (help "Reminder will stop when the goal period ends"), **"Reminder target"** checkboxes (creation: Employee, Superior; progress: Goal owner, Superior), "Notify via", footer **Cancel / Save changes**. Errors: "You must fill in Repeat every", "You must select at least one". Toast: "Reminder changes saved".
- **Copy rules (Mekari UX writing library):** sentence case, no period on captions / help text (two sentences → period on the first only), "Save changes" for settings edits, error patterns from the library. The four Review reminder rows keep production's copy ("Submit", "This field is required", "Who is reminder target", "Reminder successfully updated") because they are a 1:1 migration.
- **Which reminders run for a cycle** (`goalRemindersForCycle(reminders)`): every goal reminder that is on, for every cycle. Goal creation's target is **"Employee"** (not "Goal owner": someone can already have goals, e.g. as a team member, without owning one) — "Employee who has no goals yet. Drafted goals and goals awaiting approval don’t count".

### Goal cycle info: Reminders row

After Goal weight: label **Reminders**, then one item per reminder that runs for the cycle — title (`label`, `text.default`, "Goal creation" / "Update goal progress") over a 12px `text.secondary` caption ("Repeat every 2 days" / "Repeat every day"). Title → caption **6px**, item → item **10px**. A `variant="secondary"` `left-icon="newtab"` **Manage reminders** button (same look as Goal settings' "Open approval settings") sits **16px** below the last caption. It is a real link — `MpButton as="a" href="/settings/reminders#goal-reminder" target="_blank" rel="noopener"` — so the browser opens Settings › Reminders in a **new tab** and a pop-up blocker never gets in the way. A reminder that is off in Settings isn't listed; when **every** goal reminder is off the value is **"No reminders"** (`text.default`, like every other value) above the same button. Reference: `components/GoalCycleInfoPanel.vue`.

- **Known Pixel deltas** (design-system version, not ours to override): toggle is 30×18 with a shorter label block than v1 (rows land within ~2px of production), icons are 20px (`sm`/`md` only; production's drawer icons are 24px), drawer header is 55px (production 45px).
- Data is hardcoded in `MOCK_REMINDER_SETTINGS_RESPONSE`; nothing persists across reloads.

Reference: `pages/settings/reminders.vue`.

# AI prompt builder — "Describe" vs "Build"

When a feature can be defined either by **writing a prompt** or by **filling in
explicit fields**, don't pick one. Offer both behind an `MpSegmentedControl`, and
make the prompt hand off into the fields rather than bypassing them.

Reference: `components/PxAddPoolDrawer.vue` (Talent directory → **Add pool**),
opened from `pages/talents/talent-directory/index.vue`.

> 🔒 That surface is currently hidden behind `TALENT_POOLS_ENABLED`
> ([`feature-flags.md`](feature-flags.md)) — the code and its tests are live, but
> you won't find it in the running app until the flag is flipped.

## 🔴 No model call — this is a keyword whitelist

Despite the `airene-brand` icon, **nothing here calls an LLM and nothing leaves
the browser.** `utils/talentPrompt.ts` is a table of keywords matched with
regexes, so a deployed build costs nothing per keystroke and works offline.
Keep it that way unless someone explicitly asks for a real model: the badges
update on every keystroke, which would be a request per keystroke.

The `airene-brand` glyph marks *AI-ish behaviour to the user*
([`icons.md`](icons.md#ai-generated-content-marker--airene-brand)); it is not a
claim that a model ran.

---

## Shape

The control sits at the **right of the section header**, not above the input —
it switches the body of one section, so it reads as that section's own control:

```vue
<div :class="sectionHead"> <!-- flex, space-between, align-items: flex-start -->
  <div>
    <MpText :class="sectionTitle">Talent criteria</MpText>   <!-- H2 20/32 -->
    <MpText :class="sectionDesc">Set the talent criteria you're looking for</MpText>
  </div>
  <MpSegmentedControl v-model="step" :data="stepOptions" name="pool-step" />
</div>
```

```ts
const stepOptions = [
  { id: 'pool-step-describe', label: 'Describe', value: 'describe', icon: 'airene-brand' },
  { id: 'pool-step-build',    label: 'Build',    value: 'build',    icon: 'sliders' },
] as const
```

- `MpSegmentedControl` binds `modelValue` against each item's **`value`** (`id` is
  only the DOM id). Both are required.
- The AI half carries `airene-brand` — the repo-wide AI marker
  ([`icons.md`](icons.md#ai-generated-content-marker--airene-brand)).

## The two halves stay in sync, live

The prompt isn't a separate input that gets converted on submit — **it drives
the fields as you type.** Writing "a bachelor's degree" sets Education level's
floor; "no absents" ticks Absent with a 0-day cap; "atleast 2 years of service"
fills Year of service; deleting the phrase takes the criterion back out. So
switching to `Build` never shows a surprise.

```ts
watch(description, () => {
  if (isReseeding || step.value !== 'describe') return
  const { criteria, jobPosition: parsedPosition, branch: parsedBranch } = parsed.value
  form.value = { ...criteria, educationLevels: [...criteria.educationLevels] }
  addedCriteria.value = criteriaKeysFor(detected.value)
  if (parsedPosition) jobPosition.value = parsedPosition   // fill, never clear
  if (parsedBranch) branch.value = parsedBranch
})
```

Three rules make this safe rather than surprising:

- **The description owns the criteria only while you're on `Describe`.** Guard on
  `step`, so hand edits made on `Build` are never clobbered by a stale watcher.
- **Scope selects are filled, never cleared.** The user may have picked a job
  position by hand before typing a word; parsing shouldn't undo that.
- **Guard the reseed.** The open-watcher clears `description`, which is itself a
  change — without an `isReseeding` flag that would wipe the criteria of the
  pool you just opened for editing.

## The footer follows the step, and the prompt hands off

`Describe` is a *step*, not a parallel mode: its primary CTA is **Next**, which
switches to `Build` so the criteria it derived can be reviewed. Only `Build` can
**Save**. The user always confirms explicit criteria before anything is created —
the prompt seeds the fields, it never silently becomes the saved value.

```vue
<MpButton v-if="step === 'describe'" variant="primary" @click="goToBuild">Next</MpButton>
<MpButton v-else variant="primary" @click="save">{{ mode === 'edit' ? 'Save changes' : 'Save' }}</MpButton>
```

**Editing an existing record opens straight on `Build`** — its criteria are
already explicit, so re-describing them in prose would be a step backwards.

## Coverage badges — grey until the prompt mentions it

Under the textarea, one badge per dimension the prompt *could* cover. Grey =
not mentioned, green = mentioned. This is what makes a free-text prompt
reviewable: the user can see what they left out before submitting.

```vue
<MpBadge
  v-for="d in PROMPT_CRITERIA" :key="d.key" for="tableStatus"
  :type="detected.includes(d.key) ? 'completed' : 'announcement'"
>
  <span :class="badgeInner"> <!-- css({ display: 'inline-flex', alignItems: 'center', gap: '1' }) -->
    <MpIcon v-if="detected.includes(d.key)" name="done" variant="fill" size="sm" color="green.500" />
    <MpIcon v-else name="indicator-circle" variant="outline" size="sm" />
    {{ d.label }}
  </span>
</MpBadge>
```

- Reuses [`badges.md`](badges.md) API 1 `type`s (`completed` / `announcement`) —
  **don't hand-roll the Figma hexes**; the Pixel tokens are the source of truth.
- `MpBadge` has no icon prop: put the icon in the default slot inside an
  `inline-flex` span. Icon colour goes on `MpIcon`'s own `color` prop
  ([`icons.md`](icons.md#colour)), not a wrapping class.
- Badges are **read-only status**, not filters — never make them clickable.

## Detection lives in a util, not the component

`utils/talentPrompt.ts` owns the catalogue + matcher so the badges and the
`Next` handoff can't drift apart (`utils/talentPrompt.test.ts` covers it):

```ts
export function detectPromptCriteria(description: string): PromptCriteriaKey[]
```

Four rules that matter more than the keyword list itself:

- **Match on word boundaries.** `(^|[^a-z0-9])keyword([^a-z0-9]|$)` — otherwise
  "master" fires on "mastermind" and "present" fires on "presenter".
- **Derive vocabulary from real data, not just the generic noun.** A description
  naming an actual branch ("Bandung") or job title ("Head Chef") mentions that
  dimension as much as the words "location" or "job position" do, so the
  keyword list splices in `BRANCHES` / `JOB_POSITIONS`.
- **One source of truth per dimension.** The education *dimension* keywords are
  derived from the same `EDUCATION_SYNONYMS` table that ticks the levels
  (`...Object.values(EDUCATION_SYNONYMS).flat()`). When they were two separate
  lists, "lulusan SMA" ticked nothing because `sma` was a synonym but not a
  keyword — the badge gate ran first and rejected it.
- **Assign a number to its *nearest* keyword, but let a unit outrank distance.**
  In "95 days attendance and 2 years of service" both numbers sit in either
  dimension's window, and the *years* figure is actually nearer the word
  "attendance" — the trailing unit ("days" / "years") is what gets it right.
  Proximity alone, or a first-number-in-window scan, both mis-assign here.

Qualitative phrases ("high performing") light the badge but leave the bounds
blank on purpose — inventing a threshold the user didn't say would be worse than
asking them to fill it in on `Build`.

## "Refine prompt"

A secondary button at the right of the badge row that rewrites the rough prompt
into an explicit, criteria-by-criteria sentence, so what was understood is
visible and still editable. `:is-disabled` until something is detected — allowed
here because it's a *secondary* control gating a sub-flow, not the primary CTA
([`buttons.md`](buttons.md#no-disabled-primary-cta)).

## Reading it back afterwards

What the user typed is a *draft input*, not the record. Once saved, surfaces
report the **criteria as selected** (`summarizeCriteria`), never the prompt
string — the criteria can be edited by hand afterwards, at which point the
original sentence is a lie. See [`banner.md`](banner.md) — "Summary strip" — for
the strip that does this above the table.

## Rules

- Segmented control right of the section header; `value` (not `id`) is the model.
- Prompt → fields → save. Never prompt → save.
- The prompt drives the fields live, but only while its own step is active.
- Coverage badges are status, never filters; grey `announcement` → green `completed`.
- Detection in a tested util, shared by the badges and the handoff.
- Edit mode skips the prompt step.
- Never persist or re-display the prompt as if it were the saved criteria.

# Goal progress calculation

How a goal's **achievement %** (`pill`), **value**, and **status** are derived — end to
end, from seed to the Update-progress modal to the on-screen bars. This is the authoritative
reference for the progress logic; the end-to-end flows live in
[`goals-revamp.md`](goals-revamp.md) (§C, §D, §I).

**Source of truth**
- `composables/useGoalsStore.ts` — seed values, `seed26H2()` mid-cycle derivation, `updateGoal`.
- `pages/goals/goal-cycles/[id]/goals/[goalId].vue` — `updateMode`, `saveUpdate()`, `krPct()`.
- `utils/goalDraft.ts` — `DraftKeyResult` (baseline / target / current / direction).

---

## 1. The fields involved

Per goal (`Goal` in `useGoalsStore.ts`):

| Field | Meaning |
|-------|---------|
| `unit` | `currency` \| `percent` \| `count` \| `deadline` (optional). No unit ⇒ status-only, no bar. |
| `min` | Baseline (start of the scale). Defaults to `0`. |
| `max` | Target (end of the scale). Defaults to `100`. |
| `value` | Current achievement value (shown above the bar). |
| `pill` | Achievement **%** (0–100). Drives the bar width and the % badge. |
| `status` | `green` (on track) \| `orange` (off track) \| `gray` (not updated). |
| `direction` | `higher` \| `lower` — **mandatory** (auto-derived, see §5). |
| `keyResults` | Optional `DraftKeyResult[]`; each has `startValue` (baseline), `targetValue`, `currentValue`, `kpiDirection`, `measurementUnit`, `useBaseline`. |
| `alignedToId` | Parent goal this one cascades from. |

`pill` and `value` are **two views of the same progress** — `pill` is the %, `value` is
where that % lands on the `min → max` scale.

---

## 2. Progress precedence (which rule applies)

A goal's progress is computed by exactly one of three rules, chosen by `updateMode`
(`[goalId].vue`), in this priority — **production parity**:

```
updateMode = keyResults.length  ? 'kr'        // 1. KR-driven  (highest priority)
           : alignedChildren.length ? 'children'  // 2. rolls up from aligned children
           : 'goal'                                // 3. manual leaf goal
```

So a goal with key results is **always** KR-driven (you can't also set its value by hand);
a goal with no KRs but with aligned children rolls up from them; only a leaf goal (neither)
is updated manually.

---

## 3. Rule 1 — KR-driven goal (`updateMode === 'kr'`)

The Update-progress modal shows one input **per key result** (its current value). On save:

### 3a. Per-KR achievement % (`krPct`)
Also used to draw each KR's own progress bar.

```
base   = (useBaseline && typeof startValue === 'number') ? startValue : 0
target = targetValue
cur    = currentValue

span = direction === 'lower' ? (base - target) : (target - base)
done = direction === 'lower' ? (base - cur)    : (cur  - base)

pct  = span === 0 ? 0 : clamp(round(done / span * 100), 0, 100)
```

- **Higher is better**: progress rises as `cur` climbs from `base` toward `target`.
- **Lower is better**: progress rises as `cur` falls from `base` toward `target`
  (e.g. cost 24% → 18%).
- Baseline-aware: without `useBaseline`, `base = 0`.

### 3b. Goal achievement = **average of its key results**
(Matches the modal copy: “this goal's progress is the average of its key results.”)

```
pill   = round( Σ krPct(kr) / count )
value  = unit ? round( min + (max - min) * pill/100 ) : value   // back-projected onto the scale
status = upStatus                                               // MANUAL — see below
```

> **`status` is chosen by the user**, not derived from the %. The Update-progress modal
> has a **Status** dropdown, and whatever it's set to is what gets persisted — *"manual
> status decides the bar colour, not the %."* So the achievement % (`pill`) and the
> red/green/gray of the bar are **independent**: a goal can read 80% and still be flagged
> Off track, or 20% and On track, if that's what the owner selects. (This replaced the
> earlier rule that auto-derived status as `≥70 green / >0 orange / else gray`.)

### 3c. Per-KR status (persisted, drives the KR bar tint)
The *per-KR* status is still derived automatically from that KR's own %:
```
krStatus = pct === 0 ? 'gray' : pct < 45 ? 'orange' : undefined   // undefined ⇒ on-track (teal)
```
(Only the **goal-level** status is manual; individual KR tints follow their own progress.)

---

## 4. Rule 2 — aligned-children goal (`updateMode === 'children'`)

The modal is **read-only** (footer shows **Close** only; no Save). Progress **rolls up from
the aligned children** for display. In the current mock, save is a no-op — the parent keeps
its stored `pill`/`value`; the roll-up is display-only, not recomputed client-side.
Detaching a child (remove alignment) is the action that "can affect progress roll-up".

---

## 5. Rule 3 — leaf / manual goal (`updateMode === 'goal'`)

No KRs, no aligned children. The user picks **Status** and, for a measurable unit, an
**Achievement value**:

```
value  = Number(input)
pill   = max ? round(value / max * 100) : pill
status = user selection
```

⚠️ **Difference from KR math:** the manual formula is `value / max` — it does **not**
subtract the baseline (`min`). The bar's range labels still read `min → max`, but the fill
is measured from 0, not from `min`. (KR progress in §3a is baseline-aware.) This is an
intentional simplification of the leaf path; keep it in mind if unifying later.

**Status options** (dropdown): measurable = **On track / Off track / Not updated**;
**deadline** = **Complete / Not started** (deadline goals = status only, no value / `pill` / bar).

---

## 6. The Update-progress modal (inputs & confirmation)

Besides the value/status that feed the math above, the modal mirrors production's richer
update experience:

- **Live KR preview** (`krDraftPct`) — each KR row shows its achievement % recomputing as
  you type, using the same formula as §3a.
- **Preview bar colour** (`statusFillClass`) — the modal's bar takes the **manually chosen
  status** colour (teal / rose / gray), reinforcing that colour ≠ %.
- **Progress update method** — shown per goal: KR-driven goals inherit their KRs'
  `progressMechanism` (Manual entry / Log-based); otherwise Manual entry.
- **Notes**, **Effective date** (future dates disabled), **Attachments** (upload, ≤ 5, with
  formatted sizes) — captured in the modal and, in the current mock, **display-only**:
  `saveUpdate` does **not** persist them to the goal. Only `keyResults` / `pill` / `value` /
  `status` are written.
- **Submit confirmation** — Save opens a confirm step (`isConfirmUpdateOpen` →
  `confirmSubmitUpdate` → `saveUpdate`) before committing.
- **Aligned-children mode** shows a **Close**-only footer (no Save) — consistent with §4.

## 7. Seed — initial mid-cycle progress (`seed26H2()`)

The 26 H2 cycle is "in progress", so each goal gets a **deterministic** early-cycle
snapshot (no clock, no randomness) keyed off its index `i`:

```
r = (i * 37) % 100
```

**Non-measurable goals** (no `unit`): `status = r < 30 ? 'gray' : 'green'`, no `value`/`pill`.

**Measurable goals** (`max = g.max ?? 100`):

| Bucket | status | pill |
|--------|--------|------|
| `r < 8`  | gray   | `0` (not updated) |
| `r < 25` | gray   | `30 + (r % 25)` (not updated, but has a dark-gray bar) |
| `r < 45` | orange | `20 + (r % 20)` (off track) |
| else     | green  | `45 + (r % 35)` (on track) |

then `value = round(max * pill / 100)`, `min = g.min ?? 0`.

The 26 H1 seed (`seed()`) instead carries end-of-cycle values transcribed from the source
spreadsheet (see the header comment in `useGoalsStore.ts`).

---

## 8. Direction auto-derivation (`g()` in `useGoalsStore.ts`)

Measurement type is **mandatory** — never empty. When a seed row doesn't state a
`direction`, it's derived from the target text:

```
direction = stated
  ?? ( /≤|\b(below|under|reduce|reduction|decrease|lower|waste|spoilage|
        variance|defect|complaint|churn|downtime|shrinkage)\b/i.test(title)
       ? 'lower' : 'higher' )
```

Goals created in the Add-goal drawer always carry a direction (the radio defaults to
`higher`), so it can never be empty there either.

---

## 9. How progress renders

- **Bar width** = `min(pill, 100)%`. Range labels show `min → max` (14px / regular).
- **Achievement % badge** — `MpBadge for="tableStatus"`, colored by the goal's `status`:
  `green → completed`, `orange → critical`, `gray → announcement`. The **number** is `pill`,
  the **colour** is the manually chosen status — they're independent (§3b).
- **Bar / KR-bar fill color** by status: `green → teal`, `orange → rose`, `gray → gray`.
  The **goal** bar's colour = the user-selected status; a **KR** bar with no status =
  on-track = teal (its status is auto-derived per §3c).
- **Direction wording** everywhere (goal-owner card, alignment card, KR sub-label):
  **“Higher is better” / “Lower is better”** — the older “Increase/Decrease KPI” wording
  was removed.

Applies identically to the main goal progress and to the parent goal shown in the
alignment card.

# Accordion — `MpAccordion`

A list of collapsible sections, each removable. Used for the talent-pool
criteria builder (`components/PxAddPoolDrawer.vue`, "Build" step), where every
added criterion becomes its own section with its own shape inside.

> 🔒 That surface is currently hidden behind `TALENT_POOLS_ENABLED`
> ([`feature-flags.md`](feature-flags.md)) — the code and its tests are live, but
> you won't find it in the running app until the flag is flipped.

> Not to be confused with the goal-cycle "owner accordion"
> (`goals/goal-cycles/[id]/index.vue`), which is a bespoke collapsible **table
> group**, not `MpAccordion`. Use `MpAccordion` for form sections; leave that
> one alone.

---

## Prop names are not the obvious ones

This is the trap. The props are **not** `is-multiple` / `default-index`:

| What you want | Prop | On |
|---|---|---|
| More than one section open at a time | `is-allow-multiple` | `MpAccordion` |
| Clicking an open header closes it | `is-allow-toggle` | `MpAccordion` |
| Start expanded | `is-default-open` | `MpAccordionItem` |
| Drive open state from outside | `is-controlled` + `is-open` | both |

`defaultIndexOpen` on the root only works for a static list — it's read once, so
a section appended later ignores it. For a list that grows at runtime, put
`is-default-open` on the **item**: it seeds that item's own state when it mounts,
so a newly added section comes in expanded.

```vue
<MpAccordion is-allow-multiple is-allow-toggle>
  <MpAccordionItem v-for="key in addedCriteria" :key="key" is-default-open :class="accordionRow">
    …
  </MpAccordionItem>
</MpAccordion>
```

## A removable section: keep the remove button out of the header

`MpAccordionHeader` is the toggle — anything inside it collapses the section when
clicked. A remove (or any other) action therefore goes **beside** it, not in it,
with the header shrunk to just the caret:

```vue
<div :class="accordionHead"> <!-- flex, align-items: center, gap: 1 -->
  <MpText :class="accordionTitle">{{ label }}</MpText>   <!-- flex: 1 -->
  <MpTooltip label="Remove" use-portal>
    <span :class="iconBtn" role="button" :aria-label="`Remove ${label}`" @click="remove(key)">
      <MpIcon name="minus-circular" size="sm" />
    </span>
  </MpTooltip>
  <MpAccordionHeader :class="caretBtn" :aria-label="`Collapse ${label}`">
    <MpAccordionIcon />
  </MpAccordionHeader>
</div>
<MpAccordionPanel>…</MpAccordionPanel>
```

- Title, remove, caret — in that order, title flexing to fill.
- Removing a section **resets its own values** so re-adding it starts clean,
  exactly like `PxAllFiltersDrawer.removeScope`
  ([`filter-bar.md`](filter-bar.md#fixed-criteria-drawer-vs-the-all-filters-scope-picker)).
- One `borderBottom` per item; no card, no outer border.

## An operator dropdown joined to an input

For "Is at least / Is between …" style rules, the operator lives in the input's
**left addon** so the pair reads as one control:

```vue
<MpInputGroup :class="opAddon">
  <MpInputLeftAddon>
    <select v-model="rule.op" :aria-label="`${label} comparison`">
      <option v-for="op in COMPARISON_OPS" :key="op.value" :value="op.value">{{ op.label }}</option>
    </select>
  </MpInputLeftAddon>
  <MpInput v-model="rule.from" type="number" />
</MpInputGroup>
```

⚠️ **`MpInputLeftAddon` renders 32px wide.** It's built for short prefixes
("Rp"), so a select inside it overflows and the input overlaps it. Size it to its
content by hooking Pixel's stable `mp-*__root` classes — the same escape hatch
`PxSelectPopover` uses for `.mp-select__root button`:

```ts
const opAddon = css({
  '& .mp-input-addon__root': {
    width: 'auto', minWidth: 'fit-content', flexShrink: '0',
    paddingInline: '2', background: 'background.neutral.subtle',
  },
  '& .mp-input__root': { flex: '1', minWidth: '0' },
  '& select': { border: 'none', background: 'transparent', fontWeight: '600', cursor: 'pointer', paddingRight: '5' },
})
```

Hook `mp-*__root` (stable, BEM-ish), never Panda's generated atomic classes
([`buttons.md`](buttons.md)).

## A checkbox that reveals its own value field

When ticking an option needs a number with it, reveal the field **under** the
checkbox, indented to its label:

```vue
<MpCheckbox :is-checked="rule.enabled" @update:is-checked="(v: boolean) => (rule.enabled = v)">
  {{ label }}
</MpCheckbox>
<div v-if="rule.enabled" :class="daysField"> <!-- marginTop: 2, marginLeft: 6 -->
  <MpInputGroup>
    <MpInput v-model="rule.maxDays" type="number" :aria-label="`${label} days`" />
    <MpInputRightAddon>Days</MpInputRightAddon>
  </MpInputGroup>
</div>
```

The tick and the value are **separate state** (`{ enabled, maxDays }`): ticked
with an empty value means "this criterion is on but unbounded", and must not
silently behave as zero.

## Rules

- `is-allow-multiple` + `is-allow-toggle` on the root; `is-default-open` per item.
- Actions live beside `MpAccordionHeader`, never inside it.
- Every icon-only control gets an `aria-label` + `MpTooltip use-portal`.
- Removing a section resets its values.
- Half-width (296px) controls inside the panel, matching the drawer's two-column
  rhythm; a two-value row may go to 420px.

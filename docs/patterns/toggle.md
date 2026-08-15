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

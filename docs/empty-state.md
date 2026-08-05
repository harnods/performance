# Empty state — design rule

The pattern shown when a list/collection has no records yet (a brand-new goal
cycle with no goals, a goal-cycles list before any cycle is created, etc.). It
**replaces** the filter bar + table entirely — never render an empty table
shell with a placeholder row.

## Anatomy (top → bottom, centered)

1. **Illustration** — from `public/illustrations/` (e.g. `empty-timeframe.png`),
   `height: 240px`, `width: auto`, `alt=""` + `aria-hidden="true"` (decorative).
2. **Title** — 16px / 600 / lh 24px, `color: text.default`. States what's
   missing, e.g. "No goal cycle yet".
3. **Caption** — `size="label"` (14px), `color: text.secondary`. One sentence on
   what to do / what will appear here.
4. **Action button** — **`variant="secondary"`** (NOT primary). The empty state
   is a calm, low-pressure moment; the action is an invitation, not the loud
   primary CTA of a working page. The page's primary CTA still lives in the
   header bar (`#page-header-actions`) as `variant="primary"`.

## Layout

```vue
<MpFlex v-if="isEmpty" direction="column" align="center" justify="center"
        gap="4" :class="emptyStateWrap">
  <img src="/illustrations/empty-timeframe.png" alt="" aria-hidden="true" :class="emptyIllustration">
  <MpFlex direction="column" align="center" gap="1" :class="emptyTextWrap">
    <MpText :class="emptyTitle">No goal cycle yet</MpText>
    <MpText size="label" :class="captionText">Create a goal cycle to start setting goals for your team.</MpText>
  </MpFlex>
  <MpButton variant="secondary" @click="onCreate">New goal cycle</MpButton>
</MpFlex>
```

```ts
const emptyStateWrap = css({ paddingY: '20', textAlign: 'center' })
const emptyIllustration = css({ height: '240px', width: 'auto' })
const emptyTextWrap = css({ maxWidth: '420px' })
const emptyTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
```

## Rules

- **Button variant = `secondary`.** Project-wide, every empty-state action
  button is secondary. (The header-bar primary CTA stays primary.)
- Cancel/dismiss actions, as everywhere, stay `variant="ghost"`.
- Reuse an existing illustration from `public/illustrations/` — don't invent new
  art per screen.
- Mirror this exact structure; don't build a new empty-state layout per page.

## Where it's used

- `pages/goals/goal-cycles/index.vue` — no goal cycle created yet.
- `pages/goals/goal-cycles/[id]/index.vue` — a cycle with no goals yet.
- `pages/reviews/review-cycles/[id]/index.vue` — no review timeframe yet.

# Page title & breadcrumb

Lives in the per-page header bar (72px). See [`header-bar.md`](header-bar.md) for the container.

## Title

Set via `definePageMeta({ title })`. Rendered as the `<h1>` at `layouts/default.vue:100-102`:

```vue
<MpText as="h1" size="h1" weight="semiBold" color="text.default">{{ pageTitle }}</MpText>
```

Simplest page declaration:

```vue
<!-- pages/settings/manage-users.vue -->
<script setup lang="ts">
definePageMeta({ title: 'Manage Users' })
</script>
```

### Title fallback chain

`layouts/default.vue:20-22` resolves the title in order:

```ts
const pageTitle = computed(() =>
  (route.meta.title as string) || (route.query.timeframe as string)
  || (route.query.name as string) || goalCycleTitleFallback.value || ''
)
```

So detail pages that omit a static `title` get it from `?timeframe=` / `?name=` query params, or from the goal-cycles store by `route.params.id`. When you build a detail page whose title is dynamic, pass it via the query param rather than hard-coding.

## Breadcrumb

Set via `definePageMeta({ breadcrumb: { label, to } })`. Type: `{ label: string, to?: string | Record<string, unknown> }`.

```ts
// pages/reviews/review-cycles/create.vue:26-30
definePageMeta({
  title: 'Create new cycle',
  layout: 'default',
  breadcrumb: { label: 'Review cycles', to: '/reviews/review-cycles' },
})
```

Rendered as an `MpTextlink as="button" size="small"` **directly above** the title, inside a `direction="column" gap="0"` wrapper — breadcrumb sits **flush (gap 0)** above the H1 (`layouts/default.vue:80-99`). Do not add vertical spacing between breadcrumb and title.

A deeply-nested cycle page can show a second/intermediate breadcrumb (`cycleBreadcrumb`, built from `?cycleName=`), separated from the first by a `/` text node (`layouts/default.vue:39-53,89-98`).

## Status badge beside the title

To show a status badge next to the title (e.g. a detail page whose title is an entity name), teleport an `MpBadge` into the header's `#page-title-badge` target — do NOT render a second heading inside the stage:

```vue
<Teleport to="#page-title-badge" defer>
  <MpBadge for="tableStatus" :type="isActive ? 'completed' : 'announcement'">
    {{ isActive ? 'Active' : 'Inactive' }}
  </MpBadge>
</Teleport>
```

The target sits inline right after the `<h1>` (`layouts/default.vue`). Pair it with a dynamic title (below) so the header reads "«Name» «badge»". Example: `pages/goals/goal-categories/detail/[uuid].vue`.

## Dynamic detail title (from a store record)

For a detail page whose title is an entity name, omit `title` from `definePageMeta` and add a fallback in the layout that resolves the name from the store by route param — mirroring `goalCycleTitleFallback` / `goalCategoryTitleFallback` in `layouts/default.vue`. This keeps the title correct even on deep links (no reliance on a `?name=` query). Do not hard-code the name in the page.

## Rules

- No standalone page-title `<h1>` inside the stage — the title always comes from `definePageMeta`.
- Title + status badge → title via the fallback chain, badge via `#page-title-badge` teleport. Never duplicate the name as an in-stage heading.
- Breadcrumb → title gap is **0**. Mirror `.detail-bar-left` behaviour.
- Dynamic titles flow through query params via the fallback chain, not through custom rendering.

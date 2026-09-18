# Feature flags — hiding finished-but-unreleased UI

`utils/featureFlags.ts` holds build-time booleans for features that are complete
in code but not yet meant to be seen.

> ⚠️ **This is a narrow exception.** [`../../CLAUDE.md`](../../CLAUDE.md) says not
> to reach for feature flags "when you can just change the code", and that still
> stands for behaviour changes, migrations and compatibility shims — change the
> code and delete the old path. A flag is only justified for the one case here:
> a whole finished surface that must be **invisible now and visible later**,
> where deleting it would mean rebuilding it.

## The rules

- **One flag per surface**, named for the surface (`TALENT_POOLS_ENABLED`), not
  for a date or a ticket.
- **Document what it covers** in the flag's own doc comment — every component,
  drawer, column and route that disappears with it. A reader flipping it on
  needs to know what they're turning on.
- **Gate at the entry point, not everywhere.** Hide the thing that makes the
  feature reachable, then let the existing conditionals do the rest. Talent
  directory hides the tab bar, so `activeTab` can never leave `'all'` and every
  `activeTab !== 'all'` branch (match-score column, bulk checkboxes, summary
  strip, empty state) is unreachable *by construction*. Sprinkling the flag
  through each branch would be more code and more ways to get it wrong.
- **Gate the drawers/modals too**, since those render outside that tree.
- **Keep the feature's tests running.** Flags hide UI; they must not exclude the
  feature's logic from the suite, or it rots silently while hidden.
- **Delete the flag when the feature ships.** A permanently-`true` flag is dead
  code with a misleading name.

```ts
// utils/featureFlags.ts
export const TALENT_POOLS_ENABLED = false
```

```vue
<Teleport v-if="TALENT_POOLS_ENABLED" to="#page-tabs" defer>…</Teleport>

<PxAddPoolDrawer v-if="TALENT_POOLS_ENABLED" … />
<PxMatchScoreDrawer v-if="TALENT_POOLS_ENABLED" … />
```

Leave a pointer at the feature's own code too, so the next reader doesn't
conclude it's dead:

```ts
// 🔒 Currently hidden behind TALENT_POOLS_ENABLED (utils/featureFlags.ts).
```

## Not a runtime flag

There's no backend in this repo to serve per-user flags, so these are plain
build-time constants — they can't be toggled per tenant, per user or from a
dashboard. If a real rollout gate is ever needed, that's a different mechanism,
not this file.

## Currently flagged off

| Flag | Surface | Docs describing it |
|---|---|---|
| `TALENT_POOLS_ENABLED` | Talent directory pools — pool tabs, `PxAddPoolDrawer`, the "Showing …" strip, match score + `PxMatchScoreDrawer` | [`ai-prompt-builder.md`](ai-prompt-builder.md), [`accordion.md`](accordion.md), [`filter-bar.md`](filter-bar.md), [`tabs.md`](tabs.md), [`banner.md`](banner.md) |

Those docs describe the patterns as built — they're still the reference for how
to build this kind of UI, even while the surface itself isn't reachable in the
running app.

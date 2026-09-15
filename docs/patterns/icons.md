# Icons

## `MpIcon` vs `PxIcon`

- **`MpIcon`** (from `@mekari/pixel3`) — the default. 46 files use it: button `left-icon`/`right-icon`, inline glyphs, list markers, carets.
- **`PxIcon`** (`components/PxIcon.vue`) — thin wrapper that forces an **exact pixel box** (16/18/20/24/28/32/40/48) via `<span class="mp-icon-box" :data-size>` (styles in `assets/css/main.css:9-28`), because it calls `MpIcon size="md"` internally. Use it when you need a precisely-sized icon box — notably **sidebar nav icons** (`:size="20"`) and the dashboard (`pages/index.vue`).

Rule of thumb: **need a precise box → `PxIcon`; everything else → `MpIcon`.**

## Naming

Icon names are kebab-case string literals (`add`, `chevrons-right`, `arrows-right`, `chat`, `sort-default`, `inbox`, `shortcuts`). There is no runtime name-resolution helper. **Validate names against the Pixel icon set at authoring time** with the MCP tool `mcp__mekari-pixel-web__get-icon-name` (`ai.mekari.design/mcp`) — don't guess.

## Colour

`PxIcon` takes semantic colour tokens: `icon.default`, `icon.secondary`, `icon.brand`. Active sidebar icons = `icon.brand` + `variant="fill"`; inactive = default + `variant="outline"` (see [`sidebar-menu.md`](sidebar-menu.md)).

**`MpIcon` colour must be set via its own `color` prop** (`<MpIcon name="..." color="icon.inverse" />`), never via a wrapping `:class`/CSS `color`. `MpIcon` renders `--mp-icon-color` as an **inline style** computed from its `color` prop — a Panda `css({ color: 'icon.inverse' })` class on the icon (or its parent) does not override that inline style, so the icon silently stays its default gray (`icon.secondary`-ish `#626B79`) no matter what CSS you throw at it. `goal-cycles/[id]/index.vue`'s scenario-control FAB hit this exactly: `color: 'icon.inverse'` on the wrapping `<button>` had no effect until moved to `MpIcon`'s own `color` prop.

## When a semantic colour token isn't emitted — CSS var + `& svg` override

Some semantic icon colour tokens (e.g. `icon.warning`) aren't emitted in this
app's Panda build, so `MpIcon`'s own `color` prop silently no-ops for them —
same failure mode as the general colour gotcha above, but the prop itself
can't fix it since the token doesn't exist to point at. The fix (the
over-weight warning triangle, `goal-cycles/[id]/index.vue`'s owner accordion
header) sets colour on the **wrapping span** instead, via a CSS var with a hex
fallback, and forces it onto the icon's inner `<svg>` with a `& svg` selector
override (the glyph itself uses `currentColor`, but `MpIcon` doesn't expose a
way to set that from outside):

```vue
<span :class="css({ display: 'inline-flex', color: 'var(--mp-icon-warning, #BC560D)', cursor: 'help', '& svg': { color: 'var(--mp-icon-warning, #BC560D)' } })" aria-label="Goal weight over 100%">
  <MpIcon name="warning-triangle" variant="fill" size="sm" />
</span>
```

**Gotcha:** if this icon is wrapped in `MpTooltip`, the outer `<span>` must be
`MpTooltip`'s **only** slot child. A leading `<!-- comment -->` node inside the
tooltip becomes the trigger instead, and the tooltip never shows.

## AI-generated content marker — `airene-brand`

Anything computed by AI (a summary, a score) carries the `airene-brand` logo icon
(`icon.brand` colour) beside it, plus a short disclaimer the user can read on
demand:

```vue
<MpIcon name="airene-brand" :class="css({ color: 'icon.brand' })" />
<MpText size="label-small" :class="css({ color: 'text.brand' })">Summarized by AI</MpText>
```

(`components/CycleDetailGeneral.vue:310`, `pages/reviews/review-cycles/[id]/index.vue:1286`.)

When the AI output is a **score/number a user might act on** (not just a text
summary), pair the icon with an explanatory `MpTooltip` on hover, and — if it
opens a detail drawer — repeat the disclaimer as a dismissible-looking
`MpBanner variant="info"` at the top of that drawer (`Learn more` via
`MpTextlink as="button"`, not `MpBannerLink` — see [`banner.md`](banner.md)):

```vue
<MpTooltip label="Calculated by AI based on how well this talent fits the pool's criteria." use-portal>
  <MpIcon name="airene-brand" size="sm" :class="css({ color: 'icon.brand', cursor: 'help' })" />
</MpTooltip>
```

Reference: Talent directory's "Match score" column + `components/PxMatchScoreDrawer.vue`
— see [`badges.md`](badges.md#tiered-percentage-pill-eg-ai-match-score) for the
tiered pill this icon sits beside.

## Rules

- Sidebar/precise-box icons → `PxIcon` with `:size`. Inline/button icons → `MpIcon`.
- Validate every icon name via `get-icon-name` before using it.
- Colour via `icon.*` tokens, never hex.
- If a token doesn't visibly apply via `MpIcon`'s `color` prop, it may not be
  emitted in this build — fall back to the CSS-var + `& svg` override above
  rather than guessing at a different token or icon name.

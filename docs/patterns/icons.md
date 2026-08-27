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

## When `MpIcon` renders nothing — inline SVG fallback

Some environments fetch `MpIcon`'s glyph variants from `cdn.mekari.design` at
runtime rather than bundling them; when that resolution fails (e.g. this repo's
dev build), `MpIcon` silently renders an empty box — no error, no fallback glyph.
If an icon isn't showing and the name is already validated via `get-icon-name`,
suspect this before anything else.

The fix used for the goal-weight-mismatch warning triangle
(`goal-cycles/[id]/index.vue`'s owner accordion header) is a **hand-drawn inline
`<svg>`**, coloured via a CSS var with a hex fallback rather than an `icon.*`
token (since the surrounding wrapper isn't `MpIcon`, the token pipeline doesn't
apply). The actual value the icon is warning about (the owner's weight
percentage) sits next to it as its own styled `<span>` — a tooltip alone would
only tell you *something's* wrong, not whether this owner is over or under
100%:

```vue
<span :class="css({ display: 'inline-flex', alignItems: 'center', gap: '1', cursor: 'help' })" :aria-label="`Goal weight is ${total}%, not 100%`">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path fill="var(--mp-icon-warning, #BC560D)" d="M13.3 3.9a1.5 1.5 0 0 0-2.6 0L1.9 19.2A1.5 1.5 0 0 0 3.2 21.5h17.6a1.5 1.5 0 0 0 1.3-2.3L13.3 3.9Z" />
    <path fill="#fff" d="M11 9h2v5h-2zM11 16.5h2v2h-2z" />
  </svg>
  <span :class="css({ fontSize: '12px', fontWeight: '600', lineHeight: '16px', color: 'var(--mp-icon-warning, #BC560D)' })">{{ total }}%</span>
</span>
```

This is a **last resort** — only reach for it once a plain `MpIcon` (or
`PxIcon`) with a validated name has been confirmed empty in practice, not
pre-emptively for every icon.

**Gotcha:** if this icon is wrapped in `MpTooltip`, the `<span>` must be
`MpTooltip`'s **only** slot child. A leading `<!-- comment -->` node inside the
tooltip becomes the trigger instead, and the tooltip never shows.

## Rules

- Sidebar/precise-box icons → `PxIcon` with `:size`. Inline/button icons → `MpIcon`.
- Validate every icon name via `get-icon-name` before using it.
- Colour via `icon.*` tokens, never hex.
- If a validated `MpIcon` renders empty, fall back to an inline SVG (see above)
  rather than guessing at a different icon name.

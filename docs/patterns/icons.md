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

## Rules

- Sidebar/precise-box icons → `PxIcon` with `:size`. Inline/button icons → `MpIcon`.
- Validate every icon name via `get-icon-name` before using it.
- Colour via `icon.*` tokens, never hex.

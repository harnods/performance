# Sidebar menu

All in `components/AppSidebar.vue`.

## Nav data structure (`:4-13`)

```ts
interface NavChild { label: string; path?: string; children?: NavChild[] }
interface NavDivider { divider: true }
type PanelItem = NavChild | NavDivider
interface NavItem { icon: string; label: string; path?: string; children?: PanelItem[] }
```

Three rail groups separated by dividers, assembled as `allGroups = [group1, group2, group3]` (`:113`):
- `group1` (`:15-22`) — Home / Dashboard / Reports — leaf items with `path`.
- `group2` (`:48-80`) — Reviews / Goals / Talents — section items with `children` (level-2 submenu).
- `group3` (`:82-93`) — Settings.

A level-2 child can itself have `children` → renders as an **accordion** (e.g. Talents → Competencies with 5 sub-pages, `:68-77`). Dividers inside a panel: `{ divider: true }`.

Special cases:
- **Goals** swaps its children based on cookie `goals-new-interface` between `goalsChildrenNew` / `goalsChildrenCurrent` (`:28-46,58-61`).
- **Inbox** (`:99-111`) has a level-2 submenu but **no rail icon** — excluded from `allGroups` (not on rail) but in `allItems` (`:114`) so active-state still lights its panel on `/inbox/*`.

## Active-state logic (`:123-137`)

Flatten every leaf path, then the **longest matching prefix wins**:

```ts
const activeLeafPath = computed(() =>
  allLeafPaths.value
    .filter(p => route.path === p || route.path.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0] ?? null,
)
```

This is the CLAUDE.md rule (`route.path === child.path || route.path.startsWith(child.path + '/')`) generalised so `/talents/competencies/groups` beats the shorter `/talents/competencies`. `aria-current="page"` is set on active links.

## Collapse (Ctrl+B / ⌘B)

State: `useState('sidebar-main-collapsed')` (`:155`). Three modes (`:160-162`):

```ts
const mode = computed<'full'|'rail'|'submenu'>(() =>
  activeParent.value ? 'submenu' : (isMainNavCollapsed.value ? 'rail' : 'full'))
```

Being on a route with an active parent **forces** rail+panel. Keyboard handler `:164-173` (platform-aware `⌘B` vs `Ctrl+B`). Widths: full rail `216px`, collapsed rail `56px`, level-2 panel `208px` (collapsible to `16px` via `sidebar-panel-collapsed`). Collapse chevrons: `chevrons-left` / `chevrons-right` styled by `ghostBtn`.

## Icon + active/inactive styling (`:330-335`)

Nav icons use **`PxIcon`**. Active swaps both variant and color:

```vue
<PxIcon :name="item.icon" :size="20"
  :variant="isItemActive(item) ? 'fill' : 'outline'"
  :color="isItemActive(item) ? 'icon.brand' : ''" />
```

- **Inactive** = `outline` variant, default color, `text.default`, weight regular.
- **Active** = `fill` variant, `icon.brand`, `text.link`, weight semiBold, `background.brand.selected`.

Level-1 section items show a **dark hover popover** flyout of their children in full & rail modes (`MpPopoverContent :isDark="true"`, `:339-352`). Panel section title is uppercase `text.link`, `letterSpacing: wider`.

## Rules

- New nav entries go into the typed `NavItem`/`NavChild` structure — don't hand-render nav rows.
- Never hard-code active state — rely on the longest-prefix `activeLeafPath` computed.
- Nav icons = `PxIcon` (fixed 20px box), active = fill + `icon.brand`.
- Applying the multi-level submenu pattern? Use the `mekari-sidebar-nav` skill and mirror this file.

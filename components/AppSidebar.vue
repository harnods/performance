<script setup lang="ts">
import { MpFlex, MpText, MpIcon, MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, css, cx, token } from '@mekari/pixel3'

interface NavChild { label: string; path?: string; children?: NavChild[] }
interface NavDivider { divider: true }
type PanelItem = NavChild | NavDivider

interface NavItem {
  icon: string
  label: string
  path?: string
  children?: PanelItem[]
}

const group1: NavItem[] = [
  { icon: 'home', label: 'Home', path: '/' },
  {
    icon: 'inbox', label: 'Inbox',
    children: [
      { label: 'Notifications', path: '/inbox/notifications' },
      {
        label: 'Awaiting approval',
        children: [
          { label: 'Reviews', path: '/inbox/awaiting-approval/reviews' },
          { label: 'Goals', path: '/inbox/awaiting-approval/goals' },
        ],
      },
    ],
  },
  { icon: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { icon: 'reports', label: 'Reports', path: '/reports' },
]

// Toggled from Goals settings ("Use the new Goals interface"). Swaps the
// Goals level-2 sitemap between the current menu and the new-experience menu.
const goalsNewInterface = useCookie('goals-new-interface', { default: () => false })

const goalsChildrenCurrent: PanelItem[] = [
  { label: 'Individual goals', path: '/goals/individual-goals' },
  { label: 'Team goals', path: '/goals/team-goals' },
  { label: 'Organization goals', path: '/goals/organization-goals' },
  { label: 'Company goals', path: '/goals/company-goals' },
  { divider: true },
  { label: 'Goal hierarchy', path: '/goals/goal-hierarchy' },
  { label: 'Goal categories', path: '/goals/goal-categories' },
  { label: 'Goal settings', path: '/goals/goal-settings' },
]

const goalsChildrenNew: PanelItem[] = [
  { label: 'Goal cycles', path: '/goals/goal-cycles' },
  { divider: true },
  { label: 'Goal categories', path: '/goals/goal-categories' },
  { label: 'Goal settings', path: '/goals/goal-settings' },
]

const group2 = computed<NavItem[]>(() => [
  {
    icon: 'performance', label: 'Reviews',
    children: [
      { label: 'Pending actions', path: '/reviews/pending-actions' },
      { label: 'Review cycles', path: '/reviews/review-cycles' },
      { label: 'My reviews', path: '/reviews/my-reviews' },
      { label: 'Calibrations', path: '/reviews/calibrations' },
    ],
  },
  {
    icon: 'goal', label: 'Goals',
    children: goalsNewInterface.value ? goalsChildrenNew : goalsChildrenCurrent,
  },
  {
    icon: 'talent-management', label: 'Talents',
    children: [
      { label: 'Talent directory', path: '/talents/talent-directory' },
      { label: 'Succession plans', path: '/talents/succession-plans' },
      { label: 'IDPs', path: '/talents/idps' },
      {
        label: 'Competencies',
        children: [
          { label: 'Assignments', path: '/talents/competencies' },
          { label: 'Import competency results', path: '/talents/competencies/import-results' },
          { label: 'Competency groups', path: '/talents/competencies/groups' },
          { label: 'Competency items', path: '/talents/competencies/items' },
          { label: 'Rating scale', path: '/talents/competencies/rating-scale' },
        ],
      },
    ],
  },
])

const group3: NavItem[] = [
  {
    icon: 'settings', label: 'Settings',
    children: [
      { label: 'Manage users', path: '/settings/manage-users' },
      { label: 'Templates', path: '/settings/templates' },
      { label: 'Reminders', path: '/settings/reminders' },
      { label: 'Payroll groups', path: '/settings/payroll-groups' },
      { label: '9 box configurations', path: '/settings/9-box-configurations' },
    ],
  },
]

const allGroups = computed(() => [group1, group2.value, group3])
const allItems = computed(() => [...group1, ...group2.value, ...group3])

const isChild = (item: PanelItem): item is NavChild => !('divider' in item)

const route = useRoute()

// Flatten every leaf path (including accordion grandchildren) so active state can
// pick the *most specific* match — e.g. /talents/competencies/groups beats the
// shorter /talents/competencies (Assignments) prefix.
const leafPathsOf = (item: NavItem): string[] => {
  const out: string[] = []
  for (const c of item.children ?? []) {
    if (!isChild(c)) continue
    if (c.path) out.push(c.path)
    for (const sub of c.children ?? []) if (sub.path) out.push(sub.path)
  }
  return out
}
const allLeafPaths = computed(() => allItems.value.flatMap(leafPathsOf))
const activeLeafPath = computed(() =>
  allLeafPaths.value
    .filter(p => route.path === p || route.path.startsWith(p + '/'))
    .sort((a, b) => b.length - a.length)[0] ?? null,
)

const hasActiveChild = (item: NavItem) => leafPathsOf(item).includes(activeLeafPath.value ?? '')

const isItemActive = (item: NavItem) =>
  item.path ? route.path === item.path : hasActiveChild(item)

const firstLeafPath = (item: NavItem): string => {
  const first = item.children?.find(isChild) as NavChild | undefined
  return first?.path ?? (first?.children?.find(isChild) as NavChild | undefined)?.path ?? '/'
}
const itemTarget = (item: NavItem) => item.path ?? firstLeafPath(item)
// Target for a panel child (handles an accordion child → its first sub-page).
const childLink = (c: NavChild) => c.path ?? (c.children?.find(isChild) as NavChild | undefined)?.path ?? '/'

const activeParent = computed<NavItem | undefined>(() => allItems.value.find(hasActiveChild))
const isSubmenuMode = computed(() => !!activeParent.value)

const isMainNavCollapsed = useState('sidebar-main-collapsed', () => false)
watch(isSubmenuMode, (open) => { if (open) isMainNavCollapsed.value = true }, { immediate: true })

const isPanelCollapsed = useState('sidebar-panel-collapsed', () => false)

const mode = computed<'full' | 'rail' | 'submenu'>(() =>
  activeParent.value ? 'submenu' : (isMainNavCollapsed.value ? 'rail' : 'full'),
)

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
const shortcutLabel = isMac ? '⌘B' : 'Ctrl+B'
const onKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    isMainNavCollapsed.value = !isMainNavCollapsed.value
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const panelStyle = computed(() => ({
  width: isPanelCollapsed.value ? '16px' : '208px',
  marginRight: isPanelCollapsed.value ? '16px' : '8px',
  borderColor: isPanelCollapsed.value ? token.var('colors.border.default') : 'transparent',
  boxShadow: isPanelCollapsed.value
    ? '6px 0 15px -3px rgba(0, 0, 0, 0.10) inset, 4px 0 6px -2px rgba(0, 0, 0, 0.05) inset'
    : 'none',
}))

/* ---------- styles (DT 2.4 tokens only) ---------- */
const rootFull = css({ display: 'flex', flexDirection: 'column', w: '216px', h: '100%', flexShrink: 0 })
const rootRailOrSubmenu = css({ display: 'flex', flexDirection: 'row', h: '100%', flexShrink: 0, position: 'relative' })

const railBoxBase = { display: 'flex', flexDirection: 'column', w: '56px', h: '100%', flexShrink: 0 } as const
const railBoxSubmenu = css({
  ...railBoxBase, bg: 'background.nav.parent', position: 'relative', zIndex: 1,
  borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default',
})
const railBoxOnly = css({ ...railBoxBase, bg: 'background.nav.parent' })

const panelBase = css({
  display: 'flex', flexDirection: 'column', h: '100%', flexShrink: 0,
  overflow: 'hidden', boxSizing: 'border-box',
  borderLeftWidth: '1px', borderRightWidth: '1px', borderStyle: 'solid',
  transitionProperty: 'width, margin-right, border-color, box-shadow',
  transitionDuration: '200ms', transitionTimingFunction: 'ease',
})
const panelInner = css({
  display: 'flex', flexDirection: 'column', w: '208px', h: '100%', flexShrink: 0,
  transition: 'opacity 150ms ease',
})

const halfCircleExpand = css({
  position: 'absolute', bottom: '5', left: '72px', zIndex: 30,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  w: '24px', h: '36px', bg: 'background.neutral', color: 'text.secondary',
  borderTopWidth: '1px', borderRightWidth: '1px', borderBottomWidth: '1px',
  borderStyle: 'solid', borderColor: 'border.default',
  borderTopRightRadius: 'full', borderBottomRightRadius: 'full',
  boxShadow: 'sm', cursor: 'pointer',
  transition: 'opacity 150ms ease',
  _hover: { bg: 'background.neutral.hovered' },
})

const navGroup = css({ display: 'flex', flexDirection: 'column', gap: '0.5', py: '2', px: '2' })
const groupDivider = css({ marginInline: '3', height: '1px', background: 'border.default' })
const panelDivider = css({ height: '1px', background: 'border.default', marginInline: '3', marginBlock: '1' })

const itemBase = {
  display: 'flex', alignItems: 'center', gap: '2', w: 'full', height: '36px', px: '3',
  border: 'none', borderRadius: 'md', cursor: 'pointer', textAlign: 'left',
  textDecoration: 'none', transition: 'color 120ms ease',
  fontFamily: 'body', fontSize: 'md', lineHeight: 'lg',
} as const
const itemDefault = css({ ...itemBase, bg: 'transparent', color: 'text.default', fontWeight: 'regular', _hover: { bg: 'transparent', color: 'text.link' } })
const itemActive = css({ ...itemBase, bg: 'background.brand.selected', color: 'text.link', fontWeight: 'semiBold', _hover: { bg: 'background.brand.selected' } })
const itemLabel = css({ flex: '1 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })

const railGroup = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5', py: '2', w: 'full' })
const railBase = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', w: '40px', h: '36px',
  border: 'none', borderRadius: 'md', cursor: 'pointer', flexShrink: 0,
  textDecoration: 'none', transition: 'background-color 120ms ease',
} as const
const railDefault = css({ ...railBase, bg: 'transparent', color: 'text.default', _hover: { bg: 'transparent', color: 'text.link' } })
const railActive = css({ ...railBase, bg: 'background.nav.parent', _hover: { bg: 'background.nav.parent' } })

const childBase = {
  display: 'flex', alignItems: 'center', w: 'full', minHeight: '36px', px: '3', paddingBlock: '2',
  border: 'none', cursor: 'pointer', borderRadius: 'md', textDecoration: 'none',
  fontFamily: 'body', fontSize: 'md', lineHeight: 'md', transition: 'color 120ms ease',
} as const
const childDefault = css({ ...childBase, bg: 'transparent', color: 'text.default', fontWeight: 'regular', _hover: { bg: 'transparent', color: 'text.link' } })
const childActive = css({ ...childBase, bg: 'background.brand.selected', color: 'text.link', fontWeight: 'semiBold', _hover: { bg: 'background.brand.selected' } })

// Accordion toggle row (e.g. "Competencies") + its indented sub-children.
const accordionToggle = css({
  ...childBase, justifyContent: 'space-between', gap: '2', textAlign: 'left',
  bg: 'transparent', color: 'text.default', fontWeight: 'regular',
  _hover: { bg: 'transparent', color: 'text.link' },
})
const accordionToggleActive = css({
  ...childBase, justifyContent: 'space-between', gap: '2', textAlign: 'left',
  bg: 'transparent', color: 'text.link', fontWeight: 'semiBold',
  _hover: { bg: 'transparent', color: 'text.link' },
})
const subChildBase = { ...childBase, paddingLeft: '6' } as const
const subChildDefault = css({ ...subChildBase, bg: 'transparent', color: 'text.default', fontWeight: 'regular', _hover: { bg: 'transparent', color: 'text.link' } })
const subChildActive = css({ ...subChildBase, bg: 'background.brand.selected', color: 'text.link', fontWeight: 'semiBold', _hover: { bg: 'background.brand.selected' } })
const subChildClass = (child: NavChild) => (isChildActive(child) ? subChildActive : subChildDefault)

const ghostBtn = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', w: '36px', h: '36px',
  border: 'none', bg: 'transparent', borderRadius: 'md', cursor: 'pointer', flexShrink: 0, color: 'text.secondary',
  transition: 'background-color 120ms ease', _hover: { bg: 'background.neutral.hovered' },
})

const sectionTitle = css({
  display: 'flex', alignItems: 'center', h: '36px', mt: '4', px: '4',
  fontSize: 'sm', fontWeight: 'semiBold', letterSpacing: 'wider',
  textTransform: 'uppercase', color: 'text.link', whiteSpace: 'nowrap',
})

const isChildActive = (child: NavChild) =>
  child.path != null && child.path === activeLeafPath.value

// ---- Accordion (a panel child that itself has children, e.g. Competencies) ----
const accordionHasActive = (acc: NavChild) =>
  !!acc.children?.some(s => isChild(s) && s.path === activeLeafPath.value)
const manualOpen = ref<Record<string, boolean>>({})
const isAccordionOpen = (acc: NavChild) => manualOpen.value[acc.label] ?? accordionHasActive(acc)
const toggleAccordion = (acc: NavChild) => {
  manualOpen.value = { ...manualOpen.value, [acc.label]: !isAccordionOpen(acc) }
}

const itemClassFull = (item: NavItem) => cx(isItemActive(item) ? itemActive : itemDefault)
const itemClassRail = (item: NavItem) => cx(isItemActive(item) ? railActive : railDefault)
const childClass = (child: NavChild) =>
  isChildActive(child) ? childActive : childDefault

/* ---------- popover dark styles ---------- */
const popoverWrap = css({ py: '1', px: '1', minW: '180px' })
const popoverDivider = css({ h: '1px', bg: 'rgba(255,255,255,0.15)', marginInline: '3', marginBlock: '1' })
const popoverItemBase = {
  display: 'flex', alignItems: 'center', h: '36px', px: '3', w: 'full',
  cursor: 'pointer', borderRadius: 'md', border: 'none', background: 'transparent',
  color: 'white', fontFamily: 'body', fontSize: 'md', fontWeight: 'regular',
  textDecoration: 'none', textAlign: 'left',
  transition: 'background-color 120ms ease',
} as const
const popoverItem = css({ ...popoverItemBase, _hover: { bg: 'background.brand.bold.hovered' } })
const popoverItemActive = css({ ...popoverItemBase, bg: 'background.brand.bold.hovered', _hover: { bg: 'background.brand.bold.hovered' } })
</script>

<template>
  <aside :class="mode === 'full' ? rootFull : rootRailOrSubmenu">

    <!-- ============ FULL MODE ============ -->
    <template v-if="mode === 'full'">
      <MpFlex as="nav" direction="column" flex="1" overflowY="auto" overflowX="hidden" minHeight="0" aria-label="Main">
        <template v-for="(group, gi) in allGroups" :key="gi">
          <div v-if="gi > 0" :class="groupDivider" />
          <div :class="navGroup" :style="gi === 0 ? { paddingTop: '16px' } : {}">
            <template v-for="item in group" :key="item.label">
              <!-- Section item (has children) — with hover popover -->
              <MpPopover v-if="item.children" trigger="hover" placement="right-start">
                <MpPopoverTrigger>
                  <NuxtLink
                    :to="itemTarget(item)"
                    :class="itemClassFull(item)"
                    :aria-current="isItemActive(item) ? 'page' : undefined"
                  >
                    <PxIcon
                      :name="item.icon"
                      :size="20"
                      :variant="isItemActive(item) ? 'fill' : 'outline'"
                      :color="isItemActive(item) ? 'icon.brand' : ''"
                    />
                    <span :class="itemLabel">{{ item.label }}</span>
                  </NuxtLink>
                </MpPopoverTrigger>
                <MpPopoverContent :isDark="true" :isUnstyled="false">
                  <div :class="popoverWrap">
                    <template v-for="(child, ci) in item.children" :key="ci">
                      <div v-if="'divider' in child" :class="popoverDivider" />
                      <NuxtLink
                        v-else
                        :to="childLink(child)"
                        :class="(child.children ? accordionHasActive(child) : isChildActive(child)) ? popoverItemActive : popoverItem"
                      >
                        {{ child.label }}
                      </NuxtLink>
                    </template>
                  </div>
                </MpPopoverContent>
              </MpPopover>

              <!-- Leaf item (no children) -->
              <NuxtLink
                v-else
                :to="itemTarget(item)"
                :class="itemClassFull(item)"
                :aria-current="isItemActive(item) ? 'page' : undefined"
              >
                <PxIcon
                  :name="item.icon"
                  :size="20"
                  :variant="isItemActive(item) ? 'fill' : 'outline'"
                  :color="isItemActive(item) ? 'icon.brand' : ''"
                />
                <span :class="itemLabel">{{ item.label }}</span>
              </NuxtLink>
            </template>
          </div>
        </template>
      </MpFlex>

      <MpFlex
        align="center"
        gap="0.5"
        paddingInline="3"
        height="68px"
        borderTop="1px solid"
        borderTopColor="border.default"
        flexShrink="0"
      >
        <button
          type="button"
          :class="ghostBtn"
          :aria-label="`Collapse sidebar (${shortcutLabel})`"
          :title="`Collapse sidebar · ${shortcutLabel}`"
          @click="isMainNavCollapsed = true"
        >
          <MpIcon name="chevrons-left" />
        </button>
        <MpText as="span" size="body-small" color="text.secondary">Company ID : 102938</MpText>
      </MpFlex>
    </template>

    <!-- ============ RAIL + SUBMENU ============ -->
    <template v-else>
      <div :class="mode === 'submenu' ? railBoxSubmenu : railBoxOnly">
        <MpFlex direction="column" flex="1" align="center" paddingInline="1" overflowY="auto" overflowX="hidden" minHeight="0">
          <template v-for="(group, gi) in allGroups" :key="gi">
            <div v-if="gi > 0" :class="groupDivider" style="width: 40px" />
            <div :class="railGroup" :style="gi === 0 ? { paddingTop: '16px' } : {}">
              <template v-for="item in group" :key="item.label">
                <MpPopover v-if="item.children" trigger="hover" placement="right-start">
                  <MpPopoverTrigger>
                    <NuxtLink
                      :to="itemTarget(item)"
                      :class="itemClassRail(item)"
                      :aria-label="item.label"
                      :title="item.label"
                    >
                      <PxIcon
                        :name="item.icon"
                        :size="20"
                        :variant="isItemActive(item) ? 'fill' : 'outline'"
                        :color="isItemActive(item) ? 'icon.brand' : ''"
                      />
                    </NuxtLink>
                  </MpPopoverTrigger>
                  <MpPopoverContent :isDark="true" :isUnstyled="false">
                    <div :class="popoverWrap">
                      <template v-for="(child, ci) in item.children" :key="ci">
                        <div v-if="'divider' in child" :class="popoverDivider" />
                        <NuxtLink
                          v-else
                          :to="child.path"
                          :class="isChildActive(child) ? popoverItemActive : popoverItem"
                        >
                          {{ child.label }}
                        </NuxtLink>
                      </template>
                    </div>
                  </MpPopoverContent>
                </MpPopover>

                <NuxtLink
                  v-else
                  :to="itemTarget(item)"
                  :class="itemClassRail(item)"
                  :aria-label="item.label"
                  :title="item.label"
                >
                  <PxIcon
                    :name="item.icon"
                    :size="20"
                    :variant="isItemActive(item) ? 'fill' : 'outline'"
                    :color="isItemActive(item) ? 'icon.brand' : ''"
                  />
                </NuxtLink>
              </template>
            </div>
          </template>
        </MpFlex>

        <MpFlex
          v-if="mode === 'rail'"
          align="center"
          justify="center"
          height="68px"
          flexShrink="0"
          borderTop="1px solid"
          borderTopColor="border.default"
        >
          <button
            type="button"
            :class="ghostBtn"
            :aria-label="`Expand sidebar (${shortcutLabel})`"
            :title="`Expand sidebar · ${shortcutLabel}`"
            @click="isMainNavCollapsed = false"
          >
            <MpIcon name="chevrons-right" />
          </button>
        </MpFlex>
      </div>

      <!-- Level-2 panel (submenu mode) -->
      <div v-if="mode === 'submenu'" :class="panelBase" :style="panelStyle">
        <div
          :class="panelInner"
          :style="{ opacity: isPanelCollapsed ? 0 : 1, pointerEvents: isPanelCollapsed ? 'none' : 'auto' }"
        >
          <div :class="sectionTitle">{{ activeParent?.label }}</div>
          <MpFlex direction="column" flex="1" paddingInline="2" overflowY="auto" minHeight="0" paddingBlock="2">
            <template v-for="(item, idx) in activeParent?.children" :key="idx">
              <div v-if="'divider' in item" :class="panelDivider" />
              <!-- Accordion: a child that has its own children (e.g. Competencies) -->
              <template v-else-if="item.children">
                <button
                  type="button"
                  :class="accordionHasActive(item) ? accordionToggleActive : accordionToggle"
                  :aria-expanded="isAccordionOpen(item)"
                  @click="toggleAccordion(item)"
                >
                  <span :class="itemLabel">{{ item.label }}</span>
                  <MpIcon :name="isAccordionOpen(item) ? 'caret-down' : 'caret-right'" size="sm" />
                </button>
                <template v-if="isAccordionOpen(item)">
                  <NuxtLink
                    v-for="sub in item.children"
                    :key="sub.path"
                    :to="sub.path!"
                    :class="subChildClass(sub)"
                    :aria-current="isChildActive(sub) ? 'page' : undefined"
                  >
                    {{ sub.label }}
                  </NuxtLink>
                </template>
              </template>
              <!-- Leaf child -->
              <NuxtLink
                v-else
                :to="item.path!"
                :class="childClass(item)"
                :aria-current="isChildActive(item) ? 'page' : undefined"
              >
                {{ item.label }}
              </NuxtLink>
            </template>
          </MpFlex>
          <MpFlex align="center" justify="flex-end" height="68px" paddingInline="3" flexShrink="0">
            <button type="button" :class="ghostBtn" aria-label="Collapse submenu" @click="isPanelCollapsed = true">
              <MpIcon name="chevrons-left" />
            </button>
          </MpFlex>
        </div>
      </div>

      <button
        v-if="mode === 'submenu'"
        type="button"
        :class="halfCircleExpand"
        :style="{ opacity: isPanelCollapsed ? 1 : 0, pointerEvents: isPanelCollapsed ? 'auto' : 'none' }"
        aria-label="Expand submenu"
        @click="isPanelCollapsed = false"
      >
        <MpIcon name="chevrons-right" size="sm" />
      </button>
    </template>

  </aside>
</template>

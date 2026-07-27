<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Inbox / Notifications
  Source: Figma — Inbox (fileKey xt9c7VhiKslsuY2zGzycH7, node 6223:39979)
  Token mode: Pixel 2.4

  Two-column split: a scrollable, grouped (Today / Last 7 days / month)
  notification list on the left, and the selected notification's full detail
  on the right — clicking a row selects it and marks it read. This is a new
  list+detail pattern for the app (nothing else here does live in-page
  master/detail), introduced because the Figma design calls for exactly
  that, mirrored as closely as the design system allows otherwise (search
  input, badges, buttons, grouped-list headers all reuse existing patterns
  from elsewhere in the app).
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpIcon,
  MpButton,
  MpCheckbox,
  MpInput,
  MpInputGroup,
  MpInputLeftAddon,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpTooltip,
  toast,
  css,
} from '@mekari/pixel3'
import type { Notification } from '~/composables/useInboxNotificationsStore'

definePageMeta({
  layout: 'default',
  boxed: true,
  noPageHeader: true,
})

const { notifications, markRead, markUnread, deleteNotifications } = useInboxNotificationsStore()

const selectedId = ref(notifications.value[0]?.id ?? '')
const searchQuery = ref('')

function isUnread(n: Notification) {
  return !n.isRead
}
function selectNotification(n: Notification) {
  selectedId.value = n.id
  markRead([n.id])
}

const filteredNotifications = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return notifications.value
  return notifications.value.filter(n => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q))
})
const groupedNotifications = computed(() => {
  const groups: { label: string, items: Notification[] }[] = []
  for (const n of filteredNotifications.value) {
    let g = groups.find(g => g.label === n.group)
    if (!g) { g = { label: n.group, items: [] }; groups.push(g) }
    g.items.push(n)
  }
  return groups
})

const selected = computed(() => notifications.value.find(n => n.id === selectedId.value) ?? null)
const selectedIndex = computed(() => notifications.value.findIndex(n => n.id === selectedId.value))
const hasPrev = computed(() => selectedIndex.value > 0)
const hasNext = computed(() => selectedIndex.value >= 0 && selectedIndex.value < notifications.value.length - 1)
function goPrev() {
  if (hasPrev.value) selectNotification(notifications.value[selectedIndex.value - 1])
}
function goNext() {
  if (hasNext.value) selectNotification(notifications.value[selectedIndex.value + 1])
}

// ── Bulk select (header checkbox + dropdown: Select all / read / unread) ──
const bulkSelected = reactive<Record<string, boolean>>({})
const selectedCount = computed(() => Object.values(bulkSelected).filter(Boolean).length)
const isSelectionMode = computed(() => selectedCount.value > 0)
const visibleIds = computed(() => filteredNotifications.value.map(n => n.id))
const isAllSelected = computed(() => visibleIds.value.length > 0 && visibleIds.value.every(id => bulkSelected[id]))
const isPartialSelected = computed(() => isSelectionMode.value && !isAllSelected.value)

function clearSelection() {
  Object.keys(bulkSelected).forEach((id) => { bulkSelected[id] = false })
}
function toggleRowSelected(id: string, checked: boolean) {
  bulkSelected[id] = checked
}
function selectAll() {
  visibleIds.value.forEach((id) => { bulkSelected[id] = true })
}
function selectByReadState(wantUnread: boolean) {
  clearSelection()
  filteredNotifications.value.forEach((n) => { bulkSelected[n.id] = isUnread(n) === wantUnread })
}
// Header checkbox itself: unchecked → select all visible; checked/partial → clear.
function toggleHeaderCheckbox() {
  if (isSelectionMode.value) clearSelection()
  else selectAll()
}

// The header icon toggles between "mark as read" and "mark as unread" depending
// on whether the current selection is already fully read — mirrors the Figma
// bulk-select spec, which shows only one icon whose tooltip changes by state.
const selectedIds = computed(() => Object.keys(bulkSelected).filter(id => bulkSelected[id]))
const selectionAllRead = computed(() => selectedIds.value.length > 0 && selectedIds.value.every(id => notifications.value.find(n => n.id === id)?.isRead))
const toggleReadLabel = computed(() => (selectionAllRead.value ? 'Mark as unread' : 'Mark as read'))

function bulkToggleRead() {
  const ids = selectedIds.value
  const markAsUnread = selectionAllRead.value
  if (markAsUnread) markUnread(ids)
  else markRead(ids)
  clearSelection()
  toast.notify({
    id: 'inbox-bulk-mark-read',
    position: 'top-center',
    variant: 'success',
    title: `${ids.length} notification${ids.length === 1 ? '' : 's'} marked as ${markAsUnread ? 'unread' : 'read'}`,
  })
}
function bulkDelete() {
  const ids = selectedIds.value
  const idsToDelete = new Set(ids)
  deleteNotifications(ids)
  clearSelection()
  if (idsToDelete.has(selectedId.value)) {
    selectedId.value = notifications.value[0]?.id ?? ''
  }
  toast.notify({
    id: 'inbox-bulk-delete',
    position: 'top-center',
    variant: 'success',
    title: `${ids.length} notification${ids.length === 1 ? '' : 's'} deleted`,
  })
}

// ── Resizable list column — drag the right edge; min = default width (384px),
// max = +50% of that (576px), per spec ──
const LIST_COLUMN_MIN_WIDTH = 384
const LIST_COLUMN_MAX_WIDTH = 576
const listColumnWidth = ref(LIST_COLUMN_MIN_WIDTH)
let resizeStartX = 0
let resizeStartWidth = 0
function onResizeMove(e: MouseEvent) {
  const next = resizeStartWidth + (e.clientX - resizeStartX)
  listColumnWidth.value = Math.min(LIST_COLUMN_MAX_WIDTH, Math.max(LIST_COLUMN_MIN_WIDTH, next))
}
function onResizeUp() {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeUp)
  document.body.style.removeProperty('cursor')
  document.body.style.removeProperty('user-select')
}
function onResizeDown(e: MouseEvent) {
  e.preventDefault()
  resizeStartX = e.clientX
  resizeStartWidth = listColumnWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeUp)
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const pageRoot = css({
  display: 'flex', flex: '1', minHeight: '0', width: '100%', background: 'background.neutral',
  borderLeftWidth: '1px', borderLeftStyle: 'solid', borderLeftColor: 'border.default',
})

const listColumn = css({ position: 'relative', flexShrink: '0', borderRightWidth: '1px', borderRightStyle: 'solid', borderRightColor: 'border.default', minHeight: '0' })
const resizeHandle = css({
  position: 'absolute', top: '0', right: '-2px', bottom: '0', width: '4px',
  cursor: 'col-resize', zIndex: '1', background: 'transparent',
  _hover: { background: 'background.brand.bold' },
})
const listHeader = css({ paddingInline: '4', paddingTop: '6', paddingBottom: '3', flexShrink: '0' })
// Fixed height so toggling between the "Notifications" title (32px line-height) and
// the smaller "N selected" text, or showing/hiding the 36px action buttons, never
// changes this row's height — otherwise the list below reflows on every (de)select.
const listHeaderRow = css({ paddingInline: '2', height: '36px' })
const listTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const selectedCountText = css({ fontSize: '14px', fontWeight: '400', lineHeight: '20px', color: 'text.default' })
const dropdownTrigger = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  border: 'none', background: 'transparent', cursor: 'pointer', padding: '0',
})

const listScroll = css({ flex: '1', minHeight: '0', overflowY: 'auto', paddingInline: '4', paddingBottom: '3' })
const groupLabel = css({
  display: 'flex', alignItems: 'center', height: '28px', paddingInline: '2',
  fontSize: '12px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary',
})

const notifRow = css({
  display: 'flex', alignItems: 'flex-start', gap: '2', width: '100%',
  paddingLeft: '2', paddingRight: '3', paddingBlock: '3', borderRadius: 'md',
  border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: '1',
})
const notifRowDefault = css({ background: 'transparent', _hover: { background: 'background.neutral.hovered' } })
const notifRowSelected = css({ background: 'background.brand.selected', _hover: { background: 'background.brand.selected' } })
const notifCheckbox = css({ flexShrink: '0', marginTop: '0.5' })
const notifCol = css({ flex: '1', minWidth: '0' })
const notifLabelRow = css({ width: '100%' })
const notifTitle = css({ flex: '1', minWidth: '0', fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
const notifTime = css({ flexShrink: '0', fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const notifSummary = css({
  fontSize: '14px', lineHeight: '20px', color: 'text.default', width: '100%',
  display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden',
})
const unreadDot = css({ flexShrink: '0', width: '6px', height: '6px', borderRadius: 'full', background: 'background.brand.bold' })
const emptyText = css({ paddingTop: '6', paddingInline: '2', color: 'text.secondary', fontSize: '14px' })
const blankSlate = css({ paddingBlock: '6', paddingInline: '2' })
const blankSlateIllustration = css({ flexShrink: '0' })
const blankSlateTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default', textAlign: 'center' })
const blankSlateCaption = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary', textAlign: 'center' })

const detailColumn = css({ minWidth: '0', minHeight: '0', overflowY: 'auto' })
const detailHeader = css({
  paddingInline: '6', paddingTop: '6', paddingBottom: '3', flexShrink: '0',
  borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default',
})
const brandMark = css({ flexShrink: '0', width: '24px', height: '24px' })
const senderName = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const senderTime = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const navBtn = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px',
  border: 'none', borderRadius: 'md', cursor: 'pointer', background: 'transparent', color: 'text.secondary',
  _hover: { background: 'background.neutral.hovered' },
  _disabled: { color: 'icon.disabled', cursor: 'not-allowed', _hover: { background: 'transparent' } },
})

const detailBody = css({ paddingInline: '6', paddingBlock: '5', gap: '5' })
const detailTitle = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const detailText = css({ fontSize: '14px', lineHeight: '24px', color: 'text.default' })

const detailRows = css({})
const detailRow = css({ paddingBlock: '2' })
const detailRowLabel = css({ width: '168px', flexShrink: '0', fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const detailRowValueWrap = css({ flex: '1', minWidth: '0' })
const detailRowValue = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const detailRowSub = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
</script>

<template>
  <MpFlex :class="pageRoot">
    <!-- List column -->
    <MpFlex direction="column" :class="listColumn" :style="{ width: listColumnWidth + 'px' }">
      <MpFlex direction="column" gap="3" :class="listHeader">
        <MpFlex align="center" justify="space-between" gap="2" :class="listHeaderRow">
          <MpFlex align="center" gap="2" minWidth="0">
            <MpFlex align="center" gap="0">
              <MpCheckbox
                :is-checked="isAllSelected"
                :is-indeterminate="isPartialSelected"
                aria-label="Select all notifications"
                @click="toggleHeaderCheckbox"
              />
              <MpPopover is-close-on-select use-portal placement="bottom-start">
                <MpPopoverTrigger>
                  <button type="button" :class="dropdownTrigger" aria-label="Bulk select options">
                    <MpIcon name="caret-down" size="sm" :class="css({ color: 'icon.default' })" />
                  </button>
                </MpPopoverTrigger>
                <MpPopoverContent :class="css({ minWidth: '160px' })">
                  <MpPopoverList>
                    <MpPopoverListItem @click="selectAll">Select all</MpPopoverListItem>
                    <MpPopoverListItem @click="selectByReadState(false)">Select read</MpPopoverListItem>
                    <MpPopoverListItem @click="selectByReadState(true)">Select unread</MpPopoverListItem>
                  </MpPopoverList>
                </MpPopoverContent>
              </MpPopover>
            </MpFlex>
            <MpText v-if="!isSelectionMode" :class="listTitle">Notifications</MpText>
            <span v-else :class="selectedCountText">{{ selectedCount }} notification{{ selectedCount > 1 ? 's' : '' }} selected</span>
          </MpFlex>
          <MpFlex v-if="isSelectionMode" gap="1" flexShrink="0">
            <MpTooltip :label="toggleReadLabel" use-portal>
              <button type="button" :class="navBtn" :aria-label="toggleReadLabel" @click="bulkToggleRead">
                <MpIcon name="done" size="sm" />
              </button>
            </MpTooltip>
            <MpTooltip label="Delete" use-portal>
              <button type="button" :class="navBtn" aria-label="Delete" @click="bulkDelete">
                <MpIcon name="delete" size="sm" />
              </button>
            </MpTooltip>
          </MpFlex>
        </MpFlex>
        <MpInputGroup>
          <MpInputLeftAddon><MpIcon name="search" /></MpInputLeftAddon>
          <MpInput v-model="searchQuery" placeholder="Search..." />
        </MpInputGroup>
      </MpFlex>

      <MpFlex direction="column" :class="listScroll">
        <template v-if="notifications.length">
          <template v-for="group in groupedNotifications" :key="group.label">
            <span :class="groupLabel">{{ group.label }}</span>
            <button
              v-for="n in group.items"
              :key="n.id"
              type="button"
              :class="[notifRow, n.id === selectedId ? notifRowSelected : notifRowDefault]"
              @click="selectNotification(n)"
            >
              <MpCheckbox
                :is-checked="!!bulkSelected[n.id]"
                :aria-label="`Select ${n.title}`"
                :class="notifCheckbox"
                @click.stop="toggleRowSelected(n.id, !bulkSelected[n.id])"
              />
              <MpFlex direction="column" gap="1" :class="notifCol">
                <MpFlex align="center" gap="2" :class="notifLabelRow">
                  <span :class="notifTitle">{{ n.title }}</span>
                  <span :class="notifTime">{{ n.timeLabel }}</span>
                  <span v-if="isUnread(n)" :class="unreadDot" />
                </MpFlex>
                <span :class="notifSummary">{{ n.summary }}</span>
              </MpFlex>
            </button>
          </template>
          <span v-if="!groupedNotifications.length" :class="emptyText">No notifications found.</span>
        </template>
        <MpFlex v-else direction="column" align="center" gap="4" :class="blankSlate">
          <img src="/illustrations/inbox-no-notifications.png" alt="" aria-hidden="true" width="192" height="160" :class="blankSlateIllustration">
          <MpFlex direction="column" gap="1">
            <span :class="blankSlateTitle">No notifications</span>
            <span :class="blankSlateCaption">We'll notify you about approvals, imports, exports and other activity.</span>
          </MpFlex>
        </MpFlex>
      </MpFlex>

      <div :class="resizeHandle" @mousedown="onResizeDown" />
    </MpFlex>

    <!-- Detail column -->
    <MpFlex direction="column" flex="1" :class="detailColumn">
      <template v-if="selected">
        <MpFlex align="flex-start" justify="space-between" :class="detailHeader">
          <MpFlex gap="3" align="flex-start">
            <svg :class="brandMark" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Mekari Talenta" role="img">
              <path d="M6.91254 30.8796L26.4945 24.4245C30.0455 23.3537 32.582 20.5808 32.582 16.9966C32.582 13.4492 30.0735 10.6988 26.6042 9.59531L6.91254 3.11152C5.00377 2.47397 2.9123 2.91944 1.90418 4.58074C0.896065 6.24001 1.52587 8.14857 3.07137 9.43797L12.1401 16.9966L3.07137 24.5552C1.52587 25.8365 0.896065 27.7532 1.90418 29.4125C2.9123 31.0717 4.99088 31.5356 6.91254 30.8817V30.8796Z" fill="#F22929" />
            </svg>
            <MpFlex direction="column" gap="0">
              <span :class="senderName">{{ selected.senderName }}</span>
              <span :class="senderTime">{{ selected.senderTimestamp }}</span>
            </MpFlex>
          </MpFlex>
          <MpFlex gap="2">
            <button type="button" :class="navBtn" :disabled="!hasPrev" aria-label="Previous notification" @click="goPrev">
              <MpIcon name="chevrons-up" size="sm" />
            </button>
            <button type="button" :class="navBtn" :disabled="!hasNext" aria-label="Next notification" @click="goNext">
              <MpIcon name="chevrons-down" size="sm" />
            </button>
          </MpFlex>
        </MpFlex>

        <MpFlex direction="column" :class="detailBody" :style="{ maxWidth: '744px' }">
          <span :class="detailTitle">{{ selected.title }}</span>
          <span :class="detailText">{{ selected.body }}</span>

          <MpFlex direction="column" :class="detailRows">
            <MpFlex v-for="row in selected.details" :key="row.label" gap="6" :class="detailRow">
              <span :class="detailRowLabel">{{ row.label }}</span>
              <MpFlex direction="column" gap="0" :class="detailRowValueWrap">
                <span :class="detailRowValue">{{ row.value }}</span>
                <span v-if="row.sub" :class="detailRowSub">{{ row.sub }}</span>
              </MpFlex>
            </MpFlex>
          </MpFlex>

          <MpFlex gap="4">
            <MpButton
              v-for="action in selected.actions"
              :key="action.label"
              :variant="action.variant"
            >
              {{ action.label }}
            </MpButton>
          </MpFlex>
        </MpFlex>
      </template>
      <MpFlex v-else direction="column" align="center" justify="center" gap="4" flex="1">
        <svg :class="blankSlateIllustration" width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g clip-path="url(#inbox-empty-detail-clip)">
            <path d="M47.2327 42.9924C47.5481 38.1597 47.7143 33.1437 47.7143 28C47.7143 26.6003 47.7022 25.2101 47.6779 23.8305C47.6325 21.2548 46.8058 18.7411 45.2277 16.7048C42.5173 13.2073 40.1043 10.7971 36.3693 7.95017C35.3274 7.15599 34.0556 6.72408 32.7459 6.69428C31.2465 6.66016 29.6793 6.64282 28.0001 6.64282C22.9382 6.64282 18.8948 6.8004 14.6558 7.10004C11.4901 7.32382 8.97429 9.84064 8.76749 13.0076C8.45193 17.8403 8.28577 22.8562 8.28577 28C8.28577 33.1437 8.45193 38.1597 8.76749 42.9924C8.97429 46.1595 11.4901 48.676 14.6558 48.8997C18.8948 49.1994 22.9382 49.3571 28.0001 49.3571C33.0619 49.3571 37.1053 49.1994 41.3443 48.8997C44.5101 48.676 47.026 46.1595 47.2327 42.9924Z" fill="white" />
            <path d="M47.5776 28.0002C47.5776 26.5932 47.5651 25.1957 47.5408 23.8089C47.4958 21.2468 46.6783 18.7458 45.1156 16.7148C42.4249 13.2171 40.0306 10.807 36.3273 7.96276C35.2828 7.16059 34.0047 6.72397 32.6881 6.69398L32.21 6.68372L31.7935 6.67578V18.6474C31.7935 20.4621 33.2636 21.8675 35.0779 21.9052C40.0214 22.008 47.5424 23.0628 47.5424 32.1062C47.5657 30.7474 47.5776 29.3784 47.5776 28.0002Z" fill="#F8F9FB" />
            <path d="M31.7935 6.96289V18.6464C31.7935 20.461 33.2636 21.8664 35.0779 21.9041C40.0214 22.0069 47.5654 23.2222 47.5654 32.2656" stroke="#8B95A5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M15.6154 7.02548C15.2635 7.04844 14.9109 7.0724 14.557 7.09735C11.3691 7.32212 8.83743 9.84078 8.63063 13.0078C8.60835 13.3493 8.5868 13.6916 8.566 14.0349M15.6154 48.9743C15.2635 48.9517 14.9109 48.9277 14.557 48.9027C11.3691 48.678 8.83743 46.1591 8.63063 42.992C8.61805 42.7992 8.60569 42.606 8.59357 42.4128M24.0369 6.67562C25.2561 6.65385 26.524 6.64282 27.8632 6.64282C29.3543 6.64282 30.757 6.65649 32.1024 6.68345C32.2637 6.68668 32.4242 6.6901 32.5839 6.69371C33.9097 6.7237 35.1968 7.16033 36.2486 7.96249C39.9777 10.8067 42.3888 13.2168 45.0985 16.7145C46.6717 18.7455 47.4951 21.2466 47.5405 23.8086C47.5651 25.1954 47.5776 26.5929 47.5776 28C47.5776 29.3782 47.5654 30.7472 47.5421 32.1059M24.0369 49.3243C25.2561 49.3459 26.524 49.3571 27.8632 49.3571C29.3543 49.3571 30.757 49.3433 32.1024 49.3164M40.4193 48.954C40.6687 48.9375 40.9188 48.9201 41.1695 48.9027C44.3573 48.678 46.8889 46.1591 47.0959 42.992C47.1084 42.7992 47.1209 42.606 47.1327 42.4128M8.1801 24.1497C8.1594 25.4245 8.14893 26.7082 8.14893 28C8.14893 29.3782 8.16085 30.7472 8.18439 32.1059" stroke="#8B95A5" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
          </g>
          <defs>
            <clipPath id="inbox-empty-detail-clip">
              <rect width="46" height="46" fill="white" transform="translate(5 5)" />
            </clipPath>
          </defs>
        </svg>
        <MpFlex direction="column" gap="1">
          <span :class="blankSlateTitle">Select a notification</span>
          <span :class="blankSlateCaption">Click any notification on the left to view its details.</span>
        </MpFlex>
      </MpFlex>
    </MpFlex>
  </MpFlex>
</template>

<!--
  "What's new (internal)" drawer — engineer-facing changelog, opened from the
  user menu (AppHeader). Two-level, drawer-swap navigation (no accordion, since
  a day's module work can be long): the drawer first lists entries newest-day
  first (one per module per day); click one to swap the same drawer to that day's
  changes for that module (each item = category · area · what changed · files),
  with a back arrow to the list. Open-state is shared via useWhatsNew(); mounted
  once in AppHeader.
-->
<script setup lang="ts">
import {
  MpDrawer, MpDrawerOverlay, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody,
  MpFlex, MpText, MpBadge, MpIcon, css,
} from '@mekari/pixel3'
import { useWhatsNew, type ChangeCategory } from '~/composables/useWhatsNew'

const { open, changelog, close } = useWhatsNew()

const categoryBadge: Record<ChangeCategory, 'completed' | 'warning' | 'announcement'> = {
  Feature: 'completed',
  Fix: 'warning',
  Chore: 'announcement',
}

// Which entry's details are showing (null = the list). Reset when the drawer closes.
const selectedIndex = ref<number | null>(null)
const selected = computed(() => (selectedIndex.value === null ? null : changelog[selectedIndex.value]))
watch(open, (isOpen) => { if (!isOpen) selectedIndex.value = null })
function openEntry(i: number) { selectedIndex.value = i }
function back() { selectedIndex.value = null }

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const headerBar = css({ background: 'background.neutral.subtle' })
const headerTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const backTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
const backBtn = css({
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0',
  width: '28px', height: '28px', borderRadius: 'md', border: 'none', background: 'transparent',
  color: 'icon.default', cursor: 'pointer', _hover: { background: 'background.neutral.subtle.hovered' },
})
const intro = css({ color: 'text.secondary', marginBottom: '2' })
// List rows.
const list = css({ display: 'flex', flexDirection: 'column' })
const listRow = css({
  display: 'flex', alignItems: 'center', gap: '3', width: '100%', textAlign: 'left',
  paddingBlock: '3', paddingInline: '2', background: 'transparent', border: 'none', cursor: 'pointer',
  borderBottom: '1px solid', borderBottomColor: 'border.default',
  _hover: { background: 'background.neutral.subtle' },
})
const listMain = css({ display: 'flex', flexDirection: 'column', gap: '1', flex: '1', minWidth: '0' })
const dateText = css({ display: 'inline-flex', alignItems: 'center', gap: '1', fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const moduleTitle = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const countText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const chevron = css({ flexShrink: '0', color: 'icon.secondary' })
// Detail view.
const detailWrap = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const item = css({ display: 'flex', flexDirection: 'column', gap: '1', paddingBottom: '4', borderBottom: '1px solid', borderBottomColor: 'border.default.subtle', _last: { borderBottom: 'none', paddingBottom: '0' } })
const itemHead = css({ display: 'flex', alignItems: 'center', gap: '2' })
const itemArea = css({ fontSize: '13px', fontWeight: '600', lineHeight: '18px', color: 'text.default' })
const itemDetail = css({ fontSize: '13px', lineHeight: '18px', color: 'text.default' })
const fileList = css({ display: 'flex', flexWrap: 'wrap', gap: '1', marginTop: '1' })
const fileChip = css({ fontFamily: 'mono', fontSize: '11px', lineHeight: '16px', color: 'text.secondary', background: 'background.neutral.subtle', borderRadius: 'sm', paddingInline: '1' })
</script>

<template>
  <ClientOnly>
    <MpDrawer :is-open="open" placement="right" size="lg" @close="close">
      <MpDrawerOverlay />
      <MpDrawerContent>
        <MpDrawerHeader :class="headerBar">
          <MpFlex justify="space-between" align="center" width="100%" gap="2">
            <MpFlex align="center" gap="2" :class="css({ minWidth: '0' })">
              <button v-if="selected" type="button" :class="backBtn" aria-label="Back" @click="back">
                <MpIcon name="arrows-left" size="sm" />
              </button>
              <span :class="selected ? backTitle : headerTitle">{{ selected ? `${selected.module} · ${selected.date}` : "What's new (internal)" }}</span>
            </MpFlex>
            <MpDrawerCloseButton @click="close" />
          </MpFlex>
        </MpDrawerHeader>

        <MpDrawerBody>
          <!-- ── List (one row per module per day) ── -->
          <template v-if="!selected">
            <MpText size="label-small" :class="intro">Engineer-facing changelog — newest first. Select an entry to see the day's changes.</MpText>
            <div :class="list">
              <button v-for="(e, i) in changelog" :key="`${e.date}-${e.module}-${i}`" type="button" :class="listRow" @click="openEntry(i)">
                <span :class="listMain">
                  <span :class="dateText">{{ e.date }}</span>
                  <span :class="moduleTitle">{{ e.module }}</span>
                  <span :class="countText">{{ e.items.length }} {{ e.items.length === 1 ? 'update' : 'updates' }}</span>
                </span>
                <MpIcon name="caret-right" size="sm" :class="chevron" />
              </button>
            </div>
          </template>

          <!-- ── Detail: the day's changes for the module ── -->
          <div v-else :class="detailWrap">
            <div v-for="(it, j) in selected.items" :key="j" :class="item">
              <div :class="itemHead">
                <MpBadge for="tableStatus" :type="categoryBadge[it.category]" size="sm">{{ it.category }}</MpBadge>
                <span :class="itemArea">{{ it.area }}</span>
              </div>
              <span :class="itemDetail">{{ it.detail }}</span>
              <span :class="fileList">
                <span v-for="f in it.files" :key="f" :class="fileChip">{{ f }}</span>
              </span>
            </div>
          </div>
        </MpDrawerBody>
      </MpDrawerContent>
    </MpDrawer>
  </ClientOnly>
</template>

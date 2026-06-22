<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PxVersionSwitcher — floating bottom-right control to switch between
  design versions of a page (prototype / design-exploration aid).
  A single round FAB; clicking opens a popover to pick a version.
  Not part of the production design — strip out before handoff.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpIcon,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  css,
} from '@mekari/pixel3'

interface VersionItem { label: string; to: string }

const props = defineProps<{
  versions: VersionItem[]
}>()

const route = useRoute()

const activeIndex = computed(() =>
  Math.max(0, props.versions.findIndex(v => route.path === v.to)),
)

function go(item: VersionItem, i: number) {
  if (i === activeIndex.value) return
  navigateTo(item.to)
}

const fab = css({
  position: 'fixed',
  right: '6',
  bottom: '6',
  zIndex: '50',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '48px',
  height: '48px',
  borderRadius: 'full',
  background: 'background.inverse',
  boxShadow: 'lg',
  cursor: 'pointer',
  transition: 'transform 0.15s',
  _hover: { transform: 'scale(1.05)' },
})
const menuHeader = css({
  paddingInline: '3', paddingTop: '2', paddingBottom: '1',
})
const rowFill = css({ width: '100%' })
const labelActive = css({ color: 'text.default', fontWeight: '600' })
const labelIdle = css({ color: 'text.default' })
</script>

<template>
  <ClientOnly>
    <MpPopover use-portal placement="top-end" is-close-on-select>
      <MpPopoverTrigger>
        <div :class="fab" aria-label="Switch version">
          <MpIcon name="text-editor-list" :class="css({ color: 'icon.inverse' })" />
        </div>
      </MpPopoverTrigger>
      <MpPopoverContent>
        <div :class="menuHeader">
          <MpText size="label-small" :class="css({ color: 'text.secondary' })">Preview version</MpText>
        </div>
        <MpPopoverList>
          <MpPopoverListItem
            v-for="(v, i) in versions"
            :key="v.to"
            :is-active="i === activeIndex"
            @click="go(v, i)"
          >
            <MpFlex align="center" justify="space-between" gap="3" :class="rowFill">
              <MpText size="label" :class="i === activeIndex ? labelActive : labelIdle">{{ v.label }}</MpText>
              <MpIcon v-if="i === activeIndex" name="done" :class="css({ color: 'icon.brand' })" />
            </MpFlex>
          </MpPopoverListItem>
        </MpPopoverList>
      </MpPopoverContent>
    </MpPopover>
  </ClientOnly>
</template>

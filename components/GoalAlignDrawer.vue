<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Align goal to a parent goal (drawer)
  Replicates talenta-review's align flow (ModalAlignParent + DropdownAlignGoal),
  rendered as a right drawer (size lg), matching the KR drawer format.

  RULE (production parity): a goal can only align to a parent goal it is a
  MEMBER of — production's parent goal defines "Goal member: employees who are
  able to align their goal to this goal". Here that member pool is the parent
  goal's viewerIds; only parents whose members include this goal's owner are
  offered. Candidates are also higher-level (never Individual), never the goal
  itself, and never a goal already aligned under it (avoids loops).
  Key-result-level alignment from production is out of scope for this mock.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerFooter, MpDrawerOverlay,
  MpButtonGroup, MpText, MpIcon, MpInput, MpButton, toast, css,
} from '@mekari/pixel3'
import type { Goal } from '~/composables/useGoalsStore'
import { employeeById } from '~/utils/employees'

const props = defineProps<{
  isOpen: boolean
  goal: Goal | null // the goal being aligned
  candidates: Goal[] // all goals in the cycle (parents are filtered from here)
}>()
const emit = defineEmits<{ close: [], aligned: [parentId: string, krId?: string] }>()

const LEVEL_GROUPS = [
  { key: 'company', label: 'Company goal' },
  { key: 'organization', label: 'Organization goal' },
  { key: 'team', label: 'Team goal' },
] as const

const search = ref('')
// The align target is either a whole goal (selectedKrId === '') or a specific
// key result of that goal (selectedKrId set).
const selectedId = ref('')
const selectedKrId = ref('')
function selectGoal(id: string) { selectedId.value = id; selectedKrId.value = '' }
function selectKr(goalId: string, krId: string) { selectedId.value = goalId; selectedKrId.value = krId }
// KR measurement line, e.g. "Measurement: 0% → 100%".
function krMeasureLine(kr: { measurementUnit?: string, startValue?: number | '', targetValue?: number | '' }) {
  const fmt = (v?: number | '') => {
    if (v === '' || v == null) return '—'
    if (kr.measurementUnit === 'amount') return `Rp${Number(v).toLocaleString('id-ID')}`
    if (kr.measurementUnit === 'percentage') return `${v}%`
    return Number(v).toLocaleString('id-ID')
  }
  return `Measurement: ${fmt(kr.startValue)} → ${fmt(kr.targetValue)}`
}

// Rules — which parent LEVELS each goal level may align to (member-gated).
// Prod's DropdownAlignGoal offers Team / Organization / Company parent groups
// (never Individual) and lets the backend decide eligibility by membership.
// The exact per-level mapping below is per product spec:
//  • Individual    → Team + Organization  (must be a member)
//  • Team          → Organization         (must be a member)
//  • Organization  → another Organization (must be a member) + Company
//  • Company       → nothing (it's the top)
// On top of the level rule:
//  • Member-only: the parent's member pool (viewerIds) must include this goal's
//    owner. Company goals have no member pool, so they are open to everyone.
//  • Never itself, and never a goal already aligned under it (avoids loops).
const ALLOWED_PARENT_LEVELS: Record<string, string[]> = {
  individual: ['team', 'organization'],
  team: ['organization'],
  organization: ['organization', 'company'],
  company: [],
}
const parents = computed(() => {
  const self = props.goal?.id
  const ownerId = props.goal?.ownerId
  const allowed = ALLOWED_PARENT_LEVELS[props.goal?.level ?? 'individual'] ?? []
  return props.candidates.filter((g) => {
    if (!allowed.includes(g.level)) return false // only the allowed parent level(s) for this goal
    if (g.id === self || g.alignedToId === self) return false // not itself; no direct loop
    if (g.level === 'company') return true // company goals have no member pool — open to all
    // Team / Organization parents are member-gated (viewerIds = who may align).
    return !!ownerId && (g.viewerIds ?? []).includes(ownerId)
  })
})
const groups = computed(() => {
  const q = search.value.trim().toLowerCase()
  return LEVEL_GROUPS.map((grp) => {
    const items = parents.value.filter(g => g.level === grp.key && (!q || g.title.toLowerCase().includes(q) || (g.code ?? '').toLowerCase().includes(q)))
    return { ...grp, items }
  }).filter(grp => grp.items.length)
})
const hasResults = computed(() => groups.value.some(g => g.items.length))
// "Goal owner - Employee ID | Job position | Organization"
function ownerLine(id: string) {
  const e = employeeById(id)
  return e ? `${e.name} - ${e.code} | ${e.title} | ${e.department}` : id
}

// Measurement — "Measurement: baseline → target". Non-measurable goals return
// '' (line hidden).
function fmtMeasure(g: Goal, v?: number): string {
  if (v == null) return '—'
  if (g.unit === 'currency') return `Rp${v.toLocaleString('id-ID')}`
  if (g.unit === 'percent') return `${v}%`
  return v.toLocaleString('id-ID')
}
function measurementLine(g: Goal): string {
  if (!g.unit) return ''
  if (g.unit === 'deadline') return `Measurement: ${g.deadlineDate ?? '—'}`
  return `Measurement: ${fmtMeasure(g, g.min ?? 0)} → ${fmtMeasure(g, g.max)}`
}

watch(() => props.isOpen, (open) => {
  if (!open) return
  selectedId.value = props.goal?.alignedToId ?? ''
  selectedKrId.value = props.goal?.alignedToKrId ?? ''
  search.value = ''
})

function submit() {
  if (!selectedId.value) {
    toast.notify({ id: 'align-goal-none', position: 'top-center', variant: 'error', title: 'Select a goal to align to' })
    return
  }
  emit('aligned', selectedId.value, selectedKrId.value || undefined)
  emit('close')
}

const intro = css({ color: 'text.secondary', marginBottom: '4', display: 'block' })
const label = css({ fontWeight: '600', color: 'text.default', marginBottom: '2', display: 'block' })
// 24px gap from the search form down to the first group (Company goal).
const searchBox = css({ position: 'relative', marginBottom: '6', '& input': { paddingLeft: '36px' } })
const searchIcon = css({ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'icon.secondary', zIndex: '1', pointerEvents: 'none' })
const list = css({ display: 'flex', flexDirection: 'column' })
// No gap below the header — the first list row's own top padding is the spacing.
const groupHeader = css({})
// 32px gap between one group (e.g. Company goal) and the next (Organization goal).
const groupGap = css({ marginTop: '8' })
// Heading 2 — black, not uppercase, no icon.
const groupLabel = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const optionRow = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '3', paddingBlock: '3', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default', cursor: 'pointer' })
const optionMain = css({ display: 'flex', flexDirection: 'column', gap: '0.5', minWidth: '0' })
// A key result sits indented under its goal, marked with a ↳ branch line and
// selectable on its own (no background fill).
const krOptionRow = css({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '3', paddingBlock: '3', paddingLeft: '4', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default', cursor: 'pointer' })
const noBottomBorder = css({ borderBottomWidth: '0' })
const krLeft = css({ display: 'flex', alignItems: 'flex-start', gap: '2', minWidth: '0' })
const krBranch = css({ flexShrink: '0', color: 'text.secondary', fontSize: '16px', lineHeight: '20px' })
const krLabelText = css({ fontSize: '12px', lineHeight: '16px', fontWeight: '600', color: 'text.secondary' })
const goalIdText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const goalNameText = css({ fontSize: '14px', lineHeight: '20px', fontWeight: '600', color: 'text.default' })
const optionSub = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
// Right-side selector: a 24px circle, empty until selected → becomes the green
// filled `done` icon (same 24px, so the icon IS the circle when selected).
const selectCircle = css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', flexShrink: '0', borderRadius: 'full', borderWidth: '1px', borderStyle: 'solid', borderColor: 'border.default', background: 'transparent', cursor: 'pointer', _hover: { borderColor: 'border.bold' } })
const selectCircleActive = css({ borderColor: 'transparent', background: 'transparent', _hover: { borderColor: 'transparent' } })
const emptyText = css({ paddingBlock: '6', textAlign: 'center', color: 'text.secondary' })
</script>

<template>
  <ClientOnly>
  <MpDrawer id="drawer-align-goal" :is-open="isOpen" placement="right" size="lg" is-keep-alive @close="emit('close')">
    <MpDrawerContent>
      <MpDrawerHeader>
        Align to parent goal
        <MpDrawerCloseButton />
      </MpDrawerHeader>
      <MpDrawerBody>
        <MpText v-if="goal" size="label" :class="intro">
          Choose the goal that <strong>{{ goal.title }}</strong> should align to. You can only align to goals you’re a member of.
        </MpText>
        <span :class="label">Align goal</span>
        <div :class="searchBox">
          <MpIcon name="search" size="sm" :class="searchIcon" />
          <MpInput v-model="search" placeholder="Start typing the name of a goal" />
        </div>
        <div :class="list">
          <template v-if="hasResults">
            <div v-for="(grp, gi) in groups" :key="grp.key" :class="gi > 0 ? groupGap : ''">
              <div :class="groupHeader">
                <span :class="groupLabel">{{ grp.label }}</span>
              </div>
              <template v-for="item in grp.items" :key="item.id">
                <!-- Align to the whole goal (no divider when its KRs follow) -->
                <div :class="[optionRow, (item.keyResults?.length ?? 0) > 0 && noBottomBorder]" @click="selectGoal(item.id)">
                  <div :class="optionMain">
                    <MpText :class="goalIdText">{{ item.code }}</MpText>
                    <MpText :class="goalNameText">{{ item.title }}</MpText>
                    <MpText :class="optionSub">{{ ownerLine(item.ownerId) }}</MpText>
                    <MpText :class="optionSub">{{ item.category }}. {{ item.subCategory }}</MpText>
                    <MpText v-if="measurementLine(item)" :class="optionSub">{{ measurementLine(item) }}</MpText>
                  </div>
                  <button
                    type="button"
                    :class="[selectCircle, selectedId === item.id && !selectedKrId && selectCircleActive]"
                    :aria-label="selectedId === item.id && !selectedKrId ? 'Selected' : 'Select this goal'"
                    @click.stop="selectGoal(item.id)"
                  >
                    <PxIcon v-if="selectedId === item.id && !selectedKrId" name="done" variant="fill" :size="24" color="green.500" />
                  </button>
                </div>
                <!-- …or align to one of its key results -->
                <div
                  v-for="kr in (item.keyResults ?? [])"
                  :key="kr.id"
                  :class="krOptionRow"
                  @click="selectKr(item.id, kr.id)"
                >
                  <div :class="krLeft">
                    <span :class="krBranch">↳</span>
                    <div :class="optionMain">
                      <MpText :class="krLabelText">Key result</MpText>
                      <MpText :class="goalNameText">{{ kr.title }}</MpText>
                      <MpText :class="optionSub">{{ krMeasureLine(kr) }}</MpText>
                    </div>
                  </div>
                  <button
                    type="button"
                    :class="[selectCircle, selectedId === item.id && selectedKrId === kr.id && selectCircleActive]"
                    :aria-label="selectedId === item.id && selectedKrId === kr.id ? 'Selected' : 'Select this key result'"
                    @click.stop="selectKr(item.id, kr.id)"
                  >
                    <PxIcon v-if="selectedId === item.id && selectedKrId === kr.id" name="done" variant="fill" :size="24" color="green.500" />
                  </button>
                </div>
              </template>
            </div>
          </template>
          <MpText v-else :class="emptyText">No goals available to align to.</MpText>
        </div>
      </MpDrawerBody>
      <MpDrawerFooter>
        <MpButtonGroup>
          <MpButton variant="ghost" @click="emit('close')">Cancel</MpButton>
          <MpButton variant="primary" @click="submit">Save</MpButton>
        </MpButtonGroup>
      </MpDrawerFooter>
    </MpDrawerContent>
    <MpDrawerOverlay />
  </MpDrawer>
  </ClientOnly>
</template>

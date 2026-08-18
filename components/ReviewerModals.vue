<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalCloseButton,
  MpFlex, MpText, MpAvatar, MpButton, MpIcon, MpInput, MpInputGroup, MpInputRightAddon, MpTooltip, MpSkeleton,
  MpToggle, MpTextlink,
  toast, css,
} from '@mekari/pixel3'
import { BRANCHES, ORGANIZATIONS, TALENTS } from '~/utils/talents'
import { memberSub, methodHasReviewerWeights, splitWeights, useReviewers } from '~/composables/useReviewers'
import type { ResolvedGroup, ReviewMember } from '~/composables/useReviewers'

const props = defineProps<{
  methodWeights: Record<string, number>
  // Subset of methods to display (default: all). e.g. [activeMethod] per tab.
  methods?: string[]
  cycleKey: string
}>()

const allMethods = computed(() => Object.keys(props.methodWeights))
const shownMethods = computed(() => props.methods ?? allMethods.value)
const { resolvedGroupsFor, reviewerCountFor, memberKey, configFor, saveConfigs } = useReviewers({
  methods: allMethods.value,
  methodWeights: props.methodWeights,
  cycleKey: () => props.cycleKey,
})
function visibleGroups(member: ReviewMember) {
  return resolvedGroupsFor(member).filter(g => shownMethods.value.includes(g.name))
}
function formatWeight(v: number) {
  return v % 1 === 0 ? String(v) : v.toFixed(2)
}

// ── View reviewer ───────────────────────────────────────────────────────────
const viewOpen = ref(false)
const viewMember = ref<ReviewMember | null>(null)
const viewGroups = computed(() => (viewMember.value ? visibleGroups(viewMember.value) : []))
function openView(member: ReviewMember) { viewMember.value = member; viewOpen.value = true }
// View result — opens the reviewer's submitted review. No result page exists yet,
// so surface a notice; wire to the route once the result view is built.
function onViewResult(r: { name: string }) {
  toast.notify({ id: 'reviewer-view-result', position: 'top-center', variant: 'info', title: `Opening ${r.name}'s review result` })
}

// ── Set reviewer weight (editable, persisted, lock + auto-adjust) ─────────────
type EditableReviewer = { name: string, code: string, sub: string, photo?: string, weight: number | '', locked: boolean }
type EditableGroup = { name: string, weight: number, useCustom: boolean, reviewers: EditableReviewer[] }
const weightOpen = ref(false)
const weightMember = ref<ReviewMember | null>(null)
const editableGroups = ref<EditableGroup[]>([])
function openWeight(member: ReviewMember) {
  weightMember.value = member
  // Only weight-bearing methods (Manager review) are editable here.
  editableGroups.value = visibleGroups(member)
    .filter(g => methodHasReviewerWeights(g.name))
    .map(g => ({ ...g, reviewers: g.reviewers.map(r => ({ ...r })) }))
  weightOpen.value = true
}
// Whether a member has any weight-bearing method in the shown scope — used by
// callers to decide if "Set reviewer weight" applies at all.
function hasWeightedMethod(member: ReviewMember) {
  return visibleGroups(member).some(g => methodHasReviewerWeights(g.name))
}
function onToggleCustom(g: EditableGroup, value: boolean) {
  g.useCustom = value
  const eq = splitWeights(g.reviewers.length)
  g.reviewers.forEach((r, i) => { r.weight = eq[i]; r.locked = value && i === 0 })
}
function lockedCount(g: EditableGroup) { return g.reviewers.filter(r => r.locked).length }
function canToggleLock(g: EditableGroup, i: number) {
  if (!g.useCustom) return false
  const r = g.reviewers[i]
  return !(r.locked && lockedCount(g) === 1)
}
function toggleLock(g: EditableGroup, i: number) {
  if (!canToggleLock(g, i)) {
    toast.notify({ id: 'reviewer-lock-min', position: 'top-center', variant: 'error', title: 'At least one reviewer must stay locked' })
    return
  }
  g.reviewers[i].locked = !g.reviewers[i].locked
}
let redistTimer: ReturnType<typeof setTimeout> | null = null
function onWeightInput(g: EditableGroup, i: number) {
  const num = g.reviewers[i].weight === '' ? 0 : Number(g.reviewers[i].weight)
  if (num > 100) g.reviewers[i].weight = 100
  else if (num < 0) g.reviewers[i].weight = 0
  if (redistTimer) clearTimeout(redistTimer)
  redistTimer = setTimeout(() => redistribute(g, i), 250)
}
function redistribute(g: EditableGroup, editedIndex: number) {
  const edited = Math.round(Number(g.reviewers[editedIndex].weight) || 0)
  g.reviewers[editedIndex].weight = edited
  let fixedTotal = edited
  g.reviewers.forEach((r, idx) => { if (idx !== editedIndex && r.locked) fixedTotal += Number(r.weight) || 0 })
  const targets = g.reviewers.filter((r, idx) => idx !== editedIndex && !r.locked)
  if (!targets.length) return
  const remaining = 100 - fixedTotal
  if (remaining < 0) { targets.forEach(r => (r.weight = 0)); return }
  const base = Math.floor(remaining / targets.length)
  let dist = 0
  targets.forEach((r, idx) => {
    if (idx < targets.length - 1) { r.weight = base; dist += base }
    else r.weight = remaining - dist
  })
}
function methodWeightTotal(g: EditableGroup) {
  return Math.round(g.reviewers.reduce((s, r) => s + (r.weight === '' ? 0 : Number(r.weight)), 0))
}
function saveWeights() {
  const invalid = editableGroups.value.find(g => g.useCustom && methodWeightTotal(g) !== 100)
  if (invalid) {
    toast.notify({ id: 'reviewer-weight-invalid', position: 'top-center', variant: 'error', title: `Total weight for ${invalid.name} must be 100%` })
    return
  }
  if (weightMember.value) {
    // saveConfigs replaces each method's whole config object, so we must re-emit
    // the roster here — otherwise a roster set via "Manage reviewer" is dropped
    // and the reviewer list collapses back to the generated set. The reviewers
    // currently shown ARE the resolved roster, so pin their codes.
    const configs: Record<string, { useCustom: boolean, weights: Record<string, number>, roster: string[] }> = {}
    editableGroups.value.forEach((g) => {
      configs[g.name] = {
        useCustom: g.useCustom,
        weights: Object.fromEntries(g.reviewers.map(r => [r.code, r.weight === '' ? 0 : Number(r.weight)])),
        roster: g.reviewers.map(r => r.code),
      }
    })
    saveConfigs(memberKey(weightMember.value), configs)
  }
  toast.notify({ id: 'reviewer-weight-saved', position: 'top-center', variant: 'success', title: 'Reviewer weights saved' })
  weightOpen.value = false
}

// ── Manage reviewer (add/remove per method) ───────────────────────────────────
type ManageReviewer = { name: string, code: string, sub: string, photo?: string }
type ManageGroup = { name: string, isSelf: boolean, reviewers: ManageReviewer[] }
const manageOpen = ref(false)
const manageMember = ref<ReviewMember | null>(null)
const manageGroups = ref<ManageGroup[]>([])
const openAddMethod = ref<string | null>(null)
const addSearch = ref('')
const addBranch = ref('')
const addOrg = ref('')
const ADD_PAGE = 10
const addVisible = ref(ADD_PAGE)
const addLoadingMore = ref(false)
const branchOptions = [{ value: '', label: 'All branches' }, ...BRANCHES.map(b => ({ value: b, label: b }))]
const orgOptions = [{ value: '', label: 'All organizations' }, ...ORGANIZATIONS.map(o => ({ value: o, label: o }))]
function loadMoreAdd() {
  if (addLoadingMore.value) return
  addLoadingMore.value = true
  setTimeout(() => { addVisible.value += ADD_PAGE; addLoadingMore.value = false }, 800)
}
watch([addSearch, addBranch, addOrg], () => { addVisible.value = ADD_PAGE })
function openManage(member: ReviewMember) {
  manageMember.value = member
  openAddMethod.value = null
  manageGroups.value = visibleGroups(member).map(g => ({ name: g.name, isSelf: g.name === 'Self review', reviewers: g.reviewers.map(r => ({ name: r.name, code: r.code, sub: r.sub, photo: r.photo })) }))
  manageOpen.value = true
}
function openAdd(g: ManageGroup) {
  openAddMethod.value = g.name
  addSearch.value = ''; addBranch.value = ''; addOrg.value = ''; addVisible.value = ADD_PAGE; addLoadingMore.value = false
}
function closeAdd() { openAddMethod.value = null }
function availableReviewers(g: ManageGroup) {
  const used = new Set(g.reviewers.map(r => r.code))
  const q = addSearch.value.trim().toLowerCase()
  return TALENTS.filter(t => t.status === 'active' && !used.has(t.code)
    && (!q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q))
    && (!addBranch.value || t.branch === addBranch.value)
    && (!addOrg.value || t.organization === addOrg.value))
}
function shownReviewers(g: ManageGroup) { return availableReviewers(g).slice(0, addVisible.value) }
function addManageReviewer(g: ManageGroup, t: typeof TALENTS[number]) {
  g.reviewers.push({ name: t.name, code: t.code, sub: [t.code, t.jobPosition, t.organization].filter(Boolean).join(' · '), photo: t.photo })
}
function removeManageReviewer(g: ManageGroup, i: number) { g.reviewers.splice(i, 1) }
function saveManage() {
  if (!manageMember.value) return
  const configs: Record<string, { useCustom: boolean, weights: Record<string, number>, roster: string[] }> = {}
  manageGroups.value.forEach((g) => {
    if (g.isSelf) return
    configs[g.name] = { useCustom: false, weights: {}, roster: g.reviewers.map(r => r.code) }
  })
  saveConfigs(memberKey(manageMember.value), configs)
  toast.notify({ id: 'reviewer-roster-saved', position: 'top-center', variant: 'success', title: 'Reviewers updated' })
  manageOpen.value = false
}

// Sticky method-header stuck detection (border only when pinned).
function onReviewerScroll(e: Event) {
  const c = e.target as HTMLElement
  if (!c?.getBoundingClientRect) return
  const cs = getComputedStyle(c)
  const pinY = c.getBoundingClientRect().top + parseFloat(cs.paddingTop || '0') + parseFloat(cs.borderTopWidth || '0')
  document.querySelectorAll<HTMLElement>('[data-method-header]').forEach((h) => {
    h.dataset.stuck = c.scrollTop > 0 && h.getBoundingClientRect().top - pinY <= 0.5 ? 'true' : 'false'
  })
}

defineExpose({ openView, openWeight, openManage, reviewerCountFor, resolvedGroupsFor, hasWeightedMethod })

// ── Styles ────────────────────────────────────────────────────────────────────
const valueText = css({ color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const memberHeader = css({ paddingTop: '5', paddingBottom: '4', marginBottom: '4', borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'border.default' })
const scrollBody = css({ padding: '0', overflow: 'hidden' })
const scrollWrap = css({ maxHeight: '65vh', overflowY: 'auto', paddingInline: '6' })
const contentCol = css({ display: 'flex', flexDirection: 'column' })
const methodHeaderClass = css({
  position: 'sticky', top: '0', zIndex: '1', display: 'block', backgroundColor: 'background.neutral',
  fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default',
  paddingTop: '2', paddingBottom: '3',
  borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'transparent', transition: 'border-color 0.1s ease',
  '&[data-stuck="true"]': { borderBottomColor: 'border.default' },
})
const iconBtn = css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', border: 'none', background: 'transparent', borderRadius: 'md', cursor: 'pointer', color: 'text.secondary', _hover: { background: 'background.neutral.hovered', color: 'text.default' } })
const iconBtnDisabled = css({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', border: 'none', background: 'transparent', borderRadius: 'md', cursor: 'not-allowed', color: 'gray.100' })
const pickerRow = css({ paddingInline: '3', paddingBlock: '2', _hover: { background: 'background.neutral.subtle' } })
const addPanel = css({ border: '1px solid', borderColor: 'border.default', borderRadius: 'md', padding: '3', marginBottom: '4' })
const groupsCol = css({ display: 'flex', flexDirection: 'column', gap: '10', paddingBottom: '6' })
const rowFlex = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' })
</script>

<template>
  <!-- View reviewer -->
  <MpModal :is-open="viewOpen" size="lg" @close="viewOpen = false">
    <MpModalOverlay />
    <MpModalContent :class="contentCol">
      <MpModalHeader>Reviewers<MpModalCloseButton /></MpModalHeader>
      <MpModalBody :class="scrollBody">
        <div :class="scrollWrap" @scroll.capture="onReviewerScroll">
          <MpFlex v-if="viewMember" align="center" gap="3" :class="memberHeader">
            <PxAvatar :name="viewMember.name" size="lg" variant-color="gray" />
            <MpFlex direction="column" gap="0">
              <MpText size="label" weight="semiBold" :class="valueText">{{ viewMember.name }}</MpText>
              <MpText size="label-small" :class="captionText">{{ memberSub(viewMember) }}</MpText>
            </MpFlex>
          </MpFlex>
          <MpFlex direction="column" :class="groupsCol">
            <div v-for="g in viewGroups" :key="g.name">
              <div data-method-header :class="methodHeaderClass">{{ g.name }} ({{ formatWeight(g.weight) }}%)</div>
              <MpFlex direction="column" gap="3">
                <MpFlex v-for="(r, i) in g.reviewers" :key="`${g.name}-${i}`" align="center" justify="space-between" gap="4">
                  <MpFlex align="center" gap="3" :class="css({ minWidth: '0' })">
                    <PxAvatar :name="r.name" :src="r.photo" size="lg" variant-color="gray" />
                    <MpFlex direction="column" gap="0" :class="css({ minWidth: '0' })">
                      <MpText size="label" weight="semiBold" :class="valueText">{{ r.name }}</MpText>
                      <MpText size="label-small" :class="captionText">{{ r.sub }}</MpText>
                    </MpFlex>
                  </MpFlex>
                  <MpFlex align="center" gap="4" :class="css({ flexShrink: '0' })">
                    <MpText v-if="methodHasReviewerWeights(g.name)" size="label" :class="[valueText, css({ fontVariantNumeric: 'tabular-nums' })]">{{ formatWeight(Number(r.weight)) }}%</MpText>
                    <MpTooltip v-if="!r.submitted" label="No result yet — reviewer hasn't submitted" use-portal>
                      <span><MpButton variant="secondary" :is-disabled="true">View result</MpButton></span>
                    </MpTooltip>
                    <MpButton v-else variant="secondary" @click="onViewResult(r)">View result</MpButton>
                  </MpFlex>
                </MpFlex>
                <MpText v-if="!g.reviewers.length" size="label-small" :class="captionText">No reviewers assigned.</MpText>
              </MpFlex>
            </div>
          </MpFlex>
        </div>
      </MpModalBody>
    </MpModalContent>
  </MpModal>

  <!-- Set reviewer weight -->
  <MpModal :is-open="weightOpen" size="lg" @close="weightOpen = false">
    <MpModalOverlay />
    <MpModalContent :class="contentCol">
      <MpModalHeader :class="css({ flexShrink: '0' })">Set reviewer weight<MpModalCloseButton /></MpModalHeader>
      <MpModalBody :class="scrollBody">
        <div :class="scrollWrap" @scroll.capture="onReviewerScroll">
          <MpFlex v-if="weightMember" align="center" gap="3" :class="memberHeader">
            <PxAvatar :name="weightMember.name" size="lg" variant-color="gray" />
            <MpFlex direction="column" gap="0">
              <MpText size="label" weight="semiBold" :class="valueText">{{ weightMember.name }}</MpText>
              <MpText size="label-small" :class="captionText">{{ memberSub(weightMember) }}</MpText>
            </MpFlex>
          </MpFlex>
          <MpFlex direction="column" :class="groupsCol">
            <div v-for="g in editableGroups" :key="g.name">
              <div data-method-header :class="methodHeaderClass">
                <MpFlex align="center" justify="space-between" gap="4">
                  <span>{{ g.name }} ({{ formatWeight(g.weight) }}%)</span>
                  <MpFlex align="center" gap="2" :class="css({ flexShrink: '0' })">
                    <MpText size="label" weight="semiBold" :class="valueText">Weight</MpText>
                    <MpToggle :is-checked="g.useCustom" @update:is-checked="(v) => onToggleCustom(g, v)" />
                    <MpText size="label" :class="[captionText, css({ fontWeight: '400' })]">Use custom weight</MpText>
                  </MpFlex>
                </MpFlex>
              </div>
              <MpFlex direction="column" gap="3">
                <MpFlex v-for="(r, i) in g.reviewers" :key="`${g.name}-${i}`" align="center" justify="space-between" gap="4">
                  <MpFlex align="center" gap="3" :class="css({ minWidth: '0' })">
                    <PxAvatar :name="r.name" :src="r.photo" size="lg" variant-color="gray" />
                    <MpFlex direction="column" gap="0" :class="css({ minWidth: '0' })">
                      <MpText size="label" weight="semiBold" :class="valueText">{{ r.name }}</MpText>
                      <MpText size="label-small" :class="captionText">{{ r.sub }}</MpText>
                    </MpFlex>
                  </MpFlex>
                  <MpFlex align="center" gap="2" :class="css({ flexShrink: '0' })">
                    <MpInputGroup :class="css({ width: '104px' })">
                      <MpInput v-model="r.weight" type="number" :is-disabled="!g.useCustom || r.locked" @update:model-value="() => onWeightInput(g, i)" />
                      <MpInputRightAddon>%</MpInputRightAddon>
                    </MpInputGroup>
                    <button v-if="g.useCustom" type="button" :class="canToggleLock(g, i) ? iconBtn : iconBtnDisabled" :aria-label="r.locked ? 'Unlock weight' : 'Lock weight'" @click="toggleLock(g, i)">
                      <MpIcon :name="r.locked ? 'security' : 'unlock'" size="sm" />
                    </button>
                  </MpFlex>
                </MpFlex>
                <MpText v-if="!g.reviewers.length" size="label-small" :class="captionText">No reviewers assigned.</MpText>
                <MpFlex v-else justify="space-between" align="center" :class="css({ paddingTop: '2' })">
                  <MpText size="label" :class="captionText">Total weight</MpText>
                  <MpText size="label" weight="semiBold" :class="css({ color: methodWeightTotal(g) === 100 ? 'text.success' : 'text.danger' })">{{ methodWeightTotal(g) }}%</MpText>
                </MpFlex>
              </MpFlex>
            </div>
          </MpFlex>
        </div>
      </MpModalBody>
      <MpModalFooter :class="css({ display: 'flex', gap: '3', justifyContent: 'flex-end', flexShrink: '0' })">
        <MpButton variant="ghost" @click="weightOpen = false">Cancel</MpButton>
        <MpButton variant="primary" @click="saveWeights">Save changes</MpButton>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>

  <!-- Manage reviewer -->
  <MpModal :is-open="manageOpen" size="lg" @close="manageOpen = false">
    <MpModalOverlay />
    <MpModalContent :class="contentCol">
      <MpModalHeader :class="css({ flexShrink: '0' })">Manage reviewer<MpModalCloseButton /></MpModalHeader>
      <MpModalBody :class="scrollBody">
        <div :class="scrollWrap">
          <MpFlex v-if="manageMember" align="center" gap="3" :class="memberHeader">
            <PxAvatar :name="manageMember.name" size="lg" variant-color="gray" />
            <MpFlex direction="column" gap="0">
              <MpText size="label" weight="semiBold" :class="valueText">{{ manageMember.name }}</MpText>
              <MpText size="label-small" :class="captionText">{{ memberSub(manageMember) }}</MpText>
            </MpFlex>
          </MpFlex>
          <MpFlex direction="column" :class="groupsCol">
            <div v-for="g in manageGroups" :key="g.name">
              <MpFlex align="center" justify="space-between" gap="4" :class="css({ marginBottom: '3' })">
                <MpText :class="css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })">{{ g.name }}</MpText>
                <MpButton v-if="!g.isSelf" variant="secondary" left-icon="add" @click="openAdd(g)">Add reviewer</MpButton>
              </MpFlex>
              <div v-if="!g.isSelf && openAddMethod === g.name" :class="addPanel">
                <MpFlex gap="2" align="center" :class="css({ marginBottom: '3' })">
                  <PxSelectPopover v-model="addBranch" :options="branchOptions" placeholder="All branches" :class="css({ width: '176px', flexShrink: '0' })" />
                  <PxSelectPopover v-model="addOrg" :options="orgOptions" placeholder="All organizations" :class="css({ width: '196px', flexShrink: '0' })" />
                  <MpInput v-model="addSearch" placeholder="Search employee" :class="css({ flex: '1', minWidth: '0' })" />
                  <MpTooltip label="Close" use-portal>
                    <button type="button" :class="iconBtn" aria-label="Close reviewer picker" @click="closeAdd"><MpIcon name="close" size="sm" /></button>
                  </MpTooltip>
                </MpFlex>
                <div :class="css({ maxHeight: '300px', overflowY: 'auto', position: 'relative' })">
                  <MpFlex v-for="emp in shownReviewers(g)" :key="emp.code" align="center" justify="space-between" gap="3" :class="pickerRow">
                    <MpFlex align="center" gap="3" :class="css({ minWidth: '0' })">
                      <PxAvatar :name="emp.name" :src="emp.photo" size="lg" variant-color="gray" />
                      <MpFlex direction="column" gap="0" align="start" :class="css({ minWidth: '0' })">
                        <MpText size="label" :class="valueText">{{ emp.name }}</MpText>
                        <MpText size="label-small" :class="captionText">{{ emp.code }} · {{ emp.jobPosition }} · {{ emp.organization }}</MpText>
                      </MpFlex>
                    </MpFlex>
                    <MpTooltip label="Add reviewer" use-portal>
                      <button type="button" :class="iconBtn" aria-label="Add reviewer" @click="addManageReviewer(g, emp)"><MpIcon name="add" size="sm" /></button>
                    </MpTooltip>
                  </MpFlex>
                  <template v-if="addLoadingMore">
                    <MpFlex v-for="s in 3" :key="`add-skel-${s}`" align="center" gap="3" :class="pickerRow">
                      <MpSkeleton :class="css({ width: '36px', height: '36px', borderRadius: 'full', flexShrink: '0' })" />
                      <MpFlex direction="column" gap="1">
                        <MpSkeleton :class="css({ width: '120px', height: '14px', borderRadius: '4px' })" />
                        <MpSkeleton :class="css({ width: '160px', height: '12px', borderRadius: '4px' })" />
                      </MpFlex>
                    </MpFlex>
                  </template>
                  <MpText v-if="!availableReviewers(g).length" size="label-small" :class="[captionText, css({ display: 'block', padding: '3' })]">No employees match.</MpText>
                  <MpFlex v-else align="center" gap="1" :class="css({ position: 'sticky', bottom: '0', background: 'background.neutral', paddingInline: '3', paddingBlock: '2', borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'border.default' })">
                    <MpText size="label-small" :class="captionText">Showing {{ Math.min(addVisible, availableReviewers(g).length) }} of {{ availableReviewers(g).length }} employees.</MpText>
                    <MpTextlink v-if="availableReviewers(g).length > addVisible && !addLoadingMore" as="button" size="label-small" @click="loadMoreAdd">Load {{ Math.min(ADD_PAGE, availableReviewers(g).length - addVisible) }} more.</MpTextlink>
                  </MpFlex>
                </div>
              </div>
              <MpFlex direction="column" gap="3">
                <MpFlex v-for="(r, i) in g.reviewers" :key="r.code" align="center" justify="space-between" gap="4">
                  <MpFlex align="center" gap="3" :class="css({ minWidth: '0' })">
                    <PxAvatar :name="r.name" :src="r.photo" size="lg" variant-color="gray" />
                    <MpFlex direction="column" gap="0" :class="css({ minWidth: '0' })">
                      <MpText size="label" weight="semiBold" :class="valueText">{{ r.name }}</MpText>
                      <MpText size="label-small" :class="captionText">{{ r.sub }}</MpText>
                    </MpFlex>
                  </MpFlex>
                  <MpTooltip v-if="!g.isSelf" label="Remove reviewer" use-portal>
                    <button type="button" :class="iconBtn" aria-label="Remove reviewer" @click="removeManageReviewer(g, i)"><MpIcon name="minus-circular" size="sm" /></button>
                  </MpTooltip>
                </MpFlex>
                <MpText v-if="!g.reviewers.length" size="label-small" :class="captionText">No reviewers yet — add at least one.</MpText>
              </MpFlex>
            </div>
          </MpFlex>
        </div>
      </MpModalBody>
      <MpModalFooter :class="css({ display: 'flex', gap: '3', justifyContent: 'flex-end', flexShrink: '0' })">
        <MpButton variant="ghost" @click="manageOpen = false">Cancel</MpButton>
        <MpButton variant="primary" @click="saveManage">Save changes</MpButton>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
</template>

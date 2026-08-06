<script setup lang="ts">
/*
  Goal activity log — right drawer showing a goal's history timeline.
  Mirrors production's "activity journey" modal (ModalHistory / HistoryList /
  HistoryItem): a goal-summary header + a vertical timeline of entries
  (goal-created, approval, progress updates). Rebuilt as a drawer with a real
  empty state (prod had none). Data comes from useGoalActivityStore (mock).
*/
import {
  MpDrawer, MpDrawerOverlay, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody,
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalCloseButton,
  MpFlex, MpText, MpAvatar, MpIcon, MpButton, MpButtonGroup, toast, css,
} from '@mekari/pixel3'
import type { Goal, GoalStatus } from '~/composables/useGoalsStore'
import { employeeById } from '~/utils/employees'
import { useGoalActivityStore, type GoalActivityEntry } from '~/composables/useGoalActivityStore'

const props = defineProps<{ isOpen: boolean, goal: Goal | null }>()
const emit = defineEmits<{ close: [] }>()

const { activityFor } = useGoalActivityStore()
const owner = computed(() => (props.goal ? employeeById(props.goal.ownerId) : undefined))
const descriptionText = computed(() => (props.goal?.description ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
// A mutable copy so the per-file Reupload/Delete actions (prod parity) can act
// locally; reseeded each time the drawer opens.
const entries = ref<GoalActivityEntry[]>([])
watch(() => props.isOpen, (open) => {
  if (open && props.goal) {
    entries.value = activityFor(props.goal).map(e => ({ ...e, files: e.files ? e.files.map(f => ({ ...f })) : undefined }))
  }
}, { immediate: true })
function reuploadFile(e: GoalActivityEntry, fi: number) {
  toast.notify({ id: 'kr-file-reupload', position: 'top-center', variant: 'success', title: `“${e.files?.[fi]?.name}” re-uploaded` })
}
// Delete always asks for confirmation first.
const fileToDelete = ref<{ entry: GoalActivityEntry, index: number } | null>(null)
const isFileDeleteOpen = ref(false)
function askDeleteFile(e: GoalActivityEntry, fi: number) {
  fileToDelete.value = { entry: e, index: fi }
  isFileDeleteOpen.value = true
}
function confirmDeleteFile() {
  const t = fileToDelete.value
  if (t?.entry.files) t.entry.files = t.entry.files.filter((_, i) => i !== t.index)
  isFileDeleteOpen.value = false
  fileToDelete.value = null
}

const STATUS_LABEL: Record<GoalStatus, string> = { green: 'On track', orange: 'Off track', gray: 'Not updated' }

// ─── Styles ───────────────────────────────────────────────────────────────
const headerBlock = css({ display: 'flex', flexDirection: 'column', gap: '2', marginTop: '-6', marginInline: '-6', paddingInline: '6', paddingTop: '6', paddingBottom: '6', background: 'gray.25', borderBottom: '1px solid', borderBottomColor: 'border.default' })
const goalCode = css({ fontSize: '12px', lineHeight: '16px', color: 'text.default' })
const goalName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const weightText = css({ color: 'text.link', fontWeight: '600' })
const descText = css({ fontSize: '12px', lineHeight: '18px', color: 'text.secondary' })
const ownerRow = css({ display: 'flex', alignItems: 'center', gap: '2', marginTop: '1' })
const ownerName = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const ownerMeta = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })

const timeline = css({ display: 'flex', flexDirection: 'column', marginTop: '5' })
const item = css({ display: 'flex', gap: '3', alignItems: 'stretch' })
const dotCol = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flexShrink: '0' })
const dot = css({ width: '12px', height: '12px', borderRadius: 'full', flexShrink: '0', marginTop: '3px', background: 'background.surface', border: '2px solid', borderColor: 'border.bold' })
const dotBrand = css({ borderColor: 'background.brand.bold' })
const line = css({ width: '1px', flexGrow: '1', background: 'border.default', marginTop: '1' })
const content = css({ flex: '1', minWidth: '0', paddingBottom: '5' })
const timeText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const bodyText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default', whiteSpace: 'pre-wrap' })
const wordingText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary', whiteSpace: 'pre-wrap', marginTop: '0.5' })
const metaLine = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', marginTop: '1' })
const fileRow = css({ display: 'flex', alignItems: 'center', gap: '2', padding: '2', borderRadius: '6px', border: '1px solid', borderColor: 'border.default', marginTop: '2' })

const pillBase = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'sm', paddingInline: '1.5', paddingBlock: '0.5', fontSize: '12px', lineHeight: '16px', fontWeight: '600', marginLeft: '2' } as const
const pillGreen = css({ ...pillBase, background: 'green.50', color: 'green.700' })
const pillRose = css({ ...pillBase, background: 'red.50', color: 'red.700' })
const pillGray = css({ ...pillBase, background: 'gray.100', color: 'gray.600' })
function statusPill(s?: GoalStatus) { return s === 'orange' ? pillRose : s === 'gray' ? pillGray : pillGreen }

const emptyWrap = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1', paddingBlock: '16', textAlign: 'center' })
const emptyTitle = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const emptyCaption = css({ fontSize: '14px', color: 'text.secondary' })
</script>

<template>
  <ClientOnly>
    <MpDrawer :is-open="isOpen" size="lg" placement="right" @close="emit('close')">
      <MpDrawerOverlay />
      <MpDrawerContent>
        <MpDrawerHeader>
          Activity log
          <MpDrawerCloseButton @click="emit('close')" />
        </MpDrawerHeader>
        <MpDrawerBody>
          <!-- Goal summary header -->
          <div v-if="goal" :class="headerBlock">
            <span :class="goalCode">{{ goal.code }}</span>
            <MpText :class="goalName">{{ goal.title }}<span v-if="goal.weight" :class="weightText"> ({{ goal.weight }}%)</span></MpText>
            <div v-if="descriptionText" :class="descText">{{ descriptionText }}</div>
            <div v-if="owner" :class="ownerRow">
              <MpAvatar :id="`log-owner-${owner.id}`" :name="owner.name" :src="owner.photo" size="md" variant-color="gray" />
              <MpFlex direction="column" gap="0" :class="css({ minWidth: '0' })">
                <span :class="ownerName">{{ owner.name }}</span>
                <span :class="ownerMeta">{{ owner.code }} | {{ owner.title }} | {{ owner.department }}</span>
              </MpFlex>
            </div>
          </div>

          <!-- Timeline -->
          <div v-if="entries.length" :class="timeline">
            <div v-for="(e, i) in entries" :key="e.id" :class="item">
              <div :class="dotCol">
                <span :class="[dot, i === 0 && dotBrand]" />
                <span v-if="i < entries.length - 1" :class="line" />
              </div>
              <div :class="content">
                <div :class="timeText">{{ e.dateLabel }}</div>

                <template v-if="e.type === 'created'">
                  <div :class="bodyText">Goal created by <strong>{{ e.actorName }}</strong></div>
                </template>

                <template v-else-if="e.type === 'comment'">
                  <div :class="bodyText"><strong>{{ e.actorName }}</strong> commented</div>
                  <div v-if="e.wording" :class="wordingText">{{ e.wording }}</div>
                </template>

                <template v-else-if="e.type === 'event'">
                  <div :class="bodyText"><strong>{{ e.actorName }}</strong> {{ e.wording }}</div>
                </template>

                <template v-else-if="e.type === 'approval'">
                  <div :class="bodyText"><strong>{{ e.approvalStatus }}</strong> by {{ e.approver }}</div>
                </template>

                <template v-else>
                  <div :class="bodyText">
                    <strong>{{ e.actorName }}</strong> updated the progress
                    <span v-if="e.status" :class="statusPill(e.status)">{{ STATUS_LABEL[e.status] }}</span>
                  </div>
                  <div v-if="e.wording" :class="wordingText">{{ e.wording }}</div>
                  <div v-if="e.effectiveLabel" :class="metaLine">Effective date: {{ e.effectiveLabel }}</div>
                  <div v-for="(f, fi) in (e.files ?? [])" :key="fi" :class="fileRow">
                    <MpIcon name="doc" size="sm" :class="css({ color: 'icon.default', flexShrink: '0' })" />
                    <MpFlex direction="column" gap="0" :class="css({ minWidth: '0', flex: '1' })">
                      <MpText size="label" :class="css({ color: 'text.default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })">{{ f.name }}</MpText>
                      <MpText size="label-small" :class="css({ color: 'text.secondary' })">{{ f.sizeLabel }}</MpText>
                    </MpFlex>
                    <MpFlex align="center" gap="1" :class="css({ flexShrink: '0', marginLeft: '2' })">
                      <MpButton variant="ghost" size="sm" @click="reuploadFile(e, fi)">Reupload</MpButton>
                      <MpButton variant="ghost" size="sm" :class="css({ color: 'text.danger' })" @click="askDeleteFile(e, fi)">Delete</MpButton>
                    </MpFlex>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <!-- Empty state (prod had none) -->
          <div v-else :class="emptyWrap">
            <MpIcon name="time" size="lg" :class="css({ color: 'icon.secondary' })" />
            <span :class="emptyTitle">No activity yet</span>
            <span :class="emptyCaption">Updates to this goal will appear here.</span>
          </div>
        </MpDrawerBody>
      </MpDrawerContent>
    </MpDrawer>

    <!-- Delete attachment confirmation -->
    <MpModal :is-open="isFileDeleteOpen" size="sm" @close="isFileDeleteOpen = false">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Delete this attachment?
          <MpModalCloseButton @click="isFileDeleteOpen = false" />
        </MpModalHeader>
        <MpModalBody>
          <MpText size="label" :class="css({ color: 'text.default' })"><strong>{{ fileToDelete?.entry.files?.[fileToDelete.index]?.name }}</strong> will be removed from this activity entry. This can't be undone.</MpText>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="isFileDeleteOpen = false">Cancel</MpButton>
            <MpButton variant="danger" @click="confirmDeleteFile">Delete</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<!--
  IdpActionPlanViewModal — read one action plan and move its status.
  Replicated from production (talenta-performance:
    individual-development/components/ModalViewActionPlan.vue): description +
  attachments + activity trail on the left, status / assignee / dates on the right.
  Status is the only editable thing here — everything else edits via the form modal.
-->
<script setup lang="ts">
import {
  MpModal, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalOverlay,
  MpFlex, MpText, MpButton, MpIcon, MpBadge, MpTextlink, MpTooltip,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, css,
} from '@mekari/pixel3'
import { TALENTS } from '~/utils/talents'
import { ACTION_PLAN_STATUSES, STATUS_BY_ID, type ActionPlan, type ActionPlanStatus } from '~/utils/idp'
import { COMPETENCY_DESCRIPTIONS } from '~/utils/competency'

const props = defineProps<{ isOpen: boolean, actionPlan: ActionPlan | null }>()
const emit = defineEmits<{ 'update:isOpen': [value: boolean], 'statusChange': [status: ActionPlanStatus] }>()

function close() { emit('update:isOpen', false) }

const talentById = (id: string) => TALENTS.find(t => t.id === id)

// ─── Assignee stack (docs/patterns/avatar.md) ────────────────────────────────
// Cap at 5 avatars + a "+N" counter that opens a view-all modal — never an
// unbounded v-for'd stack (MpAvatarGroup's `max` doesn't cap slot children in
// this build, so this is hand-rolled, same as AddGoalDrawer.vue's owner stack).
const ASSIGNEE_AVATAR_CAP = 5
const visibleAssignees = computed(() => props.actionPlan?.assignees.slice(0, ASSIGNEE_AVATAR_CAP) ?? [])
const hiddenAssignees = computed(() => props.actionPlan?.assignees.slice(ASSIGNEE_AVATAR_CAP) ?? [])
const hiddenAssigneeCount = computed(() => hiddenAssignees.value.length)

// Attachments reveal 5 at a time, then collapse back — production's own
// Show more / Show less toggle on this list.
const ATTACHMENT_PAGE = 5
const visibleAttachments = ref(ATTACHMENT_PAGE)
watch(() => props.actionPlan?.id, () => { visibleAttachments.value = ATTACHMENT_PAGE })
const shownAttachments = computed(() => props.actionPlan?.attachments.slice(0, visibleAttachments.value) ?? [])
const canShowMore = computed(() => visibleAttachments.value < (props.actionPlan?.attachments.length ?? 0))
function toggleAttachments() {
  visibleAttachments.value = canShowMore.value ? visibleAttachments.value + ATTACHMENT_PAGE : ATTACHMENT_PAGE
}

const EXCEL_EXT = ['xls', 'xlsx', 'csv']
function fileIcon(file: string): string {
  const ext = file.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf-document'
  if (EXCEL_EXT.includes(ext)) return 'excel-document'
  return 'document'
}

// Date only — `DD Mon YYYY` (docs/patterns/date-format.md).
function formatDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
// Non-table timestamp — `D Mon YYYY, HH:mm`.
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatActivityAt(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`
}

// ─── Styles (DT 2.4) ─────────────────────────────────────────────────────────
const bodyGrid = css({ display: 'grid', gridTemplateColumns: { base: '1fr', lg: '1fr 220px' }, gap: '8' })
const leftCol = css({ display: 'flex', flexDirection: 'column', gap: '6', minWidth: '0' })
const rightCol = css({ display: 'flex', flexDirection: 'column', gap: '5' })
const infoLabel = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', marginBottom: '1', display: 'block' })
const infoValue = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const sectionTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default', marginBottom: '3' })
const descText = css({ color: 'text.default', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' })
const captionText = css({ color: 'text.secondary' })
const fileRow = css({ display: 'flex', alignItems: 'center', gap: '2', fontSize: '14px', paddingBlock: '1' })
const fileName = css({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.default' })
// -12px overlap via flat marginLeft on every item (Pixel's runtime css() drops
// `_notFirst`); container paddingLeft cancels the first item's pull. Same
// hand-rolled stack AddGoalDrawer.vue uses instead of MpAvatarGroup.
const avatarStack = css({ display: 'flex', alignItems: 'center', paddingLeft: '12px' })
const avatarStackItem = css({ display: 'flex', marginLeft: '-12px' })
// Counter circle matches MpAvatar size="md"'s ACTUAL rendered footprint in
// this build (24px / 14px font — verified, not the 32px the token recipe
// reads on paper; see avatar.md's overflow-cap section).
const avatarCountCircle = css({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '24px', height: '24px', borderRadius: 'full',
  background: 'gray.50', color: 'gray.600',
  fontSize: '12px', fontWeight: '600', userSelect: 'none', cursor: 'pointer',
  borderWidth: '2px', borderStyle: 'solid', borderColor: 'background.surface',
})
const assigneeList = css({ display: 'flex', flexDirection: 'column', gap: '3', maxHeight: '280px', overflowY: 'auto', padding: '3', minWidth: '220px' })
const assigneeRow = css({ display: 'flex', alignItems: 'center', gap: '2' })
const activityRow = css({ display: 'flex', alignItems: 'flex-start', gap: '3', paddingBlock: '2' })
const activityText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="xl" class="idp-view-modal" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          {{ actionPlan?.name }}
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <div v-if="actionPlan" :class="bodyGrid">
            <!-- Left: description, attachments, activity -->
            <div :class="leftCol">
              <MpText :class="actionPlan.description ? descText : captionText">
                {{ actionPlan.description || 'No description' }}
              </MpText>

              <div v-if="actionPlan.attachments.length">
                <MpText :class="sectionTitle">Attachment</MpText>
                <div v-for="(file, i) in shownAttachments" :key="`${file}-${i}`" :class="fileRow">
                  <MpIcon :name="fileIcon(file)" size="sm" />
                  <span :class="fileName" :title="file">{{ file }}</span>
                </div>
                <MpTextlink
                  v-if="actionPlan.attachments.length > ATTACHMENT_PAGE"
                  as="button"
                  size="label"
                  :class="css({ marginTop: '2' })"
                  @click="toggleAttachments"
                >
                  {{ canShowMore ? 'Show more' : 'Show less' }}
                </MpTextlink>
              </div>

              <div>
                <MpText :class="sectionTitle">Activity</MpText>
                <div v-for="act in actionPlan.activities" :key="act.id" :class="activityRow">
                  <PxAvatar :id="`act-${act.id}`" :name="talentById(act.userId)?.name" :src="talentById(act.userId)?.photo" size="md" variant-color="gray" />
                  <MpFlex direction="column" gap="0">
                    <span :class="activityText">
                      <MpText as="span" weight="semiBold">{{ talentById(act.userId)?.name ?? 'Someone' }}</MpText>
                      {{ ' ' }}{{ act.content }}
                    </span>
                    <MpText size="label-small" :class="captionText">{{ formatActivityAt(act.at) }}</MpText>
                  </MpFlex>
                </div>
                <MpText v-if="!actionPlan.activities.length" size="label" :class="captionText">No activity yet.</MpText>
              </div>
            </div>

            <!-- Right: status + dates -->
            <div :class="rightCol">
              <div>
                <span :class="infoLabel">Status</span>
                <MpPopover is-close-on-select use-portal placement="bottom-start">
                  <MpPopoverTrigger>
                    <MpButton variant="secondary" size="sm" right-icon="caret-down">
                      <MpBadge for="tableStatus" :type="STATUS_BY_ID[actionPlan.status].badge">{{ STATUS_BY_ID[actionPlan.status].title }}</MpBadge>
                    </MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent :class="css({ minWidth: '180px' })">
                    <MpPopoverList>
                      <MpPopoverListItem
                        v-for="s in ACTION_PLAN_STATUSES"
                        :key="s.id"
                        :is-active="s.id === actionPlan.status"
                        @click="emit('statusChange', s.id)"
                      >
                        {{ s.title }}
                      </MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </div>

              <div>
                <span :class="infoLabel">Assignee</span>
                <MpFlex v-if="actionPlan.assignees.length === 1" align="center" gap="2">
                  <PxAvatar
                    :id="`asg-${actionPlan.assignees[0]}`"
                    :name="talentById(actionPlan.assignees[0])?.name"
                    :src="talentById(actionPlan.assignees[0])?.photo"
                    size="md"
                    variant-color="gray"
                  />
                  <span :class="infoValue">{{ talentById(actionPlan.assignees[0])?.name ?? '-' }}</span>
                </MpFlex>
                <div v-else-if="actionPlan.assignees.length" :class="avatarStack">
                  <MpTooltip v-for="id in visibleAssignees" :key="id" :label="talentById(id)?.name ?? id" use-portal>
                    <span :class="avatarStackItem">
                      <PxAvatar :id="`asg-${id}`" :name="talentById(id)?.name" :src="talentById(id)?.photo" size="md" variant-color="gray" show-border />
                    </span>
                  </MpTooltip>
                  <!-- A nested MpModal crashes here (getBoundingClientRect on a
                       null ref) while the action-plan modal is already open, so
                       the overflow list is a popover instead of avatar.md's
                       usual view-all modal — see the note in avatar.md. -->
                  <MpPopover v-if="hiddenAssigneeCount > 0" use-portal placement="bottom-start">
                    <MpPopoverTrigger>
                      <button type="button" :class="avatarStackItem" :aria-label="`${hiddenAssigneeCount} more assignees`">
                        <span :class="avatarCountCircle">+{{ hiddenAssigneeCount }}</span>
                      </button>
                    </MpPopoverTrigger>
                    <MpPopoverContent>
                      <div :class="assigneeList">
                        <div v-for="id in hiddenAssignees" :key="id" :class="assigneeRow">
                          <PxAvatar :id="`asg-more-${id}`" :name="talentById(id)?.name" :src="talentById(id)?.photo" size="md" variant-color="gray" />
                          <span :class="infoValue">{{ talentById(id)?.name ?? id }}</span>
                        </div>
                      </div>
                    </MpPopoverContent>
                  </MpPopover>
                </div>
                <span v-else :class="captionText">Unassigned</span>
              </div>

              <div>
                <span :class="infoLabel">Category</span>
                <span :class="infoValue">{{ actionPlan.category }}</span>
              </div>
              <div v-if="actionPlan.relatedTo === 'competency' && actionPlan.relatedCompetency">
                <span :class="infoLabel">Competency</span>
                <MpFlex direction="column" gap="0">
                  <span :class="infoValue">{{ actionPlan.relatedCompetency }}</span>
                  <span :class="captionText">{{ COMPETENCY_DESCRIPTIONS[actionPlan.relatedCompetency] }}</span>
                </MpFlex>
              </div>
              <div>
                <span :class="infoLabel">Start date</span>
                <span :class="infoValue">{{ formatDate(actionPlan.startDate) }}</span>
              </div>
              <div>
                <span :class="infoLabel">End date</span>
                <span :class="infoValue">{{ formatDate(actionPlan.dueDate) }}</span>
              </div>
            </div>
          </div>
        </MpModalBody>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px, beating MpModal's inline 3.75rem. */
:global(.idp-view-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>

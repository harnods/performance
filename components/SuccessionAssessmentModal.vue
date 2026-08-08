<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Update assessment modal (manual entry)
  Replicated from production (talenta-performance:
    src/views/talent-management/succession-pool/components/ModalAssessmentSingle.vue).
  Only reachable for MANUAL-entry pools. Enter the candidate's competency score
  per group (0–5), measured against each group's target. Size md.
  Token mode: Pixel 2.4
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpFlex, MpText, MpAvatar, MpButton, MpButtonGroup, MpInput,
  toast, css,
} from '@mekari/pixel3'

interface AssessEmployee { id: string, name: string, code: string, title: string, department: string, photo?: string }
interface GroupTarget { group: string, target: number }
const props = defineProps<{
  isOpen: boolean
  employee: AssessEmployee | null
  groups: GroupTarget[]
  /** The scope value the targets apply to, e.g. "Manager" / "Grade 3" / "Class B". */
  scopeValueLabel?: string
}>()
const emit = defineEmits<{ 'update:isOpen': [boolean] }>()

const scores = ref<Record<string, string>>({})
const submitted = ref(false)
function invalid(group: string): boolean {
  if (!submitted.value) return false
  const raw = scores.value[group]
  if (raw === '' || raw == null) return true
  const n = Number(raw)
  return Number.isNaN(n) || n < 0 || n > 5
}
const anyInvalid = computed(() => props.groups.some(g => invalid(g.group)))

watch(() => props.isOpen, (open) => {
  if (open) {
    scores.value = Object.fromEntries(props.groups.map(g => [g.group, '']))
    submitted.value = false
  }
})

function close() { emit('update:isOpen', false) }
function save() {
  submitted.value = true
  if (anyInvalid.value) return
  toast.notify({ id: 'succ-assessed', position: 'top-center', variant: 'success', title: 'Assessment updated' })
  close()
}

const bodyText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const card = css({ display: 'flex', alignItems: 'center', gap: '3', marginTop: '4' })
// Consistent across all succession modals: 24px · divider · 24px after the card.
const divider = css({ borderBottom: '1px solid', borderBottomColor: 'border.default', marginTop: '6', marginBottom: '6' })
const nameC = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default' })
const jobC = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const sectionLabel = css({ fontSize: '14px', fontWeight: '600', lineHeight: '20px', color: 'text.default', display: 'block' })
const sectionCaption = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary', display: 'block', marginTop: '1', marginBottom: '2' })
const rowC = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4', paddingBlock: '2', borderBottom: '1px solid', borderBottomColor: 'border.default', _last: { borderBottom: 'none' } })
const groupName = css({ fontSize: '14px', lineHeight: '20px', color: 'text.default' })
const groupTarget = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const inputWrap = css({ width: '96px', flexShrink: '0' })
const errText = css({ fontSize: '12px', lineHeight: '16px', color: 'text.danger', marginTop: '1' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="md" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>Update assessment<MpModalCloseButton @click="close" /></MpModalHeader>
        <MpModalBody>
          <div v-if="employee" :class="card">
            <MpAvatar :id="`assess-${employee.id}`" :name="employee.name" :src="employee.photo" size="lg" variant-color="gray" />
            <MpFlex direction="column" gap="0">
              <span :class="nameC">{{ employee.name }}</span>
              <span :class="jobC">{{ employee.code }} | {{ employee.title }} | {{ employee.department }}</span>
            </MpFlex>
          </div>
          <div :class="divider" />
          <span :class="sectionLabel">Assessment scores</span>
          <span v-if="scopeValueLabel" :class="sectionCaption">Targets shown are for {{ scopeValueLabel }}.</span>
          <div v-for="g in groups" :key="g.group" :class="rowC">
            <MpFlex direction="column" gap="0">
              <span :class="groupName">{{ g.group }}</span>
              <span :class="groupTarget">Target {{ g.target.toFixed(1) }}</span>
            </MpFlex>
            <div :class="inputWrap">
              <MpInput v-model="scores[g.group]" type="number" placeholder="0–5" :is-invalid="invalid(g.group)" />
              <span v-if="invalid(g.group)" :class="errText">Score must be 0–5</span>
            </div>
          </div>
        </MpModalBody>
        <MpModalFooter>
          <MpButtonGroup>
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton variant="primary" @click="save">Save changes</MpButton>
          </MpButtonGroup>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

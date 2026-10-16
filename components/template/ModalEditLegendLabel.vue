<!--
  "Edit legend label" — NEW for Story 7 (PRD "Custom Term for Final Score Category",
  PR-9665); not in talenta-review. Opened from the "Legend label" row on a review
  cycle. Saves only the label of the cycle's private template (production:
  editPrivateTemplate extended with legend_name), so the series-wide, retroactive
  change has its own save and its own warning instead of riding on "Edit template".

  - Same field as the template builder: saved-label picker, typed value allowed,
    n / 60 counter, character rule. No "Set as default" (AC8) and no "Remove" on
    saved labels (a cycle screen must not change company settings).
  - Recurring series: a caption names the blast radius before saving (AC4).
    One-off cycle: no caption (AC6).
  Data: usePrivateTemplatesStore (hardcoded mock). Prototype only. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody, MpModalFooter,
  MpButton, MpText, MpFormControl, MpFormLabel, MpFormErrorMessage, MpBadge, toast, css,
} from '@mekari/pixel3'
import { LEGEND_NAME_DEFAULT, LEGEND_NAME_MAX, LEGEND_NAME_PATTERN } from '~/utils/reviewTemplate'

defineOptions({ name: 'ModalEditLegendLabel' })

const uid = useId()

const props = withDefaults(defineProps<{ isOpen?: boolean, cycleUuid?: string, reviewMethod?: string }>(), { isOpen: false, cycleUuid: '', reviewMethod: '' })
const emit = defineEmits<{ 'update:isOpen': [value: boolean], 'updated': [name: string] }>()

const { getLegendInfo, updateLegendName } = usePrivateTemplatesStore()
const { savedLegendNames, saveLegendName } = useReviewTemplateStore()

const legendName = ref('')
const currentName = ref('')
const seriesCount = ref(1)
const touched = ref(false)

watch(() => props.isOpen, (val) => {
  if (!val) return
  const info = getLegendInfo(props.cycleUuid, props.reviewMethod)
  legendName.value = info.legend_name
  currentName.value = info.legend_name
  seriesCount.value = info.series_cycle_count
  touched.value = false
})

const options = computed(() => [LEGEND_NAME_DEFAULT, ...savedLegendNames.value].map(n => ({ value: n, label: n })))
const error = computed(() => {
  if (!touched.value) return ''
  const name = legendName.value.trim()
  if (!name) return 'You must select legend label'
  if (!LEGEND_NAME_PATTERN.test(name)) return 'Legend label has invalid characters. Please use only letters, numbers, spaces and - ( ) & /'
  return ''
})

function close() { emit('update:isOpen', false) }
function save() {
  touched.value = true
  if (error.value) return
  const name = legendName.value.trim()
  if (name !== currentName.value) {
    updateLegendName(props.cycleUuid, props.reviewMethod, name)
    // Reuse (O9): a typed label joins the saved labels; it never changes the default.
    saveLegendName(name, false)
    emit('updated', name)
  }
  toast.notify({ id: 'legend-label-saved', position: 'top-center', variant: 'success', title: 'Legend label saved' })
  close()
}

const contentWidth = css({ width: '480px', maxWidth: '90vw' })
const labelRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })
const charCount = css({ fontSize: '12px', lineHeight: '16px', color: 'text.secondary' })
const caption = css({ marginTop: '1', color: 'text.secondary' })
const optionRow = css({ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0' })
const optionText = css({ minWidth: '0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' })
const footerRow = css({ display: 'flex', justifyContent: 'flex-end', gap: '3', width: '100%' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" class="edit-legend-label-modal" @close="close">
      <MpModalOverlay />
      <MpModalContent :class="contentWidth">
        <MpModalHeader>
          Edit legend label
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <MpFormControl :id="`${uid}-legend-name`" :is-invalid="!!error">
            <div :class="labelRow">
              <MpFormLabel>Legend label</MpFormLabel>
              <span :class="charCount">{{ legendName.length }} / {{ LEGEND_NAME_MAX }}</span>
            </div>
            <PxSelectPopover
              v-model="legendName"
              :options="options"
              allow-custom-value
              keep-text-on-focus
              :maxlength="LEGEND_NAME_MAX"
              placeholder="Select or type legend label"
              width="100%"
            >
              <template #option="{ option }">
                <span :class="optionRow">
                  <span :class="optionText">{{ option.label }}</span>
                  <MpBadge v-if="option.value === currentName" for="tableStatus" type="announcement" size="sm">Current</MpBadge>
                </span>
              </template>
            </PxSelectPopover>
            <MpFormErrorMessage>{{ error }}</MpFormErrorMessage>
            <MpText v-if="!error && seriesCount > 1" size="label-small" :class="caption">
              Applies to all {{ seriesCount }} repeating cycles, including completed ones
            </MpText>
          </MpFormControl>
        </MpModalBody>
        <MpModalFooter>
          <div :class="footerRow">
            <MpButton variant="ghost" @click="close">Cancel</MpButton>
            <MpButton @click="save">Save</MpButton>
          </div>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-centre, 80px from the viewport top. */
:global(.edit-legend-label-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>

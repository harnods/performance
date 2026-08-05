<script setup lang="ts">
// Update repeat date cycle (production parity: ModalUpdate.vue). Toggle whether the
// cycle repeats and, when on, pick the next cycle's start date — the end date is
// derived from the cycle's cadence (quarter / half / year).
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalBody, MpModalFooter, MpModalCloseButton,
  MpCheckbox, MpText, MpFlex, MpButton, MpFormControl, MpFormLabel, MpDatePicker, MpIcon, css,
} from '@mekari/pixel3'
import { periodsFor } from '~/utils/cycleDetail'
import type { ReviewCycle } from '~/composables/useReviewCyclesStore'

const props = defineProps<{ isOpen: boolean, cycle: ReviewCycle | null }>()
const emit = defineEmits<{ 'update:isOpen': [boolean], 'submit': [{ isRepeat: boolean, start: Date | null }] }>()

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmt(d: Date) { return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` }
function stepMonths(repeat?: string) {
  const r = (repeat || '').toLowerCase()
  if (r.includes('quarter')) return 3
  if (r.includes('year')) return 12
  if (r.includes('month')) return 1
  return 6
}
function addMonths(d: Date, n: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x }

const isRepeat = ref(false)
const nextStart = ref<Date | null>(null)
const lastCyclePeriod = ref('')

watch(() => props.isOpen, (open) => {
  if (!open || !props.cycle) return
  const periods = periodsFor(props.cycle)
  const last = periods[periods.length - 1]
  lastCyclePeriod.value = last ? `${last.start} - ${last.end}` : '-'
  isRepeat.value = props.cycle.repeat !== 'Does not repeat'
  // Default next start = one cadence step after the last period's start.
  const base = last ? new Date(`${last.start}`) : new Date()
  nextStart.value = addMonths(base, stepMonths(props.cycle.repeat))
})

const nextEnd = computed(() => {
  if (!nextStart.value || !props.cycle) return null
  const end = addMonths(nextStart.value, stepMonths(props.cycle.repeat))
  end.setDate(end.getDate() - 1)
  return end
})

function close() { emit('update:isOpen', false) }
function submit() {
  emit('submit', { isRepeat: isRepeat.value, start: isRepeat.value ? nextStart.value : null })
  close()
}

const lastBox = css({
  background: 'background.information.subtle', border: '1px solid', borderColor: 'border.information',
  borderRadius: 'md', padding: '3', marginTop: '3',
})
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="md" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>Update repeat date cycle<MpModalCloseButton @click="close" /></MpModalHeader>
        <MpModalBody>
          <div :class="css({ paddingBottom: '2' })">
            <MpCheckbox :is-checked="isRepeat" @update:is-checked="(v) => (isRepeat = v)">
              Repeat cycle automatically after the cycle ends
            </MpCheckbox>

            <template v-if="isRepeat">
              <div :class="lastBox">
                <MpText size="label"><MpText as="span" size="label" :class="css({ fontWeight: '600' })">Last cycle period: </MpText>{{ lastCyclePeriod }}</MpText>
              </div>

              <MpFormControl id="next-cycle-start" :class="css({ marginTop: '4' })">
                <MpFormLabel>Next cycle period</MpFormLabel>
                <MpDatePicker
                  v-model="nextStart"
                  value-type="date"
                  format="D MMM YYYY"
                  placeholder="Select start date"
                  use-portal
                  :is-show-shortcut="false"
                />
                <MpFlex v-if="nextEnd" align="center" gap="2" :class="css({ marginTop: '2', color: 'text.secondary' })">
                  <MpIcon name="refresh" :class="css({ width: '16px', height: '16px' })" />
                  <MpText size="label-small">Next cycle ends on {{ fmt(nextEnd) }} (based on the cycle cadence)</MpText>
                </MpFlex>
              </MpFormControl>
            </template>
          </div>
        </MpModalBody>
        <MpModalFooter>
          <MpButton variant="ghost" @click="close">Cancel</MpButton>
          <MpButton variant="primary" @click="submit">Submit</MpButton>
        </MpModalFooter>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<!--
  Migrated from talenta-review (commit 010875214aba):
    src/views/settings/template/component/ModalCycleList.vue
  Component name preserved: ModalCycleList. Props/events preserved: isOpen
  (+ update:isOpen), templateUuid.
  perfect-scrollbar infinite scroll → MpTableContainer capped at 500px with a
  sticky MpTableHead (docs/patterns/pagination.md), next page on scroll end.
  Prototype only — cycles from useReviewTemplateStore. Token mode: Pixel 2.4
-->
<script setup lang="ts">
import {
  MpModal, MpModalOverlay, MpModalContent, MpModalHeader, MpModalCloseButton, MpModalBody,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell, MpSpinner, css,
} from '@mekari/pixel3'
import { formatDateRange, type TemplateCycle } from '~/utils/reviewTemplate'

defineOptions({ name: 'ModalCycleList' })

const LIMIT_PER_PAGE = 50

const props = withDefaults(defineProps<{ isOpen?: boolean, templateUuid?: string }>(), { isOpen: false, templateUuid: '' })
const emit = defineEmits<{ 'update:isOpen': [value: boolean] }>()

const { getTemplateCycles } = useReviewTemplateStore()

const cycleList = ref<TemplateCycle[]>([])
const currentPage = ref(1)
const totalPage = ref(1)
const isLoadingFetchCycleList = ref(false)

function fetchCycleList() {
  isLoadingFetchCycleList.value = true
  // MOCK of GET {newEndPoint}/review-templates/{uuid}/cycles
  const { data, last_page } = getTemplateCycles(props.templateUuid, currentPage.value, LIMIT_PER_PAGE)
  totalPage.value = last_page
  currentPage.value += 1
  cycleList.value = [...cycleList.value, ...data]
  isLoadingFetchCycleList.value = false
}
function resetPagination() {
  cycleList.value = []
  currentPage.value = 1
  totalPage.value = 1
}
watch(() => [props.templateUuid, props.isOpen], () => {
  if (!props.isOpen) return
  resetPagination()
  fetchCycleList()
}, { immediate: true })

function onScroll(e: Event) {
  const el = e.target as HTMLElement
  const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 4
  if (atEnd && currentPage.value <= totalPage.value && !isLoadingFetchCycleList.value) fetchCycleList()
}
function close() { emit('update:isOpen', false) }

const scrollRegion = css({ maxHeight: '500px', overflowY: 'auto' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', whiteSpace: 'normal', overflowWrap: 'anywhere' })
const dateCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', whiteSpace: 'nowrap' })
</script>

<template>
  <ClientOnly>
    <MpModal :is-open="isOpen" size="lg" class="template-cycle-list-modal" @close="close">
      <MpModalOverlay />
      <MpModalContent>
        <MpModalHeader>
          Usage cycle list
          <MpModalCloseButton @click="close" />
        </MpModalHeader>
        <MpModalBody>
          <MpTableContainer :class="scrollRegion" @scroll="onScroll">
            <MpTable :is-hoverable="false">
              <MpTableHead is-fixed>
                <MpTableRow>
                  <MpTableCell as="th" :class="headCell">Cycle master name</MpTableCell>
                  <MpTableCell as="th" :class="headCell">Cycle period</MpTableCell>
                </MpTableRow>
              </MpTableHead>
              <MpTableBody>
                <MpTableRow v-for="(cycle, idx) in cycleList" :key="`cycle-${cycle.id}-${idx}`" :data-qa="`view-settings-template-modal-cycle-${cycle.id}`">
                  <MpTableCell as="td" :class="cell">{{ cycle.name }}</MpTableCell>
                  <MpTableCell as="td" :class="dateCell">{{ formatDateRange(cycle.start_date, cycle.end_date) }}</MpTableCell>
                </MpTableRow>
                <MpTableRow v-if="isLoadingFetchCycleList">
                  <MpTableCell as="td" :colspan="2" :class="cell"><MpSpinner size="sm" /></MpTableCell>
                </MpTableRow>
              </MpTableBody>
            </MpTable>
          </MpTableContainer>
        </MpModalBody>
      </MpModalContent>
    </MpModal>
  </ClientOnly>
</template>

<style scoped>
/* docs/patterns/modal.md — top-center at 80px. */
:global(.template-cycle-list-modal [data-pixel-component='MpModalContent']) {
  margin-top: 80px !important;
}
</style>

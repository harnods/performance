<script setup lang="ts">
/*
  Competency item detail — read-only right drawer opened from an IDP action
  plan's "Relates to" (detail table name link, Update modal "View details").
  Shows the Competency item (setup → Competency items): its name, description
  and rating scale. Data comes from useCompetencyItemStore, the same source as
  the action-plan picker, not from competency assignments.
*/
import {
  MpDrawer, MpDrawerOverlay, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody,
  MpFlex,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  css,
} from '@mekari/pixel3'

const props = defineProps<{ isOpen: boolean, competency: string | null }>()
const emit = defineEmits<{ close: [] }>()

const { list } = useCompetencyItemStore()
// IDP stores the item by name; match it back to the Competency item record.
const item = computed(() => (props.competency ? list.value.find(i => i.name === props.competency) : undefined))
const description = computed(() => item.value?.description || '-')
const ratingScales = computed(() => item.value?.rating_scales ?? [])

// ─── Styles ───────────────────────────────────────────────────────────────
const nameText = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const descText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
// H3 (16/600/24), 20px below the description.
const sectionTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default', marginTop: '20px', marginBottom: '3' })
const emptyText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
// Rating is a short scale label ("1"–"5"), read left-aligned like the description.
const ratingHead = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '80px' })
const ratingCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', width: '80px', fontVariantNumeric: 'tabular-nums' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', whiteSpace: 'normal', overflowWrap: 'anywhere' })
</script>

<template>
  <ClientOnly>
    <MpDrawer :is-open="isOpen" size="md" placement="right" @close="emit('close')">
      <MpDrawerOverlay />
      <MpDrawerContent>
        <MpDrawerHeader>
          Competency item detail
          <MpDrawerCloseButton @click="emit('close')" />
        </MpDrawerHeader>
        <MpDrawerBody>
          <MpFlex v-if="competency" direction="column" gap="0">
            <span :class="nameText">{{ competency }}</span>
            <span :class="descText">{{ description }}</span>
          </MpFlex>

          <template v-if="competency">
            <h3 :class="sectionTitle">Rating scale</h3>
            <MpTableContainer v-if="ratingScales.length">
              <MpTable :is-hoverable="false">
                <MpTableHead>
                  <MpTableRow>
                    <MpTableCell as="th" :class="ratingHead">Rating</MpTableCell>
                    <MpTableCell as="th" :class="headCell">Description</MpTableCell>
                  </MpTableRow>
                </MpTableHead>
                <MpTableBody>
                  <MpTableRow v-for="r in ratingScales" :key="r.rating">
                    <MpTableCell as="td" :class="ratingCell">{{ r.rating }}</MpTableCell>
                    <MpTableCell as="td" :class="cell">{{ r.description }}</MpTableCell>
                  </MpTableRow>
                </MpTableBody>
              </MpTable>
            </MpTableContainer>
            <span v-else :class="emptyText">This competency item no longer exists in Competency items.</span>
          </template>
        </MpDrawerBody>
      </MpDrawerContent>
    </MpDrawer>
  </ClientOnly>
</template>

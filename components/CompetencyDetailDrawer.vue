<script setup lang="ts">
/*
  Competency detail — read-only right drawer opened from an IDP action plan's
  "Relates to" cell ("View details" textlink). Shows the competency's name,
  its one-line definition, and the target score in each department whose
  competency set includes it. All data comes from utils/competency, the same
  catalog the action-plan picker uses.
*/
import {
  MpDrawer, MpDrawerOverlay, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody,
  MpFlex,
  MpTable, MpTableContainer, MpTableHead, MpTableBody, MpTableRow, MpTableCell,
  css,
} from '@mekari/pixel3'
import { COMPETENCY_DESCRIPTIONS, DEPARTMENT_GROUPS } from '~/utils/competency'

const props = defineProps<{ isOpen: boolean, competency: string | null }>()
const emit = defineEmits<{ close: [] }>()

const description = computed(() => (props.competency ? COMPETENCY_DESCRIPTIONS[props.competency] : '') || '-')
const targets = computed(() => {
  if (!props.competency) return []
  return Object.entries(DEPARTMENT_GROUPS)
    .flatMap(([department, groups]) => groups.filter(g => g.group === props.competency).map(g => ({ department, target: g.target })))
    .sort((a, b) => a.department.localeCompare(b.department))
})

// ─── Styles ───────────────────────────────────────────────────────────────
const nameText = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const descText = css({ fontSize: '14px', lineHeight: '20px', color: 'text.secondary' })
// H3 (16/600/24), 20px below the description.
const sectionTitle = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default', marginTop: '20px', marginBottom: '3' })
const headCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const cell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const numCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle', textAlign: 'right', fontVariantNumeric: 'tabular-nums' })
</script>

<template>
  <ClientOnly>
    <MpDrawer :is-open="isOpen" size="md" placement="right" @close="emit('close')">
      <MpDrawerOverlay />
      <MpDrawerContent>
        <MpDrawerHeader>
          Competency detail
          <MpDrawerCloseButton @click="emit('close')" />
        </MpDrawerHeader>
        <MpDrawerBody>
          <MpFlex v-if="competency" direction="column" gap="0">
            <span :class="nameText">{{ competency }}</span>
            <span :class="descText">{{ description }}</span>
          </MpFlex>

          <template v-if="competency">
            <h3 :class="sectionTitle">Target score by department</h3>
            <MpTableContainer>
              <MpTable :is-hoverable="false">
                <MpTableHead>
                  <MpTableRow>
                    <MpTableCell as="th" :class="headCell">Department</MpTableCell>
                    <MpTableCell as="th" :class="[headCell, css({ textAlign: 'right' })]">Target score</MpTableCell>
                  </MpTableRow>
                </MpTableHead>
                <MpTableBody>
                  <MpTableRow v-for="t in targets" :key="t.department">
                    <MpTableCell as="td" :class="cell">{{ t.department }}</MpTableCell>
                    <MpTableCell as="td" :class="numCell">{{ t.target.toFixed(1) }}</MpTableCell>
                  </MpTableRow>
                </MpTableBody>
              </MpTable>
            </MpTableContainer>
          </template>
        </MpDrawerBody>
      </MpDrawerContent>
    </MpDrawer>
  </ClientOnly>
</template>

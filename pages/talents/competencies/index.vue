<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Competency assignment list
  Source: Flexible Competency Assignment PRD — US1 redirect target (list landing)
  Token mode: Pixel 2.4
  Patterns used: layout-shell, index-view (table), success banner
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Lightweight landing — full list display (filters, pagination, scoping display
  details) is Stage-02 scope (S4). This page exists so the US1 create → submit →
  redirect flow is navigable, and demonstrates the scoping attribute shown as a
  labeled column (critical path: "scoping attribute visibly labeled").
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpTag,
  MpBanner,
  MpBannerIcon,
  MpBannerTitle,
  MpBannerCloseButton,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  css,
} from '@mekari/pixel3'

definePageMeta({ title: 'Competency assignment', layout: 'default' })

const route = useRoute()
const createdName = computed(() => (route.query.created ? (route.query.name as string) || 'Assignment' : ''))
const showSuccess = ref(!!route.query.created)

interface Assignment {
  name: string
  position: string
  scope: { type: 'Job level' | 'Grade' | 'Class'; value: string } | null
  groups: number
}

// Mock existing data. "None" scope renders an em dash (backward-compatible rows).
const assignments = ref<Assignment[]>([
  { name: 'Product Manager — Manager level', position: 'Product Manager', scope: { type: 'Job level', value: 'Manager' }, groups: 4 },
  { name: 'Engineering competency baseline', position: 'Software Engineer', scope: null, groups: 6 },
  { name: 'Sales — Grade 3', position: 'Sales Executive', scope: { type: 'Grade', value: 'Grade 3' }, groups: 3 },
])

const tightCell = css({ paddingTop: '2', paddingBottom: '2' })
const valueText = css({ color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const scopeCell = css({ paddingTop: '2', paddingBottom: '2', whiteSpace: 'nowrap' })
</script>

<template>
  <MpFlex direction="column" gap="6">
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="primary" left-icon="add" @click="navigateTo('/talents/competencies/create')">
        Create assignment
      </MpButton>
    </Teleport>

    <!-- Success banner after create (stand-in for the PRD success toast) -->
    <MpBanner v-if="showSuccess" variant="success">
      <MpBannerIcon />
      <MpBannerTitle>Assignment created</MpBannerTitle>
      <MpBannerCloseButton @click="showSuccess = false" />
    </MpBanner>

    <MpTableContainer>
      <MpTable>
        <MpTableHead>
          <MpTableRow>
            <MpTableCell as="th">Assignment name</MpTableCell>
            <MpTableCell as="th">Job position</MpTableCell>
            <MpTableCell as="th">Scope</MpTableCell>
            <MpTableCell as="th">Groups</MpTableCell>
            <MpTableCell as="th" :class="actionHead" />
          </MpTableRow>
        </MpTableHead>
        <MpTableBody>
          <MpTableRow v-for="a in assignments" :key="a.name">
            <MpTableCell as="td" :class="tightCell">
              <MpText size="label" :class="valueText">{{ a.name }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="tightCell">
              <MpText size="label" :class="valueText">{{ a.position }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="scopeCell">
              <MpTag v-if="a.scope" variant="info">{{ a.scope.type }}: {{ a.scope.value }}</MpTag>
              <MpText v-else size="label" :class="captionText">—</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="tightCell">
              <MpText size="label" :class="valueText">{{ a.groups }}</MpText>
            </MpTableCell>
            <MpTableCell as="td" :class="tightCell" />
          </MpTableRow>
        </MpTableBody>
      </MpTable>
    </MpTableContainer>
  </MpFlex>
</template>

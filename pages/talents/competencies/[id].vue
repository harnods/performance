<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Competency assignment details
  Token mode: Pixel 2.4
  Reached from the Assignments list (name textlink / "View details"). Read-only
  summary of one assignment + its competency-group matrix.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpTag,
  MpTable,
  MpTableContainer,
  MpTableHead,
  MpTableBody,
  MpTableRow,
  MpTableCell,
  css,
} from '@mekari/pixel3'

const route = useRoute()
const id = route.params.id as string
const name = computed(() => (route.query.name as string) || 'Assignment')

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Assignments', to: '/talents/competencies' },
})

// Mock detail (in production this is fetched by id). Mirrors the matrix create form.
const detail = {
  positions: ['Product Manager', 'Senior Product Manager'],
  scope: 'Job level' as string | null,
  columns: ['Associate', 'Specialist', 'Senior', 'Manager'],
  groups: [
    { name: 'Leadership', ratings: ['1 — Needs development', '2 — Developing', '3 — Proficient', '4 — Advanced'] },
    { name: 'Communication', ratings: ['2 — Developing', '3 — Proficient', '3 — Proficient', '4 — Advanced'] },
    { name: 'Product thinking', ratings: ['Not applicable', '2 — Developing', '3 — Proficient', '4 — Advanced'] },
    { name: 'Execution', ratings: ['2 — Developing', '3 — Proficient', '4 — Advanced', '5 — Expert'] },
  ],
}

const labelText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2' })
const fieldRow = css({ display: 'flex', flexDirection: 'column', gap: '1' })
</script>

<template>
  <MpFlex direction="column" gap="6" :class="css({ maxWidth: '960px' })">
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="ghost" @click="navigateTo('/talents/competencies')">Back</MpButton>
      <MpButton
        variant="primary"
        left-icon="edit"
        @click="navigateTo({ path: '/talents/competencies/create', query: { edit: id, name, scope: 'job-level' } })"
      >
        Edit
      </MpButton>
    </Teleport>

    <!-- Summary -->
    <MpFlex direction="column" gap="4">
      <div :class="fieldRow">
        <MpText size="label-small" :class="labelText">Job position</MpText>
        <MpFlex align="center" gap="2" wrap="wrap">
          <MpTag v-for="p in detail.positions" :key="p" variant="neutral">{{ p }}</MpTag>
        </MpFlex>
      </div>
      <div :class="fieldRow">
        <MpText size="label-small" :class="labelText">Scope attribute</MpText>
        <MpFlex>
          <MpTag v-if="detail.scope" variant="info">{{ detail.scope }}</MpTag>
          <MpText v-else size="label" :class="labelText">—</MpText>
        </MpFlex>
      </div>
    </MpFlex>

    <!-- Competency groups matrix (read-only) -->
    <MpFlex direction="column" gap="3">
      <MpText as="h2" :class="h2Class">Competency groups</MpText>
      <MpTableContainer>
        <MpTable>
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th">Group name</MpTableCell>
              <MpTableCell v-for="col in detail.columns" :key="col" as="th">{{ col }}</MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="g in detail.groups" :key="g.name">
              <MpTableCell as="td" :class="tightCell">
                <MpText size="label" :class="valueText">{{ g.name }}</MpText>
              </MpTableCell>
              <MpTableCell v-for="(r, i) in g.ratings" :key="i" as="td" :class="tightCell">
                <MpText size="label" :class="r === 'Not applicable' ? labelText : valueText">{{ r }}</MpText>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>
    </MpFlex>
  </MpFlex>
</template>

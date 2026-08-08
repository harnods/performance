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

import { scopeOptions } from '~/utils/competency'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

definePageMeta({
  layout: 'default',
  breadcrumb: { label: 'Assignments', to: '/talents/competencies' },
})

const { assignmentById } = useCompetencyStore()
const record = computed(() => assignmentById(id))
// Title (layout fallback also resolves it); redirect if the assignment is gone.
const name = computed(() => record.value?.name ?? 'Assignment')
watchEffect(() => { if (import.meta.client && !record.value) router.replace('/talents/competencies') })

const SCOPE_NAME = { 'job-level': 'Job level', grade: 'Grade', class: 'Class' } as const
function cell(x: number | 'na' | undefined): string {
  return x === 'na' || x == null ? 'Not applicable' : Number(x).toFixed(1)
}
// Read-only detail derived from the real record — columns are the scope values
// (or "All employees" when unscoped), cells are the target scores.
const detail = computed(() => {
  const r = record.value
  if (!r) return { positions: [] as string[], scope: null as string | null, columns: [] as string[], groups: [] as { name: string, ratings: string[] }[] }
  const opts = r.scope ? scopeOptions(r.scope) : []
  const columns = r.scope ? r.values.map(v => opts.find(o => o.value === v)?.label ?? v) : ['All employees']
  const groups = r.groups.map(g => ({ name: g.group, ratings: r.values.map(v => cell(g.ratings[v])) }))
  return { positions: r.positions, scope: r.scope ? SCOPE_NAME[r.scope] : null, columns, groups }
})

// ─── Column sort (behaviour from goal-cycles reference) ──────────────────────
// Group-name column + each level column (keyed col:<index>) sortable; rating
// labels carry a numeric prefix so text sort with numeric:true orders them well.
const sortKey = ref('')
const sortDir = ref<'asc' | 'desc'>('asc')
function onSortChange(key: string, dir: 'asc' | 'desc') { sortKey.value = key; sortDir.value = dir }
function sortValue(g: { name: string, ratings: string[] }, key: string): string {
  if (key === 'name') return g.name
  if (key.startsWith('col:')) return g.ratings[Number(key.slice(4))] ?? ''
  return ''
}
const sortedGroups = computed(() => {
  if (!sortKey.value) return detail.value.groups
  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...detail.value.groups].sort((a, b) =>
    String(sortValue(a, sortKey.value)).localeCompare(
      String(sortValue(b, sortKey.value)), undefined, { numeric: true, sensitivity: 'base' },
    ) * dir,
  )
})

const labelText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })
const tightCell = css({ paddingTop: '2', paddingBottom: '2', verticalAlign: 'middle' })
const headCell = css({ paddingTop: '2', paddingBottom: '2' })
// Header label + sort menu inline (mirrors goal-cycles reference).
const thInner = css({ display: 'inline-flex', alignItems: 'center', gap: '2', maxWidth: '100%', verticalAlign: 'middle' })
const fieldRow = css({ display: 'flex', flexDirection: 'column', gap: '1' })
</script>

<template>
  <MpFlex direction="column" gap="6" :class="css({ maxWidth: '960px' })">
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="ghost" @click="navigateTo('/talents/competencies')">Back</MpButton>
      <MpButton
        variant="primary"
        left-icon="edit"
        @click="navigateTo({ path: '/talents/competencies/create', query: { edit: id, name, scope: record?.scope ?? '' } })"
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
              <MpTableCell as="th" class="cmx-sort-th" :class="headCell">
                <span :class="thInner"><span>Group name</span><PxColumnSortMenu col-key="name" sort-type="text" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
              <MpTableCell v-for="(col, ci) in detail.columns" :key="col" as="th" class="cmx-sort-th" :class="headCell">
                <span :class="thInner"><span>{{ col }}</span><PxColumnSortMenu :col-key="`col:${ci}`" sort-type="text" :sort-key="sortKey" :sort-dir="sortDir" @sort-change="onSortChange" /></span>
              </MpTableCell>
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="g in sortedGroups" :key="g.name">
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

<style scoped>
/* Reveal the column sort icon on header hover. UNLAYERED scoped rule so it beats
   PxColumnSortMenu's unlayered `visibility: hidden` on specificity. */
.cmx-sort-th:hover :deep(.px-sort-btn) { visibility: visible; }
</style>

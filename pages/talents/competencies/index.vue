<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Competency assignments list
  Token mode: Pixel 2.4
  Patterns used: layout-shell, index-view (filter bar + table + pagination),
  row actions popover, delete confirmation modal — mirrors Review cycles list.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpButton,
  MpText,
  MpTag,
  MpTextlink,
  MpSelect,
  MpInputGroup,
  MpInputLeftAddon,
  MpInput,
  MpIcon,
  MpTooltip,
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
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  MpPopoverList,
  MpPopoverListItem,
  MpModal,
  MpModalOverlay,
  MpModalContent,
  MpModalHeader,
  MpModalBody,
  MpModalFooter,
  MpModalCloseButton,
  css,
} from '@mekari/pixel3'

definePageMeta({ title: 'Assignments', layout: 'default' })

const route = useRoute()
const showSuccess = ref(!!route.query.created)
const showUpdated = ref(!!route.query.updated)

// Scope attribute is one of three dimensions only (or none).
type ScopeAttr = 'job-level' | 'job-grade' | 'job-class' | null
const scopeLabel: Record<Exclude<ScopeAttr, null>, string> = {
  'job-level': 'Job level',
  'job-grade': 'Job grade',
  'job-class': 'Job class',
}

interface Assignment {
  id: string
  name: string
  positions: string[]
  scope: ScopeAttr
  groups: number
}

const assignments = ref<Assignment[]>([
  { id: 'pm-manager', name: 'Product Manager — Manager level', positions: ['Product Manager', 'Senior Product Manager'], scope: 'job-level', groups: 4 },
  { id: 'eng-baseline', name: 'Engineering competency baseline', positions: ['Software Engineer', 'Frontend Engineer', 'Backend Engineer'], scope: null, groups: 6 },
  { id: 'sales-grade-3', name: 'Sales — Grade 3', positions: ['Sales Executive'], scope: 'job-grade', groups: 3 },
  { id: 'ux-senior', name: 'UX Designer — Senior', positions: ['UX Designer', 'Product Designer'], scope: 'job-level', groups: 5 },
  { id: 'data-class-a', name: 'Data Analyst — Class A', positions: ['Data Analyst'], scope: 'job-class', groups: 4 },
  { id: 'em-leadership', name: 'Engineering Manager leadership', positions: ['Engineering Manager', 'Tech Lead'], scope: 'job-level', groups: 6 },
  { id: 'sales-baseline', name: 'Sales competency baseline', positions: ['Sales Executive', 'Account Executive'], scope: null, groups: 3 },
  { id: 'pm-grade-5', name: 'Product Manager — Grade 5', positions: ['Product Manager'], scope: 'job-grade', groups: 4 },
  { id: 'ux-class-b', name: 'UX Designer — Class B', positions: ['UX Designer'], scope: 'job-class', groups: 4 },
  { id: 'eng-senior', name: 'Software Engineer — Senior', positions: ['Software Engineer', 'Backend Engineer'], scope: 'job-level', groups: 5 },
  { id: 'data-baseline', name: 'Data competency baseline', positions: ['Data Analyst', 'Data Scientist'], scope: null, groups: 5 },
  { id: 'em-grade-7', name: 'Engineering Manager — Grade 7', positions: ['Engineering Manager'], scope: 'job-grade', groups: 6 },
  { id: 'sales-class-c', name: 'Sales Executive — Class C', positions: ['Sales Executive'], scope: 'job-class', groups: 3 },
  { id: 'pm-baseline', name: 'Product competency baseline', positions: ['Product Manager', 'Associate PM'], scope: null, groups: 4 },
])

// ─── Filter bar ───────────────────────────────────────────────────────────────
const scopeOptions = [
  { value: 'job-level', label: 'Job level' },
  { value: 'job-grade', label: 'Job grade' },
  { value: 'job-class', label: 'Job class' },
]
const scopeFilter = ref('')
const search = ref('')

const scopeFieldClass = css({
  width: '200px',
  cursor: 'pointer',
  '& select': { pointerEvents: 'none' },
})

const filtered = computed(() => {
  let result = assignments.value
  if (scopeFilter.value) result = result.filter(a => a.scope === scopeFilter.value)
  if (search.value) result = result.filter(a => a.name.toLowerCase().includes(search.value.toLowerCase()))
  return result
})

// ─── Pagination ───────────────────────────────────────────────────────────────
const rowsPerPage = ref(10)
const rowsPerPageOptions = [10, 25, 50, 100]
const totalRows = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / rowsPerPage.value)))
const currentPage = ref(1)
const showingFrom = computed(() => (totalRows.value === 0 ? 0 : (currentPage.value - 1) * rowsPerPage.value + 1))
const showingTo = computed(() => Math.min(currentPage.value * rowsPerPage.value, totalRows.value))
const paged = computed(() => filtered.value.slice((currentPage.value - 1) * rowsPerPage.value, currentPage.value * rowsPerPage.value))
watch([scopeFilter, search], () => { currentPage.value = 1 })

// ─── Navigation / actions ────────────────────────────────────────────────────
const detailTarget = (a: Assignment) => ({ path: `/talents/competencies/${a.id}`, query: { name: a.name } })
const editTarget = (a: Assignment) => ({ path: '/talents/competencies/create', query: { edit: a.id, name: a.name, scope: a.scope ?? '' } })

const deleteModalOpen = ref(false)
const toDelete = ref<Assignment | null>(null)
function askDelete(a: Assignment) { toDelete.value = a; deleteModalOpen.value = true }
function confirmDelete() {
  if (toDelete.value) assignments.value = assignments.value.filter(a => a.id !== toDelete.value!.id)
  deleteModalOpen.value = false
  toDelete.value = null
}

// ─── Table styles (mekari-way) ──────────────────────────────────────────────────
const tightCell = css({ paddingTop: '2', paddingBottom: '2' })
const actionHead = css({ width: '1%', whiteSpace: 'nowrap' })
const actionCell = css({ paddingTop: '2', paddingBottom: '2', width: '1%', whiteSpace: 'nowrap' })
const scopeCell = css({ paddingTop: '2', paddingBottom: '2', whiteSpace: 'nowrap' })
const valueText = css({ color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
</script>

<template>
  <MpFlex direction="column" gap="6">
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="primary" left-icon="add" @click="navigateTo('/talents/competencies/create')">
        Create assignment
      </MpButton>
    </Teleport>

    <MpBanner v-if="showSuccess" variant="success">
      <MpBannerIcon />
      <MpBannerTitle>Assignment created</MpBannerTitle>
      <MpBannerCloseButton @click="showSuccess = false" />
    </MpBanner>

    <MpBanner v-if="showUpdated" variant="success">
      <MpBannerIcon />
      <MpBannerTitle>Assignment updated</MpBannerTitle>
      <MpBannerCloseButton @click="showUpdated = false" />
    </MpBanner>

    <!-- ═════ Filter bar ═════ -->
    <MpFlex align="center" justify="space-between" gap="4">
      <MpPopover is-close-on-select is-adaptive-width use-portal placement="bottom-start">
        <MpPopoverTrigger>
          <MpFlex :class="scopeFieldClass">
            <MpSelect
              v-model="scopeFilter"
              placeholder="Scope attribute"
              is-clearable
              tabindex="-1"
              aria-hidden="true"
            >
              <option v-for="opt in scopeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </MpSelect>
          </MpFlex>
        </MpPopoverTrigger>
        <MpPopoverContent>
          <MpPopoverList>
            <MpPopoverListItem
              v-for="opt in scopeOptions"
              :key="opt.value"
              :is-active="opt.value === scopeFilter"
              @click="scopeFilter = opt.value"
            >
              {{ opt.label }}
            </MpPopoverListItem>
          </MpPopoverList>
        </MpPopoverContent>
      </MpPopover>

      <MpFlex :class="css({ width: '280px' })">
        <MpInputGroup>
          <MpInputLeftAddon>
            <MpIcon name="search" />
          </MpInputLeftAddon>
          <MpInput v-model="search" placeholder="Search assignment name..." />
        </MpInputGroup>
      </MpFlex>
    </MpFlex>

    <!-- ═════ Table + pagination ═════ -->
    <MpFlex direction="column">
      <MpTableContainer>
        <MpTable>
          <MpTableHead>
            <MpTableRow>
              <MpTableCell as="th">Assignment name</MpTableCell>
              <MpTableCell as="th">Job position</MpTableCell>
              <MpTableCell as="th">Scope attribute</MpTableCell>
              <MpTableCell as="th">Groups</MpTableCell>
              <MpTableCell as="th" :class="actionHead" />
            </MpTableRow>
          </MpTableHead>
          <MpTableBody>
            <MpTableRow v-for="a in paged" :key="a.id">
              <MpTableCell as="td" :class="tightCell">
                <MpTextlink as="button" @click="navigateTo(detailTarget(a))">{{ a.name }}</MpTextlink>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpFlex align="center" gap="2">
                  <MpText size="label" :class="valueText">{{ a.positions[0] }}</MpText>
                  <MpTooltip v-if="a.positions.length > 1" :label="a.positions.slice(1).join(', ')" use-portal>
                    <MpTag variant="neutral">+{{ a.positions.length - 1 }}</MpTag>
                  </MpTooltip>
                </MpFlex>
              </MpTableCell>
              <MpTableCell as="td" :class="scopeCell">
                <MpTag v-if="a.scope" variant="info">{{ scopeLabel[a.scope] }}</MpTag>
                <MpText v-else size="label" :class="captionText">—</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="tightCell">
                <MpText size="label" :class="valueText">{{ a.groups }}</MpText>
              </MpTableCell>
              <MpTableCell as="td" :class="actionCell">
                <MpPopover is-close-on-select use-portal placement="bottom-end">
                  <MpPopoverTrigger>
                    <MpButton variant="secondary" right-icon="caret-down">Actions</MpButton>
                  </MpPopoverTrigger>
                  <MpPopoverContent>
                    <MpPopoverList>
                      <MpPopoverListItem @click="navigateTo(detailTarget(a))">View details</MpPopoverListItem>
                      <MpPopoverListItem @click="navigateTo(editTarget(a))">Edit</MpPopoverListItem>
                      <MpPopoverListItem @click="askDelete(a)">
                        <span :class="css({ color: 'text.danger' })">Delete</span>
                      </MpPopoverListItem>
                    </MpPopoverList>
                  </MpPopoverContent>
                </MpPopover>
              </MpTableCell>
            </MpTableRow>
            <MpTableRow v-if="paged.length === 0">
              <MpTableCell as="td" :colspan="5" :class="css({ textAlign: 'center', paddingBlock: '8' })">
                <MpText size="label" :class="captionText">No assignments found.</MpText>
              </MpTableCell>
            </MpTableRow>
          </MpTableBody>
        </MpTable>
      </MpTableContainer>

      <!-- Pagination footer -->
      <div :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '52px', paddingInline: '4' })">
        <MpFlex align="center" gap="3">
          <MpText size="label" :class="captionText">Rows per page</MpText>
          <MpPopover is-close-on-select use-portal placement="bottom-start">
            <MpPopoverTrigger>
              <MpButton variant="ghost" size="sm" right-icon="chevrons-down">{{ rowsPerPage }}</MpButton>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <MpPopoverList>
                <MpPopoverListItem
                  v-for="opt in rowsPerPageOptions"
                  :key="opt"
                  :is-active="opt === rowsPerPage"
                  @click="rowsPerPage = opt; currentPage = 1"
                >
                  {{ opt }}
                </MpPopoverListItem>
              </MpPopoverList>
            </MpPopoverContent>
          </MpPopover>
          <MpText size="label" :class="captionText">Showing {{ showingFrom }}–{{ showingTo }} of {{ totalRows }}</MpText>
        </MpFlex>

        <div :class="css({ display: 'flex', alignItems: 'center', gap: '2' })">
          <MpText size="label" :class="captionText">Page {{ currentPage }} of {{ totalPages }}</MpText>
          <MpTooltip label="Prev page" use-portal>
            <MpButton variant="ghost" size="sm" left-icon="chevrons-left" :is-disabled="currentPage === 1" @click="currentPage--" />
          </MpTooltip>
          <MpTooltip label="Next page" use-portal>
            <MpButton variant="ghost" size="sm" left-icon="chevrons-right" :is-disabled="currentPage === totalPages" @click="currentPage++" />
          </MpTooltip>
        </div>
      </div>
    </MpFlex>
  </MpFlex>

  <!-- Delete confirmation -->
  <MpModal :is-open="deleteModalOpen" is-centered @close="deleteModalOpen = false">
    <MpModalOverlay />
    <MpModalContent>
      <MpModalHeader>Delete assignment</MpModalHeader>
      <MpModalCloseButton @click="deleteModalOpen = false" />
      <MpModalBody>
        <MpText :class="valueText">
          Delete <strong>{{ toDelete?.name }}</strong>? This can’t be undone.
        </MpText>
      </MpModalBody>
      <MpModalFooter>
        <MpFlex gap="2" justify="flex-end">
          <MpButton variant="ghost" @click="deleteModalOpen = false">Cancel</MpButton>
          <MpButton variant="danger" @click="confirmDelete">Delete</MpButton>
        </MpFlex>
      </MpModalFooter>
    </MpModalContent>
  </MpModal>
</template>

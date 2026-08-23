<script setup lang="ts">
/**
 * PxAllFiltersDrawer — the "All filters" drawer, replicated from talenta-review's
 * DrawerAllFilters.vue (production). NOT a modal: production uses a right-side
 * drawer. Scope-based: start empty ("Add filter" → pick a scope), each added
 * scope becomes a collapsible removable multi-select (PxFilterScope). Edits are
 * held in a local draft and only committed on "Apply filter".
 *
 * Emits `apply` with { filters, scopes }; the button's active count = number of
 * scopes with ≥1 selection (computed by the parent from the applied filters).
 */
import {
  MpDrawer, MpDrawerContent, MpDrawerHeader, MpDrawerCloseButton, MpDrawerBody, MpDrawerFooter, MpDrawerOverlay,
  MpFlex, MpText, MpIcon, MpButton, MpInput,
  MpPopover, MpPopoverTrigger, MpPopoverContent, MpPopoverList, MpPopoverListItem, css,
} from '@mekari/pixel3'
import { BRANCHES, ORGANIZATIONS, JOB_LEVELS, EMPLOYMENT_TYPES } from '~/utils/talents'
import { EMPLOYEES } from '~/utils/employees'
import { GOAL_CATEGORIES } from '~/utils/goalTaxonomy'

interface ScopeItem { id: string, name: string }
interface ScopeDef {
  key: string
  label: string
  items: ScopeItem[]
  // Overrides PxFilterScope's default "Select all {{ label.toLowerCase() }}"
  // wording, and doubles as the noun used in its "Showing X of Y …" caption.
  selectAllLabel?: string
  // Show 10 items then "Load more" instead of the full list — for scopes
  // whose item count can get long (currently just Goal owner: every employee).
  paginated?: boolean
}

const toItems = (xs: string[]): ScopeItem[] => xs.map(x => ({ id: x, name: x }))
const JOB_POSITIONS = Array.from(new Set(EMPLOYEES.map(e => e.title))).sort()

// Default scope set = production goals filters: Category (the goal's own
// taxonomy, not an owner attribute — matches Goal.category, which stores the
// category LABEL e.g. 'Financial') plus employee attributes of the owner.
// Goal owner is the one scope keyed by employee id rather than an attribute
// value — its item list is every employee, not just those who currently own
// a goal, so the filter still works before any goals are assigned to them.
const DEFAULT_SCOPES: ScopeDef[] = [
  { key: 'status', label: 'Status', items: toItems(['On track', 'Off track', 'Not started']) },
  { key: 'category', label: 'Category', items: toItems(GOAL_CATEGORIES.map(c => c.label)) },
  { key: 'branch', label: 'Branch', items: toItems(BRANCHES) },
  { key: 'organization', label: 'Organization', items: toItems(ORGANIZATIONS) },
  { key: 'job_position', label: 'Job position', items: toItems(JOB_POSITIONS) },
  { key: 'job_level', label: 'Job level', items: toItems(JOB_LEVELS) },
  { key: 'employment_status', label: 'Employment status', items: toItems(EMPLOYMENT_TYPES) },
  {
    key: 'goal_owner',
    label: 'Goal owner',
    items: EMPLOYEES.map(e => ({ id: e.id, name: e.name })),
    selectAllLabel: 'employees',
    paginated: true,
  },
]

const props = withDefaults(defineProps<{
  isOpen: boolean
  appliedFilters?: Record<string, string[]>
  appliedScopes?: string[]
  scopes?: ScopeDef[]
}>(), {
  appliedFilters: () => ({}),
  appliedScopes: () => [],
  scopes: () => [],
})

const emit = defineEmits<{ close: [], apply: [payload: { filters: Record<string, string[]>, scopes: string[] }] }>()

// defineProps() can't reference DEFAULT_SCOPES directly (hoisting), so fall back here.
const effectiveScopes = computed<ScopeDef[]>(() => (props.scopes && props.scopes.length ? props.scopes : DEFAULT_SCOPES))

const form = ref<Record<string, string[]>>({})
const addedScopes = ref<string[]>([])
const searchScope = ref('')

const scopeByKey = computed(() => Object.fromEntries(effectiveScopes.value.map(s => [s.key, s])))
const hasAddedScopes = computed(() => addedScopes.value.length > 0)
const availableScopes = computed(() => {
  const q = searchScope.value.trim().toLowerCase()
  return effectiveScopes.value.filter(s => !addedScopes.value.includes(s.key) && (!q || s.label.toLowerCase().includes(q)))
})

// (Re)initialize the draft from the applied state each time the drawer opens.
watch(() => props.isOpen, (open) => {
  if (!open) return
  const f: Record<string, string[]> = {}
  for (const s of effectiveScopes.value) f[s.key] = [...(props.appliedFilters[s.key] ?? [])]
  form.value = f
  addedScopes.value = [...props.appliedScopes]
  searchScope.value = ''
}, { immediate: true })

function addScope(key: string) { if (!addedScopes.value.includes(key)) addedScopes.value = [...addedScopes.value, key] }
function removeScope(key: string) {
  addedScopes.value = addedScopes.value.filter(k => k !== key)
  form.value = { ...form.value, [key]: [] }
}
function resetAll() {
  addedScopes.value = []
  const f: Record<string, string[]> = {}
  for (const s of effectiveScopes.value) f[s.key] = []
  form.value = f
}
function applyFilter() {
  // Only emit scopes that are still added; strip selections for removed scopes.
  const filters: Record<string, string[]> = {}
  for (const key of addedScopes.value) filters[key] = [...(form.value[key] ?? [])]
  emit('apply', { filters, scopes: [...addedScopes.value] })
  emit('close')
}

const blankWrap = css({ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBlock: '2', paddingInline: '5', gap: '4' })
const blankTitle = css({ fontWeight: '600', color: 'text.default' })
const blankSub = css({ fontSize: '14px', color: 'text.secondary' })
const addBtn = css({ display: 'inline-flex', alignItems: 'center', gap: '2', width: 'fit-content', border: 'none', background: 'transparent', color: 'text.link', fontWeight: '600', fontSize: '14px', cursor: 'pointer', paddingBlock: '2' })
const popPanel = css({ width: '240px', maxHeight: '300px', display: 'flex', flexDirection: 'column', overflowY: 'auto' })
const popSearch = css({ padding: '2', borderBottom: '1px solid', borderBottomColor: 'gray.50', position: 'sticky', top: '0', background: 'background.neutral', zIndex: '1' })
const searchBox = css({ position: 'relative', '& input': { paddingLeft: '36px' } })
const searchIcon = css({ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'icon.secondary', zIndex: '1', pointerEvents: 'none' })
const footerRow = css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' })
const scopesList = css({ display: 'flex', flexDirection: 'column' })
</script>

<template>
  <ClientOnly>
  <MpDrawer id="drawer-all-filters" :is-open="isOpen" placement="right" size="md" is-keep-alive @close="emit('close')">
    <MpDrawerContent>
      <MpDrawerHeader>
        All filters
        <MpDrawerCloseButton />
      </MpDrawerHeader>
      <MpDrawerBody>
        <!-- Blank slate: no filters added yet -->
        <MpFlex v-if="!hasAddedScopes" :class="blankWrap">
          <MpIcon name="filter" :class="css({ width: '56px', height: '56px', color: 'icon.secondary' })" />
          <div :class="css({ textAlign: 'center' })">
            <MpText :class="blankTitle">No filters have been set yet</MpText>
            <MpText :class="blankSub">Your filter will be displayed here</MpText>
          </div>
        </MpFlex>

        <!-- Added scopes -->
        <div v-else :class="scopesList">
          <PxFilterScope
            v-for="key in addedScopes"
            :key="key"
            v-model="form[key]"
            :label="scopeByKey[key].label"
            :items="scopeByKey[key].items"
            :select-all-label="scopeByKey[key].selectAllLabel"
            :paginated="scopeByKey[key].paginated"
            @remove="removeScope(key)"
          />
        </div>

        <!-- Add filter -->
        <MpFlex :justify="hasAddedScopes ? 'flex-start' : 'center'" :class="css({ marginTop: '3' })">
          <MpPopover is-close-on-select use-portal :placement="hasAddedScopes ? 'bottom-start' : 'bottom'" @close="searchScope = ''">
            <MpPopoverTrigger>
              <button type="button" :class="addBtn"><MpIcon name="add" size="sm" />Add filter</button>
            </MpPopoverTrigger>
            <MpPopoverContent>
              <div :class="popPanel">
                <div :class="popSearch">
                  <div :class="searchBox">
                    <MpIcon name="search" size="sm" :class="searchIcon" />
                    <MpInput v-model="searchScope" placeholder="Search" />
                  </div>
                </div>
                <MpPopoverList>
                  <MpPopoverListItem v-for="s in availableScopes" :key="s.key" @click="addScope(s.key)">{{ s.label }}</MpPopoverListItem>
                  <MpText v-if="!availableScopes.length" :class="[blankSub, css({ paddingInline: '3', paddingBlock: '2', textAlign: 'center' })]">No filters found</MpText>
                </MpPopoverList>
              </div>
            </MpPopoverContent>
          </MpPopover>
        </MpFlex>
      </MpDrawerBody>
      <MpDrawerFooter>
        <div :class="footerRow">
          <MpButton variant="ghost" :is-disabled="!hasAddedScopes" @click="resetAll">Reset all</MpButton>
          <MpFlex gap="3">
            <MpButton variant="ghost" @click="emit('close')">Cancel</MpButton>
            <MpButton variant="primary" @click="applyFilter">Apply filter</MpButton>
          </MpFlex>
        </div>
      </MpDrawerFooter>
    </MpDrawerContent>
    <MpDrawerOverlay />
  </MpDrawer>
  </ClientOnly>
</template>

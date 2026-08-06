<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal category details
  Token mode: Pixel 2.4

  Replica of talenta-review's src/views/goals/categories/Detail.vue. Read-only
  summary of one goal category (name + status, description, sub-categories,
  last modified) with an Edit action that opens the shared category drawer,
  plus a "Linked goals" section listing the goals currently using this
  category (GoalCategoryLinkedGoals). Reached from the categories list's
  Actions → View details.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpBadge,
  MpButton,
  css,
} from '@mekari/pixel3'

definePageMeta({
  layout: 'default',
  // Title comes from the category name via the layout's goalCategoryTitleFallback.
  breadcrumb: { label: 'Goal categories', to: '/goals/goal-categories' },
})

const route = useRoute()
const { categories, categoryById, updateCategory, linkedGoalCount } = useGoalCategoriesStore()

const category = computed(() => categoryById(route.params.uuid as string))

const existingNames = computed(() => categories.value
  .filter(c => c.id !== category.value?.id)
  .map(c => c.name.toLowerCase()))

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function formatModified(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const isDrawerOpen = ref(false)
function onSave(payload: { name: string, description: string, subCategories: { id: string, name: string }[] }) {
  if (!category.value) return
  updateCategory(category.value.id, payload)
}

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const sectionH3 = css({ fontSize: '16px', fontWeight: '600', lineHeight: '24px', color: 'text.default' })
const captionText = css({ color: 'text.secondary' })
const valueText = css({ color: 'text.default', fontSize: '14px', lineHeight: '20px' })
const section = css({ display: 'flex', flexDirection: 'column', gap: '3', paddingTop: '8' })
const kvRow = css({ display: 'flex', alignItems: 'flex-start', gap: '4', paddingBlock: '1.5' })
const kvLabel = css({ width: '160px', flexShrink: '0', color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })
// Bulleted sub-category list — real <ul>/<li> with disc markers (do NOT use
// display:flex on the ul, that suppresses the list markers).
const subList = css({ margin: '0', paddingLeft: '5', listStyleType: 'disc' })
const subItem = css({ color: 'text.default', fontSize: '14px', lineHeight: '20px', marginBottom: '1', _last: { marginBottom: '0' } })
const subtitle = css({ color: 'text.secondary', fontSize: '14px', lineHeight: '20px' })
</script>

<template>
  <div v-if="category">
    <Teleport to="#page-header-actions" defer>
      <MpButton variant="secondary" left-icon="edit" @click="isDrawerOpen = true">Edit</MpButton>
    </Teleport>

    <!-- Status badge beside the page title (name) in the header bar. -->
    <Teleport to="#page-title-badge" defer>
      <MpBadge for="tableStatus" :type="category.status === 'active' ? 'completed' : 'announcement'">
        {{ category.status === 'active' ? 'Active' : 'Inactive' }}
      </MpBadge>
    </Teleport>

    <!-- Summary -->
    <section :class="[section, css({ paddingTop: '0' })]">
      <div :class="css({ display: 'flex', flexDirection: 'column' })">
        <div :class="kvRow">
          <span :class="kvLabel">Description</span>
          <span :class="valueText">{{ category.description || '-' }}</span>
        </div>
        <div :class="kvRow">
          <span :class="kvLabel">Sub-categories</span>
          <ul v-if="category.subCategories.length" :class="subList">
            <li v-for="sub in category.subCategories" :key="sub.id" :class="subItem">{{ sub.name }}</li>
          </ul>
          <span v-else :class="captionText">—</span>
        </div>
        <div :class="kvRow">
          <span :class="kvLabel">Last modified</span>
          <MpFlex direction="column" gap="0">
            <span :class="valueText">{{ formatModified(category.updatedAt) }}</span>
            <span v-if="category.updatedBy" :class="captionText">by {{ category.updatedBy }}</span>
          </MpFlex>
        </div>
      </div>
    </section>

    <!-- Linked goals -->
    <section :class="section">
      <div>
        <MpText :class="sectionH3">Linked goals ({{ linkedGoalCount(category.name) }})</MpText>
        <MpText :class="subtitle">Showing active goals currently in progress. Completed or archived goals are not included.</MpText>
      </div>
      <GoalCategoryLinkedGoals :category-name="category.name" />
    </section>

    <!-- Edit drawer -->
    <GoalCategoryFormDrawer
      v-model:is-open="isDrawerOpen"
      :category="category"
      :existing-names="existingNames"
      @save="onSave"
    />
  </div>

  <div v-else :class="css({ padding: '20', textAlign: 'center', color: 'text.secondary' })">
    Goal category not found.
  </div>
</template>

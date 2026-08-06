<script setup lang="ts">
import { MpFlex, MpText, MpTextlink, css } from '@mekari/pixel3'

type Breadcrumb = { label: string, to?: string | Record<string, unknown> }
const route = useRoute()
const router = useRouter()

// Goal cycle detail pages resolve their title from ?name= (see cycleBreadcrumb
// below for the same convention on review cycles) — but that query param
// isn't guaranteed on every navigation path into these pages (deep links,
// bookmarks, a missed router.push elsewhere). Falling back to the real
// cycle record (always resolvable from route.params.id) means the title
// never goes blank regardless of how the page was reached.
const { cycles: goalCycles } = useGoalCyclesStore()
const goalCycleTitleFallback = computed(() => {
  if (!route.path.startsWith('/goals/goal-cycles/')) return ''
  return goalCycles.value.find(c => c.id === route.params.id)?.name ?? ''
})

// Goal category detail resolves its title from the category record (by :uuid),
// same convention as goalCycleTitleFallback above — so the header shows the
// category name instead of a static "details" string.
const { categoryById } = useGoalCategoriesStore()
const goalCategoryTitleFallback = computed(() => {
  if (!route.path.startsWith('/goals/goal-categories/detail/')) return ''
  return categoryById(route.params.uuid as string)?.name ?? ''
})

const pageTitle = computed(() =>
  (route.meta.title as string) || (route.query.timeframe as string) || (route.query.name as string) || goalCycleTitleFallback.value || goalCategoryTitleFallback.value || ''
)
const breadcrumb = computed(() => (route.meta.breadcrumb as Breadcrumb | undefined))

// Boxed mode (e.g. Home dashboard): flat grey canvas with standalone stage boxes,
// instead of the default single white stage panel. Opt in via definePageMeta({ boxed: true }).
const boxed = computed(() => !!route.meta.boxed)

// Some pages (e.g. Inbox) have no page title at all — the stage should run
// flush to the top of the main column instead of leaving the 72px title bar
// empty. Opt in via definePageMeta({ noPageHeader: true }).
const noPageHeader = computed(() => !!route.meta.noPageHeader)

// Intermediate breadcrumb for nested pages (e.g. timeframe detail inside a
// review cycle, or a goal submission's review page inside a goal cycle).
// Carry ?cycleName= so this deep page can supply the intermediate label
// without colliding with whatever query param the cycle detail page itself
// reads (review cycles read ?name=+?purpose=; goal cycles read ?name=).
const cycleBreadcrumb = computed(() => {
  const name = route.query.cycleName as string | undefined
  const id = route.params.id as string | undefined
  if (!name || !id || !breadcrumb.value) return null
  if (route.path.startsWith('/goals/goal-cycles/')) {
    return { label: name, to: { path: `/goals/goal-cycles/${id}`, query: { name } } }
  }
  return {
    label: name,
    to: {
      path: `/reviews/review-cycles/${id}`,
      query: { name, purpose: (route.query.purpose as string) || 'evaluation' },
    },
  }
})
</script>

<template>
  <MpFlex direction="column" height="100vh" background="background.surface">
    <AppHeader />

    <MpFlex flex="1" minHeight="0">
      <AppSidebar />

      <MpFlex
        as="main"
        direction="column"
        flex="1"
        minWidth="0"
        overflowY="auto"
        :style="boxed ? { background: 'var(--mp-colors-background)' } : undefined"
      >
        <template v-if="!noPageHeader">
          <MpFlex
            align="center"
            justify="space-between"
            gap="4"
            height="72px"
            paddingInline="6"
            flexShrink="0"
          >
            <MpFlex direction="column" gap="0" justify="center">
              <MpFlex v-if="breadcrumb" align="center" gap="1">
                <MpTextlink
                  as="button"
                  size="small"
                  @click="breadcrumb.to && router.push(breadcrumb.to)"
                >
                  {{ breadcrumb.label }}
                </MpTextlink>
                <template v-if="cycleBreadcrumb">
                  <MpText size="label-small" :class="css({ color: 'text.secondary' })">/</MpText>
                  <MpTextlink
                    as="button"
                    size="small"
                    @click="cycleBreadcrumb.to && router.push(cycleBreadcrumb.to)"
                  >
                    {{ cycleBreadcrumb.label }}
                  </MpTextlink>
                </template>
              </MpFlex>
              <MpFlex align="center" gap="2">
                <MpText as="h1" size="h1" weight="semiBold" color="text.default">
                  {{ pageTitle }}
                </MpText>
                <!-- Optional status badge beside the title. Pages inject via
                     <Teleport to="#page-title-badge">. -->
                <div id="page-title-badge" :class="css({ display: 'flex', alignItems: 'center' })" />
              </MpFlex>
            </MpFlex>
            <div
              id="page-header-actions"
              :class="css({ display: 'flex', alignItems: 'center', gap: '3' })"
            />
          </MpFlex>

          <!-- Tabs zone: outside the stage, below page title. Use <Teleport to="#page-tabs"> from pages. -->
          <div
            id="page-tabs"
            :class="css({
              display: 'flex',
              alignItems: 'flex-end',
              paddingInline: '6',
              flexShrink: '0',
              background: 'background.surface',
            })"
          />
        </template>

        <MpFlex
          direction="column"
          flex="1"
          :minHeight="boxed ? '0' : undefined"
          :background="boxed ? undefined : 'background.neutral'"
          :paddingInline="boxed ? '0' : '6'"
          :paddingBlock="boxed ? '0' : '6'"
          :borderTopLeftRadius="boxed ? undefined : 'md'"
          :borderTop="boxed ? undefined : '1px solid'"
          :borderTopColor="boxed ? undefined : 'border.default'"
          :borderLeft="boxed ? undefined : '1px solid'"
          :borderLeftColor="boxed ? undefined : 'border.default'"
        >
          <slot />
        </MpFlex>
      </MpFlex>
    </MpFlex>
  </MpFlex>
</template>

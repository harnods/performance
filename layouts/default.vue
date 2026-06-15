<script setup lang="ts">
import { MpFlex, MpText, MpTextlink, css } from '@mekari/pixel3'

type Breadcrumb = { label: string, to?: string | Record<string, unknown> }
const route = useRoute()
const router = useRouter()
const pageTitle = computed(() =>
  (route.meta.title as string) || (route.query.timeframe as string) || (route.query.name as string) || ''
)
const breadcrumb = computed(() => (route.meta.breadcrumb as Breadcrumb | undefined))

// Intermediate breadcrumb for nested pages (e.g. timeframe detail inside a cycle).
// Carry name + purpose so the cycle detail page resolves the right cycle (it reads
// ?name= and ?purpose=, not the route param).
const cycleBreadcrumb = computed(() => {
  const name = route.query.cycleName as string | undefined
  const id = route.params.id as string | undefined
  if (!name || !id || !breadcrumb.value) return null
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

      <MpFlex as="main" direction="column" flex="1" minWidth="0" overflowY="auto">
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
            <MpText as="h1" size="h1" weight="semiBold" color="text.default">
              {{ pageTitle }}
            </MpText>
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

        <MpFlex
          direction="column"
          flex="1"
          background="background.neutral"
          paddingInline="6"
          paddingBlock="6"
          borderTopLeftRadius="md"
          borderTop="1px solid"
          borderTopColor="border.default"
          borderLeft="1px solid"
          borderLeftColor="border.default"
        >
          <slot />
        </MpFlex>
      </MpFlex>
    </MpFlex>
  </MpFlex>
</template>

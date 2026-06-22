<script setup lang="ts">
import { MpFlex, MpText, MpTextlink, css } from '@mekari/pixel3'

type Breadcrumb = { label: string, to?: string }
const route = useRoute()
const router = useRouter()
const pageTitle = computed(() => (route.meta.title as string) || (route.query.name as string) || '')
const breadcrumb = computed(() => (route.meta.breadcrumb as Breadcrumb | undefined))
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
            <MpTextlink
              v-if="breadcrumb"
              as="button"
              size="small"
              @click="breadcrumb.to && router.push(breadcrumb.to)"
            >
              {{ breadcrumb.label }}
            </MpTextlink>
            <MpText as="h1" size="h1" weight="semiBold" color="text.default">
              {{ pageTitle }}
            </MpText>
          </MpFlex>
          <div
            id="page-header-actions"
            :class="css({ display: 'flex', alignItems: 'center', gap: '3' })"
          />
        </MpFlex>

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

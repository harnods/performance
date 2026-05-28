<script setup lang="ts">
import { MpFlex, MpText } from '@mekari/pixel3'

const route = useRoute()
const pageTitle = computed(() => (route.meta.title as string) || '')
</script>

<template>
  <MpFlex direction="column" height="100vh" background="background.surface">
    <AppHeader />

    <MpFlex flex="1" minHeight="0">
      <AppSidebar />

      <MpFlex as="main" direction="column" flex="1" minWidth="0">
        <MpFlex align="center" height="72px" paddingInline="6" flexShrink="0">
          <MpText as="h1" size="h1" weight="semiBold" color="text.default">
            {{ pageTitle }}
          </MpText>
        </MpFlex>

        <MpFlex
          direction="column"
          flex="1"
          overflowY="auto"
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

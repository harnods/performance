<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { MpButton, MpText, css } from '@mekari/pixel3'

// Auth0 redirects here after login. The SDK exchanges the `code`/`state` query params
// for a session automatically on mount — we just wait for isLoading to settle, then
// route to wherever the user was headed.
definePageMeta({ layout: 'blank' })

const router = useRouter()
const { isLoading, error, isAuthenticated } = useAuth0()
const authError = ref<string | null>(null)

watch(
  isLoading,
  (loading) => {
    if (loading) return
    if (error.value) {
      // For a whitelist denial, this is the exact message set via api.access.deny(...)
      // in the Auth0 Post-Login Action — Auth0 passes it back as error_description.
      authError.value = error.value.message || 'Your account is not allowed to access this application.'
      return
    }
    router.replace(isAuthenticated.value ? '/' : '/login')
  },
  { immediate: true },
)
</script>

<template>
  <div
    :class="css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minH: '100vh',
      bg: 'background.surface',
    })"
  >
    <div
      :class="css({
        display: 'flex',
        flexDir: 'column',
        alignItems: 'center',
        gap: '3',
        bg: 'background.stage',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: '12px',
        p: '10',
        w: '400px',
        shadow: 'md',
      })"
    >
      <MpText size="h2" weight="semiBold" color="text.default">Talenta Performance</MpText>
      <MpText v-if="!authError" size="label-small" color="text.secondary">Signing you in…</MpText>
      <template v-else>
        <MpText size="label-small" color="text.danger">{{ authError }}</MpText>
        <MpButton variant="secondary" @click="router.replace('/login')">Back to login</MpButton>
      </template>
    </div>
  </div>
</template>

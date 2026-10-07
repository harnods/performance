<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { MpButton, MpIcon, MpText, css } from '@mekari/pixel3'

definePageMeta({ layout: 'blank' })

const config = useRuntimeConfig()
const router = useRouter()

// Mirrors the guard in plugins/auth0.client.ts — if either env var is missing, or the
// page isn't on a secure origin (HTTPS/localhost), the plugin never registered Auth0, so
// useAuth0() below would throw. Falls back to the "not configured" message instead.
const useAuth0Login
  = !!(config.public.auth0Domain && config.public.auth0ClientId)
    && typeof window !== 'undefined'
    && window.isSecureContext
const auth0Error = ref<string | null>(null)

let signInWithGoogle: () => void = () => {}

if (useAuth0Login) {
  const {
    loginWithRedirect,
    isLoading: auth0Loading,
    isAuthenticated: auth0Authenticated,
    error: auth0SdkError,
  } = useAuth0()

  watch(
    auth0Loading,
    (loading) => {
      if (loading) return
      if (auth0SdkError.value) {
        // For a whitelist denial, this is the exact message set via api.access.deny(...)
        // in the Auth0 Post-Login Action — Auth0 passes it back as error_description.
        auth0Error.value
          = auth0SdkError.value.message || 'Your account is not allowed to access this application.'
        return
      }
      if (auth0Authenticated.value) router.replace('/')
    },
    { immediate: true },
  )

  signInWithGoogle = () =>
    loginWithRedirect({ authorizationParams: { connection: 'google-oauth2' } })
}
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
        gap: '8',
        bg: 'background.stage',
        border: '1px solid',
        borderColor: 'border.default',
        borderRadius: '12px',
        p: '10',
        w: '400px',
        shadow: 'md',
      })"
    >
      <div :class="css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '1' })">
        <MpText size="h2" weight="semiBold" color="text.default">Talenta Performance</MpText>
        <MpText size="label" color="text.secondary">Sign in to access the prototype</MpText>
      </div>

      <div
        v-if="useAuth0Login"
        :class="css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '3', w: 'full' })"
      >
        <MpButton variant="primary" :class="css({ w: 'full' })" @click="signInWithGoogle">
          Sign in with Google
        </MpButton>
        <MpText v-if="auth0Error" size="label-small" color="text.danger">{{ auth0Error }}</MpText>
      </div>
      <div v-else :class="css({ display: 'flex', flexDir: 'column', alignItems: 'center', gap: '2' })">
        <MpText size="label-small" color="text.danger">Auth0 is not configured yet.</MpText>
        <MpText size="label-small" color="text.secondary">
          Set <code>NUXT_PUBLIC_AUTH0_DOMAIN</code> and <code>NUXT_PUBLIC_AUTH0_CLIENT_ID</code> in your
          <code>.env</code> file.
        </MpText>
      </div>

      <div :class="css({ display: 'flex', alignItems: 'center', gap: '1' })">
        <MpIcon name="security" size="sm" :class="css({ color: 'icon.default' })" />
        <MpText size="label-small" color="text.secondary">For internal use only</MpText>
      </div>
    </div>
  </div>
</template>

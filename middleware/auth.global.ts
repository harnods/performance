import { useAuth0 } from '@auth0/auth0-vue'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login' || to.path === '/callback') return
  if (!import.meta.client) return

  const config = useRuntimeConfig()

  // Local dev convenience — skip auth entirely under `npm run dev`, opt-in via
  // NUXT_PUBLIC_SKIP_AUTH_LOCAL=true in .env. The import.meta.dev check is a build-time
  // constant (false in `npm run build` / `npm run preview`), so this can never leak into
  // a deployed build no matter how that env var is set.
  if (import.meta.dev && config.public.skipAuthLocal) return

  // Mirrors the guard in plugins/auth0.client.ts — if either env var is missing, or the
  // page isn't on a secure origin (HTTPS/localhost), the plugin never registered Auth0,
  // so calling useAuth0() below would throw. Send to /login, which shows a
  // "not configured" message.
  const useAuth0Login = !!(config.public.auth0Domain && config.public.auth0ClientId) && window.isSecureContext
  if (!useAuth0Login) return navigateTo('/login')

  const { isAuthenticated, isLoading } = useAuth0()

  // The SDK does an async check on boot (isLoading starts true) — wait for it to settle
  // before deciding, otherwise every hard refresh flash-redirects to /login.
  if (isLoading.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(isLoading, (loading) => {
        if (!loading) {
          stop()
          resolve()
        }
      })
    })
  }

  if (isAuthenticated.value) return

  return navigateTo('/login')
})

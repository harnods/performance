import { createAuth0 } from '@auth0/auth0-vue'

// Registers the Auth0 SDK on the Vue app. Only activates when both env vars are set —
// if either is blank, this plugin no-ops and middleware/auth.global.ts sends users to
// /login, which shows a "not configured" message.
//
// Also requires a secure context (HTTPS, or localhost): auth0-spa-js throws
// "auth0-spa-js must run on a secure origin" if window.crypto.subtle isn't available,
// which happens when the app is reachable over plain HTTP (e.g. ingress is up but TLS
// isn't provisioned yet). Without this guard that throw happens during app boot and
// takes the whole SPA down with it.
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const domain = config.public.auth0Domain as string
  const clientId = config.public.auth0ClientId as string

  if (!domain || !clientId) return
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    console.error('[auth0] Skipping init: not a secure context (page loaded over HTTP, not HTTPS).')
    return
  }

  try {
    const auth0 = createAuth0({
      domain,
      clientId,
      authorizationParams: {
        redirect_uri: typeof window !== 'undefined' ? `${window.location.origin}/callback` : undefined,
      },
      // Persist the session across reloads via a real refresh token instead of relying on
      // an in-memory cache + silent-auth iframe, which breaks in browsers that block
      // third-party cookies (Safari, Brave, and increasingly Chrome).
      useRefreshTokens: true,
      cacheLocation: 'localstorage',
    })

    nuxtApp.vueApp.use(auth0)
  } catch (err) {
    // Any other init failure should degrade to the "not configured" login screen
    // rather than crash the whole app.
    console.error('[auth0] Failed to initialize:', err)
  }
})

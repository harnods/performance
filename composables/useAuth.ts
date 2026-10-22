import { useAuth0 } from '@auth0/auth0-vue'

export function useAuth() {
  const config = useRuntimeConfig()
  // Mirrors the guard in plugins/auth0.client.ts — an insecure origin or missing env vars
  // mean the plugin never registered Auth0, so useAuth0() below would throw.
  const useAuth0Login
    = !!(config.public.auth0Domain && config.public.auth0ClientId)
      && (typeof window === 'undefined' || window.isSecureContext)

  let auth0Logout: (() => void) | null = null
  if (useAuth0Login && import.meta.client) {
    try {
      const { logout } = useAuth0()
      auth0Logout = () => logout({ logoutParams: { returnTo: `${window.location.origin}/login` } })
    }
    catch {
      auth0Logout = null
    }
  }

  function signOut() {
    if (auth0Logout) {
      // Redirects the browser to Auth0's logout endpoint, then back to /login —
      // do not also navigateTo here, the page is leaving anyway.
      auth0Logout()
      return
    }
    navigateTo('/login')
  }

  return { signOut }
}

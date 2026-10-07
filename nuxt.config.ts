export default defineNuxtConfig({
  // Auth0 login is client-side only (SPA flow) — with SSR on, protected pages would be
  // rendered before the client-side login redirect.
  ssr: false,
  compatibilityDate: '2025-05-28',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  // components/demo/ is demo-only (coachmarks + dev tools): never auto-imported,
  // so product components can't reference it by accident. app.vue imports
  // DemoLayer explicitly. See docs/patterns/dev-scenario-control.md.
  components: [{ path: '~/components', ignore: ['demo/**'] }],
  runtimeConfig: {
    public: {
      // Demo affordances on/off (NUXT_PUBLIC_DEMO_MODE=false to hide).
      demoMode: true,
      // Auth0 — set NUXT_PUBLIC_AUTH0_DOMAIN / NUXT_PUBLIC_AUTH0_CLIENT_ID in .env locally,
      // and as Bitbucket deployment variables in CI (passed to the Dockerfile as build args).
      auth0Domain: process.env.NUXT_PUBLIC_AUTH0_DOMAIN || '',
      auth0ClientId: process.env.NUXT_PUBLIC_AUTH0_CLIENT_ID || '',
      // Dev-only convenience — must be exactly "true" to skip login under `npm run dev`.
      // Stripped from production builds via the import.meta.dev check in
      // middleware/auth.global.ts, regardless of how this env var is set.
      skipAuthLocal: process.env.NUXT_PUBLIC_SKIP_AUTH_LOCAL === 'true',
    },
  },
  routeRules: {
    '/reviews': { redirect: '/reviews/pending-actions' },
    '/goals': { redirect: '/goals/individual-goals' },
    '/talents': { redirect: '/talents/talent-directory' },
    '/settings': { redirect: '/settings/manage-users' },
  },
  postcss: {
    plugins: {
      '@mekari/pixel3-postcss': {
        include: [
          './pages/**/*.{js,ts,vue}',
          './components/**/*.{js,ts,vue}',
          './layouts/**/*.{js,ts,vue}',
          './app.vue',
        ],
      },
    },
  },
  app: {
    head: {
      title: 'Talenta Performance',
      htmlAttrs: {
        'data-panda-theme': 'next',
      },
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
        },
      ],
    },
  },
})

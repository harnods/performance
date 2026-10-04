export default defineNuxtConfig({
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

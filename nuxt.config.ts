export default defineNuxtConfig({
  build: { transpile: ['@ds/proto-review'] },
  compatibilityDate: '2025-05-28',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
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

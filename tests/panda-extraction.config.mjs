// Mirrors the config @mekari/pixel3-postcss generates (nuxt.config.ts `include`),
// used only by tests/panda-extraction.test.ts.
export default {
  presets: ['@mekari/pixel3-theme'],
  include: ['./components/**/*.vue', './pages/**/*.vue', './layouts/**/*.vue', './app.vue'],
  prefix: 'mp',
  jsxFramework: 'vue',
  jsxFactory: 'Pixel',
  jsxStyleProps: 'all',
}

import { PixelPlugin } from '@mekari/pixel3'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PixelPlugin, { toastManager: true })
})

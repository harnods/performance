import { createProtoReview } from '@ds/proto-review'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(
    createProtoReview({
      // Shared Supabase project used by all proto-review prototypes.
      // Override these if you want a dedicated Supabase project instead.
      supabaseUrl: 'https://qrthwxfszucewlezpqoo.supabase.co',
      supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydGh3eGZzenVjZXdsZXpwcW9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MDMyMzksImV4cCI6MjA5ODQ3OTIzOX0.NsoOjiwIRyRNHPjwSjF9A0Kcq7iWrntb-5RiUfLLUds',
      projectId: 'talenta-performance', // TODO: confirm this is unique among your prototypes
      showLauncher: true, // no user menu wired — floating button shows the toggle
    })
  )
})

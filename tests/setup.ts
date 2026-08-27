// Global test setup — stubs the Nuxt auto-imports that the Goals-module
// composables rely on at MODULE SCOPE, so importing them in a plain Node
// (vitest environment: 'node') context doesn't throw ReferenceError.
//
// Only the composable stores need this (useGoalsStore / useGoalCyclesStore /
// useGoalApprovalsStore / useGoalRequestBatchStore create `ref`/`computed`
// singletons the moment they're imported, and call `useCurrentUser()` inside
// their function bodies). The pure util files (goalRows, goalFilters,
// goalMapping, goalDraft, periodPicker) don't need any of this.
//
// `import.meta.client` is left undefined (the Node default), which makes every
// store's persist()/loadFromStorage() a no-op — so the stores run purely from
// their in-memory seed(), no localStorage required.
import { computed, reactive, ref, watch } from 'vue'

const g = globalThis as unknown as Record<string, unknown>

g.ref = ref
g.computed = computed
g.reactive = reactive
g.watch = watch

// A single shared persona ref so a test can flip "who is logged in" and have
// already-captured store computeds react to it (mirrors the real singleton).
const testUserId = ref<string>('rizal')
g.__setTestUser = (id: string) => { testUserId.value = id }
g.useCurrentUser = () => ({
  currentUserId: testUserId,
  setCurrentUser: (id: string) => { testUserId.value = id },
})

// ─── DEMO ONLY — do not port to talenta-review / production ───
import { computed, ref } from 'vue'

// Dev-only coachmarks that flag where the prototype differs from production
// (docs/patterns/dev-scenario-control.md). Module-scope singleton so the dev
// tools panel and every <DevCoachmark> share state. In-memory only: never
// persisted beside the mini-DB data, so a reload shows every coachmark again.
const isEnabled = ref(true)
const hiddenIds = ref<Set<string>>(new Set())

export function useDevCoachmarks() {
  const isVisible = (id: string) => isEnabled.value && !hiddenIds.value.has(id)
  function hide(id: string) {
    hiddenIds.value = new Set([...hiddenIds.value, id])
  }
  // Brings every hidden coachmark back (and turns them on if switched off).
  function reset() {
    hiddenIds.value = new Set()
    isEnabled.value = true
  }
  const hiddenCount = computed(() => hiddenIds.value.size)
  return { isEnabled, isVisible, hide, reset, hiddenCount }
}

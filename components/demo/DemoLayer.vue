<script setup lang="ts">
/*
  ─── DEMO ONLY — do not port to talenta-review / production ─────────────────
  Mounted once in app.vue (behind runtimeConfig.public.demoMode). Attaches the
  "what's new vs production" pulses to existing product elements and shows the
  dev tools FAB on pages that have coachmarks. Product components contain no
  demo code; deleting components/demo/ + the app.vue line removes it all.
*/
import DevCoachmark from './DevCoachmark.vue'
import IdpDevTools from './IdpDevTools.vue'
import EvaluationCycleDevTools from './EvaluationCycleDevTools.vue'
import { COACHMARKS, type CoachmarkDef } from './coachmarks'

const route = useRoute()
const active = computed(() => COACHMARKS.filter(c => c.route.test(route.path) && (c.when?.(route) ?? true)))
// Each module brings its own dev tools panel; IDP's is the default.
const isEvaluationCycle = computed(() => route.path.startsWith('/reviews/review-cycles'))

// id → host <span> appended inside the anchor element.
const hosts = shallowRef(new Map<string, HTMLElement>())

function scan() {
  const next = new Map<string, HTMLElement>()
  for (const def of active.value) {
    const anchor = def.find()
    if (!anchor) continue
    let host = anchor.querySelector<HTMLElement>(`:scope > [data-demo-coachmark="${def.id}"]`)
    if (!host) {
      host = document.createElement('span')
      host.dataset.demoCoachmark = def.id
      host.style.display = 'inline'
      anchor.appendChild(host)
    }
    next.set(def.id, host)
  }
  // Drop hosts left behind on anchors that are still mounted but no longer match.
  for (const [id, el] of hosts.value) if (!next.has(id) && el.isConnected) el.remove()
  const changed = next.size !== hosts.value.size || [...next].some(([id, el]) => hosts.value.get(id) !== el)
  if (changed) hosts.value = next
}

// Tables, drawers and modals mount later, so rescan on DOM changes (one per frame).
let frame = 0
function queueScan() {
  if (frame) return
  frame = requestAnimationFrame(() => { frame = 0; scan() })
}
let observer: MutationObserver | undefined
onMounted(() => {
  observer = new MutationObserver(queueScan)
  observer.observe(document.body, { childList: true, subtree: true })
  queueScan()
})
onBeforeUnmount(() => { observer?.disconnect(); cancelAnimationFrame(frame) })
watch(() => route.fullPath, queueScan)

const mounted = computed(() => active.value.filter(d => hosts.value.has(d.id)) as CoachmarkDef[])
</script>

<template>
  <div>
    <Teleport v-for="def in mounted" :key="def.id" :to="hosts.get(def.id)">
      <DevCoachmark :id="def.id" :title="def.title" :description="def.description" :placement="def.placement" />
    </Teleport>
    <EvaluationCycleDevTools v-if="active.length && isEvaluationCycle" />
    <IdpDevTools v-else-if="active.length" />
  </div>
</template>

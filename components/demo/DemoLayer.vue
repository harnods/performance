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
import IdpListDevTools from './IdpListDevTools.vue'
import EvaluationCycleDevTools from './EvaluationCycleDevTools.vue'
import RolesFormDevTools from './RolesFormDevTools.vue'
import { COACHMARKS, type CoachmarkDef } from './coachmarks'
import { css } from '@mekari/pixel3'

const route = useRoute()
const isIdpList = computed(() => /^\/talents\/idps\/?$/.test(route.path))
const active = computed(() => COACHMARKS.filter(c => c.route.test(route.path) && (c.when?.(route) ?? true)))
// Each module brings its own dev tools panel; IDP's is the default.
const isEvaluationCycle = computed(() => route.path.startsWith('/reviews/review-cycles'))
// Add / Edit role: one panel with the Version 1 / 2 switch + coachmarks (shown even with no pulses, for the switch).
const isRoleForm = computed(() => /^\/settings\/manage-users\/roles\/(add|edit)/.test(route.path))

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
      // Out-of-flow, zero-size host at its static spot (right after the text): the pulse never adds
      // width, height or a stray space to the anchor (demo only, layout untouched).
      Object.assign(host.style, { display: 'inline', position: 'absolute', width: '0', height: '0' })
      if (def.corner) {
        // Out of the anchor's flow: no layout shift for its siblings.
        if (getComputedStyle(anchor).position === 'static') (anchor as HTMLElement).style.position = 'relative'
        Object.assign(host.style, { position: 'absolute', top: '-8px', right: '-8px', zIndex: '2', width: '16px', height: '16px' })
      }
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

// Inline pulses float just past the anchor's text, centred on the line, out of flow.
const floating = css({ position: 'absolute', left: '4px', top: '2px', display: 'block', whiteSpace: 'nowrap' })

const mounted = computed(() => active.value.filter(d => hosts.value.has(d.id)) as CoachmarkDef[])
</script>

<template>
  <div>
    <Teleport v-for="def in mounted" :key="def.id" :to="hosts.get(def.id)">
      <span :class="def.corner ? undefined : floating">
        <DevCoachmark :id="def.id" :title="def.title" :description="def.description" :placement="def.placement" />
      </span>
    </Teleport>
    <RolesFormDevTools v-if="isRoleForm" />
    <EvaluationCycleDevTools v-else-if="active.length && isEvaluationCycle" />
    <IdpListDevTools v-else-if="isIdpList" />
    <IdpDevTools v-else-if="active.length" />
  </div>
</template>

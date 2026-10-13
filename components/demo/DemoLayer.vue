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

const route = useRoute()
const isIdpList = computed(() => /^\/talents\/idps\/?$/.test(route.path))
const active = computed(() => COACHMARKS.filter(c => c.route.test(route.path) && (c.when?.(route) ?? true)))
// Each module brings its own dev tools panel; IDP's is the default.
const isEvaluationCycle = computed(() => route.path.startsWith('/reviews/review-cycles'))
// Add / Edit role: one panel with the Version 1 / 2 switch + coachmarks (shown even with no pulses, for the switch).
const isRoleForm = computed(() => /^\/settings\/manage-users\/roles\/(add|edit)/.test(route.path))

// id → host <span> appended inside the anchor element.
const hosts = shallowRef(new Map<string, HTMLElement>())

// A pulse must never change the size or layout of what it marks, and must stay glued to it while the
// page scrolls: the host is out of flow (`position: absolute`) inside the anchor, which becomes the
// containing block (`position: relative`), so it scrolls and clips with the anchor.
//  - corner: overlaps the anchor's top-right corner (buttons, fields: anything with its own box).
//  - default: just after the end of the anchor's last line of text, centred on that line. Measured,
//    not left to the browser's "static position": in a flex label (every MpFormLabel) that lands at
//    the container's left edge and covers the first letters of the label.
//  - table cells (th / td) are the exception: a positioned cell in a border-collapse table paints its
//    background over its own collapsed border (the header lost its bottom border). So the cell is
//    left unpositioned and the zero-size host sits at its static spot, right after the cell's text
//    (a cell is block flow, so the static position is correct there), nudged 4px right / 2px down.
const PULSE = 16
const isTableCell = (el: Element) => getComputedStyle(el).display === 'table-cell'
function placeHost(host: HTMLElement, anchor: Element, corner: boolean) {
  if (!corner && isTableCell(anchor)) {
    Object.assign(host.style, { display: 'inline', width: '0', height: '0', top: 'auto', left: 'auto', right: 'auto', marginLeft: '4px', marginTop: '2px', zIndex: 'auto' })
    return
  }
  if (corner) {
    Object.assign(host.style, { top: '-8px', right: '-8px', left: 'auto', zIndex: '2' })
    return
  }
  const kids = [...anchor.childNodes].filter(n => n !== host)
  let last: DOMRect | undefined
  if (kids.length) {
    const range = document.createRange()
    range.setStartBefore(kids[0])
    range.setEndAfter(kids[kids.length - 1])
    last = [...range.getClientRects()].filter(r => r.width > 0 && r.height > 0).pop()
  }
  const box = anchor.getBoundingClientRect()
  if (!last) { Object.assign(host.style, { top: '-8px', right: '-8px', left: 'auto', zIndex: '2' }); return }
  // Never clamp into the anchor's box: a content-width anchor (a label in a flex row) would push the
  // dot back over its own last letters. Out of flow, so sitting past the box changes no layout.
  const left = last.right - box.left + 4
  Object.assign(host.style, { top: `${Math.round(last.top - box.top + (last.height - PULSE) / 2)}px`, left: `${Math.round(left)}px`, right: 'auto', zIndex: 'auto' })
}

function scan() {
  const next = new Map<string, HTMLElement>()
  for (const def of active.value) {
    const anchor = def.find()
    if (!anchor) continue
    let host = anchor.querySelector<HTMLElement>(`:scope > [data-demo-coachmark="${def.id}"]`)
    if (!host) {
      host = document.createElement('span')
      host.dataset.demoCoachmark = def.id
      if (getComputedStyle(anchor).position === 'static' && (def.corner || !isTableCell(anchor))) (anchor as HTMLElement).style.position = 'relative'
      Object.assign(host.style, { position: 'absolute', display: 'block', width: `${PULSE}px`, height: `${PULSE}px`, lineHeight: '0' })
      anchor.appendChild(host)
    }
    placeHost(host, anchor, !!def.corner)
    sizeObserver?.observe(anchor)
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
// An anchor can change size without any DOM mutation (e.g. a label moved into a flex row narrows
// when a sibling link appears or goes): re-place its pulse when it resizes.
let sizeObserver: ResizeObserver | undefined
onMounted(() => {
  observer = new MutationObserver(queueScan)
  if (typeof ResizeObserver !== 'undefined') sizeObserver = new ResizeObserver(queueScan)
  observer.observe(document.body, { childList: true, subtree: true })
  window.addEventListener('resize', queueScan) // text may re-wrap, moving where a line ends
  queueScan()
})
onBeforeUnmount(() => { observer?.disconnect(); sizeObserver?.disconnect(); window.removeEventListener('resize', queueScan); cancelAnimationFrame(frame) })
watch(() => route.fullPath, queueScan)

const mounted = computed(() => active.value.filter(d => hosts.value.has(d.id)) as CoachmarkDef[])
</script>

<template>
  <div>
    <Teleport v-for="def in mounted" :key="def.id" :to="hosts.get(def.id)">
      <DevCoachmark :id="def.id" :title="def.title" :description="def.description" :placement="def.placement" />
    </Teleport>
    <RolesFormDevTools v-if="isRoleForm" />
    <EvaluationCycleDevTools v-else-if="active.length && isEvaluationCycle" />
    <IdpListDevTools v-else-if="isIdpList" />
    <IdpDevTools v-else-if="active.length" />
  </div>
</template>

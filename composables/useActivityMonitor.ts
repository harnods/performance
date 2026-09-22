// ─────────────────────────────────────────────────────────────────────────────
// Activity monitor — the header-bar process tray (Import / Download) that tracks
// long-running background jobs. Used by the competency "Upload results" flow:
// pressing "Process upload" registers an import job here, and the header monitor
// shows it progressing to completion. Module-scope singleton (same shape as the
// mini-DB stores) so any page can add a job and the header reflects it.
// ─────────────────────────────────────────────────────────────────────────────

export type MonitorKind = 'import' | 'download'
export type MonitorStatus = 'processing' | 'completed'

export interface MonitorProcess {
  id: string
  kind: MonitorKind
  fileName: string
  status: MonitorStatus
  progress: number // 0–100
}

const processes = ref<MonitorProcess[]>([])
// Bumped whenever a new job wants the header monitor popover opened, so the
// header can react (open it) without the caller reaching into the header.
const openSignal = ref(0)
// Which tab the header should show when it opens (set by the job that asked).
const requestedTab = ref<MonitorKind>('import')
let seq = 0

// Simulated background progress so the monitor visibly ticks to done — this is a
// prototype (no real upload backend), same "fire the job, don't block" shape a
// real per-job poller would use.
function simulate(id: string) {
  const timer = setInterval(() => {
    const cur = processes.value.find(p => p.id === id)
    if (!cur) { clearInterval(timer); return }
    const next = Math.min(100, cur.progress + 20)
    processes.value = processes.value.map(p => (p.id === id ? { ...p, progress: next, status: next >= 100 ? 'completed' : 'processing' } : p))
    if (next >= 100) clearInterval(timer)
  }, 900)
}

export function useActivityMonitor() {
  function add(kind: MonitorKind, fileName: string): MonitorProcess {
    const proc: MonitorProcess = { id: `${kind}-${++seq}`, kind, fileName, status: 'processing', progress: 0 }
    processes.value = [proc, ...processes.value]
    if (import.meta.client) simulate(proc.id)
    // Surface the monitor immediately, on the matching tab, so the user sees it.
    requestedTab.value = kind
    openSignal.value++
    return proc
  }
  // Upload results → an import job. Generate template → a download job (the
  // finished template is then downloadable straight from the monitor).
  function addImport(fileName: string) { return add('import', fileName) }
  function addDownload(fileName: string) { return add('download', fileName) }
  function clear(kind: MonitorKind) { processes.value = processes.value.filter(p => p.kind !== kind) }
  function clearAll() { processes.value = [] }

  const importProcesses = computed(() => processes.value.filter(p => p.kind === 'import'))
  const downloadProcesses = computed(() => processes.value.filter(p => p.kind === 'download'))
  const activeCount = computed(() => processes.value.filter(p => p.status === 'processing').length)
  const hasAny = computed(() => processes.value.length > 0)

  return { processes, importProcesses, downloadProcesses, activeCount, hasAny, openSignal, requestedTab, addImport, addDownload, clear, clearAll }
}

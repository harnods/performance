// ─────────────────────────────────────────────────────────────────────────────
// Goal comments mini-DB — the discussion thread shown on the goal detail page
// (pages/goals/goal-cycles/[id]/goals/[goalId].vue), replicating production's
// goal activity/comments panel.
//
// Comments are keyed by Goal.id and persisted to localStorage so a posted
// comment survives a reload (same pattern as useGoalsStore). Only the demo
// revenue goal (h2-rc-06) ships with a seeded 3-comment thread — mentions,
// a reply, and a file attachment — matching the Goals Figma. Every other goal
// starts with an empty thread; posting adds a "Just now" comment from the
// current user to the top.
// ─────────────────────────────────────────────────────────────────────────────

export interface GoalCommentAttachment {
  name: string
  sizeLabel: string // preformatted, e.g. "128 KB"
}

export interface GoalComment {
  id: string
  authorId: string // Employee.id from ~/utils/employees
  body: string
  // Preformatted display label (relative for fresh comments — "Just now",
  // "5 hrs ago" — absolute once older, "1 Nov 2025, 15:00"). Kept as a string
  // so the demo thread reads exactly like the design without a clock.
  createdLabel: string
  attachment?: GoalCommentAttachment
}

const STORAGE_KEY = 'talenta-goal-comments-db'
const SEED_VERSION = 2

// ── Deterministic seeded threads ────────────────────────────────────────────
// Beyond the hand-authored h2-rc-06 thread, a stable spread of goals (~40%,
// picked by a hash of the goal id so it's the same set every reload) each get a
// 1–3 comment thread. Both H1 ids (lowercased code, e.g. "rc-01") and H2 ids
// ("h2-" + that) are candidates, so the spread covers both cycles. Nothing is
// random or clock-based.
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// A stronger avalanche mix so the "does this goal get a thread?" gate spreads
// evenly across both the H1 ("rc-01") and H2 ("h2-rc-01") id namespaces — the
// raw hash alone skews the "h2-"-prefixed ids high.
function mix(h: number): number {
  h = Math.imul(h ^ (h >>> 15), 0x85EBCA6B)
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35)
  return (h ^ (h >>> 16)) >>> 0
}

// [prefix, count] — mirrors the 99 goal codes in useGoalsStore (RC-01..13, …).
const CODE_GROUPS: [string, number][] = [
  ['rc', 13], ['eb', 9], ['rp', 8], ['af', 7], ['ai', 9], ['bf', 9],
  ['ap', 9], ['ca', 8], ['dd', 9], ['jt', 9], ['es', 9],
]

const COMMENT_AUTHORS = ['rizal', 'rio', 'ali', 'bayu', 'andi', 'cinta', 'evelyn', 'eka', 'daud', 'jessie', 'santi', 'alfian', 'indah', 'fajar', 'galih']

const COMMENT_BODIES = [
  `Ok pak, saya update progress minggu ini.`,
  `Nice progress, keep it up! 🙌`,
  `Boleh dibantu review target Q2 nya?`,
  `Sudah on track, tinggal push di akhir bulan.`,
  `Great work team, angkanya naik dibanding bulan lalu.`,
  `Let me sync with the team and get back to you.`,
  `Target ini agak challenging, tapi masih achievable.`,
  `Thanks for the update, looks good so far.`,
  `Sudah saya follow up ke stakeholder terkait.`,
  `Perlu di-align lagi sama tim lain minggu depan.`,
  `On track ya, mantap 💪`,
  `Bisa tolong share data terbarunya?`,
  `Progress minggu ini sesuai plan.`,
  `Good momentum, semoga bisa dipertahankan.`,
  `Nice progress @Rizal Candra 🙌`,
  `Boleh dibantu review target nya @Rio Priyono?`,
  `Sudah saya assign ke @Daud Dimas Prasetyo untuk tindak lanjut.`,
  `@Ali Imran mohon update pipeline nya ya.`,
]

// Newest → oldest, so comment i in a thread naturally reads newest-first.
const CREATED_LABELS = [
  `Just now`,
  `2 hrs ago`,
  `5 hrs ago`,
  `Yesterday`,
  `2 Jul 2026, 10:05`,
  `27 Jun 2026, 15:50`,
  `9 May 2026, 13:10`,
  `14 Apr 2026, 08:30`,
  `5 Mar 2026, 16:20`,
  `22 Feb 2026, 11:45`,
  `18 Jan 2026, 14:00`,
  `3 Dec 2025, 09:15`,
  `12 Nov 2025, 10:30`,
]

const ATTACHMENTS: GoalCommentAttachment[] = [
  { name: 'progress-report-Q1.pdf', sizeLabel: '96 KB' },
  { name: 'target-breakdown.xlsx', sizeLabel: '212 KB' },
  { name: 'action-plan.docx', sizeLabel: '64 KB' },
  { name: 'monthly-review.pdf', sizeLabel: '148 KB' },
]

function buildThread(id: string, h: number): GoalComment[] {
  const n = 1 + (h % 3) // 1–3 comments
  const startIdx = h % (CREATED_LABELS.length - 3)
  const comments: GoalComment[] = []
  for (let i = 0; i < n; i++) {
    const s = hashStr(`${id}-c${i}`)
    comments.push({
      id: `c-seed-${id}-${i}`,
      authorId: COMMENT_AUTHORS[s % COMMENT_AUTHORS.length],
      body: COMMENT_BODIES[(s >> 2) % COMMENT_BODIES.length],
      createdLabel: CREATED_LABELS[Math.min(startIdx + i, CREATED_LABELS.length - 1)],
    })
  }
  if (h % 7 === 0) comments[comments.length - 1].attachment = ATTACHMENTS[h % ATTACHMENTS.length]
  return comments
}

// Newest-first — the thread renders top to bottom in this order.
function seed(): Record<string, GoalComment[]> {
  const out: Record<string, GoalComment[]> = {
    'h2-rc-06': [
      { id: 'c-rc06-1', authorId: 'eka', body: 'Ok @Rizal Candra saya akan prepare deck nya lebih details. ✌️', createdLabel: 'Just now' },
      { id: 'c-rc06-2', authorId: 'rizal', body: '@Eka Setiawan saya sudah review dan comment di sales deck nya.', createdLabel: '5 hrs ago' },
      {
        id: 'c-rc06-3', authorId: 'eka',
        body: 'Attached sales deck dan proposal untuk achieve goal ini pak.',
        createdLabel: '1 Nov 2025, 15:00',
        attachment: { name: 'sales-deck-Q4.pdf', sizeLabel: '128 KB' },
      },
    ],
  }
  for (const [prefix, count] of CODE_GROUPS) {
    for (let num = 1; num <= count; num++) {
      const base = `${prefix}-${String(num).padStart(2, '0')}`
      for (const id of [base, `h2-${base}`]) {
        if (out[id]) continue // keep the hand-authored h2-rc-06 thread intact
        const h = hashStr(id)
        if (mix(h) % 100 >= 40) continue // ~43% of goals get a seeded thread
        out[id] = buildThread(id, h)
      }
    }
  }
  return out
}

const byGoal = reactive<Record<string, GoalComment[]>>(seed())
let loadedFromStorage = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, byGoal }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && parsed.byGoal) {
        for (const key of Object.keys(byGoal)) delete byGoal[key]
        Object.assign(byGoal, parsed.byGoal)
        return
      }
    }
    catch {
      // fall through to re-seed on corrupt or outdated storage
    }
  }
  persist()
}

let counter = 0

export function useGoalCommentsStore(goalId: string) {
  loadFromStorage()

  const comments = computed<GoalComment[]>(() => byGoal[goalId] ?? [])
  const count = computed(() => comments.value.length)

  function addComment(authorId: string, body: string) {
    const trimmed = body.trim()
    if (!trimmed) return
    counter += 1
    const comment: GoalComment = { id: `c-new-${goalId}-${counter}`, authorId, body: trimmed, createdLabel: 'Just now' }
    byGoal[goalId] = [comment, ...(byGoal[goalId] ?? [])]
    persist()
  }

  return { comments, count, addComment }
}

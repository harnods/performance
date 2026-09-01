/**
 * "What's new (internal)" — an engineer-facing changelog surfaced from the user
 * menu. Shared open-state for the drawer + the changelog entries themselves.
 *
 * One entry = one MODULE on one DAY. Several pushes/merges for the same module
 * on the same day are grouped into that entry's `items` list (newest day first),
 * so the list stays short while every individual change is still traceable
 * (each item carries its own category + the files it touched).
 */
export type ChangeCategory = 'Feature' | 'Fix' | 'Chore'

export interface ChangeItem {
  category: ChangeCategory
  area: string
  detail: string
  files: string[]
}

export interface ChangelogEntry {
  date: string // "01 Sep 2026"
  module: string // grouping key shown as the entry title, e.g. "Goals", "Competencies"
  items: ChangeItem[]
}

// Newest day first. When adding a change: if an entry with the same date +
// module already exists, append an item to it; otherwise add a new entry on top.
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '01 Sep 2026',
    module: 'Internal tools',
    items: [
      {
        category: 'Feature',
        area: 'What\'s new (internal)',
        detail: 'Added this engineer-facing changelog: a "What\'s new (internal)" item in the user menu opens a drawer listing merges newest-first (one entry per module per day); selecting one swaps to that day\'s changes with per-item category, description, and files. Opening it closes the user popover.',
        files: ['composables/useWhatsNew.ts', 'components/WhatsNewDrawer.vue', 'components/AppHeader.vue'],
      },
    ],
  },
  {
    date: '01 Sep 2026',
    module: 'Competencies',
    items: [
      {
        category: 'Feature',
        area: 'Import competency results → Generate template',
        detail: 'Job position dropdown now comes from the employee master; the scope attribute is derived read-only from the position\'s competency assignment (only assessed scope values are selectable). Positions with no assignment are blocked inline. "Employee assessed" is limited to people who hold the position (current-position assessment); the full directory stays for a future (succession) one. Request template shows a dismissible success banner and registers a Download job.',
        files: ['pages/talents/competencies/import-results.vue', 'utils/competency.ts', 'utils/competencyAssignments.ts'],
      },
      {
        category: 'Feature',
        area: 'Import competency results → Upload results',
        detail: 'Built from Figma: a 360px .xlsx dropzone ("Drop your file here or Browse", .xlsx/10MB inline validation, "Generate one first" shortcut), a file-selected state, and Process upload which registers an Import job in the monitor.',
        files: ['components/CompetencyUploadResults.vue'],
      },
      {
        category: 'Feature',
        area: 'Import competency results → Import history',
        detail: 'Filter (status + search job position), a full table (Date · Context · Job position · Vendor · Employees · Status · Uploader · Download log), status badges, empty state, and the standard rows-per-page pagination footer.',
        files: ['components/CompetencyImportHistory.vue', 'utils/competencyImports.ts'],
      },
      {
        category: 'Feature',
        area: 'Activity monitor (header)',
        detail: 'New header process tray: a refresh icon that spins while jobs run, with a popover (Download / Import tabs) showing per-job progress and a Download action for finished templates. It auto-opens when a job starts.',
        files: ['composables/useActivityMonitor.ts', 'components/AppHeader.vue'],
      },
    ],
  },
  {
    date: '01 Sep 2026',
    module: 'Goals',
    items: [
      {
        category: 'Fix',
        area: 'Goal cycles (#16)',
        detail: 'Fixed the weight-mandatory validation UX and stopped the multi-employee picker from overselecting.',
        files: ['components/AddGoalDrawer.vue', 'composables/useBulkOwnerGate.ts', 'composables/useGoalEditor.ts', 'pages/goals/goal-cycles/[id]/new.vue'],
      },
    ],
  },
  {
    date: '31 Aug 2026',
    module: 'Build & deploy',
    items: [
      {
        category: 'Chore',
        area: 'Lockfile / Vercel',
        detail: 'A regenerated package-lock.json was missing the platform-specific @esbuild/* packages, so `npm ci` (Vercel) failed and both deploys failed. Reconciled the lockfile (additions only, no version changes) so the install is consistent again.',
        files: ['package-lock.json'],
      },
    ],
  },
  {
    date: '27 Aug 2026',
    module: 'Goals',
    items: [
      {
        category: 'Feature',
        area: 'Over-weight warning',
        detail: 'On a weight-mandatory cycle, owners whose committed goal weights exceed 100% show a filled warning-triangle (warning-orange) left of the goal count, with a tooltip that weights must total 100% and are changed via Import.',
        files: ['pages/goals/goal-cycles/[id]/index.vue'],
      },
      {
        category: 'Feature',
        area: 'Unit tests',
        detail: 'Added a Vitest suite for the goals/goal-cycles module (period picker, mapping, rows, filters, approvals classifiers, dashboard helpers, cycle & goals stores).',
        files: ['composables/*.test.ts', 'utils/*.test.ts', 'tests/setup.ts'],
      },
      {
        category: 'Fix',
        area: 'Progress & status coherence',
        detail: 'Unit-less goals rendered a bare "—" (sometimes with a stale "On track"). Every goal now gets a 0–100% bar with progress derived from status (green 100 / orange 50 / gray 0 = Not started); 26 H2 company goals no longer read "Not started" at 30%+.',
        files: ['composables/useGoalsStore.ts', 'composables/useGoalsStore.test.ts'],
      },
      {
        category: 'Fix',
        area: 'Demo data / seed',
        detail: 'resetToSeed() rebuilt only 26 H1 — now it restores every cycle. 26 H2 cloned H1\'s intentional over-weights; those are scaled back to exactly 100% per owner (26 H1 stays over on purpose, to demo the warning). Bumped SEED_VERSION so stale localStorage re-seeds.',
        files: ['composables/useGoalsStore.ts', 'composables/useGoalsStore.test.ts'],
      },
      {
        category: 'Feature',
        area: 'Goals revision (#15)',
        detail: 'Simplified the contributor picker (dropped the change-owner flow), refactored the goal-cycle detail page and settings, and updated the pattern docs.',
        files: ['components/AddGoalDrawer.vue', 'pages/goals/goal-cycles/[id]/new.vue', 'pages/goals/goal-settings.vue', 'docs/patterns/*.md'],
      },
    ],
  },
  {
    date: '26 Aug 2026',
    module: 'Goals',
    items: [
      {
        category: 'Feature',
        area: 'Dashboard → Goals (#14)',
        detail: 'Added the "Goal edit" approval card, made progress/edit approvals list one row per goal (creation stays per employee), and replaced paged footers with progressive "Load more" into a height-capped scroll region.',
        files: ['components/GoalsDashApprovalTable.vue', 'components/GoalsDashboard.vue', 'composables/useGoalsDashboard.ts'],
      },
    ],
  },
]

export function useWhatsNew() {
  const open = useState('whats-new-open', () => false)
  return {
    open,
    changelog: CHANGELOG,
    openDrawer: () => { open.value = true },
    close: () => { open.value = false },
  }
}

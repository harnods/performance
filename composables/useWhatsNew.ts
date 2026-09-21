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
    date: '21 Sep 2026',
    module: 'IDPs',
    items: [
      {
        category: 'Feature',
        area: 'Add/edit action plan',
        detail: 'Converted the add/edit action plan modal to a right-side drawer, and added a "Related to (Optional)" radio group below Category — Competency (reveals a searchable "Select competency" field, sourced from the same competency catalog Succession/Competency assignment already score against) or Goals (disabled, marked "Coming soon" — not wired up yet). The link persists through create, edit, and the view modal (a new "Related to" row, shown only when set).',
        files: [
          'components/IdpActionPlanModal.vue',
          'components/IdpActionPlanViewModal.vue',
          'components/IdpPlanForm.vue',
          'pages/talents/idps/[id]/index.vue',
          'utils/idp.ts',
          'utils/competency.ts',
          'composables/useIdpStore.ts',
          'docs/patterns/form.md',
        ],
      },
      {
        category: 'Feature',
        area: 'Add/edit action plan',
        detail: 'Refined the drawer per follow-up feedback: required asterisks on Category, Action plan name, Assignee, Start date and End date (Assignee is now also actually enforced on submit, not just marked); dropped the "(Optional)" suffix on the "Related to" title; the revealed competency field is now indented 32px under its own radio with a tight 4px gap, and Goals keeps a flat 8px gap whether or not the field is showing; the competency search is search-on-field now, matching Category, instead of a separate popover search bar. Description keeps no asterisk — its own placeholder already reads "Optional".',
        files: ['components/IdpActionPlanModal.vue', 'docs/patterns/form.md'],
      },
      {
        category: 'Feature',
        area: 'Add/edit action plan',
        detail: 'Replaced the "Related to" Competency/Goals radio group with a single toggle labelled "Relate action plan to competency" — a plain yes/no relation doesn\'t need a two-option chooser, and Goals had no real destination yet beyond a "Coming soon" placeholder. Turning it on reveals the same searchable competency select, indented under the toggle with a 4px gap, same as any other toggle/checkbox reveal in the app; turning it off clears whatever was picked.',
        files: ['components/IdpActionPlanModal.vue', 'docs/patterns/form.md'],
      },
      {
        category: 'Fix',
        area: 'Add/edit action plan',
        detail: 'The revealed "Select competency" field sat 10px left of the toggle\'s own label — it was using the checkbox-reveal indent token (marginLeft: \'8\', 32px), but MpToggle\'s switch + internal gap to its label measures 42px, not 32px. Measured live and hardcoded the 42px as a literal (not a spacing token, since it\'s specific to MpToggle\'s own dimensions) so the field lines up flush with the label text above it.',
        files: ['components/IdpActionPlanModal.vue', 'docs/patterns/form.md'],
      },
    ],
  },
  {
    date: '18 Sep 2026',
    module: 'IDPs',
    items: [
      {
        category: 'Feature',
        area: 'Individual development plan',
        detail: 'Replicated the IDP feature from production (talenta-performance: views/talent-management/individual-development) into the previously empty IDPs menu, with full CRUD. List page with branch/organization/employee filters, search, column settings, a completed-of-total progress column and pagination; a create/edit form (plan name, objective, employee, current-vs-future focus, action plans) shared by both routes; a detail page with per-status totals and the plan\'s action plans; and add/edit/delete plus a status update modal with an activity trail for each action plan. Data is a localStorage-backed store seeded from utils/idp.ts, same shape as useSuccessionStore.',
        files: [
          'pages/talents/idps/index.vue',
          'pages/talents/idps/create.vue',
          'pages/talents/idps/[id]/index.vue',
          'pages/talents/idps/[id]/edit.vue',
          'components/IdpPlanForm.vue',
          'components/IdpActionPlanModal.vue',
          'components/IdpActionPlanViewModal.vue',
          'components/IdpDeleteModal.vue',
          'composables/useIdpStore.ts',
          'utils/idp.ts',
        ],
      },
      {
        category: 'Feature',
        area: 'Individual development plan',
        detail: 'Closed the gaps found comparing the replicated screens against production. Action plans now carry assignees (shown in the view modal as an avatar or an overlapping stack, editable via a tag picker in the add/edit modal, defaulting to the plan\'s own employee). The detail page\'s action-plan table gained column sorting and the standard 52px pagination footer, its Due date column is now labelled as production labels it, and the status totals read Completed → In progress → To do. The plan form shows the selected employee\'s informal education from the talent profile, and keeps an unsaved create draft for 20 minutes. Objective and action-plan Category are now free text with suggestions rather than closed lists, matching the open vocabularies production accepts. The list page gained Job position / Job level / Employment status filters via the All filters drawer. End date must now be at least one day after the start date, and attachments are checked for type and size.',
        files: [
          'utils/idp.ts',
          'composables/useIdpStore.ts',
          'pages/talents/idps/index.vue',
          'pages/talents/idps/create.vue',
          'pages/talents/idps/[id]/index.vue',
          'components/IdpPlanForm.vue',
          'components/IdpActionPlanModal.vue',
          'components/IdpActionPlanViewModal.vue',
          'pages/talents/talent-directory/[id].vue',
        ],
      },
      {
        category: 'Feature',
        area: 'PxSelectPopover',
        detail: 'Added `allow-custom-value` — a combobox mode on top of `search-on-field` where the options are suggestions rather than a closed list, so whatever is typed becomes the value instead of reverting on blur. Paired with a new `maxlength` prop so a free-text field honours the character limit its counter advertises. Every existing usage is unaffected; both are opt-in.',
        files: ['components/PxSelectPopover.vue', 'docs/patterns/form.md'],
      },
      {
        category: 'Feature',
        area: 'Talent profile',
        detail: 'Added a "Create IDP" header action that opens the development plan form with that person already selected (?employee=<id>), mirroring the deep link production offers from the employee competency section.',
        files: ['pages/talents/talent-directory/[id].vue', 'pages/talents/idps/create.vue', 'components/IdpPlanForm.vue'],
      },
      {
        category: 'Fix',
        area: 'Individual development plan',
        detail: 'Design-pattern audit against docs/patterns found three real defects in the tables and components built this feature. The trailing action column (View detail / Actions dropdown / Edit-Remove icons) on all three IDP tables used the plain header/cell classes instead of the width: 1% + nowrap pair every other table\'s action column uses, so it stretched wide and left the button floating in dead space instead of hugging the row edge. The action-plan view modal\'s assignee avatar stack had no cap, rendering unbounded — now capped at 5 with a "+N" overflow; a nested MpModal for the overflow list crashes live in this Pixel build (getBoundingClientRect on a null ref) while another modal is already open, so it\'s a popover instead. table.md\'s action-column rule was buried as an afterthought sentence under Numeric columns, which is exactly why it got missed — pulled into its own section with a checklist item.',
        files: [
          'pages/talents/idps/index.vue',
          'pages/talents/idps/[id]/index.vue',
          'components/IdpPlanForm.vue',
          'components/IdpActionPlanViewModal.vue',
          'docs/patterns/table.md',
          'docs/patterns/avatar.md',
        ],
      },
      {
        category: 'Chore',
        area: 'Design docs',
        detail: 'Documented two components built for this feature that had no doc coverage: the multi-file "Choose files" attachment picker (upload.md previously only covered the single-file spreadsheet dropzone) and the variant="danger" button (used in 20+ files for a delete-confirm modal\'s primary action, but absent from buttons.md\'s variant list).',
        files: ['docs/patterns/upload.md', 'docs/patterns/buttons.md'],
      },
      {
        category: 'Fix',
        area: 'Individual development plan',
        detail: 'Table headers across all three IDP tables hardcoded fontSize: 12px / color: text.secondary onto headCell, overriding the MpTable recipe\'s actual default (14px / weight 600 / text.default, confirmed via getComputedStyle against goal-cycles). Headers rendered visibly smaller and grayer than every other table in the app. Fixed to match the dominant 20+-file convention (padding + verticalAlign only) — the same bug exists in succession-plans, now flagged in table.md so it doesn\'t get copied a third time. Also dropped an extra textAlign: right on the trailing action column that no canonical actionCell (goal-cycles, competencies, review-cycles) carries.',
        files: [
          'pages/talents/idps/index.vue',
          'pages/talents/idps/[id]/index.vue',
          'components/IdpPlanForm.vue',
          'docs/patterns/table.md',
        ],
      },
      {
        category: 'Feature',
        area: 'Individual development plan',
        detail: 'Reworked the list page to match a production reference screenshot. Page title is now "Individual development plan" (was "IDPs"); the create button dropped its + icon; the filter bar simplified to just column settings (moved to lead the bar, now a bordered icon+caret button) + an "All employee" picker + search, dropping the branch/organization selects and the "All filters" drawer added earlier this session. The column-settings panel gained an uppercase "Column displayed" label and a "Select all"/"Deselect all" toggle. The development-plan name is now plain text (View detail is the row\'s only navigation) instead of a redundant link. The Progress column\'s hand-rolled track/fill bar was replaced with the native MpProgress component (variant="linear" size="sm", teal fill override) — matching the convention review-cycles and CycleDetailGeneral already used for table progress columns, which table.md had missed in favor of documenting the hand-rolled version as canonical. table.md and filter-bar.md updated to reflect both as the current patterns.',
        files: [
          'pages/talents/idps/index.vue',
          'docs/patterns/table.md',
          'docs/patterns/filter-bar.md',
        ],
      },
      {
        category: 'Fix',
        area: 'PxSelectPopover',
        detail: 'A pre-seeded select rendered its placeholder instead of the selected value. MpSelect writes the native <select>\'s value during its own setup, before PxSelectPopover\'s <option> children exist, so the browser dropped any value known at mount — which is every edit form. PxSelectPopover now re-applies the value once the options have rendered. Create forms were unaffected and stay unchanged.',
        files: ['components/PxSelectPopover.vue', 'docs/patterns/form.md'],
      },
      {
        category: 'Chore',
        area: 'Form docs',
        detail: 'Documented that MpFormLabel throws outside an MpFormControl (it injects FormControlContext with no fallback) — inside a modal that makes the whole modal render as empty with no visible error, which cost real debugging time.',
        files: ['docs/patterns/form.md'],
      },
    ],
  },
  {
    date: '18 Sep 2026',
    module: 'Talents',
    items: [
      {
        category: 'Chore',
        area: 'Talent directory — pools',
        detail: 'Hid the whole talent-pools feature behind a new TALENT_POOLS_ENABLED flag (utils/featureFlags.ts) while the design is still under review. Talent directory is back to the plain "All talents" list: no tab bar, no "+ Add pool", no match-score column, no bulk-select checkboxes, no "Showing …" strip. Only the tab bar and the two drawers are gated — with the tab bar gone `activeTab` can never leave \'all\', so every pool-only branch is unreachable by construction. The code and its tests stay live; flip the flag to true to bring it all back.',
        files: [
          'utils/featureFlags.ts',
          'pages/talents/talent-directory/index.vue',
          'docs/patterns/feature-flags.md',
          'docs/patterns/ai-prompt-builder.md',
          'docs/patterns/accordion.md',
          'docs/README.md',
        ],
      },
    ],
  },
  {
    date: '17 Sep 2026',
    module: 'Talents',
    items: [
      {
        category: 'Feature',
        area: 'Talent directory — Add pool drawer',
        detail: 'Rebuilt the Add/Edit pool drawer to the new design: a 60-char-counted Name, a required Job position + optional Branch scope row, and a "Describe / Build" segmented control over the Talent criteria section. Describe lets you write the pool in plain language; the badges under the textarea turn from grey to green for each criteria dimension the text mentions (job position, location, competency score, performance result, education level, attendance, years of service), "Refine prompt" rewrites the text to spell those out, and "Next" turns them into criteria rows on the Build step. Pools now also filter by their job position/branch scope, and the primary CTA validates with inline errors + a toast instead of being disabled.',
        files: [
          'components/PxAddPoolDrawer.vue',
          'pages/talents/talent-directory/index.vue',
          'utils/talentPrompt.ts',
          'utils/talentPrompt.test.ts',
          'utils/talents.ts',
          'docs/patterns/ai-prompt-builder.md',
          'docs/patterns/filter-bar.md',
          'docs/patterns/badges.md',
          'docs/README.md',
        ],
      },
      {
        category: 'Feature',
        area: 'Talent directory — Add pool drawer',
        detail: 'The Describe textarea now drives the Build step live, not just the badges: typing "a bachelor\'s degree" ticks Bachelor, "95% attendance" fills Attendance\'s Min, "atleast 2 years of service" fills Years of service, "no absents" sets Attendance to 100, and a named branch/job title fills the scope selects. Ranges ("80 to 95"), floors ("at least", "5+") and ceilings ("under 60") are all understood, and each number is assigned to its nearest criterion. Still zero AI/network calls — it is a local keyword whitelist, so it costs nothing to run on a deployed build.',
        files: [
          'utils/talentPrompt.ts',
          'utils/talentPrompt.test.ts',
          'components/PxAddPoolDrawer.vue',
          'docs/patterns/ai-prompt-builder.md',
        ],
      },
      {
        category: 'Feature',
        area: 'Talent directory — Build step',
        detail: 'Rebuilt the Build step to the Figma: each added criterion is now its own collapsible MpAccordion section with the shape its data actually has, instead of one generic Min–Max row. Competency score compares per group (8 DNA competencies / Technical skills / Soft skills) with an Is exactly / at least / at most / between operator; Performance result picks a result per review type (Self / 360 / Team / Manager); Education level and Year of service are "Atleast" floors; Attendance ticks an issue (Absent / Late clock in / Day off) and reveals a Days cap. Pool filtering, match score and the "Showing …" summary all read the new shape, and criteria values come from one memoized source (utils/talentAttributes.ts) shared with the talent profile page so the two can\'t disagree. Soft skills added as a third competency group on the profile.',
        files: [
          'components/PxAddPoolDrawer.vue',
          'utils/talentCriteria.ts',
          'utils/talentCriteria.test.ts',
          'utils/talentAttributes.ts',
          'utils/talentPrompt.ts',
          'utils/talentPrompt.test.ts',
          'utils/matchScore.ts',
          'utils/talent-profile.ts',
          'pages/talents/talent-directory/index.vue',
          'docs/patterns/accordion.md',
          'docs/patterns/filter-bar.md',
          'docs/patterns/ai-prompt-builder.md',
          'docs/README.md',
        ],
      },
      {
        category: 'Feature',
        area: 'Talent directory — pool tabs',
        detail: 'Replaced the "Edit criteria" button in the filter row with a "Showing …" summary strip above it, reading back the pool\'s scope and criteria as a sentence ("Sales Representative, Jakarta HQ, Attendance at least 90%, Bachelor, Years of service at least 2 yrs") with a pencil that reopens the drawer in edit mode. It summarizes the saved criteria, not the prompt that was typed, so it stays true after hand edits.',
        files: [
          'pages/talents/talent-directory/index.vue',
          'utils/talentCriteria.ts',
          'utils/talentCriteria.test.ts',
          'docs/patterns/banner.md',
          'docs/patterns/tabs.md',
          'docs/README.md',
        ],
      },
    ],
  },
  {
    date: '15 Sep 2026',
    module: 'Talents',
    items: [
      {
        category: 'Feature',
        area: 'Talent directory',
        detail: 'Added talent pools as tabs above the directory table ("All talents" plus user-created pools via "+ Add pool"). Each pool has its own criteria (branch/job level/job grade/employment type/years of service/competency/performance/attendance/education) set in a drawer, and shows only matching talents. Pool tabs support bulk row selection (export / create IDP / create assignment) and a per-row match score breakdown drawer.',
        files: [
          'pages/talents/talent-directory/index.vue',
          'components/PxAddPoolDrawer.vue',
          'components/PxMatchScoreDrawer.vue',
          'utils/talentCriteria.ts',
          'utils/matchScore.ts',
          'utils/talents.ts',
          'docs/patterns/tabs.md',
          'docs/patterns/checkbox.md',
          'docs/patterns/filter-bar.md',
          'docs/patterns/badges.md',
          'docs/patterns/icons.md',
        ],
      },
    ],
  },
  {
    date: '02 Sep 2026',
    module: 'Competencies',
    items: [
      {
        category: 'Fix',
        area: 'Import competency results → Generate template',
        detail: 'The revealed "Target job level" / "Target job class" select under each future-position checkbox now renders at the same width as the primary scope field ("Target job grade") instead of stretching full-row. Root cause: the checkbox group\'s wrapping container was a flex column (which ignores grid span classes) and MpCheckbox forwards :class to its hidden input rather than its visible label.',
        files: ['pages/talents/competencies/import-results.vue', 'docs/patterns/form.md'],
      },
      {
        category: 'Feature',
        area: 'Import competency results → Generate template',
        detail: 'Added an "Assessment provider" (renamed from "Competency assessment provider") + "Assessment date" pair in Assessment details, each sized to match Job position (span3) with a 24px gap, for both current and future job position context. New span3Auto grid utility lets a field auto-place beside another same-width field instead of the standard span classes\' fixed column-1 start.',
        files: ['pages/talents/competencies/import-results.vue', 'docs/patterns/form.md'],
      },
    ],
  },
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
      {
        category: 'Feature',
        area: 'Import competency results → Generate template',
        detail: 'Job position and Job level are now type-directly-on-the-field selects (PxSelectPopover\'s new opt-in search-on-field mode) instead of opening a separate embedded search box. Vendor is no longer mandatory. Future job position gains two independent checkboxes for whichever scope attributes (job grade/class/level) the position\'s assignment doesn\'t already predefine — each reveals its own search-on-field picker, 32px-indented and 8px below its checkbox, with no redundant field label.',
        files: ['pages/talents/competencies/import-results.vue', 'components/PxSelectPopover.vue'],
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

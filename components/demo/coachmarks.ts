// ─── DEMO ONLY — do not port to talenta-review / production ──────────────────
// Registry of "what's new vs production" coachmarks. Each entry finds an
// element that ALREADY exists in the product markup (by id or exact text), and
// DemoLayer appends a pulse inside it. Product components carry no demo code.
// See docs/patterns/dev-scenario-control.md.
import type { RouteLocationNormalizedLoaded } from 'vue-router'

export interface CoachmarkDef {
  id: string
  /** Route path this coachmark belongs to. */
  route: RegExp
  /** Extra condition on the route (e.g. a query flag). Omit = always. */
  when?: (route: RouteLocationNormalizedLoaded) => boolean
  /** Returns the element to append the pulse inside, or null if not on screen. */
  find: () => Element | null
  title: string
  description: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'bottom-start' | 'right-start'
  /** Pin the pulse over the anchor's top-right corner instead of just after its
   *  last text. Use it for anchors that are a box of their own (buttons, fields).
   *  Either way the pulse is absolutely positioned: it never changes the size or
   *  layout of the element it marks. */
  corner?: boolean
}

// Element under `root` whose OWN text nodes (ignoring children and Vue's
// fragment comments) read exactly `text`.
function ownText(el: Element): string {
  return [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim()
}
function byText(root: ParentNode | null | undefined, selector: string, text: string): Element | null {
  if (!root) return null
  return [...root.querySelectorAll(selector)].find(el => ownText(el) === text) ?? null
}

// ─── IDPs ─────────────────────────────────────────────────────────────────────
const FORM = /^\/talents\/idps\/(create|[^/]+\/edit)\/?$/
const DETAIL = /^\/talents\/idps\/(?!create)[^/]+\/?$/
const IDP_LIST = /^\/talents\/idps\/?$/
const IDP_IMPORT = /^\/talents\/idps\/import\/?$/
const IDP_IMPORT_OR_LIST = /^\/talents\/idps(\/import)?\/?$/
const ITEMS = /^\/talents\/competencies\/items\/?$/
const IDP_DETAIL_OR_FORM = /^\/talents\/idps\/[^/]+/

// ─── Evaluation cycle: Create new cycle → Employee filter ────────────────────
const CYCLE_CREATE = /^\/reviews\/review-cycles\/create\/?$/
const CYCLE_EDIT = /^\/reviews\/review-cycles\/[^/]+\/edit\/?$/
const isEvaluation = (r: RouteLocationNormalizedLoaded) => r.query.purpose === 'evaluation'
const employeeFilter = () => document.getElementById('employee-filter-label')?.parentElement ?? null

// ─── Settings: Add / Edit role → Permissions ─────────────────────────────────
const ROLE_FORM = /^\/settings\/manage-users\/roles\/(add|edit\/[^/]+)\/?$/
// A label in the permission table: inside Version 2's tree row when it's on screen,
// else the first match in Version 1's table body (group titles come before sub-rows).
const roleLabel = (v2Key: string, text: string) =>
  byText(document.querySelector(`[data-qa="roles-v2-row-${v2Key}"]`) ?? document.querySelector('form tbody'), 'span, p', text)

// ─── Settings: Templates → builder (full-size modal) ─────────────────────────
const TEMPLATES = /^\/settings\/templates\/?$/
// The list page mounts a hidden second TemplateForm (duplicate flow): only mark the visible one.
function visible(els: Iterable<Element>, match: (el: Element) => boolean = () => true): Element | null {
  return [...els].find(el => (el as HTMLElement).offsetParent !== null && match(el)) ?? null
}

// ─── Goals: goal reminders ───────────────────────────────────────────────────
const GC_DETAIL = /^\/goals\/goal-cycles\/(?!new\/?$)[^/]+\/?$/
const SETTINGS_REMINDERS = /^\/settings\/reminders\/?$/
const onScreen = (selector: string, match: (el: Element) => boolean) => visible(document.querySelectorAll(selector), match)


// ─── Goals: closing a goal, aligned goals, locked progress, Closed goals tab ──
// Cycle index + the four goal-type pages + the Goal Detail page (+ the archive cycle's tabs).
const GC_LIST = /^\/goals\/goal-cycles\/(?!new\/?$)[^/]+(\/(company|individual|team|organization)-goals)?\/?$/
const GC_TYPE_PAGES = /^\/goals\/goal-cycles\/[^/]+\/(company|individual|team|organization)-goals\/?$/
const GC_DEPT_PAGES = /^\/goals\/goal-cycles\/[^/]+\/(individual|team|organization)-goals\/?$/
const GC_GOAL_DETAIL = /^\/goals\/goal-cycles\/[^/]+\/goals\/[^/]+\/?$/
const GC_ANY_GOAL_PAGE = /^\/goals\/goal-cycles\/(?!new\/?$)[^/]+(\/((company|individual|team|organization)-goals|goals\/[^/]+))?\/?$/
const isArchiveCycle = (r: RouteLocationNormalizedLoaded) => r.params.id === 'archive-legacy'
const modalHeader = (title: RegExp) =>
  visible(document.querySelectorAll('[data-pixel-component="MpModalHeader"]'), el => title.test((el.textContent ?? '').trim()))
const closedTab = () => onScreen('#page-tabs button', el => (el.textContent ?? '').trim() === 'Closed goals')

export const COACHMARKS: CoachmarkDef[] = [
  // ── Goals: Closed goals tab (type pages) ──
  {
    id: 'goals-closed-tab',
    route: GC_TYPE_PAGES,
    when: r => !isArchiveCycle(r),
    find: closedTab,
    title: 'Closed goals tab',
    description: 'New on the Company, Organization, Team and Individual goals pages (production only had it on All goals). It lists just the closed goals of that goal type. On Organization, Team and Individual only the departments that have a closed goal show; a type with none shows "No closed goals yet".',
    placement: 'bottom-start',
  },
  {
    id: 'goals-closed-tab-archive',
    route: GC_LIST,
    when: isArchiveCycle,
    find: closedTab,
    title: 'Closed goals in the archive',
    description: 'A goal outside any real cycle (here the "All goals from 2020-2025" archive, standing in for the Mix Cycle) is browsable on that cycle\'s own Closed goals tab, like any other cycle. The 2020-2022 archive goals are seeded as closed.',
    placement: 'bottom-start',
  },
  {
    id: 'goals-closed-bulk-delete',
    route: GC_TYPE_PAGES,
    find: () => onScreen('button', el => (el.textContent ?? '').trim() === 'Delete goals'),
    title: 'Delete goals',
    description: 'New: on the Closed goals tab the bulk Actions menu is a single Delete goals button, since a closed goal can\'t be edited, updated or closed again. The selection clears when you switch tabs.',
    placement: 'bottom',
    corner: true,
  },
  {
    id: 'goals-closed-row-checkbox',
    route: GC_TYPE_PAGES,
    find: () => visible(document.querySelectorAll('tbody label[aria-disabled="true"]')),
    title: 'Closed rows can\'t be selected',
    description: 'New: on a tab that mixes open and closed goals (All goals), a closed row\'s checkbox is disabled and "select all" skips it. They can be selected on the Closed goals tab (for Delete).',
    placement: 'right-start',
    corner: true,
  },
  {
    id: 'goals-search-departments',
    route: GC_DEPT_PAGES,
    find: () => [...document.querySelectorAll('input')].find(i => /^Search/i.test(i.placeholder))?.closest('[data-pixel-component="MpInputGroup"]') ?? null,
    title: 'Search hides empty departments',
    description: 'New: searching (and the Closed goals tab) only lists departments that have a match, and opens them. No match anywhere shows "No goals found". Production listed every department.',
    placement: 'bottom',
    corner: true,
  },
  // ── Goals: confirm modals and the Align drawer ──
  {
    id: 'goals-close-modal',
    route: GC_ANY_GOAL_PAGE,
    find: () => modalHeader(/^Close goal\?/),
    title: 'Close goal modal',
    description: 'New copy variants. Aligned goals: bullets say the goal is locked and can\'t be reopened and the aligned goals can no longer update progress. If the close needs the manager\'s approval an intro line comes first, since nothing locks until approved. Primary button: Close goal. Closing an already-closed goal is ignored.',
    placement: 'right-start',
  },
  {
    id: 'goals-bulk-close-modal',
    route: GC_TYPE_PAGES,
    find: () => modalHeader(/^Close \d+ goals?\?/),
    title: 'Close goals modal',
    description: 'New: when selected goals have aligned goals, the effects are listed as bullets (aligned goals can no longer update progress; closed goals can\'t be reopened; direct reports\' goals go for approval first). The bulk Close option is hidden if any selected goal is already closed.',
    placement: 'right-start',
  },
  {
    id: 'goals-delete-modal',
    route: GC_ANY_GOAL_PAGE,
    find: () => modalHeader(/^Delete goal\?/),
    title: 'Delete goal modal',
    description: 'New variant: a goal with aligned goals lists, as bullets, that it is deleted for good and that its aligned goals lose the alignment (a closed parent\'s children also unlock). Deleting really clears their alignment.',
    placement: 'right-start',
  },
  {
    id: 'goals-align-drawer',
    route: GC_ANY_GOAL_PAGE,
    find: () => visible(document.querySelectorAll('[data-pixel-component="MpDrawerHeader"]'), el => /^Align to parent goal/.test((el.textContent ?? '').trim())),
    title: 'Closed goals aren\'t parents',
    description: 'New: the parent list never offers a closed goal. Aligning to one would lock this goal\'s progress at once.',
    placement: 'left',
  },
  // ── Goal Detail: locked progress and closed goals ──
  {
    id: 'goal-detail-locked-banner',
    route: GC_GOAL_DETAIL,
    find: () => onScreen('[data-pixel-component="MpBannerTitle"]', el => ownText(el) === 'Update progress locked'),
    title: 'Update progress locked',
    description: 'New: when the parent goal this one aligns to is closed, progress can\'t be updated. Only direct children are locked; Edit and Align stay allowed. Removing the alignment unlocks it. "View parent goal" opens the parent.',
    placement: 'bottom-start',
  },
  {
    id: 'goal-detail-closed-badge',
    route: GC_GOAL_DETAIL,
    find: () => onScreen('span[data-pixel-component="MpBadge"]', el => ownText(el) === 'Closed'),
    title: 'Closed badge',
    description: 'New: a closed goal shows a Closed badge next to its status. Update progress, Align, Edit and Close are hidden; View details, Activity log and Delete stay.',
    placement: 'bottom-start',
  },
  {
    id: 'goal-detail-alignment-closed',
    route: GC_GOAL_DETAIL,
    find: () => onScreen('span', el => ownText(el) === 'Closed' && el.getAttribute('data-pixel-component') !== 'MpBadge'),
    title: 'Closed parent',
    description: 'New: the Alignment card tags the parent goal as Closed (same shape as the level pill).',
    placement: 'left',
  },
  {
    id: 'goal-detail-key-results',
    route: GC_GOAL_DETAIL,
    find: () => onScreen('p, span', el => ownText(el).startsWith('Key Results (')),
    title: 'Key results lock',
    description: 'New: on a closed goal, Add key result and Edit are disabled with a tooltip ("Key results locked because this goal is closed") and Delete stays. On a goal whose parent is closed, Add, Edit and Delete are all disabled.',
    placement: 'bottom-start',
  },
  {
    id: 'goal-detail-actions',
    route: GC_GOAL_DETAIL,
    find: () => onScreen('#page-header-actions button', el => (el.textContent ?? '').trim() === 'Actions'),
    title: 'Actions menu',
    description: 'New: Update progress stays in the menu but is disabled (tooltip: "Progress locked because the parent goal is closed") when the parent is closed. On a closed goal Update progress, Edit goal and Close goal are hidden.',
    placement: 'bottom',
    corner: true,
  },
  {
    id: 'goal-info-reminders',
    route: GC_DETAIL,
    find: () => onScreen('p', el => ownText(el) === 'Reminders'),
    title: 'Reminders row',
    description: 'New: the goal reminders that run for this cycle (set on Settings › Reminders), e.g. "Repeat every 2 days". Both run over the whole goal period.',
    placement: 'right-start',
  },
  {
    id: 'settings-goal-reminder-section',
    route: SETTINGS_REMINDERS,
    find: () => document.querySelector('#goal-reminder h2'),
    title: 'Goal reminder section',
    description: 'New: Goal creation repeats over the goal period, like Update goal progress (the existing production reminder). It targets employees with no goals yet (drafted or awaiting-approval goals don\'t count).',
    placement: 'right-start',
  },
  {
    id: 'template-legend-label',
    route: TEMPLATES,
    find: () => visible(document.querySelectorAll('label[id$="-template-legend-name-label"]')),
    title: 'Legend label',
    description: 'New: rename the "Legends" heading for this template. Pick a saved label or type a new one. "Set as default" makes it the starting label for every template you create. The label shows in the builder and the preview. Production always shows "Legends".',
    placement: 'left',
  },
  {
    id: 'template-legend-percent',
    route: TEMPLATES,
    // The first legend row's "from" field, pinned to its corner; only percentage templates have the % addon.
    find: () => visible(document.querySelectorAll('[data-qa="view-settings-template-legend-0"] [data-pixel-component="MpInputGroup"]'), g => g.textContent?.includes('%') ?? false),
    corner: true,
    title: 'Percent sign on legend ranges',
    description: 'New: for percentage templates, each legend range field shows a % sign, so it is clear the range is a percentage. The fields are slightly wider to fit it. Production shows plain numbers.',
    placement: 'bottom-start',
  },
  {
    id: 'idp-form-informal-education',
    route: FORM,
    find: () => document.getElementById('idp-employee-label'),
    title: 'Informal education table appears after selecting',
    description: 'Changed: the informal education table is hidden until an employee is selected, then shows that employee\'s courses. Production shows the table immediately, as an empty state, before anyone is selected.',
  },
  {
    id: 'idp-form-focus-position',
    route: FORM,
    find: () => document.getElementById('idp-focus-label'),
    title: 'Current position description',
    description: 'New: the "Current job position" option now shows the selected employee\'s actual position as its description.',
  },
  {
    id: 'idp-form-action-plan-table',
    route: FORM,
    find: () => byText(document, '.mp-fs_20px', 'Action plan'),
    title: 'Action plan table appears after adding',
    description: 'Changed: the action plan table is hidden until the first action plan is added; until then only the Add action plan button shows. Production shows the table immediately, as an empty state.',
  },
  {
    id: 'idp-form-relates-to-column',
    route: FORM,
    find: () => byText(document, 'th', 'Relates to'),
    title: 'Relates to column',
    description: 'New column: shows what each action plan relates to (e.g. a competency), taken from the Relates to field in the Add action plan form.',
    placement: 'bottom-start',
  },
  {
    id: 'idp-drawer-relates-to',
    route: IDP_DETAIL_OR_FORM,
    find: () => document.getElementById('ap-related-to-label'),
    title: 'Relates to field',
    description: 'New field: link an action plan to a competency item (Goal is coming soon). The choice shows up in the action-plan tables and the Update modal.',
    placement: 'left',
  },
  {
    id: 'idp-detail-relates-to-column',
    route: DETAIL,
    find: () => byText(document, 'th', 'Relates to'),
    title: 'Relates to column',
    description: 'New column: what each action plan relates to. Click a competency item name to open its Competency item detail drawer.',
    placement: 'bottom-start',
  },
  {
    id: 'idp-update-title',
    route: DETAIL,
    find: () => document.querySelector('.idp-view-modal [data-pixel-component="MpModalBody"] .mp-fs_20px'),
    title: 'Modal header and title',
    description: 'New: the header now reads "Update action plan". The action plan\'s name sits in the content as a title, with its description under it, and activity timestamps sit under each entry.',
    placement: 'bottom-start',
  },
  {
    id: 'idp-update-relates-to',
    route: DETAIL,
    find: () => byText(document.querySelector('.idp-view-modal'), 'span', 'Relates to'),
    title: 'Relates to info',
    description: 'New: shows what this action plan relates to, with View details opening the Competency item detail drawer.',
    placement: 'left',
  },
  {
    id: 'items-applied-to-column',
    route: ITEMS,
    find: () => byText(document, 'th span', 'Applied to'),
    title: 'Applied to column',
    description: 'Changed: renamed from "Applied". Shows which kinds of record use the item (Competency group and/or IDP, as a bullet list when both) instead of a count. Production shows a number. Sorting still orders by how many records are linked.',
    placement: 'bottom-start',
  },
  {
    id: 'items-description-width',
    route: ITEMS,
    find: () => byText(document, 'th span', 'Description'),
    title: 'Narrower Description column',
    description: 'Changed: Description is capped at 240px so the wider Applied to column fits. Long descriptions wrap onto more lines.',
    placement: 'bottom-start',
  },
  {
    id: 'idp-list-import-button',
    route: IDP_LIST,
    find: () => byText(document.getElementById('page-header-actions'), 'button, span, p', 'Import'),
    corner: true,
    title: 'Import button',
    description: 'New: a secondary Import button in the page header opens the import page, where a spreadsheet of IDPs is uploaded. Production has no Import. Turn it on or off from the dev tools.',
    placement: 'bottom-end',
  },
  {
    id: 'idp-import-dropzone-hint',
    route: IDP_IMPORT,
    find: () => [...document.querySelectorAll('span')].find(el => ownText(el) === '.xlsx only with max size 10mb') ?? null,
    title: 'Dropzone description',
    description: 'Changed: the hint now reads ".xlsx only with max size 10mb", and the limit really is 10 MB (it was 5 MB). A larger file shows "File size is over 10 MB. Please upload a smaller file".',
    placement: 'bottom-start',
  },
  // ─── Import IDP step 2 + action plan drawer (8 Oct 2026 changes) ───────────────
  {
    id: 'idp-import-template-monitor',
    route: IDP_IMPORT,
    find: () => byText(document, 'button', 'Download template'),
    corner: true,
    title: 'Template goes to the activity monitor',
    description: 'Changed: Download template no longer shows a toast. It opens the header activity monitor on the Download tab, where the template is prepared and then ready to download from a download icon button.',
    placement: 'right-start',
  },
  {
    id: 'idp-import-monitor-download',
    route: IDP_IMPORT_OR_LIST,
    // The finished download row's icon button, inside the header activity monitor popover.
    find: () => document.querySelector('[data-pixel-component="MpPopoverContent"] button[aria-label="Download"]'),
    corner: true,
    title: 'Download icon button',
    description: 'Changed: a finished download in the activity monitor ends with a download icon button (tooltip "Download") instead of a "Download" text link. Applies to every download job.',
    placement: 'left',
  },
  {
    id: 'idp-import-drag-drop',
    route: IDP_IMPORT,
    find: () => byText(document, 'p, span', 'Drop your file here or'),
    title: 'Drag and drop',
    description: 'Changed: the dropzone stays highlighted while a file is dragged over it, a file dropped just outside it no longer opens in the browser, and dropping a file on the picked file replaces it.',
    placement: 'bottom-start',
  },
  {
    id: 'idp-import-file-row',
    route: IDP_IMPORT,
    // The picked file's name link (its own text is the .xlsx file name).
    find: () => [...document.querySelectorAll('[data-pixel-component="MpTextlink"]')].find(b => /\.xlsx$/i.test(ownText(b))) ?? null,
    title: 'Uploaded file',
    description: 'Changed: the file name is a text link that downloads the uploaded file, and the remove button is a minus-circular icon with a "Remove" tooltip (it was an X).',
    placement: 'bottom-start',
  },
  {
    id: 'idp-import-cancel-leave',
    route: IDP_IMPORT,
    // Step 2's Cancel: the one sharing a footer with Back (step 1 has no Back).
    find: () => [...document.querySelectorAll('button')].find(b => ownText(b) === 'Cancel'
      && !b.closest('[data-pixel-component="MpModalContent"]')
      && [...(b.parentElement?.parentElement?.querySelectorAll('button') ?? [])].some(x => ownText(x) === 'Back')) ?? null,
    corner: true,
    title: 'Cancel asks first',
    description: 'Changed: Cancel now sits alone on the left. It opens a "Leave this page?" confirmation anchored above it (no overlay): Cancel stays, Leave goes back to the IDP list. Back and Import are disabled while it is open.',
    placement: 'top-start',
  },
  {
    id: 'idp-drawer-no-error-toast',
    route: IDP_DETAIL_OR_FORM,
    // The action plan drawer's primary button (Add / Save).
    find: () => [...(document.getElementById('ap-related-to-label')?.closest('[data-pixel-component="MpDrawerContent"]')?.querySelectorAll('button') ?? [])]
      .find(b => ['Add', 'Save changes'].includes(ownText(b))) ?? null,
    corner: true,
    title: 'No error toast',
    description: 'Changed: an invalid Add / Save changes shows only the inline field errors. The "Please check the form\'s error" toast no longer appears.',
    placement: 'top-start',
  },
  {
    id: 'eval-filter-multiple',
    route: CYCLE_CREATE,
    when: isEvaluation,
    find: () => document.getElementById('employee-filter-label'),
    title: 'Multiple employee filters',
    description: 'Changed: production allows one filter type per cycle. Now HR picks types from the Add filter dropdown and can combine any of 6, including the new Job grade and Job class. Employees must match every filter; within one filter, any picked value counts.',
  },
  {
    id: 'eval-filter-caption',
    route: CYCLE_CREATE,
    when: isEvaluation,
    find: () => [...(employeeFilter()?.querySelectorAll('p') ?? [])].find(el => ownText(el) === 'Only employees who match these filters are included in this cycle') ?? null,
    title: 'Caption',
    description: 'New: one caption under the label says what the filter does. It stays the same, in the same place, in every state.',
  },
  {
    id: 'eval-filter-value-field',
    route: CYCLE_CREATE,
    when: isEvaluation,
    // The first value field itself; pinned to its corner so the row's layout
    // (value field → 24px → remove button) is untouched.
    find: () => employeeFilter()?.querySelector('.mp-gap_24px [data-pixel-component="MpInputGroup"]') ?? null,
    corner: true,
    title: 'Value field',
    description: 'Changed: type in the field itself to search (no search box in the list), and the field names the picked values instead of "{n} selected". The list is as wide as the field. Job grade and Job class load more as you scroll.',
  },
  {
    id: 'eval-filter-validation',
    route: CYCLE_CREATE,
    when: isEvaluation,
    find: () => [...(employeeFilter()?.querySelectorAll('span') ?? [])].find(el => ownText(el).startsWith('You must select at least one')) ?? null,
    title: 'Empty filter blocks Save',
    description: 'New: a filter with no value stops Save, with this message and an error toast. The PRD leaves validation for later, so the PM still needs to confirm this.',
  },
  {
    id: 'eval-filter-edit-locked',
    route: CYCLE_EDIT,
    when: isEvaluation,
    find: () => document.getElementById('employee-filter-label'),
    title: 'Locked on Edit, with a reason',
    description: 'Changed: production also disables this section on Edit, but says nothing. Hovering a locked field (Employee filter, and now Employment status) shows why it can\'t be changed.',
  },
  {
    id: 'role-form-module-search',
    route: ROLE_FORM,
    // The search field itself, pinned to its corner so the input's layout is untouched.
    find: () => document.getElementById('roles-permission-search')?.closest('[data-pixel-component="MpInputGroup"]') ?? null,
    corner: true,
    title: 'Search modules',
    description: 'New: type a module name to filter the permission table. A match on a row inside a module (e.g. Company goals or Evaluation review) shows that module, opened. Production has no search.',
    placement: 'bottom-end',
  },
  {
    id: 'role-form-goals-together',
    route: ROLE_FORM,
    find: () => roleLabel('goals', 'Goals'),
    title: 'Goals split by goal type',
    description: 'Changed: Goals now has Organization goals and Company goals beneath it, and each can be granted on its own. Within one goal type, View, Create, Edit and Delete are selected and cleared together, because the backend stores that access as all or nothing. Hover a Goals box to see why. Production has one set of Goals permissions with each action picked on its own.',
    placement: 'right-start',
  },
  {
    id: 'role-form-review-cycle-types',
    route: ROLE_FORM,
    find: () => roleLabel('review-cycle', 'Review cycle'),
    title: 'Review cycle split by review type',
    description: 'Changed: Review cycle permissions are now set per review type (Performance, Competency and Evaluation review), and Evaluation review can be limited to certain employment statuses. Production has one set of Review cycle permissions that covers every cycle.',
    placement: 'right-start',
  },
  {
    id: 'role-form-report-module',
    route: ROLE_FORM,
    find: () => roleLabel('report', 'Report'),
    title: 'Report is its own module',
    description: 'Changed: Report moved out of Review cycle into a module of its own, split by report type (Review results, Goals result and 9-box matrix), each with View and Create. Production has Report as one permission inside Review cycle.',
    placement: 'right-start',
  },
  {
    id: 'role-form-ninebox',
    route: ROLE_FORM,
    find: () => roleLabel('report-9box', '9-box matrix'),
    title: '9-box matrix has its own permission',
    description: 'Changed: the 9-box matrix is granted separately from the other reports, with its own "Same scope" toggle, so it can cover different review types than Review results. Production grants it as part of the single review cycle Report permission, with no 9-box check at all.',
    placement: 'right-start',
  },
  {
    id: 'role-form-same-scope-toggle',
    route: ROLE_FORM,
    find: () => roleLabel('report-results', 'Same scope as review cycle module setting'),
    title: 'Same scope toggle',
    description: 'New, on by default. On: this row covers the same review types (and employment statuses) as the Review cycle module, and follows it when that changes. Off: pick the review types for this row yourself; they start unselected.',
    placement: 'right-start',
  },
  {
    id: 'role-form-dashboard',
    route: ROLE_FORM,
    find: () => roleLabel('dashboard', 'Dashboard'),
    title: 'Dashboard permission',
    description: 'New: not in production yet. Production has no Dashboard permission. Here a role can be given view access to the dashboard, scoped by review type like Review cycle. It stays locked until at least one review type is picked in Review cycle, and clears if Review cycle is emptied.',
    placement: 'right-start',
  },
]

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
  /** Pin the pulse to the anchor's top-right corner (absolutely positioned) instead
   *  of appending it inline — for anchors inside a flex layout, where an extra
   *  inline child would take a gap slot and shift its siblings. */
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

export const COACHMARKS: CoachmarkDef[] = [
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
    title: 'Import button',
    description: 'New: a secondary Import button in the page header opens the import page, where a spreadsheet of IDPs is uploaded. Production has no Import. Turn it on or off from the dev tools.',
    placement: 'bottom-end',
  },
  {
    id: 'idp-import-steps',
    route: IDP_IMPORT,
    find: () => byText(document, 'p, span, div', 'Download the data template'),
    title: 'Import page',
    description: 'New page: three steps (download the template, fill it in, upload the .xlsx) like the production import pages, but stepped. Download and upload are mocked. A file named "error" shows the row-error banner.',
    placement: 'right-start',
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

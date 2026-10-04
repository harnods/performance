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
const IDP_DETAIL_OR_FORM = /^\/talents\/idps\/[^/]+/

// ─── Evaluation cycle: Create new cycle → Employee filter ────────────────────
const CYCLE_CREATE = /^\/reviews\/review-cycles\/create\/?$/
const isEvaluation = (r: RouteLocationNormalizedLoaded) => r.query.purpose === 'evaluation'
const isEvaluationEdit = (r: RouteLocationNormalizedLoaded) => isEvaluation(r) && r.query.mode === 'edit'
const employeeFilter = () => document.getElementById('employee-filter-label')?.parentElement ?? null

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
    when: r => isEvaluation(r) && r.query.mode !== 'edit',
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
    route: CYCLE_CREATE,
    when: isEvaluationEdit,
    find: () => document.getElementById('employee-filter-label'),
    title: 'Locked on Edit, with a reason',
    description: 'Changed: production also disables this section on Edit, but says nothing. Hovering a locked field now shows why it can\'t be changed.',
  },
]

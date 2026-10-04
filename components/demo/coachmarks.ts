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

// ─── Evaluation cycle: Create new cycle → Employee filter ────────────────────
const CYCLE_CREATE = /^\/reviews\/review-cycles\/create\/?$/
const isEvaluation = (r: RouteLocationNormalizedLoaded) => r.query.purpose === 'evaluation'
const isEvaluationEdit = (r: RouteLocationNormalizedLoaded) => isEvaluation(r) && r.query.mode === 'edit'
const employeeFilter = () => document.getElementById('employee-filter-label')?.parentElement ?? null

export const COACHMARKS: CoachmarkDef[] = [
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
    // The first value picker's row (value field + remove slot, 24px apart).
    find: () => employeeFilter()?.querySelector('.mp-gap_24px') ?? null,
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

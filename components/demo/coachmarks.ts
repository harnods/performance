// ─── DEMO ONLY — do not port to talenta-review / production ──────────────────
// Registry of "what's new vs production" coachmarks. Each entry finds an
// element that ALREADY exists in the product markup (by id or exact text), and
// DemoLayer appends a pulse inside it. Product components carry no demo code.
// See docs/patterns/dev-scenario-control.md.

export interface CoachmarkDef {
  id: string
  /** Route path this coachmark belongs to. */
  route: RegExp
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

const FORM = /^\/talents\/idps\/(create|[^/]+\/edit)\/?$/
const DETAIL = /^\/talents\/idps\/(?!create)[^/]+\/?$/
const IDP_LIST = /^\/talents\/idps\/?$/
const IDP_IMPORT = /^\/talents\/idps\/import\/?$/
const ITEMS = /^\/talents\/competencies\/items\/?$/
const IDP_DETAIL_OR_FORM = /^\/talents\/idps\/[^/]+/

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
]

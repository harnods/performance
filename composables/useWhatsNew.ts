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
    date: '08 Oct 2026',
    module: 'IDPs',
    items: [
      {
        category: 'Fix',
        area: 'Add / Edit action plan drawer',
        detail: 'An invalid Save in the action plan drawer now shows only the inline field errors, without the "Please check the form\'s error" toast.',
        files: ['components/IdpActionPlanModal.vue', 'docs/patterns/buttons.md'],
      },
      {
        category: 'Feature',
        area: 'Import IDP · Step 2',
        detail: 'Download template no longer shows a toast: it opens the header activity monitor on the Download tab with the template as a job, and a finished download row now ends with a download icon button (tooltip "Download") instead of a text link. The uploaded file\'s name is a text link that downloads the file, the remove button is a minus-circular icon with a "Remove" tooltip, and Back and Import are disabled while the Leave modal is open. Starting a second job while the monitor is already open no longer closes it.',
        files: ['components/StepImportPage.vue', 'components/AppHeader.vue', 'docs/patterns/upload.md', 'docs/patterns/modal.md'],
      },
      {
        category: 'Feature',
        area: 'Import IDP · Step 2 footer',
        detail: 'Cancel now sits alone at the far left of step 2, with Back and Import grouped at the right. Pressing Cancel opens a "Leave this page?" confirmation anchored just above the button (no overlay, no close button): "Your progress on this page will not be saved.", with Cancel to stay and Leave (a danger button, as Pixel has no warning variant) to go back to the IDP list.',
        files: ['components/StepImportPage.vue', 'docs/patterns/modal.md', 'docs/patterns/upload.md', 'docs/patterns/buttons.md'],
      },
      {
        category: 'Feature',
        area: 'Import IDP · Step 2',
        detail: 'Drag and drop on the upload step is now solid: the dropzone stays highlighted while a file is dragged over its icon and text (it flickered off before), a file dropped just outside the zone no longer makes the browser open it and leave the page, and dropping a file on the picked file\'s row replaces it. Only the first file is used and it gets the same type and size checks.',
        files: ['components/StepImportPage.vue', 'docs/patterns/upload.md'],
      },
      {
        category: 'Fix',
        area: 'Import IDP · Step 1',
        detail: 'The selected-employee list\'s load link now says how many it loads: "Load 10 more" while more than 10 are left, otherwise just the remaining ones (e.g. "Load 6 more"), with no trailing period. The Select employees drawer on this page now shows at most 10 employees per list (Employees and Selected employees), then "Load N more" (opt-in paginated prop; other pages that use the drawer are unchanged).',
        files: ['components/StepImportPage.vue', 'components/SelectEmployeesDrawer.vue', 'components/demo/coachmarks.ts', 'docs/patterns/pagination.md', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Fix',
        area: 'Import IDP · Import hand-off',
        detail: 'The "Import started" toast now lasts 3 seconds instead of Pixel\'s 5s default, so it no longer lingers until the (mocked) import finishes. The header activity monitor now really opens by itself on the Import tab after Import (the click on its trigger never fired because the template ref was always null).',
        files: ['components/StepImportPage.vue', 'components/AppHeader.vue', 'docs/patterns/upload.md'],
      },
      {
        category: 'Fix',
        area: 'Import IDP · Step 2',
        detail: 'The dropzone hint now reads ".xlsx only with max size 10mb", and the size limit is 10 MB instead of 5 MB (the "File size is over 10 MB" error follows). Coachmark added on the hint; the Import page coachmark was re-anchored to the "Download the IDP template" step and describes the two-step wizard.',
        files: ['components/StepImportPage.vue', 'components/demo/coachmarks.ts', 'docs/patterns/upload.md', 'docs/patterns/dev-scenario-control.md'],
      },
    ],
  },
  {
    date: '08 Oct 2026',
    module: 'Internal tools',
    items: [
      {
        category: 'Chore',
        area: 'Dev coachmarks',
        detail: 'New coachmarks for the 8 Oct changes: Download template going to the activity monitor, the monitor\'s download icon button, drag and drop, the uploaded file row, the step 2 Cancel confirmation, and the action plan drawer\'s missing error toast. Removed the "Import page" coachmark.',
        files: ['components/demo/coachmarks.ts', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Fix',
        area: 'Dev coachmarks',
        detail: 'Coachmark dots no longer sit on top of the first letters of a label (Employee, Select focus, Relates to). They were left to the browser\'s default position, which in a flex label is the left edge. Each dot is now placed from the measured end of its anchor\'s last line of text, so it stays attached to the element and scrolls with it.',
        files: ['components/demo/DemoLayer.vue', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Fix',
        area: 'Dev coachmarks',
        detail: 'An open coachmark now closes when its pulse scrolls out of view, instead of staying behind floating over the header with nothing to point at. While the pulse is visible it still follows the page as you scroll.',
        files: ['components/demo/DevCoachmark.vue', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Fix',
        area: 'Dev coachmarks',
        detail: 'The IDP list Import button\'s coachmark now overlaps the button\'s top-right corner (corner: true) instead of sitting inline, so the button no longer grows. The Import page coachmark was re-anchored to the "Download the IDP template" step and describes the two-step wizard, and a new coachmark marks the dropzone hint.',
        files: ['components/demo/coachmarks.ts', 'docs/patterns/dev-scenario-control.md'],
      },
    ],
  },
  {
    date: '07 Oct 2026',
    module: 'Roles',
    items: [
      {
        category: 'Feature',
        area: 'Role form · Goals',
        detail: 'Goals is split into Organization goals and Company goals, each granted on its own. Within one goal type, View, Create, Edit and Delete tick and clear together, and hovering a box says "Goals access applies to View, Create, Edit and Delete together". The Goals checkbox above them sets both types. Version 1 keeps the split in ui_state.goalsOn; the payload still grants Goals when either type is on.',
        files: ['components/manage-user/RolesForm.vue', 'components/manage-user/RolesPermissionTreeV2.vue', 'composables/useManageUserStore.ts', 'docs/patterns/checkbox.md', 'docs/patterns/table.md'],
      },
      {
        category: 'Feature',
        area: 'Role form · Module search',
        detail: 'A search field above the permission table filters modules by name, in both versions. A match on a row inside a module (e.g. Company goals) shows that module, opened; no match shows "No result found".',
        files: ['components/manage-user/RolesForm.vue', 'components/manage-user/RolesPermissionTreeV2.vue', 'docs/patterns/table.md'],
      },
      {
        category: 'Feature',
        area: 'Role form · Dashboard',
        detail: 'Dashboard is view only and stays locked until Review cycle has a review type. Its one row is now named Review cycle, with a single View box ("View dashboard for review cycles."). The Dashboard › Goals row and its toggle are removed in both versions, and emptying Review cycle clears Dashboard.',
        files: ['components/manage-user/RolesForm.vue', 'components/manage-user/RolesPermissionTreeV2.vue', 'docs/patterns/table.md', 'docs/patterns/checkbox.md', 'docs/patterns/toggle.md'],
      },
      {
        category: 'Feature',
        area: 'Role form · 9-box matrix',
        detail: 'The 9-box matrix has its own scope toggle and review types, like Review results. The toggle reads "Same scope as review cycle module setting". Its scope is saved with the 9-box permission and restored on Edit.',
        files: ['components/manage-user/RolesForm.vue', 'components/manage-user/RolesPermissionTreeV2.vue', 'composables/useManageUserStore.ts', 'docs/patterns/table.md', 'docs/patterns/toggle.md'],
      },
      {
        category: 'Fix',
        area: 'Role form · Goals result',
        detail: 'Goals result is all or nothing, like the Goals module. Ticking or unticking View or Create sets both, in both versions, and hovering says "Goals result access applies to View and Create together".',
        files: ['components/manage-user/RolesForm.vue', 'components/manage-user/RolesPermissionTreeV2.vue', 'docs/patterns/checkbox.md', 'docs/patterns/table.md'],
      },
      {
        category: 'Fix',
        area: 'Role form · Version 2 Report',
        detail: 'Review results no longer has an extra Review cycle row beneath it. Its "Same scope" toggle sits directly under its title, and roles saved before still load.',
        files: ['components/manage-user/RolesPermissionTreeV2.vue', 'docs/patterns/table.md'],
      },
      {
        category: 'Chore',
        area: 'Role form · Copy',
        detail: 'Review Settings and Manage Users use production\'s copy word for word. In Version 1, "Employee status" is renamed "Employment status" and sits 4px above its checkboxes.',
        files: ['utils/manageUser.ts', 'components/manage-user/RolesForm.vue', 'docs/patterns/table.md'],
      },
      {
        category: 'Chore',
        area: 'Role form · Default persona',
        detail: 'The role form opens as Super Admin Rizal Candra on its first open per page load. Switching to Rio from View as still works until the next reload.',
        files: ['components/manage-user/RolesForm.vue', 'docs/patterns/checkbox.md'],
      },
      {
        category: 'Chore',
        area: 'Dev tools · Role form',
        detail: 'Add / Edit role has one dev tools button, bottom-left, holding the Version 1 / 2 switch and the coachmark controls. RolesFormScenarioControl is removed.',
        files: ['components/demo/RolesFormDevTools.vue', 'components/demo/DemoLayer.vue', 'pages/settings/manage-users/roles/add.vue', 'pages/settings/manage-users/roles/edit/[id].vue', 'docs/patterns/dev-scenario-control.md', 'docs/patterns/form.md'],
      },
      {
        category: 'Chore',
        area: 'Coachmarks',
        detail: 'Role form coachmarks for module search, Review cycle, Goals, Report, the Same scope toggle, 9-box matrix and Dashboard. Pulses no longer change any layout on any page: the host is out of flow and zero-size.',
        files: ['components/demo/coachmarks.ts', 'components/demo/DemoLayer.vue', 'components/demo/DevCoachmark.vue', 'docs/patterns/dev-scenario-control.md'],
      },
    ],
  },
  {
    date: '07 Oct 2026',
    module: 'IDPs',
    items: [
      {
        category: 'Chore',
        area: 'IDP list · Import',
        detail: 'The Import button in the page header now always shows. Removed the "Show Import" toggle and the showImport dev flag; the list dev tools keep only the coachmark controls.',
        files: ['pages/talents/idps/index.vue', 'components/demo/IdpListDevTools.vue', 'composables/useIdpImportFlag.ts', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Feature',
        area: 'Import IDP · Import hand-off',
        detail: 'Clicking Import on step 2 now goes back to the IDP list with an "Import started" toast and opens the header activity monitor on the Import tab, with the job progressing (same hand-off as the competency upload). The "Generating template..." loader is now 2 seconds and centres in the same 720px column as the stepper, and the employee picker drawer\'s confirm button reads Save instead of Continue. Completed rows in the header activity monitor now show a filled green check, a semibold file name and a description line. When the import job completes, one mock IDP per picked employee is added to the IDP list (the file itself is not read). The step 1 employee list is now 6 of 12 columns from tablet width (768px) up and capped at 656px (the form-column width), so it no longer stretches on wide screens.',
        files: ['components/StepImportPage.vue', 'components/AppHeader.vue', 'composables/useActivityMonitor.ts', 'utils/idpImportMock.ts', 'docs/patterns/upload.md'],
      },
    ],
  },
  {
    date: '07 Oct 2026',
    module: 'Review cycles',
    items: [
      {
        category: 'Feature',
        area: 'Edit cycle (Evaluation)',
        detail: 'Added the Edit cycle page for evaluation cycles (/reviews/review-cycles/:id/edit), opened from the cycle detail page\'s "Edit cycle" button. It reuses the Create form, pre-filled from the saved cycle, with Employment status and Employee filter locked (hover explains why). Save changes returns to the detail page with a "Review cycle updated" toast.',
        files: ['pages/reviews/review-cycles/[id]/edit.vue', 'components/EvaluationCycleForm.vue', 'pages/reviews/review-cycles/create.vue', 'pages/reviews/review-cycles/[id]/index.vue', 'utils/evaluationCycleScenarios.ts', 'docs/patterns/form.md', 'docs/patterns/page-form.md'],
      },
      {
        category: 'Chore',
        area: 'Create new cycle · Dev tools',
        detail: 'Removed the "Edit cycle (read-only)" scenario (the ?mode=edit preview) from the evaluation-cycle dev tools, now that Edit cycle is a real page. The locked-on-Edit coachmark moved to the edit page.',
        files: ['components/demo/EvaluationCycleDevTools.vue', 'components/demo/coachmarks.ts', 'docs/patterns/dev-scenario-control.md'],
      },
    ],
  },
  {
    date: '06 Oct 2026',
    module: 'Review cycles',
    items: [
      {
        category: 'Feature',
        area: 'Evaluation cycle details · Employee filter',
        detail: 'Saving an evaluation cycle now persists its employment status and employee filters (value labels, not ids). The cycle detail page shows an "Employee filter" row directly below Employment status: one "Parameter: Value" bullet per filter when there are 2+, a single plain line for one filter, no row when none.',
        files: ['composables/useReviewCyclesStore.ts', 'pages/reviews/review-cycles/create.vue', 'pages/reviews/review-cycles/[id]/index.vue', 'docs/patterns/form.md'],
      },
    ],
  },
  {
    date: '06 Oct 2026',
    module: 'IDPs',
    items: [
      {
        category: 'Feature',
        area: 'Import IDP · two-step wizard',
        detail: 'The import page is now a two-step wizard with a hand-rolled stepper. Step 1 picks employees with the shared SelectEmployeesDrawer: a list of 10 with "Showing 10 of 26 employees. Load more", a search field (name or employee ID) once there are more than 10, and a 6-of-12-column width. Continue shows a 3-second "Generating template..." spinner when more than 25 employees are picked. Step 2 has the download / fill in / upload steps with the competency import\'s dropzone, a Cancel / Back / Import footer (MpButtonGroup), and the empty-selection error shows only on a Continue click. All wording audited (Continue instead of Next, "Add employees", XLSX file errors, new toasts); max file size is now 5 MB.',
        files: ['components/StepImportPage.vue', 'pages/talents/idps/import.vue', 'docs/patterns/upload.md', 'docs/patterns/pagination.md'],
      },
      {
        category: 'Chore',
        area: 'Dev tools · Import page',
        detail: 'On step 2 the dev tools gain a Scenario group (Default / Loading state, which keeps step 2 on the loader) next to Error states; both show only on step 2 (new importScenario / importStep flags).',
        files: ['components/demo/IdpDevTools.vue', 'composables/useIdpImportFlag.ts', 'docs/patterns/dev-scenario-control.md'],
      },
    ],
  },
  {
    date: '06 Oct 2026',
    module: 'Roles',
    items: [
      {
        category: 'Feature',
        area: 'Role form · Delegated user',
        detail: 'Permission checkboxes are locked by who is editing (new useRoleActor): Rizal (Super Admin) grants anything; Rio is a delegated user who can only grant what his own role holds (mock: Performance + Evaluation purposes, Probation + Contract statuses, no Delete, no 9-box report, no Dashboard); everyone else gets every checkbox locked and a disabled "Add role" button with the tooltip "Contact your admin to get access to add roles". Each locked checkbox explains why on hover (RolesLock). The Roles list button is renamed from "Add new role" to "Add role".',
        files: ['composables/useRoleActor.ts', 'components/manage-user/RolesLock.vue', 'components/manage-user/RolesForm.vue', 'components/manage-user/RolesPermissionTreeV2.vue', 'pages/settings/manage-users/roles/index.vue', 'docs/patterns/checkbox.md', 'docs/patterns/buttons.md'],
      },
      {
        category: 'Feature',
        area: 'Role form · Goals and View rules',
        detail: 'Manage Goal is now Goals (View / Create / Edit / Delete), listed after Review cycle, and is all-or-nothing in both versions: ticking any Goals box ticks all of them, with a "Goals access is all or nothing" tooltip. Dashboard > Goals gets a "Same scope as goals module setting" toggle. Create / Edit / Delete now also tick View (and unticking View clears them) everywhere else. "Same scope" toggles default on with a caption that is hidden until something is selected; Version 2 toggles are disabled when the module is locked. Version 1 parent rows have a semibold title.',
        files: ['components/manage-user/RolesForm.vue', 'components/manage-user/RolesPermissionTreeV2.vue', 'utils/manageUser.ts', 'docs/patterns/checkbox.md', 'docs/patterns/toggle.md', 'docs/patterns/table.md'],
      },
      {
        category: 'Fix',
        area: 'Role form · Save then Edit',
        detail: 'Editing a saved role now restores the selection (it opened blank, mainly in Version 2). The form saves a ui_state blob with the role (Version 2 tree, Report / Dashboard rows, scope toggles) and restores it on Edit.',
        files: ['components/manage-user/RolesForm.vue', 'components/manage-user/RolesPermissionTreeV2.vue', 'composables/useManageUserStore.ts', 'docs/patterns/form.md'],
      },
      {
        category: 'Chore',
        area: 'Dev tools',
        detail: 'The roles form scenario control moved to the bottom-left, like the IDP dev tools.',
        files: ['components/manage-user/RolesFormScenarioControl.vue', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Feature',
        area: 'Role form · Version 2 permission table',
        detail: 'Version 2 is now a full-width collapsible module tree (Figma "Table / Custom role performance"): 440px Permission column + View / Create / Edit / Delete columns, consistent 24px indent per level, parent boxes reflect their subtree. Turning on an "Apply … settings" toggle removes the caret and hides the node\'s children. Prototype state only (not in the submitted payload).',
        files: ['components/manage-user/RolesPermissionTreeV2.vue', 'components/manage-user/RolesForm.vue', 'docs/patterns/table.md', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Feature',
        area: 'Role form · Version 1 permission table',
        detail: 'Table is now full width: Module (renamed from Access) is a fixed 440px, Permission fills the rest. Report\'s "Same scope as review cycle module" is a toggle (same as Version 2), review purposes read "Performance / Competency / Evaluation review", and the Dashboard checkbox is always enabled. Version 2\'s toggles are renamed "Same scope as … module".',
        files: ['components/manage-user/RolesForm.vue', 'components/manage-user/RolesPermissionTreeV2.vue', 'docs/patterns/table.md'],
      },
      {
        category: 'Feature',
        area: 'Role form · Version 1 Report & Dashboard',
        detail: 'Review cycle, Report and Dashboard fold with a caret. Report rows: Standard report (same-scope toggle 8px below its title; off → unchecked purpose checkboxes aligned with the toggle title, no borders), 9-Box report and Goals — each View + Create. Dashboard rows: Performance review and Goals mirror Review cycle\'s Performance and Manage Goal permissions.',
        files: ['components/manage-user/RolesForm.vue', 'docs/patterns/table.md'],
      },
      {
        category: 'Chore',
        area: 'Role form · Report & Dashboard naming and scope',
        detail: 'Renamed (all versions) Standard report → Review results, 9-Box report → 9-box matrix, Goals → Goals result (now ordered Review results, Goals result, 9-box matrix). The toggle reads "Same scope as review cycle module setting" with no caption. Version 1 dividers are full width everywhere, and Dashboard\'s Performance review gets the same toggle + scope checkboxes as Review results. Version 2 is middle-aligned now (no 3-line cell).',
        files: ['components/manage-user/RolesForm.vue', 'components/manage-user/RolesPermissionTreeV2.vue', 'utils/manageUser.ts', 'docs/patterns/table.md'],
      },
    ],
  },
  {
    date: '05 Oct 2026',
    module: 'IDPs',
    items: [
      {
        category: 'Feature',
        area: 'IDP list · Import',
        detail: 'Secondary Import button in the page header (hidden by default; "Show Import" toggle in the new bottom-right dev tools, with coachmarks; the import page dev tools, bottom-left, force "file too large" / "wrong format" errors) opens /talents/idps/import: stepped layout (1 Download template, 2 Fill in, 3 Upload) with dropzone, Cancel / Import (mocked).',
        files: ['pages/talents/idps/index.vue', 'pages/talents/idps/import.vue', 'components/StepImportPage.vue', 'components/demo/IdpListDevTools.vue', 'components/demo/IdpDevTools.vue', 'components/demo/coachmarks.ts', 'composables/useIdpImportFlag.ts', 'docs/patterns/upload.md', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Feature',
        area: 'Add action plan drawer · Competency item picker',
        detail: 'Empty source list shows "No competency items yet" + a "+ Add competency item" link (opens Create competency item in a new tab) via new PxSelectPopover empty-text/empty-action props. Dev-tools icon next to the X forces Filled vs Empty competency items.',
        files: ['components/IdpActionPlanModal.vue', 'components/PxSelectPopover.vue', 'components/demo/ActionPlanDevTools.vue', 'docs/patterns/form.md', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Fix',
        area: 'Create plan · Future job position',
        detail: 'Select is indented 32px under its radio, label removed, placeholder "Select job position".',
        files: ['components/IdpPlanForm.vue'],
      },
    ],
  },
  {
    date: '05 Oct 2026',
    module: 'Competencies',
    items: [
      {
        category: 'Feature',
        area: 'Competency items · IDP linkage',
        detail: 'Applied now counts IDPs whose action plans link the item (once per IDP). A linked item cannot be deleted; "Unable to delete" lists Group and IDP as bullets (succession plans no longer block) with an "OK, understand" button. ?create=1 opens the Create modal. Applied column renamed "Applied to": shows Competency group / IDP (bullets when both) instead of a count.',
        files: ['pages/talents/competencies/items/index.vue', 'utils/competencyItem.ts', 'docs/patterns/modal.md'],
      },
      {
        category: 'Feature',
        area: 'Competency items · Dev coachmarks',
        detail: 'Pulse coachmarks on the table headers flag what differs from production: "Applied to" column and the narrower Description column.',
        files: ['components/demo/coachmarks.ts', 'docs/patterns/dev-scenario-control.md'],
      },
    ],
  },
  {
    date: '04 Oct 2026',
    module: 'Review cycles',
    items: [
      {
        category: 'Feature',
        area: 'Create new cycle (Evaluation) · Employee filter',
        detail: 'Multiple employee filters (PRD "Multiple Filters for Evaluation Cycle Employee Selection"): combine any of 6 types (Organization, Branch, Job position, Job level, plus new Job grade and Job class) via an "Add filter ▾" dropdown that lists only unused types. Rows are separated by an "and" divider (AND across filters, OR within one), each added row has a remove button with a "Remove" tooltip, and one fixed caption under the label ("Only employees who match these filters are included in this cycle") says what the filter does. Values start empty ("Select {filter}"), the field lists picked names, an empty filter blocks Save with "You must select at least one {filter}", and on Edit (?mode=edit) the section is read-only with a hover tooltip explaining why.',
        files: ['pages/reviews/review-cycles/create.vue', 'docs/patterns/form.md', 'docs/patterns/buttons.md'],
      },
      {
        category: 'Feature',
        area: 'Create new cycle (Evaluation) · filter value picker',
        detail: 'DashMultiSelectSearch gains opt-in form props: searchOnField (type in the field itself, no search box in the popover, popover as wide as the field), summarize, placeholder, isDisabled/isInvalid, remoteSearch + @search (server-side search), and infinite scroll for server-paged lists (Job grade / Job class) using MpAutocomplete\'s pattern: loads the next page at the end of the list with a Spinner + "Loading" row. The dashboard keeps its existing picker.',
        files: ['components/DashMultiSelectSearch.vue', 'docs/patterns/filter-bar.md', 'docs/patterns/form.md'],
      },
      {
        category: 'Fix',
        area: 'Disabled selects (app-wide)',
        detail: 'Disabled MpSelects looked lighter than disabled inputs because the browser adds opacity 0.7 to a disabled <select> on top of Pixel\'s disabled tokens. Reset that browser fade so every disabled field renders Pixel\'s text/background/border.disabled the same way.',
        files: ['assets/css/main.css', 'docs/patterns/form.md'],
      },
      {
        category: 'Chore',
        area: 'Demo coachmarks + dev tools',
        detail: 'Brought the demo-only coachmark layer from fix/IDP (DemoLayer, DevCoachmark, useDevCoachmarks; not auto-imported, off with NUXT_PUBLIC_DEMO_MODE=false) and added evaluation-cycle coachmarks plus EvaluationCycleDevTools (bottom-left FAB: Edit cycle (read-only) switch + show/reset coachmarks).',
        files: ['components/demo/', 'app.vue', 'nuxt.config.ts', 'assets/css/main.css', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Fix',
        area: 'Create new cycle (Evaluation) · Employee filter',
        detail: 'Value picker options didn\'t tick on a real mouse click: clicking the checkbox label text fired a second (synthetic) click that toggled the row back. Rows now toggle on click.prevent (also fixes the dashboard picker). Turned off browser autofill on type-in select fields so Chrome\'s suggestion bubble no longer covers the Pixel popover. With 2+ rows every row (top included) has a remove button; a lone row never does. The value-field demo pulse is pinned to the field\'s corner, so it no longer shifts the first row\'s remove button or stretches the "and" divider.',
        files: ['components/DashMultiSelectSearch.vue', 'components/PxSelectPopover.vue', 'pages/reviews/review-cycles/create.vue', 'components/demo/DemoLayer.vue', 'components/demo/coachmarks.ts', 'docs/patterns/form.md', 'docs/patterns/dev-scenario-control.md'],
      },
    ],
  },
  {
    date: '02 Oct 2026',
    module: 'IDPs',
    items: [
      {
        category: 'Feature',
        area: 'IDP list',
        detail: 'Progress column now uses the goals-list track/fill bar with a right-aligned "N of M" (total semibold) above it, replacing MpProgress.',
        files: ['pages/talents/idps/index.vue', 'docs/patterns/table.md'],
      },
      {
        category: 'Fix',
        area: 'IDP store',
        detail: 'localStorage plans now load after hydration, so a hard reload no longer leaves stale progress-bar widths from the SSR seed.',
        files: ['composables/useIdpStore.ts'],
      },
      {
        category: 'Feature',
        area: 'IDP detail',
        detail: 'Summary row matches production sizing (14/20 text, no vertical padding, equal-width status totals). "Relation" column renamed "Relates to" (name + "Competency" caption).',
        files: ['pages/talents/idps/[id]/index.vue', 'docs/patterns/stat-card.md', 'docs/patterns/table.md'],
      },
      {
        category: 'Feature',
        area: 'Action plan Update modal',
        detail: 'Production paddings and layout; "Relates to" group shows Competency, the name and a "View details" link that opens the new read-only Competency detail drawer (target score by department).',
        files: ['components/IdpActionPlanViewModal.vue', 'components/CompetencyDetailDrawer.vue', 'pages/talents/idps/[id]/index.vue', 'docs/patterns/modal.md', 'docs/patterns/page-form.md'],
      },
      {
        category: 'Feature',
        area: 'Create/edit development plan',
        detail: 'Action-plan rows use a kebab menu (Edit / Delete) instead of separate icon buttons; "Relates to" column matches the detail page.',
        files: ['components/IdpPlanForm.vue', 'docs/patterns/table.md'],
      },
      {
        category: 'Feature',
        area: 'IDP detail',
        detail: 'Relates to: competency name is link-coloured and opens the Competency detail drawer.',
        files: ['pages/talents/idps/[id]/index.vue', 'docs/patterns/table.md'],
      },
      {
        category: 'Feature',
        area: 'Action plan Update modal',
        detail: 'Header reads "Update action plan" (Pixel header padding); the name is a 20/600 title with its description below, as in the form; activity timestamps sit under each entry.',
        files: ['components/IdpActionPlanViewModal.vue', 'docs/patterns/modal.md'],
      },
      {
        category: 'Chore',
        area: 'Demo',
        detail: 'Demo-only coachmarks (orange pulses) flag what differs from production, with a bottom-left dev tools panel (show/hide, reset). All demo code lives in components/demo/, mounted once from app.vue behind runtimeConfig.public.demoMode, and is excluded from component auto-import. Product files carry no demo code.',
        files: ['components/demo/DemoLayer.vue', 'components/demo/coachmarks.ts', 'components/demo/DevCoachmark.vue', 'components/demo/IdpDevTools.vue', 'components/demo/useDevCoachmarks.ts', 'app.vue', 'nuxt.config.ts', 'assets/css/main.css', 'docs/patterns/dev-scenario-control.md'],
      },
      {
        category: 'Feature',
        area: 'Relates to (competency item)',
        detail: 'IDP now relates action plans to Competency items instead of competency assignments: "Competency" → "Competency item" everywhere (drawer radio, picker, table captions, Update modal). Picker options come from the competency item store (name 1 line, description 2 lines, ellipsis). The Competency item detail drawer shows the item\'s description and rating scale (Rating left-aligned) instead of target score by department.',
        files: ['components/IdpActionPlanModal.vue', 'components/CompetencyDetailDrawer.vue', 'components/IdpActionPlanViewModal.vue', 'components/IdpPlanForm.vue', 'pages/talents/idps/[id]/index.vue', 'utils/idp.ts', 'components/demo/coachmarks.ts', 'docs/patterns/table.md', 'docs/patterns/form.md', 'docs/patterns/modal.md', 'docs/patterns/page-form.md'],
      },
    ],
  },
  {
    date: '02 Oct 2026',
    module: 'Design system',
    items: [
      {
        category: 'Feature',
        area: 'PxSelectPopover',
        detail: 'Searchable selects now search in the field itself; the search bar inside the popover is removed app-wide. Creatable selects (Category, Objective) offer "Add \"…\" as a {label}" instead of committing every keystroke.',
        files: ['components/PxSelectPopover.vue', 'components/IdpActionPlanModal.vue', 'components/IdpPlanForm.vue', 'docs/patterns/form.md', 'CLAUDE.md'],
      },
      {
        category: 'Chore',
        area: 'Column settings',
        detail: 'Column-settings buttons use the table-view-column icon everywhere.',
        files: ['pages/talents/idps/index.vue', 'pages/talents/talent-directory/index.vue', 'pages/goals/goal-cycles/[id]/index.vue', 'pages/goals/goal-cycles/[id]/company-goals.vue', 'pages/goals/goal-cycles/[id]/organization-goals.vue', 'pages/goals/goal-cycles/[id]/team-goals.vue', 'pages/goals/goal-cycles/[id]/individual-goals.vue', 'docs/patterns/filter-bar.md'],
      },
      {
        category: 'Feature',
        area: 'PxSelectPopover',
        detail: 'Creatable selects show a centred, link-coloured "Add “…”" row when the typed text matches nothing; non-creatable selects show "No results found", padded like an option.',
        files: ['components/PxSelectPopover.vue', 'docs/patterns/form.md', 'CLAUDE.md'],
      },
      {
        category: 'Fix',
        area: 'Forms',
        detail: 'No space between a field label and its required asterisk: Pixel\'s 4px margin zeroed globally, and hand-built asterisks no longer use a gap.',
        files: ['assets/css/main.css', 'components/AddGoalDrawer.vue', 'components/AddKeyResultDrawer.vue', 'components/GoalCategoryFormDrawer.vue', 'components/GoalCycleInfoPanel.vue', 'components/SuccessionPromoteModal.vue', 'components/SuccessionReadinessModal.vue', 'pages/goals/goal-cycles/index.vue', 'pages/talents/succession-plans/create.vue', 'docs/patterns/form.md'],
      },
    ],
  },
  {
    date: '02 Oct 2026',
    module: 'Competencies',
    items: [
      {
        category: 'Feature',
        area: 'Competency items',
        detail: 'Migrated the competency item pages from talenta-review (010875214aba) as a static prototype: list (search, sort, bulk select, kebab, delete / unable-to-delete flows, pagination), full-size Create/Edit item modal with rating scale, Upload .xlsx and Edit bulk item pages, and a Filled/Empty scenario control. Mock data verified against talenta-noncore-api (cde912f): Applied counts competency groups only, newest-first order, Novice…Proficient default ratings, FE toast copy.',
        files: ['pages/talents/competencies/items/index.vue', 'pages/talents/competencies/items/upload.vue', 'pages/talents/competencies/items/bulk-edit.vue', 'components/competency-item/ModalForm.vue', 'components/competency-item/Upload.vue', 'components/rating-scale/ModalForm.vue', 'components/UploadPage.vue', 'components/CompetencyItemScenarioControl.vue', 'composables/useCompetencyItemStore.ts', 'utils/competencyItem.ts', 'docs/patterns/page-form.md', 'docs/patterns/upload.md', 'docs/patterns/checkbox.md', 'docs/patterns/dev-scenario-control.md'],
      },
    ],
  },
  {
    date: '23 Sep 2026',
    module: 'IDPs',
    items: [
      {
        category: 'Fix',
        area: 'Add action plan',
        detail: '"Select competency" popover panel could render wider than the field itself when an option\'s description was long — `MpPopover`\'s `is-adaptive-width` only sets a min-width to the trigger, not an exact width. `PxSelectPopover` now measures the trigger with a ResizeObserver and passes an explicit width to the popover content, clamping every select popover (not just this one) to the field\'s width.',
        files: ['components/PxSelectPopover.vue', 'docs/patterns/form.md'],
      },
      {
        category: 'Fix',
        area: 'Add action plan',
        detail: 'The competency dropdown\'s option titles were rendered semi-bold via PxSelectPopover\'s shared default — right for an identity (a name above a job title) but not for a plain term explained by its own description. Overrode the option render for this select only (regular-weight title, unchanged layout/caption); every other select keeps the bold default.',
        files: ['components/IdpActionPlanModal.vue', 'docs/patterns/form.md'],
      },
      {
        category: 'Chore',
        area: 'Add action plan',
        detail: 'Moved the "Relates to" (Competency/Goal) section below Start date/End date, after Description.',
        files: ['components/IdpActionPlanModal.vue'],
      },
    ],
  },
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
    date: '23 Sep 2026',
    module: 'Reviews',
    items: [
      {
        category: 'Feature',
        area: 'Review cycle detail → timeframe group menu',
        detail: 'Added a "Delete" option (red, below a divider) to each review timeframe group\'s kebab menu. Confirms via a narrow (400px) modal — "Delete review timeframe? / This will permanently delete all employee reviews under this timeframe." — before removing the whole timeframe group.',
        files: ['pages/reviews/review-cycles/[id]/index.vue', 'docs/patterns/modal.md'],
      },
      {
        category: 'Fix',
        area: 'Create review cycle → Review period example banner',
        detail: 'Reworded the contract-example banner: title is now "6-month contract example" with a "Reviewed every 2 months · 3-day window" description line beneath it, and the redundant trailing summary line was removed.',
        files: ['pages/reviews/review-cycles/create.vue'],
      },
      {
        category: 'Chore',
        area: 'Create review cycle → Review period (multiple)',
        detail: 'Removed the "6-month contract example" illustrative card (title, description, and 3-column timeline) from the Multiple review periods section for the demo build.',
        files: ['pages/reviews/review-cycles/create.vue'],
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

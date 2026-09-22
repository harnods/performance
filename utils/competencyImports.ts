// ─────────────────────────────────────────────────────────────────────────────
// Mock seed for the competency "Import history" tab. Mirrors the production
// import-history table (talenta-review: ImportHistorySection.vue) — Date,
// Context, Job position, Vendor, Employees, Status, Uploader — grounded in the
// repo's real job positions (utils/competency) and employees (utils/employees).
// Timestamps use the repo's table format ("DD Mon YYYY, HH:mm", same as
// Goal.updatedAt).
// ─────────────────────────────────────────────────────────────────────────────

export type ImportStatus = 'completed' | 'failed'
export type ImportContext = 'Current job position' | 'Future job position'

export interface CompetencyImport {
  id: string
  date: string
  context: ImportContext
  jobPosition: string
  vendor: string
  employees: number
  status: ImportStatus
  uploaderId: string // resolves to name + "code | title | department" via utils/employees
}

export function seedCompetencyImports(): CompetencyImport[] {
  return [
    { id: 'imp-12', date: '28 Aug 2026, 10:15', context: 'Current job position', jobPosition: 'Accountant', vendor: 'TalentLens', employees: 2, status: 'completed', uploaderId: 'rio' },
    { id: 'imp-11', date: '27 Aug 2026, 16:40', context: 'Current job position', jobPosition: 'Barista', vendor: 'SHL Indonesia', employees: 3, status: 'failed', uploaderId: 'rio' },
    { id: 'imp-10', date: '26 Aug 2026, 09:05', context: 'Future job position', jobPosition: 'Head of Accounting', vendor: 'AssessFirst', employees: 1, status: 'completed', uploaderId: 'rizal' },
    { id: 'imp-09', date: '25 Aug 2026, 14:20', context: 'Current job position', jobPosition: 'Sales Representative', vendor: 'Mercer | Mettl', employees: 4, status: 'completed', uploaderId: 'rio' },
    { id: 'imp-08', date: '22 Aug 2026, 11:00', context: 'Current job position', jobPosition: 'Head Chef', vendor: 'TalentLens', employees: 1, status: 'failed', uploaderId: 'rizal' },
    { id: 'imp-07', date: '20 Aug 2026, 15:30', context: 'Current job position', jobPosition: 'Waitstaff', vendor: 'SHL Indonesia', employees: 2, status: 'completed', uploaderId: 'rio' },
    { id: 'imp-06', date: '18 Aug 2026, 08:45', context: 'Future job position', jobPosition: 'Sales Director', vendor: 'AssessFirst', employees: 1, status: 'completed', uploaderId: 'rizal' },
    { id: 'imp-05', date: '15 Aug 2026, 13:10', context: 'Current job position', jobPosition: 'Restaurant Manager', vendor: 'Mercer | Mettl', employees: 1, status: 'completed', uploaderId: 'rio' },
    { id: 'imp-04', date: '13 Aug 2026, 09:40', context: 'Current job position', jobPosition: 'HR Admin', vendor: 'SHL Indonesia', employees: 2, status: 'completed', uploaderId: 'rio' },
    { id: 'imp-03', date: '11 Aug 2026, 14:05', context: 'Current job position', jobPosition: 'Finance Admin', vendor: 'TalentLens', employees: 2, status: 'failed', uploaderId: 'rizal' },
    { id: 'imp-02', date: '08 Aug 2026, 10:50', context: 'Future job position', jobPosition: 'Head Chef', vendor: 'AssessFirst', employees: 1, status: 'completed', uploaderId: 'rizal' },
    { id: 'imp-01', date: '05 Aug 2026, 16:20', context: 'Current job position', jobPosition: 'Cashier', vendor: 'Mercer | Mettl', employees: 3, status: 'completed', uploaderId: 'rio' },
  ]
}

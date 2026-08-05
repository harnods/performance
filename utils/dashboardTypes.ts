// Shared types for the Dashboard (Performance Review analytics) widgets.

export interface FilterDimension {
  key: string
  label: string
  options: { id: string, name: string }[]
}

export interface ReviewRow {
  id: string // unique row key (for picked co-worker rows: `${employeeId}::${cycle}`)
  name: string
  employeeId: string
  photo?: string
  count: number
  cycleName?: string
  org: string
  branch: string
  jobPosition: string
  jobLevel: string
  sentEmail?: boolean
  // Picked co-worker rows are per (employee, cycle): these carry the real
  // employee id + cycle so the Pick co-worker drawer can preload correctly.
  revieweeId?: string
  cycleValue?: string
}

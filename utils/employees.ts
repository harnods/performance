// ─────────────────────────────────────────────────────────────────────────────
// Shared mock: the logged-in user's subordinates.
// Single source of truth — reused by Home (All employees), the employee
// directory modal, and anywhere else employees are listed.
//
// `photo` points to a local file in /public/avatars/ (served at /avatars/…).
// Drop an image named <id>.jpg there for each employee below and it renders
// automatically; MpAvatar falls back to coloured initials if the file is missing.
// ─────────────────────────────────────────────────────────────────────────────

export interface Employee {
  id: string
  name: string
  code: string
  title: string
  department: string
  photo?: string
}

export const EMPLOYEES: Employee[] = [
  { id: 'agung', name: 'Agung Setiawarman', code: 'CP021', title: 'Accountant', department: 'Accounting', photo: '/avatars/agung.jpg' },
  { id: 'alfian', name: 'Alfian Ramadhan', code: 'CP042', title: 'HR Admin', department: 'HR', photo: '/avatars/alfian.jpg' },
  { id: 'ali', name: 'Ali Imran', code: 'CP030', title: 'Sales Director', department: 'Sales', photo: '/avatars/ali.jpg' },
  { id: 'andi', name: 'Andi Pratama', code: 'CP060', title: 'Head Chef', department: 'Kitchen', photo: '/avatars/andi.jpg' },
  { id: 'bayu', name: 'Bayu Ferdian', code: 'CP050', title: 'Head of Marketing', department: 'Marketing', photo: '/avatars/bayu.jpg' },
  { id: 'christin', name: 'Christin Purnama Sari', code: 'CP022', title: 'Accountant', department: 'Accounting', photo: '/avatars/christin.jpg' },
  { id: 'cinta', name: 'Cinta Ayu', code: 'CP070', title: 'Restaurant Manager', department: 'Front of House', photo: '/avatars/cinta.jpg' },
  { id: 'daud', name: 'Daud Dimas Prasetyo', code: 'CP031', title: 'Sales Representative', department: 'Sales', photo: '/avatars/daud.jpg' },
  { id: 'dewi', name: 'Dewi Kusuma', code: 'CP090', title: 'Head of Operations', department: 'Operations' },
  { id: 'dian', name: 'Dian Anggraini', code: 'CP023', title: 'Payroll Specialist', department: 'Accounting' },
  { id: 'eka', name: 'Eka Setiawan', code: 'CP065', title: 'Barista', department: 'Front of House', photo: '/avatars/eka.jpg' },
  { id: 'evelyn', name: 'Evelyn Bellinda', code: 'CP020', title: 'Head of Accounting', department: 'Accounting', photo: '/avatars/evelyn.jpg' },
  { id: 'fajar', name: 'Fajar Nugraha', code: 'CP071', title: 'Waitstaff', department: 'Front of House', photo: '/avatars/fajar.jpg' },
  { id: 'galih', name: 'Galih Prakoso', code: 'CP074', title: 'Waitstaff', department: 'Front of House', photo: '/avatars/galih.jpg' },
  { id: 'indah', name: 'Indah Permata', code: 'CP067', title: 'Sous Chef', department: 'Kitchen', photo: '/avatars/indah.jpg' },
  { id: 'jessie', name: 'Jessie Tan', code: 'CP038', title: 'Sales Representative', department: 'Sales', photo: '/avatars/jessie.jpg' },
  { id: 'joko', name: 'Joko', code: 'CP078', title: 'Cashier', department: 'Front of House', photo: '/avatars/joko.jpg' },
  { id: 'linda', name: 'Linda Hidayat', code: 'CP108', title: 'Finance Admin', department: 'Accounting' },
  { id: 'putri', name: 'Putri Wulandari', code: 'CP075', title: 'Waitstaff', department: 'Front of House' },
  { id: 'reza', name: 'Reza Mahendra', code: 'CP032', title: 'Sales Representative', department: 'Sales' },
  { id: 'rio', name: 'Rio Priyono', code: 'CP040', title: 'Head of People', department: 'HR', photo: '/avatars/rio.jpg' },
  { id: 'rizal', name: 'Rizal Candra', code: 'CP010', title: 'CEO', department: 'Management', photo: '/avatars/rizal.jpg' },
  { id: 'santi', name: 'Santi Marlina', code: 'CP043', title: 'Recruiter', department: 'HR' },
  { id: 'wisnu', name: 'Wisnu Aditya', code: 'CP068', title: 'Line Cook', department: 'Kitchen' },
  { id: 'yoga', name: 'Yoga Pratama', code: 'CP051', title: 'Marketing Specialist', department: 'Marketing' },
]

// Display string used under each employee name: "CODE | Title | Department".
export const employeeMeta = (e: Employee) => `${e.code} | ${e.title} | ${e.department}`

export function employeeById(id: string): Employee | undefined {
  return EMPLOYEES.find(e => e.id === id)
}

// ─── Derived HR attributes (deterministic, stable per employee) ────────────────
// The mock has no backend, so service length and employment status are derived
// from the id — stable across renders and consistent wherever an employee is
// filtered (e.g. Succession candidate criteria).
export type EmploymentStatus = 'permanent' | 'contract' | 'probation'
function ehash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
/** Whole years of service, 0–7, stable per employee. */
export function employeeTenureYears(id: string): number {
  return ehash(id) % 8
}
/** Employment status ~ 60% permanent / 30% contract / 10% probation, stable per employee. */
export function employeeEmploymentStatus(id: string): EmploymentStatus {
  const r = ehash(`${id}|status`) % 10
  return r < 6 ? 'permanent' : r < 9 ? 'contract' : 'probation'
}

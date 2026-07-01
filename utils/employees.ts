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
  { id: 'eka', name: 'Eka Setiawan', code: 'CP065', title: 'Barista', department: 'Front of House', photo: '/avatars/eka.jpg' },
  { id: 'evelyn', name: 'Evelyn Bellinda', code: 'CP020', title: 'Head of Accounting', department: 'Accounting', photo: '/avatars/evelyn.jpg' },
  { id: 'fajar', name: 'Fajar Nugraha', code: 'CP071', title: 'Waitstaff', department: 'Front of House', photo: '/avatars/fajar.jpg' },
  { id: 'galih', name: 'Galih Prakoso', code: 'CP074', title: 'Waitstaff', department: 'Front of House', photo: '/avatars/galih.jpg' },
  { id: 'indah', name: 'Indah Permata', code: 'CP067', title: 'Sous Chef', department: 'Kitchen', photo: '/avatars/indah.jpg' },
  { id: 'jessie', name: 'Jessie Tan', code: 'CP038', title: 'Sales Representative', department: 'Sales', photo: '/avatars/jessie.jpg' },
  { id: 'joko', name: 'Joko', code: 'CP078', title: 'Cashier', department: 'Front of House', photo: '/avatars/joko.jpg' },
  { id: 'linda', name: 'Linda Hidayat', code: 'CP108', title: 'Finance Admin', department: 'Accounting' },
  { id: 'rio', name: 'Rio Priyono', code: 'CP040', title: 'Head of People', department: 'HR', photo: '/avatars/rio.jpg' },
  { id: 'rizal', name: 'Rizal Candra', code: 'CP010', title: 'CEO', department: 'Management', photo: '/avatars/rizal.jpg' },
]

// Display string used under each employee name: "CODE | Title | Department".
export const employeeMeta = (e: Employee) => `${e.code} | ${e.title} | ${e.department}`

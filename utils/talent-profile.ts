// ─────────────────────────────────────────────────────────────────────────────
// Talent profile — rich, coherent per-person detail derived from the shared
// TALENTS directory data. Everything here is deterministic (seeded from the
// employee code) so a profile looks the same on every render, and every derived
// value is consistent with the person's directory row (join date, grade, org,
// branch, status …). Company context: PT Central Perk Indonesia.
// ─────────────────────────────────────────────────────────────────────────────
import { TALENTS, aging, formatJoinDate, type TalentEmployee } from './talents'

// ─── Deterministic helpers ───────────────────────────────────────────────────
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const pick = <T>(arr: T[], seed: number): T => arr[seed % arr.length]
const round1 = (n: number) => Math.round(n * 10) / 10
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmt = (d: Date) => `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`

// ─── Reference data ──────────────────────────────────────────────────────────
const HEAD_BY_ORG: Record<string, string> = {
  Accounting: 'evelyn', HR: 'rio', Sales: 'ali', Marketing: 'bayu',
  Kitchen: 'andi', 'Front of House': 'cinta', Management: 'rizal',
}

const UNIVERSITIES = [
  'Universitas Indonesia', 'Universitas Gadjah Mada', 'Universitas Padjadjaran',
  'Institut Teknologi Bandung', 'Universitas Airlangga', 'Universitas Riau',
  'Universitas Brawijaya', 'Politeknik Negeri Jakarta',
]
const MAJOR_BY_ORG: Record<string, string[]> = {
  Accounting: ['Akuntansi', 'Manajemen Keuangan'],
  HR: ['Psikologi', 'Manajemen SDM'],
  Sales: ['Manajemen', 'Ilmu Komunikasi', 'Hukum'],
  Marketing: ['Ilmu Komunikasi', 'Desain Komunikasi Visual'],
  Kitchen: ['Tata Boga', 'Culinary Arts'],
  'Front of House': ['Perhotelan', 'Pariwisata'],
  Management: ['Manajemen Bisnis', 'Administrasi Bisnis'],
}
const ADDRESS_BY_BRANCH: Record<string, string[]> = {
  'Jakarta HQ': [
    'Jl. Cendana No. 56, Kel. Karet Semanggi, Kec. Setiabudi, Jakarta Selatan, DKI Jakarta, 12930',
    'Jl. Kemang Raya No. 21, Kec. Mampang Prapatan, Jakarta Selatan, DKI Jakarta, 12730',
    'Jl. Tebet Barat No. 8, Kec. Tebet, Jakarta Selatan, DKI Jakarta, 12810',
  ],
  Bandung: [
    'Jl. Braga No. 12, Kec. Sumur Bandung, Kota Bandung, Jawa Barat, 40111',
    'Jl. Dipatiukur No. 35, Kec. Coblong, Kota Bandung, Jawa Barat, 40132',
  ],
  Surabaya: [
    'Jl. Tunjungan No. 45, Kec. Genteng, Kota Surabaya, Jawa Timur, 60275',
    'Jl. Darmo No. 68, Kec. Wonokromo, Kota Surabaya, Jawa Timur, 60241',
  ],
}

const DNA_COMPETENCIES = [
  'Communication', 'Problem Solving', 'Analytical Thinking', 'Teamwork',
  'Customer Focus', 'Execution', 'Leadership', 'Decision Making',
]
// Org-independent behavioural skills — the third competency group, alongside the
// 8 DNA competencies and the org's technical skills.
const SOFT_SKILLS = [
  'Adaptability', 'Time Management', 'Collaboration', 'Active Listening', 'Conflict Resolution',
]
const TECH_SKILLS_BY_ORG: Record<string, string[]> = {
  Sales: ['CRM Usage', 'Product Knowledge', 'Lead Qualification', 'Demo Delivery', 'Sales Forecasting'],
  Accounting: ['Financial Reporting', 'Tax Compliance', 'Budgeting', 'Reconciliation'],
  HR: ['Recruitment', 'Payroll Management', 'Employee Relations', 'HRIS'],
  Marketing: ['Campaign Management', 'SEO & SEM', 'Content Strategy', 'Analytics'],
  Kitchen: ['Menu Development', 'Food Safety', 'Cost Control', 'Plating'],
  'Front of House': ['Service Excellence', 'POS Operation', 'Upselling', 'Complaint Handling'],
  Management: ['Strategic Planning', 'P&L Management', 'Stakeholder Management', 'Business Development'],
}
const COURSE_POOL_BY_ORG: Record<string, { course: string; org: string }[]> = {
  Sales: [
    { course: 'Handling Enterprise Objections', org: 'LinkedIn Learning' },
    { course: 'Advanced CRM Workflow', org: 'Mekari Qontak' },
    { course: 'Effective Negotiation Mastery', org: 'Mekari University' },
    { course: 'Consultative Selling', org: 'Coursera' },
  ],
  Accounting: [
    { course: 'Financial Statement Analysis', org: 'Coursera' },
    { course: 'Indonesian Tax Update 2024', org: 'Mekari University' },
    { course: 'Advanced Excel for Finance', org: 'LinkedIn Learning' },
    { course: 'Jurnal Accounting Certification', org: 'Mekari University' },
  ],
  HR: [
    { course: 'Talent Acquisition Fundamentals', org: 'LinkedIn Learning' },
    { course: 'Payroll & Compliance with Talenta', org: 'Mekari University' },
    { course: 'People Analytics', org: 'Coursera' },
  ],
  Marketing: [
    { course: 'Performance Marketing 101', org: 'Skill Academy' },
    { course: 'Content Strategy Masterclass', org: 'LinkedIn Learning' },
    { course: 'Growth Analytics with GA4', org: 'Coursera' },
  ],
  Kitchen: [
    { course: 'Food Safety & HACCP', org: 'Skill Academy' },
    { course: 'Menu Engineering', org: 'Coursera' },
    { course: 'Kitchen Cost Control', org: 'Mekari University' },
  ],
  'Front of House': [
    { course: 'Service Excellence Training', org: 'Skill Academy' },
    { course: 'Upselling Techniques', org: 'LinkedIn Learning' },
    { course: 'Complaint Handling', org: 'Coursera' },
  ],
  Management: [
    { course: 'Strategic Leadership', org: 'Coursera' },
    { course: 'Financial Acumen for Leaders', org: 'LinkedIn Learning' },
    { course: 'OKR Masterclass', org: 'Mekari University' },
  ],
}

// ─── Rating scale ────────────────────────────────────────────────────────────
export function ratingLabel(score: number): string {
  if (score >= 4.3) return 'Outstanding'
  if (score >= 3.8) return 'Exceeds expectations'
  if (score >= 3.0) return 'Meets expectations'
  if (score >= 2.5) return 'Partially meets expectations'
  return 'Below expectations'
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface KeyVal { label: string; value: string; badge?: string; sub?: string }
export interface NineBoxCell { key: string; title: string; subtitle: string; color: string; perf: 0 | 1 | 2; pot: 0 | 1 | 2 }
export interface PerfPeriod { label: string; range: string; self: number; review360: number; team: number; manager: number }
export interface CompetencyItem { name: string; score: number; rating: string }

// Rating for a single competency, relative to its group target: at/above target
// exceeds, well below is a gap, otherwise it meets.
export function itemRating(score: number, target: number): string {
  const gap = score - target
  if (gap >= 0.3) return 'Exceeds expectations'
  if (gap <= -0.5) return 'Below expectations'
  return 'Meets expectations'
}
export interface CompetencyGroup { name: string; target: number; average: number; gap: number; items: CompetencyItem[] }
// scope: the attribute the competency set was scoped by — its label is the
// attribute type (e.g. "Job level") and its value is this person's value for it
// (e.g. "Staff"). Null when the assignment has no scope.
export interface CompetencyInfo { assessment: string; completed: string; position: string; scope: { label: string; value: string } | null; groups: CompetencyGroup[] }
export interface TransferChange { field: string; change: string }
export interface TransferRow { date: string; type: string; items: TransferChange[]; notes: string }
export interface ReprimandRow { date: string; type: string; reason: string; status: string; statusNote: string }
export interface LearningRow { course: string; org: string; completed: string; certificate: boolean }

export interface TalentProfile {
  base: TalentEmployee
  education: string
  general: KeyVal[]
  employment: KeyVal[]
  reportTo: { name: string; code: string; meta: string } | null
  mapping: { cycle: string; generated: string; activeKey: string; cells: NineBoxCell[] }
  performance: { period: string; basis: string; score: number; label: string; history: PerfPeriod[] }
  competencyAssessments: CompetencyInfo[]
  transfers: TransferRow[]
  reprimands: ReprimandRow[]
  learning: LearningRow[]
}

// ─── 9-box matrix (row = potential HIGH→LOW, col = performance LOW→HIGH) ────────
// Pastel diverging palette matching the design.
const NINE_BOX: NineBoxCell[] = [
  { key: 'enigma', title: 'Enigma', subtitle: 'Low performer / High potential', color: '#FBE0CE', perf: 0, pot: 2 },
  { key: 'growth', title: 'Growth employee', subtitle: 'Mod. performer / High potential', color: '#E6F2CE', perf: 1, pot: 2 },
  { key: 'future-star', title: 'Future star', subtitle: 'High performer / High potential', color: '#CDEBDF', perf: 2, pot: 2 },
  { key: 'inconsistent', title: 'Inconsistent', subtitle: 'Low performer / Mod. potential', color: '#F6C3BD', perf: 0, pot: 1 },
  { key: 'core', title: 'Core employee', subtitle: 'Mod. performer / Mod. potential', color: '#EEF3D0', perf: 1, pot: 1 },
  { key: 'high-impact', title: 'High impact', subtitle: 'High performer / Mod. potential', color: '#E6F2CE', perf: 2, pot: 1 },
  { key: 'risk', title: 'Risk', subtitle: 'Low performer / Low potential', color: '#F2A6A0', perf: 0, pot: 0 },
  { key: 'effective', title: 'Effective', subtitle: 'Mod. performer / Low potential', color: '#F6C3BD', perf: 1, pot: 0 },
  { key: 'trusted', title: 'Trusted professional', subtitle: 'High performer / Low potential', color: '#FBE0CE', perf: 2, pot: 0 },
]

// ─── Builder ─────────────────────────────────────────────────────────────────
export function buildProfile(t: TalentEmployee): TalentProfile {
  const seed = hash(t.code)
  const now = new Date()

  // Names → email
  const parts = t.name.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(Boolean)
  const emailLocal = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0]
  const email = `${emailLocal}@centralperk.co.id`

  // Date of birth: age scales loosely with seniority (grade number lower = senior).
  const gradeNum = Number(t.jobGrade.replace(/\D/g, '')) || 5
  const baseAge = clamp(52 - gradeNum * 2 + (seed % 6), 23, 55)
  const dob = new Date(now.getFullYear() - baseAge, seed % 12, 1 + (seed % 27))
  const age = now.getFullYear() - dob.getFullYear() - (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0)

  const phone = `+62 812${String(1000 + (seed % 9000))}${String(1000 + ((seed >> 4) % 9000))}`
  const address = pick(ADDRESS_BY_BRANCH[t.branch] ?? ADDRESS_BY_BRANCH['Jakarta HQ'], seed)
  const major = pick(MAJOR_BY_ORG[t.organization] ?? ['Manajemen'], seed)
  const university = pick(UNIVERSITIES, seed >> 3)
  const education = `${major}, ${university}`

  // Tenure → promotions → grades. Lower grade number = more senior.
  const years = (now.getTime() - new Date(t.joinDate).getTime()) / (365.25 * 864e5)
  const promotionCount = clamp(Math.floor(years / 2.5), 0, 4)
  const currentGrade = gradeNum
  const startingGrade = clamp(currentGrade + promotionCount, currentGrade, 9)

  // Manager
  const headId = HEAD_BY_ORG[t.organization]
  let managerId: string | null = headId ?? 'rizal'
  if (t.id === managerId) managerId = t.id === 'rizal' ? null : 'rizal'
  const mgr = managerId ? TALENTS.find(m => m.id === managerId) ?? null : null
  const reportTo = mgr
    ? { name: mgr.name, code: mgr.code, meta: `${mgr.code} | ${mgr.jobPosition} | ${mgr.organization}` }
    : null

  // ── General & employment key/value blocks ──
  const general: KeyVal[] = [
    { label: 'Date of birth', value: fmt(dob), badge: `${age} years old` },
    { label: 'Email', value: email },
    { label: 'Phone number', value: phone },
    { label: 'Address', value: address },
  ]
  const employment: KeyVal[] = [
    { label: 'Employee ID', value: t.code },
    { label: 'Join date', value: formatJoinDate(t.joinDate), badge: aging(t.joinDate) },
    { label: 'Job position', value: t.jobPosition },
    { label: 'Organization', value: t.organization },
    { label: 'Branch', value: t.branch },
    { label: 'Job level', value: t.jobLevel },
    { label: 'Employment status', value: t.employmentType },
    { label: 'Report to', value: reportTo ? reportTo.name : '—', sub: reportTo?.meta },
    { label: 'Starting job grade', value: String(startingGrade) },
    { label: 'Current job grade', value: String(currentGrade) },
    { label: 'Promotion count', value: String(promotionCount) },
  ]

  // ── Performance ──
  // Base performance level scales with seniority + a stable jitter; resigned lower.
  let base = clamp(4.4 - gradeNum * 0.18 + ((seed % 5) - 2) * 0.12, 2.6, 4.5)
  if (t.status === 'resigned') base = clamp(base - 0.6, 2.4, 4.0)

  const ALL_PERIODS = [
    { label: 'PA 2022 H1', range: '1/1–30/6/2022', end: new Date(2022, 5, 30) },
    { label: 'PA 2022 H2', range: '1/7–31/12/2022', end: new Date(2022, 11, 31) },
    { label: 'PA 2023 H1', range: '1/1–30/6/2023', end: new Date(2023, 5, 30) },
    { label: 'PA 2023 H2', range: '1/7–31/12/2023', end: new Date(2023, 11, 31) },
    { label: 'PA 2024 H1', range: '1/1–30/6/2024', end: new Date(2024, 5, 30) },
    { label: 'PA 2024 H2', range: '1/7–31/12/2024', end: new Date(2024, 11, 31) },
    { label: 'PA 2025 H1', range: '1/1–30/6/2025', end: new Date(2025, 5, 30) },
  ]
  const joined = new Date(t.joinDate)
  const periods = ALL_PERIODS.filter(p => p.end > joined)
  const history: PerfPeriod[] = periods.map((p, i) => {
    // gentle upward trend across periods
    const trend = base - (periods.length - 1 - i) * 0.11
    const s = (off: number) => round1(clamp(trend + off, 2.4, 4.6))
    const j = (seed >> (i + 1)) % 7
    return {
      label: p.label, range: p.range,
      self: s(0.15 + (j % 3) * 0.05),
      review360: s(-0.1 + (j % 2) * 0.05),
      team: s(0.0 + ((j >> 1) % 3) * 0.04),
      manager: s(-0.05 + ((j >> 2) % 2) * 0.06),
    }
  })
  const last = history[history.length - 1]
  const latestScore = last ? last.manager : round1(base)
  const perfPeriodLabel = last ? last.label : ALL_PERIODS[ALL_PERIODS.length - 1].label

  // ── Talent mapping (9-box) ──
  const perfIdx = (latestScore >= 3.8 ? 2 : latestScore >= 3.0 ? 1 : 0) as 0 | 1 | 2
  const potIdx = ((seed >> 2) % 3) as 0 | 1 | 2
  const activeCell = NINE_BOX.find(c => c.perf === perfIdx && c.pot === potIdx) ?? NINE_BOX[4]

  // ── Competencies ──
  // Scope the competency set was assigned by (mirrors the competency assignment
  // scope). Each maps to the person's own value for that attribute; null = no scope.
  const SCOPES: ({ label: string; value: string } | null)[] = [
    { label: 'Job level', value: t.jobLevel },
    { label: 'Job grade', value: t.jobGrade },
    { label: 'Job class', value: t.jobClass },
    null,
  ]
  const techNames = TECH_SKILLS_BY_ORG[t.organization] ?? TECH_SKILLS_BY_ORG['Management']

  // One assessment cycle. `off` shifts the seed so each cycle has its own scores;
  // `adj` shifts the overall level (earlier cycles score a little lower).
  function makeAssessment(label: string, completed: string, off: number, adj: number): CompetencyInfo {
    const dnaAvg = round1(clamp(base - 0.3 + adj + ((seed >> off) % 3) * 0.1, 2.5, 4.4))
    const techAvg = round1(clamp(base - 0.5 + adj + ((seed >> (off + 1)) % 3) * 0.1, 2.4, 4.2))
    const dnaItems: CompetencyItem[] = DNA_COMPETENCIES.map((name, i) => {
      const score = round1(clamp(dnaAvg + (((seed >> (i + off)) % 5) - 2) * 0.25, 2.0, 5.0))
      return { name, score, rating: itemRating(score, 4.0) }
    })
    const techItems: CompetencyItem[] = techNames.map((name, i) => {
      const score = round1(clamp(techAvg + (((seed >> (i + off + 2)) % 5) - 2) * 0.25, 2.0, 5.0))
      return { name, score, rating: itemRating(score, 3.5) }
    })
    const softAvg = round1(clamp(base - 0.4 + adj + ((seed >> (off + 3)) % 3) * 0.1, 2.4, 4.3))
    const softItems: CompetencyItem[] = SOFT_SKILLS.map((name, i) => {
      const score = round1(clamp(softAvg + (((seed >> (i + off + 4)) % 5) - 2) * 0.25, 2.0, 5.0))
      return { name, score, rating: itemRating(score, 3.5) }
    })
    return {
      assessment: label, completed, position: t.jobPosition, scope: SCOPES[(seed + off) % SCOPES.length],
      groups: [
        { name: '8 DNA competencies', target: 4.0, average: dnaAvg, gap: round1(dnaAvg - 4.0), items: dnaItems },
        { name: 'Technical skills', target: 3.5, average: techAvg, gap: round1(techAvg - 3.5), items: techItems },
        { name: 'Soft skills', target: 3.5, average: softAvg, gap: round1(softAvg - 3.5), items: softItems },
      ],
    }
  }

  // Assessments assigned to this person, newest first. Older cycles only appear
  // for people who were already onboard then.
  const competencyAssessments: CompetencyInfo[] = [makeAssessment('Competency Assessment 2025', '15 Oct 2025', 0, 0)]
  if (joined < new Date(2024, 9, 12)) competencyAssessments.push(makeAssessment('Competency Assessment 2024', '12 Oct 2024', 5, -0.2))
  if (joined < new Date(2023, 9, 10)) competencyAssessments.push(makeAssessment('Competency Assessment 2023', '10 Oct 2023', 9, -0.4))

  // ── Transfer history (from promotions) ──
  // Each promotion lowers the job grade by one (lower number = more senior). Each
  // row lists the components that changed, one per line, as "before → after".
  const LEVEL_LADDER = ['Staff', 'Senior', 'Lead', 'Manager', 'Head', 'Director', 'C-Level']
  const lvlIdx = LEVEL_LADDER.indexOf(t.jobLevel)
  const transfers: TransferRow[] = []
  {
    let g = currentGrade
    const anchorYears = [1.2, 3.4, 5.6, 7.8] // most recent first
    for (let k = 0; k < promotionCount; k++) {
      const when = new Date(now.getTime() - anchorYears[k] * 365.25 * 864e5)
      const from = g + 1
      const items: TransferChange[] = []
      // earliest promotion carries the move into the person's current position
      if (k === promotionCount - 1 && t.jobLevel === 'Staff') {
        items.push({ field: 'Job position', change: `Junior ${t.jobPosition} → ${t.jobPosition}` })
      }
      // most recent promotion also stepped the job level up
      if (k === 0 && lvlIdx > 0) {
        items.push({ field: 'Job level', change: `${LEVEL_LADDER[lvlIdx - 1]} → ${t.jobLevel}` })
      }
      items.push({ field: 'Job grade', change: `${from} → ${g}` })
      transfers.push({ date: fmt(when), type: 'Promotion', items, notes: 'After calibration cycle' })
      g = from
    }
  }

  // ── Reprimand history (only for weaker performers / a deterministic minority) ──
  const reprimands: ReprimandRow[] = []
  if (latestScore < 3.2 || seed % 5 === 0) {
    const when = new Date(2022, 9, 5)
    reprimands.push({
      date: fmt(when), type: 'SP 1',
      reason: 'Performance below expectations (22H2)',
      status: 'Cleared', statusNote: 'Expired Apr 2023',
    })
  }

  // ── Learning & development ──
  const pool = COURSE_POOL_BY_ORG[t.organization] ?? COURSE_POOL_BY_ORG['Management']
  const count = 2 + (seed % (pool.length - 1))
  const learnDates = ['10 Nov 2023', '3 Sep 2023', '25 Mar 2023', '18 Jan 2024']
  const learning: LearningRow[] = pool.slice(0, count).map((c, i) => ({
    course: c.course, org: c.org, completed: learnDates[i % learnDates.length], certificate: (seed >> i) % 4 !== 0,
  }))

  return {
    base: t, education, general, employment, reportTo,
    mapping: { cycle: 'H1 2025 Talent Mapping', generated: 'Generated on 15 Jul 2025', activeKey: activeCell.key, cells: NINE_BOX },
    performance: { period: perfPeriodLabel, basis: 'Based on manager review', score: latestScore, label: ratingLabel(latestScore), history },
    competencyAssessments, transfers, reprimands, learning,
  }
}

export function getProfile(id: string): TalentProfile | null {
  const t = TALENTS.find(x => x.id === id)
  return t ? buildProfile(t) : null
}

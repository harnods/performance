// ━━━ MOCK DATA — hardcoded, NOT connected to any API ━━━━━━━━━━━━━━━━━━━━━━━━━
// Static stand-in for the endpoints used by talenta-review
// src/views/settings/manage-user/{roles,assign-role}/ (FE commit 010875214aba).
//
// ⚠️ Shapes are grounded in the FE only (Vuex `settings` module + the views and
// their jest specs). talenta-noncore-api was NOT available for this pass, so
// field names below are exactly what the FE reads — nothing beyond that is
// invented. Verify against the BE before backporting.
//
// Envelope (FE reads): { status_code: 200, contents: … }
//
//   GET  /roles/roles-pagination?limit_per_page&sort_field_data&search_data&current_page
//        → contents.roles: Laravel paginator { data: RoleRow[], current_page,
//          last_page, limit_per_page, from, to, total }
//   GET  /roles                → contents.roles: RoleRow[]        (role picker)
//   GET  /roles/:id            → contents.role: RoleDetail
//   POST /roles · PUT /roles/:id { name, description, permissions: {[id]: bool}, role_id?, branches: number[] }
//   DELETE /roles/:id
//   GET  /permissions          → contents.permissions: Permission[]
//   GET  /helpers/user-filter?show_initial_branch=false → contents.branches: { id, name }[]
//
//   GET  /role-users/pagination?limit&sort_field&search_data&page
//        → contents: paginator { data: RoleUserRow[], … }
//   GET  /role-users/specialist?…   → contents: paginator { data: RoleUserRow[], … }
//   POST /role-users { role_id, user_ids }          (assign)
//        → error data: { is_action_restricted, active_user, limit } when over quota
//   PUT  /role-users { role_id, user_ids, company_id_consultant }   (edit)
//   POST /role-users/bulk-delete-access-role { user_ids, company_id_consultant }
//   GET  /role-users/quota     → contents: QuotaData
//   POST /users/assign-role    → contents: paginator of AssignableUser (modal list)
//
// Permission names are inferred from the FE's hasAccess() slugs
// (review-cycle.*, review-setting.*, manage-users.*, manage-*-goals) plus the
// two names Form.vue special-cases ('Manage Goal', 'Edit Result'). The real
// list comes from the BE permissions seeder.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import { TALENTS, BRANCHES } from '~/utils/talents'

/** One row of GET /roles/roles-pagination. company_id 0 = system default role (badge "Default", no actions). */
export interface RoleRow {
  id: number
  name: string
  description: string
  company_id: number
}

export interface PermissionChild { id: number; name: string; description: string }
export interface Permission { id: number; name: string; description: string; child_permissions: PermissionChild[] }

// ─── Review cycle scope (PROPOSED — PRD "Custom Role Improvement" S1/S2) ─────
// Not in talenta-noncore-api yet: today a Review cycle grant is flat (all
// cycles or none). The PRD scopes every Review cycle permission (View / Add /
// Edit / Delete / Report) by cycle purpose and, for Evaluation only, by
// employment status. Field names below are this prototype's, not the API's.
export type CyclePurpose = 'performance' | 'competency' | 'evaluation'
export const CYCLE_PURPOSES: { value: CyclePurpose; label: string }[] = [
  { value: 'performance', label: 'Performance' },
  { value: 'competency', label: 'Competency' },
  { value: 'evaluation', label: 'Evaluation' },
]
/**
 * Evaluation employment statuses — MOCK of GET /kpi/cycle-masters/employment-status
 * (EMS, is_end_date=true): only statuses with a mandatory end date, so the
 * default Permanent status is excluded. Values match review-cycles/create.vue.
 */
export const EVALUATION_EMPLOYMENT_STATUSES: { value: string; label: string }[] = [
  { value: 'contract', label: 'Contract' },
  { value: 'probation', label: 'Probation' },
  { value: 'intern', label: 'Internship' },
]
export interface PermissionScope {
  purposes: CyclePurpose[]
  employment_statuses: string[]
  /** Report only (PRD S2): true = tracks Review cycle's scope at save time. */
  same_as_review_cycle?: boolean
}
/** Per-purpose copy for the Review cycle permissions ("performance" → "View performance review cycles…"). */
export const SCOPED_PERMISSION_DESCRIPTIONS: Record<number, (purpose: string) => string> = {
  1: p => `View ${p} review cycles and their progress.`,
  11: p => `Create new ${p} review cycles.`,
  12: p => `Edit ${p} review cycles, reviewers and timeframes.`,
  13: p => `Delete ${p} review cycles.`,
}
/** Permission groups whose grants are purpose-scoped per permission (Review cycle). */
export const SCOPED_PERMISSION_IDS = [1]
/** Report (PRD S2) — one purpose/status scope for the whole group, by default Review cycle's. */
export const REPORT_PERMISSION_ID = 6
/** Dashboard (PRD S3) — always Review cycle's scope, no picker of its own. */
export const DASHBOARD_PERMISSION_ID = 5
export const fullScope = (): PermissionScope => ({
  purposes: CYCLE_PURPOSES.map(p => p.value),
  employment_statuses: EVALUATION_EMPLOYMENT_STATUSES.map(s => s.value),
})

/** GET /roles/:id */
export interface RoleDetail extends RoleRow {
  role_branches: { branch_id: number }[]
  /** Parent ids appear as-is; child ids carry their parent in permissions.parent_permission_id. */
  permission_roles: { permission_id: number; permissions: { parent_permission_id: number | null }; scope?: PermissionScope }[]
}

export interface Branch { id: number; name: string }

/** `users` block of a role-users row. */
export interface RoleUserUser {
  first_name: string
  last_name: string
  full_name: string
  id_employee: string | null
  organization_name: string | null
  job: string | null
  avatar: string | null
  /** Specialist tab only. */
  company_name?: string | null
}

/** One row of GET /role-users/pagination (Employee) or /role-users/specialist. */
export interface RoleUserRow {
  id: number
  user_id: number
  role_id: number
  role_name: string
  roles: { name: string }
  users: RoleUserUser
  /** Prototype-only link back to the shared EMPLOYEES mock (avatar colour, filters). */
  employee_key?: string
}

/** GET /role-users/quota */
export interface QuotaData {
  active_user: number
  limit: number
  package_name: string
  is_newly_upgraded: boolean
  is_error: boolean
  grace_period_remaining_days: number
}

/** One row of the Assign role modal's user list (POST /users/assign-role). */
export interface AssignableUser {
  id: number
  employee_key: string
  first_name: string
  last_name: string
  id_employee: string
  job: { job: string }
  avatar?: string
  branch: string
  organization: string
  job_level: string
  job_position: string
  employment_status: string
  /** Already holds a role → shown disabled with a tooltip. */
  is_disabled: boolean
  role_name?: string
}

// ─── Branches (GET /helpers/user-filter) ────────────────────────────────────
// Sorted A–Z: 1 Bandung, 2 Jakarta HQ, 3 Surabaya. Falsy entries dropped — the
// shared TALENTS mock has an employee without HR attributes (zainal).
export const BRANCH_OPTIONS: Branch[] = BRANCHES.filter(Boolean).map((name, i) => ({ id: i + 1, name }))

// ─── Permissions (GET /permissions) ─────────────────────────────────────────
export const PERMISSIONS: Permission[] = [
  {
    id: 1,
    name: 'Review cycle',
    description: 'View review cycles and their progress.',
    child_permissions: [
      { id: 11, name: 'Add', description: 'Create new review cycles.' },
      { id: 12, name: 'Edit', description: 'Edit review cycles, reviewers and timeframes.' },
      { id: 13, name: 'Delete', description: 'Delete review cycles.' },
    ],
  },
  // PROPOSED (PRD S2): Report moves out of Review cycle into its own scoped
  // section. Review results (formerly Standard report) is production's Review cycle → Report (unchanged).
  {
    id: 6,
    name: 'Report',
    description: 'View and export review cycle reports.',
    child_permissions: [
      { id: 14, name: 'Review results', description: 'View and export review results.' },
      { id: 15, name: '9-box matrix', description: 'View the 9-box matrix and its configuration.' },
    ],
  },
  // PROPOSED (PRD S3): new permission — production's Dashboard has no check.
  {
    id: 5,
    name: 'Dashboard',
    description: 'Monitor review cycle progress: total reviewers, review tasks and cycle overview.',
    child_permissions: [],
  },
  {
    id: 2,
    name: 'Review setting',
    description: 'View templates, reminders and 9 box configurations.',
    child_permissions: [
      { id: 21, name: 'Add', description: 'Create templates and configurations.' },
      { id: 22, name: 'Edit', description: 'Edit templates and configurations.' },
      { id: 23, name: 'Delete', description: 'Delete templates and configurations.' },
    ],
  },
  {
    id: 3,
    name: 'Manage Goal',
    description: 'Manage goals on behalf of others.',
    child_permissions: [
      { id: 31, name: 'Manage company goals', description: 'Create, edit and delete company goals.' },
      { id: 32, name: 'Manage organization goals', description: 'Create, edit and delete organization goals.' },
      // Hidden by Form.vue (child.name === 'Edit Result') but still part of the payload.
      { id: 33, name: 'Edit Result', description: 'Edit goal results after the cycle ends.' },
    ],
  },
  {
    id: 4,
    name: 'Manage users',
    description: 'View roles, role assignments and the activity log.',
    child_permissions: [
      { id: 41, name: 'Add', description: 'Create roles and assign them to employees.' },
      { id: 42, name: 'Edit', description: 'Edit roles and role assignments.' },
      { id: 43, name: 'Delete', description: 'Delete roles and remove role assignments.' },
    ],
  },
]

// Roles created before the PRD change migrate to every purpose + every
// employment status for each Review cycle / Report permission they hold (PRD §5.4).
const allPermissionRoles = (ids: number[]) => ids.map((id) => {
  const parent = PERMISSIONS.find(p => p.child_permissions.some(c => c.id === id))
  const groupId = parent ? parent.id : id
  const scope = SCOPED_PERMISSION_IDS.includes(groupId)
    ? fullScope()
    : groupId === REPORT_PERMISSION_ID ? { ...fullScope(), same_as_review_cycle: true } : undefined
  return {
    permission_id: id,
    permissions: { parent_permission_id: parent ? parent.id : null },
    ...(scope ? { scope } : {}),
  }
})
const ALL_PERMISSION_IDS = PERMISSIONS.flatMap(p => [p.id, ...p.child_permissions.map(c => c.id)])

// ─── Roles ──────────────────────────────────────────────────────────────────
// id 1 = Super Admin. Production hides it from the role picker for non super
// admins and blocks editing/removing users who hold it (role_id !== 1).
export const ROLES_SEED: RoleDetail[] = [
  { id: 1, name: 'Super Admin', description: 'Full access to every Performance feature and setting.', company_id: 0, role_branches: [], permission_roles: allPermissionRoles(ALL_PERMISSION_IDS) },
  { id: 2, name: 'Employee', description: 'Default access for every employee: own reviews, goals and IDP.', company_id: 0, role_branches: [], permission_roles: [] },
  { id: 3, name: 'HR Admin', description: 'Runs review cycles and maintains review settings for all branches.', company_id: 102938, role_branches: [], permission_roles: allPermissionRoles([1, 11, 12, 13, 6, 14, 2, 21, 22, 23, 5]) },
  { id: 4, name: 'Performance Admin', description: 'Creates and edits review cycles. Cannot delete them.', company_id: 102938, role_branches: [{ branch_id: 2 }], permission_roles: allPermissionRoles([1, 11, 12, 6, 14]) },
  { id: 5, name: 'Goal Admin', description: 'Manages company and organization goals.', company_id: 102938, role_branches: [], permission_roles: allPermissionRoles([3, 31, 32]) },
  { id: 6, name: 'User Manager', description: 'Assigns roles to employees and reviews the activity log.', company_id: 102938, role_branches: [], permission_roles: allPermissionRoles([4, 41, 42]) },
  { id: 7, name: 'Branch HR — Bandung', description: 'Review cycle access limited to the Bandung branch.', company_id: 102938, role_branches: [{ branch_id: 1 }], permission_roles: allPermissionRoles([1, 12, 6, 14]) },
  { id: 8, name: 'Report Viewer', description: 'Read-only access to review cycle reports and dashboards.', company_id: 102938, role_branches: [], permission_roles: allPermissionRoles([1, 6, 14, 5]) },
  { id: 9, name: 'Talent Committee', description: '', company_id: 102938, role_branches: [], permission_roles: allPermissionRoles([5]) },
  { id: 10, name: 'Settings Admin', description: 'Maintains templates, reminders and 9 box configurations.', company_id: 102938, role_branches: [], permission_roles: allPermissionRoles([2, 21, 22]) },
  // Edge case: long name + long description (wrapping).
  { id: 11, name: 'Regional Performance & Talent Development Coordinator (Java & Bali)', description: 'Coordinates review cycles, calibration preparation and goal setting across every branch in the Java and Bali region, including reporting to the national HR leadership team every quarter.', company_id: 102938, role_branches: [{ branch_id: 1 }, { branch_id: 2 }], permission_roles: allPermissionRoles([1, 11, 12, 6, 14, 3, 31, 32]) },
]

// ─── Role users (Employee tab) ──────────────────────────────────────────────
function userFromTalent(key: string): RoleUserUser {
  const t = TALENTS.find(x => x.id === key)!
  const [first, ...rest] = t.name.split(' ')
  return {
    first_name: first,
    last_name: rest.join(' '),
    full_name: t.name,
    id_employee: t.code,
    organization_name: t.organization,
    job: t.jobPosition,
    avatar: t.photo ?? null,
  }
}
export const userIdOf = (key: string) => TALENTS.findIndex(t => t.id === key) + 1

const ASSIGNED: [string, number][] = [
  ['rizal', 1], ['rio', 3], ['alfian', 3], ['santi', 6], ['evelyn', 4], ['bayu', 5],
  ['ali', 8], ['cinta', 7], ['dewi', 10], ['christin', 2], ['daud', 2], ['jessie', 11],
]
export const ROLE_USERS_SEED: RoleUserRow[] = ASSIGNED.map(([key, roleId], i) => {
  const role = ROLES_SEED.find(r => r.id === roleId)!
  return { id: i + 1, user_id: userIdOf(key), role_id: roleId, role_name: role.name, roles: { name: role.name }, users: userFromTalent(key), employee_key: key }
})

// ─── Specialists (read-only tab) ────────────────────────────────────────────
// Invited from a company group or as a Mekari consultant — not employees.
export const SPECIALISTS_SEED: RoleUserRow[] = [
  { id: 901, user_id: 9001, role_id: 3, role_name: 'HR Admin', roles: { name: 'HR Admin' }, users: { first_name: 'Maya', last_name: 'Lestari', full_name: 'Maya Lestari', id_employee: null, organization_name: 'Group HR', job: 'HR Business Partner', avatar: null, company_name: 'PT Central Perk Group' } },
  { id: 902, user_id: 9002, role_id: 1, role_name: 'Super Admin', roles: { name: 'Super Admin' }, users: { first_name: 'Hendra', last_name: 'Wijaya', full_name: 'Hendra Wijaya', id_employee: null, organization_name: 'Consulting', job: 'Performance Consultant', avatar: null, company_name: 'Mekari' } },
  { id: 903, user_id: 9003, role_id: 8, role_name: 'Report Viewer', roles: { name: 'Report Viewer' }, users: { first_name: 'Sarah', last_name: 'Gunawan', full_name: 'Sarah Gunawan', id_employee: null, organization_name: null, job: null, avatar: null, company_name: null } },
]

// ─── Quota (GET /role-users/quota) ──────────────────────────────────────────
// active_user is derived live from the Employee list in the store; the rest is
// static. limit 15 vs 12 assigned → 3 left, so the "Quota limit reached"
// modal and the over-quota assign error are reachable by just using the page.
export const QUOTA_SEED: Omit<QuotaData, 'active_user'> = {
  limit: 15,
  package_name: 'Performance Pro',
  is_newly_upgraded: false,
  is_error: false,
  grace_period_remaining_days: 30,
}

/** Company subscription is quota-based (getGrantAccess.isQuotaBased). Title/CTA become "Add user". */
export const IS_QUOTA_BASED = true
/** getGrantAccess.isQuotaRestricted — grace period over while exceeding. */
export const IS_QUOTA_RESTRICTED = false

// ─── Assign role modal pool (POST /users/assign-role) ───────────────────────
export function assignableUsers(assigned: RoleUserRow[]): AssignableUser[] {
  // Resigned employees can't be given access; skip records without HR attributes.
  return TALENTS.filter(t => t.status === 'active' && t.branch).map((t) => {
    const holder = assigned.find(a => a.employee_key === t.id)
    const [first, ...rest] = t.name.split(' ')
    return {
      id: userIdOf(t.id),
      employee_key: t.id,
      first_name: first,
      last_name: rest.join(' '),
      id_employee: t.code,
      job: { job: t.jobPosition },
      avatar: t.photo,
      branch: t.branch,
      organization: t.organization,
      job_level: t.jobLevel,
      job_position: t.jobPosition,
      employment_status: t.employmentType,
      is_disabled: Boolean(holder),
      role_name: holder?.role_name,
    }
  })
}

export function roleUserFromKey(id: number, key: string, role: RoleRow): RoleUserRow {
  return { id, user_id: userIdOf(key), role_id: role.id, role_name: role.name, roles: { name: role.name }, users: userFromTalent(key), employee_key: key }
}

// ━━━ MOCK STORE — in-memory, NOT connected to any API ━━━━━━━━━━━━━━━━━━━━━━━━━
// Replaces talenta-review's Vuex `settings/*` role actions (getRolesPaginated,
// getAndStoreRoles, fetchPermissions, fetchRole, createRole, updateRole,
// deleteRole, getAssignedRoles, submitAssignRole) and the direct $axios calls
// in assign-role/Index.vue (role-users PUT/bulk-delete, specialist, quota).
// Module-scope so the Roles list, the role form and Assign role share one
// state. Resets on reload.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import {
  ROLES_SEED, ROLE_USERS_SEED, SPECIALISTS_SEED, QUOTA_SEED, PERMISSIONS, BRANCH_OPTIONS,
  IS_QUOTA_BASED, IS_QUOTA_RESTRICTED, assignableUsers, roleUserFromKey,
  type RoleDetail, type RoleUserRow, type QuotaData, type PermissionScope,
} from '~/utils/manageUser'

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

const roles = ref<RoleDetail[]>(clone(ROLES_SEED))
const roleUsers = ref<RoleUserRow[]>(clone(ROLE_USERS_SEED))
const specialists = ref<RoleUserRow[]>(clone(SPECIALISTS_SEED))
const quotaExtra = ref(clone(QUOTA_SEED))
// Dev scenario (docs/patterns/dev-scenario-control.md): which permission-table
// proposal the role form shows. v1 = Access + Permission list, v2 = one column per action.
export type RolesFormVersion = 'v1' | 'v2'
const rolesFormVersion = ref<RolesFormVersion>('v1')

export interface RolePayload {
  name: string
  description: string
  /** { [permissionId]: checked } — same shape Form.vue's generatePayload() sends. */
  permissions: Record<number, boolean>
  /** PROPOSED (PRD S1): purpose / employment-status scope per Review cycle permission id. */
  permission_scopes: Record<number, PermissionScope>
  role_id?: number
  branches: number[]
}

export class AssignRoleError extends Error {
  constructor(message: string, public data: { is_action_restricted: boolean, active_user: number, limit: number }) {
    super(message)
  }
}

export function useManageUserStore() {
  // ─── Roles ────────────────────────────────────────────────────────────────
  // API order: newest first among company roles; default roles stay on top.
  const roleList = computed(() => [...roles.value].sort((a, b) => {
    if ((a.company_id === 0) !== (b.company_id === 0)) return a.company_id === 0 ? -1 : 1
    return a.company_id === 0 ? a.id - b.id : b.id - a.id
  }))
  const roleById = (id: number) => roles.value.find(r => r.id === id)

  function payloadToPermissionRoles(permissions: Record<number, boolean>, scopes: Record<number, PermissionScope>): RoleDetail['permission_roles'] {
    return Object.entries(permissions).filter(([, on]) => on).map(([id]) => {
      const pid = Number(id)
      const parent = PERMISSIONS.find(p => p.child_permissions.some(c => c.id === pid))
      return {
        permission_id: pid,
        permissions: { parent_permission_id: parent ? parent.id : null },
        ...(scopes[pid] ? { scope: clone(scopes[pid]) } : {}),
      }
    })
  }

  function createRole(payload: RolePayload) {
    const role: RoleDetail = {
      id: Math.max(0, ...roles.value.map(r => r.id)) + 1,
      name: payload.name,
      description: payload.description,
      company_id: 102938,
      role_branches: payload.branches.map(branch_id => ({ branch_id })),
      permission_roles: payloadToPermissionRoles(payload.permissions, payload.permission_scopes),
    }
    roles.value = [...roles.value, role]
    return role
  }

  function updateRole(payload: RolePayload) {
    roles.value = roles.value.map(r => (r.id === payload.role_id
      ? { ...r, name: payload.name, description: payload.description, role_branches: payload.branches.map(branch_id => ({ branch_id })), permission_roles: payloadToPermissionRoles(payload.permissions, payload.permission_scopes) }
      : r))
    // Assigned rows show the role name.
    roleUsers.value = roleUsers.value.map(u => (u.role_id === payload.role_id ? { ...u, role_name: payload.name, roles: { name: payload.name } } : u))
  }

  function deleteRole(id: number) {
    roles.value = roles.value.filter(r => r.id !== id)
    // Employees holding the deleted role lose access.
    roleUsers.value = roleUsers.value.filter(u => u.role_id !== id)
  }

  // ─── Role users ───────────────────────────────────────────────────────────
  const employeeRows = computed(() => [...roleUsers.value].sort((a, b) => b.id - a.id))
  const specialistRows = computed(() => specialists.value)

  const quota = computed<QuotaData>(() => ({ ...quotaExtra.value, active_user: roleUsers.value.length }))
  const isQuotaBased = IS_QUOTA_BASED
  const isQuotaRestricted = IS_QUOTA_RESTRICTED

  const assignable = computed(() => assignableUsers(roleUsers.value))

  /** POST /role-users — throws AssignRoleError (is_action_restricted) when it would exceed the quota. */
  function submitAssignRole(payload: { role_id: number, user_ids: number[] }) {
    const role = roleById(payload.role_id)
    if (!role) throw new Error('Failed to assign roles')
    if (isQuotaBased && roleUsers.value.length + payload.user_ids.length > quotaExtra.value.limit) {
      throw new AssignRoleError('Your member quota has run out.', { is_action_restricted: true, active_user: roleUsers.value.length + payload.user_ids.length, limit: quotaExtra.value.limit })
    }
    let nextId = Math.max(0, ...roleUsers.value.map(u => u.id))
    const added = payload.user_ids
      .map(uid => assignable.value.find(a => a.id === uid))
      .filter((a): a is NonNullable<typeof a> => Boolean(a) && !a!.is_disabled)
      .map(a => roleUserFromKey(++nextId, a.employee_key, role))
    roleUsers.value = [...roleUsers.value, ...added]
  }

  /** PUT /role-users */
  function editRoleUsers(payload: { role_id: number, user_ids: number[] }) {
    const role = roleById(payload.role_id)
    if (!role) throw new Error('Failed to edit role')
    roleUsers.value = roleUsers.value.map(u => (payload.user_ids.includes(u.user_id) ? { ...u, role_id: role.id, role_name: role.name, roles: { name: role.name } } : u))
  }

  /** POST /role-users/bulk-delete-access-role */
  function removeRoleUsers(payload: { user_ids: number[] }) {
    roleUsers.value = roleUsers.value.filter(u => !payload.user_ids.includes(u.user_id))
  }

  function resetDemo() {
    roles.value = clone(ROLES_SEED)
    roleUsers.value = clone(ROLE_USERS_SEED)
    specialists.value = clone(SPECIALISTS_SEED)
    quotaExtra.value = clone(QUOTA_SEED)
  }

  return {
    roles, roleList, roleById, createRole, updateRole, deleteRole,
    permissions: PERMISSIONS, branches: BRANCH_OPTIONS,
    employeeRows, specialistRows, assignable, quota, isQuotaBased, isQuotaRestricted,
    submitAssignRole, editRoleUsers, removeRoleUsers, resetDemo,
    rolesFormVersion,
  }
}

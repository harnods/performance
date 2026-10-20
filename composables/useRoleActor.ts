// Who is editing a role, and what they may hand out. Rizal (Super Admin) can grant
// anything; Rio is a delegated user (Manage Users: Add/Edit) who can only grant what
// his own role holds; everyone else cannot create or edit roles. Each *Reason()
// returns '' when allowed, otherwise the tooltip copy for the disabled control.
export type RoleActorKind = 'super' | 'delegated' | 'none'

const ACTOR_KIND: Record<string, RoleActorKind> = { rizal: 'super', rio: 'delegated' }

// MOCK of the delegated user's own role.
const OWN_SCOPE = {
  purposes: ['performance', 'evaluation'],
  statuses: ['probation', 'contract'],
  blockedActions: [/^delete$/i],
  blockedReportRows: ['9-box matrix', 'ninebox'],
  dashboard: false,
}

const NO_ACCESS = 'Only a Super Admin can change role permissions'
const REASON = {
  purpose: "Your role doesn't include this review purpose",
  status: "Your role doesn't include this employment status",
  action: "Your role doesn't include this permission",
  report: "Your role doesn't include this report type",
  dashboard: "Your role doesn't include dashboard access",
}

export function useRoleActor() {
  const { currentUserId } = useCurrentUser()
  // The persona lives in localStorage, so the server renders the default user; resolve it after mount to keep hydration in sync.
  const mounted = ref(false)
  onMounted(() => { mounted.value = true })

  const kind = computed<RoleActorKind>(() => (mounted.value ? (ACTOR_KIND[currentUserId.value] ?? 'none') : 'super'))
  const canManageRoles = computed(() => kind.value !== 'none')

  const guard = (reason: string) => (kind.value === 'super' ? '' : kind.value === 'none' ? NO_ACCESS : reason)
  const purposeReason = (p: string) => guard(OWN_SCOPE.purposes.includes(p) ? '' : REASON.purpose)
  const statusReason = (s: string) => guard(OWN_SCOPE.statuses.includes(s) ? '' : REASON.status)
  const actionReason = (label: string) => guard(OWN_SCOPE.blockedActions.some(re => re.test(label)) ? REASON.action : '')
  const reportReason = (row: string) => guard(OWN_SCOPE.blockedReportRows.includes(row) ? REASON.report : '')
  const dashboardReason = () => guard(OWN_SCOPE.dashboard ? '' : REASON.dashboard)
  /** A permission row's label: the action ("Delete") or a report type ("9-box matrix"). */
  const permissionReason = (label: string) => actionReason(label) || reportReason(label)

  return { kind, canManageRoles, purposeReason, statusReason, actionReason, reportReason, dashboardReason, permissionReason }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inbox notifications mini-DB — same module-scope singleton + localStorage
// pattern as useGoalsStore.ts / useGoalApprovalsStore.ts. Extracted out of
// pages/inbox/notifications.vue (which used to hold this as page-local state)
// so OTHER features can push a real notification into someone's Inbox —
// e.g. components/GoalSubmissionReview.vue's "Request revision" action
// notifying the goal owner.
//
// `recipientId` is optional: undefined means "visible to everyone" (every
// notification seeded here originally, written before any single-recipient
// concept existed) — only new notifications created via `addNotification`
// are expected to set it, so existing demo content keeps behaving exactly
// as before for every persona.
// ─────────────────────────────────────────────────────────────────────────────
import { employeeById, employeeMeta } from '~/utils/employees'

export interface DetailRow {
  label: string
  value: string
  sub?: string
}
export interface NotificationAction {
  label: string
  variant: 'primary' | 'ghost'
  // Route the action navigates to when clicked. Optional so an action can be
  // purely informational, but every seeded/generated action below sets one.
  to?: string
}
export interface Notification {
  id: string
  recipientId?: string
  group: string
  title: string
  timeLabel: string
  summary: string
  senderName: string
  senderTimestamp: string
  body: string
  details: DetailRow[]
  actions: NotificationAction[]
  isRead: boolean
}

const cinta = employeeById('cinta')

function seed(): Notification[] {
  return [
    {
      id: 'n1',
      group: 'Today',
      title: 'Import complete: 240 records',
      timeLabel: 'Just now',
      summary: '240 employee records were added to your employee directory.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '4 Mar 2026, 16:30',
      body: '240 employee records were added to the employee directory.',
      details: [
        { label: 'Imported by', value: cinta?.name ?? 'Cinta Ayu', sub: cinta ? employeeMeta(cinta) : undefined },
        { label: 'Import started', value: '4 Mar 2026, 16:25' },
        { label: 'Import completed', value: '4 Mar 2026, 16:30' },
        { label: 'Source file', value: 'employee_data_Q1_2026.xlsx' },
      ],
      actions: [
        { label: 'View employee directory', variant: 'primary' },
        { label: 'View import log', variant: 'ghost' },
      ],
      isRead: true,
    },
    {
      id: 'n2',
      group: 'Today',
      title: 'Goal update approved',
      timeLabel: '5 mins ago',
      summary: 'Andi Suryanto has approved your progress update. Your progress has been updated from 60% to 75%.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '4 Mar 2026, 11:52',
      body: 'Andi Suryanto has approved your progress update on the goal below. Your progress has been updated from 60% to 75%.',
      details: [
        { label: 'Approved by', value: 'Andi Suryanto' },
        { label: 'Goal', value: 'Reduce operational cost by 10% through process automation' },
        { label: 'Progress', value: '60% → 75%' },
      ],
      actions: [{ label: 'View goal', variant: 'primary', to: '/goals/goal-cycles' }],
      isRead: false,
    },
    {
      id: 'n10',
      group: 'Today',
      title: "You're assigned to review",
      timeLabel: '2 hours ago',
      summary: "You're assigned to review Alfian Ramadhan for the 2026 Q1 Performance Appraisal.",
      senderName: 'Mekari Talenta',
      senderTimestamp: '4 Mar 2026, 14:30',
      body: 'Provide your feedback for Alfian Ramadhan before the review period ends.',
      details: [
        { label: 'Review cycle', value: '2026 Q1 Performance Appraisal', sub: '1 Jan – 31 Mar 2026' },
        { label: 'Employee to review', value: 'Alfian Ramadhan', sub: 'CP042 | HR Admin | HR' },
        { label: 'Review period', value: '1 Apr – 15 Apr 2026' },
      ],
      actions: [{ label: 'Start review', variant: 'primary', to: '/reviews/pending-actions' }],
      isRead: true,
    },
    {
      id: 'n14',
      group: 'Last 7 days',
      title: '2026 Q1 Performance Appraisal has started',
      timeLabel: '1 Mar',
      summary: 'Complete your assigned reviews before 15 Apr 2026.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '1 Mar 2026, 09:00',
      body: 'Complete your assigned reviews before 15 Apr 2026.',
      details: [
        { label: 'Review cycle', value: '2026 Q1 Performance Appraisal', sub: '1 Jan – 31 Mar 2026' },
        { label: 'Review period', value: '1 Apr – 15 Apr 2026' },
        { label: 'Total reviewees', value: '12 employees' },
      ],
      actions: [{ label: 'Start review', variant: 'primary', to: '/reviews/pending-actions' }],
      isRead: true,
    },
    {
      id: 'n13',
      group: 'Last 7 days',
      title: 'Complete your reviews: 3 days left',
      timeLabel: '28 Feb',
      summary: 'You have pending reviews for the 2026 Q1 Performance Appraisal.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '28 Feb 2026, 10:00',
      body: 'You have pending reviews for the 2026 Q1 Performance Appraisal. Complete them before 15 Apr 2026.',
      details: [
        { label: 'Review cycle', value: '2026 Q1 Performance Appraisal', sub: '1 Jan – 31 Mar 2026' },
        { label: 'Review period', value: '1 Apr – 15 Apr 2026' },
      ],
      actions: [{ label: 'Start review', variant: 'primary', to: '/reviews/pending-actions' }],
      isRead: true,
    },
    {
      id: 'n16',
      group: 'Last 7 days',
      title: 'Goal update rejected',
      timeLabel: '28 Feb',
      summary: 'Andi Suryanto has rejected your progress update for Increase Sales Conversion.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '28 Feb 2026, 15:10',
      body: 'Andi Suryanto rejected your progress update for Increase Sales Conversion.',
      details: [
        { label: 'Goal', value: 'Increase Sales Conversion' },
        { label: 'Progress', value: 'Unchanged at 60%' },
        { label: 'Reason', value: 'Scope not included in this cycle' },
      ],
      actions: [{ label: 'View goal', variant: 'primary', to: '/goals/goal-cycles' }],
      isRead: true,
    },
    {
      id: 'n11',
      group: 'Last 7 days',
      title: 'Pick your coworkers to review: 7 days left',
      timeLabel: '27 Feb',
      summary: "You haven't selected any coworkers for the 2026 Q1 Performance Appraisal.",
      senderName: 'Mekari Talenta',
      senderTimestamp: '27 Feb 2026, 09:30',
      body: "You haven't selected any coworkers for the 2026 Q1 Performance Appraisal. Pick them before the deadline.",
      details: [
        { label: 'Review cycle', value: '2026 Q1 Performance Appraisal', sub: '1 Jan – 31 Mar 2026' },
        { label: 'Review period', value: '1 Apr – 15 Apr 2026' },
        { label: 'Due date', value: '31 Mar 2026' },
      ],
      actions: [{ label: 'Pick coworkers', variant: 'primary', to: '/reviews/pending-actions' }],
      isRead: true,
    },
    {
      id: 'n12',
      group: 'Last 7 days',
      title: '3 employees need reviewer assignment',
      timeLabel: '27 Feb',
      summary: 'Some employees in the 2026 Q1 Performance Appraisal are missing reviewers.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '27 Feb 2026, 09:00',
      body: "3 of your employees don't have reviewers assigned for the 2026 Q1 Performance Appraisal. Assign reviewers before the deadline.",
      details: [
        { label: 'Review cycle', value: '2026 Q1 Performance Appraisal', sub: '1 Jan – 31 Mar 2026' },
        { label: 'Due date', value: '31 Mar 2026' },
        { label: 'Employees pending assignment', value: 'Alfian Ramadhan, Jessie Tan, Ali Imran' },
      ],
      actions: [{ label: 'Assign reviewers', variant: 'primary', to: '/reviews/pending-actions' }],
      isRead: true,
    },
    {
      id: 'n15',
      group: 'Last 7 days',
      title: 'Goals for 2026 H1 rejected',
      timeLabel: '27 Feb',
      summary: 'Andi Suryanto has requested changes to your goals for the 2026 H1 goal cycle.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '27 Feb 2026, 08:45',
      body: 'Andi Suryanto rejected your submission for the 2026 H1 goal cycle. Update and resubmit your goals.',
      details: [
        { label: 'Approved by', value: 'Andi Suryanto' },
        { label: 'Goal cycle', value: '2026 H1' },
      ],
      actions: [{ label: 'Update goals', variant: 'primary', to: '/goals/goal-cycles' }],
      isRead: true,
    },
    {
      id: 'n3',
      group: 'Last 7 days',
      title: 'Goal edit approved',
      timeLabel: '26 Feb',
      summary: 'Andi Suryanto has approved the changes you made to your goal. The updated version is now active.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '26 Feb 2026, 09:40',
      body: 'Andi Suryanto has approved the changes you made to the goal below. The updated version is now active.',
      details: [
        { label: 'Approved by', value: 'Andi Suryanto' },
        { label: 'Goal', value: 'Achieve IDR 500.000.000 in monthly revenue' },
      ],
      actions: [{ label: 'View goal', variant: 'primary', to: '/goals/goal-cycles' }],
      isRead: true,
    },
    {
      id: 'n4',
      group: 'Last 7 days',
      title: 'Goals for 2026 H1 approved',
      timeLabel: '26 Feb',
      summary: 'Andi Suryanto has approved all your goals for the 2026 H1 goal cycle. You can now start tracking your progress.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '26 Feb 2026, 09:15',
      body: 'Andi Suryanto has approved all your goals for the 2026 H1 goal cycle. You can now start tracking your progress.',
      details: [
        { label: 'Approved by', value: 'Andi Suryanto' },
        { label: 'Goal cycle', value: '2026 H1' },
      ],
      actions: [{ label: 'View all goals', variant: 'primary', to: '/goals/goal-cycles' }],
      isRead: true,
    },
    {
      id: 'n5',
      group: 'Last 7 days',
      title: 'Job position import completed with issues',
      timeLabel: '25 Feb',
      summary: 'Import from job_positions_2026.xlsx is complete. Most records were imported successfully, but 5 records were skipped. Please review the import log for details.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '25 Feb 2026, 14:02',
      body: 'Import from job_positions_2026.xlsx is complete. Most records were imported successfully, but 5 records were skipped. Please review the import log for details.',
      details: [
        { label: 'Source file', value: 'job_positions_2026.xlsx' },
        { label: 'Records imported', value: '95 of 100' },
        { label: 'Records skipped', value: '5' },
      ],
      actions: [{ label: 'View import log', variant: 'primary' }],
      isRead: true,
    },
    {
      id: 'n6',
      group: 'Feb',
      title: 'Export ready for download',
      timeLabel: '20 Feb',
      summary: 'The export of review results for the 2025 H2 review cycle has been completed. The file contains results for 312 employees and is ready to download.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '20 Feb 2026, 10:08',
      body: 'The export of review results for the 2025 H2 review cycle has been completed. The file contains results for 312 employees and is ready to download.',
      details: [
        { label: 'Review cycle', value: '2025 H2' },
        { label: 'Employees included', value: '312' },
      ],
      actions: [{ label: 'Download file', variant: 'primary' }],
      isRead: true,
    },
    {
      id: 'n17',
      group: 'Feb',
      title: 'Pending review report ready',
      timeLabel: '17 Feb',
      summary: "12 employees haven't submitted their reviews yet.",
      senderName: 'Mekari Talenta',
      senderTimestamp: '17 Feb 2026, 11:15',
      body: "12 employees haven't submitted their reviews for the 2026 Q1 Performance Appraisal. Download the list to follow up.",
      details: [
        { label: 'Review cycle', value: '2026 Q1 Performance Appraisal', sub: '1 Jan – 31 Mar 2026' },
        { label: 'Pending submissions', value: '12 employees' },
      ],
      actions: [{ label: 'Download report', variant: 'primary' }],
      isRead: true,
    },
    {
      id: 'n7',
      group: 'Feb',
      title: 'Review result PDF ready',
      timeLabel: '15 Feb',
      summary: `The review result PDF for ${cinta?.name ?? 'Cinta Ayu'} from the 2025 H2 review cycle has been generated and is ready to download.`,
      senderName: 'Mekari Talenta',
      senderTimestamp: '15 Feb 2026, 08:47',
      body: `The review result PDF for ${cinta?.name ?? 'Cinta Ayu'} from the 2025 H2 review cycle has been generated and is ready to download.`,
      details: [
        { label: 'Employee', value: cinta?.name ?? 'Cinta Ayu', sub: cinta ? employeeMeta(cinta) : undefined },
        { label: 'Review cycle', value: '2025 H2' },
      ],
      actions: [{ label: 'Download PDF', variant: 'primary' }],
      isRead: true,
    },
    {
      id: 'n8',
      group: 'Feb',
      title: 'Goal progress update approved',
      timeLabel: '12 Feb',
      summary: 'Andi Suryanto has approved your progress update. Your progress has been updated from 60% to 75%.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '12 Feb 2026, 17:20',
      body: 'Andi Suryanto has approved your progress update on the goal below. Your progress has been updated from 60% to 75%.',
      details: [
        { label: 'Approved by', value: 'Andi Suryanto' },
        { label: 'Goal', value: 'Complete Brevet A & B tax certification by Q3' },
        { label: 'Progress', value: '60% → 75%' },
      ],
      actions: [{ label: 'View goal', variant: 'primary', to: '/goals/goal-cycles' }],
      isRead: true,
    },
    {
      id: 'n9',
      group: 'Feb',
      title: 'Goal progress update approved',
      timeLabel: '12 Feb',
      summary: 'Andi Suryanto has approved your progress update. Your progress has been updated from 45% to 60%.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '12 Feb 2026, 09:05',
      body: 'Andi Suryanto has approved your progress update on the goal below. Your progress has been updated from 45% to 60%.',
      details: [
        { label: 'Approved by', value: 'Andi Suryanto' },
        { label: 'Goal', value: 'Reduce operational cost by 10% through process automation' },
        { label: 'Progress', value: '45% → 60%' },
      ],
      actions: [{ label: 'View goal', variant: 'primary', to: '/goals/goal-cycles' }],
      isRead: true,
    },
    {
      id: 'n18',
      group: 'Feb',
      title: 'Goal edit approval requested',
      timeLabel: '11 Feb',
      summary: 'Alfian Ramadhan has requested to edit an existing goal. Please review the changes.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '11 Feb 2026, 13:20',
      body: 'Alfian Ramadhan requested to edit an existing goal and its key results. Please review the changes below.',
      details: [
        { label: 'Goal', value: 'Increase Sales Conversion' },
        { label: 'Current target', value: 'Increase MRR by 10%' },
        { label: 'Requested target', value: 'Expand upsell offers to existing customers' },
      ],
      actions: [{ label: 'Review changes', variant: 'primary', to: '/reviews/pending-actions' }],
      isRead: true,
    },
    {
      id: 'n19',
      group: 'Feb',
      title: 'Goal edit rejected',
      timeLabel: '9 Feb',
      summary: 'Andi Suryanto has rejected your goal edit request for Increase Sales Conversion.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '9 Feb 2026, 16:05',
      body: 'Andi Suryanto rejected your goal edits for Increase Sales Conversion. Update and resubmit your changes.',
      details: [
        { label: 'Goal', value: 'Increase Sales Conversion' },
        { label: 'Current target', value: 'Increase MRR by 10%' },
        { label: 'Requested target', value: 'Expand upsell offers to existing customers' },
      ],
      actions: [{ label: 'View goal', variant: 'primary', to: '/goals/goal-cycles' }],
      isRead: true,
    },
    {
      id: 'n20',
      group: 'Feb',
      title: 'Export ready: review summary',
      timeLabel: '6 Feb',
      summary: 'The review summary export for the 2025 H2 review cycle is ready to download.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '6 Feb 2026, 09:50',
      body: 'Your requested export of the review summary is now ready to download.',
      details: [
        { label: 'Exported by', value: cinta?.name ?? 'Cinta Ayu', sub: cinta ? employeeMeta(cinta) : undefined },
        { label: 'Review cycle', value: '2025 H2' },
        { label: 'File name', value: 'review_summary_2025_H2.xlsx' },
      ],
      actions: [{ label: 'Download file', variant: 'primary' }],
      isRead: true,
    },
    {
      id: 'n21',
      group: 'Jan',
      title: 'Review cycle completed',
      timeLabel: '20 Jan',
      summary: 'Results for the 2025 Q4 Performance Appraisal are ready. Review and calibrate before publishing.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '20 Jan 2026, 10:30',
      body: 'The results for the 2025 Q4 Performance Appraisal are ready. Review and calibrate them before publishing to employees.',
      details: [
        { label: 'Review cycle', value: '2025 Q4 Performance Appraisal', sub: '1 Oct – 31 Dec 2025' },
        { label: 'Review period', value: '1 Jan – 15 Jan 2026' },
      ],
      actions: [{ label: 'View results', variant: 'primary' }],
      isRead: true,
    },
    {
      id: 'n22',
      group: 'Jan',
      title: 'AI review summary ready',
      timeLabel: '18 Jan',
      summary: 'Mekari Airene has generated a review summary for the 2025 Q4 Performance Appraisal.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '18 Jan 2026, 09:15',
      body: 'Mekari Airene has generated a review summary for the 2025 Q4 Performance Appraisal. Check it before continuing your HR review process.',
      details: [
        { label: 'Review cycle', value: '2025 Q4 Performance Appraisal', sub: '1 Oct – 31 Dec 2025' },
      ],
      actions: [{ label: 'View summary', variant: 'primary' }],
      isRead: true,
    },
    {
      id: 'n23',
      group: 'Jan',
      title: 'Goal progress update reminder',
      timeLabel: '15 Jan',
      summary: 'Please update your progress for Increase Sales Conversion.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '15 Jan 2026, 08:30',
      body: 'Please update your progress for Increase Sales Conversion. Keeping your achievements current ensures your performance data is accurate for the upcoming review.',
      details: [
        { label: 'Goal', value: 'Increase Sales Conversion' },
      ],
      actions: [{ label: 'Update goal progress', variant: 'primary', to: '/goals/goal-cycles' }],
      isRead: true,
    },
    {
      id: 'n24',
      group: 'Dec 2025',
      title: 'Team goal progress update reminder',
      timeLabel: '18 Dec 2025',
      summary: 'Please update the progress for your team goal: Increase Sales Conversion.',
      senderName: 'Mekari Talenta',
      senderTimestamp: '18 Dec 2025, 08:30',
      body: "Please update the progress for your team goal: Increase Sales Conversion. Keeping this current ensures the department's overall achievements are accurately reflected.",
      details: [
        { label: 'Team goal', value: 'Increase Sales Conversion' },
      ],
      actions: [{ label: 'Update goal progress', variant: 'primary', to: '/goals/goal-cycles' }],
      isRead: true,
    },
  ]
}

const STORAGE_KEY = 'talenta-inbox-notifications-db'
const SEED_VERSION = 1
const notificationsData = ref<Notification[]>(seed())
let loadedFromStorage = false
let seq = 0

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, notifications: notificationsData.value }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.notifications)) {
        notificationsData.value = parsed.notifications
        return
      }
    }
    catch {
      // fall through to re-seed on corrupt or outdated storage
    }
  }
  persist()
}

export function useInboxNotificationsStore() {
  loadFromStorage()
  const { currentUserId } = useCurrentUser()

  // Legacy seed content (no recipientId) stays visible to every persona,
  // exactly as before this store existed — only newly-added notifications
  // are ever scoped to one specific recipient.
  const notifications = computed(() => notificationsData.value.filter(n => !n.recipientId || n.recipientId === currentUserId.value))

  function markRead(ids: string[]) {
    const set = new Set(ids)
    notificationsData.value = notificationsData.value.map(n => (set.has(n.id) ? { ...n, isRead: true } : n))
    persist()
  }
  function markUnread(ids: string[]) {
    const set = new Set(ids)
    notificationsData.value = notificationsData.value.map(n => (set.has(n.id) ? { ...n, isRead: false } : n))
    persist()
  }
  function deleteNotifications(ids: string[]) {
    const set = new Set(ids)
    notificationsData.value = notificationsData.value.filter(n => !set.has(n.id))
    persist()
  }
  function addNotification(input: Omit<Notification, 'id' | 'isRead'>) {
    seq += 1
    const notification: Notification = { ...input, id: `notif-gen-${Date.now()}-${seq}`, isRead: false }
    notificationsData.value = [notification, ...notificationsData.value]
    persist()
    return notification
  }

  return { notifications, markRead, markUnread, deleteNotifications, addNotification }
}

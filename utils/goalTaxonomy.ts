// ─────────────────────────────────────────────────────────────────────────────
// Shared mock: goal category → sub-category taxonomy, goal types, measurement
// units and repeat intervals. Matches the taxonomy already visible in
// pages/goals/goal-cycles/[id]/index.vue's mock "All goals" table, kept here
// as a single source of truth for the Add Goal drawer's selects.
// ─────────────────────────────────────────────────────────────────────────────

export interface GoalSubCategory { value: string; label: string }
export interface GoalCategory { value: string; label: string; subCategories: GoalSubCategory[] }

export const GOAL_CATEGORIES: GoalCategory[] = [
  {
    value: 'financial', label: 'Financial',
    subCategories: [
      { value: 'sustainable-profitable-growth', label: 'Sustainable Profitable Growth' },
      { value: 'cost-efficiency', label: 'Cost Efficiency' },
      { value: 'revenue-contribution', label: 'Revenue Contribution' },
    ],
  },
  {
    value: 'customer', label: 'Customer',
    subCategories: [
      { value: 'market-leadership', label: 'Market Leadership' },
      { value: 'customer-satisfaction', label: 'Customer Satisfaction' },
    ],
  },
  {
    value: 'internal-process', label: 'Internal Process',
    subCategories: [
      { value: 'supply-chain-excellence', label: 'Supply Chain Excellence' },
      { value: 'process-improvement', label: 'Process Improvement' },
    ],
  },
  {
    value: 'learning-growth', label: 'Learning & Growth',
    subCategories: [
      { value: 'capability-building', label: 'Capability Building' },
    ],
  },
]

export const GOAL_TYPE_OPTIONS = [
  { value: 'company', label: 'Company goal' },
  { value: 'organization', label: 'Organization goal' },
  { value: 'team', label: 'Team goal' },
  { value: 'individual', label: 'Individual goal' },
]

export const MEASUREMENT_UNIT_OPTIONS = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'number', label: 'Number' },
  { value: 'amount', label: 'Amount' },
  { value: 'deadline', label: 'Deadline' },
] as const
export type MeasurementUnit = typeof MEASUREMENT_UNIT_OPTIONS[number]['value']

export const CURRENCY_OPTIONS = [
  { value: 'IDR', label: '🇮🇩 IDR', trailing: 'Rp', symbol: 'Rp' },
  { value: 'AUD', label: '🇦🇺 AUD', trailing: 'A$', symbol: 'A$' },
  { value: 'CNY', label: '🇨🇳 CNY', trailing: 'CN¥', symbol: 'CN¥' },
  { value: 'EUR', label: '🇪🇺 EUR', trailing: '€', symbol: '€' },
  { value: 'GBP', label: '🇬🇧 GBP', trailing: '£', symbol: '£' },
  { value: 'HKD', label: '🇭🇰 HKD', trailing: 'HK$', symbol: 'HK$' },
  { value: 'JPY', label: '🇯🇵 JPY', trailing: '¥', symbol: '¥' },
  { value: 'KRW', label: '🇰🇷 KRW', trailing: '₩', symbol: '₩' },
  { value: 'MYR', label: '🇲🇾 MYR', trailing: 'RM', symbol: 'RM' },
  { value: 'PHP', label: '🇵🇭 PHP', trailing: '₱', symbol: '₱' },
  { value: 'INR', label: '🇮🇳 INR', trailing: '₹', symbol: '₹' },
  { value: 'SGD', label: '🇸🇬 SGD', trailing: 'S$', symbol: 'S$' },
  { value: 'THB', label: '🇹🇭 THB', trailing: '฿', symbol: '฿' },
  { value: 'USD', label: '🇺🇸 USD', trailing: '$', symbol: '$' },
  { value: 'VND', label: '🇻🇳 VND', trailing: '₫', symbol: '₫' },
] as const
export type CurrencyCode = typeof CURRENCY_OPTIONS[number]['value']

// ─────────────────────────────────────────────────────────────────────────────
// Goals mini-DB — persisted "mock data preseed" for the 26 H1 goal cycle
// (id 'seed-26-h1', matching useGoalCyclesStore). Single source of truth for
// every Goals view: Company / Organization / Team / Individual, plus the
// "My goals" / "My direct reports" personal filters.
//
// Business context: PT Central Perk Indonesia — a wholesale + retail coffee
// bean company that also runs its own coffee shop/cafe. Sourced verbatim
// from H1_2026_Goals_CentralPerk_v4.xlsx's "Goals" master list — every Goal
// ID, category, sub-category, title, target, and weight below is transcribed
// from that file, not invented.
//
// The source itself has no progress-tracking data (it's a goal-setting
// template, not a mid-cycle snapshot) — but H1 2026 (Jan–Jun) has already
// ended by the time this cycle is viewed, so every goal below carries
// invented (not source) end-of-cycle progress: status/unit/value/pill/min/
// max, generated deterministically from each goal's own Target text (parsed
// for its unit — currency/percent/count — and direction, ≥ vs ≤), weighted
// ~70% green (met or exceeded target) / ~30% orange (missed it). Bounded
// scales (ratings out of 5, scores out of 100, percentages) are capped at
// their natural ceiling so an achieved value never exceeds it. A handful of
// non-numeric targets ("Bi-weekly", "By June 30", "Completed") get a status
// only, no progress bar — same as any goal with no unit.
//
// Every one of the 11 named employees below owns ONE 100%-summing set of
// goals that mixes Company/Organization/Team/Individual tags together
// (Level and Category are two independent dimensions of a goal, not
// separate ownership hierarchies) — e.g. Ali Imran's 100% splits across 2
// Organization + 3 Team + 4 Individual goals in a single pot, not four
// separate 100% budgets. Alfian Ramadhan (Rio's only direct report) owns a
// Daud/Jessie-shaped team+individual set cascading from Rio's own HR goals,
// added later so Rio's "My direct reports" view isn't empty. The remaining
// employees in utils/employees.ts (Agung, Christin, Dewi, Fajar, Galih,
// Indah, Joko, Linda) own no goals at all under this model, though several
// appear as `contributorIds` on goals they help deliver.
//
// `alignedToId` is real source data (the "Aligned To" column — the exact
// parent goal this one cascades from) and is the ONLY thing
// utils/goalRows.ts's alignedGoalsOf uses to compute a goal's children: goal
// X's aligned goals are every goal whose alignedToId === X.id, a precise
// reverse lookup, not a guess. Only 47 of 88 goals have one (most goals
// don't have a recorded child) — cross-validated against the source's own
// "Cascade Tree" reference sheet. `viewerIds` (from "Goal Viewers" — who is
// *allowed* to align their own goal to this one, resolved from names, with
// group labels like "All dept heads" expanded to explicit ids) is broader
// than alignedToId and kept as reference data, but no longer drives the
// aligned-goals feature.
// ─────────────────────────────────────────────────────────────────────────────

import type { DeadlineRule } from '~/utils/goalDeadline'
import type { DraftKeyResult } from '~/utils/goalDraft'

export type GoalLevel = 'company' | 'organization' | 'team' | 'individual'
export type GoalCategory = 'Financial' | 'Customer' | 'Internal Process' | 'Learning & Growth'
export type GoalStatus = 'green' | 'orange' | 'gray'
export type GoalUnit = 'currency' | 'percent' | 'count' | 'deadline'

export interface Goal {
  id: string
  cycleId: string
  level: GoalLevel
  ownerId: string // Employee.id from ~/utils/employees
  department: string
  category: GoalCategory
  subCategory: string
  code: string
  title: string
  weight: number
  contributorIds: string[] // employees whose work impacts this goal's outcome (0-2)
  viewerIds: string[] // employees allowed to align their own goal to this one (reference data)
  alignedToId?: string // the parent Goal.id this goal cascades from, if any
  alignedToKrId?: string // when set, this goal aligns to a specific key result of the parent goal
  status: GoalStatus
  unit?: GoalUnit
  currency?: string // only meaningful when unit === 'currency'
  value?: number
  pill?: number
  min?: number
  max?: number
  startDate?: string // ISO yyyy-mm-dd — goals created via the "New goals" flow only
  endDate?: string // ISO yyyy-mm-dd
  repeat?: boolean
  deadlineDate?: string // ISO yyyy-mm-dd — only meaningful when unit === 'deadline'
  deadlineRules?: DeadlineRule[]
  isDraft?: boolean // saved via "Save as draft" on the "New goals" page rather than "Save"
  description?: string
  useBaseline?: boolean
  direction?: 'higher' | 'lower'
  keyResults?: DraftKeyResult[]
  restrictedVisibility?: boolean // organization-level goals only — true limits viewing to the goal owner + members
  // Last progress update — shown in the "Last updated by … on …" footer of the
  // Alignment card on the goal detail page. `updatedBy` is a display name;
  // `updatedAt` a preformatted "15 Mar 2026, 15:00" timestamp. Optional: goals
  // without it fall back to the owner's name and omit the date.
  updatedBy?: string
  updatedAt?: string
}

// A goal's own `weight` is authored — every owner's goals (across all
// levels mixed together) sum to exactly 100%, their one real budget for the
// cycle. A category's weight is NOT authored — it's never something a user
// types in; it's the sum of that owner's own goal weights that fall under
// this category, across every level, computed in useGoalsStore() below —
// matching the source spreadsheet's own "Category Weight" reference sheet
// (SUMIFS by owner+category ÷ owner's total weight).
export interface GoalWithCategoryWeight extends Goal {
  categoryWeight: number
}

// Lightweight org chart for "My goals" / "My direct reports" — not modeled
// anywhere else in the app, kept local to this store since only the Goals
// module needs it. The department heads report to the CEO; everyone else
// reports to their department head.
export const EMPLOYEE_MANAGER: Record<string, string> = {
  evelyn: 'rizal', rio: 'rizal', ali: 'rizal', bayu: 'rizal', andi: 'rizal', cinta: 'rizal',
  dewi: 'rizal', // new hire, Head of Operations — owns no goals yet (see useGoalsStore's seed comment)
  agung: 'evelyn', christin: 'evelyn', linda: 'evelyn', dian: 'evelyn',
  alfian: 'rio', santi: 'rio',
  daud: 'ali', jessie: 'ali', reza: 'ali',
  indah: 'andi', wisnu: 'andi',
  eka: 'cinta', fajar: 'cinta', galih: 'cinta', joko: 'cinta', putri: 'cinta',
  yoga: 'bayu',
}

// Rizal (CEO) is the only Super Admin in this demo — approval review is
// centralized to him regardless of who's acting as the "logged-in" persona
// (see useCurrentUser.ts), not distributed per-manager.
export function isSuperAdmin(userId: string): boolean {
  return userId === 'rizal'
}

// Everyone except the true top of the hierarchy (Rizal) has a manager —
// used both to gate the "My requests" tab and by needsApproval below.
export function hasManager(userId: string): boolean {
  return userId in EMPLOYEE_MANAGER
}

// Owners whose committed (non-draft) goals already sum to 100% or more in
// this scope — used to keep the "New goals" employee picker from offering
// someone who has no weight left to give a newly added goal, which would
// otherwise let them through the picker only to hit the "must equal exactly
// 100%" block later at Save. Drafts are excluded from the sum since they
// aren't committed yet and are exactly what "New goals" lets you keep adding to.
export function fullyWeightedOwnerIds(goals: Goal[]): Set<string> {
  const sums = new Map<string, number>()
  for (const g of goals) {
    if (g.isDraft) continue
    sums.set(g.ownerId, (sums.get(g.ownerId) ?? 0) + g.weight)
  }
  return new Set([...sums].filter(([, weight]) => weight >= 100).map(([id]) => id))
}

// Whether creating/editing/deleting this owner's goal must go through the
// approval queue (composables/useGoalApprovalsStore.ts) instead of taking
// effect immediately. Approval is centralized to the Super Admin, so this
// only depends on whether the OWNER has a manager at all — not on who's
// currently acting.
export function needsApproval(ownerId: string): boolean {
  return hasManager(ownerId)
}

const CYCLE_ID = 'seed-26-h1'

// Long-form goal descriptions, keyed by goal `code`. These are the free-text
// "what/why/how" narratives a real goal owner types when setting a goal —
// grounded in each goal's own title, target, category, sub-category and level,
// and in PT Central Perk Indonesia's business (wholesale + retail coffee beans
// plus its own cafe). Wired into g() below so every seeded goal carries one
// without touching the 99 goal objects; the H2 clones inherit it via spread.
const GOAL_DESCRIPTIONS: Record<string, string> = {
  'RC-01': `Total revenue is the single number the whole company is steering toward this half, and IDR 9.2B for H1 2026 reflects the combined pull of our wholesale bean contracts, retail bag sales, and the cafe floor. Hitting it matters because every downstream budget, hiring plan, and expansion decision is sized against it, so a shortfall here ripples into everything else we want to do this year. I track it as a rolling monthly actual against the phased target, watching the mix between wholesale and retail so we do not lean too hard on one channel, and I review the trend with Sales and Marketing in the monthly business review. The outcome leans heavily on Ali's sales team closing pipeline on schedule and on Bayu's demand-generation keeping the funnel full, so this is a shared push rather than something Management delivers alone.`,
  'RC-02': `Margin, not just top line, is what keeps PT Central Perk Indonesia healthy, so holding EBITDA margin at or above 18 percent for the half is the discipline goal that sits underneath all our growth ambitions. It matters because a coffee business with thin margins has no cushion when green-bean prices spike or the cafe has a quiet month, and an 18 percent floor is what lets us self-fund the things we care about. My approach is to watch the gap between revenue growth and cost growth every month, keep a close eye on cost of goods and the operating lines, and step in early whenever a department starts trending over. This depends a great deal on Evelyn and Accounting keeping variance tight and on cost discipline holding across Kitchen, Sales, and the cafe, since margin is really the sum of many small decisions.`,
  'RC-03': `A strong Net Promoter Score across every channel is how we know customers actually love us, not just tolerate us, and a target of 72 across wholesale, retail, and the cafe is deliberately ambitious. This matters because word of mouth is our cheapest and most durable growth engine in specialty coffee, and a high NPS is the leading indicator that repeat orders and cafe regulars will keep coming. I measure it by consolidating survey results from all three channels into one blended score and reviewing the detractor themes each month so we fix root causes rather than chase the number. Reaching it relies on Cinta's front-of-house team delivering a consistently great cafe experience and on Andi's kitchen upholding food quality, because a single weak touchpoint drags the blended result down for everyone.`,
  'RC-04': `Setting good objectives is easy; finishing them is the hard part, so an H1 OKR completion rate of at least 90 percent is really a test of our execution discipline as a leadership team. It matters because a company that only half-delivers its own plan slowly loses trust in the planning process itself, and I would rather we set fewer goals and actually land them. I track this as the share of key results marked complete against the total committed at the start of the half, reviewed at the mid-cycle checkpoint so we can reprioritize while there is still time to act. Because there are no direct contributors here, delivery depends on every department head owning their own slice, and my role is mostly to remove blockers, keep the cadence honest, and make sure nothing quietly stalls.`,
  'RC-05': `An engaged team makes better coffee and treats customers better, which is why an employee engagement score of at least 75 out of 100 sits at company level rather than being buried inside HR. This matters to PT Central Perk Indonesia because our margins depend on retention and craft, and in a business built on baristas, roasters, and account managers, disengagement shows up fast as turnover and inconsistent quality. I read this from the company-wide engagement survey, comparing the score against the prior wave and paying particular attention to the lowest-scoring teams so we act where it counts. The number is really Rio's to move through HR programs and manager quality, but as CEO I own the tone from the top, so I treat this as a joint commitment rather than something I can delegate entirely.`,
  'RC-06': `This is my personal bet on a new business channel, aiming to add IDR 500M of fresh revenue this half beyond our established wholesale, retail, and cafe streams. It matters because relying on three known channels leaves us exposed, and proving a fourth path works de-risks the company's growth story while opening options for H2 and beyond. I run it as a repeating monthly target, tracking incremental revenue from the new channel against a baseline and pairing it with efficiency guardrails so we grow profitably rather than buying revenue, which is why the labor-cost-ratio and spoilage key results ride alongside it. Progress leans on Ali's help opening doors on the sales side, and I review it personally each month because a new channel needs hands-on attention before it can stand on its own.`,
  'RC-07': `Adding five new strategic wholesale partnerships in the half is how we widen the base of large, recurring bean buyers rather than depending on the same handful of accounts. It matters because wholesale is our steadiest revenue and each strategic partner brings volume, predictability, and often a reference that opens the next door, so partnerships compound in a way one-off orders never do. I count only genuinely strategic relationships toward the five, not any transaction, and I stage-gate each one from first conversation through signed supply agreement so the pipeline stays honest. Ali and the sales team do the on-the-ground relationship-building here, while I lend the executive weight that closing a large partner usually needs, making this a paired effort between Management and Sales.`,
  'RC-08': `Keeping the leadership team genuinely aligned is the quiet work that prevents expensive missteps, so I hold cross-department executive alignment meetings on a bi-weekly cadence throughout the half. This matters because Sales, Marketing, Kitchen, Front of House, HR, and Accounting all pull on the same customers and the same cash, and without a regular forum to surface tradeoffs, small misalignments become big ones. Rather than a numeric target, I measure this as a kept commitment: did the meeting happen every two weeks, with decisions captured and followed up. It depends on no single contributor but on every department head showing up prepared, since the value comes from candid cross-functional discussion, not from the meeting merely appearing on the calendar.`,
  'RC-09': `Finishing the H2 2026 strategic plan by June 30 is what turns the end of one half into a running start for the next rather than a scramble. It matters because PT Central Perk Indonesia grows across three channels with very different rhythms, and a plan settled before the half closes lets every department budget, hire, and source ahead of demand instead of reacting to it. I treat the deadline itself as the measure, working back from June 30 through drafts, leadership review, and board sign-off so the document is genuinely decision-ready and not just written on time. There are no assigned contributors because the synthesis is mine to own, though it draws heavily on inputs each department head brings to our alignment sessions.`,
  'RC-10': `Launching a company-wide cost optimization program is about building a durable habit of spending well, not a one-off round of cuts. It matters because in a coffee business the difference between a good year and a great one often comes down to disciplined procurement, low waste, and lean operations, and a formal program gives every team a shared method for finding savings. I judge this by whether the program is genuinely launched, meaning framework defined, owners named, and the first wave of initiatives underway, rather than a slide deck that never moves. Evelyn and Accounting are my key partners here since they hold the cost data and will steward the savings tracking, so the launch is a Management-and-Finance effort by design.`,
  'RC-11': `A national brand awareness campaign delivered this half is how we make PT Central Perk Indonesia a name people recognize beyond our current retail and cafe footprint. It matters because awareness is the top of every funnel we have, feeding wholesale inquiries, retail bag sales, and cafe foot traffic alike, and a coordinated national push does far more than scattered local efforts. I measure this as delivered against plan: was the campaign designed, funded, run, and wrapped within the half with its intended reach. Bayu and Marketing carry the creative and media execution, while I sponsor it at the executive level to protect the budget and keep it aligned to our positioning, so it is very much a shared delivery.`,
  'RC-12': `Standardizing our board reporting to a clean quarterly cadence is a governance goal that makes the company easier to steer and to trust. It matters because as PT Central Perk Indonesia grows across wholesale, retail, and cafe operations, the board needs a consistent, comparable view of performance rather than ad hoc updates, and a reliable rhythm builds credibility with the investors and partners we will lean on for expansion. I measure this by whether a standard reporting pack and quarterly schedule are in place and actually used for two consecutive quarters. It sits with me directly with no contributors, since the discipline of what we report and how honestly we frame it is a CEO responsibility I would not hand off.`,
  'RC-13': `Finalizing the executive succession plan by June 30 is about protecting the company from key-person risk, which is a real exposure for a founder-led business like ours. It matters because if any leader stepped away tomorrow, we should not lose momentum, and a documented plan naming successors and development paths is how we make PT Central Perk Indonesia resilient rather than fragile. I hold myself to the deadline as the measure, working through role-by-role readiness assessments and development conversations so the plan is credible and not a paper exercise. Rio partners with me on this from the HR side, bringing the talent and development lens, while I own the sensitive judgment calls, so we build it together.`,
  'EB-01': `Keeping budget variance across all departments to 5 percent or less is the backbone of financial credibility for PT Central Perk Indonesia. It matters because a coffee business runs on tight margins, and when Kitchen, Sales, Marketing, and Front of House each drift from plan, those small gaps compound into real cash surprises that undermine the EBITDA target this goal cascades into. My approach is a monthly variance review with each department head, catching overspend early and understanding whether a gap is a timing issue or a genuine overrun before it hardens. Agung and Linda in Accounting do the heavy lifting of consolidating actuals against budget, so accuracy here depends on clean, timely bookkeeping across every cost center as much as on the department heads managing their own lines.`,
  'EB-02': `Cash flow forecast accuracy of at least 99 percent is what lets the company make confident decisions about sourcing green beans, paying suppliers, and funding growth without nasty liquidity surprises. This matters because coffee procurement often means paying for inventory well ahead of selling it, and a forecast we can trust is the difference between smooth operations and emergency scrambling. I measure accuracy by comparing each period's forecast against actual cash movements and tightening the model wherever the gap is widest, feeding learnings back in each cycle. Agung supports the modeling and data gathering, but the accuracy ultimately rests on realistic inputs from Sales on collections and from every department on the timing of their spend, so it is a cross-company data-quality effort.`,
  'EB-03': `Reaching 100 percent external audit readiness means that when the auditors arrive, everything they need is documented, reconciled, and defensible with nothing left to scramble for. It matters because clean audits underpin the trust of banks, investors, and wholesale partners we depend on, and for a growing company like PT Central Perk Indonesia, audit-readiness is really a proxy for financial control maturity. I track readiness as a checklist of required schedules, reconciliations, and supporting documents completed ahead of the audit window, working through it steadily rather than leaving it to the end. Agung is my main partner in assembling the evidence, and readiness also leans on every department keeping their own records in order throughout the half, since audit prep is only as easy as the year's discipline made it.`,
  'EB-04': `Delivering the monthly financial report on time, every month, at 100 percent is the operating heartbeat of the finance function. It matters because leadership across Sales, Marketing, Kitchen, and Front of House all plan against these numbers, and a late or unreliable close leaves the whole company steering on stale information, which is dangerous in a fast-moving three-channel business. I measure this simply as the share of monthly closes delivered by their committed date with the expected quality, and I protect the close calendar fiercely so nothing slips. Christin and Agung carry much of the close work, so consistency depends on a well-drilled routine and on other departments submitting their inputs on time, making this as much about process discipline as accounting skill.`,
  'EB-05': `Payroll disbursement accuracy at 100 percent is non-negotiable because getting people paid correctly and on time is a matter of basic trust between PT Central Perk Indonesia and its team. It matters because our baristas, roasters, kitchen staff, and account managers rely on that paycheck, and a single error damages morale and our reputation as an employer far out of proportion to the mistake. I measure this as the share of payroll runs processed with zero errors, reviewing every exception to understand and eliminate its cause rather than just correcting it. Linda handles the disbursement mechanics, so accuracy depends on tight coordination with HR on headcount changes and on clean, well-controlled payroll data flowing in each period.`,
  'EB-06': `Identifying and actually actioning IDR 150M in cost savings this half is where finance moves from scorekeeping to actively improving the company's margin. It matters because every rupiah saved on procurement, waste, or inefficiency drops straight to the bottom line and helps fund the growth we want, and in a coffee business there is real money hiding in supplier terms and operational leakage. I only count savings that are both identified and implemented toward the target, not theoretical opportunities, and I track them initiative by initiative so the number stays credible. Agung supports the analysis and validation, but landing the savings depends on department heads adopting the changes, so this is finance-led but company-delivered.`,
  'EB-07': `A finance report stakeholder satisfaction rating of at least 4.2 out of 5 keeps us honest about whether our reporting actually helps the people who use it. It matters because financial reports are only valuable if leaders across the company find them clear, timely, and decision-useful, and a low score would tell me we are producing numbers that technically balance but do not serve anyone. I measure this through a periodic survey of the department heads and executives who consume our reports, paying close attention to their comments on clarity and usefulness. There are no assigned contributors, so this rests on the finance team as a whole listening to feedback and steadily improving how we present and explain the numbers, not just how accurately we compile them.`,
  'EB-08': `Completing my CPA and accounting certification update this half keeps my technical foundation current as PT Central Perk Indonesia grows more complex. It matters because standards, tax rules, and reporting expectations evolve, and a finance leader whose knowledge goes stale eventually leads the company into avoidable risk, so staying certified is really about protecting the quality of the advice I give. I treat this as a binary completion goal: the required continuing education and certification renewal are either finished within the half or they are not. It sits with me alone with no contributors, since professional development is a personal responsibility, and I schedule the coursework deliberately around close cycles so it does not collide with the team's busiest periods.`,
  'EB-09': `Reaching 100 percent completion on advanced finance system training is about getting full value from the tools we have already paid for. It matters because as our transaction volume across wholesale, retail, and cafe grows, manual workarounds do not scale, and a team fluent in the finance system closes faster, makes fewer errors, and frees time for actual analysis. I measure this as the share of targeted advanced modules completed and applied in real work, not just seat time in a course. It is a personal development goal with no other contributors, and I pace it so the learning translates directly into how we run the monthly close, treating the training as a means to better operations rather than a certificate to collect.`,
  'RP-01': `Lifting the employee satisfaction score to at least 4.2 out of 5 is the clearest signal that PT Central Perk Indonesia is a genuinely good place to work. It matters because satisfied people stay longer, serve customers better, and cost far less to retain than to replace, and in a business built on baristas, roasters, and account managers, satisfaction directly protects the craft and consistency our brand depends on. I measure it through the periodic satisfaction survey, tracking the trend and digging into the lowest-scoring themes so we act on causes rather than symptoms. Alfian supports the survey mechanics and follow-up, but moving the number depends on every manager improving day-to-day working life, so this cascades from the company engagement goal and lives across the whole organization.`,
  'RP-02': `Bringing average time to hire across all roles down to 30 days or fewer keeps the company from being held back by empty seats. It matters because whether we are missing a barista, a roaster, or a sales rep, an unfilled role means lost revenue or overworked teammates, and a slow process also costs us the best candidates who accept faster offers elsewhere. I measure this as the average days from approved requisition to signed offer across all roles, watching where in the funnel time gets lost so we can fix the specific bottleneck. Alfian runs much of the recruiting pipeline, so hitting the target depends on tight coordination with hiring managers on interview scheduling and quick decisions, since delays there are usually what stretch the clock.`,
  'RP-03': `An offer acceptance rate of at least 80 percent tells us that when we choose someone, they choose us back, which is the real measure of a healthy hiring process. It matters because a low acceptance rate wastes weeks of recruiting effort and often signals that our offers, positioning, or candidate experience are off, all of which are fixable once we see them. I track the share of offers extended that are accepted, and I review every declined offer to understand whether it was pay, timing, or experience so the learning feeds back in. Alfian supports offer preparation and candidate communication, so the rate depends on us making competitive, well-timed offers and on hiring managers keeping candidates warm through the final stretch.`,
  'RP-04': `A company-wide training completion rate of at least 90 percent is how we make sure development actually reaches people rather than staying an intention. It matters because consistent training is what keeps our baristas, kitchen staff, and sales team skilled and safe, and it directly supports the engagement and quality goals it cascades up to, so completion is really a leading indicator of capability across PT Central Perk Indonesia. I measure it as the share of assigned training modules completed across all departments, watching for teams that lag so we can remove whatever is blocking them. Alfian coordinates the programs and tracking, but hitting 90 percent depends on department heads protecting time for their teams to actually complete the learning, not just enroll.`,
  'RP-05': `Completing the full performance review cycle at 100 percent is about making sure every single employee gets the feedback and recognition they are owed. It matters because reviews are how people understand where they stand, how careers move at PT Central Perk Indonesia, and how we spot both flight risks and future leaders, so a partial cycle leaves real people in the dark. I measure this as the share of scheduled reviews completed to standard within the cycle window, not just started, and I chase the stragglers directly because completion is the whole point. Alfian supports the process logistics and reminders, so reaching 100 percent depends on managers across every department taking the conversations seriously and finishing them on time.`,
  'RP-06': `Holding average cost per hire to IDR 5M or less keeps recruiting efficient as we grow headcount across the cafe, kitchen, and sales floor. It matters because hiring is a recurring cost, and every rupiah we spend inefficiently on sourcing or agencies is money not spent on the people themselves, so cost discipline here protects both the HR budget and the wider margin goals. I measure it as total hiring spend divided by hires in the period, watching the mix of sourcing channels so we lean on the cheaper, higher-quality ones. This is a personal goal with no assigned contributors, so it rests on me steadily shifting us toward direct sourcing and referrals and away from expensive external agencies wherever the role allows.`,
  'RP-07': `Keeping HR training budget utilization in the 90 to 100 percent band means we invest fully in people without overspending. It matters because under-spending signals we are neglecting development while overspending signals poor planning, and the healthy middle is where PT Central Perk Indonesia gets maximum capability growth for the money set aside. I track spend against the training budget through the half, pacing programs so we neither rush to burn budget at the end nor leave development on the table. Alfian supports the program scheduling and tracking, so staying in the band depends on planning the training calendar deliberately across departments rather than reacting, treating the budget as a plan to execute rather than a ceiling to test.`,
  'RP-08': `Resolving HR tickets within two business days keeps the team's trust that when they need help, they will actually get it quickly. It matters because unanswered HR questions about pay, leave, or benefits are a quiet source of frustration, and slow service undermines the very engagement and satisfaction goals HR is meant to protect at PT Central Perk Indonesia. I measure this as the average resolution time across incoming HR requests, watching the slowest categories so we can build better self-service or clearer processes where the same questions keep recurring. Alfian handles much of the frontline ticket response, so hitting the target depends on a well-organized intake and on escalation paths that do not let complex cases stall.`,
  'AF-01': `Getting new-hire onboarding satisfaction to at least 4.3 out of 5 is about making sure people's very first experience of PT Central Perk Indonesia is a good one. It matters because the first weeks set the tone for how long someone stays and how quickly they become productive, and a rough onboarding for a new barista or account manager often shows up later as early attrition. I measure this through a survey sent to new joiners after their first weeks, reading their comments closely to fix the specific friction points in paperwork, setup, and early training. This cascades from Rio's employee satisfaction goal, and as the HR admin closest to the process I own the day-to-day execution, so the score reflects how well I personally shepherd each new person through their start.`,
  'AF-02': `Turning candidate screening around in three days or less keeps our hiring pipeline moving so good applicants do not go cold. It matters because the earliest stage is where most delay creeps in, and every extra day here pushes out the whole time-to-hire that Rio's team is trying to compress, which in a competitive market can cost us the strongest candidates. I measure this as the average time from application received to screening decision, and I organize my own queue so screening does not pile up behind other admin work. This aligns to the team's time-to-hire goal, and since I run the initial review, the turnaround is largely mine to control through disciplined daily triage and clear criteria for who advances.`,
  'AF-03': `Delivering IDR 15M in recruitment admin cost savings is my contribution to making hiring leaner at PT Central Perk Indonesia. It matters because small recurring costs in job postings, background checks, and coordination tools add up across a year of steady hiring, and trimming them frees budget for the people and programs that matter more. I count only savings I actually implement toward the target, tracking each one so the number stays real rather than aspirational. This is a personal goal with no other contributors, so it rests on me finding and negotiating better rates, consolidating vendors, and removing wasteful steps in the admin flow, proving that even an individual-contributor role can move the cost line meaningfully.`,
  'AF-04': `Resolving employee HR queries within one business day is about being genuinely responsive to the people who count on HR. It matters because when a teammate asks about their leave, pay, or a policy, a same-day answer keeps them focused on their work and reinforces that PT Central Perk Indonesia takes care of its own, which feeds the wider satisfaction goals. I measure this as the average time to close incoming employee queries, and I keep a tighter personal standard than the broader HR ticket target because frontline questions deserve the fastest turnaround. This aligns to Rio's HR service goal, and since I handle much of the direct response, the speed depends on me staying organized and knowing the policies well enough to answer without long back-and-forth.`,
  'AF-05': `Bringing HR policy documentation fully up to date at 100 percent ensures everyone is working from the same, current rules. It matters because outdated or missing policy documents create confusion, inconsistent decisions, and even compliance risk, and as PT Central Perk Indonesia grows, clear written policy is what keeps managers across the cafe, kitchen, and sales floor treating people fairly and consistently. I measure this as the share of required policies reviewed, updated, and published within the half, working through them systematically rather than in a last-minute rush. This is a personal goal with no other contributors, so it rests on me auditing the current library, closing the gaps, and making sure the updated versions are actually accessible to the team.`,
  'AF-06': `Completing HRIS system proficiency certification makes me genuinely fluent in the tools that run HR day to day. It matters because an HR admin who fully masters the HRIS processes requests faster, makes fewer errors on sensitive people data, and can help others use the system well, all of which raise the quality of HR service at PT Central Perk Indonesia. I treat this as a completion goal: the certification is either earned within the half or it is not. It sits with me alone with no contributors, and I schedule the training around the busiest HR periods so it deepens my capability without disrupting the support the team relies on, treating the certificate as evidence of real, applied proficiency rather than a formality.`,
  'AF-07': `Reaching 100 percent completion on labor law compliance training protects both our people and the company from avoidable legal exposure. It matters because employment law is detailed and consequences for getting it wrong are serious, and as the HR admin close to hiring, onboarding, and records, I need to be confident I am applying the rules correctly across every interaction at PT Central Perk Indonesia. I measure this as the share of required compliance modules completed and understood, not merely opened, so the knowledge actually informs my work. It is a personal development goal with no other contributors, and I prioritize it because compliance mistakes are far cheaper to prevent through training than to fix after they have happened.`,
  'AI-01': `Delivering IDR 6.3B in total sales team revenue for H1 2026 is the number my whole department lives and dies by this half. It matters because sales revenue is the largest share of the company total this goal cascades up to, spanning our wholesale bean contracts and retail accounts, and the ambitions of every other department are ultimately funded by what we bring in. I manage it as a rolling monthly actual against a phased target, watching the balance between large wholesale deals and steady retail volume so we are not overly dependent on a few big accounts. Daud and Jessie carry individual quotas that ladder into this, so the total is really the sum of the team's disciplined pipeline management and my coaching to keep everyone on pace.`,
  'AI-02': `Holding client retention at or above 88 percent is what makes our revenue base solid rather than a leaky bucket we constantly refill. It matters because in wholesale and retail coffee, a lost account is expensive to replace and often signals a service or quality problem we could have caught earlier, so retention is both a financial and a relationship-health metric for PT Central Perk Indonesia. I measure it as the share of accounts retained over the period, reviewing every churned or at-risk client to understand why and to act before others follow. Daud and Jessie own the day-to-day client relationships, so the rate depends on them staying close to their accounts and on us responding fast when a client's satisfaction slips.`,
  'AI-03': `Building the wholesale sales pipeline to IDR 1.5B in qualified value ensures we have enough future demand in sight to keep the revenue engine running. It matters because wholesale deals have long cycles, and a thin pipeline today becomes a revenue gap two quarters out, so maintaining a healthy forward book is how we protect the company revenue this goal cascades into. I measure pipeline as the total value of qualified, stage-verified wholesale opportunities, scrubbing it regularly so it reflects real prospects rather than wishful entries. Daud is my main contributor here, focused on generating and qualifying wholesale leads, so the pipeline's health depends on consistent prospecting discipline and on us being honest about which deals are genuinely live.`,
  'AI-04': `Acquiring five new enterprise clients this half is how we add large, durable accounts that reshape the revenue base rather than nudge it. It matters because enterprise buyers order at volume, sign longer terms, and lend credibility that helps win the next one, so each win compounds far beyond its first order for PT Central Perk Indonesia's wholesale business. I count only genuinely new enterprise accounts toward the five, tracking each from first meeting through signed contract so the pipeline stays honest. Daud and Jessie both work these opportunities, so hitting the target depends on the team collaborating on complex pursuits and on me bringing the right support to close deals that a single rep cannot land alone.`,
  'AI-05': `Getting the whole sales team to 100 percent CRM adoption is the unglamorous foundation that makes everything else in sales manageable. It matters because without complete, current CRM data we cannot forecast accurately, spot at-risk accounts, or hand over relationships cleanly, and the retention and pipeline goals all depend on the information the CRM is supposed to hold. I measure adoption as the share of activity and account data actually being logged as expected, not just logins, and I review data quality regularly so gaps get closed. Daud and Jessie are the users whose habits determine the outcome, so reaching full adoption depends on me making the CRM genuinely useful to them and holding a consistent expectation that if it is not in the system, it did not happen.`,
  'AI-06': `Driving revenue per sales representative to IDR 2.1B is how I keep the team productive rather than just busy. It matters because headcount is expensive and the healthiest way to grow is to raise what each rep delivers, so this per-head measure tells me whether we are truly getting stronger or simply adding people, and it ladders directly into the total sales revenue goal. I calculate it as team revenue divided by active reps, watching the spread between top and bottom performers so I coach where the gap is widest. This is a personal leadership goal with no assigned contributors, resting on how well I set territories, remove obstacles, and develop each rep's ability to close larger and more often.`,
  'AI-07': `Reaching at least 85 percent sales forecast accuracy makes the whole company's planning more trustworthy. It matters because Accounting, Kitchen, and operations all size their own plans against what Sales says it will bring in, and a forecast that swings wildly forces everyone else to hold expensive buffers or scramble, so accuracy here is a gift to the rest of PT Central Perk Indonesia. I measure it by comparing forecast to actual each period and tightening the assumptions wherever we are consistently off, treating the CRM data as the raw material for a disciplined forecast. This is a personal goal with no contributors, so it rests on my judgment and on holding the team to realistic, evidence-based deal calls rather than optimistic ones.`,
  'AI-08': `Getting sales team training completion to 100 percent keeps the team sharp on product, pricing, and selling technique. It matters because our reps sell across wholesale and retail with different playbooks, and consistent training is what keeps quality high as the team grows and as our range evolves, which is why this cascades up to the company-wide training goal. I measure it as the share of assigned training completed across the team, not merely enrolled, and I protect time for it even during busy stretches because skipping development always costs more later. Daud and Jessie are the participants whose completion drives the number, so reaching 100 percent depends on me scheduling training sensibly around the sales calendar and treating it as part of the job, not an extra.`,
  'AI-09': `Updating and rolling out the refreshed sales playbook within H1 is how I turn scattered individual know-how into a shared, repeatable method. It matters because as PT Central Perk Indonesia adds reps and accounts, relying on each person's instinct does not scale, and a current playbook covering wholesale and retail approaches raises the whole team's floor. I measure this as delivered: the playbook revised, published, and actually rolled out to the team with training, not just written and filed. It is a personal goal with no assigned contributors, so it rests on me capturing what our best reps do well, codifying it clearly, and making sure the team adopts it in practice rather than treating it as a document that sits on a shelf.`,
  'BF-01': `Achieving campaign return on investment of at least three times spend is the discipline that keeps marketing accountable to the business. It matters because marketing budget is only worth having if it generates more than it costs, and a 3x return proves our campaigns are genuinely driving wholesale inquiries, retail sales, and cafe traffic rather than just building vanity metrics, which is why this ladders into company revenue. I measure it as attributable revenue divided by campaign spend, scrutinizing which campaigns pull their weight so we double down on winners and cut the rest. There are no assigned contributors, so the outcome rests on me choosing channels wisely, testing rigorously, and being willing to kill campaigns that do not earn their keep.`,
  'BF-02': `Keeping cost per customer acquisition at IDR 45K or below ensures we grow our customer base efficiently rather than buying it at any price. It matters because acquisition cost directly determines how profitably PT Central Perk Indonesia can scale its retail and cafe audiences, and a low CAC means every marketing rupiah stretches further and supports the wider margin goals. I measure it as total acquisition spend divided by new customers gained, watching channel-level efficiency so budget flows to the cheapest effective sources. With no assigned contributors, this rests on me continuously optimizing targeting, creative, and channel mix, and on being honest about which acquisition efforts are genuinely cost-effective versus which just look busy.`,
  'BF-03': `Growing social media followers by 15 percent this half expands the owned audience we can reach without paying for every impression. It matters because a larger, engaged following gives PT Central Perk Indonesia a durable, low-cost channel to promote new beans, cafe events, and retail offers, and it feeds the brand awareness that this goal cascades up to. I measure it as net follower growth across our platforms over the half, paying attention to whether the growth is genuinely engaged rather than hollow. There are no assigned contributors, so the outcome rests on me maintaining a consistent, appealing content rhythm and running the kind of shareable campaigns that attract the right coffee-loving audience rather than just inflating the number.`,
  'BF-04': `Keeping positive brand-mention sentiment at 75 percent or higher tells us that when people talk about PT Central Perk Indonesia, they mostly talk well. It matters because sentiment is the honest, unsolicited verdict on our beans, our cafe, and our service, and it is a leading indicator of the NPS this goal cascades into, since unhappy mentions today become detractors and lost customers tomorrow. I measure it as the share of positive mentions across monitored channels, watching negative themes closely so we can respond and fix root causes rather than just count. With no assigned contributors, this rests on me monitoring the conversation, responding thoughtfully to criticism, and coordinating with other teams when the issue behind a bad mention lives outside marketing.`,
  'BF-05': `Reaching a campaign engagement rate of at least 5 percent is how I know our content actually connects rather than just gets published. It matters because engagement is the bridge between reach and revenue, and a campaign people interact with is far more likely to drive the retail sales and cafe visits PT Central Perk Indonesia depends on than one they scroll past. I measure it as interactions relative to reach across our campaigns, testing formats and messages so we learn what resonates with a coffee audience and do more of it. There are no assigned contributors here, so the outcome rests on me sharpening creative, timing, and targeting, and on treating every campaign as a chance to learn what our audience genuinely responds to.`,
  'BF-06': `Hitting a 100 percent on-time campaign launch rate is about reliability, so the rest of the business can count on marketing to deliver when it says it will. It matters because campaigns are often timed to product launches, seasonal demand, or cafe events, and a late launch wastes the moment it was built for, undermining the revenue and awareness that marketing exists to drive for PT Central Perk Indonesia. I measure this as the share of campaigns that go live on their committed date, tracking where slippage originates so I can fix the recurring bottleneck. With no assigned contributors, this rests on me managing the production calendar tightly, building in realistic lead times, and protecting launch dates from last-minute scope creep.`,
  'BF-07': `Producing at least 60 pieces of content each month keeps our channels active and gives every campaign the fuel it needs. It matters because a coffee brand's presence fades fast without a steady flow of fresh material across social, retail, and cafe promotion, and consistent output is what sustains the follower growth and engagement goals across the half for PT Central Perk Indonesia. I measure this as the count of published pieces per month against the target, balancing quantity with the quality that keeps the audience coming back. There are no assigned contributors, so the outcome rests on me maintaining an efficient content pipeline and planning ahead so we build a healthy backlog rather than scrambling to publish something at the last minute.`,
  'BF-08': `Completing a digital marketing certification this half keeps my skills current in a field that changes faster than almost any other. It matters because platforms, algorithms, and best practices shift constantly, and a marketing lead whose knowledge goes stale quietly wastes budget, so staying certified protects the efficiency of everything PT Central Perk Indonesia spends on acquisition and awareness. I treat this as a completion goal: the certification is either earned within the half or it is not, and this cascades from the company-wide training push. It sits with me alone with no contributors, and I schedule the coursework so the new techniques feed directly into live campaigns rather than staying theoretical, treating the certificate as applied learning.`,
  'BF-09': `Delivering one market research report per quarter keeps our marketing grounded in what customers actually want rather than what we assume. It matters because PT Central Perk Indonesia competes across wholesale, retail, and cafe, and a regular read on trends, competitors, and customer preferences is what lets us position beans and campaigns intelligently instead of guessing. I measure this as reports delivered on the quarterly cadence, each one carrying genuine insight and clear recommendations rather than just data. There are no assigned contributors, so the outcome rests on me committing time to real research amid the pull of day-to-day campaign work, treating the report as a strategic input that shapes decisions rather than a box to tick each quarter.`,
  'AP-01': `Holding the kitchen's food cost ratio to 30 percent or less is the core margin discipline of the cafe operation. It matters because food cost is the largest controllable line in a kitchen, and letting it drift erodes the profitability that this goal cascades up to, so keeping ingredients, portions, and waste in check is how the Kitchen protects PT Central Perk Indonesia's bottom line. I measure it as food cost as a share of food revenue each period, reviewing the drivers so I can tell a genuine cost increase from a portioning or waste problem. Indah supports the tracking and daily kitchen discipline, so the ratio depends on tight purchasing, consistent portion control, and low spoilage across the whole team, not just careful buying.`,
  'AP-02': `Reaching a customer food satisfaction rating of at least 4.5 out of 5 is the clearest measure of whether the kitchen is delighting guests. It matters because in a cafe, food quality is central to whether people return and recommend us, and it feeds directly into the company NPS this goal cascades into, so every plate is a small vote for or against PT Central Perk Indonesia. I measure it through guest feedback on food specifically, reading comments to catch dishes or moments that consistently disappoint. Indah supports execution on the line, so the rating depends on consistent quality across every service, since a single off day for a guest counts as much as a hundred good ones, making consistency the real target here.`,
  'AP-03': `Achieving a menu satisfaction survey score of at least 80 percent tells us whether the menu itself, not just execution, is landing with guests. It matters because the right menu drives repeat visits and higher spend, and a coffee-forward cafe like ours needs a food offering that complements the drinks and keeps people coming for more than the beans, feeding the NPS this goal cascades into. I measure it through periodic menu surveys, paying attention to which items delight and which underperform so the menu evolves with real feedback. Indah supports the effort on the kitchen side, so the score depends on both maintaining beloved dishes and refreshing tired ones, treating the menu as something we actively curate rather than set once and leave.`,
  'AP-04': `A 100 percent HACCP audit pass rate is non-negotiable because food safety is where a cafe cannot afford a single failure. It matters because one serious lapse can harm a guest, trigger closure, and permanently damage PT Central Perk Indonesia's reputation, so a perfect pass rate is really about protecting people first and the business second. I measure this as the share of HACCP audits passed fully, treating any finding as a serious signal to correct immediately rather than a minor note. Indah supports the daily food-safety routines, so the pass rate depends on the whole kitchen following procedures consistently, since audits only confirm what the everyday discipline has already built, making this a test of habit as much as of any single inspection.`,
  'AP-05': `Cutting food waste by 10 percent versus H2 2025 is both a cost saver and a values statement for the kitchen. It matters because waste is money thrown away and food that should never have been discarded, and reducing it directly supports the food-cost goal this cascades from while reflecting the responsible operation PT Central Perk Indonesia wants to be. I measure it as the reduction in tracked waste against the prior-half baseline, watching where waste concentrates so we tackle the biggest sources first. Indah supports the daily tracking and prep discipline, so the reduction depends on smarter forecasting, tighter prep, and better use of trim across the team, treating waste reduction as a shared daily habit rather than an occasional cleanup.`,
  'AP-06': `Bringing average dish preparation time down to 8 minutes or less keeps the kitchen fast enough to satisfy guests without cutting corners. It matters because slow tickets mean unhappy guests, backed-up service, and lost table turns for the cafe, so prep speed directly affects both satisfaction and revenue at PT Central Perk Indonesia. I measure it as the average time from order to plate across the menu, watching the slowest dishes so we can simplify prep or adjust staffing where the bottleneck really is. Indah supports execution on the line, so hitting the target depends on smart mise en place, clear station roles, and a menu engineered so quality and speed coexist rather than compete, keeping pace without ever sacrificing the plate.`,
  'AP-07': `Introducing at least two new menu items per quarter keeps the cafe's offering fresh and gives regulars a reason to keep coming back. It matters because a static menu grows stale, and thoughtful additions that pair well with our coffee create news, drive trial, and support the menu satisfaction and revenue goals across PT Central Perk Indonesia's cafe. I measure this as the count of genuinely new, successfully launched items each quarter, not just tested ideas that never make the menu. This is a personal goal with no assigned contributors, so it rests on me developing, testing, and launching new dishes that fit our identity and actually sell, balancing creativity with the operational reality of the kitchen so new items help rather than slow service.`,
  'AP-08': `Getting kitchen team training completion to 100 percent keeps the whole brigade skilled, safe, and consistent. It matters because a cafe kitchen depends on every cook executing to the same standard, and consistent training is what upholds the food quality and safety that PT Central Perk Indonesia's reputation rests on, which is why this cascades from the company-wide training goal. I measure it as the share of assigned training completed across the kitchen team, not merely started, and I protect time for it even during busy service periods. Indah supports coordination, so reaching 100 percent depends on scheduling training around service and treating skill development as a core part of running a professional kitchen rather than an afterthought.`,
  'AP-09': `Reaching at least 75 percent cross-station training coverage builds a kitchen that can flex when someone is out or slammed. It matters because a brigade where cooks only know one station is fragile, and cross-trained staff keep service smooth during absences and rushes, which protects both food quality and prep speed for PT Central Perk Indonesia's cafe. I measure this as the share of the team competent across multiple stations, mapping coverage so I can see where a single absence would hurt us most. Indah supports the training effort, so hitting the target depends on deliberately rotating people through stations and investing in their range even when it is easier to leave everyone in their comfort zone, building resilience into how the kitchen runs.`,
  'CA-01': `Lifting the customer satisfaction score to at least 4.7 out of 5 is the north star for the front-of-house team. It matters because the cafe experience is where PT Central Perk Indonesia's brand comes alive, and CSAT captures whether guests feel genuinely well cared for, feeding directly into the company NPS this goal cascades into. I measure it through guest satisfaction surveys, reading the feedback closely so we act on the specific service moments that make or break a visit. Eka and Fajar are frontline contributors whose daily interactions drive the score, so reaching 4.7 depends on consistent warmth, speed, and attentiveness across every shift, since a single indifferent moment can undo an otherwise perfect visit for a guest.`,
  'CA-02': `Resolving guest complaints within two hours is how we turn a bad moment into a recovered relationship rather than a lost customer. It matters because in the cafe, how we handle a problem often leaves a stronger impression than if nothing had gone wrong, and fast, genuine resolution protects the satisfaction and NPS goals PT Central Perk Indonesia cares about. I measure this as the average time from complaint raised to resolved, watching the slowest cases to understand where we get stuck. Fajar supports frontline resolution, so hitting the target depends on empowering staff to fix problems on the spot within clear limits and on escalating cleanly when they cannot, so a guest never feels their concern is drifting unanswered.`,
  'CA-03': `Reaching a front-of-house SOP compliance score of at least 96 percent is what makes a great cafe experience repeatable rather than lucky. It matters because consistency in how we greet, serve, and close out guests is the backbone of the satisfaction PT Central Perk Indonesia is known for, and standards are what let a busy shift still feel polished to every guest. I measure this through observation and audit against our service standards, treating gaps as coaching opportunities rather than just marks. Eka and Fajar are frontline contributors whose adherence drives the score, so hitting the target depends on the standards being clear and well-trained and on me reinforcing them consistently, so following the SOP becomes second nature rather than something people remember only when watched.`,
  'CA-04': `Achieving at least 95 percent of the F&B revenue target is how front of house directly carries its share of the company's top line. It matters because the cafe floor is a real revenue channel for PT Central Perk Indonesia, and hitting target through smart selling, upselling, and smooth service is what makes the whole operation pay, which is why this cascades up to company revenue. I measure it as actual F&B revenue against the phased target, watching daypart performance so we can act where sales lag. Eka and Joko support the effort on the floor, so reaching target depends on the team confidently suggesting add-ons, keeping tables turning, and delivering the kind of experience that makes guests happy to spend a little more.`,
  'CA-05': `Maintaining 100 percent staff schedule coverage keeps the cafe properly staffed for every shift so service never suffers from being short-handed. It matters because gaps in coverage mean slow service, stressed staff, and disappointed guests, all of which erode the satisfaction and revenue goals front of house is responsible for at PT Central Perk Indonesia. I measure this as the share of shifts fully staffed to plan, watching for recurring holes around peak periods and time off. Galih and Fajar support scheduling, so full coverage depends on forecasting demand well, building fair and realistic rosters, and having reliable backup plans for last-minute absences, so the floor is always ready for guests rather than scrambling to fill a gap mid-service.`,
  'CA-06': `Improving table turnover by 10 percent versus H2 2025 lets the cafe serve more guests from the same seats without rushing anyone. It matters because in a busy cafe, faster, smoother turns mean more revenue and shorter waits, directly supporting the F&B revenue goal this cascades from, as long as we speed the process rather than the guest's enjoyment. I measure it as the change in average turnover against the prior-half baseline, watching where time is lost between seating, ordering, and clearing. This is a personal goal with no assigned contributors, so it rests on me refining the service flow, timing, and floor layout so tables cycle more efficiently while guests still feel welcome to relax and enjoy their coffee at PT Central Perk Indonesia.`,
  'CA-07': `Getting front-of-house team training completion to 100 percent keeps every server and barista on the floor working to the same high standard. It matters because the cafe experience depends on consistency, and well-trained staff deliver the service quality and upselling that drive the satisfaction and revenue goals, which is why this cascades from the company-wide training push at PT Central Perk Indonesia. I measure it as the share of assigned training completed across the team, not merely enrolled, and I protect time for it even when the floor is busy. There are no assigned contributors, so reaching 100 percent rests on me scheduling training sensibly around shifts and treating development as part of the job rather than something to fit in when things are quiet.`,
  'CA-08': `Holding at least one 1-on-1 coaching session per staff member each month is how I develop the front-of-house team rather than just manage them shift to shift. It matters because regular coaching is where service skills sharpen, problems surface early, and people feel invested in, all of which feed the satisfaction and retention that PT Central Perk Indonesia depends on, which is why this cascades from the performance-review goal. I measure this as the average coaching sessions per staff member per month against the target. There are no assigned contributors, so it rests on me protecting time for these conversations amid a busy floor, treating consistent one-on-one coaching as one of the highest-leverage things a manager can do.`,
  'DD-01': `My personal sales revenue target of IDR 1.8B for H1 2026 is my direct contribution to the sales team's overall number. It matters because the team total this cascades from is really the sum of each rep's individual delivery, and carrying my share reliably is how I earn trust and keep PT Central Perk Indonesia's wholesale and retail revenue on track. I manage it as a rolling monthly actual against a phased target, keeping my pipeline healthy enough that a slow month does not sink the half. There are no assigned contributors, so this rests entirely on me: prospecting consistently, nurturing my accounts, and closing on schedule rather than letting deals drift, so my quota lands as a dependable pillar of the team result.`,
  'DD-02': `Keeping my assigned clients satisfied at a score of at least 4.2 out of 5 is how I protect the relationships that generate my revenue. It matters because satisfied wholesale and retail clients reorder, refer others, and forgive the occasional hiccup, so their satisfaction is the foundation of the retention goal this cascades from and of my own sales results at PT Central Perk Indonesia. I measure it through client feedback on my accounts specifically, staying close enough to catch dissatisfaction before it becomes churn. There are no assigned contributors, so this rests on me being genuinely responsive, reliable on delivery, and proactive about my clients' needs rather than only showing up when it is time to sell them something more.`,
  'DD-03': `Generating IDR 400M in revenue from new accounts is how I grow my book rather than just maintaining it. It matters because new accounts are the future of my quota and of the company's revenue this cascades into, and a rep who only farms existing clients eventually plateaus, so hunting new business keeps PT Central Perk Indonesia's growth alive. I measure it as revenue from accounts opened in this period, tracking each from first contact through first order so I can see the pipeline converting. There are no assigned contributors, so this rests on me prospecting consistently, qualifying well, and doing the patient work of turning cold leads into paying wholesale and retail accounts, treating new-business generation as a discipline rather than something I get to when there is spare time.`,
  'DD-04': `Achieving IDR 200M in upsell from existing clients is about growing the accounts I already have rather than always chasing new ones. It matters because existing clients are cheaper to sell to and often have room to buy more of our beans or broaden their range, so upselling is one of the most efficient ways to lift the company revenue this cascades into for PT Central Perk Indonesia. I measure it as incremental revenue from expanding current accounts, tracking each opportunity so I act on it deliberately. There are no assigned contributors, so this rests on me knowing my clients' businesses well enough to spot genuine opportunities, timing the conversation right, and recommending more only when it truly serves them, so upselling strengthens the relationship rather than straining it.`,
  'DD-05': `Resolving client complaints within 24 hours is how I keep my accounts confident that when something goes wrong, I have their back fast. It matters because a quick, genuine response often does more for a wholesale relationship than a flawless order, and fast resolution protects the client satisfaction and retention this cascades from at PT Central Perk Indonesia. I measure this as the average time from complaint raised to resolved across my accounts, treating any slow case as a lesson in what to fix. There are no assigned contributors, so this rests on me staying reachable, owning the problem even when the cause sits elsewhere in the company, and coordinating internally quickly so my client never feels left waiting for an answer.`,
  'DD-06': `Making at least 80 client visits or calls per month keeps me in front of my accounts enough to build real relationships and spot opportunities early. It matters because coffee wholesale is a relationship business, and consistent contact is what surfaces reorders, upsells, and problems before they grow, feeding the CRM and productivity discipline this cascades from at PT Central Perk Indonesia. I measure this as logged visits and calls per month against the target, using the CRM so the activity is visible and reviewable. There are no assigned contributors, so this rests on me managing my time and territory so client contact stays a priority rather than getting crowded out by admin, treating consistent outreach as the engine that keeps my pipeline healthy.`,
  'DD-07': `Turning proposals around within two days keeps deals moving while the client's interest is hot. It matters because in wholesale coffee, a slow proposal lets momentum cool and gives competitors room to step in, so fast, accurate proposals directly improve my close rate and support the CRM and productivity discipline this cascades from at PT Central Perk Indonesia. I measure this as the average time from request to proposal delivered across my deals, watching where I get stuck so I can streamline. There are no assigned contributors, so this rests on me keeping proposal templates and pricing ready, prioritizing proposal work when a client asks, and not letting other tasks push a live opportunity to the back of the queue, so every prospect gets a prompt, professional response.`,
  'DD-08': `Completing product and pricing training at 100 percent keeps me credible and accurate in front of clients. It matters because a rep who knows the beans, the origins, and the pricing logic cold can advise clients well and price confidently, which protects both margin and trust, and this cascades from the sales team's training goal at PT Central Perk Indonesia. I measure it as the share of assigned product and pricing modules completed, not just enrolled, so the knowledge is genuinely mine to use. There are no assigned contributors, so this rests on me making time for the training even when selling is busy, treating deep product and pricing knowledge as a core sales tool rather than optional background, so I never guess in front of a client.`,
  'DD-09': `Attending at least one negotiation skills workshop this half sharpens one of the most valuable tools in my sales kit. It matters because better negotiation means closing more deals on healthier terms, protecting both my quota and the company's margin, so investing in this skill pays back directly across every deal I work at PT Central Perk Indonesia. I measure this simply as workshop attendance completed within the half, with the real test being whether I apply what I learn in live negotiations. There are no assigned contributors, so this rests on me prioritizing the development time and, more importantly, deliberately practicing the techniques afterward rather than letting the workshop become a pleasant day that changes nothing about how I actually negotiate.`,
  'JT-01': `My personal sales revenue target of IDR 1.7B for H1 2026 is my committed share of the sales team's total. It matters because the team number this cascades from is built from each rep's individual delivery, and holding up my end reliably is how I contribute to PT Central Perk Indonesia's wholesale and retail revenue and keep the team on track. I run it as a rolling monthly actual against a phased target, keeping my pipeline deep enough that one quiet month does not derail the half. There are no assigned contributors, so this rests entirely on me: consistent prospecting, attentive account management, and disciplined closing, so my quota lands dependably rather than depending on a scramble at the end of the period to make the number.`,
  'JT-02': `Keeping my assigned clients satisfied at a score of at least 4.3 out of 5 is how I safeguard the relationships behind my revenue. It matters because happy retail and wholesale clients reorder and refer, so their satisfaction is the foundation of the retention goal this cascades from and of my own results at PT Central Perk Indonesia. I measure it through client feedback on my specific accounts, staying close enough to sense trouble before it turns into churn. There are no assigned contributors, so this rests on me being responsive, dependable, and genuinely attentive to my clients' needs rather than surfacing only when there is something more to sell, since consistent care is what earns the high scores and the loyalty that comes with them.`,
  'JT-03': `Delivering IDR 500M in new retail account revenue reflects my particular focus on growing the retail side of the business. It matters because retail accounts broaden PT Central Perk Indonesia's reach and reduce our dependence on a few large wholesale buyers, feeding the company revenue this cascades into, so opening new retail doors is real strategic growth. I measure it as revenue from retail accounts I open this period, tracking each from first pitch through first order. There are no assigned contributors, so this rests on me prospecting the retail segment consistently, tailoring the pitch to what smaller retail buyers care about, and doing the patient legwork of converting interest into steady, reordering accounts rather than one-off sales that never repeat.`,
  'JT-04': `Achieving IDR 150M in upsell and cross-sell revenue is about deepening the accounts I already serve. It matters because existing clients are the most efficient place to grow, and helping them add products or expand volume lifts the company revenue this cascades into while strengthening the relationship, which is good business for PT Central Perk Indonesia. I measure it as incremental revenue from upsell and cross-sell across my accounts, tracking each opportunity so I pursue it deliberately rather than by luck. There are no assigned contributors, so this rests on me understanding my clients well enough to spot genuine fits, recommending additions that truly serve them, and timing those conversations so they feel like helpful advice rather than a push to buy more.`,
  'JT-05': `Opening 80 new retail accounts this half is an ambitious acquisition target that widens PT Central Perk Indonesia's retail footprint significantly. It matters because a broad base of retail accounts creates steady, diversified demand for our beans and supports the enterprise and revenue goals this cascades from, so volume of new accounts genuinely moves the business. I measure this as the count of new retail accounts opened against the target, tracking the funnel so I can see conversion clearly. There are no assigned contributors, so this rests on me maintaining a high, disciplined prospecting volume, qualifying efficiently so I spend time on real prospects, and keeping the onboarding smooth so new accounts actually place that first order and become part of the base.`,
  'JT-06': `Making at least 90 retail visits or calls per month keeps me in constant contact with a large base of smaller accounts. It matters because retail relationships need frequent touch to stay warm and to catch reorders and problems early, and consistent activity feeds the CRM and productivity discipline this cascades from at PT Central Perk Indonesia. I measure this as logged retail visits and calls per month against the target, using the CRM so my activity is visible and reviewable. There are no assigned contributors, so this rests on me organizing my territory and time efficiently, since covering many retail accounts at this cadence demands real discipline, and letting outreach slip is the fastest way to see a retail book go quiet and start to churn.`,
  'JT-07': `Reaching at least 98 percent CRM data update compliance keeps my account information accurate enough for the team to rely on. It matters because with a large retail book, incomplete CRM data means missed reorders, poor forecasting, and messy handovers, so keeping it current protects both my results and the team discipline this cascades from at PT Central Perk Indonesia. I measure this as the share of my required CRM updates completed on time and to standard, reviewing my own data quality regularly. There are no assigned contributors, so this rests on me building the habit of logging activity and updating accounts as I go rather than letting it pile up, treating the CRM as a working tool that makes my job easier rather than an administrative chore imposed on me.`,
  'JT-08': `Completing retail sales technique training at 100 percent sharpens the specific skills that retail selling demands. It matters because selling to many smaller retail buyers is a different craft from landing a few large wholesale deals, and strong technique lifts my conversion and account growth, which is why this cascades from the sales team's training goal at PT Central Perk Indonesia. I measure it as the share of assigned retail technique modules completed, not merely enrolled, so the skills are genuinely mine. There are no assigned contributors, so this rests on me making time for the training even when the retail push is busy and, crucially, applying the techniques in real calls rather than treating the training as separate from how I actually sell day to day.`,
  'JT-09': `Scoring at least 85 out of 100 on the new product knowledge assessment ensures I can represent our range accurately to retail clients. It matters because retail buyers rely on me to explain what makes each bean and product distinct, and confident, accurate knowledge builds trust and drives sales, protecting both my quota and PT Central Perk Indonesia's reputation for expertise. I measure this directly by the assessment score against the target, using it as an honest check on how well I actually know the range. There are no assigned contributors, so this rests on me genuinely studying the new products rather than cramming for the test, since the point is to carry that knowledge into every client conversation, not just to clear the assessment and forget it afterward.`,
  'ES-01': `Reaching a personal customer satisfaction rating of at least 4.7 out of 5 is my direct contribution to the cafe's guest experience. It matters because every guest I serve forms an impression of PT Central Perk Indonesia from that interaction, and my individual rating rolls up into the team CSAT this cascades from, so my consistency genuinely moves the shared number. I measure it through guest feedback tied to my service, using it to sharpen how I greet, serve, and read what each guest needs. There are no assigned contributors, so this rests entirely on me bringing warmth, attentiveness, and speed to every shift, treating each guest as if they are the reason I am there, because a single indifferent moment can undo an otherwise excellent visit.`,
  'ES-02': `Achieving at least 98 percent SOP compliance is how I make sure my service is consistently up to the standard our guests expect. It matters because the polished, reliable cafe experience PT Central Perk Indonesia is known for depends on each of us following the standards even when it is busy, and my compliance feeds the team standards goal this cascades from. I measure it through observation and audit against our service SOPs, treating any gap as something to correct in myself rather than excuse. There are no assigned contributors, so this rests on me knowing the standards well and applying them by habit, so that following the SOP is simply how I work rather than something I remember only when a manager happens to be watching the floor.`,
  'ES-03': `Contributing IDR 25M in personal upsell revenue is my way of directly helping the cafe hit its numbers. It matters because thoughtful upselling, suggesting a pastry with a coffee or a larger size when it genuinely fits, adds real revenue that supports the F&B target this cascades from at PT Central Perk Indonesia, and it does so while enhancing rather than pressuring the guest's visit. I measure it as the upsell revenue attributable to my service against the target. There are no assigned contributors, so this rests on me knowing the menu well enough to make natural, well-timed suggestions and reading each guest so my recommendations feel like helpful hospitality rather than a sales pitch, since the best upsells leave the guest happier than they would have been.`,
  'ES-04': `Growing my average check contribution by 5 percent versus H2 2025 shows I am steadily getting better at adding value to each guest's visit. It matters because a higher average check across the team lifts the cafe's revenue that this cascades from, and doing it through genuine, well-judged suggestions rather than pressure is exactly the kind of hospitality PT Central Perk Indonesia wants. I measure it as the change in my average check against the prior-half baseline, watching which suggestions land so I can do more of what works. There are no assigned contributors, so this rests on me refining how and when I recommend add-ons, learning from each shift, and treating a rising average check as a sign of guests being well served rather than upsold at.`,
  'ES-05': `Earning at least 15 positive customer mentions per month is a lovely, concrete sign that my service is genuinely making guests happy. It matters because named recognition in feedback reflects the kind of memorable, personal experience that turns first-time visitors into regulars and supports the CSAT goal this cascades from at PT Central Perk Indonesia. I measure this as the count of positive mentions tied to me each month against the target, reading them to understand what guests value most about how I serve them. There are no assigned contributors, so this rests on me bringing consistent care and personality to the floor, remembering regulars, and creating the small moments of delight that make a guest want to take the time to mention me by name.`,
  'ES-06': `Maintaining a drink preparation accuracy rate of at least 99 percent is fundamental, because a wrong drink is the fastest way to disappoint a guest. It matters because accuracy is the baseline of trust in a cafe, and getting orders right every time protects both guest satisfaction and the CSAT goal this cascades from at PT Central Perk Indonesia, while also cutting the waste of remaking drinks. I measure it as the share of drinks prepared correctly against orders, treating every error as a prompt to check my process. There are no assigned contributors, so this rests on me staying focused during rushes, confirming orders carefully, and knowing the recipes cold, so that speed never comes at the cost of handing a guest something they did not ask for.`,
  'ES-07': `Keeping drink preparation time to 2.5 minutes or less lets me serve guests quickly without ever cutting quality. It matters because in a busy cafe, fast drinks mean shorter waits, happier guests, and smoother service, supporting the SOP and speed standards this cascades from at PT Central Perk Indonesia, as long as speed and quality stay balanced. I measure it as my average time from order to finished drink, watching where I lose seconds so I can tighten my workflow. There are no assigned contributors, so this rests on me organizing my station well, keeping tools and ingredients ready, and building the muscle memory that lets me move fast while still producing a drink I would be proud to hand any guest, never sacrificing the cup for the clock.`,
  'ES-08': `Completing my Level 2 barista certification is a real step up in my craft and my value to the cafe. It matters because deeper barista skill means better, more consistent drinks and the confidence to handle any order, which directly serves the guest experience PT Central Perk Indonesia is built on, and this cascades from the company-wide training goal. I treat this as a completion goal: the certification is either earned within the half or it is not. There are no assigned contributors, so this rests on me putting in the practice and study to genuinely earn it, treating the certification as proof of real skill I bring to the espresso machine every shift rather than just a line on a badge, so the guests taste the difference.`,
  'ES-09': `Reaching 100 percent on the new menu mastery assessment ensures I can confidently prepare and describe every item we offer. It matters because guests often ask what is new or what I recommend, and knowing the full menu cold lets me serve smoothly, suggest well, and represent PT Central Perk Indonesia's range with genuine confidence rather than hesitation. I measure this as the assessment score against full mastery, using it as an honest check on whether I truly know the current menu. There are no assigned contributors, so this rests on me actually learning each new item, its preparation and its story, rather than just scraping through the assessment, since the real payoff is being able to help any guest choose and enjoy something they will love.`,
}

// Deterministic per-goal key results. Every seeded goal gets 3 or 4 KRs whose
// count, titles, units and current values are derived purely from a hash of the
// goal `code`, so they're stable across reloads (no Math.random / Date.now).
// Each KR carries numeric target+current so the goal-detail KR table draws a
// partially-filled progress bar (bar shows only when both are numbers).
function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const KR_TITLE_POOL = [
  'Weekly progress check-ins completed',
  'Stakeholder alignment sessions held',
  'Process documentation updated',
  'Data accuracy review passed',
  'Enablement modules completed',
  'Milestone reviews on schedule',
  'Quality audit passed',
  'Adoption rate improved',
  'Action items closed on time',
  'Cross-team dependencies resolved',
  'Baseline metrics established',
  'Improvement initiatives launched',
  'Feedback loops implemented',
  'Target segments engaged',
  'Root-cause reviews completed',
  'Standard operating procedures refreshed',
]

function seededKeyResults(code: string): DraftKeyResult[] {
  const h = hashCode(code)
  const count = 3 + (h % 2) // 3 or 4
  const results: DraftKeyResult[] = []
  for (let i = 0; i < count; i++) {
    const seed = hashCode(`${code}-kr-${i}`)
    const isNumber = seed % 4 === 0 // a minority measured in raw numbers
    const measurementUnit = isNumber ? 'number' : 'percentage'
    const startValue = 0
    const targetValue = isNumber ? [50, 80, 120][seed % 3] : 100
    const pct = 25 + (seed % 71) // 25–95% of target
    let currentValue = Math.round((targetValue * pct) / 100)
    if (seed % 11 === 0) currentValue = 0 // a few land at the baseline
    const kr: DraftKeyResult = {
      id: `${code}-kr-${i}`,
      title: KR_TITLE_POOL[(h + i * 5) % KR_TITLE_POOL.length],
      kpiDirection: 'higher',
      measurementUnit,
      useBaseline: true,
      startValue,
      targetValue,
      currentValue,
      target: measurementUnit === 'percentage' ? `${startValue}% → ${targetValue}%` : `${startValue} → ${targetValue}`,
      progressMechanism: 'manual',
    }
    if (currentValue === 0) kr.status = 'gray'
    else if (currentValue < targetValue * 0.45) kr.status = 'orange'
    // otherwise omit status → on-track blue bar
    results.push(kr)
  }
  return results
}

// Key Results drive the goal's progress: a goal's achievement is the average of
// its key results' achievement (matches the goal-detail copy "Key Results …
// automatically update the goal progress"). Each KR's % is clamped 0–100.
function krAchievementPct(krs: DraftKeyResult[]): number {
  if (!krs.length) return 0
  const pcts = krs.map((kr) => {
    const start = typeof kr.startValue === 'number' ? kr.startValue : 0
    const target = Number(kr.targetValue)
    const cur = Number(kr.currentValue)
    if (!Number.isFinite(target) || !Number.isFinite(cur) || target === start) return 0
    const raw = kr.kpiDirection === 'lower' ? (start - cur) / (start - target) : (cur - start) / (target - start)
    return Math.max(0, Math.min(100, Math.round(raw * 100)))
  })
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
}

// Overlay a goal's pill/value/status from its key results' aggregate. Applies
// to measurable, non-company goals (company goals roll up from aligned goals
// and their detail hides KRs; non-measurable goals stay status-only).
function withKrProgress(goal: Goal): Goal {
  if (goal.level === 'company' || !goal.unit || !goal.keyResults?.length) return goal
  const pct = krAchievementPct(goal.keyResults)
  const max = goal.max ?? 100
  const min = goal.min ?? 0
  return {
    ...goal,
    pill: pct,
    value: Math.round(min + (max - min) * (pct / 100)),
    status: pct >= 70 ? 'green' : pct > 0 ? 'orange' : 'gray',
  }
}

// Re-cast a goal's key results into an early/mid-cycle state for the current
// (26 H2) cycle — H1's cloned KRs would otherwise carry end-of-cycle values.
// `r` is the goal's deterministic seed from seed26H2.
function rescaleKRsEarly(krs: DraftKeyResult[], r: number): DraftKeyResult[] {
  return krs.map((kr, j) => {
    const start = typeof kr.startValue === 'number' ? kr.startValue : 0
    const target = Number(kr.targetValue)
    if (!Number.isFinite(target)) return kr
    const f = r < 8 ? 0 : Math.min(0.65, 0.15 + ((r + j * 13) % 50) / 100)
    const cur = kr.kpiDirection === 'lower'
      ? Math.round(start - (start - target) * f)
      : Math.round(start + (target - start) * f)
    const pct = Math.round(f * 100)
    const status: DraftKeyResult['status'] = pct === 0 ? 'gray' : pct < 45 ? 'orange' : undefined
    return { ...kr, currentValue: cur, status }
  })
}

function g(partial: Omit<Goal, 'cycleId'>): Goal {
  // Measurement type (direction) is mandatory — every goal must resolve to
  // "Higher is better" or "Lower is better", never empty. When a seed row
  // doesn't state one, derive it from the target text: a "≤"/"below"/"reduce"
  // style target is lower-is-better, everything else higher-is-better.
  const direction: 'higher' | 'lower' = partial.direction
    ?? (/≤|\b(below|under|reduce|reduction|decrease|lower|waste|spoilage|variance|defect|complaint|churn|downtime|shrinkage)\b/i.test(partial.title) ? 'lower' : 'higher')
  // Every goal's sidebar shows a "Last updated by … on …" line — give one a
  // timestamp when the seed row doesn't state its own.
  const updatedAt = partial.updatedAt ?? '30 Jul 2026, 10:00'
  const base: Goal = {
    cycleId: CYCLE_ID,
    description: GOAL_DESCRIPTIONS[partial.code] ?? '',
    ...partial,
    direction,
    updatedAt,
    // Prod parity: company goals have NO key results — their progress rolls up
    // from aligned children instead (resolved in resolveCompanyRollup).
    keyResults: partial.level === 'company' ? [] : (partial.keyResults ?? seededKeyResults(partial.code)),
  }
  // H1 is a completed cycle — a goal's progress reflects its KRs' final
  // achievement (company goals are skipped; withKrProgress no-ops on them).
  return withKrProgress(base)
}

function seed(): Goal[] {
  return [
  g({
    id: 'rc-01', level: 'company', ownerId: 'rizal', department: 'Management',
    category: 'Financial', subCategory: 'Revenue Growth',
    code: 'RC-01', title: 'Total company revenue H1 2026 (IDR 9.2B)',
   weight: 5, contributorIds: ['ali', 'bayu'], viewerIds: ['ali', 'bayu', 'cinta'], status: 'green', unit: 'currency', value: 8798000000, pill: 96, min: 0, max: 9200000000,
  }),
  g({
    id: 'rc-02', level: 'company', ownerId: 'rizal', department: 'Management',
    category: 'Financial', subCategory: 'Profitability',
    code: 'RC-02', title: 'Company EBITDA margin (≥ 18%)',
   weight: 10, contributorIds: ['evelyn'], viewerIds: ['evelyn'], status: 'green', unit: 'percent', value: 18.1, pill: 101, min: 0, max: 18,
  }),
  g({
    id: 'rc-03', level: 'company', ownerId: 'rizal', department: 'Management',
    category: 'Customer', subCategory: 'Satisfaction',
    code: 'RC-03', title: 'Company NPS score — all channels (≥ 72)',
   weight: 10, contributorIds: ['cinta', 'andi'], viewerIds: ['cinta', 'andi', 'bayu'], status: 'orange', unit: 'count', value: 60, pill: 83, min: 0, max: 72,
  }),
  g({
    id: 'rc-04', level: 'company', ownerId: 'rizal', department: 'Management',
    category: 'Internal Process', subCategory: 'Strategy Execution',
    code: 'RC-04', title: 'H1 OKR completion rate (≥ 90%)',
   weight: 5, contributorIds: [], viewerIds: ['evelyn', 'rio', 'ali', 'bayu', 'andi', 'cinta'], status: 'orange', unit: 'percent', value: 60.6, pill: 67, min: 0, max: 90,
  }),
  g({
    id: 'rc-05', level: 'company', ownerId: 'rizal', department: 'Management',
    category: 'Learning & Growth', subCategory: 'Culture & Engagement',
    code: 'RC-05', title: 'Employee engagement score (≥ 75 / 100)',
   weight: 10, contributorIds: ['rio'], viewerIds: ['rio'], status: 'green', unit: 'count', value: 72, pill: 96, min: 0, max: 75,
  }),
  g({
    id: 'rc-06', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Financial', subCategory: 'New Business',
    code: 'RC-06', title: 'New business channel revenue (IDR 500M)',
    alignedToId: 'eb-01', direction: 'higher', repeat: true, updatedAt: '15 Mar 2026, 15:00',
    description: 'Grow monthly revenue contribution from the new business channel to support company financial targets.\n\nThis channel plays a pivotal role in driving the organization\'s overall financial performance. By aligning it with broader business objectives, we ensure sustainable growth and fiscal responsibility across all operations.',
    keyResults: [
      {
        id: 'rc06-kr1', title: 'Maintain monthly labor cost ratio below 18% of revenue', target: '24% → 18%',
        kpiDirection: 'lower', measurementUnit: 'percentage', useBaseline: true, startValue: 24, targetValue: 18, currentValue: 20, status: 'orange',
      },
      {
        id: 'rc06-kr2', title: 'Reduce daily inventory waste (spoilage) to under Rp 150.000 per day', target: 'Rp300,000 → Rp150,000',
        kpiDirection: 'lower', measurementUnit: 'amount', currency: 'IDR', useBaseline: true, startValue: 300000, targetValue: 150000, currentValue: 210000,
      },
    ],
   weight: 10, contributorIds: ['ali'], viewerIds: [], status: 'green', unit: 'currency', value: 538000000, pill: 108, min: 320000000, max: 500000000,
  }),
  g({
    id: 'rc-07', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Customer', subCategory: 'Stakeholder',
    code: 'RC-07', title: 'New strategic wholesale partnerships (+5 partnerships)',
   weight: 10, contributorIds: ['ali'], viewerIds: [], status: 'green', unit: 'count', value: 5, pill: 100, min: 0, max: 5,
  }),
  g({
    id: 'rc-08', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Internal Process', subCategory: 'Leadership',
    code: 'RC-08', title: 'Cross-dept executive alignment meetings (Bi-weekly)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'rc-09', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Learning & Growth', subCategory: 'Strategic Planning',
    code: 'RC-09', title: 'H2 2026 strategic plan completion (By June 30)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'rc-10', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Financial', subCategory: 'Cost Discipline',
    code: 'RC-10', title: 'Company-wide cost optimization program (Launched)',
   weight: 5, contributorIds: ['evelyn'], viewerIds: ['evelyn'], status: 'green',
  }),
  g({
    id: 'rc-11', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Customer', subCategory: 'Brand',
    code: 'RC-11', title: 'National brand awareness campaign (Delivered)',
   weight: 5, contributorIds: ['bayu'], viewerIds: ['bayu'], status: 'green',
  }),
  g({
    id: 'rc-12', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Internal Process', subCategory: 'Governance',
    code: 'RC-12', title: 'Board reporting cadence standardized (Quarterly)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'rc-13', level: 'individual', ownerId: 'rizal', department: 'Management',
    category: 'Learning & Growth', subCategory: 'Succession',
    code: 'RC-13', title: 'Executive succession plan finalized (By Jun 30)',
   weight: 5, contributorIds: ['rio'], viewerIds: ['rio'], status: 'green',
  }),
  g({
    id: 'eb-01', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
    category: 'Financial', subCategory: 'Reporting',
    code: 'EB-01', title: 'Budget variance — all departments (≤ 5%)',
    alignedToId: 'rc-02', updatedAt: '15 Mar 2026, 15:00',
    weight: 15, contributorIds: ['agung', 'linda'], viewerIds: ['agung'], status: 'green', unit: 'percent', value: 4.5, pill: 90, min: 0, max: 5,
  }),
  g({
    id: 'eb-02', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
    category: 'Financial', subCategory: 'Reporting',
    code: 'EB-02', title: 'Cash flow forecast accuracy (≥ 99%)',
    alignedToId: 'rc-02',
    weight: 13, contributorIds: ['agung'], viewerIds: ['rizal'], status: 'orange', unit: 'percent', value: 64.5, pill: 65, min: 0, max: 99,
  }),
  g({
    id: 'eb-03', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
    category: 'Customer', subCategory: 'Internal Stakeholder',
    code: 'EB-03', title: 'External audit readiness (100%)',
   weight: 10, contributorIds: ['agung'], viewerIds: ['rizal'], status: 'orange', unit: 'percent', value: 83.8, pill: 84, min: 0, max: 100,
  }),
  g({
    id: 'eb-04', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
    category: 'Internal Process', subCategory: 'Finance Operations',
    code: 'EB-04', title: 'Monthly financial report on-time (100%)',
   weight: 15, contributorIds: ['christin', 'agung'], viewerIds: ['rio', 'ali', 'bayu', 'andi', 'cinta'], status: 'green', unit: 'percent', value: 98.9, pill: 99, min: 0, max: 100,
  }),
  g({
    id: 'eb-05', level: 'organization', ownerId: 'evelyn', department: 'Accounting',
    category: 'Internal Process', subCategory: 'Payroll',
    code: 'EB-05', title: 'Payroll disbursement accuracy (100%)',
   weight: 15, contributorIds: ['linda'], viewerIds: ['rio'], status: 'orange', unit: 'percent', value: 74.1, pill: 74, min: 0, max: 100,
  }),
  g({
    id: 'eb-06', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
    category: 'Financial', subCategory: 'Cost Savings',
    code: 'EB-06', title: 'Cost savings identified & actioned (IDR 150M)',
   weight: 12, contributorIds: ['agung'], viewerIds: [], status: 'green', unit: 'currency', value: 146000000, pill: 97, min: 0, max: 150000000,
  }),
  g({
    id: 'eb-07', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
    category: 'Customer', subCategory: 'Stakeholder',
    code: 'EB-07', title: 'Finance report stakeholder satisfaction (≥ 4.2 / 5)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 3.4, pill: 81, min: 0, max: 4.2,
  }),
  g({
    id: 'eb-08', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
    category: 'Learning & Growth', subCategory: 'Professional Dev',
    code: 'EB-08', title: 'CPA / accounting certification update (Completed)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'orange',
  }),
  g({
    id: 'eb-09', level: 'individual', ownerId: 'evelyn', department: 'Accounting',
    category: 'Learning & Growth', subCategory: 'Systems',
    code: 'EB-09', title: 'Finance system advanced training (100%)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 79.5, pill: 80, min: 0, max: 100,
  }),
  g({
    id: 'rp-01', level: 'organization', ownerId: 'rio', department: 'HR',
    category: 'Customer', subCategory: 'Employee Experience',
    code: 'RP-01', title: 'Employee satisfaction score (≥ 4.2 / 5)',
    alignedToId: 'rc-05',
    weight: 15, contributorIds: ['alfian'], viewerIds: ['rizal', 'evelyn', 'ali', 'bayu', 'andi', 'cinta', 'daud', 'jessie', 'eka'], status: 'orange', unit: 'count', value: 3.2, pill: 76, min: 0, max: 4.2,
  }),
  g({
    id: 'rp-02', level: 'organization', ownerId: 'rio', department: 'HR',
    category: 'Internal Process', subCategory: 'Talent Acquisition',
    code: 'RP-02', title: 'Time to hire — all roles avg (≤ 30 days)',
   weight: 15, contributorIds: ['alfian'], viewerIds: ['evelyn', 'ali', 'bayu', 'andi', 'cinta'], status: 'green', unit: 'count', value: 29, pill: 97, min: 0, max: 30,
  }),
  g({
    id: 'rp-03', level: 'organization', ownerId: 'rio', department: 'HR',
    category: 'Internal Process', subCategory: 'Talent Acquisition',
    code: 'RP-03', title: 'Offer acceptance rate (≥ 80%)',
   weight: 15, contributorIds: ['alfian'], viewerIds: ['evelyn', 'ali', 'bayu', 'andi', 'cinta'], status: 'green', unit: 'percent', value: 93.2, pill: 116, min: 0, max: 80,
  }),
  g({
    id: 'rp-04', level: 'organization', ownerId: 'rio', department: 'HR',
    category: 'Learning & Growth', subCategory: 'L&D Programs',
    code: 'RP-04', title: 'Company-wide training completion rate (≥ 90%)',
    alignedToId: 'rc-05',
    weight: 13, contributorIds: ['alfian'], viewerIds: ['ali', 'bayu', 'andi', 'cinta', 'daud', 'jessie', 'eka'], status: 'green', unit: 'percent', value: 100, pill: 111, min: 0, max: 90,
  }),
  g({
    id: 'rp-05', level: 'organization', ownerId: 'rio', department: 'HR',
    category: 'Learning & Growth', subCategory: 'Performance',
    code: 'RP-05', title: 'Performance review cycle completion rate (100%)',
   weight: 12, contributorIds: ['alfian'], viewerIds: ['cinta'], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'rp-06', level: 'individual', ownerId: 'rio', department: 'HR',
    category: 'Financial', subCategory: 'Recruitment Cost',
    code: 'RP-06', title: 'Average cost per hire (≤ IDR 5M)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 4000000, pill: 80, min: 0, max: 5000000,
  }),
  g({
    id: 'rp-07', level: 'individual', ownerId: 'rio', department: 'HR',
    category: 'Financial', subCategory: 'Budget',
    code: 'RP-07', title: 'HR training budget utilization (90–100%)',
   weight: 10, contributorIds: ['alfian'], viewerIds: [], status: 'green', unit: 'percent', value: 97.5, pill: 98, min: 0, max: 100,
  }),
  g({
    id: 'rp-08', level: 'individual', ownerId: 'rio', department: 'HR',
    category: 'Customer', subCategory: 'HR Service',
    code: 'RP-08', title: 'HR ticket resolution time (≤ 2 biz days)',
   weight: 10, contributorIds: ['alfian'], viewerIds: [], status: 'green', unit: 'count', value: 1.8, pill: 90, min: 0, max: 2,
  }),
  // Alfian is Rio's only direct report (EMPLOYEE_MANAGER) and an HR Admin,
  // not a department head — same "individual contributor" shape as
  // Daud/Jessie under Ali: team + individual goals cascading from Rio's own
  // organization-level HR goals above, no organization-level goals of his own.
  g({
    id: 'af-01', level: 'team', ownerId: 'alfian', department: 'HR',
    category: 'Customer', subCategory: 'Employee Experience',
    code: 'AF-01', title: 'Employee onboarding satisfaction (≥ 4.3 / 5)',
    alignedToId: 'rp-01',
   weight: 20, contributorIds: [], viewerIds: ['rio'], status: 'green', unit: 'count', value: 4.5, pill: 105, min: 0, max: 4.3,
  }),
  g({
    id: 'af-02', level: 'team', ownerId: 'alfian', department: 'HR',
    category: 'Internal Process', subCategory: 'Talent Acquisition',
    code: 'AF-02', title: 'Candidate screening turnaround (≤ 3 days)',
    alignedToId: 'rp-02',
   weight: 20, contributorIds: [], viewerIds: ['rio'], status: 'green', unit: 'count', value: 2.6, pill: 87, min: 0, max: 3,
  }),
  g({
    id: 'af-03', level: 'individual', ownerId: 'alfian', department: 'HR',
    category: 'Financial', subCategory: 'Recruitment Cost',
    code: 'AF-03', title: 'Recruitment admin cost savings (IDR 15M)',
   weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 16200000, pill: 108, min: 0, max: 15000000,
  }),
  g({
    id: 'af-04', level: 'individual', ownerId: 'alfian', department: 'HR',
    category: 'Customer', subCategory: 'HR Support',
    code: 'AF-04', title: 'Employee HR query resolution time (≤ 1 biz day)',
    alignedToId: 'rp-08',
   weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 0.9, pill: 90, min: 0, max: 1,
  }),
  g({
    id: 'af-05', level: 'individual', ownerId: 'alfian', department: 'HR',
    category: 'Internal Process', subCategory: 'Documentation',
    code: 'AF-05', title: 'HR policy documentation update (100%)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'af-06', level: 'individual', ownerId: 'alfian', department: 'HR',
    category: 'Learning & Growth', subCategory: 'Systems',
    code: 'AF-06', title: 'HRIS system proficiency certification (Completed)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'af-07', level: 'individual', ownerId: 'alfian', department: 'HR',
    category: 'Learning & Growth', subCategory: 'Compliance',
    code: 'AF-07', title: 'Labor law compliance training (100%)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 82, pill: 82, min: 0, max: 100,
  }),
  g({
    id: 'ai-01', level: 'organization', ownerId: 'ali', department: 'Sales',
    category: 'Financial', subCategory: 'Revenue',
    code: 'AI-01', title: 'Total sales team revenue H1 2026 (IDR 6.3B)',
    alignedToId: 'rc-01',
    weight: 20, contributorIds: ['daud', 'jessie'], viewerIds: ['daud', 'jessie'], status: 'green', unit: 'currency', value: 6568000000, pill: 104, min: 0, max: 6300000000,
  }),
  g({
    id: 'ai-02', level: 'organization', ownerId: 'ali', department: 'Sales',
    category: 'Customer', subCategory: 'Retention',
    code: 'AI-02', title: 'Client retention rate (≥ 88%)',
   weight: 15, contributorIds: ['daud', 'jessie'], viewerIds: ['daud', 'jessie'], status: 'green', unit: 'percent', value: 89.5, pill: 102, min: 0, max: 88,
  }),
  g({
    id: 'ai-03', level: 'team', ownerId: 'ali', department: 'Sales',
    category: 'Financial', subCategory: 'Pipeline',
    code: 'AI-03', title: 'Wholesale sales pipeline value (IDR 1.5B)',
    alignedToId: 'rc-01',
    weight: 10, contributorIds: ['daud'], viewerIds: ['daud'], status: 'orange', unit: 'currency', value: 1237000000, pill: 82, min: 0, max: 1500000000,
  }),
  g({
    id: 'ai-04', level: 'team', ownerId: 'ali', department: 'Sales',
    category: 'Customer', subCategory: 'Enterprise',
    code: 'AI-04', title: 'New enterprise client acquisition (+5 clients)',
   weight: 10, contributorIds: ['daud', 'jessie'], viewerIds: ['jessie'], status: 'green', unit: 'count', value: 5, pill: 100, min: 0, max: 5,
  }),
  g({
    id: 'ai-05', level: 'team', ownerId: 'ali', department: 'Sales',
    category: 'Internal Process', subCategory: 'CRM',
    code: 'AI-05', title: 'Team CRM adoption rate (100%)',
   weight: 10, contributorIds: ['daud', 'jessie'], viewerIds: ['daud', 'jessie'], status: 'orange', unit: 'percent', value: 69.4, pill: 69, min: 0, max: 100,
  }),
  g({
    id: 'ai-06', level: 'individual', ownerId: 'ali', department: 'Sales',
    category: 'Financial', subCategory: 'Productivity',
    code: 'AI-06', title: 'Revenue per sales representative (IDR 2.1B)',
    alignedToId: 'ai-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 2514000000, pill: 120, min: 0, max: 2100000000,
  }),
  g({
    id: 'ai-07', level: 'individual', ownerId: 'ali', department: 'Sales',
    category: 'Internal Process', subCategory: 'Forecast',
    code: 'AI-07', title: 'Sales forecast accuracy (≥ 85%)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 92.6, pill: 109, min: 0, max: 85,
  }),
  g({
    id: 'ai-08', level: 'individual', ownerId: 'ali', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Team Dev',
    code: 'AI-08', title: 'Sales team training completion (100%)',
    alignedToId: 'rp-04',
    weight: 8, contributorIds: ['daud', 'jessie'], viewerIds: ['daud', 'jessie'], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'ai-09', level: 'individual', ownerId: 'ali', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Process',
    code: 'AI-09', title: 'Sales playbook update & rollout (Completed H1)',
   weight: 7, contributorIds: [], viewerIds: [], status: 'orange',
  }),
  g({
    id: 'bf-01', level: 'organization', ownerId: 'bayu', department: 'Marketing',
    category: 'Financial', subCategory: 'Marketing ROI',
    code: 'BF-01', title: 'Campaign return on investment (≥ 3× spend)',
    alignedToId: 'rc-01',
    weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 2.9, pill: 97, min: 0, max: 3,
  }),
  g({
    id: 'bf-02', level: 'organization', ownerId: 'bayu', department: 'Marketing',
    category: 'Financial', subCategory: 'Efficiency',
    code: 'BF-02', title: 'Cost per customer acquisition (≤ IDR 45K)',
   weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 37000, pill: 82, min: 0, max: 45000,
  }),
  g({
    id: 'bf-03', level: 'organization', ownerId: 'bayu', department: 'Marketing',
    category: 'Customer', subCategory: 'Brand Awareness',
    code: 'BF-03', title: 'Social media followers growth (+15%)',
    alignedToId: 'rc-03',
    weight: 12, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 17.8, pill: 119, min: 0, max: 15,
  }),
  g({
    id: 'bf-04', level: 'organization', ownerId: 'bayu', department: 'Marketing',
    category: 'Customer', subCategory: 'Brand Awareness',
    code: 'BF-04', title: 'Brand mention positive sentiment (≥ 75%)',
    alignedToId: 'rc-03',
    weight: 11, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 55.1, pill: 73, min: 0, max: 75,
  }),
  g({
    id: 'bf-05', level: 'team', ownerId: 'bayu', department: 'Marketing',
    category: 'Customer', subCategory: 'Engagement',
    code: 'BF-05', title: 'Campaign engagement rate (≥ 5%)',
   weight: 12, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 5.2, pill: 104, min: 0, max: 5,
  }),
  g({
    id: 'bf-06', level: 'team', ownerId: 'bayu', department: 'Marketing',
    category: 'Internal Process', subCategory: 'Campaign Delivery',
    code: 'BF-06', title: 'On-time campaign launch rate (100%)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 77.4, pill: 77, min: 0, max: 100,
  }),
  g({
    id: 'bf-07', level: 'individual', ownerId: 'bayu', department: 'Marketing',
    category: 'Internal Process', subCategory: 'Content',
    code: 'BF-07', title: 'Monthly content output (≥ 60 pieces)',
   weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 61, pill: 102, min: 0, max: 60,
  }),
  g({
    id: 'bf-08', level: 'individual', ownerId: 'bayu', department: 'Marketing',
    category: 'Learning & Growth', subCategory: 'Digital Capability',
    code: 'BF-08', title: 'Digital marketing certification (Completed)',
    alignedToId: 'rp-04',
    weight: 8, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'bf-09', level: 'individual', ownerId: 'bayu', department: 'Marketing',
    category: 'Learning & Growth', subCategory: 'Research',
    code: 'BF-09', title: 'Market research report delivery (1 per quarter)',
   weight: 7, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 1.1, pill: 110, min: 0, max: 1,
  }),
  g({
    id: 'ap-01', level: 'organization', ownerId: 'andi', department: 'Kitchen',
    category: 'Financial', subCategory: 'Food Cost',
    code: 'AP-01', title: 'Department food cost ratio (≤ 30%)',
    alignedToId: 'rc-02',
    weight: 13, contributorIds: ['indah'], viewerIds: ['indah'], status: 'orange', unit: 'percent', value: 35.1, pill: 117, min: 0, max: 30,
  }),
  g({
    id: 'ap-02', level: 'organization', ownerId: 'andi', department: 'Kitchen',
    category: 'Customer', subCategory: 'Food Quality',
    code: 'AP-02', title: 'Customer food satisfaction rating (≥ 4.5 / 5)',
    alignedToId: 'rc-03',
    weight: 15, contributorIds: ['indah'], viewerIds: ['cinta'], status: 'green', unit: 'count', value: 5, pill: 111, min: 0, max: 4.5,
  }),
  g({
    id: 'ap-03', level: 'organization', ownerId: 'andi', department: 'Kitchen',
    category: 'Customer', subCategory: 'Menu',
    code: 'AP-03', title: 'Menu satisfaction survey score (≥ 80%)',
    alignedToId: 'rc-03',
    weight: 15, contributorIds: ['indah'], viewerIds: ['cinta'], status: 'green', unit: 'percent', value: 77.8, pill: 97, min: 0, max: 80,
  }),
  g({
    id: 'ap-04', level: 'organization', ownerId: 'andi', department: 'Kitchen',
    category: 'Internal Process', subCategory: 'Food Safety',
    code: 'AP-04', title: 'HACCP audit pass rate (100%)',
   weight: 12, contributorIds: ['indah'], viewerIds: ['cinta'], status: 'green', unit: 'percent', value: 97.7, pill: 98, min: 0, max: 100,
  }),
  g({
    id: 'ap-05', level: 'team', ownerId: 'andi', department: 'Kitchen',
    category: 'Financial', subCategory: 'Waste',
    code: 'AP-05', title: 'Food waste reduction vs H2 2025 (-10%)',
    alignedToId: 'ap-01',
    weight: 12, contributorIds: ['indah'], viewerIds: ['indah'], status: 'green', unit: 'percent', value: 9.5, pill: 95, min: 0, max: 10,
  }),
  g({
    id: 'ap-06', level: 'team', ownerId: 'andi', department: 'Kitchen',
    category: 'Internal Process', subCategory: 'Kitchen Efficiency',
    code: 'AP-06', title: 'Average dish preparation time (≤ 8 min)',
   weight: 12, contributorIds: ['indah'], viewerIds: ['cinta'], status: 'green', unit: 'count', value: 6.1, pill: 76, min: 0, max: 8,
  }),
  g({
    id: 'ap-07', level: 'individual', ownerId: 'andi', department: 'Kitchen',
    category: 'Internal Process', subCategory: 'Menu Innovation',
    code: 'AP-07', title: 'New menu items introduced per quarter (≥ 2 items)',
   weight: 11, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 2.4, pill: 120, min: 0, max: 2,
  }),
  g({
    id: 'ap-08', level: 'individual', ownerId: 'andi', department: 'Kitchen',
    category: 'Learning & Growth', subCategory: 'Team Dev',
    code: 'AP-08', title: 'Kitchen team training completion (100%)',
    alignedToId: 'rp-04',
    weight: 5, contributorIds: ['indah'], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'ap-09', level: 'individual', ownerId: 'andi', department: 'Kitchen',
    category: 'Learning & Growth', subCategory: 'Cross-Train',
    code: 'AP-09', title: 'Cross-station training coverage (≥ 75%)',
   weight: 5, contributorIds: ['indah'], viewerIds: [], status: 'orange', unit: 'percent', value: 49, pill: 65, min: 0, max: 75,
  }),
  g({
    id: 'ca-01', level: 'organization', ownerId: 'cinta', department: 'Front of House',
    category: 'Customer', subCategory: 'Guest Experience',
    code: 'CA-01', title: 'Customer satisfaction score (CSAT) (≥ 4.7 / 5)',
    alignedToId: 'rc-03',
    weight: 18, contributorIds: ['eka', 'fajar'], viewerIds: ['eka'], status: 'orange', unit: 'count', value: 3.9, pill: 83, min: 0, max: 4.7,
  }),
  g({
    id: 'ca-02', level: 'organization', ownerId: 'cinta', department: 'Front of House',
    category: 'Customer', subCategory: 'Complaints',
    code: 'CA-02', title: 'Complaint resolution time (≤ 2 hours)',
    alignedToId: 'rc-03',
    weight: 17, contributorIds: ['fajar'], viewerIds: [], status: 'green', unit: 'count', value: 1.6, pill: 80, min: 0, max: 2,
  }),
  g({
    id: 'ca-03', level: 'organization', ownerId: 'cinta', department: 'Front of House',
    category: 'Internal Process', subCategory: 'Service Standards',
    code: 'CA-03', title: 'FOH SOP compliance score (≥ 96%)',
   weight: 15, contributorIds: ['eka', 'fajar'], viewerIds: ['eka'], status: 'green', unit: 'percent', value: 93.9, pill: 98, min: 0, max: 96,
  }),
  g({
    id: 'ca-04', level: 'team', ownerId: 'cinta', department: 'Front of House',
    category: 'Financial', subCategory: 'Revenue',
    code: 'CA-04', title: 'F&B revenue achievement vs target (≥ 95%)',
    alignedToId: 'rc-01',
    weight: 13, contributorIds: ['eka', 'joko'], viewerIds: ['eka'], status: 'green', unit: 'percent', value: 100, pill: 105, min: 0, max: 95,
  }),
  g({
    id: 'ca-05', level: 'team', ownerId: 'cinta', department: 'Front of House',
    category: 'Internal Process', subCategory: 'Scheduling',
    code: 'CA-05', title: 'Staff schedule coverage rate (100%)',
   weight: 15, contributorIds: ['galih', 'fajar'], viewerIds: [], status: 'orange', unit: 'percent', value: 88.6, pill: 89, min: 0, max: 100,
  }),
  g({
    id: 'ca-06', level: 'individual', ownerId: 'cinta', department: 'Front of House',
    category: 'Financial', subCategory: 'Efficiency',
    code: 'CA-06', title: 'Table turnover improvement vs H2 2025 (+10%)',
    alignedToId: 'ca-04',
    weight: 12, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 10.8, pill: 108, min: 0, max: 10,
  }),
  g({
    id: 'ca-07', level: 'individual', ownerId: 'cinta', department: 'Front of House',
    category: 'Learning & Growth', subCategory: 'Team Dev',
    code: 'CA-07', title: 'FOH team training completion (100%)',
    alignedToId: 'rp-04',
    weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'ca-08', level: 'individual', ownerId: 'cinta', department: 'Front of House',
    category: 'Learning & Growth', subCategory: 'Coaching',
    code: 'CA-08', title: 'Monthly 1-on-1 coaching sessions per staff (≥ 1 / month)',
    alignedToId: 'rp-05',
    weight: 5, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 0.7, pill: 70, min: 0, max: 1,
  }),
  g({
    id: 'dd-01', level: 'team', ownerId: 'daud', department: 'Sales',
    category: 'Financial', subCategory: 'Personal Sales',
    code: 'DD-01', title: 'Personal sales revenue H1 2026 (IDR 1.8B)',
    alignedToId: 'ai-01',
    weight: 20, contributorIds: [], viewerIds: ['ali'], status: 'green', unit: 'currency', value: 1984000000, pill: 110, min: 0, max: 1800000000,
  }),
  g({
    id: 'dd-02', level: 'team', ownerId: 'daud', department: 'Sales',
    category: 'Customer', subCategory: 'Satisfaction',
    code: 'DD-02', title: 'Assigned client satisfaction score (≥ 4.2 / 5)',
    alignedToId: 'ai-02',
    weight: 15, contributorIds: [], viewerIds: ['ali'], status: 'green', unit: 'count', value: 4.8, pill: 114, min: 0, max: 4.2,
  }),
  g({
    id: 'dd-03', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Financial', subCategory: 'New Business',
    code: 'DD-03', title: 'Revenue from new accounts (IDR 400M)',
    alignedToId: 'ai-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 458000000, pill: 114, min: 0, max: 400000000,
  }),
  g({
    id: 'dd-04', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Financial', subCategory: 'Upsell',
    code: 'DD-04', title: 'Upsell achievement — existing clients (IDR 200M)',
    alignedToId: 'ai-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 190000000, pill: 95, min: 0, max: 200000000,
  }),
  g({
    id: 'dd-05', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Customer', subCategory: 'Responsiveness',
    code: 'DD-05', title: 'Client complaint resolution time (≤ 24 hours)',
    alignedToId: 'ai-02',
    weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 18, pill: 75, min: 0, max: 24,
  }),
  g({
    id: 'dd-06', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Internal Process', subCategory: 'Productivity',
    code: 'DD-06', title: 'Client visits / calls per month (≥ 80 / month)',
    alignedToId: 'ai-05',
    weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 71, pill: 89, min: 0, max: 80,
  }),
  g({
    id: 'dd-07', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Internal Process', subCategory: 'Proposals',
    code: 'DD-07', title: 'Proposal submission turnaround (≤ 2 days)',
    alignedToId: 'ai-05',
    weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 2.3, pill: 115, min: 0, max: 2,
  }),
  g({
    id: 'dd-08', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Product',
    code: 'DD-08', title: 'Product & pricing training completion (100%)',
    alignedToId: 'ai-08',
    weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'dd-09', level: 'individual', ownerId: 'daud', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Skills',
    code: 'DD-09', title: 'Negotiation skills workshop (≥ 1 session)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 0.7, pill: 70, min: 0, max: 1,
  }),
  g({
    id: 'jt-01', level: 'team', ownerId: 'jessie', department: 'Sales',
    category: 'Financial', subCategory: 'Personal Sales',
    code: 'JT-01', title: 'Personal sales revenue H1 2026 (IDR 1.7B)',
    alignedToId: 'ai-01',
    weight: 20, contributorIds: [], viewerIds: ['ali'], status: 'green', unit: 'currency', value: 1644000000, pill: 97, min: 0, max: 1700000000,
  }),
  g({
    id: 'jt-02', level: 'team', ownerId: 'jessie', department: 'Sales',
    category: 'Customer', subCategory: 'Satisfaction',
    code: 'JT-02', title: 'Assigned client satisfaction score (≥ 4.3 / 5)',
    alignedToId: 'ai-02',
    weight: 15, contributorIds: [], viewerIds: ['ali'], status: 'orange', unit: 'count', value: 3.7, pill: 86, min: 0, max: 4.3,
  }),
  g({
    id: 'jt-03', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Financial', subCategory: 'Retail Focus',
    code: 'JT-03', title: 'New retail account revenue (IDR 500M)',
    alignedToId: 'ai-01',
    weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 534000000, pill: 107, min: 0, max: 500000000,
  }),
  g({
    id: 'jt-04', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Financial', subCategory: 'Upsell',
    code: 'JT-04', title: 'Upsell & cross-sell revenue (IDR 150M)',
    alignedToId: 'ai-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 152000000, pill: 101, min: 0, max: 150000000,
  }),
  g({
    id: 'jt-05', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Customer', subCategory: 'Acquisition',
    code: 'JT-05', title: 'New retail accounts opened (+80 accounts)',
    alignedToId: 'ai-04',
    weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'count', value: 61, pill: 76, min: 0, max: 80,
  }),
  g({
    id: 'jt-06', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Internal Process', subCategory: 'Productivity',
    code: 'JT-06', title: 'Retail visit / call per month (≥ 90 / month)',
    alignedToId: 'ai-05',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 98, pill: 109, min: 0, max: 90,
  }),
  g({
    id: 'jt-07', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Internal Process', subCategory: 'CRM',
    code: 'JT-07', title: 'CRM data update compliance (≥ 98%)',
    alignedToId: 'ai-05',
    weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 69, pill: 70, min: 0, max: 98,
  }),
  g({
    id: 'jt-08', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Retail',
    code: 'JT-08', title: 'Retail sales technique training (100%)',
    alignedToId: 'ai-08',
    weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 100, pill: 100, min: 0, max: 100,
  }),
  g({
    id: 'jt-09', level: 'individual', ownerId: 'jessie', department: 'Sales',
    category: 'Learning & Growth', subCategory: 'Product',
    code: 'JT-09', title: 'New product knowledge assessment (≥ 85 / 100)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 90, pill: 106, min: 0, max: 85,
  }),
  g({
    id: 'es-01', level: 'team', ownerId: 'eka', department: 'Front of House',
    category: 'Customer', subCategory: 'Guest Experience',
    code: 'ES-01', title: 'Personal customer satisfaction rating (≥ 4.7 / 5)',
    alignedToId: 'ca-01',
    weight: 20, contributorIds: [], viewerIds: ['cinta'], status: 'green', unit: 'count', value: 4.6, pill: 98, min: 0, max: 4.7,
  }),
  g({
    id: 'es-02', level: 'team', ownerId: 'eka', department: 'Front of House',
    category: 'Internal Process', subCategory: 'Standards',
    code: 'ES-02', title: 'SOP compliance rate (≥ 98%)',
    alignedToId: 'ca-03',
    weight: 15, contributorIds: [], viewerIds: ['cinta'], status: 'green', unit: 'percent', value: 100, pill: 102, min: 0, max: 98,
  }),
  g({
    id: 'es-03', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Financial', subCategory: 'Upsell',
    code: 'ES-03', title: 'Personal upsell revenue contribution (IDR 25M)',
    alignedToId: 'ca-04',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'currency', value: 25000000, pill: 100, min: 0, max: 25000000,
  }),
  g({
    id: 'es-04', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Financial', subCategory: 'Avg Check',
    code: 'ES-04', title: 'Average check contribution growth (+5% vs H2 2025)',
    alignedToId: 'ca-04',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 4.8, pill: 96, min: 0, max: 5,
  }),
  g({
    id: 'es-05', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Customer', subCategory: 'Recognition',
    code: 'ES-05', title: 'Positive customer mentions per month (≥ 15 / month)',
    alignedToId: 'ca-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 15, pill: 100, min: 0, max: 15,
  }),
  g({
    id: 'es-06', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Customer', subCategory: 'Accuracy',
    code: 'ES-06', title: 'Drink preparation accuracy rate (≥ 99%)',
    alignedToId: 'ca-01',
    weight: 10, contributorIds: [], viewerIds: [], status: 'orange', unit: 'percent', value: 87.3, pill: 88, min: 0, max: 99,
  }),
  g({
    id: 'es-07', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Internal Process', subCategory: 'Speed',
    code: 'ES-07', title: 'Drink preparation time (≤ 2.5 min)',
    alignedToId: 'ca-03',
    weight: 15, contributorIds: [], viewerIds: [], status: 'green', unit: 'count', value: 2, pill: 80, min: 0, max: 2.5,
  }),
  g({
    id: 'es-08', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Learning & Growth', subCategory: 'Certification',
    code: 'ES-08', title: 'Barista certification — Level 2 (Completed)',
    alignedToId: 'rp-04',
    weight: 5, contributorIds: [], viewerIds: [], status: 'green',
  }),
  g({
    id: 'es-09', level: 'individual', ownerId: 'eka', department: 'Front of House',
    category: 'Learning & Growth', subCategory: 'Menu Mastery',
    code: 'ES-09', title: 'New menu mastery assessment (100%)',
   weight: 5, contributorIds: [], viewerIds: [], status: 'green', unit: 'percent', value: 98.3, pill: 98, min: 0, max: 100,
  }),
  ]
}

// Module-scope singleton — shared reactive "mini DB" for this demo prototype.
const STORAGE_KEY = 'talenta-goals-db'
// Bump this whenever seed() changes in a way stale localStorage would
// contradict (e.g. reweighting company goals) — otherwise a browser that
// already persisted the old seed keeps showing it forever, since
// loadFromStorage() below always prefers localStorage over a fresh seed().
const SEED_VERSION = 20

// 26 H2 (the current cycle) reuses every owner's 26 H1 goal set — same titles,
// categories, weights, targets — but re-cast into an early/mid-cycle in-progress
// state (deterministic per goal), since the cycle only just started. This keeps
// each employee's H2 goals accurate and consistent with their H1 set while
// giving the dashboard real "current cycle" progress to read.
// Titles that bake in a period are rewritten for the H2 cycle so they stay
// accurate (H1 originals keep saying H1; these H2 clones say H2 / next-half /
// H2 cycle-end / prior-half = H1 2026). Keyed by the H1 goal `code`; any goal
// not listed keeps its title verbatim. See docs — goal titles are period-correct
// per cycle, not cloned blindly.
const H2_TITLE_BY_CODE: Record<string, string> = {
  'RC-01': 'Total company revenue H2 2026 (IDR 9.2B)',
  'RC-04': 'H2 OKR completion rate (≥ 90%)',
  'RC-09': 'H1 2027 strategic plan completion (By December 31)',
  'RC-13': 'Executive succession plan finalized (By December 31)',
  'AI-01': 'Total sales team revenue H2 2026 (IDR 6.3B)',
  'AI-09': 'Sales playbook update & rollout (Completed H2)',
  'DD-01': 'Personal sales revenue H2 2026 (IDR 1.8B)',
  'JT-01': 'Personal sales revenue H2 2026 (IDR 1.7B)',
  'AP-05': 'Food waste reduction vs H1 2026 (-10%)',
  'CA-06': 'Table turnover improvement vs H1 2026 (+10%)',
  'ES-04': 'Average check contribution growth (+5% vs H1 2026)',
}

function seed26H2(): Goal[] {
  return seed().map((g, i) => {
    const r = (i * 37) % 100
    const alignedToId = g.alignedToId ? `h2-${g.alignedToId}` : undefined
    const title = H2_TITLE_BY_CODE[g.code] ?? g.title
    // H2 is the current, early-to-mid cycle — re-cast the cloned KRs to
    // early-cycle achievement so the goal's KR-driven progress reads "in
    // progress" rather than H1's completed values.
    const keyResults = rescaleKRsEarly(g.keyResults ?? [], r)
    const commonoverride = { ...g, id: `h2-${g.id}`, cycleId: 'seed-26-h2', alignedToId, title, keyResults }
    if (!g.unit) {
      // Non-measurable goals: status only, no progress bar.
      return { ...commonoverride, status: (r < 30 ? 'gray' : 'green') as GoalStatus, value: undefined, pill: undefined }
    }
    if (g.level === 'company') {
      // Company goals roll up from aligned goals (KRs hidden) — keep the
      // deterministic early-cycle status/progress rather than a KR average.
      const max = g.max ?? 100
      let status: GoalStatus
      let pill: number
      if (r < 8) { status = 'gray'; pill = 0 }
      else if (r < 25) { status = 'gray'; pill = 30 + (r % 25) }
      else if (r < 45) { status = 'orange'; pill = 20 + (r % 20) }
      else { status = 'green'; pill = 45 + (r % 35) }
      return { ...commonoverride, status, pill, value: Math.round((max * pill) / 100), min: g.min ?? 0, max }
    }
    // Non-company measurable: goal progress = average of its (early) KRs.
    return withKrProgress({ ...commonoverride, min: g.min ?? 0, max: g.max ?? 100 })
  })
}

// Prod parity: a company goal has no key results — its progress rolls up from
// the goals aligned to it (average of children's achievement). Runs after the
// non-company goals already carry their KR-derived progress, so children pills
// are final. Precedence overall: Key Results → aligned children → manual.
function resolveCompanyRollup(list: Goal[]): Goal[] {
  return list.map((goal) => {
    if (goal.level !== 'company') return goal
    const children = list.filter(c => c.alignedToId === goal.id)
    if (!children.length) return goal
    const pcts = children.map(c => Math.max(0, Math.min(100, c.pill ?? 0)))
    const pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length)
    const status: GoalStatus = pct >= 70 ? 'green' : pct > 0 ? 'orange' : 'gray'
    if (!goal.unit) return { ...goal, status, pill: undefined, value: undefined }
    const max = goal.max ?? 100
    const min = goal.min ?? 0
    return { ...goal, pill: pct, value: Math.round(min + (max - min) * (pct / 100)), status }
  })
}
function buildSeededGoals(): Goal[] {
  return resolveCompanyRollup([...seed(), ...seed26H2()])
}
const goals = ref<Goal[]>(buildSeededGoals())
let loadedFromStorage = false

function persist() {
  if (import.meta.client) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, goals: goals.value }))
}

function loadFromStorage() {
  if (loadedFromStorage || !import.meta.client) return
  loadedFromStorage = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.version === SEED_VERSION && Array.isArray(parsed.goals)) {
        goals.value = parsed.goals
        return
      }
    }
    catch {
      // fall through to re-seed on corrupt or outdated storage
    }
  }
  persist()
}

// Only the '26 H1' cycle (id CYCLE_ID) ships with the 88 pre-seeded goals —
// every other goal cycle a user creates starts with none at all. `cycleId`
// scopes every read below (including categoryWeight, which must never mix
// one owner's weights across two different cycles) to just that cycle;
// omit it only for actions that operate across all cycles at once (e.g. the
// goal-cycles list page's delete-cycle flow).
export function useGoalsStore(cycleId?: string) {
  loadFromStorage()

  function resetToSeed() {
    goals.value = seed()
    persist()
  }

  function deleteGoalsByCycle(targetCycleId: string) {
    goals.value = goals.value.filter(g => g.cycleId !== targetCycleId)
    persist()
  }

  function deleteGoal(id: string) {
    goals.value = goals.value.filter(g => g.id !== id)
    persist()
  }

  // Used by the "New goals" flow — each drafted goal becomes one real Goal
  // per selected owner, starting unstarted (status:'gray', no unit/value)
  // since it's newly created, not a historical snapshot.
  function addGoals(newGoals: Omit<Goal, 'cycleId'>[], targetCycleId: string) {
    goals.value = [...goals.value, ...newGoals.map(g => ({ ...g, cycleId: targetCycleId }))]
    persist()
  }

  // Used by the Edit goal flow — replaces an existing goal's editable
  // fields in place, keeping its id/ownerId/cycleId (and anything else the
  // patch doesn't mention, e.g. alignedToId) untouched.
  function updateGoal(id: string, patch: Partial<Goal>) {
    goals.value = goals.value.map(g => (g.id === id ? { ...g, ...patch } : g))
    persist()
  }

  const cycleGoals = computed(() => cycleId ? goals.value.filter(g => g.cycleId === cycleId) : goals.value)

  // Category weight is derived, not authored — see GoalWithCategoryWeight
  // above. It's the SUM of the matching goals' own weight, scoped to this
  // owner across ALL levels within THIS cycle (every employee has exactly
  // one 100% budget per cycle, not a separate one per level, and it must
  // never mix weights across two different cycles either), matching the
  // source's own Category Weight reference sheet exactly.
  const goalsWithCategoryWeight = computed<GoalWithCategoryWeight[]>(() => cycleGoals.value.map((goal) => {
    const matching = cycleGoals.value.filter(g => g.category === goal.category && g.ownerId === goal.ownerId)
    return {
      ...goal,
      // Rounded to 1 decimal as a safety net against float drift — every
      // real weight in the seed data is already a whole percentage.
      categoryWeight: Math.round(matching.reduce((sum, g) => sum + g.weight, 0) * 10) / 10,
    }
  }))

  const companyGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'company'))
  const organizationGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'organization'))
  const teamGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'team'))
  const individualGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.level === 'individual'))

  // "My goals" / "My direct reports" show ALL of that person's own goals
  // regardless of level tag — under this model there's only one 100%
  // budget per employee (mixing Company/Organization/Team/Individual
  // together), so scoping to individual-level only would show a partial,
  // misleadingly-small slice of what someone actually owns.
  const { currentUserId } = useCurrentUser()
  const myGoals = computed(() => goalsWithCategoryWeight.value.filter(g => g.ownerId === currentUserId.value))
  const myDirectReportsGoals = computed(() => goalsWithCategoryWeight.value.filter(
    g => EMPLOYEE_MANAGER[g.ownerId] === currentUserId.value,
  ))

  return {
    goals: goalsWithCategoryWeight,
    resetToSeed,
    deleteGoalsByCycle,
    deleteGoal,
    addGoals,
    updateGoal,
    companyGoals,
    organizationGoals,
    teamGoals,
    individualGoals,
    myGoals,
    myDirectReportsGoals,
  }
}

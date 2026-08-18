<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Reviews / Pending actions — review scoring form
  Token mode: Pixel 2.4

  The per-member review form reached from "Start review" / "Continue" on the
  View task list. Header (reviewee + method + cycle), the reviewee's goals to
  score (goal, target, current, rating 1–5 prefilled from goal progress, and a
  per-goal comment), plus an overall comment, and Save as draft / Submit which
  update the review task status in the seed (useReviewSubmissionsStore). Past
  cycles without goals show the overall comment only.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpAvatar,
  MpButton,
  MpButtonGroup,
  MpTextarea,
  MpBadge,
  MpFormControl,
  MpFormLabel,
  toast,
  css,
} from '@mekari/pixel3'
import { employeeById, employeeMeta } from '~/utils/employees'
import { REVIEW_CYCLES, REVIEW_METHODS } from '~/composables/useReviewSubmissionsStore'

definePageMeta({
  layout: 'default',
  title: 'Review',
  breadcrumb: { label: 'Pending actions', to: '/reviews/pending-actions' },
})

const route = useRoute()
const router = useRouter()
const cycleValue = computed(() => route.params.uuid as string)
const memberId = computed(() => route.params.memberId as string)
const [revieweeId, methodKey] = (route.params.memberId as string).split('--')

const cycle = computed(() => REVIEW_CYCLES.find(c => c.value === cycleValue.value))
const reviewee = computed(() => employeeById(revieweeId))
const methodLabel = computed(() => REVIEW_METHODS.find(m => m.value === methodKey)?.label ?? methodKey)

const { currentUserId } = useCurrentUser()
const { setReviewStatus, reviewMember } = useReviewSubmissionsStore()
const member = computed(() => reviewMember(currentUserId.value, cycleValue.value, memberId.value))

watchEffect(() => { route.meta.title = reviewee.value ? `Review ${reviewee.value.name}` : 'Review' })

// Reviewee's goals in the matching goal cycle (auto-score prefill from pill).
const goalCycle = computed(() => cycle.value?.goalCycle ?? '')
const { goals } = useGoalsStore(goalCycle.value || undefined)
const revieweeGoals = computed(() => (goalCycle.value ? goals.value.filter(g => g.ownerId === revieweeId) : []))

interface Line { id: string, code: string, title: string, unit?: string, value?: number, max?: number, rating: number, comment: string }
const lines = ref<Line[]>([])
const overallComment = ref('')

function pillToRating(pill?: number) { return Math.max(1, Math.min(5, Math.round(((pill ?? 0) / 100) * 5) || 1)) }
watchEffect(() => {
  lines.value = revieweeGoals.value.map(g => ({
    id: g.id, code: g.code, title: g.title, unit: g.unit, value: g.value, max: g.max,
    rating: pillToRating(g.pill), comment: '',
  }))
})

function fmtNumber(n: number) { return n.toLocaleString('id-ID') }
function fmtValue(unit: string | undefined, v: number | undefined) {
  if (v == null) return '—'
  if (unit === 'currency') return `Rp${fmtNumber(v)}`
  if (unit === 'percent') return `${v}%`
  return fmtNumber(v)
}

const avgRating = computed(() => (lines.value.length ? Math.round((lines.value.reduce((s, l) => s + l.rating, 0) / lines.value.length) * 10) / 10 : 0))

function goBack() { router.push({ path: `/reviews/pending-actions/${cycleValue.value}` }) }
function saveDraft() {
  setReviewStatus(currentUserId.value, cycleValue.value, memberId.value, 'draft')
  toast.notify({ id: 'review-draft', position: 'top-center', variant: 'success', title: 'Saved as draft' })
  goBack()
}
function submitReview() {
  setReviewStatus(currentUserId.value, cycleValue.value, memberId.value, 'submitted', avgRating.value)
  toast.notify({ id: 'review-submit', position: 'top-center', variant: 'success', title: 'Review submitted' })
  goBack()
}

const RATINGS = [1, 2, 3, 4, 5]

// ─── Styles (DT 2.4) ──────────────────────────────────────────────────────────
const headerRow = css({ display: 'flex', alignItems: 'center', gap: '3', paddingBottom: '5', borderBottom: '1px solid', borderBottomColor: 'border.default', marginBottom: '6' })
const nameText = css({ fontSize: '18px', fontWeight: '600', color: 'text.default' })
const metaText = css({ fontSize: '12px', color: 'text.secondary' })
const sectionTitle = css({ fontSize: '16px', fontWeight: '600', color: 'text.default', marginBottom: '3' })
const goalItem = css({ paddingBlock: '4', borderBottom: '1px solid', borderBottomColor: 'gray.50', display: 'flex', flexDirection: 'column', gap: '2' })
const goalCode = css({ fontSize: '12px', color: 'text.secondary' })
const goalTitle = css({ fontSize: '14px', fontWeight: '600', color: 'text.default' })
const metaLine = css({ display: 'flex', gap: '6', flexWrap: 'wrap', marginTop: '1' })
const metaBlock = css({ display: 'flex', flexDirection: 'column', gap: '0' })
const ratingRow = css({ display: 'flex', gap: '2', marginTop: '2' })
const ratingBtn = css({ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid', borderColor: 'border.default', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: 'text.default' })
const ratingBtnActive = css({ borderColor: 'border.brand', background: 'background.neutral.subtle', color: 'text.link' })
const footer = css({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8', paddingTop: '5', borderTop: '1px solid', borderTopColor: 'border.default' })
const avgText = css({ fontSize: '14px', color: 'text.secondary' })
const emptyNote = css({ paddingBlock: '6', color: 'text.secondary', fontSize: '14px' })
</script>

<template>
  <div v-if="reviewee">
    <!-- Header -->
    <div :class="headerRow">
      <PxAvatar :id="`reviewee-${revieweeId}`" :name="reviewee.name" :src="reviewee.photo" size="lg" variant-color="gray" />
      <MpFlex direction="column" gap="0">
        <span :class="nameText">{{ reviewee.name }}</span>
        <span :class="metaText">{{ employeeMeta(reviewee) }}</span>
      </MpFlex>
      <MpBadge for="tableStatus" type="announcement" :class="css({ marginLeft: '2' })">{{ methodLabel }}</MpBadge>
      <MpBadge for="tableStatus" type="completed">{{ cycle?.label }}</MpBadge>
    </div>

    <!-- Goals scoring -->
    <MpText :class="sectionTitle">Goals</MpText>
    <template v-if="lines.length">
      <div v-for="(line, i) in lines" :key="line.id" :class="goalItem">
        <div>
          <div :class="goalCode">{{ line.code }}</div>
          <div :class="goalTitle">{{ line.title }}</div>
          <div :class="metaLine">
            <div :class="metaBlock"><span :class="metaText">Target</span><span>{{ fmtValue(line.unit, line.max) }}</span></div>
            <div :class="metaBlock"><span :class="metaText">Achieved</span><span>{{ fmtValue(line.unit, line.value) }}</span></div>
          </div>
        </div>
        <MpFormControl :id="`rating-${line.id}`">
          <MpFormLabel>Rating</MpFormLabel>
          <div :class="ratingRow">
            <button
              v-for="r in RATINGS"
              :key="r"
              type="button"
              :class="[ratingBtn, lines[i].rating === r && ratingBtnActive]"
              @click="lines[i].rating = r"
            >{{ r }}</button>
          </div>
        </MpFormControl>
        <MpFormControl :id="`comment-${line.id}`">
          <MpFormLabel>Comment</MpFormLabel>
          <MpTextarea v-model="lines[i].comment" placeholder="Add a comment for this goal (optional)" />
        </MpFormControl>
      </div>
    </template>
    <div v-else :class="emptyNote">No goals to score for this cycle — leave an overall comment below.</div>

    <!-- Overall comment -->
    <MpFormControl id="overall-comment" :class="css({ marginTop: '6' })">
      <MpFormLabel>Overall comment</MpFormLabel>
      <MpTextarea v-model="overallComment" placeholder="Summarise your review" />
    </MpFormControl>

    <!-- Footer -->
    <div :class="footer">
      <span v-if="lines.length" :class="avgText">Average rating: <strong>{{ avgRating }}</strong> / 5</span>
      <span v-else />
      <MpButtonGroup>
        <MpButton variant="ghost" @click="saveDraft">Save as draft</MpButton>
        <MpButton variant="primary" @click="submitReview">Submit review</MpButton>
      </MpButtonGroup>
    </div>
  </div>

  <div v-else :class="css({ padding: '20', textAlign: 'center', color: 'text.secondary' })">
    Review task not found.
  </div>
</template>

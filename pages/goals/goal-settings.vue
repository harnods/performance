<!--
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mekari Talenta Performance — Goal settings
  Source: Figma — Goals (fileKey E5Ab98G8lF0UejH49bBHnU, node 4817:32747)
  Token mode: Pixel 2.4
  Patterns used: layout-shell (header + page title from layout), flat sections
  with H2 + description + toggle(s) (mirrors pages/reviews/review-cycles/create.vue).

  COPY / DATA are mock — toggles are local-only state (no persistence layer
  exists in this prototype), matching the rest of the app.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-->
<script setup lang="ts">
import {
  MpFlex,
  MpText,
  MpToggle,
  MpBadge,
  MpButton,
  MpTextlink,
  css,
} from '@mekari/pixel3'

definePageMeta({ title: 'Goal settings' })

const router = useRouter()

// ─── Toggle state (mock — matches Figma defaults) ──────────────────────────────
// Shared with AppSidebar.vue: toggling this swaps the Goals level-2 sitemap
// between the current menu and the new-experience menu (Goal cycles / Goal
// categories / Goal settings).
const useNewInterface = useCookie('goals-new-interface', { default: () => false })
const restrictGoalCreator = ref(false)
const enableGoalCategories = ref(true)
const receiveGroupedRequests = ref(false)

const attachmentRequired = reactive({
  individual: false,
  team: true,
  organization: true,
})

const dateRequired = reactive({
  individual: false,
  team: true,
  organization: true,
  company: false,
})

const displayProgressAsActualValues = ref(false)

// ─── Layout (DT 2.4) ─────────────────────────────────────────────────────────
const gridArea = css({ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '6' })
const formColumn = css({
  gridColumn: { base: 'span 12 / span 12', lg: 'span 6 / span 6' },
  display: 'flex',
  flexDirection: 'column',
})

const sectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1', marginTop: '10', marginBottom: '3' })
const firstSectionHeader = css({ display: 'flex', flexDirection: 'column', gap: '1', marginBottom: '3' })
const h2Class = css({ fontSize: '20px', fontWeight: '600', lineHeight: '32px', color: 'text.default' })

const fields = css({ display: 'flex', flexDirection: 'column', gap: '4' })
const toggleGroup = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const toggleWithLink = css({ display: 'flex', flexDirection: 'column', gap: '2' })
const linkRow = css({ paddingLeft: '10' })
</script>

<template>
  <div :class="gridArea">
    <div :class="formColumn">
      <!-- ── Goals experience ────────────────────────────────────────── -->
      <div :class="firstSectionHeader">
        <MpText as="h2" :class="h2Class">Goals experience</MpText>
        <MpText size="label" color="text.secondary">
          Try the redesigned Goals interface. You can switch back to the current version at any time.
        </MpText>
      </div>
      <div :class="toggleWithLink">
        <MpToggle id="use-new-interface" v-model:is-checked="useNewInterface">
          Use the new Goals interface
        </MpToggle>
        <div :class="linkRow">
          <MpTextlink>Learn what's new</MpTextlink>
        </div>
      </div>

      <!-- ── Goal approvals ──────────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpFlex align="center" gap="2">
          <MpText as="h2" :class="h2Class">Goal approvals</MpText>
          <MpBadge for="additionalInformation" type="completed">Active</MpBadge>
        </MpFlex>
        <MpText size="label" color="text.secondary">
          Allow Talenta super admins and Talenta Performance super admins to require managers to approve goals created by their employees.
        </MpText>
      </div>
      <div :class="fields">
        <MpButton variant="secondary" left-icon="newtab">Open approval settings</MpButton>
      </div>

      <!-- ── Goal creator ─────────────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Goal creator</MpText>
        <MpText size="label" color="text.secondary">
          Allow employees to create their own goals. Best for companies that use a bottom-up approach.
        </MpText>
      </div>
      <div :class="fields">
        <MpToggle id="restrict-goal-creator" v-model:is-checked="restrictGoalCreator">
          Only super admins and managers can create or edit goals
        </MpToggle>
      </div>

      <!-- ── Goal categories ──────────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Goal categories</MpText>
        <MpText size="label" color="text.secondary">
          Organize goals using specific categories to group them in performance reviews.
        </MpText>
      </div>
      <div :class="toggleWithLink">
        <MpToggle id="enable-goal-categories" v-model:is-checked="enableGoalCategories">
          Enable goal categories
        </MpToggle>
        <div :class="linkRow">
          <MpTextlink @click="router.push('/goals/goal-categories')">Manage goal categories</MpTextlink>
        </div>
      </div>

      <!-- ── Grouped notifications ────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Grouped notifications</MpText>
        <MpText size="label" color="text.secondary">
          Combine multiple goal requests into one notification.
        </MpText>
      </div>
      <div :class="fields">
        <MpToggle id="receive-grouped-requests" v-model:is-checked="receiveGroupedRequests">
          Receive grouped requests
        </MpToggle>
      </div>

      <!-- ── Goal update attachments ──────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Goal update attachments</MpText>
        <MpText size="label" color="text.secondary">
          Require employees to attach a file when updating their goals.
        </MpText>
      </div>
      <div :class="toggleGroup">
        <MpToggle id="attachment-individual" v-model:is-checked="attachmentRequired.individual">
          Required for individual goals
        </MpToggle>
        <MpToggle id="attachment-team" v-model:is-checked="attachmentRequired.team">
          Required for team goals
        </MpToggle>
        <MpToggle id="attachment-organization" v-model:is-checked="attachmentRequired.organization">
          Required for organization goals
        </MpToggle>
      </div>

      <!-- ── Date input for goal updates ──────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Date input for goal updates</MpText>
        <MpText size="label" color="text.secondary">
          Require an effective date for all goal updates.
        </MpText>
      </div>
      <div :class="toggleGroup">
        <MpToggle id="date-individual" v-model:is-checked="dateRequired.individual">
          Required for individual goals
        </MpToggle>
        <MpToggle id="date-team" v-model:is-checked="dateRequired.team">
          Required for team goals
        </MpToggle>
        <MpToggle id="date-organization" v-model:is-checked="dateRequired.organization">
          Required for organization goals
        </MpToggle>
        <MpToggle id="date-company" v-model:is-checked="dateRequired.company">
          Required for company goals
        </MpToggle>
      </div>

      <!-- ── Goal progress display ────────────────────────────────────── -->
      <div :class="sectionHeader">
        <MpText as="h2" :class="h2Class">Goal progress display</MpText>
        <MpText size="label" color="text.secondary">
          Choose how goal progress is displayed across the workspace.
        </MpText>
      </div>
      <div :class="fields">
        <MpToggle id="progress-actual-values" v-model:is-checked="displayProgressAsActualValues">
          Display progress as actual values
          <template #description>
            Display values such as 120 sales or Rp15,000,000 instead of 75% complete.
          </template>
        </MpToggle>
      </div>
    </div>
  </div>
</template>

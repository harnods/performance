<script setup lang="ts">
import {
  MpFlex,
  MpIcon,
  MpAvatar,
  MpText,
  MpTextlink,
  MpPopover,
  MpPopoverTrigger,
  MpPopoverContent,
  toast,
  css,
} from '@mekari/pixel3'
import { employeeById } from '~/utils/employees'
import { VIEW_AS_PERSONAS } from '~/composables/useCurrentUser'

function signOut() { /* hook real auth here */ }

const { currentUserId, setCurrentUser } = useCurrentUser()
const activeEmployee = computed(() => employeeById(currentUserId.value))

const { resetToSeed } = useGoalCyclesStore()
const { resetToSeed: resetGoalsToSeed } = useGoalsStore()
const { resetToSeed: resetReviewerWeights } = useReviewerWeightsStore()
const { clearRecorded: clearActivityLog } = useGoalActivityStore()
function resetDemoData() {
  resetToSeed()
  resetGoalsToSeed()
  resetReviewerWeights()
  clearActivityLog()
  toast.notify({
    id: 'demo-data-reset',
    position: 'top-center',
    variant: 'success',
    title: 'Demo data reset',
  })
}

const launcherButton = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  w: '8',
  h: '8',
  borderRadius: 'md',
  color: 'text.secondary',
  cursor: 'pointer',
  background: 'transparent',
  border: 'none',
  _hover: { bg: 'background.surface' },
})


const profileName = css({
  fontFamily: 'body', fontSize: 'md', lineHeight: 'lg',
  fontWeight: 'semiBold', color: 'text.default',
})

const profileCompany = css({
  fontFamily: 'body', fontSize: 'sm', lineHeight: 'xl',
  color: 'text.secondary',
})


const headerDivider = css({
  w: '1px', h: '20px', bg: 'border.default', flexShrink: 0,
})

const productDropdown = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '1',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: '0',
  fontFamily: 'body',
  fontSize: 'md',
  lineHeight: 'lg',
  fontWeight: 'regular',
  color: 'text.default',
  _hover: { color: 'text.link' },
  transition: 'color 120ms ease',
})

// ── User dropdown (ported from mekari-account/components/AppHeader.vue) ────
const profileTrigger = css({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '2',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: '1',
  borderRadius: 'md',
  _hover: { background: 'background.neutral.hovered' },
})

const popoverInner = css({ width: '320px' })

const popoverHeader = css({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2',
  paddingBlock: '4',
  paddingInline: '4',
  background: 'background.neutral.subtle',
  borderTopLeftRadius: 'md',
  borderTopRightRadius: 'md',
})

const menuRow = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  paddingInline: '4',
  height: '40px',
  width: '100%',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  fontFamily: 'body',
  fontSize: 'md',
  lineHeight: 'lg',
  color: 'text.default',
  cursor: 'pointer',
  _hover: { background: 'background.neutral.hovered' },
})

const popoverDivider = css({ height: '1px', background: 'border.default' })

const viewAsCaption = css({
  paddingInline: '4',
  paddingBlockStart: '3',
  paddingBlockEnd: '1',
  fontFamily: 'body',
  fontSize: 'sm',
  color: 'text.secondary',
})

const viewAsRow = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '2',
  paddingInline: '4',
  height: '48px',
  width: '100%',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  _hover: { background: 'background.neutral.hovered' },
})

const viewAsRowLabel = css({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0' })

const popoverFooter = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  paddingBlock: '3',
  paddingInline: '4',
})

const footerLinkRow = css({ display: 'flex', flexWrap: 'wrap', gap: '2' })
</script>

<template>
  <MpFlex
    as="header"
    align="center"
    justify="space-between"
    height="56px"
    paddingInline="6"
    background="background.neutral"
    borderBottom="1px solid"
    borderBottomColor="border.default"
    flexShrink="0"
  >
    <MpFlex align="center" gap="6">
      <!-- Talenta logo -->
      <svg width="130" height="34" viewBox="0 0 130 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Talenta" role="img">
        <path d="M121.821 20.1175C124.011 20.1175 125.663 20.5327 126.776 21.363C127.907 22.1757 128.472 23.483 128.472 25.285V33.5H124.815C124.815 32.7933 124.815 31.115 124.815 31.115H124.736C124.382 31.91 123.808 32.546 123.013 33.023C122.218 33.5 121.308 33.7385 120.284 33.7385C118.941 33.7385 117.828 33.3587 116.945 32.599C116.061 31.8217 115.62 30.7882 115.62 29.4985C115.62 28.1382 116.105 27.0782 117.077 26.3185C118.066 25.5588 119.338 25.179 120.893 25.179C122.253 25.179 123.393 25.4087 124.312 25.868V25.603C124.312 24.0483 123.305 23.271 121.291 23.271C120.089 23.271 118.764 23.5183 117.316 24.013L116.547 21.1245C118.243 20.4532 120.001 20.1175 121.821 20.1175ZM121.609 30.532C122.333 30.532 122.951 30.3377 123.464 29.949C123.976 29.5603 124.285 29.0215 124.391 28.3325C123.578 27.9085 122.704 27.6965 121.768 27.6965C121.149 27.6965 120.655 27.8202 120.284 28.0675C119.93 28.3148 119.754 28.677 119.754 29.154C119.754 29.5957 119.93 29.9402 120.284 30.1875C120.637 30.4172 121.079 30.532 121.609 30.532Z" fill="black"/>
        <path d="M107.244 16.8315H111.06V20.4885H114.372V23.6685H111.033V28.5975C111.033 29.7635 111.528 30.3465 112.517 30.3465C113.153 30.3465 113.683 30.2405 114.107 30.0285L114.982 33.2085C114.116 33.5442 113.197 33.7385 112.226 33.7915C110.689 33.8622 109.47 33.5 108.569 32.705C107.685 31.8923 107.244 30.5232 107.244 28.5975V23.6685H104.912V20.4885H107.244V16.8315Z" fill="black"/>
        <path d="M103.312 33.5H99.4699V26.5835C99.4699 24.5518 98.5689 23.536 96.7669 23.536C95.9013 23.5183 95.1858 23.8275 94.6204 24.4635C94.0728 25.0995 93.799 25.8592 93.799 26.7425V33.5H90.0359V20.409H93.6134V22.0785C94.6558 20.7182 96.0691 20.0557 97.8535 20.091C101.493 20.091 103.312 22.2463 103.312 26.557V33.5Z" fill="black"/>
        <path d="M88.2209 26.504C88.2209 27.0693 88.1679 27.617 88.0619 28.147H78.8929C78.9989 28.9067 79.3699 29.5073 80.0059 29.949C80.6419 30.373 81.3574 30.585 82.1524 30.585C83.4951 30.585 84.6788 30.1787 85.7034 29.366L87.4789 31.8305C86.1186 33.1378 84.2724 33.7915 81.9404 33.7915C79.8204 33.7915 78.0803 33.2085 76.7199 32.0425C75.3773 30.8588 74.7059 29.1717 74.7059 26.981C74.7059 24.8257 75.3949 23.1473 76.7729 21.946C78.1686 20.727 79.8381 20.1175 81.7814 20.1175C83.6894 20.1175 85.2353 20.6828 86.4189 21.8135C87.6203 22.9265 88.2209 24.49 88.2209 26.504ZM83.5569 23.907C83.0623 23.4653 82.4351 23.2445 81.6754 23.2445C80.9158 23.2445 80.2798 23.4653 79.7674 23.907C79.2551 24.331 78.9636 24.9582 78.8929 25.7885H84.2724C84.2901 24.9582 84.0516 24.331 83.5569 23.907Z" fill="black"/>
        <path d="M68.9107 14.9765H72.7002V33.5H68.9107V14.9765Z" fill="black"/>
        <path d="M59.5716 20.1175C61.7622 20.1175 63.4141 20.5327 64.5271 21.363C65.6577 22.1757 66.2231 23.483 66.2231 25.285V33.5H62.5661C62.5661 32.7933 62.5661 31.115 62.5661 31.115H62.4866C62.1332 31.91 61.5591 32.546 60.7641 33.023C59.9691 33.5 59.0592 33.7385 58.0346 33.7385C56.6919 33.7385 55.5789 33.3587 54.6956 32.599C53.8122 31.8217 53.3706 30.7882 53.3706 29.4985C53.3706 28.1382 53.8564 27.0782 54.8281 26.3185C55.8174 25.5588 57.0894 25.179 58.6441 25.179C60.0044 25.179 61.1439 25.4087 62.0626 25.868V25.603C62.0626 24.0483 61.0556 23.271 59.0416 23.271C57.8402 23.271 56.5152 23.5183 55.0666 24.013L54.2981 21.1245C55.9941 20.4532 57.7519 20.1175 59.5716 20.1175ZM59.3596 30.532C60.0839 30.532 60.7022 30.3377 61.2146 29.949C61.7269 29.5603 62.0361 29.0215 62.1421 28.3325C61.3294 27.9085 60.4549 27.6965 59.5186 27.6965C58.9002 27.6965 58.4056 27.8202 58.0346 28.0675C57.6812 28.3148 57.5046 28.677 57.5046 29.154C57.5046 29.5957 57.6812 29.9402 58.0346 30.1875C58.3879 30.4172 58.8296 30.532 59.3596 30.532Z" fill="black"/>
        <path d="M44.9945 16.8315H48.8105V20.4885H52.123V23.6685H48.784V28.5975C48.784 29.7635 49.2787 30.3465 50.268 30.3465C50.904 30.3465 51.434 30.2405 51.858 30.0285L52.7325 33.2085C51.8668 33.5442 50.9482 33.7385 49.9765 33.7915C48.4395 33.8622 47.2205 33.5 46.3195 32.705C45.4362 31.8923 44.9945 30.5232 44.9945 28.5975V23.6685H42.6625V20.4885H44.9945V16.8315Z" fill="black"/>
        <path d="M91.2175 3.57999V11.5H88.9135V3.57999H91.2175ZM88.7535 1.49999C88.7535 1.90532 88.8868 2.22532 89.1535 2.45999C89.4308 2.69465 89.7348 2.81199 90.0655 2.81199C90.3962 2.81199 90.6948 2.69465 90.9615 2.45999C91.2388 2.22532 91.3775 1.90532 91.3775 1.49999C91.3775 1.09465 91.2388 0.774654 90.9615 0.539988C90.6948 0.305321 90.3962 0.187988 90.0655 0.187988C89.7348 0.187988 89.4308 0.305321 89.1535 0.539988C88.8868 0.774654 88.7535 1.09465 88.7535 1.49999Z" fill="#9E9E9E"/>
        <path d="M82.1479 3.61199H84.4679V4.47599C84.9692 3.77199 85.6732 3.41999 86.5799 3.41999C87.3266 3.41999 87.9719 3.65999 88.5159 4.13999L87.5559 5.96399C87.1826 5.69732 86.7612 5.56399 86.2919 5.56399C85.7692 5.56399 85.3319 5.72932 84.9799 6.05999C84.6279 6.37999 84.4519 6.82266 84.4519 7.38799V11.5H82.1479V3.61199Z" fill="#9E9E9E"/>
        <path d="M76.7393 3.41999C78.0619 3.41999 79.0593 3.67066 79.7313 4.17199C80.4139 4.66266 80.7553 5.45199 80.7553 6.53999V11.5H78.5473C78.5473 11.0733 78.5473 10.06 78.5473 10.06H78.4993C78.2859 10.54 77.9393 10.924 77.4593 11.212C76.9793 11.5 76.4299 11.644 75.8113 11.644C75.0006 11.644 74.3286 11.4147 73.7953 10.956C73.2619 10.4867 72.9953 9.86266 72.9953 9.08399C72.9953 8.26266 73.2886 7.62266 73.8753 7.16399C74.4726 6.70532 75.2406 6.47599 76.1793 6.47599C77.0006 6.47599 77.6886 6.61466 78.2433 6.89199V6.73199C78.2433 5.79332 77.6353 5.32399 76.4193 5.32399C75.6939 5.32399 74.8939 5.47332 74.0193 5.77199L73.5553 4.02799C74.5793 3.62266 75.6406 3.41999 76.7393 3.41999ZM76.6113 9.70799C77.0486 9.70799 77.4219 9.59066 77.7313 9.35599C78.0406 9.12132 78.2273 8.79599 78.2913 8.37999C77.8006 8.12399 77.2726 7.99599 76.7073 7.99599C76.3339 7.99599 76.0353 8.07066 75.8113 8.21999C75.5979 8.36932 75.4913 8.58799 75.4913 8.87599C75.4913 9.14266 75.5979 9.35066 75.8113 9.49999C76.0246 9.63866 76.2913 9.70799 76.6113 9.70799Z" fill="#9E9E9E"/>
        <path d="M65.2416 0.315987H67.5456V6.69999L69.8816 3.61199H72.6016V3.75599L69.7056 7.32399L73.0496 11.324V11.5H70.2816L67.5456 8.02799V11.5H65.2416V0.315987Z" fill="#9E9E9E"/>
        <path d="M64.3439 7.27599C64.3439 7.61732 64.3119 7.94799 64.2479 8.26799H58.7119C58.7759 8.72666 58.9999 9.08932 59.3839 9.35599C59.7679 9.61199 60.1999 9.73999 60.6799 9.73999C61.4905 9.73999 62.2052 9.49466 62.8239 9.00399L63.8959 10.492C63.0745 11.2813 61.9599 11.676 60.5519 11.676C59.2719 11.676 58.2212 11.324 57.3999 10.62C56.5892 9.90532 56.1839 8.88666 56.1839 7.56399C56.1839 6.26266 56.5999 5.24932 57.4319 4.52399C58.2746 3.78799 59.2826 3.41999 60.4559 3.41999C61.6079 3.41999 62.5412 3.76132 63.2559 4.44399C63.9812 5.11599 64.3439 6.05999 64.3439 7.27599ZM61.5279 5.70799C61.2292 5.44132 60.8506 5.30799 60.3919 5.30799C59.9332 5.30799 59.5492 5.44132 59.2399 5.70799C58.9306 5.96399 58.7546 6.34266 58.7119 6.84399H61.9599C61.9706 6.34266 61.8266 5.96399 61.5279 5.70799Z" fill="#9E9E9E"/>
        <path d="M50.336 11.5H48.064V7.25999C48.064 6.10799 47.6107 5.53199 46.704 5.53199C46.2667 5.53199 45.92 5.70266 45.664 6.04399C45.408 6.38533 45.28 6.79599 45.28 7.27599V11.5H42.976V3.59599H45.152V4.49199C45.5573 3.77733 46.2507 3.41999 47.232 3.41999C48.3307 3.41999 49.0987 3.91066 49.536 4.89199C49.888 4.35866 50.2667 3.97999 50.672 3.75599C51.0773 3.52133 51.5733 3.40399 52.16 3.40399C53.0987 3.40399 53.856 3.69199 54.432 4.26799C55.0187 4.84399 55.312 5.81466 55.312 7.17999V11.5H52.992V7.22799C52.992 6.12933 52.592 5.57999 51.792 5.57999C51.3547 5.57999 51.0027 5.74533 50.736 6.07599C50.4693 6.39599 50.336 6.79066 50.336 7.25999V11.5Z" fill="#9E9E9E"/>
        <path d="M6.91254 30.8796L26.4945 24.4245C30.0455 23.3537 32.582 20.5808 32.582 16.9966C32.582 13.4492 30.0735 10.6988 26.6042 9.59531L6.91254 3.11152C5.00377 2.47397 2.9123 2.91944 1.90418 4.58074C0.896065 6.24001 1.52587 8.14857 3.07137 9.43797L12.1401 16.9966L3.07137 24.5552C1.52587 25.8365 0.896065 27.7532 1.90418 29.4125C2.9123 31.0717 4.99088 31.5356 6.91254 30.8817V30.8796Z" fill="#F22929"/>
      </svg>

      <!-- Divider -->
      <div :class="headerDivider" />

      <!-- Product dropdown -->
      <button type="button" :class="productDropdown" aria-haspopup="true">
        Performance
        <MpIcon name="caret-down" />
      </button>
    </MpFlex>

    <MpFlex align="center" gap="4">
      <NuxtLink to="/inbox/notifications" :class="launcherButton" aria-label="Inbox">
        <PxIcon name="inbox" :size="20" />
      </NuxtLink>

      <button type="button" :class="launcherButton" aria-label="App launcher">
        <PxIcon name="shortcuts" :size="20" />
      </button>

      <!-- User dropdown -->
      <MpPopover placement="bottom-end" trigger="click" use-portal>
        <MpPopoverTrigger>
          <button type="button" :class="profileTrigger" aria-label="Open user menu">
            <ClientOnly>
              <PxAvatar :name="activeEmployee?.name ?? ''" :src="activeEmployee?.photo" size="lg" variant="circle" variantColor="sky" />
            </ClientOnly>
            <MpFlex direction="column" align="flex-start">
              <span :class="profileName">{{ activeEmployee?.name }}</span>
              <span :class="profileCompany">PT Central Perk Indonesia</span>
            </MpFlex>
          </button>
        </MpPopoverTrigger>

        <MpPopoverContent>
          <div :class="popoverInner">
            <div :class="popoverHeader">
              <ClientOnly>
                <PxAvatar :name="activeEmployee?.name ?? ''" :src="activeEmployee?.photo" size="lg" variant="circle" variantColor="sky" />
              </ClientOnly>
              <MpFlex direction="column" align="center" gap="0.5">
                <MpText size="label" weight="semiBold" color="text.default">{{ activeEmployee?.name }}</MpText>
                <MpText size="label-small" color="text.secondary">PT Central Perk Indonesia</MpText>
              </MpFlex>
            </div>

            <div :class="popoverDivider" />

            <MpText size="label-small" :class="viewAsCaption">View as</MpText>
            <button
              v-for="persona in VIEW_AS_PERSONAS"
              :key="persona.id"
              type="button"
              :class="viewAsRow"
              @click="setCurrentUser(persona.id)"
            >
              <span :class="viewAsRowLabel">
                <MpText size="label" :class="profileName">{{ persona.label }}</MpText>
                <MpText size="label-small" color="text.secondary">{{ persona.role }}</MpText>
              </span>
              <MpIcon v-if="persona.id === currentUserId" name="check" size="sm" />
            </button>

            <div :class="popoverDivider" />

            <button type="button" :class="menuRow">
              <MpIcon name="add" size="sm" />
              Add another account
            </button>

            <div :class="popoverDivider" />

            <button type="button" :class="menuRow" @click="resetDemoData">
              <MpIcon name="refresh" size="sm" />
              Reset demo data
            </button>

            <div :class="popoverDivider" />

            <button type="button" :class="menuRow" @click="signOut">Sign out</button>

            <div :class="popoverDivider" />

            <div :class="popoverFooter">
              <div :class="footerLinkRow">
                <MpTextlink as="a" href="#" variant="primary"><MpText size="label-small">Privacy</MpText></MpTextlink>
                <MpTextlink as="a" href="#" variant="primary"><MpText size="label-small">Terms of use</MpText></MpTextlink>
                <MpTextlink as="a" href="#" variant="primary"><MpText size="label-small">About Mekari Talenta</MpText></MpTextlink>
              </div>
              <MpText size="overline" color="text.secondary">© {{ new Date().getFullYear() }} Mekari</MpText>
            </div>
          </div>
        </MpPopoverContent>
      </MpPopover>
    </MpFlex>
  </MpFlex>
</template>

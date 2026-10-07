<script setup lang="ts">
import { stayQuery } from '../utils/stayQuery'

const { t } = useI18n()
const route = useRoute()
const { step } = useFlowStep()
const { session } = useStaySession()

const title = computed(() => {
  if (route.path === '/book/confirmation') {
    return t('book.stepConfirmation')
  }

  if (route.path === '/book/details') {
    return session.value.hold ? t('book.stepPay') : t('book.stepDetails')
  }

  return t('book.stepRooms')
})

const isConfirmation = computed(() => route.path === '/book/confirmation')

const back = computed(() => {
  if (route.path === '/book/details' && session.value.search) {
    return { path: '/book/rooms', query: stayQuery(session.value.search) }
  }

  return '/'
})
</script>

<template>
  <div class="book">
    <header
      class="book-bar"
      :class="{ 'book-bar--plain': isConfirmation }"
    >
      <NuxtLink
        v-if="!isConfirmation"
        :to="back"
        :aria-label="t('book.back')"
      >
        ←
      </NuxtLink>
      <p class="book-bar-title">
        {{ title }}
      </p>
      <NuxtLink
        v-if="!isConfirmation"
        to="/"
        :aria-label="t('book.close')"
      >
        ×
      </NuxtLink>
    </header>
    <ShellEngineCrumbs v-if="step && step >= 2 && !isConfirmation" />
    <main class="book-main">
      <slot />
    </main>
    <ShellConsentBanner />
  </div>
</template>

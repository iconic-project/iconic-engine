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

const back = computed(() => {
  if (route.path === '/book/details' && session.value.search) {
    return { path: '/book/rooms', query: stayQuery(session.value.search) }
  }

  if (route.path === '/book/confirmation') {
    return '/'
  }

  return '/'
})
</script>

<template>
  <div class="book">
    <header class="book-bar">
      <NuxtLink
        :to="back"
        :aria-label="t('book.back')"
      >
        ←
      </NuxtLink>
      <p class="book-bar-title">
        {{ title }}
      </p>
      <NuxtLink
        to="/"
        :aria-label="t('book.close')"
      >
        ×
      </NuxtLink>
    </header>
    <ShellEngineCrumbs v-if="step && step >= 2" />
    <main class="book-main">
      <slot />
    </main>
    <ShellConsentBanner />
  </div>
</template>

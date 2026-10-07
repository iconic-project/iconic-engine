<script setup lang="ts">
import type { CheckoutStatus } from '../../types/api'
import { confirmationScreen, POLL_INTERVAL_MS } from '../../utils/confirmationPoll'

definePageMeta({ layout: 'book' })

const { t } = useI18n()
const route = useRoute()
const { request } = useApi()
const { session } = useStaySession()

useHead({ title: t('pages.confirmation') })

const pollStartedAt = ref(Date.now())
const nowTick = ref(Date.now())
const status = ref<CheckoutStatus | null>(null)
const purchased = ref(false)

const stayArrived = Boolean(
  session.value.confirmation
  || route.query.session_id
  || session.value.hold
)

if (import.meta.client && !stayArrived) {
  await navigateTo('/')
}

const path = computed(() =>
  session.value.confirmation?.path
  ?? status.value?.path
  ?? (route.query.session_id ? 'PAY_DEPOSIT' : 'PAY_LATER')
)

const screen = computed(() => confirmationScreen({
  path: path.value,
  now: nowTick.value,
  pollStartedAt: pollStartedAt.value,
  bookings: status.value?.bookings ?? [],
  stripeExpiresAt: status.value?.stripe_expires_at ?? null
}))

const references = computed(() =>
  session.value.confirmation?.references
  ?? status.value?.bookings.map(booking => booking.reference).filter((value): value is string => Boolean(value))
  ?? []
)

const email = computed(() =>
  session.value.confirmation?.email
  ?? status.value?.email
  ?? ''
)

const steps = computed(() => [
  t('confirm.paid1'),
  t('confirm.paid2'),
  t('confirm.paid3')
])

function firePurchase(): void {
  if (purchased.value) {
    return
  }

  purchased.value = true
  track('purchase', {
    transaction_id: references.value.join(','),
    value: session.value.quote?.total ?? 0,
    currency: 'USD'
  })
}

async function poll(): Promise<void> {
  const token = session.value.hold?.token

  if (!token) {
    return
  }

  status.value = await request(`/api/engine/checkout/${token}/status`) as CheckoutStatus
  nowTick.value = Date.now()

  if (confirmationScreen({
    path: path.value,
    now: nowTick.value,
    pollStartedAt: pollStartedAt.value,
    bookings: status.value?.bookings ?? [],
    stripeExpiresAt: status.value?.stripe_expires_at ?? null
  }) === 'confirmed') {
    firePurchase()
  }
}

onMounted(async () => {
  if (path.value !== 'PAY_DEPOSIT') {
    return
  }

  if (!session.value.hold?.token && !route.query.session_id) {
    await navigateTo('/')

    return
  }

  pollStartedAt.value = Date.now()
  nowTick.value = pollStartedAt.value
  await poll()

  const timer = setInterval(async () => {
    nowTick.value = Date.now()
    const next = confirmationScreen({
      path: path.value,
      now: nowTick.value,
      pollStartedAt: pollStartedAt.value,
      bookings: status.value?.bookings ?? [],
      stripeExpiresAt: status.value?.stripe_expires_at ?? null
    })

    if (next !== 'confirming') {
      clearInterval(timer)

      return
    }

    await poll()
  }, POLL_INTERVAL_MS)

  onUnmounted(() => {
    clearInterval(timer)
  })
})

const heading = computed(() => {
  switch (screen.value) {
    case 'confirmed':
      return { k: t('confirm.paidK'), t: t('confirm.paidTitle') }
    case 'expired':
      return { k: t('confirm.expiredK'), t: t('confirm.expiredTitle') }
    case 'processing':
      return { k: t('confirm.processingK'), t: t('confirm.processingTitle') }
    case 'confirming':
      return { k: t('confirm.confirmingK'), t: t('confirm.confirmingTitle') }
    default:
      return { k: t('confirm.requestK'), t: t('confirm.requestTitle') }
  }
})

const showSteps = computed(() => screen.value === 'pay_later' || screen.value === 'confirmed')
</script>

<template>
  <div class="book-card book-confirm">
    <div>
      <p class="book-kicker">
        {{ heading.k }}
      </p>
      <h1 class="disp">
        {{ heading.t }}
      </h1>
    </div>
    <StaySummary
      v-if="session.quote"
      :quote="session.quote"
      :due-label="t('confirm.deposit')"
    />
    <div
      v-if="references.length"
      class="book-ref"
    >
      <p class="book-kicker">
        {{ t('confirm.reference') }}
      </p>
      <p class="book-ref-id">
        {{ references.join(' · ') }}
      </p>
    </div>
    <p
      v-if="screen === 'confirming'"
      class="book-confirm-lead"
    >
      {{ t('confirm.confirmingLead') }}
    </p>
    <p
      v-else-if="screen === 'processing'"
      class="book-confirm-lead"
    >
      {{ t('confirm.processingLead', { email }) }}
      <a :href="`mailto:${t('search.contactEmail')}`">{{ t('search.contactEmail') }}</a>
    </p>
    <p
      v-else-if="screen === 'expired'"
      class="book-confirm-lead"
    >
      {{ t('confirm.expiredLead') }}
    </p>
    <p
      v-else-if="screen === 'confirmed'"
      class="book-confirm-lead"
    >
      {{ t('confirm.paidLead', { email }) }}
    </p>
    <p
      v-else
      class="book-confirm-lead"
    >
      {{ t('confirm.requestLead', { email }) }}
    </p>
    <ol
      v-if="showSteps"
      class="book-steps"
    >
      <li
        v-for="(step, index) in steps"
        :key="step"
      >
        <span class="book-step-n">{{ index + 1 }}</span>
        <span>{{ step }}</span>
      </li>
    </ol>
    <UButton
      to="/"
      color="neutral"
      variant="outline"
      class="self-start"
    >
      {{ t('confirm.return') }}
    </UButton>
  </div>
</template>

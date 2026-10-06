<script setup lang="ts">
import type { CheckoutStatus } from '../../types/api'
import { confirmationScreen, POLL_INTERVAL_MS } from '../../utils/confirmationPoll'

const { t } = useI18n()
const route = useRoute()
const { flow } = useBookingFlow()
const checkout = useCheckout()
const { data: feed } = useEngineFeed()
const { session } = useStaySession()

useHead({ title: t('pages.confirmation') })

const pollStartedAt = ref(Date.now())
const nowTick = ref(Date.now())
const status = ref<CheckoutStatus | null>(null)
const purchased = ref(false)

const stayArrived = Boolean(
  flow.value.confirmation
  || session.value.confirmation
  || route.query.session_id
  || flow.value.checkoutToken
  || session.value.hold
)

if (import.meta.client && !stayArrived) {
  await navigateTo('/')
}

const path = computed(() =>
  session.value.confirmation?.path
  ?? flow.value.confirmation?.path
  ?? status.value?.path
  ?? (route.query.session_id ? 'PAY_DEPOSIT' : flow.value.path)
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
  ?? flow.value.confirmation?.references
  ?? status.value?.bookings.map(booking => booking.reference).filter((value): value is string => Boolean(value))
  ?? []
)

const email = computed(() =>
  session.value.confirmation?.email
  ?? flow.value.confirmation?.email
  ?? status.value?.email
  ?? flow.value.email
)

const sla = computed(() => feed.value?.settings.policies.response_sla_hours ?? 24)
const steps = computed(() => {
  const raw = feed.value?.settings.copy.confirmation_steps ?? []

  return raw.map((step, index) => {
    if (index === 0) {
      return step.replace(/\d+\s+hours?/, `${sla.value} hours`)
    }

    return step
  })
})

function firePurchase(): void {
  if (purchased.value) {
    return
  }

  purchased.value = true
  track('purchase', {
    transaction_id: references.value.join(','),
    value: flow.value.serverQuote?.total ?? 0,
    currency: 'USD'
  })
}

async function poll(): Promise<void> {
  const token = flow.value.checkoutToken ?? session.value.hold?.token

  if (!token) {
    return
  }

  status.value = await checkout.status(token)
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

  if (!flow.value.checkoutToken && !route.query.session_id) {
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
</script>

<template>
  <div class="confirm">
    <span class="mono klabel">{{ heading.k }}</span>
    <h1 class="disp">
      {{ heading.t }}
    </h1>
    <StaySummary
      v-if="session.quote"
      :quote="session.quote"
    />
    <div
      v-if="references.length"
      class="bigid"
    >
      {{ references.join(' · ') }}
    </div>
    <p
      v-if="screen === 'confirming'"
      class="sub"
    >
      {{ t('confirm.confirmingLead') }}
    </p>
    <p
      v-else-if="screen === 'processing'"
      class="sub"
    >
      {{ t('confirm.processingLead', { email }) }}
      <a :href="`mailto:${t('search.contactEmail')}`">{{ t('search.contactEmail') }}</a>
    </p>
    <p
      v-else-if="screen === 'expired'"
      class="sub"
    >
      {{ t('confirm.expiredLead') }}
    </p>
    <p
      v-else-if="screen === 'confirmed'"
      class="sub"
    >
      {{ t('confirm.paidLead', { email }) }}
    </p>
    <p
      v-else
      class="sub"
    >
      {{ t('confirm.requestLead', { email }) }}
    </p>
    <div
      v-if="screen === 'pay_later'"
      class="next3"
    >
      <div
        v-for="(step, index) in steps"
        :key="step"
        class="nx"
      >
        <div class="n">
          {{ index + 1 }}
        </div>
        <p>{{ step }}</p>
      </div>
    </div>
    <div
      v-else-if="screen === 'confirmed'"
      class="next3"
    >
      <div class="nx">
        <div class="n">
          1
        </div>
        <p>{{ t('confirm.paid1') }}</p>
      </div>
      <div class="nx">
        <div class="n">
          2
        </div>
        <p>{{ t('confirm.paid2') }}</p>
      </div>
      <div class="nx">
        <div class="n">
          3
        </div>
        <p>{{ t('confirm.paid3') }}</p>
      </div>
    </div>
    <NuxtLink
      to="/"
      class="btn o"
    >
      {{ t('confirm.return') }}
    </NuxtLink>
  </div>
</template>

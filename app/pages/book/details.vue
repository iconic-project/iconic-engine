<script setup lang="ts">
import type { StayQuote } from '../../types/stay'

type QuoteBody = StayQuote

type HoldBody = {
  token: string
  expires_at: string
}

type SubmitBody = {
  path: string
  references?: Array<string>
  email?: string
  checkout_url?: string
}

type ErrorData = {
  message?: string
  quote?: { total?: number }
}

definePageMeta({ layout: 'book' })

const { t } = useI18n()
const { request } = useApi()
const { format } = useMoney()
const { session } = useStaySession()
const requestUrl = useRequestURL()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const phone = ref('')
const path = ref<'PAY_LATER' | 'PAY_DEPOSIT'>('PAY_LATER')
const accepted = ref<Array<string>>([])
const formError = ref('')
const priceChanged = ref(false)
const expectedTotal = ref<number | null>(null)
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

useSeoMeta({ title: () => t('pages.details') })
useHead({
  link: [{ rel: 'canonical', href: `${requestUrl.origin}/book/details` }]
})

if (!session.value.lines.length) {
  await navigateTo('/book/rooms')
}

const quote = computed(() => session.value.quote)

const documents = ['TERMS', 'CANCELLATION', 'PRIVACY', 'INSURANCE'] as const

function declarationLabel(code: typeof documents[number]): string {
  switch (code) {
    case 'TERMS':
      return t('stayShop.declarations.TERMS')
    case 'CANCELLATION':
      return t('stayShop.declarations.CANCELLATION')
    case 'PRIVACY':
      return t('stayShop.declarations.PRIVACY')
    case 'INSURANCE':
      return t('stayShop.declarations.INSURANCE')
  }
}

const payPaths = computed(() => [
  {
    label: t('stayShop.payLater'),
    description: t('stayShop.payLaterHint'),
    value: 'PAY_LATER' as const
  },
  {
    label: t('stayShop.payDeposit'),
    description: t('stayShop.payDepositHint', { amount: format(quote.value?.deposit ?? 0) }),
    value: 'PAY_DEPOSIT' as const
  }
])

const detailsReady = computed(() =>
  firstName.value.trim() !== ''
  && lastName.value.trim() !== ''
  && email.value.trim() !== ''
  && documents.every(code => accepted.value.includes(code))
)

const remaining = computed(() => {
  const expires = session.value.hold?.expiresAt

  if (!expires) {
    return ''
  }

  const ms = new Date(expires).getTime() - now.value

  if (ms <= 0) {
    return '0:00'
  }

  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)

  return `${minutes}:${String(seconds).padStart(2, '0')}`
})

onMounted(async () => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  await loadQuote()
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
})

function errorData(error: unknown): ErrorData {
  if (typeof error === 'object' && error !== null && 'data' in error) {
    const data = (error as { data?: ErrorData }).data

    return data ?? {}
  }

  return {}
}

function statusOf(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const status = (error as { statusCode?: number }).statusCode

    return typeof status === 'number' ? status : null
  }

  return null
}

async function loadQuote(): Promise<void> {
  if (session.value.quote || session.value.lines.length === 0 || !session.value.search) {
    return
  }

  const search = session.value.search

  try {
    const body = await request('/api/engine/quote', {
      method: 'POST',
      body: {
        check_in: search.checkIn,
        check_out: search.checkOut,
        rooms: session.value.lines
      }
    }) as QuoteBody
    session.value.quote = body
    expectedTotal.value = body.total
  } catch (error: unknown) {
    formError.value = errorData(error).message ?? ''
  }
}

function setDoc(code: string, value: boolean | 'indeterminate'): void {
  toggleDoc(code, value === true)
}

function toggleDoc(code: string, on: boolean): void {
  accepted.value = on
    ? [...accepted.value, code]
    : accepted.value.filter(item => item !== code)
}

async function holdRooms(): Promise<void> {
  const current = session.value.quote

  if (!current || !firstName.value || !lastName.value || !email.value) {
    return
  }

  if (documents.some(code => !accepted.value.includes(code))) {
    return
  }

  try {
    const created = await request('/api/engine/checkout', {
      method: 'POST',
      body: {
        quote_token: current.quote_token,
        first_name: firstName.value,
        last_name: lastName.value,
        email: email.value,
        phone: phone.value || null,
        preferred_channel: 'EMAIL',
        declarations: [...documents]
      }
    }) as HoldBody
    session.value.hold = {
      token: created.token,
      expiresAt: created.expires_at,
      extended: false
    }
    formError.value = ''
  } catch (error: unknown) {
    const data = errorData(error)

    if (statusOf(error) === 409 && typeof data.quote?.total === 'number') {
      priceChanged.value = true
      expectedTotal.value = data.quote.total
    }

    formError.value = data.message ?? ''
  }
}

async function extendHold(): Promise<void> {
  const hold = session.value.hold

  if (!hold || hold.extended) {
    return
  }

  const extended = await request(`/api/engine/checkout/${hold.token}/extend`, {
    method: 'POST'
  }) as { expires_at: string, extended: boolean }
  session.value.hold = {
    token: hold.token,
    expiresAt: extended.expires_at,
    extended: extended.extended
  }
}

async function submit(): Promise<void> {
  const hold = session.value.hold
  const total = expectedTotal.value ?? session.value.quote?.total

  if (!hold || total === null || total === undefined) {
    return
  }

  try {
    const result = await request(`/api/engine/checkout/${hold.token}/submit`, {
      method: 'POST',
      body: {
        path: path.value,
        expected_total: total
      }
    }) as SubmitBody

    if (result.checkout_url) {
      await navigateTo(result.checkout_url, { external: true })

      return
    }

    session.value.confirmation = {
      path: path.value,
      references: result.references ?? [],
      email: result.email ?? email.value
    }
    await navigateTo('/book/confirmation')
  } catch (error: unknown) {
    const data = errorData(error)

    if (statusOf(error) === 409 && typeof data.quote?.total === 'number') {
      priceChanged.value = true
      expectedTotal.value = data.quote.total
      formError.value = data.message ?? t('stayShop.priceChanged')

      return
    }

    formError.value = data.message ?? ''
  }
}
</script>

<template>
  <div>
    <p
      v-if="formError && !quote"
      class="book-error"
    >
      {{ formError }}
    </p>
    <div
      v-if="quote"
      class="book-card"
    >
      <h1 class="disp">
        {{ session.hold ? t('book.stepPay') : t('stayShop.yourDetails') }}
      </h1>
      <StaySummary :quote="quote" />
      <div
        v-if="session.hold"
        class="book-hold"
      >
        <div>
          <p class="book-hold-label">
            {{ t('stayShop.hold') }}
          </p>
          <p class="book-hold-time">
            {{ t('stayShop.holdLeft', { time: remaining }) }}
          </p>
        </div>
        <UButton
          v-if="!session.hold.extended"
          type="button"
          color="neutral"
          variant="outline"
          @click="extendHold"
        >
          {{ t('stayShop.extend') }}
        </UButton>
      </div>
      <form
        class="details"
        @submit.prevent="session.hold ? submit() : holdRooms()"
      >
        <div
          v-if="!session.hold"
          class="book-fields"
        >
          <UFormField
            :label="t('stayShop.firstName')"
            required
          >
            <UInput
              v-model="firstName"
              autocomplete="given-name"
              required
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('stayShop.lastName')"
            required
          >
            <UInput
              v-model="lastName"
              autocomplete="family-name"
              required
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('stayShop.email')"
            required
            class="book-span"
          >
            <UInput
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="w-full"
            />
          </UFormField>
          <UFormField
            :label="t('stayShop.phone')"
            class="book-span"
          >
            <UInput
              v-model="phone"
              type="tel"
              autocomplete="tel"
              class="w-full"
            />
          </UFormField>
          <div class="book-declarations">
            <UCheckbox
              v-for="code in documents"
              :key="code"
              :model-value="accepted.includes(code)"
              :label="declarationLabel(code)"
              @update:model-value="setDoc(code, $event)"
            />
          </div>
        </div>
        <URadioGroup
          v-else
          v-model="path"
          variant="card"
          color="primary"
          size="lg"
          :items="payPaths"
          :ui="{
            fieldset: 'w-full gap-2',
            item: 'w-full',
            label: 'font-normal',
            description: 'font-normal'
          }"
        />
        <p
          v-if="priceChanged"
          class="book-error"
        >
          {{ t('stayShop.priceChanged') }}
          <AnkMoney
            v-if="expectedTotal !== null"
            :amount="expectedTotal"
          />
        </p>
        <p
          v-if="formError"
          class="book-error"
        >
          {{ formError }}
        </p>
        <UButton
          type="submit"
          color="primary"
          size="lg"
          block
          :disabled="!session.hold && !detailsReady"
        >
          {{ session.hold ? t('book.stepPay') : t('stayShop.holdRooms') }}
        </UButton>
      </form>
    </div>
  </div>
</template>

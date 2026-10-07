<script setup lang="ts">
import type { AvailabilityQuote, AvailabilityType } from '../../types/stay'
import { engineErrorMessage } from '../../utils/engineError'
import { submitSessionId } from '../../utils/engineSession'
import { parseReason, roomsLeftLabel } from '../../utils/stayReasons'

const props = withDefaults(defineProps<{
  roomType: AvailabilityType
  threshold: number
  quantity: number
  maxQuantity: number
  plan: string
  checkIn?: string
  checkOut?: string
  adults?: number
  children?: number
  photo?: string | null
  description?: string | null
  bed?: string | null
  sleeps?: number | null
  planNames?: Record<string, string>
}>(), {
  checkIn: '',
  checkOut: '',
  adults: 1,
  children: 0,
  photo: null,
  description: null,
  bed: null,
  sleeps: null,
  planNames: () => ({})
})

const emit = defineEmits<{
  'update:quantity': [number]
  'update:plan': [string]
  'changeNights': [number]
}>()

const { t } = useI18n()
const { format } = useMoney()
const { request } = useApi()

const joinName = ref('')
const joinEmail = ref('')
const joining = ref(false)
const joined = ref(false)
const joinError = ref('')

const canJoin = computed(() => props.roomType.waitlist_enabled && props.roomType.reasons.includes('SOLD_OUT'))

async function joinWaitlist(): Promise<void> {
  if (props.checkIn === '' || props.checkOut === '' || joinName.value.trim() === '' || joinEmail.value.trim() === '') {
    joinError.value = t('details.formError')

    return
  }

  joining.value = true
  joinError.value = ''

  try {
    const sessionId = submitSessionId()

    await request('/api/engine/waitlist', {
      method: 'POST',
      body: {
        room_type: props.roomType.code,
        check_in: props.checkIn,
        check_out: props.checkOut,
        contact: {
          name: joinName.value.trim(),
          email: joinEmail.value.trim()
        },
        adults: props.adults,
        children: props.children,
        ...(sessionId ? { session_id: sessionId } : {})
      }
    })
    joined.value = true
  } catch (caught) {
    joinError.value = engineErrorMessage(caught)
  } finally {
    joining.value = false
  }
}

const left = computed(() => roomsLeftLabel(props.roomType.rooms_left, props.threshold))

const reasons = computed(() => props.roomType.reasons.map(code => parseReason(code)))

function nightAmount(item: AvailabilityQuote | null): number | null {
  if (!item || item.night_lines.length === 0) {
    return null
  }

  return Math.min(...item.night_lines.map(line => line.total))
}

function planName(code: string): string {
  return props.planNames[code] ?? code
}

const lowestPlan = computed(() => {
  const quotes = props.roomType.quotes

  if (quotes.length < 2) {
    return ''
  }

  return quotes.reduce((lowest, item) => item.total < lowest.total ? item : lowest).rate_plan
})

function choosePlan(code: string): void {
  emit('update:plan', code)

  if (props.quantity === 0) {
    emit('update:quantity', 1)
  }
}

function setQuantity(event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  emit('update:quantity', Number(target.value))
}

function reasonText(reason: ReturnType<typeof parseReason>): string {
  const count = reason.n ?? 0

  switch (reason.key) {
    case 'minStay':
      return t('stayShop.reasons.minStay', { n: count })
    case 'maxStay':
      return t('stayShop.reasons.maxStay', { n: count })
    case 'soldOut':
      return t('stayShop.reasons.soldOut')
    case 'closedToArrival':
      return t('stayShop.reasons.closedToArrival')
    case 'closedToDeparture':
      return t('stayShop.reasons.closedToDeparture')
    case 'overOccupancy':
      return t('stayShop.reasons.overOccupancy')
    case 'noRate':
      return t('stayShop.reasons.noRate')
    case 'stopSell':
      return t('stayShop.reasons.stopSell')
    case 'noSingleRoom':
      return t('stayShop.reasons.noSingleRoom')
    default:
      return reason.code
  }
}
</script>

<template>
  <article class="book-room">
    <header>
      <h2 class="disp">
        {{ roomType.name }}
      </h2>
      <p
        v-if="left !== null"
        class="left"
      >
        {{ t('stayShop.onlyLeft', { n: left }) }}
      </p>
    </header>

    <p
      v-for="reason in reasons"
      :key="reason.code"
      class="reason"
    >
      {{ reasonText(reason) }}
      <UButton
        v-if="reason.key === 'minStay' && reason.n !== null"
        type="button"
        size="sm"
        color="neutral"
        variant="outline"
        @click="emit('changeNights', reason.n)"
      >
        {{ t('stayShop.changeNights', { n: reason.n }) }}
      </UButton>
    </p>

    <form
      v-if="canJoin"
      class="field"
      @submit.prevent="joinWaitlist"
    >
      <p>{{ t('stayShop.waitlistLead') }}</p>
      <p class="mono">
        {{ roomType.name }} · {{ t('stayShop.waitlistStay', { checkIn, checkOut }) }}
      </p>
      <p v-if="joined">
        {{ t('stayShop.waitlistThanks') }}
      </p>
      <template v-else>
        <label>
          {{ t('stayShop.waitlistName') }}
          <input v-model="joinName">
        </label>
        <label>
          {{ t('stayShop.waitlistEmail') }}
          <input
            v-model="joinEmail"
            type="email"
          >
        </label>
        <p v-if="joinError">
          {{ joinError }}
        </p>
        <UButton
          type="submit"
          :loading="joining"
          :disabled="joining"
        >
          {{ t('stayShop.joinWaitlist') }}
        </UButton>
      </template>
    </form>

    <img
      v-if="photo"
      class="book-room-photo"
      :src="photo"
      :alt="roomType.name"
    >
    <p
      v-if="description"
      class="book-room-copy"
    >
      {{ description }}
    </p>
    <ul
      v-if="bed || sleeps"
      class="book-room-facts"
    >
      <li v-if="bed">
        {{ bed }}
      </li>
      <li v-if="sleeps">
        {{ t('book.sleeps', { n: sleeps }) }}
      </li>
    </ul>

    <h3
      v-if="roomType.quotes.length"
      class="book-rates-title"
    >
      {{ t('book.rates') }}
    </h3>
    <div
      v-if="roomType.quotes.length"
      class="plans"
    >
      <label
        v-for="item in roomType.quotes"
        :key="item.rate_plan"
        class="book-rate"
        :class="{ 'book-rate--on': plan === item.rate_plan && quantity > 0 }"
      >
        <input
          type="radio"
          :name="`plan-${roomType.code}`"
          :value="item.rate_plan"
          :checked="plan === item.rate_plan"
          @change="choosePlan(item.rate_plan)"
        >
        <span
          v-if="item.rate_plan === lowestPlan"
          class="book-badge"
        >{{ t('book.lowest') }}</span>
        <p
          v-if="nightAmount(item) !== null"
          class="book-rate-price"
        >
          {{ t('book.perNightLabel', { price: format(nightAmount(item) ?? 0) }) }}
        </p>
        <p class="book-rate-name">
          {{ planName(item.rate_plan) }}
        </p>
        <p class="book-rate-meta">
          {{ format(item.total) }} {{ t('stayShop.forStay') }}
          <span
            v-if="nightAmount(item) !== null"
            class="book-sr"
          >{{ format(nightAmount(item) ?? 0) }} {{ t('stayShop.perNight') }}</span>
        </p>
      </label>
    </div>

    <label
      v-if="roomType.bookable"
      class="qty"
    >
      {{ t('stayShop.quantity') }}
      <input
        type="number"
        min="0"
        :max="maxQuantity"
        :value="quantity"
        @input="setQuantity"
      >
    </label>
  </article>
</template>

<script setup lang="ts">
import type { CalendarFeed, CalendarNight } from '../../types/stay'
import type { StaySearch } from '../../utils/stayQuery'

const props = defineProps<{
  minNights: number
  maxNights: number
  maxRooms: number
  childMinAge: number
  childMaxAge: number
  propertyName?: string
  initial?: StaySearch | null
}>()

const emit = defineEmits<{
  search: [StaySearch]
}>()

const { request } = useApi()
const { t } = useI18n()

const range = ref<{ check_in: string, check_out: string } | null>(
  props.initial
    ? { check_in: props.initial.checkIn, check_out: props.initial.checkOut }
    : null
)
const adults = ref(props.initial?.adults ?? 2)
const rooms = ref(props.initial?.rooms ?? 1)
const childAges = ref<Array<number>>(props.initial ? [...props.initial.childAges] : [])
const nights = ref<Record<string, CalendarNight>>({})

const month = computed(() => {
  const from = range.value?.check_in ?? new Date().toISOString().slice(0, 10)

  return from.slice(0, 7)
})

const agesReady = computed(() =>
  childAges.value.every(age => Number.isInteger(age) && age >= props.childMinAge && age <= props.childMaxAge)
)

watch(month, () => {
  void loadCalendar()
}, { immediate: true })

watch([adults, () => childAges.value.length], () => {
  void loadCalendar()
})

function setAge(index: number, event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  childAges.value[index] = Number(target.value)
}

async function loadCalendar(): Promise<void> {
  try {
    const feed = await request(
      `/api/engine/calendar?from=${month.value}&months=3&adults=${adults.value}&children=${childAges.value.length}`
    ) as CalendarFeed
    const map: Record<string, CalendarNight> = {}

    for (const night of feed.nights) {
      map[night.night] = night
    }

    nights.value = map
  } catch {
    nights.value = {}
  }
}

function nightInfo(date: string): { disabled?: boolean, closedToArrival?: boolean, closedToDeparture?: boolean, minStay?: number, price?: number } {
  const night = nights.value[date]

  if (!night) {
    return {}
  }

  return {
    disabled: !night.available,
    closedToArrival: night.closed_to_arrival,
    closedToDeparture: night.closed_to_departure,
    minStay: night.min_stay,
    ...(night.from_price === null ? {} : { price: night.from_price })
  }
}

function submit(): void {
  if (!range.value || !agesReady.value) {
    return
  }

  emit('search', {
    checkIn: range.value.check_in,
    checkOut: range.value.check_out,
    adults: adults.value,
    childAges: [...childAges.value],
    rooms: rooms.value
  })
}

function stepAdults(delta: number): void {
  adults.value = Math.max(1, adults.value + delta)
}

function stepChildren(delta: number): void {
  setChildrenCount(Math.max(0, childAges.value.length + delta))
}

function setChildrenCount(next: number): void {
  childAges.value = Array.from({ length: next }, (_, index) => childAges.value[index] ?? props.childMinAge)
}

function stepRooms(delta: number): void {
  rooms.value = Math.min(props.maxRooms, Math.max(1, rooms.value + delta))
}
</script>

<template>
  <form
    class="book-search"
    @submit.prevent="submit"
  >
    <p class="book-kicker">
      {{ t('book.destination') }}
    </p>
    <p
      v-if="propertyName"
      class="book-destination"
    >
      {{ propertyName }}
    </p>

    <AnkStayInput
      v-model="range"
      :min-nights="minNights"
      :max-nights="maxNights"
      :months="1"
      :night-info="nightInfo"
    />
    <p class="book-note">
      {{ t('book.priceNote') }}
    </p>

    <p class="book-kicker">
      {{ t('book.guests') }}
    </p>
    <div class="book-guest">
      <div>
        <p class="book-guest-label">
          {{ t('stayShop.adults') }}
        </p>
        <p class="book-guest-note">
          {{ t('book.adultNote', { age: childMaxAge + 1 }) }}
        </p>
      </div>
      <div class="book-stepper">
        <button
          type="button"
          :disabled="adults <= 1"
          @click="stepAdults(-1)"
        >
          −
        </button>
        <span>{{ adults }}</span>
        <button
          type="button"
          @click="stepAdults(1)"
        >
          +
        </button>
      </div>
    </div>
    <div class="book-guest">
      <div>
        <p class="book-guest-label">
          {{ t('stayShop.children') }}
        </p>
        <p class="book-guest-note">
          {{ t('book.childNote', { min: childMinAge, max: childMaxAge }) }}
        </p>
      </div>
      <div class="book-stepper">
        <button
          type="button"
          :disabled="childAges.length === 0"
          @click="stepChildren(-1)"
        >
          −
        </button>
        <span>{{ childAges.length }}</span>
        <button
          type="button"
          @click="stepChildren(1)"
        >
          +
        </button>
      </div>
    </div>
    <label
      v-for="(age, index) in childAges"
      :key="index"
      class="book-age"
    >
      {{ t('stayShop.childAge', { n: index + 1 }) }}
      <input
        :value="age"
        type="number"
        :min="childMinAge"
        :max="childMaxAge"
        @input="setAge(index, $event)"
      >
    </label>

    <button
      type="button"
      class="book-add"
      :disabled="rooms >= maxRooms"
      @click="stepRooms(1)"
    >
      {{ t('book.addRoom') }}
    </button>
    <div
      v-if="rooms > 1"
      class="book-guest"
    >
      <p class="book-guest-label">
        {{ t('stayShop.rooms') }}
      </p>
      <div class="book-stepper">
        <button
          type="button"
          @click="stepRooms(-1)"
        >
          −
        </button>
        <span>{{ rooms }}</span>
        <button
          type="button"
          :disabled="rooms >= maxRooms"
          @click="stepRooms(1)"
        >
          +
        </button>
      </div>
    </div>

    <button
      type="submit"
      class="book-search-btn"
      :disabled="range === null || !agesReady"
    >
      {{ t('book.search') }}
    </button>
  </form>
</template>

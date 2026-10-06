<script setup lang="ts">
import type { CalendarFeed, CalendarNight } from '../../types/stay'
import type { StaySearch } from '../../utils/stayQuery'

const props = defineProps<{
  minNights: number
  maxNights: number
  maxRooms: number
  childMinAge: number
  childMaxAge: number
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

function setChildren(event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  const next = Math.max(0, Number(target.value))
  childAges.value = Array.from({ length: next }, (_, index) => childAges.value[index] ?? props.childMinAge)
}

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
</script>

<template>
  <form
    class="stay-search"
    @submit.prevent="submit"
  >
    <AnkStayInput
      v-model="range"
      :min-nights="minNights"
      :max-nights="maxNights"
      :night-info="nightInfo"
    />
    <label>
      {{ t('stayShop.adults') }}
      <input
        v-model.number="adults"
        type="number"
        min="1"
      >
    </label>
    <label>
      {{ t('stayShop.children') }}
      <input
        :value="childAges.length"
        type="number"
        min="0"
        @input="setChildren"
      >
    </label>
    <label
      v-for="(age, index) in childAges"
      :key="index"
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
    <label>
      {{ t('stayShop.rooms') }}
      <input
        v-model.number="rooms"
        type="number"
        min="1"
        :max="maxRooms"
      >
    </label>
    <UButton
      type="submit"
      :disabled="range === null || !agesReady"
      @click="submit"
    >
      {{ t('stayShop.check') }}
    </UButton>
  </form>
</template>

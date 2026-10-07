<script setup lang="ts">
import type { AvailabilityFeed, AvailabilityType, PropertyFeed, StayRoomType } from '../../types/stay'
import { mediaUrl } from '../../utils/mediaUrl'
import { distributeParty, previewParty, type PlannedRoom } from '../../utils/partyPlan'
import { addNights, applyPick, nightsBetween, parsePicks, parseStayQuery, stayQuery, type StayPick } from '../../utils/stayQuery'

definePageMeta({ layout: 'book' })

const route = useRoute()
const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()
const { session } = useStaySession()
const config = useRuntimeConfig()
const requestUrl = useRequestURL()

const search = computed(() => parseStayQuery(route.query))
const picks = ref<Array<StayPick>>(parsePicks(route.query.pick))
const plans = ref<Record<string, string>>({})

const { data: property } = await useAsyncData('engine-property', () =>
  request('/api/engine/property') as Promise<PropertyFeed>
)

const { data: availability, error: availabilityError } = await useAsyncData(
  () => {
    const current = search.value

    return current
      ? `engine-availability-${current.checkIn}-${current.checkOut}-${current.adults}-${current.childAges.join('.')}-${current.rooms}`
      : 'engine-availability-empty'
  },
  () => {
    const current = search.value

    if (!current) {
      return Promise.resolve(null)
    }

    const preview = previewParty(current.adults, current.childAges, current.rooms)
    const ages = preview.childAges.join(',')
    const query = `check_in=${current.checkIn}&check_out=${current.checkOut}&adults=${preview.adults}&rooms=1${ages ? `&child_ages=${ages}` : ''}`

    return request(`/api/engine/availability?${query}`) as Promise<AvailabilityFeed>
  }
)

const loadError = computed(() => {
  const error = availabilityError.value

  if (!error || typeof error !== 'object') {
    return ''
  }

  if ('data' in error) {
    const data = (error as { data?: { message?: string } }).data

    if (data?.message) {
      return data.message
    }
  }

  return t('stayShop.loadError')
})

useSeoMeta({ title: () => t('stayShop.results') })
useHead({
  link: [{ rel: 'canonical', href: requestUrl.href }]
})

function quantityOf(code: string): number {
  return picks.value.find(pick => pick.roomType === code)?.quantity ?? 0
}

function planOf(code: string): string {
  return plans.value[code]
    ?? picks.value.find(pick => pick.roomType === code)?.ratePlan
    ?? property.value?.default_rate_plan
    ?? ''
}

function maxQuantity(roomsLeft: number, threshold: number): number {
  const cap = property.value?.settings.stay.max_rooms_per_booking ?? roomsLeft
  const requested = search.value?.rooms ?? cap
  const inventoryCap = roomsLeft <= threshold ? Math.min(roomsLeft, cap) : cap

  return Math.min(inventoryCap, requested)
}

function setPick(code: string, quantity: number, ratePlan: string): void {
  const current = search.value

  if (!current) {
    return
  }

  picks.value = applyPick(picks.value, current.rooms, code, quantity, ratePlan)
  void navigateTo({ path: '/book/rooms', query: stayQuery(current, picks.value) }, { replace: true })
}

function chooseRoomPlan(code: string, ratePlan: string): void {
  plans.value[code] = ratePlan
  setPick(code, Math.max(quantityOf(code), 1), ratePlan)
}

function changeNights(nights: number): void {
  const current = search.value

  if (!current) {
    return
  }

  void navigateTo({
    path: '/book/rooms',
    query: stayQuery({ ...current, checkOut: addNights(current.checkIn, nights) }, picks.value)
  })
}

const chosen = computed(() => picks.value.reduce((sum, pick) => sum + pick.quantity, 0))

const partyOk = computed(() => {
  const current = search.value
  const feed = property.value

  if (!current || !feed || chosen.value !== current.rooms) {
    return false
  }

  const rooms: Array<PlannedRoom> = []

  for (const pick of picks.value) {
    const type = feed.room_types.find(item => item.code === pick.roomType)

    if (!type) {
      return false
    }

    for (let index = 0; index < pick.quantity; index += 1) {
      rooms.push({
        roomType: pick.roomType,
        ratePlan: pick.ratePlan,
        occupancy: {
          maxAdults: type.max_adults,
          maxChildren: type.max_children,
          maxOccupancy: type.max_occupancy
        }
      })
    }
  }

  const planned = distributeParty(
    current.adults,
    current.childAges,
    rooms,
    feed.settings.guests.adult_required_with_children
  )

  return planned.ok
})

function continueStay(): void {
  const current = search.value
  const feed = property.value

  if (!current || !feed || !partyOk.value) {
    return
  }

  const rooms: Array<PlannedRoom> = []

  for (const pick of picks.value) {
    const type = feed.room_types.find(item => item.code === pick.roomType)

    if (!type) {
      return
    }

    for (let index = 0; index < pick.quantity; index += 1) {
      rooms.push({
        roomType: pick.roomType,
        ratePlan: pick.ratePlan,
        occupancy: {
          maxAdults: type.max_adults,
          maxChildren: type.max_children,
          maxOccupancy: type.max_occupancy
        }
      })
    }
  }

  const planned = distributeParty(
    current.adults,
    current.childAges,
    rooms,
    feed.settings.guests.adult_required_with_children
  )

  if (!planned.ok) {
    return
  }

  session.value = {
    ...session.value,
    search: current,
    lines: planned.lines,
    quote: null,
    hold: null
  }
  void navigateTo('/book/details')
}

const nights = computed(() => search.value ? nightsBetween(search.value.checkIn, search.value.checkOut) : 0)

function catalogue(code: string): StayRoomType | null {
  return property.value?.room_types.find(type => type.code === code) ?? null
}

function photoOf(code: string): string | null {
  const photo = catalogue(code)?.photos[0]?.url ?? null

  return mediaUrl(String(config.public.apiBase), photo)
}

const planNames = computed(() => {
  const names: Record<string, string> = {}

  for (const plan of property.value?.rate_plans ?? []) {
    names[plan.code] = plan.name
  }

  return names
})

const stayLine = computed(() => {
  const current = search.value

  if (!current) {
    return ''
  }

  const guests = current.adults + current.childAges.length

  return t('book.stayLine', {
    dates: `${format(current.checkIn)} – ${format(current.checkOut)}`,
    guests: guests === 1 ? t('book.guestOne') : t('book.guestMany', { n: guests }),
    rooms: current.rooms === 1 ? t('book.roomOne') : t('book.roomMany', { n: current.rooms })
  })
})

const dockTotal = computed(() => {
  const feed = availability.value
  const pick = picks.value.length === 1 ? picks.value[0] : null

  if (!feed || !pick || pick.quantity !== 1) {
    return null
  }

  const type = feed.room_types.find(item => item.code === pick.roomType)
  const quote = type?.quotes.find(item => item.rate_plan === pick.ratePlan)

  return quote?.total_including_charged_taxes ?? null
})

function roomKey(type: AvailabilityType): string {
  return type.code
}
</script>

<template>
  <div v-if="search && property">
    <p class="book-stayline">
      <span>{{ stayLine }}</span>
      <span>{{ t('stayShop.nights', { n: nights }) }}</span>
    </p>
    <p v-if="loadError">
      {{ loadError }}
    </p>
    <div v-if="availability">
      <StayRoomResultCard
        v-for="type in availability.room_types"
        :key="roomKey(type)"
        :room-type="type"
        :threshold="property.settings.availability.low_availability_threshold"
        :quantity="quantityOf(type.code)"
        :max-quantity="maxQuantity(type.rooms_left, property.settings.availability.low_availability_threshold)"
        :plan="planOf(type.code)"
        :check-in="search.checkIn"
        :check-out="search.checkOut"
        :adults="search.adults"
        :children="search.childAges.length"
        :photo="photoOf(type.code)"
        :description="catalogue(type.code)?.description ?? null"
        :bed="catalogue(type.code)?.bed_setup ?? null"
        :sleeps="catalogue(type.code)?.max_occupancy ?? null"
        :plan-names="planNames"
        @update:quantity="setPick(type.code, $event, planOf(type.code))"
        @update:plan="chooseRoomPlan(type.code, $event)"
        @change-nights="changeNights"
      />
    </div>
    <p v-if="chosen > 0 && !partyOk">
      {{ t('stayShop.partyFit') }}
    </p>
    <div class="book-dock">
      <p class="book-dock-total">
        {{ t('book.totalLabel') }}
        <strong v-if="dockTotal !== null">
          <AnkMoney :amount="dockTotal" />
        </strong>
      </p>
      <button
        type="button"
        class="book-proceed"
        :disabled="!partyOk"
        @click="continueStay"
      >
        {{ t('book.proceed') }}
      </button>
    </div>
  </div>
</template>

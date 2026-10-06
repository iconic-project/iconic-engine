<script setup lang="ts">
import type { PropertyFeed } from '../types/stay'
import { mediaUrl } from '../utils/mediaUrl'
import { stayQuery, type StaySearch } from '../utils/stayQuery'

const { t } = useI18n()
const { request } = useApi()
const config = useRuntimeConfig()
const requestUrl = useRequestURL()

const { data: feed } = await useAsyncData('engine-property', () =>
  request('/api/engine/property') as Promise<PropertyFeed>
)

const property = computed(() => feed.value?.property ?? null)

function image(path: string | null): string | null {
  return mediaUrl(String(config.public.apiBase), path)
}

const hotelSchema = computed(() => {
  const row = property.value

  if (!row) {
    return null
  }

  const address: Record<string, string> = { '@type': 'PostalAddress' }

  if (row.address_line_1) {
    address.streetAddress = row.address_line_1
  }

  if (row.city) {
    address.addressLocality = row.city
  }

  if (row.postcode) {
    address.postalCode = row.postcode
  }

  if (row.country) {
    address.addressCountry = row.country
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    'name': row.name,
    ...(row.description ? { description: row.description } : {}),
    ...(image(row.hero_image_url) ? { image: image(row.hero_image_url) } : {}),
    ...(row.phone ? { telephone: row.phone } : {}),
    ...(row.email ? { email: row.email } : {}),
    address
  }
})

useSeoMeta({
  title: () => property.value?.meta_title || property.value?.name || t('pages.home'),
  description: () => property.value?.meta_description || property.value?.description || ''
})

useHead({
  link: [{ rel: 'canonical', href: `${requestUrl.origin}/` }],
  script: hotelSchema.value
    ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(hotelSchema.value) }]
    : []
})

function search(value: StaySearch): void {
  const params = {
    check_in: value.checkIn,
    check_out: value.checkOut,
    adults: value.adults,
    children: value.childAges.length,
    rooms: value.rooms
  }
  track('search_performed', params, params)
  void navigateTo({ path: '/book/rooms', query: stayQuery(value) })
}
</script>

<template>
  <div v-if="property && feed">
    <section class="hero">
      <img
        v-if="image(property.hero_image_url)"
        :src="image(property.hero_image_url) ?? undefined"
        :alt="property.hero_alt || property.name"
      >
      <h1 class="disp">
        {{ property.name }}
      </h1>
      <p v-if="property.description">
        {{ property.description }}
      </p>
    </section>

    <StaySearchBar
      :min-nights="feed.settings.stay.min_nights"
      :max-nights="feed.settings.stay.max_nights"
      :max-rooms="feed.settings.stay.max_rooms_per_booking"
      :child-min-age="feed.settings.guests.child_min_age"
      :child-max-age="feed.settings.guests.child_max_age"
      @search="search"
    />

    <section v-if="property.highlights.length">
      <h2 class="mono">
        {{ t('stayShop.highlights') }}
      </h2>
      <ul>
        <li
          v-for="item in property.highlights"
          :key="item"
        >
          {{ item }}
        </li>
      </ul>
    </section>

    <section>
      <h2 class="mono">
        {{ t('stayShop.roomsTitle') }}
      </h2>
      <ul class="types">
        <li
          v-for="type in feed.room_types"
          :key="type.code"
        >
          <NuxtLink :to="`/rooms/${type.slug}`">
            {{ type.name }}
          </NuxtLink>
          <p v-if="type.from_price !== null">
            {{ t('stayShop.fromPrice') }}
            <AnkMoney :amount="type.from_price" />
          </p>
        </li>
      </ul>
    </section>

    <section v-if="property.faqs.length">
      <h2 class="mono">
        {{ t('stayShop.faqs') }}
      </h2>
      <details
        v-for="faq in property.faqs"
        :key="faq[0]"
      >
        <summary>{{ faq[0] }}</summary>
        <p>{{ faq[1] }}</p>
      </details>
    </section>
  </div>
</template>

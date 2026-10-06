<script setup lang="ts">
import type { PropertyFeed } from '../../types/stay'
import { mediaUrl } from '../../utils/mediaUrl'

const route = useRoute()
const { t } = useI18n()
const { request } = useApi()
const config = useRuntimeConfig()
const requestUrl = useRequestURL()

const { data: feed } = await useAsyncData('engine-property', () =>
  request('/api/engine/property') as Promise<PropertyFeed>
)

const roomType = computed(() =>
  feed.value?.room_types.find(type => type.slug === route.params.slug) ?? null
)

if (!roomType.value) {
  throw createError({ statusCode: 404, statusMessage: t('pages.notFound') })
}

function image(path: string | null): string | null {
  return mediaUrl(String(config.public.apiBase), path)
}

const schema = computed(() => {
  const type = roomType.value
  const property = feed.value?.property

  if (!type || !property) {
    return null
  }

  const photos = type.photos
    .map(photo => image(photo.url))
    .filter((url): url is string => url !== null)

  return {
    '@context': 'https://schema.org',
    '@type': 'HotelRoom',
    'name': type.name,
    ...(type.description ? { description: type.description } : {}),
    ...(photos.length > 0 ? { image: photos } : {}),
    ...(type.bed_setup ? { bed: type.bed_setup } : {}),
    ...(type.size_sqm !== null
      ? { floorSize: { '@type': 'QuantitativeValue', 'value': type.size_sqm, 'unitCode': 'MTK' } }
      : {}),
    'containedInPlace': { '@type': 'Hotel', 'name': property.name }
  }
})

useSeoMeta({
  title: () => roomType.value?.meta_title || roomType.value?.name || t('stayShop.roomsTitle'),
  description: () => roomType.value?.meta_description || roomType.value?.description || ''
})

useHead({
  link: [{ rel: 'canonical', href: `${requestUrl.origin}/rooms/${String(route.params.slug)}` }],
  script: schema.value
    ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(schema.value) }]
    : []
})

function viewed(): void {
  const code = roomType.value?.code

  if (code) {
    track('room_type_viewed', { room_type: code }, { room_type: code })
  }
}

onMounted(viewed)
</script>

<template>
  <article v-if="roomType">
    <p class="mono">
      {{ roomType.code }}
    </p>
    <h1 class="disp">
      {{ roomType.name }}
    </h1>
    <p v-if="roomType.description">
      {{ roomType.description }}
    </p>
    <ul
      v-if="roomType.photos.length"
      class="gallery"
    >
      <li
        v-for="photo in roomType.photos"
        :key="photo.url"
      >
        <img
          :src="image(photo.url) ?? undefined"
          :alt="photo.alt || roomType.name"
        >
      </li>
    </ul>
    <p v-if="roomType.bed_setup">
      {{ t('stayShop.bed') }} {{ roomType.bed_setup }}
    </p>
    <p v-if="roomType.size_sqm !== null">
      {{ t('stayShop.size') }} {{ t('stayShop.sizeValue', { n: roomType.size_sqm }) }}
    </p>
    <ul v-if="roomType.amenities.length">
      <li
        v-for="amenity in roomType.amenities"
        :key="amenity"
      >
        {{ amenity }}
      </li>
    </ul>
    <p v-if="roomType.from_price !== null">
      {{ t('stayShop.fromPrice') }}
      <AnkMoney :amount="roomType.from_price" />
    </p>
  </article>
</template>

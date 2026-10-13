<script setup lang="ts">
import type { PropertyFeed } from '../types/stay'
import { mediaUrl } from '../utils/mediaUrl'
import type { StaySearch } from '../utils/stayQuery'

definePageMeta({ layout: 'pikaia' })

const { t } = useI18n()
const { request } = useApi()
const config = useRuntimeConfig()
const requestUrl = useRequestURL()

const hero = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const loader = ref<HTMLElement | null>(null)
const loaderFill = ref<HTMLElement | null>(null)
const loaderPercent = ref<HTMLElement | null>(null)
const heroBrand = ref<HTMLElement | null>(null)
const heroScrim = ref<HTMLElement | null>(null)
const heroTitle = ref<HTMLElement | null>(null)
const scrollHint = ref<HTMLElement | null>(null)
const gallery = ref<HTMLElement | null>(null)

usePikaiaFilm({
  hero,
  canvas,
  loader,
  loaderFill,
  loaderPercent,
  heroBrand,
  heroScrim,
  heroTitle,
  scrollHint,
  gallery
})

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
  title: () => property.value?.meta_title || t('pikaia.metaTitle'),
  description: () => property.value?.meta_description || property.value?.description || t('pikaia.introBody')
})

useHead({
  titleTemplate: '%s',
  link: [{ rel: 'canonical', href: `${requestUrl.origin}/` }],
  script: hotelSchema.value
    ? [{ type: 'application/ld+json', innerHTML: JSON.stringify(hotelSchema.value) }]
    : []
})

const reserveOpen = ref(false)

function openReserve(): void {
  reserveOpen.value = true
}

function search(value: StaySearch): void {
  const params = {
    check_in: value.checkIn,
    check_out: value.checkOut,
    adults: value.adults,
    children: value.childAges.length,
    rooms: value.rooms
  }
  track('search_performed', params, params)
}
</script>

<template>
  <div>
    <div
      ref="loader"
      class="pikaia-loader"
    >
      <div class="pikaia-loader-inner">
        <p class="pikaia-loader-label">
          {{ t('pikaia.loader') }}
        </p>
        <div class="pikaia-loader-bar">
          <div
            ref="loaderFill"
            class="pikaia-loader-fill"
          />
        </div>
        <p
          ref="loaderPercent"
          class="pikaia-loader-percent"
        >
          0%
        </p>
      </div>
    </div>

    <section
      id="pikaia-hero"
      ref="hero"
      class="pikaia-hero"
    >
      <div class="pikaia-hero-sticky">
        <canvas
          ref="canvas"
          class="pikaia-hero-canvas"
          aria-hidden="true"
        />
        <div
          ref="heroScrim"
          class="pikaia-hero-scrim"
        />

        <header
          ref="heroBrand"
          class="pikaia-hero-brand"
        >
          <img
            src="/pikaia/assets/logo.svg"
            :alt="t('pikaia.logoAlt')"
            width="227"
            height="104"
          >
        </header>

        <div
          ref="heroTitle"
          class="pikaia-hero-title"
        >
          <h1>
            {{ t('pikaia.heroLine1') }}<br>
            <span>{{ t('pikaia.heroLine2') }}</span>
          </h1>
        </div>

        <div
          ref="scrollHint"
          class="pikaia-scroll"
        >
          <span>{{ t('pikaia.scroll') }}</span>
          <div class="pikaia-scroll-line" />
        </div>
      </div>
    </section>

    <section
      id="pikaia-gallery"
      ref="gallery"
      class="pikaia-gallery"
      :aria-label="t('pikaia.galleryLabel')"
    >
      <div class="pikaia-gallery-track">
        <figure class="pikaia-gallery-card">
          <video
            muted
            loop
            playsinline
            preload="none"
            poster="/pikaia/videos/aerea.webp"
            :aria-label="t('pikaia.aerial')"
          >
            <source
              src="/pikaia/videos/aerea.mp4"
              type="video/mp4"
            >
          </video>
        </figure>
        <figure class="pikaia-gallery-card">
          <video
            muted
            loop
            playsinline
            preload="none"
            poster="/pikaia/videos/cabanas.webp"
            :aria-label="t('pikaia.crater')"
          >
            <source
              src="/pikaia/videos/cabanas.mp4"
              type="video/mp4"
            >
          </video>
        </figure>
      </div>
    </section>

    <section class="pikaia-intro">
      <div class="pikaia-intro-inner">
        <h2>
          {{ t('pikaia.welcomeLine1') }}<br>
          {{ t('pikaia.welcomeLine2') }}
        </h2>
        <p class="pikaia-intro-body">
          {{ t('pikaia.introBody') }}
        </p>
        <button
          type="button"
          class="pikaia-book-btn"
          :disabled="!feed"
          @click="openReserve"
        >
          {{ t('pikaia.reserve') }}
        </button>
      </div>
    </section>

    <section class="pikaia-feature">
      <div class="pikaia-feature-inner">
        <div class="pikaia-feature-media">
          <img
            src="/pikaia/frames/f_0001.webp"
            :alt="t('pikaia.suiteAlt')"
            width="1200"
            height="675"
          >
        </div>
        <div class="pikaia-feature-text">
          <p class="pikaia-feature-eyebrow">
            {{ t('pikaia.stayEyebrow') }}
          </p>
          <h2>{{ t('pikaia.stayTitle') }}</h2>
          <p>{{ t('pikaia.stayBody1') }}</p>
          <p>{{ t('pikaia.stayBody2') }}</p>
          <button
            type="button"
            class="pikaia-book-btn"
            :disabled="!feed"
            @click="openReserve"
          >
            {{ t('pikaia.reserve') }}
          </button>
        </div>
      </div>
    </section>

    <Teleport
      defer
      to="#pikaia-reserve-slot"
    >
      <button
        v-if="!reserveOpen"
        type="button"
        class="pikaia-reserve-btn"
        :disabled="!feed"
        @click="openReserve"
      >
        {{ t('pikaia.reserve') }}
      </button>
    </Teleport>

    <StayReserveWidget
      v-if="feed"
      v-model:open="reserveOpen"
      :property-name="property?.name"
      :min-nights="feed.settings.stay.min_nights"
      :max-nights="feed.settings.stay.max_nights"
      :max-rooms="feed.settings.stay.max_rooms_per_booking"
      :child-min-age="feed.settings.guests.child_min_age"
      :child-max-age="feed.settings.guests.child_max_age"
      @search="search"
    />
  </div>
</template>

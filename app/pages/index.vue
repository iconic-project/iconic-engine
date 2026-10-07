<script setup lang="ts">
import type { PropertyFeed } from '../types/stay'
import { mediaUrl } from '../utils/mediaUrl'
import type { StaySearch } from '../utils/stayQuery'

definePageMeta({ layout: 'casa' })

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
const galleryTrack = ref<HTMLElement | null>(null)

useCasaFilm({
  hero,
  canvas,
  loader,
  loaderFill,
  loaderPercent,
  heroBrand,
  heroScrim,
  heroTitle,
  scrollHint,
  gallery,
  galleryTrack
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
  title: () => property.value?.meta_title || t('casa.metaTitle'),
  description: () => property.value?.meta_description || property.value?.description || t('casa.historyBody1')
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
      class="casa-loader"
    >
      <div class="casa-loader-inner">
        <p class="casa-loader-label">
          {{ t('casa.loader') }}
        </p>
        <div class="casa-loader-bar">
          <div
            ref="loaderFill"
            class="casa-loader-fill"
          />
        </div>
        <p
          ref="loaderPercent"
          class="casa-loader-percent"
        >
          0%
        </p>
      </div>
    </div>

    <section
      id="casa-hero"
      ref="hero"
      class="casa-hero"
    >
      <div class="casa-hero-sticky">
        <canvas
          ref="canvas"
          class="casa-hero-canvas"
          aria-hidden="true"
        />
        <div
          ref="heroScrim"
          class="casa-hero-scrim"
        />

        <header
          ref="heroBrand"
          class="casa-hero-brand"
        >
          <img
            src="/casa/assets/logo.png"
            :alt="t('casa.logoAlt')"
            width="350"
            height="186"
          >
        </header>

        <div
          ref="heroTitle"
          class="casa-hero-title"
        >
          <h2>{{ t('casa.welcome') }}</h2>
          <p class="casa-hero-sub">
            {{ t('casa.place') }}
          </p>
        </div>

        <div
          ref="scrollHint"
          class="casa-scroll"
        >
          <span>{{ t('casa.scroll') }}</span>
          <div class="casa-scroll-line" />
        </div>
      </div>
    </section>

    <section
      id="casa-gallery"
      ref="gallery"
      class="casa-gallery"
      :aria-label="t('casa.galleryLabel')"
    >
      <div
        ref="galleryTrack"
        class="casa-gallery-track"
      >
        <figure class="casa-gallery-card">
          <video
            muted
            loop
            playsinline
            preload="none"
            poster="/casa/videos/entrada.webp"
            :aria-label="t('casa.entrada')"
          >
            <source
              src="/casa/videos/entrada.mp4"
              type="video/mp4"
            >
          </video>
        </figure>
        <figure class="casa-gallery-card casa-gallery-card--main">
          <video
            muted
            loop
            playsinline
            preload="none"
            poster="/casa/videos/suite.webp"
            :aria-label="t('casa.suite')"
          >
            <source
              src="/casa/videos/suite.mp4"
              type="video/mp4"
            >
          </video>
        </figure>
        <figure class="casa-gallery-card">
          <video
            muted
            loop
            playsinline
            preload="none"
            poster="/casa/videos/comedor.webp"
            :aria-label="t('casa.comedor')"
          >
            <source
              src="/casa/videos/comedor.mp4"
              type="video/mp4"
            >
          </video>
        </figure>
      </div>
    </section>

    <section class="casa-intro">
      <div class="casa-intro-inner">
        <h2>{{ t('casa.historyTitle') }}</h2>
        <p class="casa-intro-body">
          {{ t('casa.historyBody1') }}
        </p>
        <p class="casa-intro-body">
          {{ t('casa.historyLead') }}<strong>{{ t('casa.relais') }}</strong>{{ t('casa.historyMid') }}<strong>{{ t('casa.virtuoso') }}</strong>{{ t('casa.historyMid2') }}<strong>{{ t('casa.michelin') }}</strong>{{ t('casa.historyEnd') }}
        </p>
        <button
          type="button"
          class="casa-cta"
          @click="openReserve"
        >
          {{ t('casa.reserve') }}
        </button>
      </div>
    </section>

    <section class="casa-feature">
      <div class="casa-feature-text">
        <p class="casa-feature-eyebrow">
          {{ t('casa.houseEyebrow') }}
        </p>
        <h2>{{ t('casa.houseTitle') }}</h2>
        <p>{{ t('casa.houseBody1') }}</p>
        <p>{{ t('casa.houseBody2') }}</p>
        <a
          class="casa-cta"
          href="#casa-gallery"
        >{{ t('casa.discover') }}</a>
      </div>
      <div class="casa-feature-media">
        <img
          src="/casa/frames/f_0200.webp"
          :alt="t('casa.terraceAlt')"
          width="1200"
          height="802"
        >
      </div>
    </section>

    <Teleport
      defer
      to="#casa-reserve-slot"
    >
      <button
        v-if="feed && !reserveOpen"
        type="button"
        class="casa-reserve-btn"
        @click="openReserve"
      >
        {{ t('casa.reserve') }}
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

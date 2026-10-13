<script setup lang="ts">
useHead({
  titleTemplate: '%s · Pikaia Lodge',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/pikaia/assets/logo-ink.svg' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const { t } = useI18n()

useSeoMeta({
  description: t('seo.description')
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

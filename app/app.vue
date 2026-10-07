<script setup lang="ts">
useHead({
  titleTemplate: '%s · Casa Pestagua',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/casa/assets/logo.png' }
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

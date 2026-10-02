<script setup lang="ts">
useHead({
  titleTemplate: '%s · Iconic',
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
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

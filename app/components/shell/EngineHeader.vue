<script setup lang="ts">
const { t } = useI18n()
const { stayOn } = useFlowStep()
</script>

<template>
  <header class="topbar">
    <NuxtLink
      to="/"
      class="brand"
    >
      <img
        class="pikaia-logo"
        src="/pikaia/assets/logo-ink.svg"
        width="227"
        height="104"
        :alt="t('pikaia.logoAlt')"
      >
    </NuxtLink>

    <nav class="topnav">
      <NuxtLink
        to="/"
        :class="{ on: stayOn }"
      >
        {{ t('stayShop.nav') }}
      </NuxtLink>
      <AnkThemeToggle />
    </nav>
  </header>
</template>

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
        class="casa-logo"
        src="/casa/assets/logo.png"
        width="350"
        height="186"
        :alt="t('casa.logoAlt')"
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

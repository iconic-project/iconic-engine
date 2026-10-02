<script setup lang="ts">
const { t } = useI18n()
const { expeditionsOn } = useFlowStep()
</script>

<template>
  <header class="topbar">
    <NuxtLink
      to="/"
      class="brand"
    >
      <AnkWordmark />
      <small>{{ t('brand.subtitle') }}</small>
    </NuxtLink>

    <nav class="topnav">
      <NuxtLink
        to="/"
        :class="{ on: expeditionsOn }"
      >
        {{ t('nav.expeditions') }}
      </NuxtLink>
      <NuxtLink
        to="/charter"
        :class="{ on: $route.path === '/charter' }"
      >
        {{ t('nav.charter') }}
      </NuxtLink>
      <AnkThemeToggle />
    </nav>
  </header>
</template>

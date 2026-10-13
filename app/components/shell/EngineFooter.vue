<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <footer class="engine-footer">
    <img
      class="pikaia-logo"
      src="/pikaia/assets/logo-ink.svg"
      width="227"
      height="104"
      alt=""
    >
    {{ t('footer.line1') }}<br><br>
    <span class="coords">{{ t('footer.line2Before') }}</span>{{ t('footer.line2After') }}
  </footer>
</template>

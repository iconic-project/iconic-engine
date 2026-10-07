<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <footer class="engine-footer">
    <img
      class="casa-logo"
      src="/casa/assets/logo.png"
      width="350"
      height="186"
      alt=""
    >
    {{ t('footer.line1') }}<br><br>
    <span class="coords">{{ t('footer.line2Before') }}</span>{{ t('footer.line2After') }}
  </footer>
</template>

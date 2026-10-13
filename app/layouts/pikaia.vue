<script setup lang="ts">
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400&family=Archivo:wdth,wght@125,100..700&display=swap'
    }
  ]
})
</script>

<template>
  <div class="pikaia">
    <div class="pikaia-dock">
      <div
        id="pikaia-reserve-slot"
        class="pikaia-reserve-slot"
      />
      <ShellConsentBanner />
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Cormorant+Unicase:wght@300;400;500;600;700&family=Cormorant:ital,wght@0,300;0,400;1,300&family=IBM+Plex+Sans:wght@300;400&display=swap'
    }
  ]
})
</script>

<template>
  <div class="casa">
    <slot />
    <ShellConsentBanner />
  </div>
</template>

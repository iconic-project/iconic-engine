<script setup lang="ts">
import type { StayQuote } from '../../types/stay'

defineProps<{
  quote: StayQuote
}>()

const { t } = useI18n()
const { format } = useMoney()
</script>

<template>
  <section class="summary">
    <p class="mono">
      {{ quote.check_in }} – {{ quote.check_out }}
    </p>
    <p>{{ t('stayShop.nights', { n: quote.nights }) }}</p>
    <details
      v-for="(room, index) in quote.rooms"
      :key="`${room.room_type}-${index}`"
    >
      <summary>
        {{ room.room_type }} · {{ room.rate_plan }} · {{ format(room.total) }}
      </summary>
      <p class="mono">
        {{ t('stayShop.nightBreakdown') }}
      </p>
      <ul>
        <li
          v-for="line in room.night_lines"
          :key="line.night"
        >
          {{ line.night }} · {{ format(line.total) }}
        </li>
      </ul>
      <ul>
        <li
          v-for="tax in room.tax_lines.filter(item => item.shown_in_price_panel)"
          :key="tax.code"
        >
          {{ t('stayShop.taxes') }} · {{ tax.label }} · {{ format(tax.amount) }}
        </li>
      </ul>
    </details>
    <p>{{ t('stayShop.total') }} {{ format(quote.total) }}</p>
    <p>{{ t('stayShop.deposit') }} {{ format(quote.deposit) }}</p>
  </section>
</template>

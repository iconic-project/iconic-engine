<script setup lang="ts">
import type { PropertyFeed, StayQuote, StayQuoteRoom } from '../../types/stay'

defineProps<{
  quote: StayQuote
  dueLabel?: string
}>()

const { t } = useI18n()
const { format } = useMoney()
const { format: formatDate } = useDates()
const { request } = useApi()

const { data: property } = await useAsyncData('engine-property', () =>
  request('/api/engine/property') as Promise<PropertyFeed>
)

function roomLabel(room: StayQuoteRoom): string {
  const typeName = property.value?.room_types.find(item => item.code === room.room_type)?.name ?? room.room_type
  const planName = property.value?.rate_plans.find(item => item.code === room.rate_plan)?.name ?? room.rate_plan

  return `${typeName} · ${planName}`
}
</script>

<template>
  <section class="summary">
    <p class="book-receipt-dates">
      {{ formatDate(quote.check_in, 'short') }} – {{ formatDate(quote.check_out, 'short') }}
    </p>
    <p class="book-receipt-nights">
      {{ t('stayShop.nights', { n: quote.nights }) }}
    </p>
    <UCollapsible
      v-for="(room, index) in quote.rooms"
      :key="`${room.room_type}-${index}`"
      class="book-receipt-room"
    >
      <template #default="{ open }">
        <button
          type="button"
          class="book-receipt-toggle"
        >
          <span>{{ roomLabel(room) }}</span>
          <span class="book-receipt-end">
            <span>{{ format(room.total) }}</span>
            <span
              class="book-receipt-chevron"
              :data-open="open ? 'true' : 'false'"
              aria-hidden="true"
            />
          </span>
        </button>
      </template>
      <template #content>
        <p class="book-receipt-kicker">
          {{ t('stayShop.nightBreakdown') }}
        </p>
        <ul class="book-receipt-lines">
          <li
            v-for="line in room.night_lines"
            :key="line.night"
          >
            <span>{{ formatDate(line.night, 'short') }}</span>
            <span>{{ format(line.total) }}</span>
          </li>
          <li
            v-for="tax in room.tax_lines.filter(item => item.shown_in_price_panel)"
            :key="tax.code"
          >
            <span>{{ tax.label }}</span>
            <span>{{ format(tax.amount) }}</span>
          </li>
        </ul>
      </template>
    </UCollapsible>
    <div class="book-receipt-totals">
      <p>
        <span>{{ t('stayShop.total') }}</span>
        <span>{{ format(quote.total) }}</span>
      </p>
      <p class="book-receipt-due">
        <span>{{ dueLabel ?? t('stayShop.deposit') }}</span>
        <span>{{ format(quote.deposit) }}</span>
      </p>
    </div>
  </section>
</template>

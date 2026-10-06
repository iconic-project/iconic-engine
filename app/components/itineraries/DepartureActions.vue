<script setup lang="ts">
import type { EngineDeparture } from '../../types/api'
import { labelClassForAction, type RowAction } from '../../utils/engineFlow'

const props = defineProps<{
  action: RowAction
  departure: EngineDeparture
  selected?: boolean
  compact?: boolean
}>()

const emit = defineEmits<{
  select: [departure: EngineDeparture]
  waitlist: [departure: EngineDeparture]
}>()

const { t } = useI18n()

const selectLabel = computed(() => {
  if (props.compact && props.selected) {
    return t('trip.selectedTick')
  }

  if (props.compact) {
    return t('trip.bookNow')
  }

  return t('itineraries.select')
})
</script>

<template>
  <div class="dep-actions">
    <button
      v-if="action.type === 'select'"
      type="button"
      :class="[labelClassForAction('select'), compact && !selected ? 'o' : '']"
      @click="emit('select', departure)"
    >
      {{ selectLabel }}
    </button>
    <template v-if="action.type === 'waitlist' || action.type === 'waitlist_contact'">
      <button
        type="button"
        class="btn o"
        @click="emit('waitlist', departure)"
      >
        {{ t('itineraries.waitlist') }}
      </button>
    </template>
    <a
      v-if="action.type === 'waitlist_contact' || action.type === 'contact'"
      class="btn o"
      :href="`mailto:${t('search.contactEmail')}`"
    >
      {{ t('itineraries.contact') }}
    </a>
  </div>
</template>

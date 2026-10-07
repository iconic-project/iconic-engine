<script setup lang="ts">
import type { FlowStep } from '../../composables/useFlowStep'
import type { StaySearch } from '../../utils/stayQuery'

const open = defineModel<boolean>('open', { required: true })

defineProps<{
  minNights: number
  maxNights: number
  maxRooms: number
  childMinAge: number
  childMaxAge: number
  propertyName?: string
}>()

const emit = defineEmits<{
  search: [StaySearch]
}>()

const { t } = useI18n()
const { session } = useStaySession()
const panel = ref<HTMLElement | null>(null)
const step = ref<'search' | 'rooms' | 'details' | 'confirmation'>('search')
const stay = ref<StaySearch | null>(null)

const flowStep = computed<FlowStep>(() => {
  if (step.value === 'rooms') {
    return 2
  }

  if (step.value === 'details') {
    return session.value.hold ? 4 : 3
  }

  if (step.value === 'confirmation') {
    return 5
  }

  return 1
})

provide('reserve-flow-step', flowStep)

const title = computed(() => {
  if (step.value === 'rooms') {
    return t('stayShop.results')
  }

  if (step.value === 'details') {
    return session.value.hold ? t('book.stepPay') : t('book.stepDetails')
  }

  if (step.value === 'confirmation') {
    return t('book.stepConfirmation')
  }

  return t('book.search')
})

function close(): void {
  open.value = false
}

function back(): void {
  if (step.value === 'details') {
    step.value = 'rooms'

    return
  }

  if (step.value === 'rooms') {
    step.value = 'search'
  }
}

function onSearch(value: StaySearch): void {
  stay.value = value
  session.value = {
    ...session.value,
    search: value,
    lines: [],
    quote: null,
    hold: null,
    confirmation: null
  }
  step.value = 'rooms'
  emit('search', value)
}

function finish(): void {
  step.value = 'search'
  open.value = false
}

function onWindowKeydown(event: KeyboardEvent): void {
  if (open.value && event.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown)
})

watch(open, async (value) => {
  if (!import.meta.client) {
    return
  }

  document.documentElement.style.overflow = value ? 'hidden' : ''

  if (!value) {
    return
  }

  await nextTick()
  panel.value?.querySelector<HTMLElement>('[data-reserve-close]')?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <div
    v-if="open"
    class="casa-reserve-scrim"
    @click="close"
  >
    <div
      ref="panel"
      class="casa-reserve-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reserve-title"
      @click.stop
    >
      <header class="casa-reserve-head">
        <button
          v-if="step === 'rooms' || step === 'details'"
          type="button"
          class="casa-reserve-close"
          :aria-label="t('book.back')"
          @click="back"
        >
          ←
        </button>
        <span v-else />
        <h2 id="reserve-title">
          {{ title }}
        </h2>
        <button
          v-if="step !== 'confirmation'"
          type="button"
          class="casa-reserve-close"
          data-reserve-close
          :aria-label="t('book.close')"
          @click="close"
        >
          ×
        </button>
        <span v-else />
      </header>
      <ShellEngineCrumbs v-if="step !== 'search' && step !== 'confirmation'" />
      <div class="casa-reserve-body">
        <StaySearchBar
          v-show="step === 'search'"
          :property-name="propertyName"
          :min-nights="minNights"
          :max-nights="maxNights"
          :max-rooms="maxRooms"
          :child-min-age="childMinAge"
          :child-max-age="childMaxAge"
          @search="onSearch"
        />
        <StayRoomsStep
          v-if="step === 'rooms'"
          embedded
          :stay="stay"
          @continue="step = 'details'"
          @update:stay="stay = $event"
        />
        <StayDetailsStep
          v-if="step === 'details'"
          embedded
          @confirmed="step = 'confirmation'"
        />
        <StayConfirmationStep
          v-if="step === 'confirmation'"
          embedded
          @done="finish"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FlowStep } from '../../composables/useFlowStep'

const { t } = useI18n()
const { step } = useFlowStep()

const crumbs = computed(() => [
  { step: 1 as FlowStep, label: t('crumbs.dates') },
  { step: 2 as FlowStep, label: t('crumbs.rooms') },
  { step: 3 as FlowStep, label: t('crumbs.details') },
  { step: 4 as FlowStep, label: t('crumbs.confirmation') }
])

function crumbClass(crumbStep: FlowStep): string {
  if (step.value === crumbStep) {
    return 'cur'
  }

  if (step.value !== null && crumbStep < step.value) {
    return 'done'
  }

  return ''
}
</script>

<template>
  <div
    v-if="step"
    class="crumbs"
  >
    <div
      v-for="crumb in crumbs"
      :key="crumb.step"
      class="crumb"
      :class="crumbClass(crumb.step)"
    >
      {{ crumb.label }}
    </div>
  </div>
</template>

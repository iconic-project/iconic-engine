export type FlowStep = 1 | 2 | 3 | 4 | 5

export function useFlowStep() {
  const route = useRoute()
  const { session } = useStaySession()
  const reserveStep = inject<ComputedRef<FlowStep> | null>('reserve-flow-step', null)

  const step = computed<FlowStep | null>(() => {
    if (reserveStep) {
      return reserveStep.value
    }

    const path = route.path

    if (path === '/') {
      return 1
    }

    if (path === '/book/rooms' || path.startsWith('/rooms/')) {
      return 2
    }

    if (path === '/book/details') {
      return session.value.hold ? 4 : 3
    }

    if (path === '/book/confirmation') {
      return 5
    }

    return null
  })

  const showHero = computed(() => false)
  const showCrumbs = computed(() => step.value !== null && step.value >= 2)
  const stayOn = computed(() => step.value !== null)

  return {
    step,
    showHero,
    showCrumbs,
    stayOn
  }
}

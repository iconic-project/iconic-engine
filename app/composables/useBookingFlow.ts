import type { CheckoutPath, EngineQuote, EngineSettings } from '../types/api'
import type { CabinSelection } from '../utils/cabProblems'
import type { PromoState } from '../utils/promoState'
import { emptyPromo } from '../utils/promoState'

export const FLOW_STORAGE_KEY = 'iconic-engine-flow'

export type FlowGuest = {
  cabinCode: string
  nationality: string
  ecuadorResident: boolean
  isChild: boolean
}

export type ConfirmationSnapshot = {
  path: CheckoutPath
  references: Array<string>
  email: string
}

export type BookingFlow = {
  adults: number
  children: number
  fromMonth: string
  toMonth: string
  itineraryCode: string | null
  departureId: number | null
  checkoutToken: string | null
  checkoutExpiresAt: string | null
  holdExtended: boolean
  cabins: Array<CabinSelection>
  selectedCabinIndex: number
  path: CheckoutPath
  firstName: string
  lastName: string
  email: string
  phone: string
  preferredChannel: 'EMAIL' | 'PHONE' | 'WHATSAPP'
  travelAdvisor: boolean
  notes: string
  marketing: boolean
  cartMarketing: boolean
  guests: Array<FlowGuest>
  pngCollected: boolean
  tctCollected: boolean
  declarations: Array<string>
  promo: PromoState
  serverQuote: EngineQuote | null
  confirmation: ConfirmationSnapshot | null
}

export function emptyFlow(): BookingFlow {
  return {
    adults: 2,
    children: 0,
    fromMonth: '',
    toMonth: '',
    itineraryCode: null,
    departureId: null,
    checkoutToken: null,
    checkoutExpiresAt: null,
    holdExtended: false,
    cabins: [],
    selectedCabinIndex: 0,
    path: 'PAY_LATER',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredChannel: 'EMAIL',
    travelAdvisor: false,
    notes: '',
    marketing: false,
    cartMarketing: false,
    guests: [],
    pngCollected: false,
    tctCollected: false,
    declarations: [],
    promo: emptyPromo(),
    serverQuote: null,
    confirmation: null
  }
}

function readStored(): BookingFlow | null {
  if (!import.meta.client) {
    return null
  }

  try {
    const raw = sessionStorage.getItem(FLOW_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<BookingFlow>

    return {
      ...emptyFlow(),
      ...parsed,
      promo: parsed.promo ? { ...emptyPromo(), ...parsed.promo } : emptyPromo(),
      cabins: Array.isArray(parsed.cabins) ? parsed.cabins : [],
      guests: Array.isArray(parsed.guests) ? parsed.guests : [],
      declarations: Array.isArray(parsed.declarations) ? parsed.declarations : []
    }
  } catch {
    return null
  }
}

function writeStored(flow: BookingFlow): void {
  if (!import.meta.client) {
    return
  }

  try {
    sessionStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(flow))
  } catch {
    // private mode / quota
  }
}

export function applySettingsDefaults(flow: BookingFlow, settings: EngineSettings): BookingFlow {
  return {
    ...flow,
    adults: flow.fromMonth ? flow.adults : settings.calendar.default_adults,
    fromMonth: flow.fromMonth || settings.calendar.default_search_from,
    toMonth: flow.toMonth || settings.calendar.default_search_to
  }
}

export function guestsFromCabins(cabins: Array<CabinSelection>, previous: Array<FlowGuest>): Array<FlowGuest> {
  const leftover = [...previous]
  const next: Array<FlowGuest> = []

  for (const cabin of cabins) {
    if (!cabin.cabinCode) {
      continue
    }

    const slots: Array<boolean> = [
      ...Array.from({ length: cabin.adults }, () => false),
      ...Array.from({ length: cabin.children }, () => true)
    ]

    for (const isChild of slots) {
      const reused = leftover.findIndex(guest =>
        guest.cabinCode === cabin.cabinCode && guest.isChild === isChild
      )
      const prior = reused >= 0 ? leftover.splice(reused, 1)[0] : leftover.shift()

      next.push({
        cabinCode: cabin.cabinCode,
        nationality: prior?.nationality ?? '',
        ecuadorResident: prior?.ecuadorResident ?? false,
        isChild
      })
    }
  }

  return next
}

export function useBookingFlow() {
  const flow = useState<BookingFlow>('engine-booking-flow', () => emptyFlow())

  onMounted(() => {
    const stored = readStored()

    if (stored?.fromMonth) {
      flow.value = stored
    }
  })

  watch(flow, (next) => {
    writeStored(next)
  }, { deep: true })

  function hydrateFromSettings(settings: EngineSettings): void {
    flow.value = applySettingsDefaults(flow.value, settings)
  }

  const party = computed(() => flow.value.adults + flow.value.children)

  return {
    flow,
    party,
    hydrateFromSettings
  }
}

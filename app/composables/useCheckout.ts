import type {
  CheckoutCreated,
  CheckoutPath,
  CheckoutStatus,
  CheckoutSubmitted,
  EngineQuote,
  PriceChangedError
} from '../types/api'
import { readStoredConsent } from '../utils/analyticsConsent'
import { attributionForCheckout } from '../utils/attribution'
import { engineErrorMessage } from '../utils/engineError'
import { currentSessionId } from '../utils/engineSession'
import { onlineDepositForPath } from '../utils/pathQuote'

export type CabinUnavailable = {
  message: string
  labels: Array<string>
}

type ErrorPayload = {
  message?: string
  quote?: EngineQuote
  unavailable?: Array<{ cabin: { code?: string, label: string } }>
  references?: Array<string>
}

type ErrorBody = {
  status?: number
  statusCode?: number
  message?: string
  data?: ErrorPayload
} & ErrorPayload

function errorStatus(error: ErrorBody): number | undefined {
  return error.status ?? error.statusCode
}

function errorPayload(error: ErrorBody): ErrorPayload {
  return error.data ?? error
}

export function useCheckout() {
  const { request } = useApi()
  const { flow } = useBookingFlow()
  const config = useRuntimeConfig()
  const quoting = ref(false)
  const submitting = ref(false)
  const priceChanged = ref<PriceChangedError | null>(null)
  const cabinConflict = ref<CabinUnavailable | null>(null)
  const submitError = ref('')

  function engineFetch<T>(url: string, options: { method: 'POST', body: Record<string, unknown> }): Promise<T> {
    return $fetch<T>(url, {
      baseURL: String(config.public.apiBase),
      credentials: 'include',
      method: options.method,
      body: options.body
    }) as Promise<T>
  }

  async function quote(): Promise<EngineQuote | null> {
    if (!flow.value.departureId || flow.value.cabins.some(cabin => !cabin.cabinCode)) {
      return null
    }

    quoting.value = true

    try {
      const result = await request('/api/engine/quote', {
        method: 'POST',
        body: {
          departure_id: flow.value.departureId,
          cabins: flow.value.cabins.map(cabin => ({
            cabin_code: cabin.cabinCode,
            adults: cabin.adults,
            children: cabin.children
          })),
          online_deposit: onlineDepositForPath(flow.value.path),
          promo_code: flow.value.promo.code
        }
      }) as EngineQuote

      flow.value.serverQuote = result

      return result
    } catch {
      return null
    } finally {
      quoting.value = false
    }
  }

  async function placeHold(): Promise<boolean> {
    cabinConflict.value = null

    try {
      const created = await engineFetch<CheckoutCreated>('/api/engine/checkout', {
        method: 'POST',
        body: {
          departure_id: flow.value.departureId,
          cabins: flow.value.cabins.map(cabin => ({
            cabin_code: cabin.cabinCode,
            adults: cabin.adults,
            children: cabin.children
          }))
        }
      }) as CheckoutCreated

      flow.value.checkoutToken = created.token
      flow.value.checkoutExpiresAt = created.expires_at
      flow.value.holdExtended = false
      flow.value.serverQuote = created.quote

      return true
    } catch (error) {
      const body = error as ErrorBody
      const payload = errorPayload(body)

      if (errorStatus(body) === 409) {
        const unavailable = payload.unavailable ?? []
        const labels = unavailable.map(row => row.cabin.label)
        const taken = new Set(
          unavailable.flatMap(row => [row.cabin.code, row.cabin.label].filter((value): value is string => Boolean(value)))
        )
        cabinConflict.value = {
          message: payload.message ?? body.message ?? 'Cabin unavailable.',
          labels
        }
        flow.value.cabins = flow.value.cabins.map((cabin) => {
          if (cabin.cabinCode && taken.has(cabin.cabinCode)) {
            return { ...cabin, cabinCode: null }
          }

          return cabin
        })
      } else {
        submitError.value = engineErrorMessage(error)
      }

      return false
    }
  }

  async function submit(): Promise<CheckoutSubmitted | 'price' | 'hold' | 'error'> {
    const token = flow.value.checkoutToken
    const expected = flow.value.serverQuote?.total

    if (!token || expected === null || expected === undefined) {
      return 'error'
    }

    submitting.value = true
    priceChanged.value = null
    submitError.value = ''

    try {
      const consented = import.meta.client && readStoredConsent(localStorage) === 'accepted'
      const sessionId = consented && import.meta.client ? currentSessionId(localStorage) : null
      const attribution = import.meta.client
        ? attributionForCheckout(consented, sessionStorage, localStorage)
        : null
      const result = await engineFetch<CheckoutSubmitted>(`/api/engine/checkout/${token}/submit`, {
        method: 'POST',
        body: {
          first_name: flow.value.firstName,
          last_name: flow.value.lastName,
          email: flow.value.email,
          phone: flow.value.phone || null,
          preferred_channel: flow.value.preferredChannel,
          travel_advisor: flow.value.travelAdvisor,
          notes: flow.value.notes || null,
          marketing: flow.value.marketing,
          png_collected: flow.value.pngCollected,
          tct_collected: flow.value.tctCollected,
          promo_code: flow.value.promo.code,
          path: flow.value.path,
          expected_total: expected,
          declarations: flow.value.declarations,
          guests: flow.value.guests.map(guest => ({
            cabin_code: guest.cabinCode,
            nationality: guest.nationality,
            ecuador_resident: guest.ecuadorResident
          })),
          ...(sessionId ? { session_id: sessionId } : {}),
          ...(attribution ? { attribution } : {})
        }
      }) as CheckoutSubmitted

      flow.value.confirmation = {
        path: result.path,
        references: result.references,
        email: result.email ?? flow.value.email
      }

      return result
    } catch (error) {
      const body = error as ErrorBody
      const payload = errorPayload(body)
      const status = errorStatus(body)

      if (status === 409 && payload.quote) {
        priceChanged.value = {
          message: payload.message ?? body.message ?? 'The price changed.',
          quote: payload.quote
        }
        flow.value.serverQuote = payload.quote

        return 'price'
      }

      if (status === 409) {
        return 'hold'
      }

      if (status === 503) {
        submitError.value = payload.message ?? body.message ?? 'Online payment could not be started.'

        if (payload.references) {
          flow.value.confirmation = {
            path: 'PAY_LATER',
            references: payload.references,
            email: flow.value.email
          }
        }

        return 'error'
      }

      submitError.value = engineErrorMessage(error)

      return 'error'
    } finally {
      submitting.value = false
    }
  }

  async function status(token: string): Promise<CheckoutStatus | null> {
    try {
      return await request(`/api/engine/checkout/${token}/status`) as CheckoutStatus
    } catch {
      return null
    }
  }

  function setPath(path: CheckoutPath): void {
    if (flow.value.path === path) {
      return
    }

    flow.value.path = path
    flow.value.serverQuote = null
  }

  return reactive({
    quoting,
    submitting,
    priceChanged,
    cabinConflict,
    submitError,
    quote,
    placeHold,
    submit,
    status,
    setPath
  })
}

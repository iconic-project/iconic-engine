import type { StayQuote } from '../types/stay'
import type { PartyLine } from '../utils/partyPlan'
import type { StaySearch } from '../utils/stayQuery'

export type StayHold = {
  token: string
  expiresAt: string
  extended: boolean
}

export type StayConfirmation = {
  path: 'PAY_LATER' | 'PAY_DEPOSIT'
  references: Array<string>
  email: string
}

export type StaySession = {
  search: StaySearch | null
  lines: Array<PartyLine>
  quote: StayQuote | null
  hold: StayHold | null
  confirmation: StayConfirmation | null
}

const STORAGE_KEY = 'iconic-stay'

function emptySession(): StaySession {
  return {
    search: null,
    lines: [],
    quote: null,
    hold: null,
    confirmation: null
  }
}

export function useStaySession() {
  const session = useState<StaySession>('stay-session', emptySession)

  if (import.meta.client && session.value.search === null && session.value.quote === null) {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)

      if (raw) {
        session.value = { ...emptySession(), ...JSON.parse(raw) as Partial<StaySession> }
      }
    } catch {
      session.value = emptySession()
    }
  }

  watch(session, (value) => {
    if (!import.meta.client) {
      return
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  }, { deep: true })

  return { session }
}

import type { EngineSettings, MarketingLeadInput } from '../types/api'

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export const MARKETING_LEAD_POSTED_KEY = 'iconic-checkout-marketing-lead'

export type MarketingLeadAttempt = {
  ticked: boolean
  email: string
  firstName: string
  version: string
  posted: boolean
  sessionId?: string | null
}

/** The feed alias omits this key. `in` narrows it to unknown on the closed object. */
export function checkoutMarketingVersion(
  versions: EngineSettings['legal']['consent_versions'] | undefined
): string {
  if (!versions || !('checkout_marketing' in versions)) {
    return ''
  }

  const value = versions.checkout_marketing

  return typeof value === 'string' ? value : ''
}

/**
 * One body, or nothing. Unticked, already posted, or an incomplete address
 * does not post. Unticking after a post is not a withdrawal.
 */
export function marketingLeadBody(attempt: MarketingLeadAttempt): MarketingLeadInput | null {
  const email = attempt.email.trim()
  const firstName = attempt.firstName.trim()
  const version = attempt.version.trim()

  if (!attempt.ticked || attempt.posted || !firstName || !version || !EMAIL.test(email)) {
    return null
  }

  const body: MarketingLeadInput = {
    email,
    first_name: firstName,
    consent: true,
    version
  }

  const sessionId = attempt.sessionId?.trim()

  if (sessionId) {
    body.session_id = sessionId
  }

  return body
}

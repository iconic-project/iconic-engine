export type AnalyticsConsent = 'unset' | 'accepted' | 'refused'

export const ANALYTICS_STORAGE_KEY = 'iconic-engine-analytics'

export function analyticsAllowed(consent: AnalyticsConsent, measurementId: string): boolean {
  return consent === 'accepted' && measurementId.trim() !== ''
}

/** The banner is the shared choice. A missing GA measurement id does not hide it. */
export function showConsentBanner(consent: AnalyticsConsent): boolean {
  return consent === 'unset'
}

/** A refusal in another tab arrives as a storage event. Accepted does not revoke. */
export function remoteConsentRevoked(newValue: string | null): boolean {
  return newValue !== 'accepted'
}

export function readStoredConsent(storage?: Pick<Storage, 'getItem'>): AnalyticsConsent {
  if (!storage) {
    return 'unset'
  }

  try {
    const value = storage.getItem(ANALYTICS_STORAGE_KEY)

    if (value === 'accepted' || value === 'refused') {
      return value
    }
  } catch {
    return 'unset'
  }

  return 'unset'
}

export function writeStoredConsent(
  value: 'accepted' | 'refused',
  storage?: Pick<Storage, 'setItem'>
): void {
  if (!storage) {
    return
  }

  try {
    storage.setItem(ANALYTICS_STORAGE_KEY, value)
  } catch {
    // private mode / quota
  }
}

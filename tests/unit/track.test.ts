import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyticsAllowed, readStoredConsent, remoteConsentRevoked, showConsentBanner } from '../../app/utils/analyticsConsent'
import { configureTrack, resetTrackForTests, track } from '../../app/composables/useTrack'

describe('consent gating of track', () => {
  afterEach(() => {
    resetTrackForTests()
    vi.unstubAllGlobals()
  })

  it('shows the banner whenever the choice is unset', () => {
    expect(showConsentBanner('unset')).toBe(true)
    expect(showConsentBanner('accepted')).toBe(false)
    expect(showConsentBanner('refused')).toBe(false)
    expect(remoteConsentRevoked('refused')).toBe(true)
    expect(remoteConsentRevoked(null)).toBe(true)
    expect(remoteConsentRevoked('accepted')).toBe(false)
  })

  it('is off without consent or without a measurement id', () => {
    expect(analyticsAllowed('unset', 'G-TEST')).toBe(false)
    expect(analyticsAllowed('refused', 'G-TEST')).toBe(false)
    expect(analyticsAllowed('accepted', '')).toBe(false)
    expect(analyticsAllowed('accepted', 'G-TEST')).toBe(true)
  })

  it('does nothing when consent is missing', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })
    configureTrack('unset', 'G-TEST')
    track('search_availability', { adults: 2 })
    expect(gtag).not.toHaveBeenCalled()
  })

  it('does nothing when the measurement id is empty', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })
    configureTrack('accepted', '')
    track('charter_inquiry_submit', { num_passengers: 12 })
    expect(gtag).not.toHaveBeenCalled()
  })

  it('pushes a GA4 event after consent and with an id', () => {
    const gtag = vi.fn()
    vi.stubGlobal('window', { gtag })
    configureTrack('accepted', 'G-TEST')
    track('search_availability', { adults: 2 })
    expect(gtag).toHaveBeenCalledWith('event', 'search_availability', { adults: 2 })
  })

  it('reads a stored choice per visitor', () => {
    const storage = {
      getItem: (key: string) => key === 'iconic-engine-analytics' ? 'accepted' : null
    }
    expect(readStoredConsent(storage)).toBe('accepted')
    expect(readStoredConsent({ getItem: () => null })).toBe('unset')
  })
})

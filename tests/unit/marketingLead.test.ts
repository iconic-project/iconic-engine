import { describe, expect, it } from 'vitest'
import type { EngineSettings } from '../../app/types/api'
import { checkoutMarketingVersion, marketingLeadBody } from '../../app/utils/marketingLead'

const versions = {
  terms: 'terms-v',
  cancellation: 'cancel-v',
  privacy: 'privacy-v',
  insurance: 'insurance-v',
  marketing: 'marketing-v',
  checkout_marketing: 'v1 (pending LEG-002)'
} as EngineSettings['legal']['consent_versions']

describe('checkout marketing lead', () => {
  it('reads the version only when the feed object actually has a string', () => {
    expect(checkoutMarketingVersion(versions)).toBe('v1 (pending LEG-002)')
    expect(checkoutMarketingVersion({
      terms: 'terms-v',
      cancellation: 'cancel-v',
      privacy: 'privacy-v',
      insurance: 'insurance-v',
      marketing: 'marketing-v'
    })).toBe('')
    expect(checkoutMarketingVersion(undefined)).toBe('')
  })

  it('posts once, and only when the box is ticked with an address and a version', () => {
    const ready = {
      ticked: true,
      email: 'ada@iconic.test',
      firstName: 'Ada',
      version: 'v1 (pending LEG-002)',
      posted: false,
      sessionId: 'session-1'
    }

    expect(marketingLeadBody({ ...ready, ticked: false })).toBeNull()
    expect(marketingLeadBody({ ...ready, email: '' })).toBeNull()
    expect(marketingLeadBody({ ...ready, firstName: '  ' })).toBeNull()
    expect(marketingLeadBody({ ...ready, version: '' })).toBeNull()

    expect(marketingLeadBody(ready)).toEqual({
      email: 'ada@iconic.test',
      first_name: 'Ada',
      consent: true,
      version: 'v1 (pending LEG-002)',
      session_id: 'session-1'
    })

    expect(marketingLeadBody({ ...ready, posted: true })).toBeNull()
    expect(marketingLeadBody({ ...ready, posted: true, ticked: false })).toBeNull()
    expect(marketingLeadBody({ ...ready, sessionId: null }).session_id).toBeUndefined()
  })
})

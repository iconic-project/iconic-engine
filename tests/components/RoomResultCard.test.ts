import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import RoomResultCard from '../../app/components/stay/RoomResultCard.vue'
import type { AvailabilityType } from '../../app/types/stay'

const blocked: AvailabilityType = {
  code: 'STD',
  name: 'Standard',
  bookable: false,
  reasons: ['MIN_STAY:3'],
  rooms_left: 2,
  waitlist_enabled: false,
  quotes: []
}

const open: AvailabilityType = {
  code: 'STD',
  name: 'Standard',
  bookable: true,
  reasons: [],
  rooms_left: 4,
  waitlist_enabled: false,
  quotes: [{
    rate_plan: 'BAR',
    night_lines: [
      { night: '2026-12-21', total: 250 },
      { night: '2026-12-22', total: 250 },
      { night: '2026-12-23', total: 250 }
    ],
    tax_lines: [],
    total: 750,
    deposit_pct: 30,
    deposit: 225,
    total_including_charged_taxes: 750
  }]
}

describe('room result card', () => {
  it('shows the minimum stay and offers to change the length', async () => {
    const nights: Array<number> = []
    const wrapper = await mountSuspended(RoomResultCard, {
      props: {
        roomType: blocked,
        threshold: 3,
        quantity: 0,
        maxQuantity: 2,
        plan: 'BAR',
        onChangeNights: (nightsCount: number) => {
          nights.push(nightsCount)
        }
      }
    })

    expect(wrapper.text()).toContain('Minimum stay 3 nights from this date')
    expect(wrapper.text()).toContain('Change to 3 nights')
    expect(wrapper.text()).toContain('Only 2 left')
    await wrapper.get('button').trigger('click')
    expect(nights).toEqual([3])
  })

  it('shows the stay price and the nightly amount from the quote', async () => {
    const wrapper = await mountSuspended(RoomResultCard, {
      props: {
        roomType: open,
        threshold: 3,
        quantity: 1,
        maxQuantity: 5,
        plan: 'BAR'
      }
    })

    expect(wrapper.text()).toContain('USD 750')
    expect(wrapper.text()).toContain('USD 250')
    expect(wrapper.text()).not.toContain('Only')
  })
})

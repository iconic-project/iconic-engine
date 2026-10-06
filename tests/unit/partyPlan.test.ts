import { describe, expect, it } from 'vitest'
import { distributeParty, previewParty, type PlannedRoom } from '../../app/utils/partyPlan'

const occupancy = { maxAdults: 2, maxChildren: 1, maxOccupancy: 3 }

function room(code: string): PlannedRoom {
  return { roomType: code, ratePlan: 'BAR', occupancy }
}

describe('party plan', () => {
  it('previews one share of a multi-room party', () => {
    expect(previewParty(4, [8, 11, 6], 2)).toEqual({
      adults: 2,
      childAges: [8, 11]
    })
  })

  it('puts one adult in each room, then the rest of the party', () => {
    const result = distributeParty(4, [8, 11], [room('STD'), room('TWN')], true)

    expect(result).toEqual({
      ok: true,
      lines: [
        { room_type: 'STD', adults: 2, child_ages: [8], rate_plan: 'BAR' },
        { room_type: 'TWN', adults: 2, child_ages: [11], rate_plan: 'BAR' }
      ]
    })
  })

  it('fails when an adult is required and there are fewer adults than rooms', () => {
    expect(distributeParty(1, [], [room('STD'), room('TWN')], true)).toEqual({ ok: false })
  })

  it('fails when a child does not fit the occupancy', () => {
    expect(distributeParty(2, [8, 11], [room('STD')], true)).toEqual({ ok: false })
  })
})

import { describe, expect, it } from 'vitest'
import { parsePicks, parseStayQuery, stayQuery } from '../../app/utils/stayQuery'

describe('stay query', () => {
  it('round-trips a shareable search and the room picks', () => {
    const search = {
      checkIn: '2026-12-21',
      checkOut: '2026-12-24',
      adults: 4,
      childAges: [8, 11],
      rooms: 2
    }
    const picks = [
      { roomType: 'STD', quantity: 1, ratePlan: 'BAR' },
      { roomType: 'TWN', quantity: 1, ratePlan: 'NR' }
    ]
    const query = stayQuery(search, picks)

    expect(parseStayQuery(query)).toEqual(search)
    expect(parsePicks(query.pick)).toEqual(picks)
    expect(query).toEqual({
      check_in: '2026-12-21',
      check_out: '2026-12-24',
      adults: '4',
      rooms: '2',
      child_ages: '8,11',
      pick: 'STD:1:BAR,TWN:1:NR'
    })
  })

  it('rejects a stay that does not cover a night', () => {
    expect(parseStayQuery({
      check_in: '2026-12-21',
      check_out: '2026-12-21',
      adults: '2',
      rooms: '1'
    })).toBeNull()
  })

  it('rejects a child age that is not a whole number', () => {
    expect(parseStayQuery({
      check_in: '2026-12-21',
      check_out: '2026-12-24',
      adults: '2',
      rooms: '1',
      child_ages: '8,x'
    })).toBeNull()
  })
})

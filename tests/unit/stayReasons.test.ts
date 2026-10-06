import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseReason, roomsLeftLabel } from '../../app/utils/stayReasons'

describe('stay reasons', () => {
  it('keeps the minimum-stay sentence the guest sees', () => {
    const copy = JSON.parse(readFileSync(new URL('../../i18n/locales/en.json', import.meta.url), 'utf8')) as {
      stayShop: { reasons: { minStay: string }, changeNights: string, onlyLeft: string }
    }

    expect(copy.stayShop.reasons.minStay).toBe('Minimum stay {n} nights from this date')
    expect(copy.stayShop.changeNights).toBe('Change to {n} nights')
    expect(copy.stayShop.onlyLeft).toBe('Only {n} left')
    expect(parseReason('MIN_STAY:3')).toEqual({ key: 'minStay', n: 3, code: 'MIN_STAY:3' })
  })

  it('names the closed and sold-out codes and leaves an unknown code raw', () => {
    expect(parseReason('SOLD_OUT').key).toBe('soldOut')
    expect(parseReason('CLOSED_TO_ARRIVAL').key).toBe('closedToArrival')
    expect(parseReason('CLOSED_TO_DEPARTURE').key).toBe('closedToDeparture')
    expect(parseReason('OVER_OCCUPANCY').key).toBe('overOccupancy')
    expect(parseReason('NO_RATE').key).toBe('noRate')
    expect(parseReason('STOP_SELL').key).toBe('stopSell')
    expect(parseReason('NO_SINGLE_ROOM').key).toBe('noSingleRoom')
    expect(parseReason('MAX_STAY:14')).toEqual({ key: 'maxStay', n: 14, code: 'MAX_STAY:14' })
    expect(parseReason('WEIRD')).toEqual({ key: 'unknown', n: null, code: 'WEIRD' })
  })

  it('shows a count only when rooms left are within the threshold', () => {
    expect(roomsLeftLabel(2, 3)).toBe(2)
    expect(roomsLeftLabel(4, 3)).toBeNull()
  })
})

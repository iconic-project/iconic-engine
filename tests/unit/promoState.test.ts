import { describe, expect, it } from 'vitest'
import { applyPromoResult, emptyPromo, removePromoForReason } from '../../app/utils/promoState'

describe('promo state', () => {
  it('moves empty → invalid → applied → removed', () => {
    const empty = emptyPromo()
    const invalid = applyPromoResult(empty, 'NOPE', false, 'This code is not valid', null)
    expect(invalid.phase).toBe('invalid')
    expect(invalid.message).toBe('This code is not valid')

    const applied = applyPromoResult(empty, 'ICONIC10', true, null, 'Iconic welcome −10% applied')
    expect(applied.phase).toBe('applied')
    expect(applied.code).toBe('ICONIC10')
    expect(applied.locked).toBe(true)

    const removed = applyPromoResult(applied, 'ICONIC10', true, null, null)
    expect(removed.phase).toBe('empty')
    expect(removed.locked).toBe(false)

    const festive = removePromoForReason('This code does not apply to festive departures')
    expect(festive.phase).toBe('removed')
    expect(festive.message).toContain('festive')
  })
})

import { describe, expect, it } from 'vitest'
import { onlineDepositForPath, requiredDeclarations, withOnlineDeposit } from '../../app/utils/pathQuote'

describe('path switching', () => {
  it('requotes with the online advantage only on PAY_DEPOSIT', () => {
    const room = { room_type: 'STD', adults: 2, child_ages: [], rate_plan: 'BAR' }

    expect(onlineDepositForPath('PAY_LATER')).toBe(false)
    expect(onlineDepositForPath('PAY_DEPOSIT')).toBe(true)
    expect(withOnlineDeposit([room], 'PAY_LATER')).toEqual([room])
    expect(withOnlineDeposit([room], 'PAY_DEPOSIT')).toEqual([{ ...room, online_deposit: true }])
  })

  it('requires four declarations for the deposit path', () => {
    expect(requiredDeclarations('PAY_DEPOSIT')).toEqual([
      'TERMS',
      'CANCELLATION',
      'PRIVACY',
      'INSURANCE'
    ])
    expect(requiredDeclarations('PAY_LATER')).toEqual(['PRIVACY', 'INSURANCE'])
  })
})

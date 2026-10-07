import type { CheckoutPath } from '../types/api'

export type QuoteRoom = {
  room_type: string
  adults: number
  child_ages: Array<number>
  rate_plan: string
  online_deposit?: boolean
}

export function onlineDepositForPath(path: CheckoutPath): boolean {
  return path === 'PAY_DEPOSIT'
}

export function withOnlineDeposit<T extends QuoteRoom>(lines: Array<T>, path: CheckoutPath): Array<T & { online_deposit?: boolean }> {
  if (!onlineDepositForPath(path)) {
    return lines
  }

  return lines.map(line => ({ ...line, online_deposit: true }))
}

export function requiredDeclarations(path: CheckoutPath): Array<string> {
  if (path === 'PAY_DEPOSIT') {
    return ['TERMS', 'CANCELLATION', 'PRIVACY', 'INSURANCE']
  }

  return ['PRIVACY', 'INSURANCE']
}

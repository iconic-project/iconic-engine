import { describe, expect, it } from 'vitest'
import type { EngineDeparture, EngineOffer, EngineRates } from '../../app/types/api'
import {
  applyMonthClick,
  buildMonthGrid,
  cardDealbar,
  classifyLabel,
  ENGINE_FEED_LABEL_FIXTURES,
  ENGINE_FEED_LABELS,
  fromPrice,
  inWindow,
  isSelectable,
  minCabins,
  partyFits,
  rowAction,
  suitePpDouble,
  suitesFrom
} from '../../app/utils/engineFlow'

function dep(overrides: Partial<EngineDeparture> = {}): EngineDeparture {
  return {
    id: 1,
    itinerary: 'WEST',
    yacht: 'ANAMARA',
    embark: '2027-11-07',
    disembark: '2027-11-14',
    festive: false,
    rate_year: 2027,
    status: 'ON_SALE',
    suites_free: 6,
    owner_free: true,
    label: ENGINE_FEED_LABELS.available,
    urgency_threshold: 3,
    waitlist: true,
    note: null,
    offers: [],
    ...overrides
  }
}

const rates: EngineRates = {
  currency: 'USD',
  years: [2027],
  suite_pp_double: { 2027: 13300 },
  owner_pp_double: { 2027: 25000 },
  charter_week: { 2027: 199500 },
  terms: {
    cabin_deposit_pct: 10,
    cabin_balance_days: 120,
    charter_deposit_pct: 20,
    charter_deposit_business_days: 5,
    charter_balance_days: 120
  },
  rules: {
    single_supplement_pct: 75,
    triple_discount_pct: 10,
    child_discount_pct: 15,
    child_discounts_per_adult: 1,
    child_discounts_per_cabin: 2,
    back_to_back_pct: 5,
    festive_supplement_pp: 750,
    festive_supplement_charter: 12000
  }
}

function offer(overrides: Partial<EngineOffer> = {}): EngineOffer {
  return {
    code: 'EARLY10',
    type: 'PCT',
    value: 10,
    cabins: ['SUITE'],
    itineraries: ['WEST'],
    booking_window: [null, null],
    travel_window: [null, null],
    combinable: false,
    badge: 'EARLY',
    show_on_card: true,
    show_on_departures: true,
    price_line: 'Early booking',
    terms: null,
    ...overrides
  }
}

describe('minCabins', () => {
  it('uses max per cabin from settings, not 3', () => {
    expect(minCabins(2, 3)).toBe(1)
    expect(minCabins(4, 3)).toBe(2)
    expect(minCabins(4, 2)).toBe(2)
    expect(minCabins(5, 2)).toBe(3)
  })
})

describe('applyMonthClick', () => {
  it('is a two-click range: first sets both ends, second sets the end', () => {
    const first = applyMonthClick({ from: '2027-11', to: '2028-01', phase: 0 }, '2027-12')
    expect(first).toEqual({ from: '2027-12', to: '2027-12', phase: 1 })

    const second = applyMonthClick(first, '2028-02')
    expect(second).toEqual({ from: '2027-12', to: '2028-02', phase: 0 })
  })

  it('swaps when the second click is earlier', () => {
    const first = applyMonthClick({ from: '2027-11', to: '2027-11', phase: 0 }, '2028-01')
    const second = applyMonthClick(first, '2027-11')
    expect(second).toEqual({ from: '2027-11', to: '2028-01', phase: 0 })
  })
})

describe('buildMonthGrid / inWindow', () => {
  it('opens at the first bookable month and disables earlier cells', () => {
    const grid = buildMonthGrid('2027-11', 24)
    expect(grid[0].year).toBe(2027)
    expect(grid[0].months[9].disabled).toBe(true)
    expect(grid[0].months[10].disabled).toBe(false)
    expect(grid[0].months[10].ym).toBe('2027-11')
  })

  it('keeps an embark date inside the chosen months', () => {
    expect(inWindow('2027-11-07', '2027-11', '2028-01')).toBe(true)
    expect(inWindow('2028-02-06', '2027-11', '2028-01')).toBe(false)
  })
})

describe('party fit and rowAction', () => {
  it('treats owner suite as a free cabin', () => {
    expect(partyFits(dep({ suites_free: 1, owner_free: true }), 2)).toBe(true)
    expect(partyFits(dep({ suites_free: 1, owner_free: false }), 2)).toBe(false)
  })

  it('classifies every EngineLabelTest fixture text', () => {
    const kinds = ENGINE_FEED_LABEL_FIXTURES.map(label => classifyLabel(label))
    expect(kinds).toEqual([
      'available',
      'only_n_left',
      'only_n_left',
      'limited',
      'full_waitlist',
      'full',
      'closed',
      'charter'
    ])
  })

  it('recognises other ONLY n labels built like the two fixtures', () => {
    expect(classifyLabel('ONLY 2 CABINS LEFT')).toBe('only_n_left')
  })

  it('throws on an unknown feed label so a wording change fails CI', () => {
    expect(() => classifyLabel('ON SALE')).toThrow(/Unrecognised engine label/)
    expect(() => classifyLabel('AVAILABLE ')).toThrow(/Unrecognised engine label/)
    expect(() => rowAction(dep({ label: 'Available' }), 1)).toThrow(/Unrecognised engine label/)
  })

  it('never selects LIMITED AVAILABILITY', () => {
    const limited = dep({
      label: ENGINE_FEED_LABELS.limited,
      suites_free: 0,
      owner_free: false
    })
    expect(isSelectable(limited, 1)).toBe(false)
    expect(rowAction(limited, 1)).toEqual({ type: 'waitlist_contact' })
  })

  it('sends PRIVATE CHARTER ONLY to contact', () => {
    expect(rowAction(dep({ label: ENGINE_FEED_LABELS.charter }), 1)).toEqual({ type: 'contact' })
    expect(isSelectable(dep({ label: ENGINE_FEED_LABELS.charter }), 1)).toBe(false)
  })

  it('offers waitlist when the party does not fit', () => {
    const tight = dep({ suites_free: 1, owner_free: false, label: ENGINE_FEED_LABELS.available })
    expect(isSelectable(tight, 2)).toBe(false)
    expect(rowAction(tight, 2)).toEqual({ type: 'waitlist' })
  })

  it('selects AVAILABLE when the party fits', () => {
    expect(isSelectable(dep(), 2)).toBe(true)
    expect(rowAction(dep({ label: ENGINE_FEED_LABELS.only1, suites_free: 1 }), 1)).toEqual({ type: 'select' })
    expect(rowAction(dep({ label: ENGINE_FEED_LABELS.only3, suites_free: 3 }), 2)).toEqual({ type: 'select' })
  })

  it('maps the remaining EngineLabel fixtures to the documented CTAs', () => {
    expect(rowAction(dep({ label: ENGINE_FEED_LABELS.fullWaitlist }), 1)).toEqual({ type: 'waitlist' })
    expect(rowAction(dep({ label: ENGINE_FEED_LABELS.full, waitlist: false }), 1)).toEqual({ type: 'none' })
    expect(rowAction(dep({ label: ENGINE_FEED_LABELS.full, waitlist: true }), 1)).toEqual({ type: 'waitlist' })
    expect(rowAction(dep({ label: ENGINE_FEED_LABELS.closed }), 1)).toEqual({ type: 'contact' })
  })
})

describe('fromPrice / dealbar', () => {
  it('strikes a PCT offer and leaves CREDIT as a badge + line', () => {
    const pct = fromPrice(dep({ offers: ['EARLY10'] }), rates, [offer()])
    expect(pct.pct).toBe(10)
    expect(pct.now).toBe(11970)
    expect(pct.base).toBe(13300)

    const credit = fromPrice(dep({ offers: ['OPEN'] }), rates, [
      offer({ code: 'OPEN', type: 'CREDIT', value: 500, badge: 'OPENING OFFER', price_line: 'On-board credit' })
    ])
    expect(credit.pct).toBeNull()
    expect(credit.badge).toBe('OPENING OFFER')
    expect(credit.priceLine).toBe('On-board credit')
    expect(credit.now).toBe(13300)
  })

  it('reads suite rates when the feed sends a year-aligned array', () => {
    const listed: EngineRates = {
      ...rates,
      years: [2027, 2028],
      suite_pp_double: [13300, 13965] as unknown as EngineRates['suite_pp_double']
    }

    expect(suitePpDouble(listed, 2027)).toBe(13300)
    expect(suitesFrom([dep()], listed)).toBe(13300)
    expect(fromPrice(dep(), listed, []).base).toBe(13300)
  })

  it('summarises card offers without inventing a percent for credit-only', () => {
    const bar = cardDealbar(
      [dep({ offers: ['OPEN'] })],
      rates,
      [offer({ code: 'OPEN', type: 'CREDIT', value: 500, badge: 'OPENING OFFER' })]
    )
    expect(bar?.bestPct).toBeNull()
    expect(bar?.count).toBe(1)
    expect(bar?.from).toBe(13300)
  })
})

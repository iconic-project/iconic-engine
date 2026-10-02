import type { EngineDeparture, EngineOffer, EngineRates } from '../types/api'

/**
 * Exact `text` values from
 * iconic-api/tests/Unit/Support/Inventory/EngineLabelTest.php
 * (copied, not retyped). Feed-visible labels only —
 * `NOT SHOWN` and `CHARTERED — NOT SHOWN` are filtered out by EngineFeed.
 */
export const ENGINE_FEED_LABELS = {
  available: 'AVAILABLE',
  only1: 'ONLY 1 CABIN LEFT',
  only3: 'ONLY 3 CABINS LEFT',
  limited: 'LIMITED AVAILABILITY',
  fullWaitlist: 'FULL · WAITLIST',
  full: 'FULL',
  closed: 'CLOSED — ENQUIRE',
  charter: 'PRIVATE CHARTER ONLY'
} as const

export const ENGINE_FEED_LABEL_FIXTURES: Array<string> = [
  ENGINE_FEED_LABELS.available,
  ENGINE_FEED_LABELS.only1,
  ENGINE_FEED_LABELS.only3,
  ENGINE_FEED_LABELS.limited,
  ENGINE_FEED_LABELS.fullWaitlist,
  ENGINE_FEED_LABELS.full,
  ENGINE_FEED_LABELS.closed,
  ENGINE_FEED_LABELS.charter
]

/**
 * Family matcher derived from the two ONLY-n fixtures
 * (`ONLY 1 CABIN LEFT` / `ONLY 3 CABINS LEFT`).
 */
const ONLY_N_LEFT = /^ONLY \d+ CABINS? LEFT$/

export const MONTHS: Array<string> = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
]

export type LabelKind
  = | 'available'
    | 'only_n_left'
    | 'limited'
    | 'full_waitlist'
    | 'full'
    | 'closed'
    | 'charter'

export type RowAction
  = | { type: 'select' }
    | { type: 'waitlist' }
    | { type: 'waitlist_contact' }
    | { type: 'contact' }
    | { type: 'charter' }
    | { type: 'none' }

export type MonthPickPhase = 0 | 1

export type MonthPick = {
  from: string
  to: string
  phase: MonthPickPhase
}

export type MonthCell = {
  year: number
  month: number
  ym: string
  disabled: boolean
}

export type MonthYear = {
  year: number
  months: Array<MonthCell>
}

export type CabinCount = {
  suites_free: number
  owner_free: boolean
}

export type LabelledDeparture = CabinCount & {
  label: string
  waitlist: boolean
}

export type PricedDeparture = {
  rate_year: number
  festive: boolean
  offers: Array<string>
}

export type FromPrice = {
  base: number
  now: number
  pct: number | null
  badge: string | null
  priceLine: string | null
  festive: boolean
}

export type CardDealbar = {
  count: number
  bestPct: number | null
  from: number
  badge: string | null
}

export function classifyLabel(label: string): LabelKind {
  if (label === ENGINE_FEED_LABELS.available) {
    return 'available'
  }

  if (label === ENGINE_FEED_LABELS.limited) {
    return 'limited'
  }

  if (label === ENGINE_FEED_LABELS.fullWaitlist) {
    return 'full_waitlist'
  }

  if (label === ENGINE_FEED_LABELS.full) {
    return 'full'
  }

  if (label === ENGINE_FEED_LABELS.closed) {
    return 'closed'
  }

  if (label === ENGINE_FEED_LABELS.charter) {
    return 'charter'
  }

  if (ONLY_N_LEFT.test(label)) {
    return 'only_n_left'
  }

  throw new Error(`Unrecognised engine label: ${label}`)
}

export function minCabins(party: number, maxPerCabin: number): number {
  if (maxPerCabin < 1) {
    throw new Error('maxPerCabin must be at least 1')
  }

  return Math.ceil(party / maxPerCabin)
}

export function freeCabins(dep: CabinCount): number {
  return dep.suites_free + (dep.owner_free ? 1 : 0)
}

export function partyFits(dep: CabinCount, min: number): boolean {
  return freeCabins(dep) >= min
}

export function rowAction(dep: LabelledDeparture, min: number): RowAction {
  const kind = classifyLabel(dep.label)

  if (kind === 'available' || kind === 'only_n_left') {
    if (partyFits(dep, min)) {
      return { type: 'select' }
    }

    return dep.waitlist ? { type: 'waitlist' } : { type: 'none' }
  }

  if (kind === 'limited') {
    return dep.waitlist ? { type: 'waitlist_contact' } : { type: 'contact' }
  }

  if (kind === 'full_waitlist' || kind === 'full') {
    return dep.waitlist ? { type: 'waitlist' } : { type: 'none' }
  }

  if (kind === 'closed') {
    return { type: 'contact' }
  }

  return { type: 'charter' }
}

export function isSelectable(dep: LabelledDeparture, min: number): boolean {
  return rowAction(dep, min).type === 'select'
}

export function labelToneClass(label: string): string {
  const kind = classifyLabel(label)

  if (kind === 'available') {
    return 'st-av'
  }

  if (kind === 'only_n_left' || kind === 'limited') {
    return 'st-ur'
  }

  return 'st-fu'
}

export function isDimmedRow(label: string): boolean {
  const kind = classifyLabel(label)

  return kind === 'full' || kind === 'full_waitlist'
}

export function parseYm(ym: string): [number, number] {
  const parts = ym.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error(`Invalid year-month: ${ym}`)
  }

  return [year, month - 1]
}

export function toYm(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

export function ymIndex(ym: string): number {
  const [year, month] = parseYm(ym)

  return year * 12 + month
}

export function applyMonthClick(state: MonthPick, clicked: string): MonthPick {
  if (state.phase === 0) {
    return { from: clicked, to: clicked, phase: 1 }
  }

  if (ymIndex(clicked) < ymIndex(state.from)) {
    return { from: clicked, to: state.to, phase: 0 }
  }

  return { from: state.from, to: clicked, phase: 0 }
}

export function buildMonthGrid(firstBookable: string, horizonMonths: number): Array<MonthYear> {
  const firstIndex = ymIndex(firstBookable)
  const lastIndex = firstIndex + horizonMonths - 1
  const startYear = parseYm(firstBookable)[0]
  const endYear = Math.floor(lastIndex / 12)
  const years: Array<MonthYear> = []

  for (let year = startYear; year <= endYear; year += 1) {
    const months: Array<MonthCell> = []

    for (let month = 0; month < 12; month += 1) {
      const index = year * 12 + month
      months.push({
        year,
        month,
        ym: toYm(year, month),
        disabled: index < firstIndex || index > lastIndex
      })
    }

    years.push({ year, months })
  }

  return years
}

export function inWindow(embark: string, from: string, to: string): boolean {
  if (!from || !to || !embark) {
    return false
  }

  const value = ymIndex(embark.slice(0, 7))

  return value >= ymIndex(from) && value <= ymIndex(to)
}

export function formatUsd(amount: number): string {
  return `USD ${amount.toLocaleString('en-US')}`
}

export function formatMonthRange(from: string, to: string): string {
  if (!from || !to) {
    return ''
  }

  const [fromYear, fromMonth] = parseYm(from)
  const [toYear, toMonth] = parseYm(to)

  return `${MONTHS[fromMonth] ?? ''} ${fromYear} — ${MONTHS[toMonth] ?? ''} ${toYear}`
}

export function formatMonthShort(ym: string): string {
  if (!ym) {
    return ''
  }

  const [year, month] = parseYm(ym)

  return `${(MONTHS[month] ?? '').slice(0, 3)} ${year}`
}

export function formatIsoDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  })
}

export function departureOffers(
  dep: { offers: Array<string> },
  offers: Array<EngineOffer>
): Array<EngineOffer> {
  return dep.offers
    .map(code => offers.find(offer => offer.code === code))
    .filter((offer): offer is EngineOffer => offer !== undefined)
}

export function suitePpDouble(rates: EngineRates, year: number): number {
  const table = rates.suite_pp_double as Record<string, number> | Array<number>

  if (Array.isArray(table)) {
    const index = rates.years.indexOf(year)

    return table[index] ?? 0
  }

  return table[String(year)] ?? 0
}

export function fromPrice(
  dep: PricedDeparture,
  rates: EngineRates,
  offers: Array<EngineOffer>
): FromPrice {
  const base = suitePpDouble(rates, dep.rate_year)
  const applied = departureOffers(dep, offers).filter(offer => offer.show_on_departures)
  const pct = applied.find(offer => offer.type === 'PCT' && offer.value !== null)
  const first = applied[0] ?? null

  if (pct?.value) {
    return {
      base,
      now: Math.round(base * (1 - pct.value / 100)),
      pct: pct.value,
      badge: pct.badge ?? `−${pct.value}%`,
      priceLine: pct.price_line,
      festive: dep.festive
    }
  }

  return {
    base,
    now: base,
    pct: null,
    badge: first?.badge ?? null,
    priceLine: first?.price_line ?? null,
    festive: dep.festive
  }
}

export function cardDealbar(
  deps: Array<EngineDeparture>,
  rates: EngineRates,
  offers: Array<EngineOffer>
): CardDealbar | null {
  const withOffers = deps.filter(dep =>
    departureOffers(dep, offers).some(offer => offer.show_on_card)
  )

  if (withOffers.length === 0) {
    return null
  }

  const pctOffers = withOffers.flatMap(dep =>
    departureOffers(dep, offers).filter(offer =>
      offer.show_on_card && offer.type === 'PCT' && offer.value !== null
    )
  )
  const bestPct = pctOffers.length > 0
    ? Math.max(...pctOffers.map(offer => offer.value as number))
    : null
  const fromBases = withOffers.map((dep) => {
    const base = suitePpDouble(rates, dep.rate_year)

    if (bestPct === null) {
      return base
    }

    return Math.round(base * (1 - bestPct / 100))
  })
  const first = withOffers[0]
  const firstBadge = first
    ? departureOffers(first, offers).find(offer => offer.show_on_card)?.badge ?? null
    : null

  return {
    count: withOffers.length,
    bestPct,
    from: Math.min(...fromBases),
    badge: firstBadge
  }
}

export function suitesFrom(
  deps: Array<EngineDeparture>,
  rates: EngineRates
): number | null {
  if (deps.length === 0) {
    const years = rates.years

    if (years.length === 0) {
      return null
    }

    return suitePpDouble(rates, years[0] ?? 0) || null
  }

  const amounts = deps
    .map(dep => suitePpDouble(rates, dep.rate_year))
    .filter(amount => amount > 0)

  if (amounts.length === 0) {
    return null
  }

  return Math.min(...amounts)
}

export function labelClassForAction(action: RowAction['type']): string {
  if (action === 'select') {
    return 'btn'
  }

  return 'btn o'
}

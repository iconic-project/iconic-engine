export type StaySearch = {
  checkIn: string
  checkOut: string
  adults: number
  childAges: Array<number>
  rooms: number
}

export type StayPick = {
  roomType: string
  quantity: number
  ratePlan: string
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

function one(value: unknown): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : ''
  }

  return typeof value === 'string' ? value : ''
}

function intAtLeast(value: string, min: number): number | null {
  if (!/^\d+$/.test(value)) {
    return null
  }

  const parsed = Number(value)

  return parsed >= min ? parsed : null
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = Date.parse(`${checkIn}T00:00:00Z`)
  const end = Date.parse(`${checkOut}T00:00:00Z`)

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 0
  }

  return Math.round((end - start) / 86_400_000)
}

export function addNights(checkIn: string, nights: number): string {
  const start = new Date(`${checkIn}T00:00:00Z`)
  start.setUTCDate(start.getUTCDate() + nights)

  return start.toISOString().slice(0, 10)
}

export function parseStayQuery(query: Record<string, unknown>): StaySearch | null {
  const checkIn = one(query.check_in)
  const checkOut = one(query.check_out)
  const adults = intAtLeast(one(query.adults), 1)
  const rooms = intAtLeast(one(query.rooms), 1)

  if (!DATE.test(checkIn) || !DATE.test(checkOut) || adults === null || rooms === null) {
    return null
  }

  if (nightsBetween(checkIn, checkOut) < 1) {
    return null
  }

  const ages = one(query.child_ages)
    .split(',')
    .map(part => part.trim())
    .filter(part => part !== '')
    .map(part => intAtLeast(part, 0))

  if (ages.some(age => age === null)) {
    return null
  }

  return {
    checkIn,
    checkOut,
    adults,
    childAges: ages.filter((age): age is number => age !== null),
    rooms
  }
}

export function stayQuery(search: StaySearch, picks: Array<StayPick> = []): Record<string, string> {
  const query: Record<string, string> = {
    check_in: search.checkIn,
    check_out: search.checkOut,
    adults: String(search.adults),
    rooms: String(search.rooms)
  }

  if (search.childAges.length > 0) {
    query.child_ages = search.childAges.join(',')
  }

  if (picks.length > 0) {
    query.pick = picks
      .filter(pick => pick.quantity > 0)
      .map(pick => `${pick.roomType}:${pick.quantity}:${pick.ratePlan}`)
      .join(',')
  }

  return query
}

export function applyPick(
  picks: Array<StayPick>,
  rooms: number,
  roomType: string,
  quantity: number,
  ratePlan: string
): Array<StayPick> {
  const others = rooms === 1 ? [] : picks.filter(pick => pick.roomType !== roomType)

  if (quantity < 1) {
    return others
  }

  return [...others, {
    roomType,
    quantity: rooms === 1 ? 1 : quantity,
    ratePlan
  }]
}

export function parsePicks(value: unknown): Array<StayPick> {
  return one(value)
    .split(',')
    .map(part => part.trim())
    .filter(part => part !== '')
    .flatMap((part) => {
      const [roomType, quantity, ratePlan] = part.split(':')
      const count = intAtLeast(quantity ?? '', 1)

      if (!roomType || !ratePlan || count === null) {
        return []
      }

      return [{ roomType, quantity: count, ratePlan }]
    })
}

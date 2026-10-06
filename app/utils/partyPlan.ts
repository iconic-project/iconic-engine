export type Occupancy = {
  maxAdults: number
  maxChildren: number
  maxOccupancy: number
}

export type PlannedRoom = {
  roomType: string
  ratePlan: string
  occupancy: Occupancy
}

export type PartyLine = {
  room_type: string
  adults: number
  child_ages: Array<number>
  rate_plan: string
}

export function previewParty(adults: number, childAges: Array<number>, rooms: number): { adults: number, childAges: Array<number> } {
  const count = Math.max(1, rooms)

  return {
    adults: Math.max(1, Math.ceil(adults / count)),
    childAges: childAges.slice(0, Math.ceil(childAges.length / count))
  }
}

export function distributeParty(
  adults: number,
  childAges: Array<number>,
  rooms: Array<PlannedRoom>,
  adultRequired: boolean
): { ok: true, lines: Array<PartyLine> } | { ok: false } {
  if (rooms.length === 0 || adults < 1) {
    return { ok: false }
  }

  const lines = rooms.map(room => ({
    room_type: room.roomType,
    adults: 0,
    child_ages: [] as Array<number>,
    rate_plan: room.ratePlan,
    occupancy: room.occupancy
  }))

  let adultsLeft = adults

  if (adultRequired) {
    if (adultsLeft < lines.length) {
      return { ok: false }
    }

    for (const line of lines) {
      line.adults = 1
      adultsLeft -= 1
    }
  }

  let guard = adultsLeft

  while (adultsLeft > 0 && guard > 0) {
    guard -= 1
    let placed = false

    for (const line of lines) {
      if (adultsLeft === 0) {
        break
      }

      const occupied = line.adults + line.child_ages.length

      if (line.adults >= line.occupancy.maxAdults || occupied >= line.occupancy.maxOccupancy) {
        continue
      }

      line.adults += 1
      adultsLeft -= 1
      placed = true
    }

    if (!placed) {
      return { ok: false }
    }
  }

  for (const age of childAges) {
    const room = lines.find((line) => {
      const occupied = line.adults + line.child_ages.length

      return line.child_ages.length < line.occupancy.maxChildren && occupied < line.occupancy.maxOccupancy
    })

    if (!room) {
      return { ok: false }
    }

    room.child_ages.push(age)
  }

  return {
    ok: true,
    lines: lines.map(({ occupancy: _occupancy, ...line }) => line)
  }
}

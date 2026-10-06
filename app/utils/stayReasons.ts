export type StayReason = {
  key: 'minStay' | 'maxStay' | 'soldOut' | 'closedToArrival' | 'closedToDeparture' | 'overOccupancy' | 'noRate' | 'stopSell' | 'noSingleRoom' | 'unknown'
  n: number | null
  code: string
}

export function parseReason(code: string): StayReason {
  if (code.startsWith('MIN_STAY:')) {
    return { key: 'minStay', n: Number(code.slice('MIN_STAY:'.length)), code }
  }

  if (code.startsWith('MAX_STAY:')) {
    return { key: 'maxStay', n: Number(code.slice('MAX_STAY:'.length)), code }
  }

  if (code === 'SOLD_OUT') {
    return { key: 'soldOut', n: null, code }
  }

  if (code === 'CLOSED_TO_ARRIVAL') {
    return { key: 'closedToArrival', n: null, code }
  }

  if (code === 'CLOSED_TO_DEPARTURE') {
    return { key: 'closedToDeparture', n: null, code }
  }

  if (code === 'OVER_OCCUPANCY') {
    return { key: 'overOccupancy', n: null, code }
  }

  if (code === 'NO_RATE') {
    return { key: 'noRate', n: null, code }
  }

  if (code === 'STOP_SELL') {
    return { key: 'stopSell', n: null, code }
  }

  if (code === 'NO_SINGLE_ROOM') {
    return { key: 'noSingleRoom', n: null, code }
  }

  return { key: 'unknown', n: null, code }
}

export function roomsLeftLabel(roomsLeft: number, threshold: number): number | null {
  if (roomsLeft <= threshold) {
    return roomsLeft
  }

  return null
}

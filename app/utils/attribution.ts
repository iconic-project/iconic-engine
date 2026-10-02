import type { AttributionInput, AttributionTouch } from '../types/api'
import { redactPagePath } from './pagePath'

export const SESSION_TOUCH_KEY = 'iconic-engine-touch-session'
export const FIRST_TOUCH_KEY = 'iconic-engine-touch-first'
export const LAST_TOUCH_KEY = 'iconic-engine-touch-last'

const UTM_KEYS = {
  utm_source: 'source',
  utm_medium: 'medium',
  utm_campaign: 'campaign',
  utm_content: 'content',
  utm_term: 'term'
} as const

type TouchStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/**
 * LEG-002 open decision: the current session's touch is written here
 * without waiting for analytics consent, and checkout sends it when
 * the visitor has not accepted. Flip this function to a no-op to stop that.
 */
export function writeSessionTouch(touch: AttributionTouch, storage?: TouchStorage): void {
  writeTouch(SESSION_TOUCH_KEY, touch, storage)
}

/**
 * LEG-002 open decision: without consent, first and last touch are both
 * the current session touch (or omitted when there is none).
 */
export function attributionWithoutConsent(touch: AttributionTouch | null): AttributionInput | null {
  if (!touch) {
    return null
  }

  return {
    first_touch: touch,
    last_touch: touch
  }
}

export function landingTouch(
  query: Record<string, unknown>,
  path: string,
  capturedAt: string
): AttributionTouch | null {
  const touch: AttributionTouch = {}

  for (const [queryKey, field] of Object.entries(UTM_KEYS)) {
    const value = firstString(query[queryKey])

    if (value) {
      touch[field] = value.slice(0, 100)
    }
  }

  const landing = redactPagePath(path)

  if (landing) {
    touch.landing_path = landing
  }

  if (!touch.landing_path && !hasUtm(touch)) {
    return null
  }

  touch.captured_at = capturedAt

  return touch
}

export function hasUtm(touch: AttributionTouch): boolean {
  return Boolean(touch.source || touch.medium || touch.campaign || touch.content || touch.term)
}

/**
 * Always keeps the session touch. A later navigation replaces it only when
 * it carries a new utm param. Persisted first/last touch are written only
 * when consented is true.
 */
export function captureLanding(
  query: Record<string, unknown>,
  path: string,
  capturedAt: string,
  consented: boolean,
  session?: TouchStorage,
  local?: TouchStorage
): void {
  const incoming = landingTouch(query, path, capturedAt)

  if (!incoming) {
    return
  }

  const existing = readTouch(SESSION_TOUCH_KEY, session)

  if (!existing || hasUtm(incoming)) {
    writeSessionTouch(incoming, session)
  }

  if (!consented || !local) {
    return
  }

  const sessionTouch = readTouch(SESSION_TOUCH_KEY, session)

  if (!sessionTouch) {
    return
  }

  if (!readTouch(FIRST_TOUCH_KEY, local)) {
    writeTouch(FIRST_TOUCH_KEY, sessionTouch, local)
  }

  if (hasUtm(incoming) || !readTouch(LAST_TOUCH_KEY, local)) {
    writeTouch(LAST_TOUCH_KEY, hasUtm(incoming) ? incoming : sessionTouch, local)
  }
}

export function promoteSessionTouch(session?: TouchStorage, local?: TouchStorage): void {
  const touch = readTouch(SESSION_TOUCH_KEY, session)

  if (!touch || !local) {
    return
  }

  if (!readTouch(FIRST_TOUCH_KEY, local)) {
    writeTouch(FIRST_TOUCH_KEY, touch, local)
  }

  if (!readTouch(LAST_TOUCH_KEY, local)) {
    writeTouch(LAST_TOUCH_KEY, touch, local)
  }
}

export function clearPersistedTouches(local?: TouchStorage): void {
  if (!local) {
    return
  }

  try {
    local.removeItem(FIRST_TOUCH_KEY)
    local.removeItem(LAST_TOUCH_KEY)
  } catch {
    // private mode
  }
}

export function attributionForCheckout(
  consented: boolean,
  session?: TouchStorage,
  local?: TouchStorage
): AttributionInput | null {
  if (!consented) {
    return attributionWithoutConsent(readTouch(SESSION_TOUCH_KEY, session))
  }

  const sessionTouch = readTouch(SESSION_TOUCH_KEY, session)
  const first = readTouch(FIRST_TOUCH_KEY, local) ?? sessionTouch
  const last = readTouch(LAST_TOUCH_KEY, local) ?? sessionTouch

  if (!first && !last) {
    return null
  }

  return {
    first_touch: first,
    last_touch: last
  }
}

export function readSessionTouch(session?: TouchStorage): AttributionTouch | null {
  return readTouch(SESSION_TOUCH_KEY, session)
}

function firstString(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value

  if (typeof raw !== 'string') {
    return ''
  }

  return raw.trim()
}

function readTouch(key: string, storage?: TouchStorage): AttributionTouch | null {
  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(key)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as AttributionTouch

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function writeTouch(key: string, touch: AttributionTouch, storage?: TouchStorage): void {
  if (!storage) {
    return
  }

  try {
    storage.setItem(key, JSON.stringify(touch))
  } catch {
    // private mode / quota
  }
}

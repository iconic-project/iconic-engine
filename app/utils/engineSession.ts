import { readStoredConsent } from './analyticsConsent'

export const SESSION_STORAGE_KEY = 'iconic-engine-session'

/** 30 days of inactivity, as this task states. Not a published rate. */
export const SESSION_IDLE_MS = 30 * 24 * 60 * 60 * 1000

type StoredSession = {
  id: string
  seen_at: number
}

/**
 * crypto.randomUUID throws outside a secure context (plain http).
 * A missing id means nothing is tracked; the booking flow must not throw.
 */
export function createSessionId(): string | null {
  try {
    const cryptoObj = globalThis.crypto

    if (!cryptoObj || typeof cryptoObj.randomUUID !== 'function') {
      return null
    }

    return cryptoObj.randomUUID()
  } catch {
    return null
  }
}

export function submitSessionId(): string | null {
  if (!import.meta.client) {
    return null
  }

  if (readStoredConsent(localStorage) !== 'accepted') {
    return null
  }

  return currentSessionId(localStorage)
}

export function currentSessionId(storage: Pick<Storage, 'getItem'> | undefined): string | null {
  return parseSession(storage)?.id ?? null
}

export function readSession(
  storage: Pick<Storage, 'getItem'> | undefined,
  nowMs: number
): string | null {
  if (!storage) {
    return null
  }

  const stored = parseSession(storage)

  if (!stored) {
    return null
  }

  if (nowMs - stored.seen_at > SESSION_IDLE_MS) {
    return null
  }

  return stored.id
}

export function ensureSession(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined,
  nowMs: number
): string | null {
  const existing = readSession(storage, nowMs)

  if (existing) {
    touchSession(storage, nowMs)

    return existing
  }

  const id = createSessionId()

  if (!id || !storage) {
    return null
  }

  writeSession(storage, { id, seen_at: nowMs })

  return id
}

export function touchSession(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined,
  nowMs: number
): void {
  const stored = parseSession(storage)

  if (!stored || !storage) {
    return
  }

  writeSession(storage, { id: stored.id, seen_at: nowMs })
}

export function clearSession(storage: Pick<Storage, 'removeItem'> | undefined): void {
  if (!storage) {
    return
  }

  try {
    storage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // private mode
  }
}

function parseSession(storage: Pick<Storage, 'getItem'> | undefined): StoredSession | null {
  if (!storage) {
    return null
  }

  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<StoredSession>

    if (typeof parsed.id !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(parsed.id)) {
      return null
    }

    if (typeof parsed.seen_at !== 'number' || !Number.isFinite(parsed.seen_at)) {
      return null
    }

    return { id: parsed.id, seen_at: parsed.seen_at }
  } catch {
    return null
  }
}

function writeSession(
  storage: Pick<Storage, 'setItem'>,
  session: StoredSession
): void {
  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // private mode / quota
  }
}

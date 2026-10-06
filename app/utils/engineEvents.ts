import type { CheckoutPath, EngineEventName, EngineEventParams } from '../types/api'
import { redactPagePath } from './pagePath'

const NAMES: Array<EngineEventName> = [
  'search_availability',
  'view_itinerary',
  'select_departure',
  'view_itinerary_detail',
  'view_route_map',
  'begin_checkout',
  'begin_booking_request',
  'select_payment_path',
  'apply_promotion',
  'remove_promotion',
  'promo_invalid',
  'booking_form_invalid',
  'submit_booking_request',
  'abandon_cart',
  'charter_inquiry_submit',
  'view_departure',
  'page_view',
  'search_performed',
  'room_type_viewed'
]

/**
 * Keys the event is meaningless without. search_availability allows
 * itinerary_code but the API does not require it (BehaviouralEventParams
 * drops a missing key and still stores the event), so an empty payload is sent.
 * value and currency are optional wherever they are allowed.
 */
const REQUIRED: Record<EngineEventName, Array<keyof EngineEventParams>> = {
  search_availability: [],
  view_itinerary: ['itinerary_code'],
  select_departure: ['itinerary_code', 'departure_id'],
  view_itinerary_detail: ['itinerary_code'],
  view_route_map: ['itinerary_code'],
  begin_checkout: ['itinerary_code', 'departure_id', 'cabin_count'],
  begin_booking_request: ['itinerary_code', 'departure_id', 'cabin_count'],
  select_payment_path: ['path'],
  apply_promotion: ['coupon_code'],
  remove_promotion: ['coupon_code'],
  promo_invalid: ['coupon_code'],
  booking_form_invalid: ['step'],
  submit_booking_request: ['itinerary_code', 'departure_id', 'cabin_count', 'path'],
  abandon_cart: ['itinerary_code', 'departure_id', 'step', 'cabin_count'],
  charter_inquiry_submit: [],
  view_departure: ['itinerary_code', 'departure_id'],
  page_view: ['page_path'],
  search_performed: ['check_in', 'check_out', 'adults', 'children', 'rooms'],
  room_type_viewed: ['room_type']
}

const ALLOWED: Record<EngineEventName, Array<keyof EngineEventParams>> = {
  search_availability: ['itinerary_code'],
  view_itinerary: ['itinerary_code'],
  select_departure: ['itinerary_code', 'departure_id'],
  view_itinerary_detail: ['itinerary_code'],
  view_route_map: ['itinerary_code'],
  begin_checkout: ['itinerary_code', 'departure_id', 'cabin_count'],
  begin_booking_request: ['itinerary_code', 'departure_id', 'cabin_count'],
  select_payment_path: ['path'],
  apply_promotion: ['coupon_code'],
  remove_promotion: ['coupon_code'],
  promo_invalid: ['coupon_code'],
  booking_form_invalid: ['step'],
  submit_booking_request: ['itinerary_code', 'departure_id', 'cabin_count', 'path', 'currency', 'value'],
  abandon_cart: ['itinerary_code', 'departure_id', 'step', 'cabin_count'],
  charter_inquiry_submit: ['itinerary_code', 'departure_id', 'value', 'currency'],
  view_departure: ['itinerary_code', 'departure_id'],
  page_view: ['page_path'],
  search_performed: ['check_in', 'check_out', 'adults', 'children', 'rooms'],
  room_type_viewed: ['room_type']
}

export type BuiltEngineEvent = {
  name: EngineEventName
  params: EngineEventParams
}

export function isEngineEventName(name: string): name is EngineEventName {
  return (NAMES as Array<string>).includes(name)
}

export function integerUsd(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return undefined
  }

  return value
}

/**
 * Whitelist-only payload. A missing or invalid required key returns null
 * so one bad event cannot 422 the batch. An invalid optional value is dropped.
 */
export function buildEngineEvent(
  name: string,
  params: EngineEventParams = {}
): BuiltEngineEvent | null {
  if (!isEngineEventName(name)) {
    return null
  }

  const allowed = ALLOWED[name]
  const required = REQUIRED[name]

  if (!allowed || !required) {
    return null
  }
  const kept: EngineEventParams = {}

  for (const key of allowed) {
    const value = castKey(key, params[key])

    if (value === undefined) {
      if (required.includes(key)) {
        return null
      }

      continue
    }

    Object.assign(kept, { [key]: value })
  }

  return { name, params: kept }
}

function castKey(key: keyof EngineEventParams, value: unknown): string | number | undefined {
  switch (key) {
    case 'itinerary_code':
    case 'step':
      return shortString(value, 32)
    case 'departure_id':
      return positiveInt(value)
    case 'cabin_count':
    case 'value':
      return integerUsd(value)
    case 'path':
      return paymentPath(value)
    case 'currency':
      return currency(value)
    case 'coupon_code':
      return coupon(value)
    case 'page_path':
      return typeof value === 'string' ? redactPagePath(value) ?? undefined : undefined
    case 'check_in':
    case 'check_out':
      return shortString(value, 10)
    case 'room_type':
      return shortString(value, 32)
    case 'adults':
    case 'rooms':
      return positiveInt(value)
    case 'children':
      return nonNegativeInt(value)
    default:
      return undefined
  }
}

function shortString(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  if (trimmed === '' || trimmed.length > max) {
    return undefined
  }

  return trimmed
}

function nonNegativeInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return undefined
  }

  return value
}

function positiveInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return undefined
  }

  return value
}

function paymentPath(value: unknown): CheckoutPath | undefined {
  if (value === 'PAY_LATER' || value === 'PAY_DEPOSIT') {
    return value
  }

  return undefined
}

function currency(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^[A-Za-z]{3}$/.test(value.trim())) {
    return undefined
  }

  return value.trim().toUpperCase()
}

function coupon(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,32}$/.test(value.trim())) {
    return undefined
  }

  return value.trim().toUpperCase()
}

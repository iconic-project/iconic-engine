export type StayProperty = {
  code: string
  name: string
  slug: string
  address_line_1: string | null
  address_line_2: string | null
  city: string | null
  postcode: string | null
  country: string | null
  phone: string | null
  email: string | null
  description: string | null
  hero_alt: string | null
  hero_image_url: string | null
  highlights: Array<string>
  facts: Array<Array<string>>
  faqs: Array<Array<string>>
  policies_text: string | null
  meta_title: string | null
  meta_description: string | null
}

export type StayRoomType = {
  code: string
  name: string
  slug: string
  description: string | null
  size_sqm: number | null
  bed_setup: string | null
  amenities: Array<string>
  photos: Array<{ alt: string | null, url: string }>
  base_occupancy: number
  max_occupancy: number
  max_adults: number
  max_children: number
  from_price: number | null
  meta_title: string | null
  meta_description: string | null
}

export type StayRatePlan = {
  code: string
  name: string
  default: boolean
  deposit_pct: number
  refundable: boolean
}

export type PropertyFeed = {
  property: StayProperty
  room_types: Array<StayRoomType>
  default_rate_plan: string
  rate_plans: Array<StayRatePlan>
  settings: {
    guests: {
      child_min_age: number
      child_max_age: number
      adult_required_with_children: boolean
    }
    stay: {
      min_nights: number
      max_nights: number
      max_rooms_per_booking: number
    }
    availability: {
      low_availability_threshold: number
    }
  }
}

export type CalendarNight = {
  night: string
  available: boolean
  from_price: number | null
  closed_to_arrival: boolean
  closed_to_departure: boolean
  min_stay: number
}

export type CalendarFeed = {
  nights: Array<CalendarNight>
}

export type NightLine = {
  night: string
  total: number
}

export type TaxLine = {
  code: string
  label: string
  amount: number
  charged: boolean
  shown_in_price_panel: boolean
}

export type AvailabilityQuote = {
  rate_plan: string
  night_lines: Array<NightLine>
  tax_lines: Array<TaxLine>
  total: number
  deposit_pct: number
  deposit: number
  total_including_charged_taxes: number
}

export type AvailabilityType = {
  code: string
  name: string
  bookable: boolean
  reasons: Array<string>
  rooms_left: number
  waitlist_enabled: boolean
  quotes: Array<AvailabilityQuote>
}

export type AvailabilityFeed = {
  check_in: string
  check_out: string
  room_types: Array<AvailabilityType>
}

export type StayQuoteRoom = {
  room_type: string
  rate_plan: string
  adults: number
  child_ages: Array<number>
  night_lines: Array<NightLine>
  tax_lines: Array<TaxLine>
  total: number
  deposit: number
  total_including_charged_taxes: number
}

export type StayQuote = {
  check_in: string
  check_out: string
  nights: number
  rooms: Array<StayQuoteRoom>
  total: number
  deposit: number
  total_including_charged_taxes: number
  quote_token: string
}

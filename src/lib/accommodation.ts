import type { RequirementItem, UnconfirmedReason } from '@/api/queries/accommodation'
import { m } from '@/paraglide/messages'

/** The API refuses a pasted text longer than this (`DocumentCreate`). */
export const OFFER_TEXT_MAX_CHARS = 20_000
/** Longest offer link the API accepts (`OfferCreate.url`). */
export const OFFER_URL_MAX_CHARS = 2000
/** Starting value of the "distance to attractions" requirement, in metres. */
export const DEFAULT_MAX_DISTANCE_M = 2000
/** Step of the distance field, in metres. */
export const DISTANCE_STEP_M = 100

/** The amenity keys of the API's dictionary (places and requirements share it). */
export const AMENITY_KEYS = [
  'pool',
  'kitchen',
  'parking',
  'family_room',
  'wifi',
  'air_conditioning',
  'breakfast',
  'pets_allowed',
  'elevator',
  'wheelchair_accessible',
  'washing_machine',
  'balcony',
  'crib',
  'playground',
] as const
export type AmenityKey = (typeof AMENITY_KEYS)[number]

export const PLATFORM_KEYS = ['airbnb', 'booking'] as const
export type PlatformKey = (typeof PLATFORM_KEYS)[number]

/** The one key of the "maximum distance" requirement. */
export const DISTANCE_KEY = 'attractions'

const AMENITY_LABELS: Record<AmenityKey, () => string> = {
  pool: m.accommodation_key_pool,
  kitchen: m.accommodation_key_kitchen,
  parking: m.accommodation_key_parking,
  family_room: m.accommodation_key_family_room,
  wifi: m.accommodation_key_wifi,
  air_conditioning: m.accommodation_key_air_conditioning,
  breakfast: m.accommodation_key_breakfast,
  pets_allowed: m.accommodation_key_pets_allowed,
  elevator: m.accommodation_key_elevator,
  wheelchair_accessible: m.accommodation_key_wheelchair_accessible,
  washing_machine: m.accommodation_key_washing_machine,
  balcony: m.accommodation_key_balcony,
  crib: m.accommodation_key_crib,
  playground: m.accommodation_key_playground,
}

const PLATFORM_LABELS: Record<PlatformKey, () => string> = {
  airbnb: m.accommodation_platform_airbnb,
  booking: m.accommodation_platform_booking,
}

/** The words for a requirement key; a key outside the dictionary is shown as it is. */
export function requirementLabel(kind: RequirementItem['kind'], key: string): string {
  if (kind === 'distance') return m.accommodation_key_attractions()
  const labels: Record<string, (() => string) | undefined> =
    kind === 'platform' ? PLATFORM_LABELS : AMENITY_LABELS
  return labels[key]?.() ?? key.replaceAll('_', ' ')
}

/** Platform name for a key from the search links. */
export const platformLabel = (platform: PlatformKey): string => PLATFORM_LABELS[platform]()

const REASON_LABELS: Record<UnconfirmedReason, () => string> = {
  no_mention: m.accommodation_reason_no_mention,
  low_confidence: m.accommodation_reason_low_confidence,
  not_assessed: m.accommodation_reason_not_assessed,
  conflicting: m.accommodation_reason_conflicting,
  no_link: m.accommodation_reason_no_link,
  not_checked: m.accommodation_reason_not_checked,
  pending: m.accommodation_reason_pending,
  check_failed: m.accommodation_reason_check_failed,
  no_offer: m.accommodation_reason_no_offer,
}

export const reasonLabel = (reason: UnconfirmedReason): string => REASON_LABELS[reason]()

/** The set without one requirement, or with it replaced (same kind and key), or added. */
export function withRequirement(
  list: readonly RequirementItem[],
  item: RequirementItem,
): RequirementItem[] {
  const same = (other: RequirementItem) => other.kind === item.kind && other.key === item.key
  return list.some(same) ? list.map((other) => (same(other) ? item : other)) : [...list, item]
}

export function withoutRequirement(
  list: readonly RequirementItem[],
  kind: RequirementItem['kind'],
  key: string,
): RequirementItem[] {
  return list.filter((other) => !(other.kind === kind && other.key === key))
}

/** The nights of a trip as check-in dates: from the first day up to the day before the last. */
export function tripNights(start: string | null, end: string | null): string[] {
  if (!start || !end) return []
  const nights: string[] = []
  const cursor = new Date(`${start}T12:00:00Z`)
  const last = new Date(`${end}T12:00:00Z`)
  while (cursor < last) {
    nights.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return nights
}

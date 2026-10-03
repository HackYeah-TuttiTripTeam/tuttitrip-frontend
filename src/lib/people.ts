import type { Member } from '@/api/queries/members'
import type { Profile, ProfileUpdate } from '@/api/queries/profiles'

/** The comfort fields the host can correct; the server fills them from the age. */
export const COMFORT_FIELDS = [
  'segment_km',
  'daily_km',
  'active_min',
  'nap_start',
  'nap_minutes',
  'stairs_sensitivity',
  'queue_patience_min',
  'floor',
] as const
export type ComfortField = (typeof COMFORT_FIELDS)[number]

/** One person of a trip: the profile, plus the role when the person has an account. */
export interface Person {
  profile: Profile
  role: Member['role'] | null
}

const ROLE_RANK = { host: 0, co_host: 1, member: 2 } as const

/** Joins profiles with members on profile id; hosts first, then people with accounts, then the rest. */
export function joinPeople(profiles: Profile[], members: Member[]): Person[] {
  const roles = new Map(members.map((member) => [member.profile_id, member.role]))
  const people = profiles.map((profile) => ({ profile, role: roles.get(profile.id) ?? null }))
  const rank = (person: Person) => (person.role ? ROLE_RANK[person.role] : 3)
  return people.toSorted((a, b) => rank(a) - rank(b))
}

/** Whether the profile belongs to an account: those are managed as membership, not here. */
export const hasAccount = (person: Person) => person.profile.user_sub !== null

/** "13:00:00" -> "13:00"; the form's time input uses the short form. */
export const shortTime = (time: string) => time.slice(0, 5)

/** The values of the edit form (hours instead of minutes: what people think in). */
export interface EditValues {
  display_name: string
  age: number
  segment_km: number
  daily_km: number
  active_hours: number
  nap_start: string
  nap_minutes: number
  stairs_sensitivity: number
  queue_patience_min: number
  floor: number
}

export function editDefaults(profile: Profile): EditValues {
  return {
    display_name: profile.display_name,
    age: profile.age,
    segment_km: profile.segment_km,
    daily_km: profile.daily_km,
    active_hours: profile.active_min / 60,
    nap_start: profile.nap_start ? shortTime(profile.nap_start) : '',
    nap_minutes: profile.nap_minutes,
    stairs_sensitivity: profile.stairs_sensitivity,
    queue_patience_min: profile.queue_patience_min,
    floor: profile.floor,
  }
}

/** Only what the host changed, so the server keeps following the age for the rest. */
export function buildUpdate(profile: Profile, values: EditValues): ProfileUpdate {
  const body: ProfileUpdate = {}
  if (values.display_name !== profile.display_name) body.display_name = values.display_name
  if (values.age !== profile.age) body.age = values.age
  for (const key of [
    'segment_km',
    'daily_km',
    'stairs_sensitivity',
    'queue_patience_min',
    'floor',
  ] as const) {
    if (values[key] !== profile[key]) body[key] = values[key]
  }
  const activeMin = Math.round(values.active_hours * 60)
  if (activeMin !== profile.active_min) body.active_min = activeMin
  const napStart = values.nap_minutes > 0 ? values.nap_start : null
  const before = profile.nap_start ? shortTime(profile.nap_start) : null
  if (napStart !== before) body.nap_start = napStart
  if (values.nap_minutes !== profile.nap_minutes) body.nap_minutes = values.nap_minutes
  return body
}

/** What a form needs after saving: close on ok, show the message otherwise. */
export type SaveResult = { ok: true } | { ok: false; message: string }

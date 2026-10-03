import type {
  Constraints,
  Diet,
  InterestTag,
  Preferences,
  PreferencesWrite,
} from '@/api/queries/preferences'
import type { Profile } from '@/api/queries/profiles'
import { shortTime } from './people'

/**
 * Strength written for an interest the person ticks. The API keeps 0..1 per tag; the weighing of
 * interests against each other is a later screen, so a tick is a full "yes".
 */
export const INTEREST_ON = 1

export const NO_CONSTRAINTS: Constraints = {
  wheelchair: false,
  stairs: false,
  heat: false,
  cold: false,
  audio_description: false,
}

/**
 * The body of a PUT: the API replaces the whole preferences, so everything the person already
 * has goes back with the change. The pool is left out until someone saved it, so the age default
 * keeps following the age. Constraints are null for a member looking at someone else.
 */
export function toWrite(current: Preferences, patch: PreferencesWrite = {}): PreferencesWrite {
  return {
    interests: current.interests,
    diet: current.diet,
    example_places: current.example_places,
    min_tags: current.min_tags,
    ...(current.constraints ? { constraints: current.constraints } : {}),
    ...(current.filled ? { importance_pool: current.importance_pool } : {}),
    ...patch,
  }
}

/** What the screen shows while a PUT is on its way: the saved preferences with the body applied. */
export function applyWrite(current: Preferences, body: PreferencesWrite): Preferences {
  return {
    ...current,
    interests: body.interests ?? current.interests,
    diet: body.diet ?? current.diet,
    example_places: body.example_places ?? current.example_places,
    min_tags: body.min_tags ?? current.min_tags,
    constraints: body.constraints ?? current.constraints,
    importance_pool: body.importance_pool ?? current.importance_pool,
    effective_stairs_sensitivity:
      body.constraints && (body.constraints.stairs || body.constraints.wheelchair)
        ? 1
        : current.effective_stairs_sensitivity,
  }
}

/**
 * The interests after the person ticked exactly `picked` among `known`. A tag that stays keeps
 * its strength; tags outside `known` (a newer API) are left alone.
 */
export function withPickedInterests(
  interests: Preferences['interests'],
  known: readonly InterestTag[],
  picked: readonly InterestTag[],
): Preferences['interests'] {
  const others = Object.entries(interests).filter(([tag]) => !known.some((k) => k === tag))
  const kept = picked.map((tag) => [tag, interests[tag] ?? INTEREST_ON] as const)
  return Object.fromEntries([...others, ...kept])
}

/** Interest tags the person has ticked (strength above zero), in the order of `order`. */
export function pickedInterests(
  interests: Preferences['interests'],
  order: readonly InterestTag[],
): InterestTag[] {
  return order.filter((tag) => (interests[tag] ?? 0) > 0)
}

export const MAX_ALLERGIES = 20
export const MAX_ALLERGY_LENGTH = 60

/** Adds an allergy typed by hand; blank, too long, duplicate (any case) or over the limit is ignored. */
export function addAllergy(diet: Diet, raw: string): Diet {
  const allergy = raw.trim()
  const known = (diet.allergies ?? []).map((item) => item.toLocaleLowerCase())
  if (
    !allergy ||
    allergy.length > MAX_ALLERGY_LENGTH ||
    known.includes(allergy.toLocaleLowerCase()) ||
    known.length >= MAX_ALLERGIES
  )
    return diet
  return { ...diet, allergies: [...(diet.allergies ?? []), allergy] }
}

/**
 * What the constraints form edits: the profile's walking and nap values (they live on the profile,
 * the server fills them from the age) next to the constraints of the preferences.
 */
export interface ConstraintsValues extends Omit<Constraints, 'disability_note'> {
  segment_km: number
  daily_km: number
  nap_minutes: number
  nap_start: string
  disability_note: string
}

export function constraintsDefaults(profile: Profile, constraints: Constraints): ConstraintsValues {
  return {
    segment_km: profile.segment_km,
    daily_km: profile.daily_km,
    nap_minutes: profile.nap_minutes,
    nap_start: profile.nap_start ? shortTime(profile.nap_start) : '',
    wheelchair: constraints.wheelchair,
    stairs: constraints.stairs,
    heat: constraints.heat,
    cold: constraints.cold,
    audio_description: constraints.audio_description,
    disability_note: constraints.disability_note ?? '',
  }
}

/** The constraints part of the form values; a blank note is saved as null. */
export function toConstraints(values: ConstraintsValues): Constraints {
  return {
    wheelchair: values.wheelchair,
    stairs: values.stairs,
    heat: values.heat,
    cold: values.cold,
    audio_description: values.audio_description,
    disability_note: values.disability_note.trim() || null,
  }
}

const WALK_FIELDS = ['segment_km', 'daily_km']
const NAP_FIELDS = ['nap_start', 'nap_minutes']

/** Whether the host or the person changed the value, instead of the server taking it from the age. */
export const isWalkCustomized = (profile: Profile) =>
  WALK_FIELDS.some((field) => profile.customized_fields.includes(field))
export const isNapCustomized = (profile: Profile) =>
  NAP_FIELDS.some((field) => profile.customized_fields.includes(field))

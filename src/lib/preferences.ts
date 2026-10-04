import type {
  Constraints,
  Diet,
  DietTag,
  ExamplePlace,
  ExampleVerdict,
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
 * has goes back with the change. The pool is left out until preferences were saved once: the
 * backend then stores the age default as a snapshot, so before that it still follows the age.
 * Constraints are null for a member looking at someone else.
 */
export function toWrite(current: Preferences, patch: PreferencesWrite = {}): PreferencesWrite {
  return {
    interests: current.interests,
    diet: current.diet,
    // Entries with a place_id are thumb ratings the API merged in; a PUT would save them again
    // (as likes, or as dislikes with reason OTHER). Ratings are sent on their own (see #30).
    example_places: current.example_places.filter((place) => !place.place_id),
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
    min_tags: body.min_tags ?? current.min_tags,
    constraints: body.constraints ?? current.constraints,
    importance_pool: body.importance_pool ?? current.importance_pool,
    // The body carries the typed examples only; the catalog ratings stay as they are shown.
    example_places: body.example_places
      ? [...body.example_places, ...current.example_places.filter((place) => place.place_id)]
      : current.example_places,
  }
}

/** Typed examples are saved with the preferences; examples with a place_id are catalog ratings. */
export const MAX_TEXT_EXAMPLES = 50
export const MAX_EXAMPLE_NAME_LENGTH = 200

const sameName = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase()

/**
 * The typed examples after adding `name`. A name that is there already (any case) takes the new
 * verdict instead of appearing twice; blank, too long or over the limit changes nothing.
 */
export function withTextExample(
  examples: ExamplePlace[],
  raw: string,
  verdict: ExampleVerdict,
): ExamplePlace[] {
  const name = raw.trim()
  const typed = examples.filter((place) => !place.place_id)
  if (!name || name.length > MAX_EXAMPLE_NAME_LENGTH) return typed
  const others = typed.filter((place) => !sameName(place.name, name))
  return others.length >= MAX_TEXT_EXAMPLES ? typed : [...others, { name, verdict }]
}

export function withoutTextExample(examples: ExamplePlace[], name: string): ExamplePlace[] {
  return examples.filter((place) => !place.place_id && place.name !== name)
}

/** The examples with the catalog rating of one place set (or, with a null verdict, taken away). */
export function withCatalogRating(
  examples: ExamplePlace[],
  rating: { placeId: string; name: string; verdict: ExampleVerdict | null },
): ExamplePlace[] {
  const rest = examples.filter((place) => place.place_id !== rating.placeId)
  return rating.verdict
    ? [...rest, { name: rating.name, place_id: rating.placeId, verdict: rating.verdict }]
    : rest
}

/**
 * Ticks or unticks one interest. A tag that stays keeps the strength it has, so strengths set
 * elsewhere (the interview) survive; tags this screen does not know are left alone.
 */
export function setInterest(
  interests: Preferences['interests'],
  tag: InterestTag,
  on: boolean,
): Preferences['interests'] {
  if (!on) return Object.fromEntries(Object.entries(interests).filter(([key]) => key !== tag))
  return { ...interests, [tag]: interests[tag] ?? INTEREST_ON }
}

export function setDietTag(diet: Diet, tag: DietTag, on: boolean): Diet {
  const tags = (diet.tags ?? []).filter((item) => item !== tag)
  return { ...diet, tags: on ? [...tags, tag] : tags }
}

export function removeAllergy(diet: Diet, allergy: string): Diet {
  return { ...diet, allergies: (diet.allergies ?? []).filter((item) => item !== allergy) }
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

/** Milliseconds in one second. */
export const MS_PER_SECOND = 1000

/** Milliseconds in one minute. */
export const MS_PER_MINUTE = 60 * MS_PER_SECOND

/** Milliseconds in one hour. */
export const MS_PER_HOUR = 60 * MS_PER_MINUTE

/** Minutes in one hour. */
export const MINUTES_PER_HOUR = 60

/** Longest name of a person or a search text the API accepts (ProfileCreate, InvitationAccept). */
export const NAME_MAX_CHARS = 100

/** Oldest age, in whole years, the API accepts (ProfileCreate). */
export const AGE_MAX_YEARS = 120

/** Largest walking segment, in km, a person may set (ProfileUpdate). */
export const SEGMENT_KM_MAX = 50

/** Largest daily distance, in km, a person may set (ProfileUpdate). */
export const DAILY_KM_MAX = 100

/** Most hours of activity a day a person may set (ProfileUpdate). */
export const ACTIVE_HOURS_MAX = 24

/** Longest queue, in minutes, a person may accept, and the longest nap (ProfileUpdate). */
export const MINUTES_LIMIT_MAX = 600

/** Highest value of the floor, in percent (ProfileUpdate). */
export const FLOOR_PERCENT_MAX = 100

/** Longest accessibility note (PreferencesWrite). */
export const DISABILITY_NOTE_MAX_CHARS = 500

/** Hard stop of the note textarea; above the schema's limit so the validation message shows. */
export const DISABILITY_NOTE_INPUT_MAX_CHARS = 600

/** Longest name or destination of a trip (TripCreate). */
export const TRIP_TEXT_MAX_CHARS = 200

/** Length of `HH:MM`, the short form of an API time of day (`HH:MM:SS`). */
export const HH_MM_LENGTH = 5

/** Smallest currency unit per whole unit (grosz per zloty, cent per euro). */
export const MINOR_UNITS_PER_UNIT = 100n

/** Year of the throwaway date a time of day is attached to for formatting. */
export const CLOCK_REFERENCE_YEAR = 2000

/** Decimals kept in the `--progress` CSS variable of scroll animations. */
export const PROGRESS_DECIMALS = 3

/** Whole percent, to turn a 0-1 share into a percentage and back. */
export const PERCENT = 100

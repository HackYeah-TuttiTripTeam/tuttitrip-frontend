/** Steps of the slider card; the value is whole numbers from 1 to this. */
export const SLIDER_STEPS = 5

/** Starting value of the slider card: the middle. */
export const SLIDER_DEFAULT = 3

/** Budget range card: the slider ends at this amount, in steps of `BUDGET_STEP`. */
export const BUDGET_SLIDER_MAX = 10_000
export const BUDGET_STEP = 100

/** Budget range card: the range it starts with, until the host moves a thumb. */
export const BUDGET_DEFAULT_FROM = 2000
export const BUDGET_DEFAULT_TO = 3000

/** Currency of the budget card when the assistant names none. */
export const DEFAULT_CURRENCY = 'PLN'

/** How far (px) a swipe card must travel before it counts as an answer. */
export const SWIPE_THRESHOLD_PX = 80

/** Rotation (degrees) of a swipe card for every `SWIPE_TILT_UNIT_PX` of travel. */
export const SWIPE_TILT_DEG = 8
export const SWIPE_TILT_UNIT_PX = 100

/** A decided card flies this far (px) off to the side, in this many ms. */
export const SWIPE_FLY_OUT_PX = 480
export const SWIPE_FLY_MS = 180

/** Messages loaded at once into the chat; older ones come on request. */
export const HISTORY_PAGE_SIZE = 30

/** Longest message the composer sends (the assistant does not need an essay). */
export const MESSAGE_MAX_CHARS = 2000

/** Longest name or age text in the family builder card. */
export const FAMILY_NAME_MAX_CHARS = 100

/** Oldest age the family builder card accepts. */
export const FAMILY_AGE_MAX = 120

/** People the family builder card holds at most (a group trip, not a coach tour). */
export const FAMILY_MAX_PEOPLE = 20

/** Path (after `/api/v1/trips/{id}/`) of the AG-UI endpoint of the interview. */
export const AGUI_PATH = 'interview/agui'

/** Ctrl or Cmd with this key sends the sentence from the first-sentence field. */
export const SEND_SHORTCUT_KEY = 'Enter'

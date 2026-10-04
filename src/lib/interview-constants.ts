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

/** Label of the WebRTC data channel the provider sends its events on. */
export const VOICE_DATA_CHANNEL = 'oai-events'

/** While a voice call runs the panel asks the API for the data the tools saved this often (ms). */
export const VOICE_KNOWLEDGE_POLL_MS = 4000

/** Path (after `/api/v1/trips/{id}/`) of the voice endpoints. */
export const VOICE_PATH = 'interview/voice'

/** The mic opens again this long (ms) after the assistant went quiet, so its tail is not heard. */
export const MIC_REOPEN_DELAY_MS = 400

/** A mic muted for processing opens by itself after this long (ms), whatever the events said. */
export const MIC_FAILSAFE_MS = 20_000

/** Shortest hold (ms) of the talk button that counts as speech; a shorter tap is dropped. */
export const PTT_MIN_HOLD_MS = 300

/** "Saved" stays on the call screen this long (ms). */
export const SAVED_FLASH_MS = 3000

/** `localStorage` key of the chosen voice mode (open microphone or hold to talk). */
export const VOICE_MODE_KEY = 'tt.voice.mode'

/** Keys that press the hold-to-talk button from the keyboard. */
export const PTT_PRESS_KEYS = [' ', 'Spacebar']

/** While a voice call runs the screen asks the API for the card the assistant showed this often (ms). */
export const VOICE_CARD_POLL_MS = 1500

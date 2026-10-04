/** Longest name of a trip (TripCreate). */
export const TRIP_NAME_MAX_CHARS = 200

/** Value of the `voice` search param that tells the Wywiad tab to start a voice call. */
export const VOICE_START_FLAG = 1

/** Quiet time after the last keystroke before the city suggestions are requested. */
export const CITY_SEARCH_DEBOUNCE_MS = 300

/** Fewer characters than this are not sent to `GET /places/cities/search` (the API answers 422). */
export const CITY_SEARCH_MIN_CHARS = 2

/** Suggestions in the list (the API allows up to 20). */
export const CITY_SEARCH_SIZE = 8

/** Digits an amount may have before the decimal separator (the API stores 12 digits incl. cents). */
export const MONEY_WHOLE_DIGITS = 10

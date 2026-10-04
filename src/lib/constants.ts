// Fixed values of the planning and lodging screens. Each one says where it comes from: a field of
// the OpenAPI schema or a section of docs/algorytm.md in tuttitrip-backend.

/** How often a pending offer check is read again; the worker needs a few seconds. */
export const OFFER_POLL_MS = 2000

/** Reads of a pending offer before the screen stops polling and offers "check again" (about a minute). */
export const OFFER_POLL_MAX_READS = 30

/** The model provider the API wants named when an offer is created (`OfferCreate.provider`; the schema makes it required). */
export const OFFER_PROVIDER = 'openrouter'

/** Longest pasted offer the API accepts (`DocumentCreate`). */
export const OFFER_TEXT_MAX_CHARS = 20_000

/** Longest offer link the API accepts (`OfferCreate.url`). */
export const OFFER_URL_MAX_CHARS = 2000

/** Starting value of the "distance to attractions" requirement, in metres. */
export const DEFAULT_MAX_DISTANCE_M = 2000

/** Step of the distance field, in metres. */
export const DISTANCE_STEP_M = 100

/** The one key of the "maximum distance" requirement (`DistanceKey`). */
export const DISTANCE_KEY = 'attractions'

/** Longest reason stored with a host decision (`OverrideCreate.reason`). */
export const OVERRIDE_REASON_MAX_CHARS = 500

/** Decimals of a change of Jain's index in the cost of a decision ("−0,010"). */
export const JAIN_DELTA_DIGITS = 3

/** Decimals of the gain of a person in points ("30,5 pkt"). */
export const GAIN_POINTS_DIGITS = 1

/** The "no filter" entry of a select, whose items need a non-empty value. */
export const FILTER_ALL = 'all'

/** What a new trip gets for `propose_cheaper_alternatives` (the API's default is on; its client type makes the field required). */
export const PROPOSE_CHEAPER_DEFAULT = true

/** The "any platform" entry of the platform switch. */
export const PLATFORM_ANY = 'any'

// Fixed values of the screens that are not tied to one feature. The numbers a screen shows come from
// the API; these only describe limits, codes and file names.

/** The `detail` of the 422 the draft plan answers with while the trip has no city yet. */
export const MISSING_CITY_DETAIL = 'Podaj miasto'

/** Longest remark on a proposal (ResponseCreate.remark). */
export const PROPOSAL_REMARK_MAX_CHARS = 1000

/** Machine codes of the 409 answers of the proposal endpoints (`detail.code`). */
export const PROPOSAL_OUTDATED_CODE = 'proposal.outdated'
export const PLAN_NOT_APPROVED_CODE = 'plan.not_approved'

/** MIME type and extension of the calendar export. */
export const ICS_MIME_TYPE = 'text/calendar'
export const ICS_FILE_EXTENSION = '.ics'

/** Name of the downloaded calendar file: `<prefix><plan hash>.ics`. */
export const ICS_FILE_PREFIX = 'tuttitrip-plan-'

/** Query-key prefix under which the assumptions of the last draft plan are kept (not stored by the API). */
export const DRAFT_ASSUMPTIONS_KEY = 'draft-plan-assumptions'
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

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

/** The "any platform" entry of the platform switch. */
export const PLATFORM_ANY = 'any'

/** Sort keys of the decision log (`DecisionSort`). */
export const DECISION_SORT_KEYS = ['created_at'] as const

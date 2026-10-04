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

// Fixed values of the planning screens. The algorithm parameters mirror docs/algorytm.md in
// tuttitrip-backend; the numbers themselves always come from the API, these only describe scales.

/** Fairness slider alpha (E5, section 3 of docs/algorytm.md): 0 favours the total benefit. */
export const ALPHA_MIN = 0
/** Fairness slider alpha: 3 favours equality. */
export const ALPHA_MAX = 3
/** Step of the fairness slider. */
export const ALPHA_STEP = 0.5
/** The default alpha: balanced (Nash, the weighted log); `fairness_alpha` of a new trip (section 6). */
export const ALPHA_DEFAULT = 1

/** Lowest weight of a person; the API allows max/min up to 3 (section 2), so with all weights at least 1 any pick is valid. */
export const WEIGHT_MIN = 1
/** Highest weight of a person. */
export const WEIGHT_MAX = 3
/** Step of a weight slider. */
export const WEIGHT_STEP = 0.5
/** The weight of a child or of the grandmother's day, like the API's presets (CHILD_WEIGHT, FOCUS_WEIGHT). */
export const WEIGHT_RAISED = 2

/** Whole percent: `r` is a share, the screen says "87%". */
export const PERCENT = 100
/** Offset in `r = (u + 10) / (u* + 10)` (E4, section 3). */
export const R_OFFSET = 10
/** Top of the scale of `q`, the satisfaction with one domain (E2): 0 to 100. */
export const Q_MAX = 100
/** Decimal places of the Jain index, "0,94". */
export const JAIN_DIGITS = 2
/**
 * The surcharge on an unverified price, delta = 0,15 (E6, section 6), in percent. Only a fallback
 * for the note under a price: the amount itself comes from the API (`price_inflated`), and the
 * administrator may change delta (backend#96).
 */
export const UNVERIFIED_SURCHARGE_PCT = 15
/** Cents in a unit of money, to add decimal amounts without float error. */
export const CENTS = 100
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

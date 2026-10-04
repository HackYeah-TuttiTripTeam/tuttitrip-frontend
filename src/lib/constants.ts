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

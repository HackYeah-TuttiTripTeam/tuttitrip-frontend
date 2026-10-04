import type { Schemas } from '@/api/client'

export type Knowledge = Schemas['KnowledgeRead']

/** The cards the assistant can ask with (`CardKind` in the backend, issue backend#59). */
export const CARD_KINDS = [
  'choice',
  'confirm',
  'slider',
  'dot_pool',
  'family_builder',
  'requirement_toggles',
  'swipe',
  'budget_range',
  'city',
  'date_range',
] as const

export type CardKind = (typeof CARD_KINDS)[number]

/** One question of the assistant. `options` carry the labels; the question is the heading. */
export interface InterviewCard {
  kind: CardKind
  question: string
  options: string[]
  /** What the question is about (`QuestionField`), when the server says. */
  field?: Schemas['QuestionField']
  /** The person the question is about, for cards that answer for one person. */
  personId?: string
}

/** The AG-UI shared state as the client reads it. */
export interface InterviewState {
  /** The "What we already know" snapshot a tool sent, or null before the first one. */
  knowledge: Knowledge | null
  card: InterviewCard | null
}

export const EMPTY_INTERVIEW_STATE: InterviewState = { knowledge: null, card: null }

export interface ChatLine {
  id: string
  role: 'user' | 'assistant'
  text: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isCardKind = (value: unknown): value is CardKind => CARD_KINDS.some((kind) => kind === value)

/** Reads a card of the shared state or of `GET .../voice/{call_id}/card`; anything else is no card. */
export function parseCard(raw: unknown): InterviewCard | null {
  if (!isRecord(raw) || !isCardKind(raw.kind) || typeof raw.question !== 'string') return null
  const options = Array.isArray(raw.options)
    ? raw.options.filter((option): option is string => typeof option === 'string')
    : []
  const field = typeof raw.field === 'string' ? (raw.field as Schemas['QuestionField']) : undefined
  const personId = typeof raw.person_id === 'string' ? raw.person_id : undefined
  return { kind: raw.kind, question: raw.question, options, field, personId }
}

/** The snapshot is a KnowledgeRead, either under `knowledge` or as the whole state. */
function parseKnowledge(raw: unknown): Knowledge | null {
  const candidate = isRecord(raw) && isRecord(raw.knowledge) ? raw.knowledge : raw
  if (!isRecord(candidate) || !isRecord(candidate.trip) || !Array.isArray(candidate.people)) {
    return null
  }
  // The server sends the whole KnowledgeRead (its tools build it); the cast stands for that.
  return candidate as Knowledge
}

/**
 * Reads the shared state without trusting its shape: a state the client does not know is the
 * empty one, never an exception in the middle of a stream.
 */
export function parseInterviewState(raw: unknown): InterviewState {
  if (!isRecord(raw)) return EMPTY_INTERVIEW_STATE
  return { knowledge: parseKnowledge(raw), card: parseCard(raw.card) }
}

const fieldKey = (field: string, profileId?: string | null) => `${field}:${profileId ?? ''}`

/** `assistant` or `host` for a filled field, undefined when it is not filled. */
export function sourceOf(
  knowledge: Knowledge,
  field: string,
  profileId?: string | null,
): 'assistant' | 'host' | undefined {
  const key = fieldKey(field, profileId)
  return knowledge.sources.find((entry) => fieldKey(entry.field, entry.profile_id) === key)?.source
}

/** How many values the panel holds (the counter on the phone button). */
export const collectedCount = (knowledge: Knowledge | undefined) => knowledge?.sources.length ?? 0

/** The parts of a trip the "we are back" header names. */
export type ResumeField = 'destination' | 'dates' | 'budget' | 'people' | 'preferences'

export interface ResumeSummary {
  /** Settled, in the order the host would say them. */
  known: ResumeField[]
  /** Still to ask (the API's list, once per kind). */
  missing: ResumeField[]
  /** People on the trip, for "3 people". */
  peopleCount: number
}

/** What the interview already has and what it still lacks, from the "What we already know" data. */
export function resumeSummary(knowledge: Knowledge): ResumeSummary {
  const { trip, people } = knowledge
  const known: ResumeField[] = []
  if (trip.destination || trip.city_slug) known.push('destination')
  if (trip.start_date && trip.end_date) known.push('dates')
  if (trip.budget_total_min !== null || trip.budget_total_max !== null) known.push('budget')
  if (people.length > 0) known.push('people')
  const missing = [...new Set(knowledge.missing.map((entry) => entry.field))]
  // The API's list wins: a field it still asks about is not settled, whatever the trip holds.
  return {
    known: known.filter((field) => !missing.includes(field)),
    missing,
    peopleCount: people.length,
  }
}

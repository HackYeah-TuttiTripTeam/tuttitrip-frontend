import type { ProposalAnswer, ProposalDecision } from '@/api/queries/proposals'
import { compareText } from '@/lib/format'

export const ANSWER_SORTS = ['answered', 'name'] as const
export type AnswerSort = (typeof ANSWER_SORTS)[number]

export const ANSWER_FILTERS = ['all', 'approve', 'reject', 'comment'] as const
export type AnswerFilter = (typeof ANSWER_FILTERS)[number]

export const DEFAULT_ANSWER_SORT: AnswerSort = 'answered'
export const DEFAULT_ANSWER_DIR = 'desc'
export const DEFAULT_ANSWER_FILTER: AnswerFilter = 'all'

export interface AnswerQuery {
  filter: AnswerFilter
  sort: AnswerSort
  dir: 'asc' | 'desc'
  page: number
  size: number
}

export interface AnswerPage {
  items: ProposalAnswer[]
  total: number
  pages: number
  /** The page actually shown: a stale `page` in the URL is clamped to the last one. */
  page: number
}

/**
 * Filters, sorts and cuts the answers of a proposal. The API sends them whole (one per member with
 * an account, so a handful), the list still pages like every other, driven by the URL.
 */
export function listAnswers(answers: ProposalAnswer[], query: AnswerQuery): AnswerPage {
  const matching =
    query.filter === 'all' ? answers : answers.filter((answer) => answer.decision === query.filter)
  const sign = query.dir === 'asc' ? 1 : -1
  const sorted = [...matching].sort((a, b) => {
    const order =
      query.sort === 'name'
        ? compareText(a.display_name, b.display_name)
        : a.responded_at.localeCompare(b.responded_at)
    return order * sign
  })
  const pages = Math.max(1, Math.ceil(sorted.length / query.size))
  const page = Math.min(Math.max(1, query.page), pages)
  const start = (page - 1) * query.size
  return { items: sorted.slice(start, start + query.size), total: sorted.length, pages, page }
}

/** The answer of the caller, if they gave one. */
export const myAnswer = (answers: ProposalAnswer[]): ProposalAnswer | undefined =>
  answers.find((answer) => answer.is_me)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** The `code` of an error body's `detail` (`proposal.outdated`, `plan.not_approved`), if it has one. */
export function detailCode(detail: unknown): string | null {
  return isRecord(detail) && typeof detail.code === 'string' ? detail.code : null
}

/** Whether a comment may be sent: it needs a remark, the other answers do not. */
export const canSend = (decision: ProposalDecision, remark: string) =>
  decision !== 'comment' || remark.trim().length > 0

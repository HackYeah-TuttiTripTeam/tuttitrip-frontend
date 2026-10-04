import { ArrowDownWideNarrow, ArrowUpNarrowWide, X } from '@keyline-icons/react'
import type { ProposalAnswer, ProposalDecision } from '@/api/queries/proposals'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate, formatTime } from '@/lib/format'
import { PAGE_SIZES } from '@/lib/pagination'
import {
  ANSWER_FILTERS,
  ANSWER_SORTS,
  type AnswerFilter,
  type AnswerPage,
  type AnswerSort,
} from '@/lib/proposals'
import { m } from '@/paraglide/messages'

const DECISION_LABELS: Record<ProposalDecision, () => string> = {
  approve: m.proposal_decision_approve,
  reject: m.proposal_decision_reject,
  comment: m.proposal_decision_comment,
}

const FILTER_LABELS: Record<AnswerFilter, () => string> = {
  all: m.proposal_filter_all,
  approve: m.proposal_filter_approve,
  reject: m.proposal_filter_reject,
  comment: m.proposal_filter_comment,
}

const SORT_LABELS: Record<AnswerSort, () => string> = {
  answered: m.proposal_sort_answered,
  name: m.proposal_sort_name,
}

const isFilter = (value: string): value is AnswerFilter =>
  ANSWER_FILTERS.some((candidate) => candidate === value)
const isSort = (value: string): value is AnswerSort =>
  ANSWER_SORTS.some((candidate) => candidate === value)

interface ProposalAnswersProps {
  page: AnswerPage
  size: number
  filter: AnswerFilter
  sort: AnswerSort
  dir: 'asc' | 'desc'
  /** Everything is at its default: the "reset" button hides. */
  isDefault: boolean
  /** Total answers before the filter, to tell "nobody answered yet" from "nothing matches". */
  overall: number
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
  onFilterChange: (filter: AnswerFilter) => void
  onSortChange: (sort: AnswerSort, dir: 'asc' | 'desc') => void
  onReset: () => void
}

/** Who answered what: filter by decision, sort by name or time, paged (state lives in the URL). */
export function ProposalAnswers({
  page,
  size,
  filter,
  sort,
  dir,
  isDefault,
  overall,
  onPageChange,
  onSizeChange,
  onFilterChange,
  onSortChange,
  onReset,
}: ProposalAnswersProps) {
  const ascending = dir === 'asc'

  return (
    <section aria-labelledby="proposal-answers" className="flex flex-col gap-3">
      <h3 id="proposal-answers" className="font-medium text-sm">
        {m.proposal_answers_title()}
      </h3>

      {overall === 0 ? (
        <p className="text-muted-foreground text-sm">{m.proposal_answers_empty()}</p>
      ) : (
        <>
          <search className="flex flex-wrap items-center gap-2">
            <Select
              value={filter}
              onValueChange={(value) => isFilter(value) && onFilterChange(value)}
            >
              <SelectTrigger
                aria-label={m.proposal_filter_label()}
                className="h-11 min-w-0 flex-1 sm:h-9 sm:w-44 sm:flex-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANSWER_FILTERS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {FILTER_LABELS[key]()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) => isSort(value) && onSortChange(value, dir)}
            >
              <SelectTrigger
                aria-label={m.proposal_sort_label()}
                className="h-11 min-w-0 flex-1 sm:h-9 sm:w-44 sm:flex-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANSWER_SORTS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="size-11 sm:size-9"
              onClick={() => onSortChange(sort, ascending ? 'desc' : 'asc')}
              aria-label={ascending ? m.trips_sort_ascending() : m.trips_sort_descending()}
            >
              {ascending ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
            </Button>
            {!isDefault && (
              <Button variant="ghost" className="h-11 sm:h-9" onClick={onReset}>
                <X aria-hidden="true" />
                {m.trips_filters_clear()}
              </Button>
            )}
          </search>

          {page.total === 0 ? (
            <p className="text-muted-foreground text-sm">{m.proposal_answers_no_match()}</p>
          ) : (
            <ul className="divide-y" aria-label={m.proposal_answers_title()}>
              {page.items.map((answer) => (
                <AnswerRow key={answer.profile_id ?? answer.display_name} answer={answer} />
              ))}
            </ul>
          )}

          {page.total > PAGE_SIZES[0] && (
            <PaginationBar
              page={page.page}
              pages={page.pages}
              size={size}
              total={page.total}
              onPageChange={onPageChange}
              onSizeChange={onSizeChange}
            />
          )}
        </>
      )}
    </section>
  )
}

function AnswerRow({ answer }: { answer: ProposalAnswer }) {
  return (
    <li className="flex flex-col gap-1 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-medium text-sm">
          {answer.is_me ? m.proposal_answer_me({ name: answer.display_name }) : answer.display_name}
          <span className="font-normal text-muted-foreground">
            {' · '}
            {DECISION_LABELS[answer.decision]()}
          </span>
        </p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {formatDate(answer.responded_at)}, {formatTime(answer.responded_at)}
        </p>
      </div>
      {answer.remark && <p className="text-sm leading-relaxed">{answer.remark}</p>}
    </li>
  )
}

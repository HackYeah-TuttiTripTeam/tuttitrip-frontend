import { TriangleAlert } from '@keyline-icons/react'
import { getRouteApi } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import type { Plan } from '@/api/queries/plans'
import type { Proposal } from '@/api/queries/proposals'
import { CalendarCard } from '@/components/planning/calendar-card'
import { ProposalAnswerForm } from '@/components/planning/proposal-answer-form'
import { ProposalAnswers } from '@/components/planning/proposal-answers'
import { ProposalCard } from '@/components/planning/proposal-card'
import { SendProposal } from '@/components/planning/send-proposal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { type CalendarError, useCalendarDownload } from '@/hooks/use-calendar-download'
import { DESKTOP_QUERY, useMediaQuery } from '@/hooks/use-media-query'
import { useProposal } from '@/hooks/use-proposal'
import { type ResponseError, useProposalResponse } from '@/hooks/use-proposal-response'
import { type SendProposalError, useSendProposal } from '@/hooks/use-send-proposal'
import { ICS_FILE_EXTENSION, ICS_FILE_PREFIX } from '@/lib/constants'
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@/lib/pagination'
import {
  type AnswerFilter,
  type AnswerSort,
  DEFAULT_ANSWER_DIR,
  DEFAULT_ANSWER_FILTER,
  DEFAULT_ANSWER_SORT,
  listAnswers,
  myAnswer,
} from '@/lib/proposals'
import { m } from '@/paraglide/messages'

const route = getRouteApi('/trips_/$tripId')

type PageSize = (typeof PAGE_SIZES)[number]

const SEND_ERROR: Record<SendProposalError, () => string> = {
  forbidden: m.proposal_error_send_forbidden,
  outdated: m.proposal_error_send_outdated,
  failed: m.proposal_error_send_failed,
}

const RESPONSE_ERROR: Record<ResponseError, () => string> = {
  outdated: m.proposal_error_answer_outdated,
  forbidden: m.proposal_error_answer_forbidden,
  failed: m.proposal_error_answer_failed,
}

const CALENDAR_ERROR: Record<CalendarError, () => string> = {
  not_approved: m.calendar_error_not_approved,
  forbidden: m.calendar_error_forbidden,
  offline: m.calendar_error_offline,
  failed: m.calendar_error_failed,
}

interface TripPlanProposalProps {
  tripId: string
  /** Host and co-host send the plan; every member answers. */
  canManage: boolean
  plan: Plan
}

/**
 * The approval of the plan, at the top of the Plan tab: the host sends it, members approve, reject
 * or leave a remark, and once everyone approved the plan can be saved to a calendar. Named
 * `trip-view.plan.proposal` because a view may only import views of its own name.
 */
export function TripPlanProposal({ tripId, canManage, plan }: TripPlanProposalProps) {
  const { proposal, isPending, hasNone, forbidden, problem, refetch } = useProposal(tripId)
  const send = useSendProposal(tripId)

  // A member without access to proposals just does not get the section.
  if (forbidden) return null
  if (isPending) return <Skeleton aria-hidden="true" className="h-28 w-full rounded-lg" />

  if (problem) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 p-4 text-sm"
      >
        <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
        <p className="flex-1">{m.proposal_load_failed()}</p>
        <Button variant="outline" className="h-11" onClick={refetch}>
          {m.action_retry()}
        </Button>
      </div>
    )
  }

  const sendError = send.error ? SEND_ERROR[send.error]() : null

  if (hasNone || !proposal) {
    // Members have nothing to answer yet; the host sees how to start.
    if (!canManage) return null
    return (
      <SendProposal
        blocked={plan.params.draft}
        pending={send.isPending}
        error={sendError}
        onSend={send.send}
      />
    )
  }

  return (
    <OpenProposal
      tripId={tripId}
      proposal={proposal}
      canManage={canManage}
      sending={send.isPending}
      sendError={sendError}
      onSend={send.send}
    />
  )
}

interface OpenProposalProps {
  tripId: string
  proposal: Proposal
  canManage: boolean
  sending: boolean
  sendError: string | null
  onSend: () => void
}

function OpenProposal({
  tripId,
  proposal,
  canManage,
  sending,
  sendError,
  onSend,
}: OpenProposalProps) {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const isDesktop = useMediaQuery(DESKTOP_QUERY)
  const response = useProposalResponse(tripId, proposal.id)
  const calendar = useCalendarDownload({
    tripId,
    planId: proposal.plan_id,
    planHash: proposal.plan_hash,
  })
  const [calendarOpen, setCalendarOpen] = useState(false)

  const filter = search.answers_filter ?? DEFAULT_ANSWER_FILTER
  const sort = search.answers_sort ?? DEFAULT_ANSWER_SORT
  const dir = search.answers_dir ?? DEFAULT_ANSWER_DIR
  const size = search.answers_size ?? DEFAULT_PAGE_SIZE
  const page = useMemo(
    () =>
      listAnswers(proposal.responses, {
        filter,
        sort,
        dir,
        size,
        page: search.answers_page ?? 1,
      }),
    [proposal.responses, filter, sort, dir, size, search.answers_page],
  )

  // Defaults stay out of the URL; a filter, sort or size change goes back to page 1.
  const setList = (patch: {
    answers_page?: number | undefined
    answers_size?: PageSize | undefined
    answers_sort?: AnswerSort | undefined
    answers_dir?: 'asc' | 'desc' | undefined
    answers_filter?: AnswerFilter | undefined
  }) =>
    void navigate({
      search: (prev) => ({ ...prev, answers_page: undefined, ...patch }),
      replace: true,
    })

  const outdated = proposal.status === 'outdated'
  const approved = proposal.status === 'approved'
  const fileName = `${ICS_FILE_PREFIX}${proposal.plan_hash}${ICS_FILE_EXTENSION}`

  return (
    <ProposalCard
      proposal={proposal}
      canResend={canManage}
      resending={sending}
      onResend={onSend}
      sendError={sendError}
    >
      {!outdated && (
        <ProposalAnswerForm
          // A saved answer fills the field once; a new proposal starts again.
          key={`${proposal.id}:${response.isPending}`}
          mine={myAnswer(proposal.responses)}
          pending={response.isPending}
          error={response.error ? RESPONSE_ERROR[response.error]() : null}
          onRespond={response.respond}
        />
      )}

      <ProposalAnswers
        page={page}
        size={size}
        filter={filter}
        sort={sort}
        dir={dir}
        overall={proposal.responses.length}
        isDefault={
          filter === DEFAULT_ANSWER_FILTER &&
          sort === DEFAULT_ANSWER_SORT &&
          dir === DEFAULT_ANSWER_DIR
        }
        onPageChange={(next) =>
          void navigate({
            search: (prev) => ({ ...prev, answers_page: next === 1 ? undefined : next }),
            replace: true,
          })
        }
        onSizeChange={(next) =>
          setList({
            answers_size: PAGE_SIZES.find(
              (candidate) => candidate === next && next !== DEFAULT_PAGE_SIZE,
            ),
          })
        }
        onFilterChange={(next) =>
          setList({ answers_filter: next === DEFAULT_ANSWER_FILTER ? undefined : next })
        }
        onSortChange={(nextSort, nextDir) =>
          setList({
            answers_sort: nextSort === DEFAULT_ANSWER_SORT ? undefined : nextSort,
            answers_dir: nextDir === DEFAULT_ANSWER_DIR ? undefined : nextDir,
          })
        }
        onReset={() =>
          setList({ answers_filter: undefined, answers_sort: undefined, answers_dir: undefined })
        }
      />

      {!outdated && (
        <CalendarCard
          approved={approved}
          planVersion={proposal.plan_version}
          fileName={fileName}
          open={calendarOpen}
          isDesktop={isDesktop}
          pending={calendar.isPending}
          done={calendar.done}
          error={calendar.error ? CALENDAR_ERROR[calendar.error]() : null}
          onOpenChange={(open) => {
            setCalendarOpen(open)
            if (!open) calendar.reset()
          }}
          onConfirm={calendar.download}
        />
      )}
    </ProposalCard>
  )
}

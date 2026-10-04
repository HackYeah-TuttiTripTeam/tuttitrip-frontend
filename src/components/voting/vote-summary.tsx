import { Ban, Minus, ThumbsDown, ThumbsUp } from '@keyline-icons/react'
import type {
  PersonVote,
  PlaceVoteSummary,
  VoteSource,
  VoteSummaryPage,
  VoteSummarySort,
} from '@/api/queries/vote-links'
import { Pager } from '@/components/shared/pager'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { VOTE_SOURCES, VOTE_SUMMARY_SORTS } from '@/lib/vote-constants'
import { REASON_LABELS } from '@/lib/vote-reasons'
import { m } from '@/paraglide/messages'

export const SOURCE_LABELS: Record<VoteSource, () => string> = {
  app: m.vote_source_app,
  link: m.vote_source_link,
  host: m.vote_source_host,
}

const SORT_LABELS: Record<VoteSummarySort, () => string> = {
  name: m.vote_sort_name,
  want: m.vote_sort_want,
  dont_want: m.vote_sort_dont_want,
  veto: m.vote_sort_veto,
}

/** The value of the "any source" item: a Select item cannot have an empty value. */
const ANY_SOURCE = 'all'

const isSource = (value: string): value is VoteSource => VOTE_SOURCES.some((s) => s === value)
const isSort = (value: string): value is VoteSummarySort =>
  VOTE_SUMMARY_SORTS.some((s) => s === value)

interface VoteSummaryProps {
  page: VoteSummaryPage
  source: VoteSource | undefined
  vetoOnly: boolean
  sort: VoteSummarySort
  onSourceChange: (source: VoteSource | undefined) => void
  onVetoOnlyChange: (vetoOnly: boolean) => void
  onSortChange: (sort: VoteSummarySort) => void
  onPageChange: (page: number) => void
}

function answerText(vote: PersonVote): string {
  if (vote.value === 'want') return m.vote_want()
  if (vote.value === 'neutral') return m.vote_dont_mind()
  return vote.reason_code
    ? m.vote_summary_dont_want_reason({ reason: REASON_LABELS[vote.reason_code]().toLowerCase() })
    : m.vote_dont_want()
}

function PlaceRow({ place }: { place: PlaceVoteSummary }) {
  const names = place.vetoes
    .map((veto) => `${veto.display_name} (${SOURCE_LABELS[veto.source]().toLowerCase()})`)
    .join(', ')
  return (
    <li className="flex flex-col gap-2 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-medium">{place.place_name}</h3>
        <p className="flex items-center gap-3 text-sm tabular-nums">
          <span className="flex items-center gap-1" title={m.vote_want()}>
            <ThumbsUp aria-hidden="true" className="size-4" />
            <span className="sr-only">{m.vote_want()}</span>
            {place.want}
          </span>
          <span className="flex items-center gap-1" title={m.vote_dont_mind()}>
            <Minus aria-hidden="true" className="size-4" />
            <span className="sr-only">{m.vote_dont_mind()}</span>
            {place.neutral}
          </span>
          <span className="flex items-center gap-1" title={m.vote_dont_want()}>
            <ThumbsDown aria-hidden="true" className="size-4" />
            <span className="sr-only">{m.vote_dont_want()}</span>
            {place.dont_want}
          </span>
        </p>
      </div>

      {place.veto_count > 0 && (
        <p className="flex items-center gap-2 font-medium text-destructive text-sm">
          <Ban aria-hidden="true" className="size-4 shrink-0" />
          {m.vote_summary_veto({ count: place.veto_count, names })}
        </p>
      )}

      {place.votes.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-muted-foreground text-sm">
          {place.votes.map((vote) => (
            <li key={vote.profile_id}>
              {m.vote_summary_person({
                name: vote.display_name,
                answer: answerText(vote),
                source: SOURCE_LABELS[vote.source]().toLowerCase(),
              })}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/** What the group said, place by place, with who said it and how (link, app or the host). */
export function VoteSummary({
  page,
  source,
  vetoOnly,
  sort,
  onSourceChange,
  onVetoOnlyChange,
  onSortChange,
  onPageChange,
}: VoteSummaryProps) {
  const filtered = source !== undefined || vetoOnly
  return (
    <div className="flex flex-col gap-3">
      <search className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={source ?? ANY_SOURCE}
          onValueChange={(value) => onSourceChange(isSource(value) ? value : undefined)}
        >
          <SelectTrigger aria-label={m.vote_filter_source()} className="h-11 sm:h-9 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_SOURCE}>{m.vote_source_any()}</SelectItem>
            {VOTE_SOURCES.map((value) => (
              <SelectItem key={value} value={value}>
                {SOURCE_LABELS[value]()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => isSort(value) && onSortChange(value)}>
          <SelectTrigger aria-label={m.vote_sort_by()} className="h-11 sm:h-9 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOTE_SUMMARY_SORTS.map((value) => (
              <SelectItem key={value} value={value}>
                {SORT_LABELS[value]()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex min-h-11 items-center gap-2 sm:min-h-9">
          <Switch id="vote-veto-only" checked={vetoOnly} onCheckedChange={onVetoOnlyChange} />
          <Label htmlFor="vote-veto-only" className="text-sm">
            {m.vote_filter_veto()}
          </Label>
        </div>
      </search>

      {page.items.length === 0 ? (
        <p className="border-y py-6 text-muted-foreground text-sm">
          {filtered ? m.vote_summary_no_match() : m.vote_summary_empty()}
        </p>
      ) : (
        <ul aria-label={m.vote_summary_list_label()} className="flex flex-col divide-y border-y">
          {page.items.map((place) => (
            <PlaceRow key={place.place_id} place={place} />
          ))}
        </ul>
      )}
      <Pager page={page.page} pages={page.pages} onPageChange={onPageChange} />
    </div>
  )
}

export function VoteSummarySkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 py-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-5 w-3/5" />
    </div>
  )
}

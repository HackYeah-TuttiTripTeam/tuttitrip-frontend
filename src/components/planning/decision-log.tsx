import { History } from '@keyline-icons/react'
import type { Decision, DecisionKind } from '@/api/queries/decisions'
import { PaginationBar } from '@/components/shared/pagination-bar'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DECISION_KINDS } from '@/lib/decisions'
import { formatDate, formatTime } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { DecisionEffectsLine } from './decision-effects'

const KIND_LABELS: Record<DecisionKind, () => string> = {
  must: m.decision_kind_must,
  block: m.decision_kind_block,
  revoke: m.decision_kind_revoke,
  budget_approval: m.decision_kind_budget_approval,
}

/** The "all kinds" entry of the filter; a Select item needs a value, and "" is taken by the placeholder. */
const ALL_KINDS = 'all'

interface DecisionLogProps {
  decisions: Decision[]
  currency: string
  /** Name of the person behind an account (`sub`), when the trip knows one. */
  authorName: (sub: string) => string | null
  placeName: (placeId: string) => string
  kind: DecisionKind | undefined
  page: number
  size: number
  pages: number | undefined
  total: number
  isPending: boolean
  isPlaceholder: boolean
  failed: boolean
  onKindChange: (kind: DecisionKind | undefined) => void
  onPageChange: (page: number) => void
  onSizeChange: (size: number) => void
  onRetry: () => void
}

/** The append-only log of host decisions: who, when, why and what it cost. */
export function DecisionLog({
  decisions,
  currency,
  authorName,
  placeName,
  kind,
  page,
  size,
  pages,
  total,
  isPending,
  isPlaceholder,
  failed,
  onKindChange,
  onPageChange,
  onSizeChange,
  onRetry,
}: DecisionLogProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium text-base">{m.decision_log_title()}</h2>
        <Select
          value={kind ?? ALL_KINDS}
          onValueChange={(value) =>
            onKindChange(DECISION_KINDS.find((candidate) => candidate === value))
          }
        >
          <SelectTrigger aria-label={m.decision_log_filter()} className="h-11 w-auto min-w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_KINDS}>{m.decision_log_all()}</SelectItem>
            {DECISION_KINDS.map((value) => (
              <SelectItem key={value} value={value}>
                {KIND_LABELS[value]()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div aria-hidden="true" className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : failed ? (
        <StatusMessage
          role="alert"
          icon={<History />}
          title={m.decision_log_failed_title()}
          action={
            <Button variant="outline" onClick={onRetry}>
              {m.action_retry()}
            </Button>
          }
        >
          {m.decision_log_failed_body()}
        </StatusMessage>
      ) : decisions.length === 0 ? (
        <StatusMessage icon={<History />} title={m.decision_log_empty_title()}>
          {m.decision_log_empty_body()}
        </StatusMessage>
      ) : (
        <>
          <ol className={isPlaceholder ? 'opacity-60' : undefined}>
            {decisions.map((decision) => (
              <li key={decision.id} className="flex flex-col gap-1 border-t py-3">
                <p className="font-medium text-sm">
                  {KIND_LABELS[decision.kind]()}
                  {decision.place_id && `: ${placeName(decision.place_id)}`}
                </p>
                <p className="text-muted-foreground text-xs">
                  {m.decision_log_by({
                    author: authorName(decision.created_by_sub) ?? m.decision_log_author_unknown(),
                    date: formatDate(decision.created_at),
                    time: formatTime(decision.created_at),
                  })}
                </p>
                {decision.reason && <p className="text-sm leading-relaxed">{decision.reason}</p>}
                <DecisionEffectsLine effects={decision.effects} currency={currency} />
              </li>
            ))}
          </ol>
          <PaginationBar
            page={page}
            pages={pages ?? page}
            size={size}
            total={total}
            busy={isPlaceholder}
            onPageChange={onPageChange}
            onSizeChange={onSizeChange}
          />
        </>
      )}
    </div>
  )
}

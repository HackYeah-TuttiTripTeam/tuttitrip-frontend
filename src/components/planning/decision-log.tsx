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
import { FILTER_ALL, GAIN_POINTS_DIGITS } from '@/lib/constants'
import { DECISION_KINDS } from '@/lib/decisions'
import { formatDate, formatDecimal, formatNumber, formatTime } from '@/lib/format'
import { m } from '@/paraglide/messages'
import { DecisionEffectsLine } from './decision-effects'

const KIND_LABELS: Record<DecisionKind, () => string> = {
  must: m.decision_kind_must,
  block: m.decision_kind_block,
  revoke: m.decision_kind_revoke,
  budget_approval: m.decision_kind_budget_approval,
}

interface DecisionLogProps {
  decisions: Decision[]
  currency: string
  /** Name of the person behind an account (`sub`), when the trip knows one. */
  authorName: (sub: string) => string | null
  placeName: (placeId: string) => string
  kind: DecisionKind | undefined
  dir: 'asc' | 'desc'
  /** Name of a person by profile id, for the gain in a budget decision. */
  profileName: (profileId: string) => string | null
  page: number
  size: number
  pages: number | undefined
  total: number
  isPending: boolean
  isPlaceholder: boolean
  failed: boolean
  onKindChange: (kind: DecisionKind | undefined) => void
  onDirChange: (dir: 'asc' | 'desc') => void
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
  dir,
  profileName,
  page,
  size,
  pages,
  total,
  isPending,
  isPlaceholder,
  failed,
  onKindChange,
  onDirChange,
  onPageChange,
  onSizeChange,
  onRetry,
}: DecisionLogProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-medium text-base">{m.decision_log_title()}</h2>
        <div className="flex flex-wrap justify-end gap-2">
          <Select
            value={dir}
            onValueChange={(value) => onDirChange(value === 'asc' ? 'asc' : 'desc')}
          >
            <SelectTrigger aria-label={m.decision_log_order()} className="h-11 w-auto min-w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">{m.decision_log_newest()}</SelectItem>
              <SelectItem value="asc">{m.decision_log_oldest()}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={kind ?? FILTER_ALL}
            onValueChange={(value) =>
              onKindChange(DECISION_KINDS.find((candidate) => candidate === value))
            }
          >
            <SelectTrigger aria-label={m.decision_log_filter()} className="h-11 w-auto min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>{m.decision_log_all()}</SelectItem>
              {DECISION_KINDS.map((value) => (
                <SelectItem key={value} value={value}>
                  {KIND_LABELS[value]()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
                {decision.effects.budget ? (
                  <p className="font-mono text-[13px] tabular-nums">
                    {m.decision_budget_line({
                      outcome:
                        decision.effects.budget.outcome === 'approved'
                          ? m.decision_budget_approved()
                          : m.decision_budget_rejected(),
                      over: formatDecimal(decision.effects.budget.over_budget, currency),
                      kappa: formatDecimal(decision.effects.budget.kappa, currency),
                      gain:
                        decision.effects.budget.gain_points != null
                          ? m.decision_budget_gain({
                              name:
                                profileName(decision.effects.budget.gain_profile_id ?? '') ??
                                m.decision_log_author_unknown(),
                              points: formatNumber(
                                decision.effects.budget.gain_points,
                                GAIN_POINTS_DIGITS,
                              ),
                            })
                          : '',
                    })}
                  </p>
                ) : (
                  <DecisionEffectsLine effects={decision.effects} currency={currency} />
                )}
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

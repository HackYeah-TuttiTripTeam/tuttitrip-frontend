import { cn } from 'cn'
import type { PlanDomainCode, PlanDomainScore } from '@/api/queries/plans'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'

export const DOMAIN_LABELS: Record<PlanDomainCode, () => string> = {
  lodging: m.prefs_pool_domain_lodging,
  food: m.prefs_pool_domain_food,
  attractions: m.prefs_pool_domain_attractions,
  pace: m.prefs_pool_domain_pace,
  cost: m.prefs_pool_domain_cost,
}

/** Scale of `q`: satisfaction with a domain, 0 to 100. */
const Q_MAX = 100

interface DomainChartProps {
  domains: PlanDomainScore[]
  /** The applicable domain with the lowest `q`, from the API. */
  weakest: PlanDomainCode | null
}

/**
 * The five domains of one person's satisfaction (`q`), each with its number, the weakest marked
 * in words. A domain the person does not weigh at all says "not applicable" instead of a bar.
 */
export function DomainChart({ domains, weakest }: DomainChartProps) {
  return (
    <ul className="flex flex-col gap-2.5">
      {domains.map(({ domain, q, not_applicable }) => {
        const isWeakest = domain === weakest
        return (
          <li key={domain} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-x-3">
            <span className="text-sm leading-[22px]">{DOMAIN_LABELS[domain]()}</span>
            {q == null || not_applicable ? (
              <span className="col-span-2 text-muted-foreground text-sm">
                {m.fairness_domain_na()}
              </span>
            ) : (
              <>
                <span aria-hidden="true" className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      'block h-full rounded-full',
                      isWeakest ? 'bg-decline' : 'bg-primary',
                    )}
                    style={{ width: `${(q / Q_MAX) * 100}%` }}
                  />
                </span>
                <span className="flex items-center gap-2 text-right">
                  <span className="font-heading font-semibold tabular-nums">
                    {formatNumber(q, 0)}
                  </span>
                  {isWeakest && (
                    <span className="rounded-full bg-decline-soft px-2 py-0.5 font-medium text-[13px] text-decline-ink leading-[18px]">
                      {m.fairness_weakest()}
                    </span>
                  )}
                </span>
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}

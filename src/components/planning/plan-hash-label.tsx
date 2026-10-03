import { m } from '@/paraglide/messages'

interface PlanHashLabelProps {
  /** `plan_hash` from the API: a 12-character SHA-256 prefix. */
  hash: string
}

/** The repeatability label: the same input always gives the same plan and the same hash. */
export function PlanHashLabel({ hash }: PlanHashLabelProps) {
  return (
    <span className="text-[13px] text-muted-foreground leading-[18px]" title={m.plan_hash_hint()}>
      {m.plan_hash_label()} <span className="tabular-nums">{hash}</span>
      <span className="sr-only">. {m.plan_hash_hint()}</span>
    </span>
  )
}

import { m } from '@/paraglide/messages'

interface PlanHashLabelProps {
  /** `plan_hash` from the API: a 12-character SHA-256 prefix. */
  hash: string
}

/** The repeatability label: the same input always gives the same plan and the same hash. */
export function PlanHashLabel({ hash }: PlanHashLabelProps) {
  return (
    <span className="text-[13px] text-muted-foreground leading-[18px]">
      {m.plan_hash_with_hint({ label: m.plan_hash_label(), hash, hint: m.plan_hash_hint() })}
    </span>
  )
}

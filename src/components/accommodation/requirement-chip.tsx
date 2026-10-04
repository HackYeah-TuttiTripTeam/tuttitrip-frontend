import { ChevronDown, CircleCheck, CircleQuestion, CircleX } from '@keyline-icons/react'
import { cn } from 'cn'
import { type ReactNode, useId, useState } from 'react'
import type { RequirementCheck, RequirementStatus } from '@/api/queries/accommodation'
import { reasonLabel, requirementLabel } from '@/lib/accommodation'
import { formatNumber } from '@/lib/format'
import { m } from '@/paraglide/messages'

const STATUS_WORDS: Record<RequirementStatus, () => string> = {
  met: m.requirement_met,
  unmet: m.requirement_unmet,
  unconfirmed: m.requirement_unconfirmed,
}

const STATUS_ICONS: Record<RequirementStatus, ReactNode> = {
  met: <CircleCheck />,
  unmet: <CircleX />,
  unconfirmed: <CircleQuestion />,
}

/** Certainty is louder than doubt: solid for a fact either way, dashed and quiet for "not confirmed". */
const STATUS_LOOK: Record<RequirementStatus, string> = {
  met: 'bg-secondary text-foreground',
  unmet: 'bg-destructive/10 text-destructive',
  unconfirmed: 'border-[1.5px] border-muted-foreground border-dashed text-muted-foreground',
}

interface RequirementChipProps {
  check: RequirementCheck
}

/**
 * One requirement against one offer: its name, the state in words (met, unmet, not confirmed) and,
 * on request, the quote from the offer. A state we could not confirm says why, right next to it.
 */
export function RequirementChip({ check }: RequirementChipProps) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const label = requirementLabel(check.kind ?? 'amenity', check.feature)
  const hasDetails = check.status !== 'unconfirmed' || Boolean(check.quote)

  const chip = (
    <>
      <span aria-hidden="true" className="[&_svg]:size-4">
        {STATUS_ICONS[check.status]}
      </span>
      <span>{m.requirement_state({ label, state: STATUS_WORDS[check.status]() })}</span>
      {check.hard && (
        <span className="font-normal text-xs opacity-80">{m.requirement_hard_marker()}</span>
      )}
      {hasDetails && (
        <ChevronDown
          aria-hidden="true"
          className={cn('size-4 transition-transform', open && 'rotate-180')}
        />
      )}
    </>
  )
  const look = cn(
    'inline-flex min-h-7 items-center gap-1.5 rounded-full py-0.5 pr-3 pl-2.5 font-medium text-[13px] leading-[18px]',
    STATUS_LOOK[check.status],
  )

  return (
    <li className="flex flex-col items-start gap-1.5">
      {hasDetails ? (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen(!open)}
          className={cn(
            look,
            'relative outline-none before:absolute before:-inset-y-2 before:inset-x-0 focus-visible:ring-[3px] focus-visible:ring-ring/50',
          )}
        >
          {chip}
        </button>
      ) : (
        <span className={look}>{chip}</span>
      )}
      {check.status === 'unconfirmed' && check.reason && (
        <p className="text-muted-foreground text-sm leading-[22px]">{reasonLabel(check.reason)}</p>
      )}
      {hasDetails && open && (
        <div id={detailsId} className="flex flex-col gap-1 text-sm">
          {check.quote ? (
            <blockquote className="border-l-2 pl-3 text-muted-foreground italic leading-relaxed">
              {check.quote}
            </blockquote>
          ) : (
            <p className="text-muted-foreground">{m.requirement_typed_by_host()}</p>
          )}
          {check.confidence != null && (
            <p className="text-muted-foreground text-xs">
              {m.requirement_confidence({ value: formatNumber(check.confidence) })}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

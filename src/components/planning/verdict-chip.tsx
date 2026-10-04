import { Ban, Check, Crown, Landmark } from '@keyline-icons/react'
import { cn } from 'cn'
import type { ReactNode } from 'react'
import type { VerdictKind } from '@/api/queries/plans'
import { VERDICT_LABELS } from '@/lib/verdicts'

const ICONS: Record<VerdictKind, ReactNode> = {
  must: <Crown />,
  fits: <Check />,
  iconic_not_yours: <Landmark />,
  skip: <Ban />,
}

const LOOK: Record<VerdictKind, string> = {
  must: 'bg-primary text-primary-foreground',
  fits: 'bg-secondary text-foreground',
  iconic_not_yours: 'border-[1.5px] border-foreground border-dashed text-foreground',
  skip: 'border text-muted-foreground',
}

interface VerdictChipProps {
  verdict: VerdictKind
  /** Opens the details; without it the chip is a plain label. */
  onClick?: () => void
  className?: string
}

/** The verdict as an icon and a word, so the colour alone never carries it. */
export function VerdictChip({ verdict, onClick, className }: VerdictChipProps) {
  const look = cn(
    'inline-flex min-h-7 items-center gap-1.5 rounded-full py-0.5 pr-3 pl-2.5 font-medium text-[13px] leading-[18px]',
    LOOK[verdict],
    className,
  )
  const content = (
    <>
      <span aria-hidden="true" className="[&_svg]:size-4">
        {ICONS[verdict]}
      </span>
      {VERDICT_LABELS[verdict]()}
    </>
  )
  if (!onClick) return <span className={look}>{content}</span>
  return (
    <button
      type="button"
      onClick={onClick}
      // The chip stays small to look at; the invisible padding makes the touch target 44px.
      className={cn(
        look,
        'relative outline-none before:absolute before:-inset-y-2 before:inset-x-0 hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-ring/50',
      )}
    >
      {content}
    </button>
  )
}

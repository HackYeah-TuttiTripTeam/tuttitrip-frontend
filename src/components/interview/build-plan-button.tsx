import { Calendar } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

interface BuildPlanButtonProps {
  /** The request is queued or in flight. */
  pending: boolean
  /** Queued behind the assistant's answer. */
  waiting: boolean
  onClick: () => void
  className?: string
}

/** "Build plan now": visible from the first screen of the interview, in the bottom bar on phones. */
export function BuildPlanButton({ pending, waiting, onClick, className }: BuildPlanButtonProps) {
  return (
    <Button
      type="button"
      className={cn('h-11 rounded-full px-5', className)}
      disabled={pending}
      aria-busy={pending}
      onClick={onClick}
    >
      <Calendar aria-hidden="true" />
      {waiting
        ? m.interview_build_waiting()
        : pending
          ? m.interview_build_pending()
          : m.interview_build()}
    </Button>
  )
}

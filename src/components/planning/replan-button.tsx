import { CloudRain } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface ReplanButtonProps {
  onClick: () => void
  isPending: boolean
  className?: string
}

/** "Rain": replans the rest of the chosen day. The answer takes milliseconds, so there is no fake wait. */
export function ReplanButton({ onClick, isPending, className }: ReplanButtonProps) {
  return (
    <Button variant="outline" onClick={onClick} disabled={isPending} className={className}>
      <CloudRain aria-hidden="true" />
      {m.replan_rain()}
    </Button>
  )
}

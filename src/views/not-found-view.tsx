import { Compass } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

export function NotFoundView() {
  return (
    <StatusMessage
      icon={<Compass />}
      title={m.not_found_title()}
      action={
        <Button asChild variant="outline">
          <Link to="/trips">{m.not_found_back()}</Link>
        </Button>
      }
    >
      {m.not_found_body()}
    </StatusMessage>
  )
}

import { Compass } from '@keyline-icons/react'
import { Link } from '@tanstack/react-router'
import { StatusMessage } from '@/components/shared/status-message'
import { Button } from '@/components/ui/button'

export function NotFoundView() {
  return (
    <StatusMessage
      icon={<Compass />}
      title="Tu nic nie ma"
      action={
        <Button asChild variant="outline">
          <Link to="/trips">Wróć do wyjazdów</Link>
        </Button>
      }
    >
      Ten adres nie prowadzi do żadnej strony. Może link jest nieaktualny.
    </StatusMessage>
  )
}

import { Send } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface SendProposalProps {
  /** The plan cannot be sent yet (a preliminary one). */
  blocked: boolean
  pending: boolean
  /** A sentence about why sending failed. */
  error: string | null
  onSend: () => void
}

/** The host's "Send for approval" before any proposal exists. */
export function SendProposal({ blocked, pending, error, onSend }: SendProposalProps) {
  return (
    <section
      aria-labelledby="proposal-send-title"
      className="flex flex-col items-start gap-3 rounded-lg border p-4 md:p-5"
    >
      <h2 id="proposal-send-title" className="font-heading font-semibold text-base">
        {m.proposal_send_title()}
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {blocked ? m.proposal_send_blocked() : m.proposal_send_body()}
      </p>
      <Button
        type="button"
        className="h-11 rounded-full px-5"
        disabled={blocked || pending}
        onClick={onSend}
      >
        <Send aria-hidden="true" />
        {pending ? m.proposal_sending() : m.proposal_send()}
      </Button>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </section>
  )
}

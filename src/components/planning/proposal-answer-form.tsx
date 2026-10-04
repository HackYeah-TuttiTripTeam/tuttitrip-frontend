import { Check, MessageSquare, X } from '@keyline-icons/react'
import { type FormEvent, useId, useState } from 'react'
import type { ProposalAnswer, ProposalDecision } from '@/api/queries/proposals'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PROPOSAL_REMARK_MAX_CHARS } from '@/lib/constants'
import { canSend } from '@/lib/proposals'
import { m } from '@/paraglide/messages'

const MINE: Record<ProposalDecision, () => string> = {
  approve: m.proposal_mine_approve,
  reject: m.proposal_mine_reject,
  comment: m.proposal_mine_comment,
}

interface ProposalAnswerFormProps {
  /** The caller's earlier answer: a new one replaces it. */
  mine: ProposalAnswer | undefined
  pending: boolean
  /** A sentence about why the answer did not go through. */
  error: string | null
  onRespond: (decision: ProposalDecision, remark: string) => void
}

/** The three actions of a member: approve, reject, or leave a remark. */
export function ProposalAnswerForm({ mine, pending, error, onRespond }: ProposalAnswerFormProps) {
  const remarkId = useId()
  const [remark, setRemark] = useState(mine?.remark ?? '')
  const [sent, setSent] = useState<ProposalDecision | null>(null)

  const send = (decision: ProposalDecision) => {
    setSent(decision)
    onRespond(decision, remark)
  }
  const submit = (event: FormEvent) => event.preventDefault()

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-busy={pending}>
      <h3 className="font-medium text-sm">{m.proposal_answer_title()}</h3>
      {mine && (
        <p role="status" className="text-muted-foreground text-sm">
          {MINE[mine.decision]()}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={remarkId} className="text-sm">
          {m.proposal_remark_label()}
        </Label>
        <Textarea
          id={remarkId}
          value={remark}
          maxLength={PROPOSAL_REMARK_MAX_CHARS}
          placeholder={m.proposal_remark_placeholder()}
          onChange={(event) => setRemark(event.target.value)}
        />
        <p className="text-muted-foreground text-xs">{m.proposal_remark_hint()}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button
          type="button"
          className="h-11 rounded-full px-5"
          disabled={pending}
          onClick={() => send('approve')}
        >
          <Check aria-hidden="true" />
          {pending && sent === 'approve' ? m.proposal_sending() : m.proposal_approve()}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-5"
          disabled={pending}
          onClick={() => send('reject')}
        >
          <X aria-hidden="true" />
          {pending && sent === 'reject' ? m.proposal_sending() : m.proposal_reject()}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full px-5"
          disabled={pending || !canSend('comment', remark)}
          onClick={() => send('comment')}
        >
          <MessageSquare aria-hidden="true" />
          {pending && sent === 'comment' ? m.proposal_sending() : m.proposal_comment()}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </form>
  )
}

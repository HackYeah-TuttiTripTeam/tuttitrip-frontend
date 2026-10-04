import { InterviewCard } from '@/components/interview/interview-card'
import { ResponsiveModal } from '@/components/shared/responsive-modal'
import type { CitySearch } from '@/lib/city-search'
import type { CardValue } from '@/lib/interview-answers'
import { type MissingInput, missingCard } from '@/lib/plan-failure'
import { m } from '@/paraglide/messages'

interface MissingInputsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isDesktop: boolean
  /** The question being asked now. */
  input: MissingInput
  step: number
  total: number
  /** An answer is being saved. */
  pending: boolean
  problem: string | null
  citySearch: CitySearch
  onAnswer: (input: MissingInput, value: CardValue) => void
}

/**
 * What the plan still needs, one question at a time. The questions are the interview's own cards,
 * so the family builder, the date range and the city search behave as they do in the interview.
 */
export function MissingInputsDialog({
  open,
  onOpenChange,
  isDesktop,
  input,
  step,
  total,
  pending,
  problem,
  citySearch,
  onAnswer,
}: MissingInputsDialogProps) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      isDesktop={isDesktop}
      title={m.plan_missing_title()}
      description={m.plan_missing_body()}
    >
      <div className="flex flex-col gap-3 pb-4">
        {total > 1 && (
          <p className="text-muted-foreground text-sm tabular-nums">
            {m.plan_missing_step({ step, total })}
          </p>
        )}
        <InterviewCard
          // One card per question: its draft answer starts empty.
          key={input.field}
          card={missingCard(input)}
          disabled={pending}
          citySearch={citySearch}
          onAnswer={(_sentence, value) => value && onAnswer(input, value)}
        />
        <div role="status" className="min-h-5 text-muted-foreground text-sm">
          {pending && m.plan_missing_saving()}
        </div>
        {problem && (
          <p role="alert" className="text-destructive text-sm">
            {problem}
          </p>
        )}
      </div>
    </ResponsiveModal>
  )
}

import { Brain, Sparkles } from '@keyline-icons/react'
import { Button } from '@/components/ui/button'
import type { ChatLine } from '@/lib/interview'
import { m } from '@/paraglide/messages'

interface ChatThreadProps {
  lines: ChatLine[]
  hasEarlier: boolean
  loadingEarlier: boolean
  onLoadEarlier: () => void
  /** The assistant is working on an answer and nothing has streamed in yet. */
  waiting: boolean
  /** Text of the assistant's reasoning (folded), shown only when the model sent some. */
  reasoning: string
  /** Name of the tool the assistant is calling, if any. */
  working: boolean
}

/**
 * The conversation. The assistant has no bubbles: its text is plain, the host's words sit in a
 * pill. The list is a live region, so a screen reader reads each new message once.
 */
export function ChatThread({
  lines,
  hasEarlier,
  loadingEarlier,
  onLoadEarlier,
  waiting,
  reasoning,
  working,
}: ChatThreadProps) {
  return (
    <div className="flex flex-col gap-4">
      {hasEarlier && (
        <Button
          variant="ghost"
          className="h-11 self-center"
          disabled={loadingEarlier}
          onClick={onLoadEarlier}
        >
          {loadingEarlier ? m.interview_earlier_loading() : m.interview_earlier()}
        </Button>
      )}
      <ol
        aria-label={m.interview_thread_label()}
        aria-live="polite"
        aria-relevant="additions"
        className="flex flex-col gap-4"
      >
        {lines.map((line) =>
          line.role === 'user' ? (
            <li
              key={line.id}
              className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-secondary px-4 py-2.5 text-secondary-foreground text-sm"
            >
              <span className="sr-only">{m.interview_role_user()}: </span>
              {line.text}
            </li>
          ) : (
            <li key={line.id} className="flex max-w-[92%] gap-2.5 text-sm leading-relaxed">
              <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="whitespace-pre-wrap">
                <span className="sr-only">{m.interview_role_assistant()}: </span>
                {line.text}
              </p>
            </li>
          ),
        )}
      </ol>
      {reasoning && (
        <details className="text-muted-foreground text-sm">
          <summary className="flex min-h-11 cursor-pointer items-center gap-2">
            <Brain aria-hidden="true" className="size-4" />
            {m.interview_reasoning()}
          </summary>
          <p className="whitespace-pre-wrap pb-2 pl-6">{reasoning}</p>
        </details>
      )}
      {(waiting || working) && (
        <p role="status" className="flex items-center gap-2 text-muted-foreground text-sm">
          <Sparkles aria-hidden="true" className="size-4 text-primary motion-safe:animate-pulse" />
          {working ? m.interview_working() : m.interview_thinking()}
        </p>
      )}
    </div>
  )
}

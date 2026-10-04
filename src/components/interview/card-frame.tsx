import { Sparkles } from '@keyline-icons/react'
import { type ReactNode, useId } from 'react'
import { m } from '@/paraglide/messages'

interface CardFrameProps {
  question: string
  children: ReactNode
}

/**
 * The frame every interview card shares: "The assistant asks", the question as a heading, the
 * answer controls below. One group per card so a screen reader reads the question with them.
 */
export function CardFrame({ question, children }: CardFrameProps) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-5"
    >
      <div className="flex flex-col gap-1.5">
        <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <Sparkles aria-hidden="true" className="size-4 text-primary" />
          {m.interview_assistant_asks()}
        </p>
        <h3 id={id} className="font-medium text-lg leading-snug">
          {question}
        </h3>
      </div>
      {children}
    </section>
  )
}

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export interface RouteStep {
  title: string
  body: string
}

/**
 * Steps as stops on a dotted route (the TuttiTrip mark as a layout): a dot for each
 * stop, a ring for the last one, the destination. Vertical on phones; with
 * `spread` the steps run left to right from the md breakpoint up.
 */
export function RouteSteps({ steps, spread = false }: { steps: RouteStep[]; spread?: boolean }) {
  return (
    <ol
      className={cn(
        'relative flex flex-col gap-8',
        spread && 'md:grid md:grid-flow-col md:auto-cols-fr md:gap-10',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-2 bottom-2 left-[8px] border-route border-l-2 border-dotted',
          spread &&
            'md:inset-x-0 md:top-[8px] md:right-[calc(100%/var(--steps)-8px)] md:bottom-auto md:left-[8px] md:border-t-2 md:border-l-0',
        )}
        style={{ '--steps': steps.length } as CSSProperties}
      />
      {steps.map((step, index) => {
        const last = index === steps.length - 1
        return (
          <li key={step.title} className={cn('relative pl-10', spread && 'md:pt-10 md:pl-0')}>
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1 left-0 size-[18px] rounded-full',
                spread && 'md:top-0',
                last ? 'border-[3px] border-primary bg-background' : 'bg-foreground',
              )}
            />
            <h3 className="font-bold text-xl leading-snug tracking-tight">{step.title}</h3>
            <p className="mt-1 max-w-prose text-muted-foreground leading-relaxed">{step.body}</p>
          </li>
        )
      })}
    </ol>
  )
}

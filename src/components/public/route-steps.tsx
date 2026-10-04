import { type CSSProperties, useEffect, useRef } from 'react'
import { trackScrollProgress } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface RouteStep {
  title: string
  body: string
}

/**
 * Steps as stops on a dotted route (the TuttiTrip mark as a layout): a dot for each
 * stop, a ring for the last one, the destination. Vertical on phones; with
 * `spread` the steps run left to right from the md breakpoint up.
 *
 * The route is drawn as the list scrolls through the viewport and each stop fills in when the
 * route reaches it. With prefers-reduced-motion the whole route is there from the start.
 */
export function RouteSteps({ steps, spread = false }: { steps: RouteStep[]; spread?: boolean }) {
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const element = list.current
    if (!element) return
    const items = [...element.querySelectorAll<HTMLElement>('[data-stop]')]
    return trackScrollProgress(element, (progress) => {
      items.forEach((item, index) => {
        const reached = progress >= (items.length === 1 ? 0 : index / (items.length - 1))
        item.dataset.reached = reached ? 'true' : 'false'
      })
    })
  }, [])

  return (
    <ol
      ref={list}
      className={cn(
        'relative flex flex-col gap-8',
        spread && 'md:grid md:grid-flow-col md:auto-cols-fr md:gap-10',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'route-draw-y absolute top-2 bottom-2 left-[8px] border-route border-l-2 border-dotted',
          spread &&
            'md:route-draw-x md:inset-x-0 md:top-[8px] md:right-[calc(100%/var(--steps)-8px)] md:bottom-auto md:left-[8px] md:border-t-2 md:border-l-0',
        )}
        style={{ '--steps': steps.length } as CSSProperties}
      />
      {steps.map((step, index) => {
        const last = index === steps.length - 1
        return (
          <li
            key={step.title}
            data-stop=""
            className={cn('group relative pl-10', spread && 'md:pt-10 md:pl-0')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1 left-0 size-[18px] rounded-full border-[3px] transition-[background-color,border-color] duration-300',
                spread && 'md:top-0',
                last
                  ? 'border-route bg-background group-data-[reached=true]:border-primary'
                  : 'border-route bg-background group-data-[reached=true]:border-foreground group-data-[reached=true]:bg-foreground',
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

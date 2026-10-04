import { X } from '@keyline-icons/react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { resolveSteps, TOUR_SPOTLIGHT_PADDING, type TourTopic } from '@/lib/help'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { useTargetBox } from './use-target-rect'

interface GuidedTourProps {
  topic: TourTopic | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * The visual help: a modal panel that walks through the steps of a topic and rings the element
 * of each step. Esc closes, the arrows move, Tab stays inside the panel (Radix dialog). The panel
 * is a bottom sheet on phones and a card at the edge on desktop, on the side away from the ring.
 */
export function GuidedTour({ topic, open, onOpenChange }: GuidedTourProps) {
  // Mounted only while open: every opening starts at step one and focus returns to the opener.
  if (!open || !topic) return null
  return <TourDialog topic={topic} onClose={() => onOpenChange(false)} />
}

function TourDialog({ topic, onClose }: { topic: TourTopic; onClose: () => void }) {
  // The page can still be loading under the modal (lists, plans): the steps follow what is on it
  // now, and the current step is tracked by id so the list may grow around it.
  const [, rerender] = useState(0)
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => rerender((tick) => tick + 1))
    observer.observe(document.body)
    return () => observer.disconnect()
  }, [])
  const steps = resolveSteps(topic)
  const [stepId, setStepId] = useState<string>()
  const index = Math.max(
    steps.findIndex((candidate) => candidate.id === stepId),
    0,
  )
  const nextRef = useRef<HTMLButtonElement>(null)
  // The Help button that opened the tour; the dialog is mounted without a Radix trigger.
  const [opener] = useState(() => document.activeElement)
  useEffect(
    () => () => {
      if (opener instanceof HTMLElement) opener.focus()
    },
    [opener],
  )
  const step = steps[index]
  const box = useTargetBox(step?.target)
  if (!step) return null
  const total = steps.length
  const last = index === total - 1
  const counter = m.help_step_counter({ n: index + 1, total })
  const go = (to: number) => setStepId(steps[Math.min(Math.max(to, 0), total - 1)]?.id)
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight') go(index + 1)
    if (event.key === 'ArrowLeft') go(index - 1)
  }
  const pad = TOUR_SPOTLIGHT_PADDING

  return (
    <DialogPrimitive.Root open onOpenChange={(value) => !value && onClose()}>
      <DialogPrimitive.Portal>
        {/* With a ring, its outer shadow is the scrim; without one, the overlay is. */}
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 animate-in fade-in-0 motion-reduce:animate-none',
            !box && 'bg-black/50',
          )}
        />
        {box && (
          <div
            aria-hidden="true"
            data-slot="tour-spotlight"
            className="pointer-events-none fixed z-50 animate-in rounded-lg shadow-[0_0_0_100vmax] shadow-black/50 outline-2 outline-ring fade-in-0 motion-reduce:animate-none"
            style={{
              top: box.rect.top - pad,
              left: box.rect.left - pad,
              width: box.rect.width + pad * 2,
              height: box.rect.height + pad * 2,
            }}
          />
        )}
        <DialogPrimitive.Content
          data-slot="tour-panel"
          onKeyDown={onKeyDown}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            nextRef.current?.focus()
          }}
          className={cn(
            'fixed z-50 grid gap-4 bg-background p-4 text-foreground shadow-lg outline-none animate-in fade-in-0 motion-reduce:animate-none',
            'max-md:inset-x-0 max-md:max-h-[45dvh] max-md:overflow-y-auto md:right-6 md:w-96 md:rounded-lg md:border md:p-5',
            box?.low
              ? 'top-0 border-b pt-[max(1rem,env(safe-area-inset-top))] max-md:rounded-b-xl md:top-6 md:pt-5'
              : 'bottom-0 border-t pb-[max(1rem,env(safe-area-inset-bottom))] max-md:rounded-t-xl md:bottom-6 md:pb-5',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <DialogPrimitive.Title className="font-medium text-muted-foreground text-sm leading-6">
              {topic.title()}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={m.help_close()}
                className="-mt-2 -mr-2 size-11 md:size-9"
              >
                <X aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <DialogPrimitive.Description asChild>
            <div
              aria-atomic="true"
              aria-live="polite"
              className="grid min-h-24 content-start gap-1"
            >
              <span className="sr-only">{counter}</span>
              <div
                key={step.id}
                className="grid animate-in gap-1 fade-in-0 motion-reduce:animate-none"
              >
                <h2 className="font-heading font-semibold text-lg leading-7">{step.title()}</h2>
                <p className="text-pretty text-[0.9375rem] leading-relaxed">{step.body()}</p>
              </div>
            </div>
          </DialogPrimitive.Description>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5" aria-hidden="true">
              <ol className="m-0 flex list-none gap-1 p-0">
                {steps.map((item, position) => (
                  <li
                    key={item.id}
                    className={cn(
                      'h-1.5 rounded-full',
                      position === index ? 'w-4 bg-primary' : 'w-1.5 bg-foreground/25',
                    )}
                  />
                ))}
              </ol>
              <span className="text-muted-foreground text-sm tabular-nums">{counter}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="h-11 md:h-9"
                aria-disabled={index === 0 || undefined}
                onClick={() => go(index - 1)}
              >
                {m.help_back()}
              </Button>
              <Button
                ref={nextRef}
                className="h-11 md:h-9"
                onClick={() => (last ? onClose() : go(index + 1))}
              >
                {last ? m.help_done() : m.help_next()}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

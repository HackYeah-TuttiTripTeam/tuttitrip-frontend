import { Check, X } from '@keyline-icons/react'
import { type PointerEvent, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { InterviewCard } from '@/lib/interview'
import { answerSwipe } from '@/lib/interview-answers'
import {
  SWIPE_FLY_MS,
  SWIPE_FLY_OUT_PX,
  SWIPE_THRESHOLD_PX,
  SWIPE_TILT_DEG,
  SWIPE_TILT_UNIT_PX,
} from '@/lib/interview-constants'
import { prefersReducedMotion } from '@/lib/motion'
import { m } from '@/paraglide/messages'
import { CardFrame } from './card-frame'

interface CardSwipeProps {
  card: InterviewCard
  disabled: boolean
  onAnswer: (answer: string) => void
}

/**
 * Cards to swipe: every option is one card ("Museum"), right is yes and left is no. The buttons
 * are the main way in for a keyboard and a screen reader; the drag is a shortcut on a touch screen
 * (`touch-action: pan-y` keeps the page from scrolling sideways). With reduced motion the card
 * does not fly off, it is just replaced by the next one. After the last card one answer goes out.
 */
export function CardSwipe({ card, disabled, onAnswer }: CardSwipeProps) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [dx, setDx] = useState(0)
  const [flying, setFlying] = useState(false)
  const start = useRef<number | null>(null)
  const items = card.options
  const item = items[index]

  const decide = (yes: boolean) => {
    if (item === undefined || disabled || flying) return
    const next = [...answers, answerSwipe(item, yes)]
    const advance = () => {
      setFlying(false)
      setDx(0)
      if (index + 1 >= items.length) onAnswer(next.join('; '))
      else {
        setAnswers(next)
        setIndex(index + 1)
      }
    }
    if (prefersReducedMotion()) {
      advance()
      return
    }
    setFlying(true)
    setDx(yes ? SWIPE_FLY_OUT_PX : -SWIPE_FLY_OUT_PX)
    window.setTimeout(advance, SWIPE_FLY_MS)
  }

  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || flying) return
    start.current = event.clientX
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    if (start.current !== null) setDx(event.clientX - start.current)
  }
  const onUp = () => {
    if (start.current === null) return
    start.current = null
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) decide(dx > 0)
    else setDx(0)
  }

  if (item === undefined) return null
  const tilt = prefersReducedMotion() ? 0 : (dx / SWIPE_TILT_UNIT_PX) * SWIPE_TILT_DEG

  return (
    <CardFrame question={card.question}>
      <p className="text-muted-foreground text-sm">
        {m.interview_swipe_progress({ current: index + 1, total: items.length })}
      </p>
      <div
        data-testid="swipe-card"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ transform: `translateX(${dx}px) rotate(${tilt}deg)` }}
        className="flex min-h-32 touch-pan-y select-none items-center justify-center rounded-lg border bg-secondary px-4 py-8 text-center font-medium text-lg motion-safe:transition-transform motion-safe:duration-150"
      >
        {item}
      </div>
      <p className="text-muted-foreground text-xs">{m.interview_swipe_hint()}</p>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-12 rounded-full"
          disabled={disabled}
          onClick={() => decide(false)}
        >
          <X aria-hidden="true" />
          {m.interview_swipe_no()}
        </Button>
        <Button className="h-12 rounded-full" disabled={disabled} onClick={() => decide(true)}>
          <Check aria-hidden="true" />
          {m.interview_swipe_yes()}
        </Button>
      </div>
    </CardFrame>
  )
}

import { Minus, Plus } from '@keyline-icons/react'
import { cn } from 'cn'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { POOL_TOTAL } from '@/lib/importance'
import type { InterviewCard } from '@/lib/interview'
import { answerPool, poolItems, poolLeft } from '@/lib/interview-answers'
import { m } from '@/paraglide/messages'
import { CardFrame } from './card-frame'

interface CardDotPoolProps {
  card: InterviewCard
  disabled: boolean
  onAnswer: (answer: string) => void
}

/** A filled dot is a solid disc, an empty one a ring: the count never depends on colour alone. */
function Dots({ points }: { points: number }) {
  return (
    <span aria-hidden="true" className="flex flex-wrap gap-1">
      {Array.from({ length: POOL_TOTAL }, (_, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: the dots are positions, not data
          key={index}
          className={cn(
            'size-3.5 shrink-0 rounded-full border-2',
            index < points ? 'border-primary bg-primary' : 'border-input bg-transparent',
          )}
        />
      ))}
    </span>
  )
}

/**
 * Ten dots spread over the domains (or the assistant's options). Adding is blocked when none is
 * left, so the sum can never pass ten; the answer goes out once every dot is placed.
 */
export function CardDotPool({ card, disabled, onAnswer }: CardDotPoolProps) {
  const items = poolItems(card.options)
  const [points, setPoints] = useState<number[]>(() => items.map(() => 0))
  const left = poolLeft(points)

  const move = (index: number, step: number) =>
    setPoints((previous) =>
      previous.map((value, at) =>
        at === index
          ? Math.min(POOL_TOTAL, Math.max(0, value + Math.min(step, poolLeft(previous))))
          : value,
      ),
    )

  return (
    <CardFrame question={card.question}>
      <p role="status" className="text-muted-foreground text-sm tabular-nums">
        {m.interview_pool_remaining({ count: left, total: POOL_TOTAL })}
      </p>
      <ul className="flex flex-col divide-y border-y">
        {items.map((item, index) => {
          const value = points[index] ?? 0
          return (
            <li key={item.id} className="flex min-h-14 items-center gap-3 py-1">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-medium text-sm">{item.label}</span>
                <Dots points={value} />
                <span className="sr-only">
                  {m.interview_pool_domain({
                    domain: item.label,
                    points: value,
                    total: POOL_TOTAL,
                  })}
                </span>
              </div>
              <Button
                variant="outline"
                className="size-11"
                disabled={disabled || value === 0}
                aria-label={m.interview_pool_less({ domain: item.label })}
                onClick={() => move(index, -1)}
              >
                <Minus aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                className="size-11"
                disabled={disabled || left === 0}
                aria-label={m.interview_pool_more({ domain: item.label })}
                onClick={() => move(index, 1)}
              >
                <Plus aria-hidden="true" />
              </Button>
            </li>
          )
        })}
      </ul>
      <Button
        className="h-11 self-start rounded-full px-6"
        disabled={disabled || left > 0}
        onClick={() => onAnswer(answerPool(items, points))}
      >
        {m.interview_card_submit()}
      </Button>
    </CardFrame>
  )
}

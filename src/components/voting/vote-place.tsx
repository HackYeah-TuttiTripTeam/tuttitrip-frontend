import { Ban, Check, Minus, ThumbsDown, ThumbsUp } from '@keyline-icons/react'
import { useState } from 'react'
import type { RatingValue, ReasonCode, VotePlace } from '@/api/queries/vote'
import { Button } from '@/components/ui/button'
import { REASON_CODES, REASON_LABELS } from '@/lib/vote-reasons'
import { m } from '@/paraglide/messages'

interface VotePlaceItemProps {
  place: VotePlace
  /** A write for this place is on its way: its buttons wait. */
  busy: boolean
  onRate: (value: RatingValue, reason?: ReasonCode) => void
  onVeto: () => void
  onWithdrawVeto: () => void
}

const ANSWERS = [
  { value: 'want', icon: ThumbsUp, label: m.vote_want },
  { value: 'neutral', icon: Minus, label: m.vote_dont_mind },
  { value: 'dont_want', icon: ThumbsDown, label: m.vote_dont_want },
] as const

const answerClass = 'h-12 flex-col gap-0.5 px-1 text-sm sm:flex-row sm:gap-2'

/**
 * One place of the plan for a person without an account: three big answers, a one-tap reason
 * after "I don't want it", and a veto that asks once. Nothing here is a colour alone: the choice
 * is a pressed button with a check mark and the text under it says what was saved.
 */
export function VotePlaceItem({ place, busy, onRate, onVeto, onWithdrawVeto }: VotePlaceItemProps) {
  const [step, setStep] = useState<'answer' | 'reason' | 'veto'>('answer')
  const vetoed = place.veto_id !== null
  // "I don't want it" needs a reason before it can be saved, so it is only asked for here.
  const askingReason = step === 'reason' || (place.rating === 'dont_want' && !place.reason_code)
  const headingId = `place-${place.place_id}`

  return (
    <li className="flex flex-col gap-3 py-5">
      {place.photo_url && (
        <img
          src={place.photo_url}
          alt=""
          loading="lazy"
          className="aspect-video w-full rounded-lg object-cover"
        />
      )}
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-medium text-lg leading-snug">
          {place.name}
        </h2>
        {place.description && (
          <p className="text-muted-foreground text-sm leading-relaxed">{place.description}</p>
        )}
      </div>

      {vetoed ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-destructive p-4">
          <p className="flex items-center gap-2 font-medium">
            <Ban aria-hidden="true" className="size-5 text-destructive" />
            {m.vote_veto_active()}
          </p>
          <p className="text-muted-foreground text-sm">{m.vote_veto_active_body()}</p>
          <Button
            variant="outline"
            className="h-11"
            disabled={busy}
            onClick={onWithdrawVeto}
            aria-label={m.vote_veto_withdraw_label({ name: place.name })}
          >
            {m.vote_veto_withdraw()}
          </Button>
        </div>
      ) : (
        <>
          <fieldset className="grid grid-cols-3 gap-2">
            <legend className="sr-only">{m.vote_answer_label({ name: place.name })}</legend>
            {ANSWERS.map(({ value, icon: Icon, label }) => {
              const pressed = place.rating === value
              return (
                <Button
                  key={value}
                  type="button"
                  variant={pressed ? 'default' : 'outline'}
                  aria-pressed={pressed}
                  disabled={busy}
                  className={answerClass}
                  onClick={() => {
                    if (value === 'dont_want') setStep('reason')
                    else {
                      setStep('answer')
                      onRate(value)
                    }
                  }}
                >
                  {pressed ? <Check aria-hidden="true" /> : <Icon aria-hidden="true" />}
                  {label()}
                </Button>
              )
            })}
          </fieldset>

          {askingReason && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 font-medium text-sm">{m.vote_reason_title()}</legend>
              <div className="flex flex-wrap gap-2">
                {REASON_CODES.map((code) => (
                  <Button
                    key={code}
                    type="button"
                    variant={place.reason_code === code ? 'default' : 'outline'}
                    aria-pressed={place.reason_code === code}
                    disabled={busy}
                    className="h-11"
                    onClick={() => {
                      setStep('answer')
                      onRate('dont_want', code)
                    }}
                  >
                    {REASON_LABELS[code]()}
                  </Button>
                ))}
              </div>
            </fieldset>
          )}

          {step === 'veto' ? (
            <fieldset className="flex flex-col gap-3 rounded-lg border border-destructive p-4">
              <legend className="px-1 font-medium">
                {m.vote_veto_confirm_title({ name: place.name })}
              </legend>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {m.vote_veto_confirm_body()}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button
                  variant="destructive"
                  className="h-12 flex-1"
                  disabled={busy}
                  onClick={() => {
                    setStep('answer')
                    onVeto()
                  }}
                >
                  {m.vote_veto_confirm()}
                </Button>
                <Button variant="outline" className="h-12 flex-1" onClick={() => setStep('answer')}>
                  {m.vote_veto_cancel()}
                </Button>
              </div>
            </fieldset>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-11 w-fit px-2 text-destructive"
              disabled={busy}
              onClick={() => setStep('veto')}
            >
              <Ban aria-hidden="true" />
              {m.vote_veto()}
            </Button>
          )}

          {place.rating && !askingReason && (
            <p className="text-muted-foreground text-sm">
              {place.rating === 'dont_want' && place.reason_code
                ? m.vote_saved_reason({
                    answer: m.vote_dont_want(),
                    reason: REASON_LABELS[place.reason_code]().toLowerCase(),
                  })
                : m.vote_saved({
                    answer: place.rating === 'want' ? m.vote_want() : m.vote_dont_mind(),
                  })}
            </p>
          )}
        </>
      )}
    </li>
  )
}

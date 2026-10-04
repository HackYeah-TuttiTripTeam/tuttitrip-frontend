import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { $api } from '@/api/client'
import { type InterviewCard, parseCard } from '@/lib/interview'
import { VOICE_CARD_POLL_MS } from '@/lib/interview-constants'

const keyOf = (card: InterviewCard) => `${card.kind}:${card.field ?? ''}:${card.question}`

interface UseVoiceCardOptions {
  tripId: string
  /** The live call, or null when there is none (nothing is asked then). */
  callId: string | null
  /** How many times the host started to speak during the call (`VoiceView.speechStarts`). */
  speechStarts: number
  /** Sends the tapped answer into the call; false when it could not be sent. */
  send: (text: string) => boolean
}

/**
 * The card the assistant put on screen during a call. A call has no state stream, so the server
 * holds the card (with the kind and options it fixed) and the screen polls for it. A card goes
 * away once it is answered: by a tap, or by the host starting to speak after it appeared.
 */
export function useVoiceCard({ tripId, callId, speechStarts, send }: UseVoiceCardOptions) {
  const query = useQuery({
    ...$api.queryOptions('get', '/api/v1/trips/{trip_id}/interview/voice/{call_id}/card', {
      params: { path: { trip_id: tripId, call_id: callId ?? '' } },
    }),
    enabled: callId !== null,
    refetchInterval: VOICE_CARD_POLL_MS,
    retry: false,
  })
  const polled = callId === null ? null : parseCard(query.data?.card)
  const key = polled ? keyOf(polled) : null

  // How often the host had started to speak when this card appeared: speaking again answers it.
  const [seen, setSeen] = useState<{ key: string; speechStarts: number } | null>(null)
  const [answered, setAnswered] = useState<string | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new card moves the baseline
  useEffect(() => {
    if (key !== null) setSeen({ key, speechStarts })
  }, [key])

  const spokenAfter = seen !== null && seen.key === key && speechStarts > seen.speechStarts
  const card = polled && key !== answered && !spokenAfter ? polled : null

  return {
    card,
    answer: (text: string) => {
      if (key !== null && send(text)) setAnswered(key)
    },
  }
}

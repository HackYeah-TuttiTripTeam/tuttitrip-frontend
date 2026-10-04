import { Mic, Square } from '@keyline-icons/react'
import { cn } from 'cn'
import { Button } from '@/components/ui/button'
import type { VoiceStatus } from '@/hooks/use-voice-call'
import { m } from '@/paraglide/messages'

interface VoiceButtonProps {
  status: VoiceStatus
  /** The assistant's voice is playing. */
  speaking: boolean
  /** A text turn is running: a call cannot start next to it. */
  disabled: boolean
  onStart: () => void
  onStop: () => void
}

/**
 * The big microphone button. One tap starts the call (the microphone prompt needs that gesture),
 * the same place ends it. The state is spoken in a live region, not only shown by colour.
 */
export function VoiceButton({ status, speaking, disabled, onStart, onStop }: VoiceButtonProps) {
  const active = status === 'connecting' || status === 'live'
  const label = !active
    ? m.interview_voice_start()
    : status === 'connecting'
      ? m.interview_voice_connecting()
      : speaking
        ? m.interview_voice_speaking()
        : m.interview_voice_listening()
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        size="icon"
        variant={active ? 'destructive' : 'default'}
        className={cn(
          'size-14 shrink-0 rounded-full',
          status === 'live' && !speaking && 'motion-safe:animate-pulse',
        )}
        disabled={!active && disabled}
        aria-pressed={active}
        aria-label={active ? m.interview_voice_stop() : m.interview_voice_start()}
        onClick={active ? onStop : onStart}
      >
        {active ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
      </Button>
      <p role="status" className="text-sm">
        {active ? label : m.interview_voice_start()}
      </p>
    </div>
  )
}

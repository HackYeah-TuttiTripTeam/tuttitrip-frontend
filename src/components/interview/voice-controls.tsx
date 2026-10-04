import { LoaderCircle, Mic, MicOff, Square } from '@keyline-icons/react'
import { cn } from 'cn'
import type { KeyboardEvent, PointerEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { VoiceMode, VoiceStatus } from '@/hooks/use-voice-call'
import { PTT_PRESS_KEYS } from '@/lib/interview-constants'
import type { VoiceActivity } from '@/lib/voice-events'
import { activityText, toolLabel } from '@/lib/voice-labels'
import { m } from '@/paraglide/messages'

interface VoiceControlsProps {
  status: VoiceStatus
  activity: VoiceActivity
  /** The tool the assistant runs now (names what is being saved). */
  toolName: string | null
  /** A tool that has just finished: "Saved: budget" for a moment. */
  saved: { name: string; ok: boolean } | null
  mode: VoiceMode
  held: boolean
  micMuted: boolean
  canOverride: boolean
  /** A text turn runs: a call cannot start next to it. */
  disabled: boolean
  onStart: () => void
  onStop: () => void
  onModeChange: (mode: VoiceMode) => void
  onPressStart: () => void
  onPressEnd: () => void
  onSpeakAnyway: () => void
}

/**
 * The call's controls and its state. One line says what is going on (listening, thinking, saving a
 * field, building the plan, speaking) in a live region; the square ends the call and frees the
 * microphone. In the open mode the microphone is muted while the assistant works, with a button to
 * speak anyway; in the hold-to-talk mode it is live only while the big button is held (pointer,
 * touch or Space) and letting go sends the words but never ends the call.
 */
export function VoiceControls({
  status,
  activity,
  toolName,
  saved,
  mode,
  held,
  micMuted,
  canOverride,
  disabled,
  onStart,
  onStop,
  onModeChange,
  onPressStart,
  onPressEnd,
  onSpeakAnyway,
}: VoiceControlsProps) {
  const active = status === 'connecting' || status === 'live'
  const finishing = status === 'finishing'
  const line = finishing
    ? m.voice_activity_finishing()
    : status === 'connecting'
      ? m.voice_activity_connecting()
      : activityText(activity, toolName)

  const down = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    onPressStart()
  }
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (PTT_PRESS_KEYS.includes(event.key)) {
      event.preventDefault()
      if (!event.repeat) onPressStart()
    }
  }
  const keyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (PTT_PRESS_KEYS.includes(event.key)) {
      event.preventDefault()
      onPressEnd()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="icon"
          variant={active ? 'destructive' : 'default'}
          className={cn(
            'size-14 shrink-0 rounded-full',
            status === 'live' &&
              activity === 'listening' &&
              !micMuted &&
              'motion-safe:animate-pulse',
          )}
          disabled={finishing || (!active && disabled)}
          aria-pressed={active}
          aria-label={active ? m.interview_voice_stop() : m.interview_voice_start()}
          onClick={active ? onStop : onStart}
        >
          {active ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
        </Button>
        <div className="flex min-w-0 flex-col gap-0.5">
          {active || finishing ? (
            <p role="status" className="flex items-center gap-2 text-sm">
              {finishing && (
                <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
              )}
              {line}
            </p>
          ) : (
            <p className="text-sm">{m.interview_voice_start()}</p>
          )}
          {saved && (
            <p
              role="status"
              className={cn('text-xs', saved.ok ? 'text-muted-foreground' : 'text-destructive')}
            >
              {(saved.ok ? m.voice_saved : m.voice_not_saved)({ what: toolLabel(saved.name) })}
            </p>
          )}
        </div>
      </div>

      {status === 'live' && (
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-muted-foreground text-xs">
            {micMuted ? (
              <MicOff aria-hidden="true" className="size-4" />
            ) : (
              <Mic aria-hidden="true" className="size-4 text-primary" />
            )}
            {micMuted
              ? mode === 'ptt'
                ? m.voice_mic_muted_ptt()
                : m.voice_mic_muted()
              : m.voice_mic_open()}
          </p>
          {canOverride && (
            <Button
              type="button"
              variant="outline"
              className="h-11 self-start"
              onClick={onSpeakAnyway}
            >
              {m.voice_mic_override()}
            </Button>
          )}
          {mode === 'ptt' && (
            <Button
              type="button"
              variant={held ? 'default' : 'secondary'}
              aria-pressed={held}
              className="h-16 w-full touch-none select-none text-base"
              onPointerDown={down}
              onPointerUp={onPressEnd}
              onPointerCancel={onPressEnd}
              onKeyDown={keyDown}
              onKeyUp={keyUp}
              onBlur={onPressEnd}
              onContextMenu={(event) => event.preventDefault()}
            >
              {held ? m.voice_ptt_held() : m.voice_ptt_button()}
            </Button>
          )}
        </div>
      )}

      <div className="flex items-start gap-3">
        <Switch
          id="voice-ptt"
          checked={mode === 'ptt'}
          disabled={status === 'connecting' || finishing}
          onCheckedChange={(on) => onModeChange(on ? 'ptt' : 'open')}
        />
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="voice-ptt" className="min-h-6 text-sm">
            {m.voice_ptt_toggle()}
          </Label>
          <p className="text-muted-foreground text-xs">{m.voice_ptt_toggle_hint()}</p>
        </div>
      </div>
    </div>
  )
}

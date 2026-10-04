import type { Caption } from '@/lib/voice-events'
import { m } from '@/paraglide/messages'

interface LiveCaptionsProps {
  captions: Caption[]
  /** Show the notice that the voice is made by AI (during and right after a call). */
  showNotice: boolean
}

/** Captions of both sides of a call, in the order the turns were spoken. */
export function LiveCaptions({ captions, showNotice }: LiveCaptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      {showNotice && (
        <p className="text-muted-foreground text-xs">{m.interview_voice_ai_notice()}</p>
      )}
      <ol
        aria-label={m.interview_voice_captions()}
        aria-live="polite"
        aria-relevant="additions"
        className="flex flex-col gap-2"
      >
        {captions.map((caption) => (
          <li
            key={caption.id}
            className={
              caption.role === 'user'
                ? 'ml-auto max-w-[85%] rounded-2xl bg-secondary px-4 py-2 text-secondary-foreground text-sm'
                : 'max-w-[92%] text-sm leading-relaxed'
            }
          >
            <span className="sr-only">
              {caption.role === 'user' ? m.interview_role_user() : m.interview_role_assistant()}:{' '}
            </span>
            <span className={caption.final ? undefined : 'text-muted-foreground'}>
              {caption.text}
            </span>
          </li>
        ))}
      </ol>
      {captions.length === 0 && (
        <p className="text-muted-foreground text-sm">{m.interview_voice_captions_wait()}</p>
      )}
    </div>
  )
}

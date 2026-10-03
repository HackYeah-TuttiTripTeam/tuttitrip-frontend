import type { ChatLine } from '@/api/interview-agent'

/** Messages of the interview, assistant text streams in line by line. */
export function ChatThread({ lines }: { lines: ChatLine[] }) {
  return (
    <ol className="flex flex-col gap-3" aria-live="polite">
      {lines.map((line) => (
        <li
          key={line.id}
          className={
            line.role === 'user'
              ? 'ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-primary-foreground text-sm'
              : 'max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm'
          }
        >
          {line.text}
        </li>
      ))}
    </ol>
  )
}

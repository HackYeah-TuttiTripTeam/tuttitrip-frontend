import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface ProofRow {
  title: string
  body: string
}

/**
 * A list of claims, each with its proof. A dot on the dotted route in the margin follows the row
 * under the pointer or the one last tapped; it is only a marker, so keyboard and screen reader
 * users lose nothing. From the md breakpoint up.
 */
export function ProofList({ rows }: { rows: ProofRow[] }) {
  const [active, setActive] = useState(0)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const top = rowRefs.current[active]?.offsetTop ?? 0

  return (
    <dl className="relative mt-8 border-b md:pl-10">
      <span
        aria-hidden="true"
        className="route-y absolute top-0 bottom-0 left-[9px] hidden w-1 md:block"
      />
      <span
        aria-hidden="true"
        className="absolute top-0 left-0 hidden size-[18px] rounded-full bg-primary transition-transform duration-300 ease-out motion-reduce:transition-none md:block"
        style={{ transform: `translateY(${top + 26}px)` }}
      />
      {rows.map((row, index) => (
        <div
          key={row.title}
          ref={(element) => {
            rowRefs.current[index] = element
          }}
          onPointerEnter={(event) => event.pointerType === 'mouse' && setActive(index)}
          onPointerDown={() => setActive(index)}
          className="grid gap-1 border-t py-5 md:grid-cols-[1fr_2fr] md:gap-8"
        >
          <dt
            className={cn(
              'font-bold text-xl tracking-tight transition-colors',
              active === index && 'md:text-primary',
            )}
          >
            {row.title}
          </dt>
          <dd className="max-w-prose text-muted-foreground leading-relaxed">{row.body}</dd>
        </div>
      ))}
    </dl>
  )
}

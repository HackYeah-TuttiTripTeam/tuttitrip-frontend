import { CircleQuestion } from '@keyline-icons/react'
import type { PasteUnrecognized } from '@/api/queries/linter'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface UnrecognizedItemsProps {
  items: PasteUnrecognized[]
  /** Index of the item whose choice is being saved now. */
  busyIndex: number | null
  /** Only the host may match an item; the others see the list. */
  canChoose: boolean
  onChoose: (index: number, placeId: string) => void
}

/** Pasted stops the matcher could not place: the host picks the right candidate, the report is recounted. */
export function UnrecognizedItems({
  items,
  busyIndex,
  canChoose,
  onChoose,
}: UnrecognizedItemsProps) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby="lint-unrecognized" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="lint-unrecognized" className="flex items-center gap-2 font-medium text-base">
          <CircleQuestion aria-hidden="true" className="size-5" />
          {m.lint_unrecognized_title({ count: items.length })}
        </h2>
        <p className="text-muted-foreground text-sm">
          {canChoose ? m.lint_unrecognized_body() : m.lint_unrecognized_body_member()}
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item) => (
          <li key={item.index} className="flex flex-col gap-2 rounded-md border p-3">
            <p className="font-medium text-sm">
              {item.name}
              {item.day && (
                <span className="ml-2 font-normal text-muted-foreground">{item.day}</span>
              )}
            </p>
            {item.candidates.length === 0 ? (
              <p className="text-muted-foreground text-sm">{m.lint_unrecognized_none()}</p>
            ) : (
              <ul className="flex flex-col">
                {item.candidates.map((candidate) => (
                  <li
                    key={candidate.place_id}
                    className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 border-t py-1 text-sm"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{candidate.name}</span>
                      {candidate.address && (
                        <span className="block truncate text-muted-foreground text-xs">
                          {candidate.address}
                        </span>
                      )}
                    </span>
                    {canChoose && (
                      <Button
                        variant="outline"
                        disabled={busyIndex === item.index}
                        aria-label={m.lint_unrecognized_pick_label({
                          item: item.name,
                          place: candidate.name,
                        })}
                        onClick={() => onChoose(item.index, candidate.place_id)}
                        className="h-11 md:h-9"
                      >
                        {m.lint_unrecognized_pick()}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

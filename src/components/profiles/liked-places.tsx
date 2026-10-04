import { ThumbsDown, ThumbsUp, X } from '@keyline-icons/react'
import { cn } from 'cn'
import { useState } from 'react'
import type { ExamplePlace, ExampleVerdict } from '@/api/queries/preferences'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SaveResult } from '@/lib/people'
import { MAX_EXAMPLE_NAME_LENGTH } from '@/lib/preferences'
import { m } from '@/paraglide/messages'

/** What the search needs of a catalog place. */
export interface CatalogOption {
  id: string
  name: string
}

const MAX_SUGGESTIONS = 5

const sameName = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase()

interface LikedPlacesProps {
  examples: ExamplePlace[]
  /** Catalog places of the trip's city; empty when there is no city or no access. */
  catalog: CatalogOption[]
  readOnly?: boolean
  /** Saves at once; the parent shows `examples` again, without the new one when it failed. */
  onAdd: (example: {
    name: string
    placeId: string | null
    verdict: ExampleVerdict
  }) => Promise<SaveResult>
  onRemove: (place: ExamplePlace) => Promise<SaveResult>
}

const VERDICTS = [
  {
    verdict: 'like',
    title: m.prefs_places_liked,
    Icon: ThumbsUp,
    tone: 'border-primary bg-want-soft text-want-ink',
  },
  {
    verdict: 'dislike',
    title: m.prefs_places_disliked,
    Icon: ThumbsDown,
    tone: 'border-decline bg-decline-soft text-decline-ink',
  },
] as const

/**
 * Liked and disliked example places. A name picked from the catalog (or typed exactly like one)
 * is rated as that place; any other name is kept as typed.
 */
export function LikedPlaces({
  examples,
  catalog,
  readOnly = false,
  onAdd,
  onRemove,
}: LikedPlacesProps) {
  const [text, setText] = useState('')
  const [picked, setPicked] = useState<CatalogOption | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = text.trim()
  const suggestions =
    readOnly || !query || picked
      ? []
      : catalog
          .filter((place) => place.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
          .slice(0, MAX_SUGGESTIONS)

  // A tap clears the old message; only a failure sets one, so a later success never hides it.
  const run = async (action: () => Promise<SaveResult>) => {
    setError(null)
    const result = await action()
    if (!result.ok) setError(result.message)
    return result.ok
  }

  const add = (verdict: ExampleVerdict) => {
    const place = picked ?? catalog.find((option) => sameName(option.name, query))
    // The typed name stays until the save worked, so a failure can be retried without retyping.
    void run(() => onAdd({ name: place?.name ?? query, placeId: place?.id ?? null, verdict })).then(
      (saved) => {
        if (!saved) return
        setText('')
        setPicked(null)
      },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {!readOnly && (
        <div className="flex flex-col gap-2">
          <label htmlFor="example-place" className="font-medium text-sm">
            {m.prefs_places_name_label()}
          </label>
          <Input
            id="example-place"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setPicked(null)
            }}
            maxLength={MAX_EXAMPLE_NAME_LENGTH}
            autoComplete="off"
            placeholder={m.prefs_places_name_placeholder()}
            className="h-11 md:h-9"
          />
          {suggestions.length > 0 && (
            <ul aria-label={m.prefs_places_suggestions()} className="flex flex-wrap gap-2">
              {suggestions.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setText(place.name)
                      setPicked(place)
                    }}
                    className="inline-flex h-11 items-center rounded-full border border-input px-4 text-sm outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-9"
                  >
                    {place.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!query}
              onClick={() => add('like')}
              className="h-11 md:h-9"
            >
              <ThumbsUp aria-hidden="true" />
              {m.prefs_places_add_like()}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!query}
              onClick={() => add('dislike')}
              className="h-11 md:h-9"
            >
              <ThumbsDown aria-hidden="true" />
              {m.prefs_places_add_dislike()}
            </Button>
          </div>
        </div>
      )}

      {VERDICTS.map(({ verdict, title, Icon, tone }) => {
        const places = examples.filter((place) => place.verdict === verdict)
        const headingId = `places-${verdict}`
        return (
          <div key={verdict} className="flex flex-col gap-2">
            <p id={headingId} className="font-medium text-sm">
              {title()}
            </p>
            {places.length === 0 ? (
              <p className="text-muted-foreground text-sm">{m.prefs_places_none()}</p>
            ) : (
              <ul aria-labelledby={headingId} className="flex flex-wrap gap-2">
                {places.map((place) => (
                  <li
                    key={place.place_id ?? `text:${place.name}`}
                    className={cn(
                      'inline-flex h-9 items-center gap-1.5 rounded-full border ps-3 text-sm',
                      readOnly && 'pe-3',
                      !readOnly && 'pe-1',
                      tone,
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {place.name}
                    {!readOnly && (
                      <button
                        type="button"
                        aria-label={m.prefs_places_remove({ name: place.name })}
                        onClick={() => void run(() => onRemove(place))}
                        className="flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <X aria-hidden="true" className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  )
}

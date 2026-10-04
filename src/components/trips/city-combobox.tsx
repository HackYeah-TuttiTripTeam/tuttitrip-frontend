import { Check, ChevronDown, TriangleAlert, X } from '@keyline-icons/react'
import { cn } from 'cn'
import { useEffect, useId, useState } from 'react'
import type { CitySuggestion } from '@/api/queries/cities'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { type CitySearch, countryName } from '@/lib/city-search'
import { getLocale } from '@/lib/i18n'
import { m } from '@/paraglide/messages'

const TYPED = '__typed__'
const CLEAR = '__clear__'

interface CityComboboxProps {
  /** Id of the trigger, for the field's label. */
  id: string
  /** The visible label of the field; the trigger's name is "label: value". */
  label: string
  /** What is chosen now, as text; empty when nothing is. */
  value: string
  search: CitySearch
  onSelect: (city: CitySuggestion) => void
  /** Offered as "use what I typed" when the list has no match; omit it for a city-only filter. */
  onUseTyped?: (text: string) => void
  onClear: () => void
  /** Text of the item that clears the choice. */
  clearLabel: string
  placeholder: string
  invalid?: boolean
  disabled?: boolean
  className?: string
}

/**
 * A combobox with live suggestions: type, pick from the list. Catalog cities come first and say
 * when their places are ready; cities from the map data follow. Arrow keys, Enter and Escape work,
 * the list is a listbox and a status line says what the list holds.
 */
export function CityCombobox({
  id,
  label,
  value,
  search,
  onSelect,
  onUseTyped,
  onClear,
  clearLabel,
  placeholder,
  invalid,
  disabled,
  className,
}: CityComboboxProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState('')
  const statusId = useId()
  const locale = getLocale()
  const typed = search.query.trim()
  const hasResults = search.suggestions.length > 0

  // New answers put the highlight on the best match, so Enter takes it and not the item that
  // happened to be highlighted while the list was still empty.
  const firstSlug = search.suggestions[0]?.slug
  useEffect(() => setHighlighted(firstSlug ?? ''), [firstSlug])

  const change = (next: boolean) => {
    setOpen(next)
    if (!next) search.onQueryChange('')
  }
  const pick = (action: () => void) => {
    action()
    change(false)
  }

  let status: string
  if (!search.searchable) status = m.city_search_min()
  else if (search.isError) status = m.city_search_error()
  else if (search.isSearching && !hasResults) status = m.city_search_loading()
  else if (!hasResults) status = m.city_search_empty({ query: typed })
  else status = m.city_search_count({ count: search.suggestions.length })

  return (
    <Popover open={open} onOpenChange={change}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={value ? `${label}: ${value}` : label}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(
            'h-11 w-full justify-between px-3 font-normal md:h-9',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        onOpenAutoFocus={(event) => event.stopPropagation()}
      >
        <Command
          shouldFilter={false}
          value={highlighted}
          onValueChange={setHighlighted}
          label={m.city_search_input_label()}
        >
          <CommandInput
            value={search.query}
            onValueChange={search.onQueryChange}
            placeholder={m.city_search_input_placeholder()}
            aria-describedby={statusId}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <p
            id={statusId}
            role="status"
            aria-live="polite"
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-muted-foreground text-xs',
              hasResults && !search.isError && 'sr-only',
            )}
          >
            {search.isError && <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />}
            {status}
          </p>
          {search.isError && (
            <div className="px-2 pb-2">
              <Button type="button" variant="outline" size="sm" onClick={search.retry}>
                {m.action_retry()}
              </Button>
            </div>
          )}
          <CommandList>
            {hasResults && (
              <CommandGroup>
                {search.suggestions.map((city) => (
                  <CommandItem
                    key={city.slug}
                    value={city.slug}
                    onSelect={() => pick(() => onSelect(city))}
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{city.name}</span>
                      <span className="truncate text-muted-foreground text-xs">
                        {[city.region, countryName(city.country, locale)]
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'flex shrink-0 items-center gap-1 text-xs',
                        city.catalog_ready ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {city.catalog_ready && <Check aria-hidden="true" />}
                      {city.catalog_ready ? m.city_search_ready() : m.city_search_osm()}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {search.searchable && !search.geocoderAvailable && (
              <p className="px-3 py-2 text-muted-foreground text-xs">
                {m.city_search_geocoder_down()}
              </p>
            )}
            {(onUseTyped && search.searchable) || value ? (
              <CommandGroup>
                {onUseTyped && search.searchable && (
                  <CommandItem value={TYPED} onSelect={() => pick(() => onUseTyped(typed))}>
                    {m.city_search_use_typed({ query: typed })}
                  </CommandItem>
                )}
                {value && (
                  <CommandItem value={CLEAR} onSelect={() => pick(onClear)}>
                    <X aria-hidden="true" />
                    {clearLabel}
                  </CommandItem>
                )}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

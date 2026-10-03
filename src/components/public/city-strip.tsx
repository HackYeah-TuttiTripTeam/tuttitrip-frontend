import { useState } from 'react'
import type { PhotoId } from '@/lib/photos'
import { cn } from '@/lib/utils'
import { PhotoCredit } from './photo-credit'
import { Picture } from './picture'

export interface City {
  id: PhotoId
  name: string
  alt: string
}

/**
 * The demo cities as flat sheets with a photo each. On a phone they are a row you swipe
 * (native scroll snapping, nothing to block the page scroll). From the md breakpoint they sit
 * side by side and the one under the pointer or focus, or the last one tapped, widens.
 */
export function CityStrip({ cities }: { cities: City[] }) {
  const [active, setActive] = useState(0)
  return (
    <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:h-[26rem] md:snap-none md:overflow-visible md:px-0 md:pb-0">
      {cities.map((city, index) => (
        <li
          key={city.id}
          data-active={active === index}
          onPointerEnter={(event) => event.pointerType === 'mouse' && setActive(index)}
          onFocus={() => setActive(index)}
          onPointerDown={() => setActive(index)}
          className={cn(
            'flex w-[78%] shrink-0 snap-center flex-col overflow-hidden rounded-lg border bg-card',
            'md:w-auto md:min-w-0 md:shrink md:grow md:basis-0 md:snap-align-none md:transition-[flex-grow] md:duration-300 md:ease-out motion-reduce:md:transition-none',
            'md:data-[active=true]:grow-[2.6]',
          )}
        >
          <div className="min-h-0 flex-1 overflow-hidden">
            <Picture
              id={city.id}
              alt={city.alt}
              sizes="(min-width: 768px) 40vw, 78vw"
              className="aspect-[3/2] object-cover md:h-full md:aspect-auto"
            />
          </div>
          <div className="flex flex-col gap-1 border-t p-4">
            <p className="font-bold font-heading text-xl tracking-tight">{city.name}</p>
            <PhotoCredit id={city.id} />
          </div>
        </li>
      ))}
    </ul>
  )
}

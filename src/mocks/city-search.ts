import type { Schemas } from '@/api/client'
import type { City } from './fixtures'

type Suggestion = Schemas['CitySuggestion']

/** How `GET /places/cities/search` behaves: normally, without its map part, or failing. */
export type CitySearchMode = 'ok' | 'geocoder-down' | 'error'

/** Cities the mocked geocoder knows (a stand-in for Photon). */
const GEOCODER = [
  {
    name: 'Lisboa',
    country: 'PT',
    countryName: 'Portugal',
    region: 'Lisboa',
    lat: 38.72,
    lon: -9.14,
  },
  {
    name: 'Lille',
    country: 'FR',
    countryName: 'France',
    region: 'Hauts-de-France',
    lat: 50.63,
    lon: 3.06,
  },
  {
    name: 'Linz',
    country: 'AT',
    countryName: 'Österreich',
    region: 'Oberösterreich',
    lat: 48.31,
    lon: 14.29,
  },
  {
    name: 'Lyon',
    country: 'FR',
    countryName: 'France',
    region: 'Auvergne-Rhône-Alpes',
    lat: 45.76,
    lon: 4.84,
  },
  {
    name: 'Gdynia',
    country: 'PL',
    countryName: 'Polska',
    region: 'województwo pomorskie',
    lat: 54.52,
    lon: 18.53,
  },
  { name: 'Praha', country: 'CZ', countryName: 'Česko', region: 'Praha', lat: 50.08, lon: 14.44 },
  { name: 'Roma', country: 'IT', countryName: 'Italia', region: 'Lazio', lat: 41.9, lon: 12.5 },
  {
    name: 'Wien',
    country: 'AT',
    countryName: 'Österreich',
    region: 'Wien',
    lat: 48.21,
    lon: 16.37,
  },
] as const

/** Cities of the mocked catalog that already have places. */
const READY = new Set(['warszawa'])

/** The backend's rule: lower case, no diacritics, runs of other characters become one dash. */
export function slugify(text: string): string {
  return text
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** What the API would answer: catalog matches first, then the geocoder's, deduplicated. */
export function searchCities(
  catalog: City[],
  q: string,
  size: number,
  mode: CitySearchMode,
): Schemas['CitySuggestionPage'] {
  const needle = slugify(q)
  const fromCatalog: Suggestion[] = catalog
    .filter((c) => slugify(c.name).includes(needle) || c.slug.includes(needle))
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      country: c.country,
      source: 'catalog',
      catalog_ready: READY.has(c.slug),
      center_lat: c.center_lat,
      center_lon: c.center_lon,
    }))
  const known = new Set(catalog.map((c) => `${slugify(c.name)}/${c.country}`))
  const fromMap: Suggestion[] =
    mode === 'geocoder-down'
      ? []
      : GEOCODER.filter(
          (g) => slugify(g.name).includes(needle) && !known.has(`${slugify(g.name)}/${g.country}`),
        ).map((g) => ({
          slug: slugify(`${g.name}, ${g.countryName}`),
          name: g.name,
          country: g.country,
          region: g.region,
          source: 'geocoder',
          catalog_ready: false,
          city_query: `${g.name}, ${g.countryName}`,
          center_lat: g.lat,
          center_lon: g.lon,
        }))
  const all = [...fromCatalog, ...fromMap]
  return {
    items: all.slice(0, size),
    total: all.length,
    page: 1,
    size,
    pages: Math.ceil(all.length / size),
    geocoder_available: mode !== 'geocoder-down',
  }
}

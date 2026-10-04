/** Answer when the backend cannot be reached. */
export const STATUS_BAD_GATEWAY = 502

/** Answer for a file that does not exist (instead of the SPA fallback). */
export const STATUS_NOT_FOUND = 404

/** Redirect to the canonical URL of a public page. */
export const STATUS_MOVED_PERMANENTLY = 301

/** `robots.txt` and `sitemap.xml`: an hour is enough, they change with a deploy. */
export const CACHE_CONTROL_CRAWLER_FILES = 'public, max-age=3600'

/** Localized manifest: always revalidate, like the static file. */
export const CACHE_CONTROL_REVALIDATE = 'no-cache'

/** Error pages must never be cached. */
export const CACHE_CONTROL_NO_STORE = 'no-store'

/** Photos and fonts keep their names: a day, then a week of stale-while-revalidate. */
export const CACHE_CONTROL_REVALIDATED_ASSETS =
  'public, max-age=86400, stale-while-revalidate=604800'

/** Path of the crawler rules file. */
export const ROBOTS_PATH = '/robots.txt'

/** Path of the sitemap. */
export const SITEMAP_PATH = '/sitemap.xml'

/** Prefix of the build's hashed assets, photos and fonts. */
export const ASSETS_PREFIX = '/assets/'

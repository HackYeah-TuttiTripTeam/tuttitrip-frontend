// A returning browser can ask for a chunk that a newer deploy has removed. The server
// answers 404 (worker/index.ts) and the dynamic import fails; reloading fetches the
// current index.html and chunk names. One reload per window, so a real outage cannot
// turn into a reload loop.

const STORAGE_KEY = 'tuttitrip:stale-asset-reload'
const WINDOW_MS = 30_000

const STALE_CHUNK_MESSAGE =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i

export interface ReloadDeps {
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined
  now: () => number
  reload: () => void
}

/** True for the errors browsers raise when a dynamic import cannot be loaded. */
export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return STALE_CHUNK_MESSAGE.test(message)
}

/** Reloads unless it already did within the last 30 s. Returns whether it reloaded. */
export function reloadOnce({ storage, now, reload }: ReloadDeps): boolean {
  try {
    const last = Number(storage?.getItem(STORAGE_KEY))
    if (last && now() - last < WINDOW_MS) return false
    storage?.setItem(STORAGE_KEY, String(now()))
  } catch {
    // Storage blocked (private mode): without a guard, do not risk a loop.
    return false
  }
  reload()
  return true
}

function browserDeps(): ReloadDeps {
  let storage: Storage | undefined
  try {
    storage = window.sessionStorage
  } catch {
    storage = undefined
  }
  return { storage, now: Date.now, reload: () => window.location.reload() }
}

/** Reload once when a lazy chunk is gone (Vite emits `vite:preloadError`). */
export function installStaleAssetReload(deps: ReloadDeps = browserDeps()): void {
  window.addEventListener('vite:preloadError', (event) => {
    if (reloadOnce(deps)) event.preventDefault()
  })
}

/** For router error boundaries: reloads once for a stale-chunk error, else false. */
export function reloadIfStaleChunk(error: unknown, deps: ReloadDeps = browserDeps()): boolean {
  return isStaleChunkError(error) && reloadOnce(deps)
}

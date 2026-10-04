import { afterAll, afterEach, beforeEach } from 'vitest'
import { overwriteGetLocale } from '@/paraglide/runtime'
import { server, useDefaultScenario } from './node'

// openapi-fetch builds a Request from the relative path /api/v1/...; Node's Request wants an
// absolute URL (the browser resolves it against the page).
const BaseRequest = globalThis.Request
globalThis.Request = class extends BaseRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const origin = globalThis.location?.origin ?? 'http://localhost'
    super(typeof input === 'string' && input.startsWith('/') ? `${origin}${input}` : input, init)
  }
}

// jsdom has no matchMedia; tests run as a phone (no media query matches).
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList
}

// Radix Slider measures its thumbs with ResizeObserver, which jsdom lacks.
if (typeof window !== 'undefined' && !globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom has no pointer capture; vaul's drawer and the swipe card call it on pointerdown.
if (typeof Element !== 'undefined') {
  Element.prototype.setPointerCapture ??= () => undefined
  Element.prototype.releasePointerCapture ??= () => undefined
  Element.prototype.hasPointerCapture ??= () => false
}

// The router scrolls to the top on navigation; jsdom only prints "not implemented".
if (typeof window !== 'undefined') window.scrollTo = () => undefined

// Started here, not in beforeAll: openapi-fetch captures globalThis.fetch when the API client
// module loads, which is before any beforeAll hook of a test file runs.
server.listen({ onUnhandledFrame: 'error' })

// Tests read Polish unless one switches the locale itself.
beforeEach(() => overwriteGetLocale(() => 'pl'))
beforeEach(useDefaultScenario)
afterEach(() => {
  server.resetHandlers()
  server.events.removeAllListeners()
})
afterAll(() => server.close())

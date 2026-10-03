import { describe, expect, it } from 'vitest'
import worker from './index'

// A minimal HTMLRewriter for Node: just the selectors the Worker uses, on plain strings. It only
// proves that the handlers are called and what they emit, not real HTMLRewriter semantics.
class FakeHTMLRewriter {
  private handlers: [string, { element(el: unknown): void }][] = []
  on(selector: string, handler: { element(el: unknown): void }) {
    this.handlers.push([selector, handler])
    return this
  }
  transform(response: Response): Response {
    const handlers = this.handlers
    const body = response.text().then((html) => {
      let out = html
      for (const [selector, handler] of handlers) {
        handler.element({
          remove: () => {
            if (selector === 'title') out = out.replace(/<title>.*?<\/title>/, '')
            if (selector.startsWith('meta')) out = out.replace(/<meta name="description"[^>]*>/, '')
          },
          setAttribute: (name: string, value: string) => {
            out = out.replace('<html', `<html ${name}="${value}"`)
          },
          append: (content: string) => {
            out =
              selector === 'head'
                ? out.replace('</head>', `${content}</head>`)
                : out.replace('</div>', `${content}</div>`)
          },
        })
      }
      return out
    })
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode(await body))
        controller.close()
      },
    })
    return new Response(stream, response)
  }
}
Object.assign(globalThis, { HTMLRewriter: FakeHTMLRewriter })

const html = () =>
  new Response('<!doctype html>', { headers: { 'content-type': 'text/html; charset=utf-8' } })

function env(assets: (request: Request) => Response, environment = 'production') {
  return {
    API_ORIGIN: 'https://api.example.test',
    ENVIRONMENT: environment,
    ASSETS: { fetch: async (request: Request) => assets(request) },
  }
}

describe('missing files', () => {
  it('turns the SPA fallback for a missing /assets file into a 404', async () => {
    const response = await worker.fetch(
      new Request('https://app.test/assets/gone-AbC123.js'),
      env(html),
    )
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('text/plain')
  })

  it('turns a missing Workbox runtime into a 404', async () => {
    const response = await worker.fetch(
      new Request('https://app.test/workbox-2fbc6a65.js'),
      env(html),
    )
    expect(response.status).toBe(404)
  })

  it('serves an existing asset untouched', async () => {
    const js = new Response('export {}', { headers: { 'content-type': 'text/javascript' } })
    const response = await worker.fetch(
      new Request('https://app.test/assets/index-1.js'),
      env(() => js),
    )
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('export {}')
  })

  it('turns any missing file-like path into a 404', async () => {
    for (const path of ['/gone.js', '/styles.css', '/assets/x.js.map']) {
      const response = await worker.fetch(new Request(`https://app.test${path}`), env(html))
      expect(response.status).toBe(404)
    }
  })

  it('leaves deep links, join, demo and public pages to the SPA fallback', async () => {
    for (const path of [
      '/trips/abc-123',
      '/join',
      '/demo',
      '/about',
      '/contact',
      '/',
      '/index.html',
    ]) {
      const response = await worker.fetch(new Request(`https://app.test${path}`), env(html))
      expect(response.status).toBe(200)
    }
  })
})

describe('public pages', () => {
  const page = () =>
    new Response(
      '<!doctype html><html><head><title>x</title></head><body><div id="root"></div></body></html>',
      {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          etag: '"static"',
          'last-modified': 'Sat, 03 Oct 2026 00:00:00 GMT',
        },
      },
    )

  it('injects the metadata and first screen, in the requested language', async () => {
    const response = await worker.fetch(new Request('https://app.test/about?lang=en'), env(page))
    const body = await response.text()
    expect(body).toContain('<html lang="en">')
    expect(body).toContain('property="og:locale" content="en_US"')
    expect(body).toContain('id="seo-shell"')
    expect(response.headers.get('vary')).toContain('Accept-Language')
  })

  it('never passes the static validators through, and asks the assets for the full file', async () => {
    let seen: Request | undefined
    const response = await worker.fetch(
      new Request('https://app.test/', { headers: { 'if-none-match': '"static"' } }),
      env((request) => {
        seen = request
        return page()
      }),
    )
    expect(seen?.headers.get('if-none-match')).toBeNull()
    expect(response.headers.get('etag')).toBeNull()
    expect(response.headers.get('last-modified')).toBeNull()
  })

  it('redirects a trailing slash to the clean URL, keeping the query', async () => {
    const response = await worker.fetch(new Request('https://app.test/contact/?lang=en'), env(page))
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://app.test/contact?lang=en')
  })

  it('is indexable in production only', async () => {
    const prod = await worker.fetch(new Request('https://app.test/about'), env(page))
    expect(prod.headers.get('x-robots-tag')).toBeNull()
    const other = await worker.fetch(new Request('https://app.test/about'), env(page, 'develop'))
    expect(other.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('serves robots.txt: open in production, closed elsewhere', async () => {
    const prod = await (
      await worker.fetch(new Request('https://app.test/robots.txt'), env(page))
    ).text()
    expect(prod).toContain('Allow: /')
    expect(prod).toContain('Sitemap:')
    const other = await (
      await worker.fetch(new Request('https://dev.test/robots.txt'), env(page, 'develop'))
    ).text()
    expect(other).toContain('Disallow: /\n')
    expect(other).not.toContain('Sitemap')
  })

  it('leaves /assets alone, with a short cache for photos and fonts only', async () => {
    const asset = (type: string) => () =>
      new Response('x', {
        headers: { 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable' },
      })
    const photo = await worker.fetch(
      new Request('https://app.test/assets/photos/a-480.avif'),
      env(asset('image/avif')),
    )
    expect(photo.headers.get('cache-control')).toContain('stale-while-revalidate')
    const font = await worker.fetch(
      new Request('https://app.test/assets/fonts/F.woff2'),
      env(asset('font/woff2')),
    )
    expect(font.headers.get('cache-control')).toContain('max-age=86400')
    const js = await worker.fetch(
      new Request('https://app.test/assets/index-1.js'),
      env(asset('text/javascript')),
    )
    expect(js.headers.get('cache-control')).toContain('immutable')
    expect(js.headers.get('vary')).toBeNull()
  })

  it('keeps a missing photo or font a 404, never cached HTML', async () => {
    for (const path of ['/assets/photos/missing.avif', '/assets/fonts/missing.woff2']) {
      const response = await worker.fetch(new Request(`https://app.test${path}`), env(page))
      expect(response.status).toBe(404)
      expect(response.headers.get('cache-control')).toBe('no-store')
    }
  })

  it('leaves the photo cache to the build outside production', async () => {
    const photo = () =>
      new Response('x', {
        headers: { 'content-type': 'image/avif', 'cache-control': 'no-cache' },
      })
    const response = await worker.fetch(
      new Request('https://dev.test/assets/photos/a-480.avif'),
      env(photo, 'develop'),
    )
    expect(response.headers.get('cache-control')).toBe('no-cache')
  })

  it('does not touch other navigations', async () => {
    const response = await worker.fetch(new Request('https://app.test/trips'), env(page))
    expect(await response.text()).not.toContain('seo-shell')
  })
})

import { describe, expect, it } from 'vitest'
import worker from './index'

const html = () =>
  new Response('<!doctype html>', { headers: { 'content-type': 'text/html; charset=utf-8' } })

function env(assets: (request: Request) => Response) {
  return {
    API_ORIGIN: 'https://api.example.test',
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

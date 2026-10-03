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

describe('build files', () => {
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

  it('leaves deep links to the SPA fallback', async () => {
    const response = await worker.fetch(new Request('https://app.test/trips/abc'), env(html))
    expect(response.status).toBe(200)
  })
})

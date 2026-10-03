// Worker of the frontend: the SPA is static assets, and /api/* is proxied to the
// backend of this environment (API_ORIGIN), so the browser only talks to its own
// origin (no CORS, one URL per environment). See AGENTS.md "API proxy".
//
// wrangler.jsonc runs this script first for /api/* (assets.run_worker_first).
// Any other path reaches it only when no asset matched a non-navigation request
// (curl, fetch); those go back to the assets, which apply the SPA fallback.

import { pageSeo, requestLocale, robotsTxt, seoHeadHtml, seoPath, sitemapXml } from '../src/lib/seo'

interface Env {
  /** Backend origin without a trailing slash, e.g. https://tuttitrip-api.gburek.app */
  API_ORIGIN: string
  ASSETS: { fetch(request: Request): Promise<Response> }
}

// Hop-by-hop headers (RFC 9110 7.6.1) apply to one connection, never forwarded.
const HOP_BY_HOP = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]

// Never forwarded from the client: the API gets the session as a bearer token
// (Authorization), not cookies of this site; forwarding headers come from us.
const CLIENT_ONLY = ['host', 'cookie', 'forwarded', 'x-real-ip']

function dropHopByHop(headers: Headers): void {
  const listed = (headers.get('connection') ?? '').split(',').map((h) => h.trim().toLowerCase())
  for (const name of [...HOP_BY_HOP, ...listed]) if (name) headers.delete(name)
}

function upstreamRequest(request: Request, url: URL, origin: URL): Request {
  const headers = new Headers(request.headers)
  dropHopByHop(headers)
  for (const name of CLIENT_ONLY) headers.delete(name)
  // Spoofable proxy headers and Cloudflare's own (it sets fresh ones upstream).
  for (const name of [...headers.keys()]) {
    if (name.startsWith('x-forwarded-') || name.startsWith('cf-')) headers.delete(name)
  }
  const clientIp = request.headers.get('cf-connecting-ip')
  if (clientIp) headers.set('x-forwarded-for', clientIp)
  headers.set('x-forwarded-host', url.host)
  headers.set('x-forwarded-proto', url.protocol.replace(':', ''))

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  return new Request(new URL(url.pathname + url.search, origin), {
    method: request.method,
    headers,
    body: hasBody ? request.body : null,
    redirect: 'manual',
  })
}

async function proxy(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const origin = new URL(env.API_ORIGIN)
  let upstream: Response
  try {
    upstream = await fetch(upstreamRequest(request, url, origin))
  } catch (error) {
    console.error('API proxy: upstream fetch failed', error)
    return Response.json({ detail: 'API unavailable' }, { status: 502 })
  }
  // Same body stream (SSE and large responses are not buffered), mutable headers.
  const response = new Response(upstream.body, upstream)
  dropHopByHop(response.headers)
  // Redirects of the API (e.g. a trailing slash) must stay on this origin.
  const location = response.headers.get('location')
  if (location?.startsWith(`${origin.origin}/`)) {
    response.headers.set('location', location.slice(origin.origin.length))
  }
  return response
}

// The subset of the Workers HTMLRewriter API used below (the DOM lib does not type it).
interface ElementHandle {
  remove(): void
  append(content: string, options: { html: boolean }): void
  setAttribute(name: string, value: string): void
}
declare class HTMLRewriter {
  on(selector: string, handlers: { element(element: ElementHandle): void }): HTMLRewriter
  transform(response: Response): Response
}

const text = (body: string, type: string) =>
  new Response(body, {
    headers: { 'content-type': `${type}; charset=utf-8`, 'cache-control': 'public, max-age=3600' },
  })

/**
 * The app shell with the metadata of one public page. The SPA is a single index.html, so bots
 * that do not run JavaScript (link previews, crawlers) would all see the same tags; here the
 * title, description, canonical, hreflang, Open Graph, Twitter and JSON-LD of the requested
 * path and language are put in. The client keeps them right after navigation (loaders/seo.ts).
 */
async function publicPage(request: Request, env: Env, url: URL): Promise<Response> {
  const response = await env.ASSETS.fetch(request)
  const path = seoPath(url.pathname)
  const isHtml = (response.headers.get('content-type') ?? '').includes('text/html')
  if (!path || !response.ok || !isHtml) return response

  const locale = requestLocale(url, request.headers.get('accept-language'))
  const seo = pageSeo(url.origin, path, locale)
  const page = new HTMLRewriter()
    .on('html', { element: (element) => element.setAttribute('lang', locale) })
    // The static title and description of index.html give way to the page's own.
    .on('title', { element: (element) => element.remove() })
    .on('meta[name="description"]', { element: (element) => element.remove() })
    .on('head', { element: (element) => element.append(seoHeadHtml(seo), { html: true }) })
    .transform(response)

  // The answer depends on ?lang and on Accept-Language.
  const headers = new Headers(page.headers)
  headers.set('vary', 'Accept-Language')
  if (url.hostname.includes('-develop.')) headers.set('x-robots-tag', 'noindex')
  return new Response(page.body, { status: page.status, headers })
}

export default {
  fetch(request: Request, env: Env): Promise<Response> | Response {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return proxy(request, env)
    if (request.method === 'GET' || request.method === 'HEAD') {
      if (url.pathname === '/robots.txt') return text(robotsTxt(url.origin), 'text/plain')
      if (url.pathname === '/sitemap.xml') return text(sitemapXml(url.origin), 'application/xml')
      if (seoPath(url.pathname)) return publicPage(request, env, url)
    }
    return env.ASSETS.fetch(request)
  },
}

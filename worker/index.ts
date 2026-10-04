// Worker of the frontend: the SPA is static assets, and /api/* is proxied to the
// backend of this environment (API_ORIGIN), so the browser only talks to its own
// origin (no CORS, one URL per environment). See AGENTS.md "API proxy".
//
// wrangler.jsonc runs this script first (assets.run_worker_first) for:
//   /api/*        the proxy;
//   /assets/*     handed to the assets unchanged; a missing file would get the SPA fallback
//                 (200 index.html), so it becomes a 404 (assetsOr404). Nothing is injected here;
//   /manifest.webmanifest
//                 the build's manifest in the language of the request (manifest);
//   /, /about, /contact, /prywatnosc (and the trailing-slash forms), /robots.txt, /sitemap.xml
//                 the public pages with their own metadata and first screen (publicPage).
// Every other path is served by the assets layer without this script.

import { localizedManifest, MANIFEST_PATH } from '../src/lib/manifest'
import { pageSeo, requestLocale, robotsTxt, seoHeadHtml, seoPath, sitemapXml } from '../src/lib/seo'
import { SHELL_PRELOADS, shellHtml } from '../src/lib/seo-shell'
import {
  ASSETS_PREFIX,
  CACHE_CONTROL_CRAWLER_FILES,
  CACHE_CONTROL_NO_STORE,
  CACHE_CONTROL_REVALIDATE,
  CACHE_CONTROL_REVALIDATED_ASSETS,
  ROBOTS_PATH,
  SITEMAP_PATH,
  STATUS_BAD_GATEWAY,
  STATUS_MOVED_PERMANENTLY,
  STATUS_NOT_FOUND,
} from './constants'

interface Env {
  /** Backend origin without a trailing slash, e.g. https://tuttitrip-api.gburek.app */
  API_ORIGIN: string
  /** "production" lets search engines index the site; anything else (or nothing) keeps them out. */
  ENVIRONMENT?: string
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
    return Response.json({ detail: 'API unavailable' }, { status: STATUS_BAD_GATEWAY })
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

const text = (body: string, type: string) =>
  new Response(body, {
    headers: {
      'content-type': `${type}; charset=utf-8`,
      'cache-control': CACHE_CONTROL_CRAWLER_FILES,
    },
  })

/**
 * The manifest from the build with description and lang in the user's language (?lang=, then
 * Accept-Language). The browser fetches it with its own Accept-Language; public pages point at
 * it with ?lang= so the chosen language wins. Not cacheable without revalidation, like the file.
 */
async function manifest(request: Request, env: Env, url: URL): Promise<Response> {
  // The static file's validators say nothing about the localized body (see publicPage).
  const headers = new Headers(request.headers)
  headers.delete('if-none-match')
  headers.delete('if-modified-since')
  const response = await env.ASSETS.fetch(new Request(request, { headers }))
  // A manifest the build did not emit would come back as the SPA fallback (HTML): a real 404.
  if (!response.ok || response.headers.get('content-type')?.startsWith('text/html')) {
    return assetsOr404(request, env)
  }
  const base = (await response.json()) as Record<string, unknown>
  const locale = requestLocale(url, request.headers.get('accept-language'))
  return new Response(JSON.stringify(localizedManifest(base, locale)), {
    headers: {
      'content-type': 'application/manifest+json; charset=utf-8',
      'cache-control': CACHE_CONTROL_REVALIDATE,
      vary: 'Accept-Language',
      // The _headers rules do not apply to a Worker response.
      'referrer-policy': 'no-referrer',
    },
  })
}

const isProduction = (env: Env) => env.ENVIRONMENT === 'production'

/**
 * The app shell with the metadata of one public page. The SPA is a single index.html, so bots
 * that do not run JavaScript (link previews, crawlers) would all see the same tags; here the
 * title, description, canonical, hreflang, Open Graph, Twitter and JSON-LD of the requested
 * path and language are put in. The client keeps them right after navigation (loaders/seo.ts).
 */
async function publicPage(request: Request, env: Env, url: URL): Promise<Response> {
  const path = seoPath(url.pathname)
  // The body depends on the language, so the validators of the static file are no use to the
  // browser or a cache: ask the assets for the whole file and send none of theirs back.
  const headers = new Headers(request.headers)
  headers.delete('if-none-match')
  headers.delete('if-modified-since')
  const response = await env.ASSETS.fetch(new Request(request, { headers }))
  const isHtml = (response.headers.get('content-type') ?? '').includes('text/html')
  if (!path || !response.ok || !isHtml) return response

  const locale = requestLocale(url, request.headers.get('accept-language'))
  const seo = pageSeo(url.origin, path, locale)
  const page = new HTMLRewriter()
    .on('html', {
      element: (element) => {
        element.setAttribute('lang', locale)
        // Tells the language script in index.html that the Worker owns lang and description.
        element.setAttribute('data-seo', '')
      },
    })
    .on('link[rel="manifest"]', {
      element: (element) => element.setAttribute('href', `${MANIFEST_PATH}?lang=${locale}`),
    })
    // The static title and description of index.html give way to the page's own.
    .on('title', { element: (element) => element.remove() })
    .on('meta[name="description"]', { element: (element) => element.remove() })
    .on('head', {
      element: (element) => element.append(SHELL_PRELOADS + seoHeadHtml(seo), { html: true }),
    })
    // The first screen, for the seconds before the app's scripts have run (lib/seo-shell.ts).
    .on('div#root', {
      element: (element) => element.append(shellHtml(path, locale), { html: true }),
    })
    .transform(response)

  const out = new Headers(page.headers)
  out.delete('etag')
  out.delete('last-modified')
  out.delete('content-length')
  // The answer depends on ?lang and on Accept-Language.
  out.append('vary', 'Accept-Language')
  if (!isProduction(env)) out.set('x-robots-tag', 'noindex')
  out.set('referrer-policy', 'same-origin')
  return new Response(page.body, { status: page.status, headers: out })
}

export default {
  fetch(request: Request, env: Env): Promise<Response> | Response {
    const url = new URL(request.url)
    const { pathname } = url
    if (pathname.startsWith('/api/')) return proxy(request, env)
    if (pathname.startsWith(ASSETS_PREFIX)) return assetsOr404(request, env)
    if (request.method === 'GET' || request.method === 'HEAD') {
      if (pathname === MANIFEST_PATH) return manifest(request, env, url)
      if (pathname === ROBOTS_PATH) {
        return text(robotsTxt(url.origin, isProduction(env)), 'text/plain')
      }
      if (pathname === SITEMAP_PATH) return text(sitemapXml(url.origin), 'application/xml')
      const clean = cleanPath(pathname)
      // /about/ is /about: one URL per page, so canonical and links agree.
      if (clean !== pathname && seoPath(clean)) {
        return Response.redirect(`${url.origin}${clean}${url.search}`, STATUS_MOVED_PERMANENTLY)
      }
      if (seoPath(pathname)) return publicPage(request, env, url)
    }
    return assetsOr404(request, env)
  },
}

const cleanPath = (pathname: string) =>
  pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

/** Photos and fonts keep their file names (the first screen points to them), so they cannot be immutable. */
const REVALIDATED_ASSETS = [`${ASSETS_PREFIX}photos/`, `${ASSETS_PREFIX}fonts/`]

// Reached for /assets/* (run_worker_first). The assets layer answers a path without a file
// with the SPA fallback: index.html and status 200. For a file that does not exist
// (a chunk removed by a newer deploy, a stray .js) that means a MIME error and a blank
// page in a returning browser, so a file-like path that comes back as HTML is a real 404
// (the app reloads once on that error, see src/lib/stale-assets.ts). Extensionless paths
// (/trips/abc, /join, /about) and .html stay the SPA's: deep links keep answering 200.
async function assetsOr404(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request)
  const { pathname } = new URL(request.url)
  const isHtml = response.headers.get('content-type')?.startsWith('text/html')
  if (isFileLike(pathname) && isHtml) {
    return new Response('Not found', {
      status: STATUS_NOT_FOUND,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': CACHE_CONTROL_NO_STORE,
      },
    })
  }
  // Production only: other deployments keep the always-revalidate headers of the build.
  if (
    isProduction(env) &&
    response.ok &&
    !isHtml &&
    REVALIDATED_ASSETS.some((prefix) => pathname.startsWith(prefix))
  ) {
    // Same name, maybe new content after a deploy: a day, then a week of stale-while-revalidate.
    const revalidated = new Response(response.body, response)
    revalidated.headers.set('cache-control', CACHE_CONTROL_REVALIDATED_ASSETS)
    return revalidated
  }
  return response
}

/** The last segment has an extension other than .html: /assets/a.js, /workbox-1.js. */
function isFileLike(pathname: string): boolean {
  const last = pathname.split('/').pop() ?? ''
  return /\.[A-Za-z0-9]+$/.test(last) && !last.endsWith('.html')
}

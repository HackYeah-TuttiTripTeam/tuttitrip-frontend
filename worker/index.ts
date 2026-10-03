// Worker of the frontend: the SPA is static assets, and /api/* is proxied to the
// backend of this environment (API_ORIGIN), so the browser only talks to its own
// origin (no CORS, one URL per environment). See AGENTS.md "API proxy".
//
// wrangler.jsonc runs this script first for /api/*, /assets/* and the Workbox
// runtime (assets.run_worker_first). Any other path reaches it only when no asset
// matched a non-navigation request (curl, fetch); those go back to the assets, which
// apply the SPA fallback.

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

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    if (pathname.startsWith('/api/')) return proxy(request, env)
    if (isBuildFile(pathname)) return buildFile(request, env)
    return env.ASSETS.fetch(request)
  },
}

/** Hashed bundle files and the service worker's Workbox runtime (root, hashed name). */
function isBuildFile(pathname: string): boolean {
  return pathname.startsWith('/assets/') || /^\/workbox-[\w-]+\.js$/.test(pathname)
}

// The SPA fallback answers every unknown path with index.html and status 200. For a
// script that was removed by a newer deploy that means a MIME error and a blank page
// in a returning browser, so a build file that is missing must be a real 404 (the app
// reloads once on that error, see src/lib/stale-assets.ts).
async function buildFile(request: Request, env: Env): Promise<Response> {
  const response = await env.ASSETS.fetch(request)
  if (!response.headers.get('content-type')?.startsWith('text/html')) return response
  return new Response('Not found', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  })
}

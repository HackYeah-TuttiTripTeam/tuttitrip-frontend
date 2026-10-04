/** HTTP status codes the client reacts to. */
export const HTTP_STATUS = {
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  unprocessable: 422,
  tooManyRequests: 429,
} as const

/** Request header that carries the access token. */
export const AUTHORIZATION_HEADER = 'Authorization'

/** Request header that tells the API which language to answer in. */
export const ACCEPT_LANGUAGE_HEADER = 'Accept-Language'

/** Authentication scheme of the access tokens (RFC 6750). */
export const BEARER_SCHEME = 'Bearer'

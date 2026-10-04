import type { Schemas } from './client'

/**
 * ASSUMPTIONS TO VERIFY AGAINST backend#81 (nothing below is generated): the paths, the shape of
 * `VoteSession` and `VotePlace` (names, `description`, `photo_url`, `rating`, `reason_code`,
 * `veto_id`), that every write answers 200 with the changed `VotePlace`, and that a veto of a place
 * the plan dropped still comes back in the session. Swap to the generated types when it lands.
 *
 * The routes of the voting page without an account (tuttitrip-backend#81). They are not in
 * `schema.d.ts` until that issue is merged, so the contract of the issue is written out here in
 * the same shape openapi-typescript generates; once `pnpm api:sync` brings the real paths, delete
 * this file and import the generated types. The token travels in the `X-Access-Token` header
 * (what the backend's `token_access` reads), never in a path or query.
 */
export type RatingValue = Schemas['RatingValue']
export type ReasonCode = Schemas['ReasonCode']

/** One place of the plan with this person's own answer; nothing about anybody else. */
export interface VotePlace {
  place_id: string
  name: string
  description: string | null
  photo_url: string | null
  rating: RatingValue | null
  reason_code: ReasonCode | null
  /** Set while this person's veto is active. */
  veto_id: string | null
}

export interface VoteSession {
  trip_name: string
  profile_name: string
  places: VotePlace[]
}

export interface RatingWrite {
  value: RatingValue
  /** Required with `dont_want` (422 without it). */
  reason_code?: ReasonCode | null
}

type Parameters<PathParams = never> = {
  query?: never
  // Like the generated schema (see /vote/access): optional and nullable, the API answers 401 without it.
  header?: { 'X-Access-Token'?: string | null }
  cookie?: never
} & ([PathParams] extends [never] ? { path?: never } : { path: PathParams })

interface Json<T> {
  headers: { [name: string]: unknown }
  content: { 'application/json': T }
}

/** Every method an openapi-typescript path item lists, unused ones as `never`. */
interface NoMethods {
  parameters: { query?: never; header?: never; path?: never; cookie?: never }
  get?: never
  put?: never
  post?: never
  delete?: never
  options?: never
  head?: never
  patch?: never
  trace?: never
}

export interface VotePaths {
  '/api/v1/vote/session': Omit<NoMethods, 'get'> & {
    get: { parameters: Parameters; requestBody?: never; responses: { 200: Json<VoteSession> } }
  }
  '/api/v1/vote/ratings/{place_id}': Omit<NoMethods, 'put'> & {
    put: {
      parameters: Parameters<{ place_id: string }>
      requestBody: { content: { 'application/json': RatingWrite } }
      responses: { 200: Json<VotePlace> }
    }
  }
  '/api/v1/vote/vetoes': Omit<NoMethods, 'post'> & {
    post: {
      parameters: Parameters
      requestBody: { content: { 'application/json': { place_id: string } } }
      responses: { 200: Json<VotePlace> }
    }
  }
  '/api/v1/vote/vetoes/{veto_id}': Omit<NoMethods, 'delete'> & {
    delete: {
      parameters: Parameters<{ veto_id: string }>
      requestBody?: never
      responses: { 200: Json<VotePlace> }
    }
  }
}

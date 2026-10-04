import { $api, type Schemas } from '@/api/client'
import { pagedQueryOptions } from '@/api/queries/paged'

export type ParametersVersion = Schemas['ParametersRead']
export type ParametersCreate = Schemas['ParametersCreate']

/** The version in force (version 0 is the built-in default). */
export const parametersQueryOptions = () =>
  $api.queryOptions('get', '/api/v1/admin/planning/parameters')

/** What the history request needs from the URL's list state. */
export interface VersionsParams {
  page: number
  size: number
  dir: 'asc' | 'desc'
}

/** The history of versions, one page of the URL's state. */
export const versionsQueryOptions = (search: VersionsParams) =>
  pagedQueryOptions(
    $api.queryOptions('get', '/api/v1/admin/planning/parameters/versions', {
      params: { query: { page: search.page, size: search.size, dir: search.dir } },
    }),
  )

export const meQueryOptions = () => $api.queryOptions('get', '/api/v1/me')

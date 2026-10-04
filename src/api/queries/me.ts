import { $api, type Schemas } from '@/api/client'

export type Me = Schemas['MeResponse']

/** `GET /me`: roles and the effective access map. The panel and the menu read what the API says. */
export const meQueryOptions = () => $api.queryOptions('get', '/api/v1/me')

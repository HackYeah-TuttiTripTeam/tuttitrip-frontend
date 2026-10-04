import { useQuery } from '@tanstack/react-query'
import { $api } from '@/api/client'
import type { SessionStatus } from './use-session'

/** The signed-in user's identity (`sub`), to tell which expenses they wrote. */
export function useMe(sessionStatus: SessionStatus) {
  const query = useQuery({
    ...$api.queryOptions('get', '/api/v1/me'),
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
  })
  return { sub: query.data?.sub }
}

import { useQuery } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { meQueryOptions } from '@/api/queries/me'
import { providerOf } from '@/lib/account'
import type { SessionStatus } from './use-session'

/** Who the API says the caller is (`sub`), and from that, which provider the account comes from. */
export function useAccount(sessionStatus: SessionStatus) {
  const query = useQuery({
    ...meQueryOptions(),
    enabled: sessionStatus === 'authenticated' || sessionStatus === 'disabled',
    staleTime: 60_000,
  })
  return {
    provider: providerOf(query.data?.sub),
    isPending: sessionStatus === 'loading' || (query.isPending && query.fetchStatus !== 'idle'),
    problem: query.isError ? classifyApiError(query.error) : null,
    refetch: () => void query.refetch(),
  }
}

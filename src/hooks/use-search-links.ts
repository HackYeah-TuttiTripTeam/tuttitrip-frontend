import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchClient } from '@/api/client'
import { classifyApiError } from '@/api/errors'
import { type SearchLink, searchLinksQueryOptions } from '@/api/queries/accommodation'
import { externalLink } from '@/lib/external-link'

/**
 * The search links with the parameters the trip gives them, for the approval card. `open` is for
 * the click on "Otwórz": the tab opens first, in the same turn as the click (a pop-up blocker lets
 * only that through), and the approval is written to the log alongside.
 */
export function useSearchLinks(tripId: string, enabled: boolean) {
  const query = useQuery({ ...searchLinksQueryOptions(tripId), enabled, retry: false })

  const opened = useMutation({
    mutationFn: (platform: SearchLink['platform']) =>
      fetchClient.POST('/api/v1/trips/{trip_id}/accommodation/search-links/opened', {
        params: { path: { trip_id: tripId } },
        body: { platform },
      }),
  })

  return {
    links: query.data,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    problem: query.isError ? classifyApiError(query.error) : null,
    error: query.error,
    refetch: () => void query.refetch(),
    open: (link: SearchLink) => {
      window.open(link.url, externalLink.target, 'noopener')
      opened.mutate(link.platform)
    },
    isLogging: opened.isPending,
    logFailed: opened.isError,
  }
}

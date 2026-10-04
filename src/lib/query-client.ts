import { QueryClient } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'
import { queryStaleMs } from '@/lib/env'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: queryStaleMs,
      // Retrying a 401 or a 404 only delays the message the user is waiting for.
      retry: (failureCount, error) => {
        const problem = classifyApiError(error)
        return problem !== 'unauthorized' && problem !== 'not_found' && failureCount < 2
      },
    },
  },
})

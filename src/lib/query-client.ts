import { QueryClient } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      // Retrying a 401 or a 404 only delays the message the user is waiting for.
      retry: (failureCount, error) => {
        const problem = classifyApiError(error)
        return problem !== 'unauthorized' && problem !== 'not_found' && failureCount < 2
      },
    },
  },
})

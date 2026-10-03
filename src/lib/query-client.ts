import { QueryClient } from '@tanstack/react-query'
import { classifyApiError } from '@/api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      // Retrying a 401 only delays the "sign in" message.
      retry: (failureCount, error) =>
        classifyApiError(error) !== 'unauthorized' && failureCount < 2,
    },
  },
})

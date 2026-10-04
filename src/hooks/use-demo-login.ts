import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { HTTP_STATUS } from '@/api/constants'
import { enterDemo, MissingDemoLinkError } from '@/api/demo'
import { ApiError } from '@/api/errors'

export type DemoLoginState =
  | { phase: 'working' }
  | { phase: 'failed'; reason: 'missing' | 'invalid' | 'rate_limited' | 'unavailable' }

/** /demo: exchange the captured token, then open the Warsaw demo trip (or the trips list). */
export function useDemoLogin(): DemoLoginState {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [state, setState] = useState<DemoLoginState>({ phase: 'working' })

  useEffect(() => {
    let current = true
    enterDemo().then(
      (tripId) => {
        if (!current) return
        // Nothing fetched before this session may be shown to it.
        queryClient.clear()
        if (tripId) void navigate({ to: '/trips/$tripId', params: { tripId }, replace: true })
        else void navigate({ to: '/trips', replace: true })
      },
      (error: unknown) => {
        if (!current) return
        const reason =
          error instanceof MissingDemoLinkError
            ? 'missing'
            : error instanceof ApiError && error.status === HTTP_STATUS.notFound
              ? 'invalid'
              : error instanceof ApiError && error.status === HTTP_STATUS.tooManyRequests
                ? 'rate_limited'
                : 'unavailable'
        setState({ phase: 'failed', reason })
      },
    )
    return () => {
      current = false
    }
  }, [navigate, queryClient])

  return state
}

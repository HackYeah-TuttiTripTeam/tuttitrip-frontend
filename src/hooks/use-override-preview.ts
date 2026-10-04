import { $api } from '@/api/client'
import type { OverrideKind } from '@/api/queries/decisions'

/** What a host decision would cost, computed by the server without saving anything. */
export function useOverridePreview(tripId: string) {
  const mutation = $api.useMutation('post', '/api/v1/trips/{trip_id}/overrides/preview')
  return {
    preview: (placeId: string, kind: OverrideKind) =>
      mutation.mutate({ params: { path: { trip_id: tripId } }, body: { place_id: placeId, kind } }),
    effects: mutation.data?.effects,
    kind: mutation.data?.kind,
    isPending: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  }
}

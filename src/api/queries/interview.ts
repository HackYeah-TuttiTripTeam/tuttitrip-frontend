import { $api, type Schemas } from '@/api/client'

export type InterviewSession = Schemas['SessionRead']
export type DisplayMessage = Schemas['DisplayMessage']
export type KnowledgeRead = Schemas['KnowledgeRead']

export const knowledgeQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/interview/knowledge', {
    params: { path: { trip_id: tripId } },
  })

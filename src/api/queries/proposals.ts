import { $api, type Schemas } from '@/api/client'

export type Proposal = Schemas['ProposalRead']
export type ProposalDecision = Schemas['ProposalDecision']
export type ProposalStatus = Schemas['ProposalStatus']
export type ProposalAnswer = Schemas['ResponseRead']
export type OutdatedDetail = Schemas['OutdatedDetail']
export type DraftPlan = Schemas['DraftPlanRead']
export type Assumption = Schemas['Assumption']

/** The proposal sent last, with its status and answers. The API answers 404 while none was sent. */
export const proposalQueryOptions = (tripId: string) =>
  $api.queryOptions('get', '/api/v1/trips/{trip_id}/proposals/current', {
    params: { path: { trip_id: tripId } },
  })

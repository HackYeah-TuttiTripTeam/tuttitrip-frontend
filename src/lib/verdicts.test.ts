import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/errors'
import { plan } from '@/mocks/fixtures'
import { conflictMessages } from './decisions'
import { awaitsBudgetApproval, indexVerdicts, skipLabel } from './verdicts'

describe('indexVerdicts', () => {
  it('finds a verdict by place, the skipped places and the numbers per place', () => {
    const index = indexVerdicts(plan())
    expect(index.byPlace.get('7c2e9a10-4d5b-4f61-8a3c-0000000000a1')?.verdict).toBe(
      'iconic_not_yours',
    )
    expect(index.skipped.map((verdict) => verdict.verdict)).toEqual(['skip', 'skip'])
    expect(index.explainByPlace.get('7c2e9a10-4d5b-4f61-8a3c-0000000000a1')).toHaveLength(5)
  })

  it('is empty for a plan from before the verdicts', () => {
    const index = indexVerdicts({ verdicts: null, explain: [] })
    expect(index.byPlace.size).toBe(0)
    expect(index.skipped).toEqual([])
  })
})

describe('skipLabel', () => {
  it('explains a known code in words and shows an unknown one as it is', () => {
    expect(skipLabel('stairs')).toMatch(/schod/)
    expect(skipLabel('teleport')).toBe('teleport')
  })
})

describe('awaitsBudgetApproval', () => {
  it('is true only while the decision is open', () => {
    const { budget } = plan()
    expect(awaitsBudgetApproval(budget)).toBe(false)
    expect(
      awaitsBudgetApproval({ ...budget, needs_approval: true, approval_status: 'pending' }),
    ).toBe(true)
    expect(
      awaitsBudgetApproval({ ...budget, needs_approval: true, approval_status: 'approved' }),
    ).toBe(false)
  })
})

describe('conflictMessages', () => {
  it('turns the reason codes of a 409 into words, once each', () => {
    const body = {
      detail: 'x',
      conflicts: [{ reason_code: 'veto_blocks_place' }, { reason_code: 'veto_blocks_place' }],
    }
    expect(conflictMessages(new ApiError(409, 'x', body))).toEqual([expect.stringMatching(/weto/)])
  })

  it('falls back to one general sentence and ignores other errors', () => {
    expect(conflictMessages(new ApiError(409, 'x', { detail: 'x', conflicts: [] }))).toHaveLength(1)
    expect(conflictMessages(new ApiError(500, 'x'))).toEqual([])
    expect(conflictMessages(new Error('x'))).toEqual([])
  })
})

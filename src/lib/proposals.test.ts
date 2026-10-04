import { describe, expect, it } from 'vitest'
import type { ProposalAnswer } from '@/api/queries/proposals'
import { canSend, detailCode, listAnswers, myAnswer } from './proposals'

const answer = (
  name: string,
  decision: ProposalAnswer['decision'],
  at: string,
  isMe = false,
): ProposalAnswer => ({
  profile_id: name,
  display_name: name,
  decision,
  remark: null,
  responded_at: `2026-10-04T${at}:00Z`,
  is_me: isMe,
})

const answers = [
  answer('Ewa', 'approve', '10:00'),
  answer('Adam', 'reject', '12:00', true),
  answer('Zofia', 'comment', '11:00'),
  answer('Bartek', 'approve', '09:00'),
]
const base = { filter: 'all', sort: 'answered', dir: 'desc', page: 1, size: 10 } as const

describe('listAnswers', () => {
  it('puts the newest answer first by default', () => {
    expect(listAnswers(answers, base).items.map((a) => a.display_name)).toEqual([
      'Adam',
      'Zofia',
      'Ewa',
      'Bartek',
    ])
  })

  it('sorts by name in both directions', () => {
    const asc = listAnswers(answers, { ...base, sort: 'name', dir: 'asc' })
    expect(asc.items.map((a) => a.display_name)).toEqual(['Adam', 'Bartek', 'Ewa', 'Zofia'])
    const desc = listAnswers(answers, { ...base, sort: 'name', dir: 'desc' })
    expect(desc.items[0]?.display_name).toBe('Zofia')
  })

  it('filters by decision', () => {
    const page = listAnswers(answers, { ...base, filter: 'approve' })
    expect(page.total).toBe(2)
    expect(page.items.every((a) => a.decision === 'approve')).toBe(true)
  })

  it('cuts pages and clamps a page beyond the last one', () => {
    const second = listAnswers(answers, { ...base, size: 3, page: 2 })
    expect(second).toMatchObject({ pages: 2, page: 2, total: 4 })
    expect(second.items).toHaveLength(1)
    expect(listAnswers(answers, { ...base, size: 3, page: 9 }).page).toBe(2)
  })

  it('has one empty page for no answers', () => {
    expect(listAnswers([], base)).toEqual({ items: [], total: 0, pages: 1, page: 1 })
  })
})

describe('proposal helpers', () => {
  it('finds the answer of the caller', () => {
    expect(myAnswer(answers)?.display_name).toBe('Adam')
    expect(myAnswer([])).toBeUndefined()
  })

  it('reads the code of an error detail', () => {
    expect(detailCode({ code: 'proposal.outdated', message: 'x' })).toBe('proposal.outdated')
    expect(detailCode('Podaj miasto')).toBeNull()
    expect(detailCode(undefined)).toBeNull()
  })

  it('needs a remark only for a comment', () => {
    expect(canSend('approve', '')).toBe(true)
    expect(canSend('reject', '')).toBe(true)
    expect(canSend('comment', '  ')).toBe(false)
    expect(canSend('comment', 'Za dużo marszu')).toBe(true)
  })
})

// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { PlanProgress as Progress } from '@/api/queries/plan-progress'
import { m } from '@/paraglide/messages'
import { PlanProgress } from './plan-progress'

afterEach(cleanup)

const at = (step: Progress['step'], item: number | null = null, items: number | null = null) =>
  ({ step, position: 1, total: 6, item, items }) satisfies Progress

describe('PlanProgress', () => {
  it('shows every stage and starts at the first one', () => {
    render(<PlanProgress progress={null} />)
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(6)
    const current = within(list).getAllByRole('listitem')[0]
    expect(current?.getAttribute('aria-current')).toBe('step')
    expect(within(list).getByText(m.plan_progress_catalogue())).toBeTruthy()
  })

  it('marks done, current and remaining stages for screen readers', () => {
    render(<PlanProgress progress={at('search')} />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items.map((item) => item.getAttribute('aria-current'))).toEqual([
      null,
      null,
      'step',
      null,
      null,
      null,
    ])
    expect(items[0]?.textContent).toContain(m.plan_progress_done())
    expect(items[2]?.textContent).toContain(m.plan_progress_current())
    expect(items[5]?.textContent).toContain(m.plan_progress_pending())
  })

  it('adds the counter of the stage that has one', () => {
    render(<PlanProgress progress={at('reference', 2, 4)} />)
    const label = `${m.plan_progress_reference()} ${m.plan_progress_count({ item: 2, items: 4 })}`
    // The list item and the live region carry it; the other stages stay without a counter.
    expect(within(screen.getByRole('list')).getByText(label, { exact: false })).toBeTruthy()
    expect(
      screen.queryByText(m.plan_progress_count({ item: 2, items: 4 }), { exact: true }),
    ).toBeNull()
  })

  it('announces only the current stage in a polite live region', () => {
    render(<PlanProgress progress={at('floors')} />)
    const live = screen.getByRole('status')
    expect(live.getAttribute('aria-live')).toBe('polite')
    expect(live.textContent).toBe(
      m.plan_progress_announce({ position: 4, total: 6, label: m.plan_progress_floors() }),
    )
    expect(screen.getByRole('list').closest('[aria-live]')).toBeNull()
  })
})

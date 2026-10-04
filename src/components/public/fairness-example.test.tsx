// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { m } from '@/paraglide/messages'
import { type ExamplePerson, FairnessExample } from './fairness-example'

const people: ExamplePerson[] = [
  { name: 'Zosia', share: 0.8, tone: 1 },
  { name: 'Kuba', share: 0.6, tone: 2 },
]
const format = (share: number) => `${Math.round(share * 100)}%`

afterEach(cleanup)

describe('FairnessExample', () => {
  it('names the lowest share and moves it with the slider', () => {
    render(<FairnessExample people={people} floor={0.4} formatShare={format} />)
    expect(
      screen.getByText(m.example_summary({ name: 'Kuba', share: '60%', floor: '40%' })),
    ).toBeTruthy()

    fireEvent.change(screen.getByRole('slider', { name: m.example_slider({ name: 'Zosia' }) }), {
      target: { value: '30' },
    })
    expect(
      screen.getByText(m.example_summary({ name: 'Zosia', share: '30%', floor: '40%' })),
    ).toBeTruthy()
    // 30% is under the floor, so the "nobody below the floor" badge is gone.
    expect(screen.queryByText(m.example_badge())).toBeNull()
  })

  it('resets to the sample data', async () => {
    render(<FairnessExample people={people} floor={0.4} formatShare={format} />)
    expect(screen.queryByRole('button', { name: m.example_reset() })).toBeNull()
    fireEvent.change(screen.getByRole('slider', { name: m.example_slider({ name: 'Kuba' }) }), {
      target: { value: '10' },
    })
    await userEvent.click(screen.getByRole('button', { name: m.example_reset() }))
    expect(
      screen.getByText(m.example_summary({ name: 'Kuba', share: '60%', floor: '40%' })),
    ).toBeTruthy()
  })
})

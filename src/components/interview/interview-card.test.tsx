// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CitySearch } from '@/lib/city-search'
import { POOL_TOTAL } from '@/lib/importance'
import type { InterviewCard as Card } from '@/lib/interview'
import { SWIPE_FLY_OUT_PX, SWIPE_THRESHOLD_PX } from '@/lib/interview-constants'
import { m } from '@/paraglide/messages'
import { InterviewCard } from './interview-card'

afterEach(cleanup)

const CITY_SEARCH: CitySearch = {
  query: '',
  onQueryChange: vi.fn(),
  searchable: false,
  isSearching: false,
  isError: false,
  retry: vi.fn(),
  suggestions: [],
  geocoderAvailable: true,
}

function setup(card: Card, disabled = false) {
  const onAnswer = vi.fn()
  const view = render(
    <InterviewCard card={card} disabled={disabled} onAnswer={onAnswer} citySearch={CITY_SEARCH} />,
  )
  return { onAnswer, user: userEvent.setup(), ...view }
}

const submit = () => screen.getByRole('button', { name: m.interview_card_submit() })

describe('choice and confirm', () => {
  it('answers with the option that was tapped', async () => {
    const { onAnswer, user } = setup({
      kind: 'choice',
      question: 'Kiedy?',
      options: ['Weekend', 'Tydzień'],
    })
    expect(screen.getByRole('heading', { name: 'Kiedy?' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Tydzień' }))
    expect(onAnswer).toHaveBeenCalledWith('Tydzień')
  })

  it('waits while a run is going', () => {
    setup({ kind: 'confirm', question: 'Plan?', options: ['Tak'] }, true)
    expect((screen.getByRole('button', { name: 'Tak' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

describe('requirement toggles', () => {
  const card: Card = {
    kind: 'requirement_toggles',
    question: 'Wymagania',
    options: ['Basen w każdym noclegu', 'Tylko Airbnb'],
  }

  it('sends the list of the switches that are on', async () => {
    const { onAnswer, user } = setup(card)
    await user.click(screen.getByRole('switch', { name: 'Basen w każdym noclegu' }))
    await user.click(submit())
    expect(onAnswer).toHaveBeenCalledWith(
      m.interview_answer_toggles({ list: 'Basen w każdym noclegu' }),
    )
  })

  it('says none when nothing is on', async () => {
    const { onAnswer, user } = setup(card)
    await user.click(submit())
    expect(onAnswer).toHaveBeenCalledWith(m.interview_toggles_none())
  })
})

describe('swipe cards', () => {
  afterEach(() => vi.useRealTimers())
  const card: Card = {
    kind: 'swipe',
    question: 'Taki klimat?',
    options: ['Muzeum', 'Zamek'],
  }

  it('answers with all the cards once the last one is decided, by buttons', async () => {
    const reduced = stubReducedMotion(true)
    const { onAnswer, user } = setup(card)
    await user.click(screen.getByRole('button', { name: m.interview_swipe_yes() }))
    expect(screen.getByText('Zamek')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: m.interview_swipe_no() }))
    expect(onAnswer).toHaveBeenCalledWith(
      `${m.interview_answer_swipe_yes({ item: 'Muzeum' })}; ${m.interview_answer_swipe_no({ item: 'Zamek' })}`,
    )
    reduced.restore()
  })

  it('treats a drag to the right past the threshold as yes', () => {
    const reduced = stubReducedMotion(true)
    const { onAnswer } = setup({ ...card, options: ['Muzeum'] })
    const element = screen.getByTestId('swipe-card')
    fireEvent.pointerDown(element, { clientX: 0, pointerId: 1 })
    fireEvent.pointerMove(element, { clientX: SWIPE_THRESHOLD_PX + 20, pointerId: 1 })
    fireEvent.pointerUp(element, { clientX: SWIPE_THRESHOLD_PX + 20, pointerId: 1 })
    expect(onAnswer).toHaveBeenCalledWith(m.interview_answer_swipe_yes({ item: 'Muzeum' }))
    reduced.restore()
  })

  it('returns the card when the drag is short', () => {
    const { onAnswer } = setup({ ...card, options: ['Muzeum'] })
    const element = screen.getByTestId('swipe-card')
    fireEvent.pointerDown(element, { clientX: 0, pointerId: 1 })
    fireEvent.pointerMove(element, { clientX: 20, pointerId: 1 })
    fireEvent.pointerUp(element, { clientX: 20, pointerId: 1 })
    expect(onAnswer).not.toHaveBeenCalled()
    expect(element.style.transform).toContain('translateX(0px)')
  })

  it('flies off to the side, unless motion is reduced', async () => {
    vi.useFakeTimers()
    const { onAnswer } = setup({ ...card, options: ['Muzeum'] })
    fireEvent.click(screen.getByRole('button', { name: m.interview_swipe_yes() }))
    expect(screen.getByTestId('swipe-card').style.transform).toContain(`${SWIPE_FLY_OUT_PX}px`)
    await act(() => vi.advanceTimersByTimeAsync(400))
    expect(onAnswer).toHaveBeenCalledTimes(1)
  })

  it('does not animate the departure with prefers-reduced-motion', () => {
    const reduced = stubReducedMotion(true)
    const { onAnswer } = setup({ ...card, options: ['Muzeum'] })
    fireEvent.click(screen.getByRole('button', { name: m.interview_swipe_yes() }))
    // No flight: the answer goes out at once and the card never carried an offset.
    expect(onAnswer).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('swipe-card').style.transform).not.toContain(`${SWIPE_FLY_OUT_PX}px`)
    reduced.restore()
  })
})

describe('dot pool', () => {
  const card: Card = { kind: 'dot_pool', question: 'Co ważne?', options: [] }
  const more = (domain: string) =>
    screen.getByRole('button', { name: m.interview_pool_more({ domain }) })

  it('never goes past ten dots and sends the pool when none is left', async () => {
    const { onAnswer, user } = setup(card)
    expect((submit() as HTMLButtonElement).disabled).toBe(true)
    for (let tap = 0; tap < POOL_TOTAL + 3; tap += 1) {
      const button = more(m.prefs_pool_domain_lodging())
      if (!(button as HTMLButtonElement).disabled) await user.click(button)
    }
    expect(screen.getByRole('status').textContent).toBe(
      m.interview_pool_remaining({ count: 0, total: POOL_TOTAL }),
    )
    // Nothing more can be added anywhere.
    expect((more(m.prefs_pool_domain_food()) as HTMLButtonElement).disabled).toBe(true)
    await user.click(submit())
    expect(onAnswer).toHaveBeenCalledWith(
      m.interview_answer_pool({ parts: `${m.prefs_pool_domain_lodging()} ${POOL_TOTAL}` }),
    )
  })

  it('moves a point from one domain to another', async () => {
    const { user } = setup(card)
    await user.click(more(m.prefs_pool_domain_lodging()))
    await user.click(
      screen.getByRole('button', {
        name: m.interview_pool_less({ domain: m.prefs_pool_domain_lodging() }),
      }),
    )
    await user.click(more(m.prefs_pool_domain_food()))
    expect(screen.getByRole('status').textContent).toBe(
      m.interview_pool_remaining({ count: POOL_TOTAL - 1, total: POOL_TOTAL }),
    )
  })
})

describe('budget range', () => {
  it('sends both numbers', async () => {
    const { onAnswer, user } = setup({
      kind: 'budget_range',
      question: 'Budżet?',
      options: ['PLN'],
    })
    const [from] = screen.getAllByRole('slider')
    from?.focus()
    await user.keyboard('{ArrowRight}')
    await user.click(submit())
    expect(onAnswer).toHaveBeenCalledWith(
      m.interview_answer_budget({ from: 2100, to: 3000, currency: 'PLN' }),
    )
  })
})

describe('slider', () => {
  it('sends the value out of five', async () => {
    const { onAnswer, user } = setup({
      kind: 'slider',
      question: 'Tempo?',
      options: ['Spokojnie', 'Intensywnie'],
    })
    screen.getByRole('slider').focus()
    await user.keyboard('{ArrowRight}')
    await user.click(submit())
    expect(onAnswer).toHaveBeenCalledWith(
      m.interview_answer_slider({ question: 'Tempo?', value: 4, max: 5 }),
    )
  })
})

describe('family builder', () => {
  const card: Card = { kind: 'family_builder', question: 'Kto jedzie?', options: [] }

  it('collects people and sends them in one answer', async () => {
    const { onAnswer, user } = setup(card)
    expect((submit() as HTMLButtonElement).disabled).toBe(true)
    for (const [name, age] of [
      ['Kasia', '6'],
      ['babcia', '72'],
    ] as const) {
      await user.type(screen.getByRole('textbox', { name: m.interview_family_name() }), name)
      await user.type(screen.getByRole('textbox', { name: m.interview_family_age() }), age)
      await user.click(screen.getByRole('button', { name: m.interview_family_add() }))
    }
    await user.click(submit())
    expect(onAnswer).toHaveBeenCalledWith(
      m.interview_answer_family({
        people: `${m.interview_family_person({ name: 'Kasia', age: 6 })}; ${m.interview_family_person({ name: 'babcia', age: 72 })}`,
      }),
    )
  })

  it('rejects an age that is not a number', async () => {
    const { user } = setup(card)
    await user.type(screen.getByRole('textbox', { name: m.interview_family_name() }), 'Tomek')
    await user.type(screen.getByRole('textbox', { name: m.interview_family_age() }), 'abc')
    await user.click(screen.getByRole('button', { name: m.interview_family_add() }))
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText(m.interview_family_empty())).toBeTruthy()
  })
})

/** Makes `prefers-reduced-motion: reduce` match (or not) for the length of a test. */
function stubReducedMotion(reduce: boolean) {
  const original = window.matchMedia
  window.matchMedia = (query: string) =>
    ({
      matches: reduce && query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList
  return {
    restore: () => {
      window.matchMedia = original
    },
  }
}

describe('date range', () => {
  const card: Card = { kind: 'date_range', question: 'Kiedy?', options: [] }

  it('answers with both days as ISO dates and as a value', async () => {
    const { onAnswer, user } = setup(card)
    await user.type(screen.getByLabelText(m.interview_dates_start()), '2026-10-10')
    await user.type(screen.getByLabelText(m.interview_dates_end()), '2026-10-12')
    await user.click(submit())
    expect(onAnswer).toHaveBeenCalledWith(
      m.interview_answer_dates({ from: '2026-10-10', to: '2026-10-12' }),
      { kind: 'date_range', start: '2026-10-10', end: '2026-10-12' },
    )
  })

  it('does not answer with an end before the start, or with a day missing', async () => {
    const { onAnswer, user } = setup(card)
    await user.click(submit())
    expect(screen.getByText(m.interview_dates_required())).toBeTruthy()
    await user.type(screen.getByLabelText(m.interview_dates_start()), '2026-10-12')
    await user.type(screen.getByLabelText(m.interview_dates_end()), '2026-10-10')
    await user.click(submit())
    expect(screen.getByText(m.interview_dates_invalid())).toBeTruthy()
    expect(onAnswer).not.toHaveBeenCalled()
  })
})

describe('city', () => {
  it('answers with the city that was picked from the suggestions', async () => {
    const search: CitySearch = {
      ...CITY_SEARCH,
      query: 'gda',
      searchable: true,
      suggestions: [
        {
          slug: 'gdansk',
          name: 'Gdańsk',
          region: 'Pomorskie',
          country: 'PL',
          catalog_ready: true,
        } as CitySearch['suggestions'][number],
      ],
    }
    const onAnswer = vi.fn()
    const user = userEvent.setup()
    render(
      <InterviewCard
        card={{ kind: 'city', question: 'Dokąd?', options: [] }}
        disabled={false}
        onAnswer={onAnswer}
        citySearch={search}
      />,
    )
    await user.click(screen.getByRole('combobox'))
    await user.click(await screen.findByText('Gdańsk'))
    expect(onAnswer).toHaveBeenCalledWith(m.interview_answer_city({ city: 'Gdańsk' }), {
      kind: 'city',
      name: 'Gdańsk',
      slug: 'gdansk',
    })
  })
})

// @vitest-environment jsdom
import { configure, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// jsdom has no canvas: the codec returns a small JPEG at once, the shrinking itself is unit-tested.
vi.mock('@/lib/receipt-image', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/receipt-image')>()
  return {
    ...original,
    browserCodec: () => ({
      decode: async () => ({ width: 4000, height: 3000 }),
      encode: async () => new Blob([new Uint8Array(1000)], { type: 'image/jpeg' }),
    }),
  }
})

// The reading is polled every 1.5 s, so a full flow takes a few seconds.
vi.setConfig({ testTimeout: 30_000 })
configure({ asyncUtilTimeout: 10_000 })

const realMatchMedia = window.matchMedia
beforeAll(() => {
  window.matchMedia = (query: string) =>
    ({
      matches: true,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList
})
afterAll(() => {
  window.matchMedia = realMatchMedia
})

const photo = () => new File([new Uint8Array(5000)], 'receipt.jpg', { type: 'image/jpeg' })
const open = () => renderApp(`/trips/${TRIP_ID}?tab=expenses`)
const pick = async (user: ReturnType<typeof userEvent.setup>, file = photo()) => {
  const input = await screen.findByTestId('receipt-input')
  await user.upload(input, file)
}

describe('receipt photo', () => {
  it('opens the camera input on phones and shows a card with the unsure fields marked', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    const input = await screen.findByTestId('receipt-input')
    expect(input.getAttribute('accept')).toBe('image/*')
    expect(input.getAttribute('capture')).toBe('environment')

    await pick(user)
    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByText(m.receipt_unsure_title(), {}, { timeout: 10_000 }),
    ).toBeTruthy()
    // The reader named the total, and the category is empty: both are marked.
    expect(within(dialog).getAllByText(m.receipt_check_field()).length).toBeGreaterThanOrEqual(2)
    expect(within(dialog).getByText('The total is partly covered by a fold')).toBeTruthy()
    expect((within(dialog).getByLabelText(/Kwota/) as HTMLInputElement).value).toBe('87.40')
  })

  it('counts the expense only after "Confirm"', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    await pick(user)
    const dialog = await screen.findByRole('dialog')
    await user.click(
      await within(dialog).findByRole('button', { name: m.receipt_confirm() }, { timeout: 10_000 }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await screen.findByText('Biedronka')).toBeTruthy()
    expect(screen.queryByText(m.expense_draft_badge())).toBeNull()
  })

  it('shows a confident reading without the warning', async () => {
    useScenario('family-warsaw', {
      tweak: (world) => {
        world.receiptOutcome = 'confident'
      },
    })
    const user = userEvent.setup()
    open()
    await pick(user)
    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByText(m.receipt_sure_title(), {}, { timeout: 10_000 }),
    ).toBeTruthy()
    expect(within(dialog).queryByText(m.receipt_check_field())).toBeNull()
  })

  it('keeps the photo when the network is gone and sends it again on retry', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    // The first upload meets a dead connection, the second one the normal handler.
    server.use(
      http.post('*/api/v1/trips/:tripId/expenses/receipts', () => HttpResponse.error(), {
        once: true,
      }),
    )
    await pick(user)
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(m.receipt_failure_offline())).toBeTruthy()

    await user.click(within(dialog).getByRole('button', { name: m.action_retry() }))
    expect(
      await within(dialog).findByText(m.receipt_unsure_title(), {}, { timeout: 10_000 }),
    ).toBeTruthy()
  })

  it('explains a refused photo and offers typing it by hand', async () => {
    useScenario('family-warsaw')
    const user = userEvent.setup()
    open()
    server.use(
      http.post('*/api/v1/trips/:tripId/expenses/receipts', () =>
        HttpResponse.json(
          { detail: [{ type: 'receipt.too_large', loc: ['body', 'file'], msg: 'x' }] },
          { status: 422 },
        ),
      ),
    )
    await pick(user)
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText(m.receipt_failure_too_large())).toBeTruthy()
    await user.click(within(dialog).getByRole('button', { name: m.receipt_enter_manually() }))
    expect(await screen.findByLabelText(m.expense_form_amount({ currency: 'PLN' }))).toBeTruthy()
  })

  it('says the reading failed when the reader gives up', async () => {
    useScenario('family-warsaw', {
      tweak: (world) => {
        world.receiptOutcome = 'failed'
      },
    })
    const user = userEvent.setup()
    open()
    await pick(user)
    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByText(m.receipt_failure_unreadable(), {}, { timeout: 10_000 }),
    ).toBeTruthy()
  })

  it('lists a draft with a way to confirm it', async () => {
    useScenario('family-warsaw', {
      tweak: (world) => {
        const first = world.expenses[0]
        if (first) world.expenses[0] = { ...first, status: 'draft', description: 'Szkic kawy' }
      },
    })
    const user = userEvent.setup()
    open()
    expect(await screen.findByText(m.expense_draft_badge())).toBeTruthy()
    await user.click(
      screen.getByRole('button', { name: m.expense_draft_confirm_label({ title: 'Szkic kawy' }) }),
    )
    expect(await screen.findByText(m.receipt_sure_title())).toBeTruthy()
  })
})

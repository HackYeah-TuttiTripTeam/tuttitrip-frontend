// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { overwriteGetLocale } from '@/paraglide/runtime'
import { PaginationBar } from './pagination-bar'

afterEach(cleanup)

function renderBar(props: Partial<Parameters<typeof PaginationBar>[0]> = {}) {
  const onPageChange = vi.fn()
  const onSizeChange = vi.fn()
  render(
    <PaginationBar
      page={2}
      pages={7}
      size={20}
      total={134}
      onPageChange={onPageChange}
      onSizeChange={onSizeChange}
      {...props}
    />,
  )
  return { onPageChange, onSizeChange }
}

describe('PaginationBar', () => {
  it('says which rows are shown, in both languages', () => {
    overwriteGetLocale(() => 'pl')
    renderBar()
    expect(screen.getByText('21 do 40 z 134')).toBeTruthy()
    cleanup()

    overwriteGetLocale(() => 'en')
    renderBar({ page: 7 })
    expect(screen.getByText('121 to 134 of 134')).toBeTruthy()
  })

  it('moves to the previous, next and a numbered page', async () => {
    overwriteGetLocale(() => 'en')
    const { onPageChange } = renderBar()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await user.click(screen.getByRole('button', { name: 'Page 7' }))

    expect(onPageChange.mock.calls).toEqual([[1], [3], [7]])
    expect(screen.getByRole('button', { name: 'Page 2' }).getAttribute('aria-current')).toBe('page')
  })

  it('disables the arrows at the ends and while the next page loads', () => {
    overwriteGetLocale(() => 'en')
    renderBar({ page: 1, pages: 1, total: 5 })
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Previous page' }).disabled).toBe(
      true,
    )
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Next page' }).disabled).toBe(true)
    cleanup()

    renderBar({ busy: true })
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Next page' }).disabled).toBe(true)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Page 3' }).disabled).toBe(true)
  })

  it('keeps 44 px touch targets on phones', () => {
    overwriteGetLocale(() => 'en')
    renderBar()
    for (const name of ['Previous page', 'Next page', 'Page 3']) {
      expect(screen.getByRole('button', { name }).className).toContain('size-11')
    }
    expect(screen.getByRole('combobox', { name: 'Per page' }).className).toContain('h-11')
  })

  it('sticks to the bottom: above the phone action bar, at the screen edge on desktop', () => {
    overwriteGetLocale(() => 'en')
    const { container } = render(
      <PaginationBar
        page={1}
        pages={3}
        size={20}
        total={50}
        onPageChange={vi.fn()}
        onSizeChange={vi.fn()}
      />,
    )
    const bar = container.querySelector<HTMLElement>('[data-slot="pagination-bar"]')
    expect(bar?.className).toContain('sticky')
    expect(bar?.className).toContain('bottom-[calc(4rem+1px+env(safe-area-inset-bottom))]')
    expect(bar?.className).toContain('md:bottom-0')
    expect(bar?.className).toContain('mt-auto')
    expect(bar?.className).toContain('bg-background')
  })
})

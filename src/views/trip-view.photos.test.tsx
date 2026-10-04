// @vitest-environment jsdom
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { galleryPhotos, TRIP_ID } from '@/mocks/fixtures'
import { server, useScenario } from '@/mocks/node'
import { renderApp } from '@/mocks/render-app'
import { m } from '@/paraglide/messages'

// The canvas re-encode needs a browser; the stub keeps the rest of the module (isPhotoFile).
vi.mock('@/lib/photo-resize', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/photo-resize')>()),
  preparePhoto: async () => ({
    image: new Blob(['full'], { type: 'image/jpeg' }),
    thumbnail: new Blob(['thumb'], { type: 'image/jpeg' }),
  }),
}))

beforeEach(() => {
  URL.createObjectURL = () => 'blob:mock-photo'
  URL.revokeObjectURL = () => undefined
})

const open = (search = '') => renderApp(`/trips/${TRIP_ID}?tab=photos${search}`)
const grid = () => screen.findByRole('list', { name: m.photos_list_label() })

describe('Zdjęcia', () => {
  it('loads a page of lazy thumbnails, not the full pictures', async () => {
    const requests: string[] = []
    server.events.on('request:start', ({ request }) => requests.push(new URL(request.url).pathname))
    open()
    const images = [...(await grid()).querySelectorAll('img')]
    expect(images).toHaveLength(24)
    for (const image of images) expect(image.getAttribute('loading')).toBe('lazy')
    expect(requests.some((path) => path.endsWith('/image'))).toBe(false)
    expect(screen.getByText(m.pager_position({ page: 1, pages: 2 }))).toBeTruthy()
  })

  it('goes to the next page and keeps it in the URL', async () => {
    const { router } = open()
    await grid()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: m.pager_next() }))
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: m.photos_list_label() })).getAllByRole('listitem'),
      ).toHaveLength(6),
    )
    expect(router.state.location.search).toMatchObject({ ph_page: 2 })
  })

  it('filters to my photos from the URL', async () => {
    open('&ph_owner=mine')
    expect(within(await grid()).getAllByRole('listitem')).toHaveLength(10)
  })

  it('opens the full picture only after a tap', async () => {
    const requests: string[] = []
    server.events.on('request:start', ({ request }) => requests.push(new URL(request.url).pathname))
    open()
    const user = userEvent.setup()
    await user.click((await within(await grid()).findAllByRole('button'))[0] as HTMLElement)
    const dialog = await screen.findByRole('dialog')
    await waitFor(() =>
      expect(within(dialog).getByRole('img').getAttribute('src')).toBe('blob:mock-photo'),
    )
    expect(requests.filter((path) => path.endsWith('/image'))).toHaveLength(1)
  })

  it('lets a member delete only their own photo', async () => {
    useScenario('member-readonly', { tweak: (world) => (world.photos = galleryPhotos(3)) })
    open()
    const user = userEvent.setup()
    // Newest first: index 2 and 1 are Marek's, index 0 is the caller's own.
    const buttons = await within(await grid()).findAllByRole('button')
    await user.click(buttons[0] as HTMLElement)
    let dialog = await screen.findByRole('dialog')
    expect(within(dialog).queryByRole('button', { name: m.photos_delete() })).toBeNull()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    await user.click((await within(await grid()).findAllByRole('button'))[2] as HTMLElement)
    dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: m.photos_delete() }))
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: m.photos_list_label() })).getAllByRole('listitem'),
      ).toHaveLength(2),
    )
  })

  it("lets the host delete someone else's photo", async () => {
    useScenario('family-warsaw', { tweak: (world) => (world.photos = galleryPhotos(3)) })
    open()
    const user = userEvent.setup()
    await user.click((await within(await grid()).findAllByRole('button'))[0] as HTMLElement)
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: m.photos_delete() }))
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: m.photos_list_label() })).getAllByRole('listitem'),
      ).toHaveLength(2),
    )
  })

  it('uploads a photo and shows it in the gallery', async () => {
    useScenario('family-warsaw', { tweak: (world) => (world.photos = galleryPhotos(2)) })
    const uploads: string[] = []
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'POST') uploads.push(request.headers.get('content-type') ?? '')
    })
    open()
    await grid()
    const user = userEvent.setup()
    await user.upload(
      screen.getByTestId('photo-input'),
      new File(['x'], 'IMG_0001.jpg', { type: 'image/jpeg' }),
    )
    await waitFor(() =>
      expect(
        within(screen.getByRole('list', { name: m.photos_list_label() })).getAllByRole('listitem'),
      ).toHaveLength(3),
    )
    expect(uploads[0]).toContain('multipart/form-data')
  })

  it('explains a file that is not a photo', async () => {
    open()
    await grid()
    const user = userEvent.setup({ applyAccept: false })
    await user.upload(
      screen.getByTestId('photo-input'),
      new File(['x'], 'plan.pdf', { type: 'application/pdf' }),
    )
    expect(await screen.findByText(m.photos_error_not_image())).toBeTruthy()
  })

  it('explains a refusal from the API', async () => {
    useScenario('family-warsaw', { tweak: (world) => (world.photoUploadStatus = 422) })
    open()
    await grid()
    const user = userEvent.setup()
    await user.upload(
      screen.getByTestId('photo-input'),
      new File(['x'], 'IMG_0002.jpg', { type: 'image/jpeg' }),
    )
    expect(await screen.findByText(m.photos_error_rejected())).toBeTruthy()
  })

  it('shows the empty state', async () => {
    useScenario('family-warsaw', { tweak: (world) => (world.photos = []) })
    open()
    expect(await screen.findByText(m.photos_empty_title())).toBeTruthy()
  })
})

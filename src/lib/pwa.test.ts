import { describe, expect, it, vi } from 'vitest'

vi.mock('virtual:pwa-register', () => ({ registerSW: () => undefined }))

import { reloadOnControllerUpdate } from './pwa'

/** A stand-in for navigator.serviceWorker: an EventTarget with a settable controller. */
class FakeContainer extends EventTarget {
  controller: ServiceWorker | null
  constructor(controller: ServiceWorker | null) {
    super()
    this.controller = controller
  }
  takeControl(worker: ServiceWorker) {
    this.controller = worker
    this.dispatchEvent(new Event('controllerchange'))
  }
}

const worker = (name: string) => ({ scriptURL: name }) as unknown as ServiceWorker

describe('reloadOnControllerUpdate', () => {
  it('does not reload on the first install, which claims a page without a controller', () => {
    const container = new FakeContainer(null)
    const reload = vi.fn()
    reloadOnControllerUpdate(container, reload)
    container.takeControl(worker('v1'))
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads once when a new worker replaces the one that controlled the page', () => {
    const container = new FakeContainer(worker('v1'))
    const reload = vi.fn()
    reloadOnControllerUpdate(container, reload)
    container.takeControl(worker('v2'))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads for an update that follows the first install in the same page', () => {
    const container = new FakeContainer(null)
    const reload = vi.fn()
    reloadOnControllerUpdate(container, reload)
    container.takeControl(worker('v1'))
    container.takeControl(worker('v2'))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('never reloads twice for repeated events (no loop)', () => {
    const container = new FakeContainer(worker('v1'))
    const reload = vi.fn()
    reloadOnControllerUpdate(container, reload)
    container.takeControl(worker('v2'))
    container.takeControl(worker('v3'))
    expect(reload).toHaveBeenCalledTimes(1)
  })
})

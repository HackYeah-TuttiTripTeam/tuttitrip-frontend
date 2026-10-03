import { setupServer } from 'msw/node'
import { createHandlers, type HandlerOptions } from './handlers'
import { defaultScenario, type ScenarioName } from './scenarios'

/** The one MSW server of the Vitest run (started in vitest-setup.ts). */
export const server = setupServer()

/** Serve a scenario in the current test, replacing the default one. Reset after every test. */
export function useScenario(name: ScenarioName, options?: Pick<HandlerOptions, 'tweak'>): void {
  server.use(...createHandlers(name, options))
}

export function useDefaultScenario(): void {
  useScenario(defaultScenario)
}

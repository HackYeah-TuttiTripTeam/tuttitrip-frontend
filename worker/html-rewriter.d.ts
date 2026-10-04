// The subset of the Workers HTMLRewriter API that worker/index.ts uses (the DOM lib has no
// types for it, and the Worker is type-checked with plain Fetch API types).
interface HTMLRewriterElement {
  remove(): void
  append(content: string, options: { html: boolean }): void
  setAttribute(name: string, value: string): void
}

declare class HTMLRewriter {
  on(selector: string, handlers: { element(element: HTMLRewriterElement): void }): HTMLRewriter
  transform(response: Response): Response
}

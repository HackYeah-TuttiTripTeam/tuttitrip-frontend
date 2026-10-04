export type ShareResult = 'shared' | 'copied' | 'failed' | 'cancelled'

/** Copies text; false when the browser refuses (insecure context, denied permission). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Opens the system share sheet where there is one, otherwise copies the link. */
export async function shareOrCopy(data: {
  url: string
  title: string
  text: string
}): Promise<ShareResult> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (error) {
      // Closing the sheet is not an error; anything else falls back to the clipboard.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }
  return (await copyText(data.url)) ? 'copied' : 'failed'
}

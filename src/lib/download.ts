/** Hands a blob to the browser as a download: an `<a href>` cannot send the Authorization header. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // The click has started the download; the object URL can go.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

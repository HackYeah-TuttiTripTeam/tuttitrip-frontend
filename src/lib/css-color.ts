const CHANNELS = 4

/**
 * A CSS colour (the `oklch(...)` tokens of the design system included) as `rgb(r, g, b)`, which
 * Google Maps accepts for polylines. Draws one pixel and reads it back, so any colour space the
 * browser knows works. Returns the fallback where there is no canvas (tests, old browsers).
 */
export function cssColorToRgb(color: string, fallback: string): string {
  try {
    const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    if (!context) return fallback
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    const pixel = context.getImageData(0, 0, 1, 1).data
    if (pixel.length < CHANNELS) return fallback
    return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`
  } catch {
    return fallback
  }
}

/** The computed value of a design token such as `--primary`, as rgb. */
export function tokenColor(token: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  return value ? cssColorToRgb(value, fallback) : fallback
}

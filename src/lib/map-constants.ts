/** Padding around the stops when the map fits its view, in pixels. */
export const MAP_FIT_PADDING_PX = 48
/** Zoom for a day with a single stop (fitBounds on one point would zoom in as far as possible). */
export const MAP_SINGLE_POINT_ZOOM = 15
/** Starting view before the first fit (the middle of Poland); fitBounds replaces it at once. */
export const MAP_DEFAULT_CENTER = { lat: 52.0, lng: 19.4 } as const
export const MAP_DEFAULT_ZOOM = 6
/** Width of the route line in pixels, and its opacity. */
export const ROUTE_STROKE_WEIGHT = 4
export const ROUTE_STROKE_OPACITY = 0.85
/** Used when the theme colour cannot be turned into rgb (no canvas): the app's green accent. */
export const ROUTE_FALLBACK_COLOR = 'rgb(0, 128, 96)'

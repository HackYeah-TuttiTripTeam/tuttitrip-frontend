// Fixed values of the check-in, photo and location features. Limits mirror the API (photos and
// locations settings in tuttitrip-backend); change them together.

/** How long typing in a list filter waits before the URL (and the API) is updated. */
export const FILTER_DEBOUNCE_MS = 300

/** Rows per page of the check-in list. */
export const CHECKINS_PAGE_SIZE = 20

/** Photos per page of the gallery (a grid of 3 or 4 columns, so a multiple of 12). */
export const PHOTOS_PAGE_SIZE = 24

/** Longest accommodation name and room the API accepts (CheckinUpdate). */
export const ACCOMMODATION_MAX_CHARS = 200
export const ROOM_MAX_CHARS = 20

/** Largest full picture the API accepts (photos settings: "2 MB"), in bytes, decimal (not MiB). */
export const PHOTO_MAX_BYTES = 2_000_000
/** Largest thumbnail the API accepts ("60 KB"), in bytes, decimal (not KiB). */
export const THUMBNAIL_MAX_BYTES = 60_000
/** Longest side of the uploaded picture and of its thumbnail, in pixels. */
export const PHOTO_MAX_SIDE_PX = 1600
export const THUMBNAIL_MAX_SIDE_PX = 320

/** How often the open app sends the position while sharing; the API drops a position after 15 min. */
export const LOCATION_SEND_INTERVAL_MS = 5 * 60_000
/** Sharing durations offered to the user, in minutes (the API takes 5 to 1440). */
export const SHARE_DURATIONS_MIN = [60, 240, 720, 1440] as const
export const DEFAULT_SHARE_DURATION_MIN = 240
/** How long the browser may reuse a cached position, and how long it may take to find one. */
export const GEOLOCATION_MAX_AGE_MS = 60_000
export const GEOLOCATION_TIMEOUT_MS = 20_000
/** How often the map re-reads the others' positions while it is open. */
export const LOCATIONS_REFETCH_MS = 60_000

import { useMap } from '@vis.gl/react-google-maps'
import { useEffect, useRef } from 'react'
import { MAP_FIT_PADDING_PX, MAP_SINGLE_POINT_ZOOM } from '@/lib/map-constants'

export interface MapPoint {
  lat: number
  lng: number
}

interface FitPointsProps {
  points: MapPoint[]
  /** The view is fitted again only when this changes (e.g. another day, another set of people), never on a plain refresh of the same points. */
  fitKey: string
}

/** Moves the camera of the surrounding `<Map>` so that every point is in view. Renders nothing. */
export function FitPoints({ points, fitKey }: FitPointsProps) {
  const map = useMap()
  const latest = useRef(points)
  latest.current = points

  // biome-ignore lint/correctness/useExhaustiveDependencies: fitKey stands for the points, see its doc
  useEffect(() => {
    const current = latest.current
    const first = current[0]
    if (!map || !first) return
    if (current.length === 1) {
      map.setCenter(first)
      map.setZoom(MAP_SINGLE_POINT_ZOOM)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    for (const point of current) bounds.extend(point)
    map.fitBounds(bounds, MAP_FIT_PADDING_PX)
  }, [map, fitKey])

  return null
}

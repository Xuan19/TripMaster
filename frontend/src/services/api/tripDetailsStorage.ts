import type { TripPlanDetails } from '../../components/trip/types'

const STORAGE_KEY = 'tripmaster.trip-details.v1'

type TripDetailsMap = Record<string, TripPlanDetails>

function readMap(): TripDetailsMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as TripDetailsMap
  } catch {
    return {}
  }
}

function writeMap(data: TripDetailsMap) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function saveTripDetails(tripId: number, details: TripPlanDetails) {
  const all = readMap()
  all[String(tripId)] = details
  writeMap(all)
}

export function getTripDetails(tripId: number) {
  const all = readMap()
  return all[String(tripId)] ?? null
}

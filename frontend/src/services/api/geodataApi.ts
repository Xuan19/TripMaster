import axios from 'axios'

interface RestCountry {
  name?: {
    common?: string
  }
}

interface CountriesNowCitiesResponse {
  error: boolean
  data: string[]
}

const citiesCache = new Map<string, string[]>()
const coordinatesCache = new Map<string, { lat: number; lon: number } | null>()
const distanceCache = new Map<string, number | null>()
const pendingCoordinatesCache = new Map<string, Promise<{ lat: number; lon: number } | null>>()
const pendingDistanceCache = new Map<string, Promise<number | null>>()

function sortUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

export async function getAllCountries(): Promise<string[]> {
  const { data } = await axios.get<RestCountry[]>('https://restcountries.com/v3.1/all?fields=name')
  const countries = data.map((item) => item.name?.common ?? '').filter(Boolean)
  return sortUnique(countries)
}

export async function getCitiesByCountry(country: string): Promise<string[]> {
  const cached = citiesCache.get(country)
  if (cached) return cached

  const { data } = await axios.post<CountriesNowCitiesResponse>(
    'https://countriesnow.space/api/v0.1/countries/cities',
    { country }
  )

  const cities = data.error ? [] : sortUnique(data.data ?? [])
  citiesCache.set(country, cities)
  return cities
}

interface OpenMeteoResult {
  latitude: number
  longitude: number
}

interface OpenMeteoResponse {
  results?: OpenMeteoResult[]
}

async function getCoordinates(query: string): Promise<{ lat: number; lon: number } | null> {
  const cacheKey = query.toLowerCase()
  if (coordinatesCache.has(cacheKey)) return coordinatesCache.get(cacheKey) ?? null
  const pending = pendingCoordinatesCache.get(cacheKey)
  if (pending) return pending

  const request = (async () => {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
    const { data } = await axios.get<OpenMeteoResponse>(url)
    const first = data.results?.[0]
    const coords = first ? { lat: first.latitude, lon: first.longitude } : null
    coordinatesCache.set(cacheKey, coords)
    return coords
  })()

  pendingCoordinatesCache.set(cacheKey, request)
  try {
    return await request
  } finally {
    pendingCoordinatesCache.delete(cacheKey)
  }
}

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthRadius = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * earthRadius * Math.asin(Math.sqrt(h))
}

async function resolveCityCoordinates(city: string, countries: string[]): Promise<{ lat: number; lon: number } | null> {
  for (const country of countries) {
    const result = await getCoordinates(`${city}, ${country}`)
    if (result) return result
  }

  return getCoordinates(city)
}

export async function getDistanceBetweenCities(
  fromCity: string,
  toCity: string,
  countries: string[]
): Promise<number | null> {
  const key = `${fromCity.toLowerCase()}|${toCity.toLowerCase()}|${countries.join(',').toLowerCase()}`
  if (distanceCache.has(key)) return distanceCache.get(key) ?? null
  const pending = pendingDistanceCache.get(key)
  if (pending) return pending

  const request = (async () => {
    const [fromCoords, toCoords] = await Promise.all([
      resolveCityCoordinates(fromCity, countries),
      resolveCityCoordinates(toCity, countries)
    ])

    if (!fromCoords || !toCoords) {
      distanceCache.set(key, null)
      return null
    }

    const distance = Math.round(haversineKm(fromCoords, toCoords))
    distanceCache.set(key, distance)
    return distance
  })()

  pendingDistanceCache.set(key, request)
  try {
    return await request
  } finally {
    pendingDistanceCache.delete(key)
  }
}

import axios from 'axios'
import type { Language } from '../../locales/i18n'

interface RestCountry {
  cca2?: string
  name?: {
    common?: string
  }
}

interface CountriesNowCitiesResponse {
  error: boolean
  data: string[]
}

export interface CitySearchSuggestion {
  name: string
  country: string
  label: string
}

const citiesCache = new Map<string, string[]>()
const citySearchCache = new Map<string, CitySearchSuggestion[]>()
const coordinatesCache = new Map<string, { lat: number; lon: number } | null>()
const timeZoneCache = new Map<string, string | null>()
const distanceCache = new Map<string, number | null>()
const pendingCoordinatesCache = new Map<string, Promise<{ lat: number; lon: number } | null>>()
const pendingTimeZoneCache = new Map<string, Promise<string | null>>()
const pendingDistanceCache = new Map<string, Promise<number | null>>()
let countriesCache: RestCountry[] | null = null
let pendingCountriesRequest: Promise<RestCountry[]> | null = null

const geocodingLanguageByUiLanguage: Record<Language, string> = {
  en: 'en',
  fr: 'fr',
  zh: 'zh'
}

const cityDisplayAliases: Record<string, Partial<Record<Language, string>>> = {
  beijing: { en: 'Beijing', fr: 'Pekin', zh: '\u5317\u4eac' },
  shanghai: { en: 'Shanghai', fr: 'Shanghai', zh: '\u4e0a\u6d77' },
  shenzhen: { en: 'Shenzhen', fr: 'Shenzhen', zh: '\u6df1\u5733' },
  guangzhou: { en: 'Guangzhou', fr: 'Canton', zh: '\u5e7f\u5dde' },
  paris: { en: 'Paris', fr: 'Paris', zh: '\u5df4\u9ece' },
  lyon: { en: 'Lyon', fr: 'Lyon', zh: '\u91cc\u6602' },
  marseille: { en: 'Marseille', fr: 'Marseille', zh: '\u9a6c\u8d5b' },
  nice: { en: 'Nice', fr: 'Nice', zh: '\u5c3c\u65af' },
  tokyo: { en: 'Tokyo', fr: 'Tokyo', zh: '\u4e1c\u4eac' },
  osaka: { en: 'Osaka', fr: 'Osaka', zh: '\u5927\u962a' },
  kyoto: { en: 'Kyoto', fr: 'Kyoto', zh: '\u4eac\u90fd' },
  yokohama: { en: 'Yokohama', fr: 'Yokohama', zh: '\u6a2a\u6ee8' },
  'new york': { en: 'New York', fr: 'New York', zh: '\u7ebd\u7ea6' },
  'los angeles': { en: 'Los Angeles', fr: 'Los Angeles', zh: '\u6d1b\u6749\u77f6' },
  chicago: { en: 'Chicago', fr: 'Chicago', zh: '\u829d\u52a0\u54e5' },
  'san francisco': { en: 'San Francisco', fr: 'San Francisco', zh: '\u65e7\u91d1\u5c71' },
  london: { en: 'London', fr: 'Londres', zh: '\u4f26\u6566' },
  manchester: { en: 'Manchester', fr: 'Manchester', zh: '\u66fc\u5f7b\u65af\u7279' },
  liverpool: { en: 'Liverpool', fr: 'Liverpool', zh: '\u5229\u7269\u6d66' },
  edinburgh: { en: 'Edinburgh', fr: 'Edimbourg', zh: '\u7231\u4e01\u5821' },
  roma: { en: 'Rome', fr: 'Rome', zh: '\u7f57\u9a6c' },
  rome: { en: 'Rome', fr: 'Rome', zh: '\u7f57\u9a6c' },
  firenze: { en: 'Florence', fr: 'Florence', zh: '\u4f5b\u7f57\u4f26\u8428' },
  florence: { en: 'Florence', fr: 'Florence', zh: '\u4f5b\u7f57\u4f26\u8428' },
  venezia: { en: 'Venice', fr: 'Venise', zh: '\u5a01\u5c3c\u65af' },
  venice: { en: 'Venice', fr: 'Venise', zh: '\u5a01\u5c3c\u65af' },
  milano: { en: 'Milan', fr: 'Milan', zh: '\u7c73\u5170' },
  milan: { en: 'Milan', fr: 'Milan', zh: '\u7c73\u5170' },
  torino: { en: 'Turin', fr: 'Turin', zh: '\u90fd\u7075' },
  turin: { en: 'Turin', fr: 'Turin', zh: '\u90fd\u7075' },
  napoli: { en: 'Naples', fr: 'Naples', zh: '\u90a3\u4e0d\u52d2\u65af' },
  naples: { en: 'Naples', fr: 'Naples', zh: '\u90a3\u4e0d\u52d2\u65af' },
  madrid: { en: 'Madrid', fr: 'Madrid', zh: '\u9a6c\u5fb7\u91cc' },
  barcelona: { en: 'Barcelona', fr: 'Barcelone', zh: '\u5df4\u585e\u7f57\u90a3' },
  valencia: { en: 'Valencia', fr: 'Valence', zh: '\u74e6\u4f26\u897f\u4e9a' },
  sevilla: { en: 'Seville', fr: 'Seville', zh: '\u585e\u7ef4\u5229\u4e9a' },
  seville: { en: 'Seville', fr: 'Seville', zh: '\u585e\u7ef4\u5229\u4e9a' },
  berlin: { en: 'Berlin', fr: 'Berlin', zh: '\u67cf\u6797' },
  munchen: { en: 'Munich', fr: 'Munich', zh: '\u6155\u5c3c\u9ed1' },
  munich: { en: 'Munich', fr: 'Munich', zh: '\u6155\u5c3c\u9ed1' },
  frankfurt: { en: 'Frankfurt', fr: 'Francfort', zh: '\u6cd5\u5170\u514b\u798f' },
  hamburg: { en: 'Hamburg', fr: 'Hambourg', zh: '\u6c49\u5821' },
  koln: { en: 'Cologne', fr: 'Cologne', zh: '\u79d1\u9686' },
  cologne: { en: 'Cologne', fr: 'Cologne', zh: '\u79d1\u9686' },
  toronto: { en: 'Toronto', fr: 'Toronto', zh: '\u591a\u4f26\u591a' },
  montreal: { en: 'Montreal', fr: 'Montreal', zh: '\u8499\u7279\u5229\u5c14' },
  vancouver: { en: 'Vancouver', fr: 'Vancouver', zh: '\u6e29\u54e5\u534e' },
  calgary: { en: 'Calgary', fr: 'Calgary', zh: '\u5361\u5c14\u52a0\u91cc' },
  sydney: { en: 'Sydney', fr: 'Sydney', zh: '\u6089\u5c3c' },
  melbourne: { en: 'Melbourne', fr: 'Melbourne', zh: '\u58a8\u5c14\u672c' },
  brisbane: { en: 'Brisbane', fr: 'Brisbane', zh: '\u5e03\u91cc\u65af\u73ed' },
  perth: { en: 'Perth', fr: 'Perth', zh: '\u73c0\u65af' }
}

function sortUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

export function localizeCityName(city: string, language: Language) {
  const trimmed = city.trim()
  if (!trimmed) return ''
  return cityDisplayAliases[trimmed.toLowerCase()]?.[language] ?? trimmed
}

export async function getAllCountries(): Promise<string[]> {
  const data = await getCountriesMetadata()
  const countries = data.map((item) => item.name?.common ?? '').filter(Boolean)
  return sortUnique(countries)
}

async function getCountriesMetadata(): Promise<RestCountry[]> {
  if (countriesCache) return countriesCache
  if (pendingCountriesRequest) return pendingCountriesRequest

  pendingCountriesRequest = axios
    .get<RestCountry[]>('https://restcountries.com/v3.1/all?fields=name,cca2')
    .then((response) => {
      countriesCache = response.data ?? []
      return countriesCache
    })

  try {
    return await pendingCountriesRequest
  } finally {
    pendingCountriesRequest = null
  }
}

export async function getCitiesByCountry(country: string, language: Language = 'en'): Promise<string[]> {
  const cacheKey = `${country}::${language}`
  const cached = citiesCache.get(cacheKey)
  if (cached) return cached

  const { data } = await axios.post<CountriesNowCitiesResponse>(
    'https://countriesnow.space/api/v0.1/countries/cities',
    { country }
  )

  const cities = data.error ? [] : sortUnique((data.data ?? []).map((city) => localizeCityName(city, language)))
  citiesCache.set(cacheKey, cities)
  return cities
}

interface OpenMeteoResult {
  name?: string
  country?: string
  admin1?: string
  timezone?: string
  latitude: number
  longitude: number
}

interface OpenMeteoResponse {
  results?: OpenMeteoResult[]
}

export async function searchCitiesWorldwide(
  query: string,
  language: Language = 'en',
  limit = 8
): Promise<CitySearchSuggestion[]> {
  const trimmedQuery = query.trim()
  if (trimmedQuery.length < 2) return []

  const cacheKey = `${language}::${limit}::${trimmedQuery.toLowerCase()}`
  const cached = citySearchCache.get(cacheKey)
  if (cached) return cached

  const geocodingLanguage = geocodingLanguageByUiLanguage[language] ?? 'en'
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmedQuery)}&count=${limit}&language=${geocodingLanguage}&format=json`
  const { data } = await axios.get<OpenMeteoResponse>(url)
  const seen = new Set<string>()
  const suggestions = (data.results ?? [])
    .map((result) => {
      const name = result.name?.trim() ?? ''
      const country = result.country?.trim() ?? ''
      const region = result.admin1?.trim() ?? ''
      const labelParts = [name]
      if (region && region.toLowerCase() !== name.toLowerCase()) labelParts.push(region)
      if (country) labelParts.push(country)

      return {
        name,
        country,
        label: labelParts.join(', ')
      }
    })
    .filter((suggestion) => suggestion.name.length > 0)
    .filter((suggestion) => {
      const key = `${suggestion.name.toLowerCase()}|${suggestion.country.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  citySearchCache.set(cacheKey, suggestions)
  return suggestions
}

async function getCoordinates(query: string, language: Language = 'en'): Promise<{ lat: number; lon: number } | null> {
  const cacheKey = `${language}::${query.toLowerCase()}`
  if (coordinatesCache.has(cacheKey)) return coordinatesCache.get(cacheKey) ?? null
  const pending = pendingCoordinatesCache.get(cacheKey)
  if (pending) return pending

  const request = (async () => {
    const geocodingLanguage = geocodingLanguageByUiLanguage[language] ?? 'en'
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=${geocodingLanguage}&format=json`
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

async function getTimeZone(query: string, language: Language = 'en'): Promise<string | null> {
  const cacheKey = `${language}::${query.toLowerCase()}`
  if (timeZoneCache.has(cacheKey)) return timeZoneCache.get(cacheKey) ?? null
  const pending = pendingTimeZoneCache.get(cacheKey)
  if (pending) return pending

  const request = (async () => {
    const geocodingLanguage = geocodingLanguageByUiLanguage[language] ?? 'en'
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=${geocodingLanguage}&format=json`
    const { data } = await axios.get<OpenMeteoResponse>(url)
    const timeZone = data.results?.[0]?.timezone?.trim() ?? null
    timeZoneCache.set(cacheKey, timeZone)
    return timeZone
  })()

  pendingTimeZoneCache.set(cacheKey, request)
  try {
    return await request
  } finally {
    pendingTimeZoneCache.delete(cacheKey)
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

async function resolveCityCoordinates(
  city: string,
  countries: string[],
  language: Language = 'en'
): Promise<{ lat: number; lon: number } | null> {
  for (const country of countries) {
    const result = await getCoordinates(`${city}, ${country}`, language)
    if (result) return result
  }

  return getCoordinates(city, language)
}

export async function resolveCityTimeZone(
  city: string,
  countries: string[],
  language: Language = 'en'
): Promise<string | null> {
  for (const country of countries) {
    const result = await getTimeZone(`${city}, ${country}`, language)
    if (result) return result
  }

  return getTimeZone(city, language)
}

export async function getDistanceBetweenCities(
  fromCity: string,
  toCity: string,
  countries: string[],
  language: Language = 'en'
): Promise<number | null> {
  const key = `${language}::${fromCity.toLowerCase()}|${toCity.toLowerCase()}|${countries.join(',').toLowerCase()}`
  if (distanceCache.has(key)) return distanceCache.get(key) ?? null
  const pending = pendingDistanceCache.get(key)
  if (pending) return pending

  const request = (async () => {
    const [fromCoords, toCoords] = await Promise.all([
      resolveCityCoordinates(fromCity, countries, language),
      resolveCityCoordinates(toCity, countries, language)
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

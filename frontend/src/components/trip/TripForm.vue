<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'
import type { Currency, TripFormTexts } from '../../locales/i18n'
import type { ActivityType, TripFormInitialData, TripFormSubmitPayload } from './types'
import { getAllCountries, getCitiesByCountry, getDistanceBetweenCities } from '../../services/api/geodataApi'

interface DayActivity {
  startTime: string
  endTime: string
  type: ActivityType
  name: string
  cost: number | null
}

const DEFAULT_ACTIVITY_START_TIME = '08:00'

const props = withDefaults(
  defineProps<{
    texts: TripFormTexts
    currencyCode: Currency
    isSaving?: boolean
    formTitle?: string
    initialData?: TripFormInitialData | null
  }>(),
  {
    isSaving: false,
    formTitle: undefined,
    initialData: null
  }
)

const emit = defineEmits<{
  (e: 'submit', payload: TripFormSubmitPayload): void
}>()

const fallbackCountryOptions = [
  'China',
  'France',
  'Japan',
  'United States',
  'United Kingdom',
  'Italy',
  'Spain',
  'Germany',
  'Canada',
  'Australia'
]

const fallbackCitiesByCountry: Record<string, string[]> = {
  China: ['Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou'],
  France: ['Paris', 'Lyon', 'Marseille', 'Nice'],
  Japan: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'San Francisco'],
  'United Kingdom': ['London', 'Manchester', 'Liverpool', 'Edinburgh'],
  Italy: ['Rome', 'Milan', 'Venice', 'Florence'],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville'],
  Germany: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'],
  Canada: ['Toronto', 'Montreal', 'Vancouver', 'Calgary'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth']
}

const countryOptions = ref<string[]>([...fallbackCountryOptions])
const citiesByCountry = reactive<Record<string, string[]>>({ ...fallbackCitiesByCountry })
const fetchedCountries = reactive<Record<string, boolean>>({})
const cityLoading = ref(false)
const segmentDistances = reactive<Record<string, number | null>>({})
const segmentLoading = reactive<Record<string, boolean>>({})
const segmentSignatures = reactive<Record<string, string>>({})
const draggingCity = ref<{ dayIndex: number; cityIndex: number } | null>(null)
const cityLoaderVisible = ref(false)
const expandedDays = ref<Record<number, boolean>>({})
const autoFillingCities = ref(false)
let distanceDebounceTimer: ReturnType<typeof setTimeout> | null = null
let cityLoaderTimer: ReturnType<typeof setTimeout> | null = null

const form = reactive({
  name: '',
  countries: ['France'] as string[],
  startDate: new Date(),
  numberOfDays: null as number | null,
  cityStops: [] as string[][],
  dayActivities: [] as DayActivity[][],
  budget: null as number | null
})

const dateFormatter = new Intl.DateTimeFormat('en-GB')
const allCitiesLoaded = computed(
  () => form.countries.length > 0 && form.countries.every((country) => fetchedCountries[country] === true)
)

const selectedCityOptions = computed(() => {
  if (!allCitiesLoaded.value) return []

  const citySet = new Set<string>()

  form.countries.forEach((country) => {
    const cities = citiesByCountry[country] ?? []
    cities.forEach((city) => citySet.add(city))
  })

  return Array.from(citySet).sort((a, b) => a.localeCompare(b))
})

const selectedCitySet = computed(() => new Set(selectedCityOptions.value))

const itineraryDays = computed(() => {
  if (!form.startDate || !form.numberOfDays || form.numberOfDays < 1) return []

  const count = Math.floor(form.numberOfDays)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(form.startDate as Date)
    date.setDate(date.getDate() + index)

    return {
      index,
      day: index + 1,
      isoDate: toIsoDate(date),
      displayDate: dateFormatter.format(date)
    }
  })
})

const activityTypeOptions = computed(() => [
  { value: 'visit', label: props.texts.activityVisit },
  { value: 'meal', label: props.texts.activityMeal },
  { value: 'transport', label: props.texts.activityTransport },
  { value: 'shopping', label: props.texts.activityShopping },
  { value: 'other', label: props.texts.activityOther }
])

watch(
  () => form.numberOfDays,
  (days) => {
    const count = days && days > 0 ? Math.floor(days) : 0
    form.cityStops = Array.from({ length: count }, (_, index) => {
      const existing = form.cityStops[index]
      return existing && existing.length ? existing.slice(0, 4) : ['']
    })
    form.dayActivities = Array.from({ length: count }, (_, index) => form.dayActivities[index] ?? [])
  }
)

watch(
  () => itineraryDays.value.map((item) => item.index),
  (dayIndexes) => {
    const nextState: Record<number, boolean> = {}
    dayIndexes.forEach((dayIndex) => {
      nextState[dayIndex] = expandedDays.value[dayIndex] ?? false
    })
    expandedDays.value = nextState
  },
  { immediate: true }
)

watch(selectedCityOptions, () => {
  if (!allCitiesLoaded.value) return
  form.cityStops = form.cityStops.map((dayStops) =>
    dayStops.map((city) => (selectedCitySet.value.has(city) ? city : ''))
  )
})

function pruneCitiesByCountries(countries: string[]) {
  const allowed = new Set<string>()
  countries.forEach((country) => {
    const cities = citiesByCountry[country] ?? []
    cities.forEach((city) => allowed.add(city))
  })

  form.cityStops = form.cityStops.map((dayStops) =>
    dayStops.map((city) => (allowed.has(city) ? city : ''))
  )
}

watch(
  () => [...form.countries],
  async (countries) => {
    if (cityLoaderTimer) clearTimeout(cityLoaderTimer)

    const countriesToFetch = countries.filter((country) => !fetchedCountries[country])
    if (countriesToFetch.length === 0) {
      cityLoading.value = false
      cityLoaderVisible.value = false
      pruneCitiesByCountries(countries)
      return
    }

    cityLoaderVisible.value = true
    cityLoading.value = true
    try {
      await Promise.all(
        countriesToFetch.map(async (country) => {
          if (fetchedCountries[country]) return
          const cities = await getCitiesByCountry(country)
          if (cities.length) {
            citiesByCountry[country] = cities
          } else if (!citiesByCountry[country]) {
            citiesByCountry[country] = []
          }
          fetchedCountries[country] = true
        })
      )
    } finally {
      cityLoading.value = false
      pruneCitiesByCountries(countries)
      cityLoaderTimer = setTimeout(() => {
        cityLoaderVisible.value = !allCitiesLoaded.value
      }, 450)
    }
  },
  { immediate: true }
)

watch(
  () =>
    JSON.stringify({
      countries: form.countries,
      cityStops: form.cityStops
    }),
  () => {
    if (distanceDebounceTimer) clearTimeout(distanceDebounceTimer)
    distanceDebounceTimer = setTimeout(() => {
      void refreshSegmentDistances()
    }, 700)
  }
)

const canSubmit = computed(
  () =>
    form.countries.length > 0 &&
    form.startDate !== null &&
    form.numberOfDays !== null &&
    form.numberOfDays >= 1 &&
    allCitiesLoaded.value &&
    selectedCityOptions.value.length > 0 &&
    form.cityStops.length === Math.floor(form.numberOfDays) &&
    form.cityStops.every(
      (dayStops) => {
        const selectedCities = dayStops.map((city) => city.trim()).filter((city) => city.length > 0)
        return selectedCities.length > 0 && selectedCities.every((city) => selectedCitySet.value.has(city))
      }
    ) &&
    form.dayActivities.every((activities, dayIndex) =>
      activities.every(
        (activity, activityIndex) =>
          isValidTimeRange(dayIndex, activityIndex, activity) &&
          activity.name.trim().length > 0 &&
          activity.cost !== null &&
          activity.cost >= 0
      )
    ) &&
    (form.budget === null || form.budget >= 0)
)

const showCountryError = computed(() => form.countries.length === 0)
const showCityLoader = computed(() => cityLoaderVisible.value)
const hasSelectedCountry = computed(() => form.countries.length > 0)
const hasBudget = computed(() => form.budget !== null)
const canAutoFillCities = computed(
  () =>
    form.countries.length > 0 &&
    form.numberOfDays !== null &&
    form.numberOfDays >= 1 &&
    allCitiesLoaded.value &&
    selectedCityOptions.value.length > 0 &&
    !autoFillingCities.value
)
const totalActivityCost = computed(() =>
  form.dayActivities.reduce(
    (daySum, activities) => daySum + activities.reduce((activitySum, activity) => activitySum + Number(activity.cost ?? 0), 0),
    0
  )
)
const remainingBudget = computed(() => Number(form.budget ?? 0) - totalActivityCost.value)
const budgetSummaryValue = computed(() => (hasBudget.value ? formatMoney(Number(form.budget)) : '-'))
const remainingBudgetSummaryValue = computed(() => (hasBudget.value ? formatMoney(remainingBudget.value) : '-'))

function toIsoDate(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

function getTripDayCount(startDate: string, endDate: string, details?: TripFormInitialData['details']) {
  if (details?.dayPlans?.length) return details.dayPlans.length
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  const diffMs = end.getTime() - start.getTime()
  if (Number.isNaN(diffMs)) return 1
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
}

function applyInitialData(initialData: TripFormInitialData | null) {
  if (!initialData) return

  const dayCount = getTripDayCount(initialData.startDate, initialData.endDate, initialData.details)
  form.name = initialData.name
  form.countries = initialData.countries.length ? [...initialData.countries] : ['France']
  form.startDate = parseIsoDate(initialData.startDate)
  form.numberOfDays = dayCount
  form.budget = initialData.budget

  const cityStopsFromDetails =
    initialData.details?.dayPlans?.map((day) => {
      const cities = day.cities.slice(0, 4)
      return cities.length > 0 ? cities : ['']
    }) ?? []
  const activityFromDetails =
    initialData.details?.dayPlans?.map((day) =>
      day.activities.map((activity) => ({
        startTime: activity.startTime,
        endTime: activity.endTime,
        type: activity.type,
        name: activity.details,
        cost: activity.cost
      }))
    ) ?? []

  form.cityStops = Array.from({ length: dayCount }, (_, index) => cityStopsFromDetails[index] ?? [''])
  form.dayActivities = Array.from({ length: dayCount }, (_, index) => activityFromDetails[index] ?? [])
}

function addCityStop(dayIndex: number) {
  if (form.cityStops[dayIndex].length >= 4) return
  form.cityStops[dayIndex].push('')
}

interface CityCandidate {
  name: string
  country: string
  popularityRank: number
  countryOrder: number
}

type TransportMode = 'walk' | 'local' | 'train' | 'drive' | 'flight' | 'unknown'

function getCityCandidates() {
  const candidates: CityCandidate[] = []
  const seen = new Set<string>()
  const dayCount = Math.max(1, Math.floor(form.numberOfDays ?? 0))
  const perCountryLimit = Math.max(4, Math.min(8, dayCount + 2))

  form.countries.forEach((country, countryOrder) => {
    const availableCities = citiesByCountry[country] ?? []
    const popularCities = fallbackCitiesByCountry[country] ?? []
    const orderedCities = [
      ...popularCities.filter((city) => availableCities.includes(city)),
      ...availableCities.filter((city) => !popularCities.includes(city))
    ].slice(0, perCountryLimit)

    orderedCities.forEach((city, index) => {
      const key = city.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      candidates.push({
        name: city,
        country,
        popularityRank: index < popularCities.length && popularCities.includes(city) ? index : popularCities.length + index,
        countryOrder
      })
    })
  })

  return candidates
    .sort((left, right) => {
      if (left.popularityRank !== right.popularityRank) return left.popularityRank - right.popularityRank
      if (left.countryOrder !== right.countryOrder) return left.countryOrder - right.countryOrder
      return left.name.localeCompare(right.name)
    })
    .slice(0, Math.max(dayCount + 3, form.countries.length * 4))
}

async function getOrderedRoute(candidates: CityCandidate[]) {
  if (candidates.length <= 1) return candidates

  const remaining = [...candidates].sort((left, right) => {
    if (left.popularityRank !== right.popularityRank) return left.popularityRank - right.popularityRank
    if (left.countryOrder !== right.countryOrder) return left.countryOrder - right.countryOrder
    return left.name.localeCompare(right.name)
  })
  const route: CityCandidate[] = [remaining.shift() as CityCandidate]

  while (remaining.length > 0) {
    const current = route[route.length - 1]
    const scored = await Promise.all(
      remaining.map(async (candidate) => {
        const distance = await getDistanceBetweenCities(current.name, candidate.name, form.countries)
        const weightedScore =
          (distance ?? 5000) + candidate.popularityRank * 160 + candidate.countryOrder * 80

        return {
          candidate,
          distance,
          weightedScore
        }
      })
    )

    scored.sort((left, right) => {
      if (left.weightedScore !== right.weightedScore) return left.weightedScore - right.weightedScore
      if ((left.distance ?? Number.MAX_SAFE_INTEGER) !== (right.distance ?? Number.MAX_SAFE_INTEGER)) {
        return (left.distance ?? Number.MAX_SAFE_INTEGER) - (right.distance ?? Number.MAX_SAFE_INTEGER)
      }
      return left.candidate.name.localeCompare(right.candidate.name)
    })

    const next = scored[0]?.candidate
    if (!next) break

    route.push(next)
    const nextIndex = remaining.findIndex((candidate) => candidate.name === next.name)
    if (nextIndex >= 0) remaining.splice(nextIndex, 1)
  }

  return route
}

function getTransportModeForDistance(distance: number | null): TransportMode {
  if (distance === null) return 'unknown'
  if (distance <= 25) return 'walk'
  if (distance <= 80) return 'local'
  if (distance <= 250) return 'train'
  if (distance <= 450) return 'drive'
  return 'flight'
}

function canGroupCitiesInSameDay(distance: number | null, transportMode: TransportMode) {
  if (distance === null) return false
  return transportMode === 'walk' || transportMode === 'local' || transportMode === 'train'
}

function isTouristHub(cityName: string) {
  return Object.values(fallbackCitiesByCountry).some((cities) => cities.slice(0, 2).includes(cityName))
}

function buildStayFocusedCityStops(orderedRoute: CityCandidate[], dayCount: number) {
  const routeNames = orderedRoute.map((city) => city.name)
  if (routeNames.length === 0) {
    return Array.from({ length: dayCount }, () => [''])
  }

  const plannedDays = [...routeNames]
  let remainingExtraDays = Math.max(0, dayCount - plannedDays.length)
  const stayPriority = orderedRoute
    .map((city, index) => ({
      city,
      index,
      score: (isTouristHub(city.name) ? 100 : 0) + Math.max(0, 12 - city.popularityRank)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)

  let cursor = 0
  while (remainingExtraDays > 0 && stayPriority.length > 0) {
    const target = stayPriority[cursor % stayPriority.length]
    plannedDays.splice(target.index + 1, 0, target.city.name)
    remainingExtraDays -= 1
    cursor += 1
  }

  return Array.from({ length: dayCount }, (_, dayIndex) => {
    const currentCity = plannedDays[dayIndex] ?? plannedDays[plannedDays.length - 1] ?? ''
    if (dayIndex === 0) return [currentCity]

    const previousCity = plannedDays[dayIndex - 1] ?? currentCity
    return previousCity === currentCity ? [currentCity] : [previousCity, currentCity]
  })
}

async function buildAutoFilledCityStops(orderedRoute: CityCandidate[], dayCount: number) {
  if (orderedRoute.length === 0) {
    return Array.from({ length: dayCount }, () => [''])
  }

  if (orderedRoute.length <= dayCount) {
    return buildStayFocusedCityStops(orderedRoute, dayCount)
  }

  const dayStops: string[][] = []
  let routeIndex = 0
  let currentCity = orderedRoute[0].name

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const dayCities: string[] = [currentCity]

    while (dayCities.length < 4 && routeIndex < orderedRoute.length - 1) {
      const currentRouteCity = orderedRoute[routeIndex]
      const nextCity = orderedRoute[routeIndex + 1]
      const distance = await getDistanceBetweenCities(currentRouteCity.name, nextCity.name, form.countries)
      const transportMode = getTransportModeForDistance(distance)
      const remainingDays = dayCount - dayIndex - 1
      const remainingCities = orderedRoute.length - routeIndex - 1
      const mustAdvanceToday = remainingCities > remainingDays
      const shouldAdvanceForShortHop = canGroupCitiesInSameDay(distance, transportMode) && dayCities.length < 3

      if (!mustAdvanceToday && !shouldAdvanceForShortHop) {
        break
      }

      dayCities.push(nextCity.name)
      routeIndex += 1
      currentCity = nextCity.name
    }

    dayStops.push(dayCities)

    if (routeIndex < orderedRoute.length - 1 && dayCities.length === 1) {
      const remainingDays = dayCount - dayIndex - 1
      const remainingCities = orderedRoute.length - routeIndex - 1
      if (remainingCities <= remainingDays && isTouristHub(currentCity)) {
        continue
      }

      routeIndex += 1
      currentCity = orderedRoute[routeIndex].name
      dayStops[dayIndex] = [dayCities[0], currentCity]
    } else {
      currentCity = dayCities[dayCities.length - 1]
    }
  }

  return dayStops
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60)
  const hours = `${Math.floor(normalized / 60)}`.padStart(2, '0')
  const minutes = `${normalized % 60}`.padStart(2, '0')
  return `${hours}:${minutes}`
}

function addGeneratedActivity(
  activities: DayActivity[],
  startMinutes: number,
  durationMinutes: number,
  type: ActivityType,
  name: string
) {
  const startTime = minutesToTime(startMinutes)
  const endTime = minutesToTime(startMinutes + durationMinutes)
  activities.push({
    startTime,
    endTime,
    type,
    name,
    cost: 0
  })

  return startMinutes + durationMinutes
}

function getTransportDurationMinutes(mode: TransportMode, distance: number | null) {
  if (mode === 'walk') return 30
  if (mode === 'local') return 45
  if (mode === 'train') return 90
  if (mode === 'drive') return 150
  if (mode === 'flight') return 240
  if (distance !== null && distance <= 120) return 75
  return 120
}

async function buildAutoActivities(dayStops: string[][]) {
  const dayActivities: DayActivity[][] = []

  for (let dayIndex = 0; dayIndex < dayStops.length; dayIndex += 1) {
    const cities = dayStops[dayIndex].map((city) => city.trim()).filter((city) => city.length > 0)
    const activities: DayActivity[] = []
    let currentMinutes = timeToMinutes('09:00')
    let mealAdded = false

    if (cities.length === 0) {
      dayActivities.push([])
      continue
    }

    for (let cityIndex = 0; cityIndex < cities.length; cityIndex += 1) {
      const city = cities[cityIndex]
      currentMinutes = addGeneratedActivity(
        activities,
        currentMinutes,
        120,
        'visit',
        `${props.texts.activityVisit} - ${city} highlights`
      )

      currentMinutes += 30

      if (!mealAdded && currentMinutes >= timeToMinutes('12:00')) {
        currentMinutes = addGeneratedActivity(
          activities,
          currentMinutes,
          60,
          'meal',
          `${props.texts.activityMeal} - ${city}`
        )
        currentMinutes += 30
        mealAdded = true
      }

      if (cityIndex < cities.length - 1) {
        const nextCity = cities[cityIndex + 1]
        const distance = await getDistanceBetweenCities(city, nextCity, form.countries)
        const transportMode = getTransportModeForDistance(distance)
        const transportLabel = transportMode === 'unknown' ? props.texts.activityTransport : `${props.texts.activityTransport} - ${transportMode}`
        currentMinutes = addGeneratedActivity(
          activities,
          currentMinutes,
          getTransportDurationMinutes(transportMode, distance),
          'transport',
          `${transportLabel}: ${city} -> ${nextCity}`
        )
        currentMinutes += 30
      }
    }

    if (!mealAdded) {
      currentMinutes = addGeneratedActivity(
        activities,
        Math.max(currentMinutes, timeToMinutes('12:30')),
        60,
        'meal',
        `${props.texts.activityMeal} - ${cities[cities.length - 1]}`
      )
      currentMinutes += 30
    }

    const finalCity = cities[cities.length - 1]
    const shouldAddExtraVisit = cities.length === 1 || isTouristHub(finalCity)
    if (shouldAddExtraVisit && activities.length < 5) {
      addGeneratedActivity(
        activities,
        Math.max(currentMinutes, timeToMinutes('15:30')),
        120,
        'visit',
        `${props.texts.activityVisit} - ${finalCity} top sights`
      )
    }

    dayActivities.push(activities)
  }

  return dayActivities
}

async function autoFillCities() {
  if (!canAutoFillCities.value) return

  autoFillingCities.value = true
  try {
    const dayCount = Math.max(1, Math.floor(form.numberOfDays ?? 0))
    const candidates = getCityCandidates()
    if (candidates.length === 0) return

    const orderedRoute = await getOrderedRoute(candidates)
    const cityStops = await buildAutoFilledCityStops(orderedRoute, dayCount)
    form.cityStops = cityStops
    form.dayActivities = await buildAutoActivities(cityStops)
    expandedDays.value = Object.fromEntries(Array.from({ length: dayCount }, (_, index) => [index, true]))
  } finally {
    autoFillingCities.value = false
  }
}

function removeCityStop(dayIndex: number, cityIndex: number) {
  if (form.cityStops[dayIndex].length <= 1) return
  form.cityStops[dayIndex].splice(cityIndex, 1)
}

function addActivity(dayIndex: number) {
  const activities = form.dayActivities[dayIndex]
  const previous = activities[activities.length - 1]
  const startTime = previous?.endTime || previous?.startTime || DEFAULT_ACTIVITY_START_TIME

  activities.push({
    startTime,
    endTime: startTime,
    type: 'visit',
    name: '',
    cost: null
  })

  expandedDays.value[dayIndex] = true
}

function removeActivity(dayIndex: number, activityIndex: number) {
  form.dayActivities[dayIndex].splice(activityIndex, 1)
  syncActivitiesFrom(dayIndex, activityIndex)
}

function getMinStartTime(dayIndex: number, activityIndex: number) {
  if (activityIndex === 0) return DEFAULT_ACTIVITY_START_TIME
  return form.dayActivities[dayIndex]?.[activityIndex - 1]?.endTime || ''
}

function syncActivitiesFrom(dayIndex: number, startIndex: number) {
  const activities = form.dayActivities[dayIndex] ?? []
  for (let index = Math.max(startIndex, 0); index < activities.length; index += 1) {
    const activity = activities[index]
    const minStart = getMinStartTime(dayIndex, index)

    if (!activity.startTime || (minStart && activity.startTime < minStart)) {
      activity.startTime = minStart || DEFAULT_ACTIVITY_START_TIME
    }

    if (!activity.endTime || activity.endTime < activity.startTime) {
      activity.endTime = activity.startTime
    }
  }
}

function handleActivityStartChange(dayIndex: number, activityIndex: number, value: string) {
  const activity = form.dayActivities[dayIndex]?.[activityIndex]
  if (!activity) return

  const minStart = getMinStartTime(dayIndex, activityIndex)
  const nextStart = !value ? minStart || DEFAULT_ACTIVITY_START_TIME : minStart && value < minStart ? minStart : value

  activity.startTime = nextStart
  if (!activity.endTime || activity.endTime < activity.startTime) {
    activity.endTime = activity.startTime
  }

  syncActivitiesFrom(dayIndex, activityIndex + 1)
}

function handleActivityEndChange(dayIndex: number, activityIndex: number, value: string) {
  const activity = form.dayActivities[dayIndex]?.[activityIndex]
  if (!activity) return

  if (!activity.startTime) {
    activity.startTime = getMinStartTime(dayIndex, activityIndex) || DEFAULT_ACTIVITY_START_TIME
  }

  if (!value) {
    activity.endTime = activity.startTime
    return
  }

  activity.endTime = value < activity.startTime ? activity.startTime : value
  syncActivitiesFrom(dayIndex, activityIndex + 1)
}

function isValidTimeRange(dayIndex: number, activityIndex: number, activity: DayActivity) {
  if (activity.startTime.length === 0 || activity.endTime.length === 0) return false
  if (activity.endTime < activity.startTime) return false

  const minStart = getMinStartTime(dayIndex, activityIndex)
  return !minStart || activity.startTime >= minStart
}

function getActivityDurationLabel(activity: DayActivity) {
  if (!activity.startTime || !activity.endTime) return '--'

  const [startHour, startMinute] = activity.startTime.split(':').map(Number)
  const [endHour, endMinute] = activity.endTime.split(':').map(Number)
  if (Number.isNaN(startHour) || Number.isNaN(startMinute) || Number.isNaN(endHour) || Number.isNaN(endMinute)) {
    return '--'
  }

  let startTotal = startHour * 60 + startMinute
  let endTotal = endHour * 60 + endMinute
  if (endTotal < startTotal) endTotal += 24 * 60
  const diff = endTotal - startTotal

  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  if (hours && minutes) return `${hours}h ${minutes}m`
  if (hours) return `${hours}h`
  return `${minutes}m`
}

function handleCityDragStart(event: DragEvent, dayIndex: number, cityIndex: number) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${dayIndex}-${cityIndex}`)
  }
  draggingCity.value = { dayIndex, cityIndex }
}

function handleCityDrop(dayIndex: number, targetIndex: number) {
  if (!draggingCity.value || draggingCity.value.dayIndex !== dayIndex) return

  const sourceIndex = draggingCity.value.cityIndex
  if (sourceIndex === targetIndex) {
    draggingCity.value = null
    return
  }

  const dayStops = [...form.cityStops[dayIndex]]
  const [moved] = dayStops.splice(sourceIndex, 1)
  dayStops.splice(targetIndex, 0, moved)
  form.cityStops[dayIndex] = dayStops
  draggingCity.value = null
}

function handleCityDragEnd() {
  draggingCity.value = null
}

function getSegmentKey(dayIndex: number, segmentIndex: number) {
  return `${dayIndex}-${segmentIndex}`
}

async function refreshSegmentDistances() {
  const activeKeys = new Set<string>()
  const countriesKey = form.countries.join('|').toLowerCase()
  form.cityStops.forEach((dayStops, dayIndex) => {
    for (let segmentIndex = 0; segmentIndex < dayStops.length - 1; segmentIndex += 1) {
      const fromCity = dayStops[segmentIndex]?.trim()
      const toCity = dayStops[segmentIndex + 1]?.trim()
      const key = getSegmentKey(dayIndex, segmentIndex)
      activeKeys.add(key)

      if (!fromCity || !toCity) {
        segmentDistances[key] = null
        segmentLoading[key] = false
        segmentSignatures[key] = ''
        continue
      }

      const signature = `${fromCity.toLowerCase()}->${toCity.toLowerCase()}|${countriesKey}`
      if (segmentSignatures[key] === signature) continue

      segmentSignatures[key] = signature
      segmentLoading[key] = true
      void getDistanceBetweenCities(fromCity, toCity, form.countries)
        .then((distance) => {
          segmentDistances[key] = distance
        })
        .catch(() => {
          segmentDistances[key] = null
        })
        .finally(() => {
          segmentLoading[key] = false
        })
    }
  })

  Object.keys(segmentDistances).forEach((key) => {
    if (!activeKeys.has(key)) {
      delete segmentDistances[key]
      delete segmentLoading[key]
      delete segmentSignatures[key]
    }
  })
}

function getDistanceLabel(dayIndex: number, segmentIndex: number) {
  const key = getSegmentKey(dayIndex, segmentIndex)
  if (segmentLoading[key]) return '...'

  const fromCity = form.cityStops[dayIndex]?.[segmentIndex]?.trim()
  const toCity = form.cityStops[dayIndex]?.[segmentIndex + 1]?.trim()
  if (!fromCity || !toCity) return ''

  const distance = segmentDistances[key]
  return distance !== undefined && distance !== null ? `${distance} km` : 'N/A'
}

function getTransportIcon(dayIndex: number, segmentIndex: number) {
  const key = getSegmentKey(dayIndex, segmentIndex)
  if (segmentLoading[key]) return 'pi pi-spin pi-spinner'

  const fromCity = form.cityStops[dayIndex]?.[segmentIndex]?.trim()
  const toCity = form.cityStops[dayIndex]?.[segmentIndex + 1]?.trim()
  if (!fromCity || !toCity) return 'pi pi-arrow-right'

  const distance = segmentDistances[key] ?? null
  const mode = getTransportModeForDistance(distance)

  switch (mode) {
    case 'walk':
      return 'pi pi-directions'
    case 'local':
      return 'pi pi-car'
    case 'train':
      return 'pi pi-truck'
    case 'drive':
      return 'pi pi-car'
    case 'flight':
      return 'pi pi-send'
    default:
      return 'pi pi-arrow-right'
  }
}

function getCitySelectWidth(cityName: string) {
  const reference = cityName?.trim() || props.texts.city
  const estimated = reference.length * 10 + 56
  const bounded = Math.max(140, Math.min(420, estimated))
  return `${bounded}px`
}

function getDayLabel(day: number, displayDate: string) {
  return `${props.texts.day} ${day}, ${displayDate}`
}

function toggleDayActivities(dayIndex: number) {
  expandedDays.value[dayIndex] = !expandedDays.value[dayIndex]
}

function isDayExpanded(dayIndex: number) {
  return expandedDays.value[dayIndex] === true
}

function hasActivities(dayIndex: number) {
  return (form.dayActivities[dayIndex]?.length ?? 0) > 0
}

function hasSelectedCity(dayIndex: number) {
  return form.cityStops[dayIndex]?.some((city) => city.trim().length > 0) ?? false
}

function handleSubmit() {
  if (!canSubmit.value || props.isSaving) return

  const endDate = itineraryDays.value[itineraryDays.value.length - 1].isoDate
  const startDate = toIsoDate(form.startDate as Date)

  emit('submit', {
    name: form.name.trim(),
    country: form.countries.join(', '),
    startDate,
    endDate,
    budget: Number(form.budget ?? 0),
    details: {
      countries: [...form.countries],
      dayPlans: itineraryDays.value.map((item) => ({
        day: item.day,
        date: item.isoDate,
        cities: form.cityStops[item.index].map((city) => city.trim()).filter((city) => city.length > 0),
        activities: form.dayActivities[item.index].map((activity) => ({
          startTime: activity.startTime,
          endTime: activity.endTime,
          type: activity.type,
          details: activity.name.trim(),
          cost: Number(activity.cost ?? 0)
        }))
      }))
    }
  })
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: props.currencyCode
  }).format(value)
}

onMounted(async () => {
  try {
    const countries = await getAllCountries()
    if (countries.length) countryOptions.value = countries
  } catch {
    countryOptions.value = [...fallbackCountryOptions].sort((a, b) => a.localeCompare(b))
  }
})

watch(
  () => props.initialData,
  (initialData) => {
    applyInitialData(initialData)
  },
  { immediate: true }
)
</script>

<template>
  <div class="trip-form-shell">
    <div class="trip-form-main">
      <form class="trip-form" @submit.prevent="handleSubmit">
        <h2>{{ props.formTitle || props.texts.createTrip }}</h2>

        <div class="field-group">
          <label>{{ props.texts.tripName }}</label>
          <InputText v-model="form.name" :placeholder="props.texts.tripName" />
        </div>

        <div class="field-group">
          <label>{{ props.texts.country }}</label>
          <MultiSelect
            v-model="form.countries"
            :options="countryOptions"
            :placeholder="props.texts.country"
            :show-toggle-all="false"
            :filter="true"
            display="chip"
            :class="{ 'p-invalid': showCountryError }"
          />
          <small v-if="showCountryError" class="field-error">Please select at least one country.</small>
          <div v-if="showCityLoader" class="city-loader">
            <ProgressSpinner style="width: 18px; height: 18px" stroke-width="6" />
            <small>{{ props.texts.loadingCities }}</small>
          </div>
        </div>

        <div class="date-days-row">
          <div class="field-group compact-field">
            <label>{{ props.texts.startDate }}</label>
            <Calendar v-model="form.startDate" date-format="yy-mm-dd" show-icon :disabled="!hasSelectedCountry" />
          </div>

          <div class="field-group compact-field">
            <label>{{ props.texts.numberOfDays }}</label>
            <InputNumber
              v-model="form.numberOfDays"
              mode="decimal"
              :min="1"
              :max-fraction-digits="0"
              :disabled="!hasSelectedCountry"
            />
          </div>

          <div class="field-group compact-field">
            <label>{{ props.texts.budget }}</label>
            <InputNumber
              v-model="form.budget"
              mode="currency"
              :currency="props.currencyCode"
              :min="0"
              :placeholder="`${props.texts.budget} (${props.currencyCode})`"
            />
          </div>
        </div>

        <div class="auto-fill-row">
          <Button
            type="button"
            outlined
            class="auto-fill-cities-btn"
            :label="props.texts.autoFillCities"
            :disabled="!canAutoFillCities"
            :loading="autoFillingCities"
            @click="autoFillCities"
          />
        </div>

        <section v-if="itineraryDays.length" class="itinerary-section">
          <h3>{{ props.texts.dailyProgram }}</h3>
          <div v-for="item in itineraryDays" :key="item.index" class="itinerary-row">
            <button
              v-if="hasActivities(item.index)"
              type="button"
              class="itinerary-day-toggle"
              @click="toggleDayActivities(item.index)"
            >
              <span v-tooltip.bottom="getDayLabel(item.day, item.displayDate)" class="itinerary-label">{{ getDayLabel(item.day, item.displayDate) }}</span>
              <i class="pi" :class="isDayExpanded(item.index) ? 'pi-chevron-down' : 'pi-chevron-right'" />
            </button>
            <span v-else v-tooltip.bottom="getDayLabel(item.day, item.displayDate)" class="itinerary-label">{{ getDayLabel(item.day, item.displayDate) }}</span>
            <div class="city-stops-inline">
              <template v-for="(_, cityIndex) in form.cityStops[item.index]" :key="`${item.index}-${cityIndex}`">
                <div
                  v-tooltip.bottom="form.cityStops[item.index][cityIndex] || props.texts.city"
                  class="city-stop-inline"
                  @dragover.prevent
                  @drop.prevent="handleCityDrop(item.index, cityIndex)"
                >
                  <Button
                    type="button"
                    icon="pi pi-bars"
                    text
                    rounded
                    class="drag-city-btn"
                    draggable="true"
                    @dragstart="handleCityDragStart($event, item.index, cityIndex)"
                    @dragend="handleCityDragEnd"
                  />
                  <Dropdown
                    v-model="form.cityStops[item.index][cityIndex]"
                    :options="selectedCityOptions"
                    :placeholder="allCitiesLoaded ? props.texts.city : props.texts.loadingCities"
                    :filter="true"
                    :virtual-scroller-options="{ itemSize: 36 }"
                    class="city-select"
                    :disabled="!allCitiesLoaded"
                    :loading="!allCitiesLoaded"
                    :style="{ width: getCitySelectWidth(form.cityStops[item.index][cityIndex]) }"
                  />
                  <Button
                    v-if="form.cityStops[item.index].length > 1"
                    type="button"
                    icon="pi pi-trash"
                    text
                    rounded
                    class="remove-city-btn"
                    @click="removeCityStop(item.index, cityIndex)"
                  />
                </div>
                <div v-if="cityIndex < form.cityStops[item.index].length - 1" class="city-connector">
                  <span v-tooltip.bottom="getDistanceLabel(item.index, cityIndex)" class="distance-label">{{ getDistanceLabel(item.index, cityIndex) }}</span>
                  <span class="arrow-line" />
                  <i v-tooltip.bottom="getDistanceLabel(item.index, cityIndex)" :class="['transport-icon', 'pi', getTransportIcon(item.index, cityIndex)]" />
                </div>
              </template>

              <Button
                v-if="form.cityStops[item.index].length < 4"
                type="button"
                icon="pi pi-plus"
                text
                rounded
                class="add-city-btn"
                :disabled="!allCitiesLoaded"
                @click="addCityStop(item.index)"
              />
            </div>
            <div
              v-if="(hasSelectedCity(item.index) || hasActivities(item.index)) && (!hasActivities(item.index) || isDayExpanded(item.index))"
              class="activities-section"
            >
              <div
                v-for="(activity, activityIndex) in form.dayActivities[item.index]"
                :key="`${item.index}-activity-${activityIndex}`"
                class="activity-row"
              >
                <div class="activity-time-field">
                  <small>{{ props.texts.activityStartTime }}</small>
                  <InputText
                    :model-value="activity.startTime"
                    type="time"
                    :min="getMinStartTime(item.index, activityIndex)"
                    :placeholder="props.texts.activityStartTime"
                    @update:model-value="handleActivityStartChange(item.index, activityIndex, String($event ?? ''))"
                  />
                </div>
                <div class="activity-time-field">
                  <small>{{ props.texts.activityEndTime }}</small>
                  <InputText
                    :model-value="activity.endTime"
                    type="time"
                    :min="activity.startTime || getMinStartTime(item.index, activityIndex)"
                    :placeholder="props.texts.activityEndTime"
                    @update:model-value="handleActivityEndChange(item.index, activityIndex, String($event ?? ''))"
                  />
                </div>
                <div class="activity-duration">
                  <small>{{ props.texts.activityDuration }}</small>
                  <span :class="{ invalid: !isValidTimeRange(item.index, activityIndex, activity) }">{{
                    getActivityDurationLabel(activity)
                  }}</span>
                </div>
                <Dropdown
                  v-model="activity.type"
                  :options="activityTypeOptions"
                  option-label="label"
                  option-value="value"
                  :placeholder="props.texts.activityType"
                />
                <InputText
                  v-model="activity.name"
                  v-tooltip.bottom="activity.name || props.texts.activityName"
                  :placeholder="props.texts.activityName"
                />
                <InputNumber
                  v-model="activity.cost"
                  mode="currency"
                  :currency="props.currencyCode"
                  :min="0"
                  :placeholder="props.texts.activityCost"
                />
                <Button
                  type="button"
                  icon="pi pi-trash"
                  text
                  rounded
                  class="remove-activity-btn"
                  @click="removeActivity(item.index, activityIndex)"
                />
              </div>
              <Button
                v-if="hasSelectedCity(item.index)"
                type="button"
                outlined
                class="add-activity-btn"
                :label="props.texts.addActivity"
                @click="addActivity(item.index)"
              />
            </div>
          </div>
        </section>

        <Button
          type="submit"
          :label="props.texts.save"
          :disabled="!canSubmit || props.isSaving"
          :loading="props.isSaving"
          class="save-trip-btn"
        />
      </form>
    </div>

    <aside class="trip-summary-sidebar">
      <div class="budget-side-card">
      <p><strong>{{ props.texts.budget }}:</strong> {{ budgetSummaryValue }}</p>
      <p><strong>{{ props.texts.totalCost }}:</strong> {{ formatMoney(totalActivityCost) }}</p>
      <p><strong>{{ props.texts.remainingBudget }}:</strong> {{ remainingBudgetSummaryValue }}</p>
      </div>
    </aside>
  </div>
</template>

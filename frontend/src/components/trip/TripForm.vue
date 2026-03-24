<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref, watch } from 'vue'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'
import { localeByLanguage, type Currency, type TripFormTexts } from '../../locales/i18n'
import { appUiContextKey } from '../../app/context'
import type { ActivityType, TripFormInitialData, TripFormSubmitPayload } from './types'
import {
  estimateTransportCost,
  fallbackCitiesByCountry,
  fallbackCountryOptions,
  getEstimatedTransportCostDetails,
  getEstimatedTransportTimingDetails,
  getGeneratedMealCostDetails,
  getGeneratedMealPlan,
  getGeneratedHotelCostDetails,
  getGeneratedHotelPlan,
  getGeneratedVisitCost,
  getGeneratedVisitCostDetails,
  getGeneratedVisitDurationMinutes,
  getGeneratedVisitName,
  getGeneratedVisitSiteCount,
  getGeneratedVisitTransferInfo,
  getPopularEnRouteStop,
  inferCountryForCity,
  isTouristHub
} from './tripEstimation'
import type { TransportMode } from './tripEstimation'
import {
  type CitySearchSuggestion,
  getAllCountries,
  getCitiesByCountry,
  getDistanceBetweenCities,
  localizeCityName,
  resolveCityTimeZone,
  searchCitiesWorldwide
} from '../../services/api/geodataApi'
import { getTrainJourney } from '../../services/api/transportApi'
import { convertAmount, isCurrency } from '../../utils/currency'

interface DayActivity {
  startTime: string
  endTime: string
  type: ActivityType
  name: string
  cost: number | null
  costDetails?: string
  estimatedCost?: boolean
  estimatedTime?: boolean
  estimatedTimeDetails?: string
  durationOverrideMinutes?: number
  startTimeNote?: string
  transportMode?: TransportMode | null
  endDayOffset?: number
  timeNote?: string
}

interface DayAccommodation {
  type: string
  checkInTime: string
  name: string
  cost: number | null
  costDetails?: string
}

interface StayPreference {
  city: string
  days: number | null
}

interface GeneratedDayPlan {
  activities: DayActivity[]
  finalReachedCity: string
  reachedCities: string[]
}

const defaultAllowedTransportModes: TransportMode[] = ['walk', 'local', 'train', 'drive', 'flight']

const DEFAULT_ACTIVITY_START_TIME = '08:00'
const DEFAULT_AUTO_ACTIVITY_START_TIME = '09:00'
const DEFAULT_HOTEL_CHECK_IN_TIME = '15:00'
const LATEST_AUTO_ACTIVITY_START_TIME = '20:30'
const DEFAULT_DAY_END_TIME = '23:30'
const LUNCH_WINDOW_START_TIME = '12:00'
const LUNCH_WINDOW_LATEST_TIME = '15:00'
const DINNER_WINDOW_START_TIME = '19:00'
const DINNER_WINDOW_LATEST_TIME = '21:30'

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

const appUiContext = inject(appUiContextKey, null)
const currentLanguage = computed(() => appUiContext?.language.value ?? 'en')

const countryOptions = ref<string[]>([...fallbackCountryOptions])
const citiesByCountry = reactive<Record<string, string[]>>({ ...fallbackCitiesByCountry })
const fetchedCountries = reactive<Record<string, boolean>>({})
const cityLoading = ref(false)
const startCitySearching = ref(false)
const startCitySuggestions = ref<CitySearchSuggestion[]>([])
const startCityInputValue = ref<string | CitySearchSuggestion>('')
const endCitySearching = ref(false)
const endCitySuggestions = ref<CitySearchSuggestion[]>([])
const segmentDistances = reactive<Record<string, number | null>>({})
const segmentLoading = reactive<Record<string, boolean>>({})
const segmentSignatures = reactive<Record<string, string>>({})
const draggingCity = ref<{ dayIndex: number; cityIndex: number } | null>(null)
const draggingActivity = ref<{ dayIndex: number; activityIndex: number } | null>(null)
const activityDropTarget = ref<{ dayIndex: number; activityIndex: number } | null>(null)
const cityLoaderVisible = ref(false)
const expandedDays = ref<Record<number, boolean>>({})
const autoFillingCities = ref(false)
const activityLoadingByDay = ref<Record<number, boolean>>({})
const skipCountryReset = ref(false)
let distanceDebounceTimer: ReturnType<typeof setTimeout> | null = null
let cityLoaderTimer: ReturnType<typeof setTimeout> | null = null
const formCurrencyCode = ref<Currency>(props.currencyCode)

const form = reactive({
  name: '',
  countries: ['France'] as string[],
  startDate: new Date(),
  numberOfDays: null as number | null,
  routeStartCity: '',
  routeEndCity: '',
  allowedTransportModes: [...defaultAllowedTransportModes] as TransportMode[],
  hotelStars: 3 as number | null,
  adults: 2 as number | null,
  children: 0 as number | null,
  rooms: 1 as number | null,
  stayPreferences: [{ city: '', days: null }] as StayPreference[],
  cityStops: [] as string[][],
  dayAccommodations: [] as DayAccommodation[],
  dayActivities: [] as DayActivity[][],
  budget: null as number | null
})

const dateFormatter = computed(() => new Intl.DateTimeFormat(localeByLanguage[currentLanguage.value]))
const allCitiesLoaded = computed(
  () => form.countries.length > 0 && form.countries.every((country) => fetchedCountries[country] === true)
)

function resolveFallbackCountryKey(country: string) {
  const normalizedCountry = country.trim().toLowerCase()
  return Object.keys(fallbackCitiesByCountry).find((key) => key.toLowerCase() === normalizedCountry) ?? country
}

function getMergedCitiesForCountry(country: string) {
  const fallbackCountryKey = resolveFallbackCountryKey(country)
  const popularCities = (fallbackCitiesByCountry[fallbackCountryKey] ?? []).map((city) =>
    localizeCityName(city, currentLanguage.value)
  )
  const allCities = citiesByCountry[country] ?? []
  const mergedCities: string[] = []
  const seen = new Set<string>()

  ;[...popularCities, ...allCities].forEach((city) => {
    const key = city.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    mergedCities.push(city)
  })

  return mergedCities
}

function getOrderedCityOptions(countries: string[]) {
  const popularCities: string[] = []
  const otherCities: string[] = []
  const seen = new Set<string>()

  countries.forEach((country) => {
    const mergedCities = getMergedCitiesForCountry(country)
    const popularCityCount = (fallbackCitiesByCountry[resolveFallbackCountryKey(country)] ?? []).length

    mergedCities.forEach((city, index) => {
      const key = city.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)

      if (index < popularCityCount) {
        popularCities.push(city)
        return
      }

      otherCities.push(city)
    })
  })

  otherCities.sort((a, b) => a.localeCompare(b))

  return [...popularCities, ...otherCities]
}

const selectedCityOptions = computed(() => getOrderedCityOptions(form.countries))

const routeCityOptions = computed(() => {
  return getOrderedCityOptions(form.countries)
})

const maxStayPreferenceRows = computed(() => {
  const dayCount = Math.max(0, Math.floor(form.numberOfDays ?? 0))
  const cityLimit = Math.max(1, routeCityOptions.value.length)
  if (dayCount > 0) return Math.max(1, Math.min(cityLimit, dayCount))
  return cityLimit
})
const canAddStayPreference = computed(
  () => form.stayPreferences.length > 0 && form.stayPreferences.length < maxStayPreferenceRows.value
)
const shouldWrapStayPreferences = computed(() => form.stayPreferences.length > 2)
const primaryStayPreferences = computed(() => form.stayPreferences.slice(0, 2))
const overflowStayPreferences = computed(() => form.stayPreferences.slice(2))

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
      displayDate: dateFormatter.value.format(date)
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

const transportModeOptions = computed(() => [
  { value: 'walk' as TransportMode, label: props.texts.transportWalk },
  { value: 'local' as TransportMode, label: props.texts.transportLocal },
  { value: 'train' as TransportMode, label: props.texts.transportTrain },
  { value: 'drive' as TransportMode, label: props.texts.transportDrive },
  { value: 'flight' as TransportMode, label: props.texts.transportFlight }
])

const accommodationTypeOptions = computed(() => [
  { value: 'hotel', label: props.texts.accommodationHotel },
  { value: 'airbnb', label: props.texts.accommodationAirbnb },
  { value: 'hostel', label: props.texts.accommodationHostel },
  { value: 'guesthouse', label: props.texts.accommodationGuesthouse },
  { value: 'couchsurfing', label: props.texts.accommodationCouchsurfing },
  { value: 'other', label: props.texts.accommodationOther }
])

watch(
  () => form.numberOfDays,
  (days) => {
    const count = days && days > 0 ? Math.floor(days) : 0
    form.cityStops = Array.from({ length: count }, (_, index) => {
      const existing = form.cityStops[index]
      return existing && existing.length ? existing.slice(0, 4) : ['']
    })
    form.dayAccommodations = Array.from({ length: count }, (_, index) => form.dayAccommodations[index] ?? createEmptyAccommodation())
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

watch(
  () => form.routeStartCity,
  (city) => {
    if (typeof startCityInputValue.value === 'string' && startCityInputValue.value === city) return
    startCityInputValue.value = city
  },
  { immediate: true }
)

watch(
  routeCityOptions,
  () => {
    const preservedPreferences = form.stayPreferences
      .map((preference) => ({
        city: preference.city.trim(),
        days: preference.days ?? null
      }))
      .filter((preference) => preference.city || preference.days !== null)
      .slice(0, maxStayPreferenceRows.value)

    const nextPreferences = preservedPreferences.length > 0
      ? preservedPreferences
      : [{ city: '', days: null }]

    if (nextPreferences.length > maxStayPreferenceRows.value) {
      form.stayPreferences = nextPreferences.slice(0, maxStayPreferenceRows.value)
      return
    }

    if (nextPreferences.length === 0) {
      form.stayPreferences = [{ city: '', days: null }]
      return
    }

    form.stayPreferences = nextPreferences
  },
  { immediate: true }
)

watch(
  maxStayPreferenceRows,
  (rowLimit) => {
    if (form.stayPreferences.length > rowLimit) {
      form.stayPreferences = form.stayPreferences.slice(0, rowLimit)
    }

    if (form.stayPreferences.length === 0) {
      form.stayPreferences = [{ city: '', days: null }]
    }
  },
  { immediate: true }
)

function addStayPreferenceRow() {
  if (form.stayPreferences.length >= maxStayPreferenceRows.value) return
  form.stayPreferences.push({
    city: '',
    days: null
  })
}

function remapCityValue(city: string) {
  return city ? localizeCityName(city, currentLanguage.value) : ''
}

function remapFormCities() {
  form.routeStartCity = remapCityValue(form.routeStartCity)
  form.routeEndCity = remapCityValue(form.routeEndCity)
  form.stayPreferences = form.stayPreferences.map((preference) => ({
    ...preference,
    city: remapCityValue(preference.city)
  }))
  form.cityStops = form.cityStops.map((dayStops) => dayStops.map((city) => remapCityValue(city)))
}

function setHotelStars(stars: number) {
  form.hotelStars = stars
}

function getOccupancyInputs() {
  return {
    adults: form.adults,
    children: form.children,
    rooms: form.rooms
  }
}

function convertNullableAmount(value: number | null | undefined, from: Currency, to: Currency) {
  if (value === null || value === undefined || !Number.isFinite(value)) return value ?? null
  return convertAmount(Number(value), from, to)
}

function convertFormCurrency(from: Currency, to: Currency) {
  if (from === to) return

  form.budget = convertNullableAmount(form.budget, from, to)
  form.dayActivities = form.dayActivities.map((activities) =>
    activities.map((activity) => ({
      ...activity,
      cost: convertNullableAmount(activity.cost, from, to)
    }))
  )
  form.dayAccommodations = form.dayAccommodations.map((accommodation) => ({
    ...accommodation,
    cost: convertNullableAmount(accommodation.cost, from, to)
  }))
  formCurrencyCode.value = to
}

function hasActiveStayPreferences() {
  return form.stayPreferences.some((preference) => preference.city.trim().length > 0)
}

function resetTripDataForCountryChange() {
  form.name = ''
  form.startDate = new Date()
  form.numberOfDays = null
  form.routeStartCity = ''
  form.routeEndCity = ''
  form.allowedTransportModes = [...defaultAllowedTransportModes]
  form.hotelStars = 3
  form.adults = 2
  form.children = 0
  form.rooms = 1
  form.stayPreferences = [{ city: '', days: null }]
  form.cityStops = []
  form.dayAccommodations = []
  form.dayActivities = []
  form.budget = null
  expandedDays.value = {}
  activityLoadingByDay.value = {}

  Object.keys(segmentDistances).forEach((key) => {
    delete segmentDistances[key]
  })
  Object.keys(segmentLoading).forEach((key) => {
    delete segmentLoading[key]
  })
  Object.keys(segmentSignatures).forEach((key) => {
    delete segmentSignatures[key]
  })
}

watch(
  () => [...form.countries],
  async (countries, previousCountries) => {
    if (cityLoaderTimer) clearTimeout(cityLoaderTimer)
    const previous = previousCountries ?? []
    const hasCountrySelectionChanged =
      previous.length > 0 &&
      (previous.length !== countries.length || previous.some((country, index) => country !== countries[index]))

    if (hasCountrySelectionChanged && !skipCountryReset.value) {
      resetTripDataForCountryChange()
    }

    const countriesToFetch = countries.filter((country) => !fetchedCountries[country])
    if (countriesToFetch.length === 0) {
      cityLoading.value = false
      cityLoaderVisible.value = false
      return
    }

    cityLoaderVisible.value = true
    cityLoading.value = true
    try {
      await Promise.all(
        countriesToFetch.map(async (country) => {
          if (fetchedCountries[country]) return
          const cities = await getCitiesByCountry(country, currentLanguage.value)
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
      cityLoaderTimer = setTimeout(() => {
        cityLoaderVisible.value = !allCitiesLoaded.value
      }, 450)
    }
  },
  { immediate: true }
)

watch(
  currentLanguage,
  async (language, previousLanguage) => {
    if (language === previousLanguage) return

    remapFormCities()

    Object.keys(citiesByCountry).forEach((country) => {
      citiesByCountry[country] = citiesByCountry[country].map((city) => localizeCityName(city, language))
    })

    const countriesToRefresh = [...form.countries]
    if (countriesToRefresh.length === 0) return

    cityLoaderVisible.value = true
    cityLoading.value = true

    try {
      await Promise.all(
        countriesToRefresh.map(async (country) => {
          fetchedCountries[country] = false
          citiesByCountry[country] = await getCitiesByCountry(country, language)
          fetchedCountries[country] = true
        })
      )
    } finally {
      cityLoading.value = false
      cityLoaderVisible.value = false
    }
  }
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
    form.cityStops.length === Math.floor(form.numberOfDays) &&
    form.cityStops.every(
      (dayStops) => {
        const selectedCities = dayStops.map((city) => city.trim()).filter((city) => city.length > 0)
        return selectedCities.length > 0
      }
    ) &&
    form.dayActivities.every((activities, dayIndex) =>
      activities.every(
        (activity, activityIndex) =>
          isValidTimeRange(dayIndex, activityIndex, activity) &&
          activity.name.trim().length > 0
      )
    )
)

const submitBlockers = computed(() => {
  const blockers: string[] = []

  if (form.countries.length === 0) blockers.push('Select at least one country.')
  if (form.startDate === null) blockers.push('Choose a start date.')
  if (form.numberOfDays === null || form.numberOfDays < 1) blockers.push('Enter at least 1 day.')
  if (!allCitiesLoaded.value) blockers.push('Wait for cities to finish loading.')

  if (form.numberOfDays !== null && form.numberOfDays >= 1) {
    if (form.cityStops.length !== Math.floor(form.numberOfDays)) {
      blockers.push('Generate or fill the city stops for each day.')
    } else if (
      !form.cityStops.every((dayStops) => {
        const selectedCities = dayStops.map((city) => city.trim()).filter((city) => city.length > 0)
        return selectedCities.length > 0
      })
    ) {
      blockers.push('Each day needs at least one valid city.')
    }
  }

  let invalidActivityMessage = ''
  form.dayActivities.some((activities, dayIndex) =>
    activities.some((activity, activityIndex) => {
      if (activity.name.trim().length === 0) {
        invalidActivityMessage = `Day ${dayIndex + 1}, activity ${activityIndex + 1}: enter a name.`
        return true
      }

      if (!isValidTimeRange(dayIndex, activityIndex, activity)) {
        invalidActivityMessage = `Day ${dayIndex + 1}, activity ${activityIndex + 1}: check the time range.`
        return true
      }

      return false
    })
  )
  if (invalidActivityMessage) blockers.push(invalidActivityMessage)

  return blockers
})

const showCountryError = computed(() => form.countries.length === 0)
const showCityLoader = computed(() => cityLoaderVisible.value)
const hasSelectedCountry = computed(() => form.countries.length > 0)
const showNumberOfDaysError = computed(
  () => hasSelectedCountry.value && (form.numberOfDays === null || form.numberOfDays < 1)
)
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
const totalAccommodationCost = computed(() =>
  form.dayAccommodations.reduce((sum, accommodation) => sum + Number(accommodation.cost ?? 0), 0)
)
const totalTripCost = computed(() => totalActivityCost.value + totalAccommodationCost.value)
const remainingBudget = computed(() => Number(form.budget ?? 0) - totalTripCost.value)
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

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function getTripDayCount(startDate: string, endDate: string, details?: TripFormInitialData['details']) {
  if (details?.dayPlans?.length) return details.dayPlans.length
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  const diffMs = end.getTime() - start.getTime()
  if (Number.isNaN(diffMs)) return 1
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
}

function createEmptyAccommodation(): DayAccommodation {
  return {
    type: '',
    checkInTime: '',
    name: '',
    cost: null,
    costDetails: ''
  }
}

function applyInitialData(initialData: TripFormInitialData | null) {
  if (!initialData) {
    formCurrencyCode.value = props.currencyCode
    form.hotelStars = 3
    form.adults = 2
    form.children = 0
    form.rooms = 1
    form.stayPreferences = [{ city: '', days: null }]
    form.dayAccommodations = []
    return
  }

  const dayCount = getTripDayCount(initialData.startDate, initialData.endDate, initialData.details)
  skipCountryReset.value = true
  form.name = initialData.name
  form.countries = initialData.countries.length ? [...initialData.countries] : ['France']
  form.startDate = parseIsoDate(initialData.startDate)
  form.numberOfDays = dayCount
  form.budget = initialData.budget
  form.allowedTransportModes = [...defaultAllowedTransportModes]
  form.stayPreferences = []

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
        cost: activity.cost,
        costDetails: '',
        estimatedCost: false,
        estimatedTime: false,
        estimatedTimeDetails: '',
        durationOverrideMinutes: undefined,
        startTimeNote: '',
        transportMode: null
      }))
    ) ?? []
  const accommodationsFromDetails =
    initialData.details?.dayPlans?.map((day) => ({
      type: day.accommodation?.type ?? '',
      checkInTime: day.accommodation?.checkInTime ?? '',
      name: day.accommodation?.name ?? '',
      cost: day.accommodation?.cost ?? null,
      costDetails: ''
    })) ?? []

  form.cityStops = Array.from({ length: dayCount }, (_, index) => cityStopsFromDetails[index] ?? [''])
  form.dayAccommodations = Array.from(
    { length: dayCount },
    (_, index) => accommodationsFromDetails[index] ?? createEmptyAccommodation()
  )
  form.dayActivities = Array.from({ length: dayCount }, (_, index) => activityFromDetails[index] ?? [])
  form.routeStartCity = cityStopsFromDetails[0]?.[0] ?? ''
  const lastDayCities = cityStopsFromDetails[cityStopsFromDetails.length - 1] ?? []
  form.routeEndCity = lastDayCities[lastDayCities.length - 1] ?? ''
  form.hotelStars = initialData.details?.hotelStars ?? 3
  form.adults = initialData.details?.adults ?? 2
  form.children = initialData.details?.children ?? 0
  form.rooms = initialData.details?.rooms ?? 1
  const storedCurrency = isCurrency(initialData.details?.currencyCode) ? initialData.details.currencyCode : props.currencyCode
  formCurrencyCode.value = storedCurrency
  convertFormCurrency(storedCurrency, props.currencyCode)
  const stayCounts: Record<string, number> = {}
  cityStopsFromDetails.forEach((dayCities) => {
    const signature = dayCities.join(' -> ')
    if (!signature) return
    const targetCity = dayCities[dayCities.length - 1] ?? dayCities[0]
    if (!targetCity) return
    stayCounts[targetCity] = (stayCounts[targetCity] ?? 0) + 1
  })
  const savedStayPreferences = Object.entries(stayCounts)
    .filter(([, days]) => days > 1)
    .map(([city, days]) => ({
      city,
      days
    }))
  form.stayPreferences = savedStayPreferences.length > 0 ? savedStayPreferences : [{ city: '', days: null }]
  skipCountryReset.value = false
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
  preferredStay: boolean
}

async function handleStartCityComplete(event: { query: string }) {
  const query = event.query.trim()
  if (query.length < 2) {
    startCitySuggestions.value = []
    return
  }

  startCitySearching.value = true
  try {
    startCitySuggestions.value = await searchCitiesWorldwide(query, currentLanguage.value)
  } catch {
    startCitySuggestions.value = []
  } finally {
    startCitySearching.value = false
  }
}

async function handleEndCityComplete(event: { query: string }) {
  const query = event.query.trim()
  if (query.length < 2) {
    endCitySuggestions.value = []
    return
  }

  endCitySearching.value = true
  try {
    endCitySuggestions.value = await searchCitiesWorldwide(query, currentLanguage.value)
  } catch {
    endCitySuggestions.value = []
  } finally {
    endCitySearching.value = false
  }
}

function normalizeCityInput(value: string | CitySearchSuggestion | null) {
  if (typeof value === 'string') return value
  return value?.name ?? ''
}

function handleStartCityInput(value: string | CitySearchSuggestion | null) {
  startCityInputValue.value = value ?? ''
  form.routeStartCity = normalizeCityInput(value)
}

function handleStartCitySelect(event: { value: CitySearchSuggestion }) {
  form.routeStartCity = event.value.name
  startCityInputValue.value = event.value
}

function handleEndCityInput(value: string | CitySearchSuggestion | null) {
  form.routeEndCity = normalizeCityInput(value)
}

function handleStayPreferenceCityInput(preference: StayPreference, value: string | CitySearchSuggestion | null) {
  preference.city = normalizeCityInput(value)
}

function isCityInSelectedCountries(city: string) {
  const normalizedCity = city.trim().toLowerCase()
  if (!normalizedCity) return false

  return form.countries.some((country) => {
    const mergedCities = getMergedCitiesForCountry(country)
    return mergedCities.some((candidate) => candidate.trim().toLowerCase() === normalizedCity)
  })
}

function getCityCandidates() {
  const candidates: CityCandidate[] = []
  const seen = new Set<string>()
  const dayCount = Math.max(1, Math.floor(form.numberOfDays ?? 0))
  const perCountryLimit = Math.max(4, Math.min(8, dayCount + 2))
  const preferredStayCities = form.stayPreferences
    .map((preference) => preference.city.trim())
    .filter((city) => city.length > 0)

  form.countries.forEach((country, countryOrder) => {
    const availableCities = citiesByCountry[country] ?? []
    const popularCities = fallbackCitiesByCountry[country] ?? []
    const curatedPopularCities =
      popularCities.length > 0
        ? popularCities
        : availableCities.slice(0, perCountryLimit)
    const orderedCities = curatedPopularCities
      .filter((city) => availableCities.length === 0 || availableCities.includes(city))
      .slice(0, perCountryLimit)

    orderedCities.forEach((city, index) => {
      const key = city.toLowerCase()
      if (seen.has(key)) return
      seen.add(key)
      candidates.push({
        name: city,
        country,
        popularityRank: index < popularCities.length && popularCities.includes(city) ? index : popularCities.length + index,
        countryOrder,
        preferredStay: false
      })
    })
  })

  preferredStayCities.forEach((city) => {
    const key = city.toLowerCase()
    const countryOrder = form.countries.findIndex((country) => (citiesByCountry[country] ?? []).includes(city))
    if (seen.has(key)) {
      const existingCandidate = candidates.find((candidate) => candidate.name.toLowerCase() === key)
      if (existingCandidate) {
        existingCandidate.preferredStay = true
        existingCandidate.popularityRank = Math.min(existingCandidate.popularityRank, -1)
      }
      return
    }

    seen.add(key)
    candidates.push({
      name: city,
      country: form.countries[Math.max(0, countryOrder)] ?? form.countries[0] ?? 'France',
      popularityRank: -1,
      countryOrder: countryOrder >= 0 ? countryOrder : 0,
      preferredStay: true
    })
  })

  const startCity = form.routeStartCity.trim()
  const endCity = form.routeEndCity.trim()
  const isRoundTrip = startCity.length > 0 && startCity === endCity

  ;[startCity, endCity].forEach((city) => {
    const trimmedCity = city.trim()
    if (!trimmedCity) return
    if (isRoundTrip && !isCityInSelectedCountries(trimmedCity)) return
    const key = trimmedCity.toLowerCase()
    if (seen.has(key)) {
      const existingCandidate = candidates.find((candidate) => candidate.name.toLowerCase() === key)
      if (existingCandidate) {
        existingCandidate.popularityRank = Math.min(existingCandidate.popularityRank, 0)
      }
      return
    }
    seen.add(key)
    candidates.push({
      name: trimmedCity,
      country: form.countries[0] ?? 'France',
      popularityRank: 0,
      countryOrder: 0,
      preferredStay: false
    })
  })

  return candidates
    .sort((left, right) => {
      if (left.preferredStay !== right.preferredStay) return left.preferredStay ? -1 : 1
      if (left.popularityRank !== right.popularityRank) return left.popularityRank - right.popularityRank
      if (left.countryOrder !== right.countryOrder) return left.countryOrder - right.countryOrder
      return left.name.localeCompare(right.name)
    })
    .slice(0, Math.max(dayCount + 3, form.countries.length * 4))
}

async function getOrderedRoute(candidates: CityCandidate[]) {
  if (candidates.length <= 1) return candidates

  const remaining = [...candidates].sort((left, right) => {
    if (left.preferredStay !== right.preferredStay) return left.preferredStay ? -1 : 1
    if (left.popularityRank !== right.popularityRank) return left.popularityRank - right.popularityRank
    if (left.countryOrder !== right.countryOrder) return left.countryOrder - right.countryOrder
    return left.name.localeCompare(right.name)
  })
  const startKey = form.routeStartCity.trim().toLowerCase()
  const endKey = form.routeEndCity.trim().toLowerCase()
  const startIndex = startKey ? remaining.findIndex((candidate) => candidate.name.toLowerCase() === startKey) : -1
  const startCandidate = startIndex >= 0 ? remaining.splice(startIndex, 1)[0] : (remaining.shift() as CityCandidate)
  const shortRoundTrip = dayCountForRouteFilter() <= 3 && startKey.length > 0 && startKey === endKey
  const filteredRemaining = shortRoundTrip
    ? await filterCandidatesForShortRoundTrip(startCandidate, remaining)
    : remaining
  const route: CityCandidate[] = [startCandidate]
  const endCandidate =
    endKey && endKey !== startCandidate.name.toLowerCase()
      ? filteredRemaining.find((candidate) => candidate.name.toLowerCase() === endKey) ?? null
      : null

  while (filteredRemaining.length > 0) {
    if (
      endCandidate &&
      filteredRemaining.length === 1 &&
      filteredRemaining[0].name.toLowerCase() === endCandidate.name.toLowerCase()
    ) {
      route.push(filteredRemaining.shift() as CityCandidate)
      break
    }

    const current = route[route.length - 1]
    const scored = await Promise.all(
      filteredRemaining
        .filter(
          (candidate) =>
            !endCandidate ||
            candidate.name.toLowerCase() !== endCandidate.name.toLowerCase() ||
            filteredRemaining.length === 1
        )
        .map(async (candidate) => {
        const distance = await getDistanceBetweenCities(current.name, candidate.name, form.countries, currentLanguage.value)

          return {
            candidate,
            distance
          }
        })
    )

    scored.sort((left, right) => {
      if (left.candidate.popularityRank !== right.candidate.popularityRank) {
        return left.candidate.popularityRank - right.candidate.popularityRank
      }
      if (left.candidate.countryOrder !== right.candidate.countryOrder) {
        return left.candidate.countryOrder - right.candidate.countryOrder
      }
      if ((left.distance ?? Number.MAX_SAFE_INTEGER) !== (right.distance ?? Number.MAX_SAFE_INTEGER)) {
        return (left.distance ?? Number.MAX_SAFE_INTEGER) - (right.distance ?? Number.MAX_SAFE_INTEGER)
      }
      return left.candidate.name.localeCompare(right.candidate.name)
    })

    const next = scored[0]?.candidate
    if (!next) break

    route.push(next)
    const nextIndex = filteredRemaining.findIndex((candidate) => candidate.name === next.name)
    if (nextIndex >= 0) filteredRemaining.splice(nextIndex, 1)
  }

  return route
}

function dayCountForRouteFilter() {
  return Math.max(1, Math.floor(form.numberOfDays ?? 0))
}

async function filterCandidatesForShortRoundTrip(startCandidate: CityCandidate, candidates: CityCandidate[]) {
  const preferredCandidates = candidates.filter((candidate) => candidate.preferredStay)
  const optionalCandidates = candidates.filter((candidate) => !candidate.preferredStay)
  const nearbyOptionalCandidates: CityCandidate[] = []

  for (const candidate of optionalCandidates) {
    const distanceFromStart = await getDistanceBetweenCities(
      startCandidate.name,
      candidate.name,
      form.countries,
      currentLanguage.value
    )

    if (distanceFromStart !== null && distanceFromStart <= 260) {
      nearbyOptionalCandidates.push(candidate)
    }
  }

  return [...preferredCandidates, ...nearbyOptionalCandidates]
}

function getTransportModeForDistance(distance: number | null): TransportMode {
  if (distance === null) return 'unknown'
  if (distance <= 25) return 'walk'
  if (distance <= 80) return 'local'
  if (distance <= 250) return 'train'
  if (distance <= 450) return 'drive'
  return 'flight'
}

function getAllowedTransportModeForDistance(distance: number | null): TransportMode {
  const inferredMode = getTransportModeForDistance(distance)
  if (inferredMode === 'unknown') return inferredMode

  const allowedModes = form.allowedTransportModes.length > 0 ? form.allowedTransportModes : defaultAllowedTransportModes
  if (allowedModes.includes(inferredMode)) return inferredMode

  const fallbackOrder: TransportMode[] =
    distance === null
      ? ['train', 'drive', 'local', 'flight', 'walk']
      : distance <= 25
        ? ['walk', 'local', 'train', 'drive', 'flight']
        : distance <= 80
          ? ['local', 'train', 'drive', 'walk', 'flight']
          : distance <= 250
            ? ['train', 'drive', 'local', 'flight', 'walk']
            : distance <= 450
              ? ['drive', 'train', 'flight', 'local', 'walk']
              : ['flight', 'train', 'drive', 'local', 'walk']

  return fallbackOrder.find((mode) => allowedModes.includes(mode)) ?? inferredMode
}

function canGroupCitiesInSameDay(distance: number | null, transportMode: TransportMode) {
  if (distance === null) return false
  return transportMode === 'walk' || transportMode === 'local' || transportMode === 'train'
}

function getPreferredStayDaysByCity() {
  const preferredDays = new Map<string, number>()

  if (!hasActiveStayPreferences()) {
    return preferredDays
  }

  form.stayPreferences.forEach((preference) => {
    const city = preference.city.trim()
    if (!city) return

    const days = Math.max(1, Math.floor(preference.days ?? 1))
    preferredDays.set(city, days)
  })

  return preferredDays
}

function getExplicitStayDayPlan(dayCount: number) {
  const plannedDays: string[] = []

  form.stayPreferences.forEach((preference) => {
    const city = preference.city.trim()
    if (!city) return

    const days = Math.max(1, Math.floor(preference.days ?? 1))
    for (let index = 0; index < days && plannedDays.length < dayCount; index += 1) {
      plannedDays.push(city)
    }
  })

  return plannedDays
}

function buildDayStopsFromPlannedDays(plannedDays: string[], dayCount: number) {
  return Array.from({ length: dayCount }, (_, dayIndex) => {
    const currentCity = plannedDays[dayIndex] ?? plannedDays[plannedDays.length - 1] ?? ''
    if (dayIndex === 0) return [currentCity]

    const previousCity = plannedDays[dayIndex - 1] ?? currentCity
    return previousCity === currentCity ? [currentCity] : [previousCity, currentCity]
  })
}

function buildStayFocusedCityStops(orderedRoute: CityCandidate[], dayCount: number) {
  const routeNames = orderedRoute.map((city) => city.name)
  if (routeNames.length === 0) {
    return Array.from({ length: dayCount }, () => [''])
  }

  const plannedDays = [...routeNames]
  let remainingExtraDays = Math.max(0, dayCount - plannedDays.length)
  const preferredStayDaysByCity = getPreferredStayDaysByCity()

  orderedRoute.forEach((city) => {
    let extraPreferredDays = Math.max(0, (preferredStayDaysByCity.get(city.name) ?? 1) - 1)
    while (extraPreferredDays > 0 && remainingExtraDays > 0) {
      const insertAfterIndex = plannedDays.lastIndexOf(city.name)
      plannedDays.splice(insertAfterIndex + 1, 0, city.name)
      remainingExtraDays -= 1
      extraPreferredDays -= 1
    }
  })

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
    const insertAfterIndex = plannedDays.lastIndexOf(target.city.name)
    plannedDays.splice(insertAfterIndex >= 0 ? insertAfterIndex + 1 : plannedDays.length, 0, target.city.name)
    remainingExtraDays -= 1
    cursor += 1
  }

  return buildDayStopsFromPlannedDays(plannedDays, dayCount)
}

async function buildAutoFilledCityStops(orderedRoute: CityCandidate[], dayCount: number) {
  const startCity = form.routeStartCity.trim()
  const endCity = form.routeEndCity.trim()
  const shortRoundTripDestination =
    dayCount === 2 && startCity && endCity && startCity === endCity
      ? orderedRoute.find((city) => city.name !== startCity)?.name ?? ''
      : ''

  if (shortRoundTripDestination) {
    return [
      [startCity, shortRoundTripDestination],
      [shortRoundTripDestination, endCity]
    ]
  }

  const explicitStayPlan = getExplicitStayDayPlan(dayCount)
  if (explicitStayPlan.length >= dayCount) {
    return buildDayStopsFromPlannedDays(explicitStayPlan, dayCount)
  }

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
      const distance = await getDistanceBetweenCities(currentRouteCity.name, nextCity.name, form.countries, currentLanguage.value)
      const transportMode = getAllowedTransportModeForDistance(distance)
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

function insertPopularEnRouteStops(dayStops: string[][]) {
  const usedStops = new Set<string>()

  return dayStops.map((dayCities) => {
    const normalizedDayCities = [...dayCities]
    let cityIndex = 0

    while (cityIndex < normalizedDayCities.length - 1 && normalizedDayCities.length < 4) {
      const fromCity = normalizedDayCities[cityIndex]
      const toCity = normalizedDayCities[cityIndex + 1]
      const enRouteStop = getPopularEnRouteStop(fromCity, toCity)
      const stopKey = enRouteStop ? `${enRouteStop.city}|${enRouteStop.site}`.toLowerCase() : ''

      if (
        enRouteStop &&
        !usedStops.has(stopKey) &&
        !normalizedDayCities.some((city) => city.toLowerCase() === enRouteStop.city.toLowerCase())
      ) {
        normalizedDayCities.splice(cityIndex + 1, 0, enRouteStop.city)
        usedStops.add(stopKey)
        cityIndex += 1
      }

      cityIndex += 1
    }

    return normalizedDayCities
  })
}

function applySelectedRouteEndpoints(dayStops: string[][]) {
  if (dayStops.length === 0) return dayStops

  const normalized = dayStops.map((stops) => [...stops])
  const startCity = form.routeStartCity.trim()
  const endCity = form.routeEndCity.trim()

  if (startCity) {
    normalized[0] = normalized[0]?.length ? [...normalized[0]] : ['']
    const existingStartIndex = normalized[0].findIndex((city) => city.trim() === startCity)
    if (existingStartIndex > 0) {
      normalized[0].splice(existingStartIndex, 1)
    }

    if (normalized[0][0]?.trim() !== startCity) {
      if (normalized[0][0]?.trim().length) {
        normalized[0].unshift(startCity)
      } else {
        normalized[0][0] = startCity
      }
    }

    normalized[0] = normalized[0].filter((city) => city.trim().length > 0).slice(0, 4)
  }

  if (endCity) {
    const lastDayIndex = normalized.length - 1
    const lastDayStops = normalized[lastDayIndex]?.length ? [...normalized[lastDayIndex]] : ['']
    const existingEndIndex = lastDayStops.findIndex((city) => city.trim() === endCity)
    if (existingEndIndex >= 0 && existingEndIndex < lastDayStops.length - 1) {
      lastDayStops.splice(existingEndIndex, 1)
    }

    const lastStopIndex = Math.max(0, lastDayStops.length - 1)
    if (lastDayStops[lastStopIndex]?.trim() !== endCity) {
      if (lastDayStops[lastStopIndex]?.trim().length) {
        lastDayStops.push(endCity)
      } else {
        lastDayStops[lastStopIndex] = endCity
      }
    }

    normalized[lastDayIndex] = lastDayStops.filter((city) => city.trim().length > 0).slice(-4)
  }

  for (let dayIndex = 1; dayIndex < normalized.length; dayIndex += 1) {
    const previousStops = normalized[dayIndex - 1] ?? []
    const currentStops = normalized[dayIndex] ?? []
    const previousEndCity = previousStops[previousStops.length - 1]?.trim()

    if (!previousEndCity || currentStops.length === 0) continue

    if (currentStops.length === 1) {
      normalized[dayIndex] = [currentStops[0]]
      continue
    }

    normalized[dayIndex][0] = previousEndCity
  }

  return normalized
}

function getPrimaryVisitCityForDay(dayIndex: number, cities: string[]) {
  if (cities.length === 0) return ''

  const startCity = form.routeStartCity.trim()
  const endCity = form.routeEndCity.trim()
  const isRoundTrip = startCity && endCity && startCity === endCity

  if (isRoundTrip) {
    const preferredStayCity = form.stayPreferences
      .map((preference) => preference.city.trim())
      .find((city) => city.length > 0 && city !== startCity && cities.includes(city))

    if (preferredStayCity) {
      return preferredStayCity
    }

    const roundTripDestination = cities.find((city) => city !== startCity)
    if (roundTripDestination) {
      return roundTripDestination
    }
  }

  return cities[cities.length - 1]
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

function toIsoDateTime(date: string, time: string) {
  return `${date}T${time}:00`
}

function addDaysToIsoDate(date: string, dayOffset: number) {
  const nextDate = new Date(`${date}T00:00:00`)
  nextDate.setDate(nextDate.getDate() + dayOffset)
  return toIsoDate(nextDate)
}

function getTimeZoneOffsetMinutes(timeZone: string, date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  const zonePart = formatter.formatToParts(date).find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  if (zonePart === 'GMT' || zonePart === 'UTC') return 0

  const match = zonePart.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
  if (!match) return 0

  const sign = match[1] === '-' ? -1 : 1
  const hours = Number(match[2] ?? '0')
  const minutes = Number(match[3] ?? '0')
  return sign * (hours * 60 + minutes)
}

function formatTimeZoneLabel(timeZone: string) {
  const parts = timeZone.split('/')
  return parts[parts.length - 1]?.replace(/_/g, ' ') ?? timeZone
}

function buildLocalTimeNote(label: 'Start time' | 'End time', city: string, timeZone: string, dayOffset = 0) {
  const country = inferCountryForCity(city, form.countries[0])
  const suffix = dayOffset > 0 ? ` (+${dayOffset} day${dayOffset > 1 ? 's' : ''})` : ''
  return `${country} local time${suffix}.`
}

async function getArrivalTimeInfo(
  fromCity: string,
  toCity: string,
  departureDate: string,
  departureMinutes: number,
  durationMinutes: number
) {
  const [fromTimeZone, toTimeZone] = await Promise.all([
    resolveCityTimeZone(fromCity, form.countries, currentLanguage.value),
    resolveCityTimeZone(toCity, form.countries, currentLanguage.value)
  ])

  if (!fromTimeZone || !toTimeZone) {
    return {
      endTime: minutesToTime(departureMinutes + durationMinutes),
      endDayOffset: Math.floor((departureMinutes + durationMinutes) / (24 * 60)),
      startTimeNote: '',
      timeNote: ''
    }
  }

  const departureDateTime = new Date(`${departureDate}T00:00:00`)
  departureDateTime.setMinutes(departureMinutes)

  const departureOffsetMinutes = getTimeZoneOffsetMinutes(fromTimeZone, departureDateTime)
  const departureUtcMs = departureDateTime.getTime() - departureOffsetMinutes * 60_000
  const arrivalUtcDate = new Date(departureUtcMs + durationMinutes * 60_000)
  const arrivalOffsetMinutes = getTimeZoneOffsetMinutes(toTimeZone, arrivalUtcDate)
  const arrivalLocalDate = new Date(arrivalUtcDate.getTime() + arrivalOffsetMinutes * 60_000)

  const arrivalHours = arrivalLocalDate.getUTCHours()
  const arrivalMinutes = arrivalLocalDate.getUTCMinutes()
  const endTime = `${`${arrivalHours}`.padStart(2, '0')}:${`${arrivalMinutes}`.padStart(2, '0')}`
  const departureLocalDayIndex = Math.floor(departureMinutes / (24 * 60))
  const departureCalendarDate = new Date(`${departureDate}T00:00:00`)
  const arrivalCalendarDate = new Date(Date.UTC(
    arrivalLocalDate.getUTCFullYear(),
    arrivalLocalDate.getUTCMonth(),
    arrivalLocalDate.getUTCDate()
  ))
  const endDayOffset = Math.max(
    0,
    Math.round((arrivalCalendarDate.getTime() - departureCalendarDate.getTime()) / (24 * 60 * 60 * 1000)) - departureLocalDayIndex
  )
  const hasTimeZoneChange = fromTimeZone !== toTimeZone

  return {
    endTime,
    endDayOffset,
    startTimeNote: hasTimeZoneChange ? buildLocalTimeNote('Start time', fromCity, fromTimeZone) : '',
    timeNote: hasTimeZoneChange ? buildLocalTimeNote('End time', toCity, toTimeZone, endDayOffset) : ''
  }
}
function formatApiTime(value: string | null | undefined) {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return `${`${parsed.getHours()}`.padStart(2, '0')}:${`${parsed.getMinutes()}`.padStart(2, '0')}`
}

function addGeneratedActivity(
  activities: DayActivity[],
  startMinutes: number,
  durationMinutes: number,
  type: ActivityType,
  name: string
) {
  const dayEndMinutes = timeToMinutes(DEFAULT_DAY_END_TIME)
  if (startMinutes >= dayEndMinutes) {
    return dayEndMinutes
  }

  const startTime = minutesToTime(startMinutes)
  const endTime = minutesToTime(Math.min(startMinutes + durationMinutes, dayEndMinutes))
  activities.push({
    startTime,
    endTime,
    type,
    name,
    cost: 0,
    costDetails: '',
    estimatedCost: false,
    estimatedTime: false,
    estimatedTimeDetails: '',
    durationOverrideMinutes: undefined,
    startTimeNote: '',
    transportMode: null,
    endDayOffset: 0,
    timeNote: ''
  })

  return startMinutes + durationMinutes
}

function formatVisitName(city: string, visitIndex: number) {
  const name = getGeneratedVisitName(city, visitIndex)
  const transfer = getGeneratedVisitTransferInfo(city, visitIndex)
  if (!transfer) return name

  const transportLabel =
    transfer.mode === 'walk'
      ? props.texts.transportWalk
      : transfer.mode === 'local'
        ? props.texts.transportLocal
        : props.texts.transportDrive

  return `${name} (${transportLabel} ${transfer.durationMinutes} min)`
}

function getTransportDurationMinutes(mode: TransportMode, distance: number | null) {
  if (distance === null) {
    if (mode === 'walk') return 25
    if (mode === 'local') return 45
    if (mode === 'train') return 120
    if (mode === 'drive') return 180
    if (mode === 'flight') return 300
    return 120
  }

  const roundedDuration = (minutes: number) => Math.max(15, Math.ceil(minutes / 5) * 5)

  if (mode === 'walk') {
    return roundedDuration(Math.min(120, 10 + (distance / 4.5) * 60))
  }

  if (mode === 'local') {
    return roundedDuration(20 + (distance / 28) * 60)
  }

  if (mode === 'train') {
    return roundedDuration(25 + (distance / 95) * 60)
  }

  if (mode === 'drive') {
    return roundedDuration(20 + (distance / 70) * 60)
  }

  if (mode === 'flight') {
    return roundedDuration(120 + (distance / 700) * 60)
  }

  if (distance <= 120) return roundedDuration(30 + (distance / 45) * 60)
  return roundedDuration(60 + (distance / 80) * 60)
}

function getLikelyFlightSchedule(
  fromCity: string,
  toCity: string,
  distance: number | null,
  currentMinutes: number,
  travelDate?: string
) {
  const roundedDuration = (minutes: number) => Math.max(60, Math.ceil(minutes / 5) * 5)
  const roundedDeparture = (minutes: number) => Math.ceil(minutes / 5) * 5
  const normalizedDistance = Math.max(0, distance ?? 0)
  const europeCountries = new Set(['France', 'United Kingdom', 'Italy', 'Spain', 'Germany'])
  const fromCountry = inferCountryForCity(fromCity, form.countries[0])
  const toCountry = inferCountryForCity(toCity, form.countries[0])
  const weekday = travelDate ? new Date(`${travelDate}T12:00:00`).getDay() : 3
  const weekendBias = weekday === 5 || weekday === 6 || weekday === 0
  const threshold = Math.max(currentMinutes + 45, 5 * 60)

  let preferredDepartureMinutes = 10 * 60 + 15
  let durationMinutes = getTransportDurationMinutes('flight', distance)

  const isEuropeChinaRoute =
    (fromCountry === 'China' && europeCountries.has(toCountry)) ||
    (toCountry === 'China' && europeCountries.has(fromCountry))

  const isEuropeNorthAmericaRoute =
    (fromCountry === 'United States' && europeCountries.has(toCountry)) ||
    (toCountry === 'United States' && europeCountries.has(fromCountry))

  if (isEuropeChinaRoute) {
    if (fromCountry === 'China') {
      preferredDepartureMinutes = 16 * 60 + 10
      durationMinutes = roundedDuration(normalizedDistance >= 7600 ? 11 * 60 + 35 : 12 * 60 + 20)
    } else {
      preferredDepartureMinutes = 13 * 60 + 35
      durationMinutes = roundedDuration(normalizedDistance >= 7600 ? 12 * 60 + 45 : 13 * 60 + 20)
    }
  } else if (isEuropeNorthAmericaRoute) {
    preferredDepartureMinutes = fromCountry === 'United States' ? 14 * 60 + 20 : 13 * 60 + 40
    durationMinutes = roundedDuration(normalizedDistance >= 5500 ? 8 * 60 + 40 : 7 * 60 + 35)
  } else if (europeCountries.has(fromCountry) && europeCountries.has(toCountry)) {
    preferredDepartureMinutes = 11 * 60 + 25
    durationMinutes = roundedDuration(Math.max(85, 55 + normalizedDistance / 11))
  } else if (normalizedDistance >= 6500) {
    preferredDepartureMinutes = 14 * 60 + 10
    durationMinutes = roundedDuration(Math.max(durationMinutes + 120, 14 * 60 + 30))
  }

  if (weekendBias) {
    preferredDepartureMinutes += 10
  }

  const departureMinutes = preferredDepartureMinutes >= threshold
    ? preferredDepartureMinutes
    : roundedDeparture(threshold)

  return {
    departureMinutes,
    durationMinutes
  }
}
async function buildAutoActivities(dayStops: string[][]) {
  const dayPlans: GeneratedDayPlan[] = []
  const visitCountsByCity: Record<string, number> = {}
  const mealCountsByCity: Record<string, number> = {}
  const lunchWindowStartMinutes = timeToMinutes(LUNCH_WINDOW_START_TIME)
  const lunchWindowLatestMinutes = timeToMinutes(LUNCH_WINDOW_LATEST_TIME)
  const dinnerWindowStartMinutes = timeToMinutes(DINNER_WINDOW_START_TIME)
  const dinnerWindowLatestMinutes = timeToMinutes(DINNER_WINDOW_LATEST_TIME)

  for (let dayIndex = 0; dayIndex < dayStops.length; dayIndex += 1) {
    const cities = dayStops[dayIndex].map((city) => city.trim()).filter((city) => city.length > 0)
    const activities: DayActivity[] = []
    const primaryVisitCity = getPrimaryVisitCityForDay(dayIndex, cities)
    let finalReachedCity = cities[0] ?? ''
    const reachedCities = finalReachedCity ? [finalReachedCity] : []
    let currentMinutes = timeToMinutes(DEFAULT_AUTO_ACTIVITY_START_TIME)
    const dayEndMinutes = timeToMinutes(DEFAULT_DAY_END_TIME)
    let lunchAdded = false
    let dinnerAdded = false

    if (cities.length === 0) {
      dayPlans.push({
        activities: [],
        finalReachedCity: '',
        reachedCities: []
      })
      continue
    }

    const addMealInWindow = (
      city: string,
      preferredStartMinutes: number,
      latestStartMinutes: number
    ) => {
      const scheduledStartMinutes =
        currentMinutes < preferredStartMinutes ? preferredStartMinutes : currentMinutes

      if (scheduledStartMinutes > latestStartMinutes || scheduledStartMinutes >= dayEndMinutes) {
        return
      }

      const mealIndex = mealCountsByCity[city] ?? 0
      const mealPlan = getGeneratedMealPlan(city, mealIndex, form.countries[0], getOccupancyInputs(), props.currencyCode)
      currentMinutes = addGeneratedActivity(
        activities,
        scheduledStartMinutes,
        60,
        'meal',
        mealPlan.name
      )
      activities[activities.length - 1].cost = mealPlan.cost
      activities[activities.length - 1].costDetails = getGeneratedMealCostDetails(
        city,
        mealIndex,
        form.countries[0],
        getOccupancyInputs()
      )
      activities[activities.length - 1].estimatedCost = true
      mealCountsByCity[city] = mealIndex + 1
      currentMinutes = Math.min(dayEndMinutes, currentMinutes + 30)
    }

    const maybeAddPendingMeals = (city: string) => {
      if (!lunchAdded && currentMinutes >= lunchWindowStartMinutes && currentMinutes <= lunchWindowLatestMinutes) {
        addMealInWindow(city, lunchWindowStartMinutes, lunchWindowLatestMinutes)
        lunchAdded = true
      }

      if (!dinnerAdded && currentMinutes >= dinnerWindowStartMinutes && currentMinutes <= dinnerWindowLatestMinutes) {
        addMealInWindow(city, dinnerWindowStartMinutes, dinnerWindowLatestMinutes)
        dinnerAdded = true
      }
    }

    const maybeAddAfternoonVisit = (city: string) => {
      if (
        !lunchAdded ||
        dinnerAdded ||
        currentMinutes >= dinnerWindowStartMinutes ||
        currentMinutes >= timeToMinutes(LATEST_AUTO_ACTIVITY_START_TIME)
      ) {
        return
      }

      const visitIndex = visitCountsByCity[city] ?? 0
      const visitDurationMinutes = getGeneratedVisitDurationMinutes(city, visitIndex)
      const afternoonStartMinutes = Math.max(currentMinutes, timeToMinutes('15:00'))
      const latestAfternoonStartMinutes = dinnerWindowStartMinutes - visitDurationMinutes - 30

      if (afternoonStartMinutes > latestAfternoonStartMinutes) {
        return
      }

      currentMinutes = addGeneratedActivity(
        activities,
        afternoonStartMinutes,
        visitDurationMinutes,
        'visit',
        formatVisitName(city, visitIndex)
      )
      activities[activities.length - 1].cost = getGeneratedVisitCost(
        city,
        visitIndex,
        itineraryDays.value[dayIndex]?.isoDate,
        getOccupancyInputs(),
        props.currencyCode
      )
      activities[activities.length - 1].costDetails = getGeneratedVisitCostDetails(
        city,
        visitIndex,
        itineraryDays.value[dayIndex]?.isoDate,
        formatMoney,
        getOccupancyInputs(),
        props.currencyCode
      )
      activities[activities.length - 1].estimatedCost = true
      visitCountsByCity[city] = visitIndex + getGeneratedVisitSiteCount(city, visitIndex)
      currentMinutes = Math.min(dayEndMinutes, currentMinutes + 30)
    }

    for (let cityIndex = 0; cityIndex < cities.length; cityIndex += 1) {
      const city = cities[cityIndex]
      maybeAddPendingMeals(city)
      const previousDayFinalCity =
        dayIndex > 0
          ? dayStops[dayIndex - 1]
              ?.map((previousCity) => previousCity.trim())
              .filter((previousCity) => previousCity.length > 0)
              .slice(-1)[0] ?? ''
          : ''
      const isCarryOverDepartureCity =
        dayIndex > 0 &&
        cityIndex === 0 &&
        cities.length > 1 &&
        previousDayFinalCity.length > 0 &&
        previousDayFinalCity === city &&
        city !== primaryVisitCity

      const shouldPrioritizeLaterCityVisit =
        primaryVisitCity.length > 0 &&
        city !== primaryVisitCity &&
        cities.includes(primaryVisitCity) &&
        cityIndex < cities.indexOf(primaryVisitCity)

      if (
        !isCarryOverDepartureCity &&
        !shouldPrioritizeLaterCityVisit &&
        currentMinutes < timeToMinutes(LATEST_AUTO_ACTIVITY_START_TIME)
      ) {
        const visitIndex = visitCountsByCity[city] ?? 0
        currentMinutes = addGeneratedActivity(
          activities,
          currentMinutes,
          getGeneratedVisitDurationMinutes(city, visitIndex),
          'visit',
          formatVisitName(city, visitIndex)
        )
        activities[activities.length - 1].cost = getGeneratedVisitCost(
          city,
          visitIndex,
          itineraryDays.value[dayIndex]?.isoDate,
          getOccupancyInputs(),
          props.currencyCode
        )
        activities[activities.length - 1].costDetails = getGeneratedVisitCostDetails(
          city,
          visitIndex,
          itineraryDays.value[dayIndex]?.isoDate,
          formatMoney,
          getOccupancyInputs(),
          props.currencyCode
        )
        activities[activities.length - 1].estimatedCost = true
        visitCountsByCity[city] = visitIndex + getGeneratedVisitSiteCount(city, visitIndex)

        currentMinutes += 30
      }

      maybeAddPendingMeals(city)
      maybeAddAfternoonVisit(city)

      if (cityIndex < cities.length - 1) {
        const nextCity = cities[cityIndex + 1]
        const startCity = form.routeStartCity.trim()
        const endCity = form.routeEndCity.trim()
        const shouldDelayReturnToHomeCity =
          startCity &&
          endCity &&
          startCity === endCity &&
          city === primaryVisitCity &&
          nextCity === endCity &&
          currentMinutes < timeToMinutes('14:00')

        if (shouldDelayReturnToHomeCity) {
          currentMinutes = timeToMinutes('14:00')
          maybeAddPendingMeals(city)
        }

        const distance = await getDistanceBetweenCities(city, nextCity, form.countries, currentLanguage.value)
        const transportMode = getAllowedTransportModeForDistance(distance)
        let transportStartMinutes = currentMinutes
        let transportEndMinutes = currentMinutes + getTransportDurationMinutes(transportMode, distance)

        if (transportMode === 'flight') {
          const flightSchedule = getLikelyFlightSchedule(
            city,
            nextCity,
            distance,
            currentMinutes,
            itineraryDays.value[dayIndex]?.isoDate
          )
          transportStartMinutes = flightSchedule.departureMinutes
          transportEndMinutes = transportStartMinutes + flightSchedule.durationMinutes
        }
        let estimatedTime = true
        let hasRealTransportPrice = false
        let endDayOffset = 0
        let startTimeNote = ''
        let timeNote = ''
        let transportCost = estimateTransportCost(
          transportMode,
          distance,
          city,
          nextCity,
          form.countries[0],
          itineraryDays.value[dayIndex]?.isoDate,
          null,
          getOccupancyInputs(),
          props.currencyCode
        )
        let transportCostDetails = getEstimatedTransportCostDetails(
          transportMode,
          distance,
          city,
          nextCity,
          form.countries[0],
          formatMoney,
          itineraryDays.value[dayIndex]?.isoDate,
          null,
          getOccupancyInputs(),
          props.currencyCode
        )
        let transportDetail =
          transportMode === 'unknown'
            ? `${city} -> ${nextCity}`
            : `${transportMode} - ${city} -> ${nextCity}`
        let estimatedTimeDetails = getEstimatedTransportTimingDetails(
          transportMode,
          distance,
          city,
          nextCity,
          form.countries[0],
          itineraryDays.value[dayIndex]?.isoDate
        )

        if (transportMode === 'train' && itineraryDays.value[dayIndex]) {
          const journey = await getTrainJourney(
            city,
            nextCity,
            toIsoDateTime(itineraryDays.value[dayIndex].isoDate, minutesToTime(currentMinutes))
          )

          const apiStart = formatApiTime(journey?.departureDateTime)
          const apiEnd = formatApiTime(journey?.arrivalDateTime)
          if (apiStart) {
            transportStartMinutes = timeToMinutes(apiStart)
          }

          if (apiEnd) {
            transportEndMinutes = timeToMinutes(apiEnd)
          } else if (journey?.durationSeconds) {
            transportEndMinutes = transportStartMinutes + Math.max(1, Math.round(journey.durationSeconds / 60))
          }

          if (apiStart && apiEnd) {
            estimatedTime = false
          }

          const reference = journey?.trainReference?.trim() || journey?.trainLabel?.trim()
          if (reference) {
            transportDetail = `Train - ${reference}`
            transportCost = estimateTransportCost(
              transportMode,
              distance,
              city,
              nextCity,
              form.countries[0],
              itineraryDays.value[dayIndex]?.isoDate,
              reference,
              getOccupancyInputs(),
              props.currencyCode
            )
            transportCostDetails = getEstimatedTransportCostDetails(
              transportMode,
              distance,
              city,
              nextCity,
              form.countries[0],
              formatMoney,
              itineraryDays.value[dayIndex]?.isoDate,
              reference,
              getOccupancyInputs(),
              props.currencyCode
            )
          }

          if (
            typeof journey?.ticketPrice === 'number' &&
            Number.isFinite(journey.ticketPrice) &&
            (!journey.ticketCurrency || journey.ticketCurrency === props.currencyCode)
          ) {
            transportCost = journey.ticketPrice
            transportCostDetails = `Real price. Ticket fare${journey.ticketCurrency ? ` (${journey.ticketCurrency})` : ''}`
            hasRealTransportPrice = true
          }
        }

        const shouldApplyArrivalTimeZone = transportMode === 'flight' && Boolean(itineraryDays.value[dayIndex])
        const fullTransportDurationMinutes = Math.max(0, transportEndMinutes - transportStartMinutes)
        let displayedEndTime = minutesToTime(Math.min(Math.max(transportStartMinutes, transportEndMinutes), dayEndMinutes))

        if (shouldApplyArrivalTimeZone && itineraryDays.value[dayIndex]) {
          const arrivalInfo = await getArrivalTimeInfo(
            city,
            nextCity,
            itineraryDays.value[dayIndex].isoDate,
            transportStartMinutes,
            fullTransportDurationMinutes
          )
          displayedEndTime = arrivalInfo.endTime
          endDayOffset = arrivalInfo.endDayOffset
          startTimeNote = arrivalInfo.startTimeNote
          timeNote = arrivalInfo.timeNote
        }
        transportStartMinutes = Math.min(transportStartMinutes, dayEndMinutes)
        transportEndMinutes = Math.min(Math.max(transportStartMinutes, transportEndMinutes), dayEndMinutes)

        if (transportStartMinutes < dayEndMinutes) {
          activities.push({
            startTime: minutesToTime(transportStartMinutes),
            endTime: displayedEndTime,
            type: 'transport',
            name: transportDetail,
            cost: transportCost,
            costDetails: transportCostDetails,
            estimatedCost: transportMode !== 'walk' && !hasRealTransportPrice,
            estimatedTime,
            estimatedTimeDetails,
            durationOverrideMinutes: fullTransportDurationMinutes,
            startTimeNote,
            transportMode,
            endDayOffset,
            timeNote
          })
          finalReachedCity = nextCity
          if (!reachedCities.includes(nextCity)) {
            reachedCities.push(nextCity)
          }
        }
        currentMinutes = Math.min(dayEndMinutes, Math.max(transportStartMinutes, transportEndMinutes) + 30)
        maybeAddPendingMeals(nextCity)
        maybeAddAfternoonVisit(nextCity)
      }
    }

    if (!lunchAdded && currentMinutes <= lunchWindowLatestMinutes) {
      const mealCity = cities[cities.length - 1]
      addMealInWindow(mealCity, lunchWindowStartMinutes, lunchWindowLatestMinutes)
      lunchAdded = true
    }

    if (!dinnerAdded && currentMinutes <= dinnerWindowLatestMinutes) {
      maybeAddAfternoonVisit(cities[cities.length - 1])
      const mealCity = cities[cities.length - 1]
      addMealInWindow(mealCity, dinnerWindowStartMinutes, dinnerWindowLatestMinutes)
      dinnerAdded = true
    }

    const finalCity = primaryVisitCity || cities[cities.length - 1]
    const shouldAddExtraVisit = cities.length === 1 || isTouristHub(finalCity)
    if (shouldAddExtraVisit && activities.length < 5 && currentMinutes < timeToMinutes(LATEST_AUTO_ACTIVITY_START_TIME)) {
      const visitIndex = visitCountsByCity[finalCity] ?? 0
      addGeneratedActivity(
        activities,
        Math.max(currentMinutes, timeToMinutes('15:30')),
        getGeneratedVisitDurationMinutes(finalCity, visitIndex),
        'visit',
        formatVisitName(finalCity, visitIndex)
      )
      activities[activities.length - 1].cost = getGeneratedVisitCost(
        finalCity,
        visitIndex,
        itineraryDays.value[dayIndex]?.isoDate,
        getOccupancyInputs(),
        props.currencyCode
      )
      activities[activities.length - 1].costDetails = getGeneratedVisitCostDetails(
        finalCity,
        visitIndex,
        itineraryDays.value[dayIndex]?.isoDate,
        formatMoney,
        getOccupancyInputs(),
        props.currencyCode
      )
      activities[activities.length - 1].estimatedCost = true
      visitCountsByCity[finalCity] = visitIndex + getGeneratedVisitSiteCount(finalCity, visitIndex)
    }

    dayPlans.push({
      activities,
      finalReachedCity,
      reachedCities
    })
  }

  return dayPlans
}

async function buildAutoAccommodations(dayStops: string[]) {
  const accommodations = await Promise.all(
    dayStops.map(async (city, dayIndex) => {
      const normalizedCity = city.trim()
      if (!normalizedCity || form.hotelStars === null) return createEmptyAccommodation()

      const checkInDate = itineraryDays.value[dayIndex]?.isoDate
      const hotelPlan = getGeneratedHotelPlan(
        normalizedCity,
        form.hotelStars,
        form.countries[0],
        checkInDate,
        getOccupancyInputs(),
        props.currencyCode
      )

      const latestTransportArrival = form.dayActivities[dayIndex]
        ?.filter((activity) => activity.type === 'transport')
        .map((activity) => timeToMinutes(activity.endTime))
        .reduce((latest, time) => Math.max(latest, time), 0) ?? 0
      const checkInMinutes = Math.min(
        Math.max(timeToMinutes(DEFAULT_HOTEL_CHECK_IN_TIME), latestTransportArrival),
        timeToMinutes('23:30')
      )

      return {
        type: hotelPlan.type,
        checkInTime: minutesToTime(checkInMinutes),
        name: hotelPlan.name,
        cost: hotelPlan.cost,
        costDetails: getGeneratedHotelCostDetails(
          normalizedCity,
          form.hotelStars,
          form.countries[0],
          checkInDate,
          getOccupancyInputs(),
          props.currencyCode
        )
      }
    })
  )

  return accommodations
}

function normalizeGeneratedCityStops(dayPlans: GeneratedDayPlan[], fallbackStops: string[][]) {
  return dayPlans.map((plan, index) => {
    const fallbackDayStops = fallbackStops[index]?.map((city) => city.trim()).filter((city) => city.length > 0) ?? []
    const reachedCities = plan.reachedCities.map((city) => city.trim()).filter((city) => city.length > 0)

    if (index === 0) {
      return reachedCities.length > 0 ? reachedCities : [fallbackDayStops[0] ?? '']
    }

    const previousFinalCity = dayPlans[index - 1]?.finalReachedCity.trim() || fallbackStops[index - 1]?.slice(-1)[0]?.trim() || ''
    const nextStops = reachedCities.length > 0 ? [...reachedCities] : [fallbackDayStops[0] ?? previousFinalCity]

    if (previousFinalCity) {
      if (nextStops.length === 0) {
        nextStops.push(previousFinalCity)
      } else if (nextStops[0] !== previousFinalCity) {
        nextStops.unshift(previousFinalCity)
      }
    }

    return nextStops.filter((city, cityIndex, cities) => city.length > 0 && cities.indexOf(city) === cityIndex)
  })
}

async function autoFillCities() {
  if (!canAutoFillCities.value) return

  autoFillingCities.value = true
  try {
    const dayCount = Math.max(1, Math.floor(form.numberOfDays ?? 0))
    activityLoadingByDay.value = Object.fromEntries(Array.from({ length: dayCount }, (_, index) => [index, true]))
    const candidates = getCityCandidates()
    if (candidates.length === 0) return

    const orderedRoute = await getOrderedRoute(candidates)
    const rawCityStops = await buildAutoFilledCityStops(orderedRoute, dayCount)
    const plannedCityStops = applySelectedRouteEndpoints(insertPopularEnRouteStops(rawCityStops))
    const draftDayPlans = await buildAutoActivities(plannedCityStops)
    const normalizedCityStops = normalizeGeneratedCityStops(draftDayPlans, plannedCityStops)
    const generatedDayPlans = await buildAutoActivities(normalizedCityStops)
    form.cityStops = normalizeGeneratedCityStops(generatedDayPlans, normalizedCityStops)
    form.dayActivities = generatedDayPlans.map((plan) => plan.activities)
    form.dayAccommodations = await buildAutoAccommodations(
      generatedDayPlans.map((plan, index) => plan.finalReachedCity || form.cityStops[index]?.[0] || '')
    )
    expandedDays.value = Object.fromEntries(Array.from({ length: dayCount }, (_, index) => [index, true]))
  } finally {
    autoFillingCities.value = false
    activityLoadingByDay.value = {}
  }
}

async function regenerateActivitiesForDay(dayIndex: number) {
  if (dayIndex < 0 || dayIndex >= form.cityStops.length) return

  activityLoadingByDay.value = {
    ...activityLoadingByDay.value,
    [dayIndex]: true
  }
  try {
    const generatedDayPlans = await buildAutoActivities([form.cityStops[dayIndex] ?? []])
    form.dayActivities[dayIndex] = generatedDayPlans[0]?.activities ?? []
    form.cityStops[dayIndex] = generatedDayPlans[0]?.reachedCities?.length
      ? generatedDayPlans[0].reachedCities
      : [form.cityStops[dayIndex]?.[0] ?? '']
    const regeneratedAccommodation = await buildAutoAccommodations([
      generatedDayPlans[0]?.finalReachedCity || form.cityStops[dayIndex]?.[0] || ''
    ])
    form.dayAccommodations[dayIndex] = regeneratedAccommodation[0] ?? createEmptyAccommodation()

    if (form.dayActivities[dayIndex].length > 0) {
      expandedDays.value[dayIndex] = true
    }
  } finally {
    activityLoadingByDay.value = {
      ...activityLoadingByDay.value,
      [dayIndex]: false
    }
  }
}

function syncLinkedDayStartsFrom(dayIndex: number) {
  const affectedDays = new Set<number>()

  for (let index = Math.max(0, dayIndex); index < form.cityStops.length - 1; index += 1) {
    const currentDayStops = form.cityStops[index] ?? []
    const nextDayStops = form.cityStops[index + 1] ?? []

    if (nextDayStops.length === 0) continue

    const endCity = currentDayStops[currentDayStops.length - 1] ?? ''
    if (nextDayStops[0] === endCity) continue

    nextDayStops[0] = endCity
    affectedDays.add(index + 1)
  }

  return Array.from(affectedDays).sort((left, right) => left - right)
}

function syncDayBoundaries(dayIndex: number) {
  syncLinkedDayStartsFrom(dayIndex)
}

function removeCityStop(dayIndex: number, cityIndex: number) {
  if (form.cityStops[dayIndex].length <= 1) return
  form.cityStops[dayIndex].splice(cityIndex, 1)
  syncDayBoundaries(dayIndex)
}

function handleCityStopChange(dayIndex: number, cityIndex: number, value: string | CitySearchSuggestion | null) {
  form.cityStops[dayIndex][cityIndex] = normalizeCityInput(value)
  syncDayBoundaries(dayIndex)
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
    cost: null,
    costDetails: '',
    estimatedCost: false,
    estimatedTime: false,
    estimatedTimeDetails: '',
    durationOverrideMinutes: undefined,
    startTimeNote: '',
    transportMode: null,
    endDayOffset: 0,
    timeNote: ''
  })

  expandedDays.value[dayIndex] = true
}

function ensureDayAccommodation(dayIndex: number) {
  form.dayAccommodations[dayIndex] ??= createEmptyAccommodation()
  return form.dayAccommodations[dayIndex]
}

function handleAccommodationCheckInChange(dayIndex: number, value: string) {
  ensureDayAccommodation(dayIndex).checkInTime = value || ''
}

function handleAccommodationTypeChange(dayIndex: number, value: string) {
  const accommodation = ensureDayAccommodation(dayIndex)
  accommodation.type = value || ''

  if (accommodation.type === 'other') {
    accommodation.checkInTime = ''
    accommodation.name = ''
    accommodation.cost = null
    accommodation.costDetails = ''
  }
}

function getAccommodationCheckInValue(dayIndex: number) {
  return form.dayAccommodations[dayIndex]?.checkInTime ?? ''
}

function handleAccommodationNameChange(dayIndex: number, value: string) {
  ensureDayAccommodation(dayIndex).name = value || ''
}

function handleAccommodationCostChange(dayIndex: number, value: number | null) {
  ensureDayAccommodation(dayIndex).cost = value
}

function getAccommodationCostDetails(dayIndex: number) {
  const accommodation = form.dayAccommodations[dayIndex]
  if (!accommodation) return ''
  if (accommodation.costDetails?.trim()) return accommodation.costDetails

  if (accommodation.type === 'hotel' && form.hotelStars !== null) {
    const cityStops = form.cityStops[dayIndex] ?? []
    const city = cityStops[cityStops.length - 1] ?? cityStops[0] ?? ''
    const checkInDate = itineraryDays.value[dayIndex]?.isoDate
    if (!city || !checkInDate) return ''

    return getGeneratedHotelCostDetails(city, form.hotelStars, form.countries[0], checkInDate, getOccupancyInputs(), props.currencyCode)
  }

  return ''
}

function removeActivity(dayIndex: number, activityIndex: number) {
  form.dayActivities[dayIndex].splice(activityIndex, 1)
  syncActivitiesFrom(dayIndex, activityIndex)
}

function getActivityDurationMinutes(activity: DayActivity) {
  if (!activity.startTime || !activity.endTime) return 0

  const startMinutes = timeToMinutes(activity.startTime)
  let endMinutes = timeToMinutes(activity.endTime) + (activity.endDayOffset ?? 0) * 24 * 60
  if ((activity.endDayOffset ?? 0) === 0 && endMinutes < startMinutes) endMinutes += 24 * 60

  return Math.max(0, endMinutes - startMinutes)
}

function recalculateActivityTimes(dayIndex: number) {
  const activities = form.dayActivities[dayIndex] ?? []
  let currentMinutes = timeToMinutes(DEFAULT_ACTIVITY_START_TIME)

  activities.forEach((activity) => {
    const durationMinutes = getActivityDurationMinutes(activity)
    activity.startTime = minutesToTime(currentMinutes)
    activity.endTime = minutesToTime(currentMinutes + durationMinutes)
    activity.endDayOffset = Math.floor((currentMinutes + durationMinutes) / (24 * 60))
    currentMinutes += durationMinutes
  })
}

function handleActivityDragStart(event: DragEvent, dayIndex: number, activityIndex: number) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', `${dayIndex}-${activityIndex}`)
  }

  draggingActivity.value = { dayIndex, activityIndex }
  activityDropTarget.value = null
}

function handleActivityDragOver(dayIndex: number, activityIndex: number) {
  if (!draggingActivity.value || draggingActivity.value.dayIndex !== dayIndex) return
  activityDropTarget.value = { dayIndex, activityIndex }
}

function handleActivityDrop(dayIndex: number, targetIndex: number) {
  if (!draggingActivity.value || draggingActivity.value.dayIndex !== dayIndex) return

  const sourceIndex = draggingActivity.value.activityIndex
  if (sourceIndex === targetIndex) {
    draggingActivity.value = null
    activityDropTarget.value = null
    return
  }

  const activities = [...(form.dayActivities[dayIndex] ?? [])]
  const [moved] = activities.splice(sourceIndex, 1)
  activities.splice(targetIndex, 0, moved)
  form.dayActivities[dayIndex] = activities
  recalculateActivityTimes(dayIndex)

  draggingActivity.value = null
  activityDropTarget.value = null
}

function handleActivityDragEnd() {
  draggingActivity.value = null
  activityDropTarget.value = null
}

function isActivityDragging(dayIndex: number, activityIndex: number) {
  return draggingActivity.value?.dayIndex === dayIndex && draggingActivity.value?.activityIndex === activityIndex
}

function isActivityDropTarget(dayIndex: number, activityIndex: number) {
  return activityDropTarget.value?.dayIndex === dayIndex && activityDropTarget.value?.activityIndex === activityIndex
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
      activity.endDayOffset = 0
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
    activity.endDayOffset = 0
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
    activity.endDayOffset = 0
    return
  }

  activity.endTime = value < activity.startTime ? activity.startTime : value
  activity.endDayOffset = 0
  syncActivitiesFrom(dayIndex, activityIndex + 1)
}

function isValidTimeRange(dayIndex: number, activityIndex: number, activity: DayActivity) {
  if (activity.startTime.length === 0 || activity.endTime.length === 0) return false
  if ((activity.endDayOffset ?? 0) === 0 && activity.endTime < activity.startTime) return false

  const minStart = getMinStartTime(dayIndex, activityIndex)
  return !minStart || activity.startTime >= minStart
}

function getActivityDurationLabel(activity: DayActivity) {
  if (typeof activity.durationOverrideMinutes === 'number' && Number.isFinite(activity.durationOverrideMinutes)) {
    const diff = Math.max(0, Math.round(activity.durationOverrideMinutes))
    const hours = Math.floor(diff / 60)
    const minutes = diff % 60
    const baseLabel = hours && minutes ? `${hours}h ${minutes}m` : hours ? `${hours}h` : `${minutes}m`
    return (activity.endDayOffset ?? 0) > 0 ? `${baseLabel} (+${activity.endDayOffset} day)` : baseLabel
  }

  if (!activity.startTime || !activity.endTime) return '--'

  const [startHour, startMinute] = activity.startTime.split(':').map(Number)
  const [endHour, endMinute] = activity.endTime.split(':').map(Number)
  if (Number.isNaN(startHour) || Number.isNaN(startMinute) || Number.isNaN(endHour) || Number.isNaN(endMinute)) {
    return '--'
  }

  let startTotal = startHour * 60 + startMinute
  let endTotal = endHour * 60 + endMinute + (activity.endDayOffset ?? 0) * 24 * 60
  if ((activity.endDayOffset ?? 0) === 0 && endTotal < startTotal) endTotal += 24 * 60
  const diff = endTotal - startTotal

  const hours = Math.floor(diff / 60)
  const minutes = diff % 60
  const baseLabel = hours && minutes ? `${hours}h ${minutes}m` : hours ? `${hours}h` : `${minutes}m`
  return (activity.endDayOffset ?? 0) > 0 ? `${baseLabel} (+${activity.endDayOffset} day)` : baseLabel
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
  syncDayBoundaries(dayIndex)
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

      const signature = `${currentLanguage.value}|${fromCity.toLowerCase()}->${toCity.toLowerCase()}|${countriesKey}`
      if (segmentSignatures[key] === signature) continue

      segmentSignatures[key] = signature
      segmentLoading[key] = true
      void getDistanceBetweenCities(fromCity, toCity, form.countries, currentLanguage.value)
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
  const mode = getAllowedTransportModeForDistance(distance)

  switch (mode) {
    case 'walk':
      return 'pi pi-directions'
    case 'local':
      return 'pi pi-car'
    case 'train':
      return 'transport-icon-train'
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

function isActivitiesLoading(dayIndex: number) {
  return activityLoadingByDay.value[dayIndex] === true
}

function handleSubmit() {
  if (!canSubmit.value || props.isSaving) return

  const lastItineraryDate = itineraryDays.value[itineraryDays.value.length - 1].isoDate
  const lastDayActivities = form.dayActivities[itineraryDays.value.length - 1] ?? []
  const endDayOffset = lastDayActivities.reduce((maxOffset, activity) => Math.max(maxOffset, activity.endDayOffset ?? 0), 0)
  const endDate = addDaysToIsoDate(lastItineraryDate, endDayOffset)
  const startDate = toIsoDate(form.startDate as Date)

  emit('submit', {
    name: form.name.trim(),
    country: form.countries.join(', '),
    startDate,
    endDate,
    budget: Number(form.budget ?? 0),
    details: {
      countries: [...form.countries],
      currencyCode: props.currencyCode,
      hotelStars: form.hotelStars === null ? undefined : Number(form.hotelStars),
      adults: form.adults === null ? undefined : Number(form.adults),
      children: form.children === null ? undefined : Number(form.children),
      rooms: form.rooms === null ? undefined : Number(form.rooms),
      dayPlans: itineraryDays.value.map((item) => ({
        day: item.day,
        date: item.isoDate,
        cities: form.cityStops[item.index].map((city) => city.trim()).filter((city) => city.length > 0),
        accommodation: (() => {
          const accommodation = form.dayAccommodations[item.index] ?? createEmptyAccommodation()
          const normalized = {
            type: accommodation.type.trim(),
            checkInTime: accommodation.checkInTime.trim(),
            name: accommodation.name.trim(),
            cost: accommodation.cost === null ? undefined : Number(accommodation.cost)
          }
          return normalized.type || normalized.checkInTime || normalized.name || normalized.cost !== undefined
            ? normalized
            : undefined
        })(),
          activities: form.dayActivities[item.index].map((activity) => ({
            startTime: activity.startTime,
            endTime: activity.endTime,
            type: activity.type,
            details: activity.name.trim(),
            cost: Number(activity.cost ?? 0),
            endDayOffset: activity.endDayOffset ?? 0,
            timeNote: activity.timeNote?.trim() ? activity.timeNote.trim() : undefined
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

watch(
  () => props.currencyCode,
  (nextCurrency, previousCurrency) => {
    if (!previousCurrency || nextCurrency === previousCurrency) {
      formCurrencyCode.value = nextCurrency
      return
    }

    convertFormCurrency(formCurrencyCode.value, nextCurrency)
  }
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
            <div class="field-label-row">
              <label class="field-label-with-warning">
                <span>{{ props.texts.numberOfDays }}</span>
                <button
                  v-if="showNumberOfDaysError"
                  v-tooltip.bottom="'Please enter at least 1 day.'"
                  type="button"
                  class="field-warning-tooltip"
                  aria-label="Number of days is required"
                >
                  <i class="pi pi-exclamation-circle" />
                </button>
              </label>
            </div>
            <InputNumber
              v-model="form.numberOfDays"
              :class="{ 'field-warning': showNumberOfDaysError }"
              mode="decimal"
              :min="1"
              :max-fraction-digits="0"
              input-id="trip-number-of-days"
              aria-required="true"
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

        <div class="date-days-row">
          <div class="field-group compact-field">
            <label>{{ props.texts.startCity }}</label>
            <AutoComplete
              :model-value="startCityInputValue"
              @update:model-value="handleStartCityInput"
              :suggestions="startCitySuggestions"
              option-label="label"
              :placeholder="props.texts.startCity"
              :force-selection="false"
              :virtual-scroller-options="{ itemSize: 36 }"
              @complete="handleStartCityComplete"
              @item-select="handleStartCitySelect"
              :disabled="!hasSelectedCountry"
              :dropdown="true"
              :loading="startCitySearching"
              class="city-picker"
            />
          </div>

          <div class="field-group compact-field">
            <label>{{ props.texts.endCity }}</label>
            <AutoComplete
              :model-value="form.routeEndCity"
              @update:model-value="handleEndCityInput"
              :suggestions="endCitySuggestions"
              option-label="label"
              :placeholder="props.texts.endCity"
              :force-selection="false"
              :virtual-scroller-options="{ itemSize: 36 }"
              @complete="handleEndCityComplete"
              class="city-picker"
              :disabled="!hasSelectedCountry"
              :dropdown="true"
              :loading="endCitySearching"
            />
          </div>
        </div>

        <div class="date-days-row">
          <div class="field-group compact-field">
            <label>{{ props.texts.transportModes }}</label>
            <MultiSelect
              v-model="form.allowedTransportModes"
              :options="transportModeOptions"
              option-label="label"
              option-value="value"
              :show-toggle-all="false"
              display="chip"
              :placeholder="props.texts.transportModes"
              :disabled="!hasSelectedCountry"
            />
          </div>
        </div>

        <div v-if="form.stayPreferences.length > 0" class="field-group">
          <div class="stay-preferences-field hotel-preferences-field">
            <label>{{ props.texts.accommodationHotel }}</label>
            <div class="hotel-preferences-row">
              <div class="occupancy-grid">
                <div class="field-group occupancy-field">
                  <label>{{ props.texts.adults }}</label>
                  <InputNumber v-model="form.adults" mode="decimal" :min="1" :max-fraction-digits="0" />
                </div>
                <div class="field-group occupancy-field">
                  <label>{{ props.texts.children }}</label>
                  <InputNumber v-model="form.children" mode="decimal" :min="0" :max-fraction-digits="0" />
                </div>
                <div class="field-group occupancy-field">
                  <label>{{ props.texts.rooms }}</label>
                  <InputNumber v-model="form.rooms" mode="decimal" :min="1" :max-fraction-digits="0" />
                </div>
              </div>
              <div class="hotel-stars-group">
                <div class="hotel-stars-picker" role="radiogroup" :aria-label="props.texts.hotelStars">
                  <button
                    v-for="star in 5"
                    :key="`hotel-star-${star}`"
                    type="button"
                    :class="['hotel-star-button', { 'hotel-star-button-active': star <= (form.hotelStars ?? 0) }]"
                    :aria-label="`${star} star`"
                    :aria-checked="star === form.hotelStars"
                    role="radio"
                    @click="setHotelStars(star)"
                  >
                    <i :class="['pi', star <= (form.hotelStars ?? 0) ? 'pi-star-fill' : 'pi-star']" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="stay-preferences-field">
            <label>{{ props.texts.stayPreferences }}</label>
            <div class="stay-preferences-stack">
              <div class="stay-preferences-grid">
                <div
                  v-for="(preference, index) in primaryStayPreferences"
                  :key="`stay-preference-primary-${index}`"
                  class="stay-preference-row"
                >
                  <AutoComplete
                    :model-value="preference.city"
                    @update:model-value="handleStayPreferenceCityInput(preference, $event as string | CitySearchSuggestion | null)"
                    :suggestions="startCitySuggestions"
                    option-label="label"
                    :placeholder="props.texts.city"
                    :force-selection="false"
                    :virtual-scroller-options="{ itemSize: 36 }"
                    @complete="handleStartCityComplete"
                    class="city-picker"
                    :disabled="!hasSelectedCountry"
                    :dropdown="true"
                    :loading="startCitySearching"
                  />
                  <InputNumber
                    v-model="preference.days"
                    mode="decimal"
                    :min="1"
                    :max="Math.max(1, Math.floor(form.numberOfDays ?? 1))"
                    :max-fraction-digits="0"
                    :placeholder="props.texts.stayDays"
                  />
                  <Button
                    v-if="!shouldWrapStayPreferences && index === primaryStayPreferences.length - 1 && canAddStayPreference"
                    type="button"
                    text
                    rounded
                    icon="pi pi-plus"
                    class="add-stay-preference-btn"
                    @click="addStayPreferenceRow"
                  />
                </div>
              </div>
              <div v-if="shouldWrapStayPreferences" class="stay-preferences-grid stay-preferences-grid-overflow">
                <div
                  v-for="(preference, overflowIndex) in overflowStayPreferences"
                  :key="`stay-preference-overflow-${overflowIndex + 2}`"
                  class="stay-preference-row"
                >
                  <AutoComplete
                    :model-value="preference.city"
                    @update:model-value="handleStayPreferenceCityInput(preference, $event as string | CitySearchSuggestion | null)"
                    :suggestions="startCitySuggestions"
                    option-label="label"
                    :placeholder="props.texts.city"
                    :force-selection="false"
                    :virtual-scroller-options="{ itemSize: 36 }"
                    @complete="handleStartCityComplete"
                    class="city-picker"
                    :disabled="!hasSelectedCountry"
                    :dropdown="true"
                    :loading="startCitySearching"
                  />
                  <InputNumber
                    v-model="preference.days"
                    mode="decimal"
                    :min="1"
                    :max="Math.max(1, Math.floor(form.numberOfDays ?? 1))"
                    :max-fraction-digits="0"
                    :placeholder="props.texts.stayDays"
                  />
                  <Button
                    v-if="overflowIndex === overflowStayPreferences.length - 1 && canAddStayPreference"
                    type="button"
                    text
                    rounded
                    icon="pi pi-plus"
                    class="add-stay-preference-btn"
                    @click="addStayPreferenceRow"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="auto-fill-row">
          <Button
            type="button"
            outlined
            class="auto-fill-cities-btn"
            :label="props.texts.autoFillCities"
            :loading="autoFillingCities"
            :disabled="!canAutoFillCities"
            @click="autoFillCities"
          />
        </div>

        <section v-if="itineraryDays.length" class="itinerary-section">
          <h3>{{ props.texts.dailyProgram }}</h3>
          <div v-for="item in itineraryDays" :key="item.index" class="itinerary-row">
            <div class="itinerary-header">
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
                    <AutoComplete
                      :model-value="form.cityStops[item.index][cityIndex]"
                      @update:model-value="handleCityStopChange(item.index, cityIndex, $event as string | CitySearchSuggestion | null)"
                      :suggestions="startCitySuggestions"
                      option-label="label"
                      :placeholder="allCitiesLoaded ? props.texts.city : props.texts.loadingCities"
                      :force-selection="false"
                      :virtual-scroller-options="{ itemSize: 36 }"
                      @complete="handleStartCityComplete"
                      class="city-select city-picker"
                      :disabled="!allCitiesLoaded"
                      :dropdown="true"
                      :loading="!allCitiesLoaded || startCitySearching"
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
                    <i v-tooltip.bottom="getDistanceLabel(item.index, cityIndex)" :class="['transport-icon', getTransportIcon(item.index, cityIndex)]" />
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
            </div>
            <div
              v-if="(hasSelectedCity(item.index) || hasActivities(item.index)) && (!hasActivities(item.index) || isDayExpanded(item.index))"
              class="activities-panel"
            >
	              <div v-if="isActivitiesLoading(item.index)" class="activities-loader">
	                <ProgressSpinner style="width: 24px; height: 24px" stroke-width="6" />
	              </div>
	              <div v-else class="activities-section">
	              <div
	                v-for="(activity, activityIndex) in form.dayActivities[item.index]"
	                :key="`${item.index}-activity-${activityIndex}`"
	                :class="[
	                  'activity-row',
	                  {
	                    'activity-row-dragging': isActivityDragging(item.index, activityIndex),
	                    'activity-row-drop-target': isActivityDropTarget(item.index, activityIndex)
	                  }
	                ]"
	                draggable="true"
	                @dragstart="handleActivityDragStart($event, item.index, activityIndex)"
	                @dragover.prevent="handleActivityDragOver(item.index, activityIndex)"
	                @drop.prevent="handleActivityDrop(item.index, activityIndex)"
	                @dragend="handleActivityDragEnd"
              >
	                <Button
	                  type="button"
	                  icon="pi pi-bars"
	                  text
	                  rounded
	                  class="drag-activity-btn"
	                />
                <div class="activity-time-field">
                  <small class="activity-time-label">
                    <i
                      v-if="activity.startTimeNote"
                      v-tooltip.bottom="activity.startTimeNote"
                      class="pi pi-exclamation-triangle activity-warning-icon"
                    />
                    <span>{{ props.texts.activityStartTime }}</span>
                  </small>
                  <InputText
                    :model-value="activity.startTime"
                    type="time"
                    :min="getMinStartTime(item.index, activityIndex)"
                    :placeholder="props.texts.activityStartTime"
                    @update:model-value="handleActivityStartChange(item.index, activityIndex, String($event ?? ''))"
                  />
                </div>
                <div class="activity-time-field">
                  <small class="activity-time-label">
                    <span>{{ props.texts.activityEndTime }}</span>
                    <i
                      v-if="activity.timeNote"
                      v-tooltip.bottom="activity.timeNote"
                      class="pi pi-exclamation-triangle activity-warning-icon"
                    />
                  </small>
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
                <div class="activity-cost-field">
                  <InputNumber
                    v-model="activity.cost"
                    mode="currency"
                    :currency="props.currencyCode"
                    :min="0"
                    :placeholder="props.texts.activityCost"
                  />
                  <button
                    v-if="activity.costDetails"
                    v-tooltip.bottom="activity.costDetails"
                    type="button"
                    class="activity-cost-info"
                    aria-label="Cost details"
                  >
                    <i class="pi pi-info-circle" />
                  </button>
                </div>
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
		              <div class="accommodation-block">
		                <div class="accommodation-row">
		                  <div class="accommodation-input-field accommodation-type-field">
		                    <small class="accommodation-type-label">
		                      <i class="pi pi-home accommodation-heading-icon" />
		                      <span>{{ props.texts.accommodation }}</span>
		                    </small>
		                    <Dropdown
		                      class="accommodation-top-select"
		                      :model-value="ensureDayAccommodation(item.index).type"
		                      :options="accommodationTypeOptions"
		                      option-label="label"
		                      option-value="value"
		                      :placeholder="props.texts.accommodationType"
		                      @update:model-value="handleAccommodationTypeChange(item.index, String($event ?? ''))"
		                    />
		                  </div>
		                  <div class="accommodation-checkin-field">
		                    <small>{{ props.texts.accommodationCheckIn }}</small>
		                    <InputText
		                      :model-value="getAccommodationCheckInValue(item.index)"
		                      type="time"
		                      :placeholder="props.texts.accommodationCheckIn"
		                      @update:model-value="handleAccommodationCheckInChange(item.index, String($event ?? ''))"
		                    />
		                  </div>
		                  <div class="accommodation-input-field">
		                    <small aria-hidden="true">&nbsp;</small>
		                    <InputText
		                      :model-value="ensureDayAccommodation(item.index).name"
		                      :placeholder="props.texts.accommodationName"
		                      @update:model-value="handleAccommodationNameChange(item.index, String($event ?? ''))"
		                    />
		                  </div>
		                  <div class="accommodation-input-field accommodation-cost-field">
		                    <small aria-hidden="true">&nbsp;</small>
                        <div class="activity-cost-field">
		                    <InputNumber
		                      :model-value="ensureDayAccommodation(item.index).cost"
		                      mode="currency"
		                      :currency="props.currencyCode"
		                      :min="0"
		                      :placeholder="props.texts.activityCost"
		                      @update:model-value="handleAccommodationCostChange(item.index, $event as number | null)"
		                    />
                        <button
                          v-if="getAccommodationCostDetails(item.index)"
                          v-tooltip.bottom="getAccommodationCostDetails(item.index)"
                          type="button"
                          class="activity-cost-info accommodation-cost-info"
                          aria-label="Accommodation rate details"
                        >
                          <i class="pi pi-info-circle" />
                        </button>
                        </div>
		                  </div>
		                </div>
		              </div>
	              </div>
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
        <small v-if="!canSubmit && submitBlockers.length > 0" class="submit-hint">
          {{ submitBlockers[0] }}
        </small>
      </form>
    </div>

	    <aside class="trip-summary-sidebar">
	      <div class="budget-side-card">
	      <p><strong>{{ props.texts.budget }}:</strong> {{ budgetSummaryValue }}</p>
	      <p><strong>{{ props.texts.totalCost }}:</strong> {{ formatMoney(totalTripCost) }}</p>
	      <p><strong>{{ props.texts.remainingBudget }}:</strong> {{ remainingBudgetSummaryValue }}</p>
	      </div>
	    </aside>
  </div>
</template>

<style scoped>
:deep(.p-autocomplete .p-autocomplete-dropdown) {
  width: 2.5rem;
  background: #fff1f7;
  border-color: var(--tm-border);
  border-left: none;
  color: var(--tm-accent-strong);
}

:deep(.p-autocomplete .p-autocomplete-dropdown:hover) {
  background: #ffe1ee;
  border-color: var(--tm-border-strong);
  color: #8f0f46;
}

:deep(.p-autocomplete .p-autocomplete-dropdown:focus) {
  box-shadow: none;
}

:deep(.p-autocomplete .p-autocomplete-input) {
  border-right: 0;
}

:deep(.p-autocomplete .p-autocomplete-input:enabled:focus) {
  box-shadow: none;
  border-color: var(--tm-accent);
}

:deep(.p-autocomplete.p-focus .p-autocomplete-input) {
  border-color: var(--tm-accent);
}

:deep(.p-autocomplete-panel) {
  border: 1px solid var(--tm-border);
  background: linear-gradient(180deg, #fffafb 0%, #fff4f8 100%);
  box-shadow: 0 14px 28px rgba(190, 24, 93, 0.14);
}

:deep(.p-autocomplete-panel .p-autocomplete-items .p-autocomplete-item) {
  color: var(--tm-text);
}

:deep(.p-autocomplete-panel .p-autocomplete-items .p-autocomplete-item:not(.p-highlight):not(.p-disabled):hover) {
  background: #ffe6f1;
  color: var(--tm-accent-strong);
}

:deep(.p-autocomplete-panel .p-autocomplete-items .p-autocomplete-item.p-highlight) {
  background: #ffd2e5;
  color: var(--tm-accent-strong);
}

:deep(.city-picker .p-dropdown-trigger) {
  background: #fff1f7;
  border-left: none;
  color: var(--tm-accent-strong);
}

:deep(.city-picker:not(.p-disabled):hover .p-dropdown-trigger) {
  background: #ffe1ee;
  color: #8f0f46;
}

.hotel-preferences-row {
  display: flex;
  align-items: end;
  gap: 1rem;
  flex-wrap: nowrap;
  width: 100%;
}

.hotel-preferences-field > label {
  align-self: flex-start;
  padding-top: 2rem;
}

.occupancy-grid {
  display: flex;
  align-items: end;
  gap: 0.6rem;
  flex-wrap: nowrap;
  width: auto;
}

.hotel-stars-group {
  display: inline-flex;
  align-items: center;
}

.occupancy-field {
  gap: 0.35rem;
  width: 84px;
  min-width: 84px;
}

.occupancy-field label {
  font-size: 0.84rem;
}

.occupancy-field :deep(.p-inputnumber),
.occupancy-field :deep(.p-inputtext) {
  width: 84px;
}

@media (max-width: 768px) {
  .hotel-preferences-row {
    flex-wrap: wrap;
    align-items: start;
  }

  .occupancy-grid {
    width: 100%;
    flex-wrap: wrap;
  }

  .occupancy-field {
    width: 96px;
    min-width: 96px;
  }

  .occupancy-field :deep(.p-inputnumber),
  .occupancy-field :deep(.p-inputtext) {
    width: 96px;
  }
}

</style>


























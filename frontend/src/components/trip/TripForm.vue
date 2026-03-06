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
import { getAllCountries, getCitiesByCountry, getDistanceBetweenCities } from '../../services/api/geodataApi'

export interface CreateTripPayload {
  name: string
  country: string
  startDate: string
  endDate: string
  budget: number
}

const props = defineProps<{
  texts: TripFormTexts
  currencyCode: Currency
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateTripPayload): void
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
let distanceDebounceTimer: ReturnType<typeof setTimeout> | null = null
let cityLoaderTimer: ReturnType<typeof setTimeout> | null = null

const form = reactive({
  name: '',
  countries: [] as string[],
  startDate: new Date(),
  numberOfDays: null as number | null,
  cityStops: [] as string[][],
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

watch(
  () => form.numberOfDays,
  (days) => {
    const count = days && days > 0 ? Math.floor(days) : 0
    form.cityStops = Array.from({ length: count }, (_, index) => {
      const existing = form.cityStops[index]
      return existing && existing.length ? existing.slice(0, 4) : ['']
    })
  }
)

watch(selectedCityOptions, () => {
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
    pruneCitiesByCountries(countries)

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
    form.name.trim().length > 0 &&
    form.countries.length > 0 &&
    form.startDate !== null &&
    form.numberOfDays !== null &&
    form.numberOfDays >= 1 &&
    allCitiesLoaded.value &&
    selectedCityOptions.value.length > 0 &&
    form.cityStops.length === Math.floor(form.numberOfDays) &&
    form.cityStops.every(
      (dayStops) =>
        dayStops.length > 0 &&
        dayStops.every((city) => city.trim().length > 0 && selectedCitySet.value.has(city))
    ) &&
    form.budget !== null &&
    form.budget >= 0
)

const showCountryError = computed(() => form.countries.length === 0)
const showCityLoader = computed(() => cityLoaderVisible.value)

function toIsoDate(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addCityStop(dayIndex: number) {
  if (form.cityStops[dayIndex].length >= 4) return
  form.cityStops[dayIndex].push('')
}

function removeCityStop(dayIndex: number, cityIndex: number) {
  if (form.cityStops[dayIndex].length <= 1) return
  form.cityStops[dayIndex].splice(cityIndex, 1)
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

function getCitySelectWidth(cityName: string) {
  const reference = cityName?.trim() || props.texts.city
  const estimated = reference.length * 10 + 56
  const bounded = Math.max(140, Math.min(420, estimated))
  return `${bounded}px`
}

function handleSubmit() {
  if (!canSubmit.value) return

  const endDate = itineraryDays.value[itineraryDays.value.length - 1].isoDate

  emit('submit', {
    name: form.name.trim(),
    country: form.countries.join(', '),
    startDate: toIsoDate(form.startDate as Date),
    endDate,
    budget: Number(form.budget)
  })
}

onMounted(async () => {
  try {
    const countries = await getAllCountries()
    if (countries.length) countryOptions.value = countries
  } catch {
    countryOptions.value = [...fallbackCountryOptions].sort((a, b) => a.localeCompare(b))
  }
})
</script>

<template>
  <form class="trip-form" @submit.prevent="handleSubmit">
    <h2>{{ props.texts.createTrip }}</h2>

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
        <Calendar v-model="form.startDate" date-format="yy-mm-dd" show-icon />
      </div>

      <div class="field-group compact-field">
        <label>{{ props.texts.numberOfDays }}</label>
        <InputNumber v-model="form.numberOfDays" mode="decimal" :min="1" :max-fraction-digits="0" />
      </div>
    </div>

    <section v-if="itineraryDays.length" class="itinerary-section">
      <h3>{{ props.texts.dailyProgram }}</h3>
      <div v-for="item in itineraryDays" :key="item.index" class="itinerary-row">
        <span class="itinerary-label">{{ props.texts.day }} {{ item.day }}, {{ item.displayDate }}</span>
        <div class="city-stops-inline">
          <template v-for="(_, cityIndex) in form.cityStops[item.index]" :key="`${item.index}-${cityIndex}`">
            <div class="city-stop-inline" @dragover.prevent @drop.prevent="handleCityDrop(item.index, cityIndex)">
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
              <span class="distance-label">{{ getDistanceLabel(item.index, cityIndex) }}</span>
              <span class="arrow-line" />
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
    </section>

    <div class="field-group">
      <label>{{ props.texts.budget }}</label>
      <InputNumber
        v-model="form.budget"
        mode="decimal"
        :min="0"
        :placeholder="`${props.texts.budget} (${props.currencyCode})`"
      />
    </div>

    <Button type="submit" :label="props.texts.save" :disabled="!canSubmit" />
  </form>
</template>

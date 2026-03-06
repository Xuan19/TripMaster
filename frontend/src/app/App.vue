<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import TripCreator from '../components/trip/TripCreator.vue'
import type { TripPlanDetails } from '../components/trip/types'
import { getTripById, getTrips } from '../services/api/tripsApi'
import type { Trip } from '../services/api/tripsApi'
import {
  currencyOptions,
  languageOptions,
  localeByLanguage,
  translations,
  type Currency,
  type Language
} from '../locales/i18n'

const trips = ref<Trip[]>([])
const errorKey = ref<'' | 'connectError'>('')
const language = ref<Language>('en')
const currency = ref<Currency>('EUR')
const selectedTrip = ref<Trip | null>(null)
const selectedTripDetails = ref<TripPlanDetails | null>(null)
const isTripDetailOpen = ref(false)

const texts = computed(() => translations[language.value])
const error = computed(() => (errorKey.value ? texts.value[errorKey.value] : ''))

function formatCurrency(value: number) {
  return new Intl.NumberFormat(localeByLanguage[language.value], {
    style: 'currency',
    currency: currency.value
  }).format(value)
}

async function openTripDetails(trip: Trip) {
  selectedTrip.value = trip
  selectedTripDetails.value = null
  try {
    const fullTrip = await getTripById(trip.id)
    selectedTripDetails.value = fullTrip.details ?? null
  } catch {
    selectedTripDetails.value = trip.details ?? null
  }
  isTripDetailOpen.value = true
}

function formatActivityType(type: string) {
  if (type === 'visit') return texts.value.activityVisit
  if (type === 'meal') return texts.value.activityMeal
  if (type === 'transport') return texts.value.activityTransport
  if (type === 'shopping') return texts.value.activityShopping
  if (type === 'other') return texts.value.activityOther
  return type
}

async function loadTrips() {
  try {
    errorKey.value = ''
    trips.value = await getTrips()
  } catch {
    errorKey.value = 'connectError'
  }
}

onMounted(loadTrips)
</script>

<template>
  <main class="page">
    <header class="page-header">
      <div class="header-settings">
        <div class="header-control">
          <label>{{ texts.languageLabel }}</label>
          <Dropdown
            v-model="language"
            :options="languageOptions"
            option-label="label"
            option-value="value"
            class="compact-select"
          />
        </div>
        <div class="header-control">
          <label>{{ texts.currencyLabel }}</label>
          <Dropdown
            v-model="currency"
            :options="currencyOptions"
            option-label="label"
            option-value="value"
            class="compact-select"
          />
        </div>
      </div>
      <h1>{{ texts.title }}</h1>
      <p class="subtitle">{{ texts.subtitle }}</p>
    </header>

    <TripCreator :texts="texts" :currency-code="currency" @created="loadTrips" />

    <Message v-if="error" severity="error" :closable="false" class="top-error">
      {{ error }}
    </Message>

    <section class="trip-list">
      <h2>{{ texts.upcomingTrips }}</h2>
      <p v-if="!trips.length" class="muted">{{ texts.noTrips }}</p>
      <div v-else class="trip-grid">
        <Card v-for="trip in trips" :key="trip.id" class="trip-card" @click="openTripDetails(trip)">
          <template #title>{{ trip.name }}</template>
          <template #content>
            <p>{{ trip.country }}</p>
            <p>{{ trip.startDate }} -> {{ trip.endDate }}</p>
            <p>{{ texts.budgetLabel }}: {{ formatCurrency(Number(trip.budget)) }}</p>
          </template>
        </Card>
      </div>
    </section>

    <Dialog
      v-model:visible="isTripDetailOpen"
      modal
      :draggable="false"
      :header="selectedTrip ? `${texts.tripDetails}: ${selectedTrip.name}` : texts.tripDetails"
      class="trip-detail-dialog"
    >
      <div v-if="selectedTripDetails?.dayPlans?.length" class="trip-detail-body">
        <div v-for="day in selectedTripDetails.dayPlans" :key="`${day.day}-${day.date}`" class="trip-detail-day">
          <h4>{{ texts.day }} {{ day.day }} - {{ day.date }}</h4>
          <p><strong>{{ texts.savedCities }}:</strong> {{ day.cities.length ? day.cities.join(', ') : '-' }}</p>
          <div class="trip-detail-activities">
            <strong>{{ texts.savedActivities }}:</strong>
            <ul v-if="day.activities.length">
              <li v-for="(activity, index) in day.activities" :key="`${day.day}-${index}-${activity.startTime}`">
                {{ activity.startTime }}-{{ activity.endTime }} | {{ formatActivityType(activity.type) }} |
                {{ activity.details || '-' }} | {{ formatCurrency(activity.cost) }}
              </li>
            </ul>
            <p v-else class="muted">-</p>
          </div>
        </div>
      </div>
      <p v-else class="muted">{{ texts.noTripDetails }}</p>
    </Dialog>
  </main>
</template>

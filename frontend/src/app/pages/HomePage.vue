<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dialog from 'primevue/dialog'
import Message from 'primevue/message'
import TripCreator from '../../components/trip/TripCreator.vue'
import type { TripPlanDetails } from '../../components/trip/types'
import { appUiContextKey } from '../context'
import { getTripById, getTrips } from '../../services/api/tripsApi'
import type { Trip } from '../../services/api/tripsApi'
import { localeByLanguage } from '../../locales/i18n'

const appUi = inject(appUiContextKey)
if (!appUi) throw new Error('App UI context is not available')

const router = useRouter()

const trips = ref<Trip[]>([])
const errorKey = ref<'' | 'connectError'>('')
const selectedTrip = ref<Trip | null>(null)
const selectedTripDetails = ref<TripPlanDetails | null>(null)
const isTripDetailOpen = ref(false)
const texts = computed(() => appUi.texts.value)
const currencyCode = computed(() => appUi.currency.value)
const errorMessage = computed(() => (errorKey.value ? appUi.texts.value[errorKey.value] : ''))

function formatCurrency(value: number) {
  return new Intl.NumberFormat(localeByLanguage[appUi.language.value], {
    style: 'currency',
    currency: appUi.currency.value
  }).format(value)
}

function formatActivityType(type: string) {
  if (type === 'visit') return appUi.texts.value.activityVisit
  if (type === 'meal') return appUi.texts.value.activityMeal
  if (type === 'transport') return appUi.texts.value.activityTransport
  if (type === 'shopping') return appUi.texts.value.activityShopping
  if (type === 'other') return appUi.texts.value.activityOther
  return type
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

function openEditTrip(trip: Trip) {
  router.push({ name: 'trip-edit', params: { id: String(trip.id) } })
}

async function loadTrips() {
  try {
    errorKey.value = ''
    const fetchedTrips = await getTrips()
    trips.value = [...fetchedTrips].sort((a, b) => b.id - a.id)
  } catch {
    errorKey.value = 'connectError'
  }
}

void loadTrips()
</script>

<template>
  <TripCreator :texts="texts" :currency-code="currencyCode" @created="loadTrips" />

  <Message v-if="errorMessage" severity="error" :closable="false" class="top-error">
    {{ errorMessage }}
  </Message>

  <section class="trip-list">
    <h2>{{ texts.upcomingTrips }}</h2>
    <p v-if="!trips.length" class="muted">{{ texts.noTrips }}</p>
    <div v-else class="trip-grid">
      <Card v-for="trip in trips" :key="trip.id" class="trip-card" @click="openTripDetails(trip)">
        <template #title>{{ trip.name }}</template>
        <template #content>
          <Button
            type="button"
            icon="pi pi-pencil"
            text
            rounded
            class="edit-trip-btn"
            @click.stop="openEditTrip(trip)"
          />
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
</template>

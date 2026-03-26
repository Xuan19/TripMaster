<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { appUiContextKey } from '../context'
import { getTripById, type Trip } from '../../services/api/tripsApi'
import { convertAmount, getCurrencyDisplay, isCurrency } from '../../utils/currency'

const appUi = inject(appUiContextKey)
if (!appUi) throw new Error('App UI context is not available')

const route = useRoute()
const router = useRouter()

const trip = ref<Trip | null>(null)
const isLoading = ref(true)
const loadError = ref(false)

const texts = computed(() => appUi.texts.value)
const currencyCode = computed(() => appUi.currency.value)
const locale = computed(() => appUi.language.value)

const tripId = computed(() => Number(route.params.id))

function getTripSourceCurrency(currentTrip: Trip) {
  return isCurrency(currentTrip.details?.currencyCode) ? currentTrip.details.currencyCode : currencyCode.value
}

function convertTripAmount(value: number, currentTrip: Trip) {
  return convertAmount(value, getTripSourceCurrency(currentTrip), currencyCode.value)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(locale.value === 'fr' ? 'fr-FR' : locale.value === 'zh' ? 'zh-CN' : 'en-US', {
    style: 'currency',
    currency: currencyCode.value,
    currencyDisplay: getCurrencyDisplay(currencyCode.value)
  }).format(value)
}

function formatTripMoney(value: number, currentTrip: Trip) {
  return formatMoney(convertTripAmount(value, currentTrip))
}

function getAccommodationTypeLabel(type?: string) {
  switch (type) {
    case 'hotel':
      return texts.value.accommodationHotel
    case 'airbnb':
      return texts.value.accommodationAirbnb
    case 'hostel':
      return texts.value.accommodationHostel
    case 'couchsurfing':
      return texts.value.accommodationCouchsurfing
    case 'guesthouse':
      return texts.value.accommodationGuesthouse
    case 'other':
      return texts.value.accommodationOther
    default:
      return type || '-'
  }
}

function getActivityTypeLabel(type: string) {
  switch (type) {
    case 'visit':
      return texts.value.activityVisit
    case 'meal':
      return texts.value.activityMeal
    case 'transport':
      return texts.value.activityTransport
    case 'shopping':
      return texts.value.activityShopping
    case 'other':
      return texts.value.activityOther
    default:
      return type
  }
}

function getTransportModeLabel(mode: string) {
  switch (mode) {
    case 'walk':
      return texts.value.transportWalk
    case 'local':
      return texts.value.transportLocal
    case 'train':
      return texts.value.transportTrain
    case 'drive':
      return texts.value.transportDrive
    case 'flight':
      return texts.value.transportFlight
    default:
      return mode
  }
}

const countryList = computed(() => {
  const currentTrip = trip.value
  if (!currentTrip) return []

  const countries = currentTrip.details?.countries?.length
    ? currentTrip.details.countries
    : currentTrip.country
        .split(',')
        .map((country) => country.trim())
        .filter(Boolean)

  return countries
})

const transportModes = computed(() => {
  const selectedModes = trip.value?.details?.allowedTransportModes ?? []
  return selectedModes.map(getTransportModeLabel)
})

const stayPreferences = computed(() => {
  const dayPlans = trip.value?.details?.dayPlans ?? []
  const stayCounts: Record<string, number> = {}

  dayPlans.forEach((dayPlan) => {
    const targetCity = dayPlan.cities[dayPlan.cities.length - 1] ?? dayPlan.cities[0]
    if (!targetCity) return
    stayCounts[targetCity] = (stayCounts[targetCity] ?? 0) + 1
  })

  return Object.entries(stayCounts)
    .filter(([, days]) => days > 1)
    .map(([city, days]) => ({ city, days }))
})

const costSummary = computed(() => {
  const currentTrip = trip.value
  if (!currentTrip) return []

  const summary = {
    accommodation: 0,
    visit: 0,
    meal: 0,
    transport: 0,
    shopping: 0,
    other: 0
  }

  currentTrip.details?.dayPlans.forEach((dayPlan) => {
    summary.accommodation += convertTripAmount(Number(dayPlan.accommodation?.cost ?? 0), currentTrip)
    dayPlan.activities.forEach((activity) => {
      const cost = convertTripAmount(Number(activity.cost ?? 0), currentTrip)
      switch (activity.type) {
        case 'visit':
          summary.visit += cost
          break
        case 'meal':
          summary.meal += cost
          break
        case 'transport':
          summary.transport += cost
          break
        case 'shopping':
          summary.shopping += cost
          break
        default:
          summary.other += cost
          break
      }
    })
  })

  return [
    { label: texts.value.accommodation, value: summary.accommodation },
    { label: texts.value.activityVisit, value: summary.visit },
    { label: texts.value.activityMeal, value: summary.meal },
    { label: texts.value.activityTransport, value: summary.transport },
    { label: texts.value.activityShopping, value: summary.shopping },
    { label: texts.value.activityOther, value: summary.other }
  ].filter((row) => row.value > 0)
})

const totalTripCost = computed(() => costSummary.value.reduce((sum, row) => sum + row.value, 0))

async function loadTrip() {
  isLoading.value = true
  loadError.value = false

  if (!Number.isFinite(tripId.value) || tripId.value <= 0) {
    loadError.value = true
    isLoading.value = false
    return
  }

  try {
    trip.value = await getTripById(tripId.value)
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

function openEditor() {
  if (!trip.value) return
  void router.push({ name: 'trip-edit', params: { id: String(trip.value.id) } })
}

void loadTrip()
</script>

<template>
  <section class="creator-section trip-details-page">
    <Message v-if="loadError" severity="error" :closable="false" class="top-error">
      {{ texts.connectError }}
    </Message>

    <div v-else-if="isLoading" class="muted">{{ texts.loadingCities }}</div>

    <div v-else-if="trip" class="trip-details">
      <header class="trip-details-header">
        <div>
          <p class="trip-details-kicker">{{ texts.tripDetails }}</p>
          <h1>{{ trip.name }}</h1>
        </div>
        <div class="trip-details-actions">
          <Button
            type="button"
            text
            icon="pi pi-arrow-left"
            :label="texts.back"
            class="trip-details-back-btn"
            @click="router.push({ name: 'home' })"
          />
          <Button type="button" icon="pi pi-pencil" :label="texts.editTrip" class="trip-details-edit-btn" @click="openEditor" />
        </div>
      </header>

      <section class="trip-details-section">
        <h2>{{ texts.tripOverview }}</h2>
        <div class="trip-details-grid">
          <article class="trip-details-card">
            <small>{{ texts.country }}</small>
            <strong>{{ countryList.join(', ') || '-' }}</strong>
          </article>
          <article class="trip-details-card">
            <small>{{ texts.period }}</small>
            <strong>{{ trip.startDate }} -> {{ trip.endDate }}</strong>
          </article>
          <article class="trip-details-card">
            <small>{{ texts.budgetLabel }}</small>
            <strong>{{ formatTripMoney(Number(trip.budget), trip) }}</strong>
          </article>
          <article class="trip-details-card">
            <small>{{ texts.totalCost }}</small>
            <strong>{{ formatMoney(totalTripCost) }}</strong>
          </article>
        </div>
      </section>

      <section class="trip-details-section">
        <h2>{{ texts.tripPreferences }}</h2>
        <div class="trip-preferences-grid">
          <div class="trip-preference-item">
            <span>{{ texts.transportModes }}</span>
            <div class="trip-chip-row">
              <span v-for="mode in transportModes" :key="mode" class="trip-chip">{{ mode }}</span>
              <span v-if="transportModes.length === 0" class="trip-muted-value">-</span>
            </div>
          </div>
          <div class="trip-preference-item">
            <span>{{ texts.hotelStars }}</span>
            <div class="trip-stars" :aria-label="texts.hotelStars">
              <i
                v-for="star in 5"
                :key="`view-star-${star}`"
                :class="['pi', star <= (trip.details?.hotelStars ?? 0) ? 'pi-star-fill is-active' : 'pi-star']"
              />
            </div>
          </div>
          <div class="trip-preference-item">
            <span>{{ texts.adults }}</span>
            <strong>{{ trip.details?.adults ?? '-' }}</strong>
          </div>
          <div class="trip-preference-item">
            <span>{{ texts.children }}</span>
            <strong>{{ trip.details?.children ?? '-' }}</strong>
          </div>
          <div class="trip-preference-item">
            <span>{{ texts.rooms }}</span>
            <strong>{{ trip.details?.rooms ?? '-' }}</strong>
          </div>
          <div class="trip-preference-item trip-preference-wide">
            <span>{{ texts.stayPreferences }}</span>
            <div class="trip-chip-row">
              <span v-for="stay in stayPreferences" :key="stay.city" class="trip-chip">{{ stay.city }} · {{ stay.days }} {{ texts.stayDays }}</span>
              <span v-if="stayPreferences.length === 0" class="trip-muted-value">-</span>
            </div>
          </div>
        </div>
      </section>

      <section class="trip-details-section">
        <h2>{{ texts.dailyProgram }}</h2>
        <div v-if="(trip.details?.dayPlans?.length ?? 0) === 0" class="trip-empty-state">
          {{ texts.noTripDetails }}
        </div>
        <div v-else class="trip-day-list">
          <article v-for="dayPlan in trip.details?.dayPlans" :key="`${dayPlan.day}-${dayPlan.date}`" class="trip-day-card">
            <header class="trip-day-header">
              <div>
                <h3>{{ texts.day }} {{ dayPlan.day }}</h3>
                <p>{{ dayPlan.date }}</p>
              </div>
              <div class="trip-day-route">{{ dayPlan.cities.filter(Boolean).join(' -> ') || '-' }}</div>
            </header>

            <section v-if="dayPlan.accommodation?.name || dayPlan.accommodation?.type || dayPlan.accommodation?.checkInTime" class="trip-subsection">
              <h4>{{ texts.accommodation }}</h4>
              <div class="trip-accommodation-grid">
                <div class="trip-readonly-field">
                  <small>{{ texts.accommodationType }}</small>
                  <strong>{{ getAccommodationTypeLabel(dayPlan.accommodation?.type) }}</strong>
                </div>
                <div class="trip-readonly-field">
                  <small>{{ texts.accommodationCheckIn }}</small>
                  <strong>{{ dayPlan.accommodation?.checkInTime || '-' }}</strong>
                </div>
                <div class="trip-readonly-field">
                  <small>{{ texts.accommodationName }}</small>
                  <strong>{{ dayPlan.accommodation?.name || '-' }}</strong>
                </div>
                <div class="trip-readonly-field">
                  <small>{{ texts.activityCost }}</small>
                  <strong>{{ formatTripMoney(Number(dayPlan.accommodation?.cost ?? 0), trip) }}</strong>
                </div>
              </div>
            </section>

            <section class="trip-subsection">
              <h4>{{ texts.savedActivities }}</h4>
              <div v-if="dayPlan.activities.length === 0" class="trip-empty-inline">{{ texts.noTripDetails }}</div>
              <div v-else class="trip-activity-list">
                <article v-for="activity in dayPlan.activities" :key="`${dayPlan.day}-${activity.startTime}-${activity.details}`" class="trip-activity-card">
                  <div class="trip-activity-time">{{ activity.startTime }} - {{ activity.endTime }}</div>
                  <div class="trip-activity-main">
                    <strong>{{ getActivityTypeLabel(activity.type) }}</strong>
                    <p>{{ activity.details }}</p>
                    <small v-if="activity.timeNote">{{ activity.timeNote }}</small>
                  </div>
                  <div class="trip-activity-cost">{{ formatTripMoney(Number(activity.cost ?? 0), trip) }}</div>
                </article>
              </div>
            </section>
          </article>
        </div>
      </section>

      <section class="trip-details-section">
        <h2>{{ texts.costSummary }}</h2>
        <div v-if="costSummary.length === 0" class="trip-empty-state">
          {{ texts.noTripDetails }}
        </div>
        <div v-else class="trip-cost-summary">
          <div v-for="row in costSummary" :key="row.label" class="trip-cost-row">
            <span>{{ row.label }}</span>
            <strong>{{ formatMoney(row.value) }}</strong>
          </div>
          <div class="trip-cost-row trip-cost-total">
            <span>{{ texts.totalCost }}</span>
            <strong>{{ formatMoney(totalTripCost) }}</strong>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.trip-details {
  display: grid;
  gap: 1rem;
}

.trip-details-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 1rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--tm-border);
  border-radius: 18px;
  background: linear-gradient(135deg, #fff7fb 0%, #fff1f7 100%);
}

.trip-details-header h1 {
  margin: 0.15rem 0 0;
  font-size: clamp(1.5rem, 2.4vw, 2.15rem);
  color: var(--tm-accent-strong);
}

.trip-details-kicker {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tm-muted);
}

.trip-details-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.trip-details-back-btn.p-button {
  color: var(--tm-accent-strong);
  border-color: var(--tm-border);
  background: #fff6fa;
}

.trip-details-back-btn.p-button:enabled:hover {
  background: #ffe6f1;
  border-color: var(--tm-border-strong);
  color: #8f0f46;
}

.trip-details-edit-btn.p-button {
  border: none;
  background: linear-gradient(135deg, var(--tm-accent) 0%, var(--tm-warm) 100%);
  color: #fff7fb;
  box-shadow: 0 12px 22px rgba(177, 19, 87, 0.18);
}

.trip-details-edit-btn.p-button:enabled:hover {
  background: linear-gradient(135deg, #8f0f46 0%, #c2410c 100%);
  box-shadow: 0 16px 28px rgba(177, 19, 87, 0.22);
}

.trip-details-section {
  display: grid;
  gap: 0.8rem;
  padding: 1rem 1.1rem 1.1rem;
  border: 1px solid var(--tm-border);
  border-radius: 18px;
  background: var(--tm-surface);
  box-shadow: 0 14px 28px rgba(190, 24, 93, 0.08);
}

.trip-details-section h2,
.trip-subsection h4,
.trip-day-header h3 {
  margin: 0;
}

.trip-details-grid,
.trip-preferences-grid,
.trip-accommodation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.trip-details-card,
.trip-preference-item,
.trip-readonly-field,
.trip-cost-summary {
  min-width: 0;
}

.trip-details-card,
.trip-preference-item,
.trip-readonly-field {
  display: grid;
  gap: 0.28rem;
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  background: linear-gradient(180deg, #fffafc 0%, #fff4f8 100%);
  border: 1px solid #f6d3e0;
}

.trip-details-card small,
.trip-preference-item span,
.trip-readonly-field small {
  color: var(--tm-muted);
}

.trip-preference-wide {
  grid-column: 1 / -1;
}

.trip-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.trip-chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: #ffe3ef;
  color: var(--tm-accent-strong);
  font-size: 0.9rem;
}

.trip-muted-value {
  color: var(--tm-muted);
}

.trip-stars {
  display: inline-flex;
  gap: 0.3rem;
  color: #d8b4c7;
}

.trip-stars .is-active {
  color: var(--tm-warm);
}

.trip-day-list {
  display: grid;
  gap: 0.9rem;
}

.trip-day-card {
  display: grid;
  gap: 0.9rem;
  padding: 1rem;
  border-radius: 16px;
  background: linear-gradient(180deg, #fffdfd 0%, #fff6f9 100%);
  border: 1px solid #f7d6e2;
}

.trip-day-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.trip-day-header p {
  margin: 0.25rem 0 0;
  color: var(--tm-muted);
}

.trip-day-route {
  max-width: 55%;
  text-align: right;
  color: var(--tm-accent-strong);
  font-weight: 600;
}

.trip-subsection {
  display: grid;
  gap: 0.7rem;
}

.trip-activity-list {
  display: grid;
  gap: 0.6rem;
}

.trip-activity-card {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: start;
  padding: 0.85rem 0.9rem;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fff6fa 100%);
  border: 1px solid #f8d9e4;
}

.trip-activity-time,
.trip-activity-cost {
  font-weight: 600;
  color: var(--tm-accent-strong);
}

.trip-activity-main {
  min-width: 0;
}

.trip-activity-main p,
.trip-empty-inline {
  margin: 0.22rem 0 0;
}

.trip-activity-main small {
  color: var(--tm-muted);
}

.trip-cost-summary {
  display: grid;
  gap: 0.35rem;
}

.trip-cost-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0.95rem;
  border-radius: 14px;
  background: linear-gradient(180deg, #fffafc 0%, #fff4f8 100%);
  border: 1px solid #f6d3e0;
}

.trip-cost-total {
  margin-top: 0.2rem;
  background: linear-gradient(135deg, #ffe7f1 0%, #ffefe5 100%);
}

.trip-empty-state {
  padding: 1rem;
  border-radius: 14px;
  background: var(--tm-surface-soft);
  color: var(--tm-muted);
}

@media (max-width: 768px) {
  .trip-details-header,
  .trip-day-header,
  .trip-activity-card,
  .trip-cost-row {
    grid-template-columns: 1fr;
    display: grid;
  }

  .trip-details-grid,
  .trip-preferences-grid,
  .trip-accommodation-grid {
    grid-template-columns: 1fr;
  }

  .trip-day-route {
    max-width: none;
    text-align: left;
  }
}
</style>

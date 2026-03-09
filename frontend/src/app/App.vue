<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import { RouterView, useRoute, useRouter } from 'vue-router'
import logoUrl from '../assets/tripmaster-logo.svg'
import { appUiContextKey } from './context'
import {
  currencyOptions,
  languageOptions,
  localeByLanguage,
  translations,
  type Currency,
  type Language
} from '../locales/i18n'
import { getTrips, type Trip } from '../services/api/tripsApi'

const language = ref<Language>('en')
const currency = ref<Currency>('EUR')
const texts = computed(() => translations[language.value])
const route = useRoute()
const router = useRouter()
const currentYear = new Date().getFullYear()
const trips = ref<Trip[]>([])
const isSidebarLoading = ref(false)
const sidebarLoadFailed = ref(false)
const activeTripIndex = ref<number | null>(null)

function goToCreateTrip() {
  if (route.name !== 'home') {
    void router.push({ name: 'home' }).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
    return
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatBudget(value: number) {
  return new Intl.NumberFormat(localeByLanguage[language.value], {
    style: 'currency',
    currency: currency.value
  }).format(value)
}

async function loadSidebarTrips() {
  isSidebarLoading.value = true
  sidebarLoadFailed.value = false
  try {
    const fetchedTrips = await getTrips()
    trips.value = [...fetchedTrips].sort((a, b) => b.id - a.id)
  } catch {
    sidebarLoadFailed.value = true
  } finally {
    isSidebarLoading.value = false
  }
}

function openTripInEditor(tripId: number) {
  void router.push({ name: 'trip-edit', params: { id: String(tripId) } })
}

function handleTripChanged() {
  void loadSidebarTrips()
}

onMounted(() => {
  window.addEventListener('trip:changed', handleTripChanged)
  void loadSidebarTrips()
})

onBeforeUnmount(() => {
  window.removeEventListener('trip:changed', handleTripChanged)
})

provide(appUiContextKey, {
  language,
  currency,
  texts
})
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand-block">
        <img :src="logoUrl" alt="TripMaster logo" class="brand-logo" />
        <div>
          <strong class="brand-name">{{ texts.title }}</strong>
          <p class="subtitle">{{ texts.subtitle }}</p>
        </div>
      </div>

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
    </header>

    <div class="layout-grid">
      <aside class="left-sidebar">
        <Button type="button" icon="pi pi-plus" :label="texts.createTrip" class="sidebar-create-btn" @click="goToCreateTrip" />

        <div class="sidebar-header">
          <h2>{{ texts.upcomingTrips }}</h2>
          <Button type="button" text rounded icon="pi pi-refresh" class="sidebar-refresh-btn" @click="loadSidebarTrips" />
        </div>

        <p v-if="isSidebarLoading" class="muted sidebar-state">{{ texts.loadingCities }}</p>
        <p v-else-if="sidebarLoadFailed" class="muted sidebar-state">{{ texts.connectError }}</p>
        <p v-else-if="!trips.length" class="muted sidebar-state">{{ texts.noTrips }}</p>

        <Accordion v-else v-model:activeIndex="activeTripIndex" class="trip-accordion">
          <AccordionTab v-for="trip in trips" :key="trip.id">
            <template #header>
              <span class="trip-item-title">{{ trip.name }}</span>
            </template>

            <div class="trip-summary">
              <p><strong>{{ texts.country }}:</strong> {{ trip.country }}</p>
              <p><strong>{{ texts.startDate }}:</strong> {{ trip.startDate }} -> {{ trip.endDate }}</p>
              <p><strong>{{ texts.budgetLabel }}:</strong> {{ formatBudget(Number(trip.budget)) }}</p>
              <Button
                type="button"
                text
                icon="pi pi-pencil"
                :label="texts.editTrip"
                class="sidebar-edit-btn"
                @click="openTripInEditor(trip.id)"
              />
            </div>
          </AccordionTab>
        </Accordion>
      </aside>

      <main class="page-content">
        <RouterView />
      </main>
    </div>

    <footer class="app-footer">
      <p>{{ texts.title }} · {{ currentYear }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import TripCreator from '../components/trip/TripCreator.vue'
import { getTrips } from '../services/api/tripsApi'
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

const texts = computed(() => translations[language.value])
const error = computed(() => (errorKey.value ? texts.value[errorKey.value] : ''))

function formatCurrency(value: number) {
  return new Intl.NumberFormat(localeByLanguage[language.value], {
    style: 'currency',
    currency: currency.value
  }).format(value)
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
      <h1>{{ texts.title }}</h1>
      <p class="subtitle">{{ texts.subtitle }}</p>
    </header>

    <Card class="preferences-card">
      <template #content>
        <div class="preferences-grid">
          <div class="field-group">
            <label>{{ texts.languageLabel }}</label>
            <Dropdown
              v-model="language"
              :options="languageOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
          <div class="field-group">
            <label>{{ texts.currencyLabel }}</label>
            <Dropdown
              v-model="currency"
              :options="currencyOptions"
              option-label="label"
              option-value="value"
              class="w-full"
            />
          </div>
        </div>
      </template>
    </Card>

    <TripCreator :texts="texts" :currency-code="currency" @created="loadTrips" />

    <Message v-if="error" severity="error" :closable="false" class="top-error">
      {{ error }}
    </Message>

    <section class="trip-list">
      <h2>{{ texts.upcomingTrips }}</h2>
      <p v-if="!trips.length" class="muted">{{ texts.noTrips }}</p>
      <div v-else class="trip-grid">
        <Card v-for="trip in trips" :key="trip.id" class="trip-card">
          <template #title>{{ trip.name }}</template>
          <template #content>
            <p>{{ trip.country }}</p>
            <p>{{ trip.startDate }} -> {{ trip.endDate }}</p>
            <p>{{ texts.budgetLabel }}: {{ formatCurrency(Number(trip.budget)) }}</p>
          </template>
        </Card>
      </div>
    </section>
  </main>
</template>

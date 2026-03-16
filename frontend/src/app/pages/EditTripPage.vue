<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Message from 'primevue/message'
import TripForm from '../../components/trip/TripForm.vue'
import type { TripFormInitialData, TripFormSubmitPayload } from '../../components/trip/types'
import { appUiContextKey } from '../context'
import { getTripById, updateTrip } from '../../services/api/tripsApi'

const appUi = inject(appUiContextKey)
if (!appUi) throw new Error('App UI context is not available')

const route = useRoute()
const router = useRouter()

const initialData = ref<TripFormInitialData | null>(null)
const isLoading = ref(true)
const isSaving = ref(false)
const loadError = ref(false)
const saveError = ref(false)
const texts = computed(() => appUi.texts.value)
const currencyCode = computed(() => appUi.currency.value)

const tripId = computed(() => Number(route.params.id))

async function loadTrip() {
  isLoading.value = true
  loadError.value = false
  saveError.value = false

  if (!Number.isFinite(tripId.value) || tripId.value <= 0) {
    loadError.value = true
    isLoading.value = false
    return
  }

  try {
    const trip = await getTripById(tripId.value)
    const countries =
      trip.details?.countries?.length
        ? trip.details.countries
        : trip.country
            .split(',')
            .map((country) => country.trim())
            .filter((country) => country.length > 0)

    initialData.value = {
      name: trip.name,
      countries,
      startDate: trip.startDate,
      endDate: trip.endDate,
      budget: Number(trip.budget),
      details: trip.details
    }
  } catch {
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

async function handleSubmit(payload: TripFormSubmitPayload) {
  if (isSaving.value || !Number.isFinite(tripId.value) || tripId.value <= 0) return

  try {
    isSaving.value = true
    saveError.value = false
    await updateTrip(tripId.value, payload)
    await router.push({ name: 'home' })
  } catch {
    saveError.value = true
  } finally {
    isSaving.value = false
  }
}

void loadTrip()
</script>

<template>
  <section class="creator-section edit-page">
    <Message v-if="loadError" severity="error" :closable="false" class="top-error">
      {{ texts.connectError }}
    </Message>

    <Message v-if="saveError" severity="error" :closable="false" class="top-error">
      {{ texts.createError }}
    </Message>

    <div v-if="isLoading" class="muted">{{ texts.loadingCities }}</div>
    <TripForm
      v-else-if="initialData"
      :texts="texts"
      :currency-code="currencyCode"
      :is-saving="isSaving"
      :form-title="texts.editTrip"
      :initial-data="initialData"
      @submit="handleSubmit"
    />
  </section>
</template>

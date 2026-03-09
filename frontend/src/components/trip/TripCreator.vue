<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import Message from 'primevue/message'
import TripForm from './TripForm.vue'
import { createTrip, getTrips } from '../../services/api/tripsApi'
import type { Currency, TripFormTexts } from '../../locales/i18n'
import type { TripFormSubmitPayload } from './types'

const props = defineProps<{
  texts: TripFormTexts & { createError: string; createSuccess: string }
  currencyCode: Currency
}>()

const emit = defineEmits<{
  (e: 'created'): void
}>()

const hasCreateError = ref(false)
const hasCreateSuccess = ref(false)
const isSaving = ref(false)
const errorMessage = computed(() => (hasCreateError.value ? props.texts.createError : ''))
const successMessage = computed(() => (hasCreateSuccess.value ? props.texts.createSuccess : ''))
let successTimer: ReturnType<typeof setTimeout> | null = null

async function getDefaultTripName() {
  try {
    const trips = await getTrips()
    const usedIndexes = trips
      .map((trip) => {
        const match = /^trip\s+(\d+)$/i.exec(trip.name.trim())
        return match ? Number(match[1]) : null
      })
      .filter((value): value is number => value !== null && Number.isFinite(value))

    const nextIndex = usedIndexes.length ? Math.max(...usedIndexes) + 1 : 1
    return `Trip ${nextIndex}`
  } catch {
    return 'Trip 1'
  }
}

async function handleCreate(payload: TripFormSubmitPayload) {
  if (isSaving.value) return
  try {
    hasCreateError.value = false
    hasCreateSuccess.value = false
    isSaving.value = true
    const normalizedName = payload.name.trim().length > 0 ? payload.name.trim() : await getDefaultTripName()
    await createTrip({
      ...payload,
      name: normalizedName
    })
    hasCreateSuccess.value = true
    if (successTimer) clearTimeout(successTimer)
    successTimer = setTimeout(() => {
      hasCreateSuccess.value = false
      successTimer = null
    }, 5000)
    emit('created')
  } catch {
    hasCreateError.value = true
  } finally {
    isSaving.value = false
  }
}

onBeforeUnmount(() => {
  if (successTimer) clearTimeout(successTimer)
})
</script>

<template>
  <section class="creator-section">
    <TripForm :texts="texts" :currency-code="currencyCode" :is-saving="isSaving" @submit="handleCreate" />
    <Message v-if="successMessage" severity="success" :closable="false" class="top-error">
      {{ successMessage }}
    </Message>
    <Message v-if="errorMessage" severity="error" :closable="false" class="top-error">
      {{ errorMessage }}
    </Message>
  </section>
</template>

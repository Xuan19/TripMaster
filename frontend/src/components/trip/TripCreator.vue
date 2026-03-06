<script setup lang="ts">
import { computed, ref } from 'vue'
import Message from 'primevue/message'
import TripForm from './TripForm.vue'
import { createTrip, getTrips } from '../../services/api/tripsApi'
import type { Currency, TripFormTexts } from '../../locales/i18n'
import type { TripFormSubmitPayload } from './types'

const props = defineProps<{
  texts: TripFormTexts & { createError: string }
  currencyCode: Currency
}>()

const emit = defineEmits<{
  (e: 'created'): void
}>()

const hasCreateError = ref(false)
const errorMessage = computed(() => (hasCreateError.value ? props.texts.createError : ''))

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
  try {
    hasCreateError.value = false
    const normalizedName = payload.name.trim().length > 0 ? payload.name.trim() : await getDefaultTripName()
    await createTrip({
      ...payload,
      name: normalizedName
    })
    emit('created')
  } catch {
    hasCreateError.value = true
  }
}
</script>

<template>
  <section class="creator-section">
    <TripForm :texts="texts" :currency-code="currencyCode" @submit="handleCreate" />
    <Message v-if="errorMessage" severity="error" :closable="false" class="top-error">
      {{ errorMessage }}
    </Message>
  </section>
</template>

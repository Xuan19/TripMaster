<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import Message from 'primevue/message'
import TripForm from './TripForm.vue'
import { createTrip } from '../../services/api/tripsApi'
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

function getDefaultTripName(payload: TripFormSubmitPayload) {
  const countries = payload.details.countries
    .map((country) => country.trim())
    .filter((country) => country.length > 0)
  const countryLabel = countries.length > 0 ? countries.join(', ') : payload.country.trim() || 'Trip'
  const dayCount = Math.max(1, payload.details.dayPlans.length)
  const dayLabel = `${dayCount} day${dayCount === 1 ? '' : 's'}`

  return `${countryLabel} - ${dayLabel}`
}

async function handleCreate(payload: TripFormSubmitPayload) {
  if (isSaving.value) return
  try {
    hasCreateError.value = false
    hasCreateSuccess.value = false
    isSaving.value = true
    const normalizedName = payload.name.trim().length > 0 ? payload.name.trim() : getDefaultTripName(payload)
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

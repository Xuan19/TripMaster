<script setup lang="ts">
import { computed, ref } from 'vue'
import Message from 'primevue/message'
import TripForm from './TripForm.vue'
import { createTrip } from '../../services/api/tripsApi'
import type { CreateTripPayload } from '../../services/api/tripsApi'
import type { Currency, TripFormTexts } from '../../locales/i18n'

const props = defineProps<{
  texts: TripFormTexts & { createError: string }
  currencyCode: Currency
}>()

const emit = defineEmits<{
  (e: 'created'): void
}>()

const hasCreateError = ref(false)
const errorMessage = computed(() => (hasCreateError.value ? props.texts.createError : ''))

async function handleCreate(payload: CreateTripPayload) {
  try {
    hasCreateError.value = false
    await createTrip(payload)
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

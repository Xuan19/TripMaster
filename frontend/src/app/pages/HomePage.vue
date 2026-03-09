<script setup lang="ts">
import { computed, inject } from 'vue'
import TripCreator from '../../components/trip/TripCreator.vue'
import { appUiContextKey } from '../context'

const appUi = inject(appUiContextKey)
if (!appUi) throw new Error('App UI context is not available')

const texts = computed(() => appUi.texts.value)
const currencyCode = computed(() => appUi.currency.value)

function handleTripCreated() {
  window.dispatchEvent(new CustomEvent('trip:changed'))
}
</script>

<template>
  <TripCreator :texts="texts" :currency-code="currencyCode" @created="handleTripCreated" />
</template>

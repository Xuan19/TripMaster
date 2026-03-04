<script setup lang="ts">
import { onMounted, ref } from 'vue'
import TripForm from './components/TripForm.vue'
import { createTrip, getTrips } from './services/tripsApi'
import type { CreateTripPayload, Trip } from './services/tripsApi'

const trips = ref<Trip[]>([])
const error = ref('')

async function loadTrips() {
  try {
    error.value = ''
    trips.value = await getTrips()
  } catch {
    error.value = 'Could not connect to API. Make sure backend is running.'
  }
}

async function handleCreate(payload: CreateTripPayload) {
  try {
    await createTrip(payload)
    await loadTrips()
  } catch {
    error.value = 'Trip creation failed. Check API validation rules.'
  }
}

onMounted(loadTrips)
</script>

<template>
  <main class="page">
    <h1>TripMaster Planner</h1>
    <p class="subtitle">Plan and manage your trips in one place.</p>

    <TripForm @submit="handleCreate" />

    <p v-if="error" class="error">{{ error }}</p>

    <section class="trip-list">
      <h2>Upcoming trips</h2>
      <p v-if="!trips.length">No trips yet.</p>
      <article v-for="trip in trips" :key="trip.id" class="trip-card">
        <h3>{{ trip.name }}</h3>
        <p>{{ trip.country }}</p>
        <p>{{ trip.startDate }} -> {{ trip.endDate }}</p>
        <p>Budget: ${{ Number(trip.budget).toFixed(2) }}</p>
      </article>
    </section>
  </main>
</template>

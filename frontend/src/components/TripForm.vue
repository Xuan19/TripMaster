<script setup>
import { reactive } from 'vue'

const emit = defineEmits(['submit'])

const form = reactive({
  name: '',
  country: '',
  startDate: '',
  endDate: '',
  budget: 0
})

function handleSubmit() {
  emit('submit', { ...form, budget: Number(form.budget) })
}
</script>

<template>
  <form class="trip-form" @submit.prevent="handleSubmit">
    <h2>Create Trip</h2>
    <input v-model="form.name" placeholder="Trip name" required />
    <input v-model="form.country" placeholder="Country" required />
    <label>
      Start date
      <input v-model="form.startDate" type="date" required />
    </label>
    <label>
      End date
      <input v-model="form.endDate" type="date" required />
    </label>
    <input v-model="form.budget" type="number" min="0" placeholder="Budget" required />
    <button type="submit">Save</button>
  </form>
</template>

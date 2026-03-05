<script setup lang="ts">
import { computed, reactive } from 'vue'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import type { Currency, TripFormTexts } from '../../locales/i18n'

export interface CreateTripPayload {
  name: string
  country: string
  startDate: string
  endDate: string
  budget: number
}

const props = defineProps<{
  texts: TripFormTexts
  currencyCode: Currency
}>()

const emit = defineEmits<{
  (e: 'submit', payload: CreateTripPayload): void
}>()

const form = reactive({
  name: '',
  country: '',
  startDate: null as Date | null,
  endDate: null as Date | null,
  budget: null as number | null
})

const canSubmit = computed(
  () =>
    form.name.trim().length > 0 &&
    form.country.trim().length > 0 &&
    form.startDate !== null &&
    form.endDate !== null &&
    form.budget !== null &&
    form.budget >= 0
)

function toIsoDate(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function handleSubmit() {
  if (!canSubmit.value) return

  emit('submit', {
    name: form.name.trim(),
    country: form.country.trim(),
    startDate: toIsoDate(form.startDate as Date),
    endDate: toIsoDate(form.endDate as Date),
    budget: Number(form.budget)
  })
}
</script>

<template>
  <form class="trip-form" @submit.prevent="handleSubmit">
    <h2>{{ props.texts.createTrip }}</h2>

    <div class="field-group">
      <label>{{ props.texts.tripName }}</label>
      <InputText v-model="form.name" :placeholder="props.texts.tripName" />
    </div>

    <div class="field-group">
      <label>{{ props.texts.country }}</label>
      <InputText v-model="form.country" :placeholder="props.texts.country" />
    </div>

    <div class="field-group">
      <label>{{ props.texts.startDate }}</label>
      <Calendar v-model="form.startDate" date-format="yy-mm-dd" show-icon />
    </div>

    <div class="field-group">
      <label>{{ props.texts.endDate }}</label>
      <Calendar v-model="form.endDate" date-format="yy-mm-dd" show-icon />
    </div>

    <div class="field-group">
      <label>{{ props.texts.budget }}</label>
      <InputNumber
        v-model="form.budget"
        mode="decimal"
        :min="0"
        :placeholder="`${props.texts.budget} (${props.currencyCode})`"
      />
    </div>

    <Button type="submit" :label="props.texts.save" :disabled="!canSubmit" />
  </form>
</template>

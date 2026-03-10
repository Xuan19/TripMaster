<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import Accordion from 'primevue/accordion'
import AccordionTab from 'primevue/accordiontab'
import Button from 'primevue/button'
import ConfirmDialog from 'primevue/confirmdialog'
import Dropdown from 'primevue/dropdown'
import { useConfirm } from 'primevue/useconfirm'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AuthPanel from '../components/auth/AuthPanel.vue'
import logoUrl from '../assets/tripmaster-logo.svg'
import { appUiContextKey } from './context'
import {
  currencyOptions,
  languageOptions,
  localeByLanguage,
  translations,
  type Currency,
  type Language
} from '../locales/i18n'
import { deleteTrip, getTrips, type Trip } from '../services/api/tripsApi'
import { clearAuthSession, getAuthUsername, isAuthenticated } from '../services/api/authSession'

const language = ref<Language>('en')
const currency = ref<Currency>('EUR')
const texts = computed(() => translations[language.value])
const route = useRoute()
const router = useRouter()
const confirm = useConfirm()
const currentYear = new Date().getFullYear()
const trips = ref<Trip[]>([])
const isSidebarLoading = ref(false)
const sidebarLoadFailed = ref(false)
const activeTripIndex = ref<number | null>(null)
const isLoggedIn = ref(isAuthenticated())
const authUsername = ref(getAuthUsername() ?? '')

function goToCreateTrip() {
  if (route.name !== 'home') {
    void router.push({ name: 'home' }).then(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
    return
  }

  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatBudget(value: number) {
  return new Intl.NumberFormat(localeByLanguage[language.value], {
    style: 'currency',
    currency: currency.value
  }).format(value)
}

async function loadSidebarTrips() {
  if (!isLoggedIn.value) return
  isSidebarLoading.value = true
  sidebarLoadFailed.value = false
  try {
    const fetchedTrips = await getTrips()
    trips.value = [...fetchedTrips].sort((a, b) => b.id - a.id)
  } catch (error: any) {
    if (error?.response?.status === 401) {
      handleLogout()
      return
    }
    sidebarLoadFailed.value = true
  } finally {
    isSidebarLoading.value = false
  }
}

function openTripInEditor(tripId: number) {
  void router.push({ name: 'trip-edit', params: { id: String(tripId) } })
}

function handleDeleteTrip(tripId: number) {
  confirm.require({
    message: texts.value.deleteTripConfirm,
    header: texts.value.deleteTrip,
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: texts.value.back,
    acceptLabel: texts.value.deleteTrip,
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await deleteTrip(tripId)
        if (route.name === 'trip-edit' && route.params.id === String(tripId)) {
          await router.push({ name: 'home' })
        }
        await loadSidebarTrips()
      } catch (error: any) {
        if (error?.response?.status === 401) {
          handleLogout()
        }
      }
    }
  })
}

function handleTripChanged() {
  if (!isLoggedIn.value) return
  void loadSidebarTrips()
}

function handleAuthenticated(username: string) {
  authUsername.value = username
  isLoggedIn.value = true
  void loadSidebarTrips()
}

function handleLogout() {
  clearAuthSession()
  isLoggedIn.value = false
  authUsername.value = ''
  trips.value = []
  activeTripIndex.value = null
}

onMounted(() => {
  window.addEventListener('trip:changed', handleTripChanged)
  void loadSidebarTrips()
})

onBeforeUnmount(() => {
  window.removeEventListener('trip:changed', handleTripChanged)
})

provide(appUiContextKey, {
  language,
  currency,
  texts
})
</script>

<template>
  <div class="app-shell">
    <ConfirmDialog />
    <header class="app-header">
      <div class="brand-block">
        <img :src="logoUrl" alt="TripMaster logo" class="brand-logo" />
        <div>
          <strong class="brand-name">{{ texts.title }}</strong>
          <p class="subtitle">{{ texts.subtitle }}</p>
        </div>
      </div>

      <div class="header-settings">
        <div class="header-control">
          <label>{{ texts.languageLabel }}</label>
          <Dropdown
            v-model="language"
            :options="languageOptions"
            option-label="label"
            option-value="value"
            class="compact-select"
          />
        </div>

        <div class="header-control">
          <label>{{ texts.currencyLabel }}</label>
          <Dropdown
            v-model="currency"
            :options="currencyOptions"
            option-label="label"
            option-value="value"
            class="compact-select"
          />
        </div>
        <Button
          v-if="isLoggedIn"
          type="button"
          text
          icon="pi pi-sign-out"
          :label="`Logout (${authUsername})`"
          class="logout-btn"
          @click="handleLogout"
        />
      </div>
    </header>

    <div v-if="isLoggedIn" class="layout-grid">
      <aside class="left-sidebar">
        <Button type="button" icon="pi pi-plus" :label="texts.createTrip" class="sidebar-create-btn" @click="goToCreateTrip" />

        <div class="sidebar-header">
          <h2>{{ texts.upcomingTrips }}</h2>
          <Button type="button" text rounded icon="pi pi-refresh" class="sidebar-refresh-btn" @click="loadSidebarTrips" />
        </div>

        <p v-if="isSidebarLoading" class="muted sidebar-state">{{ texts.loadingCities }}</p>
        <p v-else-if="sidebarLoadFailed" class="muted sidebar-state">{{ texts.connectError }}</p>
        <p v-else-if="!trips.length" class="muted sidebar-state">{{ texts.noTrips }}</p>

        <Accordion v-else v-model:activeIndex="activeTripIndex" class="trip-accordion">
          <AccordionTab v-for="trip in trips" :key="trip.id">
            <template #header>
              <span class="trip-item-title">{{ trip.name }}</span>
            </template>

            <div class="trip-summary">
              <p><strong>{{ texts.country }}:</strong> {{ trip.country }}</p>
              <p><strong>{{ texts.startDate }}:</strong> {{ trip.startDate }} -> {{ trip.endDate }}</p>
              <p><strong>{{ texts.budgetLabel }}:</strong> {{ formatBudget(Number(trip.budget)) }}</p>
              <Button
                type="button"
                text
                icon="pi pi-pencil"
                :label="texts.editTrip"
                class="sidebar-edit-btn"
                @click="openTripInEditor(trip.id)"
              />
              <Button
                type="button"
                text
                icon="pi pi-trash"
                :label="texts.deleteTrip"
                class="sidebar-delete-btn"
                @click="handleDeleteTrip(trip.id)"
              />
            </div>
          </AccordionTab>
        </Accordion>
      </aside>

      <main class="page-content">
        <RouterView />
      </main>
    </div>
    <main v-else class="auth-main">
      <AuthPanel @authenticated="handleAuthenticated" />
    </main>

    <footer class="app-footer">
      <p>{{ texts.title }} · {{ currentYear }}</p>
    </footer>
  </div>
</template>

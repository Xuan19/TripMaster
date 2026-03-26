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
import { convertAmount, getCurrencyDisplay, isCurrency } from '../utils/currency'

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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function sanitizeFileName(value: string) {
  const normalized = value.trim().replace(/[<>:"/\\|?*]+/g, '-').replace(/\s+/g, ' ')
  return normalized.length > 0 ? normalized : 'trip'
}

function getTripSourceCurrency(trip: Trip): Currency {
  return isCurrency(trip.details?.currencyCode) ? trip.details.currencyCode : currency.value
}

function convertTripAmount(value: number, trip: Trip) {
  return convertAmount(value, getTripSourceCurrency(trip), currency.value)
}

function buildTripCostSummary(trip: Trip) {
  const dayPlans = trip.details?.dayPlans ?? []
  const summary = {
    accommodation: 0,
    visit: 0,
    meal: 0,
    transport: 0,
    shopping: 0,
    other: 0
  }

  dayPlans.forEach((dayPlan) => {
    summary.accommodation += convertTripAmount(Number(dayPlan.accommodation?.cost ?? 0), trip)
    dayPlan.activities.forEach((activity) => {
      const cost = convertTripAmount(Number(activity.cost ?? 0), trip)
      switch (activity.type) {
        case 'visit':
          summary.visit += cost
          break
        case 'meal':
          summary.meal += cost
          break
        case 'transport':
          summary.transport += cost
          break
        case 'shopping':
          summary.shopping += cost
          break
        default:
          summary.other += cost
          break
      }
    })
  })

  const rows = [
    { label: texts.value.accommodation, value: summary.accommodation },
    { label: texts.value.activityVisit, value: summary.visit },
    { label: texts.value.activityMeal, value: summary.meal },
    { label: texts.value.activityTransport, value: summary.transport },
    { label: texts.value.activityShopping, value: summary.shopping },
    { label: texts.value.activityOther, value: summary.other }
  ].filter((row) => row.value > 0)

  const total = rows.reduce((sum, row) => sum + row.value, 0)
  return { rows, total }
}

function buildTripDocumentHtml(trip: Trip) {
  const dayPlans = trip.details?.dayPlans ?? []
  const costSummary = buildTripCostSummary(trip)
  const daySections = dayPlans.length
    ? dayPlans
        .map((dayPlan) => {
          const cities = dayPlan.cities.filter(Boolean).join(' -> ') || '-'
          const accommodation = dayPlan.accommodation?.name
            ? `
              <p><strong>${escapeHtml(texts.value.accommodation)}:</strong> ${escapeHtml(dayPlan.accommodation.name)}</p>
              <p><strong>${escapeHtml(texts.value.accommodationCheckIn)}:</strong> ${escapeHtml(dayPlan.accommodation.checkInTime || '-')}</p>
            `
            : ''
          const activities = dayPlan.activities.length
            ? `
              <table>
                <thead>
                  <tr>
                    <th>${escapeHtml(texts.value.activityStartTime)}</th>
                    <th>${escapeHtml(texts.value.activityEndTime)}</th>
                    <th>${escapeHtml(texts.value.activityType)}</th>
                    <th>${escapeHtml(texts.value.activityName)}</th>
                    <th>${escapeHtml(texts.value.activityCost)}</th>
                  </tr>
                </thead>
                <tbody>
                  ${dayPlan.activities
                    .map(
                      (activity) => `
                        <tr>
                          <td>${escapeHtml(activity.startTime)}</td>
                          <td>${escapeHtml(activity.endTime)}</td>
                          <td>${escapeHtml(activity.type)}</td>
                          <td>${escapeHtml(activity.details)}</td>
                          <td>${formatBudget(convertTripAmount(Number(activity.cost ?? 0), trip))}</td>
                        </tr>
                      `
                    )
                    .join('')}
                </tbody>
              </table>
            `
            : `<p>${escapeHtml(texts.value.noTripDetails)}</p>`

          return `
            <section class="day-section">
              <h2>${escapeHtml(texts.value.day)} ${dayPlan.day} - ${escapeHtml(dayPlan.date)}</h2>
              <p><strong>${escapeHtml(texts.value.savedCities)}:</strong> ${escapeHtml(cities)}</p>
              ${accommodation}
              ${activities}
            </section>
          `
        })
        .join('')
    : `<p>${escapeHtml(texts.value.noTripDetails)}</p>`

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(trip.name)}</title>
        <style>
          body { font-family: Calibri, Arial, sans-serif; color: #2d1b24; line-height: 1.45; }
          h1 { color: #7a103f; margin-bottom: 8px; }
          h2 { color: #be185d; margin: 20px 0 8px; font-size: 18px; }
          p { margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e9b7cb; padding: 6px 8px; text-align: left; vertical-align: top; }
          th { background: #fff1f7; color: #7a103f; }
          .summary { margin-bottom: 18px; }
          .cost-summary { margin: 16px 0 20px; }
          .day-section { margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(trip.name)}</h1>
        <div class="summary">
          <p><strong>${escapeHtml(texts.value.country)}:</strong> ${escapeHtml(trip.country)}</p>
          <p><strong>${escapeHtml(texts.value.period)}:</strong> ${escapeHtml(trip.startDate)} -> ${escapeHtml(trip.endDate)}</p>
          <p><strong>${escapeHtml(texts.value.budgetLabel)}:</strong> ${formatBudget(convertTripAmount(Number(trip.budget), trip))}</p>
        </div>
        ${daySections}
        ${
          costSummary.rows.length
            ? `
              <section class="cost-summary">
                <h2>Cost summary</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>${escapeHtml(texts.value.activityCost)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${costSummary.rows
                      .map(
                        (row) => `
                          <tr>
                            <td>${escapeHtml(row.label)}</td>
                            <td>${formatBudget(row.value)}</td>
                          </tr>
                        `
                      )
                      .join('')}
                    <tr>
                      <td><strong>${escapeHtml(texts.value.totalCost)}</strong></td>
                      <td><strong>${formatBudget(costSummary.total)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </section>
            `
            : ''
        }
      </body>
    </html>
  `
}

function exportTripToWord(trip: Trip) {
  const html = buildTripDocumentHtml(trip)
  const blob = new Blob([`\ufeff${html}`], { type: 'application/msword;charset=utf-8' })
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = downloadUrl
  link.download = `${sanitizeFileName(trip.name)}.doc`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(downloadUrl)
}

function exportTripToPdf(trip: Trip) {
  const html = buildTripDocumentHtml(trip)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const blobUrl = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')

  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.src = blobUrl

  const cleanup = () => {
    iframe.remove()
    URL.revokeObjectURL(blobUrl)
  }

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow
    if (!frameWindow) {
      cleanup()
      return
    }

    let cleanedUp = false
    const cleanupOnce = () => {
      if (cleanedUp) return
      cleanedUp = true
      cleanup()
    }

    frameWindow.addEventListener(
      'afterprint',
      () => {
        cleanupOnce()
      },
      { once: true }
    )

    frameWindow.setTimeout(() => {
      frameWindow.focus()
      frameWindow.print()
      frameWindow.setTimeout(cleanupOnce, 1000)
    }, 300)
  }

  document.body.appendChild(iframe)
}

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
    currency: currency.value,
    currencyDisplay: getCurrencyDisplay(currency.value)
  }).format(value)
}

function formatTripPreview(trip: Trip) {
  const lines = [
    `${trip.name}`,
    `${texts.value.country}: ${trip.country}`,
    `${texts.value.period}: ${trip.startDate} -> ${trip.endDate}`,
    `${texts.value.budgetLabel}: ${formatBudget(convertTripAmount(Number(trip.budget), trip))}`
  ]

  const dayPlans = trip.details?.dayPlans ?? []
  if (!dayPlans.length) {
    lines.push(texts.value.noTripDetails)
    return lines.join('\n')
  }

  dayPlans.forEach((dayPlan) => {
    const cities = dayPlan.cities.filter(Boolean).join(' -> ')
    const activities = dayPlan.activities
      .map((activity) => `${activity.startTime}-${activity.endTime} ${activity.details}`)
      .join(' | ')
    const accommodation = dayPlan.accommodation?.name
      ? ` | ${texts.value.accommodation}: ${dayPlan.accommodation.name}`
      : ''

    lines.push(`Day ${dayPlan.day} (${dayPlan.date})`)
    lines.push(`  ${texts.value.savedCities}: ${cities || '-'}`)
    if (activities) {
      lines.push(`  ${texts.value.savedActivities}: ${activities}`)
    }
    if (accommodation) {
      lines.push(`  ${accommodation.trim()}`)
    }
  })

  return lines.join('\n')
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

function openTripDetails(tripId: number) {
  void router.push({ name: 'trip-details', params: { id: String(tripId) } })
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
        if ((route.name === 'trip-edit' || route.name === 'trip-details') && route.params.id === String(tripId)) {
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
              <div class="trip-header">
                <span class="trip-item-title">{{ trip.name }}</span>
              </div>
            </template>

            <div class="trip-summary">
              <p><strong>{{ texts.country }}:</strong> {{ trip.country }}</p>
              <p><strong>{{ texts.period }}:</strong> {{ trip.startDate }} -> {{ trip.endDate }}</p>
              <p><strong>{{ texts.budgetLabel }}:</strong> {{ formatBudget(convertTripAmount(Number(trip.budget), trip)) }}</p>
              <div class="trip-summary-actions">
                <Button
                  type="button"
                  text
                  rounded
                  icon="pi pi-file-word"
                  class="trip-export-btn"
                  :aria-label="texts.exportWord"
                  @click.stop="exportTripToWord(trip)"
                />
                <Button
                  type="button"
                  text
                  rounded
                  icon="pi pi-file-pdf"
                  class="trip-export-btn trip-export-pdf-btn"
                  :aria-label="texts.exportPdf"
                  @click.stop="exportTripToPdf(trip)"
                />
                <Button
                  type="button"
                  text
                  rounded
                  icon="pi pi-eye"
                  class="trip-preview-btn"
                  :aria-label="texts.tripDetails"
                  @click.stop="openTripDetails(trip.id)"
                />
                <Button
                  type="button"
                  text
                  rounded
                  icon="pi pi-pencil"
                  class="sidebar-edit-btn"
                  @click.stop="openTripInEditor(trip.id)"
                />
                <Button
                  type="button"
                  text
                  rounded
                  icon="pi pi-trash"
                  class="sidebar-delete-btn"
                  @click.stop="handleDeleteTrip(trip.id)"
                />
              </div>
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

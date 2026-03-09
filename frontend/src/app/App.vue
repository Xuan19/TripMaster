<script setup lang="ts">
import { computed, provide, ref } from 'vue'
import Dropdown from 'primevue/dropdown'
import { RouterView } from 'vue-router'
import { appUiContextKey } from './context'
import {
  currencyOptions,
  languageOptions,
  translations,
  type Currency,
  type Language
} from '../locales/i18n'

const language = ref<Language>('en')
const currency = ref<Currency>('EUR')
const texts = computed(() => translations[language.value])

provide(appUiContextKey, {
  language,
  currency,
  texts
})
</script>

<template>
  <main class="page">
    <header class="page-header">
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
      </div>
      <h1>{{ texts.title }}</h1>
      <p class="subtitle">{{ texts.subtitle }}</p>
    </header>

    <RouterView />
  </main>
</template>

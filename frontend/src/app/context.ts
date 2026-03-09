import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { Currency, Language, UiTexts } from '../locales/i18n'

export interface AppUiContext {
  language: Ref<Language>
  currency: Ref<Currency>
  texts: ComputedRef<UiTexts>
}

export const appUiContextKey: InjectionKey<AppUiContext> = Symbol('appUiContext')

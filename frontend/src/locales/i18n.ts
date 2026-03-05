export type Language = 'en' | 'fr' | 'zh'
export type Currency = 'EUR' | 'USD' | 'CNY'

export interface UiTexts {
  title: string
  subtitle: string
  languageLabel: string
  currencyLabel: string
  createTrip: string
  tripName: string
  country: string
  startDate: string
  endDate: string
  budget: string
  save: string
  upcomingTrips: string
  noTrips: string
  budgetLabel: string
  connectError: string
  createError: string
}

export type TripFormTexts = Pick<
  UiTexts,
  'createTrip' | 'tripName' | 'country' | 'startDate' | 'endDate' | 'budget' | 'save'
>

export const translations: Record<Language, UiTexts> = {
  en: {
    title: 'TripMaster',
    subtitle: 'Plan and manage your trips in one place.',
    languageLabel: 'Language',
    currencyLabel: 'Currency',
    createTrip: 'Create Trip',
    tripName: 'Trip name',
    country: 'Country',
    startDate: 'Start date',
    endDate: 'End date',
    budget: 'Budget',
    save: 'Save',
    upcomingTrips: 'Upcoming trips',
    noTrips: 'No trips yet.',
    budgetLabel: 'Budget',
    connectError: 'Could not connect to API. Make sure backend is running.',
    createError: 'Trip creation failed. Check API validation rules.'
  },
  fr: {
    title: 'TripMaster',
    subtitle: 'Planifiez et gerez vos voyages en un seul endroit.',
    languageLabel: 'Langue',
    currencyLabel: 'Devise',
    createTrip: 'Creer un voyage',
    tripName: 'Nom du voyage',
    country: 'Pays',
    startDate: 'Date de debut',
    endDate: 'Date de fin',
    budget: 'Budget',
    save: 'Enregistrer',
    upcomingTrips: 'Voyages a venir',
    noTrips: 'Aucun voyage pour le moment.',
    budgetLabel: 'Budget',
    connectError: "Impossible de se connecter a l'API. Verifiez que le backend est lance.",
    createError: 'Echec de creation du voyage. Verifiez les regles de validation API.'
  },
  zh: {
    title: 'TripMaster',
    subtitle: '在一个地方规划和管理你的旅行。',
    languageLabel: '语言',
    currencyLabel: '货币',
    createTrip: '创建旅行',
    tripName: '旅行名称',
    country: '国家',
    startDate: '开始日期',
    endDate: '结束日期',
    budget: '预算',
    save: '保存',
    upcomingTrips: '即将开始的旅行',
    noTrips: '暂无旅行。',
    budgetLabel: '预算',
    connectError: '无法连接到 API。请确认后端正在运行。',
    createError: '创建旅行失败。请检查 API 校验规则。'
  }
}

export const languageOptions: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Francais' },
  { value: 'zh', label: '中文' }
]

export const currencyOptions: Array<{ value: Currency; label: string }> = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'Dollar (USD)' },
  { value: 'CNY', label: 'Yuan (CNY)' }
]

export const localeByLanguage: Record<Language, string> = {
  en: 'en-US',
  fr: 'fr-FR',
  zh: 'zh-CN'
}

export type Language = 'en' | 'fr' | 'zh'
export type Currency = 'EUR' | 'USD' | 'CNY'

export interface UiTexts {
  title: string
  subtitle: string
  languageLabel: string
  currencyLabel: string
  createTrip: string
  editTrip: string
  deleteTrip: string
  deleteTripConfirm: string
  back: string
  tripName: string
  country: string
  startDate: string
  numberOfDays: string
  dailyProgram: string
  day: string
  city: string
  loadingCities: string
  autoFillCities: string
  addActivity: string
  activityStartTime: string
  activityEndTime: string
  activityType: string
  activityVisit: string
  activityMeal: string
  activityTransport: string
  activityShopping: string
  activityOther: string
  activityName: string
  activityAddress: string
  activityCost: string
  activityDuration: string
  removeActivity: string
  budget: string
  totalCost: string
  remainingBudget: string
  save: string
  upcomingTrips: string
  noTrips: string
  tripDetails: string
  noTripDetails: string
  savedCities: string
  savedActivities: string
  budgetLabel: string
  connectError: string
  createError: string
  createSuccess: string
}

export type TripFormTexts = Pick<
  UiTexts,
  | 'createTrip'
  | 'tripName'
  | 'country'
  | 'startDate'
  | 'numberOfDays'
  | 'dailyProgram'
  | 'day'
  | 'city'
  | 'loadingCities'
  | 'autoFillCities'
  | 'addActivity'
  | 'activityStartTime'
  | 'activityEndTime'
  | 'activityType'
  | 'activityVisit'
  | 'activityMeal'
  | 'activityTransport'
  | 'activityShopping'
  | 'activityOther'
  | 'activityName'
  | 'activityAddress'
  | 'activityCost'
  | 'activityDuration'
  | 'removeActivity'
  | 'budget'
  | 'totalCost'
  | 'remainingBudget'
  | 'save'
>

export const translations: Record<Language, UiTexts> = {
  en: {
    title: 'TripMaster',
    subtitle: 'Plan and manage your trips in one place.',
    languageLabel: 'Language',
    currencyLabel: 'Currency',
    createTrip: 'Create Trip',
    editTrip: 'Edit Trip',
    deleteTrip: 'Delete Trip',
    deleteTripConfirm: 'Delete this trip?',
    back: 'Back',
    tripName: 'Trip name',
    country: 'Country',
    startDate: 'Start date',
    numberOfDays: 'Number of days',
    dailyProgram: 'Daily program',
    day: 'Day',
    city: 'City',
    loadingCities: 'Loading cities...',
    autoFillCities: 'Auto-fill cities',
    addActivity: 'Add activity',
    activityStartTime: 'Start time',
    activityEndTime: 'End time',
    activityType: 'Type',
    activityVisit: 'Visit',
    activityMeal: 'Meal',
    activityTransport: 'Transport',
    activityShopping: 'Shopping',
    activityOther: 'Other',
    activityName: 'Details',
    activityAddress: 'Address',
    activityCost: 'Cost',
    activityDuration: 'Duration',
    removeActivity: 'Remove activity',
    budget: 'Budget',
    totalCost: 'Total cost',
    remainingBudget: 'Remaining budget',
    save: 'Save',
    upcomingTrips: 'Upcoming trips',
    noTrips: 'No trips yet.',
    tripDetails: 'Trip details',
    noTripDetails: 'No saved itinerary details for this trip.',
    savedCities: 'Cities',
    savedActivities: 'Activities',
    budgetLabel: 'Budget',
    connectError: 'Could not connect to API. Make sure backend is running.',
    createError: 'Trip creation failed. Check API validation rules.',
    createSuccess: 'Trip saved successfully.'
  },
  fr: {
    title: 'TripMaster',
    subtitle: 'Planifiez et gerez vos voyages en un seul endroit.',
    languageLabel: 'Langue',
    currencyLabel: 'Devise',
    createTrip: 'Creer un voyage',
    editTrip: 'Modifier le voyage',
    deleteTrip: 'Supprimer le voyage',
    deleteTripConfirm: 'Supprimer ce voyage ?',
    back: 'Retour',
    tripName: 'Nom du voyage',
    country: 'Pays',
    startDate: 'Date de debut',
    numberOfDays: 'Nombre de jours',
    dailyProgram: 'Programme quotidien',
    day: 'Jour',
    city: 'Ville',
    loadingCities: 'Chargement des villes...',
    autoFillCities: 'Remplir automatiquement les villes',
    addActivity: 'Ajouter une activite',
    activityStartTime: 'Heure de debut',
    activityEndTime: 'Heure de fin',
    activityType: 'Type',
    activityVisit: 'Visite',
    activityMeal: 'Repas',
    activityTransport: 'Transport',
    activityShopping: 'Shopping',
    activityOther: 'Autre',
    activityName: 'Details',
    activityAddress: 'Adresse',
    activityCost: 'Cout',
    activityDuration: 'Duree',
    removeActivity: 'Supprimer activite',
    budget: 'Budget',
    totalCost: 'Cout total',
    remainingBudget: 'Budget restant',
    save: 'Enregistrer',
    upcomingTrips: 'Voyages a venir',
    noTrips: 'Aucun voyage pour le moment.',
    tripDetails: 'Details du voyage',
    noTripDetails: 'Aucun detail enregistre pour ce voyage.',
    savedCities: 'Villes',
    savedActivities: 'Activites',
    budgetLabel: 'Budget',
    connectError: "Impossible de se connecter a l'API. Verifiez que le backend est lance.",
    createError: 'Echec de creation du voyage. Verifiez les regles de validation API.',
    createSuccess: 'Voyage enregistre avec succes.'
  },
  zh: {
    title: 'TripMaster',
    subtitle: '在一个地方规划和管理你的旅行。',
    languageLabel: '语言',
    currencyLabel: '货币',
    createTrip: '创建旅行',
    editTrip: '编辑旅行',
    deleteTrip: '删除旅行',
    deleteTripConfirm: '删除此旅行？',
    back: '返回',
    tripName: '旅行名称',
    country: '国家',
    startDate: '开始日期',
    numberOfDays: '天数',
    dailyProgram: '每日行程',
    day: '第',
    city: '城市',
    loadingCities: '正在加载城市...',
    autoFillCities: '自动填充城市',
    addActivity: '添加活动',
    activityStartTime: '开始时间',
    activityEndTime: '结束时间',
    activityType: '类型',
    activityVisit: '参观',
    activityMeal: '用餐',
    activityTransport: '交通',
    activityShopping: '购物',
    activityOther: '其他',
    activityName: '详情',
    activityAddress: '地址',
    activityCost: '费用',
    activityDuration: '时长',
    removeActivity: '删除活动',
    budget: '预算',
    totalCost: '总花费',
    remainingBudget: '剩余预算',
    save: '保存',
    upcomingTrips: '即将开始的旅行',
    noTrips: '暂无旅行。',
    tripDetails: '旅行详情',
    noTripDetails: '此旅行暂无已保存的行程详情。',
    savedCities: '城市',
    savedActivities: '活动',
    budgetLabel: '预算',
    connectError: '无法连接到 API。请确认后端正在运行。',
    createError: '创建旅行失败。请检查 API 校验规则。',
    createSuccess: '旅行保存成功。'
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

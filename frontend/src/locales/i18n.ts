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
  startCity: string
  endCity: string
  transportModes: string
  hotelStars: string
  stayPreferences: string
  stayDays: string
  accommodation: string
  accommodationType: string
  accommodationCheckIn: string
  accommodationName: string
  accommodationHotel: string
  accommodationAirbnb: string
  accommodationHostel: string
  accommodationCouchsurfing: string
  accommodationGuesthouse: string
  accommodationOther: string
  loadingCities: string
  autoFillCities: string
  addActivity: string
  activityStartTime: string
  activityEndTime: string
  activityType: string
  activityVisit: string
  activityMeal: string
  activityTransport: string
  transportWalk: string
  transportLocal: string
  transportTrain: string
  transportDrive: string
  transportFlight: string
  activityShopping: string
  activityOther: string
  activityName: string
  estimatedTimeWarning: string
  activityAddress: string
  activityCost: string
  activityDuration: string
  removeActivity: string
  budget: string
  totalCost: string
  remainingBudget: string
  save: string
  exportWord: string
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
  | 'startCity'
  | 'endCity'
  | 'transportModes'
  | 'hotelStars'
  | 'stayPreferences'
  | 'stayDays'
  | 'accommodation'
  | 'accommodationType'
  | 'accommodationCheckIn'
  | 'accommodationName'
  | 'accommodationHotel'
  | 'accommodationAirbnb'
  | 'accommodationHostel'
  | 'accommodationCouchsurfing'
  | 'accommodationGuesthouse'
  | 'accommodationOther'
  | 'loadingCities'
  | 'autoFillCities'
  | 'addActivity'
  | 'activityStartTime'
  | 'activityEndTime'
  | 'activityType'
  | 'activityVisit'
  | 'activityMeal'
  | 'activityTransport'
  | 'transportWalk'
  | 'transportLocal'
  | 'transportTrain'
  | 'transportDrive'
  | 'transportFlight'
  | 'activityShopping'
  | 'activityOther'
  | 'activityName'
  | 'estimatedTimeWarning'
  | 'activityAddress'
  | 'activityCost'
  | 'activityDuration'
  | 'removeActivity'
  | 'budget'
  | 'totalCost'
  | 'remainingBudget'
  | 'save'
  | 'exportWord'
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
    startCity: 'Start city',
    endCity: 'End city',
    transportModes: 'Transport',
    hotelStars: 'Hotel stars',
    stayPreferences: 'Stay by city',
    stayDays: 'Days',
    accommodation: 'Accommodation',
    accommodationType: 'Type',
    accommodationCheckIn: 'Check-in',
    accommodationName: 'Name',
    accommodationHotel: 'Hotel',
    accommodationAirbnb: 'Airbnb',
    accommodationHostel: 'Hostel',
    accommodationCouchsurfing: 'Couchsurfing',
    accommodationGuesthouse: 'Guesthouse',
    accommodationOther: 'Other',
    loadingCities: 'Loading cities...',
    autoFillCities: 'Generate itinerary',
    addActivity: 'Add activity',
    activityStartTime: 'Start time',
    activityEndTime: 'End time',
    activityType: 'Type',
    activityVisit: 'Visit',
    activityMeal: 'Meal',
    activityTransport: 'Travel',
    transportWalk: 'Walk',
    transportLocal: 'Local',
    transportTrain: 'Train',
    transportDrive: 'Drive',
    transportFlight: 'Flight',
    activityShopping: 'Shops',
    activityOther: 'Other',
    activityName: 'Details',
    estimatedTimeWarning: 'Estimated time',
    activityAddress: 'Address',
    activityCost: 'Cost',
    activityDuration: 'Duration',
    removeActivity: 'Remove activity',
    budget: 'Budget',
    totalCost: 'Total cost',
    remainingBudget: 'Remaining budget',
    save: 'Save',
    exportWord: 'Export Word',
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
    startCity: 'Ville de depart',
    endCity: 'Ville d arrivee',
    transportModes: 'Transports',
    hotelStars: 'Categorie hotel',
    stayPreferences: 'Sejour par ville',
    stayDays: 'Jours',
    accommodation: 'Hebergement',
    accommodationType: 'Type',
    accommodationCheckIn: 'Check-in',
    accommodationName: 'Nom',
    accommodationHotel: 'Hotel',
    accommodationAirbnb: 'Airbnb',
    accommodationHostel: 'Auberge',
    accommodationCouchsurfing: 'Couchsurfing',
    accommodationGuesthouse: 'Maison d hotes',
    accommodationOther: 'Autre',
    loadingCities: 'Chargement des villes...',
    autoFillCities: 'Generer l itineraire',
    addActivity: 'Ajouter une activite',
    activityStartTime: 'Heure de debut',
    activityEndTime: 'Heure de fin',
    activityType: 'Type',
    activityVisit: 'Visite',
    activityMeal: 'Repas',
    activityTransport: 'Trajet',
    transportWalk: 'Marche',
    transportLocal: 'Local',
    transportTrain: 'Train',
    transportDrive: 'Voiture',
    transportFlight: 'Vol',
    activityShopping: 'Achats',
    activityOther: 'Autre',
    activityName: 'Details',
    estimatedTimeWarning: 'Horaire estime',
    activityAddress: 'Adresse',
    activityCost: 'Cout',
    activityDuration: 'Duree',
    removeActivity: 'Supprimer activite',
    budget: 'Budget',
    totalCost: 'Cout total',
    remainingBudget: 'Budget restant',
    save: 'Enregistrer',
    exportWord: 'Exporter Word',
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
    startCity: '起始城市',
    endCity: '结束城市',
    transportModes: '交通方式',
    hotelStars: '酒店星级',
    stayPreferences: '城市停留',
    stayDays: '天数',
    accommodation: '住宿',
    accommodationType: '类型',
    accommodationCheckIn: '入住时间',
    accommodationName: '名称',
    accommodationHotel: '酒店',
    accommodationAirbnb: 'Airbnb',
    accommodationHostel: '青年旅舍',
    accommodationCouchsurfing: '沙发客',
    accommodationGuesthouse: '民宿',
    accommodationOther: '其他',
    loadingCities: '正在加载城市...',
    autoFillCities: '生成行程',
    addActivity: '添加活动',
    activityStartTime: '开始时间',
    activityEndTime: '结束时间',
    activityType: '类型',
    activityVisit: '参观',
    activityMeal: '用餐',
    activityTransport: '交通',
    transportWalk: '步行',
    transportLocal: '本地交通',
    transportTrain: '火车',
    transportDrive: '开车',
    transportFlight: '航班',
    activityShopping: '购物',
    activityOther: '其他',
    activityName: '详情',
    estimatedTimeWarning: '预计时间',
    activityAddress: '地址',
    activityCost: '费用',
    activityDuration: '时长',
    removeActivity: '删除活动',
    budget: '预算',
    totalCost: '总花费',
    remainingBudget: '剩余预算',
    save: '保存',
    exportWord: '导出 Word',
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

import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import Tooltip from 'primevue/tooltip'
import App from './app/App.vue'
import { router } from './app/router'
import { loadExchangeRates } from './utils/currency'
import './styles/style.css'
import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

async function bootstrap() {
  await loadExchangeRates()

  const app = createApp(App)

  app.use(PrimeVue)
  app.use(ConfirmationService)
  app.directive('tooltip', Tooltip)
  app.use(router)

  app.mount('#app')
}

void bootstrap()

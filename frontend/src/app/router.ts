import { createRouter, createWebHistory } from 'vue-router'
import EditTripPage from './pages/EditTripPage.vue'
import HomePage from './pages/HomePage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage
    },
    {
      path: '/trips/:id/edit',
      name: 'trip-edit',
      component: EditTripPage
    }
  ]
})

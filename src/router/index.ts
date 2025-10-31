import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '../views/HomePage.vue'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/notifications',
    name: 'LocalNotifications',
    component: () => import('../views/LocalNotificationsPage.vue')
  },
  {
    path: '/notifications/quick',
    name: 'QuickNotification',
    component: () => import('../views/QuickNotificationPage.vue')
  },
  {
    path: '/geolocation',
    name: 'Geolocation',
    component: () => import('../views/GeolocationPage.vue')
  },
  {
    path: '/camera',
    name: 'CameraPhoto',
    component: () => import('../views/cameraPhoto.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router

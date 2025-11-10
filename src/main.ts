import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import { STORAGE_KEYS } from './utils/storageKeys'

const app = createApp(App)

// Create Pinia instance first
const pinia = createPinia()
app.use(pinia)
app.use(router)

// After Pinia is ready, set up auth event listener
// This ensures the store is available when the interceptor fires
window.addEventListener('auth:force-logout', (event: any) => {
  console.warn('🔴 auth:force-logout event fired', event.detail)
  const userStore = useUserStore()
  userStore.logout()
  // Redirect to login page if not already there
  if (window.location.pathname !== '/my-account') {
    window.location.href = '/my-account'
  }
})

// Check authentication status on app initialization
// This ensures the single source of truth (user store) is initialized before any component mounts
// Restore auth state from localStorage immediately if credentials exist
const userStore = useUserStore()
const userId = localStorage.getItem(STORAGE_KEYS.userId)

// Only require userId - authToken is optional
if (userId) {
  // We have credentials - restore auth state immediately
  // checkAuthStatus will verify with backend, but we set initial state from localStorage
  userStore.checkAuthStatus().catch(() => {
    // If check fails, we still have credentials in localStorage
    // The router guard will handle restoring state on first navigation
  })
}

app.mount('#app')

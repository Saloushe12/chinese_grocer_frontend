import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useUserStore } from '../stores/user'
import { STORAGE_KEYS } from '../utils/storageKeys'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/products',
      name: 'products',
      component: () => import('../views/ProductsView.vue'),
    },
    {
      path: '/my-account',
      name: 'my-account',
      component: () => import('../views/MyAccount.vue'),
    },
    {
      path: '/store/:id',
      name: 'store-detail',
      component: () => import('../views/StoreDetail.vue'),
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue'),
    },
  ],
})

// Navigation guard to check auth status on route changes
// This ensures the single source of truth (user store) is always up-to-date
// Only verifies auth if we don't already have a valid auth state, to avoid unnecessary API calls
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  
  // Check if we have credentials in localStorage
  // Only require userId - authToken is optional
  const userId = localStorage.getItem(STORAGE_KEYS.userId)
  
  // Only check auth status if we have userId but aren't authenticated yet
  // This prevents unnecessary API calls on every navigation while still ensuring
  // auth state is restored if the page was refreshed
  if (userId && !userStore.isAuthenticated) {
    await userStore.checkAuthStatus()
  } else if (userId && userStore.isAuthenticated) {
    // We're already authenticated - no need to check again
    // This ensures state persists across navigation
  } else if (!userId) {
    // No userId - ensure we're logged out
    if (userStore.isAuthenticated) {
      console.warn('🔴 Router guard: No userId found, logging out')
      userStore.logout()
    }
  }
  
  next()
})

export default router

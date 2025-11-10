import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import apiClient from '@/api/client'
import type { User, RegisterUserRequest, AuthenticateUserRequest, UpdateUserEmailRequest } from '@/types/api'
import { STORAGE_KEYS } from '@/utils/storageKeys'

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Cache for user profiles to avoid redundant API calls
  const userCache = ref<{ [userId: string]: User }>({})
  
  // Load state from localStorage on initialization
  const loadFromStorage = () => {
    try {
      // Clean up invalid userId values first
      const userId = localStorage.getItem(STORAGE_KEYS.userId)
      if (userId === 'undefined' || userId === 'null' || (userId && userId.trim() === '')) {
        console.warn('🧹 Cleaning up invalid userId from localStorage:', userId)
        localStorage.removeItem(STORAGE_KEYS.userId)
        localStorage.removeItem(STORAGE_KEYS.authToken)
        localStorage.removeItem(STORAGE_KEYS.currentUser)
        localStorage.removeItem(STORAGE_KEYS.userCache)
        return
      }
      
      // Load current user
      const storedUser = localStorage.getItem(STORAGE_KEYS.currentUser)
      if (storedUser) {
        currentUser.value = JSON.parse(storedUser)
      }
      
      // Load user cache
      const storedCache = localStorage.getItem(STORAGE_KEYS.userCache)
      if (storedCache) {
        userCache.value = JSON.parse(storedCache)
      }
      
      // Check credentials (userId already validated above)
      const authToken = localStorage.getItem(STORAGE_KEYS.authToken)
      
      // ✅ If we have userId, consider the user authenticated right away.
      // authToken is optional - some backends may not use tokens
      // This prevents the "logged out" flicker on page load
      if (userId) {
        isAuthenticated.value = true
        
        // If currentUser is missing but cached profile exists, hydrate it now.
        if (!currentUser.value && userCache.value[userId]) {
          currentUser.value = userCache.value[userId]
        }
      } else {
        isAuthenticated.value = false
      }
    } catch (e) {
      console.error('Failed to load user store from localStorage:', e)
    }
  }
  
  // Save state to localStorage
  const saveToStorage = () => {
    try {
      if (currentUser.value) {
        localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(currentUser.value))
      } else {
        localStorage.removeItem(STORAGE_KEYS.currentUser)
      }
      
      localStorage.setItem(STORAGE_KEYS.userCache, JSON.stringify(userCache.value))
    } catch (e) {
      console.error('Failed to save user store to localStorage:', e)
    }
  }
  
  // Watch for changes and persist
  watch([currentUser, userCache], () => {
    saveToStorage()
  }, { deep: true })
  
  // Load on initialization
  loadFromStorage()

  // Getters
  const userId = computed(() => currentUser.value?.userId || null)
  const username = computed(() => currentUser.value?.username || null)
  const email = computed(() => currentUser.value?.email || null)

  // Actions
  const setLoading = (value: boolean) => {
    loading.value = value
  }

  const setError = (errorMessage: string | null) => {
    error.value = errorMessage
  }

  const clearError = () => {
    error.value = null
  }

  const registerUser = async (userData: RegisterUserRequest): Promise<string | null> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.registerUser(userData)
      
      // Validate userId before storing - don't store undefined/null
      if (response.userId && typeof response.userId === 'string' && response.userId !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.userId, response.userId)
        return response.userId
      } else {
        console.error('Invalid userId from registerUser:', response.userId)
        return null
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to register user'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  const authenticateUser = async (credentials: AuthenticateUserRequest): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.authenticateUser(credentials)
      
      // Validate userId before storing - don't store undefined/null
      if (!response.userId || typeof response.userId !== 'string' || response.userId === 'undefined') {
        console.error('Invalid userId from authenticateUser:', response.userId)
        throw new Error('Invalid user ID received from server')
      }
      
      // Store user ID in localStorage FIRST
      // This ensures credentials persist even if profile fetch fails
      localStorage.setItem(STORAGE_KEYS.userId, response.userId)
      
      // Only store a real token if the backend provides one
      // Don't store "dummy-token" as it will cause 401 errors on API calls
      // Check if response has a token field (backend may or may not provide it)
      const token = (response as any).token
      if (token && typeof token === 'string' && token !== 'dummy-token' && token.length > 0) {
        localStorage.setItem(STORAGE_KEYS.authToken, token)
      } else {
        // If no real token, remove any existing token to avoid 401s
        // We can still authenticate using userId alone if the backend supports it
        localStorage.removeItem(STORAGE_KEYS.authToken)
      }
      
      // Fetch user profile - if this fails, we still have credentials stored
      try {
        await fetchUserProfile(response.userId, false)
      } catch (profileErr) {
        // Profile fetch failed, but authentication succeeded
        // Create minimal user object to maintain auth state
        const usernamePart = credentials.usernameOrEmail.split('@')[0] || 'User'
        const minimalUser: User = {
          userId: response.userId,
          username: usernamePart,
          email: '',
          creationDate: new Date().toISOString()
        }
        currentUser.value = minimalUser
        userCache.value[response.userId] = minimalUser
      }
      
      // Set authenticated state - this is the key to persistence
      // State will be automatically saved via watch
      isAuthenticated.value = true
      return true
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Authentication failed'
      setError(errorMessage)
      // Clear credentials on auth failure
      localStorage.removeItem(STORAGE_KEYS.userId)
      localStorage.removeItem(STORAGE_KEYS.authToken)
      return false
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async (userId: string, forceRefresh = false): Promise<User | null> => {
    try {
      // Return cached user if available and not forcing refresh
      if (!forceRefresh && userCache.value[userId]) {
        // If this is the current user, update currentUser
        if (currentUser.value?.userId === userId) {
          currentUser.value = userCache.value[userId]
          isAuthenticated.value = true
        }
        return userCache.value[userId]
      }

      setLoading(true)
      clearError()
      
      // Try to fetch from backend - this is the single source of truth
      const response = await apiClient.getUserById(userId)
      
      if (!response) {
        // User not found - but return cached if available
        if (userCache.value[userId]) {
          setLoading(false)
          return userCache.value[userId]
        }
        setError('User not found')
        return null
      }
      
      // Handle creationDate which might be string or Date
      // The API client returns User, but the backend might return Date objects
      let creationDateStr: string
      const creationDate = (response as any).creationDate
      if (typeof creationDate === 'string') {
        creationDateStr = creationDate
      } else if (creationDate instanceof Date) {
        creationDateStr = creationDate.toISOString()
      } else {
        creationDateStr = response.creationDate || new Date().toISOString()
      }
      
      const user: User = {
        userId,
        username: response.username,
        email: response.email,
        creationDate: creationDateStr
      }
      
      // Update cache
      userCache.value[userId] = user
      
      // If this is the current user, update currentUser
      if (currentUser.value?.userId === userId) {
        currentUser.value = user
        isAuthenticated.value = true
        // State will be automatically saved via watch
      }
      
      return user
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch user profile'
      const status = err.response?.status
      
      // Don't set error for network issues if we have cached data
      if (status !== 401 && status !== 403 && userCache.value[userId]) {
        // Network error but we have cache - return cached data
        setLoading(false)
        if (currentUser.value?.userId === userId) {
          currentUser.value = userCache.value[userId]
          isAuthenticated.value = true
        }
        return userCache.value[userId]
      }
      
      // Only set error for actual failures, not temporary network issues
      if (status === 401 || status === 403) {
        setError(errorMessage)
      }
      
      // On error, return cached user if available
      if (userCache.value[userId]) {
        setLoading(false)
        if (currentUser.value?.userId === userId) {
          currentUser.value = userCache.value[userId]
          isAuthenticated.value = true
        }
        return userCache.value[userId]
      }
      
      setLoading(false)
      return null
    } finally {
      setLoading(false)
    }
  }

  const updateUserEmail = async (userId: string, newEmail: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()
      
      await apiClient.updateUserEmail({ userId, newEmail })
      
      // Reload user profile from backend to ensure we have the latest data
      await fetchUserProfile(userId, true)
      
      return true
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update email'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()
      
      await apiClient.deleteUser(userId)
      
      // Clear local state
      logout()
      
      return true
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete user'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const login = async (usernameOrEmail: string, password: string): Promise<boolean> => {
    return await authenticateUser({ usernameOrEmail, password })
  }

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    const userId = await registerUser({ username, email, password })
    if (userId) {
      // Auto-login after successful registration
      return await login(username, password)
    }
    return false
  }

  const logout = () => {
    console.warn('🔴 LOGOUT CALLED - Stack trace:', new Error().stack)
    currentUser.value = null
    isAuthenticated.value = false
    localStorage.removeItem(STORAGE_KEYS.userId)
    localStorage.removeItem(STORAGE_KEYS.authToken)
    localStorage.removeItem(STORAGE_KEYS.currentUser)
    // Keep userCache or clear it - clearing for security
    localStorage.removeItem(STORAGE_KEYS.userCache)
    userCache.value = {}
  }

  const checkAuthStatus = async (): Promise<boolean> => {
    const userId = localStorage.getItem(STORAGE_KEYS.userId)
    const authToken = localStorage.getItem(STORAGE_KEYS.authToken)
    
    console.log('🔍 checkAuthStatus called', { userId, authToken, isAuthenticated: isAuthenticated.value, hasCurrentUser: !!currentUser.value })

    // Validate userId - reject 'undefined', null, empty string, etc.
    if (!userId || userId === 'undefined' || userId === 'null' || userId.trim() === '') {
      // Invalid userId → logged out
      console.warn('🔴 checkAuthStatus: Invalid userId in localStorage', { userId })
      if (isAuthenticated.value) {
        logout()
      }
      return false
    }

    // ✅ Set authenticated right away - this prevents UI flicker
    isAuthenticated.value = true

    // Hydrate from cache if needed
    if (!currentUser.value && userCache.value[userId]) {
      currentUser.value = userCache.value[userId]
    }

    // If we already have a user object, we're good; try refresh but don't flicker
    try {
      const user = await fetchUserProfile(userId, false)
      if (user) {
        currentUser.value = user
        isAuthenticated.value = true
        return true
      }

      // No user from backend — fall back to cache if possible
      if (userCache.value[userId]) {
        currentUser.value = userCache.value[userId]
        isAuthenticated.value = true
        return true
      }

      // Nothing usable → logout
      console.warn('🔴 checkAuthStatus: No user found and no cache, logging out')
      logout()
      return false
    } catch (err: any) {
      const status = err?.response?.status
      if (status === 401 || status === 403) {
        // Explicit auth failure → logout
        console.warn('🔴 checkAuthStatus: 401/403 error, logging out', { status, userId })
        logout()
        return false
      }

      // Network-ish error: keep user if we have anything
      if (!currentUser.value) {
        // Try cache first
        if (userCache.value[userId]) {
          currentUser.value = userCache.value[userId]
        } else {
          // Create minimal user object
          currentUser.value = {
            userId,
            username: 'User',
            email: '',
            creationDate: new Date().toISOString()
          }
        }
      }
      isAuthenticated.value = true
      return true
    }
  }

  const clearUser = () => {
    currentUser.value = null
    isAuthenticated.value = false
    error.value = null
  }

  return {
    // State
    currentUser,
    isAuthenticated,
    loading,
    error,
    userCache, // Expose cache for components that need to fetch user profiles
    
    // Getters
    userId,
    username,
    email,
    
    // Actions
    registerUser,
    authenticateUser,
    fetchUserProfile,
    updateUserEmail,
    deleteUser,
    login,
    register,
    logout,
    checkAuthStatus,
    clearUser,
    setLoading,
    setError,
    clearError
  }
})

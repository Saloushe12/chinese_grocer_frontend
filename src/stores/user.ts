import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/api/client'
import type { User, RegisterUserRequest, AuthenticateUserRequest, UpdateUserEmailRequest } from '@/types/api'

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref<User | null>(null)
  const isAuthenticated = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

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
      
      // Store user ID in localStorage for persistence
      localStorage.setItem('userId', response.userId)
      
      return response.userId
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
      
      // Store user ID and auth token in localStorage
      localStorage.setItem('userId', response.userId)
      localStorage.setItem('authToken', 'dummy-token') // Replace with actual JWT token
      
      // Fetch user profile
      await fetchUserProfile(response.userId)
      
      isAuthenticated.value = true
      return true
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Authentication failed'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.getUserById(userId)
      
      const user: User = {
        userId,
        username: response.username,
        email: response.email,
        creationDate: response.creationDate
      }
      
      currentUser.value = user
      return user
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to fetch user profile'
      setError(errorMessage)
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
      
      // Update local state
      if (currentUser.value) {
        currentUser.value.email = newEmail
      }
      
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
    currentUser.value = null
    isAuthenticated.value = false
    localStorage.removeItem('userId')
    localStorage.removeItem('authToken')
  }

  const checkAuthStatus = async (): Promise<boolean> => {
    const userId = localStorage.getItem('userId')
    const authToken = localStorage.getItem('authToken')
    
    if (userId && authToken) {
      try {
        await fetchUserProfile(userId)
        isAuthenticated.value = true
        return true
      } catch (err) {
        logout()
        return false
      }
    }
    
    return false
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

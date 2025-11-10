import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import apiClient from '@/api/client'
import { getStoreImageByStoreId } from '@/utils/storeImages'
import type { Store, CreateStoreRequest, AddTagRequest } from '@/types/api'

export const useStoreStore = defineStore('store', () => {
  // State
  const stores = ref<Store[]>([])
  const currentStore = ref<Store | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  // Track which stores each user created (userId -> storeId[])
  const userCreatedStores = ref<{ [userId: string]: string[] }>({})
  
  // Initialize from localStorage
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('pinia_store_store')
      if (stored) {
        const data = JSON.parse(stored)
        stores.value = data.stores || []
        currentStore.value = data.currentStore || null
        userCreatedStores.value = data.userCreatedStores || {}
        
        // Ensure all loaded stores have images assigned
        stores.value.forEach(store => {
          if (!store.image) {
            store.image = getStoreImageByStoreId(store.storeId)
          }
        })
        
        // Ensure current store has an image
        if (currentStore.value && !currentStore.value.image) {
          currentStore.value.image = getStoreImageByStoreId(currentStore.value.storeId)
        }
      }
    } catch (e) {
      console.error('Failed to load store store from localStorage:', e)
    }
  }
  
  // Save to localStorage
  const saveToStorage = () => {
    try {
      const data = {
        stores: stores.value,
        currentStore: currentStore.value,
        userCreatedStores: userCreatedStores.value
      }
      localStorage.setItem('pinia_store_store', JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save store store to localStorage:', e)
    }
  }
  
  // Watch for changes and persist
  watch([stores, currentStore, userCreatedStores], () => {
    saveToStorage()
  }, { deep: true })
  
  // Load on initialization
  loadFromStorage()

  // Getters
  const storeCount = computed(() => stores.value.length)
  const hasStores = computed(() => stores.value.length > 0)

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

  const createStore = async (storeData: CreateStoreRequest, userId?: string | null): Promise<string | null> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.createStore(storeData)
      
      // Create the store object with the data we have
      // Assign a default image if none provided
      const storeImage = storeData.image || getStoreImageByStoreId(response.storeId)
      
      const newStore: Store = {
        storeId: response.storeId,
        name: storeData.name,
        address: storeData.address,
        description: storeData.description,
        phone: storeData.phone,
        hours: storeData.hours,
        specialties: storeData.specialties,
        image: storeImage
      }
      
      // Add the store to local state FIRST (so it's immediately available)
      const existingIndex = stores.value.findIndex(s => s.storeId === response.storeId)
      if (existingIndex > -1) {
        stores.value[existingIndex] = newStore
      } else {
        stores.value.push(newStore)
      }
      
      // Track this store as created by the user
      // This must happen AFTER adding to stores so getUserCreatedStores can find it
      if (userId) {
        addUserCreatedStore(userId, response.storeId)
      }
      
      // Try to fetch the full store from backend to ensure we have all data
      // This happens asynchronously and won't block the store from appearing
      // Skip loading state since we're already in a loading state for createStore
      getStoreById(response.storeId, true).then((fullStore) => {
        if (fullStore) {
          // Update the store with full backend data if available
          const index = stores.value.findIndex(s => s.storeId === response.storeId)
          if (index > -1) {
            stores.value[index] = fullStore
          }
        }
      }).catch(() => {
        // Silently fail - we already have the store in local state
      })
      
      return response.storeId
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create store'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }
  
  // Add a store to a user's created stores list
  const addUserCreatedStore = (userId: string, storeId: string) => {
    if (!userCreatedStores.value[userId]) {
      userCreatedStores.value[userId] = []
    }
    if (!userCreatedStores.value[userId].includes(storeId)) {
      userCreatedStores.value[userId].push(storeId)
    }
  }
  
  // Get storeIds created by a specific user
  const getUserCreatedStoreIds = (userId: string): string[] => {
    return userCreatedStores.value[userId] || []
  }
  
  // Get stores created by a specific user
  const getUserCreatedStores = (userId: string): Store[] => {
    const storeIds = getUserCreatedStoreIds(userId)
    if (storeIds.length === 0) {
      return []
    }
    // Filter stores to only include those created by the user
    // This ensures we only return stores that exist in the stores array
    const userStores = stores.value.filter(store => storeIds.includes(store.storeId))
    return userStores
  }
  
  // Remove a store from a user's created stores list (e.g., when store is deleted)
  const removeUserCreatedStore = (userId: string, storeId: string) => {
    if (userCreatedStores.value[userId]) {
      userCreatedStores.value[userId] = userCreatedStores.value[userId].filter(id => id !== storeId)
    }
  }

  const deleteStore = async (storeId: string, userId?: string | null): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()
      
      await apiClient.deleteStore(storeId)
      
      // Remove from local state
      const index = stores.value.findIndex(store => store.storeId === storeId)
      if (index > -1) {
        stores.value.splice(index, 1)
      }
      
      // Remove from user's created stores if userId is provided
      if (userId) {
        removeUserCreatedStore(userId, storeId)
      } else {
        // If no userId provided, remove from all users' lists
        Object.keys(userCreatedStores.value).forEach(uid => {
          removeUserCreatedStore(uid, storeId)
        })
      }
      
      // Clear current store if it was deleted
      if (currentStore.value?.storeId === storeId) {
        currentStore.value = null
      }
      
      return true
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete store'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const getStoreById = async (storeId: string, skipLoading = false): Promise<Store | null> => {
    try {
      if (!skipLoading) {
        setLoading(true)
      }
      clearError()
      
      const store = await apiClient.getStoreById(storeId)
      
      if (store) {
        // Assign a default image if the store doesn't have one
        if (!store.image) {
          store.image = getStoreImageByStoreId(storeId)
        }
        
        // Update local state
        const existingIndex = stores.value.findIndex(s => s.storeId === storeId)
        if (existingIndex > -1) {
          stores.value[existingIndex] = store
        } else {
          stores.value.push(store)
        }
      }
      
      return store
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to get store'
      setError(errorMessage)
      return null
    } finally {
      if (!skipLoading) {
        setLoading(false)
      }
    }
  }

  const listStores = async (): Promise<Store[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.listStores()
      
      // Store backend storeIds for comparison
      const backendStoreIds = new Set(response.map(s => s.storeId))
      
      // Update local state with all stores from backend
      // Merge with existing stores to preserve any local-only data
      response.forEach(store => {
        const existingIndex = stores.value.findIndex(s => s.storeId === store.storeId)
        
        // Assign a default image if the store doesn't have one
        if (!store.image) {
          store.image = getStoreImageByStoreId(store.storeId)
        }
        
        if (existingIndex > -1) {
          // Update existing store with backend data
          stores.value[existingIndex] = store
        } else {
          // Add new store
          stores.value.push(store)
        }
      })
      
      // Remove stores that no longer exist in backend
      // Also clean up userCreatedStores to remove references to deleted stores
      const storesToRemove: string[] = []
      stores.value = stores.value.filter(store => {
        if (!backendStoreIds.has(store.storeId)) {
          storesToRemove.push(store.storeId)
          return false
        }
        return true
      })
      
      // Remove deleted stores from all users' created stores lists
      storesToRemove.forEach(storeId => {
        Object.keys(userCreatedStores.value).forEach(userId => {
          removeUserCreatedStore(userId, storeId)
        })
      })
      
      return stores.value
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to list stores'
      setError(errorMessage)
      
      // If API fails, return cached stores from localStorage if available
      return stores.value
    } finally {
      setLoading(false)
    }
  }
  
  // Migration: If a user has stores in localStorage from the old system, migrate them
  // This helps recover stores created before the tracking was added
  const migrateOldUserStores = (userId: string) => {
    try {
      // Check for old localStorage format
      const oldKey = `user_${userId}_created_stores`
      const oldStores = localStorage.getItem(oldKey)
      
      if (oldStores) {
        const storeIds: string[] = JSON.parse(oldStores)
        // Add these stores to the new tracking system
        storeIds.forEach(storeId => {
          addUserCreatedStore(userId, storeId)
        })
        // Remove old localStorage entry
        localStorage.removeItem(oldKey)
      }
    } catch (e) {
      console.error('Failed to migrate old user stores:', e)
    }
  }

  const getStoresByName = async (name: string): Promise<Store[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.getStoresByName({ name })
      // Update local state with found stores
      response.forEach(store => {
        // Assign a default image if the store doesn't have one
        if (!store.image) {
          store.image = getStoreImageByStoreId(store.storeId)
        }
        
        const existingIndex = stores.value.findIndex(s => s.storeId === store.storeId)
        if (existingIndex > -1) {
          stores.value[existingIndex] = store
        } else {
          stores.value.push(store)
        }
      })
      return response
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to get stores by name'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  const getStoresByAddress = async (address: string): Promise<Store[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.getStoresByAddress({ address })
      // Update local state with found stores
      response.forEach(store => {
        // Assign a default image if the store doesn't have one
        if (!store.image) {
          store.image = getStoreImageByStoreId(store.storeId)
        }
        
        const existingIndex = stores.value.findIndex(s => s.storeId === store.storeId)
        if (existingIndex > -1) {
          stores.value[existingIndex] = store
        } else {
          stores.value.push(store)
        }
      })
      return response
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to get stores by address'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  const setCurrentStore = (store: Store | null) => {
    currentStore.value = store
  }

  const addTag = async (data: AddTagRequest): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()
      
      await apiClient.addTag(data)
      return true
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to add tag'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const clearStores = () => {
    stores.value = []
    currentStore.value = null
    error.value = null
  }

  return {
    // State
    stores,
    currentStore,
    loading,
    error,
    userCreatedStores,
    
    // Getters
    storeCount,
    hasStores,
    
    // Actions
    createStore,
    deleteStore,
    getStoreById,
    listStores,
    getStoresByName,
    getStoresByAddress,
    addTag,
    setCurrentStore,
    clearStores,
    setLoading,
    setError,
    clearError,
    // User store tracking
    addUserCreatedStore,
    getUserCreatedStoreIds,
    getUserCreatedStores,
    removeUserCreatedStore,
    migrateOldUserStores
  }
})

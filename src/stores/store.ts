import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import apiClient from '@/api/client'
import type { Store, CreateStoreRequest, AddTagRequest } from '@/types/api'

export const useStoreStore = defineStore('store', () => {
  // State
  const stores = ref<Store[]>([])
  const currentStore = ref<Store | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Initialize from localStorage
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('pinia_store_store')
      if (stored) {
        const data = JSON.parse(stored)
        stores.value = data.stores || []
        currentStore.value = data.currentStore || null
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
        currentStore: currentStore.value
      }
      localStorage.setItem('pinia_store_store', JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save store store to localStorage:', e)
    }
  }
  
  // Watch for changes and persist
  watch([stores, currentStore], () => {
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

  const createStore = async (storeData: CreateStoreRequest): Promise<string | null> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.createStore(storeData)
      
      // Add the new store to our local state
      const newStore: Store = {
        storeId: response.storeId,
        name: storeData.name,
        address: storeData.address
      }
      stores.value.push(newStore)
      
      return response.storeId
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create store'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteStore = async (storeId: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()
      
      await apiClient.deleteStore(storeId)
      
      // Remove from local state
      const index = stores.value.findIndex(store => store.storeId === storeId)
      if (index > -1) {
        stores.value.splice(index, 1)
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

  const getStoreById = async (storeId: string): Promise<Store | null> => {
    try {
      setLoading(true)
      clearError()
      
      const store = await apiClient.getStoreById(storeId)
      
      // Update local state
      const existingIndex = stores.value.findIndex(s => s.storeId === storeId)
      if (existingIndex > -1) {
        stores.value[existingIndex] = store
      } else {
        stores.value.push(store)
      }
      
      return store
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to get store'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  const listStores = async (): Promise<Store[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.listStores()
      
      // Update local state with all stores
      stores.value = response.items
      
      return response.items
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to list stores'
      setError(errorMessage)
      
      // If API fails, return cached stores from localStorage if available
      return stores.value
    } finally {
      setLoading(false)
    }
  }

  const getStoresByName = async (name: string): Promise<string[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.getStoresByName({ name })
      return response.map(store => store.storeId)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to get stores by name'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  const getStoresByAddress = async (address: string): Promise<string[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.getStoresByAddress({ address })
      return response.map(store => store.storeId)
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
    clearError
  }
})

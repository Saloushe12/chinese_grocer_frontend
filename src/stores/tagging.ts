import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/api/client'
import type { AddTagRequest, RemoveTagRequest, GetStoresByTagRequest } from '@/types/api'

export const useTaggingStore = defineStore('tagging', () => {
  // State
  const storeTags = ref<{ [storeId: string]: string[] }>({})
  const tagStores = ref<{ [tag: string]: string[] }>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const tagCount = computed(() => Object.keys(tagStores.value).length)
  const hasTags = computed(() => Object.keys(tagStores.value).length > 0)

  const getTagsForStore = computed(() => {
    return (storeId: string) => storeTags.value[storeId] || []
  })

  const getStoresForTag = computed(() => {
    return (tag: string) => tagStores.value[tag] || []
  })

  const getAllTags = computed(() => {
    return Object.keys(tagStores.value)
  })

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

  const addTag = async (storeId: string, tag: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()
      
      await apiClient.addTag({ storeId, tag })
      
      // Update local state
      if (!storeTags.value[storeId]) {
        storeTags.value[storeId] = []
      }
      if (!storeTags.value[storeId].includes(tag)) {
        storeTags.value[storeId].push(tag)
      }
      
      if (!tagStores.value[tag]) {
        tagStores.value[tag] = []
      }
      if (!tagStores.value[tag].includes(storeId)) {
        tagStores.value[tag].push(storeId)
      }
      
      return true
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to add tag'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const removeTag = async (storeId: string, tag: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()
      
      await apiClient.removeTag({ storeId, tag })
      
      // Update local state
      if (storeTags.value[storeId]) {
        const index = storeTags.value[storeId].indexOf(tag)
        if (index > -1) {
          storeTags.value[storeId].splice(index, 1)
        }
      }
      
      if (tagStores.value[tag]) {
        const index = tagStores.value[tag].indexOf(storeId)
        if (index > -1) {
          tagStores.value[tag].splice(index, 1)
        }
      }
      
      return true
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to remove tag'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const getStoresByTag = async (tag: string): Promise<string[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.getStoresByTag({ tag })
      const storeIds = response.map(store => store.storeId)
      
      // Update local state
      tagStores.value[tag] = storeIds
      
      return storeIds
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to get stores by tag'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  const setTagsForStore = (storeId: string, tags: string[]) => {
    storeTags.value[storeId] = [...tags]
  }

  const setStoresForTag = (tag: string, storeIds: string[]) => {
    tagStores.value[tag] = [...storeIds]
  }

  const clearTags = () => {
    storeTags.value = {}
    tagStores.value = {}
    error.value = null
  }

  return {
    // State
    storeTags,
    tagStores,
    loading,
    error,
    
    // Getters
    tagCount,
    hasTags,
    getTagsForStore,
    getStoresForTag,
    getAllTags,
    
    // Actions
    addTag,
    removeTag,
    getStoresByTag,
    setTagsForStore,
    setStoresForTag,
    clearTags,
    setLoading,
    setError,
    clearError
  }
})

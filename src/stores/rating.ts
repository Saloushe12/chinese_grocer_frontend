import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/api/client'
import type { Rating, UpdateRatingRequest, GetRatingRequest } from '@/types/api'

export const useRatingStore = defineStore('rating', () => {
  // State
  const ratings = ref<{ [storeId: string]: Rating }>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const ratingCount = computed(() => Object.keys(ratings.value).length)
  const hasRatings = computed(() => Object.keys(ratings.value).length > 0)

  const getRatingForStore = computed(() => {
    return (storeId: string) => ratings.value[storeId] || { aggregatedRating: 0, reviewCount: 0 }
  })

  const getAverageRating = computed(() => {
    return (storeId: string) => {
      const rating = ratings.value[storeId]
      return rating ? rating.aggregatedRating : 0
    }
  })

  const getReviewCount = computed(() => {
    return (storeId: string) => {
      const rating = ratings.value[storeId]
      return rating ? rating.reviewCount : 0
    }
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

  const updateRating = async (data: UpdateRatingRequest): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()
      
      await apiClient.updateRating(data)
      
      // Update local state
      const currentRating = ratings.value[data.storeId] || { aggregatedRating: 0, reviewCount: 0 }
      
      // Calculate new aggregated rating
      const totalRating = currentRating.aggregatedRating * currentRating.reviewCount
      const newTotalRating = totalRating + (data.contribution.rating * data.contribution.weight)
      const newReviewCount = currentRating.reviewCount + data.contribution.weight
      const newAggregatedRating = newReviewCount > 0 ? newTotalRating / newReviewCount : 0
      
      ratings.value[data.storeId] = {
        aggregatedRating: newAggregatedRating,
        reviewCount: newReviewCount
      }
      
      return true
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update rating'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const getRating = async (storeId: string): Promise<Rating | null> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.getRating({ storeId })
      
      // Update local state
      ratings.value[storeId] = response
      
      return response
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to get rating'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  const addRating = async (storeId: string, rating: number): Promise<boolean> => {
    return await updateRating({
      storeId,
      contribution: {
        rating,
        weight: 1
      }
    })
  }

  const removeRating = async (storeId: string, rating: number): Promise<boolean> => {
    return await updateRating({
      storeId,
      contribution: {
        rating,
        weight: -1
      }
    })
  }

  const setRating = (storeId: string, rating: Rating) => {
    ratings.value[storeId] = rating
  }

  const clearRatings = () => {
    ratings.value = {}
    error.value = null
  }

  return {
    // State
    ratings,
    loading,
    error,
    
    // Getters
    ratingCount,
    hasRatings,
    getRatingForStore,
    getAverageRating,
    getReviewCount,
    
    // Actions
    updateRating,
    getRating,
    addRating,
    removeRating,
    setRating,
    clearRatings,
    setLoading,
    setError,
    clearError
  }
})

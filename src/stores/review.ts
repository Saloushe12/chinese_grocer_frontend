import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '@/api/client'
import type { Review, CreateReviewRequest, ReviewsResponse } from '@/types/api'

export const useReviewStore = defineStore('review', () => {
  // State
  const reviews = ref<Review[]>([])
  const storeReviews = ref<{ [storeId: string]: Review[] }>({})
  const userReviews = ref<{ [userId: string]: Review[] }>({})
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const reviewCount = computed(() => reviews.value.length)
  const hasReviews = computed(() => reviews.value.length > 0)

  const getReviewsForStore = computed(() => {
    return (storeId: string) => storeReviews.value[storeId] || []
  })

  const getReviewsByUser = computed(() => {
    return (userId: string) => userReviews.value[userId] || []
  })

  const getAverageRating = computed(() => {
    return (storeId: string) => {
      const storeReviewList = storeReviews.value[storeId] || []
      if (storeReviewList.length === 0) return 0
      
      const totalRating = storeReviewList.reduce((sum, review) => sum + review.rating, 0)
      return totalRating / storeReviewList.length
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

  const createReview = async (reviewData: CreateReviewRequest): Promise<string | null> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.createReview(reviewData)
      
      // Create review object
      const newReview: Review = {
        reviewId: response.reviewId,
        userId: reviewData.userId,
        storeId: reviewData.storeId,
        text: reviewData.text,
        rating: reviewData.rating
      }
      
      // Add to local state
      reviews.value.push(newReview)
      
      // Update store-specific reviews
      if (!storeReviews.value[reviewData.storeId]) {
        storeReviews.value[reviewData.storeId] = []
      }
      storeReviews.value[reviewData.storeId].push(newReview)
      
      // Update user-specific reviews
      if (!userReviews.value[reviewData.userId]) {
        userReviews.value[reviewData.userId] = []
      }
      userReviews.value[reviewData.userId].push(newReview)
      
      return response.reviewId
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create review'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteReview = async (reviewId: string): Promise<boolean> => {
    try {
      setLoading(true)
      clearError()
      
      await apiClient.deleteReview(reviewId)
      
      // Find and remove from local state
      const reviewIndex = reviews.value.findIndex(review => review.reviewId === reviewId)
      if (reviewIndex > -1) {
        const review = reviews.value[reviewIndex]
        reviews.value.splice(reviewIndex, 1)
        
        // Remove from store-specific reviews
        if (storeReviews.value[review.storeId]) {
          const storeIndex = storeReviews.value[review.storeId].findIndex(r => r.reviewId === reviewId)
          if (storeIndex > -1) {
            storeReviews.value[review.storeId].splice(storeIndex, 1)
          }
        }
        
        // Remove from user-specific reviews
        if (userReviews.value[review.userId]) {
          const userIndex = userReviews.value[review.userId].findIndex(r => r.reviewId === reviewId)
          if (userIndex > -1) {
            userReviews.value[review.userId].splice(userIndex, 1)
          }
        }
      }
      
      return true
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete review'
      setError(errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const fetchReviewsForStore = async (storeId: string): Promise<string[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.getReviewsForStore({ storeId })
      return response.reviewIds
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to get reviews for store'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  const fetchReviewsByUser = async (userId: string): Promise<string[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.getReviewsByUser({ userId })
      return response.reviewIds
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to get reviews by user'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  const addReviewToStore = (storeId: string, review: Review) => {
    if (!storeReviews.value[storeId]) {
      storeReviews.value[storeId] = []
    }
    storeReviews.value[storeId].push(review)
  }

  const addReviewToUser = (userId: string, review: Review) => {
    if (!userReviews.value[userId]) {
      userReviews.value[userId] = []
    }
    userReviews.value[userId].push(review)
  }

  const clearReviews = () => {
    reviews.value = []
    storeReviews.value = {}
    userReviews.value = {}
    error.value = null
  }

  return {
    // State
    reviews,
    storeReviews,
    userReviews,
    loading,
    error,
    
    // Getters
    reviewCount,
    hasReviews,
    getReviewsForStore,
    getReviewsByUser,
    getAverageRating,
    
    // Actions
    createReview,
    deleteReview,
    fetchReviewsForStore,
    fetchReviewsByUser,
    addReviewToStore,
    addReviewToUser,
    clearReviews,
    setLoading,
    setError,
    clearError
  }
})

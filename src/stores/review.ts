import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import apiClient from '@/api/client'
import type { Review, CreateReviewRequest, ReviewsResponse } from '@/types/api'

export const useReviewStore = defineStore('review', () => {
  // State
  const reviews = ref<Review[]>([])
  const storeReviews = ref<{ [storeId: string]: Review[] }>({})
  const userReviews = ref<{ [userId: string]: Review[] }>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Initialize from localStorage
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('pinia_review_store')
      if (stored) {
        const data = JSON.parse(stored)
        reviews.value = data.reviews || []
        storeReviews.value = data.storeReviews || {}
        userReviews.value = data.userReviews || {}
      }
    } catch (e) {
      console.error('Failed to load review store from localStorage:', e)
    }
  }
  
  // Save to localStorage
  const saveToStorage = () => {
    try {
      const data = {
        reviews: reviews.value,
        storeReviews: storeReviews.value,
        userReviews: userReviews.value
      }
      localStorage.setItem('pinia_review_store', JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save review store to localStorage:', e)
    }
  }
  
  // Watch for changes and persist
  watch([reviews, storeReviews, userReviews], () => {
    saveToStorage()
  }, { deep: true })
  
  // Load on initialization
  loadFromStorage()

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
        rating: reviewData.rating,
        tags: reviewData.tags
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

  const listReviewsForStore = async (storeId: string): Promise<Review[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.listReviewsForStore({ storeId })
      
      // Update local state
      response.items.forEach(review => {
        // Add to store-specific reviews
        if (!storeReviews.value[storeId]) {
          storeReviews.value[storeId] = []
        }
        const existingIndex = storeReviews.value[storeId].findIndex(r => r.reviewId === review.reviewId)
        if (existingIndex > -1) {
          storeReviews.value[storeId][existingIndex] = review
        } else {
          storeReviews.value[storeId].push(review)
        }
        
        // Add to user-specific reviews
        if (!userReviews.value[review.userId]) {
          userReviews.value[review.userId] = []
        }
        const userIndex = userReviews.value[review.userId].findIndex(r => r.reviewId === review.reviewId)
        if (userIndex > -1) {
          userReviews.value[review.userId][userIndex] = review
        } else {
          userReviews.value[review.userId].push(review)
        }
        
        // Add to global reviews
        const globalIndex = reviews.value.findIndex(r => r.reviewId === review.reviewId)
        if (globalIndex > -1) {
          reviews.value[globalIndex] = review
        } else {
          reviews.value.push(review)
        }
      })
      
      return response.items
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to list reviews for store'
      setError(errorMessage)
      
      // If API fails, return cached reviews from localStorage if available
      return storeReviews.value[storeId] || []
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

  const listReviewsByUser = async (userId: string): Promise<Review[]> => {
    try {
      setLoading(true)
      clearError()
      
      const response = await apiClient.listReviewsByUser({ userId })
      
      // Update local state
      response.items.forEach(review => {
        // Add to user-specific reviews
        if (!userReviews.value[userId]) {
          userReviews.value[userId] = []
        }
        const existingIndex = userReviews.value[userId].findIndex(r => r.reviewId === review.reviewId)
        if (existingIndex > -1) {
          userReviews.value[userId][existingIndex] = review
        } else {
          userReviews.value[userId].push(review)
        }
        
        // Add to store-specific reviews
        if (!storeReviews.value[review.storeId]) {
          storeReviews.value[review.storeId] = []
        }
        const storeIndex = storeReviews.value[review.storeId].findIndex(r => r.reviewId === review.reviewId)
        if (storeIndex > -1) {
          storeReviews.value[review.storeId][storeIndex] = review
        } else {
          storeReviews.value[review.storeId].push(review)
        }
        
        // Add to global reviews
        const globalIndex = reviews.value.findIndex(r => r.reviewId === review.reviewId)
        if (globalIndex > -1) {
          reviews.value[globalIndex] = review
        } else {
          reviews.value.push(review)
        }
      })
      
      return response.items
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to list reviews by user'
      setError(errorMessage)
      
      // If API fails, return cached reviews from localStorage if available
      return userReviews.value[userId] || []
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
    listReviewsForStore,
    fetchReviewsByUser,
    listReviewsByUser,
    addReviewToStore,
    addReviewToUser,
    clearReviews,
    setLoading,
    setError,
    clearError
  }
})

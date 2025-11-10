import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import apiClient from '@/api/client'
import type { Review, CreateReviewRequest } from '@/types/api'

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
      
      if (response.reviewId) {
        // Reload reviews from backend to ensure we have the latest data
        // This ensures consistency with backend state
        await Promise.all([
          listReviewsForStore(reviewData.storeId),
          listReviewsByUser(reviewData.userId)
        ])
      }
      
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
      
      // Find the review before deleting to know which stores/users to refresh
      const reviewToDelete = reviews.value.find(r => r.reviewId === reviewId)
      const storeId = reviewToDelete?.storeId
      const userId = reviewToDelete?.userId
      
      await apiClient.deleteReview(reviewId)
      
      // Reload reviews from backend to ensure we have the latest data
      // This ensures consistency with backend state
      if (storeId) {
        await listReviewsForStore(storeId)
      }
      if (userId) {
        await listReviewsByUser(userId)
      }
      
      // Also remove from global reviews list
      const reviewIndex = reviews.value.findIndex(review => review.reviewId === reviewId)
      if (reviewIndex > -1) {
        reviews.value.splice(reviewIndex, 1)
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
      return response
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
      
      // Always fetch from backend - this is the single source of truth
      const response = await apiClient.listReviewsForStore({ storeId })
      
      // Replace store-specific reviews with backend data (not merge)
      // This ensures we have the latest data from backend
      storeReviews.value[storeId] = [...response]
      
      // Update user-specific reviews and global reviews
      response.forEach(review => {
        // Add to user-specific reviews
        if (!userReviews.value[review.userId]) {
          userReviews.value[review.userId] = []
        }
        const userReviewList = userReviews.value[review.userId]!
        const userIndex = userReviewList.findIndex(r => r.reviewId === review.reviewId)
        if (userIndex > -1) {
          userReviewList[userIndex] = review
        } else {
          userReviewList.push(review)
        }
        
        // Add to global reviews
        const globalIndex = reviews.value.findIndex(r => r.reviewId === review.reviewId)
        if (globalIndex > -1) {
          reviews.value[globalIndex] = review
        } else {
          reviews.value.push(review)
        }
      })
      
      // Remove reviews from storeReviews that are no longer in backend response
      // This handles deleted reviews
      const responseReviewIds = new Set(response.map(r => r.reviewId))
      if (storeReviews.value[storeId]) {
        storeReviews.value[storeId] = storeReviews.value[storeId].filter(r => responseReviewIds.has(r.reviewId))
      }
      
      return response
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to list reviews for store'
      setError(errorMessage)
      
      // On error, return cached reviews but log the error
      console.error('Failed to fetch reviews from backend, using cached data:', err)
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
      return response
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
      
      // Always fetch from backend - this is the single source of truth
      const response = await apiClient.listReviewsByUser({ userId })
      
      // Replace user-specific reviews with backend data (not merge)
      // This ensures we have the latest data from backend
      userReviews.value[userId] = [...response]
      
      // Update store-specific reviews and global reviews
      response.forEach(review => {
        // Add to store-specific reviews
        if (!storeReviews.value[review.storeId]) {
          storeReviews.value[review.storeId] = []
        }
        const storeReviewList = storeReviews.value[review.storeId]!
        const storeIndex = storeReviewList.findIndex(r => r.reviewId === review.reviewId)
        if (storeIndex > -1) {
          storeReviewList[storeIndex] = review
        } else {
          storeReviewList.push(review)
        }
        
        // Add to global reviews
        const globalIndex = reviews.value.findIndex(r => r.reviewId === review.reviewId)
        if (globalIndex > -1) {
          reviews.value[globalIndex] = review
        } else {
          reviews.value.push(review)
        }
      })
      
      // Remove reviews from userReviews that are no longer in backend response
      // This handles deleted reviews
      const responseReviewIds = new Set(response.map(r => r.reviewId))
      if (userReviews.value[userId]) {
        userReviews.value[userId] = userReviews.value[userId].filter(r => responseReviewIds.has(r.reviewId))
      }
      
      return response
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to list reviews by user'
      setError(errorMessage)
      
      // On error, return cached reviews but log the error
      console.error('Failed to fetch reviews from backend, using cached data:', err)
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

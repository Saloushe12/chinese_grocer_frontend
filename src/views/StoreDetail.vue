<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStoreStore } from '@/stores/store'
import { useReviewStore } from '@/stores/review'
import { useRatingStore } from '@/stores/rating'
import { useTaggingStore } from '@/stores/tagging'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { getStoreImageByStoreId, CHINESE_GROCERY_STORE_IMAGES } from '@/utils/storeImages'
import type { Store, Review, Rating, CreateReviewRequest } from '@/types/api'

// Router and stores
const route = useRoute()
const router = useRouter()
const storeStore = useStoreStore()
const reviewStore = useReviewStore()
const ratingStore = useRatingStore()
const taggingStore = useTaggingStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

// State
const store = ref<Store | null>(null)
const reviews = ref<Review[]>([])
const rating = ref<Rating | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Map to store usernames for each userId
const usernames = ref<{ [userId: string]: string }>({})

// Review creation state
const showReviewForm = ref(false)
const newReviewText = ref('')
const newReviewRating = ref(5)
const creatingReview = ref(false)

// Tag state for reviews
const newReviewTags = ref<string[]>([])
const newTagInput = ref('')
const showTagSuggestions = ref(false)
const filteredTagSuggestions = ref<string[]>([])

// Popular tags (can be made dynamic based on store's existing tags)
const popularTags = ref([
  'Fresh Produce', 'Authentic Chinese', 'Great Prices', 'Friendly Staff',
  'Good Selection', 'Clean Store', 'Convenient Location', 'Parking Available',
  'Traditional', 'Modern', 'Hot Food', 'Live Seafood', 'Bulk Items'
])

// Computed
const isLoggedIn = computed(() => userStore.isAuthenticated)
const currentUserId = computed(() => userStore.userId)

// Store ID from route params
const storeId = computed(() => route.params.id as string)

// Use utility function for consistent store images
const storeImages = ref<string[]>([])
const currentImageIndex = ref(0)

// Computed property for main image - always shows the selected thumbnail
const mainImageUrl = computed(() => {
  if (storeImages.value.length === 0) {
    return store.value ? getStoreImageByStoreId(store.value.storeId) : CHINESE_GROCERY_STORE_IMAGES[0]
  }
  return storeImages.value[currentImageIndex.value] || storeImages.value[0]
})

// Handle image load errors
const onImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  // Fallback to utility function image if image fails to load
  if (store.value) {
    const fallbackImage = getStoreImageByStoreId(store.value.storeId)
    if (img.src !== fallbackImage) {
      img.src = fallbackImage
    }
  }
}

// Initialize images for this specific store only
watch(() => store.value, (newStore) => {
  if (newStore) {
    const images: string[] = []
    
    // If store has a valid image, use it as the only image
    if (newStore.image && newStore.image.trim() !== '') {
      images.push(newStore.image)
    } else {
      // Otherwise, use the utility function to get a consistent image based on storeId
      // Each store gets ONE consistent image based on its storeId
      images.push(getStoreImageByStoreId(newStore.storeId))
    }
    
    // Only use the store's own image(s) - don't add gallery images
    storeImages.value = images
    currentImageIndex.value = 0
  }
}, { immediate: true })

// Methods
const loadStoreDetails = async () => {
  if (!storeId.value) return
  
  try {
    loading.value = true
    error.value = null
    
    // Load store details using new endpoint
    const storeData = await storeStore.getStoreById(storeId.value)
    if (storeData) {
      store.value = storeData
      
      // Load tags for the store
      const tags = await taggingStore.listTagsForStore(storeId.value)
      store.value.tags = tags
    } else {
      error.value = 'Store not found'
      return
    }
    
    // Load reviews using new endpoint
    await loadReviews()
    
    // Load rating
    await loadRating()
    
  } catch (err: any) {
    error.value = err.message || 'Failed to load store details'
  } finally {
    loading.value = false
  }
}


const loadReviews = async () => {
  if (!storeId.value) return
  
  try {
    // Always fetch from backend - this is the single source of truth
    reviews.value = await reviewStore.listReviewsForStore(storeId.value)
    
    // Fetch usernames for all unique user IDs in reviews
    await loadUsernamesForReviews(reviews.value)
  } catch (err) {
    console.error('Failed to load reviews:', err)
    // On error, use cached data from store as fallback, but still show error
    if (reviewStore.storeReviews[storeId.value]) {
      reviews.value = reviewStore.storeReviews[storeId.value]
      await loadUsernamesForReviews(reviews.value)
    } else {
      reviews.value = []
    }
  }
}

// Fetch usernames for all reviews (works for all reviews, including old ones)
const loadUsernamesForReviews = async (reviewList: Review[]) => {
  if (!reviewList || reviewList.length === 0) {
    return
  }
  
  // Get unique user IDs from reviews (handles all reviews, regardless of when created)
  const uniqueUserIds = [...new Set(reviewList.map(r => r.userId).filter(id => id))]
  
  if (uniqueUserIds.length === 0) {
    return
  }
  
  // Fetch usernames for each user ID (using cache when available)
  // This works for any userId, including ones from old reviews
  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      // Skip if userId is invalid
      if (!userId || userId.trim() === '') {
        return
      }
      
      // Check if we already have the username cached
      if (usernames.value[userId]) {
        return
      }
      
      try {
        // fetchUserProfile works for any userId, regardless of when the review was created
        // It will fetch from backend if not in cache, handling old reviews correctly
        const user = await userStore.fetchUserProfile(userId, false)
        if (user && user.username) {
          usernames.value[userId] = user.username
        } else {
          // Fallback to "User" + last character of userId if fetch fails
          usernames.value[userId] = `User ${userId.slice(-1)}`
        }
      } catch (err) {
        console.error(`Failed to fetch username for userId ${userId}:`, err)
        // Fallback to "User" + last character of userId
        // This ensures old reviews still display something even if user lookup fails
        usernames.value[userId] = `User ${userId.slice(-1)}`
      }
    })
  )
}

// Get username for a userId, with fallback
const getUsername = (userId: string): string => {
  return usernames.value[userId] || `User ${userId.slice(-1)}`
}

const loadRating = async () => {
  if (!storeId.value) return
  
  try {
    // Always fetch from backend - this is the single source of truth
    const ratingData = await ratingStore.getRating(storeId.value)
    rating.value = ratingData || { aggregatedRating: 0, reviewCount: 0 }
  } catch (err) {
    console.error('Failed to load rating:', err)
    // Default to zero rating on error
    rating.value = { aggregatedRating: 0, reviewCount: 0 }
  }
}


const nextImage = () => {
  // Only allow navigation if there are multiple images
  if (storeImages.value.length > 1) {
    currentImageIndex.value = (currentImageIndex.value + 1) % storeImages.value.length
  }
}

const prevImage = () => {
  // Only allow navigation if there are multiple images
  if (storeImages.value.length > 1) {
    currentImageIndex.value = currentImageIndex.value === 0 
      ? storeImages.value.length - 1 
      : currentImageIndex.value - 1
  }
}

const goBack = () => {
  router.push('/products')
}

const createReview = async () => {
  // Always check auth status before creating review - single source of truth
  await userStore.checkAuthStatus()
  
  if (!isLoggedIn.value || !currentUserId.value) {
    notificationStore.warning('You need to be logged in to create a review. Please log in first.')
    showReviewForm.value = false
    setTimeout(() => {
      router.push('/my-account')
    }, 2000)
    return
  }
  
  if (!storeId.value || !newReviewText.value.trim()) {
    error.value = 'Please fill in all required fields'
    return
  }
  
  try {
    creatingReview.value = true
    error.value = null
    
    const reviewData: CreateReviewRequest = {
      userId: currentUserId.value,
      storeId: storeId.value,
      text: newReviewText.value.trim(),
      rating: newReviewRating.value,
      tags: newReviewTags.value.length > 0 ? newReviewTags.value : undefined
    }
    
    const reviewId = await reviewStore.createReview(reviewData)
    
    if (reviewId) {
      notificationStore.success('Review created successfully!')
      
      // Reload reviews from backend to ensure we have the latest data
      // The review store already updated its state, but we refresh to be sure
      await loadReviews()
      
      // Update rating with new review
      await loadRating()
      
      // Reset form
      newReviewText.value = ''
      newReviewRating.value = 5
      newReviewTags.value = []
      newTagInput.value = ''
      showReviewForm.value = false
    }
  } catch (err: any) {
    // Handle sync-based errors (e.g., user validation, store validation)
    const errorMessage = err.response?.data?.error || err.message || 'Failed to create review'
    error.value = errorMessage
    notificationStore.error(errorMessage)
    
    // If user validation fails, suggest logging in
    if (errorMessage.toLowerCase().includes('user') || errorMessage.toLowerCase().includes('login') || errorMessage.toLowerCase().includes('authenticated')) {
      notificationStore.warning('You need to be logged in to create a review. Please log in first.')
      showReviewForm.value = false
      setTimeout(() => {
        router.push('/my-account')
      }, 2000)
    }
  } finally {
    creatingReview.value = false
  }
}

const goToLogin = () => {
  router.push('/my-account')
}

const openReviewForm = async () => {
  // Always check auth status before opening review form - single source of truth
  await userStore.checkAuthStatus()
  
  if (!isLoggedIn.value || !currentUserId.value) {
    notificationStore.warning('You need to be logged in to create a review. Please log in first.')
    router.push('/my-account')
    return
  }
  
  showReviewForm.value = true
}

// Tag management methods
const addTag = (tag: string) => {
  const trimmedTag = tag.trim()
  if (trimmedTag && !newReviewTags.value.includes(trimmedTag)) {
    newReviewTags.value.push(trimmedTag)
    newTagInput.value = ''
    // Keep suggestions visible - only hide autocomplete suggestions, not popular tags
  }
}

const removeTag = (tagToRemove: string) => {
  newReviewTags.value = newReviewTags.value.filter(tag => tag !== tagToRemove)
}

const searchTags = (query: string) => {
  if (!query.trim()) {
    filteredTagSuggestions.value = []
    showTagSuggestions.value = false
    return
  }
  
  const searchTerm = query.toLowerCase()
  filteredTagSuggestions.value = popularTags.value.filter(tag => 
    tag.toLowerCase().includes(searchTerm) && !newReviewTags.value.includes(tag)
  )
  showTagSuggestions.value = filteredTagSuggestions.value.length > 0
}

const handleTagInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && newTagInput.value.trim()) {
    event.preventDefault()
    addTag(newTagInput.value)
  }
}

const clearTagInput = () => {
  newTagInput.value = ''
  showTagSuggestions.value = false
}

// Watch for storeId changes to reload data
watch(() => storeId.value, async (newStoreId) => {
  if (newStoreId) {
    await loadStoreDetails()
  }
})

// Watch for review store changes to update reviews in real-time
watch(() => reviewStore.storeReviews[storeId.value || ''], async (newReviews) => {
  if (newReviews && storeId.value && Array.isArray(newReviews)) {
    reviews.value = newReviews
    // Reload usernames when reviews change (handles new reviews or updates)
    await loadUsernamesForReviews(newReviews)
  }
}, { deep: true })

// Watch for rating changes in the rating store
watch(() => storeId.value, async (newStoreId) => {
  if (newStoreId) {
    await loadRating()
  }
})

watch(() => ratingStore.ratings[storeId.value || ''], (newRating) => {
  if (newRating && storeId.value) {
    rating.value = newRating
  }
}, { deep: true })

// Watch for store changes in the store store
watch(() => storeStore.stores.find(s => s.storeId === storeId.value), (newStore) => {
  if (newStore && storeId.value) {
    store.value = newStore
    // Reload tags when store changes
    if (newStore.storeId) {
      taggingStore.listTagsForStore(newStore.storeId).then(tags => {
        if (store.value) {
          store.value.tags = tags
        }
      })
    }
  }
}, { deep: true })

// Watch for authentication state changes to update UI in real-time
// This ensures buttons and forms update immediately when user logs in/out
// Using immediate: true to ensure we get the current state on mount
watch(() => userStore.isAuthenticated, (newAuthState, oldAuthState) => {
  // Close review form if user logs out
  if (!newAuthState && showReviewForm.value) {
    showReviewForm.value = false
  }
  // The isLoggedIn computed property will automatically update the UI
  // Force reactivity by triggering a small delay to ensure Vue updates
  if (newAuthState !== oldAuthState) {
    // Auth state changed - UI will update automatically via computed property
  }
}, { immediate: true })

// Watch for currentUserId changes to update UI
watch(() => userStore.userId, (newUserId, oldUserId) => {
  // If user logs out, close review form
  if (!newUserId && showReviewForm.value) {
    showReviewForm.value = false
  }
  // The isLoggedIn computed property will automatically update the UI
}, { immediate: true })

// Lifecycle
onMounted(async () => {
  // Check auth status on mount - this is the single source of truth
  // The router guard should have already checked, but we verify here too
  await userStore.checkAuthStatus()
  // Always load from backend - this is the single source of truth
  loadStoreDetails()
})
</script>

<template>
  <div class="store-detail page-container">
    <!-- Loading State -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Loading store details...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-container">
      <h2>Store Not Found</h2>
      <p>{{ error }}</p>
      <button class="btn-primary" @click="goBack">Back to Stores</button>
    </div>

    <!-- Store Details -->
    <div v-else-if="store" class="store-detail-content">
      <!-- Header with Back Button -->
      <div class="store-header">
        <button class="back-button" @click="goBack">
          ← Back to Stores
        </button>
      </div>

      <!-- Store Hero Section -->
      <section class="store-hero">
        <div class="store-images">
          <div class="main-image">
            <img 
              :src="mainImageUrl" 
              :alt="store.name" 
              @error="onImageError"
            />
            <!-- Only show navigation buttons if there are multiple images -->
            <div v-if="storeImages.length > 1" class="image-nav">
              <button class="nav-btn prev" @click="prevImage">‹</button>
              <button class="nav-btn next" @click="nextImage">›</button>
            </div>
          </div>
          <!-- Only show thumbnails if there are multiple images -->
          <div v-if="storeImages.length > 1" class="thumbnail-images">
            <img 
              v-for="(image, index) in storeImages" 
              :key="index"
              :src="image" 
              :alt="`${store.name} image ${index + 1}`"
              :class="{ active: index === currentImageIndex }"
              @click="currentImageIndex = index"
            />
          </div>
        </div>

        <div class="store-info">
          <h1 class="store-name">{{ store.name }}</h1>
          <div class="store-rating">
            <div class="rating-stars">
              <span v-for="i in 5" :key="i" :class="{ filled: i <= (rating?.aggregatedRating || store.rating || 0) }">
                ⭐
              </span>
            </div>
            <span class="rating-text">
              {{ (rating?.aggregatedRating || store.rating || 0).toFixed(1) }} 
              ({{ rating?.reviewCount || store.reviewCount || 0 }} reviews)
            </span>
          </div>
          <p class="store-address">📍 {{ store.address }}</p>
          <div class="store-contact">
            <p v-if="store.phone">📞 {{ store.phone }}</p>
            <p v-if="store.hours">🕒 {{ store.hours }}</p>
          </div>
        </div>
      </section>

      <!-- Store Description -->
      <section class="store-description">
        <h2>About This Store</h2>
        <p>{{ store.description || 'No description available.' }}</p>
      </section>

      <!-- Tags and Specialties -->
      <section class="store-tags">
        <h2>Specialties & Tags</h2>
        <div class="tags-container">
          <span v-for="specialty in store.specialties" :key="specialty" class="specialty-tag">
            {{ specialty }}
          </span>
          <span v-for="tag in store.tags" :key="tag" class="user-tag">
            {{ tag }}
          </span>
        </div>
      </section>

      <!-- Reviews Section -->
      <section class="reviews-section">
        <div class="reviews-header">
          <h2>Customer Reviews</h2>
          
          <!-- Add Review Button -->
          <div v-if="!showReviewForm">
            <button 
              v-if="isLoggedIn"
              type="button"
              class="btn-add-review"
              @click="openReviewForm"
            >
              + Add Review
            </button>
            <button 
              v-else
              type="button"
              class="btn-add-review btn-disabled"
              @click="goToLogin"
              title="Login to add a review"
              :disabled="true"
            >
              🔒 Login to Add Review
            </button>
          </div>
          <button 
            v-else
            class="btn-add-review btn-cancel"
            @click="showReviewForm = false"
          >
            Cancel
          </button>
        </div>

        <!-- Review Form -->
        <div v-if="showReviewForm && isLoggedIn" class="review-form-container">
          <h3>Write Your Review</h3>
          
          <div class="form-group">
            <label for="review-rating">Your Rating:</label>
            <select 
              id="review-rating" 
              v-model="newReviewRating" 
              class="form-input"
            >
              <option :value="5">5 - Excellent</option>
              <option :value="4">4 - Very Good</option>
              <option :value="3">3 - Good</option>
              <option :value="2">2 - Fair</option>
              <option :value="1">1 - Poor</option>
            </select>
          </div>

          <div class="form-group">
            <label for="review-text">Your Review:</label>
            <textarea 
              id="review-text" 
              v-model="newReviewText" 
              class="form-textarea"
              placeholder="Share your experience with this store..."
              rows="4"
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label for="review-tags">Tags (optional):</label>
            
            <!-- Display selected tags -->
            <div v-if="newReviewTags.length > 0" class="selected-tags">
              <span 
                v-for="tag in newReviewTags" 
                :key="tag" 
                class="review-tag"
              >
                {{ tag }}
                <button 
                  type="button" 
                  @click="removeTag(tag)" 
                  class="tag-remove-btn"
                >
                  ×
                </button>
              </span>
            </div>
            
            <!-- Tag input with autocomplete -->
            <div class="tag-input-wrapper">
              <input 
                id="review-tags"
                v-model="newTagInput" 
                @input="searchTags(newTagInput)"
                @focus="searchTags(newTagInput)"
                @blur="setTimeout(() => showTagSuggestions = false, 200)"
                @keydown="handleTagInputKeydown"
                class="form-input tag-input"
                placeholder="Type to search or create tags (press Enter)..."
              />
              <button 
                v-if="newTagInput"
                type="button"
                @click="clearTagInput"
                class="clear-tag-btn"
              >
                ×
              </button>
              
              <!-- Autocomplete suggestions -->
              <div v-if="showTagSuggestions && filteredTagSuggestions.length > 0" class="tag-suggestions">
                <div 
                  v-for="tag in filteredTagSuggestions" 
                  :key="tag"
                  @click="addTag(tag)"
                  class="tag-suggestion"
                >
                  {{ tag }}
                </div>
              </div>
            </div>
            
            <!-- Popular tags (always shown when input is empty) -->
            <div v-if="!newTagInput" class="popular-tags">
              <p class="popular-tags-label">Popular tags:</p>
              <div class="popular-tags-list">
                <button 
                  v-for="tag in popularTags" 
                  :key="tag"
                  @click="addTag(tag)"
                  class="popular-tag-btn"
                  :class="{ 'tag-already-added': newReviewTags.includes(tag) }"
                  type="button"
                  :disabled="newReviewTags.includes(tag)"
                >
                  {{ tag }}
                </button>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button 
              class="btn-submit-review" 
              @click="createReview"
              :disabled="creatingReview || !newReviewText.trim()"
            >
              {{ creatingReview ? 'Submitting...' : 'Submit Review' }}
            </button>
            <button 
              class="btn-cancel-review" 
              @click="showReviewForm = false"
            >
              Cancel
            </button>
          </div>

          <div v-if="error" class="error-message-review">
            {{ error }}
          </div>
        </div>
        
        <div v-if="reviews.length === 0 && !showReviewForm" class="no-reviews">
          <p>No reviews yet. Be the first to review this store!</p>
        </div>

        <div v-if="reviews.length > 0" class="reviews-list">
          <div v-for="review in reviews" :key="review.reviewId" class="review-card">
            <div class="review-header">
              <div class="reviewer-info">
                <h4>{{ getUsername(review.userId) }}</h4>
                <div class="review-rating">
                  <span v-for="i in 5" :key="i" :class="{ filled: i <= review.rating }">
                    ⭐
                  </span>
                </div>
              </div>
            </div>
            <p class="review-text">{{ review.text }}</p>
            <div v-if="review.tags && review.tags.length > 0" class="review-tags-display">
              <span 
                v-for="tag in review.tags" 
                :key="tag" 
                class="review-tag-display"
              >
                {{ tag }}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.store-detail {
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  background: white;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f4f6;
  border-top: 4px solid #dc2626;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-container h2 {
  color: #dc2626;
  margin-bottom: 1rem;
}

.store-detail-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.store-header {
  margin-bottom: 2rem;
}

.back-button {
  background: #f3f4f6;
  color: #374151;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-button:hover {
  background: #e5e7eb;
  transform: translateY(-1px);
}

.store-hero {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 3rem;
  margin-bottom: 3rem;
  align-items: start;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.store-images {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.main-image {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 100%;
}

.main-image img {
  width: 100%;
  max-width: 100%;
  height: 400px;
  object-fit: cover;
  display: block;
}

.image-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 0 1rem;
  pointer-events: none;
}

.nav-btn {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
  pointer-events: all;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

.thumbnail-images {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.5rem 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.thumbnail-images img {
  width: 80px;
  height: 60px;
  min-width: 80px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  flex-shrink: 0;
}

.thumbnail-images img:hover,
.thumbnail-images img.active {
  opacity: 1;
  border-color: #dc2626;
  transform: scale(1.05);
}

.store-info {
  padding: 1rem;
}

.store-name {
  font-size: 2.5rem;
  color: #dc2626;
  margin-bottom: 1rem;
  font-weight: bold;
}

.store-rating {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.rating-stars {
  display: flex;
  gap: 0.25rem;
}

.rating-stars span {
  font-size: 1.2rem;
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.rating-stars span.filled {
  opacity: 1;
}

.rating-text {
  color: #6b7280;
  font-weight: 500;
}

.store-address {
  font-size: 1.1rem;
  color: #374151;
  margin-bottom: 1rem;
}

.store-contact {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.store-contact p {
  color: #6b7280;
  margin: 0;
}

.store-description {
  margin-bottom: 3rem;
  padding: 2rem;
  background: #f9fafb;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
}

.store-description h2 {
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.store-description p {
  color: #374151;
  line-height: 1.6;
  font-size: 1.1rem;
}

.store-tags {
  margin-bottom: 3rem;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.store-tags h2 {
  color: #dc2626;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.specialty-tag {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  border: 1px solid #fecaca;
}

.user-tag {
  background: #dc2626;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 500;
  border: 1px solid #dc2626;
  position: relative;
}

.user-tag::after {
  content: '★';
  margin-left: 0.25rem;
  font-size: 0.7rem;
}

.reviews-section {
  padding: 2rem;
  background: white;
  border-radius: 16px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.reviews-header h2 {
  color: #dc2626;
  margin: 0;
  font-size: 1.5rem;
}

.btn-add-review {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-add-review:hover {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.btn-add-review.btn-disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 0.7;
}

.btn-add-review.btn-cancel {
  background: #6b7280;
}

.btn-add-review.btn-cancel:hover {
  background: #4b5563;
}

.review-form-container {
  background: #f9fafb;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 2rem;
}

.review-form-container h3 {
  color: #dc2626;
  margin-bottom: 1.5rem;
  font-size: 1.25rem;
}

.form-group {
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 2;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 600;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  position: relative;
  z-index: 2;
  background: white;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn-submit-review {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-submit-review:hover:not(:disabled) {
  background: #b91c1c;
  transform: translateY(-2px);
}

.btn-submit-review:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.btn-cancel-review {
  background: white;
  color: #374151;
  border: 2px solid #e5e7eb;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel-review:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.error-message-review {
  background: #fef2f2;
  color: #dc2626;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #fecaca;
  margin-top: 1rem;
  font-weight: 500;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.review-tag {
  display: inline-flex;
  align-items: center;
  background: #dc2626;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  gap: 0.25rem;
}

.tag-remove-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.tag-remove-btn:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.tag-input-wrapper {
  position: relative;
  width: 100%;
}

.tag-input {
  width: 100%;
  padding-right: 2.5rem;
}

.clear-tag-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-tag-btn:hover {
  color: #dc2626;
}

.tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  margin-top: 1px;
}

.tag-suggestion {
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.tag-suggestion:hover {
  background-color: #f9fafb;
}

.tag-suggestion:last-child {
  border-bottom: none;
}

.popular-tags {
  margin-top: 0.5rem;
}

.popular-tags-label {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.popular-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.popular-tag-btn {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  padding: 0.375rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.popular-tag-btn:hover:not(:disabled) {
  background: #dc2626;
  color: white;
  border-color: #dc2626;
  transform: translateY(-1px);
}

.popular-tag-btn:disabled,
.popular-tag-btn.tag-already-added {
  opacity: 0.5;
  cursor: not-allowed;
  background: #e5e7eb;
  color: #9ca3af;
  border-color: #d1d5db;
}

.popular-tag-btn:disabled:hover,
.popular-tag-btn.tag-already-added:hover {
  transform: none;
}

.no-reviews {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.review-card {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.review-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.reviewer-info h4 {
  color: #dc2626;
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
}

.review-rating {
  display: flex;
  gap: 0.25rem;
}

.review-rating span {
  font-size: 1rem;
  opacity: 0.3;
  transition: opacity 0.3s ease;
}

.review-rating span.filled {
  opacity: 1;
}

.review-text {
  color: #374151;
  line-height: 1.6;
  margin: 0 0 1rem 0;
}

.review-tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

.review-tag-display {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid #fecaca;
}

/* Responsive Design */
@media (max-width: 768px) {
  .store-hero {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  
  .store-detail-content {
    padding: 1rem;
  }
  
  .store-name {
    font-size: 2rem;
  }
  
  .main-image img {
    height: 300px;
  }
  
  .thumbnail-images {
    justify-content: center;
  }
}
</style>

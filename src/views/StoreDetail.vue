<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStoreStore } from '@/stores/store'
import { useReviewStore } from '@/stores/review'
import { useRatingStore } from '@/stores/rating'
import { useTaggingStore } from '@/stores/tagging'
import { useUserStore } from '@/stores/user'
import type { Store, Review, Rating, CreateReviewRequest } from '@/types/api'

// Router and stores
const route = useRoute()
const router = useRouter()
const storeStore = useStoreStore()
const reviewStore = useReviewStore()
const ratingStore = useRatingStore()
const taggingStore = useTaggingStore()
const userStore = useUserStore()

// State
const store = ref<Store | null>(null)
const reviews = ref<Review[]>([])
const rating = ref<Rating | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

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

// Sample images for demonstration
const storeImages = ref([
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&h=600&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center',
  'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&crop=center'
])

const currentImageIndex = ref(0)

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

const getDefaultStore = (id: string): Store | null => {
  const defaultStores = [
    {
      storeId: '1',
      name: 'Kam Man Food',
      address: '219 Quincy Ave, Quincy, MA 02169',
      description: 'Large Asian supermarket with extensive selection of Chinese groceries, fresh seafood, and live fish tanks. Known for their fresh produce and authentic Chinese ingredients.',
      phone: '(617) 328-8888',
      hours: '9:00 AM - 9:00 PM',
      tags: ['Fresh Seafood', 'Live Fish', 'Asian Vegetables', 'Authentic Chinese'],
      specialties: ['Fresh Seafood', 'Live Fish', 'Asian Vegetables'],
      rating: 4.5,
      reviewCount: 127,
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&crop=center'
    },
    {
      storeId: '2',
      name: 'Super 88 Market',
      address: '1095 Commonwealth Ave, Boston, MA 02215',
      description: 'Popular Asian grocery chain with fresh bakery, hot food counter, and wide variety of frozen Asian foods. Great for quick meals and specialty items.',
      phone: '(617) 254-8888',
      hours: '8:00 AM - 10:00 PM',
      tags: ['Bakery', 'Hot Food', 'Frozen Foods', 'Quick Meals'],
      specialties: ['Bakery', 'Hot Food', 'Frozen Foods'],
      rating: 4.2,
      reviewCount: 89,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&h=600&fit=crop&crop=center'
    },
    {
      storeId: '3',
      name: 'C-Mart',
      address: '692 Washington St, Boston, MA 02111',
      description: 'Traditional Chinese grocery store specializing in Chinese medicine, premium teas, and authentic spices. A hidden gem for traditional Chinese ingredients.',
      phone: '(617) 426-8888',
      hours: '9:00 AM - 8:00 PM',
      tags: ['Chinese Medicine', 'Tea', 'Spices', 'Traditional'],
      specialties: ['Chinese Medicine', 'Tea', 'Spices'],
      rating: 4.3,
      reviewCount: 156,
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&crop=center'
    },
    {
      storeId: '4',
      name: 'Great Wall Supermarket',
      address: '1 Brighton Ave, Allston, MA 02134',
      description: 'Well-stocked supermarket with fresh produce, quality meat selection, and Asian dairy products. Known for their wide variety and competitive prices.',
      phone: '(617) 254-8888',
      hours: '8:30 AM - 9:30 PM',
      tags: ['Fresh Produce', 'Meat', 'Dairy', 'Competitive Prices'],
      specialties: ['Fresh Produce', 'Meat', 'Dairy'],
      rating: 4.4,
      reviewCount: 203,
      image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop&crop=center'
    },
    {
      storeId: '5',
      name: 'H-Mart',
      address: '581 Massachusetts Ave, Cambridge, MA 02139',
      description: 'Korean-owned chain with excellent selection of Korean-Chinese products, prepared foods, and household essentials. Modern and clean shopping experience.',
      phone: '(617) 876-8888',
      hours: '8:00 AM - 10:00 PM',
      tags: ['Korean-Chinese', 'Prepared Foods', 'Household Items', 'Modern'],
      specialties: ['Korean-Chinese', 'Prepared Foods', 'Household Items'],
      rating: 4.6,
      reviewCount: 312,
      image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop&crop=center'
    },
    {
      storeId: '6',
      name: 'Ranch 99',
      address: '99 Middlesex Turnpike, Burlington, MA 01803',
      description: 'Large format store with bulk items, extensive snack selection, and Asian beverages. Perfect for stocking up on essentials.',
      phone: '(781) 272-8888',
      hours: '9:00 AM - 9:00 PM',
      tags: ['Bulk Items', 'Snacks', 'Beverages', 'Essentials'],
      specialties: ['Bulk Items', 'Snacks', 'Beverages'],
      rating: 4.1,
      reviewCount: 98,
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop&crop=center'
    }
  ]
  
  return defaultStores.find(s => s.storeId === id) || null
}

const loadReviews = async () => {
  if (!storeId.value) return
  
  try {
    // Use new endpoint that returns full review objects
    reviews.value = await reviewStore.listReviewsForStore(storeId.value)
  } catch (err) {
    console.error('Failed to load reviews:', err)
    reviews.value = []
  }
}

const loadRating = async () => {
  if (!storeId.value) return
  
  try {
    const ratingData = await ratingStore.getRating({ storeId: storeId.value })
    rating.value = ratingData
  } catch (err) {
    // Use store's default rating if API fails
    if (store.value) {
      rating.value = {
        aggregatedRating: store.value.rating || 0,
        reviewCount: store.value.reviewCount || 0
      }
    }
  }
}


const nextImage = () => {
  currentImageIndex.value = (currentImageIndex.value + 1) % storeImages.value.length
}

const prevImage = () => {
  currentImageIndex.value = currentImageIndex.value === 0 
    ? storeImages.value.length - 1 
    : currentImageIndex.value - 1
}

const goBack = () => {
  router.push('/products')
}

const createReview = async () => {
  if (!currentUserId.value || !storeId.value || !newReviewText.value.trim()) {
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
      // Add to local reviews list at the beginning (newest first)
      const newReview: Review = {
        reviewId,
        userId: currentUserId.value,
        storeId: storeId.value,
        text: newReviewText.value.trim(),
        rating: newReviewRating.value,
        tags: newReviewTags.value.length > 0 ? newReviewTags.value : undefined
      }
      // Unshift adds to the beginning, ensuring new reviews appear first
      reviews.value.unshift(newReview)
      
      // Update rating with new review
      await loadRating()
      
      // Reload user reviews in My Account page by emitting event or calling loadUserData
      // Since we're on the store detail page, we don't need to do anything here
      
      // Reset form
      newReviewText.value = ''
      newReviewRating.value = 5
      newReviewTags.value = []
      newTagInput.value = ''
      showReviewForm.value = false
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to create review'
  } finally {
    creatingReview.value = false
  }
}

const goToLogin = () => {
  router.push('/my-account')
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

// Lifecycle
onMounted(() => {
  userStore.checkAuthStatus()
  
  // Load persisted reviews first (from localStorage)
  if (storeId.value && reviewStore.storeReviews[storeId.value]) {
    reviews.value = reviewStore.storeReviews[storeId.value]
  }
  
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
            <img :src="store.image || storeImages[currentImageIndex]" :alt="store.name" />
            <div class="image-nav">
              <button class="nav-btn prev" @click="prevImage">‹</button>
              <button class="nav-btn next" @click="nextImage">›</button>
            </div>
          </div>
          <div class="thumbnail-images">
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
              class="btn-add-review"
              @click="showReviewForm = true"
            >
              + Add Review
            </button>
            <button 
              v-else
              class="btn-add-review btn-disabled"
              @click="goToLogin"
              title="Login to add a review"
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
        <div v-if="showReviewForm" class="review-form-container">
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
                <h4>User {{ review.userId.slice(-1) }}</h4>
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
}

.store-images {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.main-image {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.main-image img {
  width: 100%;
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
}

.thumbnail-images img {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  opacity: 0.7;
  transition: all 0.3s ease;
  border: 2px solid transparent;
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

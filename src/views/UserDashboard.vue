<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useReviewStore } from '@/stores/review'
import { useStoreStore } from '@/stores/store'
import type { Review, CreateReviewRequest } from '@/types/api'

// Store instances
const userStore = useUserStore()
const reviewStore = useReviewStore()
const storeStore = useStoreStore()

// State
const userReviews = ref<Review[]>([])
const showCreateReviewForm = ref(false)
const selectedStoreId = ref('')
const newReviewText = ref('')
const newReviewRating = ref(5)
const loading = ref(false)
const error = ref<string | null>(null)

// Store creation state
const showCreateStoreForm = ref(false)
const newStore = ref({
  name: '',
  address: ''
})

// User's created stores
const userStores = ref<any[]>([])
const loadingStores = ref(false)

// Autocomplete for store selection
const storeSearchQuery = ref('')
const showStoreSuggestions = ref(false)
const filteredStores = ref<any[]>([])
const allStores = ref<any[]>([])

// Form data for creating a new review
const createReviewForm = ref<CreateReviewRequest>({
  userId: '',
  storeId: '',
  text: '',
  rating: 5
})

// Computed properties
const isLoggedIn = computed(() => userStore.isAuthenticated)
const currentUserId = computed(() => userStore.userId)
const currentUsername = computed(() => userStore.username)

// Sample stores for the dropdown (in a real app, this would come from the store store)
const availableStores = ref([
  { storeId: '1', name: 'Kam Man Food', address: '219 Quincy Ave, Quincy, MA 02169' },
  { storeId: '2', name: 'Super 88 Market', address: '1095 Commonwealth Ave, Boston, MA 02215' },
  { storeId: '3', name: 'C-Mart', address: '692 Washington St, Boston, MA 02111' },
  { storeId: '4', name: 'Great Wall Supermarket', address: '1 Brighton Ave, Allston, MA 02134' },
  { storeId: '5', name: 'H-Mart', address: '581 Massachusetts Ave, Cambridge, MA 02139' },
  { storeId: '6', name: 'Ranch 99', address: '99 Middlesex Turnpike, Burlington, MA 01803' }
])

// Methods
const loadUserReviews = async () => {
  if (!currentUserId.value) return
  
  try {
    loading.value = true
    error.value = null
    
    // Get review IDs for the user
    const reviewIds = await reviewStore.fetchReviewsByUser(currentUserId.value)
    
    // Debug logging
    console.log('Review IDs received:', reviewIds, 'Type:', typeof reviewIds)
    
    // Ensure reviewIds is an array
    const reviewIdsArray = Array.isArray(reviewIds) ? reviewIds : []
    
    // For now, we'll create mock reviews since the API only returns IDs
    // In a real implementation, you'd need a getReview endpoint to fetch full review details
    if (reviewIdsArray.length > 0) {
      userReviews.value = reviewIdsArray.map((reviewId, index) => {
        const store = availableStores.value[index % availableStores.value.length]
        return {
          reviewId,
          userId: currentUserId.value!,
          storeId: store.storeId,
          text: `This is a sample review for ${store.name}. Great store with excellent selection!`,
          rating: Math.floor(Math.random() * 5) + 1
        }
      })
    } else {
      // Show some sample reviews if no reviews exist yet
      userReviews.value = []
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load reviews'
    // Set empty array as fallback
    userReviews.value = []
  } finally {
    loading.value = false
  }
}

const createReview = async () => {
  if (!currentUserId.value || !selectedStoreId.value || !newReviewText.value.trim()) {
    error.value = 'Please select a store and fill in all required fields'
    return
  }
  
  try {
    loading.value = true
    error.value = null
    
    const reviewData: CreateReviewRequest = {
      userId: currentUserId.value,
      storeId: selectedStoreId.value,
      text: newReviewText.value.trim(),
      rating: newReviewRating.value
    }
    
    const reviewId = await reviewStore.createReview(reviewData)
    
    if (reviewId) {
      // Add to local reviews list
      const newReview: Review = {
        reviewId,
        userId: currentUserId.value,
        storeId: selectedStoreId.value,
        text: newReviewText.value.trim(),
        rating: newReviewRating.value
      }
      userReviews.value.unshift(newReview)
      
      // Reset form
      selectedStoreId.value = ''
      newReviewText.value = ''
      newReviewRating.value = 5
      showCreateReviewForm.value = false
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to create review'
  } finally {
    loading.value = false
  }
}

const deleteReview = async (reviewId: string) => {
  if (!confirm('Are you sure you want to delete this review?')) return
  
  try {
    loading.value = true
    error.value = null
    
    const success = await reviewStore.deleteReview(reviewId)
    
    if (success) {
      // Remove from local reviews list
      const index = userReviews.value.findIndex(review => review.reviewId === reviewId)
      if (index > -1) {
        userReviews.value.splice(index, 1)
      }
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to delete review'
  } finally {
    loading.value = false
  }
}

const getStoreName = (storeId: string) => {
  const store = availableStores.value.find(s => s.storeId === storeId)
  return store ? store.name : 'Unknown Store'
}

const getStoreAddress = (storeId: string) => {
  const store = availableStores.value.find(s => s.storeId === storeId)
  return store ? store.address : 'Unknown Address'
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const createStore = async () => {
  if (!newStore.value.name || !newStore.value.address) {
    error.value = 'Please fill in both store name and address'
    return
  }
  
  try {
    loading.value = true
    error.value = null
    
    const storeId = await storeStore.createStore(newStore.value)
    
    if (storeId) {
      alert(`Store created successfully! ID: ${storeId}`)
      newStore.value = { name: '', address: '' }
      showCreateStoreForm.value = false
      // Reload user stores after creating a new one
      await loadUserStores()
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to create store'
  } finally {
    loading.value = false
  }
}

const loadUserStores = async () => {
  if (!currentUserId.value) return
  
  try {
    loadingStores.value = true
    // For now, we'll use the existing stores from the store store
    // In a real implementation, you'd have an API endpoint to get stores by user
    userStores.value = storeStore.stores || []
  } catch (err: any) {
    console.error('Failed to load user stores:', err)
  } finally {
    loadingStores.value = false
  }
}

const loadAllStores = async () => {
  try {
    // Load all available stores for autocomplete
    // This would typically come from an API endpoint
    allStores.value = [
      { storeId: '1', name: 'Kam Man Food', address: '219 Quincy Ave, Quincy, MA 02169' },
      { storeId: '2', name: 'Super 88 Market', address: '1095 Commonwealth Ave, Boston, MA 02215' },
      { storeId: '3', name: 'C-Mart', address: '692 Washington St, Boston, MA 02111' },
      { storeId: '4', name: 'Great Wall Supermarket', address: '1 Brighton Ave, Allston, MA 02134' },
      { storeId: '5', name: 'H-Mart', address: '581 Massachusetts Ave, Cambridge, MA 02139' },
      { storeId: '6', name: 'Ranch 99', address: '99 Middlesex Turnpike, Burlington, MA 01803' }
    ]
  } catch (err: any) {
    console.error('Failed to load stores:', err)
  }
}

const searchStores = (query: string) => {
  if (!query.trim()) {
    filteredStores.value = []
    showStoreSuggestions.value = false
    return
  }
  
  const searchTerm = query.toLowerCase()
  filteredStores.value = allStores.value.filter(store => 
    store.name.toLowerCase().includes(searchTerm) ||
    store.address.toLowerCase().includes(searchTerm)
  )
  showStoreSuggestions.value = filteredStores.value.length > 0
}

const selectStore = (store: any) => {
  selectedStoreId.value = store.storeId
  storeSearchQuery.value = store.name
  showStoreSuggestions.value = false
}

const clearStoreSelection = () => {
  selectedStoreId.value = ''
  storeSearchQuery.value = ''
  showStoreSuggestions.value = false
}

// Lifecycle
onMounted(async () => {
  await loadAllStores() // Load all stores for autocomplete
  if (isLoggedIn.value) {
    await loadUserReviews()
    await loadUserStores()
  }
})
</script>

<template>
  <div class="user-dashboard page-container">
    <section class="dashboard-hero">
      <h1>My Reviews</h1>
      <p class="subtitle">Manage your reviews for Chinese grocery stores</p>
    </section>

    <section class="dashboard-content">
      <!-- Authentication Check -->
      <div v-if="!isLoggedIn" class="auth-required">
        <div class="auth-message">
          <h2>Please Log In</h2>
          <p>You need to be logged in to view and manage your reviews.</p>
          <button class="btn-primary" @click="$router.push('/manage')">Go to Login</button>
        </div>
      </div>

      <!-- User Dashboard Content -->
      <div v-else class="dashboard-main">
        <!-- User Info -->
        <div class="user-info">
          <h2>Welcome, {{ currentUsername }}!</h2>
          <p>You have {{ userReviews.length }} review{{ userReviews.length !== 1 ? 's' : '' }}</p>
        </div>

        <!-- Create Review Section -->
        <div class="create-review-section">
          <div class="section-header">
            <h3>Write a New Review</h3>
            <button 
              class="btn-secondary" 
              @click="showCreateReviewForm = !showCreateReviewForm"
            >
              {{ showCreateReviewForm ? 'Cancel' : 'Write Review' }}
            </button>
          </div>

          <!-- Create Review Form -->
          <div v-if="showCreateReviewForm" class="create-review-form">
            <div class="form-group">
              <label for="store-search">Search Store:</label>
              <div class="autocomplete-container">
                <input 
                  id="store-search"
                  v-model="storeSearchQuery" 
                  @input="searchStores(storeSearchQuery)"
                  @focus="searchStores(storeSearchQuery)"
                  @blur="setTimeout(() => showStoreSuggestions = false, 200)"
                  class="form-input"
                  placeholder="Type store name to search..."
                  required
                />
                <button 
                  v-if="storeSearchQuery"
                  type="button"
                  @click="clearStoreSelection"
                  class="clear-search-btn"
                >
                  ×
                </button>
                
                <!-- Autocomplete suggestions -->
                <div v-if="showStoreSuggestions && filteredStores.length > 0" class="suggestions-dropdown">
                  <div 
                    v-for="store in filteredStores" 
                    :key="store.storeId"
                    @click="selectStore(store)"
                    class="suggestion-item"
                  >
                    <div class="suggestion-name">{{ store.name }}</div>
                    <div class="suggestion-address">{{ store.address }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="rating">Rating:</label>
              <select 
                id="rating" 
                v-model="newReviewRating" 
                class="form-input"
              >
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Very Good</option>
                <option value="3">3 - Good</option>
                <option value="2">2 - Fair</option>
                <option value="1">1 - Poor</option>
              </select>
            </div>

            <div class="form-group">
              <label for="review-text">Review Text:</label>
              <textarea 
                id="review-text" 
                v-model="newReviewText" 
                class="form-textarea"
                placeholder="Share your experience with this store..."
                rows="4"
                required
              ></textarea>
            </div>

            <div class="form-actions">
              <button 
                class="btn-primary" 
                @click="createReview"
                :disabled="loading || !selectedStoreId || !newReviewText.trim()"
              >
                {{ loading ? 'Creating...' : 'Submit Review' }}
              </button>
              <button 
                class="btn-secondary" 
                @click="showCreateReviewForm = false"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- Create Store Section -->
        <div class="create-store-section">
          <div class="section-header">
            <h3>Create a New Store</h3>
            <button 
              class="btn-secondary" 
              @click="showCreateStoreForm = !showCreateStoreForm"
            >
              {{ showCreateStoreForm ? 'Cancel' : 'Add Store' }}
            </button>
          </div>

          <!-- Create Store Form -->
          <div v-if="showCreateStoreForm" class="create-store-form">
            <div class="form-group">
              <label for="store-name">Store Name:</label>
              <input 
                id="store-name"
                v-model="newStore.name" 
                class="form-input"
                placeholder="Enter store name..."
                required
              />
            </div>

            <div class="form-group">
              <label for="store-address">Store Address:</label>
              <input 
                id="store-address"
                v-model="newStore.address" 
                class="form-input"
                placeholder="Enter store address..."
                required
              />
            </div>

            <div class="form-actions">
              <button 
                class="btn-primary" 
                @click="createStore"
                :disabled="loading || !newStore.name || !newStore.address"
              >
                {{ loading ? 'Creating...' : 'Create Store' }}
              </button>
              <button 
                class="btn-secondary" 
                @click="showCreateStoreForm = false"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <!-- User's Created Stores -->
        <div v-if="userStores.length > 0" class="user-stores-section">
          <h3>Your Created Stores</h3>
          <div v-if="loadingStores" class="loading">
            <p>Loading your stores...</p>
          </div>
          <div v-else class="stores-list">
            <div v-for="store in userStores" :key="store.storeId" class="store-item">
              <div class="store-info">
                <h4>{{ store.name }}</h4>
                <p class="store-address">{{ store.address }}</p>
                <small>Store ID: {{ store.storeId }}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="error" class="error-message">
          <p>{{ error }}</p>
          <button @click="error = null" class="close-error">×</button>
        </div>

        <!-- User Reviews List -->
        <div class="reviews-section">
          <h3>Your Reviews</h3>
          
          <div v-if="loading && userReviews.length === 0" class="loading">
            <p>Loading your reviews...</p>
          </div>

          <div v-else-if="userReviews.length === 0" class="no-reviews">
            <p>You haven't written any reviews yet.</p>
            <p>Share your experience with Chinese grocery stores in your area!</p>
          </div>

          <div v-else class="reviews-list">
            <div 
              v-for="review in userReviews" 
              :key="review.reviewId" 
              class="review-card"
            >
              <div class="review-header">
                <div class="store-info">
                  <h4>{{ getStoreName(review.storeId) }}</h4>
                  <p class="store-address">{{ getStoreAddress(review.storeId) }}</p>
                </div>
                <div class="review-rating">
                  <span class="rating-stars">
                    {{ '⭐'.repeat(review.rating) }}
                  </span>
                  <span class="rating-number">{{ review.rating }}/5</span>
                </div>
              </div>

              <div class="review-content">
                <p class="review-text">{{ review.text }}</p>
              </div>

              <div class="review-actions">
                <button 
                  class="btn-delete" 
                  @click="deleteReview(review.reviewId)"
                  :disabled="loading"
                >
                  Delete Review
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.user-dashboard {
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  background: white;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.dashboard-hero {
  background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%);
  padding: 4rem 4rem;
  text-align: center;
  border-bottom: 3px solid #dc2626;
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.dashboard-hero h1 {
  font-size: 3.5rem;
  color: #dc2626;
  margin-bottom: 1rem;
  font-weight: bold;
}

.subtitle {
  font-size: 1.5rem;
  color: #f59e0b;
  font-weight: 500;
}

.dashboard-content {
  padding: 4rem 4rem;
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.auth-required {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.auth-message {
  text-align: center;
  background: #f9fafb;
  padding: 3rem;
  border-radius: 16px;
  border: 2px solid #f59e0b;
  max-width: 500px;
}

.auth-message h2 {
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 2rem;
}

.auth-message p {
  color: #374151;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.dashboard-main {
  max-width: 1000px;
  margin: 0 auto;
}

.user-info {
  background: #f9fafb;
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 3rem;
  border: 2px solid #f59e0b;
}

.user-info h2 {
  color: #dc2626;
  margin-bottom: 0.5rem;
  font-size: 2rem;
}

.user-info p {
  color: #374151;
  font-size: 1.1rem;
}

.create-review-section, .create-store-section, .user-stores-section {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 3rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid #f3f4f6;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.section-header h3 {
  color: #dc2626;
  font-size: 1.5rem;
  margin: 0;
}

.create-review-form, .create-store-form {
  background: #f9fafb;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #374151;
  font-weight: 600;
}

.form-input, .form-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-input:focus, .form-textarea:focus {
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
  margin-top: 2rem;
}

.error-message {
  background: #fef2f2;
  color: #dc2626;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #fecaca;
  margin-bottom: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-error {
  background: none;
  border: none;
  color: #dc2626;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
}

.reviews-section {
  background: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid #f3f4f6;
}

.reviews-section h3 {
  color: #dc2626;
  font-size: 1.5rem;
  margin-bottom: 2rem;
}

.loading, .no-reviews {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.no-reviews p {
  margin-bottom: 1rem;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.review-card {
  background: #f9fafb;
  padding: 2rem;
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
  align-items: flex-start;
  margin-bottom: 1rem;
}

.store-info h4 {
  color: #dc2626;
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

.store-address {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0;
}

.review-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.rating-stars {
  font-size: 1.2rem;
}

.rating-number {
  color: #f59e0b;
  font-weight: 600;
  font-size: 1rem;
}

.review-content {
  margin-bottom: 1.5rem;
}

.review-text {
  color: #374151;
  line-height: 1.6;
  margin: 0;
}

.review-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-primary, .btn-secondary, .btn-delete {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #dc2626;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #b91c1c;
  transform: translateY(-2px);
}

.btn-primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: white;
  color: #dc2626;
  border: 2px solid #dc2626;
}

.btn-secondary:hover {
  background: #dc2626;
  color: white;
  transform: translateY(-2px);
}

.btn-delete {
  background: #ef4444;
  color: white;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}

.btn-delete:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-2px);
}

.btn-delete:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

.stores-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.store-item {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.store-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.store-item h4 {
  color: #dc2626;
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
}

.store-item .store-address {
  color: #6b7280;
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
}

.store-item small {
  color: #9ca3af;
  font-size: 0.8rem;
}

.autocomplete-container {
  position: relative;
  width: 100%;
}

.clear-search-btn {
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

.clear-search-btn:hover {
  color: #dc2626;
}

.suggestions-dropdown {
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
}

.suggestion-item {
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background-color 0.2s ease;
}

.suggestion-item:hover {
  background-color: #f9fafb;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-name {
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.25rem;
}

.suggestion-address {
  font-size: 0.9rem;
  color: #6b7280;
}

/* Desktop-focused design - minimal responsive adjustments */
@media (max-width: 1200px) {
  .dashboard-hero {
    padding: 3rem 2rem;
  }
  
  .dashboard-content {
    padding: 3rem 2rem;
  }
}
</style>

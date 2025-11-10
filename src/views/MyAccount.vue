<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useReviewStore } from '@/stores/review'
import { useStoreStore } from '@/stores/store'
import { useRatingStore } from '@/stores/rating'
import { useTaggingStore } from '@/stores/tagging'
import { useNotificationStore } from '@/stores/notification'
import { STORAGE_KEYS } from '@/utils/storageKeys'
import type { Review, CreateReviewRequest, Store } from '@/types/api'

// Router
const router = useRouter()

// Store instances
const userStore = useUserStore()
const reviewStore = useReviewStore()
const storeStore = useStoreStore()
const ratingStore = useRatingStore()
const taggingStore = useTaggingStore()
const notificationStore = useNotificationStore()

// User stores display interface
interface UserStoreDisplay extends Store {
  id: string
  rating: number
  reviewCount: number
}

// Authentication state
const showLoginForm = ref(false)
const showRegisterForm = ref(false)

// Functions to handle form toggling - only one form visible at a time
const openLoginForm = () => {
  if (showLoginForm.value) {
    // If already open, close it
    showLoginForm.value = false
  } else {
    // Open login form and ensure register form is closed
    showRegisterForm.value = false
    showLoginForm.value = true
  }
}

const openRegisterForm = () => {
  if (showRegisterForm.value) {
    // If already open, close it
    showRegisterForm.value = false
  } else {
    // Open register form and ensure login form is closed
    showLoginForm.value = false
    showRegisterForm.value = true
  }
}

// Registration form data
const newUser = ref({
  username: '',
  email: '',
  password: ''
})

// Login form data
const loginData = ref({
  usernameOrEmail: '',
  password: ''
})

// User dashboard state
const userReviews = ref<Review[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Store creation state
const showCreateStoreForm = ref(false)
const newStore = ref({
  name: '',
  address: '',
  description: '',
  tags: [] as string[],
  phone: '',
  hours: ''
})

// Tag input state
const newTag = ref('')

// User's created stores
const userStores = ref<UserStoreDisplay[]>([])
const loadingStores = ref(false)

// Computed properties
const isLoggedIn = computed(() => userStore.isAuthenticated)
const currentUserId = computed(() => userStore.userId)
const currentUsername = computed(() => userStore.username)


// Authentication methods
const registerUser = async () => {
  if (newUser.value.username && newUser.value.email && newUser.value.password) {
    try {
      // Register user without auto-login
      const userId = await userStore.registerUser({
        username: newUser.value.username,
        email: newUser.value.email,
        password: newUser.value.password
      })
      
      if (userId) {
        // Clear any auth state to ensure user is not logged in
        // (registerUser stores userId but we don't want to auto-login)
        // Note: Using the same keys that the user store uses internally
        localStorage.removeItem(STORAGE_KEYS.userId)
        localStorage.removeItem(STORAGE_KEYS.authToken)
        userStore.clearUser()
        
        // Show success notification
        notificationStore.success('Account created')
        
        // Clear registration form
        newUser.value = { username: '', email: '', password: '' }
        
        // Close registration form and open login form
        showRegisterForm.value = false
        showLoginForm.value = true
        
        // Clear any errors
        error.value = null
      } else {
        // Error is already set in userStore.error, but display it more prominently
        if (userStore.error) {
          error.value = userStore.error
          notificationStore.error(userStore.error)
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to create account'
      error.value = errorMessage
      notificationStore.error(errorMessage)
    }
  }
}

const loginUser = async () => {
  if (loginData.value.usernameOrEmail && loginData.value.password) {
    const success = await userStore.login(
      loginData.value.usernameOrEmail,
      loginData.value.password
    )
    if (success) {
      notificationStore.success('Login successful!')
      loginData.value = { usernameOrEmail: '', password: '' }
      showLoginForm.value = false
      showRegisterForm.value = false
      await loadUserData()
    } else {
      // Error is already set in userStore.error, but display it more prominently
      if (userStore.error) {
        error.value = userStore.error
      }
    }
  }
}

const logout = () => {
  userStore.logout()
  notificationStore.success('Logged out successfully!')
  userReviews.value = []
  userStores.value = []
  // Note: We keep the created stores list in localStorage even after logout
  // so users can see their stores when they log back in
}

// User dashboard methods
const loadUserReviews = async () => {
  if (!currentUserId.value) return
  
  try {
    loading.value = true
    error.value = null
    
    // Use new endpoint that returns full review objects
    userReviews.value = await reviewStore.listReviewsByUser(currentUserId.value)
  } catch (err: any) {
    error.value = err.message || 'Failed to load reviews'
    userReviews.value = []
  } finally {
    loading.value = false
  }
}


// Confirmation state for delete review
const showDeleteConfirm = ref(false)
const reviewToDelete = ref<string | null>(null)

const confirmDeleteReview = () => {
  if (reviewToDelete.value) {
    performDeleteReview(reviewToDelete.value)
    showDeleteConfirm.value = false
    reviewToDelete.value = null
  }
}

const cancelDeleteReview = () => {
  showDeleteConfirm.value = false
  reviewToDelete.value = null
}

const requestDeleteReview = (reviewId: string) => {
  reviewToDelete.value = reviewId
  showDeleteConfirm.value = true
}

const performDeleteReview = async (reviewId: string) => {
  
  try {
    loading.value = true
    error.value = null
    
    const success = await reviewStore.deleteReview(reviewId)
    
    if (success) {
      // Reload reviews from backend to ensure we have the latest data
      // The review store already updated its state, but we refresh to be sure
      await loadUserReviews()
      // Clear any previous errors
      error.value = null
      notificationStore.success('Review deleted successfully')
    } else {
      // Handle sync-based errors
      if (reviewStore.error) {
        error.value = reviewStore.error
      }
    }
  } catch (err: any) {
    // Handle sync-based errors (e.g., review not found, permission errors)
    const errorMessage = err.response?.data?.error || err.message || 'Failed to delete review'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}

const createStore = async () => {
  if (!newStore.value.name || !newStore.value.address) {
    error.value = 'Please fill in both store name and address'
    return
  }
  
  try {
    loading.value = true
    error.value = null
    
    // Pass userId to track this store as created by the current user
    const storeId = await storeStore.createStore(newStore.value, currentUserId.value)
    
    if (storeId) {
      // Add tags if any - use taggingStore to ensure local state is updated
      if (newStore.value.tags.length > 0) {
        for (const tag of newStore.value.tags) {
          await taggingStore.addTag(storeId, tag)
        }
        // After adding all tags, refresh tags from backend to ensure consistency
        // This ensures the tagging store has the latest tags
        await taggingStore.listTagsForStore(storeId)
      }
      
      notificationStore.success(`Store created successfully!`)
      newStore.value = { 
        name: '', 
        address: '', 
        description: '', 
        tags: [], 
        phone: '', 
        hours: '' 
      }
      showCreateStoreForm.value = false
      
      // Clear any previous errors
      error.value = null
      
      // The store is now in storeStore.stores and tracked in userCreatedStores
      // Force an immediate reload to show the new store with tags
      // Wait a tiny bit to ensure store store has fully updated
      await new Promise(resolve => setTimeout(resolve, 50))
      await loadUserStores(true)
    } else {
      // Handle sync-based validation errors
      if (storeStore.error) {
        error.value = storeStore.error
      }
    }
  } catch (err: any) {
    // Handle sync-based errors (e.g., duplicate store, validation errors)
    const errorMessage = err.response?.data?.error || err.message || 'Failed to create store'
    error.value = errorMessage
  } finally {
    loading.value = false
  }
}

const addTag = () => {
  if (newTag.value.trim() && !newStore.value.tags.includes(newTag.value.trim())) {
    newStore.value.tags.push(newTag.value.trim())
    newTag.value = ''
  }
}

const removeTag = (tagToRemove: string) => {
  newStore.value.tags = newStore.value.tags.filter(tag => tag !== tagToRemove)
}

const loadUserStores = async (skipBackendRefresh = false) => {
  if (!currentUserId.value) {
    userStores.value = []
    return
  }
  
  try {
    loadingStores.value = true
    error.value = null
    
    // Get storeIds created by this user from the store store (single source of truth)
    const userCreatedStoreIds = storeStore.getUserCreatedStoreIds(currentUserId.value)
    
    if (userCreatedStoreIds.length === 0) {
      userStores.value = []
      loadingStores.value = false
      return
    }
    
    // Optionally refresh from backend (skip if we just created a store and it's already in local state)
    if (!skipBackendRefresh) {
      await storeStore.listStores()
    }
    
    // Get stores created by this user from the store store
    // This will use the stores currently in the store store (which includes newly created ones)
    let userCreatedStoresList = storeStore.getUserCreatedStores(currentUserId.value)
    
    // If we have storeIds but no stores found, the stores might not be loaded yet
    // Try to fetch any missing stores
    if (userCreatedStoreIds.length > 0 && userCreatedStoresList.length < userCreatedStoreIds.length) {
      const missingStoreIds = userCreatedStoreIds.filter(id => 
        !userCreatedStoresList.some(store => store.storeId === id)
      )
      
      // Fetch missing stores
      for (const storeId of missingStoreIds) {
        try {
          const store = await storeStore.getStoreById(storeId)
          if (store) {
            // Store will be added to storeStore.stores by getStoreById
          }
        } catch (e) {
          // Store might not exist in backend yet, continue
        }
      }
      
      // Re-fetch the list after loading missing stores
      userCreatedStoresList = storeStore.getUserCreatedStores(currentUserId.value)
    }
    
    if (userCreatedStoresList.length === 0) {
      userStores.value = []
      loadingStores.value = false
      return
    }
    
    // Fetch ratings and tags for each user-created store
    const userStoresData = await Promise.all(
      userCreatedStoresList.map(async (store) => {
        // Fetch rating
        const rating = await ratingStore.getRating(store.storeId)
        
        // Fetch tags
        const tags = await taggingStore.listTagsForStore(store.storeId)
        
        return {
          ...store,
          id: store.storeId,
          rating: rating?.aggregatedRating || 0,
          reviewCount: rating?.reviewCount || 0,
          tags: tags
        } as UserStoreDisplay
      })
    )
    
    // Update state with user stores
    userStores.value = userStoresData
  } catch (err: any) {
    console.error('Failed to load user stores:', err)
    error.value = err.message || 'Failed to load your stores'
  } finally {
    loadingStores.value = false
  }
}


const getStoreName = (storeId: string) => {
  const store = storeStore.stores.find(s => s.storeId === storeId)
  return store?.name || `Store ID: ${storeId}`
}

const getStoreAddress = (storeId: string) => {
  const store = storeStore.stores.find(s => s.storeId === storeId)
  return store?.address || 'View store details on the Stores page'
}

const goToStore = (storeId: string) => {
  router.push(`/store/${storeId}`)
}

const loadUserData = async () => {
  if (isLoggedIn.value) {
    // Migrate old user stores if they exist (from previous localStorage format)
    if (currentUserId.value) {
      storeStore.migrateOldUserStores(currentUserId.value)
    }
    
    await loadUserReviews()
    await loadUserStores()
  }
}

// Watch for review store changes to keep reviews in sync (real-time updates)
watch(() => reviewStore.userReviews[currentUserId.value || ''], (newReviews) => {
  if (currentUserId.value && newReviews && Array.isArray(newReviews)) {
    userReviews.value = newReviews
  } else if (!newReviews && currentUserId.value) {
    // If reviews are removed, clear local state
    userReviews.value = []
  }
}, { deep: true })

// Watch for currentUserId changes to reload reviews
watch(() => currentUserId.value, async (newUserId) => {
  if (newUserId && isLoggedIn.value) {
    // Always fetch from backend when user changes
    await loadUserReviews()
  } else {
    userReviews.value = []
  }
})

// Computed property for user's created store IDs - this will be reactive
const userCreatedStoreIds = computed(() => {
  if (!currentUserId.value) return []
  return storeStore.getUserCreatedStoreIds(currentUserId.value)
})

// Watch for changes to user's created store IDs to update the display
watch(userCreatedStoreIds, (newIds, oldIds) => {
  // Only reload if the list actually changed (new store added or removed)
  if (currentUserId.value && isLoggedIn.value) {
    const oldIdsSet = new Set(oldIds || [])
    const newIdsSet = new Set(newIds || [])
    const hasChanges = newIds.length !== oldIds.length || 
                      newIds.some(id => !oldIdsSet.has(id)) ||
                      oldIds.some(id => !newIdsSet.has(id))
    
    if (hasChanges) {
      // Reload user stores when the list of created store IDs changes
      loadUserStores(true) // Skip backend refresh for immediate updates
    }
  }
}, { deep: true })

// Debounce timer for store changes
let storeChangeTimeout: ReturnType<typeof setTimeout> | null = null

// Watch for store count changes - update user stores when new stores are added
watch(() => storeStore.stores.length, () => {
  if (currentUserId.value && isLoggedIn.value && userCreatedStoreIds.value.length > 0) {
    // Clear existing timeout
    if (storeChangeTimeout) {
      clearTimeout(storeChangeTimeout)
    }
    // Debounce to avoid excessive calls
    storeChangeTimeout = setTimeout(() => {
      loadUserStores(true)
    }, 300)
  }
})

// Lifecycle
onMounted(async () => {
  await userStore.checkAuthStatus()
  
  // Debug logging to track auth state
  console.group('Auth debug after checkAuthStatus')
  console.log('LS userId:', localStorage.getItem(STORAGE_KEYS.userId))
  console.log('LS token:', localStorage.getItem(STORAGE_KEYS.authToken))
  console.log('Store isAuthenticated:', userStore.isAuthenticated)
  console.log('Store userId:', userStore.userId)
  console.log('Store currentUser:', userStore.currentUser)
  console.groupEnd()
  
  // Always load user data from backend (this is the single source of truth)
  // Don't use localStorage cached data - always fetch fresh from backend
  await loadUserData()
})
</script>

<template>
  <div class="my-account page-container">
    <section class="account-hero">
      <h1>My Account</h1>
      <p class="subtitle">Manage your account, reviews, and store listings</p>
    </section>

    <section class="account-content">
      <!-- Not Logged In State -->
      <div v-if="!isLoggedIn" class="auth-section">
        <div class="auth-container">
          <h2>Welcome to Chinese Grocery Finder</h2>
          <p>Sign in to your account or create a new one to manage your reviews and store listings.</p>
          
          <div class="auth-options">
            <button 
              type="button"
              class="btn-primary" 
              @click="openLoginForm"
            >
              {{ showLoginForm ? 'Cancel Login' : 'Sign In' }}
            </button>
            <button 
              type="button"
              class="btn-secondary" 
              @click="openRegisterForm"
            >
              {{ showRegisterForm ? 'Cancel Registration' : 'Create Account' }}
            </button>
          </div>

          <!-- Login Form -->
          <div v-if="showLoginForm" class="auth-form">
            <h3>Sign In</h3>
            <div class="form-group">
              <label for="login-username">Username or Email:</label>
              <input 
                id="login-username"
                v-model="loginData.usernameOrEmail" 
                type="text"
                placeholder="Enter username or email"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="login-password">Password:</label>
              <input 
                id="login-password"
                v-model="loginData.password" 
                type="password"
                placeholder="Enter password"
                class="form-input"
              />
            </div>
            <div class="form-actions">
              <button 
                class="btn-primary" 
                @click="loginUser"
                :disabled="userStore.loading"
              >
                {{ userStore.loading ? 'Signing In...' : 'Sign In' }}
              </button>
            </div>
          </div>

          <!-- Registration Form -->
          <div v-if="showRegisterForm" class="auth-form">
            <h3>Create Account</h3>
            <div class="form-group">
              <label for="register-username">Username:</label>
              <input 
                id="register-username"
                v-model="newUser.username" 
                type="text"
                placeholder="Choose a username"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="register-email">Email:</label>
              <input 
                id="register-email"
                v-model="newUser.email" 
                type="email"
                placeholder="Enter your email"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="register-password">Password:</label>
              <input 
                id="register-password"
                v-model="newUser.password" 
                type="password"
                placeholder="Choose a password"
                class="form-input"
              />
            </div>
            <div class="form-actions">
              <button 
                class="btn-primary" 
                @click="registerUser"
                :disabled="userStore.loading"
              >
                {{ userStore.loading ? 'Creating Account...' : 'Create Account' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Logged In State -->
      <div v-else class="dashboard-main">
        <!-- User Info Header -->
        <div class="user-info">
          <div class="user-details">
            <h2>Welcome back, {{ currentUsername }}!</h2>
            <p>Email: {{ userStore.email }}</p>
            <p>You have {{ userReviews.length }} review{{ userReviews.length !== 1 ? 's' : '' }}</p>
          </div>
          <div class="user-actions">
            <button class="btn-secondary" @click="logout">Sign Out</button>
          </div>
        </div>

        <!-- Create Store Section -->
        <div class="create-store-section">
          <div class="section-header">
            <h3>Add a New Store</h3>
            <button 
              class="btn-secondary" 
              @click="showCreateStoreForm = !showCreateStoreForm"
            >
              {{ showCreateStoreForm ? 'Cancel' : 'Add Store' }}
            </button>
          </div>

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

            <div class="form-group">
              <label for="store-description">Description:</label>
              <textarea 
                id="store-description"
                v-model="newStore.description" 
                class="form-textarea"
                placeholder="Describe the store, its specialties, and what makes it unique..."
                rows="3"
              ></textarea>
            </div>

            <div class="form-group">
              <label for="store-phone">Phone Number (optional):</label>
              <input 
                id="store-phone"
                v-model="newStore.phone" 
                class="form-input"
                placeholder="Enter phone number..."
                type="tel"
              />
            </div>

            <div class="form-group">
              <label for="store-hours">Hours (optional):</label>
              <input 
                id="store-hours"
                v-model="newStore.hours" 
                class="form-input"
                placeholder="e.g., 9:00 AM - 9:00 PM"
              />
            </div>

            <div class="form-group">
              <label for="store-tags">Tags:</label>
              <div class="tags-input-container">
                <div class="tags-display">
                  <span 
                    v-for="tag in newStore.tags" 
                    :key="tag" 
                    class="tag-item"
                  >
                    {{ tag }}
                    <button 
                      type="button" 
                      @click="removeTag(tag)" 
                      class="tag-remove"
                    >
                      ×
                    </button>
                  </span>
                </div>
                <div class="tag-input-row">
                  <input 
                    id="store-tags"
                    v-model="newTag" 
                    class="form-input"
                    placeholder="Add tags (e.g., Fresh Seafood, Bakery, Live Fish)..."
                    @keyup.enter="addTag"
                  />
                  <button 
                    type="button" 
                    @click="addTag" 
                    class="btn-add-tag"
                    :disabled="!newTag.trim()"
                  >
                    Add Tag
                  </button>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button 
                class="btn-primary" 
                @click="createStore"
                :disabled="loading || !newStore.name || !newStore.address"
              >
                {{ loading ? 'Creating...' : 'Add Store' }}
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
        <div class="user-stores-section">
          <div class="section-header">
            <h3>Your Created Stores</h3>
            <button 
              v-if="!loadingStores" 
              class="btn-secondary" 
              @click="() => loadUserStores()"
            >
              Refresh
            </button>
          </div>
          
          <div v-if="loadingStores" class="loading">
            <p>Loading your stores...</p>
          </div>
          
          <div v-else-if="userStores.length === 0" class="no-stores">
            <p>You haven't created any stores yet.</p>
            <p>Use the "Add Store" form above to add your first Chinese grocery store!</p>
          </div>
          
          <div v-else class="stores-grid">
            <div 
              v-for="store in userStores" 
              :key="store.storeId" 
              class="store-card"
            >
              <div class="store-image">
                <img 
                  v-if="store.image" 
                  :src="store.image" 
                  :alt="store.name"
                  @error="(e: any) => { if (e.target) e.target.src = 'https://via.placeholder.com/400x300?text=No+Image' }"
                />
                <div v-else class="no-image">No Image</div>
              </div>
              <div class="store-info">
                <h4>{{ store.name }}</h4>
                <p class="store-address">{{ store.address }}</p>
                <p v-if="store.phone" class="store-phone">{{ store.phone }}</p>
                <p v-if="store.hours" class="store-hours">{{ store.hours }}</p>
                <div class="store-rating">
                  <span class="rating-stars">⭐ {{ store.rating.toFixed(1) }}</span>
                  <span class="review-count">({{ store.reviewCount }} reviews)</span>
                </div>
                <div class="store-specialties">
                  <span v-for="specialty in store.specialties" :key="specialty" class="specialty-tag">
                    {{ specialty }}
                  </span>
                  <span v-for="tag in store.tags" :key="tag" class="specialty-tag user-tag">
                    {{ tag }}
                  </span>
                </div>
                <p v-if="store.description" class="store-description">{{ store.description }}</p>
                <button 
                  class="view-store-btn" 
                  @click="goToStore(store.storeId)"
                >
                  View Details
                </button>
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
                  <h4 
                    class="store-name-link" 
                    @click="goToStore(review.storeId)"
                    :title="'Click to view store details'"
                  >
                    {{ getStoreName(review.storeId) }} →
                  </h4>
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

              <div class="review-actions">
                <button 
                  class="btn-delete" 
                  @click="requestDeleteReview(review.reviewId)"
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

    <!-- Delete Confirmation Dialog -->
    <div v-if="showDeleteConfirm" class="confirmation-overlay" @click.self="cancelDeleteReview">
      <div class="confirmation-dialog">
        <h3>Confirm Deletion</h3>
        <p>Are you sure you want to delete this review? This action cannot be undone.</p>
        <div class="confirmation-actions">
          <button class="btn-confirm" @click="confirmDeleteReview">Delete</button>
          <button class="btn-cancel" @click="cancelDeleteReview">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-account {
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  background: white;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.account-hero {
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

.account-hero h1 {
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

.account-content {
  padding: 4rem 4rem;
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.auth-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.auth-container {
  text-align: center;
  background: #f9fafb;
  padding: 3rem;
  border-radius: 16px;
  border: 2px solid #f59e0b;
  max-width: 600px;
  width: 100%;
}

.auth-container h2 {
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 2rem;
}

.auth-container p {
  color: #374151;
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.auth-options {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
}

.auth-form {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-top: 2rem;
  text-align: left;
  position: relative;
  z-index: 1;
}

.auth-form h3 {
  color: #dc2626;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  text-align: center;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-details h2 {
  color: #dc2626;
  margin-bottom: 0.5rem;
  font-size: 2rem;
}

.user-details p {
  color: #374151;
  margin: 0.25rem 0;
  font-size: 1.1rem;
}

.create-store-section, .user-stores-section {
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

.create-store-form {
  background: #f9fafb;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
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

.form-input, .form-textarea {
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

.store-name-link {
  color: #dc2626;
  cursor: pointer;
  transition: all 0.3s ease;
}

.store-name-link:hover {
  color: #b91c1c;
  text-decoration: underline;
  transform: translateX(4px);
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

/* Stores Grid (similar to ProductsView) */
.stores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  width: 100%;
  margin-top: 2rem;
}

.store-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #f3f4f6;
}

.store-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.store-image {
  height: 200px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.store-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.store-card:hover .store-image img {
  transform: scale(1.05);
}

.no-image {
  color: #9ca3af;
  font-size: 0.9rem;
}

.store-card .store-info {
  padding: 1.5rem;
}

.store-card .store-info h4 {
  color: #dc2626;
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
  font-weight: 600;
}

.store-card .store-address {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.store-card .store-phone {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.store-card .store-hours {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.store-card .store-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.store-card .rating-stars {
  color: #f59e0b;
  font-weight: 600;
}

.store-card .review-count {
  color: #6b7280;
  font-size: 0.9rem;
}

.store-card .store-specialties {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.store-card .specialty-tag {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #fecaca;
  display: inline-block;
}

.store-card .specialty-tag.user-tag {
  background: #dc2626;
  color: white;
  border: 1px solid #dc2626;
  position: relative;
}

.store-card .specialty-tag.user-tag::after {
  content: '★';
  margin-left: 0.25rem;
  font-size: 0.6rem;
}

.store-card .store-description {
  color: #374151;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.view-store-btn {
  width: 100%;
  padding: 0.75rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-store-btn:hover {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.no-stores {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 16px;
  margin-top: 2rem;
}

.no-stores p {
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.no-stores p:last-of-type {
  color: #9ca3af;
  font-size: 0.9rem;
}


.tags-input-container {
  width: 100%;
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  min-height: 2rem;
}

.tag-item {
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

.tag-remove {
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

.tag-remove:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.tag-input-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.tag-input-row .form-input {
  flex: 1;
  margin-bottom: 0;
}

.btn-add-tag {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-add-tag:hover:not(:disabled) {
  background: #d97706;
  transform: translateY(-1px);
}

.btn-add-tag:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
}

/* Confirmation Dialog */
.confirmation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirmation-dialog {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.confirmation-dialog h3 {
  margin: 0 0 1rem 0;
  color: #dc2626;
  font-size: 1.5rem;
}

.confirmation-dialog p {
  margin: 0 0 1.5rem 0;
  color: #374151;
  line-height: 1.6;
}

.confirmation-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-confirm {
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

.btn-confirm:hover {
  background: #b91c1c;
  transform: translateY(-2px);
}

.btn-cancel {
  background: #f3f4f6;
  color: #374151;
  border: 2px solid #e5e7eb;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel:hover {
  background: #e5e7eb;
  border-color: #d1d5db;
}

/* Desktop-focused design - minimal responsive adjustments */
@media (max-width: 1200px) {
  .account-hero {
    padding: 3rem 2rem;
  }
  
  .account-content {
    padding: 3rem 2rem;
  }
  
  .auth-options {
    flex-direction: column;
    align-items: center;
  }
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useStoreStore } from '@/stores/store'
import { useRatingStore } from '@/stores/rating'
import { useTaggingStore } from '@/stores/tagging'
import type { Store } from '@/types/api'
import { 
  geocodeAddress, 
  reverseGeocode, 
  calculateDistance, 
  formatDistance,
  type Coordinates,
  type GeocodeResult
} from '@/utils/geocoding'

interface StoreDisplay extends Store {
  id: string
  rating: number
  reviewCount: number
  coordinates?: Coordinates
  distance?: number // Distance from user in km
}

// Store instances
const storeStore = useStoreStore()
const ratingStore = useRatingStore()
const taggingStore = useTaggingStore()

// State
const stores = ref<StoreDisplay[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Location state
const userLocation = ref<string>('')
const userCoordinates = ref<Coordinates | null>(null)
const showLocationPrompt = ref(false)
const locationInput = ref('')
const locationMethod = ref<'browser' | 'manual' | null>(null)
const maxDistanceKm = ref<number>(50) // Show stores within 50km by default
const geocodingInProgress = ref(false)

// Get all unique tags from all stores (user-made tags)
const availableTags = computed(() => {
  const allTags = new Set<string>()
  
  // Collect all tags from all stores
  stores.value.forEach(store => {
    if (store.tags && Array.isArray(store.tags)) {
      store.tags.forEach(tag => {
        if (tag && tag.trim() !== '') {
          allTags.add(tag.trim())
        }
      })
    }
  })
  
  // Convert to sorted array for consistent display
  return Array.from(allTags).sort()
})

// Create filter options: "All Stores" + all unique tags
const filterOptions = computed(() => {
  const options = [{ id: 'all', name: 'All Stores' }]
  
  // Add each unique tag as a filter option
  availableTags.value.forEach(tag => {
    options.push({ id: tag, name: tag })
  })
  
  return options
})

const selectedTag = ref('all')
const searchQuery = ref('')

// Methods
const requestLocation = () => {
  showLocationPrompt.value = true
}

const useBrowserLocation = async () => {
  if (navigator.geolocation) {
    try {
      geocodingInProgress.value = true
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })
      
      const { latitude, longitude } = position.coords
      userCoordinates.value = { latitude, longitude }
      
      // Reverse geocode to get a friendly location name
      const geocodeResult = await reverseGeocode(userCoordinates.value)
      if (geocodeResult) {
        userLocation.value = geocodeResult.displayName
        // Save coordinates for distance calculation
        localStorage.setItem('userCoordinates', JSON.stringify(userCoordinates.value))
        localStorage.setItem('userLocation', userLocation.value)
      } else {
        // Fallback to coordinates if reverse geocoding fails
        userLocation.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        localStorage.setItem('userCoordinates', JSON.stringify(userCoordinates.value))
        localStorage.setItem('userLocation', userLocation.value)
      }
      
      showLocationPrompt.value = false
      await loadStores()
    } catch (err) {
      error.value = 'Unable to get your location. Please enter manually.'
      locationMethod.value = 'manual'
    } finally {
      geocodingInProgress.value = false
    }
  } else {
    error.value = 'Geolocation is not supported by your browser. Please enter manually.'
    locationMethod.value = 'manual'
  }
}

const setManualLocation = async () => {
  if (!locationInput.value.trim()) {
    error.value = 'Please enter a location'
    return
  }
  
  try {
    geocodingInProgress.value = true
    error.value = null
    
    // Geocode the address to get coordinates
    const geocodeResult = await geocodeAddress(locationInput.value.trim())
    
    if (geocodeResult) {
      userLocation.value = geocodeResult.displayName
      userCoordinates.value = geocodeResult.coordinates
      
      // Save for future use
      localStorage.setItem('userCoordinates', JSON.stringify(userCoordinates.value))
      localStorage.setItem('userLocation', userLocation.value)
      
      showLocationPrompt.value = false
      await loadStores()
    } else {
      error.value = 'Could not find that location. Please try a more specific address or city name.'
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to geocode location'
  } finally {
    geocodingInProgress.value = false
  }
}

const skipLocation = () => {
  showLocationPrompt.value = false
  loadStores() // Load all stores if location is skipped
}

const loadStores = async () => {
  try {
    loading.value = true
    error.value = null
    
    // Fetch all stores from API
    const allStores = await storeStore.listStores()
    
    // Fetch ratings and tags for each store in parallel
    const storesWithData = await Promise.all(
      allStores.map(async (store) => {
        // Fetch rating
        const rating = await ratingStore.getRating(store.storeId)
        
        // Fetch tags
        const tags = await taggingStore.listTagsForStore(store.storeId)
        
        // Get cached coordinates if available
        const cachedCoords = localStorage.getItem(`store_coords_${store.storeId}`)
        let coordinates: Coordinates | undefined
        if (cachedCoords) {
          try {
            coordinates = JSON.parse(cachedCoords)
          } catch (e) {
            // Invalid cache, will geocode fresh
          }
        }
        
        return {
          ...store,
          id: store.storeId,
          rating: rating?.aggregatedRating || 0,
          reviewCount: rating?.reviewCount || 0,
          tags: tags,
          coordinates: coordinates
        } as StoreDisplay
      })
    )
    
    // If user has coordinates, geocode stores and calculate distances
    if (userCoordinates.value) {
      // Geocode stores that don't have coordinates yet
      const storesToGeocode = storesWithData.filter(s => !s.coordinates)
      
      if (storesToGeocode.length > 0) {
        loading.value = true
        error.value = `Geocoding ${storesToGeocode.length} store addresses... This may take a moment.`
        
        // Geocode stores with rate limiting (1 per second)
        for (let i = 0; i < storesToGeocode.length; i++) {
          const store = storesToGeocode[i]
          if (!store) continue
          
          await new Promise(resolve => setTimeout(resolve, 1100)) // Rate limit
          
          const geocodeResult = await geocodeAddress(store.address)
          if (geocodeResult?.coordinates) {
            store.coordinates = geocodeResult.coordinates
            // Cache coordinates for future use
            localStorage.setItem(`store_coords_${store.storeId}`, JSON.stringify(geocodeResult.coordinates))
          }
        }
        
        error.value = null
      }
      
      // Calculate distances and filter by max distance
      storesWithData.forEach(store => {
        if (store.coordinates && userCoordinates.value) {
          store.distance = calculateDistance(userCoordinates.value, store.coordinates)
        }
      })
      
      // Filter stores within max distance and sort by distance
      const nearbyStores = storesWithData
        .filter(store => {
          // Only include stores that have coordinates and are within max distance
          return store.coordinates && store.distance !== undefined && store.distance <= maxDistanceKm.value
        })
        .sort((a, b) => {
          const distA = a.distance || Infinity
          const distB = b.distance || Infinity
          return distA - distB
        })
      
      stores.value = nearbyStores
    } else {
      // No location provided, show all stores
      stores.value = storesWithData
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to load stores'
    console.error('Error loading stores:', err)
  } finally {
    loading.value = false
  }
}

const filteredStores = computed(() => {
  let filtered = stores.value

  // Filter by selected tag (user-made tags only)
  if (selectedTag.value !== 'all') {
    filtered = filtered.filter(store => {
      // Check if store has the selected tag
      return store.tags && store.tags.includes(selectedTag.value)
    })
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(store => 
      store.name.toLowerCase().includes(query) || 
      store.address.toLowerCase().includes(query) ||
      (store.description || '').toLowerCase().includes(query) ||
      (store.specialties || []).some(specialty => specialty.toLowerCase().includes(query)) ||
      (store.tags || []).some(tag => tag.toLowerCase().includes(query))
    )
  }

  return filtered
})

// Watch for store count changes to update stores in real-time
// Use length to avoid triggering on every deep change
const lastStoreCount = ref(0)
watch(() => storeStore.stores.length, (newCount) => {
  if (newCount !== lastStoreCount.value && !loading.value) {
    lastStoreCount.value = newCount
    // Debounce to avoid excessive calls
    setTimeout(() => {
      loadStores()
    }, 300)
  }
})

// Watch for tag changes in the tagging store to update tags in real-time
watch(() => taggingStore.storeTags, async (newStoreTags) => {
  // Update tags for each store in the stores array
  stores.value.forEach(store => {
    const storeTags = newStoreTags[store.storeId]
    if (storeTags && Array.isArray(storeTags)) {
      // Update tags for this store
      store.tags = [...storeTags]
    } else {
      // If tags were removed or not found, refresh from backend
      // This ensures we have the latest tags after review creation
      if (store.storeId) {
        taggingStore.listTagsForStore(store.storeId).then(tags => {
          const storeToUpdate = stores.value.find(s => s.storeId === store.storeId)
          if (storeToUpdate) {
            storeToUpdate.tags = tags
          }
        }).catch(() => {
          // If fetch fails, set to empty array
          const storeToUpdate = stores.value.find(s => s.storeId === store.storeId)
          if (storeToUpdate) {
            storeToUpdate.tags = []
          }
        })
      } else {
        store.tags = []
      }
    }
  })
}, { deep: true })

// Lifecycle
onMounted(() => {
  // Initialize lastStoreCount
  lastStoreCount.value = storeStore.stores.length
  
  // Check if location is saved in localStorage
  const savedLocation = localStorage.getItem('userLocation')
  const savedCoordinates = localStorage.getItem('userCoordinates')
  
  if (savedLocation && savedCoordinates) {
    try {
      userLocation.value = savedLocation
      userCoordinates.value = JSON.parse(savedCoordinates)
      loadStores()
    } catch (e) {
      // Invalid saved data, prompt again
      requestLocation()
    }
  } else {
    requestLocation()
  }
})
</script>

<template>
  <div class="products page-container">
    <section class="products-hero">
      <h1>Chinese Grocery Stores</h1>
      <p class="subtitle">Find Local Chinese Grocery Stores</p>
      <div v-if="userLocation" class="location-badge">
        📍 Showing stores within {{ maxDistanceKm }}km of: {{ userLocation }}
        <button @click="requestLocation" class="change-location-btn">Change Location</button>
        <div class="distance-controls">
          <label>Max distance:</label>
          <select v-model="maxDistanceKm" @change="loadStores" class="distance-select">
            <option :value="5">5 km</option>
            <option :value="10">10 km</option>
            <option :value="25">25 km</option>
            <option :value="50">50 km</option>
            <option :value="100">100 km</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Location Prompt -->
    <div v-if="showLocationPrompt" class="location-prompt-overlay">
      <div class="location-prompt">
        <h2>Find Stores Near You</h2>
        <p>We can help you find Chinese grocery stores in your area.</p>
        
        <div class="location-options">
          <button 
            @click="useBrowserLocation" 
            class="location-btn"
            :disabled="geocodingInProgress"
          >
            {{ geocodingInProgress ? 'Getting location...' : '📍 Use My Current Location' }}
          </button>
          <div class="location-divider">or</div>
          <div class="manual-location">
            <input 
              v-model="locationInput" 
              type="text" 
              placeholder="Enter city or address (e.g., Boston, MA)"
              @keyup.enter="setManualLocation"
              class="location-input"
            />
            <button 
              @click="setManualLocation" 
              class="location-btn"
              :disabled="geocodingInProgress"
            >
              {{ geocodingInProgress ? 'Searching...' : 'Search' }}
            </button>
          </div>
        </div>
        
        <button @click="skipLocation" class="skip-location-btn">
          Skip - Show All Stores
        </button>
        
        <div v-if="error" class="error-message">{{ error }}</div>
      </div>
    </div>

    <section class="products-content">
      <div v-if="loading && stores.length === 0" class="loading">
        <p>Loading stores...</p>
      </div>

      <div v-else-if="error" class="error">
        <p>{{ error }}</p>
        <button @click="loadStores" class="retry-btn">Retry</button>
      </div>

      <div v-else>
        <div class="filters">
          <div class="search-box">
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search stores..." 
              class="search-input"
            />
          </div>
          
          <div class="category-filters">
            <button 
              v-for="option in filterOptions" 
              :key="option.id"
              @click="selectedTag = option.id"
              :class="['category-btn', { active: selectedTag === option.id }]"
            >
              {{ option.name }}
            </button>
          </div>
        </div>

        <div class="products-grid">
          <div v-for="store in filteredStores" :key="store.storeId" class="product-card">
            <div class="product-image">
              <img 
                v-if="store.image" 
                :src="store.image" 
                :alt="store.name"
                @error="(e: any) => { if (e.target) e.target.src = 'https://via.placeholder.com/400x300?text=No+Image' }"
              />
              <div v-else class="no-image">No Image</div>
            </div>
            <div class="product-info">
              <h3>{{ store.name }}</h3>
              <p class="store-address">{{ store.address }}</p>
              <p v-if="store.phone" class="store-phone">{{ store.phone }}</p>
              <p v-if="store.hours" class="store-hours">{{ store.hours }}</p>
              <div class="store-rating">
                <span class="rating-stars">⭐ {{ store.rating.toFixed(1) }}</span>
                <span class="review-count">({{ store.reviewCount }} reviews)</span>
                <span v-if="store.distance !== undefined" class="distance-badge">{{ formatDistance(store.distance) }} away</span>
              </div>
              <div class="store-specialties">
                <span v-for="specialty in store.specialties" :key="specialty" class="specialty-tag">
                  {{ specialty }}
                </span>
                <span v-for="tag in store.tags" :key="tag" class="specialty-tag user-tag">
                  {{ tag }}
                </span>
              </div>
              <p v-if="store.description" class="product-description">{{ store.description }}</p>
              <button class="add-to-cart-btn" @click="$router.push(`/store/${store.storeId}`)">View Details</button>
            </div>
          </div>
        </div>

        <div v-if="filteredStores.length === 0" class="no-products">
          <p>No stores found{{ userLocation ? ` near ${userLocation}` : '' }}</p>
          <p class="helpful-message">
            Be the first to add a Chinese grocery store in this area! 
            Add stores to help others discover great places to shop.
          </p>
          <p class="try-again">
            <button class="btn-add-store" @click="$router.push('/my-account')">
              📍 Add a Store
            </button>
            <button v-if="userLocation" @click="skipLocation" class="btn-search-all">
              Try searching all stores
            </button>
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.products {
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  background: white;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.products-hero {
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

.products-hero h1 {
  font-size: 3.5rem;
  color: #dc2626;
  margin-bottom: 1rem;
  font-weight: bold;
}

.subtitle {
  font-size: 1.5rem;
  color: #f59e0b;
  font-weight: 500;
  margin-bottom: 1rem;
}

.location-badge {
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: white;
  border-radius: 25px;
  display: inline-block;
  font-size: 0.9rem;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.change-location-btn {
  margin-left: 1rem;
  padding: 0.25rem 0.75rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.change-location-btn:hover {
  background: #b91c1c;
}

.location-prompt-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.location-prompt {
  background: white;
  padding: 3rem;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.location-prompt h2 {
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.location-prompt p {
  color: #6b7280;
  margin-bottom: 2rem;
}

.location-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.location-btn {
  padding: 1rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.location-btn:hover {
  background: #b91c1c;
  transform: translateY(-2px);
}

.location-divider {
  text-align: center;
  color: #9ca3af;
  font-weight: 500;
}

.manual-location {
  display: flex;
  gap: 0.5rem;
}

.location-input {
  flex: 1;
  padding: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
}

.location-input:focus {
  outline: none;
  border-color: #dc2626;
}

.skip-location-btn {
  width: 100%;
  padding: 0.75rem;
  background: transparent;
  color: #6b7280;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.skip-location-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.products-content {
  padding: 2rem 4rem;
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.loading, .error {
  text-align: center;
  padding: 4rem;
  color: #6b7280;
}

.error p {
  margin-bottom: 1rem;
  color: #dc2626;
  font-size: 1.1rem;
}

.retry-btn {
  padding: 0.75rem 1.5rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

.filters {
  background: #f9fafb;
  padding: 2rem;
  border-radius: 16px;
  margin-bottom: 3rem;
  width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.search-box {
  margin-bottom: 2rem;
  text-align: center;
}

.search-input {
  width: 100%;
  max-width: 500px;
  padding: 1rem 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  background: white;
}

.search-input:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.category-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  justify-content: space-evenly;
  padding: 0 2rem;
  width: 100%;
}

.category-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 25px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  font-weight: 500;
}

.category-btn:hover {
  border-color: #dc2626;
  color: #dc2626;
  transform: translateY(-2px);
}

.category-btn.active {
  background: #dc2626;
  color: white;
  border-color: #dc2626;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 3rem;
  width: 100%;
  padding: 0 2rem;
  justify-items: stretch;
}

.product-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgbaaskell(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 1px solid #f3f4f6;
}

.product-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.product-image {
  height: 200px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.no-image {
  color: #9ca3af;
  font-size: 0.9rem;
}

.product-info {
  padding: 1.5rem;
}

.product-info h3 {
  color: #dc2626;
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
  font-weight: 600;
}

.store-address {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.store-phone {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.store-hours {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.store-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.rating-stars {
  color: #f59e0b;
  font-weight: 600;
}

.review-count {
  color: #6b7280;
  font-size: 0.9rem;
}

.distance-badge {
  color: #dc2626;
  font-size: 0.85rem;
  font-weight: 600;
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #fef2f2;
  border-radius: 12px;
}

.distance-controls {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.distance-controls label {
  color: #6b7280;
}

.distance-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  cursor: pointer;
}

.distance-select:focus {
  outline: none;
  border-color: #dc2626;
}

.store-specialties {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.specialty-tag {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid #fecaca;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
  display: inline-block;
}

.user-tag {
  background: #dc2626;
  color: white;
  border: 1px solid #dc2626;
  position: relative;
}

.user-tag::after {
  content: '★';
  margin-left: 0.25rem;
  font-size: 0.6rem;
}

.product-description {
  color: #374151;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.add-to-cart-btn {
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

.add-to-cart-btn:hover {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.no-products {
  text-align: center;
  padding: 4rem;
  color: #6b7280;
  font-size: 1.2rem;
  background: #f9fafb;
  border-radius: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.helpful-message {
  margin: 1rem 0;
  color: #6b7280;
  font-size: 1rem;
  line-height: 1.5;
}

.try-again {
  margin-top: 1.5rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-add-store {
  padding: 0.75rem 1.5rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-add-store:hover {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.btn-search-all {
  padding: 0.75rem 1.5rem;
  background: white;
  color: #dc2626;
  border: 2px solid #dc2626;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-search-all:hover {
  background: #dc2626;
  color: white;
  transform: translateY(-2px);
}

/* Desktop-focused design - minimal responsive adjustments */
@media (max-width: 1200px) {
  .products-hero {
    padding: 3rem 2rem;
  }
  
  .products-content {
    padding: 2rem;
  }
}
</style>

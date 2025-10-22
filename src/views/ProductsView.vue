<script setup lang="ts">
import { ref, computed } from 'vue'

interface Store {
  id: number
  name: string
  address: string
  phone: string
  hours: string
  rating: number
  reviewCount: number
  specialties: string[]
  description: string
  image: string
}

const stores = ref<Store[]>([
  { 
    id: 1, 
    name: 'Kam Man Food', 
    address: '219 Quincy Ave, Quincy, MA 02169', 
    phone: '(617) 328-8888',
    hours: '9:00 AM - 9:00 PM',
    rating: 4.5,
    reviewCount: 127,
    specialties: ['Fresh Seafood', 'Live Fish', 'Asian Vegetables'],
    description: 'Large Asian supermarket with extensive selection of Chinese groceries, fresh seafood, and live fish tanks.',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
  },
  { 
    id: 2, 
    name: 'Super 88 Market', 
    address: '1095 Commonwealth Ave, Boston, MA 02215', 
    phone: '(617) 254-8888',
    hours: '8:00 AM - 10:00 PM',
    rating: 4.2,
    reviewCount: 89,
    specialties: ['Bakery', 'Hot Food', 'Frozen Foods'],
    description: 'Popular Asian grocery chain with fresh bakery, hot food counter, and wide variety of frozen Asian foods.',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop&crop=center'
  },
  { 
    id: 3, 
    name: 'C-Mart', 
    address: '692 Washington St, Boston, MA 02111', 
    phone: '(617) 426-8888',
    hours: '9:00 AM - 8:00 PM',
    rating: 4.3,
    reviewCount: 156,
    specialties: ['Chinese Medicine', 'Tea', 'Spices'],
    description: 'Traditional Chinese grocery store specializing in Chinese medicine, premium teas, and authentic spices.',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop&crop=center'
  },
  { 
    id: 4, 
    name: 'Great Wall Supermarket', 
    address: '1 Brighton Ave, Allston, MA 02134', 
    phone: '(617) 254-8888',
    hours: '8:30 AM - 9:30 PM',
    rating: 4.4,
    reviewCount: 203,
    specialties: ['Fresh Produce', 'Meat', 'Dairy'],
    description: 'Well-stocked supermarket with fresh produce, quality meat selection, and Asian dairy products.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop&crop=center'
  },
  { 
    id: 5, 
    name: 'H-Mart', 
    address: '581 Massachusetts Ave, Cambridge, MA 02139', 
    phone: '(617) 876-8888',
    hours: '8:00 AM - 10:00 PM',
    rating: 4.6,
    reviewCount: 312,
    specialties: ['Korean-Chinese', 'Prepared Foods', 'Household Items'],
    description: 'Korean-owned chain with excellent selection of Korean-Chinese products, prepared foods, and household essentials.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop&crop=center'
  },
  { 
    id: 6, 
    name: 'Ranch 99', 
    address: '99 Middlesex Turnpike, Burlington, MA 01803', 
    phone: '(781) 272-8888',
    hours: '9:00 AM - 9:00 PM',
    rating: 4.1,
    reviewCount: 98,
    specialties: ['Bulk Items', 'Snacks', 'Beverages'],
    description: 'Large format store with bulk items, extensive snack selection, and Asian beverages.',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop&crop=center'
  }
])

const categories = ref([
  { id: 'all', name: 'All Stores' },
  { id: 'fresh', name: 'Fresh Seafood' },
  { id: 'bakery', name: 'Bakery & Hot Food' },
  { id: 'traditional', name: 'Traditional Chinese' },
  { id: 'supermarket', name: 'Supermarket' },
  { id: 'specialty', name: 'Specialty Items' }
])

const selectedCategory = ref('all')
const searchQuery = ref('')

const filteredStores = computed(() => {
  let filtered = stores.value

  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(store => {
      const specialties = store.specialties.join(' ').toLowerCase()
      return specialties.includes(selectedCategory.value) || 
             store.description.toLowerCase().includes(selectedCategory.value)
    })
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(store => 
      store.name.toLowerCase().includes(query) || 
      store.address.toLowerCase().includes(query) ||
      store.description.toLowerCase().includes(query) ||
      store.specialties.some(specialty => specialty.toLowerCase().includes(query))
    )
  }

  return filtered
})
</script>

<template>
  <div class="products page-container">
    <section class="products-hero">
      <h1>Chinese Grocery Stores</h1>
      <p class="subtitle">Find Local Chinese Grocery Stores in Boston, MA</p>
    </section>

    <section class="products-content">
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
            v-for="category in categories" 
            :key="category.id"
            @click="selectedCategory = category.id"
            :class="['category-btn', { active: selectedCategory === category.id }]"
          >
            {{ category.name }}
          </button>
        </div>
      </div>

      <div class="products-grid">
        <div v-for="store in filteredStores" :key="store.id" class="product-card">
          <div class="product-image">
            <img :src="store.image" :alt="store.name" />
          </div>
          <div class="product-info">
            <h3>{{ store.name }}</h3>
            <p class="store-address">{{ store.address }}</p>
            <p class="store-phone">{{ store.phone }}</p>
            <p class="store-hours">{{ store.hours }}</p>
            <div class="store-rating">
              <span class="rating-stars">⭐ {{ store.rating }}</span>
              <span class="review-count">({{ store.reviewCount }} reviews)</span>
            </div>
            <div class="store-specialties">
              <span v-for="specialty in store.specialties" :key="specialty" class="specialty-tag">
                {{ specialty }}
              </span>
            </div>
            <p class="product-description">{{ store.description }}</p>
            <button class="add-to-cart-btn">View Details</button>
          </div>
        </div>
      </div>

      <div v-if="filteredStores.length === 0" class="no-products">
        <p>No stores found</p>
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
}

.products-content {
  padding: 2rem 4rem;
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
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
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
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
}

.product-description {
  color: #374151;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.product-price {
  color: #f59e0b;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
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


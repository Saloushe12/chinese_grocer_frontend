<script setup lang="ts">
import { ref } from 'vue'

const featuredStores = ref([
  { 
    id: 1, 
    name: 'Kam Man Food', 
    address: '219 Quincy Ave, Quincy, MA 02169', 
    rating: 4.5,
    reviewCount: 127,
    specialties: ['Fresh Seafood', 'Live Fish', 'Asian Vegetables'],
    description: 'Large Asian supermarket with extensive selection of Chinese groceries, fresh seafood, and live fish tanks.',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop&crop=center'
  },
  { 
    id: 2, 
    name: 'Super 88 Market', 
    address: '1095 Commonwealth Ave, Boston, MA 02215', 
    rating: 4.2,
    reviewCount: 89,
    specialties: ['Bakery', 'Hot Food', 'Frozen Foods'],
    description: 'Popular Asian grocery chain with fresh bakery, hot food counter, and wide variety of frozen Asian foods.',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=200&fit=crop&crop=center'
  },
  { 
    id: 3, 
    name: 'C-Mart', 
    address: '692 Washington St, Boston, MA 02111', 
    rating: 4.3,
    reviewCount: 156,
    specialties: ['Chinese Medicine', 'Tea', 'Spices'],
    description: 'Traditional Chinese grocery store specializing in Chinese medicine, premium teas, and authentic spices.',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop&crop=center'
  },
  { 
    id: 4, 
    name: 'Great Wall Supermarket', 
    address: '1 Brighton Ave, Allston, MA 02134', 
    rating: 4.4,
    reviewCount: 203,
    specialties: ['Fresh Produce', 'Meat', 'Dairy'],
    description: 'Well-stocked supermarket with fresh produce, quality meat selection, and Asian dairy products.',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&h=200&fit=crop&crop=center'
  },
  { 
    id: 5, 
    name: 'H-Mart', 
    address: '581 Massachusetts Ave, Cambridge, MA 02139', 
    rating: 4.6,
    reviewCount: 312,
    specialties: ['Korean-Chinese', 'Prepared Foods', 'Household Items'],
    description: 'Korean-owned chain with excellent selection of Korean-Chinese products, prepared foods, and household essentials.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300&h=200&fit=crop&crop=center'
  },
  { 
    id: 6, 
    name: 'Ranch 99', 
    address: '99 Middlesex Turnpike, Burlington, MA 01803', 
    rating: 4.1,
    reviewCount: 98,
    specialties: ['Bulk Items', 'Snacks', 'Beverages'],
    description: 'Large format store with bulk items, extensive snack selection, and Asian beverages.',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop&crop=center'
  }
])
</script>

<template>
  <div class="home page-container">
    <!-- Hero Section -->
        <section class="hero">
          <div class="hero-content">
            <h1 class="hero-title">Find Chinese Grocery Stores Near You</h1>
            <p class="hero-subtitle">Your Local Chinese Grocery Store Directory</p>
            <p class="hero-description">
              Discover authentic Chinese grocery stores in your area with our comprehensive platform. 
              Find the best local stores, read customer reviews, and get detailed information about 
              each location. From fresh vegetables to specialty sauces, find everything you need 
              for authentic Chinese cooking.
            </p>
            <div class="hero-buttons">
              <button class="btn-primary" @click="$router.push('/products')">Browse Stores</button>
              <button class="btn-secondary" @click="$router.push('/login')">Login / Register</button>
            </div>
          </div>
          <div class="hero-image">
            <div class="hero-placeholder">
              <span>Local Chinese Grocery Stores</span>
            </div>
          </div>
        </section>

    <!-- Featured Stores Section -->
    <section class="featured-stores">
      <div class="section-header">
        <h2>Featured Chinese Grocery Stores</h2>
        <p>Discover the best local Chinese grocery stores in Boston, MA</p>
      </div>
      <div class="stores-grid">
        <div v-for="store in featuredStores" :key="store.id" class="store-card">
          <div class="store-image">
            <img :src="store.image" :alt="store.name" />
          </div>
          <div class="store-info">
            <h3>{{ store.name }}</h3>
            <p class="store-address">{{ store.address }}</p>
            <div class="store-rating">
              <span class="rating-stars">⭐ {{ store.rating }}</span>
              <span class="review-count">({{ store.reviewCount }} reviews)</span>
            </div>
            <div class="store-specialties">
              <span v-for="specialty in store.specialties" :key="specialty" class="specialty-tag">
                {{ specialty }}
              </span>
            </div>
            <p class="store-description">{{ store.description }}</p>
            <button class="view-store-btn">View Store Details</button>
          </div>
        </div>
      </div>
    </section>

        <!-- Features Section -->
        <section class="features-section">
          <div class="section-header">
            <h2>Why Choose Our Platform</h2>
            <p>Discover the best Chinese grocery stores in your area</p>
          </div>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">🗺️</div>
              <h3>Find Local Stores</h3>
              <p>Discover Chinese grocery stores near you with our comprehensive directory and map integration.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">⭐</div>
              <h3>Read Reviews</h3>
              <p>Get authentic reviews and ratings from customers who shop at these local Chinese grocery stores.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">🏪</div>
              <h3>Store Information</h3>
              <p>Access detailed information about each store including hours, specialties, and contact details.</p>
            </div>
          </div>
        </section>
  </div>
</template>

<style scoped>
.home {
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  background: white;
  margin: 0;
  padding: 0;
}

/* Hero Section */
.hero {
  display: flex;
  align-items: center;
  min-height: 70vh;
  padding: 4rem 4rem;
  background: linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%);
  border-bottom: 3px solid #dc2626;
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.hero-content {
  flex: 1;
  margin-right: 6rem;
  max-width: 45%;
  padding-left: 2rem;
}

.hero-title {
  font-size: 3.5rem;
  color: #dc2626;
  margin-bottom: 1rem;
  font-weight: bold;
  line-height: 1.2;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: #f59e0b;
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.hero-description {
  font-size: 1.1rem;
  color: #374151;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
}

.btn-primary, .btn-secondary {
  padding: 1rem 2rem;
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

.btn-primary:hover {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
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

.hero-image {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  max-width: 45%;
  padding-right: 2rem;
}

.hero-placeholder {
  width: 500px;
  height: 400px;
  background: linear-gradient(135deg, #dc2626 0%, #f59e0b 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.8rem;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 8px 32px rgba(220, 38, 38, 0.2);
}

/* Featured Products Section */
.featured-stores {
  padding: 4rem 4rem;
  background: white;
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.section-header {
  text-align: center;
  margin-bottom: 4rem;
  padding: 0 2rem;
}

.section-header h2 {
  font-size: 2.5rem;
  color: #dc2626;
  margin-bottom: 0.5rem;
  font-weight: bold;
}

.section-header p {
  font-size: 1.2rem;
  color: #6b7280;
}

.stores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 3rem;
  width: 100%;
  padding: 0 2rem;
  justify-items: stretch;
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

.store-info {
  padding: 1.5rem;
}

.store-info h3 {
  color: #dc2626;
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
  font-weight: 600;
}

.store-address {
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  font-weight: 500;
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

.store-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.6;
  font-size: 0.9rem;
}

.view-store-btn {
  width: 100%;
  padding: 0.75rem;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.view-store-btn:hover {
  background: #b91c1c;
  transform: translateY(-2px);
}

/* Features Section */
.features-section {
  padding: 4rem 4rem;
  background: #f9fafb;
  border-top: 3px solid #f59e0b;
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 4rem;
  width: 100%;
  padding: 0 2rem;
  justify-items: stretch;
}

.feature-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.feature-icon {
  font-size: 3.5rem;
  margin-bottom: 1.5rem;
}

.feature-card h3 {
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.feature-card p {
  color: #374151;
  line-height: 1.6;
  font-size: 1rem;
}

/* Desktop-focused design - minimal responsive adjustments */
@media (max-width: 1400px) {
  .hero {
    padding: 3rem 2rem;
  }
  
  .hero-placeholder {
    width: 400px;
    height: 300px;
  }
}

@media (max-width: 1200px) {
  .hero {
    flex-direction: column;
    text-align: center;
    padding: 3rem 2rem;
  }
  
  .hero-content {
    margin-right: 0;
    margin-bottom: 2rem;
  }
  
  .hero-title {
    font-size: 3rem;
  }
  
  .hero-placeholder {
    width: 350px;
    height: 250px;
  }
}
</style>

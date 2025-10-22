<script setup lang="ts">
// About page component
</script>

<template>
  <div class="about page-container">
    <section class="about-hero">
      <h1>About Chinese Grocery Finder</h1>
      <p class="subtitle">Your Local Chinese Grocery Store Directory</p>
    </section>

    <section class="about-content">
      <div class="content-grid">
        <div class="content-card">
          <div class="card-icon">🗺️</div>
          <h2>Our Platform</h2>
          <p>Chinese Grocery Finder is a comprehensive directory that helps you discover authentic Chinese grocery stores in your local area. We connect customers with the best local stores, providing detailed information, reviews, and easy navigation to find exactly what you need.</p>
        </div>

        <div class="content-card">
          <div class="card-icon">🎯</div>
          <h2>Our Mission</h2>
          <p>We are committed to making it easy for everyone to find authentic Chinese grocery stores in their community. Our platform helps preserve Chinese culinary culture by connecting people with local stores that offer the freshest ingredients and traditional products.</p>
        </div>

        <div class="content-card">
          <div class="card-icon">⭐</div>
          <h2>Our Promise</h2>
          <p>We promise to provide accurate, up-to-date information about local Chinese grocery stores, authentic customer reviews, and easy-to-use search tools so you can find the perfect store for your needs, whether you're looking for fresh vegetables, specialty sauces, or traditional ingredients.</p>
        </div>
      </div>

      <div class="team-section">
        <h2>How It Works</h2>
        <p>Our platform aggregates information from local Chinese grocery stores, providing you with a comprehensive directory. Users can search by location, read authentic reviews, and find stores that specialize in specific products. We work directly with store owners to ensure accurate information and help customers discover the best local options for authentic Chinese ingredients.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.about {
  width: 100%;
  max-width: 100%;
  min-height: 100vh;
  background: white;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.about-hero {
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

.about-hero h1 {
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

.about-content {
  padding: 4rem 4rem;
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 4rem;
  margin-bottom: 4rem;
  width: 100%;
  padding: 0 2rem;
  justify-items: stretch;
}

.content-card {
  background: white;
  padding: 2.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  text-align: center;
  border: 1px solid #f3f4f6;
}

.content-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.content-card h2 {
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.content-card p {
  color: #374151;
  line-height: 1.6;
  font-size: 1rem;
}

.team-section {
  background: #f9fafb;
  padding: 3rem 4rem;
  border-radius: 16px;
  text-align: center;
  width: 100%;
  border: 2px solid #f59e0b;
  margin: 0 2rem;
  max-width: 100%;
}

.team-section h2 {
  color: #dc2626;
  margin-bottom: 1.5rem;
  font-size: 2rem;
  font-weight: bold;
}

.team-section p {
  color: #374151;
  line-height: 1.6;
  font-size: 1.1rem;
}

/* Desktop-focused design - minimal responsive adjustments */
@media (max-width: 1200px) {
  .about-hero {
    padding: 3rem 2rem;
  }
  
  .about-content {
    padding: 3rem 2rem;
  }
}
</style>

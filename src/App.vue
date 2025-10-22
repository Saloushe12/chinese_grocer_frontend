<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="app">
    <header class="header">
      <div class="header-container">
            <div class="logo-section">
              <h1 class="store-name">Chinese Grocery Finder</h1>
              <p class="store-subtitle">Find Local Chinese Grocery Stores</p>
            </div>

        <nav class="navigation">
          <RouterLink to="/" class="nav-link">Home</RouterLink>
          <RouterLink to="/products" class="nav-link">Stores</RouterLink>
          <RouterLink to="/dashboard" class="nav-link">My Reviews</RouterLink>
          <RouterLink to="/login" class="nav-link">Login</RouterLink>
          <RouterLink to="/about" class="nav-link">About</RouterLink>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  max-width: 100%;
  overflow-x: hidden; /* prevent horizontal scroll */
}

* {
  box-sizing: border-box; /* ensures padding doesn't cause overflow */
}

body {
  background: white;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: white;
  width: 100vw;
  max-width: 100vw;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

.header {
  background: white;
  border-bottom: 3px solid #dc2626;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.logo-section {
  text-align: left;
}

.store-name {
  font-size: 2.5rem;
  font-weight: bold;
  margin: 0;
  color: #dc2626;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
}

.store-subtitle {
  font-size: 1rem;
  margin: 0;
  color: #f59e0b;
  font-weight: 500;
}

.navigation {
  display: flex;
  gap: 2rem;
}

.nav-link {
  color: #374151;
  text-decoration: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link:hover {
  background-color: #fef2f2;
  color: #dc2626;
  transform: translateY(-2px);
}

.nav-link.router-link-exact-active {
  background-color: #dc2626;
  color: white;
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.main-content {
  flex: 1;
  width: 100vw;
  max-width: 100vw;
  background: white;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* Global styles for full-screen pages */
:global(.page-container) {
  min-height: calc(100vh - 100px);
  width: 100vw;
  max-width: 100vw;
  padding: 0;
  margin: 0;
  box-sizing: border-box;
}

:global(.full-width) {
  width: 100vw;
  max-width: 100vw;
  box-sizing: border-box;
}

/* Desktop-focused design - minimal mobile adjustments */
@media (max-width: 1200px) {
  .header-container {
    padding: 1rem 2rem;
  }
  
  .store-name {
    font-size: 2.2rem;
  }
}
</style>

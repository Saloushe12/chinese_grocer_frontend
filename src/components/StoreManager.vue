<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStoreStore } from '@/stores/store'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'

const router = useRouter()

// Store instances
const storeStore = useStoreStore()
const userStore = useUserStore()
const notificationStore = useNotificationStore()

// Computed properties
const currentUserId = computed(() => userStore.userId)

// Form data
const newStore = ref({
  name: '',
  address: ''
})

const newUser = ref({
  username: '',
  email: '',
  password: ''
})

const loginData = ref({
  usernameOrEmail: '',
  password: ''
})

// Methods
const createStore = async () => {
  if (newStore.value.name && newStore.value.address) {
    const storeId = await storeStore.createStore(newStore.value, currentUserId.value)
    if (storeId) {
      notificationStore.success('Store created successfully!')
      newStore.value = { name: '', address: '' }
    }
  }
}

const registerUser = async () => {
  if (newUser.value.username && newUser.value.email && newUser.value.password) {
    const success = await userStore.register(
      newUser.value.username,
      newUser.value.email,
      newUser.value.password
    )
    if (success) {
      notificationStore.success('User registered and logged in successfully!')
      newUser.value = { username: '', email: '', password: '' }
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
      notificationStore.success('Login successful! Redirecting to your dashboard...')
      loginData.value = { usernameOrEmail: '', password: '' }
      router.push('/my-account')
    }
  }
}

const logout = () => {
  userStore.logout()
  notificationStore.success('Logged out successfully!')
}

onMounted(async () => {
  // Check if user is already authenticated
  await userStore.checkAuthStatus()
})
</script>

<template>
  <div class="store-manager">
    <h2>User Login & Registration</h2>
    
    <!-- User Authentication Section -->
    <div class="section">
      <h3>User Authentication</h3>
      
      <div v-if="!userStore.isAuthenticated" class="auth-forms">
        <!-- Registration Form -->
        <div class="form-group">
          <h4>Register New User</h4>
          <input v-model="newUser.username" placeholder="Username" />
          <input v-model="newUser.email" type="email" placeholder="Email" />
          <input v-model="newUser.password" type="password" placeholder="Password" />
          <button @click="registerUser" :disabled="userStore.loading">Register</button>
        </div>
        
        <!-- Login Form -->
        <div class="form-group">
          <h4>Login</h4>
          <input v-model="loginData.usernameOrEmail" placeholder="Username or Email" />
          <input v-model="loginData.password" type="password" placeholder="Password" />
          <button @click="loginUser" :disabled="userStore.loading">Login</button>
        </div>
      </div>
      
      <div v-else class="user-info">
        <p>Welcome, {{ userStore.username }}! ({{ userStore.email }})</p>
        <button @click="logout">Logout</button>
      </div>
    </div>

    <!-- Store Management Section - Only visible after login -->
    <div v-if="userStore.isAuthenticated" class="section">
      <h3>Store Management</h3>
      <p class="success-message">✅ You are now logged in! Store management features are available in your dashboard.</p>
      <div class="dashboard-redirect">
        <button class="btn-primary" @click="$router.push('/my-account')">Go to My Account</button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="userStore.error" class="error">
      User Error: {{ userStore.error }}
    </div>
    <div v-if="storeStore.error" class="error">
      Store Error: {{ storeStore.error }}
    </div>
  </div>
</template>

<style scoped>
.store-manager {
  width: 100vw;
  max-width: 100vw;
  min-height: 100vh;
  background: white;
  padding: 2rem 4rem;
  margin: 0;
  box-sizing: border-box;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
}

.store-manager h2 {
  text-align: center;
  font-size: 2.5rem;
  color: #dc2626;
  margin-bottom: 2rem;
  font-weight: bold;
}

.section {
  margin-bottom: 3rem;
  padding: 2rem 3rem;
  border: 2px solid #f3f4f6;
  border-radius: 16px;
  background: #f9fafb;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  width: 100%;
}

.section h3 {
  color: #dc2626;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  border-bottom: 2px solid #f59e0b;
  padding-bottom: 0.5rem;
}

.form-group {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  width: 100%;
  position: relative;
  z-index: 2;
}

.form-group h4 {
  color: #f59e0b;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  font-weight: 600;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  position: relative;
  z-index: 2;
  background: white;
}

.form-group input:focus {
  outline: none;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
}

.form-group button {
  background: #dc2626;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  width: 100%;
}

.form-group button:hover {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
}

.form-group button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.auth-forms {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  margin-bottom: 3rem;
  padding: 0 2rem;
  width: 100%;
  justify-items: stretch;
}

.user-info {
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.user-info p {
  color: #374151;
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.user-info button {
  background: #6b7280;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.user-info button:hover {
  background: #4b5563;
  transform: translateY(-1px);
}

.stores-list {
  margin-top: 1.5rem;
}

.stores-list h4 {
  color: #dc2626;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.store-item {
  padding: 1rem;
  margin-bottom: 1rem;
  background: white;
  border-radius: 8px;
  border-left: 4px solid #dc2626;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.store-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.store-item strong {
  color: #dc2626;
  font-size: 1.1rem;
}

.store-item small {
  color: #6b7280;
  font-size: 0.9rem;
}

.error {
  color: #dc2626;
  background: #fef2f2;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  border: 1px solid #fecaca;
  font-weight: 500;
}

.login-required {
  background: #fffbeb;
  color: #92400e;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #f59e0b;
  margin-bottom: 1rem;
}

.login-required p {
  margin: 0.5rem 0;
}

.success-message {
  background: #f0fdf4;
  color: #166534;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.dashboard-redirect {
  text-align: center;
  margin-top: 1rem;
}

.btn-primary {
  background: #dc2626;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  background: #b91c1c;
  transform: translateY(-2px);
}

/* Desktop-focused design - minimal responsive adjustments */
@media (max-width: 1200px) {
  .store-manager {
    padding: 2rem;
  }
}
</style>
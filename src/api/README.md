# API Integration Guide

This directory contains the API integration for the Chinese Grocery Store frontend, connecting to your backend server running on `http://localhost:8000`.

## Files Structure

```
src/
├── api/
│   ├── client.ts          # Axios API client with all endpoints
│   └── README.md          # This file
├── stores/
│   ├── store.ts           # Store management store
│   ├── user.ts            # User authentication store
│   ├── review.ts          # Review management store
│   ├── rating.ts          # Rating management store
│   └── tagging.ts         # Tagging management store
├── types/
│   └── api.ts             # TypeScript interfaces for API
└── utils/
    └── apiTest.ts         # API testing utilities
```

## Usage Examples

### 1. Using Stores in Components

```vue
<script setup lang="ts">
import { useStoreStore } from '@/stores/store'
import { useUserStore } from '@/stores/user'

const storeStore = useStoreStore()
const userStore = useUserStore()

// Create a store
const createStore = async () => {
  const storeId = await storeStore.createStore({
    name: 'My Store',
    address: '123 Main St'
  })
  console.log('Created store:', storeId)
}

// Register a user
const registerUser = async () => {
  const success = await userStore.register('username', 'email@example.com', 'password')
  if (success) {
    console.log('User registered and logged in!')
  }
}
</script>
```

### 2. Direct API Client Usage

```typescript
import apiClient from '@/api/client'

// Create a store
const response = await apiClient.createStore({
  name: 'Test Store',
  address: 'Test Address'
})

// Get store details
const storeData = await apiClient.getStoreById(response.storeId)
```

### 3. Testing API Connection

```typescript
import ApiTester from '@/utils/apiTest'

// Test basic connection
const isConnected = await ApiTester.testConnection()

// Test all endpoints
await ApiTester.testAllEndpoints()
```

## Available Endpoints

### Store Management
- `createStore(data)` - Create a new store
- `deleteStore(storeId)` - Delete a store
- `getStoreById(storeId)` - Get full store details
- `getStoresByName(name)` - Find stores by name
- `getStoresByAddress(address)` - Find stores by address

### User Management
- `registerUser(data)` - Register new user
- `authenticateUser(data)` - Login user
- `getUserById(userId)` - Get user profile
- `updateUserEmail(data)` - Update user email
- `deleteUser(userId)` - Delete user account

### Review Management
- `createReview(data)` - Create a review
- `deleteReview(reviewId)` - Delete a review
- `getReviewsForStore(storeId)` - Get reviews for a store
- `getReviewsByUser(userId)` - Get reviews by a user

### Rating Management
- `updateRating(data)` - Update store rating
- `getRating(storeId)` - Get store rating

### Tagging Management
- `addTag(data)` - Add tag to store
- `removeTag(data)` - Remove tag from store
- `getStoresByTag(tag)` - Get stores by tag

## Error Handling

All API calls include proper error handling:

```typescript
try {
  const result = await storeStore.createStore(data)
  if (result) {
    // Success
  }
} catch (error) {
  // Error is automatically handled by the store
  console.log('Error:', storeStore.error)
}
```

## Authentication

The API client automatically handles authentication tokens:

- Tokens are stored in localStorage
- Automatically added to request headers
- Automatic logout on 401 errors

## State Management

Each store provides:

- **State**: Reactive data (loading, error, data)
- **Getters**: Computed properties
- **Actions**: Methods to interact with API

Example:
```typescript
const storeStore = useStoreStore()

// State
console.log(storeStore.loading)  // boolean
console.log(storeStore.error)    // string | null
console.log(storeStore.stores)   // Store[]

// Getters
console.log(storeStore.storeCount)  // number
console.log(storeStore.hasStores)   // boolean

// Actions
await storeStore.createStore(data)
await storeStore.getStoreById(id)
```

## Backend Server

Make sure your backend server is running on `http://localhost:8000` with the following endpoints available:

- `/api/Store/*` - Store management
- `/api/User/*` - User management  
- `/api/Review/*` - Review management
- `/api/Rating/*` - Rating management
- `/api/Tagging/*` - Tagging management

## Testing

Visit `/manage` in your application to access the StoreManager component, which provides a UI for testing all API functionality.

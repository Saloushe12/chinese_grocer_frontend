import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { STORAGE_KEYS } from '@/utils/storageKeys'
import type {
  CreateStoreRequest,
  CreateStoreResponse,
  GetStoresByNameRequest,
  GetStoresByAddressRequest,
  Store,
  RegisterUserRequest,
  AuthenticateUserRequest,
  UserResponse,
  User,
  UpdateUserEmailRequest,
  CreateReviewRequest,
  CreateReviewResponse,
  GetReviewsForStoreRequest,
  GetReviewsByUserRequest,
  Review,
  UpdateRatingRequest,
  GetRatingRequest,
  Rating,
  AddTagRequest,
  RemoveTagRequest,
  GetStoresByTagRequest,
  GetTagsForStoreRequest
} from '@/types/api'

// Use environment variable for deployed backend, default to '/api' for local dev (Vite proxy)
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

// Log API base URL for debugging (in both dev and production to help diagnose issues)
console.log('🔧 API Base URL:', API_BASE)
console.log('🔧 VITE_API_BASE_URL env var:', import.meta.env.VITE_API_BASE_URL || '(not set, using default /api)')

class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string = '') {
    console.log('🔧 Creating ApiClient with baseURL:', baseURL)
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available and valid (not dummy-token)
        const token = localStorage.getItem(STORAGE_KEYS.authToken)
        if (token && token !== 'dummy-token') {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    // Use events instead of direct store import to avoid circular dependencies
    // and ensure Pinia is initialized before we try to use it
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      (error) => {
        // Handle common errors
        const status = error.response?.status
        if (status === 401 || status === 403) {
          // Only force-logout for endpoints that truly require auth
          // Public endpoints (like listing stores) shouldn't trigger logout
          const url: string = error?.config?.url || ''
          const mustBeAuthed = 
            url.includes('/User/authenticateUser') ||
            url.includes('/User/_getUserDetails') ||
            url.includes('/User/updateUserEmail') ||
            url.includes('/User/deleteUser') ||
            url.includes('/Store/createStore') ||
            url.includes('/Review/createReview') ||
            url.includes('/Review/deleteReview')
          
          if (mustBeAuthed) {
            // Dispatch event instead of directly calling store
            // This avoids circular imports and ensures Pinia is ready
            console.warn('🔴 401/403 on protected endpoint - triggering logout', { url, status, mustBeAuthed })
            window.dispatchEvent(new CustomEvent('auth:force-logout', { 
              detail: { url, status } 
            }))
          } else {
            console.log('ℹ️ 401/403 on public endpoint - NOT logging out', { url, status })
          }
          // For public endpoints, just let the error propagate
          // Don't auto-logout on incidental 401s from public endpoints
        }
        return Promise.reject(error)
      }
    )
  }

  // Helper method for Sync-backed routes that must go through Requesting.request
  private async requestViaRequesting<T>(
    path: string,
    payload: Record<string, unknown>
  ): Promise<T> {
    const response = await this.client.post('/Requesting/request', { path, ...payload })
    return response.data as T
  }

  // Store API Methods
  async createStore(data: CreateStoreRequest): Promise<CreateStoreResponse> {
    return await this.requestViaRequesting<CreateStoreResponse>(
      '/Store/createStore',
      data as unknown as Record<string, unknown>
    )
  }

  async deleteStore(storeId: string): Promise<{ status: string; storeId: string }> {
    return await this.requestViaRequesting<{ status: string; storeId: string }>(
      '/Store/deleteStore',
      { storeId }
    )
  }

  async listStores(): Promise<Store[]> {
    const response = await this.client.post('/Store/_listAllStores', {})
    // Backend returns array directly
    return Array.isArray(response.data) ? response.data : []
  }

  async getStoreById(storeId: string): Promise<Store | null> {
    const response = await this.client.post('/Store/_getStoreDetails', { storeId })
    // Backend returns array - get first item or null
    const stores = Array.isArray(response.data) ? response.data : []
    return stores.length > 0 ? stores[0] : null
  }

  async getStoresByName(data: GetStoresByNameRequest): Promise<Store[]> {
    const response = await this.client.post('/Store/_getStoresByName', data)
    // Backend returns array of store objects
    return Array.isArray(response.data) ? response.data : []
  }

  async getStoresByAddress(data: GetStoresByAddressRequest): Promise<Store[]> {
    const response = await this.client.post('/Store/_getStoresByAddress', data)
    // Backend returns array of store objects
    return Array.isArray(response.data) ? response.data : []
  }

  // User API Methods
  async registerUser(data: RegisterUserRequest): Promise<UserResponse> {
    const resp = await this.requestViaRequesting<UserResponse>(
      '/User/registerUser',
      data as unknown as Record<string, unknown>
    )
    if ((resp as any)?.error) throw new Error((resp as any).error)
    if (!resp?.userId) throw new Error('Invalid response: userId is missing')
    return resp
  }

  async authenticateUser(data: AuthenticateUserRequest): Promise<UserResponse> {
    const resp = await this.requestViaRequesting<UserResponse>(
      '/User/authenticateUser',
      data as unknown as Record<string, unknown>
    )
    if ((resp as any)?.error) throw new Error((resp as any).error)
    if (!resp?.userId) throw new Error('Invalid response: userId is missing')
    return resp
  }

  async getUserById(userId: string): Promise<User | null> {
    const response = await this.client.post('/User/_getUserDetails', { userId })
    // Backend returns array - get first item or null
    const users = Array.isArray(response.data) ? response.data : []
    if (users.length === 0) return null
    return {
      userId,
      username: users[0].username,
      email: users[0].email,
      creationDate: users[0].creationDate
    }
  }

  async updateUserEmail(data: UpdateUserEmailRequest): Promise<void> {
    await this.requestViaRequesting<{}>(
      '/User/updateUserEmail',
      data as unknown as Record<string, unknown>
    )
  }

  async deleteUser(userId: string): Promise<{ status: string; userId: string }> {
    return await this.requestViaRequesting<{ status: string; userId: string }>(
      '/User/deleteUser',
      { userId }
    )
  }

  // Review API Methods
  async createReview(data: CreateReviewRequest): Promise<CreateReviewResponse> {
    // Sync responds with { reviewId } or { error }
    const resp = await this.requestViaRequesting<CreateReviewResponse>(
      '/Review/createReview',
      data as unknown as Record<string, unknown>
    )
    if ((resp as any)?.error) throw new Error((resp as any).error)
    if (!resp?.reviewId) throw new Error('Invalid response: reviewId is missing')
    return resp
  }

  async deleteReview(reviewId: string): Promise<{ status: string; reviewId: string }> {
    // Uses Sync-backed flow to (1) adjust Rating, then (2) delete Review, then respond
    return await this.requestViaRequesting<{ status: string; reviewId: string }>(
      '/Review/deleteReview',
      { reviewId }
    )
  }

  async getReviewsForStore(data: GetReviewsForStoreRequest): Promise<string[]> {
    // This endpoint is deprecated - use listReviewsForStore instead
    const reviews = await this.listReviewsForStore(data)
    return reviews.map(r => r.reviewId)
  }

  async listReviewsForStore(data: GetReviewsForStoreRequest): Promise<Review[]> {
    const response = await this.client.post('/Review/_getReviewsForStoreFull', data)
    // Backend returns array of review objects
    return Array.isArray(response.data) ? response.data : []
  }

  async getReviewsByUser(data: GetReviewsByUserRequest): Promise<string[]> {
    // This endpoint is deprecated - use listReviewsByUser instead
    const reviews = await this.listReviewsByUser(data)
    return reviews.map(r => r.reviewId)
  }

  async listReviewsByUser(data: GetReviewsByUserRequest): Promise<Review[]> {
    const response = await this.client.post('/Review/_getReviewsByUserFull', data)
    // Backend returns array of review objects
    return Array.isArray(response.data) ? response.data : []
  }

  // Rating API Methods
  async updateRating(data: UpdateRatingRequest): Promise<void> {
    await this.client.post('/Rating/updateRating', data)
  }

  async getRating(data: GetRatingRequest): Promise<Rating | null> {
    const response = await this.client.post('/Rating/_getRating', data)
    // Backend returns array - get first item or null
    const ratings = Array.isArray(response.data) ? response.data : []
    if (ratings.length === 0) {
      return { aggregatedRating: 0, reviewCount: 0 }
    }
    return {
      aggregatedRating: ratings[0].aggregatedRating,
      reviewCount: ratings[0].reviewCount
    }
  }

  // Tagging API Methods
  async addTag(data: AddTagRequest): Promise<void> {
    await this.requestViaRequesting<{}>('/Tagging/addTag', data as any)
  }

  async removeTag(data: RemoveTagRequest): Promise<void> {
    await this.requestViaRequesting<{}>('/Tagging/removeTag', data as any)
  }

  async getStoresByTag(data: GetStoresByTagRequest): Promise<Store[]> {
    // This route is implemented by a Sync (not a concept action), so call via Requesting
    const resp = await this.requestViaRequesting<{ results?: Store[]; error?: string }>(
      '/Tagging/getStoresByTag',
      data as unknown as Record<string, unknown>
    )
    if (resp.error) throw new Error(resp.error)
    return Array.isArray(resp.results) ? resp.results : []
  }

  async listTagsForStore(data: GetTagsForStoreRequest): Promise<string[]> {
    const response = await this.client.post('/Tagging/_getTagsForStore', data)
    // Backend returns array - get first item or empty array
    const taggings = Array.isArray(response.data) ? response.data : []
    if (taggings.length === 0) return []
    return taggings[0].tags || []
  }
}

// Create and export a singleton instance with the API base URL
export const apiClient = new ApiClient(API_BASE)
export default apiClient

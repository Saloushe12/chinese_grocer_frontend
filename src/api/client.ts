import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import type {
  CreateStoreRequest,
  CreateStoreResponse,
  GetStoreResponse,
  GetStoresByNameRequest,
  GetStoresByAddressRequest,
  StoreIdResponse,
  RegisterUserRequest,
  AuthenticateUserRequest,
  UserResponse,
  GetStoreResponse as UserProfileResponse,
  UpdateUserEmailRequest,
  CreateReviewRequest,
  CreateReviewResponse,
  GetReviewsForStoreRequest,
  GetReviewsByUserRequest,
  ReviewsResponse,
  UpdateRatingRequest,
  GetRatingRequest,
  Rating,
  AddTagRequest,
  RemoveTagRequest,
  GetStoresByTagRequest
} from '@/types/api'

class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string = '') {
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
        // Add auth token if available
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      (error) => {
        // Handle common errors
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('authToken')
          localStorage.removeItem('userId')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Store API Methods
  async createStore(data: CreateStoreRequest): Promise<CreateStoreResponse> {
    const response = await this.client.post('/api/Store/createStore', data)
    return response.data
  }

  async deleteStore(storeId: string): Promise<void> {
    await this.client.post('/api/Store/deleteStore', { storeId })
  }

  async getStore(storeId: string): Promise<GetStoreResponse[]> {
    const response = await this.client.post('/api/Store/_getStore', { storeId })
    return response.data
  }

  async getStoresByName(data: GetStoresByNameRequest): Promise<StoreIdResponse[]> {
    const response = await this.client.post('/api/Store/_getStoresByName', data)
    return response.data
  }

  async getStoresByAddress(data: GetStoresByAddressRequest): Promise<StoreIdResponse[]> {
    const response = await this.client.post('/api/Store/_getStoresByAddress', data)
    return response.data
  }

  // User API Methods
  async registerUser(data: RegisterUserRequest): Promise<UserResponse> {
    const response = await this.client.post('/api/User/registerUser', data)
    return response.data
  }

  async authenticateUser(data: AuthenticateUserRequest): Promise<UserResponse> {
    const response = await this.client.post('/api/User/authenticateUser', data)
    return response.data
  }

  async getUserById(userId: string): Promise<UserProfileResponse> {
    const response = await this.client.post('/api/User/getUserById', { userId })
    return response.data
  }

  async updateUserEmail(data: UpdateUserEmailRequest): Promise<void> {
    await this.client.post('/api/User/updateUserEmail', data)
  }

  async deleteUser(userId: string): Promise<void> {
    await this.client.post('/api/User/deleteUser', { userId })
  }

  // Review API Methods
  async createReview(data: CreateReviewRequest): Promise<CreateReviewResponse> {
    const response = await this.client.post('/api/Review/createReview', data)
    return response.data
  }

  async deleteReview(reviewId: string): Promise<void> {
    await this.client.post('/api/Review/deleteReview', { reviewId })
  }

  async getReviewsForStore(data: GetReviewsForStoreRequest): Promise<ReviewsResponse> {
    const response = await this.client.post('/api/Review/getReviewsForStore', data)
    return response.data
  }

  async getReviewsByUser(data: GetReviewsByUserRequest): Promise<ReviewsResponse> {
    const response = await this.client.post('/api/Review/getReviewsByUser', data)
    return response.data
  }

  // Rating API Methods
  async updateRating(data: UpdateRatingRequest): Promise<void> {
    await this.client.post('/api/Rating/updateRating', data)
  }

  async getRating(data: GetRatingRequest): Promise<Rating> {
    const response = await this.client.post('/api/Rating/getRating', data)
    return response.data
  }

  // Tagging API Methods
  async addTag(data: AddTagRequest): Promise<void> {
    await this.client.post('/api/Tagging/addTag', data)
  }

  async removeTag(data: RemoveTagRequest): Promise<void> {
    await this.client.post('/api/Tagging/removeTag', data)
  }

  async getStoresByTag(data: GetStoresByTagRequest): Promise<StoreIdResponse[]> {
    const response = await this.client.post('/api/Tagging/_getStoresByTag', data)
    return response.data
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient()
export default apiClient
